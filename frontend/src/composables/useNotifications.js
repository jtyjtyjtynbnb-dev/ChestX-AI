export function useNotifications({ AppState, scope }) {
  let id = 0;
  function showToast(message, type = 'success') {
    if (!message || scope.disposed) return;
    const item = { id: ++id, message: String(message), type, leaving: false };
    AppState.toasts.push(item);
    scope.schedule(() => {
      const toast = AppState.toasts.find(t => t.id === item.id);
      if (toast) toast.leaving = true;
      scope.schedule(() => { AppState.toasts = AppState.toasts.filter(t => t.id !== item.id); }, 250);
    }, 3000);
  }
  function dispose() { AppState.toasts = []; }
  return { showToast, dispose };
}
