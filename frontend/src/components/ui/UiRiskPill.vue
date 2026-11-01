<script setup>
import { computed } from 'vue';
import { getRiskStyle } from '../../utils/format.js';

/**
 * 风险徽标：颜色 + 圆点 + 文字三重编码。
 * 接受 riskLevel('HIGH'|'MEDIUM'|'LOW') 或概率数值（自动分档）。
 */
const props = defineProps({
  level: { type: [String, Number], default: 'LOW' },
  code: { type: String, default: null },
  /** 'full' 显示"高风险关注"，'short' 显示"高风险" */
  variant: { type: String, default: 'full' }
});

const risk = computed(() => getRiskStyle(props.level, props.code));
const tone = computed(() => ({ HIGH: 'high', MEDIUM: 'mid', LOW: 'low' })[risk.value.level]);
const text = computed(() => (props.variant === 'short' ? risk.value.shortLabel : risk.value.label));
</script>

<template>
  <span :class="['risk-pill', `risk-pill--${tone}`]">
    {{ $t(text) }}
  </span>
</template>
