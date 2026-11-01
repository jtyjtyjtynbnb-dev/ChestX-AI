<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useShell } from '../composables/useShell.js';
import { categoryColor } from '../utils/category.js';
import UiRiskPill from './ui/UiRiskPill.vue';

const { actions, state, member, recordCount } = useShell();

/* 与解读工作台一致：sample_02 的真实模型输出（浸润影 80.3 等） */
const caseProbs = [
  { code: 'infiltration', name: '浸润影', prob: 80.3 },
  { code: 'nodule', name: '肺结节', prob: 79.6 },
  { code: 'mass', name: '肿块', prob: 63.9 },
  { code: 'pneumothorax', name: '气胸', prob: 48.4 },
  { code: 'consolidation', name: '肺实变', prob: 39.5 },
  { code: 'no_finding', name: '未见异常', prob: 38.9 }
];

const demoProbs = caseProbs.slice(0, 4);
const capabilityBars = caseProbs.slice(0, 4);

const memberName = computed(() => member.value?.profile?.name || '当前成员');
const timelineRecords = computed(() => (state.records || []).slice(0, 2));

const steps = [
  {
    no: '01',
    title: '上传胸部X光影像',
    meta: '格式与大小自动校验',
    desc: '拖拽或点击上传 PA / AP 正位片，或直接选用内置临床样例；格式、尺寸与隐私边界自动校验。',
    points: ['JPG / PNG / 未压缩 DICOM', '单张 ≤ 10MB'],
    cta: '去上传一张胸片',
    jump: 'interpret'
  },
  {
    no: '02',
    title: 'AI 智能特征分析',
    meta: '本机 ONNX · 约 0.5 秒',
    desc: 'DenseNet-121 在本机完成肺野定位、10 类征象概率与 7×7 注意力热力图，原始影像不出本机。',
    points: ['10 类 sigmoid 概率', '7×7 注意力热力层'],
    cta: '查看推理细节',
    jump: 'interpret'
  },
  {
    no: '03',
    title: '获取科普解读与归档',
    meta: '报告 · 随访 · 导出',
    desc: '查看风险分级、概率排序与循证摘要，一键存入成员档案或导出报告。',
    points: ['患者版 / 医生版摘要', '时间轴归档与随访'],
    cta: '打开健康档案',
    jump: 'records'
  }
];

const scenarios = [
  {
    no: '01',
    tab: '体检报告解读',
    meta: '个人与家庭',
    headline: '拿到体检报告，不再只看结论',
    desc: '把「双肺纹理增粗」「右下肺斑片影」这类术语，变成看得见位置的热力图与通俗解释。',
    points: ['专业术语转成可读解释', '热力图指出关注位置'],
    stat: '10 类',
    statLabel: '常见征象一次评估',
    cta: '用样例体验',
    jump: 'interpret'
  },
  {
    no: '02',
    tab: '个人健康管理',
    meta: '长期随访',
    headline: '把每一次胸片，连成一条时间线',
    desc: '按成员归档历次影像、概率与结论，支持时间 / 风险筛选、随访对比与报告导出。',
    points: ['按家庭成员分开归档', '随访变化一眼可见'],
    stat: '时间轴',
    statLabel: '历次解读可回溯',
    cta: '打开健康档案',
    jump: 'records'
  },
  {
    no: '03',
    tab: '健康知识学习',
    meta: '医学生与科普',
    headline: '在真实胸片上，练习读片顺序',
    desc: '影像课堂提供解剖热区、典型征象与九步读片法，配合即时反馈自测建立固定阅片顺序。',
    points: ['8 个解剖热区', '14 类征象 + 自测'],
    stat: '14 类',
    statLabel: '科普词条 + 读片自测',
    cta: '进入影像小课堂',
    jump: 'academy'
  }
];

const principles = [
  { title: '概率不是诊断', desc: '输出只表示模型倾向，需由医生结合症状、病史与正式报告判断。' },
  { title: '热力图不是病灶', desc: '注意力图说明模型看了哪里，不等于病灶定位，也不能排除疾病。' },
  { title: '影像不出本机', desc: '默认本地推理；开启 Qwen 时也只发送结构化文本，不发原始影像。' }
];

const faqs = [
  {
    q: '分析结果能当作诊断吗？',
    a: '不能。系统输出的是模型对 10 类征象的概率估计、注意力热力图与科普解释，仅供健康科普和教学演示，不具备临床诊断效力。'
  },
  {
    q: '胸片会上传到云端吗？',
    a: '不会。推理在运行本系统的这台电脑上完成，原始影像不写入服务器磁盘；启用 Qwen 时也只发送结构化概率、问题和知识片段。'
  },
  {
    q: '没有医学背景，看得懂吗？',
    a: '可以。结果页按高 / 中 / 低排序，配上热力图与逐条科普；影像课堂还提供解剖热区与九步读片法。'
  },
  {
    q: '支持哪些影像格式？',
    a: '支持 PA / AP 胸片的 JPG、PNG 与未压缩 DICOM；单张不超过 10MB（DICOM 40MB），多选可建立序列。'
  },
  {
    q: '健康档案存在哪里？',
    a: '档案保存在浏览器 localStorage 与本机 SQLite 中，当前未加密；请勿录入真实患者身份信息或敏感影像。'
  }
];

/* ── Hero 对比滑杆：原图 ⇄ 热力图 ─────────────────────────── */
const split = ref(58);
const compareEl = ref(null);
const dragging = ref(false);

function setSplitFromClientX(clientX) {
  const el = compareEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pct = ((clientX - rect.left) / rect.width) * 100;
  split.value = Math.min(92, Math.max(8, pct));
}

function onComparePointerDown(event) {
  dragging.value = true;
  compareEl.value?.setPointerCapture?.(event.pointerId);
  setSplitFromClientX(event.clientX);
}

function onComparePointerMove(event) {
  if (!dragging.value) return;
  setSplitFromClientX(event.clientX);
}

function endDrag() {
  dragging.value = false;
}

function onCompareKey(event) {
  const step = event.shiftKey ? 10 : 4;
  if (event.key === 'ArrowLeft') split.value = Math.max(8, split.value - step);
  else if (event.key === 'ArrowRight') split.value = Math.min(92, split.value + step);
  else if (event.key === 'Home') split.value = 8;
  else if (event.key === 'End') split.value = 92;
  else return;
  event.preventDefault();
}

/* ── 小交互 ───────────────────────────────────────────────── */
const miniHeat = ref(true);
const activeStep = ref(0);
const activeScenario = ref(0);
const openFaq = ref(0);

