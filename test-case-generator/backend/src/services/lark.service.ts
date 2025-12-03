import assert from 'node:assert'

const LARK_BASE = process.env.LARK_BASE_URL || 'https://open.feishu.cn'

interface TenantTokenResp {
  code: number
  msg: string
  tenant_access_token: string
  expire: number // seconds
}

interface WikiNodeInfo {
  obj_type?: string
  obj_token?: string
}

let cachedToken: { token: string; expireAt: number } | null = null

export async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expireAt - 30_000) {
    return cachedToken.token
  }
  const appId = process.env.LARK_APP_ID
  const appSecret = process.env.LARK_APP_SECRET
  assert(appId && appSecret, '缺少 LARK_APP_ID/LARK_APP_SECRET 环境变量')

  const resp = await fetch(`${LARK_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  })
  if (!resp.ok) {
    throw new Error(`获取 tenant_access_token 失败: ${resp.status} ${resp.statusText}`)
  }
  const data = (await resp.json()) as TenantTokenResp
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`获取 tenant_access_token 返回异常: ${data.code} ${data.msg}`)
  }
  cachedToken = {
    token: data.tenant_access_token,
    expireAt: Date.now() + (data.expire * 1000),
  }
  return cachedToken.token
}

export function extractDocxTokenFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // 常见形式: https://xxx.feishu.cn/docx/AbCdEfGhIjKlMn
    const m = u.pathname.match(/\/docx\/([A-Za-z0-9_-]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

export function extractWikiTokenFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // 常见形式: https://xxx.feishu.cn/wiki/YZN6woXFHiYIzek78q7clrAmnif
    const m = u.pathname.match(/\/wiki\/([A-Za-z0-9_-]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function getWikiNodeInfoByToken(wikiToken: string): Promise<WikiNodeInfo> {
  const token = await getTenantAccessToken()
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  // 由于官方有 GET/POST 两种形式的接口实现差异，这里做兜底：先 GET 不行再 POST
  const tryGet = async () => {
    const resp = await fetch(`${LARK_BASE}/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`, {
      method: 'GET', headers
    })
    if (!resp.ok) return null
    const json = await resp.json() as any
    if (json?.code === 0 && json?.data?.node) {
      const node = json.data.node
      return { obj_type: node.obj_type, obj_token: node.obj_token }
    }
    return null
  }

  const tryPost = async () => {
    const resp = await fetch(`${LARK_BASE}/open-apis/wiki/v2/spaces/get_node`, {
      method: 'POST', headers, body: JSON.stringify({ token: wikiToken })
    })
    if (!resp.ok) return null
    const json = await resp.json() as any
    if (json?.code === 0 && json?.data?.node) {
      const node = json.data.node
      return { obj_type: node.obj_type, obj_token: node.obj_token }
    }
    return null
  }

  return (await tryGet()) || (await tryPost()) || {}
}

export async function getDocxRawContentById(documentId: string): Promise<string> {
  const token = await getTenantAccessToken()
  const resp = await fetch(`${LARK_BASE}/open-apis/docx/v1/documents/${documentId}/raw_content`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`获取文档内容失败: ${resp.status} ${resp.statusText} ${text}`)
  }
  const json = await resp.json() as any
  // 官方返回通常为 { code, msg, data: { content: string } }
  const content = json?.data?.content ?? json?.content ?? ''
  if (typeof content !== 'string') {
    throw new Error('飞书返回格式不含 content 字段或类型不正确')
  }
  return content
}

async function resolveWikiUrlToDocxId(url: string): Promise<string | null> {
  const wikiToken = extractWikiTokenFromUrl(url)
  if (!wikiToken) return null
  const info = await getWikiNodeInfoByToken(wikiToken)
  const type = String(info.obj_type || '').toLowerCase()
  const objToken = info.obj_token
  if (!objToken) return null
  // 常见映射：docx/doc -> docx 文档；sheet -> 表格；mindnote -> 思维笔记等
  if (type === 'docx' || type === 'doc') {
    return objToken
  }
  // 其他类型暂不支持直接转 raw_content
  throw new Error(`该 wiki 节点类型不受支持（${type || '未知'}）。请在页面中选择“在文档中打开”获取 docx 链接。`)
}

export async function getDocxRawContentByUrl(url: string): Promise<string> {
  // 支持两种链接：docx / wiki
  if (/\b\/wiki\/[A-Za-z0-9_-]+/.test(url)) {
    const docxId = await resolveWikiUrlToDocxId(url)
    if (!docxId) throw new Error('无法解析 wiki 链接为具体文档。请确认链接是否有效。')
    return getDocxRawContentById(docxId)
  }
  const id = extractDocxTokenFromUrl(url)
  if (!id) throw new Error('无法从链接解析出文档 token，请确认为 docx 链接')
  return getDocxRawContentById(id)
}
