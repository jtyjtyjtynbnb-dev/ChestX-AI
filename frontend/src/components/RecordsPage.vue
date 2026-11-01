<script setup>
import { computed, ref } from 'vue';
import { useRecordsPage } from '../composables/useRecordsPage.js';
import { useComparison } from '../composables/useComparison.js';
import ComparisonPanel from './ComparisonPanel.vue';
import UiRiskPill from './ui/UiRiskPill.vue';
import { formatProb } from '../utils/format.js';
import { categoryColor } from '../utils/category.js';

const ctx = useRecordsPage();
const { AppState, actions, records, filteredRecords, store } = ctx;
const comparison = useComparison(ctx);

const hasDemo = computed(() => (filteredRecords.value || []).some((record) => record.isDemo));
const topThree = (rec) => [...(rec.probabilities || [])].sort((a, b) => b.prob - a.prob).slice(0, 3);

const memberName = computed(() => store.currentMember?.profile?.name || '当前成员');
const memberInitial = computed(() => memberName.value.slice(0, 1));

/** 概览指标：由已筛选记录直接算出 */
const stats = computed(() => {
  const list = filteredRecords.value || [];
  const count = (level) => list.filter((item) => item.riskLevel === level).length;
  return {
    total: list.length,
    high: count('HIGH'),
    medium: count('MEDIUM'),
    low: count('LOW')
  };
});

/** 风险分布环：颜色来自语义令牌 */
const ringStyle = computed(() => {
  const total = stats.value.total || 1;
  const high = (stats.value.high / total) * 100;
  const mid = (stats.value.medium / total) * 100;
  return {
    background: `conic-gradient(var(--risk-high) 0 ${high}%, var(--risk-mid) ${high}% ${high + mid}%, var(--risk-low) ${high + mid}% 100%)`
  };
});

/** 最近一次与上一次的最高概率差，用于概览趋势提示 */
const latestTrend = computed(() => {
  const list = filteredRecords.value || [];
  if (list.length < 2) return null;
  const topProb = (rec) => Math.max(...(rec.probabilities || []).map((item) => Number(item.prob) || 0), 0);
  const diff = topProb(list[0]) - topProb(list[1]);
  return {
    dir: Math.abs(diff) < 0.05 ? 'flat' : diff > 0 ? 'up' : 'down',
    text: (diff > 0 ? '+' : '') + diff.toFixed(1) + '%'
  };
});

const timeline = computed(() => (filteredRecords.value || []).map((rec, index) => ({
  ...rec,
  isLatest: index === 0,
  top: topThree(rec)
})));

/* ── AI 家庭健康共脑：摘要、差异与随访计划 ── */
const planOpen = ref(false);
const latestRecord = computed(() => filteredRecords.value?.[0] || null);

const deltaItems = computed(() => {
  const list = filteredRecords.value || [];
  if (list.length < 2 || !list[0]?.probabilities) return [];
  const previous = new Map((list[1].probabilities || []).map((item) => [item.code, Number(item.prob) || 0]));
  return topThree(list[0]).map((item) => {
    const before = previous.get(item.code);
    const delta = before == null ? null : Number(item.prob) - before;
    return { code: item.code, name: item.name.split(' ')[0], prob: Number(item.prob), delta };
  }).filter((item) => item.delta != null);
});

const followUpWindow = computed(() => (stats.value.high ? '4–6 周' : stats.value.medium ? '3–6 个月' : '12 个月'));
const followUpSteps = computed(() => [
  {
    when: '本周',
    title: stats.value.high ? '带片至呼吸科 / 胸外科门诊' : '预约常规门诊或体检',
    desc: stats.value.high ? '携带原始影像与报告，结合症状、血常规与 CRP 由医生判断。' : '目前没有高风险记录，按常规体检节奏随访即可。'
  },
  {
    when: followUpWindow.value,
    title: '复查影像并对比',
    desc: stats.value.high ? '复查胸片或低剂量 CT，重点观察浸润影 / 结节的吸收与变化。' : '复查同一征象，确认概率与影像表现是否稳定。'
  },
  {
    when: '长期',
    title: '管理危险因素',
    desc: '戒烟、接种疫苗、控制慢病；符合指征者按年度低剂量 CT 随访。'
  }
]);