/* ── 入场 ─────────────────────────────────────────────────── */
const rootEl = ref(null);
const revealReady = ref(false);
const show = ref({ findings: 0, latency: 0, local: 0, records: 0 });
let revealObserver = null;
let countRaf = 0;

const counterTargets = computed(() => ({
  findings: 10,
  latency: 0.5,
  local: 100,
  records: recordCount.value
}));

function runCounters() {
  const target = counterTargets.value;
  const start = performance.now();
  const duration = 1000;
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    show.value = {
      findings: Math.round(target.findings * eased),
      latency: Math.round(target.latency * eased * 10) / 10,
      local: Math.round(target.local * eased),
      records: Math.round(target.records * eased)
    };
    if (progress < 1) countRaf = requestAnimationFrame(tick);
  };
  countRaf = requestAnimationFrame(tick);
}

function revealAll() {
  rootEl.value?.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-inview'));
}

function onSpotlight(event) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
  el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
}

function openAiFeature(kind) {
  if (kind === 'search') {
    window.dispatchEvent(new CustomEvent('chestx-command-open'));
    return;
  }
  if (kind === 'records') {
    actions.switchPage('records');
    return;
  }
  if (kind === 'about') {
    actions.switchPage('about');
    return;
  }
  actions.switchPage('interpret');
}

onMounted(() => {
  revealReady.value = true;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof IntersectionObserver !== 'function') {
    show.value = { ...counterTargets.value };
    revealAll();
    return;
  }
  runCounters();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-inview');
      revealObserver?.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
  rootEl.value?.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
});

onBeforeUnmount(() => {
  revealObserver?.disconnect();
  cancelAnimationFrame(countRaf);
});
</script>

