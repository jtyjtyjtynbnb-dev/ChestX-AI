import { ref } from 'vue';
import { requestJson } from '../api/client.js';
import { API_ENDPOINTS } from '../constants/api.js';

/**
 * Calls the four-role Qwen co-brain endpoint.
 * The page owns the local fallback; this composable only reports loading/errors.
 */
export function useCoBrain() {
  const loading = ref(false);
  const provider = ref('');
  const error = ref('');

  async function consult(diagnosisContext, focus = '') {
    loading.value = true;
    error.value = '';
    try {
      const data = await requestJson(API_ENDPOINTS.coBrain, {
        method: 'POST',
        body: JSON.stringify({ diagnosis_context: diagnosisContext, focus }),
        timeout: 60000,
      });
      if (!data || !Array.isArray(data.roles) || !data.roles.length) {
        throw new Error('共脑会诊返回格式不完整');
      }
      provider.value = data.provider || '';
      return data;
    } catch (exception) {
      error.value = exception?.message || '共脑会诊暂不可用';
      provider.value = '';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, provider, error, consult };
}
