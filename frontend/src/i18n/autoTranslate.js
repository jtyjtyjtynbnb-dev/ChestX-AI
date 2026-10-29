import { i18n } from './index.js';

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const DYNAMIC_PATTERNS = [
  [/^缩放: (\d+)%$/, (match) => `Zoom: ${match[1]}%`],
  [/^已连接 · (.+)$/, (match) => `Connected · ${match[1]}`],
  [/^解读结果已保存至(.+)的健康档案$/, (match) => `Saved to ${match[1]}'s health records`],
  [/^较新 · (.+)$/, (match) => `Newer · ${match[1]}`],
  [/^较早 · (.+)$/, (match) => `Earlier · ${match[1]}`],
  [/^诊断时间：(.+)$/, (match) => `Study date: ${match[1]}`],
  [/^查看第 (\d+) 张影像$/, (match) => `View image ${match[1]}`],
  [/^观察点 (\d+)：(.+)$/, (match) => `Hotspot ${match[1]}: ${match[2]}`],
  [/^(.+)观察点 (\d+)：(.+)$/, (match) => `${match[1]} hotspot ${match[2]}: ${match[3]}`],
  [/^(.+)观察点$/, (match) => `${match[1]} hotspots`],
  [/^热力图：(.+)$/, (match) => `Heatmap: ${match[1]}`],
  [/^胸片：(.+)$/, (match) => `Chest X-ray: ${match[1]}`],
];
const textOriginals = new Map();
const attributeOriginals = new Map();
let applying = false;
let scheduled = null;
let installed = false;

function canTranslate(key) {
  return Boolean(key) && /[\u4e00-\u9fff]/.test(key) && i18n.global.te(key, 'en');
}

function translateTextNode(node) {
  const raw = node.nodeValue || '';
  const key = raw.trim();
  if (!key || !/[\u4e00-\u9fff]/.test(key)) return;
  let translated = canTranslate(key) ? i18n.global.t(key) : '';
  if (!translated || translated === key) {
    for (const [pattern, render] of DYNAMIC_PATTERNS) {
      const match = key.match(pattern);
      if (match) { translated = render(match); break; }
    }
  }
  if (!translated || translated === key) return;
  textOriginals.set(node, raw);
  node.nodeValue = raw.replace(key, translated);
}

function translateAttributes(element) {
  for (const attribute of TRANSLATABLE_ATTRS) {
    const value = element.getAttribute?.(attribute);
    if (!value) continue;
    const key = value.trim();
    if (!canTranslate(key)) continue;
    const translated = i18n.global.t(key);
    if (!translated || translated === key) continue;
    let originals = attributeOriginals.get(element);
    if (!originals) { originals = {}; attributeOriginals.set(element, originals); }
    if (!(attribute in originals)) originals[attribute] = value;
    element.setAttribute(attribute, value.replace(key, translated));
  }
}

function translateTree(root) {
  if (!root || root.nodeType !== 1) return;
  translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === 3) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === 3) translateTextNode(node);
    else translateAttributes(node);
    node = walker.nextNode();
  }
}

function restore() {
  for (const [node, original] of textOriginals) {
    if (node?.nodeValue !== undefined) node.nodeValue = original;
  }
  textOriginals.clear();
  for (const [element, originals] of attributeOriginals) {
    for (const [attribute, value] of Object.entries(originals)) {
      if (element?.setAttribute) element.setAttribute(attribute, value);
    }
  }
  attributeOriginals.clear();
}

function run() {
  scheduled = null;
  const root = document.getElementById('app');
  if (!root) return;
  applying = true;
  try {
    if (i18n.global.locale.value === 'en') {
      translateTree(root);
      // Vue may replace text nodes during the same tick; run once more next frame.
    } else {
      restore();
    }
  } finally {
    applying = false;
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = requestAnimationFrame(run);
}

export function installAutoTranslate() {
  if (installed) return;
  installed = true;
  const root = document.getElementById('app');
  if (!root) return;
  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    if (i18n.global.locale.value !== 'en') return;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) translateTree(node);
        }
      }
    }
    schedule();
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRS,
  });
  window.addEventListener('dsh-locale-change', schedule);
  schedule();
}
