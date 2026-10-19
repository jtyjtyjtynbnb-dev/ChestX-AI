/**
 * 胸片看片台缩放、平移、反色与 Grad-CAM 热力叠加 Composable
 */
import { ref } from 'vue';
import { DEFAULT_HEATMAP_OPACITY } from '../utils/constant.js';

export function useImageViewer() {
  const scale = ref(1);
  const offsetX = ref(0);
  const offsetY = ref(0);
  const inverted = ref(false);
  const showHeatmap = ref(true);
  const opacity = ref(DEFAULT_HEATMAP_OPACITY);

  function resetTransform() {
    scale.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
    inverted.value = false;
  }

  function zoomBy(delta) {
    scale.value = Math.min(3.5, Math.max(0.5, Number((scale.value + delta).toFixed(2))));
  }

  return {
    scale,
    offsetX,
    offsetY,
    inverted,
    showHeatmap,
    opacity,
    resetTransform,
    zoomBy
  };
}
