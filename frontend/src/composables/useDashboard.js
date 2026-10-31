import { computed } from 'vue';
import { formatProb } from '../utils/format.js';
import { DISEASE_KNOWLEDGE_LIST } from '../stores/referenceData.js';

export function useDashboard({ AppState, actions, store }) {
  const stats = computed(() => {
    const records = store.records || [];
    const total = records.length;
    const high = records.filter((record) => record.riskLevel === 'HIGH').length;
    const medium = records.filter((record) => record.riskLevel === 'MEDIUM').length;
    const low = records.filter((record) => record.riskLevel === 'LOW').length;
    const findings = new Map();
    records.forEach((record) => {
      const top = [...(record.probabilities || [])]
        .filter((item) => item.code !== 'no_finding')
        .sort((a, b) => Number(b.prob) - Number(a.prob))[0];
      if (!top || Number(top.prob) < 25) return;
      const current = findings.get(top.code) || { code: top.code, name: top.name, count: 0, maxProb: 0 };
      current.count += 1;
      current.maxProb = Math.max(current.maxProb, Number(top.prob) || 0);
      findings.set(top.code, current);
    });
    const topFindings = [...findings.values()].sort((a, b) => b.count - a.count || b.maxProb - a.maxProb);
    return {
      total,
      high,
      medium,
      low,
      memberCount: (store.appState?.familyMembers || []).length,
      highRatio: total ? Math.round((high / total) * 100) : 0,
      followUpCount: high + medium,
      topFindings,
      topFinding: topFindings[0] || null,
      latest: records[0] || null
    };
  });

  const memberRows = computed(() => (store.appState?.familyMembers || []).map((member) => {
    const records = member.records || [];
    return {
      id: member.id,
      name: member.profile?.name || '未命名成员',
      total: records.length,
      high: records.filter((record) => record.riskLevel === 'HIGH').length,
      medium: records.filter((record) => record.riskLevel === 'MEDIUM').length,
      low: records.filter((record) => record.riskLevel === 'LOW').length,
      latest: records[0]?.createdAt || '—',
      current: member.id === AppState.currentMemberId
    };
  }).sort((a, b) => Number(b.current) - Number(a.current) || b.total - a.total));

  const summary = computed(() => {
    const latest = stats.value.latest;
    const current = stats.value;
    if (!latest) return '暂无已保存记录。完成一次解读并保存后，这里会汇总成员的风险分布、高频关注征象和随访提示。';
    const top = current.topFinding;
    return `AI 统计提示：${store.currentMember?.profile.name || '当前成员'} 共保存 ${current.total} 次胸片解读，最近一次为 ${latest.createdAt || latest.date || '—'}。风险分布为高风险 ${current.high} 次、中风险 ${current.medium} 次、低风险 ${current.low} 次；${top ? `最常被模型关注的是「${top.name}」` : '暂未形成高频关注征象'}。该摘要仅用于健康科普参考，不作为医疗诊断依据。`;
  });
  const currentMemberName = computed(() => store.currentMember?.profile.name || '当前成员');

  const statsPieOption = computed(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 份 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#4E5969', fontSize: 11 } },
    series: [{
      name: '风险等级分布',
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '43%'],
      data: [
        { value: stats.value.high, name: '高风险关注', itemStyle: { color: '#F53F3F' } },
        { value: stats.value.medium, name: '中风险随访', itemStyle: { color: '#FF8A00' } },
        { value: stats.value.low, name: '低风险正常', itemStyle: { color: '#00B42A' } }
      ],
      label: { fontSize: 11, color: '#1D2129' }
    }]
  }));

  const statsFindingsOption = computed(() => {
    const data = [...stats.value.topFindings].slice(0, 6).reverse();
    return {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>被关注次数：<b>{c}</b> 次' },
      grid: { left: '3%', right: '12%', top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#86909C', fontSize: 10 },
        splitLine: { lineStyle: { color: '#E5E6EB', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: data.map((item) => item.name),
        axisLabel: { color: '#4E5969', fontSize: 10 },
        axisLine: { show: false }
      },
      series: [{
        type: 'bar',
        barWidth: 12,
        data: data.map((item) => item.count),
        itemStyle: { color: '#0F62FE', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', fontSize: 10, color: '#1D2129', formatter: '{c} 次' }
      }]
    };
  });

  const knowledgePoints = computed(() => {
    const top = stats.value.topFinding;
    const disease = top ? DISEASE_KNOWLEDGE_LIST.find((item) => item.code === top.code) : null;
    return [
      {
        tag: '风险分级',
        title: '高风险关注不等于确诊',
        text: '看板按模型最高概率分级：≥60% 为高风险关注，25%–60% 为中风险随访，低于 25% 为低风险正常。它只用于演示和随访提示，不是临床风险分层。',
        code: null
      },
      {
        tag: '本次重点',
        title: top ? `${top.name} 的胸片线索` : '完成一次解读后生成重点',
        text: disease?.xrayFeature || '保存解读记录后，这里会结合最高关注征象展示胸片表现和需要向医生确认的问题。',
        code: top?.code || null
      },
      {
        tag: '随访',
        title: '发现异常后如何复查',
        text: '复查时间取决于病变大小、形态、变化、年龄和危险因素，不能只按模型概率决定；请让医生结合正式影像和病史制定随访计划。',
        code: 'nodule'
      },
      {
        tag: 'AI 边界',
        title: '概率不能替代医生',
        text: '模型受训练数据、设备、体位和标签噪声影响，不能确诊、不能排除疾病；任何异常都应结合正规影像报告和医生面诊。',
        code: null
      }
    ];
  });

  function openStatsModal() {
    actions.closeUserModal();
    AppState.statsOpen = true;
  }
  function closeStatsModal() {
    AppState.statsOpen = false;
  }
  function openKnowledge(code) {
    closeStatsModal();
    if (code) AppState.selectedDiseaseCode = code;
    actions.switchPage('knowledge');
  }
  return { stats, memberRows, summary, currentMemberName, statsPieOption, statsFindingsOption, knowledgePoints, openStatsModal, closeStatsModal, openKnowledge };
}

export const aboutChartOption = {
  tooltip: { trigger: 'axis', formatter: '{b}<br/>模型输出：<b>{c}%</b>' },
  grid: { left: '6%', right: '4%', top: '10%', bottom: '12%', containLabel: true },
  xAxis: { type: 'category', data: ['未见异常', '肺不张', '心脏扩大', '胸腔积液', '浸润影', '肿块', '结节', '肺炎', '气胸', '实变'], axisLabel: { color: '#4E5969', fontSize: 11, interval: 0, rotate: 20 } },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#86909C', fontSize: 11, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#E5E6EB', type: 'dashed' } } },
  series: [{ name: '模型输出', type: 'bar', barWidth: 20, data: [38.9, 7.8, 1.9, 21.8, 80.3, 63.9, 79.6, 19.7, 48.4, 39.5], itemStyle: { color: '#0F62FE', borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', fontSize: 10, color: '#1D2129', formatter: '{c}%' } }]
};
