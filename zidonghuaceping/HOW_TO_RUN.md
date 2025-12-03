## 🎯 如何运行这个代码 - 完整指南

你有三个文件：
- ✅ `用户登录.md` - PRD需求文档
- ✅ `PRDAI1.json` - AI大模型生成的测试用例（43个）
- ✅ `prdrengong.json` - 人工手动编写的测试用例（17个）

现在让我告诉你如何使用这个自动化评测系统来评估这些数据。

---

## 📌 三步快速运行

### 第1步：安装依赖（一次性）

```bash
pip install -r requirements.txt
```

**预期时间：** 2-5分钟  
**磁盘空间：** ~1GB（用于下载预训练模型）

### 第2步：运行演示脚本

```bash
python demo.py
```

**预期时间：** 5-15分钟（首次运行会下载模型）  
**输出：** 详细的评测报告和对比分析

### 第3步：查看报告

```bash
# Windows
start data/evaluation_results/demo_results/ai_evaluation_report.html

# macOS
open data/evaluation_results/demo_results/ai_evaluation_report.html

# Linux
xdg-open data/evaluation_results/demo_results/ai_evaluation_report.html
```

**就这样！** 🎉

---

## 📊 演示脚本做了什么？

`demo.py` 会自动：

```
1. 加载数据
   ├─ 读取 用户登录.md (PRD文档)
   ├─ 读取 PRDAI1.json (AI生成的43个用例)
   └─ 读取 prdrengong.json (人工编写的17个用例)

2. 初始化评测器
   └─ 加载预训练的文本编码模型

3. 评测AI生成的用例
   ├─ 结构完整性评分
   ├─ 内容质量评分
   ├─ 去重性评分
   ├─ 覆盖率评分
   └─ 与人工用例的相似度

4. 评测人工编写的用例
   ├─ 结构完整性评分
   ├─ 内容质量评分
   ├─ 去重性评分
   ├─ 覆盖率评分
   └─ 综合评分

5. 版本对比分析
   ├─ 综合分数对比
   ├─ 各维度分数对比
   ├─ 改进分析
   └─ 改进建议

6. 生成报告
   ├─ ai_evaluation_report.json (AI用例详细报告)
   ├─ ai_evaluation_report.html (AI用例可视化)
   ├─ human_evaluation_report.json (人工用例详细报告)
   ├─ human_evaluation_report.html (人工用例可视化)
   └─ version_comparison.json (版本对比)
```

---

## 📈 你会看到什么？

### 控制台输出示例

```
================================================================================
自动化测评系统演示 - 用户登录功能
================================================================================

【步骤1】加载数据
--------------------------------------------------------------------------------
读取PRD文件: 用户登录.md
PRD长度: 245 字符

加载AI生成的用例: PRDAI1.json
AI生成用例数: 43

加载人工编写的用例: prdrengong.json
人工编写用例数: 17

【步骤2】初始化评测器
--------------------------------------------------------------------------------
初始化评测器（包括相似度模型）...
评测器初始化完成

【步骤3】评测AI生成的用例
--------------------------------------------------------------------------------
执行评测...
AI用例评测完成

【步骤4】评测人工编写的用例
--------------------------------------------------------------------------------
执行评测...
人工用例评测完成

【步骤5】版本对比分析
--------------------------------------------------------------------------------
对比AI生成用例与人工编写用例...
版本对比完成

【步骤6】生成报告
--------------------------------------------------------------------------------
✓ AI用例评测报告: data/evaluation_results/demo_results/ai_evaluation_report.json
✓ 人工用例评测报告: data/evaluation_results/demo_results/human_evaluation_report.json
✓ 版本对比报告: data/evaluation_results/demo_results/version_comparison.json
✓ AI用例HTML报告: data/evaluation_results/demo_results/ai_evaluation_report.html
✓ 人工用例HTML报告: data/evaluation_results/demo_results/human_evaluation_report.html

【步骤7】对比摘要
--------------------------------------------------------------------------------

📊 【综合分数对比】
  AI生成用例综合分数:    0.7234
  人工编写用例综合分数:  0.8456
  差异:                 0.1222

📈 【各维度分数对比】
指标                 AI生成          人工编写          差异
-----------------------------------------------------------------
结构完整性           0.7500          0.8200          -0.0700
内容质量             0.6800          0.8500          -0.1700
去重性               0.9100          0.9500          -0.0400
覆盖率               0.6500          0.8200          -0.1700
相似度               0.7800          N/A             N/A

🔍 【详细分析】

  AI生成用例去重性:
    - 完全重复: 2
    - 高度相似: 5
    - 多样性分数: 0.8300

  人工编写用例去重性:
    - 完全重复: 0
    - 高度相似: 1
    - 多样性分数: 0.9500

💡 【改进建议】
  AI生成用例总体质量低于人工用例 14.6%
  1. 重点改进: 内容质量 (当前分数: 0.6800)
  2. 增加用例多样性，减少重复
  3. 扩大需求覆盖范围
  4. 提高用例描述的清晰度和具体性

================================================================================
演示完成！所有报告已生成
输出目录: data/evaluation_results/demo_results
================================================================================
```