<template>
  <section
    id="page-home"
    ref="rootEl"
    class="page-view active home-page"
    :class="{ 'is-reveal-ready': revealReady }"
  >

    <!-- ══ Hero ═══════════════════════════════════════════════ -->
    <header class="home-hero">
      <div class="home-hero-grid" aria-hidden="true"></div>
      <div class="home-hero-glow" aria-hidden="true"></div>

      <div class="relative z-[1] px-5 pt-6 sm:px-8 sm:pt-7 lg:px-9 lg:pt-8">
        <div class="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">

          <div class="lg:col-span-5">
            <span class="hero-badge">
              <span class="hero-badge-dot"></span>
              {{ $t('本地 ONNX · 可解释热力图 · 家庭档案') }}
            </span>

            <h1 class="hero-title mt-4">
              {{ $t('每一个「可能」，') }}<br />
              <span class="hero-accent">{{ $t('都值得被看清。') }}</span>
            </h1>

            <p class="hero-lead mt-4 max-w-[44ch]">
              {{ $t('上传一张正位胸片，10 类常见征象的概率、模型注意力热力图与循证科普一次给出。所有推理在本机完成，原始影像不上传云端。') }}
            </p>

            <div class="mt-5 flex flex-wrap items-center gap-2.5">
              <button id="heroStartBtn" type="button" class="btn-primary" @click="actions.switchPage('interpret')">
                {{ $t('立即开始解读') }}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>
              <button id="heroDemoCaseBtn" type="button" class="btn-secondary" @click="actions.openSample('case-high')">
                {{ $t('体验典型样例') }}
              </button>
              <button id="heroAcademyBtn" type="button" class="btn-ghost hero-ghost" @click="actions.switchPage('academy')">
                {{ $t('进入影像小课堂') }}
              </button>
            </div>

            <div class="hero-facts mt-5">
              <span><i></i>ONNX Runtime</span>
              <span><i></i>{{ $t('10 类多标签') }}</span>
              <span><i></i>{{ $t('约 0.5 秒 / 张') }}</span>
            </div>
          </div>

          <div class="lg:col-span-7">
            <div class="hero-workbench">
              <div class="hero-workbench-bar">
                <div class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-film-line"></span>
                  <span class="h-2 w-2 rounded-full bg-film-line"></span>
                  <span class="h-2 w-2 rounded-full bg-brand-500"></span>
                </div>
                <span class="text-3xs font-medium tracking-wide text-film-dim">interpret · sample_02</span>
                <span class="hero-live"><i></i>LIVE</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr]">
                <div
                  ref="compareEl"
                  class="hero-compare"
                  role="slider"
                  tabindex="0"
                  :aria-label="$t('拖动对比原图与注意力热力图')"
                  :aria-valuemin="8"
                  :aria-valuemax="92"
                  :aria-valuenow="Math.round(split)"
                  @pointerdown="onComparePointerDown"
                  @pointermove="onComparePointerMove"
                  @pointerup="endDrag"
                  @pointercancel="endDrag"
                  @lostpointercapture="endDrag"
                  @keydown="onCompareKey"
                >
                  <img src="/assets/sample_2.jpg" :alt="$t('样例胸片与模型注意力热力图')" width="480" height="600" decoding="async" class="hero-xray" />
                  <div class="hero-heat" :style="{ clipPath: `inset(0 ${100 - split}% 0 0)` }">
                    <div class="hero-heat-blobs"></div>
                  </div>
                  <span v-show="split > 28" class="hero-region">{{ $t('模型关注区域') }}</span>

                  <div class="hero-divider" :style="{ left: split + '%' }">
                    <span class="hero-handle">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7 4 12l4 5M16 7l4 5-4 5" />
                      </svg>
                    </span>
                  </div>
                  <span class="hero-image-chip left-3 top-3">{{ $t('热力图') }}</span>
                  <span class="hero-image-chip right-3 top-3">{{ $t('原图') }}</span>
                  <span class="hero-r-marker">PA</span>
                  <span class="hero-drag-hint"><span class="hero-drag-dot"></span>{{ $t('拖动对比 · 查看热力图') }}</span>
                </div>

                <aside class="hero-probs">
                  <div class="flex items-center justify-between">
                    <span class="text-3xs font-semibold uppercase tracking-[0.14em] text-film-dim">{{ $t('模型输出') }}</span>
                    <span class="text-3xs font-semibold text-brand-300 tnum">10 {{ $t('类') }}</span>
                  </div>
                  <div v-for="item in demoProbs" :key="item.code" class="hero-prob">
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="truncate text-2xs text-film-text">{{ $t(item.name) }}</span>
                      <span class="flex-none text-2xs font-semibold text-film-text tnum">{{ item.prob.toFixed(1) }}%</span>
                    </div>
                    <div class="hero-prob-track">
                      <div class="hero-prob-fill" :style="{ width: item.prob + '%', backgroundColor: categoryColor(item.code) }"></div>
                    </div>
                  </div>
                  <div class="hero-attention">
                    <span class="text-3xs font-semibold uppercase tracking-[0.12em] text-brand-300">{{ $t('注意力热区') }}</span>
                    <p class="mt-0.5 text-2xs font-medium text-film-text">{{ $t('右下肺野内中带 · 权重 0.89') }}</p>
                  </div>
                  <div class="flex items-center justify-between gap-2 border-t border-film-line pt-2.5">
                    <span class="text-3xs text-film-dim">{{ $t('整体风险') }}</span>
                    <UiRiskPill level="HIGH" variant="short" />
                  </div>
                  <p class="flex items-center gap-1.5 text-3xs text-film-dim">
                    <span class="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
                    {{ $t('推理与热力图均在本机完成') }}
                  </p>
                </aside>
              </div>
            </div>
            <p class="mt-2 text-right text-3xs text-film-dim">{{ $t('界面示意 · 实际结果以模型输出为准') }}</p>
          </div>
        </div>

        <dl class="hero-metrics">
          <div class="hero-metric">
            <dt>{{ $t('可评估征象') }}</dt>
            <dd>{{ show.findings }}<span class="hero-unit">+ 4</span></dd>
            <p>{{ $t('模型 10 类 + 科普 4 类') }}</p>
          </div>
          <div class="hero-metric">
            <dt>{{ $t('单张推理') }}</dt>
            <dd>{{ show.latency.toFixed(1) }}<span class="hero-unit">s</span></dd>
            <p>{{ $t('本机 CPU · 随设备浮动') }}</p>
          </div>
          <div class="hero-metric">
            <dt>{{ $t('本地处理') }}</dt>
            <dd>{{ show.local }}<span class="hero-unit">%</span></dd>
            <p>{{ $t('原始影像不出本机') }}</p>
          </div>
          <div class="hero-metric">
            <dt>{{ $t('已归档') }}</dt>
            <dd>{{ show.records }}<span class="hero-unit">{{ $t('条') }}</span></dd>
            <p>{{ $t('当前成员健康档案') }}</p>
          </div>
        </dl>

        <div class="ai-ribbon" :aria-label="$t('Web 与 AI 能力')">
          <span class="ai-ribbon-label"><i></i>WEB + AI</span>
          <button type="button" data-ai-feature="cobrain" @click="openAiFeature('interpret')">
            <span aria-hidden="true">◎</span>{{ $t('AI 共脑会诊') }}
          </button>
          <button type="button" data-ai-feature="family" @click="openAiFeature('records')">
            <span aria-hidden="true">⌂</span>{{ $t('家庭健康摘要') }}
          </button>
          <button type="button" data-ai-feature="search" @click="openAiFeature('search')">
            <span aria-hidden="true">⌕</span>{{ $t('全局 AI 速答') }}
          </button>
          <button type="button" data-ai-feature="local" @click="openAiFeature('about')">
            <span aria-hidden="true">▣</span>{{ $t('本地推理 · 不出机') }}
          </button>
        </div>
      </div>
    </header>

    <!-- ══ 01 产品能力 ═════════════════════════════════════════ -->
    <section class="home-section">
      <div class="section-head" data-reveal>
        <div>
          <span class="sec-eyebrow">01 / {{ $t('产品能力') }}</span>
          <h2 class="sec-title">{{ $t('不止一个概率数字，而是一条完整的解读链') }}</h2>
        </div>
        <span class="sec-index tnum">01 — 04</span>
      </div>

      <div class="cap-grid">
        <!-- 热力图 -->
        <article class="cap-card" data-reveal @mousemove="onSpotlight">
          <div class="cap-head">
            <span class="cap-icon">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
            </span>
            <button type="button" class="heat-toggle" :aria-pressed="miniHeat" :aria-label="$t('切换热力图显示')" @click="miniHeat = !miniHeat">
              <span class="heat-toggle-dot"></span>{{ miniHeat ? $t('热力图 · 开') : $t('热力图 · 关') }}
            </button>
          </div>
          <h3 class="cap-title">{{ $t('可解释热力图') }}</h3>
          <div class="mini-viewer" :class="{ 'is-heat-on': miniHeat }">
            <img src="/assets/sample_2.jpg" :alt="$t('样例胸片与模型注意力热力图')" width="480" height="600" decoding="async" />
            <div class="mini-heat" aria-hidden="true"></div>
            <div class="mini-scan" aria-hidden="true"></div>
            <span class="mini-r">PA</span>
          </div>
          <p class="cap-desc">{{ $t('告别“黑盒AI”，通过模型注意力输出生成伪彩热力图层，支持 0%-100% 透明度调节与原图/热力图左右对比。') }}</p>
          <button type="button" class="cap-link" @click="actions.switchPage('interpret')">{{ $t('去解读台看看') }} →</button>
        </article>

        <!-- 概率 -->
        <article class="cap-card" data-reveal :style="{ '--delay': '60ms' }" @mousemove="onSpotlight">
          <div class="cap-head">
            <span class="cap-icon cap-icon--violet">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></svg>
            </span>
            <span class="tag">{{ $t('10 类') }}</span>
          </div>
          <h3 class="cap-title">{{ $t('10 类征象，一次给出') }}</h3>
          <div class="cap-bars">
            <div v-for="bar in capabilityBars" :key="bar.code" class="cap-bar-row">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-text-1">{{ $t(bar.name) }}</span>
                <span class="text-2xs font-semibold text-text-2 tnum">{{ bar.prob.toFixed(1) }}%</span>
              </div>
              <div class="prob-track">
                <div class="prob-fill" :style="{ width: bar.prob + '%', backgroundColor: categoryColor(bar.code) }"></div>
              </div>
            </div>
          </div>
          <p class="cap-desc">{{ $t('多标签 sigmoid 输出，按概率排序并分高 / 中 / 低三档；颜色之外，还有文字与形状。') }}</p>
          <button type="button" class="cap-link" @click="actions.switchPage('knowledge')">{{ $t('查看征象百科') }} →</button>
        </article>

        <!-- 档案 -->
        <article class="cap-card" data-reveal :style="{ '--delay': '100ms' }" @mousemove="onSpotlight">
          <div class="cap-head">
            <span class="cap-icon cap-icon--green">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 3v5h5M8 13h8M8 17h5" /></svg>
            </span>
            <span class="tag">{{ memberName }}</span>
          </div>
          <h3 class="cap-title">{{ $t('把每一次结果连成时间线') }}</h3>
          <ol v-if="timelineRecords.length" class="cap-timeline">
            <li v-for="record in timelineRecords" :key="record.id">
              <div class="flex items-center justify-between gap-2">
                <span class="text-2xs text-text-3 tnum">{{ record.createdAt }}</span>
                <UiRiskPill :level="record.riskLevel" variant="short" />
              </div>
              <p class="mt-0.5 truncate text-xs text-text-1">{{ record.summary || record.title }}</p>
            </li>
          </ol>
          <p v-else class="mini-empty">{{ $t('还没有归档记录，完成一次解读后会出现在这里。') }}</p>
          <p class="cap-desc">{{ $t('一键归档历次胸片解读报告，支持时间 / 风险筛选、详情回溯与随访对比。') }}</p>
          <button type="button" class="cap-link" @click="actions.switchPage('records')">{{ $t('打开健康档案') }} →</button>
        </article>

        <!-- 科普 -->
        <article class="cap-card" data-reveal :style="{ '--delay': '140ms' }" @mousemove="onSpotlight">
          <div class="cap-head">
            <span class="cap-icon cap-icon--amber">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>
            </span>
            <span class="tag">{{ $t('200 条来源') }}</span>
          </div>
          <h3 class="cap-title">{{ $t('每个结论，都能找到出处') }}</h3>
          <div class="report-mock">
            <p class="report-quote">{{ $t('模型提示右下肺野浸润影概率较高，建议结合咳嗽、发热等症状与正式影像报告，由医生综合判断。') }}</p>
            <div class="report-tags">
              <span>{{ $t('循证科普') }}</span>
              <span>BM25 + RRF</span>
            </div>
          </div>
          <p class="cap-desc">{{ $t('报告引用本地知识库的 200 条来源，配合患者版 / 医生版摘要与随访提示。') }}</p>
          <button type="button" class="cap-link" @click="actions.switchPage('knowledge')">{{ $t('查看科普库') }} →</button>
        </article>
      </div>
    </section>

    <!-- ══ 02 流程 + 场景 ═══════════════════════════════════════ -->
    <section class="home-section">
      <div class="section-head" data-reveal>
        <div>
          <span class="sec-eyebrow">02 / {{ $t('使用流程') }}</span>
          <h2 class="sec-title">{{ $t('三步，从一张胸片到一份看得懂的结果') }}</h2>
        </div>
        <span class="sec-index tnum">03 STEPS · 03 SCENARIOS</span>
      </div>

      <div class="duo-grid">
        <!-- 流程 -->
        <div class="duo-card" data-reveal @mousemove="onSpotlight">
          <div class="duo-head">
            <h3 class="duo-title">{{ $t('三步完成') }}</h3>
            <span class="duo-sub">{{ $t('全流程本地') }}</span>
          </div>
          <div class="flow-tabs" role="tablist" :aria-label="$t('使用流程')">
            <button
              v-for="(step, index) in steps"
              :key="step.no"
              type="button"
              role="tab"
              :aria-selected="activeStep === index"
              :class="['flow-tab', { 'is-active': activeStep === index }]"
              @click="activeStep = index"
            >
              <span class="tnum">{{ step.no }}</span>
              <span>{{ $t(step.title) }}</span>
            </button>
          </div>
          <div class="flow-body">
            <div class="min-w-0">
              <p class="flow-meta">{{ $t(steps[activeStep].meta) }}</p>
              <p class="mt-1 text-sm leading-relaxed text-text-2">{{ $t(steps[activeStep].desc) }}</p>
              <ul class="mt-2 space-y-1">
                <li v-for="point in steps[activeStep].points" :key="point" class="flex items-center gap-1.5 text-2xs text-text-2">
                  <span class="h-1 w-1 rounded-full bg-brand-500"></span>{{ $t(point) }}
                </li>
              </ul>
              <button type="button" class="cap-link mt-3" @click="actions.switchPage(steps[activeStep].jump)">{{ $t(steps[activeStep].cta) }} →</button>
            </div>
            <div class="flow-mock" :data-step="activeStep">
              <template v-if="activeStep === 0">
                <span class="mock-icon">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5" /><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
                </span>
                <p class="mock-title">{{ $t('拖拽或点击上传胸部X光片') }}</p>
                <p class="mock-sub">JPG / PNG / DICOM · ≤ 10MB</p>
                <div class="mock-chips"><span>{{ $t('格式校验') }}</span><span>{{ $t('隐私提示') }}</span></div>
              </template>
              <template v-else-if="activeStep === 1">
                <div class="w-full space-y-2.5">
                  <div v-for="(label, index) in ['影像预处理', 'DenseNet-121 推理', '注意力图叠加', '概率排序与分级']" :key="label">
                    <div class="flex justify-between text-2xs"><span>{{ $t(label) }}</span><span class="text-film-dim tnum">0.{{ 8 - index * 2 }}s</span></div>
                    <div class="stage-track"><div class="stage-fill" :style="{ width: (100 - index * 8) + '%' }"></div></div>
                  </div>
                  <p class="text-3xs text-film-dim">0.48s · {{ $t('全流程在本机完成') }}</p>
                </div>
              </template>
              <template v-else>
                <div class="w-full">
                  <div class="flex items-center justify-between"><span class="text-2xs font-semibold text-film-text">{{ $t('AI 解读报告') }}</span><UiRiskPill level="MEDIUM" variant="short" /></div>
                  <p class="mt-1 text-sm font-semibold text-film-text">{{ $t('右下肺野斑片影 · 建议随访') }}</p>
                  <div class="mt-2 space-y-1">
                    <div v-for="item in demoProbs.slice(0, 3)" :key="item.code" class="flex justify-between text-2xs text-film-dim">
                      <span>{{ $t(item.name) }}</span><span class="tnum">{{ item.prob.toFixed(1) }}%</span>
                    </div>
                  </div>
                  <div class="mt-2 flex gap-1.5"><span class="mock-chip">{{ $t('存入档案') }}</span><span class="mock-chip">{{ $t('导出报告') }}</span></div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 场景 -->
        <div class="duo-card" data-reveal :style="{ '--delay': '60ms' }" @mousemove="onSpotlight">
          <div class="duo-head">
            <h3 class="duo-title">{{ $t('三种人，三种用法') }}</h3>
            <span class="duo-sub">{{ $t('适用场景') }}</span>
          </div>
          <div class="scene-tabs" role="tablist" :aria-label="$t('适用场景')">
            <button
              v-for="(scenario, index) in scenarios"
              :key="scenario.no"
              type="button"
              role="tab"
              :aria-selected="activeScenario === index"
              :class="['scene-tab', { 'is-active': activeScenario === index }]"
              @click="activeScenario = index"
            >
              <span class="scene-no tnum">{{ scenario.no }}</span>
              <span class="min-w-0">
                <span class="scene-name">{{ $t(scenario.tab) }}</span>
                <span class="scene-meta">{{ $t(scenario.meta) }}</span>
              </span>
            </button>
          </div>
          <div class="scene-body">
            <span class="scene-chip">{{ $t(scenarios[activeScenario].tab) }}</span>
            <h4 class="scene-headline">{{ $t(scenarios[activeScenario].headline) }}</h4>
            <p class="mt-1.5 text-sm leading-relaxed text-text-2">{{ $t(scenarios[activeScenario].desc) }}</p>
            <ul class="mt-2 space-y-1">
              <li v-for="point in scenarios[activeScenario].points" :key="point" class="flex items-center gap-1.5 text-2xs text-text-2">
                <span class="h-1 w-1 rounded-full bg-brand-500"></span>{{ $t(point) }}
              </li>
            </ul>
            <div class="scene-foot">
              <div class="flex items-baseline gap-2">
                <strong class="text-xl font-bold text-brand-700">{{ $t(scenarios[activeScenario].stat) }}</strong>
                <span class="text-2xs text-text-3">{{ $t(scenarios[activeScenario].statLabel) }}</span>
              </div>
              <button type="button" class="btn-secondary btn-sm" @click="actions.switchPage(scenarios[activeScenario].jump)">{{ $t(scenarios[activeScenario].cta) }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 03 可信与边界 ═══════════════════════════════════════ -->
    <section class="home-section">
      <div class="section-head" data-reveal>
        <div>
          <span class="sec-eyebrow">03 / {{ $t('可信与边界') }}</span>
          <h2 class="sec-title">{{ $t('把「不确定」也说清楚') }}</h2>
        </div>
        <span class="sec-index tnum">LOCAL · EXPLAINABLE</span>
      </div>

      <div class="trust-grid">
        <div class="dark-band" data-reveal>
          <h3 class="dark-title">{{ $t('一个可信的影像 AI，不该只给结论') }}</h3>
          <p class="dark-desc">{{ $t('它需要说明倾向有多大、依据在哪里，以及什么时候必须交给医生。') }}</p>
          <div class="mt-4">
            <div v-for="principle in principles" :key="principle.title" class="principle">
              <span class="principle-icon">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 3v5c0 4.4-2.9 8.3-7 9.9-4.1-1.6-7-5.5-7-9.9V6l7-3Z" /><path stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4" /></svg>
              </span>
              <div>
                <h4 class="principle-title">{{ $t(principle.title) }}</h4>
                <p class="principle-desc">{{ $t(principle.desc) }}</p>
              </div>
            </div>
          </div>
          <div class="dark-facts">
            <span><strong>10</strong> {{ $t('类') }}</span>
            <span><strong>0.48</strong>s</span>
            <span><strong>100</strong>% {{ $t('本地处理') }}</span>
          </div>
        </div>

        <div class="faq-card" data-reveal :style="{ '--delay': '60ms' }">
          <div class="faq-head">
            <h3 class="text-lg font-semibold text-text-1">{{ $t('你可能想问的') }}</h3>
            <span class="text-xs text-text-3">{{ $t('常见问题') }}</span>
          </div>
          <div
            v-for="(item, index) in faqs"
            :key="item.q"
            class="faq-item"
            :class="{ 'is-open': openFaq === index }"
          >
            <button type="button" class="faq-q" :aria-expanded="openFaq === index" @click="openFaq = openFaq === index ? -1 : index">
              <span>{{ $t(item.q) }}</span>
              <span class="faq-icon">
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <div class="faq-a"><div class="faq-a-inner"><p>{{ $t(item.a) }}</p></div></div>
          </div>
          <button type="button" class="cap-link mt-3" @click="actions.switchPage('about')">{{ $t('了解系统边界与技术架构') }} →</button>
        </div>
      </div>
    </section>

    <!-- ══ CTA ══════════════════════════════════════════════════ -->
    <div class="home-cta" data-reveal>
      <div class="home-cta-glow" aria-hidden="true"></div>
      <div class="relative">
        <span class="cta-eyebrow">TRY IT NOW</span>
        <h2 class="cta-title">{{ $t('用一张样例胸片，先看看它怎么工作') }}</h2>
        <p class="cta-desc">{{ $t('内置 3 例典型胸片，无需准备素材；约 30 秒完成一次完整解读。') }}</p>
      </div>
      <div class="relative flex flex-wrap gap-2.5">
        <button type="button" class="btn-primary" @click="actions.openSample('case-high')">{{ $t('载入样例并分析') }}</button>
        <button type="button" class="btn-on-dark" @click="actions.switchPage('about')">{{ $t('了解技术架构') }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ══ Hero ══════════════════════════════════════════════════════ */
.home-page {
  --home-heat-core: rgba(255, 102, 58, 0.86);
  --home-heat-mid: rgba(255, 168, 64, 0.55);
  padding-bottom: 8px;
}

.home-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(760px 420px at 12% -12%, color-mix(in srgb, var(--brand-500) 20%, transparent), transparent 62%),
    radial-gradient(680px 420px at 96% 6%, color-mix(in srgb, var(--cat-effusion) 16%, transparent), transparent 60%),
    linear-gradient(135deg, var(--film-850) 0%, var(--film-panel) 48%, var(--film-850) 100%);
  box-shadow: var(--shadow-3);
}
.home-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--film-text) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--film-text) 5%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(120% 100% at 50% 0%, #000 42%, transparent 88%);
  opacity: 0.7;
}
.home-hero-glow {
  position: absolute;
  inset: -24% -12% auto;
  height: 72%;
  background:
    radial-gradient(38% 52% at 22% 26%, color-mix(in srgb, var(--brand-500) 30%, transparent), transparent 71%),
    radial-gradient(30% 46% at 82% 18%, color-mix(in srgb, var(--cat-effusion) 24%, transparent), transparent 70%);
  filter: blur(42px);
  animation: heroGlow 18s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes heroGlow {
  from { transform: translate3d(-2%, -1%, 0) scale(1); opacity: 0.85; }
  to   { transform: translate3d(3%, 2%, 0) scale(1.08); opacity: 1; }
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--brand-300) 34%, transparent);
  background: color-mix(in srgb, var(--brand-400) 10%, transparent);
  color: var(--brand-200);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: 0.03em;
}
.hero-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-400);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-400) 16%, transparent);
}
.hero-title {
  font-size: clamp(34px, 3.8vw, 46px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--film-text);
  text-wrap: balance;
}
.hero-accent {
  background: linear-gradient(112deg, var(--brand-200) 0%, var(--brand-400) 46%, var(--brand-500) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-lead {
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--film-dim);
  text-wrap: pretty;
}
.hero-ghost { color: var(--film-dim); }
.hero-ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--film-text) 8%, transparent);
  color: var(--film-text);
}
.hero-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  color: var(--film-dim);
  font-size: var(--text-3xs);
}
.hero-facts span { display: inline-flex; align-items: center; gap: 6px; }
.hero-facts i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); }

