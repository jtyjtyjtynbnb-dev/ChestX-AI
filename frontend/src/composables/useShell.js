import { computed } from 'vue';
import { useAppContext } from './useAppContext.js';
export function useShell() {
  const { AppState, actions, modules, store } = useAppContext();
  return { state: AppState, actions, nav: modules.navigation, member: computed(() => store.currentMember), recordCount: computed(() => store.records.length) };
}
