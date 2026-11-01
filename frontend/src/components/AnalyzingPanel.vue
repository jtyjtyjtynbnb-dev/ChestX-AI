<script setup>
import { computed } from 'vue';

const props = defineProps({
  progress: {
    type: Object,
    required: true
  }
});

const stages = [
  { title: '输入校验', desc: '胸片 / 非胸片与格式检查' },
  { title: '影像推理', desc: 'DenseNet-121 · 10 类概率' },
  { title: '知识检索', desc: '本地循证知识库匹配' },
  { title: '循证报告', desc: '患者版 / 医生版摘要' }
];

const activeIndex = computed(() => {
  const percent = Number(props.progress?.percent) || 0;
  const text = String(props.progress?.text || '');
  if (text.includes('报告')) return 3;
  if (text.includes('知识') && text.includes('完成')) return 3;
  if (text.includes('知识')) return 2;
  if (text.includes('影像') || text.includes('推理')) return 1;
  if (text.includes('输入') || text.includes('校验')) return 0;
  if (percent >= 92) return 3;
  if (percent >= 62) return 2;
  if (percent >= 24) return 1;
  return 0;
});
</script>

<template>
  <div id="stateAnalyzingPanel" class="space-y-3">
    <div class="analyzing-card" role="status" aria-live="polite">
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 text-sm font-semibold text-film-text">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-400"></span>
          </span>
          <span id="analyzingStageText">{{ progress.text }}</span>
        </span>
        <span id="analyzingPercentText" class="text-sm font-semibold text-brand-300 tnum">{{ progress.percent }}%</span>
      </div>

      <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-film-raise">
        <div
          id="analyzingProgressBar"
          class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-300"
          :style="{ width: progress.percent + '%' }"
        ></div>
      </div>

      <ol class="mt-4 space-y-2">
        <li
          v-for="(stage, index) in stages"
          :key="stage.title"
          class="analyzing-step"
          :class="{ 'is-active': index === activeIndex, 'is-done': index < activeIndex }"
        >
          <span class="analyzing-dot">
            <svg v-if="index < activeIndex" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" /></svg>
            <span v-else class="tnum">{{ index + 1 }}</span>
          </span>
          <div class="min-w-0 flex-1">
            <p class="analyzing-title">{{ stage.title }}</p>
            <p class="analyzing-desc">{{ stage.desc }}</p>
          </div>
          <span class="analyzing-state">{{ index < activeIndex ? '完成' : index === activeIndex ? '进行中' : '等待' }}</span>
        </li>
      </ol>

      <p class="mt-4 flex items-center gap-1.5 text-3xs text-film-dim">
        <span class="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
        影像与推理均在本机完成；报告生成约 20–40 秒，请勿关闭页面。
      </p>
    </div>

    <div class="panel skeleton-pulse space-y-3 p-4">
      <div class="flex items-center justify-between">
        <div class="h-4 w-32 rounded bg-ink-200"></div>
        <div class="h-5 w-14 rounded-full bg-ink-100"></div>
      </div>
      <div class="h-14 w-full rounded bg-ink-100"></div>
      <div class="space-y-2.5 pt-1">
        <div v-for="n in 4" :key="n" class="space-y-1.5">
          <div class="flex justify-between">
            <div class="h-3 rounded bg-ink-200" :style="{ width: [104, 120, 92, 112][n - 1] + 'px' }"></div>
            <div class="h-3 w-10 rounded bg-ink-100"></div>
          </div>
          <div class="h-1 w-full rounded-full bg-ink-100"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analyzing-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(420px 220px at 100% 0%, color-mix(in srgb, var(--brand-500) 18%, transparent), transparent 62%),
    linear-gradient(160deg, var(--film-850) 0%, var(--film-panel) 100%);
  box-shadow: var(--shadow-2);
}
.analyzing-step {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  opacity: 0.62;
}
.analyzing-step.is-active { opacity: 1; border-color: color-mix(in srgb, var(--brand-400) 32%, transparent); background: color-mix(in srgb, var(--brand-400) 8%, transparent); }
.analyzing-step.is-done { opacity: 0.9; }
.analyzing-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--film-line);
  background: var(--film-raise);
  color: var(--film-dim);
  font-size: var(--text-xs);
  font-weight: 700;
}
.analyzing-step.is-active .analyzing-dot { border-color: var(--brand-400); background: var(--brand-500); color: #fff; }
.analyzing-step.is-done .analyzing-dot { border-color: var(--risk-low); background: var(--risk-low); color: #fff; }
.analyzing-title { color: var(--film-text); font-size: var(--text-2xs); font-weight: 600; }
.analyzing-desc { color: var(--film-dim); font-size: var(--text-xs); }
.analyzing-state { flex: none; color: var(--film-dim); font-size: var(--text-xs); }
.analyzing-step.is-active .analyzing-state { color: var(--brand-300); }
.analyzing-step.is-done .analyzing-state { color: var(--risk-low); }
</style>
