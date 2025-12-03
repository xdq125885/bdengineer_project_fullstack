import type { TestCase } from './types.ts'
import { caseSimilarity } from './similarity.ts'

/**
 * 贪心最大匹配：按分数从高到低选取，不冲突即加入
 */
export function greedyMatch(
  base: TestCase[],
  cand: TestCase[],
  threshold: number,
  weights?: { title?: number; steps?: number; expected?: number }
) {
  const usedB = new Set<string>()
  const usedC = new Set<string>()
  const scores: { i: number; j: number; s: number }[] = []

  base.forEach((b, i) => {
    cand.forEach((c, j) => {
      const s = caseSimilarity(b, c, weights)
      if (s >= threshold) scores.push({ i, j, s })
    })
  })

  scores.sort((a, b) => b.s - a.s)
  const pairs: { base: TestCase; cand: TestCase; score: number }[] = []
  for (const { i, j, s } of scores) {
    const bi = base[i].id
    const cj = cand[j].id
    if (usedB.has(bi) || usedC.has(cj)) continue
    usedB.add(bi); usedC.add(cj)
    pairs.push({ base: base[i], cand: cand[j], score: s })
  }
  return pairs
}