async function copyFollowUpPlan() {
  const text = [
    `${memberName.value} · 随访计划`,
    ...followUpSteps.value.map((step, index) => `${index + 1}. ${step.when}：${step.title}。${step.desc}`)
  ].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    actions.showToast('随访计划已复制', 'success');
  } catch {
    actions.showToast('当前浏览器不支持自动复制，请手动选择文本复制', 'warning');
  }
}

function dateParts(value) {
  const [date, time] = String(value || '').split(' ');
  return { date: date || '—', time: time || '' };
}
</script>

<template>
  <section id="page-records" class="page-view records-page space-y-4" :class="{ active: AppState.currentPage === 'records' }">

    <!-- ══ Hero：成员 + 风险分布 ═════════════════════════════════ -->
    <div class="records-hero">
      <div class="records-hero-glow" aria-hidden="true"></div>
      <div class="grid items-center gap-8 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <span class="hero-eyebrow">HEALTH ARCHIVE · {{ $t('本地健康档案') }}</span>
          <h1 class="hero-title">{{ $t('把每一次胸片，连成一条健康时间线') }}</h1>
          <p class="hero-desc">
            {{ $t('按成员归档历次胸片、概率与结论，支持随访对比、风险筛选与报告回看。原始影像不出本机。') }}
          </p>

          <div class="hero-chips">
            <span class="hero-member">
              <span class="hero-avatar">{{ memberInitial }}</span>
              {{ memberName }}
            </span>
            <span class="hero-chip"><strong>{{ stats.total }}</strong> {{ $t('次解读') }}</span>
            <span v-if="latestTrend" class="hero-chip" :class="latestTrend.dir === 'up' ? 'text-danger' : latestTrend.dir === 'down' ? 'text-success' : 'text-film-dim'">
              {{ latestTrend.text }} <span class="text-film-dim">{{ $t('较上次最高概率') }}</span>
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-5">
            <button type="button" data-compare="open" class="btn-on-dark" @click="comparison.open()">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 3v18M16 3v18M3 8h18M3 16h18" /></svg>
              {{ $t('随访对比') }}
            </button>
            <button v-if="hasDemo" type="button" data-demo="clear" class="btn-ghost records-clear" @click="records.clearDemoRecords()">{{ $t('清除演示数据') }}</button>
            <button type="button" id="recordsGoInterpretBtn" class="btn-primary" @click="actions.switchPage('interpret')">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
              {{ $t('新增解读') }}
            </button>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="ring-card">
            <div class="ring-wrap">
              <div class="ring" :style="ringStyle" role="img" :aria-label="$t('风险等级分布')">
                <div class="ring-inner">
                  <strong>{{ stats.total }}</strong>
                  <span>{{ $t('累计解读') }}</span>
                </div>
              </div>
            </div>
            <div class="ring-legend">
              <div class="ring-row">
                <span class="ring-dot bg-danger"></span>
                <span class="flex-1">{{ $t('高风险') }}</span>
                <strong class="tnum">{{ stats.high }}</strong>
              </div>
              <div class="ring-row">
                <span class="ring-dot bg-warning"></span>
                <span class="flex-1">{{ $t('中风险') }}</span>
                <strong class="tnum">{{ stats.medium }}</strong>
              </div>
              <div class="ring-row">
                <span class="ring-dot bg-success"></span>
                <span class="flex-1">{{ $t('低风险') }}</span>
                <strong class="tnum">{{ stats.low }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ AI 家庭健康共脑 ═══════════════════════════════════════ -->
    <section v-if="stats.total" class="records-brain">
      <div class="brain-head">
        <div class="min-w-0">
          <span class="brain-kicker">AI 共脑 · {{ $t('家庭健康摘要') }}</span>
          <h2 class="brain-title">{{ $t('把档案变成下一步行动') }}</h2>
          <p class="brain-sub">{{ $t('基于当前成员档案的历次记录、风险分布与概率变化，给出可执行的随访建议。') }}</p>
        </div>
        <span class="tag flex-none">{{ $t('基于') }} {{ stats.total }} {{ $t('次记录') }}</span>
      </div>

      <div class="brain-grid">
        <article class="brain-card">
          <span class="brain-label">{{ $t('最近一次') }}</span>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            <strong class="brain-strong">{{ latestRecord?.createdAt || '—' }}</strong>
            <UiRiskPill v-if="latestRecord" :level="latestRecord.riskLevel" variant="short" />
          </div>
          <p class="brain-copy">{{ latestRecord?.summary || '—' }}</p>
          <div v-if="deltaItems.length" class="brain-delta">
            <span class="brain-delta-label">{{ $t('较上次变化') }}</span>
            <span v-for="item in deltaItems" :key="item.code" class="brain-delta-item">
              {{ $t(item.name) }}
              <strong :class="item.delta > 0 ? 'text-danger' : item.delta < 0 ? 'text-success' : 'text-text-3'">
                {{ item.delta > 0 ? '+' : '' }}{{ item.delta.toFixed(1) }}%
              </strong>
            </span>
          </div>
        </article>

        <article class="brain-card">
          <span class="brain-label">{{ $t('风险分布') }}</span>
          <div class="brain-risk-row">
            <span class="brain-risk-dot bg-danger"></span>{{ $t('高风险') }} <strong>{{ stats.high }}</strong>
            <span class="brain-risk-dot bg-warning"></span>{{ $t('中风险') }} <strong>{{ stats.medium }}</strong>
            <span class="brain-risk-dot bg-success"></span>{{ $t('低风险') }} <strong>{{ stats.low }}</strong>
          </div>
          <p class="brain-copy">
            {{ stats.high ? $t('存在高风险记录，建议优先安排门诊与复查。') : stats.medium ? $t('存在中风险记录，建议按 3–6 个月节奏复查。') : $t('当前均为低风险记录，保持年度体检即可。') }}
          </p>
        </article>

        <article class="brain-card is-action">
          <span class="brain-label">{{ $t('建议随访') }}</span>
          <strong class="brain-window">{{ followUpWindow }}</strong>
          <p class="brain-copy">{{ followUpSteps[1].desc }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button type="button" class="btn-secondary btn-sm" @click="planOpen = !planOpen">{{ planOpen ? $t('收起随访计划') : $t('生成随访计划') }}</button>
            <button type="button" class="btn-ghost text-brand-700" @click="copyFollowUpPlan">{{ $t('复制') }}</button>
          </div>
        </article>
      </div>

      <div v-if="planOpen" class="brain-plan">
        <div v-for="(step, index) in followUpSteps" :key="step.when" class="brain-plan-step">
          <span class="brain-step-no">0{{ index + 1 }}</span>
          <div>
            <span class="brain-step-when">{{ step.when }}</span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 筛选工具条 ═══════════════════════════════════════════ -->
    <div class="records-toolbar">
      <div class="toolbar-search">
        <svg class="h-4 w-4 flex-none text-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="m20 20-3.5-3.5" /></svg>
        <input id="filterKeyword" v-model="AppState.recordFilters.keyword" type="text" :placeholder="$t('recordsSearch')" class="w-full bg-transparent text-xs text-text-1 outline-none placeholder:text-text-3" />
      </div>

      <label class="sr-only" for="filterTimeRange">{{ $t('时间范围') }}</label>
      <select id="filterTimeRange" v-model="AppState.recordFilters.timeRange" class="toolbar-select">
        <option value="ALL">{{ $t('全部时间') }}</option>
        <option value="7D">{{ $t('近 7 天') }}</option>
        <option value="30D">{{ $t('近 30 天') }}</option>
        <option value="YEAR">{{ $t('2026 年度') }}</option>
      </select>

      <label class="sr-only" for="filterRiskLevel">{{ $t('风险等级') }}</label>
      <select id="filterRiskLevel" v-model="AppState.recordFilters.riskLevel" class="toolbar-select">
        <option value="ALL">{{ $t('全部等级') }}</option>
        <option value="HIGH">{{ $t('高风险') }}</option>
        <option value="MEDIUM">{{ $t('中风险') }}</option>
        <option value="LOW">{{ $t('低风险') }}</option>
      </select>

      <button type="button" id="resetRecordFilterBtn" class="toolbar-reset" @click="records.resetFilters()">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>
        {{ $t('重置筛选') }}
      </button>

      <span class="ml-auto hidden text-2xs text-text-3 sm:inline">{{ $t('共') }} <strong class="text-text-1 tnum">{{ stats.total }}</strong> {{ $t('条记录') }}</span>
    </div>

    <!-- 随访对比 -->
    <ComparisonPanel :comparison="comparison" />

    <!-- ══ 时间线 ═══════════════════════════════════════════════ -->
    <div class="timeline-head">
      <div>
        <h2 class="text-lg font-semibold text-text-1">{{ $t('解读时间线') }}</h2>
        <p class="text-2xs text-text-3">{{ $t('按时间倒序排列，点击详情查看完整报告与热力图。') }}</p>
      </div>
      <span class="tag">{{ memberName }} · {{ $t('本地存储') }}</span>
    </div>

    <div id="recordsListContainer" class="record-timeline" :class="{ hidden: !filteredRecords.length }">
      <article v-for="rec in timeline" :key="rec.id" class="record-row" :class="{ 'is-latest': rec.isLatest }">
        <div class="record-date">
          <span class="record-day tnum">{{ dateParts(rec.createdAt).date }}</span>
          <span class="record-time tnum">{{ dateParts(rec.createdAt).time }}</span>
          <span v-if="rec.isLatest" class="record-latest">{{ $t('最近') }}</span>
        </div>

        <div class="record-card">
          <div class="record-media">
            <img :src="rec.imageUrl" :alt="rec.title" loading="lazy" />
            <span class="record-pa">PA</span>
            <span class="record-heat" aria-hidden="true"></span>
          </div>

          <div class="record-main">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <h3 class="record-title">{{ rec.title }}</h3>
                  <UiRiskPill :level="rec.riskLevel" variant="short" />
                  <span v-if="rec.isDemo" class="tag border-warning-line bg-warning-soft text-warning-strong">{{ $t('演示数据') }}</span>
                </div>
                <p class="record-summary">{{ rec.summary }}</p>
              </div>

              <div class="record-actions">
                <button type="button" :data-detail-id="rec.id" class="btn-secondary btn-sm" @click="records.openRecordDetail(rec)">{{ $t('详情') }}</button>
                <button type="button" :data-reload-id="rec.id" class="btn-ghost text-brand-700" @click="records.reloadRecord(rec)">{{ $t('载入') }}</button>
                <button type="button" :data-delete-id="rec.id" class="record-delete" :aria-label="$t('删除')" @click="records.requestDelete(rec)">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>

            <div class="record-probs">
              <div v-for="(probability, index) in rec.top" :key="probability.code || index" class="record-prob">
                <div class="record-prob-head">
                  <span class="record-prob-dot" :style="{ backgroundColor: categoryColor(probability.code) }"></span>
                  <span class="truncate">{{ $t(probability.name.split(' ')[0]) }}</span>
                  <strong class="tnum">{{ formatProb(probability.prob) }}</strong>
                </div>
                <div class="record-prob-track">
                  <div class="record-prob-fill" :style="{ width: probability.prob + '%', backgroundColor: categoryColor(probability.code) }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- ══ 空态 ═════════════════════════════════════════════════ -->
    <div id="recordsEmptyState" class="records-empty" :class="{ hidden: filteredRecords.length > 0 }">
      <div class="empty-orbit" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <h3 class="mt-3 text-md font-semibold text-text-1">{{ $t('暂无匹配的档案记录') }}</h3>
      <p class="mt-1 max-w-sm text-xs leading-relaxed text-text-2">{{ $t('还没有保存过符合当前筛选条件的解读结果。上传一张胸片即可开始建立档案。') }}</p>
      <button type="button" id="emptyGoInterpretBtn" class="btn-primary mt-4" @click="actions.switchPage('interpret')">{{ $t('去智能解读') }}</button>
    </div>
  </section>
</template>

<style scoped>
.records-page { --record-accent: var(--brand-500); }

/* ── Hero ─────────────────────────────────────────────────── */
.records-hero {
  position: relative;
  overflow: hidden;
  padding: 26px 28px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(680px 340px at 8% -20%, color-mix(in srgb, var(--brand-500) 22%, transparent), transparent 62%),
    radial-gradient(520px 300px at 96% 10%, color-mix(in srgb, var(--cat-effusion) 14%, transparent), transparent 62%),
    linear-gradient(135deg, var(--film-850) 0%, var(--film-panel) 55%, var(--film-850) 100%);
  box-shadow: var(--shadow-3);
}
.records-hero-glow {
  position: absolute;
  inset: -30% -10% auto;
  height: 70%;
  background: radial-gradient(36% 50% at 20% 30%, color-mix(in srgb, var(--brand-500) 24%, transparent), transparent 70%);
  filter: blur(38px);
  pointer-events: none;
}
.hero-eyebrow { position: relative; color: var(--brand-300); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.hero-title { position: relative; margin-top: 6px; font-size: clamp(26px, 3.2vw, 38px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: var(--film-text); }
.hero-desc { position: relative; max-width: 56ch; margin-top: 8px; font-size: var(--text-sm); line-height: 1.75; color: var(--film-dim); }
.hero-chips { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
.hero-member {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 10px 3px 4px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--brand-300) 30%, transparent);
  background: color-mix(in srgb, var(--brand-400) 10%, transparent);
  color: var(--film-text);
  font-size: var(--text-2xs);
  font-weight: 600;
}
.hero-avatar { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--brand-500); color: #fff; font-size: 19px; font-weight: 700; }
.hero-chip { padding: 3px 9px; border-radius: var(--radius-pill); border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-raise) 50%, transparent); color: var(--film-dim); font-size: var(--text-3xs); }
.hero-chip strong { color: var(--film-text); font-size: var(--text-2xs); }
.btn-on-dark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--film-text) 22%, transparent);
  background: color-mix(in srgb, var(--film-text) 6%, transparent);
  color: var(--film-text);
  font-size: var(--text-sm);
  font-weight: 500;
}
.btn-on-dark:hover { border-color: color-mix(in srgb, var(--brand-300) 60%, transparent); background: color-mix(in srgb, var(--brand-400) 12%, transparent); }

