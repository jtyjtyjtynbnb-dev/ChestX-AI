# 胸影智识 ChestX-AI

胸部 X 光影像 AI 健康科普与家庭健康档案演示系统。后端使用 FastAPI + ONNX Runtime + LangGraph + SQLite，前端使用 Vue 3 + Pinia + Vite + Tailwind CSS，构建产物由 FastAPI 在单端口托管。

> **医疗声明**：本系统仅用于健康科普与医学影像教学演示，不具备临床诊断效力，不能替代医生面诊与正式影像报告。

## 快速开始

### Windows

1. 安装 Python 3.10+（64 位），勾选 “Add Python to PATH”。
2. 双击 `一键启动.bat`（推荐）或 `start.bat`。脚本会检测依赖；缺失时自动在包内创建 `.venv` 并安装 `backend/requirements.txt`（首次需要联网）。
3. 浏览器自动打开 `http://127.0.0.1:8000/`。
4. 如果需要 Qwen 问答/报告，在页面右上角“设置”中填写 DashScope API Key，或编辑 `backend/.env`。

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
├─ start.bat / start.sh          # 底层启动脚本（单端口 8000）
├─ 操作手册.md                    # 安装、操作、功能、排障、打包
├─ backend/                       # FastAPI、ONNX 推理、RAG、SQLite
│  ├─ model.onnx                  # 10 类胸片多标签模型
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
- 检索：BM25 + TF-IDF + RRF 排序；配置 DashScope 后可启用 embedding / rerank

## 主要能力

- 本地胸片上传（JPG/PNG/未压缩 DICOM）、多文件序列、亮度/对比度、缩放/平移/旋转/反色、长度/角度/ROI 测量
- 10 类征象概率、模型注意力热力图、可解释说明
- Agent 工作流：输入校验 → 推理 → 混合检索 → 报告生成 → 安全审查
- 家庭健康档案、随访对比、风险趋势、报告模板/JSON/Word/打印 PDF
- 健康科普、影像小课堂、互动测验
- Qwen 不可用时的本地知识库兜底

## 语言

- 界面支持中/英切换（vue-i18n），英文模式覆盖导航、页面、表单、报告和提示文案。
- 医学科普长文与模型生成内容目前保留中文；正式英文版应在医学审校后再发布。

## 文档

- [操作手册](操作手册.md)：安装、启动、功能操作、排障、打包
- [图文使用说明（Word）](ChestX-AI-图文使用说明.docx)：带截图的交付版说明
- 后端接口：启动后访问 `http://127.0.0.1:8000/docs`（FastAPI OpenAPI）

## 安全与隐私

- `backend/.env` 保存本地 Qwen Key，已被 `.gitignore` 与 `pack_demo.py` 排除，不要提交或公开转发。
- 演示数据使用虚构人物；请勿录入真实患者身份信息或敏感影像。
- 默认只监听 `127.0.0.1`，不要直接暴露到公网。
