import { getRiskStyle } from '../utils/format.js';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function download(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(title) {
  return String(title || 'ChestX-AI-report').replace(/[\\/:*?"<>|]+/g, '_').replace(/\.[a-z0-9]+$/i, '');
}

function probabilityRows(rec, limit) {
  return [...(rec?.probabilities || [])]
    .sort((a, b) => Number(b.prob) - Number(a.prob))
    .slice(0, limit)
    .map((item) => `<tr><td>${esc(item.name)}</td><td style="text-align:right">${Number(item.prob || 0).toFixed(1)}%</td><td>${esc(getRiskStyle(item.prob, item.code).shortLabel)}</td></tr>`)
    .join('');
}

export function useRecordDetail({ AppState, actions, scope }) {
  AppState.recordDetail ??= null;
  AppState.reportTemplate ||= 'standard';
  AppState.reportSignature ||= '';
  let disposed = false;

  function openRecordDetailModal(rec) {
    if (!disposed && rec) AppState.recordDetail = { ...rec, createdAt: rec.createdAt || rec.date, probabilities: rec.probabilities || [] };
  }
  function closeDetailModal() { if (!disposed) AppState.recordDetail = null; }
  function exportReport() {
    const c = AppState.currentCase;
    if (c) openRecordDetailModal({ ...c, title: c.fileName, createdAt: c.uploadedAt });
  }
  function setReportTemplate(template) { AppState.reportTemplate = template === 'brief' ? 'brief' : 'standard'; }
  function setReportSignature(value) { AppState.reportSignature = String(value || '').slice(0, 40); }

  function structuredReport(rec = AppState.recordDetail) {
    if (!rec) return null;
    const report = rec.report || AppState.currentCase?.agentResult?.report || null;
    return {
      schema: 'chestx-ai.report/v1',
      generated_at: new Date().toISOString(),
      template: AppState.reportTemplate,
      patient: {
        name: AppState.userProfile?.name || '',
        age: AppState.userProfile?.age || '',
        gender: AppState.userProfile?.gender || '',
        age_group: AppState.userProfile?.ageGroup || '',
        conditions: AppState.userProfile?.conditions || '',
      },
      study: {
        title: rec.title || rec.fileName || '',
        created_at: rec.createdAt || rec.date || '',
        modality: rec.isDicom ? 'DICOM' : 'CR/DR image',
        dimensions: rec.dimensions || '',
        file_size: rec.fileSize || 0,
        image_url: rec.imageUrl || '',
      },
      result: {
        risk_level: rec.riskLevel || '',
        risk_label: getRiskStyle(rec.riskLevel).label,
        summary: rec.summary || '',
        attention_region: rec.attentionRegion || '',
        probabilities: [...(rec.probabilities || [])].sort((a, b) => Number(b.prob) - Number(a.prob)),
      },
      report: report ? {
        summary: report.summary || '',
        patient_summary: report.patient_summary || '',
        doctor_summary: report.doctor_summary || '',
        risk_explanation: report.risk_explanation || '',
        findings: report.findings || [],
        impression: report.impression || [],
        evidence: report.evidence || [],
        limitations: report.limitations || [],
        suggested_actions: report.suggested_actions || [],
        follow_up_questions: report.follow_up_questions || [],
        disclaimer: report.disclaimer || '',
      } : null,
      signature: AppState.reportSignature || '',
      disclaimer: '仅供健康科普参考，不作为临床诊断依据',
      demo: !!rec.isDemo,
    };
  }

  function reportText(rec = AppState.recordDetail) {
    const data = structuredReport(rec);
    if (!data) return '';
    const lines = [
      '【胸影智识 AI 科普解读报告】',
      `文件：${data.study.title}`,
      `时间：${data.study.created_at}`,
      `受检人：${data.patient.name || '未填写'}`,
      `风险等级：${data.result.risk_label}`,
      ...(data.report?.risk_explanation ? [`风险说明：${data.report.risk_explanation}`] : []),
      `核心结论：${data.result.summary}`,
      `模型关注区域：${data.result.attention_region}`,
      '概率明细：',
      ...data.result.probabilities.slice(0, 10).map((item) => `  ${item.name}：${Number(item.prob || 0).toFixed(1)}%`),
      `建议与局限：${[...(data.report?.suggested_actions || []), ...(data.report?.limitations || [])].join('；') || '—'}`,
      `签名：${data.signature || '未填写'}`,
      data.disclaimer,
    ];
    return lines.join('\n');
  }

  async function copyReportText() {
    const text = reportText();
    if (!text || disposed) return;
    try {
      await navigator.clipboard.writeText(text);
      if (!disposed) actions.showToast('报告文本已复制到剪贴板', 'success');
    } catch {
      if (!disposed) actions.showToast('浏览器未授权剪贴板，请使用导出 Word/JSON', 'warning');
    }
  }

  function exportJson() {
    const data = structuredReport();
    if (!data) return;
    download(safeName(data.study.title) + '.json', JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    actions.showToast('结构化 JSON 已导出', 'success');
  }

  function exportWord() {
    const rec = AppState.recordDetail;
    const data = structuredReport(rec);
    if (!data) return;
    const brief = data.template === 'brief';
    const rows = probabilityRows(rec, brief ? 3 : 10);
    const report = data.report;
    const findings = (report?.findings || []).map((item) => `<li>${esc(item.name || item.code)}：${Number(item.probability || 0).toFixed(1)}% — ${esc(item.explanation || '')}</li>`).join('');
    const evidence = (report?.evidence || []).map((item) => `<li>[${esc(item.chunk_id)}] ${esc(item.claim || '')}</li>`).join('');
    const actionsList = (report?.suggested_actions || []).map((item) => `<li>${esc(item)}</li>`).join('');
    const limitations = (report?.limitations || []).map((item) => `<li>${esc(item)}</li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.study.title)}</title>
<style>
body{font-family:"Microsoft YaHei",SimSun,Arial,sans-serif;color:#1D2129;line-height:1.7;margin:32px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #E5E6EB;padding-bottom:4px}
.meta{font-size:12px;color:#4E5969}.tag{display:inline-block;border:1px solid #0F62FE;color:#0F62FE;border-radius:4px;padding:1px 6px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #E5E6EB;padding:5px 4px;text-align:left}
.disclaimer{margin-top:18px;font-size:11px;color:#86909C}.sign{margin-top:28px;display:flex;justify-content:space-between;font-size:12px}
</style></head><body>
<h1>胸影智识 ChestX-AI · 胸部X光AI科普解读报告</h1>
<div class="meta">报告编号：${esc(data.study.title)} ｜ 生成时间：${esc(data.generated_at)} ｜ 模板：${brief ? '简明' : '标准'}</div>
<h2>一、基本信息</h2>
<table><tr><th>受检人</th><td>${esc(data.patient.name || '未填写')}</td><th>年龄/性别</th><td>${esc(data.patient.age || '未填写')} / ${esc(data.patient.gender || '未填写')}</td></tr>
<tr><th>检查时间</th><td>${esc(data.study.created_at)}</td><th>影像类型</th><td>${esc(data.study.modality)}</td></tr>
<tr><th>风险等级</th><td colspan="3"><span class="tag">${esc(data.result.risk_label)}</span> ${data.demo ? '（演示数据）' : ''}</td></tr></table>
<h2>二、核心结论</h2><p>${esc(data.result.summary || '—')}</p>
<p class="meta">模型关注区域：${esc(data.result.attention_region || '—')}</p>
<h2>三、${brief ? '前 3 项' : '10 类'}征象概率</h2>
<table><tr><th>征象</th><th style="text-align:right">概率</th><th>关注等级</th></tr>${rows || '<tr><td colspan="3">暂无概率数据</td></tr>'}</table>
${findings ? `<h2>四、模型发现</h2><ul>${findings}</ul>` : ''}
${evidence ? `<h2>五、知识依据</h2><ul>${evidence}</ul>` : ''}
${actionsList ? `<h2>六、建议</h2><ul>${actionsList}</ul>` : ''}
${limitations ? `<h2>七、局限性</h2><ul>${limitations}</ul>` : ''}
<div class="disclaimer">${esc(data.disclaimer)}。本报告由 AI 生成，仅供健康科普与教学演示，不具备临床诊断效力。</div>
<div class="sign"><span>报告签名：${esc(data.signature || '________________')}</span><span>日期：${new Date().toLocaleDateString('zh-CN')}</span></div>
</body></html>`;
    download(safeName(data.study.title) + '.doc', '\ufeff' + html, 'application/msword;charset=utf-8');
    actions.showToast('Word 兼容报告已导出（.doc）', 'success');
  }

  function printReport() {
    if (disposed) return;
    actions.showToast('已打开打印预览，可在目标打印机中选择“另存为 PDF”', 'info');
    scope.schedule(() => { if (!disposed) window.print(); }, 300);
  }

  return {
    openRecordDetailModal, closeDetailModal, exportReport, copyReportText, printReport,
    exportJson, exportWord, setReportTemplate, setReportSignature, reportText, structuredReport,
    mount() {}, dispose() { disposed = true; },
  };
}
