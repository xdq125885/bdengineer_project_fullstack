import type { Request } from 'express'

// ========== 类型对齐前端 ==========
export type Severity = 'P0' | 'P1' | 'P2' | 'P3'
export interface TestCase {
  id: string
  feature: string
  title: string
  preconditions: string[]
  steps: string[]
  expected: string[]
  severity?: Severity
  tags?: string[]
}

export type GenerationStrategy = 'simple' | 'cot' | 'self_refine'
export interface GenerateBody {
  prdText: string
  options?: { model?: string; temperature?: number; strategy?: GenerationStrategy; maxCases?: number }
  images?: { kind: 'ui' | 'flow'; data: string }[]
}

export interface GenerationMeta {
  mode: 'vision' | 'text' | 'self_refine'
  imagesCount: number
  strategy: GenerationStrategy
  model: string
}
export let lastGenerationMeta: GenerationMeta | null = null

// ========== 环境配置 ==========
function getLLMConfig() {
  const base = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
  const key = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL || 'deepseek-chat'
  const jsonMode = String(process.env.LLM_JSON_MODE ?? 'true').toLowerCase() === 'true'
  return { base, key, model, jsonMode }
}

export function ensureEnv() {
  const { key } = getLLMConfig()
  if (!key) throw new Error('未配置 LLM_API_KEY（请在 backend/.env.local 设置模型密钥）')
}

// ========== 入口主流程（一次性生成） ==========
export async function handleGenerate(body: GenerateBody, _req?: Request): Promise<TestCase[]> {
  const prdText = typeof body?.prdText === 'string' ? body.prdText : ''
  const { model: defaultModel } = getLLMConfig()
  const strategy: GenerationStrategy = (body.options?.strategy as GenerationStrategy) || 'simple'
  const model = body.options?.model || defaultModel
  const temperature = typeof body.options?.temperature === 'number' ? body.options!.temperature : 0.2
  const maxCases = Number.isFinite(body.options?.maxCases as number) ? Math.max(1, Math.min(200, body.options!.maxCases!)) : undefined
  const imagesCount = body.images?.length || 0
  const hasText = prdText.trim().length > 0

  try {
    ensureEnv()

    // 1) 有图片：优先走多模态视觉分支（一次性）
    if (imagesCount > 0) {
      try {
        const visionPrompt = buildVisionPrompt(prdText, body.images!, maxCases)
        // eslint-disable-next-line no-console
        console.log('[vision] images:', imagesCount, 'strategy:', strategy, 'model:', model)
        const visionContent = await callOpenAICompatVision({ model, temperature, promptText: visionPrompt, images: body.images! })
        const visionCases = limitCases(parseCases(visionContent), maxCases)
        lastGenerationMeta = { mode: 'vision', imagesCount, strategy, model }
        if (visionCases.length > 0) return visionCases
        // eslint-disable-next-line no-console
        console.warn('[vision] 解析失败，回退文本策略')
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.warn('[vision] 调用失败，回退文本策略：', e?.message)
      }
    }

    // 2) 文本策略（simple/cot/self_refine）
    if (strategy === 'self_refine') {
      const firstPrompt = buildPromptAdvanced(prdText, { strategy, maxCases })
      const draft = await callOpenAICompat({ model, temperature, prompt: firstPrompt })
      const draftCases = limitCases(parseCases(draft), maxCases)

      const critiquePrompt = buildCritiquePrompt(prdText, draftCases, { maxCases })
      const finalContent = await callOpenAICompat({ model, temperature, prompt: critiquePrompt })
      const finalCases = limitCases(parseCases(finalContent), maxCases)
      lastGenerationMeta = { mode: 'self_refine', imagesCount, strategy, model }
      if (finalCases.length > 0) return finalCases
      if (draftCases.length > 0) return draftCases

      return heuristicFallback(prdText, { imageOnly: imagesCount > 0 && !hasText })
    }

    const prompt = buildPromptAdvanced(prdText, { strategy, maxCases })
    const content = await callOpenAICompat({ model, temperature, prompt })
    const textCases = limitCases(parseCases(content), maxCases)
    lastGenerationMeta = { mode: 'text', imagesCount, strategy, model }
    if (textCases.length > 0) return textCases

    return heuristicFallback(prdText, { imageOnly: imagesCount > 0 && !hasText })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn('[generate] 调用失败，使用兜底生成：', e?.message)
    if (!lastGenerationMeta) {
      lastGenerationMeta = { mode: imagesCount > 0 ? 'vision' : (strategy === 'self_refine' ? 'self_refine' : 'text'), imagesCount, strategy, model }
    }
    return heuristicFallback(prdText, { imageOnly: imagesCount > 0 && !hasText })
  }
}

