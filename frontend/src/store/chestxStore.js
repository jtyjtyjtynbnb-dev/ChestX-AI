/**
 * Pinia 用户与家庭成员健康档案 Store (支持 LocalStorage + 后端 SQLite 双写同步)
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { FAMILY_STORAGE_KEY, FAMILY_CURRENT_KEY } from '../utils/constant.js';
import { requestJson } from '../api/client.js';

export const useUserStore = defineStore('chestx-user', () => {
  const familyMembers = ref([]);
  const currentMemberId = ref('');
  const syncStatus = ref('idle'); // 'idle' | 'syncing' | 'synced' | 'offline'

  const currentMember = computed(() =>
    familyMembers.value.find((m) => m.id === currentMemberId.value) || familyMembers.value[0] || null
  );

  async function initMembers(defaultFactory) {
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(FAMILY_STORAGE_KEY) || 'null');
    } catch (_e) {}
    if (Array.isArray(local) && local.length) {
      familyMembers.value = local;
    } else if (typeof defaultFactory === 'function') {
      familyMembers.value = defaultFactory();
    }
    const savedId = localStorage.getItem(FAMILY_CURRENT_KEY);
    currentMemberId.value = familyMembers.value.some((m) => m.id === savedId)
      ? savedId
      : (familyMembers.value[0]?.id || '');

    try {
      const remote = await requestJson('/api/members');
      if (Array.isArray(remote?.members) && remote.members.length) {
        familyMembers.value = remote.members;
        if (remote.current_member_id && familyMembers.value.some((m) => m.id === remote.current_member_id)) {
          currentMemberId.value = remote.current_member_id;
        }
        syncStatus.value = 'synced';
      } else {
        await persistMembers();
      }
    } catch (_err) {
      syncStatus.value = 'offline';
    }
  }

  async function persistMembers() {
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(familyMembers.value));
    localStorage.setItem(FAMILY_CURRENT_KEY, currentMemberId.value || '');
    syncStatus.value = 'syncing';
    try {
      await requestJson('/api/members/sync', {
        method: 'POST',
        body: JSON.stringify({
          current_member_id: currentMemberId.value,
          members: familyMembers.value
        })
      });
      syncStatus.value = 'synced';
    } catch (_err) {
      syncStatus.value = 'offline';
    }
  }

  return {
    familyMembers,
    currentMemberId,
    currentMember,
    syncStatus,
    initMembers,
    persistMembers
  };
});
