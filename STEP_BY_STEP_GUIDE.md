# ChestX-AI 逐步执行手册（Step-by-Step）

> 本手册逐条落实 `codex_refactor_spec.md` 的 Task 1~6，并补上“让它真正跑起来”的接线步骤。  
> 你不是在“看方案”，而是在“照着执行”。每一步都包含：**做什么 → 改哪个文件 → 写什么代码 → 怎么验证 → 常见坑**。  
> 项目根目录（下称“根目录”）：
> `C:\Users\Acer\Desktop\ChestX-AI-跨电脑演示包-优化版 (1)\ChestX-AI-演示运行包`

---

## 使用说明

### 执行顺序

必须按 Step 0 → Step 14 顺序执行，不要跳步。每一步都有“本步验收”，验收不通过就不要进入下一步。

### 当前代码与 Spec 的差距（先核对，避免重复劳动）

| Spec 要求 | 当前状态 | 本手册对应步骤 |
|---|---|---|
| `backend/database.py` SQLite 持久化 | **已存在且基本完整** | Step 1 只做安全核对 |
| `qwen_client.set_runtime_config()` | **已存在** | Step 11 核对 |
| `qwen_client.stream_chat()` | **存在，但是伪流式（先等完整结果再切片）** | Step 11 改为真流式 |
| `chat_service.stream_answer_question()` | **存在，但是伪流式** | Step 11 改为真流式 |
| `main.py` members/conversations/chat stream 路由 | **已存在** | Step 11 核对契约 |
| `frontend/package.json` + Vite | **已存在** | Step 2 补 Tailwind/构建配置 |
| `frontend/src/` 组件 | **存在，但大部分未接线、未构建** | Step 3~9 |
| `frontend/index.html` 挂载 Vue | **不存在**（仍是 4806 行原生 DOM） | Step 2 |
| `frontend/dist/` | **不存在** | Step 10 |
| `start.bat` 单端口托管 dist | **不存在**（仍是 http.server:8765） | Step 10 |
| `pack_demo.py` | **已存在，但未排除 `.env`** | Step 13 |
| 自动化测试 | **几乎不存在** | Step 12 |

### 两条硬约束的落地方式

Spec 要求“Vue 3 工程源码可审查”且“评委双击 start.bat 无需 Node.js”。这两个要求不矛盾，做法是：

1. **开发机**安装 Node.js，执行 `npm run build`，把 Vue 源码编译成 `frontend/dist/assets/*.js`。
2. **把 `dist/` 一起提交**。评委机器不需要 Node.js。
3. `start.bat` 只启动 FastAPI，由 FastAPI 同时提供 `/api` 和 `dist` 静态资源。
4. 原有 DOM ID 不丢失：它们被搬进 Vue 组件的 `<template>` 里，选择器仍然可用。

> 不建议在浏览器里用 `vue.global.js` 运行时编译 SFC：SFC 无法直接运行，且运行时编译体积更大、首屏更慢。Vite 预编译是标准做法，也更能体现“主流前端框架”的工程能力。

### 每步结束都要提交 Git

```powershell
git add .
git commit -m "feat(step-N): 一句话说明"
```

这样才能形成参赛要求的真实增量历史。

---

## Step 0 —— 准备与基线（约 30 分钟）

### 0.1 检查环境

打开 PowerShell：

```powershell
cd "C:\Users\Acer\Desktop\ChestX-AI-跨电脑演示包-优化版 (1)\ChestX-AI-演示运行包"
python --version
node --version
npm --version
git --version
```

要求：

- Python ≥ 3.10（后端使用了 `zip(..., strict=True)`）。
- Node.js ≥ 18（Vite 5 要求；建议 20 LTS）。
- Git 可用。

如果 `node` 不存在：到 https://nodejs.org 安装 20 LTS，安装后重开终端。评委机器不需要 Node，只有你的开发机需要。

### 0.2 停掉旧服务

```powershell
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*ChestX-AI*" } | Stop-Process -Force
```

或者直接关闭现有的 `start.bat` 窗口。

### 0.3 建立 Git 基线

先在根目录创建 `.gitignore`：

```gitignore
# 敏感配置
.env
.env.local

# Python
.venv/
venv/
__pycache__/
*.py[cod]
.pytest_cache/

# Node
node_modules/
npm-debug.log*

# 运行期数据
backend/data/
*.db
*.sqlite3
*.log
*.pid

# 系统
.DS_Store
Thumbs.db

# 备份
frontend.backup-*/
legacy-backup-*/
```

注意：**不要忽略 `frontend/dist/`**，它要随包提交给评委。

然后：

```powershell
git init
git add .
git commit -m "chore: baseline before optimization"
git tag v1.0-baseline
git checkout -b feat/vue-runtime
```

### 0.4 备份旧前端（可回退）

```powershell
Copy-Item -Recurse -Force ".\frontend" ".\frontend.backup-20261019"
```

备份目录已被 `.gitignore` 排除，不会进仓库。

### ✅ Step 0 验收

```powershell
git status
git log --oneline -1
```

应看到一个基线提交，工作区干净（备份目录被忽略）。

### ⚠️ 常见坑

- 先提交再创建 `.gitignore`，会把 `.env` 写进历史。**顺序不能反**。
- 如果已经误提交 `.env`，不要只 `git rm`；要按 Step 1 轮换密钥，并考虑用 `git filter-repo` 清理历史。

---

## Step 1 —— 安全止血（约 30 分钟）

### 1.1 轮换 DashScope Key

1. 打开阿里云百炼控制台：https://bailian.console.aliyun.com/
2. 找到当前使用的 API Key，**禁用/删除**。
3. 新建一个 Key。
4. 查看用量，确认没有异常调用。

### 1.2 删除包内 `.env`

```powershell
Remove-Item ".\backend\.env" -Force -ErrorAction SilentlyContinue
```

### 1.3 创建 `.env.example`

```env
# 复制本文件为 backend/.env，并填入你自己的 Key
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
QWEN_MODEL=qwen3.8-flash
CHESTX_API_PORT=8000
```

### 1.4 确认后端读取方式

`backend/qwen_client.py` 已经通过 `os.getenv("DASHSCOPE_API_KEY")` 读取。启动时设置环境变量即可：

```powershell
$env:DASHSCOPE_API_KEY = "sk-你的新Key"
$env:QWEN_MODEL = "qwen3.8-flash"
```

或者在 `backend/.env` 中写入（该文件不会被提交）。如果你用 `start.bat`，它需要把 `.env` 读进环境变量；如果当前脚本没有这一步，在启动 uvicorn 前加：

```bat
if exist "%RUN_ROOT%backend\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%RUN_ROOT%backend\.env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
  )
)
```

> 如果这行批处理容易出错，更稳妥的做法是让 Python 端用 `python-dotenv` 读取。但当前 `requirements.txt` 没有这个依赖；不想加依赖就继续用系统环境变量。

### 1.5 扫描敏感信息

```powershell
# 如果安装了 gitleaks
gitleaks detect --source . --no-git

# 没有 gitleaks 时，用 PowerShell 粗扫
Get-ChildItem -Recurse -File -Exclude *.jpg,*.png,*.onnx,*.zip |
  Select-String -Pattern "sk-[A-Za-z0-9]{20,}" -List |
  Select-Object Path, LineNumber
```

### ✅ Step 1 验收

```powershell
Test-Path ".\backend\.env"          # 应为 False
Test-Path ".\.env.example"          # 应为 True
git check-ignore -v backend\.env    # 应输出 .gitignore 规则
```

### ⚠️ 常见坑

- 旧 Key 已经实测可用。**只删文件不等于安全**，必须在控制台禁用。
- 不要为了“评委开箱即用”把新 Key 写进包。正确做法是：README 写配置步骤 + 视频演示 + 本地兜底。

---

## Step 2 —— 建立可构建的 Vue 工程（约 2 小时）

### 2.1 核对 `package.json`

当前已包含 Vue 3、Pinia、Vite、Tailwind、ECharts。补充测试脚本和 `test:unit`：

```json
{
  "scripts": {
    "dev": "vite --port 8765",
    "build": "vite build",
    "preview": "vite preview --port 8765",
    "test:unit": "vitest run"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.4",
    "@vue/test-utils": "^2.4.6",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.8",
    "vitest": "^2.1.4"
  }
}
```

如果暂时不做单元测试，可以只加 `vitest`，或者跳过本节，Step 12 再补。

### 2.2 创建 `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      '2xl': '1440px'
    },
    extend: {
      colors: {
        primary: '#0F62FE',
        'primary-dark': '#0047AB',
        success: '#00B42A',
        warning: '#FF8A00',
        danger: '#F53F3F',
        info: '#36BFFA',
        'page-bg': '#F7F8FA',
        'card-bg': '#FFFFFF',
        'text-1': '#1D2129',
        'text-2': '#4E5969',
        'text-3': '#86909C',
        'border-line': '#E5E6EB'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif']
      }
    }
  },
  plugins: []
};
```

### 2.3 创建 `frontend/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

### 2.4 迁移旧样式

旧 `index.html` 的 `<style>` 在 **第 44~283 行**，包含 `.btn-primary`、`.btn-secondary`、`.card`、`.ai-chat-*` 等组件类，Vue 模板依赖它们。

操作：

1. 新建 `frontend/src/styles/legacy.css`。
2. 把旧 `index.html` 第 44~283 行的内容（不含 `<style>` 标签）复制进去。
3. 不要改类名，保证现有模板样式不变。

### 2.5 创建 `frontend/src/style.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './styles/legacy.css';
```

> PostCSS 会先处理 `@import`，Tailwind 再生成工具类。legacy 里的裸 CSS 不会被 Tailwind 改写，安全。

然后在 `src/main.js` 第一行导入：

```js
import './style.css';
```

### 2.6 备份旧入口并创建 Vite 入口

```powershell
Move-Item ".\frontend\index.html" ".\frontend\legacy.html"
```

新建 `frontend/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>胸影智识 ChestX-AI —— 胸部X光影像AI健康科普</title>
  </head>
  <body class="min-h-screen bg-page-bg text-text-1">
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### 2.7 安装依赖并试构建