/* ── 产品缩影 ── */
.hero-workbench {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--film-line);
  background: linear-gradient(160deg, var(--film-850) 0%, var(--film-panel) 100%);
  box-shadow: 0 36px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 color-mix(in srgb, var(--film-text) 8%, transparent);
}
.hero-workbench-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 13px;
  border-bottom: 1px solid var(--film-line);
  background: color-mix(in srgb, var(--film-850) 82%, transparent);
}
.hero-live { display: inline-flex; align-items: center; gap: 6px; color: var(--brand-300); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.12em; }
.hero-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--brand-400); animation: livePulse 2.2s ease-out infinite; }
@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-400) 55%, transparent); }
  70%, 100% { box-shadow: 0 0 0 7px transparent; }
}

.hero-compare {
  position: relative;
  height: 320px;
  overflow: hidden;
  background: var(--ink-950);
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (min-width: 576px) { .hero-compare { height: 360px; } }
@media (min-width: 992px) { .hero-compare { height: 376px; } }
.hero-xray {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.18) brightness(0.82);
  user-select: none;
  pointer-events: none;
}
.hero-heat { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.hero-heat-blobs {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(27% 23% at 37% 63%, var(--home-heat-core), var(--home-heat-mid) 46%, transparent 73%),
    radial-gradient(17% 15% at 32% 72%, color-mix(in srgb, var(--brand-400) 46%, transparent), transparent 72%),
    radial-gradient(24% 22% at 43% 51%, color-mix(in srgb, var(--brand-500) 26%, transparent), transparent 74%);
  mix-blend-mode: screen;
  filter: saturate(1.12);
}
.hero-region {
  position: absolute;
  left: 22%;
  top: 68%;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--brand-200) 55%, transparent);
  background: color-mix(in srgb, var(--ink-950) 62%, transparent);
  color: var(--brand-100);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}
