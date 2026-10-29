<script setup>
import { reactive } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';
import { useKnowledge } from '../composables/useKnowledge.js';
const k = reactive(useKnowledge(useAppContext()));
</script>

<template>
  <section id="page-knowledge" class="page-view active space-y-6">
    <div class="med-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
      <div>
        <h1 class="text-xl font-semibold text-text-1">胸部X光常见疾病健康科普库</h1>
        <p class="text-xs text-text-3 mt-0.5">权威梳理 10 类胸部常见影像征象与疾病防治指南，点击左侧病种即可切换查阅</p>
      </div>
      <div class="w-full sm:w-64">
        <input id="knowledgeSearchInput" v-model="k.state.search" type="text" placeholder="快速筛选 10 类胸部疾病..." class="w-full rounded-md border border-border-line bg-page-bg px-3 py-1.5 text-xs text-text-1 focus:border-primary focus:bg-white focus:outline-none" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      <aside class="med-card lg:col-span-4 !p-3 space-y-1" id="knowledgeNavList">
        <button v-for="(d, idx) in k.filteredList" :key="d.code" type="button" :data-disease-code="d.code" class="knowledge-item-btn flex w-full cursor-pointer items-center justify-between rounded-md px-3.5 py-2.5 text-left text-sm transition-all" :class="d.code === k.activeItem.code ? 'bg-primary text-white font-semibold shadow-xs' : 'text-text-1 hover:bg-page-bg'" @click="k.selectDisease(d.code)">
          <span class="flex items-center gap-2 truncate"><span class="text-xs tabular-nums" :class="d.code === k.activeItem.code ? 'text-white/80' : 'text-text-3'">{{ String(idx + 1).padStart(2, '0') }}</span><span class="truncate">{{ d.name }}</span></span>
          <span class="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" :class="d.code === k.activeItem.code ? 'bg-white/20 text-white' : k.getRiskStyle(d.severity).badgeClass">{{ k.getRiskStyle(d.severity).shortLabel }}</span>
        </button>
      </aside>

      <div class="med-card lg:col-span-8 space-y-5" id="knowledgeDetailBox">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-line pb-4">
          <div><span class="text-xs font-medium text-primary">胸部X光疾病科普百科</span><h2 class="text-2xl font-semibold text-text-1 mt-0.5">{{ k.activeItem.name }}</h2></div>
          <span class="inline-flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-semibold" :class="k.activeRisk.badgeClass"><span class="h-2 w-2 rounded-full" :class="k.activeRisk.dotClass"></span><span>关注等级：{{ k.activeRisk.shortLabel }} ({{ k.activeItem.severityLabel }})</span></span>
        </div>

        <div class="rounded-lg bg-primary/[0.04] border border-primary/20 p-4"><div class="text-xs font-semibold text-primary">典型胸部X光影像学特征</div><p class="mt-1 text-sm text-text-1 font-medium">{{ k.activeItem.xrayFeature }}</p></div>

        <section class="rounded-lg border border-border-line overflow-hidden" aria-labelledby="knowledgeImageHeading">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line px-4 py-3"><div><h3 id="knowledgeImageHeading" class="text-sm font-semibold text-text-1">{{ k.activeItem.shortName }}影像互动观察</h3><p class="mt-0.5 text-[11px] text-text-2">点击图片上的标记点，查看对应观察提示</p></div><span class="rounded border border-border-line bg-page-bg px-2 py-1 text-[10px] text-text-2">{{ k.activeItem.imageType }}</span></div>
          <div class="grid grid-cols-1 md:grid-cols-5">
            <div class="md:col-span-3 relative flex min-h-64 items-center justify-center overflow-hidden bg-slate-950 p-3">
              <img id="knowledgeDiseaseImage" :src="k.activeItem.image" :alt="k.activeItem.imageAlt" loading="lazy" class="max-h-[420px] w-full object-contain" />
              <div id="knowledgeHotspots" role="group" aria-label="影像交互观察点" class="pointer-events-none absolute inset-3">
                <button v-for="(spot,index) in k.activeItem.hotspots" :key="index" type="button" class="knowledge-hotspot pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" :class="index===k.state.hotspot?'scale-110 ring-4 ring-primary/50':''" :style="{left:spot.x+'%',top:spot.y+'%'}" :data-hotspot-index="index" :aria-label="`观察点 ${index+1}：${spot.title}`" :aria-pressed="index===k.state.hotspot" @click="k.selectHotspot(index)">{{ index+1 }}</button>
              </div>
            </div>
            <div class="flex flex-col justify-between gap-4 p-4 md:col-span-2"><div><div id="knowledgeImageNoteTitle" class="text-sm font-semibold text-text-1">{{ k.activeHotspot.title }}</div><p id="knowledgeImageNote" class="mt-2 text-xs leading-6 text-text-2" aria-live="polite">{{ k.activeHotspot.text }}</p></div><div class="space-y-2 border-t border-border-line pt-3"><p class="text-[11px] leading-5 text-text-2">影像仅作健康科普与教学展示，标记点为说明用途，不代表AI病灶定位或医疗诊断。</p><a :href="k.activeItem.imageSource" target="_blank" rel="noopener noreferrer" class="inline-flex text-xs font-medium text-primary underline underline-offset-2">查看原图与授权来源 ↗</a></div></div>
          </div>
        </section>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-lg border border-border-line p-4 space-y-1.5"><h3 class="text-base font-semibold text-text-1 flex items-center gap-2"><span class="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">1</span><span>疾病概述</span></h3><p class="text-xs text-text-2 leading-6">{{ k.activeItem.overview }}</p></div>
          <div class="rounded-lg border border-border-line p-4 space-y-1.5"><h3 class="text-base font-semibold text-text-1 flex items-center gap-2"><span class="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">2</span><span>常见病因</span></h3><p class="text-xs text-text-2 leading-6">{{ k.activeItem.causes }}</p></div>
          <div class="rounded-lg border border-border-line p-4 space-y-1.5"><h3 class="text-base font-semibold text-text-1 flex items-center gap-2"><span class="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">3</span><span>典型症状</span></h3><p class="text-xs text-text-2 leading-6">{{ k.activeItem.symptoms }}</p></div>
          <div class="rounded-lg border border-border-line p-4 space-y-1.5"><h3 class="text-base font-semibold text-text-1 flex items-center gap-2"><span class="inline-flex h-5 w-5 items-center justify-center rounded bg-success/15 text-success text-xs">4</span><span>预防与就医建议</span></h3><p class="text-xs text-text-2 leading-6">{{ k.activeItem.prevention }}</p></div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border-line pt-4"><span class="text-xs text-text-3">想在真实胸片上直观对比该病种的解剖部位与典型征象？</span><div class="flex items-center gap-2.5"><button type="button" id="knowledgeToAcademySignsBtn" class="btn-primary !h-9 !text-xs" @click="k.toAcademy">去查看影像示例 (影像小课堂) →</button><button type="button" id="knowledgeToInterpretBtn" class="btn-secondary btn-sm" @click="k.toInterpret">在解读台体验样本</button></div></div>
      </div>
    </div>
  </section>
</template>

