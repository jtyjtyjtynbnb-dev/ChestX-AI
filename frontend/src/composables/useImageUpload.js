import { reactive, ref } from 'vue';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, CLINICAL_SAMPLE_CASES } from '../stores/referenceData.js';
import { formatNowTime } from '../utils/format.js';
import { decodeDicom, isDicomFile } from '../utils/dicom.js';

const DICOM_MAX_SIZE = 40 * 1024 * 1024;
const MAX_SERIES = 20;

function cloneDemoCase() {
  const base = JSON.parse(JSON.stringify(CLINICAL_SAMPLE_CASES['case-high']));
  base.agentResult = null;
  return base;
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = String(dataUrl).split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function useImageUpload({ AppState, actions }, { onBeforeLoad = () => {}, onLoaded = () => {} } = {}) {
  const state = reactive({ visible: false, dragging: false, percent: 0, busy: false });
  const fileInput = ref(null);
  const readers = new Set();
  const images = new Set();
  let active = true;
  let generation = 0;

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      readers.add(reader);
      const release = () => readers.delete(reader);
      reader.onload = () => { release(); resolve(reader.result); };
      reader.onerror = () => { release(); reject(new Error('图片读取失败')); };
      reader.onabort = () => { release(); reject(new DOMException('读取已取消', 'AbortError')); };
      reader.readAsDataURL(file);
    });
  }

  function compressSource(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const pending = { image, reject };
      images.add(pending);
      image.onerror = () => { images.delete(pending); reject(new Error('图片解析失败')); };
      image.onload = () => {
        images.delete(pending);
        try {
          const maxSide = 1600;
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(width, height)
            : Object.assign(document.createElement('canvas'), { width, height });
          canvas.getContext('2d').drawImage(image, 0, 0, width, height);
          const finish = (blob) => resolve({ blob, width: image.naturalWidth, height: image.naturalHeight });
          if (canvas.convertToBlob) canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 }).then(finish, reject);
          else canvas.toBlob((blob) => blob ? finish(blob) : reject(new Error('图片压缩失败')), 'image/jpeg', 0.85);
        } catch (error) { reject(error); }
      };
      image.src = source;
    });
  }

  async function compressImageForUpload(file) {
    const source = await readFile(file);
    if (!active) throw new DOMException('读取已取消', 'AbortError');
    return compressSource(source);
  }

  function validateFile(file) {
    if (!file) return '未选择文件';
    if (isDicomFile(file)) {
      if (file.size > DICOM_MAX_SIZE) return 'DICOM 文件不能超过 40MB';
      return '';
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !/\.(jpg|jpeg|png)$/i.test(file.name)) return '格式错误：仅支持 JPG / PNG / DICOM';
    if (file.size > MAX_IMAGE_SIZE) return '文件超限：单张胸片大小不能超过 10MB，请压缩后重试';
    return '';
  }

  async function buildImageCase(file) {
    const source = await readFile(file);
    if (!active) throw new DOMException('读取已取消', 'AbortError');
    const compressed = await compressSource(source);
    const caseData = cloneDemoCase();
    return {
      ...caseData,
      id: 'LOCAL-' + Date.now(),
      isDemo: false,
      fileName: file.name,
      caseBadge: '本地上传胸片',
      fileSize: file.size,
      uploadedAt: formatNowTime(),
      imageUrl: source,
      dimensions: compressed.width + ' × ' + compressed.height + ' px',
      naturalWidth: compressed.width,
      naturalHeight: compressed.height,
      sourceFile: new File([compressed.blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' }),
      isDicom: false,
      pixelSpacing: null,
      agentResult: null,
    };
  }

  async function buildDicomCase(file) {
    const buffer = await file.arrayBuffer();
    if (!active) throw new DOMException('读取已取消', 'AbortError');
    const decoded = decodeDicom(buffer);
    const caseData = cloneDemoCase();
    const baseName = file.name.replace(/\.dcm$/i, '');
    return {
      ...caseData,
      id: 'DICOM-' + Date.now(),
      isDemo: false,
      fileName: file.name,
      caseBadge: '本地 DICOM（未压缩）',
      fileSize: file.size,
      uploadedAt: formatNowTime(),
      imageUrl: decoded.dataUrl,
      dimensions: decoded.width + ' × ' + decoded.height + ' px',
      naturalWidth: decoded.width,
      naturalHeight: decoded.height,
      sourceFile: new File([dataUrlToBlob(decoded.dataUrl)], baseName + '.jpg', { type: 'image/jpeg' }),
      isDicom: true,
      pixelSpacing: decoded.pixelSpacing,
      windowCenter: decoded.windowCenter,
      windowWidth: decoded.windowWidth,
      agentResult: null,
    };
  }

  function applyCase(caseData) {
    AppState.currentCase = caseData;
    AppState.agentResult = null;
    AppState.diagnoseStatus = 'idle';
    AppState.viewer.pixelSpacing = caseData.pixelSpacing || null;
    AppState.viewer.measureMode = 'none';
    AppState.viewer.measurePoints = [];
    AppState.viewer.measurements = [];
    AppState.viewer.brightness = 100;
    AppState.viewer.contrast = 100;
  }

  async function handleLocalXrayFiles(files, options = {}) {
    const list = [...(files || [])].slice(0, MAX_SERIES);
    if (!list.length) return false;
    for (const file of list) {
      const error = validateFile(file);
      if (error) { actions.showToast(error, 'error'); return false; }
    }
    const requestId = ++generation;
    onBeforeLoad();
    Object.assign(state, { visible: true, busy: true, percent: 5 });
    try {
      const cases = [];
      for (let index = 0; index < list.length; index += 1) {
        const file = list[index];
        state.percent = Math.round(((index + 0.3) / list.length) * 90);
        const caseData = isDicomFile(file) ? await buildDicomCase(file) : await buildImageCase(file);
        if (!active || requestId !== generation) return false;
        cases.push(caseData);
      }
      AppState.series = cases;
      AppState.seriesIndex = 0;
      applyCase(cases[0]);
      state.percent = 100;
      state.visible = false;
      onLoaded();
      actions.showToast(cases.length > 1 ? `已载入 ${cases.length} 张影像，可用上一张/下一张切换` : (options.silent ? '教学胸片已载入' : '胸片上传成功，请点击右侧「开始 AI 智能分析」'), 'success');
      return true;
    } catch (error) {
      if (active && requestId === generation && error.name !== 'AbortError') actions.showToast(error.message || '影像读取失败', 'error');
      return false;
    } finally {
      if (active && requestId === generation) state.busy = false;
    }
  }

  function handleLocalXrayFile(file) {
    return handleLocalXrayFiles([file], { silent: true });
  }

  function selectSeries(index) {
    const list = AppState.series || [];
    const next = Number(index);
    if (!Number.isInteger(next) || next < 0 || next >= list.length) return;
    AppState.seriesIndex = next;
    applyCase(list[next]);
    onLoaded();
    actions.showToast(`已切换到第 ${next + 1} / ${list.length} 张影像`, 'info');
  }

  function stepSeries(delta) {
    selectSeries((AppState.seriesIndex || 0) + delta);
  }

  function chooseFile() { fileInput.value?.click(); }
  function fileChanged(event) {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    return handleLocalXrayFiles(files);
  }
  function drop(event) {
    state.dragging = false;
    return handleLocalXrayFiles([...(event.dataTransfer?.files || [])]);
  }
  function showUploader() { state.visible = true; }
  function hideUploader() { state.visible = false; }
  function testInvalidFile() { actions.showToast('已拦截异常文件：仅支持 JPG / PNG / 未压缩 DICOM，且大小符合限制', 'error'); }
  function cancelPending() {
    generation++;
    readers.forEach((reader) => reader.abort()); readers.clear();
    images.forEach(({ image, reject }) => { image.onload = null; image.onerror = null; image.src = ''; reject(new DOMException('读取已取消', 'AbortError')); }); images.clear();
    state.busy = false;
  }
  function dispose() { active = false; cancelPending(); }

  return {
    state, fileInput, compressImageForUpload, handleLocalXrayFile, handleLocalXrayFiles,
    selectSeries, stepSeries, chooseFile, fileChanged, drop, showUploader, hideUploader,
    testInvalidFile, cancelPending, dispose,
  };
}
