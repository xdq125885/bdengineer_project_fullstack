import express from 'express'
import cors from 'cors'
import { larkRawHandler } from './controllers/lark.controller'
import { generateHandler } from './controllers/generate.controller'
import { generateStreamHandler } from './controllers/generate.stream.controller'
import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 统一从 backend 目录加载环境文件，与启动目录无关
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const backendRoot = resolve(__dirname, '..')
const envLocalPath = resolve(backendRoot, '.env.local')
const envPath = resolve(backendRoot, '.env')
let envLoadedFrom = ''
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
  envLoadedFrom = '.env.local'
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  envLoadedFrom = '.env'
} else {
  dotenv.config() // fallback
  envLoadedFrom = '(process.env only)'
}

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || true,
}))
// 提升 JSON 体积上限以支持 base64 图片
app.use(express.json({ limit: '15mb' }))

// 静态托管 uploads 目录，供多模态 image_url 使用
const uploadsDir = join(backendRoot, 'uploads')
app.use('/uploads', express.static(uploadsDir))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/', (_req, res) => res.send('Backend is running. Try GET /health or POST /api/lark/raw.'))
app.post('/api/lark/raw', larkRawHandler)
app.post('/api/generate', generateHandler)
app.post('/api/generate/stream', generateStreamHandler)

// Helpful env presence log (no secret value printed)
if (process.env.NODE_ENV !== 'production') {
  console.log('[env] loaded from:', envLoadedFrom)
  console.log('[env] LARK_APP_ID set:', Boolean(process.env.LARK_APP_ID))
  console.log('[env] LARK_APP_SECRET set:', Boolean(process.env.LARK_APP_SECRET))
  console.log('[env] LLM_API_KEY set:', Boolean(process.env.LLM_API_KEY))
  console.log('[env] LLM_BASE_URL:', process.env.LLM_BASE_URL || '(default)')
  console.log('[env] LLM_MODEL:', process.env.LLM_MODEL || '(default)')
}

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`[backend] server is running on http://localhost:${port}`)
})
