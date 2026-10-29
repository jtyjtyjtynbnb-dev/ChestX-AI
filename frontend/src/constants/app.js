/** Product-level constants shared by the store, viewer and upload pipeline. */
export const IMAGE_UPLOAD = {
  maxImageBytes: 10 * 1024 * 1024,
  maxDicomBytes: 40 * 1024 * 1024,
  maxSeries: 20,
  maxSide: 1600,
  jpegQuality: 0.85,
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
};

export const PROB_THRESHOLD = { HIGH: 60.0, MEDIUM: 25.0 };

export const VIEWER_ZOOM = { MIN: 0.5, MAX: 4.0, STEP: 0.2, DEFAULT: 1.0 };

export const VIEWER_DEFAULTS = {
  brightness: 100,
  contrast: 100,
  heatmapOpacity: 68,
  splitPercent: 50,
  focusHeatmapOpacity: 75,
};

export const ANALYSIS_STAGE_PERCENT = {
  '输入校验': 15,
  '影像推理': 45,
  '知识检索': 65,
  'Qwen 多模态报告': 88,
  '安全审查': 96,
};

export const CHAT_PANEL = {
  width: 390,
  maxHeight: 560,
  edge: 24,
  viewportGap: 32,
  heightGap: 130,
  launcherSize: 54,
  panelGap: 14,
  screenInset: 8,
};