// ========== 流式编排（逐步输出测试点与分批用例） ==========
export async function generateStreamOrchestrated(body: GenerateBody, send: (event: string, data: any) => void) {
  const prdText = typeof body?.prdText === 'string' ? body.prdText : ''
  const { model: defaultModel } = getLLMConfig()
  const strategy: GenerationStrategy = (body.options?.strategy as GenerationStrategy) || 'simple'
  const model = body.options?.model || defaultModel
  const temperature = typeof body.options?.temperature === 'number' ? body.options!.temperature : 0.2
  const maxCases = Number.isFinite(body.options?.maxCases as number) ? Math.max(1, Math.min(200, body.options!.maxCases!)) : undefined
  const imagesCount = body.images?.length || 0

  ensureEnv()

  // 设置 meta（可能稍后更新）
  lastGenerationMeta = { mode: imagesCount > 0 ? 'vision' : (strategy === 'self_refine' ? 'self_refine' : 'text'), imagesCount, strategy, model }
  send('meta', lastGenerationMeta)

  // 第一步：获取“测试点”清单（CoT思考）
  const testpointPrompt = buildTestpointsPrompt(prdText, body.images)
  send('prompt', { kind: 'testpoints', text: testpointPrompt })

  let testpoints: { feature?: string; point: string }[] = []
  try {
    let content: string
    if (imagesCount > 0) {
      // 视觉 + 文本联合获取“测试点”
      const vp = buildVisionPrompt(prdText, body.images!, 0) + '\n\n请先仅输出JSON数组“测试点清单”，每项 {"feature":"模块(可选)","point":"测试点"}。不要输出用例。'
      content = await callOpenAICompatVision({ model, temperature, promptText: vp, images: body.images! })
      lastGenerationMeta = { mode: 'vision', imagesCount, strategy, model }
      send('meta', lastGenerationMeta)
    } else {
      content = await callOpenAICompat({ model, temperature, prompt: testpointPrompt })
    }
    testpoints = parsePoints(content)
    send('testpoints', testpoints)
  } catch (e:any) {
    // eslint-disable-next-line no-console
    console.warn('[stream] 获取测试点失败：', e?.message)
    // 若失败则简化为单个泛化测试点
    testpoints = [{ feature: '通用', point: '主路径与异常路径' }]
    send('testpoints', testpoints)
  }

  // 第二步：按测试点分批生成小组用例并推送
  const finalCases: TestCase[] = []
  for (let i = 0; i < testpoints.length; i++) {
    const tp = testpoints[i]
    send('status', { stage: 'generating_point', index: i + 1, total: testpoints.length, point: tp })
    try {
      const casePrompt = buildCasesFromPointPrompt(prdText, tp, { maxEach: 3 })
      const content = await callOpenAICompat({ model, temperature, prompt: casePrompt })
      const smallBatch = limitCases(parseCases(content), 3)
      if (smallBatch.length) {
        finalCases.push(...smallBatch)
        send('cases', smallBatch)
      }
    } catch (e:any) {
      // eslint-disable-next-line no-console
      console.warn('[stream] 生成测试点用例失败：', e?.message)
    }
    if (maxCases && finalCases.length >= maxCases) break
  }

  // 若仍无用例，给兜底
  if (finalCases.length === 0) {
    const fb = heuristicFallback(prdText, { imageOnly: imagesCount > 0 && prdText.trim().length === 0 })
    finalCases.push(...fb)
    send('cases', fb)
  }

  send('done', { total: finalCases.length })
}

