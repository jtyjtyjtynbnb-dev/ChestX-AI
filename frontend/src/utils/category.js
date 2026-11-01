/**
 * 疾病分类色的唯一取色入口。
 *
 * 色值本体在 src/styles/tokens.css 的 --cat-* 里；
 * 这里只负责把疾病 code 映射到对应的 CSS 变量，图表与标签共用同一套颜色，
 * 避免"列表里的红和饼图里的红不是同一个红"。
 */

/** 模型输出的 10 类（与 backend/config.py 的 DISEASE_LIST 一致） */
export const MODEL_DISEASES = [
  'no_finding',
  'atelectasis',
  'cardiomegaly',
  'effusion',
  'infiltration',
  'mass',
  'nodule',
  'pneumonia',
  'pneumothorax',
  'consolidation'
];

/** 科普扩展的 4 类，不进模型输出 */
export const EXTENSION_DISEASES = ['edema', 'emphysema', 'fibrosis', 'thickening'];

/** code → CSS 变量名；未知 code 回退到中性灰 */
export function categoryVar(code) {
  const key = String(code || '').replace(/[^a-z_]/gi, '');
  return `--cat-${key || 'no_finding'}`;
}

/** code → 可直接放进 style 的 var() 表达式 */
export function categoryColor(code) {
  return `var(${categoryVar(code)})`;
}

/** 该 code 是否属于扩展科普（不是模型算出来的） */
export function isExtensionDisease(code) {
  return EXTENSION_DISEASES.includes(code);
}

/**
 * 生成等宽排布的 n 段分类色，用于图例、堆叠条与多序列折线。
 * @param {string[]} codes
 * @returns {{code: string, color: string}[]}
 */
export function categoryPalette(codes = MODEL_DISEASES) {
  return codes.map((code) => ({ code, color: categoryColor(code) }));
}
