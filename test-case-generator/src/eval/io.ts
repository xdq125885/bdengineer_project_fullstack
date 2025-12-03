import type { TestCase, EvalReport } from './types.ts'

// ========== 导入解析 ==========
export function parseCasesJSON(text: string): TestCase[] {
  const data = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('JSON 需为数组')
  const out: TestCase[] = data.map((it, idx) => ({
    id: String(it.id ?? `TC-${String(idx + 1).padStart(3, '0')}`),
    feature: String(it.feature ?? '通用'),
    title: String(it.title ?? `用例 ${idx + 1}`),
    preconditions: normalizeList(it.preconditions),
    steps: normalizeList(it.steps),
    expected: normalizeList(it.expected ?? it.expectedResult),
    severity: normalizeSeverity(it.severity),
    tags: normalizeList(it.tags)
  }))
  return out
}

export function parseCasesCSV(text: string): TestCase[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = parseCsvLine(lines[0])
  const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const idI = idx('id'); const titleI = idx('title'); const featureI = idx('feature')
  const precI = idx('preconditions'); const stepsI = idx('steps'); const expectedI = idx('expected');
  const sevI = idx('severity'); const tagsI = idx('tags')
  const out: TestCase[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length === 0) continue
    const id = at(cols, idI) || `TC-${String(i).padStart(3, '0')}`
    const title = at(cols, titleI) || `用例 ${i}`
    const feature = at(cols, featureI) || '通用'
    const preconditions = splitList(at(cols, precI))
    const steps = splitList(at(cols, stepsI))
    const expected = splitList(at(cols, expectedI))
    const severity = normalizeSeverity(at(cols, sevI))
    const tags = splitTags(at(cols, tagsI))
    out.push({ id, title, feature, preconditions, steps, expected, severity, tags })
  }
  return out
}

