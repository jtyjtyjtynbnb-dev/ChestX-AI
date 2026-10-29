import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { INITIAL_APP_STATE } from './referenceData.js';
export const useChestxStore = defineStore('chestx', () => {
  const appState = reactive({
    ...JSON.parse(JSON.stringify(INITIAL_APP_STATE)),
    conversations: [], chatHistory: [], agentQuestion: '', pendingSample: null,
    toasts: [], routeProgress: { width: 0, opacity: 0 },
    knowledge: { search: '', hotspot: 0 }, academy: { tab: 'basics', hotspots: {} },
    statsOpen: false, syncState: 'ready'
  });
  const currentConversationId = ref(null);
  const currentMember = computed(() => appState.familyMembers.find(m => m.id === appState.currentMemberId) || appState.familyMembers[0]);
  const records = computed(() => currentMember.value?.records || appState.records);
  function setCurrentPage(page) { appState.currentPage = page; }
  return { appState, currentConversationId, currentMember, records, setCurrentPage };
});
