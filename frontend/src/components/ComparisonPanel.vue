<script setup>
import ChartCanvas from './ChartCanvas.vue';
import UiRiskPill from './ui/UiRiskPill.vue';

defineProps({ comparison: { type: Object, required: true } });
</script>

<template>
  <section v-if="comparison.state.open" class="panel p-4" data-comparison-panel :aria-label="$t('随访对比面板')">
    <div class="flex flex-wrap items-start justify-between gap-2 border-b border-border-line pb-3">
      <div class="min-w-0">
        <h2 class="text-md font-semibold text-text-1">{{ $t('随访对比与风险趋势') }}</h2>
        <p class="mt-0.5 text-xs text-text-2">{{ $t('同一成员两次解读的概率差、热力图与趋势；仅用于随访参考。') }}</p>
      </div>
      <button type="button" data-compare="close" class="btn-ghost flex-none" @click="comparison.close()">{{ $t('关闭对比') }}</button>
    </div>

    <!-- 选择两侧记录 -->
    <div class="mt-3 grid grid-cols-1 items-end gap-2 md:grid-cols-[1fr_auto_1fr]">
      <div>
        <label class="mb-1 block text-2xs font-medium text-text-2">{{ $t('较新一次') }}</label>
        <select v-model="comparison.state.leftId" :aria-label="$t('较新一次记录')" class="field h-9">
          <option v-for="item in comparison.options.value" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </div>
      <button type="button" data-compare="swap" class="btn-secondary h-9" :title="$t('交换左右记录')" @click="comparison.swap()">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16H3m0 0 3-3m-3 3 3 3M17 8h4m0 0-3-3m3 3-3 3" /></svg>
      </button>
      <div>
        <label class="mb-1 block text-2xs font-medium text-text-2">{{ $t('较早一次') }}</label>
        <select v-model="comparison.state.rightId" :aria-label="$t('较早一次记录')" class="field h-9">
          <option v-for="item in comparison.options.value" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </div>
    </div>

    <!-- 并排影像 -->
    <div v-if="comparison.left.value && comparison.right.value" class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      <article
        v-for="(record, side) in [comparison.left.value, comparison.right.value]"
        :key="record.id"
        class="panel overflow-hidden"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line px-3 py-2">
          <span class="text-2xs font-semibold text-text-1 tnum">
            {{ side === 0 ? $t('较新') : $t('较早') }} · {{ record.createdAt || record.date }}
          </span>
          <UiRiskPill :level="record.riskLevel" variant="short" />
        </div>
        <div data-surface="film" class="film-surface relative">
          <img
            :src="record.heatmapDataUrl || record.imageUrl"
            :alt="$t('影像') + '：' + record.title"
            class="h-52 w-full object-contain"
          />
          <span class="absolute bottom-1.5 right-1.5 rounded bg-ink-950/85 px-1.5 py-0.5 text-3xs text-film-text">
            {{ record.heatmapDataUrl ? $t('已保存热力图') : $t('原始影像 · 无热力图') }}
          </span>
        </div>
        <p class="line-clamp-2 px-3 py-2 text-2xs leading-relaxed text-text-2">{{ record.summary }}</p>
      </article>
    </div>

    <!-- 趋势 -->
    <div class="panel mt-3 p-3">
      <h3 class="text-xs font-semibold text-text-1">{{ $t('风险趋势（历次最高关注概率）') }}</h3>
      <ChartCanvas class="mt-1 h-56 w-full" :option="comparison.trendOption.value" :aria-label="$t('历次解读最高关注概率趋势')" />
    </div>

    <!-- 差异表 -->
    <div class="mt-3 overflow-x-auto rounded-md border border-border-line">
      <table class="w-full min-w-[480px] text-xs">
        <thead class="bg-surface-sunken text-text-2">
          <tr>
            <th class="px-3 py-2 text-left font-medium">{{ $t('征象') }}</th>
            <th class="px-3 py-2 text-right font-medium">{{ $t('较新') }}</th>
            <th class="px-3 py-2 text-right font-medium">{{ $t('较早') }}</th>
            <th class="px-3 py-2 text-right font-medium">{{ $t('变化') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in comparison.diffRows.value" :key="row.code" class="border-t border-border-line">
            <td class="px-3 py-1.5 text-text-1">{{ row.name }}</td>
            <td class="px-3 py-1.5 text-right text-text-1 tnum">{{ Number(row.left).toFixed(1) }}%</td>
            <td class="px-3 py-1.5 text-right text-text-2 tnum">{{ Number(row.right).toFixed(1) }}%</td>
            <td class="px-3 py-1.5 text-right font-semibold tnum" :class="row.delta > 0 ? 'text-danger' : row.delta < 0 ? 'text-success' : 'text-text-3'">
              {{ row.delta > 0 ? '↑ +' : row.delta < 0 ? '↓ ' : '— ' }}{{ Math.abs(row.delta).toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-2 text-3xs leading-relaxed text-text-3">
      {{ $t('概率变化不等于病情变化；设备、体位与曝光条件都会影响模型输出。随访结论应由医生结合症状、病史与正式影像报告判断。') }}
    </p>
  </section>
</template>
