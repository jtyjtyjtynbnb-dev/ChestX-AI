<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';

const { actions } = useAppContext();
const open = ref(false);
const active = ref(0);
const completed = ref([]);
const STORAGE_KEY = 'chestx-demo-guide-progress-v1';

const steps = [
  {
    id: 'start',
    eyebrow: '01 · 入口',
    title: '从一张样例胸片开始',
    time: '约 1 分钟',
    page: 'interpret',
    action: 'sample',
    actionLabel: '载入样例并去解读',
    desc: '先用内置样例走通全流程，不需要准备任何文件。',
    checklist: [
      '点击「载入样例并去解读」后，系统会切到智能解读并载入「右下肺斑片影」样例。',
      '也可以点顶部「智能解读」进入工作台，拖入自己的 JPG / PNG / DICOM 胸片。',
      '确认样例或文件后，点击「开始分析」。'
    ],
    expect: '页面出现四阶段进度：输入校验 → 影像推理 → 知识检索 → 循证报告。'
  },
  {
    id: 'analysis',
    eyebrow: '02 · 分析',
    title: '看懂 AI 正在做什么',
    time: '约 1–2 分钟',
    page: 'interpret',
    action: 'interpret',
    actionLabel: '去智能解读',
    desc: '分析过程不是一句“加载中”，而是可解释的四阶段。',
    checklist: [
      '观察进度条与阶段文字：输入校验、影像推理、知识检索、循证报告。',
      '本机 ONNX 完成 10 类征象概率与热力图；Qwen 负责报告和解释。',
      '耐心等待，通常 60–90 秒；期间不要重复点击开始。'
    ],
    expect: '分析完成后出现风险徽标、Top 3 概率、结果页签和报告。'
  },
  {
    id: 'result',
    eyebrow: '03 · 读结果',
    title: '读懂概率、热力图与报告',
    time: '约 1 分钟',
    page: 'interpret',
    action: 'interpret',
    actionLabel: '打开结果页',
    desc: '重点不是记住一个数字，而是知道数字、热图和报告之间的关系。',
    checklist: [
      '「概览」先看整体风险、最高概率和关注区域。',
      '「10 类明细」看全部概率；「报告」切换患者版 / 医生版。',
      '在影像上拖动热力图透明度，观察红色高激活区与病变位置。',
      '记住：热力图是模型关注区域，不是临床病灶定位。'
    ],
    expect: '能用自己的话说出：模型提示了什么、依据在哪里、下一步做什么。'
  },
  {
    id: 'cobrain',
    eyebrow: '04 · 共脑',
    title: '让 Qwen 以四个角色会诊',
    time: '约 1 分钟',
    page: 'interpret',
    action: 'interpret',
    actionLabel: '去 AI 共脑',
    desc: '同一个病例，影像科、呼吸科、全科、患者视角分别给出判断。',
    checklist: [
      '在结果页点「AI 共脑」页签。',
      '点「发起共脑会诊」，等待 Qwen 四个角色并行阅读本病例。',
      '看提示标签：Qwen · 四角色 或 本地规则 · 四角色。',
      '阅读共识与分歧点，点「采纳为随访建议」。'
    ],
    expect: '四位角色依次出现，最后形成共识、分歧和可执行的随访建议。'
  },
  {
    id: 'archive',
    eyebrow: '05 · 档案',
    title: '把结果存成一条健康时间线',
    time: '约 1 分钟',
    page: 'records',
    action: 'records',
    actionLabel: '去健康档案',
    desc: '一次解读只是起点；档案让同一成员的多次检查可以比较。',
    checklist: [
      '在解读结果页点「保存到健康档案」，或在档案页点「新增解读」。',
      '查看时间线卡片：日期、风险、摘要、Top 3 概率。',
      '点「详情」看完整报告；点「载入」重新打开这次记录。'
    ],
    expect: '档案时间线增加一条记录，并能回溯原报告和热力图。'
  },
  {
    id: 'family',
    eyebrow: '06 · 家庭共脑',
    title: '让档案变成下一步行动',
    time: '约 1 分钟',
    page: 'records',
    action: 'records',
    actionLabel: '去家庭健康摘要',
    desc: 'AI 家庭健康摘要会随筛选和记录变化重算。',
    checklist: [
      '查看「最近一次」「风险分布」「建议随访」。',
      '看「较上次变化」的概率差，理解随访趋势。',
      '点「生成随访计划」展开三步计划，再点「复制」。',
      '用风险筛选和「随访对比」验证筛选与对比。'
    ],
    expect: '得到一份可复制的随访计划，知道谁需要优先复查。'
  },
  {
    id: 'learn',
    eyebrow: '07 · 学习',
    title: '用科普和课堂补齐知识',
    time: '约 1–2 分钟',
    page: 'knowledge',
    action: 'knowledge',
    actionLabel: '去健康科普',
    desc: '结果告诉你“是什么”，科普和课堂告诉你“怎么理解、怎么练”。',
    checklist: [
      '在健康科普搜索「肺结节」，看八段正文、关键数字和常见误区。',
      '点影像热区、延伸阅读（术语 / 检查 / 就医信号 / 误区）。',
      '去影像课堂切换「常见征象」，再打开「九步读片 · 自测」。'
    ],
    expect: '能说出至少一个术语的含义、一个随访数字和一个读片步骤。'
  },
  {
    id: 'webai',
    eyebrow: '08 · Web + AI',
    title: '全局搜索、页面助手与能力边界',
    time: '约 1 分钟',
    page: 'home',
    action: 'search',
    actionLabel: '打开全局 AI 速答',
    desc: '最后看 Web + AI 的原生体验：搜索不只是跳转，助手知道你在哪一页。',
    checklist: [
      '按 Ctrl K / Cmd K，搜索「肺结节」，看 AI 速答与「继续问 AI」。',
      '打开右下角问答助手，点「AI 已读取当前页面」下的快捷问题。',
      '去「关于我们」查看本地推理、隐私和诊断边界。'
    ],
    expect: '搜索、对话、档案、科普可以在同一套 Vue 应用里互相跳转。'
  }
];

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    completed.value = Array.isArray(saved) ? saved : [];
  } catch {
    completed.value = [];
  }
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(completed.value)); } catch { /* ignore */ }
}
function isDone(step) { return completed.value.includes(step.id); }
function stepNumber(index) { return String(index + 1).padStart(2, '0'); }
function markDone(step) {
  if (!isDone(step)) {
    completed.value = [...completed.value, step.id];
    saveProgress();
  }
}
function toggleDone(step) {
  completed.value = isDone(step) ? completed.value.filter((id) => id !== step.id) : [...completed.value, step.id];
  saveProgress();
}
function openGuide() {
  open.value = true;
  const firstOpen = steps.findIndex((step) => !isDone(step));
  active.value = firstOpen >= 0 ? firstOpen : 0;
  document.body.style.overflow = 'hidden';
}
function closeGuide() {
  open.value = false;
  document.body.style.overflow = '';
}
function runStep(step) {
  markDone(step);
  closeGuide();
  if (step.action === 'search') {
    window.dispatchEvent(new CustomEvent('chestx-command-open'));
    return;
  }
  if (step.action === 'sample') {
    actions.switchPage('interpret');
    setTimeout(() => actions.openSample('case-high'), 120);
    return;
  }
  actions.switchPage(step.page);
}
function nextStep() {
  if (active.value < steps.length - 1) active.value += 1;
}
function prevStep() {
  if (active.value > 0) active.value -= 1;
}
function resetProgress() {
  completed.value = [];
  saveProgress();
  active.value = 0;
}
function onKeydown(event) {
  if (event.key === 'Escape' && open.value) closeGuide();
}

