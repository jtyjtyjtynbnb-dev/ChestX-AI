<script setup>
import { ref } from 'vue';

const searchKeyword = ref('');
const activeCategory = ref('ALL');
</script>

<template>
<section id="page-knowledge" class="page-view space-y-6">
      <div class="med-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div>
          <h1 class="text-xl font-semibold text-text-1">胸部X光常见疾病健康科普库</h1>
          <p class="text-xs text-text-3 mt-0.5">权威梳理 10 类胸部常见影像征象与疾病防治指南，点击左侧病种即可切换查阅</p>
        </div>
        <div class="w-full sm:w-64">
          <input
            id="knowledgeSearchInput"
            type="text"
            placeholder="快速筛选 10 类胸部疾病..."
            class="w-full rounded-md border border-border-line bg-page-bg px-3 py-1.5 text-xs text-text-1 focus:border-primary focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <!-- 左侧导航：10类疾病列表 -->
        <aside class="med-card lg:col-span-4 !p-3 space-y-1" id="knowledgeNavList"></aside>

        <!-- 右侧内容区：疾病名称+严重程度标签；四个板块：疾病概述、常见病因、典型症状、预防建议；底部关联影像课堂 -->
        <div class="med-card lg:col-span-8 space-y-5" id="knowledgeDetailBox"></div>
      </div>
    </section>
</template>
