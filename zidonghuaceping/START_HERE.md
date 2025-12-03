## 🚀 从这里开始！

欢迎使用**自动化测评系统**！这个文档会快速引导你上手。

---

## 📌 你拥有什么？

✅ **完整的评测系统代码**
- 5个关键评测指标
- 主评测器和可视化模块
- 命令行工具和Python API

✅ **示例数据**
- 用户登录.md (PRD文档)
- PRDAI1.json (AI生成的43个用例)
- prdrengong.json (人工编写的17个用例)

✅ **详细文档**
- 快速开始指南
- 完整的使用教程
- 常见问题解答

---

## ⚡ 3分钟快速开始

### 第1步：安装依赖（2分钟）

```bash
pip install -r requirements.txt
```

### 第2步：运行演示（1分钟）

```bash
python demo.py
```

### 完成！🎉

系统会自动：
- 加载示例数据
- 执行完整的评测流程
- 生成详细的报告

---

## 📊 查看结果

### 方式1：打开HTML报告（推荐）

```bash
# Windows
start data/evaluation_results/demo_results/ai_evaluation_report.html

# macOS
open data/evaluation_results/demo_results/ai_evaluation_report.html

# Linux
xdg-open data/evaluation_results/demo_results/ai_evaluation_report.html
```

### 方式2：查看控制台输出

运行 `python demo.py` 后，你会看到详细的对比分析。

---

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| START_HERE.md | 快速入门（本文件） |
| README.md | 项目总体说明 |
| QUICKSTART.md | 详细快速开始 |
| RUN_GUIDE.md | 完整运行指南 |
| HOW_TO_RUN.md | 最详细的说明 |
| SUMMARY.md | 项目总结 |

---

## 🎯 常见任务

### 任务1：评估AI生成的用例

```bash
python main.py evaluate PRDAI1.json \
    -r prdrengong.json \
    -p 用户登录.md \
    -o ./results
```

### 任务2：对比两个版本

```bash
python main.py compare version1.json version2.json \
    -r reference.json \
    -p prd.md \
    -o ./results
```

### 任务3：使用自己的数据

编辑 `demo.py`，修改这三行：

```python
prd_file = "你的PRD.md"
ai_cases_file = "你的AI用例.json"
human_cases_file = "你的参考用例.json"
```

然后运行：
```bash
python demo.py
```

---

## 📊 核心概念

### 5个评测指标

| 指标 | 权重 | 说明 |
|------|------|------|
| 结构完整性 | 20% | 用例是否有标题、前置条件、步骤、预期结果 |
| 内容质量 | 25% | 用例描述是否清晰、具体、可执行 |
| 去重性 | 10% | 用例是否有重复，多样性如何 |
| 覆盖率 | 25% | 用例是否覆盖了所有需求 |
| 相似度 | 20% | 生成用例与参考用例的相似程度 |

---

## 🛠️ 故障排查

### 问题1：运行很慢

**原因：** 首次运行需要下载预训练模型（~400MB）  
**解决：** 这是正常的，后续运行会快很多

### 问题2：出错了

**查看日志：**
```bash
cat logs/demo.log
```

### 问题3：报告在哪里

**位置：**
```
data/evaluation_results/demo_results/
```

---

## ✅ 检查清单

运行前请确认：

- [ ] Python 3.8+ 已安装
- [ ] 依赖已安装 (`pip install -r requirements.txt`)
- [ ] 数据文件存在
- [ ] 有足够的磁盘空间（~1GB）
- [ ] 网络连接正常

---

## 🎉 立即开始

```bash
python demo.py
```

**就这么简单！** 🚀

---

需要帮助？查看 [README.md](./README.md) 或 [QUICKSTART.md](./QUICKSTART.md)。

