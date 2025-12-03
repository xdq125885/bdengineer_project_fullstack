export type StreamEventHandler = (event: { event: string; data: any }) => void

// 简易 SSE 解析器（基于 fetch + ReadableStream）
export async function postSSE(url: string, body: any, onEvent: StreamEventHandler, signal?: AbortSignal) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(text || `请求失败: ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const evt = parseSSE(raw)
        if (evt) onEvent(evt)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSSE(block: string): { event: string; data: any } | null {
  // 形如：
  // event: status\n
  // data: {"stage":"preparing"}
  const lines = block.split('\n')
  let event = 'message'
  let data: any = ''
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim()
  }
  if (!data) return { event, data: '' }
  try { return { event, data: JSON.parse(data) } } catch { return { event, data } }
}

