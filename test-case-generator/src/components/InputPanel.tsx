import type { InputImage } from '../types.ts'

interface Props {
  prdText: string
  larkUrl: string
  images: InputImage[]
  onChangePrd: (v: string) => void
  onChangeLark: (v: string) => void
  onChangeImages: (imgs: InputImage[]) => void
}

const samplePRD = `# 用户登录

## 目标
为B端管理系统提供安全的登录能力。

## 业务规则
- 支持账号+密码登录
- 密码输入错误超过5次触发验证码
- 登录成功后跳转首页

## 用例示例
- 输入正确的用户名和密码
- 输入错误密码
- 空用户名或空密码
`

export default function InputPanel({ prdText, larkUrl, images, onChangePrd, onChangeLark, onChangeImages }: Props) {
  const fillSample = () => onChangePrd(samplePRD)
  const clearAll = () => { onChangePrd(''); onChangeLark(''); onChangeImages([]) }

  const onFiles = async (files: FileList | null, kind: 'ui' | 'flow') => {
    if (!files || files.length === 0) return
    const arr = await Promise.all(Array.from(files).map(f => rasterizeToPngDataUrl(f, 1280, 0.8)))
    const next = [...images, ...arr.map(data => ({ kind, data }))]
    onChangeImages(next.slice(0, 8)) // 限制最多8张
  }

  const removeAt = (idx: number) => {
    const next = images.slice(); next.splice(idx, 1); onChangeImages(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">PRD 文本（支持 Markdown 粘贴）</label>
        <textarea
          className="input h-56 resize-y font-mono"
          placeholder="在此粘贴需求文档全文..."
          value={prdText}
          onChange={(e) => onChangePrd(e.target.value)}
        />
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
          <span>字数：{prdText.length}</span>
          <button className="btn px-2 py-1" onClick={fillSample}>一键示例</button>
          <button className="btn px-2 py-1" onClick={clearAll}>清空</button>
        </div>
      </div>

      <div>
        <label className="label">飞书文档链接（可选，加分项）</label>
        <input
          className="input"
          placeholder="https://xxx.feishu.cn/docx/...... 或 wiki/..."
          value={larkUrl}
          onChange={(e) => onChangeLark(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500">说明：读取飞书文档需后端代理调用官方 API。前端仅提供输入框，演示用例请直接粘贴 PRD 文本。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">上传 UI 截图（可选）</label>
          <input type="file" accept="image/*" multiple onChange={(e)=>onFiles(e.target.files, 'ui')} />
          <p className="mt-1 text-xs text-slate-500">用于识别按钮/输入/表单等交互控件，结合 PRD 生成 UI 级测试用例。</p>
        </div>
        <div>
          <label className="label">上传流程图（可选）</label>
          <input type="file" accept="image/*" multiple onChange={(e)=>onFiles(e.target.files, 'flow')} />
          <p className="mt-1 text-xs text-slate-500">用于识别分支/循环/关键节点，生成路径覆盖类测试用例。</p>
        </div>
      </div>

      <p className="text-xs text-slate-500">提示：图片会在前端自动压缩/栅格化为 PNG（最长边 ≤ 1280），建议一次上传 1–3 张关键图；过大的 SVG 会被自动转换为 PNG 以提升识别成功率。</p>

      {images && images.length > 0 && (
        <div>
          <div className="label">已选择的图片（{images.length}）</div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((img, i)=> (
              <div key={i} className="relative border rounded-lg overflow-hidden">
                <img src={img.data} alt={img.kind} className="w-full h-24 object-cover" />
                <div className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">{img.kind}</div>
                <button className="absolute top-1 right-1 bg-white/80 rounded px-1 text-xs" onClick={()=>removeAt(i)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 将任意图片（含 SVG）栅格化为 PNG，并限制最大宽度以降低体积
async function rasterizeToPngDataUrl(file: File, maxW = 1280, quality = 0.8): Promise<string> {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  const scale = img.width > maxW ? maxW / img.width : 1
  const w = Math.max(1, Math.floor(img.width * scale))
  const h = Math.max(1, Math.floor(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  // 使用 PNG，保留透明；如需更小体积可改为 image/jpeg
  return canvas.toDataURL('image/png', quality)
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