function buildTestpointsPrompt(prdText: string, images?: { kind: 'ui' | 'flow'; data: string }[]) {
  const hasImg = !!(images && images.length)
  return `你是资深测试工程师。请根据以下信息先枚举“测试点清单”，只输出 JSON 数组，每项形如 {"feature":"模块(可选)", "point":"测试点"}，不要输出用例。${hasImg ? '已提供界面/流程图像，请结合图像理解UI控件或流程分支。' : ''}\n\nPRD：\n${prdText || '(无)'}\n`;
}

function buildCasesFromPointPrompt(prdText: string, tp: { feature?: string; point: string }, opts?: { maxEach?: number }) {
  const cap = opts?.maxEach ? `（最多 ${opts.maxEach} 条）` : ''
  return `你是资深测试工程师。请基于测试点生成可执行的功能测试用例${cap}，只输出 JSON 数组，字段：id, feature, title, preconditions, steps, expected, severity(P0/P1/P2/P3), tags。\n测试点：${JSON.stringify(tp)}\nPRD：\n${prdText || '(无)'}\n`;
}

// ========== 多模态 Prompt/调用 ==========
function buildVisionPrompt(prdText: string, images: { kind: 'ui' | 'flow'; data: string }[], maxCases?: number): string {
  const cap = maxCases ? `（最多 ${maxCases} 条）` : ''
  const kinds = Array.from(new Set(images.map(i => i.kind)))
  const explain = kinds.includes('ui') && kinds.includes('flow')
    ? '请识别图片中的控件（按钮/输入/表单校验/禁用状态/联动）以及流程图中的节点/分支/循环/终止条件，结合 PRD 生成 UI 与流程层面的测试用例'
    : kinds.includes('ui')
      ? '请识别图片中的可交互控件（按钮/输入/选择器/表单校验等），结合 PRD 生成 UI 层面的测试用例'
      : '请识别流程图中的节点、边与分支条件，结合 PRD 生成路径覆盖用例（主路径/分支/边界/异常）'
  return `你是专业测试工程师。${explain}${cap}。输出严格为 JSON 数组，字段：id, feature, title, preconditions, steps, expected, severity(P0/P1/P2/P3), tags。\nPRD（可为空，仅供参考）：\n${prdText || '(无)'}\n若图片难以识别，也请基于 PRD 合理补全。`
}

function buildVisionMessages(promptText: string, images: { kind: 'ui' | 'flow'; data: string }[]) {
  const content: any[] = [{ type: 'text', text: promptText }]
  for (const img of images) {
    content.push({ type: 'image_url', image_url: { url: img.data } })
  }
  return [
    { role: 'system', content: 'You are a senior QA engineer for UI/flow testing. Answer in JSON array only.' },
    { role: 'user', content }
  ]
}

async function callOpenAICompatVision(params: { model: string; temperature: number; promptText: string; images: { kind: 'ui' | 'flow'; data: string }[] }): Promise<string> {
  const { base, key, jsonMode } = getLLMConfig()
  const url = `${base.replace(/\/$/, '')}/chat/completions`
  const body: any = {
    model: params.model,
    temperature: params.temperature,
    messages: buildVisionMessages(params.promptText, params.images),
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`LLM API 请求失败: ${resp.status} ${resp.statusText} ${text}`)
  }
  const data = await resp.json()
  const content: string = data?.choices?.[0]?.message?.content || ''
  return content
}

