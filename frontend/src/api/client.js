/**
 * 统一 API 请求与 SSE 流式消费封装层
 */
const params = new URLSearchParams(window.location.search);
export const API_BASE_URL = (params.get('api') || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && payload.code && payload.code !== 200)) {
    throw new Error(payload?.message || `请求失败 (${response.status})`);
  }
  return payload?.data;
}

export async function consumeSseStream(path, bodyObj, handlers = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  });
  if (!response.ok || !response.body) {
    const errPayload = await response.json().catch(() => null);
    throw new Error(errPayload?.message || '流式服务暂不可用');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      let eventName = 'message';
      let dataStr = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        handlers[eventName]?.(parsed);
      } catch (_e) {}
    }
  }
}
