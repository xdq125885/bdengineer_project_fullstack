const SYNONYMS: Array<[RegExp, string]> = [
  [/sign\s*in|log\s*in|登录/g, '登录'],
  [/sign\s*up|register|注册/g, '注册'],
  [/password|pwd|密码/g, '密码'],
  [/captcha|otp|验证码/g, '验证码'],
  [/phone\s*number|mobile|手机号|手机/g, '手机'],
  [/success|成功/g, '成功'],
  [/error|fail|失败/g, '失败'],
]

function normalizeSynonyms(input: string): string {
  let s = input
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep)
  return s
}

export function normalizeText(s: string): string {
  const lowered = (s || '').toLowerCase()
  const synonymed = normalizeSynonyms(lowered)
  return synonymed
    .replace(/[\s\u3000]+/g, ' ')
    .replace(/[\p{S}]/gu, ' ') // 移除符号类
    .replace(/\s+/g, ' ')
    .trim()
}

function cnBigrams(s: string): string[] {
  // 提取中文字符并生成 2-gram
  const chars = Array.from((s || '').replace(/[^\p{Script=Han}]/gu, ''))
  const grams: string[] = []
  for (let i = 0; i < chars.length - 1; i++) grams.push(chars[i] + chars[i + 1])
  return grams
}

export function tokenize(s: string): string[] {
  const n = normalizeText(s)
  if (!n) return []
  const words = n.split(' ').filter(Boolean)
  const bi = cnBigrams(s)
  return Array.from(new Set([...words, ...bi]))
}

export function joinList(arr: string[] | undefined): string {
  return (arr || []).join(' ')
}
