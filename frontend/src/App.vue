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
  <a href="#main-content" class="skip-link">{{ $t('跳到主要内容') }}</a>

  <div class="flex min-h-screen flex-col bg-page-bg">
    <!-- 医学免责声明：全局常驻，不可关闭 -->
    <div
      id="medicalDisclaimerBanner"
      class="flex items-center justify-center gap-2 border-b border-danger-line bg-danger-soft px-4 py-1.5 text-center text-2xs font-medium text-danger-strong"
      role="alert"
    >
      <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 3.5h.01M10.3 4.3 2.8 17a1.8 1.8 0 0 0 1.5 2.7h15.4a1.8 1.8 0 0 0 1.5-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z" />
      </svg>
      <span>{{ $t('医学免责声明：本工具仅用于健康科普与教学演示，不可用于临床诊断，不能替代医生。') }}</span>
    </div>

    <div
      v-if="isEnglish"
      class="border-b border-brand-200 bg-brand-50 px-4 py-1.5 text-center text-2xs text-brand-800"
      role="status"
    >
      {{ $t('英文界面为预览版本，医学长文仍保留中文，正式翻译前需经医学审校。') }}
    </div>

    <AppGlobals />
    <FloatingAiChat />
    <AppHeader />

    <main class="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div id="main-content" tabindex="-1" class="mx-auto w-full max-w-[1360px] outline-none">
        <RouterView v-slot="{ Component, route }">
          <Transition name="route" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <AppFooter />
  </div>

  <AppModals />

  <!-- 致命错误兜底 -->
  <div
    v-if="fatalError"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/60 p-6 backdrop-blur-sm"
    role="alert"
  >
    <div class="w-full max-w-md rounded-lg border border-border-line bg-card-bg p-6 text-center shadow-3">
      <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 7l10 10M17 7L7 17" />
        </svg>
      </div>
      <h1 class="text-md font-semibold text-text-1">{{ $t('页面加载异常') }}</h1>
      <p class="mt-2 text-sm text-text-2">{{ fatalError }}</p>
      <p class="mt-1 text-xs text-text-3">{{ $t('请刷新重试；若仍失败，请检查后端服务是否启动。') }}</p>
      <button type="button" class="btn-primary mt-4 w-full" @click="reloadPage">{{ $t('刷新页面') }}</button>
    </div>
  </div>
</template>
