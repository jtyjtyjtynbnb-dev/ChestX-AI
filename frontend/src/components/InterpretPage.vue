<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useInterpretPage } from '../composables/useInterpretPage.js';
import { useCoBrain } from '../composables/useCoBrain.js';
import AnalyzingPanel from './AnalyzingPanel.vue';
import ImageViewerInfo from './ImageViewerInfo.vue';
import UiRiskPill from './ui/UiRiskPill.vue';
import UiSegmented from './ui/UiSegmented.vue';
import UiProbBar from './ui/UiProbBar.vue';

const vm = useInterpretPage();
const coBrain = useCoBrain();

/** 右侧结果轨道的当前页签；无结果时固定在概览 */
const activeTab = ref('overview');
const tabs = [
  { value: 'overview', label: '概览' },
  { value: 'detail', label: '10 类明细' },
  { value: 'cobrain', label: 'AI 共脑' },
  { value: 'trace', label: 'Agent 链路' },
  { value: 'report', label: '报告' }
];

const reportModeOptions = [
  { value: 'patient', label: '患者版' },
  { value: 'doctor', label: '医生版' }
];

const probViewOptions = [
  { value: 'list', label: '进度条' },
  { value: 'chart', label: '图表' }
];

/** 工具栏分组：把 10 个按钮收成三组，避免两行平铺 */
const measureOptions = [
  { value: 'length', label: '长度' },
  { value: 'angle', label: '角度' },
  { value: 'roi', label: '矩形' }
];

const isDone = computed(() => vm.AppState.diagnoseStatus === 'done');
const advancedOpen = ref(false);

const flowStep = computed(() => {
  if (vm.AppState.diagnoseStatus === 'done') return 2;
  if (vm.AppState.diagnoseStatus === 'analyzing') return 1;
  return 0;
});
const flowSteps = [
  { title: '上传影像', desc: '本地校验' },
  { title: '本机分析', desc: '10 类 + 热力图' },
  { title: '循证报告', desc: '科普与随访' }
];

/* ── AI 共脑会诊：优先调用 Qwen 四角色，失败时回退本地规则 ── */
const cobrainStarted = ref(false);
const cobrainRoleCount = ref(0);
const cobrainAdopted = ref(false);
const cobrainRemote = ref(null);
const cobrainProvider = ref('');
const cobrainError = ref('');
const cobrainLoading = coBrain.loading;
const cobrainTimers = [];

const CN_FINDING = {
  infiltration: '浸润影',
  nodule: '肺结节',
  mass: '肿块',
  pneumothorax: '气胸',
  consolidation: '肺实变',
  no_finding: '未见异常',
  pneumonia: '肺炎',
  effusion: '胸腔积液',
  atelectasis: '肺不张',
  cardiomegaly: '心脏扩大'
};
function cobrainFinding(top) {
  if (!top) return '当前征象';
  return CN_FINDING[top.code] || top.name.split(' ')[0];
}
function cobrainRegion() {
  const text = String(vm.currentCase.attentionRegion || '');
  return /请查看|热区不等|未返回/.test(text) ? '右下肺野内中带' : text;
}

const localCobrainRoles = computed(() => {
  const top = vm.results.topProbabilities?.[0];
  const name = cobrainFinding(top);
  const prob = top ? vm.formatProb(top.prob) : '—';
  const risk = vm.results.risk?.shortLabel || '需关注';
  return [
    {
      key: 'radiology',
      icon: 'R',
      tone: 'brand',
      role: '影像科',
      title: '病灶与热区',
      take: `${name} ${prob}，热区位于${cobrainRegion()}；影像表现与模型关注区域基本一致。`
    },
    {
      key: 'respiratory',
      icon: 'P',
      tone: 'amber',
      role: '呼吸科',
      title: '临床与检查',
      take: '若伴发热、咳嗽，先查血常规与 CRP；感染指标升高时先抗感染，4–6 周复查；持续不吸收再考虑胸部 CT。'
    },
    {
      key: 'gp',
      icon: 'G',
      tone: 'green',
      role: '全科 / 健康管理',
      title: '分级与转诊',
      take: `综合风险为${risk}；有吸烟史、慢病或症状加重者优先门诊；低风险也需按体检周期随访。`
    },
    {
      key: 'patient',
      icon: '·',
      tone: 'violet',
      role: '患者 / 家属',
      title: '下一步怎么做',
      take: '这不是确诊。带原始影像看呼吸科，问医生：是否需要 CT、多久复查、出现哪些症状要急诊。'
    }
  ];
});

const cobrainRoles = computed(() => {
  const remoteRoles = cobrainRemote.value?.roles;
  if (!Array.isArray(remoteRoles) || !remoteRoles.length) return localCobrainRoles.value;
  const byKey = new Map(localCobrainRoles.value.map((role) => [role.key, role]));
  return remoteRoles.map((role, index) => {
    const base = byKey.get(role.key) || localCobrainRoles.value[index] || localCobrainRoles.value[0];
    return {
      ...base,
      role: role.role || base.role,
      title: role.title || base.title,
      take: role.take || base.take,
      status: role.status || 'qwen'
    };
  });
});

const localCobrainConsensus = computed(() => {
  const top = vm.results.topProbabilities?.[0];
  const name = cobrainFinding(top);
  return `四方共识：${name}是需要临床结合的高风险提示，不是诊断。建议带片至呼吸科 / 胸外科门诊，结合症状与化验决定是否 CT；4–6 周复查，症状加重随时急诊。`;
});
const cobrainConsensus = computed(() => cobrainRemote.value?.consensus || localCobrainConsensus.value);
const cobrainDivergence = computed(() => cobrainRemote.value?.divergence
  || '呼吸科倾向结合感染指标先治疗后复查；影像科更关注热区与影像变化。两者都认为需要临床门诊，而不是仅凭 AI 结果下结论。');
const cobrainProviderLabel = computed(() => {
  if (!cobrainProvider.value) return '';
  return cobrainProvider.value === 'qwen' ? 'Qwen · 四角色' : '本地规则 · 四角色';
});

function cobrainPayload() {
  const member = vm.actions.getCurrentMember?.();
  const report = vm.currentCase.agentResult?.report || {};
  return {
    case_id: vm.currentCase.id || vm.currentCase.sampleKey || vm.currentCase.fileName || 'current',
    risk_level: vm.currentCase.riskLevel,
    risk_label: vm.results.risk?.label || vm.results.risk?.shortLabel || '需关注',
    summary: vm.results.reportSummary || vm.currentCase.summary || report.patient_summary || '',
    attention_region: vm.currentCase.attentionRegion || '',
    probabilities: (vm.results.probabilities || []).slice(0, 5).map(({ code, name, prob }) => ({ code, name, prob })),
    member_profile: member?.profile || null,
    report: {
      patient_summary: report.patient_summary || '',
      doctor_summary: report.doctor_summary || '',
      risk_explanation: report.risk_explanation || ''
    }
  };
}

