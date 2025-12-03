import type { TestCase } from '../types'

interface Props { cases: TestCase[] }

type Group = Record<string, TestCase[]>

export default function MindMapView({ cases }: Props) {
  const groups: Group = cases.reduce((acc, c) => {
    const key = c.feature || '未分组'
    acc[key] = acc[key] || []
    acc[key].push(c)
    return acc
  }, {} as Group)

  const features = Object.keys(groups)

  return (
    <div className="overflow-auto">
      <div className="min-w-[800px]">
        <div className="flex gap-6">
          {features.map((feat) => (
            <FeatureNode key={feat} feature={feat} items={groups[feat]} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeatureNode({ feature, items }: { feature: string, items: TestCase[] }) {
  return (
    <div className="relative">
      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 min-w-56 shadow-sm">
        <div className="font-semibold text-blue-600 dark:text-blue-400">{feature}</div>
        <div className="text-xs text-slate-500 mt-1">用例数：{items.length}</div>
      </div>
      <div className="ml-8 mt-4 border-l border-slate-300 dark:border-slate-700 pl-6 space-y-4">
        {items.map((c) => (
          <CaseNode key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}

function CaseNode({ c }: { c: TestCase }) {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-4 w-6 h-px bg-slate-300 dark:bg-slate-700" />
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 min-w-72">
        <div className="font-medium">{c.title}</div>
        <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
          <InfoBlock title="前置" items={c.preconditions} />
          <InfoBlock title="步骤" items={c.steps} />
          <InfoBlock title="预期" items={c.expected} />
        </div>
        <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
          <span>ID: {c.id}</span>
          {c.severity && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{c.severity}</span>}
          {c.tags && c.tags.length > 0 && <span>#{c.tags.join(' #')}</span>}
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-slate-500 mb-1">{title}</div>
      {(!items || items.length === 0) ? (
        <div className="text-slate-400">-</div>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {items.slice(0, 4).map((t, i) => <li key={i} className="whitespace-pre-wrap">{t}</li>)}
          {items.length > 4 && <li className="text-slate-400">...（共 {items.length} 条）</li>}
        </ul>
      )}
    </div>
  )
}

