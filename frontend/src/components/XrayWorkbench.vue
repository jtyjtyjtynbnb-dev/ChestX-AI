<script setup>
import { useImageViewer } from '../composables/useImageViewer.js';
import { useDiagnoseFlow } from '../composables/useDiagnoseFlow.js';

const viewer = useImageViewer();
const flow = useDiagnoseFlow();
</script>

<template>
  <div class="med-card space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-text-1">多模态胸片看片台 (DenseNet-121 + Grad-CAM)</h3>
      <span class="text-xs text-primary">支持滚轮缩放 / 反色 / 热力图叠加</span>
    </div>
  </div>
</template>
