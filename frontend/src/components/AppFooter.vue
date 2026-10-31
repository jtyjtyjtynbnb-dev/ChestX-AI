<script setup>
import { useShell } from '../composables/useShell.js';
const { actions } = useShell();
</script>
<template>
<footer class="mt-12 border-t border-border-line bg-white py-8">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div class="md:col-span-4 space-y-2">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-white text-xs font-bold">CX</span>
            <span class="text-base font-semibold text-text-1">胸影智识 ChestX-AI</span>
          </div>
          <p class="text-xs text-text-2 leading-5">
            胸部X光影像AI健康科普与管理系统 · 标准化前端工程。坚持专业医疗蓝视觉体系、可解释热力交互与严谨代码分层。
          </p>
        </div>

        <div class="md:col-span-4 space-y-2">
          <h4 class="text-sm font-semibold text-text-1">快速导航</h4>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-2">
            <button type="button" data-jump="home" @click="actions.switchPage('home')" class="hover:text-primary cursor-pointer">系统首页</button>
            <button type="button" data-jump="interpret" @click="actions.switchPage('interpret')" class="hover:text-primary cursor-pointer">智能解读</button>
            <button type="button" data-jump="records" @click="actions.switchPage('records')" class="hover:text-primary cursor-pointer">健康档案</button>
            <button type="button" data-jump="knowledge" @click="actions.switchPage('knowledge')" class="hover:text-primary cursor-pointer">健康科普</button>
            <button type="button" data-jump="academy" @click="actions.switchPage('academy')" class="hover:text-primary cursor-pointer">影像课堂</button>
            <button type="button" data-jump="about" @click="actions.switchPage('about')" class="hover:text-primary cursor-pointer">关于我们</button>
          </div>
        </div>

        <div class="md:col-span-4 space-y-2">
          <h4 class="text-sm font-semibold text-text-1">医疗合规与免责提示</h4>
          <p class="text-xs text-text-3 leading-5">
            本平台输出结果仅供健康科普与教学演示参考，不作为临床诊断依据。如身体不适请及时前往正规医院就诊。
          </p>
        </div>
      </div>
      <div class="mt-6 border-t border-border-line pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-text-3 gap-2">
        <span>© 2026 胸影智识 (ChestX-AI) · 标准化前端工程</span>
        <span>遵循 Vue 3.5 组合式 API · Tailwind 3.4 · 组件化前端实现</span>
      </div>
    </div>
  </footer>
</template>
