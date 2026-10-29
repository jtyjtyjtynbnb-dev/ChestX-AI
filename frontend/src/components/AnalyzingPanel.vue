<script setup>
defineProps({
  progress: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div id="stateAnalyzingPanel" class="space-y-4">
    <div class="med-card border-primary/30 bg-primary/[0.02]">
      <div class="flex items-center justify-between text-xs font-medium text-primary mb-2">
        <span id="analyzingStageText">{{ progress.text }}</span>
        <span id="analyzingPercentText" class="tabular-nums font-semibold">{{ progress.percent + '%' }}</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div id="analyzingProgressBar" class="h-full bg-primary transition-all duration-200" :style="{ width: progress.percent + '%' }"></div>
      </div>
    </div>

    <div class="med-card skeleton-pulse space-y-4">
      <div class="flex items-center justify-between">
        <div class="h-5 w-32 rounded bg-gray-200"></div>
        <div class="h-6 w-16 rounded bg-gray-200"></div>
      </div>
      <div class="h-16 w-full rounded bg-gray-100"></div>
      <div class="space-y-3 pt-2">
        <div class="h-4 w-40 rounded bg-gray-200"></div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="h-3.5 w-28 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
          <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="h-3.5 w-32 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
          <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="h-3.5 w-24 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
          <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="h-3.5 w-28 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
          <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
        </div>
      </div>
    </div>
  </div>
</template>
