export function createInteractionScope() {
  const listenerCleanups = new Set();
  const apiControllers = new Set();
  const apiControllersMap = new WeakMap();
  function apiFetch(path, options = {}) {
    const controller = new AbortController();
    apiControllers.add(controller);
    const signal = options.signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([options.signal, controller.signal]) : (options.signal || controller.signal);
    return globalThis.fetch(path, { ...options, signal }).then(resp => {
      if (resp.body) apiControllersMap.set(resp, controller);
      else apiControllers.delete(controller);
      return resp;
    });
  }
  function apiAbortAll() { [...apiControllers].forEach(c => c.abort()); apiControllers.clear(); }
  function apiRelease(resp) { const c = apiControllersMap.get(resp); if(c) { apiControllers.delete(c); apiControllersMap.delete(resp); } }
  const timeoutIds = new Set();
  const intervalIds = new Set();
  const groups = new Map();
  let disposed = false;
  let activeGroup = null;

  function on(target, type, listener, options) {
    if (disposed || !target) return () => {};
    target.addEventListener(type, listener, options);
    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      target.removeEventListener(type, listener, options);
      listenerCleanups.delete(cleanup);
      activeGroup?.delete(cleanup);
    };
    listenerCleanups.add(cleanup);
    activeGroup?.add(cleanup);
    return cleanup;
  }

  function group(name, bind) {
    groups.get(name)?.forEach((cleanup) => cleanup());
    const cleanups = new Set();
    const previousGroup = activeGroup;
    activeGroup = cleanups;
    try {
      bind();
    } finally {
      activeGroup = previousGroup;
      groups.set(name, cleanups);
    }
  }

  function schedule(callback, delay) {
    if (disposed) return null;
    const id = globalThis.setTimeout(() => {
      timeoutIds.delete(id);
      if (!disposed) callback();
    }, delay);
    timeoutIds.add(id);
    return id;
  }

  function repeat(callback, delay) {
    if (disposed) return null;
    const id = globalThis.setInterval(callback, delay);
    intervalIds.add(id);
    return id;
  }

  function cancelSchedule(id) {
    globalThis.clearTimeout(id);
    timeoutIds.delete(id);
  }

  function stopInterval(id) {
    globalThis.clearInterval(id);
    intervalIds.delete(id);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    [...listenerCleanups].forEach((cleanup) => cleanup());
    groups.clear();
    timeoutIds.forEach((id) => globalThis.clearTimeout(id));
    intervalIds.forEach((id) => globalThis.clearInterval(id));
    timeoutIds.clear();
    intervalIds.clear();
  }

  return { on, group, schedule, cancelSchedule, repeat, stopInterval, dispose, apiFetch, apiAbortAll, apiRelease, get disposed() { return disposed; } };
}
