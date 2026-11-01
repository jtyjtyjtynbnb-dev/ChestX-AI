<script setup>
import { useShell } from '../composables/useShell.js';

const { actions } = useShell();

const links = [
  { key: 'home', label: '系统首页' },
  { key: 'interpret', label: '智能解读' },
  { key: 'records', label: '健康档案' },
  { key: 'knowledge', label: '健康科普' },
  { key: 'academy', label: '影像课堂' },
  { key: 'about', label: '关于我们' }
];
</script>

<template>
  <footer class="mt-16 border-t border-border-line bg-card-bg">
    <div class="mx-auto w-full max-w-[1360px] px-4 py-10 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-12">

        <!-- 品牌与定位 -->
        <div class="space-y-3 md:col-span-5">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-brand-300">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 7c-2.6-1.6-6-1-6 3.4 0 3.4 2.2 6.3 5 8.6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 7c2.6-1.6 6-1 6 3.4 0 3.4-2.2 6.3-5 8.6" />
              </svg>
            </span>
            <span class="text-md font-semibold text-text-1">胸影智识 ChestX-AI</span>
          </div>
          <p class="max-w-md text-xs leading-relaxed text-text-2">
            {{ $t('胸部X光AI影像解读') }} · {{ $t('本地 ONNX 推理，可解释热力图与循证科普，为体检人群与医学初学者提供读片辅助。') }}
          </p>
          <p class="flex items-center gap-1.5 text-2xs text-text-3">
            <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
            {{ $t('单机运行 · 影像不出本机') }}
          </p>
        </div>

        <!-- 快速导航 -->
        <div class="space-y-3 md:col-span-3">
          <h2 class="text-2xs font-semibold uppercase tracking-[0.12em] text-text-3">{{ $t('快速导航') }}</h2>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            <button
              v-for="link in links"
              :key="link.key"
              type="button"
              :data-jump="link.key"
              class="text-left text-xs text-text-2 transition-colors duration-150 hover:text-brand-700"
              @click="actions.switchPage(link.key)"
            >{{ $t(link.label) }}</button>
          </div>
        </div>

        <!-- 合规 -->
        <div class="space-y-3 md:col-span-4">
          <h2 class="text-2xs font-semibold uppercase tracking-[0.12em] text-text-3">{{ $t('医疗合规与免责提示') }}</h2>
          <p class="rounded-md border border-warning-line bg-warning-soft px-3 py-2.5 text-2xs leading-relaxed text-warning-strong">
            {{ $t('本平台输出结果仅供健康科普与教学演示参考，不作为临床诊断依据。如身体不适请及时前往正规医院就诊。') }}
          </p>
        </div>
      </div>

      <div class="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border-line pt-5 text-2xs text-text-3 sm:flex-row sm:items-center">
        <span>{{ $t('© 2026 胸影智识 (ChestX-AI) · 标准化前端工程') }}</span>
        <span class="tnum">Vue 3.5 · Vite 5 · Tailwind 3.4</span>
      </div>
    </div>
  </footer>
</template>
