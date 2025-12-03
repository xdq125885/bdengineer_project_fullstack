import type { Request, Response } from 'express'
import { handleGenerate, lastGenerationMeta } from '../services/generate.service'

export async function generateHandler(req: Request, res: Response) {
  try {
    const { prdText, options, images } = req.body as any

    const hasText = typeof prdText === 'string' && prdText.trim().length > 0
    const hasImages = Array.isArray(images) && images.length > 0
    if (!hasText && !hasImages) {
      return res.status(400).json({ error: '缺少 prdText 或 images（至少提供其一）' })
    }

    const cases = await handleGenerate({ prdText: hasText ? prdText : '', options, images }, req)
    return res.json({ cases, meta: lastGenerationMeta || null })
  } catch (err: any) {
    const message = err?.message || '生成失败'
    const status = /缺少|未配置|参数/.test(message) ? 400 : 500
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[generate] error:', err)
    }
    return res.status(status).json({ error: message })
  }
}
