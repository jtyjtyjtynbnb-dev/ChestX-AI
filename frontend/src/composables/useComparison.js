import { computed, reactive } from 'vue';

function timeOf(record) {
  const parsed = Date.parse(record?.createdAt || record?.date || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function topProbability(record) {
  const values = (record?.probabilities || [])
    .filter((item) => item.code !== 'no_finding')
    .map((item) => Number(item.prob) || 0);
  return values.length ? Math.max(...values) : 0;
}

export function useComparison({ AppState, store, actions }) {
  AppState.comparison ||= reactive({ open: false, leftId: '', rightId: '' });
  const state = AppState.comparison;

  const records = computed(() => {
    const memberRecords = store.currentMember?.records || AppState.records || [];
    return [...memberRecords].sort((a, b) => timeOf(b) - timeOf(a));
  });
  const options = computed(() => records.value.map((record) => ({
    id: record.id,
    label: `${record.createdAt || record.date || '未知时间'} · ${record.title || '胸片解读'}`,
  })));
  const left = computed(() => records.value.find((record) => record.id === state.leftId) || null);
  const right = computed(() => records.value.find((record) => record.id === state.rightId) || null);

  function open() {
    const [latest, previous] = records.value;
    if (!latest || !previous) {
      actions.showToast('至少需要两条健康档案记录才能进行随访对比', 'warning');
      return false;
    }
    state.leftId = latest.id;
    state.rightId = previous.id;
    state.open = true;
    return true;
  }
  function close() { state.open = false; }
  function swap() {
    [state.leftId, state.rightId] = [state.rightId, state.leftId];
  }

  const diffRows = computed(() => {
    if (!left.value || !right.value) return [];
    const map = new Map();
    for (const item of right.value.probabilities || []) {
      map.set(item.code, { code: item.code, name: item.name, right: Number(item.prob) || 0, left: 0 });
    }
    for (const item of left.value.probabilities || []) {
      const row = map.get(item.code) || { code: item.code, name: item.name, left: 0, right: 0 };
      row.left = Number(item.prob) || 0;
      row.name = item.name || row.name;
      map.set(item.code, row);
    }
    return [...map.values()]
      .map((row) => ({ ...row, delta: Number((row.left - row.right).toFixed(1)) }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  });

  const trendOption = computed(() => {
    const asc = [...records.value].sort((a, b) => timeOf(a) - timeOf(b));
    return {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>最高关注概率：<b>{c}%</b>' },
      grid: { left: '6%', right: '5%', top: 18, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: asc.map((record) => String(record.createdAt || record.date || '').slice(5, 10)),
        axisLabel: { color: '#86909C', fontSize: 11 },
      },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#86909C', fontSize: 11 }, splitLine: { lineStyle: { color: '#E5E6EB', type: 'dashed' } } },
      series: [{
        name: '最高关注概率',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: asc.map(topProbability),
        lineStyle: { color: '#0F62FE', width: 2.5 },
        itemStyle: { color: '#0F62FE' },
        areaStyle: { color: 'rgba(15, 98, 254, 0.10)' },
      }],
    };
  });

  const hasHeatmap = computed(() => Boolean(left.value?.heatmapDataUrl || right.value?.heatmapDataUrl));
  const diffSummary = computed(() => {
    if (!left.value || !right.value || !diffRows.value.length) return '';
    const topOf = (record) => {
      const rows = (record?.probabilities || []).filter((item) => item.code !== 'no_finding');
      return rows.sort((a, b) => (Number(b.prob) || 0) - (Number(a.prob) || 0))[0];
    };
    const latest = topOf(left.value);
    const earlier = topOf(right.value);
    const biggest = diffRows.value[0];
    const direction = biggest.delta > 0 ? '上升' : biggest.delta < 0 ? '下降' : '基本不变';
    return `模型最高关注从「${earlier?.name || '未知'}」变为「${latest?.name || '未知'}」；变化最大的征象是「${biggest.name}」，${direction} ${Math.abs(biggest.delta).toFixed(1)} 个百分点。该摘要只描述概率变化，不代表病情变化。`;
  });

  return { state, records, options, left, right, diffRows, diffSummary, trendOption, hasHeatmap, open, close, swap };
}
