import { ensureChatState } from './useChat.js';
import { VIEWER_DEFAULTS } from '../constants/app.js';

export function useChatMessages({ AppState, actions }) {
  const chat = ensureChatState(AppState);
  async function triggerCopilotFocusHeatmap() {
    AppState.viewer.showHeatmap = true;
    AppState.viewer.heatmapOpacity = VIEWER_DEFAULTS.focusHeatmapOpacity;
    if (!await actions.focusHeatmap()) return;
    actions.showToast('已定位至模型高激活热力图层 (透明度 ' + VIEWER_DEFAULTS.focusHeatmapOpacity + '%)', 'info');
  }
  function triggerCopilotSaveToMemberNotes(answerText) {
    const member = actions.getCurrentMember();
    if (!member) return;
    const cleanSnippet = String(answerText || '').replace(/\s+/g, ' ').slice(0, 90);
    const entry = `[${new Date().toLocaleDateString('zh-CN')} AI问答备忘] ${cleanSnippet}…`;
    member.profile.notes = member.profile.notes ? `${member.profile.notes}\n${entry}`.slice(0, 950) : entry;
    actions.syncCurrentMemberState?.();
    actions.persistFamilyMembers('copilot_note');
    actions.showToast(`已记入「${member.profile.name}」的随访备注并同步至数据库`, 'success');
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
