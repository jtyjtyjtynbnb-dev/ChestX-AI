import { ensureChatState } from './useChat.js';
import { API_ENDPOINTS } from '../constants/api.js';
import { VIEWER_DEFAULTS } from '../constants/app.js';

export function useChatMessages({ AppState, actions, api }) {
  const chat = ensureChatState(AppState);
  async function triggerCopilotFocusHeatmap() {
    AppState.viewer.showHeatmap = true;
    AppState.viewer.heatmapOpacity = VIEWER_DEFAULTS.focusHeatmapOpacity;
    if (!await actions.focusHeatmap()) return;
    actions.showToast('已定位至模型高激活热力图层 (透明度 ' + VIEWER_DEFAULTS.focusHeatmapOpacity + '%)', 'info');
  }
  async function triggerCopilotSaveToMemberNotes(answerText) {
    const member = actions.getCurrentMember();
    if (!member || chat.noteSaving) return;
    const maxNotesLength = 240;
    const text = String(answerText || '').trim();
    if (!text) return;
    chat.noteSaving = true;
    let summary = '';
    let provider = 'local_fallback';
    try {
      const result = await api.json(API_ENDPOINTS.noteSummary, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      summary = String(result?.summary || '').trim();
      provider = result?.provider || provider;
    } catch {
      summary = '';
    } finally {
      chat.noteSaving = false;
    }
    if (!summary) {
      summary = text.replace(/\s+/g, ' ').slice(0, 80).trim();
    }
    const entry = `[${new Date().toLocaleDateString('zh-CN')} AI问答备忘] ${summary.slice(0, 100)}`;
    const previous = String(member.profile.notes || '').replace(/\s+/g, ' ').trim();
    member.profile.notes = (previous ? `${previous}；${entry}` : entry).slice(-maxNotesLength);
    actions.syncCurrentMemberState?.();
    actions.persistFamilyMembers('copilot_note');
    actions.showToast(provider === 'qwen' ? `AI 已总结并记入「${member.profile.name}」的随访备注` : `已用本地摘要记入「${member.profile.name}」的随访备注`, 'success');
  }
  function attachAssistantMetaAndActions(message, content, sources = [], meta = {}) {
    Object.assign(message, meta, { content, sources });
    return message;
  }
  function appendChatMessage(role, content, sources = [], meta = {}) {
    chat.messages.push({ ...meta, role, content, sources });
    return chat.messages[chat.messages.length - 1];
  }
  return { triggerCopilotFocusHeatmap, triggerCopilotSaveToMemberNotes, attachAssistantMetaAndActions, appendChatMessage, mount() {} };
}
