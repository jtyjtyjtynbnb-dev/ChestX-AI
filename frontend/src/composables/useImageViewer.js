import { computed } from 'vue';
import { VIEWER_DEFAULTS, VIEWER_ZOOM } from '../constants/app.js';
import { measurementLabel } from '../utils/viewer.js';

const MEASURE_LABEL = { length: '长度', angle: '角度', roi: 'ROI' };

export function useImageViewer({ AppState, actions }, canvasRef, measureCanvasRef) {
  let disposed = false;
  let cachedHeatmap = null;
  let heatmapSource = '';
  let pendingImage = null;
  const transformStyle = computed(() => ({
    transition: AppState.viewer.isDragging ? 'none' : 'transform 180ms ease-out',
    transform: 'translate(' + AppState.viewer.tx + 'px, ' + AppState.viewer.ty + 'px) scale(' + AppState.viewer.scale + ') rotate(' + AppState.viewer.rotation + 'deg)'
  }));
  const imageFilter = computed(() => {
    const viewer = AppState.viewer;
    return 'brightness(' + viewer.brightness + '%) contrast(' + viewer.contrast + '%)' + (viewer.invertFilter ? ' invert(1)' : '');
  });

  function drawGradCamHeatmap() {
    const canvas = canvasRef.value;
    if (!canvas || disposed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const source = AppState.currentCase?.heatmapDataUrl || '';
    if (source !== heatmapSource) {
      heatmapSource = source;
      cachedHeatmap = null;
      if (pendingImage) { pendingImage.onload = null; pendingImage.onerror = null; }
      pendingImage = null;
      if (source) {
        const image = new Image();
        pendingImage = image;
        image.onload = () => {
          if (disposed || heatmapSource !== source) return;
          cachedHeatmap = image;
          pendingImage = null;
          drawGradCamHeatmap();
        };
        image.onerror = () => { pendingImage = null; };
        image.src = source;
      }
    }
    ctx.save();
    if (AppState.viewer.compareMode) {
      const splitX = AppState.viewer.splitPercent / 100 * w;
      ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    }
    if (source) {
      if (cachedHeatmap) ctx.drawImage(cachedHeatmap, 0, 0, w, h);
    } else {
      for (const spot of AppState.currentCase?.hotspots || []) {
        const cx = spot.x * w, cy = spot.y * h, radius = spot.r * w;
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
        const stops = spot.weight >= 0.75
          ? [[0,'rgba(245, 63, 63, 0.92)'],[0.35,'rgba(255, 138, 0, 0.72)'],[0.68,'rgba(0, 180, 42, 0.35)'],[0.88,'rgba(54, 191, 250, 0.12)'],[1,'rgba(15, 98, 254, 0)']]
          : spot.weight >= 0.45
            ? [[0,'rgba(255, 138, 0, 0.85)'],[0.45,'rgba(0, 180, 42, 0.45)'],[0.8,'rgba(54, 191, 250, 0.15)'],[1,'rgba(15, 98, 254, 0)']]
            : [[0,'rgba(0, 180, 42, 0.45)'],[0.55,'rgba(54, 191, 250, 0.22)'],[1,'rgba(15, 98, 254, 0)']];
        stops.forEach(([offset,color]) => grad.addColorStop(offset,color));
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI * 2); ctx.fill();
        if (spot.weight >= 0.65) {
          const size = radius * 1.15, x = cx - size / 2, y = cy - size / 2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]); ctx.strokeRect(x,y,size,size); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(245,63,63,0.9)'; ctx.fillRect(x,y - 18,92,16);
          ctx.fillStyle = '#FFFFFF'; ctx.font = '600 10px sans-serif'; ctx.fillText('热力权重 ' + (spot.weight * 100).toFixed(0) + '%',x + 5,y - 6);
        }
      }
    }
    ctx.restore();
  }

  function drawMeasurements() {
    const canvas = measureCanvasRef?.value;
    if (!canvas || disposed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (AppState.viewer.measureMode === 'none' && !(AppState.viewer.measurements || []).length) return;
    const toPoint = (point) => ({ x: point.x * w, y: point.y * h });
    const stroke = '#38BDF8';

    function dot(point) {
      const p = toPoint(point);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = stroke; ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    function text(value, point, offsetX = 8, offsetY = -8) {
      const p = toPoint(point);
      ctx.font = '600 12px sans-serif';
      const width = ctx.measureText(value).width + 10;
      ctx.fillStyle = 'rgba(11, 18, 32, 0.82)';
      ctx.fillRect(p.x + offsetX - 4, p.y + offsetY - 12, width, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(value, p.x + offsetX + 1, p.y + offsetY);
    }

    for (const item of AppState.viewer.measurements || []) {
      const points = item.points.map(toPoint);
      ctx.strokeStyle = stroke; ctx.lineWidth = 2;
      if (item.type === 'roi') {
        const x = Math.min(points[0].x, points[1].x);
        const y = Math.min(points[0].y, points[1].y);
        const rw = Math.abs(points[1].x - points[0].x);
        const rh = Math.abs(points[1].y - points[0].y);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(x, y, rw, rh);
        ctx.strokeRect(x, y, rw, rh);
        text(item.label, { x: (x + rw) / w, y: y / h }, 4, -8);
      } else {
        ctx.beginPath();
        points.forEach((point, index) => { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
        ctx.stroke();
        points.forEach((point) => { ctx.beginPath(); ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill(); });
        text(item.label, item.points[item.points.length - 1], 8, -8);
      }
    }

    const pendingPoints = AppState.viewer.measurePoints || [];
    if (pendingPoints.length) {
      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      pendingPoints.map(toPoint).forEach((point, index) => { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
      ctx.stroke(); ctx.setLineDash([]);
      pendingPoints.forEach(dot);
      if (AppState.viewer.measureMode === 'roi' && pendingPoints.length === 1) text('再点一次确定矩形', pendingPoints[0], 8, 20);
      if (AppState.viewer.measureMode === 'length' && pendingPoints.length === 1) text('再点一次测量长度', pendingPoints[0], 8, 20);
      if (AppState.viewer.measureMode === 'angle' && pendingPoints.length === 1) text('再点顶点与第二条边', pendingPoints[0], 8, 20);
    }
    ctx.setLineDash([]);
  }

  function setMeasureMode(mode) {
    const next = ['none', 'length', 'angle', 'roi'].includes(mode) ? mode : 'none';
    AppState.viewer.measureMode = next;
    AppState.viewer.measurePoints = [];
    drawMeasurements();
  }

  function clearMeasurements() {
    AppState.viewer.measurements = [];
    AppState.viewer.measurePoints = [];
    AppState.viewer.measureMode = 'none';
    drawMeasurements();
  }

  function measurementValue(mode, points) {
    const canvas = measureCanvasRef?.value;
    return measurementLabel(mode, points, {
      width: canvas?.width || 420,
      height: canvas?.height || 420,
      pixelSpacing: AppState.viewer.pixelSpacing,
      naturalWidth: Number(AppState.currentCase?.naturalWidth || 0),
    });
  }

  function handleMeasurePointer(event) {
    if (AppState.viewer.measureMode === 'none' || disposed) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = measureCanvasRef?.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
    const mode = AppState.viewer.measureMode;
    const points = [...(AppState.viewer.measurePoints || []), point];
    const needed = mode === 'angle' ? 3 : 2;
    if (points.length < needed) {
      AppState.viewer.measurePoints = points;
      drawMeasurements();
      return;
    }
    const label = measurementValue(mode, points);
    AppState.viewer.measurements = [...(AppState.viewer.measurements || []), { type: mode, points, label }];
    AppState.viewer.measurePoints = [];
    drawMeasurements();
    actions.showToast(MEASURE_LABEL[mode] + '：' + label, 'success');
  }

  function resetViewerState() {
    Object.assign(AppState.viewer, { scale: VIEWER_ZOOM.DEFAULT, rotation: 0, tx: 0, ty: 0, invertFilter: false, isDragging: false, brightness: VIEWER_DEFAULTS.brightness, contrast: VIEWER_DEFAULTS.contrast });
  }
  function zoom(delta, event) {
    const viewer = AppState.viewer;
    const previous = viewer.scale;
    const next = Math.min(VIEWER_ZOOM.MAX, Math.max(VIEWER_ZOOM.MIN, Number((previous + delta).toFixed(2))));
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      viewer.tx = x - (x - viewer.tx) * next / previous;
      viewer.ty = y - (y - viewer.ty) * next / previous;
    }
    viewer.scale = next;
  }
  function wheel(event) { zoom(event.deltaY < 0 ? VIEWER_ZOOM.STEP : -VIEWER_ZOOM.STEP, event); }
  function startDrag(event) {
    if (event.button !== 0 || AppState.viewer.measureMode !== 'none') return;
    Object.assign(AppState.viewer, { isDragging: true, dragStartX: event.clientX - AppState.viewer.tx, dragStartY: event.clientY - AppState.viewer.ty });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function drag(event) {
    if (!AppState.viewer.isDragging) return;
    AppState.viewer.tx = event.clientX - AppState.viewer.dragStartX;
    AppState.viewer.ty = event.clientY - AppState.viewer.dragStartY;
  }
  function endDrag() { AppState.viewer.isDragging = false; }
  function rotate() { AppState.viewer.rotation = (AppState.viewer.rotation + 90) % 360; }
  function oneToOne() { Object.assign(AppState.viewer, { scale: 1, tx: 0, ty: 0 }); }
  function toggleInvert() { AppState.viewer.invertFilter = !AppState.viewer.invertFilter; }
  function toggleCompare() { AppState.viewer.compareMode = !AppState.viewer.compareMode; }
  function reset() { resetViewerState(); actions.showToast('查看器状态已重置', 'info'); }
  function dispose() {
    disposed = true; endDrag();
    if (pendingImage) { pendingImage.onload = null; pendingImage.onerror = null; }
    pendingImage = null; cachedHeatmap = null;
  }
  return {
    transformStyle, imageFilter, drawGradCamHeatmap, drawMeasurements,
    resetViewerState, zoom, wheel, startDrag, drag, endDrag, rotate, oneToOne,
    toggleInvert, toggleCompare, reset, setMeasureMode, clearMeasurements,
    handleMeasurePointer, dispose,
  };
}
