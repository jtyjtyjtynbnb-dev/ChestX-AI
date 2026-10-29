import axios from 'axios';

const params = new URLSearchParams(globalThis.location?.search || '');
const viteEnv = import.meta.env || {};
export const API_BASE_URL = (params.get('api') || (viteEnv.DEV ? (viteEnv.VITE_API_BASE_URL || '') : '')).replace(/\/+$/, '');

function newRequestId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* ignore */ }
  return 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (!config.headers['X-Request-Id']) config.headers['X-Request-Id'] = newRequestId();
  return config;
});

export function createApiScope() {
  const controllers = new Set();
  const responses = new WeakMap();
  const cleanups = new Map();
  let disposed = false;
  function remove(controller) {
    controllers.delete(controller);
    cleanups.get(controller)?.();
    cleanups.delete(controller);
  }
  function track(controller, signal) {
    if (disposed) throw new DOMException('Request scope disposed', 'AbortError');
    controllers.add(controller);
    if (signal) {
      const abort = () => controller.abort(signal.reason);
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
      cleanups.set(controller, () => signal.removeEventListener('abort', abort));
    }
    return controller;
  }
  async function scopedFetch(path, options = {}) {
    if (disposed) throw new DOMException('Request scope disposed', 'AbortError');
    const controller = track(new AbortController(), options.signal);
    try {
      const response = await fetch(API_BASE_URL + path, { ...options, signal: controller.signal });
      responses.set(response, controller);
      return response;
    } catch (error) { remove(controller); throw error; }
  }
  function release(response) {
    const controller = responses.get(response);
    if (controller) { remove(controller); responses.delete(response); }
  }
  function abortAll() {
    for (const controller of [...controllers]) { controller.abort(); remove(controller); }
  }
  function dispose() { disposed = true; abortAll(); }

  async function json(path, options = {}) {
    const controller = track(new AbortController(), options.signal);
    try {
      const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
      const response = await http.request({
        url: path,
        method: options.method || (options.body ? 'POST' : 'GET'),
        data: options.body,
        headers,
        signal: controller.signal,
        responseType: 'json',
      });
      const payload = response.data;
      if (!response.status || response.status >= 400 || (payload?.code && payload.code !== 200)) {
        throw new Error(payload?.message || '请求失败 (' + response.status + ')');
      }
      return payload?.data;
    } catch (error) {
      if (axios.isCancel(error) || error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        throw new DOMException('请求已取消', 'AbortError');
      }
      const message = error.response?.data?.message || error.message || '请求失败';
      throw new Error(message);
    } finally {
      remove(controller);
    }
  }

  async function sample(id, options = {}) {
    const response = await scopedFetch('/api/samples/' + encodeURIComponent(id), options);
    try {
      if (!response.ok) throw new Error('教学胸片读取失败');
      return await response.blob();
    } finally {
      release(response);
    }
  }

  async function stream(path, options, onEvent) {
    const response = await scopedFetch(path, options);
    let reader;
    try {
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || '流式服务暂不可用');
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const dispatch = block => {
        let name = 'message';
        const data = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) name = line.slice(6).trim();
          if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        }
        if (data.length) onEvent(name, JSON.parse(data.join('\n')));
      };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          dispatch(buffer.slice(0, end)); buffer = buffer.slice(end + 2);
        }
        if (done) { if (buffer.trim()) dispatch(buffer); break; }
      }
    } finally {
      if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      release(response);
    }
  }
  return { fetch: scopedFetch, json, sample, stream, abortAll, dispose, release, pendingCount: () => controllers.size };
}

export async function requestJson(path, options = {}) {
  const api = createApiScope();
  try { return await api.json(path, options); } finally { api.dispose(); }
}
export async function consumeSseStream(path, body, handlers = {}, options = {}) {
  const api = createApiScope();
  try { return await api.stream(path, { ...options, method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers }, body: JSON.stringify(body) }, (name, data) => handlers[name]?.(data)); }
  finally { api.dispose(); }
}
