import type { GenerateRequest, TestCase } from '../types.ts'

async function safeReadError(resp: Response): Promise<string> {
  try {
    const text = await resp.text()
    try {
      const json = JSON.parse(text)
      return json.error || json.message || text
    } catch {
      return text
    }
  } catch {
    return resp.statusText
  }
}

// 使用真实后端：优先通过后端读取飞书文档，再调用 /api/generate 由模型生成
export async function generateTestCases(req: GenerateRequest): Promise<TestCase[]> {
  let text = (req.prdText || '').trim()

  // 若提供了飞书链接，优先通过后端代理读取文档纯文本
  if (!text && req.larkUrl) {
    const resp = await fetch('/api/lark/raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: req.larkUrl }),
    })
    if (!resp.ok) {
      const msg = await safeReadError(resp)
      throw new Error(`读取飞书文档失败：${msg}`)
    }
    const json = await resp.json()
    text = String(json.content || '').trim()
  }

  if (!text && !(req.images && req.images.length)) throw new Error('请粘贴 PRD 文本或提供飞书文档链接，或上传图片')

  // 调用后端 /api/generate（DeepSeek/豆包 等 OpenAI 兼容）
  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prdText: text, images: req.images && req.images.length ? req.images : undefined, options: req.options || {} })
    })
    if (!resp.ok) {
      const msg = await safeReadError(resp)
      throw new Error(msg)
    }
    const data = await resp.json()
    // 将后端返回的 meta 暴露到全局，便于页面显示徽标/调试
    try { (window as any).__genMeta = data?.meta || null; console.info('[frontend] generation meta:', data?.meta) } catch {}

    const cases: TestCase[] = Array.isArray(data?.cases) ? data.cases : []
    if (cases.length > 0) return cases
    // 兜底：若后端未返回有效数据，走本地启发式
    return localHeuristicGenerate(text)
  } catch (e) {
    console.warn('[frontend] /api/generate 调用失败，使用本地启发式：', (e as any)?.message)
    return localHeuristicGenerate(text)
  }
}

// ================= 本地启发式兜底 =================
function localHeuristicGenerate(text: string): TestCase[] {
  const features = extractFeatures(text)
  const titles = extractCandidateTitles(text)
  const cases: TestCase[] = titles.map((t, idx) => {
    const feature = pickFeatureForTitle(t, features)
    return {
      id: `TC-${String(idx + 1).padStart(3, '0')}`,
      feature: feature || '通用',
      title: normalizeTitle(t),
      preconditions: genPreconditions(text, t),
      steps: genSteps(text, t),
      expected: genExpected(text, t),
      severity: guessSeverity(t),
      tags: guessTags(t)
    }
  })
  if (cases.length === 0) return fallbackCases(features)
  return cases
}

function extractFeatures(md: string): string[] {
  const lines = md.split(/\r?\n/)
  const feats: string[] = []
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (m) feats.push(m[2].trim())
  }
  return Array.from(new Set(feats)).slice(0, 12)
}

function extractCandidateTitles(md: string): string[] {
  const titles: string[] = []
  const bulletRegex = /^\s*[-*+]\s+(.+)$/
  const lines = md.split(/\r?\n/)
  for (const line of lines) {
    const m = bulletRegex.exec(line)
    if (m) titles.push(m[1].trim())
  }
  const sectionRegex = /(用例|场景|异常|边界|需求)[:：]\s*([^\n]+)/g
  let sm: RegExpExecArray | null
  while ((sm = sectionRegex.exec(md)) !== null) {
    titles.push(sm[2].trim())
  }
  return Array.from(new Set(titles)).slice(0, 30)
}

function normalizeTitle(t: string) {
  return t.replace(/^[-*+\d\.\)\(\s]+/, '').trim()
}

function pickFeatureForTitle(title: string, features: string[]): string | undefined {
  const matched = features.find(f => title.includes(stripHashes(f)))
  return matched
}

function stripHashes(s: string) {
  return s.replace(/^#+\s*/, '')
}

function genPreconditions(md: string, _title: string): string[] {
  const base: string[] = []
  if (/登录|鉴权|认证/.test(md)) base.push('用户已注册且网络可用')
  if (/管理|后台|B端/.test(md)) base.push('用户具有访问该模块的权限')
  if (base.length === 0) base.push('系统处于可用状态')
  return base
}

function genSteps(md: string, title: string): string[] {
  const steps: string[] = []
  steps.push(`执行场景：${normalizeTitle(title)}`)
  if (/登录|login/i.test(md)) {
    steps.push('打开登录页面')
    if (/验证码/.test(md)) steps.push('若出现验证码，按规则完成验证码输入')
  }
  steps.push('点击提交/保存/登录等触发动作')
  return steps
}

function genExpected(_md: string, title: string): string[] {
  const out: string[] = []
  if (/成功|正确|通过|valid|登录成功/.test(title)) out.push('操作成功，页面进入下一状态')
  if (/失败|错误|异常|超时|非法/.test(title)) out.push('给出明确的错误提示，不改变已有数据')
  if (out.length === 0) out.push('系统行为与需求描述一致，无未定义行为')
  return out
}

function guessSeverity(title: string): TestCase['severity'] {
  if (/登录失败|数据丢失|安全|支付|交易/.test(title)) return 'P0'
  if (/无法|崩溃|白屏|卡死/.test(title)) return 'P1'
  if (/样式|文案|对齐|提示/.test(title)) return 'P3'
  return 'P2'
}

function guessTags(title: string): string[] {
  const tags: string[] = []
  if (/边界|极限|超长|空|null|undefined|0字节/.test(title)) tags.push('边界')
  if (/异常|错误|fail|invalid/.test(title)) tags.push('异常')
  if (/性能|超时|慢/.test(title)) tags.push('性能')
  if (tags.length === 0) tags.push('功能')
  return tags
}

function fallbackCases(features: string[]): TestCase[] {
  const feat = features[0] || '登录功能'
  return [
    {
      id: 'TC-001',
      feature: feat,
      title: '输入正确的用户名和密码进行登录',
      preconditions: ['用户已注册且处于登出状态'],
      steps: ['打开登录界面', '输入正确用户名', '输入正确密码', '点击登录'],
      expected: ['登录成功，跳转到首页'],
      severity: 'P1',
      tags: ['功能']
    },
    {
      id: 'TC-002',
      feature: feat,
      title: '输入错误密码登录',
      preconditions: ['存在该账号'],
      steps: ['打开登录界面', '输入正确用户名', '输入错误密码', '点击登录'],
      expected: ['提示密码错误，不登录'],
      severity: 'P2',
      tags: ['异常']
    }
  ]
}
