interface Line { event: string; data: any; t: number }

export default function ProgressPanel({ lines }: { lines: Line[] }) {
  if (!lines || lines.length === 0) return null
  return (
    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs max-h-56 overflow-auto">
      {lines.map((l, i) => (
        <div key={i} className="flex items-start gap-2 mb-1">
          <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap">{l.event}</span>
          <span className="text-slate-500 whitespace-pre-wrap break-words">{formatData(l.data)}</span>
          <span className="ml-auto text-[10px] text-slate-400">{new Date(l.t).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  )
}

function formatData(d: any) {
  if (d == null) return ''
  if (typeof d === 'string') return d
  try { return JSON.stringify(d) } catch { return String(d) }
}

