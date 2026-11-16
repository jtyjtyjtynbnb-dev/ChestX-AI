/** ChestX-AI maintenance: 诊断状态机：上传/分析/取消/错误恢复，以及当前病例结果写回 AppState。 */
import { ANALYSIS_STAGE_PERCENT } from '../constants/app.js';
import { REQUEST_TIMEOUT_MS } from '../constants/api.js';
import { reactive } from 'vue';
import { createDiagnosisApi } from '../api/diagnosis.js';
import { CLINICAL_SAMPLE_CASES } from '../stores/referenceData.js';
import { formatNowTime, getRiskStyle, isNormalDominant } from '../utils/format.js';

export function useDiagnosis({ AppState, api, actions }) {
  const progress = reactive({ percent: 0, text: '正在上传图片并执行模型推理...' });
  const diagnosisApi = createDiagnosisApi(api);
  const stagePercent = ANALYSIS_STAGE_PERCENT;
  let controller = null;
  let timeoutId = null;
  let generation = 0;
  let active = true;
  function publishProgress(percent, text) {
    progress.percent = percent;
    progress.text = text;
    AppState.analysisProgress = { percent, text };
  }
  function cancel() {
    generation++;
    controller?.abort();
    controller = null;
    clearTimeout(timeoutId);
    timeoutId = null;
    if (AppState.diagnoseStatus === 'analyzing') AppState.diagnoseStatus = 'idle';
    AppState.diagnosisError = '';
  }
  async function triggerAiAnalysisFlow(sampleId = null) {
    cancel();
    const requestId = generation;
    controller = new AbortController();
    const requestController = controller;
    let timedOut = false;
    timeoutId = setTimeout(() => { timedOut = true; requestController.abort(); }, REQUEST_TIMEOUT_MS.diagnosis);
    AppState.diagnosisError = '';
    AppState.diagnoseStatus = 'analyzing';
    publishProgress(0, '正在上传图片并执行模型推理...');
    try {
      if (sampleId) {
        const reference = CLINICAL_SAMPLE_CASES[sampleId];
        if (!reference) throw new Error('演示胸片不存在');
        const blob = await api.sample(sampleId, { signal: requestController.signal });
        if (!active || requestId !== generation) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (!active || requestId !== generation) return;
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        const imageUrl = 'data:' + (blob.type || 'image/jpeg') + ';base64,' + btoa(binary);
        AppState.currentSampleKey = sampleId;
        AppState.currentCase = { ...JSON.parse(JSON.stringify(reference)), imageUrl, uploadedAt: formatNowTime(), sourceFile: new File([blob], sampleId + '.jpg', { type: blob.type || 'image/jpeg' }), fileSize: blob.size };
      }
      const currentCase = AppState.currentCase;
      if (!currentCase.sourceFile) {
        const blob = await api.sample(AppState.currentSampleKey || 'case-high', { signal: requestController.signal });
        if (!active || requestId !== generation) return;
        currentCase.sourceFile = new File([blob], currentCase.fileName || 'xray.jpg', { type: blob.type || 'image/jpeg' });
      }
      const result = await diagnosisApi.requestAgentDiagnosis(currentCase.sourceFile, {
        question: AppState.agentQuestion || '', signal: requestController.signal,
        onStep(step) {
          if (!active || requestId !== generation) return;
          publishProgress(stagePercent[step.name] || 50, step.name + (step.count ? '（' + step.count + ' 条）' : '') + '完成');
        }
      });
      if (!active || requestId !== generation) return;
      const probabilities = result.inference.probabilities;
      const highest = isNormalDominant(probabilities) ? 0 : Math.max(0, ...probabilities.filter(item => item.code !== 'no_finding').map(item => Number(item.prob) || 0));
      Object.assign(currentCase, { isDemo: false, agentResult: result, probabilities, riskLevel: getRiskStyle(highest).level, heatmapDataUrl: 'data:image/jpeg;base64,' + result.inference.heatmap, heatmapNote: '热力图来自模型第二输出，仅用于理解模型关注区域，不等同于临床病灶定位。', summary: result.report?.summary || '', attentionRegion: '请查看后端返回的模型热力图；热区不等同于临床病灶定位。', preprocessing: result.inference.preprocessing || null });
      if (result.inference.normalized_image) currentCase.imageUrl = result.inference.normalized_image;
      AppState.agentResult = result;
      AppState.diagnoseStatus = 'done';
      AppState.diagnosisError = '';
      publishProgress(100, '分析完成');
      actions.showToast('AI 胸片智能解读与热力定位已完成', 'success');
    } catch (error) {
      if (!active || requestId !== generation) return;
      AppState.diagnoseStatus = 'idle';
      const message = timedOut ? '请求超时，请稍后重试' : (error.message || '网络异常，请确认后端服务已启动');
      if (error.name !== 'AbortError' || timedOut) {
        AppState.diagnosisError = message;
        actions.showToast(message, 'error');
      }
    } finally {
      if (requestId === generation) { clearTimeout(timeoutId); timeoutId = null; controller = null; }
    }
  }
  function dispose() { active = false; cancel(); }
  return { progress, triggerAiAnalysisFlow, cancel, dispose };
}

