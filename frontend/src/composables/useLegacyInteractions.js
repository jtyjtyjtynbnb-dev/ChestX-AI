import { onBeforeUnmount, onMounted, watch } from 'vue';
import { createInteractionEngine } from '../services/interactionEngine.js';
import { useNavigation } from './useNavigation.js';
import { useFamilyMembers } from './useFamilyMembers.js';
import { useImageViewer } from './useImageViewer.js';
import { useDiagnosis } from './useDiagnosis.js';
import { useChat } from './useChat.js';
import { useRecords } from './useRecords.js';
import { useKnowledge } from './useKnowledge.js';
import { useAcademy } from './useAcademy.js';
import { useDashboard } from './useDashboard.js';

export function useLegacyInteractions({ router, route }) {
  const engine = createInteractionEngine({ router });
  const navigation = useNavigation(engine);
  const family = useFamilyMembers(engine);
  const viewer = useImageViewer(engine);
  const diagnosis = useDiagnosis(engine);
  const chat = useChat(engine);
  const records = useRecords(engine);
  const knowledge = useKnowledge(engine);
  const academy = useAcademy(engine);
  const dashboard = useDashboard(engine);
  let mounted = false;

  onMounted(async () => {
    navigation.mount();
    await family.mount();
    viewer.mount?.();
    diagnosis.mount();
    records.mount();
    knowledge.mount();
    academy.mount();
    chat.mount();
    mounted = true;
    const initialRoute = String(route.name || 'home');
    if (initialRoute !== 'home') navigation.navigate(initialRoute, { updateRoute: false });
  });

  watch(
    () => route.name,
    (name) => {
      if (mounted) navigation.navigate(String(name || 'home'), { updateRoute: false });
    }
  );

  onBeforeUnmount(engine.destroy);

  return {
    navigate: navigation.navigate,
    renderDashboard: dashboard.render,
    destroy: engine.destroy
  };
}
