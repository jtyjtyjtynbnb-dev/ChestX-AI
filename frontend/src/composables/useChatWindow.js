import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue';
import { CHAT_PANEL } from '../constants/app.js';
import { ensureChatState } from './useChat.js';

export function useChatWindow({ AppState, modules = {}, actions }) {
  const chat = ensureChatState(AppState);
  const viewport = reactive({ width: 1280, height: 800 });
  const position = reactive({ launcher: null, panel: null });
  let drag = null;
  let draggedLauncher = false;
  function clampFloatingPosition(size, left, top) {
    return { left: Math.max(CHAT_PANEL.screenInset, Math.min(viewport.width - size.width - CHAT_PANEL.screenInset, left)), top: Math.max(CHAT_PANEL.screenInset, Math.min(viewport.height - size.height - CHAT_PANEL.screenInset, top)) };
  }
  function panelSize() { return { width: Math.min(CHAT_PANEL.width, viewport.width - CHAT_PANEL.viewportGap), height: Math.min(CHAT_PANEL.maxHeight, viewport.height - CHAT_PANEL.heightGap) }; }
  function positionChatPanel() {
    const edge = CHAT_PANEL.edge;
    const launcher = position.launcher || { left: viewport.width - edge - CHAT_PANEL.launcherSize, top: viewport.height - edge - CHAT_PANEL.launcherSize };
    const size = panelSize();
    position.panel = clampFloatingPosition(size, launcher.left + CHAT_PANEL.launcherSize - size.width, launcher.top - size.height - CHAT_PANEL.panelGap);
  }
  const cssPosition = (value) => value ? { left: `${value.left}px`, top: `${value.top}px`, right: 'auto', bottom: 'auto' } : {};
  const launcherStyle = computed(() => cssPosition(position.launcher));
  // Inline display also makes the closed state independent of legacy utility CSS ordering.
  const panelStyle = computed(() => ({ ...cssPosition(position.panel), display: chat.open ? 'flex' : 'none' }));
  function hidePanel() { chat.open = false; modules.chat?.cancel(); modules.chatConv?.dispose(); }
  function togglePanel() {
    if (chat.open) hidePanel();
    else { chat.open = true; positionChatPanel(); chat.focusInput++; }
  }
  function launcherClick(event) {
    if (event.detail === 0 || !draggedLauncher) togglePanel();
    draggedLauncher = false;
  }
  function beginDrag(event, target) {
    if (event.button !== undefined && event.button !== 0) return;
    if (target === 'panel' && event.target.closest('button')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const base = target === 'panel' ? position.panel : position.launcher;
    drag = { target, x: event.clientX, y: event.clientY, left: base?.left ?? rect.left, top: base?.top ?? rect.top, size: target === 'panel' ? panelSize() : { width: rect.width, height: rect.height }, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function moveDrag(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) position[drag.target] = clampFloatingPosition(drag.size, drag.left + dx, drag.top + dy);
  }
  function endDrag() {
    if (drag?.target === 'launcher' && drag.moved) {
      draggedLauncher = true;
      try { localStorage.setItem('chestx-ai-chat-position', JSON.stringify(position.launcher)); } catch { /* Position persistence is optional. */ }
    }
    drag = null;
  }
  function resize() {
    viewport.width = window.innerWidth; viewport.height = window.innerHeight;
    if (position.launcher) position.launcher = clampFloatingPosition({ width: CHAT_PANEL.launcherSize, height: CHAT_PANEL.launcherSize }, position.launcher.left, position.launcher.top);
    if (chat.open) positionChatPanel();
  }
  function keydown(event) {
    if ((event.altKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); togglePanel(); }
  }
  async function openSample(id) {
    if (chat.sampleBusy) return;
    chat.sampleBusy = id;
    try {
      hidePanel();
      if (await actions.openSample(id)) actions.showToast('教学胸片已载入，请开始 AI 解读', 'success');
    } catch (error) { if (error.name !== 'AbortError') actions.showToast(error.message || '教学胸片加载失败', 'error'); }
    finally { chat.sampleBusy = null; }
  }
  const stopPageWatch = watch(() => AppState.currentPage, (page, previous) => { if (page !== previous) { modules.chat?.cancel(); modules.chatConv?.dispose(); } });
  onMounted(() => {
    resize();
    try {
      const saved = JSON.parse(localStorage.getItem('chestx-ai-chat-position') || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) position.launcher = clampFloatingPosition({ width: CHAT_PANEL.launcherSize, height: CHAT_PANEL.launcherSize }, saved.left, saved.top);
    } catch { /* Ignore invalid cached position. */ }
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', keydown);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', keydown);
    stopPageWatch(); hidePanel();
  });
  return { launcherStyle, panelStyle, hidePanel, togglePanel, launcherClick, beginDrag, positionChatPanel, clampFloatingPosition, openSample };
}