.hero-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, var(--brand-200) 82%, transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--brand-300) 55%, transparent);
}
.hero-handle {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--brand-200) 66%, transparent);
  background: color-mix(in srgb, var(--film-950) 76%, transparent);
  color: var(--film-text);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}
.hero-image-chip {
  position: absolute;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--film-text) 12%, transparent);
  background: color-mix(in srgb, var(--ink-950) 64%, transparent);
  color: var(--film-dim);
  font-size: var(--text-xs);
  font-weight: 600;
  backdrop-filter: blur(6px);
}
.hero-r-marker {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 18px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ink-950) 70%, transparent);
  color: var(--film-text);
  font-size: var(--text-xs);
  font-weight: 700;
}
.hero-drag-hint {
  position: absolute;
  left: 50%;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--ink-950) 62%, transparent);
  color: var(--film-dim);
  font-size: var(--text-xs);
  white-space: nowrap;
  backdrop-filter: blur(6px);
}
.hero-drag-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); }

.hero-probs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--film-line);
  background: color-mix(in srgb, var(--film-panel) 72%, transparent);
}
@media (min-width: 576px) { .hero-probs { border-top: 0; border-left: 1px solid var(--film-line); } }
.hero-prob-track { height: 4px; margin-top: 4px; overflow: hidden; border-radius: var(--radius-pill); background: var(--film-raise); }
.hero-prob-fill { height: 100%; border-radius: inherit; transform-origin: left; animation: heroBarGrow 900ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes heroBarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.hero-attention {
  padding: 8px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--brand-400) 28%, transparent);
  background: color-mix(in srgb, var(--brand-400) 8%, transparent);
}

