<script setup>
import { computed } from 'vue';
import { formatProb } from '../../utils/format.js';
import { categoryColor } from '../../utils/category.js';

/**
 * 单条概率条：左侧名称、右侧数值、下方进度。
 * 进度条用疾病分类色（与图表同色），厚度随 compact 变化。
 */
const props = defineProps({
  name: { type: String, required: true },
  code: { type: String, default: '' },
  prob: { type: Number, default: 0 },
  compact: { type: Boolean, default: false },
  /** 高亮当前关注疾病 */
  active: { type: Boolean, default: false }
});

const pct = computed(() => Math.max(0, Math.min(100, Number(props.prob) || 0)));
const color = computed(() => categoryColor(props.code));
</script>

<template>
  <div :class="['group', active ? '' : '']">
    <div class="flex items-baseline justify-between gap-3">
      <span :class="['truncate', active ? 'text-sm font-semibold text-text-1' : 'text-xs text-text-2']">{{ name }}</span>
      <span class="flex-none text-xs font-semibold tnum" :class="active ? 'text-text-1' : 'text-text-2'">{{ formatProb(prob) }}</span>
    </div>
    <div
      :class="['mt-1 w-full overflow-hidden rounded-full bg-surface-sunken', compact ? 'h-1' : 'h-1.5']"
      role="meter"
      :aria-valuenow="pct.toFixed(1)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="name"
    >
      <div
        class="h-full rounded-full transition-[width] duration-500 ease-out"
        :style="{ width: pct + '%', backgroundColor: color }"
      ></div>
    </div>
  </div>
</template>
