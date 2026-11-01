<script setup>
import { computed } from 'vue';
import { useShell } from '../composables/useShell.js';
import { getLocale, toggleLocale } from '../i18n/index.js';
import CommandPalette from './CommandPalette.vue';
import DemoGuide from './DemoGuide.vue';

const { actions, nav, member, recordCount } = useShell();
const locale = computed(() => getLocale());

const navItems = [
  { key: 'home', label: '首页', short: 'Home' },
  { key: 'interpret', label: '智能解读', short: 'Interpret', live: true },
  { key: 'records', label: '健康档案', short: 'Records', badge: true },
  { key: 'knowledge', label: '健康科普', short: 'Library' },
  { key: 'academy', label: '影像课堂', short: 'Academy', tag: '互动' },
  { key: 'about', label: '关于我们', short: 'About' }
];

const displayName = computed(() => member.value?.profile?.name || '林知夏');
const initial = computed(() => displayName.value.slice(0, 1));

function openCommandFromMobile() {
  window.dispatchEvent(new CustomEvent('chestx-command-open'));
}
</script>

<template>
  <header id="mainHeader" class="sticky top-0 z-50 border-b border-border-line bg-card-bg/85 backdrop-blur-xl">
    <div class="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-4 px-4 sm:px-6 lg:px-8">

      <!-- 品牌 -->
      <button
        id="brandLogoBtn"
        type="button"
        class="group flex flex-none items-center gap-2.5 text-left transition-opacity duration-150 hover:opacity-80"
        @click="actions.switchPage('home')"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-brand-300 shadow-1">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 7c-2.6-1.6-6-1-6 3.4 0 3.4 2.2 6.3 5 8.6" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 7c2.6-1.6 6-1 6 3.4 0 3.4-2.2 6.3-5 8.6" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.5 12.5h1.6l1 1.8 1.2-3.2 1 1.4h1.7" class="text-brand-100" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="flex items-baseline gap-1.5 leading-tight">
            <span class="text-md font-semibold tracking-tight text-text-1">胸影智识</span>
            <span class="text-2xs font-medium tracking-wide text-text-3">ChestX-AI</span>
          </span>
          <span class="hidden text-2xs leading-tight text-text-3 sm:block">{{ $t('胸部X光AI影像解读') }}</span>
        </span>
      </button>

      <!-- 主导航 -->
      <nav class="hidden items-center gap-0.5 min-[1360px]:flex" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          :data-nav="item.key"
          :aria-current="nav.activePage.value === item.key ? 'page' : undefined"
          :class="[
            'relative flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[16px] font-medium transition-colors duration-150',
            nav.activePage.value === item.key
              ? 'bg-brand-50 text-brand-800'
              : 'text-text-2 hover:bg-surface-sunken hover:text-text-1'
          ]"
          @click="actions.switchPage(item.key)"
        >
          <span>{{ locale === 'en' ? item.short : $t(item.label) }}</span>
          <span v-if="item.live" class="h-1.5 w-1.5 flex-none rounded-full bg-brand-500" aria-hidden="true"></span>
          <span
            v-if="item.badge"
            id="navRecordBadge"
            class="min-w-[18px] rounded-full bg-ink-900 px-1.5 text-center text-2xs font-semibold leading-[18px] text-white tnum"
          >{{ recordCount }}</span>
          <span v-if="item.tag" class="hidden rounded bg-info-soft px-1.5 text-3xs font-semibold leading-4 text-info min-[1600px]:inline">{{ $t(item.tag) }}</span>
        </button>
      </nav>

      <div class="flex-1"></div>

      <!-- 右侧操作 -->
      <div class="flex flex-none items-center gap-1.5">
        <CommandPalette />

        <button
          id="openStatsBtn"
          type="button"
          class="btn-ghost hidden sm:inline-flex"
          :title="$t('查看成员健康数据看板')"
          :aria-label="$t('查看成员健康数据看板')"
          @click="actions.openStatsModal()"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 19V10M10 19V5M16 19v-6M22 19H2" />
          </svg>
          <span class="hidden min-[1600px]:inline">{{ $t('数据看板') }}</span>
        </button>

        <span class="hidden h-5 w-px bg-border-line md:block"></span>

        <button
          id="openUserModalBtn"
          type="button"
          class="flex h-9 items-center gap-2 rounded-md border border-border-line bg-card-bg px-2 pr-2.5 text-left transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50"
          :title="$t('当前家庭成员')"
          @click="actions.openFamilyModal()"
        >
          <span id="navUserAvatar" class="flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-2xs font-semibold text-white">{{ initial }}</span>
          <span id="navUserName" class="hidden text-xs font-medium text-text-1 md:inline">{{ displayName }}</span>
        </button>

        <button
          type="button"
          data-locale="toggle"
          class="btn-ghost px-2 font-semibold"
          :aria-label="locale === 'en' ? '切换到中文' : 'Switch to English'"
          @click="toggleLocale"
        >{{ locale === 'en' ? '中' : 'EN' }}</button>

        <button
          id="openSettingsBtn"
          type="button"
          class="btn-ghost hidden w-9 px-0 sm:inline-flex"
          :title="$t('设置')"
          :aria-label="$t('打开设置')"
          @click="actions.openFamilyModal()"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 窄屏导航：横向滚动，不折叠成汉堡，演示时点击更快 -->
    <nav class="flex items-center gap-1 overflow-x-auto border-t border-border-line px-4 py-1.5 min-[1360px]:hidden" aria-label="主导航">
      <button
        type="button"
        data-command-mobile
        class="hidden h-8 flex-none items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-brand-700 max-[479px]:inline-flex"
        :aria-label="$t('搜索')"
        @click="openCommandFromMobile"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="m20 20-3.5-3.5" /></svg>
        {{ $t('搜索') }}
      </button>
      <button
        v-for="item in navItems"
        :key="'m-' + item.key"
        type="button"
        :class="[
          'flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors duration-150',
          nav.activePage.value === item.key ? 'bg-brand-50 text-brand-800' : 'text-text-2'
        ]"
        @click="actions.switchPage(item.key)"
      >
        {{ locale === 'en' ? item.short : $t(item.label) }}
        <span v-if="item.badge" class="rounded-full bg-ink-900 px-1.5 text-3xs font-semibold leading-4 text-white tnum">{{ recordCount }}</span>
      </button>
      <button
        type="button"
        data-locale="mobile"
        class="ml-auto hidden h-8 flex-none items-center rounded-md px-2.5 text-xs font-semibold text-brand-700 max-[479px]:inline-flex"
        :aria-label="locale === 'en' ? '切换到中文' : 'Switch to English'"
        @click="toggleLocale"
      >{{ locale === 'en' ? '中' : 'EN' }}</button>
    </nav>
  </header>
  <DemoGuide />
</template>

<style scoped>
/* .btn-ghost 的 display 会覆盖 Tailwind 的 hidden，这里用媒体查询兜底 */
@media (max-width: 575px) {
  #openStatsBtn,
  #openSettingsBtn { display: none; }
}
@media (max-width: 479px) {
  [data-locale='toggle'] { display: none !important; }
}
</style>