/* ── Hero 指标 ── */
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 22px;
  border-top: 1px solid var(--film-line);
}
@media (min-width: 768px) { .hero-metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.hero-metric { padding: 12px 16px 16px; border-left: 1px solid color-mix(in srgb, var(--film-line) 80%, transparent); }
.hero-metric:nth-child(2n + 1) { border-left: 0; }
@media (min-width: 768px) {
  .hero-metric:nth-child(2n + 1) { border-left: 1px solid color-mix(in srgb, var(--film-line) 80%, transparent); }
  .hero-metric:first-child { border-left: 0; }
}
.hero-metric dt { font-size: var(--text-3xs); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--film-dim); }
.hero-metric dd { margin: 5px 0 0; display: flex; align-items: baseline; gap: 4px; font-size: var(--text-lg); font-weight: 700; line-height: 1; color: var(--film-text); font-variant-numeric: tabular-nums; }
.hero-unit { font-size: var(--text-xs); font-weight: 600; color: var(--brand-300); }
.hero-metric p { margin-top: 4px; font-size: var(--text-3xs); color: var(--film-dim); }

/* ── Web + AI 能力带 ── */
.ai-ribbon { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed color-mix(in srgb, var(--film-line) 72%, transparent); }
.ai-ribbon-label { display: inline-flex; align-items: center; gap: 5px; margin-right: 4px; color: var(--brand-300); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.ai-ribbon-label i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-400) 16%, transparent); }
.ai-ribbon button { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: var(--radius-pill); border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-panel) 80%, transparent); color: var(--film-dim); font-size: var(--text-3xs); font-weight: 500; transition: color var(--dur-1), border-color var(--dur-1), background-color var(--dur-1); }
.ai-ribbon button:hover { border-color: var(--brand-500); background: color-mix(in srgb, var(--brand-500) 12%, transparent); color: var(--film-text); }
.ai-ribbon button span { color: var(--brand-300); font-size: 14px; line-height: 1; }

