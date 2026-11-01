<script setup>
import ChartCanvas from './ChartCanvas.vue';
import { aboutChartOption } from '../composables/useDashboard.js';

const layers = [
  { no: '01', name: '视图与交互层', en: 'Views & Components', desc: '六条路由入口与页面级组件，只负责布局与展示，不发起请求。' },
  { no: '02', name: '组合式逻辑层', en: 'Composables', desc: '业务编排、请求生命周期与页面状态；卸载时统一 dispose。' },
  { no: '03', name: '状态层', en: 'Pinia Store', desc: '共享状态与成员档案，单一 store，不发起网络请求。' },
  { no: '04', name: '传输层', en: 'API', desc: 'SSE 与 JSON 双通道，统一错误映射与取消，注入 X-Request-Id。' },
  { no: '05', name: '工具与资源层', en: 'Utils', desc: '格式化、测量几何、DICOM 解码与设计令牌，纯函数优先。' }
];

const stack = [
  'Vue 3.5', 'Vite 5', 'Vue Router 4', 'Pinia 2', 'Tailwind 3.4',
  'ECharts 5.5', 'ONNX Runtime', 'Canvas 2D', 'Axios + SSE', 'vue-i18n 9'
];

const privacy = [
  { title: '上传与解码', desc: 'JPG/PNG 在浏览器端压缩，DICOM 在浏览器端解码。服务端仅在内存中解码用于推理，不保存原始影像。' },
  { title: '本地存储', desc: '档案保存在 localStorage 与本机 SQLite，未加密。请勿录入真实患者身份信息。' },
  { title: '网络边界', desc: '默认仅监听 127.0.0.1:8000，不对外网开放；请求带 X-Request-Id 便于排查。' }
];

const metrics = [
  { label: '工程定位', value: '本地推理 · 可解释' },
  { label: '核心框架', value: 'Vue 3.5 / Vite 5' },
  { label: '样式方案', value: 'Tailwind 3.4' },
  { label: '部署方式', value: '单端口同源托管', accent: true },
  { label: '模型输出', value: '10 类多标签' },
  { label: '推理时延', value: '约 0.5 秒 / 张' }
];

/* 深色版图表：深拷贝共享配置，仅覆盖深色面可读的颜色，保证数据/结构完全一致 */
const darkChartOption = structuredClone(aboutChartOption);
darkChartOption.xAxis.axisLabel.color = '#98A6BC';
darkChartOption.xAxis.axisLine = { lineStyle: { color: '#28354A' } };
darkChartOption.yAxis.axisLabel.color = '#98A6BC';
darkChartOption.yAxis.splitLine.lineStyle.color = '#28354A';
darkChartOption.series[0].itemStyle.color = '#27C8E2';
darkChartOption.series[0].label.color = '#E8EFF8';
</script>

