/** Pure geometry helpers for the image viewer (no DOM, no Vue state). */

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function lengthMeasurement(points, options = {}) {
  const { width = 420, height = 420, pixelSpacing = null, naturalWidth = 0 } = options;
  const [a, b] = points || [];
  if (!a || !b) return '0 px';
  const dx = (b.x - a.x) * width;
  const dy = (b.y - a.y) * height;
  const px = Math.hypot(dx, dy);
  if (pixelSpacing && naturalWidth) {
    const mm = px * (naturalWidth / width) * pixelSpacing[1];
    return mm.toFixed(1) + ' mm';
  }
  return px.toFixed(0) + ' px';
}

export function angleMeasurement(points, options = {}) {
  const { width = 420, height = 420 } = options;
  const [a, b, c] = points || [];
  if (!a || !b || !c) return '0°';
  const v1 = { x: (a.x - b.x) * width, y: (a.y - b.y) * height };
  const v2 = { x: (c.x - b.x) * width, y: (c.y - b.y) * height };
  const denominator = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1;
  const cosine = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / denominator));
  return (Math.acos(cosine) * 180 / Math.PI).toFixed(1) + '°';
}

export function roiMeasurement(points, options = {}) {
  const { width = 420, height = 420 } = options;
  const [a, b] = points || [];
  if (!a || !b) return 'ROI 0 px²';
  const area = Math.abs((b.x - a.x) * width) * Math.abs((b.y - a.y) * height);
  return 'ROI ' + Math.round(area) + ' px²';
}

export function measurementLabel(mode, points, options = {}) {
  if (mode === 'length') return lengthMeasurement(points, options);
  if (mode === 'angle') return angleMeasurement(points, options);
  if (mode === 'roi') return roiMeasurement(points, options);
  return '';
}