```powershell
cd frontend
npm install
npm run build
```

如果构建失败，先解决编译错误，再继续。常见原因：

- `InterpretView.vue` 里引用了不存在的组件/变量。
- `legacy.css` 里包含了 `<style>` 标签残留。
- 路径大小写不一致（Windows 不敏感，Linux 构建会挂）。

### ✅ Step 2 验收

```powershell
Test-Path ".\dist\index.html"          # True
Get-ChildItem ".\dist\assets" | Select-Object Name
```

应看到 `index-*.js` 和 `index-*.css`，且 CSS 中包含主题色 `#0F62FE`。

### ⚠️ 常见坑

- 不要保留两个 `index.html`。Vite 默认以根目录 `index.html` 为入口。
- `legacy.html` 仍可被 Vite 开发服务器访问，用于对照旧界面，但它不会被打进 `dist`（除非配置多入口）。
- `@import` 必须放在 Tailwind 指令之前或之后？CSS 规范要求 `@import` 在所有其他规则之前。若构建报警，把 `@import` 放到文件最顶部。

---

## Step 3 —— 应用壳与路由（约 2 小时）

### 3.1 创建路由

新建 `frontend/src/router/index.js`：

```js
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import InterpretView from '../views/InterpretView.vue';
import RecordsView from '../views/RecordsView.vue';
import KnowledgeView from '../views/KnowledgeView.vue';
import AcademyView from '../views/AcademyView.vue';
import AboutView from '../views/AboutView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/interpret', name: 'interpret', component: InterpretView },
    { path: '/records', name: 'records', component: RecordsView },
    { path: '/knowledge', name: 'knowledge', component: KnowledgeView },
    { path: '/academy', name: 'academy', component: AcademyView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

export default router;
```

### 3.2 创建缺失的视图文件

当前只有 `InterpretView.vue`。先创建 5 个占位视图（后面 Step 8 再填内容）：

```vue
<!-- frontend/src/views/HomeView.vue -->
<template>
  <section id="page-home" class="page-view active space-y-6">
    <h1 class="text-2xl font-bold">胸影智识 ChestX-AI</h1>
    <p class="text-text-2">胸部 X 光影像 AI 健康科普与家庭档案系统</p>
    <router-link id="heroStartBtn" to="/interpret" class="btn-primary inline-flex">
      开始影像解读
    </router-link>
  </section>
</template>
```

`RecordsView.vue`、`KnowledgeView.vue`、`AcademyView.vue`、`AboutView.vue` 同理，先用 `<section id="page-xxx">` 包一个标题。

> 正式迁移时，从 `legacy.html` 复制整段：
> - 首页：第 427~668 行 `<section id="page-home">`
> - 解读：第 674~1068 行 `<section id="page-interpret">`
> - 档案：第 1074~1149 行 `<section id="page-records">`
> - 知识：第 1155~1178 行 `<section id="page-knowledge">`
> - 学堂：第 1184~1260 行 `<section id="page-academy">`
> - 关于：第 1266~1399 行 `<section id="page-about">`
>
> 复制后把 `class="page-view"` 改为 `class="page-view active"`，否则旧 CSS 会把它隐藏。

### 3.3 修改 `src/main.js`

```js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

### 3.4 重写 `src/App.vue`

```vue
<template>
  <div class="min-h-screen bg-page-bg text-text-1">
    <header id="mainHeader" class="sticky top-0 z-40 border-b border-border-line bg-card-bg">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <router-link id="brandLogoBtn" to="/" class="text-lg font-bold text-primary">
          胸影智识 ChestX-AI
        </router-link>
        <nav class="flex items-center gap-4 text-sm text-text-2">
          <router-link to="/interpret">影像解读</router-link>
          <router-link to="/records">家庭档案</router-link>
          <router-link to="/knowledge">知识库</router-link>
          <router-link to="/academy">影像学堂</router-link>
          <router-link to="/about">关于</router-link>
          <button id="openUserModalBtn" type="button" class="btn-secondary" @click="userModalOpen = true">
            家庭成员
          </button>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
      <router-view />
    </main>

    <FloatingAiChat
      @focus-heatmap="handleFocusHeatmap"
      @save-to-notes="handleSaveToNotes"
    />

    <FamilyMemberModal v-if="userModalOpen" @close="userModalOpen = false" />
    <div id="toastContainer" class="fixed right-4 top-20 z-[100] space-y-2"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import FloatingAiChat from './components/FloatingAiChat.vue';
import FamilyMemberModal from './components/FamilyMemberModal.vue';
import { useDiagnoseStore } from './stores/useDiagnoseStore.js';
import { useUserStore } from './stores/useUserStore.js';

const diagnoseStore = useDiagnoseStore();
const userStore = useUserStore();
const userModalOpen = ref(false);

onMounted(async () => {
  await userStore.initMembers();
});

function handleFocusHeatmap() {
  diagnoseStore.focusHighActivationRegion();
}

function handleSaveToNotes(content) {
  userStore.appendMemberNote(content);
}
</script>
```

### 3.5 启动开发服务器验证

```powershell
# 终端 1：后端
cd "C:\Users\Acer\Desktop\ChestX-AI-跨电脑演示包-优化版 (1)\ChestX-AI-演示运行包"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 终端 2：前端
cd frontend
npm run dev
```

打开 `http://127.0.0.1:8765/`，应看到导航和首页占位内容；点击“影像解读”能切换到 `/interpret`。

### ✅ Step 3 验收

- 刷新 `/interpret` 不 404（Vite 开发服务器默认支持 history fallback）。
- 页面源码中有 `<div id="app"></div>`。
- DevTools 的 Vue Devtools 能看到 `<App>`、`<RouterView>`。

### ⚠️ 常见坑

- `createWebHistory` 在生产环境需要服务端 fallback，Step 10 会解决。
- 如果 `FamilyMemberModal.vue` 还不存在，先注释掉它的引用，Step 8 再启用。

---

## Step 4 —— API 层与状态层（约 3 小时）

### 4.1 修改 `src/api/client.js`

目标：

- 生产同源、开发走 Vite 代理，默认 `API_BASE_URL = ''`。
- 保留 `?api=http://127.0.0.1:8000` 兼容旧链接。
- SSE 支持 `FormData`（诊断上传）和 JSON（聊天）。
- 正确处理跨 chunk 的事件与多行 `data:`。

替换为：

```js
/**
 * 统一 API 请求与 SSE 流式消费封装层
 */
const params = new URLSearchParams(window.location.search);
const explicitApi = params.get('api');

// 生产：同源；开发：Vite 代理 /api -> 8000；显式 ?api= 时使用该地址
export const API_BASE_URL = (explicitApi || '').replace(/\/+$/, '');

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && payload.code && payload.code !== 200)) {
    throw new Error(payload?.message || `请求失败 (${response.status})`);
  }
  return payload?.data;
}

function parseSseBlock(block) {
  let eventName = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  return { eventName, dataStr: dataLines.join('\n') };
}

export async function consumeSseStream(path, body, handlers = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    ...(isFormData
      ? { body }
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
  });

  if (!response.ok || !response.body) {
    const errPayload = await response.json().catch(() => null);
    throw new Error(errPayload?.message || '流式服务暂不可用');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatch = (block) => {
    const parsed = parseSseBlock(block);
    if (!parsed) return;
    try {
      const data = JSON.parse(parsed.dataStr);
      handlers[parsed.eventName]?.(data);
    } catch (_e) {
      handlers.parse_error?.({ raw: parsed.dataStr });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    blocks.forEach(dispatch);
  }
  // 处理最后一个没有以空行结尾的事件
  if (buffer.trim()) dispatch(buffer);
  buffer += decoder.decode();
}
```

### 4.2 修改 `src/stores/useUserStore.js`

补充：

- 默认成员工厂（首次启动不空白）。
- `appendMemberNote(content)`：Copilot 的“记入随访备注”直接调用。
- `persistMembers()` 增加防抖，避免每次输入都打后端。

在文件里追加：

```js
function defaultMembers() {
  return [
    {
      id: 'member-default',
      profile: {
        name: '我的家庭',
        age: '',
        gender: '未填写',
        ageGroup: '',
        conditions: '',
        notes: ''
      },
      records: []
    }
  ];
}

let persistTimer = null;
function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persistMembers(), 400);
}

function appendMemberNote(content) {
  const member = currentMember.value;
  if (!member) return;
  const snippet = String(content || '').replace(/\s+/g, ' ').slice(0, 160);
  if (!snippet) return;
  member.profile.notes = [member.profile.notes, `[AI问答摘录] ${snippet}`]
    .filter(Boolean)
    .join('；');
  schedulePersist();
}
```

并把 `defaultMembers`、`schedulePersist`、`appendMemberNote` 加入 `return`。

`initMembers` 的调用改为：

```js
await userStore.initMembers(defaultMembers);
```

（`defaultMembers` 需要从 store 导出，或在 `App.vue` 里定义后传入。更简单：在 `initMembers` 内部，当 `defaultFactory` 为空时使用内置默认成员。修改函数签名默认值即可。）

### 4.3 修改 `src/stores/useDiagnoseStore.js`

完整替换为：

