<script setup>
import { computed } from 'vue';

/**
 * 关键指标块。数字用等宽字形，避免刷新时宽度跳动。
 * trend: { dir: 'up'|'down'|'flat', text: string }  用于随访对比
 */
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | brand | high | mid | low
  hint: { type: String, default: '' },
  trend: { type: Object, default: null }
});

const toneClass = computed(() => ({
  neutral: 'text-text-1',
  brand: 'text-brand-700',
  high: 'text-danger',
  mid: 'text-warning',
  low: 'text-success'
}[props.tone] || 'text-text-1'));

const trendClass = computed(() => {
  if (!props.trend) return '';
  return { up: 'text-danger', down: 'text-success', flat: 'text-text-3' }[props.trend.dir] || 'text-text-3';
});
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="text-2xs font-medium text-text-3">{{ $t(label) }}</div>
    <div class="flex items-baseline gap-1">
      <span class="text-2xl font-semibold leading-none tnum" :class="toneClass">{{ value }}</span>
      <span v-if="unit" class="text-xs font-medium text-text-3">{{ unit }}</span>
      <span v-if="trend" class="ml-1 inline-flex items-center gap-0.5 text-2xs font-semibold tnum" :class="trendClass">
        <svg v-if="trend.dir === 'up'" class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9.5V2.5M6 2.5 2.5 6M6 2.5 9.5 6" /></svg>
        <svg v-else-if="trend.dir === 'down'" class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 2.5v7m0 0L2.5 6M6 9.5 9.5 6" /></svg>
        <svg v-else class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" d="M2.5 6h7" /></svg>
        {{ trend.text }}
      </span>
    </div>
    <div v-if="hint" class="text-2xs text-text-3">{{ $t(hint) }}</div>
  </div>
</template>
