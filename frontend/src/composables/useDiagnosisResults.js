import { computed, nextTick, ref, watch } from 'vue';
import { echarts } from '../utils/echarts.js';
import { DISEASE_KNOWLEDGE_LIST } from '../stores/referenceData.js';
import { getRiskStyle, isNormalDominant } from '../utils/format.js';

export function useDiagnosisResults({ AppState, actions }, chartRef) {
  let chart = null;
  let observer = null;
  let disposed = false;
  const reportMode = ref('patient');
  const probExpanded = ref(false);
  const currentCase = computed(() => AppState.currentCase);
  const risk = computed(() => getRiskStyle(currentCase.value?.riskLevel));
  const probabilities = computed(() => {
    const values = currentCase.value?.probabilities || [];
    const normal = isNormalDominant(values);
    return [...values].sort((a, b) => b.prob - a.prob).map(item => ({
      ...item, risk: getRiskStyle(normal ? 0 : Number(item.prob), item.code),
      description: DISEASE_KNOWLEDGE_LIST.find(disease => disease.code === item.code)?.xrayFeature || '胸部常见X光征象'
    }));
  });
  const topProbabilities = computed(() => probabilities.value.slice(0, 3));
  const agentResult = computed(() => currentCase.value?.agentResult || null);
  const agentSteps = computed(() => agentResult.value?.steps || []);
  const uncertainty = computed(() => agentResult.value?.inference?.uncertainty || null);
  const groundedness = computed(() => report.value?.groundedness || null);
  const report = computed(() => agentResult.value?.report || null);
  const reportSummary = computed(() => {
    if (!report.value) return '';
    return reportMode.value === 'doctor'
      ? (report.value.doctor_summary || report.value.summary || '')
      : (report.value.patient_summary || report.value.summary || '');
  });
  const riskExplanation = computed(() => report.value?.risk_explanation || '');
  const followUpQuestions = computed(() => (report.value?.follow_up_questions || []).slice(0, 3));
  function toggleProbabilities() {
    probExpanded.value = !probExpanded.value;
  }
  function setReportMode(mode) {
    reportMode.value = mode === 'doctor' ? 'doctor' : 'patient';
  }
  const reportActions = computed(() => [
    ...(agentResult.value?.report?.suggested_actions || []),
    ...(agentResult.value?.report?.limitations || []).map(item => '局限：' + item)
  ]);
  const reportFindings = computed(() => {
    const values = agentResult.value?.report?.findings;
    return Array.isArray(values) ? values : [];
  });
  const reportImpression = computed(() => {
    const values = agentResult.value?.report?.impression;
    return Array.isArray(values) ? values : [];
  });
  const patientNext = computed(() => reportActions.value[0] || '携带原始影像和既往片，到呼吸科或影像科门诊复核。');
  const patientWarning = computed(() => reportActions.value.find((item) => /急诊|呼吸困难|咯血|胸痛/.test(String(item))) || '出现胸痛、呼吸困难、咯血或症状加重时，及时急诊就医。');
  const evidence = computed(() => {
    const sources = new Map((agentResult.value?.sources || []).map(item => [item.id, item]));
    const used = new Set();
    const cited = (agentResult.value?.report?.evidence || []).flatMap(item => {
      const source = sources.get(item.chunk_id);
      if (!source) return [];
      used.add(source.id);
      return [{ ...source, claim: item.claim || source.content }];
    });
    // The report may cite only 3 claims; keep the remaining retrieved sources
    // available in the same collapsible list so the UI matches "sources: 10".
    const remaining = [...sources.values()]
      .filter(source => !used.has(source.id))
      .map(source => ({ ...source, claim: source.content || source.title || '' }));
    return [...cited, ...remaining].slice(0, 10);
  });
  function openKnowledge(code) {
    if (code) AppState.selectedDiseaseCode = code;
    actions.switchPage('knowledge');
    actions.showToast('已为您定位至该疾病的健康科普详情', 'info');
  }
  function openRelatedKnowledge() { openKnowledge(probabilities.value[0]?.code); }
  async function renderProbabilityChart() {
    await nextTick();
    if (disposed || AppState.probViewMode !== 'chart' || AppState.diagnoseStatus !== 'done' || !chartRef.value) return;
    if (!chart) chart = echarts.init(chartRef.value);
    const sorted = [...(currentCase.value?.probabilities || [])].sort((a, b) => a.prob - b.prob);
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: value => Number(value).toFixed(1) + '%' },
      grid: { left: '3%', right: '10%', top: '4%', bottom: '4%', containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#86909C', fontSize: 11 }, splitLine: { lineStyle: { color: '#E5E6EB', type: 'dashed' } } },
      yAxis: { type: 'category', data: sorted.map(item => item.name.split(' ')[0]), axisLabel: { color: '#1D2129', fontSize: 12 } },
      series: [{ name: '概率', type: 'bar', barWidth: 12, data: sorted.map(item => ({ value: item.prob, itemStyle: { color: getRiskStyle(Number(item.prob), item.code).color, borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11, color: '#4E5969' } }]
    });
    chart.resize();
  }
  function mount() {
    if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(chartRef.value);
    }
    renderProbabilityChart();
  }
  function setProbabilityMode(mode) { AppState.probViewMode = mode; }
  watch(probExpanded, () => { if (probExpanded.value) nextTick(renderProbabilityChart); });
  function dispose() { disposed = true; observer?.disconnect(); observer = null; chart?.dispose(); chart = null; }
  return { currentCase, risk, probabilities, topProbabilities, probExpanded, toggleProbabilities, agentResult, agentSteps, uncertainty, groundedness, report, reportMode, reportSummary, reportFindings, reportImpression, patientNext, patientWarning, riskExplanation, followUpQuestions, reportActions, evidence, setReportMode, openKnowledge, openRelatedKnowledge, renderProbabilityChart, setProbabilityMode, mount, dispose };
}

