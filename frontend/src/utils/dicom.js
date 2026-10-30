/**
 * Minimal, dependency-free DICOM reader for the demo viewer.
 *
 * Supported: uncompressed Explicit/Implicit VR Little Endian, 8/16-bit
 * monochrome pixel data. Compressed transfer syntaxes (JPEG, RLE, JPEG-LS,
 * JPEG 2000) are rejected with a readable message instead of rendering
 * corrupted pixels.
 */

const DICM = [0x44, 0x49, 0x43, 0x4d]; // "DICM"

export function isDicomFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.dcm') || file?.type === 'application/dicom';
}

function ascii(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function readString(view, offset, length) {
  let text = '';
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(view.getUint8(offset + i));
  return text.replace(/\0+$/g, '').replace(/ +$/g, '').trim();
}

const LONG_VRS = new Set(['OB', 'OW', 'OF', 'SQ', 'UT', 'UN']);

function readElement(view, offset, little, explicit) {
  const group = view.getUint16(offset, little);
  const element = view.getUint16(offset + 2, little);
  let cursor = offset + 4;
  let vr = '';
  let length = 0;
  if (explicit) {
    vr = String.fromCharCode(view.getUint8(cursor), view.getUint8(cursor + 1));
    cursor += 2;
    if (LONG_VRS.has(vr)) {
      length = view.getUint32(cursor + 2, little);
      cursor += 6;
    } else {
      length = view.getUint16(cursor, little);
      cursor += 2;
    }
  } else {
    length = view.getUint32(cursor, little);
    cursor += 4;
  }
  return { group, element, vr, length, valueOffset: cursor, next: cursor + length };
}

function tagOf(group, element) {
  return (group << 16) | element;
}

function toNumber(text, fallback = 0) {
  const value = Number.parseFloat(String(text || '').split('\\')[0]);
  return Number.isFinite(value) ? value : fallback;
}

function toNumbers(text) {
  return String(text || '')
    .split('\\')
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));
}

export function decodeDicom(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 140) throw new Error('DICOM 文件过短或已损坏');
  const magicOffset = 128;
  if (!DICM.every((byte, index) => view.getUint8(magicOffset + index) === byte)) {
    throw new Error('不是有效的 DICOM 文件（缺少 DICM 标识）');
  }

  let offset = 132;
  let transferSyntax = '';
  // File meta information is always Explicit VR Little Endian.
  while (offset + 8 <= view.byteLength) {
    const group = view.getUint16(offset, true);
    if (group !== 0x0002) break;
    const item = readElement(view, offset, true, true);
    if (item.length === 0xffffffff) throw new Error('DICOM 元信息长度异常');
    if (tagOf(item.group, item.element) === tagOf(0x0002, 0x0010) && item.length < 128) {
      transferSyntax = readString(view, item.valueOffset, item.length);
    }
    offset = item.next;
  }

  let little = true;
  let explicit = true;
  if (transferSyntax === '1.2.840.10008.1.2') explicit = false;
  else if (transferSyntax === '1.2.840.10008.1.2.1') explicit = true;
  else if (transferSyntax === '1.2.840.10008.1.2.2') {
    little = false;
    explicit = true;
  } else if (transferSyntax.startsWith('1.2.840.10008.1.2.4.') || transferSyntax === '1.2.840.10008.1.2.5') {
    throw new Error('检测到压缩 DICOM（Transfer Syntax ' + transferSyntax + '）。本演示仅支持未压缩 8/16 位 DICOM，请在 PACS/导出工具中另存为未压缩 DICOM，或转换为 JPG/PNG 后上传。');
  } else if (transferSyntax) {
    throw new Error('暂不支持该 DICOM 传输语法（' + transferSyntax + '），请先导出为未压缩 DICOM 或 JPG/PNG');
  }

  const tags = new Map();
  let pixelOffset = -1;
  let pixelLength = 0;
  while (offset + 8 <= view.byteLength) {
    const item = readElement(view, offset, little, explicit);
    if (item.length === 0xffffffff) throw new Error('暂不支持含未定义长度序列的 DICOM');
    if (item.next > view.byteLength) break;
    const tag = tagOf(item.group, item.element);
    if (tag === tagOf(0x7fe0, 0x0010)) {
      pixelOffset = item.valueOffset;
      pixelLength = item.length;
      break;
    }
    if (item.length <= 1024) tags.set(tag, item);
    offset = item.next;
  }

  if (pixelOffset < 0) throw new Error('DICOM 中未找到像素数据');
  const readUS = (group, element) => {
    const item = tags.get(tagOf(group, element));
    return item ? view.getUint16(item.valueOffset, little) : 0;
  };
  const rows = readUS(0x0028, 0x0010);
  const cols = readUS(0x0028, 0x0011);
  const bitsAllocated = readUS(0x0028, 0x0100);
  const pixelRepresentation = readUS(0x0028, 0x0103);
  if (!rows || !cols) throw new Error('DICOM 缺少行列信息');
  if (rows * cols > 4096 * 4096) throw new Error('DICOM 尺寸过大，已拒绝渲染');
  if (bitsAllocated !== 8 && bitsAllocated !== 16) throw new Error('暂仅支持 8/16 位灰度 DICOM');

  const readTextTag = (group, element) => {
    const item = tags.get(tagOf(group, element));
    return item ? readString(view, item.valueOffset, item.length) : '';
  };
  const slope = toNumber(readTextTag(0x0028, 0x1053), 1) || 1;
  const intercept = toNumber(readTextTag(0x0028, 0x1052), 0);
  const spacing = toNumbers(readTextTag(0x0028, 0x0030));
  let center = toNumber(readTextTag(0x0028, 0x1050), NaN);
  let width = toNumber(readTextTag(0x0028, 0x1051), NaN);

  const pixels = new Float32Array(rows * cols);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pixels.length; i += 1) {
    let raw;
    if (bitsAllocated === 8) raw = view.getUint8(pixelOffset + i);
    else if (pixelRepresentation === 1) raw = view.getInt16(pixelOffset + i * 2, little);
    else raw = view.getUint16(pixelOffset + i * 2, little);
    const value = raw * slope + intercept;
    pixels[i] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    min = 0;
    max = 1;
  }
  if (!Number.isFinite(center) || !Number.isFinite(width) || width <= 0) {
    center = (min + max) / 2;
    width = max - min;
  }

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器无法创建画布');
  const imageData = ctx.createImageData(cols, rows);
  const low = center - width / 2;
  const scale = 255 / width;
  for (let i = 0; i < pixels.length; i += 1) {
    const gray = Math.max(0, Math.min(255, Math.round((pixels[i] - low) * scale)));
    imageData.data[i * 4] = gray;
    imageData.data[i * 4 + 1] = gray;
    imageData.data[i * 4 + 2] = gray;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  return {
    width: cols,
    height: rows,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    pixelSpacing: spacing.length >= 2 ? spacing : null,
    windowCenter: center,
    windowWidth: width,
    bitsAllocated,
  };
}
