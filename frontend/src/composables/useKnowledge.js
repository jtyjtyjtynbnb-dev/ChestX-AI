import { computed } from 'vue';
import { DISEASE_KNOWLEDGE_LIST } from '../stores/referenceData.js';
import { getRiskStyle } from '../utils/format.js';
export function useKnowledge({ AppState, actions }) {
  AppState.knowledge ||= { search: '', hotspot: 0 }; const state = AppState.knowledge;
  const activeItem = computed(() => DISEASE_KNOWLEDGE_LIST.find((d) => d.code === AppState.selectedDiseaseCode) || DISEASE_KNOWLEDGE_LIST[0]);
  const filteredList = computed(() => { const q = state.search.trim().toLowerCase(); return DISEASE_KNOWLEDGE_LIST.filter((d) => !q || d.name.toLowerCase().includes(q) || d.overview.toLowerCase().includes(q)); });
  const activeRisk = computed(() => getRiskStyle(activeItem.value.severity));
  const activeHotspot = computed(() => activeItem.value.hotspots[state.hotspot] || activeItem.value.hotspots[0]);
  function selectDisease(code) { AppState.selectedDiseaseCode = code; state.hotspot = 0; }
  function selectHotspot(index) { state.hotspot = index; }
  function toAcademy() { AppState.academy.tab = 'signs'; actions.switchPage('academy'); }
  return { getRiskStyle, state, activeItem, activeRisk, activeHotspot, filteredList, selectDisease, selectHotspot, toAcademy, toInterpret: () => actions.switchPage('interpret'), renderKnowledgePage() {}, mount() {} };
}

