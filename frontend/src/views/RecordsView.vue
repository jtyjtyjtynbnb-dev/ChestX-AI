<script setup>
import { computed } from 'vue';
import { useUserStore } from '../stores/useUserStore.js';

const userStore = useUserStore();
const currentRecords = computed(() => userStore.currentMember?.records || []);
</script>

<template>
<section id="page-records" class="page-view space-y-6">
      <!-- 顶部概览与筛选栏 -->
      <div class="med-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-line pb-4">
          <div>
            <h1 class="text-xl font-semibold text-text-1">个人胸部影像健康档案</h1>
            <p class="text-xs text-text-3 mt-0.5">按时间倒序归档历次胸片AI解读记录，支持多维度筛选、详情回溯与报告导出</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="recordsGoInterpretBtn" class="btn-primary !h-9 !text-xs">
              <span>＋ 新增胸片解读</span>
            </button>
          </div>
        </div>

        <!-- 筛选条件栏：时间范围筛选、风险等级筛选、关键词搜索 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label for="filterTimeRange" class="block text-xs font-medium text-text-2 mb-1">时间范围筛选</label>
            <select id="filterTimeRange" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none">
              <option value="ALL">全部时间</option>
              <option value="7D">近 7 天</option>
              <option value="30D">近 30 天</option>
              <option value="YEAR">2026 年度</option>
            </select>
          </div>

          <div>
            <label for="filterRiskLevel" class="block text-xs font-medium text-text-2 mb-1">风险等级筛选</label>
            <select id="filterRiskLevel" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none">
              <option value="ALL">全部风险等级</option>
              <option value="HIGH">高风险 (需重点复查)</option>
              <option value="MEDIUM">中风险 (建议随访)</option>
              <option value="LOW">低风险 (未见明显异常)</option>
            </select>
          </div>

          <div>
            <label for="filterKeyword" class="block text-xs font-medium text-text-2 mb-1">关键词检索</label>
            <input
              id="filterKeyword"
              type="text"
              placeholder="搜索文件名、病种或结论..."
              class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex items-end gap-2">
            <button type="button" id="resetRecordFilterBtn" class="btn-secondary w-full !h-[38px]">
              重置筛选条件
            </button>
          </div>
        </div>
      </div>

      <!-- 记录列表容器 -->
      <div id="recordsListContainer" class="space-y-4"></div>

      <!-- 空状态容器 (无记录时显示定制空状态插画+提示+「去解读」按钮) -->
      <div id="recordsEmptyState" class="hidden med-card py-14 text-center">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
          <svg class="w-12 h-12" viewBox="0 0 80 80" fill="none">
            <rect x="16" y="10" width="48" height="60" rx="6" stroke="currentColor" stroke-width="2.5" />
            <path d="M26 28H54M26 40H46M26 52H38" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="54" cy="54" r="11" fill="#0F62FE" fill-opacity="0.15" stroke="#0F62FE" stroke-width="2.5" />
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text-1">暂无匹配的胸片健康档案记录</h3>
        <p class="mt-1 text-xs text-text-3 max-w-md mx-auto">
          您还没有保存过符合当前筛选条件的胸片解读结果，立即上传胸部X光片体验AI智能解读并建立健康档案吧。
        </p>
        <button type="button" id="emptyGoInterpretBtn" class="btn-primary mt-5">
          去智能解读
        </button>
      </div>
    </section>
</template>
