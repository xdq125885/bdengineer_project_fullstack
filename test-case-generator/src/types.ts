export type Severity = 'P0' | 'P1' | 'P2' | 'P3'

export interface InputImage {
  kind: 'ui' | 'flow'
  data: string
}

export interface TestCase {
  id: string
  feature: string
  title: string
  preconditions: string[]
  steps: string[]
  expected: string[]
  severity?: Severity
  tags?: string[]
}

export type GenerationStrategy = 'simple' | 'cot' | 'self_refine'

export interface GenerationOptions {
  model?: string
  temperature?: number
  strategy?: GenerationStrategy
  maxCases?: number
}

export interface GenerateRequest {
  prdText?: string
  larkUrl?: string
  images?: InputImage[]
  options?: GenerationOptions
}