.ring-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--film-line) 82%, transparent);
  background: color-mix(in srgb, var(--film-950) 46%, transparent);
}
.ring-wrap { flex: none; }
.ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--film-text) 8%, transparent);
}
.ring-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--film-850);
  border: 1px solid var(--film-line);
}
.ring-inner strong { color: var(--film-text); font-size: 28px; line-height: 1; font-variant-numeric: tabular-nums; }
.ring-inner span { margin-top: 3px; color: var(--film-dim); font-size: 19px; }
.ring-legend { display: flex; flex: 1; flex-direction: column; gap: 7px; min-width: 0; }
.ring-row { display: flex; align-items: center; gap: 7px; color: var(--film-dim); font-size: var(--text-2xs); }
.ring-row strong { color: var(--film-text); font-size: var(--text-xs); }
.ring-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }

/* ── 工具栏 ───────────────────────────────────────────────── */
.records-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-1);
}
.toolbar-search {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1 1 240px;
  min-width: 180px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-line);
  background: var(--surface-sunken);
}
.toolbar-search:focus-within { border-color: var(--brand-400); background: var(--surface-card); box-shadow: 0 0 0 3px var(--brand-50); }
.toolbar-select {
  height: 34px;
  padding: 0 28px 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-line);
  background-color: var(--surface-card);
  color: var(--color-text-1);
  font-size: var(--text-xs);
  cursor: pointer;
}
.toolbar-reset {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-2);
  font-size: var(--text-xs);
}
.toolbar-reset:hover { background: var(--surface-hover); color: var(--color-text-1); }

