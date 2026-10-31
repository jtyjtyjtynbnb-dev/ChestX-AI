import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { VIEWER_DEFAULTS } from '../constants/app.js';
import { useAppContext } from './useAppContext.js';
import { useDiagnosis } from './useDiagnosis.js';
import { useDiagnosisResults } from './useDiagnosisResults.js';
import { useImageViewer } from './useImageViewer.js';
import { useImageUpload } from './useImageUpload.js';
import { formatBytes, formatProb } from '../utils/format.js';
import { createApiScope } from '../api/client.js';
import { createInteractionScope } from './interactionScope.js';

export function useInterpretPage() {
  const api = createApiScope();
  const scope = createInteractionScope();
  const ctx = { ...useAppContext(), api, scope };
  const { AppState, actions, modules } = ctx;
  const heatmapCanvas = ref(null);
  const measureCanvas = ref(null);
  const probabilityChart = ref(null);
  const viewport = ref(null);
  const viewer = useImageViewer(ctx, heatmapCanvas, measureCanvas);
  const diagnosis = useDiagnosis(ctx);
  const results = useDiagnosisResults(ctx, probabilityChart);
  const upload = useImageUpload(ctx, { onBeforeLoad: diagnosis.cancel, onLoaded: viewer.resetViewerState });
  let mounted = false;
  let sampleRequest = null;
  async function analyze(sampleId = null) {
    sampleRequest?.abort();
    upload.cancelPending();
    upload.hideUploader();
    if (sampleId) viewer.resetViewerState();
    await diagnosis.triggerAiAnalysisFlow(sampleId);
  }
  async function loadSample(id) {
    if (!id.startsWith('teaching-')) {
      await analyze(id);
      return mounted && AppState.diagnoseStatus === 'done';
    }
    sampleRequest?.abort();
    diagnosis.cancel();
    upload.cancelPending();
    const request = new AbortController();
    sampleRequest = request;
    try {
      const blob = await api.sample(id, { signal: request.signal });
      if (!mounted || request.signal.aborted) return false;
      return await upload.handleLocalXrayFile(new File([blob], id + '.jpg', { type: blob.type || 'image/jpeg' }));
    } catch (error) {
      if (mounted && error.name !== 'AbortError') actions.showToast(error.message || '教学胸片加载失败', 'error');
      return false;
    } finally {
      if (sampleRequest === request) sampleRequest = null;
    }
  }
  function consumePendingSample(id) {
    if (!id || !mounted) return;
    AppState.pendingSample = null;
    loadSample(id);
  }
  function exportReport() {
    const c = AppState.currentCase;
    actions.openRecordDetailModal({ ...c, title: c.fileName, createdAt: c.uploadedAt });
  }
  function focusHeatmap() {
    AppState.viewer.showHeatmap = true;
    AppState.viewer.heatmapOpacity = VIEWER_DEFAULTS.focusHeatmapOpacity;
    viewport.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  const analysisProgress = computed(() => AppState.analysisProgress || diagnosis.progress);
  const pageModule = markRaw({ analyze, loadSample, handleLocalXrayFile: upload.handleLocalXrayFile, focusHeatmap });
  watch(() => AppState.pendingSample, consumePendingSample);
  watch(() => [AppState.currentCase?.heatmapDataUrl, AppState.currentCase?.hotspots, AppState.viewer.compareMode, AppState.viewer.splitPercent], () => nextTick(viewer.drawGradCamHeatmap), { deep: true });
  watch(() => [AppState.viewer.measurements, AppState.viewer.measurePoints, AppState.viewer.measureMode], () => nextTick(viewer.drawMeasurements), { deep: true });
  watch(() => [AppState.currentCase?.probabilities, AppState.probViewMode, AppState.diagnoseStatus], results.renderProbabilityChart, { deep: true });
  onMounted(() => {
    mounted = true;
    modules.interpret = pageModule;
    viewer.drawGradCamHeatmap();
    viewer.drawMeasurements();
    results.mount();
    consumePendingSample(AppState.pendingSample);
  });
  onBeforeUnmount(() => {
    mounted = false;
    sampleRequest?.abort();
    // Keep an in-flight analysis alive across route changes. The request writes
    // into the shared AppState, so returning to /interpret shows its result.
    const analysisRunning = AppState.diagnoseStatus === 'analyzing';
    if (!analysisRunning) {
      diagnosis.dispose();
      api.dispose();
    } else {
      const cleanupWhenSettled = () => {
        if (AppState.diagnoseStatus === 'analyzing') {
          globalThis.setTimeout(cleanupWhenSettled, 500);
          return;
        }
        diagnosis.dispose();
        api.dispose();
      };
      globalThis.setTimeout(cleanupWhenSettled, 500);
    }
    upload.dispose(); viewer.dispose(); results.dispose();
    scope.dispose();
    if (modules.interpret === pageModule) delete modules.interpret;
  });
  return reactive({ AppState, actions, viewer, diagnosis, results, upload, analysisProgress, heatmapCanvas, measureCanvas, probabilityChart, viewport,
    currentCase: computed(() => AppState.currentCase), series: computed(() => AppState.series || []), formatBytes, formatProb, analyze, exportReport, focusHeatmap,
    sampleCases: [
      { id: 'case-high', label: '样本1：右下肺斑片影', className: '!border-danger/40 !text-danger hover:!bg-danger/5' },
      { id: 'case-medium', label: '样本2：右肺结节随访', className: '!border-warning/40 !text-warning hover:!bg-warning/5' },
      { id: 'case-low', label: '样本3：标准正常胸片', className: '!border-success/40 !text-success hover:!bg-success/5' }
    ]
  });
}

