<script setup>
import { computed } from 'vue';
import { useRecordsPage } from '../composables/useRecordsPage.js';
import { useComparison } from '../composables/useComparison.js';
import ComparisonPanel from './ComparisonPanel.vue';
import { formatProb, getRiskStyle } from '../utils/format.js';
const ctx = useRecordsPage();
const { AppState, actions, records, filteredRecords } = ctx;
const comparison = useComparison(ctx);
const hasDemo = computed(() => (filteredRecords.value || []).some((record) => record.isDemo));
const topThree = rec => [...(rec.probabilities || [])].sort((a,b) => b.prob-a.prob).slice(0,3);
</script>
<template>
<section id="page-records" class="page-view space-y-6" :class="{ active: AppState.currentPage === 'records' }">
      <!-- 顶部概览与筛选栏 -->
      <div class="med-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-line pb-4">
          <div>
            <h1 class="text-xl font-semibold text-text-1">个人胸部影像健康档案</h1>
            <p class="text-xs text-text-3 mt-0.5">按时间倒序归档历次胸片AI解读记录，支持多维度筛选、详情回溯与报告导出</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-compare="open" @click="comparison.open()" class="btn-secondary !h-9 !text-xs">随访对比</button>
            <button v-if="hasDemo" type="button" data-demo="clear" @click="records.clearDemoRecords()" class="btn-secondary !h-9 !text-xs !text-warning">清除演示数据</button>
            <button type="button" id="recordsGoInterpretBtn" @click="actions.switchPage('interpret')" class="btn-primary !h-9 !text-xs">
              <span>＋ 新增胸片解读</span>
            </button>
          </div>
        </div>

        <!-- 筛选条件栏：时间范围筛选、风险等级筛选、关键词搜索 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label for="filterTimeRange" class="block text-xs font-medium text-text-2 mb-1">时间范围筛选</label>
            <select id="filterTimeRange" v-model="AppState.recordFilters.timeRange" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none">
              <option value="ALL">全部时间</option>
              <option value="7D">近 7 天</option>
              <option value="30D">近 30 天</option>
              <option value="YEAR">2026 年度</option>
            </select>
          </div>

          <div>
            <label for="filterRiskLevel" class="block text-xs font-medium text-text-2 mb-1">风险等级筛选</label>
            <select id="filterRiskLevel" v-model="AppState.recordFilters.riskLevel" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none">
              <option value="ALL">全部风险等级</option>
              <option value="HIGH">高风险 (需重点复查)</option>
              <option value="MEDIUM">中风险 (建议随访)</option>
              <option value="LOW">低风险 (未见明显异常)</option>
            </select>
          </div>

          <div>
            <label for="filterKeyword" class="block text-xs font-medium text-text-2 mb-1">关键词检索</label>
            <input
              id="filterKeyword" v-model="AppState.recordFilters.keyword"
              type="text"
              :placeholder="$t('recordsSearch')"
              class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex items-end gap-2">
            <button type="button" id="resetRecordFilterBtn" @click="records.resetFilters()" class="btn-secondary w-full !h-[38px]">
              重置筛选条件
            </button>
          </div>
        </div>
      </div>

      <!-- 随访对比面板 -->
      <ComparisonPanel :comparison="comparison" />

      <!-- 记录列表容器 -->
      <div id="recordsListContainer" class="space-y-4" :class="{ hidden: !filteredRecords.length }">
      <div v-for="rec in filteredRecords" :key="rec.id" class="med-card med-card-hover flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start gap-4 flex-1">
          <!-- 胸片缩略图 -->
          <div class="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-950 border border-border-line">
            <img :src="rec.imageUrl" :alt="rec.title" class="h-full w-full object-cover" />
            <span class="absolute bottom-1 right-1 rounded bg-slate-900/80 px-1 text-[10px] text-white">PA</span>
          </div>
          <div class="space-y-1.5 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold text-text-1">{{ rec.title }}</span>
              <span v-if="rec.isDemo" class="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">演示数据</span>
              <span :class="getRiskStyle(rec.riskLevel).badgeClass" class="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium">
                <span :class="getRiskStyle(rec.riskLevel).dotClass" class="h-1.5 w-1.5 rounded-full"></span>
                <span>{{ getRiskStyle(rec.riskLevel).shortLabel }}</span>
              </span>
              <span class="text-xs text-text-3 tabular-nums">诊断时间：{{ rec.createdAt }}</span>
            </div>
            <p class="text-xs text-text-2 leading-5">{{ rec.summary }}</p>
            <div class="flex flex-wrap items-center gap-2 pt-0.5">
              <span v-for="(probability, index) in topThree(rec)" :key="probability.code || index" class="rounded bg-page-bg border border-border-line px-2 py-0.5 text-[11px] text-text-2 tabular-nums">{{ probability.name.split(' ')[0] }}: <strong>{{ formatProb(probability.prob) }}</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end md:self-center shrink-0">
          <button type="button" :data-detail-id="rec.id" @click="records.openRecordDetail(rec)" class="record-detail-btn btn-secondary btn-sm">
            查看详情
          </button>
          <button type="button" :data-reload-id="rec.id" @click="records.reloadRecord(rec)" class="record-reload-btn btn-secondary btn-sm !text-primary">
            载入工作台
          </button>
          <button type="button" :data-delete-id="rec.id" @click="records.requestDelete(rec)" class="record-delete-btn btn-secondary btn-sm !text-danger hover:!border-danger">
            删除
          </button>
        </div>
      </div>
    </div>

      <!-- 空状态容器 (无记录时显示定制空状态插画+提示+「去解读」按钮) -->
      <div id="recordsEmptyState" class="med-card py-14 text-center" :class="{ hidden: filteredRecords.length > 0 }">
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
        <button type="button" id="emptyGoInterpretBtn" @click="actions.switchPage('interpret')" class="btn-primary mt-5">
          去智能解读
        </button>
      </div>
    </section>
</template>
