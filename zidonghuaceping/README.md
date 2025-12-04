## 🎯 自动化测评系统 - 测试用例质量评估

> 基于大模型从产品需求文档生成测试用例的自动化评测系统

### 📌 项目概述

这是一个**全面的自动化测评系统**，用于评估LLM生成的测试用例质量。通过多维度评测指标，对比生成用例与参考用例，帮助持续优化模型效果。

**核心功能：**
- ✅ **多维度评测** - 5个关键指标全面评估
- ✅ **版本对比** - 快速对比两个版本的改进效果
- ✅ **可视化报告** - 生成HTML和JSON格式报告
- ✅ **语义相似度** - 使用预训练模型计算文本相似度
- ✅ **灵活配置** - 支持自定义权重和参数

---

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
pip install -r requirements.txt
```

### 2️⃣ 运行演示

```bash
python demo.py
```

### 3️⃣ 查看报告

```bash
# 打开HTML报告
open data/evaluation_results/demo_results/ai_evaluation_report.html
```

**就这么简单！** 🎉

---

## 📊 核心评测指标

| 指标 | 权重 | 说明 | 改进方向 |
|------|------|------|---------|
| **结构完整性** | 20% | 用例是否包含标题、前置条件、步骤、预期结果 | 确保四要素完整 |
| **内容质量** | 25% | 清晰度、完整性、可执行性、独立性、具体性 | 提高描述清晰度 |
| **去重性** | 10% | 用例多样性和去重效果 | 减少重复用例 |
| **覆盖率** | 25% | 对需求的覆盖程度 | 扩大需求覆盖 |
| **相似度** | 20% | 与参考用例的语义相似度 | 与参考对齐 |

---


## 🎓 使用方式

### 方式1：运行演示脚本（推荐新手）

```bash
python demo.py
```

**自动完成：**
- 加载示例数据（PRD、AI用例、人工用例）
- 执行完整的评测流程
- 生成对比分析报告
- 输出HTML和JSON格式

### 方式2：命令行工具

#### 评估单个版本

```bash
python main.py evaluate generated_cases.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results
```

#### 对比两个版本

```bash
python main.py compare version1.txt version2.txt \
    -r reference_cases.txt \
    -p prd.txt \
    -o ./results
```

### 方式3：Python代码集成

```python
from evaluation.evaluator import Evaluator
from evaluation.utils import FileUtils

# 初始化
evaluator = Evaluator(use_similarity_model=True)

# 加载数据
generated_cases = FileUtils.read_text("generated.txt").split('\n\n')
reference_cases = FileUtils.read_text("reference.txt").split('\n\n')
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

## 📈 输出示例

### 综合分数对比

```
AI生成用例综合分数:    0.7234
人工编写用例综合分数:  0.8456
差异:                 0.1222 (人工用例高12.22%)
```

### 各维度分数

```
指标              AI生成      人工编写      差异
结构完整性        0.7500      0.8200      -0.0700
内容质量          0.6800      0.8500      -0.1700
去重性            0.9100      0.9500      -0.0400
覆盖率            0.6500      0.8200      -0.1700
相似度            0.7800      N/A         N/A
```


### 测试用例（JSON）

```json
[
  {
    "id": "TC001",
    "title": "正确账号密码登录",
    "preconditions": ["系统已部署", "存在测试账号"],
    "steps": ["打开登录页", "输入账号", "输入密码", "点击登录"],
    "expected": ["登录成功", "跳转首页"]
  }
]
```

---

## 🔧 配置说明

### 修改评测权重

编辑 `evaluation/config.py`：

```python
METRIC_WEIGHTS = {
    "structure": 0.2,       # 结构完整性
    "coverage": 0.25,       # 覆盖率
    "quality": 0.25,        # 内容质量
    "similarity": 0.2,      # 相似度
    "uniqueness": 0.1,      # 去重性
}
```

### 使用GPU加速

```python
MODEL_CONFIG = {
    "encoder_model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "device": "cuda",       # 改为 "cuda" 使用GPU
    "batch_size": 64,       # 增加批处理大小
}
```

---

## 📊 评测指标详解

### 1. 结构完整性 (Structure Completeness)

**评估内容：**
- ✓ 是否有明确的标题
- ✓ 是否有前置条件
- ✓ 是否有操作步骤
- ✓ 是否有预期结果

**计算方式：**
```
完整性分数 = Σ(元素存在性 × 元素质量) × 权重
```

**改进方法：**
- 确保每个用例都有四个要素
- 每个要素都有充分的内容
- 使用清晰的标题和分类

### 2. 内容质量 (Content Quality)

**评估维度：**
- **清晰度** - 避免模糊词汇
- **完整性** - 内容充分度
- **可执行性** - 能否被执行
- **独立性** - 是否相对独立
- **具体性** - 是否有具体数据

**改进方法：**
- 使用具体的操作动词
- 提供具体的测试数据
- 避免依赖其他用例
- 明确指出验证点

### 3. 去重性 (Uniqueness)

**检测方式：**
- 完全重复 - 内容完全相同
- 近似重复 - 语义相似度 > 0.85
- 多样性 - 覆盖的场景类型

**改进方法：**
- 避免生成完全相同的用例
- 确保不同用例测试不同场景
- 覆盖正常、异常、边界等多种情况

### 4. 覆盖率 (Coverage)

**计算方式：**
```
覆盖率 = (被覆盖需求数) / (总需求数)
```







## 📊 分数解读

| 分数范围 | 等级 | 说明 |
|---------|------|------|
| 0.85-1.0 | ⭐⭐⭐⭐⭐ 优秀 | 用例质量很好，可直接使用 |
| 0.70-0.85 | ⭐⭐⭐⭐ 良好 | 用例质量不错，可小幅改进 |
| 0.50-0.70 | ⭐⭐⭐ 中等 | 用例质量一般，需要改进 |
| <0.50 | ⭐⭐ 需改进 | 用例质量较差，需要重新生成 |

---


## 📚 文档

- 📖 [快速开始](./QUICKSTART.md) - 详细的快速开始指南
- 🚀 [运行指南](./RUN_GUIDE.md) - 完整的运行说明
- 🔧 [API文档](./evaluation/evaluator.py) - 代码API文档
- 💡 [最佳实践](./QUICKSTART.md#最佳实践) - 使用建议

---

## 🔬 技术栈

- **Python 3.8+** - 编程语言
- **PyTorch** - 深度学习框架
- **Sentence-Transformers** - 文本编码
- **Scikit-learn** - 机器学习工具
- **Matplotlib/Plotly** - 数据可视化

---

## 📝 示例数据

项目包含完整的示例数据：

- **用户登录.md** - PRD文档（245字符）
- **PRDAI1.json** - AI生成的用例（43个）
- **prdrengong.json** - 人工编写的用例（17个）

直接运行 `python demo.py` 即可体验完整的评测流程。

---

## 🎯 项目目标

✅ 提供全面的测试用例质量评估  
✅ 支持LLM生成用例的自动化评测  
✅ 帮助持续优化模型效果  
✅ 提供清晰的改进指导  
✅ 支持版本对比和迭代改进  


## 📄 许可证

本项目仅供学习和研究使用。

---

## 🙏 致谢

感谢以下开源项目的支持：
- Sentence-Transformers
- PyTorch
- Scikit-learn

---