// ========== 文本调用/解析/兜底 ==========
function buildPromptAdvanced(prdText: string, opts: { strategy: GenerationStrategy; maxCases?: number }): string {
  const cap = opts.maxCases ? `（最多 ${opts.maxCases} 条）` : ''
  const common = `你是资深测试工程师。请基于以下 PRD 生成可执行的功能测试用例${cap}。\n严格只输出 JSON 数组，字段：id, feature, title, preconditions, steps, expected, severity(P0/P1/P2/P3), tags。`;
  if (opts.strategy === 'cot') {
    return `${common}\n请先在内部进行思考（不要输出思考），覆盖正向/异常/边界场景，最后仅输出 JSON 用例数组。\nPRD：\n${prdText || '(无)'}\n`;
  }
  if (opts.strategy === 'self_refine') {
    return `${common}\n请尽量全面、规范并避免重复。\nPRD：\n${prdText || '(无)'}\n`;
  }
  // simple
  return `${common}\nPRD：\n${prdText || '(无)'}\n`;
}

function buildCritiquePrompt(prdText: string, draftCases: TestCase[], opts?: { maxCases?: number }): string {
  const cap = opts?.maxCases ? `（最多 ${opts.maxCases} 条）` : ''
  return `你是资深测试审核工程师。以下为 PRD 与一版草稿用例，请你基于 PRD 对用例进行审校与改进：\n- 去重并合并相似用例；\n- 补全缺失字段（前置、步骤、预期、严重级、标签）；\n- 保持 id 稳定或在需要新增时补充连续编号；\n- 覆盖主路径、异常与关键边界；\n- 输出顺序按 Feature 分组、严重级从高到低；\n最终严格只输出 JSON 数组${cap}，字段：id, feature, title, preconditions, steps, expected, severity(P0/P1/P2/P3), tags。\n\nPRD：\n${prdText || '(无)'}\n\n草稿用例：\n${JSON.stringify(draftCases, null, 2)}\n`;
}

async function callOpenAICompat(params: { model: string; temperature: number; prompt: string }): Promise<string> {
  const { base, key, jsonMode } = getLLMConfig()
  const url = `${base.replace(/\/$/, '')}/chat/completions`
  const body: any = {
    model: params.model,
    temperature: params.temperature,
    messages: [
      { role: 'system', content: 'You are a senior QA engineer. Answer in JSON only unless explicitly asked to reason.' },
      { role: 'user', content: params.prompt },
    ],
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`LLM API 请求失败: ${resp.status} ${resp.statusText} ${text}`)
  }
  const data = await resp.json()
  const content: string = data?.choices?.[0]?.message?.content || ''
  return content
}

function parsePoints(content: string): { feature?: string; point: string }[] {
  try {
    const match = content.match(/\[[\s\S]*\]/)
    const json = match ? match[0] : content
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    return arr.map((x:any) => ({ feature: x.feature, point: String(x.point || x.title || x.name || '') })).filter((x:any)=>x.point)
  } catch { return [] }
}

function parseCases(content: string): TestCase[] {
  try {
    const match = content.match(/\[[\s\S]*\]/)
    const json = match ? match[0] : content
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    const out: TestCase[] = []
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i]
      const tc: TestCase = {
        id: String(it.id || `TC-${String(i + 1).padStart(3, '0')}`),
        feature: String(it.feature || '通用'),
        title: String(it.title || `用例 ${i + 1}`),
        preconditions: normalizeStringArray(it.preconditions),
        steps: normalizeStringArray(it.steps),
        expected: normalizeStringArray(it.expected || it.expectedResult),
        severity: normalizeSeverity(it.severity),
        tags: normalizeStringArray(it.tags),
      }
        
      out.push(tc)
    }
    return out
  } catch {
    return []
  }
}

function limitCases(cases: TestCase[], maxCases?: number): TestCase[] {
  if (!maxCases || maxCases <= 0) return cases
  return cases.slice(0, maxCases)
}

function normalizeStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(x => String(x))
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

function normalizeSeverity(v: any): Severity | undefined {
  if (!v) return undefined
  const s = String(v).toUpperCase()
  if (s === 'P0' || s === 'P1' || s === 'P2' || s === 'P3') return s
  if (s.includes('HIGH')) return 'P0'
  if (s.includes('MEDIUM')) return 'P2'
  if (s.includes('LOW')) return 'P3'
  return undefined
}