```js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { API_BASE_URL, consumeSseStream } from '../api/client.js';

export const useDiagnoseStore = defineStore('chestx-diagnose', () => {
  const currentCase = ref(null);
  const workflowSteps = ref([]);
  const isInferring = ref(false);
  const errorMessage = ref('');
  const heatmapVisible = ref(true);
  const heatmapOpacity = ref(68);

  function setWorkflowSteps(steps) {
    workflowSteps.value = Array.isArray(steps) ? steps : [];
  }

  function focusHighActivationRegion() {
    heatmapVisible.value = true;
    heatmapOpacity.value = 75;
    document.getElementById('xrayViewerContainer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  async function loadSample(sampleId) {
    const response = await fetch(`${API_BASE_URL}/api/samples/${sampleId}`);
    if (!response.ok) throw new Error('演示样本加载失败');
    const blob = await response.blob();
    const file = new File([blob], `${sampleId}.jpg`, { type: blob.type || 'image/jpeg' });
    if (currentCase.value?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(currentCase.value.imageUrl);
    }
    currentCase.value = {
      key: sampleId,
      title: `临床样本 ${sampleId}`,
      sourceFile: file,
      imageUrl: URL.createObjectURL(blob),
      agentResult: null
    };
    workflowSteps.value = [];
    return file;
  }

  function setLocalFile(file) {
    if (currentCase.value?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(currentCase.value.imageUrl);
    }
    currentCase.value = {
      key: 'upload',
      title: file.name,
      sourceFile: file,
      imageUrl: URL.createObjectURL(file),
      agentResult: null
    };
    workflowSteps.value = [];
  }

  async function runDiagnose(question = '') {
    const file = currentCase.value?.sourceFile;
    if (!file) throw new Error('请先选择临床样本或上传本地胸片');

    isInferring.value = true;
    errorMessage.value = '';
    workflowSteps.value = [];

    const form = new FormData();
    form.append('file', file);
    form.append('question', question);

    let completed = null;
    let streamError = null;

    try {
      await consumeSseStream('/api/agent/diagnose/stream', form, {
        step: (step) => workflowSteps.value.push(step),
        complete: (data) => {
          completed = data;
        },
        error: (data) => {
          streamError = new Error(data?.message || '分析失败');
        }
      });

      if (streamError) throw streamError;
      if (!completed) throw new Error('未收到完整分析结果');

      currentCase.value.agentResult = completed;
      return completed;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isInferring.value = false;
    }
  }

  return {
    currentCase,
    workflowSteps,
    isInferring,
    errorMessage,
    heatmapVisible,
    heatmapOpacity,
    setWorkflowSteps,
    focusHighActivationRegion,
    loadSample,
    setLocalFile,
    runDiagnose
  };
});
```

### 4.4 关于 `inference` 结构

后端 `complete` 事件里的 `inference` 形如：

```json
{
  "top_prediction": { "code": "pneumonia", "name": "Pneumonia", "prob": 78.4 },
  "all_predictions": [ ... ],
  "probabilities": [ ... ],
  "heatmap": "data:image/jpeg;base64,...",
  "heatmap_overlay": "data:image/jpeg;base64,..."
}
```

前端统一使用 `agentResult.inference.probabilities` 和 `agentResult.inference.heatmap`。`heatmap_overlay` 目前是重复字段，Step 11 会删掉。

### ✅ Step 4 验收

在浏览器 Console：

```js
const { useDiagnoseStore } = await import('/src/stores/useDiagnoseStore.js');
// 仅作检查；实际在组件里使用
```

更直接的验收：Step 6 接好解读页后，点击分析能看到 step 逐个出现。

### ⚠️ 常见坑

- `consumeSseStream` 里 `throw` 不会从回调传出去，所以用 `streamError` 变量收集。
- `FormData` 请求不要手动设置 `Content-Type`，否则 boundary 丢失。
- `API_BASE_URL = ''` 时，`fetch('/api/...')` 在开发环境由 Vite 代理，生产环境由 FastAPI 同源处理。

---

## Step 5 —— 看片台组件（约 4 小时）

### 5.1 创建 `src/renderer/HeatmapLayer.js`

```js
export class HeatmapLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.bitmap = null;
    this.pending = false;
    this.sourceKey = '';
  }

  async setSource(source, key = '') {
    if (!source) {
      this.bitmap = null;
      this.sourceKey = '';
      this.schedule();
      return;
    }
    if (key && key === this.sourceKey && this.bitmap) {
      this.schedule();
      return;
    }
    const response = await fetch(source);
    const blob = await response.blob();
    this.bitmap = await createImageBitmap(blob);
    this.sourceKey = key;
    this.schedule();
  }

  resize(cssWidth, cssHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.schedule();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.draw();
    });
  }

  draw() {
    const { ctx, canvas, bitmap } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
  }

  destroy() {
    this.bitmap?.close?.();
    this.bitmap = null;
    this.ctx = null;
  }
}
```

### 5.2 创建 `src/composables/useXrayViewer.js`

```js
import { reactive } from 'vue';

export function fitBox(viewW, viewH, imgW, imgH) {
  if (!viewW || !viewH || !imgW || !imgH) return { x: 0, y: 0, w: 0, h: 0 };
  const scale = Math.min(viewW / imgW, viewH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (viewW - w) / 2, y: (viewH - h) / 2, w, h };
}

export function zoomAt(state, px, py, nextScale, min = 0.5, max = 5) {
  const target = Math.min(max, Math.max(min, nextScale));
  const k = target / state.scale;
  state.tx = px - (px - state.tx) * k;
  state.ty = py - (py - state.ty) * k;
  state.scale = target;
}

export function clampPan(state, contentW, contentH, viewW, viewH) {
  const maxX = Math.max(0, (contentW * state.scale - viewW) / 2);
  const maxY = Math.max(0, (contentH * state.scale - viewH) / 2);
  state.tx = Math.min(maxX, Math.max(-maxX, state.tx));
  state.ty = Math.min(maxY, Math.max(-maxY, state.ty));
}

export function createViewerState() {
  return reactive({
    scale: 1,
    tx: 0,
    ty: 0,
    rotation: 0,
    inverted: false,
    compareMode: false,
    splitPercent: 50,
    heatmapVisible: true,
    heatmapOpacity: 68
  });
}
```

### 5.3 创建 `src/components/XrayWorkbench.vue`

关键要求：

- 保留 ID：`xrayViewerContainer`、`xrayViewport`、`xrayTransformLayer`、`xrayBaseImg`、`heatmapCanvas`、`compareModeBtn`、`heatmapOpacitySlider`、`toggleHeatmapBtn`、`zoomInBtn`、`zoomOutBtn`、`rotateBtn`、`invertFilterBtn`、`resetViewerBtn`、`zoomPercentBadge`。
- 底图与热力层在同一个内容盒里。
- 变换只作用于 `xrayTransformLayer`。
- 卷帘只改 `heatmapCanvas.style.clipPath`。

模板骨架：

```vue
<template>
  <section id="viewerPanel" class="card overflow-hidden">
    <div
      id="xrayViewerContainer"
      ref="containerRef"
      class="relative flex h-[520px] select-none items-center justify-center overflow-hidden bg-black"
      style="touch-action: none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <div
        id="xrayTransformLayer"
        ref="layerRef"
        class="relative"
        :style="layerStyle"
      >
        <img
          id="xrayBaseImg"
          ref="imageRef"
          :src="imageUrl"
          alt="胸部 X 光影像"
          draggable="false"
          class="block h-full w-full object-contain"
          :style="{ filter: state.inverted ? 'invert(1)' : 'none' }"
          @load="onImageLoad"
        />
        <canvas
          id="heatmapCanvas"
          ref="canvasRef"
          role="img"
          aria-label="模型注意力热力图，红色表示模型关注区域，具体概率见右侧列表"
          class="pointer-events-none absolute inset-0"
          :style="{ opacity: state.heatmapVisible ? state.heatmapOpacity / 100 : 0 }"
        ></canvas>
        <div
          v-if="state.compareMode"
          id="compareDividerLine"
          class="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80"
          :style="{ left: `${state.splitPercent}%` }"
        ></div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-t border-border-line bg-card-bg p-3">
      <button id="zoomOutBtn" class="btn-secondary" type="button" @click="zoomBy(-0.2)">缩小</button>
      <span id="zoomPercentBadge" class="text-sm text-text-2">{{ Math.round(state.scale * 100) }}%</span>
      <button id="zoomInBtn" class="btn-secondary" type="button" @click="zoomBy(0.2)">放大</button>
      <button id="rotateBtn" class="btn-secondary" type="button" @click="rotate">旋转</button>
      <button id="invertFilterBtn" class="btn-secondary" type="button" :aria-pressed="state.inverted" @click="state.inverted = !state.inverted">反色</button>
      <button id="toggleHeatmapBtn" class="btn-secondary" type="button" :aria-pressed="state.heatmapVisible" @click="state.heatmapVisible = !state.heatmapVisible">
        热力图
      </button>
      <label class="flex items-center gap-2 text-sm text-text-2">
        透明度
        <input
          id="heatmapOpacitySlider"
          v-model.number="state.heatmapOpacity"
          type="range"
          min="0"
          max="100"
          aria-label="热力图透明度"
          :aria-valuetext="`${state.heatmapOpacity}%`"
        />
      </label>
      <button id="compareModeBtn" class="btn-secondary" type="button" :aria-pressed="state.compareMode" @click="toggleCompare">
        左右对比
      </button>
      <input
        v-if="state.compareMode"
        id="compareSplitRange"
        v-model.number="state.splitPercent"
        type="range"
        min="0"
        max="100"
        aria-label="卷帘分割位置"
        class="w-40"
      />
      <button id="resetViewerBtn" class="btn-secondary" type="button" @click="reset">重置</button>
    </div>
  </section>
</template>
```

脚本核心：

