<script setup>
import { computed, nextTick } from 'vue';
import { useChatPanel } from '../composables/useChatPanel.js';
import { useAppContext } from '../composables/useAppContext.js';
import { DISEASE_KNOWLEDGE_LIST } from '../stores/referenceData.js';
const { chat, inputElement, messagesElement, launcherStyle, panelStyle, launcherClick, beginDrag, hidePanel, openSample, syncBadge, syncClass, samples, contextText, conversations, currentConversationId, send, newConversation, openConversation, renameConversation, focusHeatmap, saveNotes, providerText, stepStatus } = useChatPanel();
const { AppState } = useAppContext();

const PAGE_LABELS = {
  home: '首页',
  interpret: '智能解读',
  records: '健康档案',
  knowledge: '健康科普',
  academy: '影像课堂',
  about: '关于我们'
};
const pageLabel = computed(() => PAGE_LABELS[AppState.currentPage] || '当前页面');
const activeDisease = computed(() => {
  const selected = DISEASE_KNOWLEDGE_LIST.find((item) => item.code === AppState.selectedDiseaseCode);
  return selected || DISEASE_KNOWLEDGE_LIST.find((item) => item.code === 'nodule') || DISEASE_KNOWLEDGE_LIST[0];
});
const pagePrompts = computed(() => {
  const diseaseName = activeDisease.value?.shortName || '肺结节';
  if (AppState.currentPage === 'records') return ['总结我的健康档案风险', '下次随访应该什么时候？'];
  if (AppState.currentPage === 'knowledge') return [`${diseaseName}在胸片上怎么观察？`, '报告里的斑片影是什么意思？'];
  if (AppState.currentPage === 'academy') return ['九步读片法怎么用？', '气胸的典型征象是什么？'];
  if (AppState.currentPage === 'interpret') return ['用一句话解释这次分析结果', '这次结果下一步应该怎么办？'];
  if (AppState.currentPage === 'about') return ['原始影像会被上传吗？', '系统的诊断边界是什么？'];
  return ['这个产品能帮我做什么？', '胸片和 CT 应该怎么选？'];
});
async function askPrompt(prompt) {
  if (!prompt || chat.busy) return;
  chat.input = prompt;
  await nextTick();
  send();
}
</script>

