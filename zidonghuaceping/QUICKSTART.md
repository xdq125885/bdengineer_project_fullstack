## 🚀 快速开始指南

### 📋 项目概述

这是一个**自动化测评系统**，用于评估LLM生成的测试用例质量。通过对比生成用例与参考用例，计算多维度评分指标，帮助持续优化模型效果。

### 📁 文件结构

```
.
├── evaluation/                 # 评测模块
│   ├── models/                # 模型（编码器、相似度）
│   ├── metrics/               # 评测指标（5个维度）
│   ├── evaluator.py           # 主评测器
│   ├── visualizer.py          # 可视化
│   ├── utils.py               # 工具函数
│   └── config.py              # 配置文件
├── main.py                    # 命令行入口
├── demo.py                    # 演示脚本
├── requirements.txt           # 依赖
├── 用户登录.md                # PRD文档
├── PRDAI1.json               # AI生成的用例
└── prdrengong.json           # 人工编写的用例
```

### 🔧 安装依赖

```bash
# 安装依赖
pip install -r requirements.txt

# 如果使用GPU加速（推荐）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 📊 核心评测指标

| 指标 | 权重 | 说明 |
|------|------|------|
| **结构完整性** | 20% | 用例是否包含标题、前置条件、步骤、预期结果 |
| **内容质量** | 25% | 清晰度、完整性、可执行性、独立性、具体性 |
| **去重性** | 10% | 用例多样性和去重效果 |
| **覆盖率** | 25% | 对需求的覆盖程度 |
| **相似度** | 20% | 与参考用例的语义相似度 |

### 🎯 使用方式

#### 方式1：运行演示脚本（推荐）

```bash
# 直接运行演示，自动加载示例数据
python demo.py
```

**演示脚本会：**
1. ✓ 加载PRD文档（用户登录.md）
2. ✓ 加载AI生成用例（PRDAI1.json）
3. ✓ 加载人工编写用例（prdrengong.json）
4. ✓ 对两个版本进行评测
5. ✓ 生成对比分析报告
6. ✓ 输出HTML和JSON格式报告

**输出位置：** `data/evaluation_results/demo_results/`

---

#### 方式2：命令行工具

##### 评估单个版本

```bash
# 基础用法
python main.py evaluate generated_cases.txt

# 完整用法（包含参考用例和PRD）
python main.py evaluate generated_cases.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results
```

**参数说明：**
- `generated_cases.txt` - 生成的测试用例文件（必需）
- `-r, --reference` - 参考用例文件（可选）
- `-p, --prd` - 产品需求文档文件（可选）
- `-o, --output` - 输出目录（可选，默认为 `data/evaluation_results`）

##### 对比两个版本

```bash
# 对比两个版本
python main.py compare version1.txt version2.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results
```

---

#### 方式3：Python代码集成

```python
from evaluation.evaluator import Evaluator
from evaluation.utils import FileUtils

# 初始化评测器
evaluator = Evaluator(use_similarity_model=True)

# 加载数据
generated_cases = FileUtils.read_text("generated_cases.txt").split('\n\n')
reference_cases = FileUtils.read_text("reference_cases.txt").split('\n\n')
prd_text = FileUtils.read_text("prd.txt")

# 执行评测
results = evaluator.evaluate_batch(
    generated_cases,
    reference_cases=reference_cases,
    prd_text=prd_text
)

# 查看结果
print(f"综合分数: {results['overall_score']:.4f}")
print(f"结构完整性: {results['aggregate_scores']['avg_structure_score']:.4f}")
print(f"内容质量: {results['aggregate_scores']['avg_quality_score']:.4f}")
```

---

### 📈 输出报告

运行后会生成以下文件：

#### 1. **JSON报告** (`evaluation_results.json`)
包含所有详细数据，可用于进一步分析

#### 2. **文本报告** (`evaluation_report.txt`)
人类可读的摘要报告

```
============================================================
测试用例自动化评测报告
============================================================
评测时间: 2025-12-01T07:43:49.492Z
总用例数: 20

【聚合分数】
----------------------------------------
avg_structure_score: 0.7500
avg_quality_score: 0.8200
uniqueness_score: 0.9100
coverage_score: 0.8500
similarity_score: 0.7800
综合分数: 0.8220
```

#### 3. **HTML报告** (`evaluation_report.html`)
可视化报告，包含：
- 📊 雷达图（多维度评分）
- 📈 详细指标表格
- 💡 改进建议

#### 4. **版本对比报告** (`version_comparison.json`)
两个版本的对比分析

---

### 📝 输入文件格式

#### 测试用例文件格式

**方式1：Markdown格式** (推荐)
```markdown
# 用例标题

## 前置条件
- 条件1
- 条件2

## 操作步骤
1. 步骤1
2. 步骤2

## 预期结果
- 结果1
- 结果2

---

# 第二个用例
...
```

**方式2：JSON格式**
```json
[
  {
    "id": "TC001",
    "title": "用例标题",
    "preconditions": ["条件1", "条件2"],
    "steps": ["步骤1", "步骤2"],
    "expected": ["结果1", "结果2"]
  }
]
```

#### PRD文件格式

```markdown
# 产品需求文档

## 目标
描述系统目标

## 业务规则
- 规则1
- 规则2

