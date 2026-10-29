<script setup>
import { computed, provide } from 'vue';
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
</script>

<template>
  <a href="#main-content" class="skip-link">跳到主要内容</a>
  <div v-if="isEnglish" class="border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-center text-[11px] text-primary" role="status">
    English UI preview. Long-form medical articles remain in Chinese and should be professionally reviewed before translation.
  </div>
  <AppGlobals />
  <FloatingAiChat />
  <AppHeader />
  <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
    <div id="main-content" tabindex="-1">
      <RouterView />
    </div>
  </main>
  <AppFooter />
  <AppModals />
</template>