```js
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { HeatmapLayer } from '../renderer/HeatmapLayer.js';
import { clampPan, createViewerState, fitBox, zoomAt } from '../composables/useXrayViewer.js';

const props = defineProps({
  imageUrl: { type: String, default: '' },
  heatmapUrl: { type: String, default: '' },
  imageWidth: { type: Number, default: 0 },
  imageHeight: { type: Number, default: 0 },
  traceKey: { type: String, default: '' }
});

const state = createViewerState();
const containerRef = ref(null);
const layerRef = ref(null);
const imageRef = ref(null);
const canvasRef = ref(null);

let heatmapLayer = null;
let resizeObserver = null;
const content = reactive({ w: 0, h: 0 });
let rafId = 0;
const pointers = new Map();

const layerStyle = computed(() => ({
  width: content.w ? `${content.w}px` : '100%',
  height: content.h ? `${content.h}px` : '100%',
  transform: `translate(${state.tx}px, ${state.ty}px) scale(${state.scale}) rotate(${state.rotation}deg)`,
  transition: pointers.size ? 'none' : 'transform 160ms ease-out'
}));

function measure() {
  const view = containerRef.value;
  const img = imageRef.value;
  if (!view || !img) return;
  const viewW = view.clientWidth;
  const viewH = view.clientHeight;
  const imgW = props.imageWidth || img.naturalWidth;
  const imgH = props.imageHeight || img.naturalHeight;
  const box = fitBox(viewW, viewH, imgW, imgH);
  content.w = box.w;
  content.h = box.h;
  if (canvasRef.value) heatmapLayer?.resize(box.w, box.h);
}

function onImageLoad() {
  measure();
  heatmapLayer?.setSource(props.heatmapUrl, props.traceKey || props.heatmapUrl);
}

function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    clampPan(state, content.w, content.h, containerRef.value.clientWidth, containerRef.value.clientHeight);
  });
}

function zoomBy(delta) {
  const rect = containerRef.value.getBoundingClientRect();
  zoomAt(state, rect.width / 2, rect.height / 2, state.scale + delta, 0.5, 5);
  scheduleRender();
}

function onWheel(event) {
  const rect = containerRef.value.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const next = state.scale * (event.deltaY < 0 ? 1.12 : 0.89);
  zoomAt(state, px, py, next, 0.5, 5);
  scheduleRender();
}

function onPointerDown(event) {
  containerRef.value.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

function onPointerMove(event) {
  const prev = pointers.get(event.pointerId);
  if (!prev) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 1) {
    state.tx += event.clientX - prev.x;
    state.ty += event.clientY - prev.y;
  }
  scheduleRender();
}

function onPointerUp(event) {
  pointers.delete(event.pointerId);
}

function rotate() {
  state.rotation = (state.rotation + 90) % 360;
}

function toggleCompare() {
  state.compareMode = !state.compareMode;
}

function reset() {
  state.scale = 1;
  state.tx = 0;
  state.ty = 0;
  state.rotation = 0;
  state.inverted = false;
  state.compareMode = false;
  state.splitPercent = 50;
}

watch(() => props.heatmapUrl, (url) => {
  heatmapLayer?.setSource(url, props.traceKey || url);
});

watch(() => state.compareMode, (enabled) => {
  if (!canvasRef.value) return;
  canvasRef.value.style.clipPath = enabled ? `inset(0 0 0 ${state.splitPercent}%)` : 'none';
  canvasRef.value.style.transition = 'none';
});

watch(() => state.splitPercent, (value) => {
  if (canvasRef.value && state.compareMode) {
    canvasRef.value.style.clipPath = `inset(0 0 0 ${value}%)`;
  }
});

onMounted(async () => {
  await nextTick();
  heatmapLayer = new HeatmapLayer(canvasRef.value);
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(containerRef.value);
  measure();
  if (imageRef.value?.complete) {
    // 图片可能已在挂载前缓存完成，load 事件不会再触发
    onImageLoad();
  } else if (props.heatmapUrl) {
    heatmapLayer.setSource(props.heatmapUrl, props.traceKey || props.heatmapUrl);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  heatmapLayer?.destroy();
});
</script>
```

> 说明：上面的卷帘是“热力图右侧显示、左侧隐藏”。如果你想要“左图右热力”的经典对比，把 `clipPath` 改为 `inset(0 ${100 - splitPercent}% 0 0)`，并在文档里说明方向。

### 5.4 触摸捏合

在上面的 Pointer 逻辑上补：

```js
let pinchStartDistance = 0;
let pinchStartScale = 1;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function onPointerDown(event) {
  containerRef.value.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStartDistance = distance(a, b);
    pinchStartScale = state.scale;
  }
}

function onPointerMove(event) {
  const prev = pointers.get(event.pointerId);
  if (!prev) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 1) {
    state.tx += event.clientX - prev.x;
    state.ty += event.clientY - prev.y;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = distance(a, b);
    if (pinchStartDistance > 0) {
      const rect = containerRef.value.getBoundingClientRect();
      const px = (a.x + b.x) / 2 - rect.left;
      const py = (a.y + b.y) / 2 - rect.top;
      zoomAt(state, px, py, pinchStartScale * (d / pinchStartDistance), 0.5, 5);
    }
  }
  scheduleRender();
}
```

### ✅ Step 5 验收

1. 用一张非正方形图片（例如 1376×768）打开看片台。
2. 滚轮缩放：鼠标下的结构应保持不动。
3. 放大后拖动：影像不能被拖出视口。
4. 打开卷帘并拖动：热力图分界线随滑块移动，且**不触发 Canvas 重绘**（Performance 面板确认）。
5. 2× 屏截图：热力图边缘清晰。

### ⚠️ 常见坑

- `canvas` 的 CSS 尺寸与 `width/height` 属性不是一回事。必须同时设置，否则 DPR 下会模糊或错位。
- 缩放锚点公式里的 `px/py` 是相对视口容器的坐标，不是页面坐标。
- 卷帘用 `clip-path` 后，`opacity` 仍然生效；两者叠加是预期行为。
- 不要在 `pointermove` 里直接 `draw()`；只更新状态，用 rAF 合帧。

---

## Step 6 —— 解读页接线（约 4 小时）

### 6.1 保留现有模板

`src/views/InterpretView.vue` 已有 407 行模板和大量 ID。不要重写模板，只替换/补全 `<script setup>`。

### 6.2 脚本接线

```vue
<script setup>
import { computed, onMounted, ref } from 'vue';
import { useDiagnoseStore } from '../stores/useDiagnoseStore.js';
import { useUserStore } from '../stores/useUserStore.js';
import { useDiagnoseFlow } from '../composables/useDiagnoseFlow.js';
import XrayWorkbench from '../components/XrayWorkbench.vue';

const diagnoseStore = useDiagnoseStore();
const userStore = useUserStore();
const { validateImageFile } = useDiagnoseFlow();

const question = ref('');
const localError = ref('');
const showDetailedSteps = ref(true);
const fileInputRef = ref(null);

const agentResult = computed(() => diagnoseStore.currentCase?.agentResult || null);
const inference = computed(() => agentResult.value?.inference || null);
const probabilities = computed(() => inference.value?.probabilities || []);
const report = computed(() => agentResult.value?.report || null);
const sources = computed(() => agentResult.value?.sources || []);
const imageUrl = computed(() => diagnoseStore.currentCase?.imageUrl || '');
const heatmapUrl = computed(() => inference.value?.heatmap || '');

onMounted(async () => {
  // 预载一个样本，保证“第一次点击”就是真实分析，而不是假进度条
  try {
    await diagnoseStore.loadSample('case-medium');
  } catch (_e) {
    localError.value = '演示样本加载失败，请上传本地胸片';
  }
});

async function onFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const error = validateImageFile(file);
  if (error) {
    localError.value = error;
    return;
  }
  localError.value = '';
  diagnoseStore.setLocalFile(file);
}

async function chooseSample(sampleId) {
  localError.value = '';
  try {
    await diagnoseStore.loadSample(sampleId);
  } catch (error) {
    localError.value = error.message;
  }
}

async function startAnalyze() {
  if (!diagnoseStore.currentCase?.sourceFile) {
    localError.value = '请先选择临床样本或上传本地胸片';
    return;
  }
  localError.value = '';
  try {
    await diagnoseStore.runDiagnose(question.value.trim());
  } catch (error) {
    localError.value = error.message;
  }
}

function saveCurrentRecord() {
  if (!agentResult.value) return;
  userStore.addRecord({
    title: diagnoseStore.currentCase?.title || '胸部正位 X 光筛查',
    date: new Date().toISOString().slice(0, 10),
    riskLevel: agentResult.value.report?.risk_level || 'LOW',
    summary: agentResult.value.report?.summary || '',
    probabilities: probabilities.value,
    report: report.value,
    imageUrl: ''
  });
}
</script>
```

在模板中给按钮绑定事件：

```html
<input id="xrayFileInput" ref="fileInputRef" type="file" accept="image/jpeg,image/png" class="hidden" @change="onFileChange" />
<button id="startAnalyzeBtn" type="button" class="btn-primary" :disabled="diagnoseStore.isInferring" @click="startAnalyze">
  {{ diagnoseStore.isInferring ? '分析中…' : '开始 AI 智能分析' }}
</button>
<button id="saveRecordBtn" type="button" class="btn-secondary" :disabled="!agentResult" @click="saveCurrentRecord">
  保存到家庭档案
</button>
```

步骤条：

```html
<div id="routeProgressBar" class="space-y-2">
  <div v-for="(step, index) in diagnoseStore.workflowSteps" :key="index" class="flex items-center gap-2">
    <span class="text-xs" :class="step.status === 'completed' ? 'text-success' : 'text-warning'">●</span>
    <span class="text-sm text-text-2">{{ step.name }}</span>
    <span class="text-xs text-text-3" v-if="step.elapsed_ms">{{ step.elapsed_ms }} ms</span>
  </div>
</div>
```

概率列表：

```html
<div id="probListView" v-if="probabilities.length">
  <div v-for="item in probabilities" :key="item.code" class="flex items-center justify-between py-1.5">
    <span class="text-sm text-text-2">{{ item.name }}</span>
    <span class="text-sm font-semibold">{{ item.prob }}%</span>
  </div>
</div>
```

报告：

```html
<div id="agentReportPanel" v-if="report">
  <p id="agentReportSummary">{{ report.summary }}</p>
  <ul id="agentEvidenceList">
    <li v-for="source in sources" :key="source.id">
      <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
    </li>
  </ul>
  <p id="agentDisclaimer">{{ report.disclaimer }}</p>
</div>
```

看片台：

```html
<XrayWorkbench
  :image-url="imageUrl"
  :heatmap-url="heatmapUrl"
  :image-width="inference?.image_width || 0"
  :image-height="inference?.image_height || 0"
  :trace-key="agentResult?.trace_id || ''"
/>
```

> 如果后端还没有返回 `image_width/image_height`（Step 11 才加），`XrayWorkbench` 会回退到 `img.naturalWidth/naturalHeight`，暂时可用。

### 6.3 删除假分析路径

在旧 `legacy.html` 中定位：

