import type { GenerationOptions, GenerationStrategy } from '../types.ts'

interface Props {
  options: GenerationOptions
  onChange: (opts: GenerationOptions) => void
}

const strategies: { value: GenerationStrategy; label: string; tip: string }[] = [
  { value: 'simple', label: '标准（simple）', tip: '直接根据 PRD 生成用例，速度最快' },
  { value: 'cot', label: '思考优先（CoT）', tip: '先枚举测试点，再生成用例，覆盖更稳' },
  { value: 'self_refine', label: '自反思优化（Self-Refine）', tip: '先生成草稿，再自我评审修正，质量更高' },
]

export default function Controls({ options, onChange }: Props) {
  const set = (patch: Partial<GenerationOptions>) => onChange({ ...options, ...patch })

  return (
    <div className="space-y-4">
      <div>
        <label className="label">模型（可选）</label>
        <input
          className="input"
          placeholder="例如: deepseek-chat / ep-xxxx (豆包Endpoint)"
          value={options.model || ''}
          onChange={(e) => set({ model: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-500">真实调用需在后端 .env 配置 LLM_BASE_URL / LLM_API_KEY。</p>
      </div>

      <div>
        <label className="label">Temperature</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={options.temperature ?? 0.2}
          onChange={(e) => set({ temperature: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-slate-500">当前：{options.temperature ?? 0.2}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">生成策略</label>
          <select
            className="input"
            value={options.strategy ?? 'simple'}
            onChange={(e) => set({ strategy: e.target.value as GenerationStrategy })}
          >
            {strategies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">{strategies.find(s => s.value === (options.strategy ?? 'simple'))?.tip}</p>
        </div>
        <div>
          <label className="label">最大用例数（可选）</label>
          <input
            type="number"
            min={1}
            max={200}
            className="input"
            placeholder="例如：30"
            value={options.maxCases ?? ''}
            onChange={(e) => set({ maxCases: e.target.value ? Number(e.target.value) : undefined })}
          />
          <p className="mt-1 text-xs text-slate-500">用于约束生成规模，避免过长输出。</p>
        </div>
      </div>

      <div className="text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-md p-2">
        <div className="font-medium">策略说明：</div>
        <ul className="list-disc list-inside space-y-1">
          <li><b>标准</b>：直接生成，速度快、性价比高。</li>
          <li><b>思考优先</b>：让模型先枚举测试点（功能/边界/异常），通常覆盖更稳。</li>
          <li><b>自反思优化</b>：草稿 → 自评审 → 修正，质量更高但耗时略长。</li>
        </ul>
      </div>
    </div>
  )
}