/* ── 时间线 ───────────────────────────────────────────────── */
.timeline-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 6px; }
.record-timeline { position: relative; padding-left: 160px; }
.record-timeline.hidden { display: none; }
.records-empty.hidden { display: none; }
.records-clear { color: color-mix(in srgb, var(--film-text) 78%, transparent); }
.records-clear:hover { color: var(--film-text); background: color-mix(in srgb, var(--film-text) 8%, transparent); }
.record-timeline::before {
  content: "";
  position: absolute;
  left: 136px;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: linear-gradient(180deg, var(--brand-300), var(--color-border-line) 30%, var(--color-border-line) 90%, transparent);
}
.record-row { position: relative; padding-bottom: 14px; }
.record-row:last-child { padding-bottom: 0; }
.record-row::before {
  content: "";
  position: absolute;
  left: -25px;
  top: 20px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid var(--surface-page);
  background: var(--ink-300);
}
.record-row.is-latest::before { background: var(--brand-500); box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-500) 16%, transparent); }
.record-date { position: absolute; left: -160px; top: 12px; width: 120px; text-align: right; }
.record-day { display: block; color: var(--color-text-1); font-size: var(--text-2xs); font-weight: 600; white-space: nowrap; }
.record-time { display: block; margin-top: 1px; color: var(--color-text-3); font-size: 19px; }
.record-latest { display: inline-block; margin-top: 4px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-50); color: var(--brand-800); font-size: 19px; font-weight: 600; }
.record-card {
  display: flex;
  gap: 14px;
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-1);
  transition: border-color var(--dur-2), box-shadow var(--dur-2), transform var(--dur-2);
}
.record-row.is-latest .record-card { border-color: color-mix(in srgb, var(--brand-300) 55%, var(--border-subtle)); box-shadow: var(--shadow-2); }
.record-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--brand-400) 45%, var(--border-subtle)); box-shadow: var(--shadow-2); }
.record-media { position: relative; flex: none; width: 104px; height: 104px; overflow: hidden; border-radius: var(--radius-md); border: 1px solid var(--film-line); background: var(--film-bg); }
.record-media img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.12); }
.record-pa { position: absolute; left: 5px; bottom: 5px; padding: 0 4px; border-radius: 3px; background: color-mix(in srgb, var(--ink-950) 78%, transparent); color: var(--film-text); font-size: 19px; font-weight: 700; }
.record-heat { position: absolute; inset: 0; background: radial-gradient(45% 40% at 38% 64%, rgba(255, 112, 67, 0.42), transparent 72%); mix-blend-mode: screen; }
.record-main { min-width: 0; flex: 1; }
.record-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-1); font-size: var(--text-sm); font-weight: 600; }
.record-summary { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px; color: var(--color-text-2); font-size: var(--text-xs); line-height: 1.7; }
.record-actions { display: flex; flex: none; align-items: center; gap: 4px; }
.record-delete { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-sm); border: 1px solid transparent; background: transparent; color: var(--color-text-3); }
.record-delete:hover { border-color: var(--risk-high-line); background: var(--risk-high-soft); color: var(--risk-high); }
.record-probs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--border-subtle); }
.record-prob { min-width: 0; }
.record-prob-head { display: flex; align-items: center; gap: 4px; color: var(--color-text-2); font-size: 19px; }
.record-prob-head strong { margin-left: auto; color: var(--color-text-1); font-size: var(--text-2xs); }
.record-prob-dot { width: 5px; height: 5px; border-radius: 50%; flex: none; }
.record-prob-track { height: 3px; margin-top: 4px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-sunken); }
.record-prob-fill { height: 100%; border-radius: inherit; }