- `triggerAiAnalysisFlow`（约 3399 行）
- `if (AppState.currentCase.sourceFile)`（约 3426 行）
- 假进度条 `setInterval`（约 3458~3483 行）

新 Vue 代码中**不要**复制这段逻辑。`startAnalyze` 必须直接调用 `runDiagnose`。如果 `sourceFile` 为空，提示用户，不产生任何结果。

### ✅ Step 6 验收

1. 打开 `/interpret`，默认样本 2 显示在看片台。
2. 点击“开始 AI 智能分析”：
   - Network 中出现 `POST /api/agent/diagnose/stream`。
   - 步骤条依次出现“输入校验 → 影像推理 → 知识检索 → 报告生成 → 安全审查”。
   - 概率列表和报告来自响应。
3. 快速点击两次，不应产生两条并发请求（用 `isInferring` 禁用按钮）。
4. 刷新页面，历史结果不冒充当前结果（当前结果可以清空，档案在 `/records`）。

### ⚠️ 常见坑

- 不要在上传后立即调用 `runDiagnose`，否则用户还没确认问题就消耗额度。
- 样本加载是 `GET /api/samples/{id}`，返回 JPEG；把它转成 `File` 再上传，保持与本地文件同一路径。
- `URL.revokeObjectURL` 要在替换图片时调用，否则长时间演示会泄漏内存。

---

## Step 7 —— 悬浮 AI Copilot（约 5 小时）

### 7.1 保留的 DOM ID 与功能

必须在 `FloatingAiChat.vue` 中保留：

| ID | 用途 |
|---|---|
| `aiChatLauncher` | 右下角悬浮按钮 |
| `aiChatPanel` | 面板 |
| `aiChatHeader` | 拖拽手柄 |
| `aiChatMessages` | 消息流 |
| `aiChatInput` | 输入框 |
| `aiChatSendBtn` | 发送 |
| `aiChatTeachingSamples` | 6 个教学快捷按钮 |
| `aiChatContextBanner` | 当前成员/影像状态 |
| `aiChatNewBtn` / `aiChatHistoryBtn` / `aiChatCloseBtn` | 新建/历史/收起 |

### 7.2 关键脚本

```js
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useDiagnoseStore } from '../stores/useDiagnoseStore.js';
import { useUserStore } from '../stores/useUserStore.js';
import { consumeSseStream } from '../api/client.js';

const emit = defineEmits(['focus-heatmap', 'save-to-notes']);
const diagnoseStore = useDiagnoseStore();
const userStore = useUserStore();

const isOpen = ref(false);
const isSending = ref(false);
const input = ref('');
const messagesEl = ref(null);
const inputEl = ref(null);
const panelEl = ref(null);
const headerEl = ref(null);
const position = reactive({ x: null, y: null });
const messages = ref([
  {
    role: 'assistant',
    content: '你好，我是影像问答助手。我会结合当前家庭成员档案、胸片解读结果和医学知识库回答科普问题。不能替代医生诊断。'
  }
]);

const teachingSamples = [
  '胸腔积液在胸片上有什么表现？',
  '肺结节多大需要复查？',
  '气胸的典型征象是什么？',
  '胸片上的浸润影可能代表什么？',
  '心影增大需要做哪些检查？',
  '报告里的“肺不张”是什么意思？'
];

const currentMember = computed(() => userStore.currentMember);

function togglePanel() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => inputEl.value?.focus());
  }
}

function currentChatDiagnosisContext() {
  const result = diagnoseStore.currentCase?.agentResult;
  const member = currentMember.value;
  return {
    probabilities: (result?.inference?.probabilities || []).slice(0, 5).map((item) => ({
      code: item.code,
      name: item.name,
      prob: item.prob
    })),
    summary: result?.report?.summary || '',
    member_profile: member
      ? {
          id: member.id,
          name: member.profile.name,
          age: member.profile.age,
          gender: member.profile.gender,
          conditions: member.profile.conditions,
          notes: member.profile.notes,
          record_count: (member.records || []).length
        }
      : null
  };
}

async function sendMessage(text) {
  const question = String(text || input.value).trim();
  if (!question || isSending.value) return;
  input.value = '';
  const history = messages.value.slice(-8).map(({ role, content }) => ({ role, content }));
  messages.value.push({ role: 'user', content: question });
  const assistant = reactive({ role: 'assistant', content: '', steps: [], sources: [], actions: true });
  messages.value.push(assistant);
  isSending.value = true;
  scrollToBottom();

  try {
    await consumeSseStream(
      '/api/agent/chat/stream',
      {
        question,
        history,
        diagnosis_context: currentChatDiagnosisContext()
      },
      {
        step: (step) => {
          assistant.steps.push(step);
        },
        token: (payload) => {
          assistant.content += payload.delta || '';
          scrollToBottom();
        },
        complete: (payload) => {
          assistant.content = payload.answer || assistant.content;
          assistant.sources = payload.sources || [];
          assistant.steps = payload.steps || assistant.steps;
        },
        error: (payload) => {
          assistant.content = payload?.message || '问答服务暂不可用';
        }
      }
    );
  } catch (error) {
    assistant.content = error.message;
  } finally {
    isSending.value = false;
    scrollToBottom();
    userStore.persistConversations?.();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  });
}

function onKeydown(event) {
  if (event.altKey && (event.key === 'k' || event.key === 'K')) {
    event.preventDefault();
    togglePanel();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>
```

### 7.3 拖拽与位置记忆

```js
const STORAGE_KEY = 'chestx-ai-chat-position';

function clampPosition(x, y) {
  const panel = panelEl.value;
  if (!panel) return { x, y };
  const rect = panel.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 12;
  const maxY = window.innerHeight - rect.height - 12;
  return {
    x: Math.min(Math.max(12, x), Math.max(12, maxX)),
    y: Math.min(Math.max(12, y), Math.max(12, maxY))
  };
}

function onHeaderPointerDown(event) {
  const panel = panelEl.value;
  if (!panel) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = panel.getBoundingClientRect();
  const originLeft = rect.left;
  const originTop = rect.top;

  function move(e) {
    const next = clampPosition(originLeft + e.clientX - startX, originTop + e.clientY - startY);
    panel.style.left = `${next.x}px`;
    panel.style.top = `${next.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    const rect = panel.getBoundingClientRect();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && panelEl.value) {
      const next = clampPosition(saved.x, saved.y);
      panelEl.value.style.left = `${next.x}px`;
      panelEl.value.style.top = `${next.y}px`;
      panelEl.value.style.right = 'auto';
      panelEl.value.style.bottom = 'auto';
    }
  } catch (_e) {}
});
```

### 7.4 教学快捷按钮

```html
<div id="aiChatTeachingSamples" class="flex flex-wrap gap-1.5 px-3 py-2">
  <button
    v-for="sample in teachingSamples"
    :key="sample"
    type="button"
    class="rounded-full border border-border-line px-2.5 py-1 text-[11px] text-text-2 hover:border-primary hover:text-primary"
    @click="sendMessage(sample)"
  >
    {{ sample }}
  </button>
</div>
```

### 7.5 消息气泡与联动按钮

```html
<div id="aiChatMessages" ref="messagesEl" class="ai-chat-messages">
  <div v-for="(msg, index) in messages" :key="index" :class="['ai-chat-bubble', msg.role]">
    <div class="whitespace-pre-wrap">{{ msg.content }}</div>

    <div v-if="msg.role === 'assistant' && msg.steps?.length" class="mt-1 flex flex-wrap gap-1">
      <span v-for="step in msg.steps" :key="step.name" class="text-[10px] text-text-3">
        {{ step.name }} · {{ step.status }}
      </span>
    </div>

    <div v-if="msg.role === 'assistant' && msg.sources?.length" class="mt-2 space-y-1 border-t border-border-line pt-1.5">
      <a
        v-for="source in msg.sources"
        :key="source.id"
        class="ai-chat-source block text-[11px] text-primary hover:underline"
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ source.title }}
      </a>
    </div>

    <div v-if="msg.role === 'assistant' && msg.actions" class="mt-2 flex flex-wrap gap-1.5 border-t border-border-line pt-1.5">
      <button type="button" class="text-[11px] text-primary hover:underline" @click="emit('focus-heatmap')">
        定位高激活热区
      </button>
      <button
        type="button"
        class="text-[11px] text-primary hover:underline"
        @click="emit('save-to-notes', msg.content)"
      >
        记入成员随访备注
      </button>
    </div>
  </div>
</div>
```

### 7.6 输入区

```html
<form id="aiChatForm" class="flex items-end gap-2 border-t border-border-line p-3" @submit.prevent="sendMessage()">
  <textarea
    id="aiChatInput"
    ref="inputEl"
    v-model="input"
    rows="2"
    maxlength="500"
    class="min-h-[42px] flex-1 resize-none rounded-lg border border-border-line px-3 py-2 text-sm outline-none focus:border-primary"
    placeholder="询问胸片术语、复查建议或健康科普…"
    @keydown.enter.exact.prevent="sendMessage()"
  ></textarea>
  <button id="aiChatSendBtn" type="submit" class="btn-primary" :disabled="isSending || !input.trim()">
    {{ isSending ? '生成中…' : '发送' }}
  </button>
</form>
```

### ✅ Step 7 验收

1. `Alt+K` 打开/收起面板，输入框自动聚焦。
2. 发送问题后：
   - 助手气泡先出现，随后文字逐步增长。
   - 步骤标签出现“问题理解 / 知识检索 / Qwen 生成”。
   - 完成后出现来源链接。
3. 拖动面板后刷新页面，位置保持。
4. 点击“定位高激活热区”，页面滚动到看片台，热力图打开、透明度变为 75。
5. 点击“记入成员随访备注”，刷新后成员 `notes` 仍包含该摘要。

### ⚠️ 常见坑

- 拖拽时 `pointermove` 监听在 `window` 上，不要只监听 header，否则快速拖动会丢事件。
- 面板初始定位使用 `right/bottom`，拖动后必须改为 `left/top` 并清空 `right/bottom`，否则位置会跳。
- `messages` 里不要存不可序列化的对象；历史消息只保留 `role/content`。
- 后端 500 字符限制，前端 `maxlength=500` 只是提示，提交前仍要 `trim`。

---

## Step 8 —— 家庭成员与档案（约 3 小时）

### 8.1 `FamilyMemberModal.vue`

必须保留 ID：

- `userModalBackdrop`、`userProfileForm`、`userNameInput`、`userAgeInput`、`userGenderInput`、`userConditionInput`、`userNotesInput`
- `saveUserBtn`、`closeUserModalBtn`、`newMemberBtn`、`deleteMemberBtn`、`familyMemberList`

核心逻辑：

```js
const form = reactive({ id: '', name: '', age: '', gender: '未填写', conditions: '', notes: '' });
const editingId = ref('');

