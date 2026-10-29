import { API_ENDPOINTS } from '../constants/api.js';
import { computed } from 'vue';
import { ensureChatState } from './useChat.js';

const CHAT_STORAGE_KEY = 'chestx-ai-conversations-v1';
export function useChatConversations({ AppState, api, store, actions, modules = {} }) {
  const chat = ensureChatState(AppState);
  const requests = new Set();
  let mounted = false;
  const conversations = computed(() => [...AppState.conversations].sort((a, b) => b.updatedAt - a.updatedAt));
  function activeChatConversation() { return AppState.conversations.find((item) => item.id === store.currentConversationId) || null; }
  function dispose() { for (const request of requests) request.abort(); requests.clear(); }
  function saveChatConversations() {
    const sliced = AppState.conversations.slice(-50);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sliced));
      localStorage.setItem('chestx-ai-current-conversation', store.currentConversationId || '');
    } catch { actions.showToast('浏览器本地空间不足，对话未能保存', 'error'); }
    const request = new AbortController();
    requests.add(request);
    chat.syncState = 'syncing';
    return api.json(API_ENDPOINTS.conversationsSync, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversations: sliced }), signal: request.signal })
      .then(() => { if (!request.signal.aborted) chat.syncState = 'synced'; })
      .catch(() => { if (!request.signal.aborted) chat.syncState = 'local'; })
      .finally(() => requests.delete(request));
  }
  function persistChatMessage(message) {
    const conversation = activeChatConversation();
    if (!conversation) return;
    conversation.messages.push({ ...message });
    if (message.role === 'user' && conversation.title === '新建对话') conversation.title = message.content.slice(0, 24);
    conversation.updatedAt = Date.now();
    saveChatConversations();
  }
  function renderChatConversationList() { return conversations.value; }
  function renderChatConversation(conversation) {
    if (!conversation) return;
    chat.messages = conversation.messages.map((message) => ({ ...message }));
    AppState.chatHistory = conversation.messages.map(({ role, content }) => ({ role, content })).slice(-12);
  }
  function openChatConversation(id) {
    const conversation = AppState.conversations.find((item) => item.id === id);
    if (!conversation) return;
    modules.chat?.cancel();
    store.currentConversationId = id;
    renderChatConversation(conversation);
    chat.historyOpen = false;
    saveChatConversations();
  }
  function newChatConversation(save = true) {
    modules.chat?.cancel();
    const conversation = { id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: '新建对话', updatedAt: Date.now(), messages: [{ role: 'assistant', content: '你好，我是影像问答助手，可以解释胸片术语并结合医学知识库回答科普问题。不能替代医生诊断。' }] };
    AppState.conversations.push(conversation);
    store.currentConversationId = conversation.id;
    renderChatConversation(conversation);
    if (save) saveChatConversations();
  }
  async function restoreRemote() {
    const request = new AbortController(); requests.add(request);
    try {
      const payload = await api.json(API_ENDPOINTS.conversations, { signal: request.signal });
      const remote = payload?.conversations || payload?.data?.conversations;
      if (!request.signal.aborted && Array.isArray(remote) && remote.length && AppState.conversations.length <= 1 && !activeChatConversation()?.messages.some((message) => message.role === 'user')) {
        AppState.conversations = remote;
        store.currentConversationId = remote[0].id;
        renderChatConversation(remote[0]);
      }
    } catch { /* Local history remains usable when the service is unavailable. */ }
    finally { requests.delete(request); }
  }
  function mount() {
    if (mounted) return; mounted = true;
    if (!AppState.conversations.length) {
      try {
        const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
        if (Array.isArray(saved)) AppState.conversations = saved.filter((item) => item && typeof item.id === 'string' && Array.isArray(item.messages));
        store.currentConversationId ||= localStorage.getItem('chestx-ai-current-conversation');
      } catch { /* Ignore invalid browser cache. */ }
    }
    if (!activeChatConversation() && AppState.conversations.length) store.currentConversationId = AppState.conversations[0].id;
    if (!activeChatConversation()) newChatConversation(false);
    else renderChatConversation(activeChatConversation());
    restoreRemote();
  }
  return { conversations, saveChatConversations, activeChatConversation, persistChatMessage, renderChatConversationList, renderChatConversation, openChatConversation, newChatConversation, mount, dispose };
}