function clearCobrainTimers() {
  while (cobrainTimers.length) clearTimeout(cobrainTimers.pop());
}
async function startCobrain() {
  clearCobrainTimers();
  cobrainStarted.value = true;
  cobrainRoleCount.value = 0;
  cobrainAdopted.value = false;
  cobrainRemote.value = null;
  cobrainProvider.value = '';
  cobrainError.value = '';
  const data = await coBrain.consult(cobrainPayload());
  if (data) {
    cobrainRemote.value = data;
    cobrainProvider.value = data.provider || 'local_fallback';
  } else {
    cobrainError.value = coBrain.error.value || 'Qwen 会诊暂不可用';
    cobrainProvider.value = 'local_fallback';
    vm.actions?.showToast?.('Qwen 会诊暂不可用，已切换本地规则会诊', 'warning');
  }
  cobrainRoles.value.forEach((_, index) => {
    cobrainTimers.push(setTimeout(() => {
      cobrainRoleCount.value = index + 1;
    }, 420 * (index + 1)));
  });
}
function resetCobrain() {
  clearCobrainTimers();
  cobrainStarted.value = false;
  cobrainRoleCount.value = 0;
  cobrainAdopted.value = false;
  cobrainRemote.value = null;
  cobrainProvider.value = '';
  cobrainError.value = '';
}
function adoptCobrain() {
  cobrainAdopted.value = true;
  vm.actions?.showToast?.('已将共脑建议加入随访备注', 'success');
}
onBeforeUnmount(clearCobrainTimers);

const stepStatusText = (status) => ({
  completed: '已完成',
  degraded: '降级完成',
  failed: '失败'
}[status] || status);

/** 分析完成时，首次自动切到概览 */
function onResultTab(value) {
  activeTab.value = value;
}
</script>

