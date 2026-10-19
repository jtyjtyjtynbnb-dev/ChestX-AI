/**
 * Pinia 影像智能解读与 LangGraph Agent 状态 Store
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDiagnoseStore = defineStore('chestx-diagnose', () => {
  const currentCase = ref(null);
  const workflowSteps = ref([]);
  const isInferring = ref(false);
  const heatmapVisible = ref(true);
  const heatmapOpacity = ref(68);

  function setWorkflowSteps(steps) {
    workflowSteps.value = Array.isArray(steps) ? steps : [];
  }

  function focusHighActivationRegion() {
    heatmapVisible.value = true;
    heatmapOpacity.value = 75;
  }

  return {
    currentCase,
    workflowSteps,
    isInferring,
    heatmapVisible,
    heatmapOpacity,
    setWorkflowSteps,
    focusHighActivationRegion
  };
});
