import { tokenize, joinList } from './text.ts'
import type { TestCase } from './types.ts'

export function jaccard(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 && bTokens.length === 0) return 1
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  let inter = 0
  a.forEach(t => { if (b.has(t)) inter++ })
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

export function textSim(a: string, b: string): number {
  return jaccard(tokenize(a), tokenize(b))
}

export function listSim(a: string[] | undefined, b: string[] | undefined): number {
  return jaccard(tokenize(joinList(a)), tokenize(joinList(b)))
}

/**
 * 用例相似度（加权）
 * 默认权重：标题 0.5，步骤 0.3，预期 0.2
 */
export function caseSimilarity(
  a: TestCase,
  b: TestCase,
  weights?: { title?: number; steps?: number; expected?: number }
): number {
  const wTitle = weights?.title ?? 0.5
  const wSteps = weights?.steps ?? 0.3
  const wExpected = weights?.expected ?? 0.2
  const sum = wTitle + wSteps + wExpected || 1

  const title = textSim(a.title, b.title)
  const steps = listSim(a.steps, b.steps)
  const expected = listSim(a.expected, b.expected)

  return (wTitle * title + wSteps * steps + wExpected * expected) / sum
}