/* ── 空态 ─────────────────────────────────────────────────── */
.records-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  border-radius: var(--radius-xl);
  border: 1px dashed var(--border-strong);
  background: linear-gradient(180deg, var(--surface-card) 0%, var(--brand-50) 100%);
}
.empty-orbit { position: relative; width: 52px; height: 52px; }
.empty-orbit span { position: absolute; inset: 0; border: 1px solid var(--brand-200); border-radius: 50%; animation: orbit 6s linear infinite; }
.empty-orbit span:nth-child(2) { inset: 10px; border-color: var(--brand-300); animation-duration: 4s; animation-direction: reverse; }
.empty-orbit span:nth-child(3) { inset: 21px; background: var(--brand-500); border: 0; animation: none; box-shadow: 0 0 16px color-mix(in srgb, var(--brand-500) 55%, transparent); }
@keyframes orbit { to { transform: rotate(360deg); } }

@media (max-width: 991px) {
  .record-timeline { padding-left: 0; }
  .record-timeline::before { display: none; }
  .record-row::before { display: none; }
  .record-date { position: static; width: auto; display: flex; align-items: baseline; gap: 8px; text-align: left; margin-bottom: 5px; padding-left: 2px; }
  .record-day, .record-time, .record-latest { display: inline-block; }
  .record-card { padding: 10px; }
}
@media (max-width: 575px) {
  .records-hero { padding: 20px; }
  .ring-card { flex-direction: column; align-items: flex-start; }
  .record-media { width: 76px; height: 76px; }
  .record-probs { grid-template-columns: 1fr; gap: 6px; }
  .record-actions { align-self: flex-end; }
}
@media (prefers-reduced-motion: reduce) {
  .empty-orbit span { animation: none; }
}