<template>
  <section id="page-about" class="page-view active space-y-6">

    <!-- ══ Hero：深色渐变 + 网格 + 光晕 ═════════════════════════ -->
    <div class="about-hero">
      <div class="about-hero-grid"></div>
      <div class="about-hero-body">
        <span class="about-hero-badge">
          <span class="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
          ABOUT · 关于我们
        </span>
        <h1 class="about-hero-title">{{ $t('关于胸影智识') }}</h1>
        <p class="about-hero-sub">ChestX-AI · {{ $t('胸部 X 光 AI 影像解读与家庭健康档案系统') }}</p>
        <p class="about-hero-text">
          {{ $t('把多标签卷积网络与模型注意力热力图结合，围绕“看得懂”重构整条链路：概率给出倾向，热力图指出位置，科普解释含义，档案记录变化。') }}
        </p>
        <div class="about-hero-tags">
          <span>{{ $t('10 类征象评估') }}</span>
          <span>{{ $t('本机推理 · 影像不外传') }}</span>
          <span>{{ $t('可解释热力图') }}</span>
        </div>
      </div>
    </div>

    <!-- ══ 免责声明：柔和琥珀 + 左侧强调条 ═════════════════════ -->
    <div class="about-notice">
      <span class="about-notice-icon">!</span>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-semibold text-warning-strong">{{ $t('重要医疗免责声明') }}</h2>
          <span class="rounded-full border border-warning-line bg-card-bg px-2 py-0.5 text-3xs font-semibold text-warning-strong">{{ $t('必读') }}</span>
        </div>
        <p class="mt-2 max-w-prose text-xs leading-7 text-text-2">
          {{ $t('本系统提供的影像概率分析、模型注意力热力图与全部科普内容，仅供健康科普参考与医学影像教学演示，不具备临床诊断效力，亦不能替代执业医师问诊与放射科正式报告。') }}
        </p>
        <p class="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger-strong">
          <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 4.3 2.8 17a1.8 1.8 0 0 0 1.5 2.7h15.4a1.8 1.8 0 0 0 1.5-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z" />
          </svg>
          {{ $t('若出现发热、胸痛、持续咳嗽或呼吸困难，请立即前往正规医疗机构就诊。') }}
        </p>
      </div>
    </div>

    <!-- ══ 深色波段：项目叙事 + 工程指标 ═══════════════════════ -->
    <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
      <div class="dark-panel p-6 lg:col-span-7">
        <span class="dark-eyebrow">{{ $t('项目背景') }}</span>
        <h2 class="dark-title">{{ $t('为什么需要 ChestX-AI') }}</h2>
        <div class="mt-3.5 space-y-3.5">
          <p class="dark-body">
            {{ $t('胸部X光正位片是体检与呼吸系统初筛中最广泛、最经济的检查手段。但胸片对比度有限、解剖结构重叠，受检者面对报告里的术语往往无从判断，而传统 AI 辅助输出又常因缺乏解释而难以信任。') }}
          </p>
          <p class="dark-body">
            {{ $t('我们希望每一次 AI 给出的关注，都能同时回答“是什么、在哪里、我该怎么办”，让技术结论真正可被理解、可被追溯。') }}
          </p>
        </div>
      </div>

      <div class="lg:col-span-5">
        <div class="grid h-full grid-cols-2 gap-3">
          <div
            v-for="m in metrics"
            :key="m.label"
            class="metric-card"
            :class="m.accent ? 'metric-card--accent' : ''"
          >
            <span class="metric-label">{{ $t(m.label) }}</span>
            <span class="metric-value">{{ $t(m.value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 浅色呼吸区：五层架构（青蓝 tint 底，非纯白） ═════════ -->
    <div class="light-band">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-xl font-semibold tracking-tight text-text-1">{{ $t('前端五层架构') }}</h2>
          <p class="mt-1 text-sm text-text-2">{{ $t('依赖方向自上而下单向：下层不感知上层，跨层调用一律经由组合式函数。') }}</p>
        </div>
        <span class="text-3xs font-semibold uppercase tracking-[0.14em] text-text-3">5 LAYERS</span>
      </div>

      <ol class="layer-grid">
        <li v-for="layer in layers" :key="layer.no" class="layer-card">
          <span class="layer-no tnum">{{ layer.no }}</span>
          <h3 class="layer-name">{{ $t(layer.name) }}</h3>
          <span class="layer-en">{{ layer.en }}</span>
          <p class="layer-desc">{{ $t(layer.desc) }}</p>
        </li>
      </ol>
    </div>

    <!-- ══ 深色波段：模型输出 + 隐私 + 技术栈 ═══════════════════ -->
    <div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      <div class="dark-panel p-6 lg:col-span-7">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="dark-title text-lg">{{ $t('样例胸片的 10 类模型输出') }}</h2>
            <p class="mt-1 text-xs text-film-dim">{{ $t('本包模型对样例的实际输出，CPU 推理，仅演示，非临床评测') }}</p>
          </div>
          <span class="rounded-full border border-brand-400/40 bg-brand-400/10 px-2.5 py-0.5 text-2xs font-semibold text-brand-300 tnum">{{ $t('最高 80.3%') }}</span>
        </div>
        <ChartCanvas id="aboutModelEchart" class="relative mt-4 h-72 w-full" :option="darkChartOption" />
      </div>

      <div class="space-y-5 lg:col-span-5">
        <div class="dark-panel p-6">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-film-text">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-400/15 text-brand-300">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 3v5c0 4.4-2.9 8.3-7 9.9-4.1-1.6-7-5.5-7-9.9V6l7-3Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4" />
              </svg>
            </span>
            {{ $t('隐私与数据安全') }}
          </h2>
          <dl class="mt-4 space-y-4">
            <div v-for="item in privacy" :key="item.title" class="privacy-card">
              <dt class="text-2xs font-semibold text-film-text">{{ $t(item.title) }}</dt>
              <dd class="mt-1 text-3xs leading-relaxed text-film-dim">{{ $t(item.desc) }}</dd>
            </div>
          </dl>
        </div>

        <div class="dark-panel p-6">
          <h2 class="text-sm font-semibold text-film-text">{{ $t('技术栈') }}</h2>
          <p class="mt-1 text-3xs text-film-dim">{{ $t('扇形展开 · 悬停抽取高亮') }}</p>
          <div class="stack-fan">
            <span
              v-for="(item, i) in stack"
              :key="item"
              class="stack-fan-item tnum"
              :style="{
                '--angle': (i * (150 / (stack.length - 1)) - 75).toFixed(1) + 'deg',
                '--radius': (i % 2 === 0 ? 185 : 150) + 'px'
              }"
            >{{ item }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Hero ─────────────────────────────────────────────────── */
.about-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(620px 320px at 12% -10%, rgba(39, 200, 226, 0.20), transparent 60%),
    radial-gradient(520px 300px at 92% 10%, rgba(11, 162, 188, 0.16), transparent 62%),
    linear-gradient(135deg, var(--film-850) 0%, var(--film-panel) 55%, var(--film-850) 100%);
  box-shadow: var(--shadow-3);
}
.about-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%);
}
.about-hero-body { position: relative; padding: 44px 40px 40px; }
.about-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(103, 224, 242, 0.3);
  background: rgba(103, 224, 242, 0.08);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--brand-300);
}
.about-hero-title {
  margin-top: 18px;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--film-text);
}
.about-hero-sub {
  margin-top: 8px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--brand-300);
}
.about-hero-text {
  margin-top: 16px;
  max-width: 60ch;
  font-size: var(--text-xs);
  line-height: 1.8;
  color: var(--film-dim);
}
.about-hero-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.about-hero-tags span {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--film-line);
  background: rgba(255, 255, 255, 0.04);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--film-text);
}

