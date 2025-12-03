import type { Request, Response } from 'express'
import { generateStreamOrchestrated } from '../services/generate.service'
import { getDocxRawContentByUrl } from '../services/lark.service'

function sseWrite(res: Response, event: string, data: any) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  res.write(`event: ${event}\n`)
  res.write(`data: ${payload}\n\n`)
}

export async function generateStreamHandler(req: Request, res: Response) {
  let { prdText, options, images, larkUrl } = req.body as any
  const hasImages = Array.isArray(images) && images.length > 0
  const hasText = typeof prdText === 'string' && prdText.trim().length > 0
  const hasLark = typeof larkUrl === 'string' && larkUrl.trim().length > 0

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  const send = (event: string, data: any) => sseWrite(res, event, data)

  // 起始事件
  send('status', { stage: 'preparing' })

  try {
    // 支持仅提供飞书链接的流式：先读取 PRD 文本
    if (!hasText && hasLark) {
      send('status', { stage: 'reading_lark', url: larkUrl })
      try {
        const content = await getDocxRawContentByUrl(larkUrl)
        prdText = String(content || '')
        send('status', { stage: 'reading_lark_done', length: prdText.length })
      } catch (e: any) {
        send('error', { message: `读取飞书文档失败：${e?.message || '未知错误'}` })
        return res.end()
      }
    }

    // 校验：三者至少其一
    if (!(prdText && prdText.trim().length > 0) && !hasImages) {
      send('error', { message: '缺少 prdText 或 images（至少提供其一）' })
      return res.end()
    }

    // 执行编排式流式生成
    await generateStreamOrchestrated({ prdText, options, images }, send)
  } catch (err: any) {
    send('error', { message: err?.message || '生成失败' })
  } finally {
    res.end()
  }
}
