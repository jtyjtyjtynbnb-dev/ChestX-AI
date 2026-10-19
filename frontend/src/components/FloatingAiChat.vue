<template>
  <!-- 右下角可拖拽悬浮 AI 问答助手 (Floating AI Copilot) -->
  <div>
    <button
      id="aiChatLauncher"
      class="ai-chat-launcher"
      type="button"
      aria-label="打开医学影像问答 (快捷键 Alt+K)"
      title="医学影像问答 (Alt+K)"
      @click="togglePanel"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3.5 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
        <path d="M12.5 7.5v7m-3.5-3.5h7" />
      </svg>
    </button>

    <section
      v-show="isOpen"
      id="aiChatPanel"
      class="ai-chat-panel"
      role="dialog"
      aria-labelledby="aiChatTitle"
    >
      <header id="aiChatHeader" class="ai-chat-header flex items-center justify-between border-b border-border-line bg-white px-4 py-3">
        <div>
          <h2 id="aiChatTitle" class="text-sm font-semibold text-text-1">医学影像问答</h2>
          <p class="text-[11px] text-text-3">Qwen + 混合知识库 · SSE 流式副驾</p>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-secondary !h-7 !px-2 !text-xs" @click="startNewConversation">新建</button>
          <button type="button" class="btn-secondary !h-7 !px-2 !text-xs" @click="showHistory = !showHistory">历史</button>
          <button type="button" class="btn-secondary !h-7 !px-2 !text-xs" @click="isOpen = false">收起</button>
        </div>
      </header>

      <!-- 当前关联家庭成员与胸片上下文状态栏 -->
      <div id="aiChatContextBanner" class="flex items-center justify-between bg-primary/5 px-3.5 py-1.5 text-[11px] text-text-2 border-b border-border-line">
        <span class="truncate">当前成员：<strong class="text-primary">{{ memberLabel }}</strong></span>
        <span class="text-[10px] text-success">SQLite 已同步</span>
      </div>

      <!-- 消息流与底部画布联动操作栏 -->
      <div id="aiChatMessages" class="ai-chat-messages">
        <div v-for="(msg, idx) in messages" :key="idx" :class="['ai-chat-bubble', msg.role]">
          <div>{{ msg.content }}</div>
          <div v-if="msg.role === 'assistant'" class="mt-2 flex flex-wrap gap-1.5 border-t border-border-line pt-1.5">
            <button type="button" class="text-[11px] text-primary hover:underline" @click="$emit('focus-heatmap')">
              定位高激活热区
            </button>
            <button type="button" class="text-[11px] text-primary hover:underline" @click="$emit('save-to-notes', msg.content)">
              记入成员随访备注
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/useUserStore.js';

defineEmits(['focus-heatmap', 'save-to-notes']);
const userStore = useUserStore();
const isOpen = ref(false);
const showHistory = ref(false);
const messages = ref([
  { role: 'assistant', content: '你好，我是影像问答助手，可以根据当前家庭成员档案、胸片解读结果和医学知识库回答科普问题。不能替代医生诊断。' }
]);

const memberLabel = computed(() => {
  const m = userStore.currentMember;
  if (!m) return '默认成员';
  return `${m.profile.name}${m.profile.age ? ` (${m.profile.age}岁)` : ''}`;
});

function togglePanel() {
  isOpen.value = !isOpen.value;
}

function startNewConversation() {
  messages.value = [
    { role: 'assistant', content: '你好，我是影像问答助手，可以解释胸片术语并结合医学知识库回答科普问题。不能替代医生诊断。' }
  ];
}
</script>