/* ══ 区块标题 ══════════════════════════════════════════════════ */
.home-section { margin-top: 40px; scroll-margin-top: 96px; }
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.sec-eyebrow { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.sec-title { margin-top: 6px; font-size: clamp(24px, 2.4vw, 29px); font-weight: 700; line-height: 1.26; letter-spacing: -0.02em; color: var(--color-text-1); }
.sec-index { flex: none; color: var(--ink-400); font-size: var(--text-3xs); font-weight: 600; letter-spacing: 0.1em; }

/* ══ 能力卡（四列） ════════════════════════════════════════════ */
.cap-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.cap-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-1);
  transition: transform var(--dur-2) var(--ease-out), border-color var(--dur-2), box-shadow var(--dur-2);
}
.cap-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--brand-500) 10%, transparent), transparent 62%);
  opacity: 0;
  transition: opacity var(--dur-2);
  pointer-events: none;
}
.cap-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--brand-400) 46%, var(--border-subtle)); box-shadow: var(--shadow-2); }
.cap-card:hover::before { opacity: 1; }
.cap-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cap-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--brand-50);
  color: var(--brand-700);
}
.cap-icon--violet { background: color-mix(in srgb, var(--cat-nodule) 12%, white); color: var(--cat-nodule); }
.cap-icon--green { background: var(--risk-low-soft); color: var(--risk-low); }
.cap-icon--amber { background: var(--risk-mid-soft); color: var(--risk-mid-strong); }
.cap-title { margin-top: 10px; font-size: var(--text-xl); font-weight: 700; letter-spacing: -0.01em; color: var(--color-text-1); }
.cap-desc { margin-top: 8px; font-size: var(--text-xs); line-height: 1.7; color: var(--color-text-2); text-wrap: pretty; }
.cap-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  margin-top: auto;
  padding-top: 10px;
  border: 0;
  background: transparent;
  color: var(--brand-700);
  font-size: var(--text-2xs);
  font-weight: 600;
  transition: gap var(--dur-1);
}
.cap-link:hover { gap: 8px; }

.mini-viewer {
  position: relative;
  height: 118px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--film-line);
  background: var(--film-bg);
}
.mini-viewer img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.16) brightness(0.8); }
.mini-heat {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(24% 22% at 37% 64%, var(--home-heat-core), var(--home-heat-mid) 46%, transparent 73%),
    radial-gradient(18% 16% at 33% 72%, color-mix(in srgb, var(--brand-400) 38%, transparent), transparent 74%);
  mix-blend-mode: screen;
  opacity: 0;
  transition: opacity 360ms var(--ease-out);
}
.mini-viewer.is-heat-on .mini-heat { opacity: 1; }
.mini-scan {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-400) 60%, transparent), var(--brand-300), color-mix(in srgb, var(--brand-400) 60%, transparent), transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--brand-400) 55%, transparent);
  opacity: 0;
}
.mini-viewer.is-heat-on .mini-scan { opacity: 1; animation: miniScan 4.2s ease-in-out infinite; }
@keyframes miniScan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(118px); opacity: 0; } }
.mini-r {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 16px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--ink-950) 70%, transparent);
  color: var(--film-text);
  font-size: var(--text-xs);
  font-weight: 700;
}
.heat-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  flex: none;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--surface-card);
  color: var(--color-text-2);
  font-size: var(--text-xs);
  font-weight: 600;
}
.heat-toggle[aria-pressed="true"] { border-color: var(--brand-300); background: var(--brand-50); color: var(--brand-800); }
.heat-toggle-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ink-300); }
.heat-toggle[aria-pressed="true"] .heat-toggle-dot { background: var(--brand-500); }

.cap-bars { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.prob-track { height: 4px; margin-top: 4px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-sunken); }
.prob-fill { height: 100%; border-radius: inherit; transform-origin: left; animation: probGrow 900ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both; }
@keyframes probGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.cap-timeline { margin-top: 10px; padding-left: 12px; border-left: 1px solid var(--border-subtle); }
.cap-timeline li { position: relative; min-width: 0; padding: 5px 0; }
.cap-timeline li::before { content: ""; position: absolute; left: -16px; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: var(--brand-500); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent); }
.mini-empty { margin-top: 10px; padding: 12px; border-radius: var(--radius-md); background: var(--surface-sunken); color: var(--color-text-3); font-size: var(--text-2xs); }

.report-mock { margin-top: 10px; padding: 11px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: linear-gradient(180deg, var(--brand-50) 0%, var(--surface-card) 100%); }
.report-quote { font-size: var(--text-2xs); line-height: 1.7; color: var(--color-text-1); }
.report-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.report-tags span { padding: 1px 7px; border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-card) 82%, transparent); color: var(--color-text-2); font-size: var(--text-xs); }

/* ══ 流程 + 场景 ══════════════════════════════════════════════ */
.duo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.duo-card {
  position: relative;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-1);
}
.duo-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--brand-500) 8%, transparent), transparent 62%);
  opacity: 0;
  transition: opacity var(--dur-2);
  pointer-events: none;
}
.duo-card:hover::before { opacity: 1; }
.duo-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.duo-title { font-size: var(--text-xs); font-weight: 700; color: var(--color-text-1); }
.duo-sub { color: var(--color-text-3); font-size: var(--text-3xs); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }

.flow-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.flow-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 7px 9px;
  text-align: left;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-2);
  font-size: var(--text-xs);
  transition: background-color var(--dur-2), border-color var(--dur-2);
}
.flow-tab span:first-child { color: var(--brand-600); font-weight: 700; }
.flow-tab span:last-child { font-weight: 600; }
.flow-tab.is-active { border-color: var(--brand-200); background: var(--brand-50); color: var(--brand-900); }
.flow-body { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 14px; margin-top: 12px; align-items: stretch; }
.flow-meta { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 600; }
.flow-mock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 164px;
  padding: 12px;
  text-align: center;
  border-radius: var(--radius-md);
  border: 1px dashed color-mix(in srgb, var(--brand-400) 46%, var(--border-strong));
  background: linear-gradient(180deg, var(--brand-50) 0%, var(--surface-card) 100%);
}
.flow-mock[data-step="1"] {
  align-items: stretch;
  text-align: left;
  border-style: solid;
  border-color: var(--film-line);
  background: linear-gradient(160deg, var(--film-850) 0%, var(--film-panel) 100%);
  color: var(--film-text);
}
.flow-mock[data-step="2"] { align-items: stretch; text-align: left; border-style: solid; background: var(--surface-card); }
.mock-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--brand-500), var(--brand-700)); color: #fff; }
.mock-title { margin-top: 8px; font-size: var(--text-2xs); font-weight: 600; color: var(--color-text-1); }
.mock-sub { margin-top: 2px; font-size: var(--text-xs); color: var(--color-text-3); }
.mock-chips { display: flex; gap: 4px; margin-top: 8px; }
.mock-chips span, .mock-chip { padding: 2px 7px; border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: var(--surface-card); color: var(--color-text-2); font-size: var(--text-xs); }
.stage-track { height: 3px; margin-top: 4px; overflow: hidden; border-radius: var(--radius-pill); background: var(--film-raise); }
.stage-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-500), var(--brand-300)); }

