import { computed } from 'vue';
import { formatProb } from '../utils/format.js';
export function useDashboard({ AppState, actions, store }) {
  const stats = computed(() => {
    const records = store.records;
    return { total: records.length, high: records.filter(r=>r.riskLevel==='HIGH').length, medium: records.filter(r=>r.riskLevel==='MEDIUM').length, low: records.filter(r=>r.riskLevel==='LOW').length };
  });
  const summary = computed(() => {
    const latest=store.records[0], s=stats.value;
    if (!latest) return '暂无已保存记录，完成一次解读并保存后会生成成员专属摘要。';
    const top=[...(latest.probabilities || [])].sort((a,b)=>b.prob-a.prob)[0];
    return 'AI 统计提示：'+store.currentMember?.profile.name+' 共保存 '+s.total+' 次胸片解读，最近一次为'+(latest.createdAt || latest.date)+'。当前最高关注征象为「'+(top?.name || '暂无')+'」（'+formatProb(top?.prob)+'），风险分布为高风险 '+s.high+' 次、中风险 '+s.medium+' 次、低风险 '+s.low+' 次。该摘要仅用于健康科普参考，不作为医疗诊断依据。';
  });
  const statsPieOption=computed(()=>({tooltip:{trigger:'item',formatter:'{b}: {c} 份 ({d}%)'},legend:{bottom:0,textStyle:{color:'#4E5969',fontSize:12}},series:[{name:'风险等级分布',type:'pie',radius:['42%','70%'],data:[{value:stats.value.high,name:'高风险关注',itemStyle:{color:'#F53F3F'}},{value:stats.value.medium,name:'中风险随访',itemStyle:{color:'#FF8A00'}},{value:stats.value.low,name:'低风险正常',itemStyle:{color:'#00B42A'}}],label:{fontSize:12,color:'#1D2129'}}]}));
  function openStatsModal(){ actions.closeUserModal(); AppState.statsOpen=true; }
  function closeStatsModal(){ AppState.statsOpen=false; }
  return {stats,summary,statsPieOption,openStatsModal,closeStatsModal};
}
export const aboutChartOption = {
  tooltip:{trigger:'axis',formatter:'{b}<br/>模型输出：<b>{c}%</b>'}, grid:{left:'6%',right:'4%',top:'10%',bottom:'12%',containLabel:true},
  xAxis:{type:'category',data:['未见异常','肺不张','心脏扩大','胸腔积液','浸润影','肿块','结节','肺炎','气胸','实变'],axisLabel:{color:'#4E5969',fontSize:11,interval:0,rotate:20}},
  yAxis:{type:'value',min:0,max:100,axisLabel:{color:'#86909C',fontSize:11,formatter:'{value}%'},splitLine:{lineStyle:{color:'#E5E6EB',type:'dashed'}}},
  series:[{name:'模型输出',type:'bar',barWidth:20,data:[38.9,7.8,1.9,21.8,80.3,63.9,79.6,19.7,48.4,39.5],itemStyle:{color:'#0F62FE',borderRadius:[4,4,0,0]},label:{show:true,position:'top',fontSize:10,color:'#1D2129',formatter:'{c}%'}}]
};
