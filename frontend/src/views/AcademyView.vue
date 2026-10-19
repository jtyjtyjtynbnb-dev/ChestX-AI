<script setup>
import { ref } from 'vue';

const currentQuizIndex = ref(0);
</script>

<template>
<section id="page-academy" class="page-view space-y-6">
      <div class="med-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold text-text-1">影像小课堂 · 交互式胸片读片教学</h1>
            <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">拔高特色模块</span>
          </div>
          <p class="text-xs text-text-3 mt-0.5">图文结合 + 解剖热点点按交互，帮助非医学专业用户与医学生快速建立胸片读片思维</p>
        </div>

        <!-- 分类 Tab 切换按钮 -->
        <div class="flex items-center gap-1.5 rounded-lg bg-page-bg p-1 border border-border-line">
          <button type="button" data-academy-tab="basics" class="academy-tab-btn rounded-md px-3.5 py-1.5 text-xs font-semibold bg-primary text-white cursor-pointer transition-all">
            胸片基础 (解剖交互)
          </button>
          <button type="button" data-academy-tab="signs" class="academy-tab-btn rounded-md px-3.5 py-1.5 text-xs font-medium text-text-2 hover:text-text-1 cursor-pointer transition-all">
            常见征象 (典型图例)
          </button>
          <button type="button" data-academy-tab="guide" class="academy-tab-btn rounded-md px-3.5 py-1.5 text-xs font-medium text-text-2 hover:text-text-1 cursor-pointer transition-all">
            读片入门 (九步法+自测)
          </button>
        </div>
      </div>

      <!-- Tab 1：胸片基础（点击影像部位弹出对应名称与说明） -->
      <div id="academy-tab-basics" class="academy-tab-panel grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div class="med-card lg:col-span-7 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-text-1">标准后前位 (PA) 胸片交互式解剖图谱</h2>
            <span class="text-xs text-primary font-medium">💡 请点击胸片上的蓝色数字热点查看解剖释义</span>
          </div>

          <div class="relative mx-auto h-[420px] w-full max-w-[440px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 select-none">
            <img
              src="assets/sample_3.jpg"
              alt="标准正位胸片解剖标注底图"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-contain"
            />
            <!-- 解剖部位交互热点容器 -->
            <div id="anatomyHotspotsLayer" class="absolute inset-0"></div>
          </div>
        </div>

        <!-- 右侧解剖部位详情展示卡 -->
        <div class="med-card lg:col-span-5 space-y-4" id="anatomySpotDetailCard"></div>
      </div>

      <!-- Tab 2：常见征象（配典型影像示例） -->
      <div id="academy-tab-signs" class="academy-tab-panel hidden space-y-4">
        <h2 class="text-base font-semibold text-text-1">十类胸部征象影像讲解</h2>
        <p class="text-xs text-text-2">点击每张示例影像上的编号标记查看观察提示。影像和标注仅供科普教学，不作为诊断依据。</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" id="academySignsGrid"></div>
      </div>

      <!-- Tab 3：读片入门（九步标准读片法 + 互动读片小测验） -->
      <div id="academy-tab-guide" class="academy-tab-panel hidden space-y-6">
        <div class="med-card">
          <h2 class="text-lg font-semibold text-text-1">放射科标准“九步读片法” (ABCDEF口诀扩展)</h2>
          <p class="text-xs text-text-3 mt-0.5">养成固定顺序的阅片习惯，避免遗漏肋膈角、心后区或肺尖部隐匿病变</p>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" id="nineStepGuideGrid"></div>
        </div>

        <!-- 交互式读片入门自测 -->
        <div class="med-card border-primary/20">
          <div class="flex items-center justify-between border-b border-border-line pb-3">
            <div>
              <h3 class="text-lg font-semibold text-text-1">读片入门互动小测验</h3>
              <p class="text-xs text-text-3">点击选项即时验证您的胸片基础知识掌握情况</p>
            </div>
            <span id="quizScoreBadge" class="rounded bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">已答对 0 / 3 题</span>
          </div>
          <div id="academyQuizContainer" class="mt-4 space-y-4"></div>
        </div>
      </div>
    </section>
</template>
