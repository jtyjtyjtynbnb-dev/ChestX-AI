<script setup>
import { useChatPanel } from '../composables/useChatPanel.js';
const { chat, inputElement, messagesElement, launcherStyle, panelStyle, launcherClick, beginDrag, hidePanel, openSample, syncBadge, syncClass, samples, contextText, conversations, currentConversationId, send, newConversation, openConversation, focusHeatmap, saveNotes, providerText, stepStatus } = useChatPanel();
</script>

<template>
<button id="aiChatLauncher" :style="launcherStyle" @pointerdown="beginDrag($event, 'launcher')" @click="launcherClick" :aria-expanded="chat.open" aria-controls="aiChatPanel" class="ai-chat-launcher" type="button" aria-label="打开医学影像问答" title="医学影像问答">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3.5 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M12.5 7.5v7m-3.5-3.5h7" />
    </svg>
  </button>
  <section id="aiChatPanel" class="ai-chat-panel" :class="{ hidden: !chat.open }" :style="panelStyle" role="dialog" aria-modal="false" aria-labelledby="aiChatTitle">
    <header id="aiChatHeader" @pointerdown="beginDrag($event, 'panel')" class="ai-chat-header flex items-center justify-between border-b border-border-line bg-white px-4 py-3">
      <div>
        <h2 id="aiChatTitle" class="text-sm font-semibold text-text-1">医学影像问答</h2>
        <p class="text-[11px] text-text-3">Qwen + 医学知识库</p>
      </div>
      <div class="flex items-center gap-1">
        <button id="aiChatNewBtn" @click="newConversation" type="button" class="btn-secondary !h-7 !w-7 !p-0" aria-label="新建对话" title="新建对话">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button id="aiChatHistoryBtn" @click="chat.historyOpen = !chat.historyOpen" type="button" class="btn-secondary !h-7 !px-2 !text-xs" :aria-expanded="chat.historyOpen">历史</button>
        <button id="aiChatMinimizeBtn" @click="hidePanel" type="button" class="btn-secondary !h-7 !px-2 !text-xs" aria-label="收起问答">收起</button>
        <button id="aiChatCloseBtn" @click="hidePanel" type="button" class="btn-secondary !h-7 !px-2 !text-xs" aria-label="关闭问答">关闭</button>
      </div>
    </header>
    <div id="aiChatContextBanner" class="flex items-center justify-between border-b border-border-line bg-primary/5 px-3.5 py-1.5 text-[11px] text-text-2">
      <span id="aiChatMemberContextText" class="truncate">{{ contextText }}</span>
      <span id="aiChatSyncBadge" :class="syncClass">{{ syncBadge.text }}</span>
    </div>
    <nav id="aiChatConversationList" class="max-h-32 overflow-y-auto border-b border-border-line bg-white p-2" :class="{ hidden: !chat.historyOpen }" aria-label="已保存的对话">
      <button v-for="conversation in conversations" :key="conversation.id" type="button" class="block w-full truncate rounded px-2 py-1.5 text-left text-xs" :class="conversation.id === currentConversationId ? 'bg-primary/10 text-primary' : 'hover:bg-page-bg'" :title="conversation.title || '新建对话'" @click="openConversation(conversation.id)">{{ conversation.title || '新建对话' }}</button>
      <p v-if="!conversations.length" class="px-2 py-2 text-xs text-text-3">暂无保存的对话</p>
    </nav>
    <div id="aiChatMessages" ref="messagesElement" class="ai-chat-messages" aria-live="polite">
      <div v-for="(message, index) in chat.messages" :key="index" class="ai-chat-bubble" :class="message.role">
        <p v-if="message.pending" class="mb-1 text-[10px] font-medium text-primary">{{ message.stepText }}</p>
        <div>{{ message.content }}</div>
        <template v-if="message.role === 'assistant' && !message.pending">
          <p v-if="message.provider" class="mt-2 border-t border-border-line pt-1.5 text-[10px] text-text-3">{{ providerText(message) }}</p>
          <details v-if="message.steps?.length" class="mt-1.5 text-[10px] text-text-3">
            <summary class="cursor-pointer select-none">Agent 工作流</summary>
            <div class="mt-1 space-y-0.5 pl-2"><p v-for="(step, stepIndex) in message.steps" :key="stepIndex">{{ step.name }}：{{ stepStatus(step.status) }}</p></div>
          </details>
          <a v-for="(source, sourceIndex) in message.sources || []" :key="sourceIndex" class="ai-chat-source" :href="source.source_url" target="_blank" rel="noopener noreferrer">来源：{{ source.title }} · {{ source.source }}</a>
          <div v-if="message.content?.length > 15" class="mt-2 flex flex-wrap items-center gap-2 border-t border-border-line pt-1.5">
            <button type="button" class="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors" @click="focusHeatmap">定位高激活热区</button>
            <button type="button" class="rounded bg-page-bg px-2 py-0.5 text-[10px] font-medium text-text-2 hover:text-primary border border-border-line transition-colors" @click="saveNotes(message.content)">记入成员随访备注</button>
          </div>
        </template>
      </div>
    </div>
    <div class="border-t border-border-line bg-white p-3">
      <div class="mb-2 flex flex-wrap gap-1.5" id="aiChatTeachingSamples">
        <button v-for="[id, label] in samples" :key="id" type="button" :data-chat-sample="id" :disabled="chat.sampleBusy === id" class="btn-secondary !h-7 !px-2 !text-[11px]" @click="openSample(id)">{{ label }}</button>
      </div>
      <form id="aiChatForm" @submit.prevent="send" class="flex items-end gap-2">
        <textarea id="aiChatInput" ref="inputElement" v-model="chat.input" rows="2" maxlength="500" class="min-w-0 flex-1 resize-none rounded-md border border-border-line px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="例如：胸腔积液在胸片上常见哪些线索？"></textarea>
        <button id="aiChatSendBtn" :disabled="chat.busy" type="submit" class="btn-primary !h-9 !px-3 !text-xs">{{ chat.busy ? '思考中' : '发送' }}</button>
      </form>
      <p class="mt-1 text-[10px] text-text-3">内容仅供健康科普参考，请勿据此自行用药。</p>
    </div>
  </section>

  <!-- 顶部固定导航栏 (NavBar.vue) -->

</template>