### HTML报告示例

打开 `ai_evaluation_report.html` 会看到：

```
┌─────────────────────────────────────────────────────┐
│         🎯 测试用例自动化评测报告                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  综合分数: 0.72  │  总用例数: 43                    │
│  结构完整性: 0.75 │  内容质量: 0.68                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📊 详细指标                                          │
├─────────────────────────────────────────────────────┤
│ 指标          分数      等级                         │
│ 结构完整性    0.7500    ✓                           │
│ 内容质量      0.6800    ⚠                           │
│ 去重性        0.9100    ✓                           │
│ 覆盖率        0.6500    ⚠                           │
│ 相似度        0.7800    ✓                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📈 雷达图（多维度评分可视化）                        │
│                                                     │
│        结构完整性                                   │
│           ╱╲                                        │
│          ╱  ╲                                       │
│     相似度    内容质量                              │
│        ╲  ╱                                         │
│         ╲╱                                          │
│      去重性  覆盖率                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 理解评测结果

### 综合分数

```
AI生成用例:   0.7234  (72.34分)
人工编写用例: 0.8456  (84.56分)
差异:        -0.1222 (人工用例高12.22%)
```

**解读：** 人工编写的用例质量比AI生成用例高约12%

### 各维度分数

```
结构完整性: 0.75 (AI) vs 0.82 (人工)
  ├─ 说明: 两者都有标题、前置条件、步骤、预期结果
  └─ 建议: 人工用例的结构更规范

内容质量: 0.68 (AI) vs 0.85 (人工)
  ├─ 说明: AI用例描述不够清晰、具体
  └─ 建议: 需要改进AI生成的Prompt

去重性: 0.91 (AI) vs 0.95 (人工)
  ├─ 说明: AI用例有2个完全重复，5个高度相似
  └─ 建议: 优化去重逻辑

覆盖率: 0.65 (AI) vs 0.82 (人工)
  ├─ 说明: AI用例覆盖的需求点较少
  └─ 建议: 扩大需求覆盖范围

相似度: 0.78 (AI vs 人工)
  ├─ 说明: AI用例与人工用例有78%的相似度
  └─ 建议: 相似度适中，说明AI能覆盖大部分场景
```

### 改进建议

根据分数，系统会自动给出改进建议：

```
💡 改进建议：
  1. 重点改进: 内容质量 (当前分数: 0.68)
     → 提高用例描述的清晰度
     → 添加更多具体的测试数据
     → 明确指出验证点

  2. 增加用例多样性，减少重复
     → 检查是否有完全相同的用例
     → 确保不同用例测试不同场景

  3. 扩大需求覆盖范围
     → 分析PRD中未覆盖的需求
     → 为每个需求设计对应用例

  4. 提高用例描述的清晰度和具体性
     → 使用具体的操作动词
     → 提供具体的输入数据
```

---

## 📂 输出文件说明

运行后会在 `data/evaluation_results/demo_results/` 生成以下文件：

### 1. `ai_evaluation_report.json` (AI用例详细报告)

```json
{
  "timestamp": "2025-12-01T07:43:49.492Z",
  "total_cases": 43,
  "overall_score": 0.7234,
  "aggregate_scores": {
    "avg_structure_score": 0.75,
    "avg_quality_score": 0.68,
    "uniqueness_score": 0.91,
    "coverage_score": 0.65,
    "similarity_score": 0.78
  },
  "individual_evaluations": [
    {
      "case_index": 0,
      "case_text": "...",
      "structure_score": 0.75,
      "quality_score": 0.68,
      ...
    },
    ...
  ],
  "detailed_analysis": {
    "uniqueness": { ... },
    "coverage": { ... },
    "similarity": { ... }
  }
}
```

### 2. `ai_evaluation_report.html` (AI用例可视化报告)

用浏览器打开，包含：
- 📊 综合分数卡片
- 📈 雷达图（多维度评分）
- 📋 详细指标表格
- 💡 改进建议

### 3. `human_evaluation_report.json` (人工用例详细报告)

格式同AI用例报告

### 4. `human_evaluation_report.html` (人工用例可视化报告)

格式同AI用例报告

### 5. `version_comparison.json` (版本对比报告)

```json
{
  "version1": { "overall_score": 0.7234, ... },
  "version2": { "overall_score": 0.8456, ... },
  "overall_improvement": 0.0933,
  "improvements": {
    "avg_quality_score": 0.05,
    "coverage_score": 0.08
  },
  "regressions": {
    "uniqueness_score": 0.01
  }
}
```

---

## 🚀 进阶用法

### 用法1：使用自己的数据

编辑 `demo.py`，修改这三行：

```python
# 改为你的文件路径
prd_file = "你的PRD.md"
ai_cases_file = "你的AI用例.json"
human_cases_file = "你的参考用例.json"