const progress = computed(() => Math.round((completed.value.filter((id) => steps.some((step) => step.id === id)).length / steps.length) * 100));
const activeStep = computed(() => steps[active.value]);

watch(open, (value) => {
  if (value) loadProgress();
});

onMounted(() => {
  loadProgress();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <button
    type="button"
    class="demo-guide-trigger"
    data-demo-guide-open
    :aria-label="$t('全流程演示教学')"
    :title="$t('全流程演示教学')"
    @click="openGuide"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
      <path stroke-linecap="round" d="M8 7h8M8 11h5" />
    </svg>
    <span>{{ $t('教学') }}</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="demo-guide-backdrop" @mousedown.self="closeGuide">
      <section class="demo-guide-panel" role="dialog" aria-modal="true" :aria-label="$t('全流程演示教学')">
        <header class="demo-guide-head">
          <div class="min-w-0">
            <span class="demo-guide-kicker">DEMO GUIDE · {{ $t('5–8 分钟') }}</span>
            <h2>{{ $t('全流程演示教学') }}</h2>
            <p>{{ $t('从一张胸片开始，走到 AI 分析、共脑会诊、健康档案、科普与 Web + AI 搜索。') }}</p>
          </div>
          <button type="button" class="demo-guide-close" :aria-label="$t('关闭')" @click="closeGuide">Esc</button>
        </header>

        <div class="demo-guide-body">
          <aside class="demo-guide-nav">
            <div class="demo-guide-progress">
              <div class="flex items-center justify-between">
                <span>{{ $t('学习进度') }}</span>
                <strong>{{ completed.length }} / {{ steps.length }}</strong>
              </div>
              <div class="demo-guide-track"><i :style="{ width: progress + '%' }"></i></div>
            </div>

            <button
              v-for="(step, index) in steps"
              :key="step.id"
              type="button"
              class="demo-guide-navitem"
              :class="{ 'is-active': active === index, 'is-done': isDone(step) }"
              @click="active = index"
            >
              <span class="demo-guide-navno">{{ isDone(step) ? '✓' : stepNumber(index) }}</span>
              <span class="min-w-0 text-left">
                <strong>{{ step.title }}</strong>
                <small>{{ step.time }}</small>
              </span>
            </button>

            <button type="button" class="demo-guide-reset" @click="resetProgress">{{ $t('重置学习进度') }}</button>
          </aside>

          <article class="demo-guide-detail">
            <span class="demo-guide-eyebrow">{{ activeStep.eyebrow }}</span>
            <h3>{{ activeStep.title }}</h3>
            <p class="demo-guide-desc">{{ activeStep.desc }}</p>

            <div class="demo-guide-block">
              <h4>{{ $t('操作步骤') }}</h4>
              <ol>
                <li v-for="(item, index) in activeStep.checklist" :key="index">{{ item }}</li>
              </ol>
            </div>

            <div class="demo-guide-expect">
              <span>{{ $t('预期结果') }}</span>
              <p>{{ activeStep.expect }}</p>
            </div>

            <div class="demo-guide-actions">
              <button type="button" class="btn-primary" @click="runStep(activeStep)">{{ activeStep.actionLabel }}</button>
              <button type="button" class="btn-secondary" @click="toggleDone(activeStep)">
                {{ isDone(activeStep) ? $t('已完成') : $t('标记完成') }}
              </button>
            </div>

            <footer class="demo-guide-foot">
              <button type="button" class="btn-ghost" :disabled="active === 0" @click="prevStep">{{ $t('上一步') }}</button>
              <span class="text-3xs text-text-3">{{ active + 1 }} / {{ steps.length }}</span>
              <button type="button" class="btn-ghost" :disabled="active === steps.length - 1" @click="nextStep">{{ $t('下一步') }}</button>
            </footer>
          </article>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.demo-guide-trigger {
  position: fixed;
  right: 92px;
  bottom: 24px;
  z-index: 83;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 44px;
  padding: 0 13px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--brand-200);
  background: var(--surface-card);
  color: var(--brand-800);
  box-shadow: var(--shadow-2);
  font-size: var(--text-2xs);
  font-weight: 700;
}
.demo-guide-trigger:hover { border-color: var(--brand-400); background: var(--brand-50); }
.demo-guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vh 18px;
  background: color-mix(in srgb, var(--ink-950) 54%, transparent);
  backdrop-filter: blur(7px);
}
.demo-guide-panel {
  display: flex;
  flex-direction: column;
  width: min(1020px, 100%);
  max-height: 90vh;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-3);
}
.demo-guide-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px; border-bottom: 1px solid var(--border-subtle); background: linear-gradient(135deg, var(--brand-50), var(--surface-card)); }
.demo-guide-kicker { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.demo-guide-head h2 { margin-top: 4px; color: var(--color-text-1); font-size: var(--text-xl); font-weight: 700; letter-spacing: -0.02em; }
.demo-guide-head p { margin-top: 4px; max-width: 70ch; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.65; }
.demo-guide-close { flex: none; padding: 3px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); color: var(--color-text-3); font-size: var(--text-3xs); }
.demo-guide-body { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 0; flex: 1; overflow: hidden; }
.demo-guide-nav { overflow-y: auto; padding: 14px; border-right: 1px solid var(--border-subtle); background: var(--surface-sunken); }
.demo-guide-progress { padding: 10px; margin-bottom: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-card); color: var(--color-text-2); font-size: var(--text-3xs); }
.demo-guide-track { height: 5px; margin-top: 7px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-sunken); }
.demo-guide-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-500), var(--brand-300)); transition: width var(--dur-2); }
.demo-guide-navitem { display: flex; width: 100%; align-items: center; gap: 8px; padding: 8px; border-radius: var(--radius-sm); color: var(--color-text-2); text-align: left; }
.demo-guide-navitem:hover { background: var(--surface-card); }
.demo-guide-navitem.is-active { background: var(--surface-card); color: var(--color-text-1); box-shadow: var(--shadow-1); }
.demo-guide-navitem.is-done .demo-guide-navno { background: var(--risk-low-soft); color: var(--risk-low); border-color: var(--risk-low-line); }
.demo-guide-navno { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--border-subtle); color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; }
.demo-guide-navitem strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-2xs); font-weight: 600; }
.demo-guide-navitem small { display: block; margin-top: 1px; color: var(--color-text-3); font-size: var(--text-3xs); }
.demo-guide-reset { width: 100%; margin-top: 10px; padding: 7px; border-radius: var(--radius-sm); color: var(--color-text-3); font-size: var(--text-3xs); text-align: center; }
.demo-guide-reset:hover { color: var(--brand-700); background: var(--surface-card); }
.demo-guide-detail { display: flex; min-width: 0; flex-direction: column; overflow-y: auto; padding: 20px 22px; }
.demo-guide-eyebrow { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.12em; }
.demo-guide-detail h3 { margin-top: 4px; color: var(--color-text-1); font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.02em; }
.demo-guide-desc { margin-top: 5px; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.7; }
.demo-guide-block { margin-top: 14px; padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-sunken); }
.demo-guide-block h4 { color: var(--color-text-1); font-size: var(--text-2xs); font-weight: 700; }
.demo-guide-block ol { margin-top: 6px; padding-left: 20px; list-style: decimal; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.75; }
.demo-guide-block li + li { margin-top: 4px; }
.demo-guide-expect { margin-top: 10px; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-200); background: var(--brand-50); }
.demo-guide-expect span { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; }
.demo-guide-expect p { margin-top: 3px; color: var(--brand-800); font-size: var(--text-2xs); line-height: 1.65; }
.demo-guide-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.demo-guide-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 16px; }
@media (max-width: 800px) {
  .demo-guide-body { grid-template-columns: 1fr; overflow-y: auto; }
  .demo-guide-nav { border-right: 0; border-bottom: 1px solid var(--border-subtle); max-height: 240px; }
  .demo-guide-detail { overflow: visible; }
  .demo-guide-trigger { right: 82px; bottom: 18px; height: 40px; padding: 0 11px; }
  .demo-guide-trigger span { display: none; }
}
</style>
