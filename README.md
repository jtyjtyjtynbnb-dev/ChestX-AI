# 胸影智识 ChestX-AI

胸部 X 光影像 AI 健康科普与家庭健康档案演示系统。后端使用 FastAPI + ONNX Runtime + LangGraph + SQLite，前端使用 Vue 3 + Pinia + Vite + Tailwind CSS，构建产物由 FastAPI 在单端口托管。

## 团队信息

- 队伍名称：111qwer
- 团队编号：45855
- 队长：贾天阳
- 队员：彭槐颖
- 指导教师：高泽华
- 学校/组别：中国石油大学（北京）克拉玛依校区 · A组

## 环境配置

敏感配置统一通过**环境变量**注入；公开仓库不包含真实 Key。

```powershell
$env:DASHSCOPE_API_KEY = "sk-你的Key"
$env:QWEN_MODEL = "qwen3.8-flash"

python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Windows 用户也可以设置用户级环境变量后双击 `一键启动.bat`：

```powershell
[Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "sk-你的Key", "User")
[Environment]::SetEnvironmentVariable("QWEN_MODEL", "qwen3.8-flash", "User")
```

- `backend/.env` 仅用于本机临时调试，已被 `.gitignore` 排除，**不得提交或在公开包中分发**。
- `.env.example` 只保留占位符；未配置环境变量时 Qwen 自动走本地回退。
- 依赖清单：`backend/requirements.txt`、`frontend/package.json`。
- 技术文档与评估材料：`技术报告-合规与安全.md`、`模型评估.md`、`操作手册.md`。

> **界面说明**：2026-11 起采用「冷石墨 + 青蓝」视觉体系，并重做首页（可交互对比滑杆、产品能力、流程 / 场景切换、FAQ 等）。当前正文字号为 **17px**，并新增 `Ctrl/Cmd + K` 全局搜索与 AI 速答、页面感知 AI 助手、AI 共脑会诊、家庭健康摘要等 Web + AI 功能。详见 [前端整合与首页改版说明](前端整合与首页改版说明.md)。

> **医疗声明**：本工具仅用于健康科普与教学演示，**不可用于临床诊断，不能替代医生**。系统输出为影像提示与可能性，不构成确诊或治疗建议。
>
> **隐私声明**：原始影像仅在内存中处理，不保存原始文件；健康档案为本机 SQLite/localStorage。默认本地运行；启用 Qwen 时仅发送结构化概率/问题/知识片段，不发送原始影像。当前无鉴权、无 HTTPS，禁止公网部署。详见 [技术报告-合规与安全](技术报告-合规与安全.md)。

## 快速开始

### Windows

1. 安装 Python 3.10+（64 位），勾选 “Add Python to PATH”。
2. 双击 `一键启动.bat`。脚本会检测依赖；缺失时自动在包内创建 `.venv` 并安装 `backend/requirements.txt`（首次需要联网）。
3. 浏览器自动打开 `http://127.0.0.1:8000/`。
4. 如果需要 Qwen 问答/报告，先设置 `DASHSCOPE_API_KEY` 环境变量再启动，或在页面右上角“设置”中填写 Key。Qwen 只接收结构化概率/问题/知识片段，不发送原始影像；未配置时自动本地回退。

### 测试集评估

```bash
# 7 张内置教学图 smoke test
python -m backend.evaluate

# NIH ChestX-ray14 官方 test 完整集（25,596 张）
python -m backend.evaluate_nih \
  --labels data/nih_test_full/selected_images.csv \
  --images data/nih_test_full/images \
  --output data/nih_test_full/eval_metrics.json
```

当前完整 NIH test（全量微调后）：**Top-1 52.74%、Top-3 85.00%、Exact 25.60%**（原模型 45.67%/71.11%/6.88%；全量 PyTorch 与部署 ONNX 完整 test 均已确认）。  
最新测试集评估、guard 指标与局限性见 [模型评估](模型评估.md)。  
7 张教学图只用于 smoke test，**不是临床验证集**；完整说明见 [技术报告-合规与安全](技术报告-合规与安全.md)。

### Linux / macOS

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
./start.sh
```

## 目录

```text
ChestX-AI-演示运行包/
├─ 一键启动.bat                  # 推荐入口（双击）
├─ start.sh                     # Linux/macOS 启动脚本（单端口 8000）
├─ 操作手册.md                    # 安装、操作、功能、排障、打包
├─ 技术报告-合规与安全.md          # 医疗边界、隐私、输出安全、预处理与评估
├─ 模型评估.md                     # NIH 400 子集与 guard 实测指标
├─ backend/                       # FastAPI、ONNX 推理、RAG、SQLite
│  ├─ model.onnx                  # 10 类胸片多标签模型（DenseNet121）
│  ├─ guard_model.onnx            # 胸片/非胸片 guard 分类器（MobileNetV3）
│  ├─ guard_threshold.json        # guard 双阈值
│  ├─ data/chestx.db              # 本地 SQLite（运行期生成/演示数据）
│  └─ requirements.txt
├─ frontend/
│  ├─ src/                        # Vue 3 源码（views/components/composables/stores/api）
│  ├─ assets/                     # 演示胸片与科普图片
│  ├─ tests/                      # Node 原生测试（不随交付 ZIP 发布）
│  └─ dist/                       # 预构建产物（FastAPI 直接托管）
└─ pack_demo.py                   # 生成 <200MB 演示 ZIP
```

## 技术栈

- 前端：Vue 3.5、Pinia 2、Vue Router 4、Vite 5、Tailwind CSS 3.4、ECharts 5、vue-i18n 9、Axios（JSON）+ fetch（SSE）
- 后端：Python 3.10+、FastAPI、Uvicorn、ONNX Runtime、LangGraph 1.2.16、SQLite
- 模型：224×224 输入、10 类 sigmoid 输出、第二个输出为 7×7 注意力图（用于热力图叠加）
- 输入防御：MobileNetV3 guard（胸片/非胸片）+ 启发式兜底，guard 不替代 121 主模型
- 检索：BM25 + TF-IDF + 本地 BGE 语义向量 + RRF 排序；200 条来源可追溯的胸片科普知识；每次默认返回 Top10 证据（最多 12 条）；配置 DashScope 后可启用 embedding / rerank

## 技术架构

```text
浏览器
  Vue 3 SPA（views / components / composables / Pinia / Router）
        │  JSON + SSE，同源 /api
        ▼