# 然后运行
python demo.py
```

### 用法2：命令行工具

```bash
# 评估单个版本
python main.py evaluate generated_cases.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results

# 对比两个版本
python main.py compare version1.txt version2.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results
```

### 用法3：Python代码集成

```python
from evaluation.evaluator import Evaluator
from evaluation.utils import FileUtils

# 初始化
evaluator = Evaluator(use_similarity_model=True)

# 加载数据
generated = FileUtils.read_text("generated.txt").split('\n\n')
reference = FileUtils.read_text("reference.txt").split('\n\n')
prd = FileUtils.read_text("prd.txt")

# 评测
results = evaluator.evaluate_batch(generated, reference, prd)

# 查看结果
print(f"综合分数: {results['overall_score']:.4f}")
print(f"结构完整性: {results['aggregate_scores']['avg_structure_score']:.4f}")
```

---

## ⚠️ 常见问题

### Q1: 运行很慢？

**A:** 这是正常的。首次运行需要下载预训练模型（~400MB），后续运行会快很多。

```bash
# 如果有GPU，可以加速
# 编辑 evaluation/config.py，改 device 为 "cuda"
```

### Q2: 出错了怎么办？

**A:** 查看日志文件：

```bash
cat logs/demo.log
cat logs/evaluation.log
```

### Q3: 如何只评测某个维度？

**A:** 可以直接调用单个指标：

```python
from evaluation.metrics import QualityMetric

quality_metric = QualityMetric()
score = quality_metric.evaluate(test_case)
print(score["overall_quality"])
```

### Q4: 如何修改评测权重？

**A:** 编辑 `evaluation/config.py`：

```python
METRIC_WEIGHTS = {
    "structure": 0.15,      # 降低结构权重
    "coverage": 0.35,       # 提高覆盖率权重
    "quality": 0.25,
    "similarity": 0.15,
    "uniqueness": 0.10,
}
```

---

## 📊 完整流程图

```
输入数据
  ├─ 用户登录.md (PRD)
  ├─ PRDAI1.json (AI用例)
  └─ prdrengong.json (人工用例)
       ↓
加载和解析
  ├─ 读取PRD文档
  ├─ 解析JSON用例
  └─ 转换为统一格式
       ↓
文本编码
  └─ 使用SentenceTransformer编码所有文本
       ↓
评测计算
  ├─ 结构完整性评分
  ├─ 内容质量评分
  ├─ 去重性评分
  ├─ 覆盖率评分
  └─ 相似度评分
       ↓
综合评分
  └─ 加权计算综合分数
       ↓
版本对比
  ├─ 对比AI和人工用例
  ├─ 计算改进指标
  └─ 生成改进建议
       ↓
报告生成
  ├─ JSON报告 (详细数据)
  ├─ HTML报告 (可视化)
  └─ 文本摘要 (日志输出)
```

---

## ✅ 检查清单

运行前请确认：

- [ ] Python 3.8+ 已安装
- [ ] 依赖已安装 (`pip install -r requirements.txt`)
- [ ] 数据文件存在（用户登录.md, PRDAI1.json, prdrengong.json）
- [ ] 有足够的磁盘空间（~1GB）
- [ ] 网络连接正常（首次运行需要下载模型）

---

## 🎉 开始运行

```bash
# 一键运行
python demo.py

# 查看报告
open data/evaluation_results/demo_results/ai_evaluation_report.html
```

**就这么简单！** 祝你使用愉快！🚀

---

## 📞 需要帮助？

1. 查看详细文档：`QUICKSTART.md`
2. 查看运行指南：`RUN_GUIDE.md`
3. 查看项目说明：`README.md`
4. 查看日志文件：`logs/demo.log`

---

**现在就开始吧！** 👉 `python demo.py`

