import type { TestCase } from '../types'

interface Props { cases: TestCase[] }

export default function ResultsTable({ cases }: Props) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
          <tr className="text-left">
            <th className="p-3 font-medium">Feature</th>
            <th className="p-3 font-medium">标题</th>
            <th className="p-3 font-medium">前置条件</th>
            <th className="p-3 font-medium">操作步骤</th>
            <th className="p-3 font-medium">预期结果</th>
            <th className="p-3 font-medium">严重级</th>
            <th className="p-3 font-medium">标签</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-t border-slate-200/60 dark:border-slate-800 align-top">
              <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{c.feature}</td>
              <td className="p-3 font-medium">{c.title}</td>
              <td className="p-3"><List data={c.preconditions}/></td>
              <td className="p-3"><List data={c.steps}/></td>
              <td className="p-3"><List data={c.expected}/></td>
              <td className="p-3 whitespace-nowrap">{c.severity ?? '-'}</td>
              <td className="p-3 whitespace-nowrap">{c.tags?.join(', ') ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function List({ data }: { data: string[] }) {
  if (!data || data.length === 0) return <span className="text-slate-400">-</span>
  return (
    <ol className="list-decimal list-inside space-y-1">
      {data.map((s, i) => (<li key={i} className="whitespace-pre-wrap">{s}</li>))}
    </ol>
  )
}