FastAPI 单端口
  ├─ 上传校验：格式、大小、DICOM 边界、MobileNetV3 guard
  ├─ 本地视觉：DenseNet121 ONNX → 10 类概率 + 7×7 热力图
  ├─ 混合检索：BM25 + TF-IDF + BGE ONNX + RRF → Top10 证据
  ├─ LangGraph：输入校验 → 推理 → 检索 → 报告 → 证据一致性 → 安全审查
  ├─ 工具层：Function Calling 工具注册表 + MCP stdio server
  └─ 文本增强：Qwen（可选；无 Key / 失败自动本地回退）
        │
        ▼
SQLite + localStorage（家庭成员、档案、对话；仅本机）
```

- 前端五层：视图/交互、组合式逻辑、Pinia 状态、传输层、工具资源层；页面不直接发请求。
- 后端本地优先：原始影像只在内存中解码和推理，不上传云端；Qwen 只接收结构化文本。
- 部署形态：Windows 双击一键启动，FastAPI 在 `127.0.0.1:8000` 单端口托管前端与 API。

## 代码规范

- `.editorconfig`：UTF-8、LF、去尾部空格；前端/JS/Vue 2 空格缩进，Python 4 空格缩进。
- `.prettierrc` / `.prettierignore`：单引号、120 列、ES5 尾逗号；构建产物、模型、数据库和依赖目录不参与格式化。
- 后端模块使用文件头职责说明 + 关键流程行内注释；前端 composable 和页面组件使用 `ChestX-AI maintenance` 注释说明职责。
- 代码分层：`views/components/composables/stores/api`；后端按 `main/model_infer/workflow/rag/tools` 拆分，避免页面直接请求或把业务逻辑塞进路由。
- 提交前至少执行 `npm run build`、`npm test`、`python -m compileall backend`；当前 15 个前端测试全部通过。

## 主要能力

- 本地胸片上传（JPG/PNG/未压缩 DICOM）、多文件序列、亮度/对比度、缩放/平移/旋转/反色、长度/角度/ROI 测量
- 10 类征象概率、模型注意力热力图、可解释说明
- Qwen 循证报告：患者版/医生版摘要、风险分级说明、来源引用、报告追问快捷问题
- 导航栏「数据看板」：成员概览、风险分布、高频关注征象、随访提示与科普知识卡
- 悬浮问答：AI 总结写随访备注、历史会话自定义标题、记录提问家庭成员、来源引用
- Agent 工作流：输入校验 → 推理 → 混合检索 → 报告生成 → 安全审查
- 家庭健康档案、随访对比、风险趋势、报告模板/JSON/Word/打印 PDF
- 健康科普、影像小课堂、互动测验
- Qwen 不可用时的本地知识库兜底
- Function Calling 工具注册表 + MCP stdio server（knowledge_search / record_lookup / report_outline / safety_review）
- RAG 回归评估：24 个胸片问题的 Recall@10 / MRR，支持 BGE 消融
- 校准后的置信度/低置信复核提示；本地语义缓存减少重复问答

## 语言

- 界面支持中/英切换（vue-i18n），英文模式覆盖导航、页面、表单、报告和提示文案。
- 医学科普长文与模型生成内容目前保留中文；正式英文版应在医学审校后再发布。

## 文档

- [操作手册](操作手册.md)：安装、启动、功能操作、排障、打包
- [图文使用说明（Word）](ChestX-AI-图文使用说明.docx)：带截图的交付版说明
- 后端接口：启动后访问 `http://127.0.0.1:8000/docs`（FastAPI OpenAPI）

## 评测与工具调用

```bash
# RAG 回归：默认混合检索
python -m backend.evaluate_rag --output reports/rag_eval_dense.json

# RAG 消融：关闭 BGE 语义向量
$env:CHESTX_DISABLE_DENSE="1"
python -m backend.evaluate_rag --output reports/rag_eval_bm25.json

# 工具列表 / 工具规划 / 工具调用
curl http://127.0.0.1:8000/api/agent/tools
curl -X POST http://127.0.0.1:8000/api/agent/tools/plan -H "Content-Type: application/json" -d "{\"question\":\"帮我看一下随访档案\",\"predicted_codes\":[\"infiltration\"],\"has_record\":true}"

# MCP stdio server
python -m backend.mcp_server
```

## 安全与隐私

- `backend/.env` 保存本地 Qwen Key，已被 `.gitignore` 与 `pack_demo.py` 排除，不要提交或公开转发。
- 演示数据使用虚构人物；请勿录入真实患者身份信息或敏感影像。
- 默认只监听 `127.0.0.1`，不要直接暴露到公网。
