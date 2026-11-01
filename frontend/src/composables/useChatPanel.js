import { computed, nextTick, ref, watch } from 'vue';
import { useAppContext } from './useAppContext.js';
import { useChatWindow } from './useChatWindow.js';

export function useChatPanel() {
  const ctx = useAppContext();
  const { AppState, modules, store, actions } = ctx;
  const chat = AppState.chat;
  const floating = useChatWindow(ctx);
  const inputElement = ref(null);
  const messagesElement = ref(null);
  watch(() => chat.focusInput, async () => { await nextTick(); if (chat.open) inputElement.value?.focus(); });
  watch(() => [chat.open, chat.messages.length, chat.messages.at(-1)?.content, chat.messages.at(-1)?.stepText], async () => {
    await nextTick();
    const element = messagesElement.value;
    if (element && chat.open) element.scrollTop = element.scrollHeight;
  }, { flush: 'post' });
  const syncBadge = computed(() => ({
    synced: { text: 'SQLite 已保存', color: 'success' },
    syncing: { text: '正在同步…', color: 'primary' },
    local: { text: '本地缓存模式', color: 'warning' }
  }[chat.syncState] || { text: 'SQLite 双写已就绪', color: 'success' }));
  const syncClass = computed(() => ({ success: 'shrink-0 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success', primary: 'shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary', warning: 'shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning' }[syncBadge.value.color]));
  const samples = [ ['teaching-pneumonia', '肺炎样例'], ['teaching-effusion', '积液样例'], ['teaching-pneumothorax', '气胸样例'], ['teaching-atelectasis', '肺不张样例'], ['teaching-nodule', '结节样例'], ['teaching-edema', '水肿样例'] ];
  function providerText(message) { return message.provider === 'qwen' ? 'Qwen 流式生成 · 已结合当前成员档案' : `本次由本地知识库兜底${message.failure_reason ? ` · ${actions.qwenFailureText?.(message.failure_reason) || message.failure_reason}` : ''}`; }
  function stepStatus(status) { return { completed: '完成', failed: '失败', degraded: '降级', no_evidence: '无匹配依据' }[status] || '跳过'; }
  function deleteConversation(id, currentTitle) {
    if (globalThis.confirm && !globalThis.confirm(`删除对话「${currentTitle || '新建对话'}」？`)) return;
    modules.chatConv.deleteChatConversation(id);
  }
  function renameConversation(id, currentTitle) {
    const next = globalThis.prompt?.('输入对话标题（最多 40 字）', currentTitle || '新建对话');
    if (next === null || next === undefined) return;
    modules.chatConv.renameChatConversation(id, next);
  }
  return { chat, inputElement, messagesElement, ...floating, syncBadge, syncClass, samples, contextText: modules.chat.contextText, conversations: modules.chatConv.conversations, currentConversationId: computed(() => store.currentConversationId), send: () => modules.chat.sendAiChatMessage(), newConversation: () => modules.chatConv.newChatConversation(), openConversation: (id) => modules.chatConv.openChatConversation(id), renameConversation, deleteConversation, focusHeatmap: () => modules.chatMsg.triggerCopilotFocusHeatmap(), saveNotes: (content) => modules.chatMsg.triggerCopilotSaveToMemberNotes(content), providerText, stepStatus };
}
