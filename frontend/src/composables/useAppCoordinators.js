import { nextTick, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createInteractionScope } from './interactionScope.js';
import { createApiScope } from '../api/client.js';
import { useChestxStore } from '../stores/useChestxStore.js';
import { useNavigation } from './useNavigation.js';
import { useFamilyMembers } from './useFamilyMembers.js';
import { useRecordDetail } from './useRecordDetail.js';
import { useRecords } from './useRecords.js';
import { useDashboard } from './useDashboard.js';
import { useChat } from './useChat.js';
import { useChatConversations } from './useChatConversations.js';
import { useChatMessages } from './useChatMessages.js';
import { useSettings } from './useSettings.js';
import { useNotifications } from './useNotifications.js';

export function useAppCoordinators() {
  const router = useRouter();
  const store = useChestxStore();
  const AppState = store.appState;
  const scope = createInteractionScope();
  const api = createApiScope();
  const actions = {};
  const modules = {};
  const context = { AppState, api, scope, store, router, actions, modules };
  let disposed = false;
  const create = (name, factory) => {
    modules[name] = factory(context);
  };

  // Shared services for the shell, floating chat and global modals.
  // Views own page controllers, canvas refs and their request scopes.
  create('navigation', useNavigation);
  create('notifications', useNotifications);
  create('family', useFamilyMembers);
  create('recordDetail', useRecordDetail);
  create('records', useRecords);
  create('dashboard', useDashboard);
  create('chat', useChat);
  create('chatConv', useChatConversations);
  create('chatMsg', useChatMessages);
  create('settings', useSettings);

  Object.assign(actions, {
    showToast: (...args) => modules.notifications.showToast(...args),
    switchPage: (...args) => modules.navigation.switchPage(...args),
    saveCurrentToHealthRecords: (...args) => modules.records.saveCurrentToHealthRecords(...args),
    openSample: (id) => withInterpretPage('loadSample', id),
    focusHeatmap: () => withInterpretPage('focusHeatmap'),
    getCurrentMember: (...args) => modules.family.getCurrentMember(...args),
    getCurrentMemberRecords: (...args) => modules.family.getCurrentMemberRecords(...args),
    persistFamilyMembers: (...args) => modules.family.persistFamilyMembers(...args),
    syncCurrentMemberState: (...args) => modules.family.syncCurrentMemberState(...args),
    openFamilyModal: (...args) => {
      modules.family.openFamilyModal(...args);
      modules.settings.refreshQwenSettingsStatus();
    },
    closeUserModal: (...args) => modules.family.closeUserModal(...args),
    populateMemberForm: (...args) => modules.family.populateMemberForm(...args),
    openRecordDetailModal: (...args) => modules.recordDetail.openRecordDetailModal(...args),
    updateChatContextBanner: (...args) => modules.chat.updateChatContextBanner(...args),
    sendAiChatMessage: (...args) => modules.chat.sendAiChatMessage(...args),
    appendChatMessage: (...args) => modules.chatMsg.appendChatMessage(...args),
    attachAssistantMetaAndActions: (...args) => modules.chatMsg.attachAssistantMetaAndActions(...args),
    persistChatMessage: (...args) => modules.chatConv.persistChatMessage(...args),
    renderChatConversation: (...args) => modules.chatConv.renderChatConversation(...args),
    renderChatConversationList: (...args) => modules.chatConv.renderChatConversationList(...args),
    openChatConversation: (...args) => modules.chatConv.openChatConversation(...args),
    newChatConversation: (...args) => modules.chatConv.newChatConversation(...args),
    qwenFailureText: (...args) => modules.settings.qwenFailureText(...args),
    openStatsModal: (...args) => modules.dashboard.openStatsModal(...args)
  });

  async function withInterpretPage(method, ...args) {
    if (disposed) return false;
    await actions.switchPage('interpret');
    await nextTick();
    if (disposed || router.currentRoute.value.name !== 'interpret') return false;
    return modules.interpret?.[method](...args) ?? false;
  }

  // The route is the single source of truth, even on a direct child-URL load.
  modules.navigation.mount();
  onMounted(() => {
    // Remote hydration must not delay navigation or page initialization.
    modules.family.initializeFamilyMembers();
    modules.chatConv.mount();
    modules.settings.refreshQwenSettingsStatus();
  });

  onBeforeUnmount(() => {
    disposed = true;
    for (const module of Object.values(modules)) module.dispose?.();
    api.dispose();
    scope.dispose();
  });

  return context;
}
