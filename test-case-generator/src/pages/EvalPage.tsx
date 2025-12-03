import { useMemo, useState } from 'react'
import type { TestCase } from '../types.ts'
import { evaluate, parseCasesJSON, reportToCSV, reportToMarkdown, reportToExcelHtml, reportToXLSXBlob, type EvalReport } from '../eval/index.ts'
import { loadLatestCases } from '../utils/storage.ts'

function downloadText(name: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function EvalPage() {
  const [baseText, setBaseText] = useState('')
  const [candText, setCandText] = useState('')
  const [threshold, setThreshold] = useState(0.6)
  const [dupThreshold, setDupThreshold] = useState(0.85)
  const [wTitle, setWTitle] = useState(0.5)
  const [wSteps, setWSteps] = useState(0.3)
  const [wExpected, setWExpected] = useState(0.2)
  const [report, setReport] = useState<EvalReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const baseCount = useMemo(() => safeCount(baseText), [baseText])
  const candCount = useMemo(() => safeCount(candText), [candText])

  const onLoadLatest = () => {
    const latest = loadLatestCases()
    if (!latest) { setError('未找到本地的最新候选用例，请先在主页面生成一次。'); return }
    setCandText(JSON.stringify(latest, null, 2))
    setError(null)
  }

  const onResetWeights = () => {
    setWTitle(0.5); setWSteps(0.3); setWExpected(0.2)
  }

  const onEval = () => {
    setError(null)
    try {
      const base = parseCasesJSON(baseText)
      const cand = parseCasesJSON(candText)
      const rep = evaluate(base, cand, { threshold, dupThreshold, weights: { title: wTitle, steps: wSteps, expected: wExpected } })
      setReport(rep)
    } catch (e: any) {
      setError(e?.message || '评测失败')
    }
  }

  const onExportCSV = () => {
    if (!report) return
    const csv = reportToCSV(report)
    downloadText('eval_report.csv', csv, 'text/csv;charset=utf-8')
  }

  const onExportMD = () => {
    if (!report) return
    const md = reportToMarkdown(report)
    downloadText('eval_report.md', md, 'text/markdown;charset=utf-8')
  }

  const onExportXLS = () => {
    if (!report) return
    const html = reportToExcelHtml(report)
    downloadText('eval_report.xls', html, 'application/vnd.ms-excel')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">用例评测（基准对比）</h1>
            <p className="text-xs text-slate-500">导入人工基准与候选用例，计算覆盖率/相似度/重复率/完整性等指标</p>
          </div>
          <a className="btn" href="#/main">返回生成</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">基准（人工编写的测试用例 JSON 数组）</label>
              <span className="text-xs text-slate-500">共 {baseCount} 条</span>
            </div>
            <textarea className="input h-64 resize-y font-mono" placeholder="粘贴基准 JSON 数组..." value={baseText} onChange={(e)=>setBaseText(e.target.value)} />
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">候选（模型生成的测试用例 JSON 数组）</label>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <button className="btn px-2 py-1" onClick={onLoadLatest}>从最新结果加载</button>
                <span>共 {candCount} 条</span>
              </div>
            </div>
            <textarea className="input h-64 resize-y font-mono" placeholder="粘贴候选 JSON 数组..." value={candText} onChange={(e)=>setCandText(e.target.value)} />
          </div>
        </div>

        <div className="card p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">匹配阈值（threshold）: {threshold.toFixed(2)}</label>
              <input type="range" min={0} max={1} step={0.05} value={threshold} onChange={(e)=>setThreshold(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label">近重复阈值（dupThreshold）: {dupThreshold.toFixed(2)}</label>
              <input type="range" min={0} max={1} step={0.05} value={dupThreshold} onChange={(e)=>setDupThreshold(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">标题权重（{wTitle.toFixed(2)}）</label>
              <input type="range" min={0} max={1} step={0.05} value={wTitle} onChange={(e)=>setWTitle(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label">步骤权重（{wSteps.toFixed(2)}）</label>
              <input type="range" min={0} max={1} step={0.05} value={wSteps} onChange={(e)=>setWSteps(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label">预期权重（{wExpected.toFixed(2)}）</label>
              <input type="range" min={0} max={1} step={0.05} value={wExpected} onChange={(e)=>setWExpected(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={onEval}>运行评测</button>
            <button className="btn" onClick={onResetWeights}>重置权重</button>
            {report && <>
              <button className="btn" onClick={onExportCSV}>导出匹配对 CSV</button>
              <button className="btn" onClick={onExportMD}>导出 Markdown</button>
              <button className="btn" onClick={onExportXLS}>导出 Excel</button>
            </>}
            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-2">{error}</div>}
          </div>
        </div>

        {report && (
          <div className="space-y-4">
            <div className="card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <Metric label="覆盖率" value={report.coverage} />
              <Metric label="平均相似度" value={report.avgSimilarity} />
              <Metric label="候选重复率" value={report.duplicatesRate} />
              <Metric label="基准完整性" value={report.completenessBase} />
              <Metric label="候选完整性" value={report.completenessCand} />
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <div className="text-xs text-slate-500 mb-1">阈值</div>
                <div className="text-lg font-semibold">{report.threshold.toFixed(2)}</div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">匹配对（{report.matched.length} 对）</h3>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr className="text-left">
                      <th className="p-2">Base ID</th>
                      <th className="p-2">Base 标题</th>
                      <th className="p-2">Base Feature</th>
                      <th className="p-2">Base 严重级</th>
                      <th className="p-2">Base 标签</th>
                      <th className="p-2">Cand ID</th>
                      <th className="p-2">Cand 标题</th>
                      <th className="p-2">Cand Feature</th>
                      <th className="p-2">Cand 严重级</th>
                      <th className="p-2">Cand 标签</th>
                      <th className="p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.matched.map((p, idx) => (
                      <tr key={idx} className="border-t border-slate-200/60 dark:border-slate-800 align-top">
                        <td className="p-2 whitespace-nowrap text-slate-500">{p.base.id}</td>
                        <td className="p-2">{p.base.title}</td>
                        <td className="p-2 whitespace-nowrap">{p.base.feature}</td>
                        <td className="p-2 whitespace-nowrap">{p.base.severity || '-'}</td>
                        <td className="p-2 whitespace-nowrap">{(p.base.tags||[]).join(' / ') || '-'}</td>
                        <td className="p-2 whitespace-nowrap text-slate-500">{p.cand.id}</td>
                        <td className="p-2">{p.cand.title}</td>
                        <td className="p-2 whitespace-nowrap">{p.cand.feature}</td>
                        <td className="p-2 whitespace-nowrap">{p.cand.severity || '-'}</td>
                        <td className="p-2 whitespace-nowrap">{(p.cand.tags||[]).join(' / ') || '-'}</td>
                        <td className="p-2 whitespace-nowrap">{p.score.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Unmatched title={`未匹配的基准（${report.unmatchedBase.length}）`} data={report.unmatchedBase} />
              <Unmatched title={`未匹配的候选（${report.unmatchedCand.length}）`} data={report.unmatchedCand} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-semibold">{(value * 100).toFixed(1)}%</div>
    </div>
  )
}

function Unmatched({ title, data }: { title: string; data: TestCase[] }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {data.length === 0 ? (
        <div className="text-sm text-slate-500">无</div>
      ) : (
        <ul className="text-sm list-disc list-inside space-y-1">
          {data.slice(0, 100).map((c) => (
            <li key={c.id}>
              <span className="text-slate-500">{c.id}</span> — {c.title}
              <span className="text-slate-500"> ｜ {c.feature}</span>
              <span className="text-slate-500"> ｜ {c.severity || '-'}</span>
              <span className="text-slate-500"> ｜ {(c.tags||[]).join(' / ') || '-'}</span>
            </li>
          ))}
          {data.length > 100 && <li className="text-slate-400">... 共 {data.length} 条</li>}
        </ul>
      )}
    </div>
  )
}

function safeCount(text: string) {
  try {
    const arr = JSON.parse(text)
    return Array.isArray(arr) ? arr.length : 0
  } catch { return 0 }
}
