<script setup>
import { computed } from 'vue';
import { formatProb } from '../utils/format.js';
import { categoryColor } from '../utils/category.js';
import { useModals } from '../composables/useModals.js';
import UiRiskPill from './ui/UiRiskPill.vue';

const { AppState } = useModals();
const rec = computed(() => AppState.recordDetail);
const sorted = computed(() => [...(rec.value?.probabilities || [])].sort((a, b) => b.prob - a.prob));
</script>

<template>
  <div v-if="rec" class="grid grid-cols-1 gap-4 md:grid-cols-12">

    <!-- 影像 -->
    <div data-surface="film" class="film-surface relative flex flex-col items-center justify-center rounded-md border border-film-line p-3 md:col-span-5">
      <div class="relative aspect-square w-full max-w-[260px] overflow-hidden rounded">
        <img :src="rec.imageUrl" :alt="rec.title" class="h-full w-full object-contain" />
        <div
          class="pointer-events-none absolute inset-0"
          style="background: radial-gradient(circle at 38% 62%, rgba(180,35,24,0.62) 0%, rgba(181,71,8,0.34) 24%, transparent 56%);"
        ></div>
      </div>
      <span class="mt-2 text-3xs text-film-dim">{{ $t('原图与模型热力融合预览') }}</span>
    </div>

    <div class="space-y-2.5 md:col-span-7">
      <!-- 元信息 -->
      <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-line bg-surface-sunken p-2.5">
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-2xs">
          <span><span class="text-text-3">{{ $t('受检人') }}：</span><strong class="text-text-1">{{ AppState.userProfile?.name }}</strong></span>
          <span><span class="text-text-3">{{ $t('解读时间') }}：</span><strong class="text-text-1 tnum">{{ rec.createdAt || rec.date }}</strong></span>
        </div>
        <UiRiskPill :level="rec.riskLevel" variant="short" />
      </div>

      <!-- 结论 -->
      <div class="rounded-md border border-border-line p-2.5">
        <h3 class="text-2xs font-semibold text-text-1">{{ $t('核心评估结论') }}</h3>
        <p class="mt-1 text-xs leading-relaxed text-text-2">{{ rec.summary }}</p>
        <p class="mt-1 text-3xs text-brand-700"><strong>{{ $t('模型关注区域') }}：</strong>{{ rec.attentionRegion }}</p>
      </div>

      <!-- 概率明细 -->
      <div>
        <h3 class="mb-1.5 text-2xs font-semibold text-text-1">{{ $t('10 类征象概率明细') }}</h3>
        <div class="max-h-44 space-y-1 overflow-y-auto pr-1">
          <div v-for="(p, index) in sorted" :key="p.code || index" class="flex items-center gap-2">
            <span class="w-24 flex-none truncate text-2xs text-text-1">{{ p.name }}</span>
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <div class="h-full rounded-full" :style="{ width: p.prob + '%', backgroundColor: categoryColor(p.code) }"></div>
            </div>
            <span class="w-11 flex-none text-right text-2xs font-semibold text-text-1 tnum">{{ formatProb(p.prob) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