export function parseCasesMarkdown(text: string): TestCase[] {
  // 兼容通过 utils/markdown.casesToMarkdown 导出的结构：
  // # Feature\n## Title\n### 前置条件\n1. ...\n### 操作步骤\n1. ...\n### 预期结果\n1. ...
  const lines = text.split(/\r?\n/)
  const out: TestCase[] = []
  let currentFeature = '通用'
  let cur: TestCase | null = null
  let section: 'pre'|'steps'|'exp'|null = null

  const flush = () => { if (cur) { out.push(cur); cur = null } }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('# ')) {
      flush(); currentFeature = line.replace(/^#\s+/, '').trim() || '通用'
      continue
    }
    if (line.startsWith('## ')) {
      flush();
      const title = line.replace(/^##\s+/, '').trim() || `用例 ${out.length + 1}`
      cur = { id: `TC-${String(out.length + 1).padStart(3, '0')}`, feature: currentFeature, title, preconditions: [], steps: [], expected: [] }
      section = null
      continue
    }
    if (/^###\s*前置条件/.test(line)) { section = 'pre'; continue }
    if (/^###\s*(操作步骤|步骤)/.test(line)) { section = 'steps'; continue }
    if (/^###\s*(预期结果|预期)/.test(line)) { section = 'exp'; continue }

    const m = /^\d+\.\s*(.+)$/.exec(line)
    if (m && cur) {
      if (section === 'pre') cur.preconditions.push(m[1].trim())
      else if (section === 'steps') cur.steps.push(m[1].trim())
      else if (section === 'exp') cur.expected.push(m[1].trim())
    }
  }
  flush()
  return out
}

export function parseCasesAuto(text: string): TestCase[] {
  const t = (text || '').trim()
  if (!t) return []
  // 1) JSON
  try { return parseCasesJSON(t) } catch {}
  // 2) Markdown
  if (/^#\s+/.test(t) || /^(###|##)\s+/.test(t)) {
    const md = parseCasesMarkdown(t)
    if (md.length) return md
  }
  // 3) CSV（有逗号分隔且包含 header）
  if (/[,\n]/.test(t)) {
    try {
      const csv = parseCasesCSV(t)
      if (csv.length) return csv
    } catch {}
  }
  throw new Error('无法解析输入：请提供 JSON 数组，或符合规范的 Markdown/CSV')
}

// ========== 导出 ==========
export function reportToCSV(report: EvalReport): string {
  const rows: string[] = []
  rows.push('base_id,base_title,base_feature,base_severity,base_tags,cand_id,cand_title,cand_feature,cand_severity,cand_tags,score')
  for (const p of report.matched) {
    rows.push([
      csv(p.base.id),
      csv(p.base.title),
      csv(p.base.feature),
      csv(p.base.severity || ''),
      csv((p.base.tags || []).join('|')),
      csv(p.cand.id),
      csv(p.cand.title),
      csv(p.cand.feature),
      csv(p.cand.severity || ''),
      csv((p.cand.tags || []).join('|')),
      p.score.toFixed(3),
    ].join(','))
  }
  return rows.join('\n')
}

export function reportToMarkdown(report: EvalReport): string {
  const lines: string[] = []
  lines.push('# 测试用例评测报告')
  lines.push('')
  lines.push('## 指标概览')
  lines.push(`- 覆盖率：${pct(report.coverage)}`)
  lines.push(`- 平均相似度：${pct(report.avgSimilarity)}`)
  lines.push(`- 候选重复率：${pct(report.duplicatesRate)}`)
  lines.push(`- 基准完整性：${pct(report.completenessBase)}`)
  lines.push(`- 候选完整性：${pct(report.completenessCand)}`)
  lines.push(`- 标签覆盖率：${pct(report.tagCoverage)}`)
  lines.push(`- Feature 覆盖率：${pct(report.featureCoverage)}`)
  lines.push(`- 严重级分布一致性：${pct(report.severityConsistency)}`)
  lines.push(`- 匹配阈值：${report.threshold.toFixed(2)}`)
  lines.push('')

  lines.push('## 匹配对')
  lines.push('| Base ID | Base 标题 | Base Feature | Base 严重级 | Base 标签 | Cand ID | Cand 标题 | Cand Feature | Cand 严重级 | Cand 标签 | 相似度 |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const p of report.matched) {
    lines.push(`| ${md(p.base.id)} | ${md(p.base.title)} | ${md(p.base.feature)} | ${md(p.base.severity || '')} | ${md((p.base.tags||[]).join(' / '))} | ${md(p.cand.id)} | ${md(p.cand.title)} | ${md(p.cand.feature)} | ${md(p.cand.severity || '')} | ${md((p.cand.tags||[]).join(' / '))} | ${p.score.toFixed(3)} |`)
  }
  lines.push('')

  lines.push(`## 未匹配的基准（${report.unmatchedBase.length}）`)
  for (const b of report.unmatchedBase) {
    lines.push(`- [${md(b.id)}] ${md(b.title)} | ${md(b.feature)} | ${md(b.severity || '')} | ${md((b.tags||[]).join(' / '))}`)
  }
  lines.push('')
  lines.push(`## 未匹配的候选（${report.unmatchedCand.length}）`)
  for (const c of report.unmatchedCand) {
    lines.push(`- [${md(c.id)}] ${md(c.title)} | ${md(c.feature)} | ${md(c.severity || '')} | ${md((c.tags||[]).join(' / '))}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function reportToExcelHtml(report: EvalReport): string {
  const esc = (s: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const head = '<meta charset="UTF-8">'
  const summary = `
    <table border="1">
      <tr><th>指标</th><th>值</th></tr>
      <tr><td>覆盖率</td><td>${pct(report.coverage)}</td></tr>
      <tr><td>平均相似度</td><td>${pct(report.avgSimilarity)}</td></tr>
      <tr><td>候选重复率</td><td>${pct(report.duplicatesRate)}</td></tr>
      <tr><td>基准完整性</td><td>${pct(report.completenessBase)}</td></tr>
      <tr><td>候选完整性</td><td>${pct(report.completenessCand)}</td></tr>
      <tr><td>标签覆盖率</td><td>${pct(report.tagCoverage)}</td></tr>
      <tr><td>Feature 覆盖率</td><td>${pct(report.featureCoverage)}</td></tr>
      <tr><td>严重级分布一致性</td><td>${pct(report.severityConsistency)}</td></tr>
      <tr><td>匹配阈值</td><td>${report.threshold.toFixed(2)}</td></tr>
    </table>
  `
  const matchedRows = report.matched.map(p => `
    <tr>
      <td>${esc(p.base.id)}</td>
      <td>${esc(p.base.title)}</td>
      <td>${esc(p.base.feature)}</td>
      <td>${esc(p.base.severity || '')}</td>
      <td>${esc((p.base.tags||[]).join(' / '))}</td>
      <td>${esc(p.cand.id)}</td>
      <td>${esc(p.cand.title)}</td>
      <td>${esc(p.cand.feature)}</td>
      <td>${esc(p.cand.severity || '')}</td>
      <td>${esc((p.cand.tags||[]).join(' / '))}</td>
      <td>${p.score.toFixed(3)}</td>
    </tr>`).join('')
  const matched = `
    <table border="1">
      <tr>
        <th>Base ID</th><th>Base 标题</th><th>Base Feature</th><th>Base 严重级</th><th>Base 标签</th>
        <th>Cand ID</th><th>Cand 标题</th><th>Cand Feature</th><th>Cand 严重级</th><th>Cand 标签</th><th>相似度</th>
      </tr>
      ${matchedRows}
    </table>
  `
  const unBase = report.unmatchedBase.map(b => `<tr><td>${esc(b.id)}</td><td>${esc(b.title)}</td><td>${esc(b.feature)}</td><td>${esc(b.severity || '')}</td><td>${esc((b.tags||[]).join(' / '))}</td></tr>`).join('')
  const unCand = report.unmatchedCand.map(c => `<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.feature)}</td><td>${esc(c.severity || '')}</td><td>${esc((c.tags||[]).join(' / '))}</td></tr>`).join('')

  const unmatched = `
    <table border="1">
      <tr><th colspan="5">未匹配的基准（${report.unmatchedBase.length}）</th></tr>
      <tr><th>ID</th><th>标题</th><th>Feature</th><th>严重级</th><th>标签</th></tr>
      ${unBase}
      <tr><th colspan="5">未匹配的候选（${report.unmatchedCand.length}）</th></tr>
      <tr><th>ID</th><th>标题</th><th>Feature</th><th>严重级</th><th>标签</th></tr>
      ${unCand}
    </table>
  `

  return `<html><head>${head}</head><body>${summary}<br/>${matched}<br/>${unmatched}</body></html>`
}

async function loadXLSX(): Promise<any> {
  try {
    const mod: any = await import('xlsx')
    return mod.default ?? mod
  } catch (e) {
    // 某些环境需要显式使用 ESM 构建路径
    try {
      const mod: any = await import('xlsx/xlsx.mjs')
      return mod.default ?? mod
    } catch (e2) {
      throw new Error('未找到 xlsx 依赖，请先在项目根目录执行 npm i')
    }
  }
}

export async function reportToXLSXBlob(report: EvalReport): Promise<Blob> {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['指标', '值'],
    ['覆盖率', pct(report.coverage)],
    ['平均相似度', pct(report.avgSimilarity)],
    ['候选重复率', pct(report.duplicatesRate)],
    ['基准完整性', pct(report.completenessBase)],
    ['候选完整性', pct(report.completenessCand)],
    ['标签覆盖率', pct(report.tagCoverage)],
    ['Feature 覆盖率', pct(report.featureCoverage)],
    ['严重级分布一致性', pct(report.severityConsistency)],
    ['匹配阈值', report.threshold.toFixed(2)],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Matched sheet
  const matchedRows: (string | number)[][] = [
    ['Base ID','Base 标题','Base Feature','Base 严重级','Base 标签','Cand ID','Cand 标题','Cand Feature','Cand 严重级','Cand 标签','Score']
  ]
  for (const p of report.matched) {
    matchedRows.push([
      p.base.id, p.base.title, p.base.feature, p.base.severity || '', (p.base.tags||[]).join(' / '),
      p.cand.id, p.cand.title, p.cand.feature, p.cand.severity || '', (p.cand.tags||[]).join(' / '), p.score
    ])
  }
  const wsMatched = XLSX.utils.aoa_to_sheet(matchedRows)
  XLSX.utils.book_append_sheet(wb, wsMatched, 'Matched')

  // Unmatched sheets
  const wsUnBase = XLSX.utils.aoa_to_sheet([
    ['ID','标题','Feature','严重级','标签'],
    ...report.unmatchedBase.map(b => [b.id, b.title, b.feature, b.severity || '', (b.tags||[]).join(' / ')])
  ])
  XLSX.utils.book_append_sheet(wb, wsUnBase, 'UnmatchedBase')

  const wsUnCand = XLSX.utils.aoa_to_sheet([
    ['ID','标题','Feature','严重级','标签'],
    ...report.unmatchedCand.map(c => [c.id, c.title, c.feature, c.severity || '', (c.tags||[]).join(' / ')])
  ])
  XLSX.utils.book_append_sheet(wb, wsUnCand, 'UnmatchedCand')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ===== 工具 =====
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else { inQ = !inQ }
      continue
    }
    if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function at(arr: string[], i: number): string { return i >= 0 && i < arr.length ? arr[i] : '' }
function splitList(s: string): string[] { return s ? s.split(/\s*\|\s*|\s*;\s*|\s*，\s*|\s*、\s*/).filter(Boolean) : [] }
function splitTags(s: string): string[] { return splitList(s) }

function normalizeList(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

function normalizeSeverity(v: any): TestCase['severity'] | undefined {
  if (!v) return undefined
  const s = String(v).toUpperCase()
  if (s === 'P0' || s === 'P1' || s === 'P2' || s === 'P3') return s as TestCase['severity']
  if (s.includes('HIGH')) return 'P0'
  if (s.includes('MEDIUM')) return 'P2'
  if (s.includes('LOW')) return 'P3'
  return undefined
}

export function reportToCSVOld(report: EvalReport): string { return reportToCSV(report) }

function csv(v: string): string {
  const s = (v ?? '').replace(/\r|\n/g, ' ')
  if (s.includes(',') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function pct(n: number): string { return (n * 100).toFixed(1) + '%' }
function md(s: string): string { return s.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;') }
