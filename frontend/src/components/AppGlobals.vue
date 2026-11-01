<script setup>
import { useShell } from '../composables/useShell.js';

const { state } = useShell();

/**
 * 提示条语义：颜色 + 图标 + 位置，三重可辨。
 * 深色阅片面上不需要特殊处理——提示层始终浮在页面最上方。
 */
const tones = {
  success: { box: 'border-success-line bg-success-soft text-success-strong', dot: 'bg-success', path: 'M5 12.5l4.5 4.5L19 7.5' },
  warning: { box: 'border-warning-line bg-warning-soft text-warning-strong', dot: 'bg-warning', path: 'M12 8v5m0 3.5h.01' },
  error:   { box: 'border-danger-line bg-danger-soft text-danger-strong',   dot: 'bg-danger',  path: 'M7 7l10 10M17 7L7 17' },
  info:    { box: 'border-brand-200 bg-brand-50 text-brand-800',            dot: 'bg-brand-500', path: 'M12 11v5m0-9h.01' }
};

const tone = (type) => tones[type] || tones.info;
</script>

<template>
  <!-- 路由进度条：细、青蓝、不打断视线 -->
  <div
    id="routeProgressBar"
    class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-brand-500 transition-all duration-300 ease-out"
    :style="{ width: state.routeProgress.width + '%', opacity: state.routeProgress.opacity }"
    aria-hidden="true"
  ></div>

  <!-- 提示容器：读屏播报，视觉居中 -->
  <div
    id="toastContainer"
    class="pointer-events-none fixed left-1/2 top-[68px] z-[90] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="toast in state.toasts"
      :key="toast.id"
      class="pointer-events-auto flex w-full items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs font-medium shadow-2 transition-all duration-200 ease-out"
      :class="tone(toast.type).box"
      :style="toast.leaving ? { opacity: 0, transform: 'translateY(-6px)' } : {}"
    >
      <span class="flex h-4 w-4 flex-none items-center justify-center rounded-full" :class="tone(toast.type).dot">
        <svg class="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tone(toast.type).path" />
        </svg>
      </span>
      <span class="min-w-0 flex-1">{{ $t(toast.message) }}</span>
    </div>
  </div>
</template>
