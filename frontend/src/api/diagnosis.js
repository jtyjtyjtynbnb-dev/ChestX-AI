import { API_ENDPOINTS } from '../constants/api.js';

/** The page owns cancellation; this adapter never reads the UI. */
export function createDiagnosisApi(api) {
  async function requestAgentDiagnosis(file, { question = '', signal, onStep = () => {} } = {}) {
    const body = new FormData();
    body.append('file', file, file.name || 'xray.jpg');
    body.append('question', question.trim());
    let result = null;
    await api.stream(API_ENDPOINTS.agentDiagnoseStream, { method: 'POST', body, signal }, (event, data) => {
      if (event === 'step') onStep(data);
      if (event === 'complete') result = data;
      if (event === 'error') throw new Error(data.message || 'Agent 工作流执行失败');
    });
    if (!result || !Array.isArray(result.inference?.probabilities) || !result.inference.heatmap) {
      throw new Error('Agent 返回数据格式不完整');
    }
    return result;
  }
  return { requestAgentDiagnosis };
}

