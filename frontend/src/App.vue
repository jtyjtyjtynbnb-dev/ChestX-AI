<template>
  <div class="min-h-screen bg-page-bg text-text-1">
    <InterpretView />
    <FloatingAiChat
      @focus-heatmap="handleFocusHeatmap"
      @save-to-notes="handleSaveToNotes"
    />
  </div>
</template>

<script setup>
import InterpretView from './views/InterpretView.vue';
import FloatingAiChat from './components/FloatingAiChat.vue';
import { useDiagnoseStore } from './stores/useDiagnoseStore.js';
import { useUserStore } from './stores/useUserStore.js';

const diagnoseStore = useDiagnoseStore();
const userStore = useUserStore();

function handleFocusHeatmap() {
  diagnoseStore.focusHighActivationRegion();
}

function handleSaveToNotes(content) {
  const member = userStore.currentMember;
  if (!member) return;
  const snippet = String(content || '').slice(0, 120);
  member.profile.notes = [member.profile.notes, `[AI问答摘录] ${snippet}`].filter(Boolean).join('；');
  userStore.persistMembers();
}
</script>
