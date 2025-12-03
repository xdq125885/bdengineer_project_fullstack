import type { TestCase } from '../types.ts'

export type { TestCase }

export interface MatchPair {
  base: TestCase
  cand: TestCase
  score: number
}

export interface EvalOptions {
  threshold?: number // 用例相似度阈值（0~1）
  dupThreshold?: number // 候选近重复阈值（0~1）
  weights?: {
    title?: number
    steps?: number
    expected?: number
  }
}

export interface EvalReport {
  threshold: number
  coverage: number // 覆盖率：≥阈值匹配到的基准占比
  avgSimilarity: number // 平均相似度（仅对匹配对）
  duplicatesRate: number // 候选近重复率
  completenessBase: number // 基准完整性（字段齐全占比）
  completenessCand: number // 候选完整性
  // 扩展指标
  tagCoverage: number // 标签覆盖率（Base 标签被 Cand 覆盖的比例）
  featureCoverage: number // Feature 覆盖率（Base Feature 被 Cand 覆盖的比例）
  severityConsistency: number // 严重级分布一致性（0~1，越大越一致）

  matched: MatchPair[]
  unmatchedBase: TestCase[]
  unmatchedCand: TestCase[]
}
