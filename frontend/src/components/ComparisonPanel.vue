<script setup>
import ChartCanvas from './ChartCanvas.vue';
import { getRiskStyle } from '../utils/format.js';

defineProps({ comparison: { type: Object, required: true } });
</script>
<template>
  <section v-if="comparison.state.open" class="med-card space-y-4" data-comparison-panel aria-label="随访对比面板">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line pb-3">
      <div>
        <h2 class="text-lg font-semibold text-text-1">随访对比与风险趋势</h2>
        <p class="mt-0.5 text-xs text-text-3">同一成员两次胸片解读的概率差、热力图与风险趋势；仅用于健康科普随访参考。</p>
      </div>
      <button type="button" data-compare="close" class="btn-secondary btn-sm" @click="comparison.close()">✕ 关闭对比</button>
    </div>

    <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div>
        <span class="mb-1 block text-xs font-medium text-text-2">较新一次记录</span>
        <select v-model="comparison.state.leftId" aria-label="较新一次记录" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1">
          <option v-for="item in comparison.options.value" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </div>
      <button type="button" data-compare="swap" class="btn-secondary btn-sm" title="交换左右记录" @click="comparison.swap()">⇄ 交换</button>
      <div>
        <span class="mb-1 block text-xs font-medium text-text-2">较早一次记录</span>
        <select v-model="comparison.state.rightId" aria-label="较早一次记录" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1">
          <option v-for="item in comparison.options.value" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </div>
    </div>

    <div v-if="comparison.left.value && comparison.right.value" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <article v-for="(record, side) in [comparison.left.value, comparison.right.value]" :key="record.id" class="rounded-lg border border-border-line bg-page-bg p-3">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="font-semibold text-text-1">{{ side === 0 ? '较新' : '较早' }} · {{ record.createdAt || record.date }}</span>
          <span class="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-medium" :class="getRiskStyle(record.riskLevel).badgeClass">{{ getRiskStyle(record.riskLevel).shortLabel }}</span>
        </div>
        <div class="relative overflow-hidden rounded-md bg-slate-950">
          <img :src="record.heatmapDataUrl || record.imageUrl" :alt="(record.heatmapDataUrl ? '热力图' : '胸片') + '：' + record.title" class="h-56 w-full object-contain" />
          <span class="absolute bottom-1 right-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-white">{{ record.heatmapDataUrl ? '保存的热力图' : '原始影像（无热力图）' }}</span>
        </div>
        <p class="mt-2 line-clamp-2 text-xs leading-5 text-text-2">{{ record.summary }}</p>
      </article>
    </div>

    <div class="rounded-lg border border-border-line p-3">
      <div class="mb-2 text-sm font-semibold text-text-1">风险趋势（历次最高关注概率）</div>
      <ChartCanvas class="h-56 w-full" :option="comparison.trendOption.value" aria-label="历次胸片解读最高关注概率趋势折线图" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-border-line">
      <table class="w-full min-w-[520px] text-xs">
        <thead class="bg-page-bg text-text-2">
          <tr><th class="px-3 py-2 text-left font-medium">征象</th><th class="px-3 py-2 text-right font-medium">较新</th><th class="px-3 py-2 text-right font-medium">较早</th><th class="px-3 py-2 text-right font-medium">变化</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in comparison.diffRows.value" :key="row.code" class="border-t border-border-line/70">
            <td class="px-3 py-2 text-text-1">{{ row.name }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-1">{{ Number(row.left).toFixed(1) }}%</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-2">{{ Number(row.right).toFixed(1) }}%</td>
            <td class="px-3 py-2 text-right font-semibold tabular-nums" :class="row.delta > 0 ? 'text-danger' : row.delta < 0 ? 'text-success' : 'text-text-3'">
              {{ row.delta > 0 ? '↑ +' : row.delta < 0 ? '↓ ' : '— ' }}{{ Math.abs(row.delta).toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-[11px] leading-5 text-text-3">概率变化不等于病情变化；不同设备、体位、曝光条件都会影响模型输出。任何随访结论都应由医生结合症状、病史与正式影像报告判断。</p>
  </section>
</template>