function heuristicFallback(text: string, opts?: { imageOnly?: boolean }): TestCase[] {
  const imageOnly = !!opts?.imageOnly
  if (imageOnly) {
    return [
      {
        id: 'TC-IMG-001', feature: '图像用例', title: '根据上传图片生成的通用用例-主路径',
        preconditions: ['系统可用'],
        steps: ['识别图片中的关键节点/控件', '按主路径执行关键步骤'],
        expected: ['主流程成功完成', '页面/状态与预期一致'], severity: 'P2', tags: ['图像','主路径']
      },
      {
        id: 'TC-IMG-002', feature: '图像用例', title: '根据上传图片生成的通用用例-异常/边界',
        preconditions: ['系统可用'],
        steps: ['识别图片中的分支/校验点', '触发异常/边界条件'],
        expected: ['显示明确错误/校验提示', '数据不被错误修改'], severity: 'P1', tags: ['图像','异常','边界']
      }
    ]
  }

  const titles = extractCandidateTitles(text)
  const features = extractFeatures(text)
  const out: TestCase[] = titles.slice(0, 20).map((t, i) => ({
    id: `TC-${String(i + 1).padStart(3, '0')}`,
    feature: pickFeatureForTitle(t, features) || '通用',
    title: t,
    preconditions: genPreconditions(text),
    steps: genSteps(text, t),
    expected: genExpected(t),
    severity: guessSeverity(t),
    tags: guessTags(t),
  }))
  return out.length ? out : [
    {
      id: 'TC-001', feature: features[0] || '登录', title: '输入正确的用户名和密码进行登录',
      preconditions: ['用户已注册且处于登出状态'],
      steps: ['打开登录界面', '输入正确用户名', '输入正确密码', '点击登录'],
      expected: ['登录成功，跳转到首页'], severity: 'P1', tags: ['功能']
    }
  ]
}

// ====== 启发式辅助 ======
function extractFeatures(md: string): string[] {
  const lines = md.split(/\r?\n/)
  const feats = new Set<string>()
  for (const l of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(l.trim())
    if (m) feats.add(m[2].trim())
  }
  return Array.from(feats).slice(0, 12)
}
function extractCandidateTitles(md: string): string[] {
  const out: string[] = []
  const bullet = /^\s*[-*+]\s+(.+)$/
  for (const l of md.split(/\r?\n/)) {
    const m = bullet.exec(l)
    if (m) out.push(m[1].trim())
  }
  const sec = /(用例|场景|异常|边界|需求)[:：]\s*([^\n]+)/g
  let sm: RegExpExecArray | null
  while ((sm = sec.exec(md)) !== null) out.push(sm[2].trim())
  return Array.from(new Set(out))
}
function pickFeatureForTitle(title: string, features: string[]): string | undefined {
  return features.find(f => title.includes(stripHashes(f)))
}
function stripHashes(s: string) { return s.replace(/^#+\s*/, '') }
function genPreconditions(md: string): string[] {
  const base: string[] = []
  if (/登录|鉴权|认证/.test(md)) base.push('用户已注册且网络可用')
  if (/管理|后台|B端/.test(md)) base.push('用户具有访问该模块的权限')
  if (base.length === 0) base.push('系统处于可用状态')
  return base
}
function genSteps(md: string, title: string): string[] {
  const steps = [`执行场景：${title}`]
  if (/登录|login/i.test(md)) {
    steps.push('打开登录页面')
    if (/验证码/.test(md)) steps.push('若出现验证码，按规则完成验证码输入')
  }
  steps.push('点击提交/保存/登录等触发动作')
  return steps
}
function genExpected(title: string): string[] {
  const out: string[] = []
  if (/成功|正确|通过|valid|登录成功/.test(title)) out.push('操作成功，页面进入下一状态')
  if (/失败|错误|异常|超时|非法/.test(title)) out.push('给出明确的错误提示，不改变已有数据')
  if (!out.length) out.push('系统行为与需求描述一致，无未定义行为')
  return out
}
function guessSeverity(title: string): Severity {
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
  if (!tags.length) tags.push('功能')
  return tags
}
