<script setup>
import { useShell } from '../composables/useShell.js';
const { state } = useShell();
const colors = { success: 'border-success/30', warning: 'border-warning/40', error: 'border-danger/40', info: 'border-primary/30' };
const icons = { success: '✓', warning: '!', error: '✕', info: 'i' };
const backgrounds = { success: 'bg-success', warning: 'bg-warning', error: 'bg-danger', info: 'bg-primary' };
</script>
<template>
  <div id="routeProgressBar" class="fixed top-0 left-0 right-0 h-0.5 bg-primary z-[100] transition-all duration-300 opacity-0" :style="{width: state.routeProgress.width + '%', opacity: state.routeProgress.opacity}"></div>
  <div id="toastContainer" class="fixed top-20 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
    <div v-for="toast in state.toasts" :key="toast.id" class="pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-xs font-medium transition-all duration-300 bg-white text-text-1 shadow-lg" :class="colors[toast.type] || colors.info" :style="toast.leaving ? {opacity: 0, transform: 'translateY(-8px)'} : {}">
      <span class="flex h-5 w-5 items-center justify-center rounded-full text-white text-xs font-bold" :class="backgrounds[toast.type] || backgrounds.info">{{ icons[toast.type] || icons.info }}</span><span>{{ toast.message }}</span>
    </div>
  </div>
</template>