## 用例示例
- 场景1
- 场景2
```

---

### 🎓 示例演练

#### 演练1：评估AI生成的用例

```bash
# 使用提供的示例数据
python demo.py

# 查看输出
# ✓ 生成的报告位置: data/evaluation_results/demo_results/
```

#### 演练2：对比两个版本

```bash
# 假设你有两个版本的生成结果
python main.py compare \
    version_v1.txt \
    version_v2.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./comparison_results

# 查看对比结果
cat comparison_results/version_comparison.json
```

---

### 🔍 理解评测指标

#### 1. 结构完整性 (Structure Completeness)

**定义：** 用例是否包含标准的四个部分

**计算方式：**
- 检查是否有标题、前置条件、操作步骤、预期结果
- 评估每部分的内容质量
- 综合计算完整性分数

**改进方法：**
- 确保每个用例都有明确的标题
- 详细描述前置条件
- 分步骤列出操作
- 明确列出预期结果

#### 2. 内容质量 (Content Quality)

**定义：** 用例描述的清晰度、具体性和可执行性

**评估维度：**
- **清晰度** - 是否避免模糊词汇（如"可能"、"也许"）
- **完整性** - 各部分内容是否充分
- **可执行性** - 是否能被实际执行
- **独立性** - 用例之间是否相对独立
- **具体性** - 是否有具体的UI元素和数据值

**改进方法：**
- 使用具体的操作动词（点击、输入、选择等）
- 提供具体的测试数据
- 避免依赖其他用例
- 明确指出验证点

#### 3. 去重性 (Uniqueness)

**定义：** 用例集合的多样性和去重效果

**检测方式：**
- 完全重复 - 内容完全相同
- 近似重复 - 语义相似度>0.85
- 多样性 - 覆盖的场景类型

**改进方法：**
- 避免生成完全相同的用例
- 确保不同用例测试不同的场景
- 覆盖正常流程、异常流程、边界值等

#### 4. 覆盖率 (Coverage)

**定义：** 生成用例对需求的覆盖程度

**计算方式：**
- 从PRD中提取需求点
- 检查每个测试用例是否覆盖对应需求
- 计算覆盖率 = (被覆盖需求数) / (总需求数)

**改进方法：**
- 仔细分析PRD中的所有需求
- 为每个需求设计对应的测试用例
- 考虑正常流程、异常流程、边界情况

#### 5. 相似度 (Similarity)

**定义：** 生成用例与参考用例的语义相似度

**用途：**
- 评估生成用例是否与参考用例相似
- 检测是否覆盖了参考用例的场景
- 指导模型改进

**改进方法：**
- 如果相似度过低，说明生成的用例与参考用例差异大
- 如果相似度过高，说明生成的用例缺乏创新

---

### 📊 解读报告

#### 综合分数解读

| 分数范围 | 等级 | 说明 |
|---------|------|------|
| 0.85-1.0 | ⭐⭐⭐⭐⭐ 优秀 | 用例质量很好，可直接使用 |
| 0.70-0.85 | ⭐⭐⭐⭐ 良好 | 用例质量不错，可小幅改进 |
| 0.50-0.70 | ⭐⭐⭐ 中等 | 用例质量一般，需要改进 |
| <0.50 | ⭐⭐ 需改进 | 用例质量较差，需要重新生成 |

#### 版本对比解读

```json
{
  "version1": { "overall_score": 0.75 },
  "version2": { "overall_score": 0.82 },
  "overall_improvement": 0.0933,  // 9.33% 的改进
  "improvements": {
    "avg_quality_score": 0.05,    // 质量提升
    "coverage_score": 0.08        // 覆盖率提升
  }
}
```

---

### 🛠️ 常见问题

#### Q1: 如何使用自己的数据？

```python
# 方式1：使用命令行
python main.py evaluate my_cases.txt -r my_reference.txt -p my_prd.txt

# 方式2：修改demo.py中的文件路径
prd_file = "my_prd.md"
ai_cases_file = "my_ai_cases.json"
human_cases_file = "my_reference_cases.json"
```

#### Q2: 如何加快评测速度？

```python
# 方式1：禁用相似度模型（会降低评测准确性）
evaluator = Evaluator(use_similarity_model=False)

# 方式2：使用GPU加速
# 在config.py中修改
MODEL_CONFIG = {
    "device": "cuda",  # 使用GPU
    "batch_size": 64,  # 增加批处理大小
}
```

#### Q3: 如何自定义评测指标权重？

```python
# 在config.py中修改
METRIC_WEIGHTS = {
    "structure": 0.15,      # 降低结构权重
    "coverage": 0.35,       # 提高覆盖率权重
    "quality": 0.25,
    "similarity": 0.15,
    "uniqueness": 0.10,
}
```

#### Q4: 如何只评测特定维度？

```python
from evaluation.metrics import QualityMetric

# 只评测内容质量
quality_metric = QualityMetric()
quality_score = quality_metric.evaluate(test_case)
print(quality_score["overall_quality"])
```

---

### 📚 更多资源

- 📖 [评测指标详解](./docs/metrics.md)
- 🎓 [使用教程](./docs/tutorial.md)
- 🔧 [API文档](./docs/api.md)
- 💡 [最佳实践](./docs/best_practices.md)

---

### 💬 支持

如有问题，请查看日志文件：
```bash
cat logs/evaluation.log
```

---

**祝你使用愉快！** 🎉

