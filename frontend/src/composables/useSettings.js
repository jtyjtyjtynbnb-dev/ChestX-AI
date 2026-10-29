import { API_ENDPOINTS } from '../constants/api.js';

export function useSettings({ AppState: s, api, actions }) {
  s.qwenSettings ||= {
    apiKey: '',
    model: 'qwen3.8-flash',
    status: '检查中',
    statusTone: 'text-text-3 bg-page-bg',
    testing: false,
    saving: false,
    result: '',
    resultTone: 'text-text-3',
  };
  const q = s.qwenSettings;
  let disposed = false;
  let controller = null;

  function nextSignal() {
    controller?.abort();
    controller = new AbortController();
    return controller.signal;
  }

  async function refreshQwenSettingsStatus() {
    try {
      const data = await api.json(API_ENDPOINTS.qwenSettings, { signal: nextSignal() });
      if (disposed) return;
      q.status = data.configured ? `已连接 · ${data.model}` : '未配置';
      q.statusTone = data.configured ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning';
      q.model = data.model || 'qwen3.8-flash';
    } catch (error) {
      if (disposed || error.name === 'AbortError') return;
      q.status = '后端未连接';
      q.statusTone = 'bg-danger/10 text-danger';
    }
  }

  function qwenFailureText(reason) {
    if (reason?.startsWith('provider_http_')) return `模型接口返回 ${reason.replace('provider_http_', 'HTTP ')}`;
    return {
      qwen_not_configured: '未配置 Qwen',
      authentication: 'Key 无效或权限不足',
      provider_error: '模型服务返回错误',
      provider_http_error: '模型服务请求失败',
      rate_limited: '请求频率受限',
      network_timeout: '网络超时',
      empty_response: '模型返回为空',
      qwen_error: '模型调用异常',
    }[reason] || '模型调用失败';
  }

  async function testQwenConnection() {
    if (disposed || q.testing) return;
    q.testing = true;
    q.result = '正在发送一次 Qwen 测试请求…';
    q.resultTone = 'text-text-3';
    try {
      const data = await api.json(API_ENDPOINTS.qwenTest, { method: 'POST', signal: nextSignal() });
      if (disposed) return;
      q.result = data.ok ? `连接成功 · ${data.model}` : `连接失败 · ${qwenFailureText(data.reason)}（${data.reason}）`;
      q.resultTone = data.ok ? 'text-success' : 'text-danger';
      if (!data.ok) actions.showToast?.('Qwen Key 校验失败：' + qwenFailureText(data.reason), 'error');
      await refreshQwenSettingsStatus();
    } catch (error) {
      if (disposed || error.name === 'AbortError') return;
      q.result = error.message || '无法完成 Qwen 测试请求';
      q.resultTone = 'text-danger';
      actions.showToast?.(error.message || 'Qwen 测试请求失败', 'error');
    } finally {
      if (!disposed) q.testing = false;
    }
  }

  async function saveQwenSettings() {
    if (disposed || q.saving) return;
    q.saving = true;
    try {
      await api.json(API_ENDPOINTS.qwenSettings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: q.apiKey, model: q.model.trim() }),
        signal: nextSignal(),
      });
      if (disposed) return;
      q.apiKey = '';
      await refreshQwenSettingsStatus();
      if (!disposed) actions.showToast('Qwen 配置已保存到本机 backend/.env', 'success');
    } catch (error) {
      if (!disposed && error.name !== 'AbortError') actions.showToast(error.message || 'Qwen 配置保存失败', 'error');
    } finally {
      if (!disposed) q.saving = false;
    }
  }

  function openSettings() {
    if (disposed) return;
    actions.openFamilyModal();
    refreshQwenSettingsStatus();
  }

  function dispose() {
    disposed = true;
    controller?.abort();
    controller = null;
  }

  return { refreshQwenSettingsStatus, qwenFailureText, testQwenConnection, saveQwenSettings, openSettings, mount() {}, dispose };
}
