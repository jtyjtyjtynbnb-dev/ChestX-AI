/**
 * 胸片上传校验与 LangGraph Agent SSE 流式推理 Composable
 */
import { ref } from 'vue';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '../utils/constant.js';
import { API_BASE_URL } from '../api/client.js';

export function useDiagnoseFlow() {
  const loading = ref(false);
  const errorMsg = ref('');
  const steps = ref([]);

  function validateImageFile(file) {
    if (!file) return '请选择需要解读的胸片图片';
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return '仅支持 JPG / PNG 格式的胸部正位影像';
    if (file.size > MAX_UPLOAD_BYTES) return '图片大小不能超过 10MB';
    return null;
  }

  async function runAgentDiagnoseStream(file, question = '', onStep = () => {}) {
    const err = validateImageFile(file);
    if (err) throw new Error(err);
    loading.value = true;
    errorMsg.value = '';
    steps.value = [];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', question);

    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/diagnose/stream`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Agent 推理服务响应异常');
      return response;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    errorMsg,
    steps,
    validateImageFile,
    runAgentDiagnoseStream
  };
}