/* ── AI 家庭健康共脑 ── */
.records-brain { padding: 18px; border-radius: var(--radius-xl); border: 1px solid var(--brand-200); background: linear-gradient(135deg, var(--brand-50) 0%, var(--surface-card) 62%); box-shadow: var(--shadow-1); }
.brain-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.brain-kicker { color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.12em; }
.brain-title { margin-top: 3px; color: var(--color-text-1); font-size: var(--text-lg); font-weight: 700; letter-spacing: -0.01em; }
.brain-sub { margin-top: 3px; color: var(--color-text-3); font-size: var(--text-2xs); line-height: 1.65; }
.brain-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 13px; }
.brain-card { min-width: 0; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-card); }
.brain-card.is-action { border-color: var(--brand-200); background: linear-gradient(180deg, var(--surface-card), var(--brand-50)); }
.brain-label { display: block; color: var(--color-text-3); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.brain-strong { color: var(--color-text-1); font-size: var(--text-xs); font-weight: 700; }
.brain-copy { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 5px; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.7; }
.brain-delta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 8px; padding-top: 7px; border-top: 1px dashed var(--border-subtle); }
.brain-delta-label { color: var(--color-text-3); font-size: var(--text-3xs); }
.brain-delta-item { padding: 1px 6px; border-radius: var(--radius-pill); background: var(--surface-sunken); color: var(--color-text-2); font-size: var(--text-3xs); }
.brain-risk-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 9px; margin-top: 7px; color: var(--color-text-2); font-size: var(--text-2xs); }
.brain-risk-row strong { color: var(--color-text-1); font-weight: 700; }
.brain-risk-dot { width: 7px; height: 7px; border-radius: 50%; }
.brain-window { display: block; margin-top: 4px; color: var(--brand-700); font-size: var(--text-xl); font-weight: 700; line-height: 1.2; }
.brain-plan { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; margin-top: 10px; padding-top: 11px; border-top: 1px solid var(--brand-200); }
.brain-plan-step { display: flex; gap: 8px; padding: 9px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--surface-card) 82%, transparent); }
.brain-step-no { flex: none; color: var(--brand-600); font-size: var(--text-3xs); font-weight: 700; }
.brain-plan-step strong { display: block; margin-top: 1px; color: var(--color-text-1); font-size: var(--text-2xs); line-height: 1.5; }
.brain-plan-step p { margin-top: 2px; color: var(--color-text-3); font-size: var(--text-3xs); line-height: 1.6; }
.brain-step-when { display: inline-block; color: var(--brand-700); font-size: var(--text-3xs); font-weight: 700; }
@media (max-width: 900px) {
  .brain-grid, .brain-plan { grid-template-columns: 1fr 1fr; }
  .brain-card:last-child { grid-column: 1 / -1; }
}
@media (max-width: 640px) {
  .records-brain { padding: 14px; }
  .brain-head { flex-direction: column; }
  .brain-grid, .brain-plan { grid-template-columns: 1fr; }
  .brain-card:last-child { grid-column: auto; }
}
</style>
