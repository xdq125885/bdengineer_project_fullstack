import type { TestCase, MatchPair } from './types.ts'
import { caseSimilarity } from './similarity.ts'

export function completeness(tc: TestCase): number {
  let ok = 0
  if (tc.title) ok++
  if (tc.preconditions && tc.preconditions.length) ok++
  if (tc.steps && tc.steps.length) ok++
  if (tc.expected && tc.expected.length) ok++
  return ok / 4
}

export function duplicatesRate(
  cand: TestCase[],
  dupThreshold = 0.85,
  weights?: { title?: number; steps?: number; expected?: number }
): number {
  if (cand.length <= 1) return 0
  let dupPairs = 0
  let total = 0
  for (let i = 0; i < cand.length; i++) {
    for (let j = i + 1; j < cand.length; j++) {
      total++
      const s = caseSimilarity(cand[i], cand[j], weights)
      if (s >= dupThreshold) dupPairs++
    }
  }
  return total === 0 ? 0 : dupPairs / total
}

export function coverage(pairs: MatchPair[], baseLen: number): number {
  return baseLen ? pairs.length / baseLen : 0
}

export function avgSimilarity(pairs: MatchPair[]): number {
  return pairs.length ? pairs.reduce((acc, p) => acc + p.score, 0) / pairs.length : 0
}

export function avgCompleteness(arr: TestCase[]): number {
  return arr.length ? arr.reduce((acc, t) => acc + completeness(t), 0) / arr.length : 0
}

// ===== 扩展指标 =====
export function tagCoverage(base: TestCase[], cand: TestCase[]): number {
  const b = distinctTags(base)
  if (b.size === 0) return 1
  const c = distinctTags(cand)
  let inter = 0
  b.forEach(t => { if (c.has(t)) inter++ })
  return inter / b.size
}

export function featureCoverage(base: TestCase[], cand: TestCase[]): number {
  const b = new Set(base.map(x => x.feature).filter(Boolean))
  if (b.size === 0) return 1
  const c = new Set(cand.map(x => x.feature).filter(Boolean))
  let inter = 0
  b.forEach(f => { if (c.has(f)) inter++ })
  return inter / b.size
}

export function severityConsistency(base: TestCase[], cand: TestCase[]): number {
  const buckets: Array<'P0'|'P1'|'P2'|'P3'> = ['P0','P1','P2','P3']
  const pb = dist(base, buckets)
  const pc = dist(cand, buckets)
  // 1 - 0.5 * L1 距离（最大为2），归一化至 0~1
  let l1 = 0
  for (const k of buckets) l1 += Math.abs((pb[k] ?? 0) - (pc[k] ?? 0))
  return 1 - l1 / 2
}

function distinctTags(arr: TestCase[]): Set<string> {
  const set = new Set<string>()
  for (const t of arr) (t.tags || []).forEach(tag => { if (tag) set.add(String(tag)) })
  return set
}

function dist(arr: TestCase[], buckets: Array<'P0'|'P1'|'P2'|'P3'>): Record<string, number> {
  const total = arr.length || 1
  const cnt: Record<string, number> = {}
  for (const b of buckets) cnt[b] = 0
  for (const t of arr) {
    const s = (t.severity || 'P2') as 'P0'|'P1'|'P2'|'P3'
    if (cnt[s] === undefined) cnt[s] = 0
    cnt[s]++
  }
  for (const b of buckets) cnt[b] = cnt[b] / total
  return cnt
}
