<script setup>
import { reactive } from 'vue';

/**
 * 👇【手动修改文案区】
 * 直接修改下方 aboutConfig 中的中文文字，保存本文件 (Ctrl+S) 后直接刷新浏览器 (F5) 即可生效！
 * 完全无需修改 HTML 标签，也无需重新编译。
 */
export const aboutConfig = reactive({
  title: '关于「胸影智识 ChestX-AI」',
  paragraph1: '胸部X光正位片（Chest X-Ray）是目前临床体检与呼吸系统疾病初筛最广泛、最经济的影像学检查手段。然而传统胸片对比度有限、解剖结构重叠多，普通受检者面对报告上的专业术语往往一头雾水，传统AI辅助诊断又常因“黑盒输出”缺乏直观解释。',
  paragraph2: '本项目按照传智杯国奖级工程化标准设计研发，将多标签深度卷积神经网络（DenseNet-121）与梯度加权类激活映射（Grad-CAM）有机结合，打造集「智能影像解读」、「可解释热力分析」、「10类疾病科普百科」、「交互式影像小课堂」与「个人健康档案管理」于一体的现代化医疗健康科普平台。',
  metricsTitle: '系统工程指标概览',
  metrics: [
    { label: '定位标准：', value: '传智杯国奖级工程化前端', style: 'font-medium text-primary' },
    { label: '核心框架：', value: 'Vue 3.4+ / Vite 5 / Pinia 2', style: 'font-medium text-text-1' },
    { label: 'UI与样式：', value: 'Element Plus 2.7+ / Tailwind 3.4+', style: 'font-medium text-text-1' },
    { label: '响应式断点：', value: '375px ~ 1440px+ 全适配', style: 'font-medium tabular-nums text-text-1' },
    { label: '首屏构建性能：', value: '加载 ≤ 1.2s / 切换 ≤ 300ms', style: 'font-medium tabular-nums text-success' }
  ],
  footerSummary: '胸部X光影像AI健康科普与管理系统 · 传智杯国奖级标准前端工程。坚持专业医疗蓝视觉体系、可解释热力交互与严谨代码分层。',
  footerCopyright: '© 2026 胸影智识 (ChestX-AI) · 传智杯参赛标准工程'
});
</script>

<template>
  <section id="page-about" class="page-view space-y-6">
    <div class="med-card grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
      <div class="lg:col-span-8 space-y-3">
        <h1 class="text-xl font-semibold text-text-1">{{ aboutConfig.title }}</h1>
        <p class="text-sm text-text-2 leading-6">{{ aboutConfig.paragraph1 }}</p>
        <p class="text-sm text-text-2 leading-6">{{ aboutConfig.paragraph2 }}</p>
      </div>
      <div class="lg:col-span-4 rounded-lg bg-page-bg p-4 border border-border-line space-y-2.5 text-xs">
        <div class="font-semibold text-sm text-text-1 border-b border-border-line pb-2">{{ aboutConfig.metricsTitle }}</div>
        <div v-for="(item, idx) in aboutConfig.metrics" :key="idx" class="flex justify-between">
          <span class="text-text-3">{{ item.label }}</span>
          <span :class="item.style">{{ item.value }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
