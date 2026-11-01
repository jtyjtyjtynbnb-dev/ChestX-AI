<script setup>
import { computed, reactive, ref } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';
import { useAcademy } from '../composables/useAcademy.js';

const ctx = useAppContext();
const a = reactive(useAcademy(ctx));

const tabs = [
  { key: 'basics', label: '胸片基础' },
  { key: 'signs', label: '常见征象' },
  { key: 'guide', label: '九步读片 · 自测' }
];

/** 教学病例：一张正常片 + 两张真实异常样例 */
const cases = [
  {
    key: 'normal',
    label: '正常 PA',
    short: '正常片',
    image: '/assets/sample_3.jpg',
    meta: 'PA · 立位 · 深吸气',
    note: '标准成人后前位胸片，用于解剖定位与正常表现对照。'
  },
  {
    key: 'pneumonia',
    label: '右下肺斑片影',
    short: '肺炎样例',
    image: '/assets/sample_2.jpg',
    meta: 'PA · 右下肺野',
    note: '右下肺野内中带可见斑片状密度增高影，用于对照异常征象。'
  },
  {
    key: 'nodule',
    label: '右肺结节',
    short: '结节样例',
    image: '/assets/knowledge/nodule.jpg',
    meta: 'PA · 右肺中野',
    note: '示例片用于观察结节位置；胸片对微小结节敏感度有限，通常需 CT。'
  }
];

const activeCaseKey = ref('normal');
const activeCase = computed(() => cases.find((item) => item.key === activeCaseKey.value) || cases[0]);

const zoom = ref(1);
const tx = ref(0);
const ty = ref(0);
const invert = ref(false);
const showSpots = ref(true);
const viewportRef = ref(null);
const drag = { active: false, x: 0, y: 0 };

const stageStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${zoom.value})`,
  filter: invert.value ? 'invert(1)' : 'none'
}));

function clampZoom(value) {
  return Math.min(3, Math.max(1, Math.round(value * 100) / 100));
}
function zoomBy(delta) {
  zoom.value = clampZoom(zoom.value + delta);
  if (zoom.value === 1) { tx.value = 0; ty.value = 0; }
}
function onWheel(event) {
  zoomBy(event.deltaY > 0 ? -0.12 : 0.12);
}
function onPointerDown(event) {
  if (event.button !== 0 || zoom.value <= 1) return;
  drag.active = true;
  drag.x = event.clientX;
  drag.y = event.clientY;
  viewportRef.value?.setPointerCapture?.(event.pointerId);
}
function onPointerMove(event) {
  if (!drag.active) return;
  tx.value += event.clientX - drag.x;
  ty.value += event.clientY - drag.y;
  drag.x = event.clientX;
  drag.y = event.clientY;
}
function endDrag() { drag.active = false; }
function resetView() {
  zoom.value = 1;
  tx.value = 0;
  ty.value = 0;
  invert.value = false;
}
function setCase(key) {
  activeCaseKey.value = key;
  resetView();
}

/* 解剖选择 */
const selectedIndex = (disease) => a.state.hotspots[disease.code] || 0;
const selectedNote = (disease) => disease.hotspots[selectedIndex(disease)] || disease.hotspots[0];

/* 九步清单完成度 */
const completedSteps = ref([]);
const stepProgress = computed(() => Math.round((completedSteps.value.length / a.nineSteps.length) * 100));
function toggleStep(index) {
  const pos = completedSteps.value.indexOf(index);
  if (pos >= 0) completedSteps.value.splice(pos, 1);
  else completedSteps.value.push(index);
}

/* 征象分组：10 个模型类 + 4 个扩展科普 */
const extensionCodes = ['edema', 'emphysema', 'fibrosis', 'thickening'];
const modelSigns = computed(() => a.academySigns.filter((sg) => !extensionCodes.includes(sg.disease.code)));
const extensionSigns = computed(() => a.academySigns.filter((sg) => extensionCodes.includes(sg.disease.code)));

function resetQuiz() {
  Object.keys(ctx.AppState.quizAnswered || {}).forEach((key) => { delete ctx.AppState.quizAnswered[key]; });
}

/** 选项反馈态：答对绿、答错红、未答中性 */
function optionClass(q, idx) {
  const chosen = a.quizChosen(q.id);
  if (typeof chosen !== 'number') return 'border-border-line bg-card-bg text-text-2 hover:border-brand-300 hover:bg-brand-50';
  if (idx === q.answerIndex) return 'border-success bg-success-soft text-success-strong font-medium';
  if (idx === chosen) return 'border-danger bg-danger-soft text-danger-strong font-medium';
  return 'border-border-line bg-card-bg text-text-3';
}
</script>

<template>
  <section id="page-academy" class="page-view active academy-page space-y-4">

    <!-- ══ 头部：工作站模式 ═════════════════════════════════════ -->
    <div class="academy-head">
      <div class="min-w-0">
        <span class="academy-eyebrow">TEACHING WORKSTATION · {{ $t('互动教学') }}</span>
        <h1 class="academy-title">{{ $t('影像小课堂') }}</h1>
        <p class="academy-desc">{{ $t('解剖热点、典型征象与九步读片法，配合即时反馈自测，建立固定的阅片顺序。') }}</p>
      </div>
      <div class="mode-switch" role="tablist" :aria-label="$t('课堂模块')">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :data-academy-tab="tab.key"
          role="tab"
          :aria-selected="a.state.tab === tab.key"
          class="mode-tab"
          :class="{ 'is-active': a.state.tab === tab.key }"
          @click="a.switchAcademyTab(tab.key)"
        >{{ $t(tab.label) }}</button>
      </div>
    </div>

    <!-- ══ 基础：读片工作台 ═════════════════════════════════════ -->
    <div id="academy-tab-basics" class="academy-tab-panel" :class="{ hidden: a.state.tab !== 'basics' }">
      <div class="workstation">
        <div class="ws-top">
          <div class="flex min-w-0 items-center gap-2">
            <span class="ws-brand">CHESTX-AI · READING WORKSTATION</span>
            <span class="ws-divider"></span>
            <span class="ws-study">{{ $t(activeCase.label) }}</span>
          </div>
          <div class="ws-meta">
            <span>PA</span>
            <span>2026-11-01</span>
            <span class="ws-local"><i></i>LOCAL</span>
          </div>
        </div>

        <div class="ws-body">
          <!-- 左侧胶片条 -->
          <div class="film-strip" :aria-label="$t('教学病例')">
            <button
              v-for="item in cases"
              :key="item.key"
              type="button"
              class="film-thumb"
              :class="{ 'is-active': activeCaseKey === item.key }"
              :aria-pressed="activeCaseKey === item.key"
              @click="setCase(item.key)"
            >
              <img :src="item.image" :alt="$t(item.label)" loading="lazy" />
              <span>{{ $t(item.short) }}</span>
            </button>
          </div>

          <!-- 中间：视口 -->
          <div class="ws-center">
            <div class="ws-tools">
              <div class="ws-tool-group">
                <button type="button" class="ws-tool" :title="$t('缩小')" @click="zoomBy(-0.2)">−</button>
                <span class="ws-zoom tnum">{{ Math.round(zoom * 100) }}%</span>
                <button type="button" class="ws-tool" :title="$t('放大')" @click="zoomBy(0.2)">＋</button>
              </div>
              <span class="ws-tool-sep"></span>
              <button type="button" class="ws-tool ws-tool--text" :class="{ 'is-on': invert }" :aria-pressed="invert" @click="invert = !invert">{{ $t('负片') }}</button>
              <button type="button" class="ws-tool ws-tool--text" :class="{ 'is-on': showSpots }" :aria-pressed="showSpots" @click="showSpots = !showSpots">{{ $t('解剖热区') }}</button>
              <button type="button" class="ws-tool ws-tool--text" @click="resetView">{{ $t('重置') }}</button>
              <span class="ml-auto text-3xs text-film-dim">{{ $t('滚轮缩放 · 放大后拖拽平移') }}</span>
            </div>

            <div
              ref="viewportRef"
              class="ws-viewport"
              @wheel.prevent="onWheel"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="endDrag"
              @pointercancel="endDrag"
              @lostpointercapture="endDrag"
            >
              <div class="ws-grid" aria-hidden="true"></div>
              <div class="ws-stage" :style="stageStyle">
                <img :src="activeCase.image" :alt="$t(activeCase.label)" class="ws-image" decoding="async" />
                <div id="anatomyHotspotsLayer" v-show="showSpots" class="absolute inset-0">
                  <button
                    v-for="spot in a.anatomyHotspots"
                    :key="spot.id"
                    type="button"
                    :data-spot-id="spot.id"
                    :style="{ left: spot.x + '%', top: spot.y + '%' }"
                    class="anatomy-spot-btn absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus:outline-none"
                    :title="spot.name"
                    @pointerdown.stop
                    @click.stop="a.selectSpot(spot.id)"
                  >
                    <span v-if="spot.id === a.currentSpot.id" class="hotspot-ring absolute inset-0 rounded-full bg-brand-400"></span>
                    <span
                      class="relative flex h-6 w-6 items-center justify-center rounded-full border-2 text-2xs font-bold transition-transform duration-150"
                      :class="spot.id === a.currentSpot.id
                        ? 'scale-110 border-white bg-brand-500 text-white'
                        : 'border-film-line bg-ink-950/85 text-brand-300 hover:scale-105'"
                    >{{ spot.id }}</span>
                  </button>
                </div>
              </div>

              <div class="ws-corner ws-corner--left">
                <span class="ws-marker">R</span>
                <span>{{ activeCase.meta }}</span>
              </div>
              <div class="ws-corner ws-corner--right">
                <span>{{ $t('本机演示') }}</span>
                <span class="ws-marker">L</span>
              </div>
              <div class="ws-viewport-note">{{ $t('解剖定位以标准 PA 片为基准，仅用于教学') }}</div>
            </div>
          </div>

          <!-- 右侧：解剖详情 -->
          <aside id="anatomySpotDetailCard" class="ws-panel">
            <div class="ws-panel-head">
              <span class="ws-panel-no tnum">{{ a.currentSpot.id }}</span>
              <div class="min-w-0">
                <h2 class="ws-panel-title">{{ a.currentSpot.name }}</h2>
                <p class="text-3xs text-film-dim">{{ $t('解剖热区') }} · {{ $t('点击影像编号切换') }}</p>
              </div>
            </div>

            <div class="ws-detail ws-detail--normal">
              <h3><span class="ws-dot"></span>{{ $t('正常表现') }}</h3>
              <p>{{ a.currentSpot.normal }}</p>
            </div>
            <div class="ws-detail ws-detail--abnormal">
              <h3><span class="ws-dot"></span>{{ $t('常见异常征象') }}</h3>
              <p>{{ a.currentSpot.abnormal }}</p>
            </div>
            <div class="ws-detail ws-detail--tip">
              <h3><span class="ws-dot"></span>{{ $t('读片要点') }}</h3>
              <p>{{ a.currentSpot.tip }}</p>
            </div>

            <div class="ws-quick">
              <p class="mb-1 text-3xs text-film-dim">{{ $t('快速切换全部部位') }}</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="spot in a.anatomyHotspots"
                  :key="'q-' + spot.id"
                  type="button"
                  :data-quick-spot="spot.id"
                  class="quick-spot-btn flex h-6 items-center gap-1 rounded border px-1.5 text-3xs transition-colors duration-150"
                  :class="spot.id === a.currentSpot.id
                    ? 'border-brand-400 bg-brand-400/15 font-semibold text-brand-200'
                    : 'border-film-line text-film-dim hover:border-brand-400 hover:text-film-text'"
                  @click="a.selectSpot(spot.id)"
                >
                  <span class="font-semibold tnum">{{ spot.id }}</span>
                  {{ spot.name.split(' ')[0] }}
                </button>
              </div>
            </div>

            <button type="button" class="ws-guide-link" @click="a.switchAcademyTab('guide')">
              {{ $t('打开九步读片清单') }} →
            </button>
          </aside>
        </div>

        <div class="ws-status">
          <span>ZOOM {{ Math.round(zoom * 100) }}%</span>
          <span>{{ activeCase.meta }}</span>
          <span>{{ $t('案例') }} · {{ activeCase.note }}</span>
          <span class="ml-auto">{{ $t('仅供教学 · 不作为诊断依据') }}</span>
        </div>
      </div>
    </div>

    <!-- ══ 征象图库 ═════════════════════════════════════════════ -->
    <div id="academy-tab-signs" class="academy-tab-panel" :class="{ hidden: a.state.tab !== 'signs' }">
      <div class="section-mini-head">
        <div>
          <span class="academy-eyebrow">SIGN LIBRARY</span>
          <h2 class="section-mini-title">{{ $t('胸片征象影像讲解') }}</h2>
          <p class="section-mini-desc">{{ $t('点击影像上的编号查看观察提示。影像与标注仅供科普教学，不作为诊断依据。') }}</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span class="tag">10 {{ $t('模型类') }}</span>
          <span class="tag">4 {{ $t('扩展科普') }}</span>
        </div>
      </div>

      <div id="academySignsGrid" class="signs-grid">
        <article
          v-for="sg in modelSigns"
          :key="sg.disease.code"
          class="sign-card"
          :data-sign-card="sg.disease.code"
        >
          <div class="sign-head">
            <h3 class="min-w-0 truncate text-base font-semibold text-text-1">{{ sg.title }}</h3>
            <span class="flex-none rounded px-1.5 text-2xs font-semibold" :class="a.getRiskStyle(sg.risk).badgeClass">{{ $t(sg.tag) }}</span>
          </div>

          <div data-surface="film" class="sign-image">
            <img :src="sg.disease.image" :alt="sg.disease.imageAlt" loading="lazy" decoding="async" />
            <div class="pointer-events-none absolute inset-0" :aria-label="sg.disease.shortName" role="group">
              <button
                v-for="(spot, index) in sg.disease.hotspots"
                :key="index"
                type="button"
                class="academy-sign-hotspot pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-3xs font-bold transition-transform duration-150"
                :class="index === selectedIndex(sg.disease)
                  ? 'scale-110 border-white bg-brand-500 text-white'
                  : 'border-film-line bg-ink-950/85 text-brand-300 hover:scale-105'"
                :style="{ left: spot.x + '%', top: spot.y + '%' }"
                :data-hotspot-index="index"
                :aria-label="sg.disease.shortName + ' 观察点 ' + (index + 1) + '：' + spot.title"
                :aria-pressed="index === selectedIndex(sg.disease)"
                @click="a.selectSignHotspot(sg.disease.code, index)"
              >{{ index + 1 }}</button>
            </div>
            <span class="sign-image-tag">{{ sg.disease.imageType }}</span>
          </div>

          <div class="sign-body">
            <p class="text-sm leading-relaxed text-text-2">{{ sg.desc }}</p>
            <div class="sign-note">
              <h4 class="academy-sign-note-title text-sm font-semibold text-brand-800">{{ selectedNote(sg.disease).title }}</h4>
              <p class="academy-sign-note mt-0.5 text-xs leading-relaxed text-text-2" aria-live="polite">{{ selectedNote(sg.disease).text }}</p>
            </div>
            <p class="mt-auto text-xs leading-relaxed text-text-3">
              <strong class="text-text-2">{{ $t('临床意义') }}：</strong>{{ sg.clinical }}
            </p>
            <div class="flex items-center justify-between gap-2">
              <a :href="sg.disease.imageSource" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{{ $t('影像来源') }} ↗</a>
              <button type="button" class="cap-link" @click="a.switchAcademyTab('guide')">{{ $t('去自测') }} →</button>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-4">
        <h3 class="mb-2 text-sm font-semibold text-text-1">{{ $t('扩展科普') }}</h3>
        <div class="extension-grid">
          <article v-for="sg in extensionSigns" :key="sg.disease.code" class="extension-card">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-sm font-semibold text-text-1">{{ $t(sg.disease.shortName) }}</h4>
              <span class="tag">{{ $t('扩展科普') }}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-text-2">{{ sg.desc }}</p>
          </article>
        </div>
      </div>
    </div>

    <!-- ══ 九步法 + 自测 ════════════════════════════════════════ -->
    <div id="academy-tab-guide" class="academy-tab-panel space-y-4" :class="{ hidden: a.state.tab !== 'guide' }">
      <div class="panel p-4">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <span class="academy-eyebrow">NINE-STEP READING</span>
            <h2 class="text-lg font-semibold text-text-1">{{ $t('九步读片法（ABCDEF 口诀扩展）') }}</h2>
            <p class="mt-0.5 text-xs text-text-2">{{ $t('固定顺序阅片，避免遗漏肋膈角、心后区与肺尖部隐匿病变。点击步骤可标记完成。') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xs text-text-3">{{ completedSteps.length }} / 9</span>
            <div class="h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken">
              <div class="h-full rounded-full bg-brand-500 transition-all duration-300" :style="{ width: stepProgress + '%' }"></div>
            </div>
          </div>
        </div>
        <div id="nineStepGuideGrid" class="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border-line bg-border-line sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="(g, index) in a.nineSteps"
            :key="g.step"
            type="button"
            class="nine-step text-left transition-colors duration-150"
            :class="{ 'is-done': completedSteps.includes(index) }"
            :aria-pressed="completedSteps.includes(index)"
            @click="toggleStep(index)"
          >
            <div class="flex items-baseline gap-2">
              <span class="text-2xs font-semibold text-brand-700 tnum">{{ String(index + 1).padStart(2, '0') }}</span>
              <h3 class="text-sm font-semibold text-text-1">{{ g.title }}</h3>
              <span class="ml-auto text-2xs" :class="completedSteps.includes(index) ? 'text-success' : 'text-ink-300'">{{ completedSteps.includes(index) ? '✓' : '○' }}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-text-2">{{ g.desc }}</p>
          </button>
        </div>
      </div>

      <div class="panel p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-line pb-3">
          <div>
            <h3 class="text-lg font-semibold text-text-1">{{ $t('读片入门小测验') }}</h3>
            <p class="mt-0.5 text-xs text-text-3">{{ $t('选择后即时显示对错与解析') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="quizScoreBadge" class="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-2xs font-semibold text-brand-800 tnum">
              {{ $t('答对') }} {{ a.score }} / {{ a.quizzes.length }}
            </span>
            <button type="button" class="btn-secondary btn-sm" @click="resetQuiz">{{ $t('重新作答') }}</button>
          </div>
        </div>

        <div id="academyQuizContainer" class="space-y-3">
          <div v-for="(q, qi) in a.quizzes" :key="q.id" class="quiz-card rounded-md border border-border-line p-3.5">
            <p class="flex gap-2 text-xs font-semibold text-text-1">
              <span class="flex-none text-brand-700 tnum">{{ String(qi + 1).padStart(2, '0') }}</span>
              <span>{{ q.question }}</span>
            </p>
            <div class="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <button
                v-for="(opt, idx) in q.options"
                :key="idx"
                type="button"
                :data-quiz-id="q.id"
                :data-opt-idx="idx"
                class="quiz-opt-btn flex items-start gap-2 rounded border px-2.5 py-2 text-left text-xs transition-colors duration-150"
                :class="optionClass(q, idx)"
                @click="a.answerQuiz(q.id, idx)"
              >
                <span class="min-w-0">{{ opt }}</span>
              </button>
            </div>
            <p
              v-if="typeof a.quizChosen(q.id) === 'number'"
              class="mt-2 rounded p-2 text-3xs leading-relaxed"
              :class="a.quizChosen(q.id) === q.answerIndex ? 'bg-success-soft text-success-strong' : 'bg-warning-soft text-warning-strong'"
            >{{ q.explanation }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.academy-page { --ws-line: var(--film-line); }

.academy-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding: 4px 0 2px;
}
.academy-eyebrow { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.academy-title { margin-top: 4px; font-size: clamp(22px, 2.6vw, 28px); font-weight: 700; letter-spacing: -0.02em; color: var(--color-text-1); }
.academy-desc { margin-top: 4px; font-size: var(--text-sm); color: var(--color-text-2); }
.mode-switch { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--color-border-line); background: var(--surface-sunken); }
.mode-tab { height: 30px; padding: 0 12px; border-radius: 7px; color: var(--color-text-2); font-size: var(--text-2xs); font-weight: 600; white-space: nowrap; }
.mode-tab.is-active { background: var(--surface-card); color: var(--color-text-1); box-shadow: var(--shadow-1); }

/* ── 工作站 ───────────────────────────────────────────────── */
.workstation {
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background: var(--film-bg);
  box-shadow: var(--shadow-3);
}
.ws-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--film-line);
  background: color-mix(in srgb, var(--film-850) 86%, transparent);
}
.ws-brand { color: var(--brand-300); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.12em; white-space: nowrap; }
.ws-divider { width: 1px; height: 12px; background: var(--film-line); }
.ws-study { color: var(--film-text); font-size: var(--text-2xs); font-weight: 600; white-space: nowrap; }
.ws-meta { display: flex; align-items: center; gap: 10px; color: var(--film-dim); font-size: var(--text-xs); }
.ws-meta span { padding: 1px 6px; border-radius: 3px; border: 1px solid var(--film-line); }
.ws-local { display: inline-flex; align-items: center; gap: 4px; }
.ws-local i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); }

.ws-body { display: grid; grid-template-columns: 70px minmax(0, 1fr) 330px; min-height: 530px; }
.film-strip { display: flex; flex-direction: column; gap: 8px; padding: 10px 8px; border-right: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-850) 70%, transparent); }
.film-thumb { display: flex; flex-direction: column; gap: 3px; padding: 3px; border-radius: 5px; border: 1px solid var(--film-line); background: var(--film-panel); color: var(--film-dim); font-size: var(--text-xs); text-align: center; }
.film-thumb img { width: 100%; height: 46px; object-fit: cover; border-radius: 3px; filter: grayscale(1) contrast(1.1); }
.film-thumb.is-active { border-color: var(--brand-400); color: var(--brand-200); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-400) 16%, transparent); }

.ws-center { display: flex; min-width: 0; flex-direction: column; }
.ws-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 7px 10px; border-bottom: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-850) 78%, transparent); }
.ws-tool-group { display: flex; align-items: center; gap: 2px; padding: 2px; border-radius: 5px; border: 1px solid var(--film-line); background: var(--film-panel); }
.ws-tool { display: inline-flex; align-items: center; justify-content: center; height: 24px; min-width: 24px; padding: 0 5px; border-radius: 4px; color: var(--film-dim); font-size: var(--text-2xs); }
.ws-tool:hover { background: var(--film-raise); color: var(--film-text); }
.ws-tool--text { border: 1px solid transparent; font-size: var(--text-xs); }
.ws-tool--text.is-on { border-color: color-mix(in srgb, var(--brand-400) 40%, transparent); background: color-mix(in srgb, var(--brand-400) 12%, transparent); color: var(--brand-200); }
.ws-zoom { min-width: 36px; text-align: center; color: var(--brand-300); font-size: var(--text-xs); font-weight: 600; }
.ws-tool-sep { width: 1px; height: 14px; background: var(--film-line); }

.ws-viewport {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 460px;
  background: #05080d;
  cursor: default;
  touch-action: none;
}
.ws-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px); background-size: 54px 54px; pointer-events: none; }
.ws-stage { position: relative; width: min(82%, 460px); aspect-ratio: 1 / 1; transition: transform 120ms linear; will-change: transform; }
.ws-image { width: 100%; height: 100%; object-fit: contain; filter: grayscale(1) contrast(1.14) brightness(0.86); user-select: none; pointer-events: none; }
.ws-corner { position: absolute; z-index: 2; display: flex; align-items: center; gap: 6px; color: var(--film-dim); font-size: var(--text-xs); pointer-events: none; }
.ws-corner--left { left: 10px; top: 10px; }
.ws-corner--right { right: 10px; top: 10px; }
.ws-marker { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 3px; border: 1px solid var(--film-line); background: color-mix(in srgb, var(--ink-950) 72%, transparent); color: var(--brand-300); font-size: var(--text-xs); font-weight: 700; }
.ws-viewport-note { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); padding: 2px 8px; border-radius: 4px; background: color-mix(in srgb, var(--ink-950) 75%, transparent); color: var(--film-dim); font-size: var(--text-xs); white-space: nowrap; pointer-events: none; }

.ws-panel { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border-left: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-panel) 80%, transparent); }
.ws-panel-head { display: flex; align-items: center; gap: 9px; padding: 12px; border-bottom: 1px solid var(--film-line); }
.ws-panel-no { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 30px; height: 30px; border-radius: 7px; background: linear-gradient(135deg, var(--brand-500), var(--brand-700)); color: #fff; font-size: var(--text-2xs); font-weight: 700; }
.ws-panel-title { color: var(--film-text); font-size: var(--text-2xs); font-weight: 600; line-height: 1.3; }
.ws-detail { margin: 9px 12px 0; padding: 9px 10px; border-radius: 7px; border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-850) 55%, transparent); }
.ws-detail h3 { display: flex; align-items: center; gap: 5px; color: var(--film-dim); font-size: var(--text-xs); font-weight: 600; }
.ws-detail p { margin-top: 4px; color: var(--film-text); font-size: var(--text-xs); line-height: 1.65; }
.ws-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); }
.ws-detail--normal { border-color: color-mix(in srgb, var(--risk-low) 28%, var(--film-line)); }
.ws-detail--normal .ws-dot { background: var(--risk-low); }
.ws-detail--abnormal { border-color: color-mix(in srgb, var(--risk-mid) 32%, var(--film-line)); }
.ws-detail--abnormal .ws-dot { background: var(--risk-mid); }
.ws-detail--tip { border-color: color-mix(in srgb, var(--brand-400) 28%, var(--film-line)); }
.ws-quick { margin: 10px 12px 0; padding-top: 9px; border-top: 1px solid var(--film-line); }
.ws-quick .quick-spot-btn { background: color-mix(in srgb, var(--film-850) 60%, transparent); }
.ws-guide-link { margin: 12px; padding-top: 10px; border-top: 1px solid var(--film-line); color: var(--brand-300); font-size: var(--text-2xs); font-weight: 600; text-align: left; }

.ws-status { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 6px 12px; border-top: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-850) 86%, transparent); color: var(--film-dim); font-size: var(--text-xs); }
.ws-status span { white-space: nowrap; }

/* ── 征象图库 ─────────────────────────────────────────────── */
.section-mini-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.section-mini-title { margin-top: 3px; font-size: clamp(20px, 2.2vw, 25px); font-weight: 700; color: var(--color-text-1); }
.section-mini-desc { margin-top: 2px; font-size: var(--text-sm); color: var(--color-text-2); }
.signs-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.sign-card { display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); transition: transform var(--dur-2), box-shadow var(--dur-2); }
.sign-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }
.sign-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--border-subtle); }
.sign-image { position: relative; height: 168px; overflow: hidden; background: var(--film-bg); }
.sign-image img { width: 100%; height: 100%; object-fit: contain; }
.sign-image-tag { position: absolute; left: 6px; bottom: 6px; padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, var(--ink-950) 80%, transparent); color: var(--film-dim); font-size: var(--text-xs); }
.sign-body { display: flex; flex: 1; flex-direction: column; gap: 7px; padding: 11px 12px; }
.sign-note { padding: 7px 8px; border-radius: 6px; border: 1px solid var(--brand-200); background: var(--brand-50); }
.extension-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.extension-card { padding: 10px 11px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-card); }
.nine-step { padding: 12px; background: var(--surface-card); }
.nine-step:hover { background: var(--brand-50); }
.nine-step.is-done { background: color-mix(in srgb, var(--risk-low-soft) 70%, var(--surface-card)); }
.cap-link { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--brand-700); font-size: var(--text-xs); font-weight: 600; }
.quiz-card { background: var(--surface-card); }

@media (max-width: 1279px) {
  .ws-body { grid-template-columns: 62px minmax(0, 1fr) 300px; }
  .ws-viewport { min-height: 420px; }
  .signs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .extension-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 991px) {
  .ws-body { grid-template-columns: 1fr; }
  .film-strip { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--film-line); }
  .film-thumb { width: 66px; flex: none; }
  .ws-panel { border-left: 0; border-top: 1px solid var(--film-line); }
  .ws-viewport { min-height: 400px; }
}
@media (max-width: 767px) {
  .signs-grid, .extension-grid { grid-template-columns: 1fr; }
  .ws-center .ws-tools { gap: 4px; }
  .ws-tool--text { font-size: var(--text-xs); }
  .ws-stage { width: min(92%, 420px); }
  .ws-status { font-size: var(--text-xs); }
}
@media (prefers-reduced-motion: reduce) {
  .ws-stage { transition: none; }
}
</style>
