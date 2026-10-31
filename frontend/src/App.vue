<script setup>
import { computed, onErrorCaptured, provide, ref } from 'vue';
import { RouterView } from 'vue-router';
import AppGlobals from './components/AppGlobals.vue';
import FloatingAiChat from './components/FloatingAiChat.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import AppModals from './components/AppModals.vue';
import { APP_CONTEXT } from './composables/useAppContext.js';
import { useAppCoordinators } from './composables/useAppCoordinators.js';
import { i18n } from './i18n/index.js';

provide(APP_CONTEXT, useAppCoordinators());
const isEnglish = computed(() => i18n.global.locale.value === 'en');
const fatalError = ref('');
onErrorCaptured((error) => {
  console.error('Unhandled Vue render error', error);
  fatalError.value = error?.message || '页面渲染异常';
  return false;
});
function reloadPage() {
  window.location.reload();
}
</script>

<template>
  <a href="#main-content" class="skip-link">跳到主要内容</a>
  <div id="medicalDisclaimerBanner" class="border-b border-danger/30 bg-danger/5 px-4 py-2 text-center text-xs font-medium text-danger" role="alert">
    {{ $t('医学免责声明：本工具仅用于健康科普与教学演示，不可用于临床诊断，不能替代医生。') }}
  </div>
  <div v-if="isEnglish" class="border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-center text-[11px] text-primary" role="status">
    English UI preview. Long-form medical articles remain in Chinese and should be professionally reviewed before translation.
  </div>
  <div v-if="fatalError" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-6" role="alert">
    <div class="w-full max-w-md rounded-xl border border-danger/30 bg-white p-6 text-center shadow-2xl">
      <h1 class="text-lg font-semibold text-text-1">{{ $t('页面加载异常') }}</h1>
      <p class="mt-2 text-sm text-text-2">{{ fatalError }}</p>
      <p class="mt-1 text-xs text-text-3">{{ $t('请刷新重试；若仍失败，请检查后端服务是否启动。') }}</p>
      <button type="button" class="btn-primary mt-4" @click="reloadPage">{{ $t('刷新页面') }}</button>
    </div>
  </div>
  <AppGlobals />
  <FloatingAiChat />
  <AppHeader />
  <main class="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
    <div id="main-content" tabindex="-1">
      <RouterView />
    </div>
  </main>
  <AppFooter />
  <AppModals />
</template>