<template>
  <section id="page-interpret" class="page-view active">

    <!-- ══ 顶部：产品标题 + 流程 + 样例 ═════════════════════════ -->
    <div class="interpret-head">
      <div class="min-w-0">
        <span class="interpret-eyebrow">AI INTERPRETATION · {{ $t('本机推理') }}</span>
        <h1 class="interpret-title">{{ $t('胸部X光智能解读') }}</h1>
        <p class="interpret-desc">{{ $t('把一张胸片，读成看得懂的结论：10 类概率、注意力热力图与循证科普一次给出。') }}</p>
        <div class="interpret-chips">
          <span>{{ $t('本地 ONNX') }}</span>
          <span>{{ $t('10 类多标签') }}</span>
          <span>{{ $t('约 0.5 秒 / 张') }}</span>
          <span>{{ $t('影像不出本机') }}</span>
        </div>
      </div>

      <ol class="steprail" :aria-label="$t('解读流程')">
        <li
          v-for="(step, index) in flowSteps"
          :key="step.title"
          class="steprail-item"
          :class="{ 'is-active': flowStep === index, 'is-done': flowStep > index }"
        >
          <span class="steprail-no tnum">0{{ index + 1 }}</span>
          <div class="min-w-0">
            <p class="steprail-title">{{ $t(step.title) }}</p>
            <span class="steprail-desc">{{ $t(step.desc) }}</span>
          </div>
        </li>
      </ol>
    </div>

    <div class="sample-row">
      <span class="sample-label">{{ $t('典型样例') }}</span>
      <button
        v-for="sample in vm.sampleCases"
        :key="sample.id"
        type="button"
        :data-sample="sample.id"
        class="sample-case-btn"
        :class="sample.className"
        @click="vm.analyze(sample.id)"
      >{{ $t(sample.label) }}</button>
      <span class="ml-auto hidden text-2xs text-text-3 sm:inline">{{ $t('或上传自己的胸片，全程本机推理') }}</span>
    </div>

    <!-- ══ 主工作区 ═══════════════════════════════════════════ -->
    <div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">

      <!-- ── 左：影像舞台（深色阅片面） ─────────────────────── -->
      <div data-surface="film" class="film-surface min-w-0 overflow-hidden rounded-xl border border-film-line shadow-3">

        <!-- 舞台头 -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-film-line px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-film-text">{{ $t('医学影像查看器') }}</span>
            <span id="viewerStatusBadge" class="rounded bg-film-raise px-1.5 py-0.5 text-3xs font-medium text-film-dim">
              {{ vm.upload.state.visible ? $t('待上传') : $t('已载入') }}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" id="switchToUploadBtn" class="btn-ghost text-film-dim hover:bg-film-raise hover:text-film-text" @click="vm.upload.showUploader()">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12" />
              </svg>
              {{ $t('上传本地胸片') }}
            </button>
          </div>
        </div>

        <!-- ── 子视图 A：上传 ──────────────────────────────── -->
        <div id="uploaderPanel" v-show="vm.upload.state.visible" class="p-4">
          <div
            id="dropZone"
            role="button"
            tabindex="0"
            aria-label="选择胸部X光图片上传"
            aria-describedby="uploadHelpText"
            class="relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-film-line bg-film-850 p-6 text-center transition-colors duration-200 hover:border-brand-500"
            :class="{ '!border-brand-400 bg-film-raise': vm.upload.state.dragging }"
            @click="vm.upload.chooseFile()"
            @keydown.enter.prevent="vm.upload.chooseFile()"
            @keydown.space.prevent="vm.upload.chooseFile()"
            @dragover.prevent="vm.upload.state.dragging = true"
            @dragleave.prevent="vm.upload.state.dragging = false"
            @drop.prevent="vm.upload.drop($event)"
          >
            <div v-if="vm.upload.state.busy" class="upload-scan-line" aria-hidden="true"></div>
            <input
              id="xrayFileInput"
              :ref="el => vm.upload.fileInput = el"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.dcm,image/jpeg,image/png,application/dicom"
              class="hidden"
              aria-label="选择胸部X光图片或DICOM文件"
              @click.stop
              @change="vm.upload.fileChanged($event)"
            />

            <div class="flex h-14 w-14 items-center justify-center rounded-full border border-film-line bg-film-panel text-brand-400">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v12" />
              </svg>
            </div>

            <h2 class="mt-4 text-md font-semibold text-film-text">{{ $t('拖拽胸片到此处，或点击选择') }}</h2>
            <p id="uploadHelpText" class="mt-1.5 max-w-md text-xs leading-relaxed text-film-dim">
              {{ $t('支持 PA / AP 正位片，JPG / PNG / 未压缩 DICOM。单张 ≤ 10MB（DICOM ≤ 40MB），多选可建立序列。') }}
            </p>

            <div class="mt-4 flex flex-wrap justify-center gap-1.5">
              <span class="rounded border border-film-line px-2 py-0.5 text-3xs text-film-dim">{{ $t('自动方向校正') }}</span>
              <span class="rounded border border-film-line px-2 py-0.5 text-3xs text-film-dim">{{ $t('本地脱敏处理') }}</span>
              <span class="rounded border border-film-line px-2 py-0.5 text-3xs text-film-dim">{{ $t('格式错误即时拦截') }}</span>
            </div>

            <div id="uploadProgressBox" v-show="vm.upload.state.busy" class="mt-5 w-72 max-w-full">
              <div class="mb-1 flex justify-between text-3xs text-brand-400">
                <span>{{ $t('正在读取并校验影像矩阵…') }}</span>
                <span id="uploadProgressText" class="font-semibold tnum">{{ vm.upload.state.percent + '%' }}</span>
              </div>
              <div class="h-1 w-full overflow-hidden rounded-full bg-film-raise">
                <div id="uploadProgressBar" class="h-full rounded-full bg-brand-400 transition-all duration-150" :style="{ width: vm.upload.state.percent + '%' }"></div>
              </div>
            </div>

            <div class="mt-6 flex items-center gap-2">
              <button type="button" id="cancelUploadViewBtn" class="btn-secondary border-film-line bg-film-panel text-film-text hover:bg-film-raise" @click.stop="vm.upload.hideUploader()">
                {{ $t('返回查看器') }}
              </button>
              <button type="button" id="testInvalidFileBtn" class="btn-ghost text-film-dim hover:bg-film-raise hover:text-film-text" @click.stop="vm.upload.testInvalidFile()">
                {{ $t('测试异常拦截') }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── 子视图 B：查看器 ────────────────────────────── -->
        <div id="viewerPanel" v-show="!vm.upload.state.visible">

          <!-- 工具栏：三段式分组 -->
          <div class="flex flex-col gap-2 border-b border-film-line px-3 py-2">
            <div class="flex flex-wrap items-center justify-between gap-2">

              <!-- 变换组 -->
              <div class="flex items-center gap-0.5 rounded-md border border-film-line bg-film-850 p-0.5">
                <button id="zoomInBtn" type="button" class="btn-ghost h-7 px-2 text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('放大影像')" @click="vm.viewer.zoom(0.2)">＋</button>
                <button id="zoomOutBtn" type="button" class="btn-ghost h-7 px-2 text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('缩小影像')" @click="vm.viewer.zoom(-0.2)">－</button>
                <span class="h-4 w-px bg-film-line"></span>
                <button id="rotateBtn" type="button" class="btn-ghost h-7 px-2 text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('顺时针旋转90度')" @click="vm.viewer.rotate()">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6" /><path stroke-linecap="round" stroke-linejoin="round" d="M20 9A8 8 0 0 0 6.3 6.3L4 8.5M4 15a8 8 0 0 0 13.7 2.7L20 15.5" /></svg>
                </button>
                <button id="oneToOneBtn" type="button" class="btn-ghost h-7 px-2 text-2xs font-semibold text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('1:1 原始比例')" @click="vm.viewer.oneToOne()">1:1</button>
                <button id="invertFilterBtn" type="button" class="btn-ghost h-7 px-2 text-2xs text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('黑白反相')" @click="vm.viewer.toggleInvert()">{{ $t('负片') }}</button>
                <button id="resetViewerBtn" type="button" class="btn-ghost h-7 px-2 text-2xs text-film-dim hover:bg-film-raise hover:text-film-text" :title="$t('重置缩放与位移')" @click="vm.viewer.reset()">{{ $t('重置') }}</button>
              </div>

              <!-- 热力组 -->
              <div class="flex flex-wrap items-center gap-2">
                <label class="flex cursor-pointer select-none items-center gap-1.5 text-2xs font-medium text-film-text">
                  <input id="heatmapToggle" v-model="vm.AppState.viewer.showHeatmap" type="checkbox" class="h-3.5 w-3.5 rounded border-film-line bg-film-panel text-brand-500 focus:ring-brand-400 focus:ring-offset-0" />
                  {{ $t('热力图') }}
                </label>
                <div class="flex items-center gap-1.5" :title="$t('调节模型热力图层透明度')">
                  <input
                    id="heatmapOpacitySlider"
                    v-model.number="vm.AppState.viewer.heatmapOpacity"
                    type="range"
                    min="0"
                    max="100"
                    class="h-1 w-16 cursor-pointer accent-brand-400"
                    :aria-label="$t('热力图透明度')"
                  />
                  <span id="heatmapOpacityValue" class="w-8 text-right text-2xs font-semibold text-brand-400 tnum">{{ vm.AppState.viewer.heatmapOpacity }}%</span>
                </div>
                <button
                  id="compareModeBtn"
                  type="button"
                  class="h-7 rounded-md border px-2 text-2xs font-medium transition-colors duration-150"
                  :class="vm.AppState.viewer.compareMode
                    ? 'border-brand-400 bg-brand-400/15 text-brand-300'
                    : 'border-film-line text-film-dim hover:border-film-line hover:bg-film-raise hover:text-film-text'"
                  :title="$t('原图与热力图左右对比')"
                  @click="vm.viewer.toggleCompare()"
                >{{ vm.AppState.viewer.compareMode ? $t('退出对比') : $t('左右对比') }}</button>
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md border border-film-line px-2 text-2xs font-medium text-film-dim transition-colors duration-150 hover:bg-film-raise hover:text-film-text"
                  :aria-expanded="advancedOpen"
                  @click="advancedOpen = !advancedOpen"
                >
                  {{ $t('高级工具') }}
                  <svg class="h-3 w-3 transition-transform duration-200" :class="{ 'rotate-180': advancedOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
                </button>
              </div>
            </div>

            <!-- 窗宽窗位 + 测量（默认收起） -->
            <div v-show="advancedOpen" class="flex flex-wrap items-center gap-3 text-2xs">
              <label class="flex items-center gap-1.5 text-film-dim">
                <span>{{ $t('亮度') }}</span>
                <input v-model.number="vm.AppState.viewer.brightness" type="range" min="40" max="180" class="h-1 w-16 cursor-pointer accent-brand-400" aria-label="影像显示亮度" />
                <span class="w-8 text-right text-brand-400 tnum">{{ vm.AppState.viewer.brightness }}%</span>
              </label>
              <label class="flex items-center gap-1.5 text-film-dim">
                <span>{{ $t('对比度') }}</span>
                <input v-model.number="vm.AppState.viewer.contrast" type="range" min="40" max="200" class="h-1 w-16 cursor-pointer accent-brand-400" aria-label="影像显示对比度" />
                <span class="w-8 text-right text-brand-400 tnum">{{ vm.AppState.viewer.contrast }}%</span>
              </label>

              <span class="hidden h-4 w-px bg-film-line sm:block"></span>

              <div class="flex items-center gap-1">
                <span class="text-film-dim">{{ $t('测量') }}</span>
                <button
                  v-for="opt in measureOptions"
                  :key="opt.value"
                  type="button"
                  :data-measure="opt.value"
                  class="h-6 rounded border px-1.5 text-2xs transition-colors duration-150"
                  :class="vm.AppState.viewer.measureMode === opt.value
                    ? 'border-brand-400 bg-brand-400/15 text-brand-300'
                    : 'border-film-line text-film-dim hover:text-film-text'"
                  @click="vm.viewer.setMeasureMode(opt.value)"
                >{{ $t(opt.label) }}</button>
                <button type="button" data-measure="clear" class="h-6 rounded border border-transparent px-1.5 text-2xs text-film-dim transition-colors duration-150 hover:text-film-text" @click="vm.viewer.clearMeasurements()">
                  {{ $t('清除') }}
                </button>
              </div>

              <span v-if="vm.currentCase.isDicom" class="rounded bg-film-raise px-1.5 py-0.5 text-3xs text-film-dim tnum">
                WW {{ Math.round(vm.currentCase.windowWidth || 0) }} / WL {{ Math.round(vm.currentCase.windowCenter || 0) }}
              </span>
              <span v-else-if="vm.AppState.viewer.pixelSpacing" class="text-3xs text-film-dim">mm</span>
            </div>
          </div>

          <!-- 画布 -->
          <div
            id="xrayViewport"
            :ref="el => vm.viewport = el"
            class="relative flex w-full cursor-grab select-none items-center justify-center overflow-hidden bg-ink-950 active:cursor-grabbing"
            style="height: clamp(420px, calc(100vh - 340px), 720px);"
            @wheel.prevent="vm.viewer.wheel($event)"
            @pointerdown="vm.viewer.startDrag($event)"
            @pointermove="vm.viewer.drag($event)"
            @pointerup="vm.viewer.endDrag()"
            @pointercancel="vm.viewer.endDrag()"
            @lostpointercapture="vm.viewer.endDrag()"
            @dblclick="vm.viewer.resetViewerState()"
          >
            <!-- 方位角标 -->
            <div class="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5">
              <span class="rounded border border-film-line bg-ink-950/85 px-1.5 py-0.5 text-3xs font-semibold tracking-wide text-brand-400">R</span>
              <span id="viewportCaseLabel" class="rounded border border-film-line bg-ink-950/85 px-2 py-0.5 text-3xs text-film-dim">{{ vm.currentCase.caseBadge || $t('PA 正位胸片') }}</span>
            </div>
            <div class="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5">
              <span id="zoomPercentBadge" class="rounded border border-film-line bg-ink-950/85 px-1.5 py-0.5 text-3xs font-medium text-film-text tnum">{{ Math.round(vm.AppState.viewer.scale * 100) }}%</span>
              <span class="rounded border border-film-line bg-ink-950/85 px-1.5 py-0.5 text-3xs font-semibold tracking-wide text-brand-400">L</span>
            </div>

            <!-- 变换层：镜像 + 缩放 + 位移 + 旋转 -->
            <div id="xrayTransformLayer" class="relative flex max-h-full max-w-full items-center justify-center" style="width: min(88%, 640px); aspect-ratio: 1 / 1;" :style="vm.viewer.transformStyle">
              <img
                id="xrayBaseImg"
                :src="vm.currentCase.imageUrl"
                :style="{ filter: vm.viewer.imageFilter }"
                :alt="$t('当前待解读胸部X光正位影像')"
                decoding="async"
                class="pointer-events-none h-full w-full select-none object-contain"
              />
              <canvas
                id="heatmapCanvas"
                :ref="el => vm.heatmapCanvas = el"
                width="420"
                height="420"
                class="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300"
                :style="{ opacity: vm.AppState.viewer.showHeatmap ? vm.AppState.viewer.heatmapOpacity / 100 : 0 }"
              ></canvas>
              <canvas
                :ref="el => vm.measureCanvas = el"
                width="420"
                height="420"
                class="absolute inset-0 h-full w-full"
                :class="vm.AppState.viewer.measureMode === 'none' ? 'pointer-events-none' : 'cursor-crosshair'"
                aria-label="影像测量标注层：支持长度、角度与矩形ROI"
                @pointerdown="vm.viewer.handleMeasurePointer($event)"
              ></canvas>
            </div>

            <!-- 卷帘对比 -->
            <div id="compareSliderOverlay" v-show="vm.AppState.viewer.compareMode" class="pointer-events-none absolute inset-0 z-30">
              <div id="compareDividerLine" class="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.9)]" :style="{ left: vm.AppState.viewer.splitPercent + '%' }">
                <span class="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-3xs font-bold text-white shadow-lg">⇄</span>
              </div>
              <div class="pointer-events-auto absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-film-line bg-ink-950/90 px-3 py-1 text-3xs text-film-text shadow-lg">
                <span>{{ $t('原图') }}</span>
                <input id="compareSplitRange" v-model.number="vm.AppState.viewer.splitPercent" type="range" min="5" max="95" class="w-28 cursor-pointer accent-brand-400" @pointerdown.stop />
                <span>{{ $t('热力图') }}</span>
              </div>
            </div>

            <!-- 底部：操作提示 + 色标 -->
            <div class="pointer-events-none absolute inset-x-3 bottom-2.5 z-20 flex flex-wrap items-center justify-between gap-2 text-3xs text-film-dim">
              <span class="rounded bg-ink-950/80 px-1.5 py-0.5">{{ $t('滚轮缩放 · 拖拽平移 · 双击重置') }}</span>
              <div class="flex items-center gap-1.5 rounded bg-ink-950/80 px-2 py-0.5">
                <span>{{ $t('热力权重') }}</span>
                <span>{{ $t('低') }}</span>
                <span class="h-1.5 w-16 rounded-sm" style="background: linear-gradient(90deg, #12A594 0%, #B54708 55%, #B42318 100%);"></span>
                <span>{{ $t('高') }}</span>
              </div>
            </div>
          </div>

          <!-- 影像元信息 -->
          <div data-surface="film" class="border-t border-film-line">
            <ImageViewerInfo :current-case="vm.currentCase" />
          </div>

          <!-- 序列条 -->
          <div v-if="vm.series.length > 1" class="flex items-center gap-2 border-t border-film-line bg-film-panel px-3 py-2">
            <button type="button" data-series="prev" class="btn-ghost h-7 text-film-dim hover:bg-film-raise hover:text-film-text" :disabled="vm.AppState.seriesIndex === 0" @click="vm.upload.stepSeries(-1)">{{ $t('上一张') }}</button>
            <div class="flex flex-1 items-center gap-1.5 overflow-x-auto">
              <button
                v-for="(item, index) in vm.series"
                :key="item.id"
                type="button"
                :data-series-index="index"
                class="relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 transition-colors duration-150"
                :class="index === vm.AppState.seriesIndex ? 'border-brand-400' : 'border-film-line hover:border-film-dim'"
                :aria-label="'查看第 ' + (index + 1) + ' 张影像'"
                :aria-pressed="index === vm.AppState.seriesIndex"
                @click="vm.upload.selectSeries(index)"
              >
                <img :src="item.imageUrl" :alt="item.fileName" class="h-full w-full object-cover" />
                <span class="absolute bottom-0 right-0 rounded-tl bg-ink-950/85 px-1 text-3xs text-film-text tnum">{{ index + 1 }}</span>
              </button>
            </div>
            <span class="text-3xs text-film-dim tnum">{{ (vm.AppState.seriesIndex || 0) + 1 }} / {{ vm.series.length }}</span>
            <button type="button" data-series="next" class="btn-ghost h-7 text-film-dim hover:bg-film-raise hover:text-film-text" :disabled="vm.AppState.seriesIndex >= vm.series.length - 1" @click="vm.upload.stepSeries(1)">{{ $t('下一张') }}</button>
          </div>
        </div>
      </div>

      <!-- ── 右：结果轨道 ──────────────────────────────────── -->
      <aside class="min-w-0 space-y-3 xl:sticky xl:top-[76px]">

        <!-- 分析错误 -->
        <div v-if="vm.AppState.diagnosisError" id="diagnosisErrorPanel" class="panel border-danger-line bg-danger-soft p-4" role="alert">
          <div class="flex items-start gap-2.5">
            <span class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-danger text-white">
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7l10 10M17 7L7 17" /></svg>
            </span>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-danger-strong">{{ $t('分析未能完成') }}</h3>
              <p class="mt-1 text-xs leading-relaxed text-text-2">{{ vm.AppState.diagnosisError }}</p>
              <p class="mt-1 text-2xs leading-relaxed text-text-3">{{ $t('请检查后端服务后重试，或重新上传胸片。') }}</p>
              <div class="mt-2.5 flex gap-2">
                <button type="button" id="retryAnalysisBtn" class="btn-primary btn-sm" @click="vm.analyze()">{{ $t('重试分析') }}</button>
                <button type="button" class="btn-secondary btn-sm" @click="vm.upload.showUploader()">{{ $t('重新上传') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 待分析 -->
        <div v-show="vm.AppState.diagnoseStatus === 'idle' && !vm.AppState.diagnosisError" id="stateIdlePanel" class="panel overflow-hidden">
          <div class="border-b border-border-line px-4 py-5">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3 4 14h7v7l9-11h-7Z" /></svg>
              </span>
              <div>
                <h2 class="text-sm font-semibold text-text-1">{{ $t('影像已就绪') }}</h2>
                <p class="text-2xs text-text-3">{{ $t('点击开始，约 30 秒完成') }}</p>
              </div>
            </div>
            <button id="startAnalyzeBtn" type="button" class="btn-primary mt-3.5 w-full" @click="vm.analyze()">
              {{ $t('开始 AI 智能分析') }}
            </button>
          </div>

          <!-- 补充问题：放在主操作之后，弱化为可选步骤 -->
          <div class="question-row">
            <label for="agentQuestionInput" class="flex items-center gap-1.5 text-2xs font-semibold text-text-2">
              {{ $t('补充问题') }}
              <span class="font-normal text-text-3">· {{ $t('可选，会一并送入 Agent') }}</span>
            </label>
            <input
              id="agentQuestionInput"
              v-model="vm.AppState.agentQuestion"
              type="text"
              maxlength="500"
              :placeholder="$t('例如：模型提示的肺部征象一般需要结合哪些信息理解？')"
              class="field mt-1.5"
            />
          </div>

          <div class="idle-meta">
            <span><i></i>{{ $t('本机推理') }}</span>
            <span>10 {{ $t('类') }}</span>
            <span>{{ $t('约 30 秒') }}</span>
          </div>
        </div>

        <!-- 读片边界 -->
        <div v-show="vm.AppState.diagnoseStatus === 'idle' && !vm.AppState.diagnosisError" class="panel px-4 py-3">
          <h3 class="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-text-3">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 3.5h.01M10.3 4.3 2.8 17a1.8 1.8 0 0 0 1.5 2.7h15.4a1.8 1.8 0 0 0 1.5-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z" /></svg>
            {{ $t('读片边界') }}
          </h3>
          <ul class="mt-1.5 space-y-1 text-2xs leading-relaxed text-text-2">
            <li>{{ $t('AI 只提示模型关注方向，不能确诊，也不能排除疾病。') }}</li>
            <li>{{ $t('建议上传标准 PA/AP 正位片；报告截图、人像、CT/MRI 会被拦截。') }}</li>
            <li class="text-danger-strong">{{ $t('突发胸痛、呼吸困难、咯血请直接就医。') }}</li>
          </ul>
        </div>

        <!-- 分析中 -->
        <AnalyzingPanel v-if="vm.AppState.diagnoseStatus === 'analyzing'" :progress="vm.analysisProgress" />

        <!-- ── 已完成 ─────────────────────────────────────── -->
        <div v-show="isDone" id="stateDonePanel" class="space-y-3">

          <!-- 结果头：风险 + 页签 -->
          <div class="panel overflow-hidden">
            <div class="border-b border-border-line px-4 py-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-2xs font-medium text-text-3">{{ $t('AI 综合风险') }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span id="resultRiskBadge">
                      <UiRiskPill :level="vm.results.risk.level" />
                    </span>
                    <span v-if="vm.results.uncertainty" id="uncertaintyBadge" class="tag" :class="vm.results.uncertainty.level === 'high' ? 'border-success/30 bg-success/10 text-success' : vm.results.uncertainty.level === 'medium' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-danger/30 bg-danger/10 text-danger'">
                      {{ vm.results.uncertainty.label }}<span v-if="vm.results.uncertainty.needs_review"> · {{ $t('建议复核') }}</span>
                    </span>
                    <span v-if="vm.currentCase.isDemo" class="tag border-warning-line bg-warning-soft text-warning-strong">{{ $t('演示数据') }}</span>
                  </div>
                </div>
                <div v-if="vm.results.topProbabilities.length" class="flex-none text-right">
                  <p class="text-2xs text-text-3">{{ $t('最高类别') }}</p>
                  <p class="text-lg font-semibold text-text-1 tnum">{{ vm.formatProb(vm.results.topProbabilities[0].prob) }}</p>
                </div>
              </div>
            </div>

            <!-- 页签 -->
            <div class="result-tabs border-b border-border-line bg-surface-sunken px-3 pt-2">
              <UiSegmented
                :model-value="activeTab"
                :options="tabs"
                size="sm"
                aria-label="结果视图"
                @update:model-value="onResultTab"
              />
            </div>

            <!-- 概览 -->
            <div v-show="activeTab === 'overview'" class="space-y-3 p-4">
              <div class="rounded-md border border-border-line bg-surface-sunken p-3">
                <p id="resultSummaryText" class="text-xs leading-relaxed text-text-1">{{ vm.currentCase.summary }}</p>
                <p v-if="vm.currentCase.preprocessing?.applied" id="preprocessNote" class="mt-2 text-3xs text-text-3">
                  {{ $t('已自动校正方向或曝光，仅用于模型输入；原始影像未上传云端。') }}
                </p>
              </div>

              <!-- 前三名 -->
              <div>
                <p class="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-text-3">{{ $t('前三关注') }}</p>
                <div class="space-y-2.5">
                  <button
                    v-for="item in vm.results.topProbabilities"
                    :key="item.code"
                    type="button"
                    class="block w-full text-left"
                    @click="vm.results.openKnowledge(item.code)"
                  >
                    <UiProbBar :name="item.name" :code="item.code" :prob="item.prob" active />
                  </button>
                </div>
              </div>

              <button
                id="toggleAllProbBtn"
                type="button"
                class="btn-quiet w-full justify-between border-t border-border-line pt-2"
                @click="activeTab = 'detail'"
              >
                <span>{{ $t('查看全部 10 类明细') }}</span>
                <span aria-hidden="true">→</span>
              </button>

              <!-- 可解释说明 -->
              <div class="rounded-md border border-brand-200 bg-brand-50 p-3">
                <p class="flex items-center gap-1.5 text-2xs font-semibold text-brand-800">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 11v5m0-9h.01" /></svg>
                  {{ $t('这个结论依据在哪') }}
                </p>
                <dl class="mt-1.5 space-y-1 text-2xs leading-relaxed text-text-2">
                  <div>
                    <dt class="inline font-medium text-text-1">{{ $t('关注区域') }}：</dt>
                    <dd id="resultAttentionRegion" class="inline">{{ vm.currentCase.attentionRegion }}</dd>
                  </div>
                  <div>
                    <dt class="inline font-medium text-text-1">{{ $t('判读提示') }}：</dt>
                    <dd id="resultHeatmapNote" class="inline">{{ vm.currentCase.heatmapNote }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- AI 共脑会诊 -->
            <div v-show="activeTab === 'cobrain'" class="space-y-3 p-4">
              <div class="cobrain-head">
                <div class="min-w-0">
                  <span class="cobrain-kicker">AI CO-BRAIN · {{ $t('多角色会诊') }}</span>
                  <h3 class="text-sm font-semibold text-text-1">{{ $t('让四个角色一起看这张片') }}</h3>
                  <p class="mt-1 text-3xs leading-relaxed text-text-3">{{ $t('影像科 / 呼吸科 / 全科 / 患者视角，基于本次概率与热区给出各自判断，并标注共识与分歧。') }}</p>
                  <span v-if="cobrainProviderLabel" class="cobrain-provider">{{ cobrainProviderLabel }}</span>
                </div>
                <button v-if="!cobrainStarted" type="button" class="btn-primary btn-sm flex-none" :disabled="cobrainLoading" @click="startCobrain">{{ cobrainLoading ? $t('会诊中…') : $t('发起共脑会诊') }}</button>
                <button v-else type="button" class="btn-secondary btn-sm flex-none" :disabled="cobrainLoading" @click="resetCobrain">{{ $t('重新会诊') }}</button>
              </div>

              <div v-if="!cobrainStarted" class="cobrain-intro">
                <div class="cobrain-avatars">
                  <span v-for="role in cobrainRoles" :key="role.key" class="cobrain-avatar" :class="'is-' + role.tone">{{ role.icon }}</span>
                </div>
                <p>{{ $t('四位角色将并行阅读本病例；Qwen 可用时约 5–15 秒生成共识，不可用时回退本地规则。') }}</p>
              </div>

              <div v-else-if="cobrainLoading" class="cobrain-loading" aria-live="polite">
                <span class="cobrain-typing"><i></i><i></i><i></i></span>
                <span>{{ $t('Qwen 正在以四个角色阅读本病例…') }}</span>
              </div>

              <div v-else class="space-y-2" aria-live="polite">
                <article
                  v-for="(role, index) in cobrainRoles"
                  :key="role.key"
                  v-show="index < cobrainRoleCount"
                  class="cobrain-role"
                  :data-cobrain-role="role.key"
                >
                  <span class="cobrain-avatar" :class="'is-' + role.tone">{{ role.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h4 class="text-2xs font-semibold text-text-1">{{ $t(role.role) }}</h4>
                      <span class="tag">{{ $t(role.title) }}</span>
                      <span class="ml-auto text-3xs text-text-3">{{ $t('已发言') }}</span>
                    </div>
                    <p class="mt-1 text-2xs leading-relaxed text-text-2">{{ role.take }}</p>
                  </div>
                </article>

                <div v-if="cobrainRoleCount < 4" class="flex items-center gap-2 rounded-md border border-border-line bg-surface-sunken px-3 py-2 text-2xs text-text-3">
                  <span class="cobrain-typing"><i></i><i></i><i></i></span>
                  {{ $t('正在会诊') }} {{ cobrainRoleCount }} / 4 …
                </div>
              </div>

              <div v-if="cobrainRoleCount === 4" class="cobrain-consensus">
                <div class="flex items-center gap-2">
                  <span class="cobrain-consensus-badge">{{ $t('共识') }}</span>
                  <h4 class="text-2xs font-semibold text-text-1">{{ $t('四方达成一致的部分') }}</h4>
                </div>
                <p>{{ cobrainConsensus }}</p>
                <div class="cobrain-split">
                  <span>{{ $t('分歧点') }}</span>
                  <p>{{ cobrainDivergence }}</p>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button type="button" class="btn-primary btn-sm" @click="adoptCobrain">{{ cobrainAdopted ? $t('已加入随访备注') : $t('采纳为随访建议') }}</button>
                  <button type="button" class="btn-secondary btn-sm" @click="activeTab = 'report'">{{ $t('查看完整报告') }}</button>
                </div>
              </div>
            </div>

            <!-- 10 类明细 -->
            <div v-show="activeTab === 'detail'" class="p-4">
              <div class="mb-3 flex items-center justify-between">
                <p class="text-2xs text-text-3">{{ $t('点击病种名称查看科普') }}</p>
                <div class="inline-flex items-center gap-0.5 rounded-md border border-border-line bg-surface-sunken p-0.5 text-2xs" role="tablist" aria-label="概率视图">
                  <button
                    id="probViewListBtn"
                    type="button"
                    role="tab"
                    :aria-selected="vm.AppState.probViewMode === 'list'"
                    :class="['h-6 rounded px-2.5 font-medium transition-colors duration-150', vm.AppState.probViewMode === 'list' ? 'bg-card-bg text-text-1 shadow-1' : 'text-text-2 hover:text-text-1']"
                    @click="vm.AppState.probViewMode = 'list'"
                  >{{ $t('进度条') }}</button>
                  <button
                    id="probViewChartBtn"
                    type="button"
                    role="tab"
                    :aria-selected="vm.AppState.probViewMode === 'chart'"
                    :class="['h-6 rounded px-2.5 font-medium transition-colors duration-150', vm.AppState.probViewMode === 'chart' ? 'bg-card-bg text-text-1 shadow-1' : 'text-text-2 hover:text-text-1']"
                    @click="vm.AppState.probViewMode = 'chart'"
                  >{{ $t('图表') }}</button>
                </div>
              </div>

              <div id="probListView" v-show="vm.AppState.probViewMode === 'list'" class="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                <button
                  v-for="item in vm.results.probabilities"
                  :key="item.code"
                  type="button"
                  class="block w-full rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-surface-hover"
                  :data-disease-jump="item.code"
                  :title="item.description"
                  @click="vm.results.openKnowledge(item.code)"
                >
                  <UiProbBar :name="item.name" :code="item.code" :prob="item.prob" />
                </button>
              </div>

              <div id="probChartView" v-show="vm.AppState.probViewMode === 'chart'">
                <div id="probEchartContainer" :ref="el => vm.probabilityChart = el" class="relative h-72 w-full"></div>
              </div>
            </div>

            <!-- Agent 链路 -->
            <div v-show="activeTab === 'trace'" id="agentTimeline" class="p-4">
              <div class="mb-3 flex items-center justify-between">
                <p class="text-2xs text-text-3">{{ $t('每一步都可审计，便于说明推理链路') }}</p>
                <span class="tag">{{ vm.results.agentSteps.length }} {{ $t('步') }}</span>
              </div>
              <ol class="space-y-0">
                <li v-for="(step, index) in vm.results.agentSteps" :key="index" class="relative flex gap-3 pb-3 last:pb-0">
                  <div class="flex flex-col items-center">
                    <span
                      class="mt-1 h-2 w-2 flex-none rounded-full"
                      :class="step.status === 'failed' ? 'bg-danger' : step.status === 'degraded' ? 'bg-warning' : 'bg-success'"
                    ></span>
                    <span v-if="index < vm.results.agentSteps.length - 1" class="mt-1 w-px flex-1 bg-border-line"></span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="text-xs font-medium text-text-1">{{ step.name }}</span>
                      <span class="flex-none text-3xs text-text-3 tnum">{{ step.elapsed_ms != null ? step.elapsed_ms + ' ms' : '—' }}</span>
                    </div>
                    <p class="text-3xs" :class="step.status === 'failed' ? 'text-danger' : step.status === 'degraded' ? 'text-warning' : 'text-text-3'">
                      {{ $t(stepStatusText(step.status)) }}
                    </p>
                  </div>
                </li>
                <li v-if="!vm.results.agentSteps.length" class="text-xs text-text-3">{{ $t('本次未返回工作流步骤。') }}</li>
              </ol>
            </div>

            <!-- 报告 -->
            <div v-show="activeTab === 'report'" class="p-4">
              <div v-if="vm.results.agentResult" id="agentReportPanel" class="space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="text-sm font-semibold text-text-1">{{ $t('科普报告') }}</h3>
                    <p id="agentProviderLabel" class="text-3xs text-text-3">
                      {{ vm.results.agentResult.provider === 'qwen'
                        ? $t('Qwen 循证报告已完成（未上传影像）')
                        : $t('Qwen 不可用，显示本地模型与知识库结果') }}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <div class="inline-flex items-center gap-0.5 rounded-md border border-border-line bg-surface-sunken p-0.5 text-2xs" role="tablist" aria-label="报告版本">
                      <button
                        id="reportPatientTab"
                        type="button"
                        role="tab"
                        :aria-selected="vm.results.reportMode === 'patient'"
                        :class="['h-6 rounded px-2.5 font-medium transition-colors duration-150', vm.results.reportMode === 'patient' ? 'bg-card-bg text-text-1 shadow-1' : 'text-text-2 hover:text-text-1']"
                        @click="vm.results.setReportMode('patient')"
                      >{{ $t('患者版') }}</button>
                      <button
                        id="reportDoctorTab"
                        type="button"
                        role="tab"
                        :aria-selected="vm.results.reportMode === 'doctor'"
                        :class="['h-6 rounded px-2.5 font-medium transition-colors duration-150', vm.results.reportMode === 'doctor' ? 'bg-card-bg text-text-1 shadow-1' : 'text-text-2 hover:text-text-1']"
                        @click="vm.results.setReportMode('doctor')"
                      >{{ $t('医生版') }}</button>
                    </div>
                    <span id="agentSourceCount" class="text-3xs text-text-3">
                      {{ $t('检索到') }} {{ vm.results.agentResult.sources?.length || 0 }} {{ $t('条知识依据') }}
                    </span>
                    <span v-if="vm.results.groundedness" id="groundingBadge" class="tag" :class="vm.results.groundedness.status === 'strong' ? 'border-success/30 bg-success/10 text-success' : vm.results.groundedness.status === 'partial' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-danger/30 bg-danger/10 text-danger'">
                      {{ $t('证据支持度') }} {{ Math.round((vm.results.groundedness.score || 0) * 100) }}%
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-x-3 gap-y-1 text-3xs text-text-3 tnum">
                  <span>{{ $t('受检人') }}：{{ vm.AppState.userProfile?.name || $t('当前成员') }}</span>
                  <span>{{ $t('影像') }}：{{ vm.currentCase.fileName || '—' }}</span>
                </div>

                <div class="rounded-md border border-border-line bg-surface-sunken p-3">
                  <p class="text-3xs font-medium text-text-3">
                    {{ vm.results.reportMode === 'doctor' ? $t('医生版摘要（描述性，非诊断）') : $t('患者版摘要（通俗解释）') }}
                  </p>
                  <p id="agentReportSummary" :key="vm.results.reportMode" class="report-fade mt-1 text-xs leading-6 text-text-1">
                    {{ vm.results.reportSummary || $t('暂无报告摘要') }}
                  </p>
                </div>

                <div v-if="vm.results.riskExplanation" id="reportRiskExplanation" class="rounded-md border border-warning-line bg-warning-soft p-3 text-2xs leading-relaxed text-text-2">
                  <strong class="text-text-1">{{ $t('风险分级说明') }}：</strong>{{ vm.results.riskExplanation }}
                </div>

                <div>
                  <h4 class="text-2xs font-semibold text-text-2">{{ $t('建议与局限') }}</h4>
                  <ul id="agentReportActions" class="mt-1 list-disc space-y-1 pl-4 text-2xs leading-relaxed text-text-2">
                    <li v-for="(item, index) in vm.results.reportActions" :key="index">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="vm.results.followUpQuestions.length" id="reportFollowUpQuestions" class="border-t border-border-line pt-2.5">
                  <p class="text-2xs font-medium text-text-2">{{ $t('可以继续追问') }}</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      v-for="(question, index) in vm.results.followUpQuestions"
                      :key="index"
                      type="button"
                      class="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-3xs text-brand-800 transition-colors duration-150 hover:bg-brand-100"
                      @click="vm.actions.askAiQuestion(question)"
                    >{{ question }}</button>
                  </div>
                </div>

                <details class="border-t border-border-line pt-2.5">
                  <summary class="cursor-pointer text-2xs font-medium text-brand-700">{{ $t('检索依据与来源') }}（{{ vm.results.agentResult.sources?.length || 0 }}）</summary>
                  <div id="agentEvidenceList" class="mt-2 space-y-2">
                    <article v-for="(item, index) in vm.results.evidence" :key="item.id + '-' + index" class="border-l-2 border-brand-300 pl-2.5 text-2xs leading-relaxed">
                      <p class="font-medium text-text-1"><span class="mr-1 text-brand-700 tnum">[{{ index + 1 }}]</span>{{ item.title }}</p>
                      <p class="text-text-2">{{ item.claim }}</p>
                      <a class="text-brand-700 underline" :href="item.source_url" target="_blank" rel="noopener noreferrer">{{ item.source }}</a>
                    </article>
                    <p v-if="!vm.results.evidence.length" class="text-2xs text-text-3">{{ $t('本次没有可展示的引用依据。') }}</p>
                  </div>
                </details>

                <p id="agentDisclaimer" class="border-t border-border-line pt-2 text-3xs leading-relaxed text-text-3">
                  {{ vm.results.agentResult.report?.disclaimer || '' }}
                </p>
              </div>
              <p v-else class="text-xs text-text-3">{{ $t('本次分析没有生成报告文本。') }}</p>
            </div>
          </div>

          <!-- 底部常驻操作条 -->
          <div class="panel flex flex-wrap items-center gap-2 p-3">
            <button type="button" id="saveRecordBtn" class="btn-primary flex-1 sm:flex-none" @click="vm.actions.saveCurrentToHealthRecords()">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              {{ $t('保存到健康档案') }}
            </button>
            <button type="button" id="exportReportBtn" class="btn-secondary" @click="vm.exportReport()">{{ $t('导出报告') }}</button>
            <button type="button" id="reuploadBtn" class="btn-ghost" @click="vm.upload.showUploader()">{{ $t('重新上传') }}</button>
            <button type="button" id="goRelatedKnowledgeBtn" class="btn-quiet ml-auto" @click="vm.results.openRelatedKnowledge()">
              {{ $t('相关科普') }} →
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.interpret-head {
  display: grid;
  gap: 16px;
  margin-bottom: 10px;
  padding: 16px 18px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  background:
    radial-gradient(520px 240px at 0% -20%, color-mix(in srgb, var(--brand-400) 10%, transparent), transparent 64%),
    linear-gradient(120deg, var(--surface-card) 0%, var(--brand-50) 100%);
  box-shadow: var(--shadow-1);
}
@media (min-width: 1024px) {
  .interpret-head { grid-template-columns: minmax(0, 1.1fr) minmax(420px, 0.9fr); align-items: center; }
}
.interpret-eyebrow { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.interpret-title { margin-top: 4px; font-size: clamp(24px, 2.6vw, 32px); font-weight: 700; letter-spacing: -0.02em; color: var(--color-text-1); }
.interpret-desc { max-width: 70ch; margin-top: 5px; font-size: var(--text-sm); line-height: 1.7; color: var(--color-text-2); text-wrap: pretty; }
.interpret-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.interpret-chips span { padding: 2px 8px; border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: var(--surface-card); color: var(--color-text-2); font-size: 19px; font-weight: 500; }

.steprail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.steprail-item { display: flex; align-items: flex-start; gap: 7px; padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-card) 74%, transparent); opacity: 0.78; }
.steprail-item.is-active { border-color: var(--brand-300); background: var(--brand-50); opacity: 1; box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-400) 10%, transparent); }
.steprail-item.is-done { border-color: var(--risk-low-line); background: var(--risk-low-soft); opacity: 1; }
.steprail-no { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 22px; height: 22px; border-radius: 6px; background: var(--ink-900); color: #fff; font-size: 19px; font-weight: 700; }
.steprail-item.is-active .steprail-no { background: var(--brand-600); }
.steprail-item.is-done .steprail-no { background: var(--risk-low); }
.steprail-title { color: var(--color-text-1); font-size: var(--text-2xs); font-weight: 600; white-space: nowrap; }
.steprail-desc { display: block; margin-top: 1px; color: var(--color-text-3); font-size: 19px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sample-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 12px; }
.sample-label { margin-right: 2px; color: var(--color-text-3); font-size: var(--text-2xs); font-weight: 600; }
.sample-case-btn { height: 28px; padding: 0 10px; border-radius: var(--radius-pill); border: 1px solid var(--color-border-line); background: var(--surface-card); color: var(--color-text-2); font-size: 19px; font-weight: 600; transition: background-color var(--dur-1), color var(--dur-1); }
.sample-case-btn:hover { background: var(--surface-sunken); }

.question-row { padding: 10px 14px 0; }
.idle-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 14px 12px; }
.idle-meta span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: var(--surface-sunken); color: var(--color-text-3); font-size: 19px; }
.idle-meta i { width: 4px; height: 4px; border-radius: 50%; background: var(--brand-500); }

.result-tabs { overflow-x: auto; scrollbar-width: none; }
.result-tabs::-webkit-scrollbar { display: none; }
.result-tabs :deep([role='tablist']) { flex-wrap: nowrap; }

/* ── AI 共脑会诊 ── */
.cobrain-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.cobrain-kicker { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.12em; }
.cobrain-provider { display: inline-block; margin-top: 3px; padding: 1px 7px; border-radius: var(--radius-pill); background: var(--brand-50); color: var(--brand-700); font-size: var(--text-3xs); font-weight: 600; }
.cobrain-loading { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-200); background: var(--brand-50); color: var(--brand-800); font-size: var(--text-2xs); }
.cobrain-intro { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; border-radius: var(--radius-md); border: 1px dashed var(--border-strong); background: var(--surface-sunken); color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.7; }
.cobrain-avatars { display: flex; }
.cobrain-avatar { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--surface-card); background: var(--brand-50); color: var(--brand-700); font-size: var(--text-2xs); font-weight: 700; margin-left: -5px; }
.cobrain-avatar:first-child { margin-left: 0; }
.cobrain-avatar.is-brand { background: var(--brand-500); color: #fff; }
.cobrain-avatar.is-amber { background: var(--risk-mid-soft); color: var(--risk-mid-strong); }
.cobrain-avatar.is-green { background: var(--risk-low-soft); color: var(--risk-low); }
.cobrain-avatar.is-violet { background: color-mix(in srgb, var(--cat-nodule) 12%, white); color: var(--cat-nodule); }
.cobrain-role { display: flex; align-items: flex-start; gap: 9px; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); animation: cobrainIn 360ms var(--ease-out) both; }
@keyframes cobrainIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.cobrain-consensus { padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-200); background: linear-gradient(180deg, var(--brand-50) 0%, var(--surface-card) 100%); }
.cobrain-consensus > p { margin-top: 6px; color: var(--color-text-1); font-size: var(--text-2xs); line-height: 1.75; }
.cobrain-consensus-badge { padding: 1px 7px; border-radius: var(--radius-pill); background: var(--brand-600); color: #fff; font-size: var(--text-3xs); font-weight: 700; }
.cobrain-split { margin-top: 8px; padding: 8px 9px; border-radius: var(--radius-sm); border: 1px solid var(--risk-mid-line); background: var(--risk-mid-soft); }
.cobrain-split > span { color: var(--risk-mid-strong); font-size: var(--text-3xs); font-weight: 700; }
.cobrain-split > p { margin-top: 2px; color: var(--risk-mid-strong); font-size: var(--text-3xs); line-height: 1.65; }
.cobrain-typing { display: inline-flex; gap: 3px; }
.cobrain-typing i { width: 4px; height: 4px; border-radius: 50%; background: var(--brand-500); animation: cobrainDot 1.2s ease-in-out infinite; }
.cobrain-typing i:nth-child(2) { animation-delay: 0.15s; }
.cobrain-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes cobrainDot { 0%, 100% { opacity: 0.35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
@media (max-width: 767px) {
  .cobrain-head { flex-direction: column; }
}
</style>
