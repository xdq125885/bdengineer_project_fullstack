import type { TestCase } from '../types'

export function casesToMarkdown(cases: TestCase[]): string {
  const parts: string[] = []
  const grouped = groupBy(cases, c => c.feature || '通用')
  for (const feature of Object.keys(grouped)) {
    parts.push(`# ${escapeMd(feature)}`)
    for (const c of grouped[feature]) {
      parts.push(`## ${escapeMd(c.title)}`)
      if (c.severity || (c.tags && c.tags.length)) {
        const meta = [c.severity ? `严重级: ${c.severity}` : '', c.tags?.length ? `标签: ${c.tags.join(', ')}` : ''].filter(Boolean).join(' | ')
        if (meta) parts.push(`> ${meta}`)
      }
      parts.push(`### 前置条件`)
      parts.push(...formatList(c.preconditions))
      parts.push(`### 操作步骤`)
      parts.push(...formatList(c.steps))
      parts.push(`### 预期结果`)
      parts.push(...formatList(c.expected))
      parts.push('')
    }
  }
  return parts.join('\n')
}

export async function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

export function downloadJSON(data: unknown, filename = 'data.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatList(items: string[] | undefined): string[] {
  if (!items || items.length === 0) return ['- 无']
  return items.map((s, i) => `${i + 1}. ${escapeMd(s)}`)
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] ||= []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}

function escapeMd(s: string) {
  return s.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;'))
}

