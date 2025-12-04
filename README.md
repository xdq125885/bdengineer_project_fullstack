# bdengineer_project_fullstack
# 🧪 LLM 测试用例生成与评测全栈项目
一个端到端的 Monorepo，用于“基于大语言模型自动生成测试用例并进行质量评测”。
- 🧰 test-case-generator：前端（React + Vite）与后端（Express/TypeScript）组成的测试用例生成应用，支持 PRD 文本、飞书链接与图片（多模态）输入，SSE 流式生成、思维导图可视化与导出。
- 📊 zidonghuaceping：Python 实现的自动化测评工具集，从结构、质量、覆盖率、相似度、去重性等维度评估测试用例质量，输出 HTML/JSON 报告。
---

## 📁 目录结构

```
.
├─ test-case-generator/            # 🧰 生成端（前后端一体）
│  ├─ backend/                     # 🔙 Express 后端 (TypeScript)
│  │  └─ src/                      # 控制器与服务：/api/generate、/api/generate/stream、/api/lark/raw
│  ├─ src/                         # 🎨 React 前端 (TypeScript + Tailwind)
│  │  ├─ components/               # 输入面板、控制面板、结果表、思维导图、流式进度
│  │  ├─ eval/                     # 轻量评测模块（前端）
│  │  ├─ pages/                    # 评测页面
│  │  ├─ utils/                    # 生成、导出、存储、SSE 工具
│  │  └─ App.tsx                   # 主应用（表格/思维导图、流式开关）
│  └─ README.md                    # 生成端说明
│
└─ zidonghuaceping/                # 📊 评测端（Python 工具集）
   ├─ evaluation/                  # 指标、模型、可视化与配置
   ├─ data/evaluation_results/     # 评测结果（HTML/JSON）
   ├─ demo.py / main.py            # 演示与命令行入口
   └─ README.md                    # 评测端说明
```

---

## ✨ 功能概览

- 🧠 测试用例生成（生成端）
  - 输入：📝 PRD 文本、🔗 飞书链接、🖼️ UI 截图/流程图（多模态）
  - 展示：📋 表格、🧭 思维导图
  - 交互：📡 SSE 流式生成，⏹️ 可随时停止
  - 导出：📄 Markdown、🧾 JSON

- 🎯 测试用例评测（评测端）
  - 维度：🧱 结构、🧰 质量、🗺️ 覆盖、🔗 相似度、♻️ 去重
  - 输出：📈 HTML 报告 + 🧩 JSON 结果
  - 模型：🧬 Sentence-Transformers 相似度编码（可用 GPU 加速）

---

## 🚀 快速开始

### 一、运行“生成端” (Node.js 18+)

1) 安装依赖

```bash
cd test-case-generator
npm install
cd backend && npm install && cd ..
```

2) 配置后端环境变量（test-case-generator/backend/.env.local）

```env
# LLM（必需）
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=    # 或兼容的 API Base
LLM_MODEL=       # 示例模型，可替换

# 飞书（可选，用于读取飞书文档）
LARK_APP_ID=your_lark_app_id
LARK_APP_SECRET=your_lark_app_secret

# 服务
PORT=8787
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

3) 启动

```bash
# 启动后端
cd test-case-generator/backend
npm run dev     # http://localhost:8787

# 另开终端启动前端
cd ../
npm run dev     # http://localhost:5173
```

访问 http://localhost:5173 使用应用。

> ℹ️ 前端通过 /api/* 访问后端。跨域部署时请确保 CORS_ORIGIN 覆盖前端地址。

---

### 二、运行“评测端” (Python 3.8+)

1) 安装依赖

```bash
cd zidonghuaceping
pip install -r requirements.txt
```

2) 快速演示

```bash
python demo.py
```

报告输出目录：data/evaluation_results/demo_results/
- ai_evaluation_report.html / .json
- human_evaluation_report.html / .json
- version_comparison.json

3) 命令行使用示例

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

---

## 🖥️ 生成端使用（简要）

- 选择输入：📝 PRD 文本 / 🔗 飞书链接 / 🖼️ 图片（前端以 base64 发送）
- 点击“生成测试用例”；可开启“📡 流式输出(beta)”实时查看进度
- 切换视图：📋 表格 / 🧭 思维导图
- 导出：📄 复制 Markdown / 🧾 导出 JSON
- 轻量评测：进入“评测”页面；或导出后使用 Python 工具深度评测

---

## 🔌 后端 API（概览）

- POST `/api/generate` — 普通生成
- POST `/api/generate/stream` — SSE 流式生成（event: meta/cases/error/done）
- POST `/api/lark/raw` — 读取飞书文档内容
- GET  `/health` — 健康检查

> 关键实现：
> - backend/src/controllers/generate.controller.ts
> - backend/src/controllers/generate.stream.controller.ts
> - backend/src/controllers/lark.controller.ts
> - backend/src/services/*

---

## 🚢 部署与注意事项

- Nginx 代理 SSE 需关闭缓存：

```nginx
location /api/generate/stream {
  proxy_buffering off;
  proxy_pass http://backend:8787;
}
```

- 后端 JSON 体积上限 15MB（支持 base64 图片）：`express.json({ limit: '15mb' })`
- 静态托管 `uploads` 目录供 image_url 使用：`/uploads`
- 多模态需 LLM 支持图像输入（如 gpt-4o、vision 类模型）

---

## 🧰 技术栈

- 前端：⚛️ React 19、⚡ Vite 7、🔷 TypeScript、🎨 Tailwind CSS、🗺️ ReactFlow、🖼️ Lucide React
- 后端：🧩 Express、🔷 TypeScript、🛡️ CORS、🧪 dotenv
- 评测：🐍 Python、🔥 PyTorch、🧬 Sentence-Transformers、📚 scikit-learn、📈 Plotly/Matplotlib

---

## ❓ 常见问题（FAQ）

- 📡 流式输出不工作？
  - 检查 Nginx 是否关闭 `proxy_buffering`；或直接连后端端口排查。
- 🔗 飞书读取失败？
  - 确认 `LARK_APP_ID`/`LARK_APP_SECRET` 配置且应用有访问权限。
- 🌐 使用国内 LLM 服务？
  - 将 `LLM_BASE_URL` 与 `LLM_MODEL` 指向兼容接口（如阿里云/豆包/自建网关等）。

---

## 📄 许可证与说明

本仓库用于学习与研究。子目录内如有单独 LICENSE/README，请以各子项目为准。

更多细节请参阅：
- test-case-generator/README.md
- zidonghuaceping/README.md

---

