import { useMemo, useState, useRef } from 'react'
import type { TestCase, GenerateRequest, GenerationOptions, InputImage } from './types.ts'
import { Bot, Brain, ClipboardCopy, FileJson, GitBranch, LayoutList, Loader2, Share2 } from 'lucide-react'
import InputPanel from './components/InputPanel.tsx'
import Controls from './components/Controls.tsx'
import ResultsTable from './components/ResultsTable.tsx'
import MindMapFlow from './components/MindMapFlow.tsx'
import { generateTestCases } from './utils/generate.ts'
import { casesToMarkdown, downloadJSON, copyToClipboard } from './utils/markdown.ts'
import { saveLatestCases } from './utils/storage.ts'
import ProgressPanel from './components/ProgressPanel.tsx'
import { postSSE } from './utils/stream.ts'

export type ViewMode = 'table' | 'mindmap'

export default function App() {
  const [prdText, setPrdText] = useState('')
  const [larkUrl, setLarkUrl] = useState('')
  const [images, setImages] = useState<InputImage[]>([])
  const [options, setOptions] = useState<GenerationOptions>({ temperature: 0.2 })
  const [view, setView] = useState<ViewMode>('table')
  const [cases, setCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 流式输出
  const [streaming, setStreaming] = useState(false)      // 是否启用流式模式
  const [isStreaming, setIsStreaming] = useState(false)  // 正在流式中
  const [events, setEvents] = useState<{event:string; data:any; t:number}[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const canGenerate = useMemo(() => (
    (prdText && prdText.trim().length > 0) || (larkUrl && larkUrl.trim().length > 0) || (images && images.length > 0)
  ), [prdText, larkUrl, images])

  const onGenerate = async () => {
    setError(null)
    if (streaming) {
      startStream()
      return
    }
    setLoading(true)
    try {
      const payload: GenerateRequest = {
        prdText: prdText.trim() || undefined,
        larkUrl: larkUrl.trim() || undefined,
        images: images.length ? images : undefined,
        options,
      }
      const out = await generateTestCases(payload)
      setCases(out)
      try { saveLatestCases(out) } catch {}
    } catch (e: any) {
      setError(e?.message || '生成失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  function line(event:string, data:any){ return { event, data, t: Date.now() } }

  const startStream = async () => {
    // 若已有流在跑，先停止
    if (abortRef.current) {
      try { abortRef.current.abort() } catch {}
    }
    const ac = new AbortController()
    abortRef.current = ac

    setIsStreaming(true)
    setEvents([])
    setCases([])
    try {
      const payload: any = {
        prdText: prdText.trim() || '',
        larkUrl: larkUrl.trim() || undefined,
        images: images.length ? images : undefined,
        options,
      }
      await postSSE('/api/generate/stream', payload, (evt) => {
        setEvents(prev => [...prev, line(evt.event, evt.data)])
        if (evt.event === 'meta') {
          try { (window as any).__genMeta = evt.data } catch {}
        }
        if (evt.event === 'cases' && Array.isArray(evt.data)) {
          setCases(prev => [...prev, ...evt.data])
        }
        if (evt.event === 'error') {
          setError(evt.data?.message || '生成失败')
          setIsStreaming(false)
        }
        if (evt.event === 'done') {
          try { saveLatestCases((prev => prev)(cases)) } catch {}
          setIsStreaming(false)
        }
      }, ac.signal)
    } catch (e:any) {
      if (e.name === 'AbortError') {
        setError('已停止生成')
      } else {
        setError(e?.message || '生成失败')
      }
      setIsStreaming(false)
    } finally {
      abortRef.current = null
    }
  }

  const stopStream = () => {
    try { abortRef.current?.abort() } catch {}
    abortRef.current = null
    setIsStreaming(false)
  }

  const onCopyMarkdown = async () => {
    const md = casesToMarkdown(cases)
    await copyToClipboard(md)
  }

  const onExportJSON = () => {
    downloadJSON(cases, 'test-cases.json')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-slate-950/70">
        <div className="container-max py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white grid place-items-center"><Bot size={18} /></div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">基于大模型的测试用例生成器</h1>
            <p className="text-xs text-slate-500">粘贴 PRD / 输入飞书链接 / 上传 UI 截图或流程图，自动生成可执行的测试用例</p>
          </div>
          <div className="flex items-center gap-2">
            {(() => { try { return (window as any).__genMeta?.mode === 'vision' ? <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">多模态</span> : null } catch { return null } })()}
            <a className="btn" href="#/eval">评测</a>
            <a className="btn" href="#/form"><Share2 size={16}/>表单模式</a>
            <a className="btn" href="#" onClick={(e)=>e.preventDefault()}>项目说明</a>
          </div>
        </div>
      </header>

      <main className="container-max py-6 space-y-6">
        {/* 输入与控制区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4">
            <InputPanel
              prdText={prdText}
              larkUrl={larkUrl}
              images={images}
              onChangePrd={setPrdText}
              onChangeLark={setLarkUrl}
              onChangeImages={setImages}
            />
          </div>
          <div className="card p-4 flex flex-col gap-4">
            <Controls options={options} onChange={setOptions} />

            {/* 流式输出开关 */}
            <div className="text-xs text-slate-500">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={streaming} onChange={(e)=>setStreaming(e.target.checked)} />
                流式输出(beta)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canGenerate || loading || isStreaming} onClick={onGenerate}>
                {(loading || isStreaming) ? (<><Loader2 className="animate-spin" size={16}/> 生成中...</>) : (<><Brain size={16}/> 生成测试用例</>)}
              </button>
              {isStreaming && (
                <button className="btn" onClick={stopStream}>停止生成</button>
              )}
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2">{error}</div>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn" onClick={() => setView('table')}><LayoutList size={16}/>表格视图</button>
              <button className="btn" onClick={() => setView('mindmap')}><GitBranch size={16}/>思维导图</button>
              <button className="btn" onClick={onCopyMarkdown}><ClipboardCopy size={16}/>复制 Markdown</button>
              <button className="btn" onClick={onExportJSON}><FileJson size={16}/>导出 JSON</button>
              <a className="btn" href="#/eval">一键评测</a>
            </div>
          </div>
        </div>

        {/* 结果区 */}
        <div className="card p-4">
          {isStreaming ? (
            <>
              <div className="text-slate-500 mb-2">正在流式生成测试用例…</div>
              <ProgressPanel lines={events} />
              {cases.length > 0 && (
                view === 'table' ? <ResultsTable cases={cases} /> : <MindMapFlow cases={cases} />
              )}
            </>
          ) : loading ? (
            <div className="py-10 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> 正在生成测试用例...</div>
          ) : cases.length === 0 ? (
            <div className="py-10 text-center text-slate-500">暂无结果，请输入 PRD/飞书链接/上传图片 并点击生成</div>
          ) : view === 'table' ? (
            <ResultsTable cases={cases} />
          ) : (
            <MindMapFlow cases={cases} />
          )}
        </div>
      </main>

      <footer className="container-max py-6 text-xs text-slate-500">
        说明：飞书文档读取需后端代理；多模态识别需后端模型支持（OpenAI兼容图像输入）。当前前端已传入 base64 图片给后端。流式输出为 SSE，若部署在 Nginx 请关闭代理缓冲。
      </footer>
    </div>
  )
}
