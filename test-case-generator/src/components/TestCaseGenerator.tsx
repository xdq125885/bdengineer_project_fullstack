import { useState, type FC } from 'react'
import { FileText, Download, Loader2, Plus, Trash2 } from 'lucide-react'
import { generateTestCases } from '../services/api.ts'
import type { TestCase } from '../types.ts'

const TestCaseGenerator: FC = () => {
  const [requirement, setRequirement] = useState('')
  const [count, setCount] = useState(5)
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [category, setCategory] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      setError('请输入需求描述')
      return
    }

    setLoading(true)
    setError('')

    try {
      const cases = await generateTestCases({
        requirement,
        count,
        priority,
        category: category || undefined,
      })
      setTestCases(cases)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const content = JSON.stringify(testCases, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-cases-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id))
  }

  const getSeverityColor = (s?: TestCase['severity']) => {
    switch (s) {
      case 'P0': return 'bg-red-100 text-red-800'
      case 'P1': return 'bg-orange-100 text-orange-800'
      case 'P2': return 'bg-yellow-100 text-yellow-800'
      case 'P3': return 'bg-gray-100 text-gray-800'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <a href="#/main" className="text-indigo-600 hover:underline text-sm">← 返回 PRD 生成</a>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI 测试用例生成器（表单模式）
          </h1>
          <p className="text-gray-600">
            基于需求描述自动生成专业的测试用例（将自动映射为统一用例结构）
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                需求描述 *
              </label>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="请输入需求描述，例如：用户登录功能"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生成数量
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级（将映射为严重级）
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="High">高</option>
                  <option value="Medium">中</option>
                  <option value="Low">低</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类（可选，将映射为标签/feature）
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：功能测试"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  生成测试用例
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Cases Display */}
        {testCases.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                生成的测试用例 ({testCases.length})
              </h2>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出 JSON
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((testCase) => (
                <div
                  key={testCase.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {testCase.title}
                        </h3>
                        {testCase.severity && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(testCase.severity)}`}>
                            {testCase.severity}
                          </span>
                        )}
                        {testCase.tags && testCase.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-gray-600 text-sm mb-3">
                        <span className="font-medium text-gray-700">前置条件：</span>
                        {testCase.preconditions && testCase.preconditions.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {testCase.preconditions.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">无</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(testCase.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-medium text-gray-700 mb-2">测试步骤：</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {testCase.steps.map((step, index) => (
                        <li key={index} className="text-gray-600 text-sm">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">预期结果：</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {testCase.expected.map((e, i) => (
                        <li key={i} className="text-gray-600 text-sm">{e}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TestCaseGenerator