<template>
<button id="aiChatLauncher" :style="launcherStyle" @pointerdown="beginDrag($event, 'launcher')" @click="launcherClick" :aria-expanded="chat.open" aria-controls="aiChatPanel" class="ai-chat-launcher" type="button" aria-label="打开医学影像问答" title="医学影像问答">
    <svg aria-hidden="true" viewBox="0 0 32 32" width="31" height="31" fill="none">
      <path d="M16 4.8 7.4 8.5v7.1c0 5.3 3.6 9 8.6 11.4 5-2.4 8.6-6.1 8.6-11.4V8.5L16 4.8Z" fill="#fff" fill-opacity=".96" />
      <path d="M14.2 11.2h3.6v3.1h3.1v3.6h-3.1v3.1h-3.6v-3.1h-3.1v-3.6h3.1v-3.1Z" fill="#0B8579" />
      <path d="m23.2 4.1.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" fill="#fff" />
    </svg>
  </button>
  <section id="aiChatPanel" class="ai-chat-panel" :class="{ hidden: !chat.open }" :style="panelStyle" role="dialog" aria-modal="false" aria-labelledby="aiChatTitle">
    <header id="aiChatHeader" @pointerdown="beginDrag($event, 'panel')" class="ai-chat-header flex items-center justify-between border-b border-border-line bg-card-bg px-4 py-3">
      <div>
        <h2 id="aiChatTitle" class="text-sm font-semibold text-text-1">医学影像问答</h2>
        <p class="text-2xs text-text-3">Qwen + 医学知识库</p>
      </div>
      <div class="flex items-center gap-1">
        <button id="aiChatNewBtn" @click="newConversation" type="button" class="btn-ghost h-7 w-7 px-0" aria-label="新建对话" title="新建对话">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button id="aiChatHistoryBtn" @click="chat.historyOpen = !chat.historyOpen" type="button" class="btn-ghost h-7 px-2 text-2xs" :aria-expanded="chat.historyOpen">历史</button>
        <button id="aiChatMinimizeBtn" @click="hidePanel" type="button" class="btn-ghost h-7 px-2 text-2xs" aria-label="收起问答">收起</button>
        <button id="aiChatCloseBtn" @click="hidePanel" type="button" class="btn-ghost h-7 px-2 text-2xs" aria-label="关闭问答">关闭</button>
      </div>
    </header>
    <div id="aiChatContextBanner" class="flex items-center justify-between border-b border-border-line bg-brand-50 px-3.5 py-1.5 text-3xs text-text-2">
      <span id="aiChatMemberContextText" class="truncate">{{ contextText }}</span>
      <span id="aiChatSyncBadge" :class="syncClass">{{ syncBadge.text }}</span>
    </div>
    <div class="flex flex-wrap items-center gap-1.5 border-b border-border-line bg-card-bg px-3.5 py-2" data-chat-page-context>
      <span class="w-full text-3xs font-semibold text-brand-700">{{ $t('AI 已读取当前页面') }}：{{ $t(pageLabel) }}</span>
      <button
        v-for="prompt in pagePrompts"
        :key="prompt"
        type="button"
        class="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-3xs text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-50"
        :disabled="chat.busy"
        data-chat-page-prompt
        @click="askPrompt(prompt)"
      >{{ prompt }}</button>
    </div>
    <nav id="aiChatConversationList" class="max-h-40 overflow-y-auto border-b border-border-line bg-card-bg p-2" :class="{ hidden: !chat.historyOpen }" aria-label="已保存的对话">
      <div v-for="conversation in conversations" :key="conversation.id" class="group flex items-start gap-1 rounded" :class="conversation.id === currentConversationId ? 'bg-brand-50' : 'hover:bg-surface-hover'">
        <button type="button" class="min-w-0 flex-1 px-2 py-1.5 text-left" :title="conversation.title || '新建对话'" @click="openConversation(conversation.id)">
          <span class="block truncate text-xs" :class="conversation.id === currentConversationId ? 'font-medium text-brand-800' : 'text-text-1'">{{ conversation.title || '新建对话' }}</span>
          <span class="mt-0.5 block truncate text-3xs text-text-3">提问成员：{{ conversation.memberName || '未记录' }}</span>
        </button>
        <button type="button" class="mt-1 rounded px-1.5 py-1 text-3xs text-text-3 opacity-70 hover:bg-card-bg hover:text-brand-700 group-hover:opacity-100" :aria-label="`重命名对话 ${conversation.title || ''}`" title="重命名" @click.stop="renameConversation(conversation.id, conversation.title)">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 6.5 4 4" /></svg>
        </button>
      </div>
      <p v-if="!conversations.length" class="px-2 py-2 text-xs text-text-3">暂无保存的对话</p>
    </nav>
    <div id="aiChatMessages" ref="messagesElement" class="ai-chat-messages" aria-live="polite">
      <div v-if="!chat.messages.length" class="ai-chat-welcome">
        <span class="ai-chat-welcome-mark" aria-hidden="true">+</span>
        <strong class="text-sm font-semibold text-text-1">你好，我是影像问答助手</strong>
        <p class="mt-1.5 text-2xs leading-relaxed text-text-2">可以问我报告术语、影像表现、下一步就诊方向，也可以直接点上面的页面问题快速开始。</p>
        <p class="mt-2 text-3xs text-text-3">当前页面：{{ $t(pageLabel) }} · 回答会结合本机知识库与当前成员档案。</p>
      </div>
      <div v-for="(message, index) in chat.messages" :key="index" class="ai-chat-bubble" :class="message.role">
        <p v-if="message.pending" class="mb-1 text-3xs font-medium text-primary">{{ message.stepText }}</p>
        <div>{{ message.content }}</div>
        <template v-if="message.role === 'assistant' && !message.pending">
          <p v-if="message.provider" class="mt-2 border-t border-border-line pt-1.5 text-3xs text-text-3">{{ providerText(message) }}</p>
          <details v-if="message.steps?.length" class="mt-1.5 text-3xs text-text-3">
            <summary class="cursor-pointer select-none">Agent 工作流</summary>
            <div class="mt-1 space-y-0.5 pl-2"><p v-for="(step, stepIndex) in message.steps" :key="stepIndex">{{ step.name }}：{{ stepStatus(step.status) }}</p></div>
          </details>
          <a v-for="(source, sourceIndex) in message.sources || []" :key="sourceIndex" class="ai-chat-source" :href="source.source_url" target="_blank" rel="noopener noreferrer">来源：{{ source.title }} · {{ source.source }}</a>
          <div v-if="message.content?.length > 15" class="mt-2 flex flex-wrap items-center gap-2 border-t border-border-line pt-1.5">
            <button type="button" class="rounded bg-brand-50 px-2 py-0.5 text-3xs font-medium text-brand-700 transition-colors hover:bg-brand-100" @click="focusHeatmap">定位高激活热区</button>
            <button type="button" :disabled="chat.noteSaving" class="rounded border border-border-line bg-surface-sunken px-2 py-0.5 text-3xs font-medium text-text-2 transition-colors hover:text-brand-700 disabled:opacity-60" @click="saveNotes(message.content)">{{ chat.noteSaving ? 'AI 总结中…' : 'AI 总结记入备注' }}</button>
          </div>
        </template>
      </div>
    </div>
    <div class="border-t border-border-line bg-card-bg p-3">
      <div class="mb-2 flex gap-1.5 overflow-x-auto pb-1" id="aiChatTeachingSamples">
        <button v-for="[id, label] in samples" :key="id" type="button" :data-chat-sample="id" :disabled="chat.sampleBusy === id" class="btn-secondary h-7 flex-none px-2 text-3xs" @click="openSample(id)">{{ label }}</button>
      </div>
      <form id="aiChatForm" @submit.prevent="send" class="flex items-end gap-2">
        <textarea id="aiChatInput" ref="inputElement" v-model="chat.input" rows="2" maxlength="500" class="field min-w-0 flex-1 resize-none py-2" placeholder="例如：胸腔积液在胸片上常见哪些线索？"></textarea>
        <button id="aiChatSendBtn" :disabled="chat.busy" type="submit" class="btn-primary h-9 px-3 text-2xs">{{ chat.busy ? '思考中' : '发送' }}</button>
      </form>
      <p class="mt-1 text-3xs text-text-3">内容仅供健康科普参考，请勿据此自行用药。</p>
    </div>
  </section>

  <!-- 顶部固定导航栏 (NavBar.vue) -->

</template>
