<script setup>
import { computed } from 'vue';
import { useShell } from '../composables/useShell.js';
import { getLocale, toggleLocale } from '../i18n/index.js';
const { actions, nav, member, recordCount } = useShell();
const locale = computed(() => getLocale());
</script>
<template>
<header class="sticky top-0 z-50 border-b border-border-line bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,40,80,0.04)]" id="mainHeader">
    <div class="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- 左侧 Logo + 名称 -->
      <button type="button" id="brandLogoBtn" @click="actions.switchPage('home')" class="flex items-center gap-3 cursor-pointer text-left group">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#2D7BFF] text-white shadow-[0_8px_18px_rgba(15,98,254,0.22)] group-hover:from-primary-dark group-hover:to-primary transition-colors">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18c-3.5 0-7 2.5-7 7.5 0 3.8 2 6.5 4.5 7.5M12 3c3.5 0 7 2.5 7 7.5 0 3.8-2 6.5-4.5 7.5M8 10h2m4 0h2m-8 4h2.5m3 0H16" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-semibold tracking-tight text-text-1">胸影智识</span>
            <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">ChestX-AI</span>
          </div>
          <p class="text-xs text-text-3 hidden sm:block">胸部X光影像AI健康科普与管理系统</p>
        </div>
      </button>

      <!-- 桌面端导航菜单 (≥992px 完整展开) -->
      <nav class="hidden lg:flex items-center gap-1" aria-label="主导航">
        <button type="button" data-nav="home" :class="nav.navClass('home')" @click="actions.switchPage('home')">
          首页
        </button>
        <button type="button" data-nav="interpret" :class="nav.navClass('interpret')" @click="actions.switchPage('interpret')">
          <span>智能解读</span>
          <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
        </button>
        <button type="button" data-nav="records" :class="nav.navClass('records')" @click="actions.switchPage('records')">
          <span>健康档案</span>
          <span id="navRecordBadge" class="rounded-full bg-primary/10 px-1.5 py-0.2 text-xs font-semibold text-primary tabular-nums">{{ recordCount }}</span>
        </button>
        <button type="button" data-nav="knowledge" :class="nav.navClass('knowledge')" @click="actions.switchPage('knowledge')">
          健康科普
        </button>
        <button type="button" data-nav="academy" :class="nav.navClass('academy')" @click="actions.switchPage('academy')">
          <span>影像课堂</span>
          <span class="rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">互动</span>
        </button>
        <button type="button" data-nav="about" :class="nav.navClass('about')" @click="actions.switchPage('about')">
          关于我们
        </button>
      </nav>

      <!-- 右侧操作区：用户状态 + 语言 + 设置 -->
      <div class="flex items-center gap-2.5">
        <button type="button" id="openStatsBtn" @click="actions.openStatsModal()" class="btn-secondary btn-sm hidden items-center gap-1 sm:flex" title="查看成员健康数据看板" aria-label="查看成员健康数据看板">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>数据看板</span>
        </button>

        <div id="openUserModalBtn" class="flex items-center gap-2 rounded-md border border-border-line bg-white px-2.5 py-1.5" title="当前家庭成员">
          <span id="navUserAvatar" class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">{{ (member?.profile.name || '林').slice(0, 1) }}</span>
          <span id="navUserName" class="hidden md:inline text-xs font-medium text-text-1">{{ member?.profile.name || '林知夏' }}</span>
        </div>
        <button type="button" data-locale="toggle" @click="toggleLocale" class="btn-secondary btn-sm" :aria-label="locale === 'en' ? '切换到中文' : 'Switch to English'">{{ locale === 'en' ? '中文' : 'EN' }}</button>
        <button type="button" id="openSettingsBtn" @click="actions.openFamilyModal()" class="btn-secondary btn-sm" title="设置" aria-label="打开设置">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path stroke-linecap="round" stroke-linejoin="round" d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/></svg>
        </button>
      </div>
    </div>
  </header>
</template>