function selectMember(member) {
  userStore.currentMemberId = member.id;
  userStore.persistMembers();
}

function startCreate() {
  editingId.value = '';
  Object.assign(form, { id: '', name: '', age: '', gender: '未填写', conditions: '', notes: '' });
}

function startEdit(member) {
  editingId.value = member.id;
  Object.assign(form, member.profile);
}

function saveMember() {
  if (!form.name.trim()) return;
  if (editingId.value) {
    const member = userStore.familyMembers.find((m) => m.id === editingId.value);
    if (member) Object.assign(member.profile, { ...form, name: form.name.trim() });
  } else {
    const member = {
      id: `member-${Date.now()}`,
      profile: { ...form, name: form.name.trim() },
      records: []
    };
    userStore.familyMembers.push(member);
    userStore.currentMemberId = member.id;
  }
  userStore.persistMembers();
  startCreate();
}

function deleteMember(member) {
  if (userStore.familyMembers.length <= 1) return;
  const index = userStore.familyMembers.findIndex((m) => m.id === member.id);
  userStore.familyMembers.splice(index, 1);
  if (userStore.currentMemberId === member.id) {
    userStore.currentMemberId = userStore.familyMembers[0]?.id || '';
  }
  userStore.persistMembers();
}
```

### 8.2 `RecordsView.vue`

必须保留 ID：

- `recordsListContainer`、`recordsEmptyState`、`filterKeyword`、`filterRiskLevel`、`filterTimeRange`、`resetRecordFilterBtn`
- `statTotalCount`、`statHighRiskCount`、`statLowRiskCount`

`useUserStore` 增加：

```js
function addRecord(record) {
  const member = currentMember.value;
  if (!member) return;
  member.records = member.records || [];
  member.records.unshift({
    id: `rec-${Date.now()}`,
    ...record
  });
  persistMembers();
}
```

并在 `return` 中导出 `addRecord`。

档案页用 `currentMember.records` 渲染，支持关键字/风险/时间过滤。保存后刷新页面，数据应来自后端 SQLite。

### ✅ Step 8 验收

1. 新建成员“李秀英”、填写年龄/性别/病史，保存。
2. 刷新页面，成员仍在，且当前成员不变。
3. 在 `/interpret` 保存一条记录，切到 `/records` 能看到。
4. 重启后端，再刷新，记录仍在。

### ⚠️ 常见坑

- `member.profile.notes` 是字符串，不是数组。拼接时用 `；` 分隔，避免类型漂移。
- 全量 `POST /api/members/sync` 会覆盖服务端记录；Step 11 会改成增量。迁移期间不要同时在两个标签页编辑。
- 删除成员时，SQLite 的 `ON DELETE CASCADE` 需要 `PRAGMA foreign_keys = ON`；当前 `database.py` 已设置。

---

## Step 9 —— Qwen 设置弹窗（约 1 小时）

### 9.1 保留 ID

`qwenSettingsForm`、`qwenApiKeyInput`、`qwenModelInput`、`qwenConfigStatus`、`qwenTestResult`、`testQwenSettingsBtn`、`saveQwenSettingsBtn`。

### 9.2 调用现有接口

```js
import { requestJson } from '../api/client.js';

const config = reactive({ configured: false, model: 'qwen3.8-flash', api_key: '' });
const testing = ref(false);
const testResult = ref('');

async function loadConfig() {
  const data = await requestJson('/api/settings/qwen');
  Object.assign(config, data);
}

async function saveConfig() {
  await requestJson('/api/settings/qwen', {
    method: 'POST',
    body: JSON.stringify({ api_key: config.api_key, model: config.model })
  });
  await loadConfig();
}

async function testConfig() {
  testing.value = true;
  testResult.value = '';
  try {
    const data = await requestJson('/api/settings/qwen/test', { method: 'POST' });
    testResult.value = data.ok ? '连接成功' : `连接失败：${data.message || '未知错误'}`;
  } catch (error) {
    testResult.value = error.message;
  } finally {
    testing.value = false;
  }
}
```

### 9.3 安全提示

- 输入框 `type="password"`，不要回显完整 Key。
- GET 接口只返回 `configured` 和 `model`，不要返回 Key 本身（核对 `main.py` 当前实现，若返回了 Key，立即改）。
- 保存会写入 `backend/.env`，该文件必须被 `.gitignore` 排除。

### ✅ Step 9 验收

1. 输入无效 Key，点击测试，显示失败原因。
2. 输入有效 Key，点击测试，显示成功。
3. 重启后端，`GET /api/settings/qwen` 显示 `configured: true`。

---

## Step 10 —— 构建与单端口托管（约 2 小时）

这是“评委双击 start.bat 就能跑”的关键。

### 10.1 构建前端

```powershell
cd frontend
npm run build
```

确认：

```powershell
Get-ChildItem .\dist
Get-ChildItem .\dist\assets | Select-Object Name, Length
```

### 10.2 修改 `backend/main.py`

在文件末尾、**所有 `/api` 路由之后**加入：

```python
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DIST_DIR = Path(__file__).resolve().parents[1] / "frontend" / "dist"

if DIST_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            return error_response(404, "接口不存在")
        target = DIST_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/", include_in_schema=False)
    async def dist_missing():
        return error_response(
            500,
            "前端尚未构建。请在 frontend 目录执行 npm install && npm run build",
        )
```

注意：

- FastAPI 按注册顺序匹配。这个 catch-all 必须放在最后。
- `/assets` 挂载必须在 catch-all 之前，否则静态文件会被当 SPA 路由。
- `error_response` 需要返回 JSON；如果它返回 `JSONResponse`，类型注解可改为 `Response`。

### 10.3 修改 `start.bat`

先备份：

```powershell
Copy-Item ".\start.bat" ".\start.bat.bak"
```

删除原来的 `http.server` 启动行（类似）：

```bat
start "ChestX-AI Frontend" /b "%PYTHON_EXE%" -m http.server %CHESTX_FRONTEND_PORT% --bind 127.0.0.1 --directory "%RUN_ROOT%frontend"
```

把打开浏览器的地址：

```bat
start "" "http://127.0.0.1:%CHESTX_FRONTEND_PORT%/index.html?api=http://127.0.0.1:%CHESTX_API_PORT%"
```

改为：

```bat
if not exist "%RUN_ROOT%frontend\dist\index.html" (
  echo [ERROR] frontend\dist not found. Run: cd frontend ^&^& npm install ^&^& npm run build
  pause
  exit /b 1
)
start "" "http://127.0.0.1:%CHESTX_API_PORT%/"
```

保留后端启动行：

```bat
start "ChestX-AI Backend" /b "%PYTHON_EXE%" -m uvicorn backend.main:app --app-dir "%RUN_ROOT%" --host 127.0.0.1 --port %CHESTX_API_PORT%
```

建议在打开浏览器前加健康检查，避免页面先于后端加载：

```bat
:wait_backend
timeout /t 1 /nobreak >nul
curl -s "http://127.0.0.1:%CHESTX_API_PORT%/api/health" >nul 2>&1
if errorlevel 1 goto wait_backend
```

（Windows 10/11 自带 `curl.exe`。）

### 10.4 修改 `start.sh`

当前 `start.sh` 打开的是 `file://` 地址，必须改为：

```bash
if [ ! -f "$RUN_ROOT/frontend/dist/index.html" ]; then
  echo "frontend/dist not found. Run: cd frontend && npm install && npm run build"
  exit 1
fi
open "http://127.0.0.1:${CHESTX_API_PORT}/"  # macOS
# Linux 用 xdg-open
```

### 10.5 验证

```powershell
cd "C:\Users\Acer\Desktop\ChestX-AI-跨电脑演示包-优化版 (1)\ChestX-AI-演示运行包"
.\start.bat
```

应只启动一个 Python 进程（uvicorn），浏览器打开 8000 端口。

DevTools 检查：

- Network 中有 `assets/index-*.js`、`assets/index-*.css`。
- **没有** `cdn.tailwindcss.com`、`jsdelivr.net`。
- 直接访问 `http://127.0.0.1:8000/interpret` 刷新不 404。
- Console 无 `Failed to fetch`。

### ✅ Step 10 验收

- 断网后刷新页面，样式和布局仍正常。
- 关闭后端再打开，页面能恢复。
- `start.bat` 不会启动 8765 端口。

### ⚠️ 常见坑

- `app.mount("/", StaticFiles(...))` 会吞掉 `/api`，不要用；用显式 `/assets` + catch-all。
- `FileResponse` 返回 HTML 时，浏览器会正确识别；不要手动设置错误的 media type。
- Windows 批处理里 `&&` 需要转义为 `^&^&`，否则会被当成命令分隔符。

---

## Step 11 —— 后端真实性与契约（约 4 小时）

### 11.1 真流式：`qwen_client.stream_chat`

替换当前实现（`backend/qwen_client.py:176-182`）：

```python
async def stream_chat(self, prompt: str) -> AsyncIterator[str]:
    """Yield real incremental text chunks from Qwen compatible-mode streaming."""
    if not self.enabled():
        raise DashScopeError("not_configured")

    payload = {
        "model": self.model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1000,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    headers = {
        "Authorization": f"Bearer {self.api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(
        timeout=self.timeout_seconds, transport=self.transport
    ) as client:
        async with client.stream(
            "POST", self.chat_endpoint, headers=headers, json=payload
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                usage = chunk.get("usage")
                if usage:
                    self.last_usage = usage
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta", {}).get("content")
                if delta:
                    yield delta
```

