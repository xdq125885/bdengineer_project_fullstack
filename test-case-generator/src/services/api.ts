import type { TestCase } from '../types.ts'

// 从环境变量读取（Vite 仅会注入以 VITE_ 为前缀的变量）
const API_URL = (import.meta as any).env?.VITE_OPENAI_API_URL || 'https://api.gptapi.us/v1/chat/completions'
const API_KEY: string | undefined = (import.meta as any).env?.VITE_OPENAI_API_KEY
const API_MODEL = (import.meta as any).env?.VITE_OPENAI_MODEL || 'gpt-3.5-turbo'

// 仅用于表单模式（Legacy）请求体定义，与统一的 PRD 生成不同
export interface LegacyGenerateRequest {
  requirement: string
  count: number
  priority?: 'High' | 'Medium' | 'Low'
  category?: string
}

export async function generateTestCases(request: LegacyGenerateRequest): Promise<TestCase[]> {
  if (!API_KEY) {
    throw new Error('未配置 API Key。请在 .env.local 中设置 VITE_OPENAI_API_KEY')
  }

  const prompt = `请根据以下需求生成 ${request.count} 个测试用例：

需求描述：${request.requirement}
${request.priority ? `优先级：${request.priority}` : ''}
${request.category ? `分类：${request.category}` : ''}

请以 JSON 数组格式返回测试用例，每个测试用例包含以下字段：
- id: 唯一标识符
- title: 测试用例标题
- description: 详细描述
- steps: 测试步骤数组
- expectedResult: 预期结果
- priority: 优先级 (High/Medium/Low)
- category: 分类

只返回 JSON 数组，不要其他说明文字。`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的软件测试工程师，擅长编写详细的测试用例。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? '[]'

  // 尝试解析 JSON
  let raw: any[] = []
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    raw = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
  } catch (error) {
    console.error('Failed to parse response:', content)
    throw new Error('Failed to parse test cases from API response')
  }

  // 映射为统一 TestCase 结构
  const cases: TestCase[] = raw.map((item, idx) => {
    const priority: string | undefined = item.priority
    const severity = mapPriorityToSeverity(priority)
    const tags = buildTags(item.category)
    const expectedArr = Array.isArray(item.expected) ? item.expected : (item.expectedResult ? [String(item.expectedResult)] : [])

    return {
      id: item.id ? String(item.id) : `TC-FORM-${idx + 1}`,
      feature: String(item.category || '表单生成'),
      title: String(item.title || `用例 ${idx + 1}`),
      preconditions: derivePreconditions(item.description),
      steps: Array.isArray(item.steps) ? item.steps.map(String) : [],
      expected: expectedArr,
      severity,
      tags,
    }
  })

  return cases
}

function mapPriorityToSeverity(p?: string): TestCase['severity'] {
  if (!p) return 'P2'
  const v = String(p).toLowerCase()
  if (v === 'high') return 'P0'
  if (v === 'medium') return 'P2'
  if (v === 'low') return 'P3'
  return 'P2'
}

function buildTags(category?: string): string[] {
  const tags: string[] = ['表单']
  if (category) tags.push(String(category))
  return tags
}

function derivePreconditions(desc?: string): string[] {
  const out: string[] = []
  if (desc && typeof desc === 'string') {
    const first = desc.split(/\n|。/).map(s => s.trim()).filter(Boolean)[0]
    if (first && first.length <= 50) out.push(first)
  }
  if (out.length === 0) out.push('系统处于可用状态')
  return out
}