/* ── 免责声明 ────────────────────────────────────────────── */
.about-notice {
  display: flex;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--risk-mid-line);
  border-left: 4px solid var(--risk-mid);
  background: var(--risk-mid-soft);
  transition: box-shadow var(--dur-2) var(--ease-out),
              transform var(--dur-2) var(--ease-out);
}
.about-notice:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
}
.about-notice-icon {
  display: flex;
  flex: none;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--risk-mid);
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
}

/* ── 深色面板与文字基元 ───────────────────────────────────── */
.dark-panel {
  height: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(480px 260px at 100% 0%, rgba(39, 200, 226, 0.10), transparent 60%),
    linear-gradient(160deg, var(--film-panel) 0%, var(--film-850) 100%);
  box-shadow: var(--shadow-2);
}
.dark-eyebrow {
  font-size: var(--text-3xs);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand-300);
}
.dark-title {
  margin-top: 6px;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--film-text);
}
.dark-body {
  max-width: 60ch;
  font-size: var(--text-xs);
  line-height: 1.85;
  color: var(--film-dim);
}

/* ── 工程指标（深色玻璃卡片） ─────────────────────────────── */
.metric-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 15px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--film-line);
  background: linear-gradient(160deg, var(--film-raise) 0%, var(--film-panel) 100%);
  transition: transform var(--dur-2) var(--ease-out),
              border-color var(--dur-2) var(--ease-out),
              background var(--dur-2) var(--ease-out);
}
.metric-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-400);
  background: linear-gradient(160deg, var(--film-raise) 0%, var(--film-850) 100%);
}
.metric-card--accent {
  border-color: color-mix(in srgb, var(--brand-400) 55%, var(--film-line));
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--brand-500) 26%, transparent), transparent 62%),
    linear-gradient(160deg, var(--film-raise) 0%, var(--film-panel) 100%);
}
.metric-card--accent .metric-label { color: color-mix(in srgb, var(--film-text) 78%, transparent); }
.metric-label { font-size: var(--text-2xs); color: var(--film-dim); }
.metric-value { font-size: var(--text-xs); font-weight: 600; color: var(--film-text); }
.metric-card--accent .metric-value { color: var(--brand-300); }