要点：

- `stream: true` 必须放在 payload 里。
- `aiter_lines()` 按行读取，`data:` 可能跨 chunk，httpx 已处理。
- 失败时由上层回退到非流式，不要在这里吞异常。
- 如果 `response.raise_for_status()` 抛 401/429，上层应分类处理；可以复用 `post_json` 的错误分类逻辑。

### 11.2 `chat_service` 转发真实 delta

当前 `stream_answer_question` 是先 `await answer_question()` 再切片。改为：

```python
async def stream_answer_question(
    question: str,
    history: Any = None,
    diagnosis_context: dict | None = None,
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    clean_q = question.strip()
    if not clean_q or len(clean_q) > 500:
        raise ValueError("问题不能为空且不能超过500个字符")

    yield "step", {"name": "问题理解", "status": "completed"}

    # 本地意图（固定科普回答）可以保留分段呈现，因为它本来就不调用大模型
    local = _local_intent_answer(clean_q)
    if local:
        for i in range(0, len(local), 12):
            yield "token", {"delta": local[i : i + 12]}
            await asyncio.sleep(0.008)
        result = await answer_question(clean_q, history, diagnosis_context)
        yield "complete", result
        return

    predicted = [
        str(item.get("code"))
        for item in (diagnosis_context or {}).get("probabilities", [])[:3]
        if isinstance(item, dict) and item.get("code")
    ]
    documents = retrieve_knowledge(predicted, clean_q, top_k=4)
    yield "step", {
        "name": "知识检索",
        "status": "completed" if documents else "no_evidence",
        "count": len(documents),
    }

    client = DashScopeQwenClient()
    if not client.enabled():
        result = await answer_question(clean_q, history, diagnosis_context)
        for i in range(0, len(result.get("answer", "")), 12):
            yield "token", {"delta": result["answer"][i : i + 12]}
        yield "complete", result
        return

    prompt = build_chat_prompt(clean_q, history, documents, diagnosis_context)
    answer_parts: list[str] = []
    try:
        async for delta in client.stream_chat(prompt):
            answer_parts.append(delta)
            yield "token", {"delta": delta}
        answer = "".join(answer_parts)
        result = {
            "answer": answer,
            "provider": "qwen",
            "steps": [
                {"name": "问题理解", "status": "completed"},
                {"name": "知识检索", "status": "completed"},
                {"name": "Qwen 生成", "status": "completed"},
            ],
            "sources": documents,
            "suggested_actions": [],
        }
        yield "complete", result
    except Exception:
        # 真实流式失败时，回退到完整生成 + 分段呈现
        result = await answer_question(clean_q, history, diagnosis_context)
        text = result.get("answer", "")
        for i in range(0, len(text), 12):
            yield "token", {"delta": text[i : i + 12]}
        yield "complete", result
```

注意：

- `build_chat_prompt` 的现有签名要核对；如果参数顺序不同，按实际调整。
- `documents` 的结构要与 `sources` 一致；当前 `answer_question` 内部已经做了检索，这里为了真流式提前检索了一次，注意不要重复检索两次。更好的做法是把 `answer_question` 拆成“检索”和“生成”两段，复用结果。若时间紧，先接受一次重复检索（top_k=4，开销可接受）。

### 11.3 类别单一来源

新增 `backend/classes.json`：

```json
[
  { "code": "no_finding", "name": "No Finding", "name_zh": "无明显异常" },
  { "code": "atelectasis", "name": "Atelectasis", "name_zh": "肺不张" },
  { "code": "cardiomegaly", "name": "Cardiomegaly", "name_zh": "心影增大" },
  { "code": "effusion", "name": "Effusion", "name_zh": "胸腔积液" },
  { "code": "infiltration", "name": "Infiltration", "name_zh": "浸润影" },
  { "code": "mass", "name": "Mass", "name_zh": "肿块" },
  { "code": "nodule", "name": "Nodule", "name_zh": "结节" },
  { "code": "pneumonia", "name": "Pneumonia", "name_zh": "肺炎" },
  { "code": "pneumothorax", "name": "Pneumothorax", "name_zh": "气胸" },
  { "code": "consolidation", "name": "Consolidation", "name_zh": "实变" }
]
```

修改 `backend/config.py`：

```python
import json
from pathlib import Path

_CLASSES_PATH = Path(__file__).resolve().parent / "classes.json"
DISEASE_LIST = json.loads(_CLASSES_PATH.read_text(encoding="utf-8"))
```

增加 `/api/meta`：

```python
@app.get("/api/meta")
async def meta() -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={
            "code": 200,
            "message": "success",
            "data": {
                "classes": DISEASE_LIST,
                "model": os.getenv("QWEN_MODEL", "qwen3.8-flash"),
                "capabilities": {
                    "onnx": True,
                    "qwen": runtime_config_status()["configured"],
                    "rag": True,
                },
            },
        },
    )
```

前端不再硬编码疾病列表；`InterpretView` 可以按 `code` 从 `/api/meta` 映射中文名。

### 11.4 热力图单份返回 + 图像尺寸

修改 `backend/model_infer.py`：

```python
def diagnose_image(image: Image.Image) -> dict:
    ...
    overlay, heatmap = _heatmap_overlay(image, outputs[1])
    return {
        "top_prediction": sorted_items[0],
        "all_predictions": sorted_items,
        "probabilities": sorted_items,
        "heatmap": heatmap,
        "image_width": image.width,
        "image_height": image.height,
        "class_order": [item["code"] for item in DISEASE_LIST],
    }
```

删除 `"heatmap_overlay": heatmap`，避免响应体翻倍。

如果担心 base64 仍然太大，把 `_heatmap_overlay` 的输出限制到最长边 1024：

```python
def _heatmap_overlay(image: Image.Image, feature_map):
    ...
    # 现有代码生成 overlay 后
    max_side = 1024
    if max(overlay.size) > max_side:
        overlay.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    ...
```

并让返回的 `image_width/image_height` 与热力图实际尺寸一致（或者明确返回 `heatmap_width/heatmap_height`，前端按热力图自身比例铺满内容盒）。

### 11.5 修复样本映射

`backend/main.py` 当前：

```python
SAMPLE_IMAGES = {
    "case-high": FRONTEND_ASSETS / "sample_2.jpg",
    "case-medium": FRONTEND_ASSETS / "sample_2.jpg",
    "case-low": FRONTEND_ASSETS / "sample_3.jpg",
}
```

改为三张不同图片。先确认素材目录里有哪些图：

```powershell
Get-ChildItem ".\frontend\assets" -Filter "sample_*.jpg"
```

按实际文件分配，例如：

```python
SAMPLE_IMAGES = {
    "case-high": FRONTEND_ASSETS / "sample_1.jpg",
    "case-medium": FRONTEND_ASSETS / "sample_2.jpg",
    "case-low": FRONTEND_ASSETS / "sample_3.jpg",
}
```

如果只有两张图，就把前端样本按钮减为两个，**不要用同一张图冒充不同病例**。

### ✅ Step 11 验收

1. 聊天首字延迟明显小于完整响应时间（Network → EventStream 观察）。
2. 响应 JSON 只有一个 `heatmap` 字段，包含 `image_width/image_height/class_order`。
3. 三个样本按钮显示三张不同影像。
4. `/api/meta` 返回 10 类。
5. 前端概率列表的中文名与后端一致。

### ⚠️ 常见坑

- DashScope compatible-mode 的流式响应中，`choices[0].delta.content` 可能是 `null`，要判空。
- `stream_options` 不是所有模型都支持；如果报 400，去掉它，usage 只是统计用途。
- 真流式下，`complete` 事件的 `answer` 要由前端用 delta 拼接后的文本覆盖，避免最后一段丢失。
- 类别顺序必须与训练时的输出顺序一致，不能按字母排序。

---

## Step 12 —— 测试（约 3 小时）

### 12.1 后端集成测试

新建 `backend/tests/test_api.py`：

```python
import io

from fastapi.testclient import TestClient
from PIL import Image

from backend.main import app

client = TestClient(app)


def _sample_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), color=(20, 20, 20)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_health():
    assert client.get("/api/health").status_code == 200


def test_members_sync_roundtrip():
    payload = {
        "current_member_id": "member-test-01",
        "members": [
            {
                "id": "member-test-01",
                "profile": {"name": "张建国", "age": "62", "gender": "男", "conditions": "慢阻肺", "notes": ""},
                "records": [],
            }
        ],
    }
    response = client.post("/api/members/sync", json=payload)
    assert response.status_code == 200
    data = client.get("/api/members").json()["data"]
    assert any(m["id"] == "member-test-01" for m in data["members"])


def test_diagnose_stream_contract():
    response = client.post(
        "/api/agent/diagnose/stream",
        files={"file": ("test.jpg", _sample_bytes(), "image/jpeg")},
        data={"question": ""},
    )
    assert response.status_code == 200
    body = response.text
    assert "event: step" in body
    assert "event: complete" in body
    assert '"heatmap"' in body
    assert '"heatmap_overlay"' not in body  # Step 11 之后


def test_chat_stream_contract():
    response = client.post(
        "/api/agent/chat/stream",
        json={
            "question": "胸腔积液在胸片上有什么表现？",
            "history": [],
            "diagnosis_context": {"probabilities": [{"code": "effusion", "name": "Effusion", "prob": 72.5}]},
        },
    )
    assert response.status_code == 200
    assert "event: step" in response.text
    assert "event: complete" in response.text


def test_rejects_non_image():
    response = client.post(
        "/api/agent/diagnose/stream",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
```

运行：

```powershell
python -m pytest backend/tests -q
```

### 12.2 前端单元测试

`frontend/vitest.config.js`：

```js
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js']
  }
});
```

`frontend/src/composables/viewer.spec.js`：

