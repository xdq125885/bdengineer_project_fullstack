import type { Request, Response } from 'express'
import { getDocxRawContentByUrl } from '../services/lark.service'

export async function larkRawHandler(req: Request, res: Response) {
  try {
    const { url } = req.body as { url?: string }
    if (process.env.NODE_ENV !== 'production') {
      // 简单日志帮助排查
      // eslint-disable-next-line no-console
      console.log(`[lark.raw] body.url=`, url)
    }
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: '缺少 url 或 url 非字符串' })
    }
    const content = await getDocxRawContentByUrl(url)
    return res.json({ content })
  } catch (err: any) {
    const message = err?.message || '拉取飞书文档失败'
    const status = /解析|格式|无法从链接|缺少|不受支持|wiki/.test(message) ? 400 : 500
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[lark.raw] error:', err)
    }
    return res.status(status).json({ error: message })
  }
}
