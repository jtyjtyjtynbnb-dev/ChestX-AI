import { API_ENDPOINTS } from '../constants/api.js';
import { computed } from 'vue';

export function ensureChatState(AppState) {
  AppState.chat ||= {};
  const defaults = { open: false, busy: false, input: '', historyOpen: false, messages: [], syncState: null, sampleBusy: null, focusInput: 0 };
  for (const [key, value] of Object.entries(defaults)) if (AppState.chat[key] === undefined) AppState.chat[key] = value;
  AppState.chatHistory ||= [];
  AppState.conversations ||= [];
  return AppState.chat;
}

export function useChat(ctx) {
  const { AppState, api, actions, modules = {} } = ctx;
  const chat = ensureChatState(AppState);
  let request = null;
  const conversationModule = () => modules.chatConv;
  const messageModule = () => modules.chatMsg;
  function updateChatContextBanner(syncState = null) { if (syncState) chat.syncState = syncState; }
  const contextText = computed(() => {
    const member = actions.getCurrentMember?.();
    if (!member) return '当前档案：默认成员';
    const { name, age, gender } = member.profile;
    const meta = [gender && gender !== '未填写' ? gender : '', age ? `${age}岁` : ''].filter(Boolean).join('/');
    return `当前成员：${name}${meta ? ` (${meta})` : ''} ｜ 影像：${AppState.currentCase?.title || '标准筛查胸片'}`;
  });
  function currentChatDiagnosisContext() {
    const result = AppState.currentCase?.agentResult;
    const member = actions.getCurrentMember?.();
    return { probabilities: (result?.inference?.probabilities || []).slice(0, 5), summary: result?.report?.summary || '', member_profile: member ? { id: member.id, name: member.profile.name, age: member.profile.age, gender: member.profile.gender, conditions: member.profile.conditions, notes: member.profile.notes, record_count: (member.records || []).length } : null };
  }
  function cancel() { request?.abort(); request = null; chat.busy = false; chat.messages = chat.messages.filter((message) => !message.pending); }
  async function sendAiChatMessage(question = chat.input) {
    const clean = String(question || '').trim();
    if (!clean || chat.busy) return;
    if (!conversationModule()?.activeChatConversation()) conversationModule()?.newChatConversation();
    const controller = new AbortController();
    request = controller;
    const append = (...args) => messageModule()?.appendChatMessage(...args) || actions.appendChatMessage?.(...args);
    const persist = (message) => { const module = conversationModule(); return module ? module.persistChatMessage(message) : actions.persistChatMessage?.(message); };
    append('user', clean);
    AppState.chatHistory.push({ role: 'user', content: clean });
    persist({ role: 'user', content: clean });
    chat.input = ''; chat.busy = true;
    append('assistant', '', [], { pending: true, stepText: '正在理解问题并加载家庭成员画像…' });
    const pending = chat.messages[chat.messages.length - 1];
    const payload = { question: clean, history: AppState.chatHistory.slice(-8, -1), diagnosis_context: currentChatDiagnosisContext() };
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal };
    try {
      let completed;
      try {
        const result = await api.stream(API_ENDPOINTS.chatStream, options, (event, data) => {
          if (controller.signal.aborted) return;
          const name = typeof event === 'string' ? event : event.event || event.type;
          const value = data ?? event.data ?? {};
          if (name === 'step') pending.stepText = `Agent 步骤：${value.name}（${value.status === 'completed' ? '已完成' : '执行中'}）`;
          if (name === 'token' && value.delta) pending.content += value.delta;
          if (name === 'complete') completed = value;
          if (name === 'error') throw new Error(value.message || '流式问答异常');
        });
        completed ||= result?.data || result;
        if (!completed?.answer) throw new Error('stream_fallback');
      } catch (error) {
        if (controller.signal.aborted || error.name === 'AbortError') throw error;
        completed = await api.json(API_ENDPOINTS.chat, options);
        completed = completed?.data || completed;
        if (!completed?.answer) throw new Error('问答服务暂不可用');
      }
      if (controller.signal.aborted) return;
      Object.assign(pending, completed, { content: completed.answer, pending: false, stepText: '', sources: completed.sources || [] });
      AppState.chatHistory.push({ role: 'assistant', content: completed.answer });
      if (AppState.chatHistory.length > 12) AppState.chatHistory.splice(0, AppState.chatHistory.length - 12);
      persist({ role: 'assistant', content: completed.answer, sources: completed.sources || [], provider: completed.provider, failure_reason: completed.failure_reason, steps: completed.steps || [] });
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') {
        const index = chat.messages.indexOf(pending);
        if (index >= 0) chat.messages.splice(index, 1);
      } else { Object.assign(pending, { pending: false, stepText: '', content: error.message || '问答失败，请检查后端服务和 Qwen 设置' }); actions.showToast?.(error.message || '问答服务暂不可用', 'error'); }
    } finally {
      if (request === controller) { request = null; chat.busy = false; if (chat.open) chat.focusInput++; }
    }
  }
  return { chat, contextText, updateChatContextBanner, currentChatDiagnosisContext, sendAiChatMessage, cancel, dispose: cancel, mount() {} };
}
