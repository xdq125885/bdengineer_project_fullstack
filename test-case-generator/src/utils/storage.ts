import type { TestCase } from '../types.ts'

const KEY = 'tcg_latest_cases'

export function saveLatestCases(cases: TestCase[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases))
  } catch {}
}

export function loadLatestCases(): TestCase[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    return arr
  } catch {
    return null
  }
}