.scene-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.scene-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 7px 9px;
  text-align: left;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  transition: border-color var(--dur-2), background-color var(--dur-2);
}
.scene-tab.is-active { border-color: var(--ink-900); background: var(--ink-900); }
.scene-no { color: var(--brand-600); font-size: var(--text-xs); font-weight: 700; }
.scene-name { display: block; color: var(--color-text-1); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scene-meta { display: block; color: var(--color-text-3); font-size: var(--text-xs); }
.scene-tab.is-active .scene-no { color: var(--brand-300); }
.scene-tab.is-active .scene-name { color: #fff; }
.scene-tab.is-active .scene-meta { color: var(--film-dim); }
.scene-body { margin-top: 12px; }
.scene-chip { display: inline-flex; padding: 1px 7px; border-radius: var(--radius-pill); background: var(--brand-50); color: var(--brand-800); font-size: var(--text-xs); font-weight: 600; }
.scene-headline { margin-top: 6px; font-size: var(--text-xs); font-weight: 700; letter-spacing: -0.01em; color: var(--color-text-1); }
.scene-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); }

/* ══ 边界 + FAQ ═══════════════════════════════════════════════ */
.trust-grid { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 14px; align-items: stretch; }
.dark-band {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(620px 320px at 96% -10%, color-mix(in srgb, var(--brand-500) 18%, transparent), transparent 62%),
    linear-gradient(150deg, var(--film-850) 0%, var(--film-panel) 55%, var(--film-850) 100%);
  box-shadow: var(--shadow-3);
}
.dark-title { font-size: var(--text-sm); font-weight: 700; letter-spacing: -0.01em; color: var(--film-text); }
.dark-desc { margin-top: 6px; font-size: var(--text-2xs); line-height: 1.7; color: var(--film-dim); }
.principle { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid color-mix(in srgb, var(--film-line) 86%, transparent); }
.principle-icon { display: flex; align-items: center; justify-content: center; flex: none; width: 26px; height: 26px; border-radius: var(--radius-sm); border: 1px solid color-mix(in srgb, var(--brand-400) 28%, transparent); background: color-mix(in srgb, var(--brand-400) 10%, transparent); color: var(--brand-300); }
.principle-title { font-size: var(--text-2xs); font-weight: 600; color: var(--film-text); }
.principle-desc { margin-top: 2px; font-size: var(--text-3xs); line-height: 1.6; color: var(--film-dim); }
.dark-facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--film-line); }
.dark-facts span { padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-raise) 55%, transparent); color: var(--film-dim); font-size: var(--text-xs); }
.dark-facts strong { color: var(--brand-300); font-size: var(--text-2xs); }

.faq-card { padding: 18px; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.faq-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.faq-item { border-top: 1px solid var(--border-subtle); }
.faq-q { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; text-align: left; border: 0; background: transparent; color: var(--color-text-1); font-size: var(--text-sm); font-weight: 600; }
.faq-icon { display: flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-subtle); color: var(--color-text-2); transition: transform var(--dur-2); }
.faq-item.is-open .faq-icon { transform: rotate(45deg); border-color: var(--brand-300); color: var(--brand-700); }
.faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 300ms var(--ease-out); }
.faq-item.is-open .faq-a { grid-template-rows: 1fr; }
.faq-a-inner { overflow: hidden; }
.faq-a p { padding: 0 0 10px; font-size: var(--text-xs); line-height: 1.7; color: var(--color-text-2); }

/* ══ CTA ══════════════════════════════════════════════════════ */
.home-cta {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 40px;
  padding: 22px 26px;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(560px 300px at 88% -30%, color-mix(in srgb, var(--brand-400) 26%, transparent), transparent 62%),
    linear-gradient(120deg, var(--ink-950) 0%, var(--film-850) 62%, var(--ink-900) 100%);
  color: var(--film-text);
  box-shadow: var(--shadow-3);
}
.home-cta-glow { position: absolute; inset: auto -6% -70% 40%; height: 180%; background: radial-gradient(40% 50% at 60% 40%, color-mix(in srgb, var(--brand-500) 18%, transparent), transparent 70%); filter: blur(30px); pointer-events: none; }
.cta-eyebrow { color: var(--brand-300); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.16em; }
.cta-title { margin-top: 4px; font-size: clamp(18px, 2vw, 22px); font-weight: 700; letter-spacing: -0.01em; }
.cta-desc { margin-top: 4px; color: var(--film-dim); font-size: var(--text-2xs); }
.btn-on-dark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 15px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--film-text) 22%, transparent);
  background: color-mix(in srgb, var(--film-text) 6%, transparent);
  color: var(--film-text);
  font-size: var(--text-sm);
  font-weight: 500;
}
.btn-on-dark:hover { border-color: color-mix(in srgb, var(--brand-300) 60%, transparent); background: color-mix(in srgb, var(--brand-400) 12%, transparent); }

/* ══ 入场 / 动效 ═════════════════════════════════════════════ */
.is-reveal-ready [data-reveal] { transform: translateY(14px); transition: transform 520ms var(--ease-out) var(--delay, 0ms); }
.is-reveal-ready [data-reveal].is-inview { transform: translateY(0); }

@media (max-width: 1279px) {
  .cap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .duo-grid, .trust-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .cap-grid { grid-template-columns: minmax(0, 1fr); }
  .flow-body { grid-template-columns: minmax(0, 1fr); }
  .flow-mock { min-height: 140px; }
  .scene-tabs, .flow-tabs { grid-template-columns: minmax(0, 1fr); }
  .flow-tab { flex-direction: row; align-items: baseline; gap: 6px; }
  .scene-tab { justify-content: flex-start; }
  .home-section { margin-top: 32px; }
  .home-cta { margin-top: 32px; padding: 18px; }
}
@media (max-width: 575px) {
  .home-hero { border-radius: var(--radius-lg); }
  .hero-compare { height: 280px; }
  .hero-region { display: none; }
  .hero-metrics { margin-top: 16px; }
  .sec-index { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .home-hero-glow, .hero-live i, .hero-prob-fill, .mini-scan, .stage-fill { animation: none !important; }
  .is-reveal-ready [data-reveal] { transform: none; transition: none; }
  .prob-fill { animation: none; transform: none; }
}
</style>