/* ── 浅色呼吸区：五层架构 ─────────────────────────────────── */
.light-band {
  padding: 28px 28px 30px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--brand-200);
  background:
    radial-gradient(600px 260px at 100% 0%, rgba(103, 224, 242, 0.18), transparent 60%),
    linear-gradient(180deg, var(--brand-50) 0%, var(--ink-50) 100%);
}
.layer-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 22px;
}
.layer-card {
  padding: 18px 16px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-1);
  transition: transform var(--dur-2) var(--ease-out),
              border-color var(--dur-2) var(--ease-out),
              box-shadow var(--dur-2) var(--ease-out);
}
.layer-card:hover {
  transform: translateY(-3px);
  border-color: var(--brand-400);
  box-shadow: 0 14px 30px rgba(8, 122, 146, 0.18);
}
.layer-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--brand-500), var(--brand-600));
  font-size: var(--text-2xs);
  font-weight: 700;
  color: #fff;
}
.layer-name { margin-top: 12px; font-size: var(--text-xs); font-weight: 600; color: var(--color-text-1); }
.layer-en {
  display: block;
  margin-top: 2px;
  font-size: var(--text-3xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.layer-desc { margin-top: 8px; font-size: var(--text-3xs); line-height: 1.7; color: var(--color-text-2); }

/* ── 隐私 / 技术栈（深色） ───────────────────────────────── */
.privacy-card {
  padding: 4px 0 4px 12px;
  border-left: 2px solid var(--brand-400);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  transition: background var(--dur-2) var(--ease-out),
              padding-left var(--dur-2) var(--ease-out);
}
.privacy-card:hover {
  padding-left: 16px;
  background: rgba(39, 200, 226, 0.08);
}
/* ── 技术栈：扇形排列 + 悬停抽取 ─────────────────────────── */
.stack-fan {
  position: relative;
  height: 240px;
  margin-top: 10px;
}
/* 底部中心的扇形基点 */
.stack-fan::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--brand-400);
  box-shadow: 0 0 14px rgba(39, 200, 226, 0.7);
  transform: translateX(-50%);
}
.stack-fan-item {
  position: absolute;
  left: 50%;
  bottom: 0;
  padding: 6px 11px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--film-line);
  background: linear-gradient(160deg, var(--film-raise), var(--film-panel));
  font-size: 19px;
  font-weight: 500;
  color: var(--film-dim);
  white-space: nowrap;
  cursor: default;
  transform:
    translateX(-50%)
    rotate(var(--angle))
    translateY(calc(-1 * var(--radius)))
    rotate(calc(-1 * var(--angle)));
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    color 200ms var(--ease-out),
    border-color 200ms var(--ease-out),
    box-shadow 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
/* 悬停：沿径向向外“抽取” + 放大 + 青蓝发光 */
.stack-fan-item:hover {
  z-index: 6;
  color: #fff;
  border-color: var(--brand-400);
  box-shadow: 0 12px 28px rgba(39, 200, 226, 0.38);
  transform:
    translateX(-50%)
    rotate(var(--angle))
    translateY(calc(-1 * var(--radius) - 26px))
    rotate(calc(-1 * var(--angle)))
    scale(1.12);
}
/* 悬停扇形时，未选中的项压暗，突出被抽取项 */
.stack-fan:hover .stack-fan-item:not(:hover) { opacity: 0.5; }

@media (max-width: 992px) {
  .layer-grid { grid-template-columns: repeat(2, 1fr); }
  .about-hero-body, .light-band { padding-left: 24px; padding-right: 24px; }
}
@media (max-width: 576px) {
  .layer-grid { grid-template-columns: 1fr; }
}
</style>