```js
import { describe, expect, it } from 'vitest';
import { clampPan, fitBox, zoomAt } from './useXrayViewer.js';

describe('viewer math', () => {
  it('fits a wide image into a square viewport', () => {
    const box = fitBox(800, 800, 1600, 800);
    expect(box.w).toBe(800);
    expect(box.h).toBe(400);
    expect(box.y).toBe(200);
  });

  it('keeps the anchor point fixed while zooming', () => {
    const state = { scale: 1, tx: 0, ty: 0 };
    zoomAt(state, 400, 300, 2, 0.5, 5);
    expect(state.scale).toBe(2);
    expect(state.tx).toBe(-400);
    expect(state.ty).toBe(-300);
  });

  it('clamps pan to content bounds', () => {
    const state = { scale: 2, tx: 9999, ty: -9999 };
    clampPan(state, 800, 600, 800, 600);
    expect(state.tx).toBe(400);
    expect(state.ty).toBe(-300);
  });
});
```

运行：

```powershell
cd frontend
npm run test:unit
```

### 12.3 手工验收脚本（比赛前必做）

按顺序操作，记录每一步结果：

| # | 操作 | 期望 |
|---|---|---|
| 1 | 打开 `/` | 首页正常，无控制台错误 |
| 2 | 进入 `/interpret` | 默认样本显示 |
| 3 | 点击开始分析 | SSE 步骤逐个出现，最终有概率/报告/热力图 |
| 4 | 调节热力图透明度 | 热力图变化，底图不变 |
| 5 | 打开卷帘拖动 | 热力图左右分界变化 |
| 6 | 滚轮缩放 | 鼠标下的结构不动 |
| 7 | 放大后拖动 | 不能拖出视口 |
| 8 | 点击反色 | 底图反色，热力图保持 |
| 9 | 重置 | 所有变换恢复 |
| 10 | 上传本地 JPG | 替换当前影像，可分析 |
| 11 | 上传 PNG | 可分析 |
| 12 | 上传 11MB 文件 | 前端或后端拒绝 |
| 13 | 上传 .txt | 拒绝 |
| 14 | 打开 Copilot | 面板出现 |
| 15 | 发送问题 | 流式文字 + 步骤 + 来源 |
| 16 | 点击定位热区 | 滚动到看片台，热力图 75% |
| 17 | 点击记入备注 | 成员 notes 更新 |
| 18 | 保存档案 | `/records` 出现记录 |
| 19 | 刷新页面 | 记录仍在 |
| 20 | 重启后端 | 记录仍在 |
| 21 | 断网 | 页面可用，聊天/报告降级 |
| 22 | 直接刷新 `/records` | 不 404 |
| 23 | 手机宽度 | 布局不横向溢出 |
| 24 | 键盘 Tab | 主要按钮可聚焦 |
| 25 | `Alt+K` | 打开/关闭 Copilot |

### ✅ Step 12 验收

- `pytest` 全绿。
- `npm run test:unit` 全绿。
- 手工脚本 25 项全部通过。

---

## Step 13 —— 打包与参赛材料（约 2 天）

### 13.1 修改 `pack_demo.py`

当前脚本没有排除 `.env`，必须补上：

```python
EXCLUDE_DIRS = {
    ".venv", "venv", "__pycache__", ".git", "node_modules",
    "data", ".pytest_cache", ".playwright",
}
EXCLUDE_EXTS = {".pyc", ".pyo", ".log", ".pid", ".db", ".sqlite3"}
EXCLUDE_NAMES = {".env", ".env.local"}

# 在遍历文件时
if file in EXCLUDE_NAMES:
    continue
if fp.name.startswith("frontend.backup-"):
    continue
```

打包后校验：

```powershell
python pack_demo.py
```

再运行一次内容检查：

```powershell
python -c "import zipfile; z=zipfile.ZipFile('ChestX-AI-跨电脑演示包-优化版.zip'); names=z.namelist(); print(len(names)); assert not any(n.endswith('.env') or n.endswith('.db') for n in names), 'sensitives found'; print('OK')"
```

### 13.2 README

必须包含：

- 项目简介 + 3 张截图（首页、解读、聊天）。
- 功能清单。
- 架构图（可直接用 Mermaid）。
- 快速开始（Windows/macOS）。
- 环境变量（新 Key 如何配置）。
- 模型说明与限制。
- 测试命令。
- 目录结构。
- 常见问题。
- 免责声明。

### 13.3 技术文档

按 `OPTIMIZATION_PLAN.md` 第 9.3 节的大纲写，控制在 30 页以内。重点写：

- 为什么用 Vue 3 + Pinia。
- 为什么用 ONNX 而不是 PyTorch。
- LangGraph 节点如何流转。
- RAG 的 BM25 + 向量 + rerank 融合。
- 热力图如何从 7×7 特征图上采样。
- 安全护栏与降级策略。
- 性能数据（拖拽 FPS、解码次数、首字延迟）。

### 13.4 视频

按 `OPTIMIZATION_PLAN.md` 第 9.4 节的脚本录制：

- 5~8 分钟。
- ≥1080p。
- 普通话 + 字幕。
- 必须展示：真实上传、真实 SSE、热力图、卷帘、缩放、聊天、持久化、断网降级。

### 13.5 Git 历史

每个 Step 至少一次提交：

```text
chore: baseline
security: rotate key and add env template
build: add tailwind and vite entry
feat(router): add vue router and app shell
feat(api): add sse client and diagnose store
feat(viewer): add cached heatmap layer and viewer math
feat(interpret): wire real diagnosis flow
feat(chat): stream qwen answers with member context
feat(records): persist family records
feat(settings): add qwen configuration dialog
build: serve dist from fastapi single port
fix(backend): true streaming and single heatmap payload
test: add api and viewer tests
docs: add readme model card and technical report
```

### ✅ Step 13 验收

- ZIP < 200 MB（目标 < 50 MB）。
- ZIP 内无 `.env`、`.db`、`.venv`、`node_modules`。
- README 按步骤能在另一台电脑跑通。
- 视频链接可访问。
- Git 历史为增量提交。

---

## Step 14 —— 最终验收（比赛前 1 天）

### 14.1 断网演练

1. 关闭 Wi-Fi。
2. 双击 `start.bat`。
3. 打开 `http://127.0.0.1:8000/`。
4. 检查：样式正常、样本可加载、分析走本地兜底、聊天走本地知识库。
5. 恢复网络。

### 14.2 换机演练

找一台没装过 Node/Python 的电脑（或新建 Windows 用户）：

1. 解压 ZIP。
2. 安装 Python 3.10+（如果未安装）。
3. 双击 `start.bat`。
4. 按 README 配置 Key（或使用演示模式）。
5. 完成 25 项手工验收。

### 14.3 提交前检查

```powershell
# 1. 工作区干净
git status

# 2. 构建可复现
cd frontend
npm ci
npm run build

# 3. 测试
cd ..
python -m pytest backend/tests -q
cd frontend
npm run test:unit

# 4. 打包
cd ..
python pack_demo.py

# 5. 敏感文件扫描
gitleaks detect --source . --no-git
```

### 14.4 最终清单

- [ ] Vue 应用真实运行（Network 有 `assets/index-*.js`）。
- [ ] 首次点击分析不再出现假结果。
- [ ] 三个样本对应三张不同图片。
- [ ] 卷帘对真实热力图有效。
- [ ] 非正方形图片热力图对齐。
- [ ] 2× 屏热力图清晰。
- [ ] 拖拽期间每病例只解码一次热力图。
- [ ] 缩放以鼠标/双指中点为锚点。
- [ ] 平移有边界。
- [ ] 手机可拖动、可捏合。
- [ ] 聊天为真实流式。
- [ ] 类别只有一份来源。
- [ ] 诊断响应只含一份热力图。
- [ ] 仓库/ZIP 中无 `.env`、无真实 Key。
- [ ] 已轮换泄露 Key。
- [ ] CORS 非 `*`。
- [ ] README 完整。
- [ ] 技术文档 PDF ≤30 页。
- [ ] 视频 5~8 分钟、≥1080p、普通话。
- [ ] Git 历史为增量提交。
- [ ] ZIP ≤200 MB。
- [ ] 已完成报名。
- [ ] 三次彩排通过。

---

## 附录 A：Step 与 Spec Task 对应关系

| 本手册 | Spec Task | 说明 |
|---|---|---|
| Step 1 | Task 1 前置 | 安全与密钥 |
| Step 4 / Step 8 | Task 1、Task 3 | SQLite 持久化、members/conversations 接口 |
| Step 7 / Step 11 | Task 2、Task 5 | 聊天流式、成员画像、Copilot |
| Step 3~9 | Task 4 | Vue 3 工程化与组件接线 |
| Step 10 | Task 4 部署 | 单端口、免 Node 运行 |
| Step 13 | Task 6 | 打包 |
| Step 5 / Step 6 / Step 11 | 本手册新增 | Canvas 性能、查看器正确性、演示真实性 |

---

## 附录 B：一次性命令清单

```powershell
# 进入项目
cd "C:\Users\Acer\Desktop\ChestX-AI-跨电脑演示包-优化版 (1)\ChestX-AI-演示运行包"

# 安装与构建
cd frontend
npm install
npm run build
cd ..

# 启动后端（开发）
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 启动前端（开发）
cd frontend
npm run dev

# 测试
cd ..
python -m pytest backend/tests -q
cd frontend
npm run test:unit

# 打包
cd ..
python pack_demo.py
```

---

## 附录 C：如果只有 3 天

按以下最小路径执行：

1. **Day 1**：Step 0、Step 1、Step 2、Step 3、Step 4。
2. **Day 2**：Step 5、Step 6、Step 10（先让 Vue 真的跑起来）。
3. **Day 3**：Step 7 的核心发送/流式、Step 13 的 README/视频/打包。

可以推迟：Step 8 的完整档案 UI、Step 9 的设置 UI、Step 12 的单元测试、Step 11 的类别重构。

**不能推迟**：Vue 真运行、假分析路径删除、密钥轮换、单端口启动、README、视频。

---

> 执行时如果与代码现状不一致，以代码为准，但不要跳过“本步验收”。任何一步验收失败，先修复再继续。
