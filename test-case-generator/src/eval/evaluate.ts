import type { TestCase, EvalReport, EvalOptions } from './types.ts'
import { greedyMatch } from './match.ts'
import { coverage, avgSimilarity, duplicatesRate, avgCompleteness, tagCoverage, featureCoverage, severityConsistency } from './metrics.ts'

export function evaluate(base: TestCase[], cand: TestCase[], options?: EvalOptions): EvalReport {
  const threshold = clamp(options?.threshold ?? 0.6, 0, 1)
  const dupThreshold = clamp(options?.dupThreshold ?? 0.85, 0, 1)
  const weights = options?.weights

  const pairs = greedyMatch(base, cand, threshold, weights)
  const matchedBase = new Set(pairs.map(p => p.base.id))
  const matchedCand = new Set(pairs.map(p => p.cand.id))

  const report: EvalReport = {
    threshold,
    coverage: coverage(pairs, base.length),
    avgSimilarity: avgSimilarity(pairs),
    duplicatesRate: duplicatesRate(cand, dupThreshold, weights),
    completenessBase: avgCompleteness(base),
    completenessCand: avgCompleteness(cand),
    tagCoverage: tagCoverage(base, cand),
    featureCoverage: featureCoverage(base, cand),
    severityConsistency: severityConsistency(base, cand),
    matched: pairs,
    unmatchedBase: base.filter(b => !matchedBase.has(b.id)),
    unmatchedCand: cand.filter(c => !matchedCand.has(c.id)),
  }
  return report
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
