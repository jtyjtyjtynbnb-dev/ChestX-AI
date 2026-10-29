import { formatNowTime } from '../utils/format.js';
import { CLINICAL_SAMPLE_CASES } from '../stores/referenceData.js';
export function useRecords({ AppState, actions }) {
  AppState.recordFilters ||= { timeRange: 'ALL', riskLevel: 'ALL', keyword: '' };
  AppState.pendingDeleteRecordId ??= null;
  let disposed = false;
  const currentMember = () => AppState.familyMembers.find(m => m.id === AppState.currentMemberId) || AppState.familyMembers[0];
  const currentRecords = () => currentMember()?.records || AppState.records || [];
  function filteredRecords() {
    const { timeRange, riskLevel, keyword } = AppState.recordFilters;
    return currentRecords().filter(rec => {
      const date = rec.createdAt || rec.date || '';
      const parsed = Date.parse(date);
      const days = Number.isFinite(parsed) ? Math.max(0, (Date.now()-parsed)/86400000) : Number(rec.daysAgo || 0);
      return (riskLevel === 'ALL' || rec.riskLevel === riskLevel) && (timeRange !== '7D' || days <= 7) && (timeRange !== '30D' || days <= 30) && (timeRange !== 'YEAR' || String(date).startsWith('2026')) && (!keyword.trim() || `${rec.title} ${rec.summary} ${rec.id}`.toLowerCase().includes(keyword.trim().toLowerCase()));
    }).sort((a,b) => (Date.parse(b.createdAt || b.date) || 0)-(Date.parse(a.createdAt || a.date) || 0));
  }
  function resetFilters() { if(disposed) return; Object.assign(AppState.recordFilters,{timeRange:'ALL',riskLevel:'ALL',keyword:''}); actions.showToast('已重置全部筛选条件','info'); }
  function openRecordDetail(rec) { if(!disposed) actions.openRecordDetailModal(rec); }
  function reloadRecord(rec) {
    if(disposed) return;
    AppState.currentCase = { ...rec, fileName: rec.title, caseBadge:'历史档案回溯', dimensions: rec.dimensions || '—', fileSize: rec.fileSize || 0, uploadedAt: rec.createdAt || rec.date, heatmapDataUrl: rec.heatmapDataUrl || '', heatmapNote:'已从健康档案恢复该次解读的概率、结论与热力图；热区不等同于临床病灶定位。', hotspots: CLINICAL_SAMPLE_CASES[rec.riskLevel === 'LOW' ? 'case-low':'case-high'].hotspots, probabilities: JSON.parse(JSON.stringify(rec.probabilities || [])), isDemo: !!rec.isDemo };
    AppState.diagnoseStatus='done'; actions.switchPage('interpret'); actions.renderInterpretPage?.(); actions.showToast(`已载入档案「${rec.title}」至解读工作台`,'info');
  }
  function requestDelete(rec) { if(!disposed) AppState.pendingDeleteRecordId = rec.id; }
  function cancelDelete() { if(!disposed) AppState.pendingDeleteRecordId=null; }
  function confirmDelete() {
    if(disposed || !AppState.pendingDeleteRecordId) return;
    const member=currentMember(); if(!member) return; member.records=member.records.filter(r=>r.id!==AppState.pendingDeleteRecordId); AppState.records=member.records; AppState.pendingDeleteRecordId=null; actions.persistFamilyMembers(); actions.showToast('该条健康档案记录已安全删除','success');
  }
  function saveCurrentToHealthRecords() {
    if(disposed || !AppState.currentCase) return;
    if(AppState.diagnoseStatus !== 'done') { actions.showToast('请先完成一次 AI 分析，再保存到健康档案','warning'); return; }
    const c=AppState.currentCase; const member=currentMember(); if(!member) return;
    const imageUrl=[c.imageDataUrl,c.dataUrl,c.stableImageUrl,c.imageUrl].find(value=>value && !String(value).startsWith('blob:')) || '';
    if(!imageUrl) { actions.showToast('影像尚未准备好，请重新上传后保存','warning'); return; }
    member.records.unshift({id:`REC-${Date.now()}`,title:c.fileName,createdAt:formatNowTime(),daysAgo:0,riskLevel:c.riskLevel,imageUrl,summary:c.summary,attentionRegion:c.attentionRegion,probabilities:JSON.parse(JSON.stringify(c.probabilities || [])),heatmapDataUrl:c.heatmapDataUrl || '',isDemo:!!c.isDemo}); AppState.records=member.records; actions.persistFamilyMembers(); actions.showToast(`解读结果已保存至${member.profile.name}的健康档案`,'success');
  }
  function clearDemoRecords() {
    if(disposed) return;
    const member=currentMember(); if(!member) return;
    member.records=member.records.filter(r=>!r.isDemo); AppState.records=member.records; actions.persistFamilyMembers();
    actions.showToast('已清除演示数据，保留真实解读记录','success');
  }
  return {filteredRecords,resetFilters,openRecordDetail,reloadRecord,requestDelete,cancelDelete,confirmDelete,saveCurrentToHealthRecords,clearDemoRecords,updateRecordBadgeCount:()=>currentRecords().length,renderRecordsList:filteredRecords,mount(){},dispose(){disposed=true;}};
}
