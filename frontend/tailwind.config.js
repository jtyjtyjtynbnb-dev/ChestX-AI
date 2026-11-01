import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * 从 tokens.css 里抽出 :root 的十六进制令牌，生成 Tailwind 色板。
 * 这样色值只有一个来源：改 tokens.css 就改全站，不需要两处同步。
 */
function readTokens() {
  const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
  const tokens = {};
  for (const [, name, value] of css.matchAll(/^\s*--([\w-]+):\s*(#[0-9A-Fa-f]{3,8})\s*;/gm)) {
    tokens[name] = value;
  }
  return tokens;
}

const t = readTokens();

/** 石墨 ＋ 青蓝 ＋ 风险三档，统一成 Tailwind 的 50→950 结构 */
const colors = {
  ink: {
    50: t['ink-50'], 100: t['ink-100'], 200: t['ink-200'], 300: t['ink-300'],
    400: t['ink-400'], 500: t['ink-500'], 600: t['ink-600'], 700: t['ink-700'],
    800: t['ink-800'], 900: t['ink-900'], 950: t['ink-950']
  },
  brand: {
    50: t['brand-50'], 100: t['brand-100'], 200: t['brand-200'], 300: t['brand-300'],
    400: t['brand-400'], 500: t['brand-500'], 600: t['brand-600'], 700: t['brand-700'],
    800: t['brand-800'], 900: t['brand-900'], 950: t['brand-950']
  },
  film: {
    DEFAULT: t['film-bg'], 850: t['film-850'], panel: t['film-panel'],
    raise: t['film-raise'], line: t['film-line'], text: t['film-text'], dim: t['film-dim']
  },
  cat: Object.fromEntries(
    Object.entries(t)
      .filter(([name]) => name.startsWith('cat-'))
      .map(([name, value]) => [name.slice(4).replace(/_/g, '-'), value])
  )
};

/**
 * 语义色继续沿用既有 class 名（bg-danger / text-success / bg-page-bg…），
 * 但内部全部指向令牌，保证跨页一致；同时提供 -soft / -line 变体。
 */
const semantic = {
  primary:      { DEFAULT: t['brand-700'], dark: t['brand-800'], light: t['brand-500'], soft: t['brand-50'], line: t['brand-200'] },
  success:      { DEFAULT: t['risk-low'],   soft: t['risk-low-soft'],   line: t['risk-low-line'],  strong: t['risk-low-strong'] },
  warning:      { DEFAULT: t['risk-mid'],   soft: t['risk-mid-soft'],   line: t['risk-mid-line'],  strong: t['risk-mid-strong'] },
  danger:       { DEFAULT: t['risk-high'],  soft: t['risk-high-soft'],  line: t['risk-high-line'], strong: t['risk-high-strong'] },
  info:         { DEFAULT: t['color-info'], soft: '#E8F6FA',            line: '#C2E4EF' },
  /* 表面：组件里优先用 surface-* 而不是 page-bg/card-bg，
     这样切到深色阅片面时会自动换肤 */
  surface: {
    DEFAULT: t['surface-card'],
    page: t['surface-page'],
    card: t['surface-card'],
    sunken: t['surface-sunken'],
    hover: t['surface-hover']
  },
  'page-bg':    t['surface-page'],
  'card-bg':    t['surface-card'],
  'text-1':     t['color-text-1'],
  'text-2':     t['color-text-2'],
  'text-3':     t['color-text-3'],
  'border-line': t['color-border-line']
};

export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    screens: { xs: '375px', sm: '576px', md: '768px', lg: '992px', xl: '1200px', '2xl': '1440px' },
    extend: {
      colors: { ...colors, ...semantic },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        /* 数值/概率/日期统一等宽，避免跳动 */
        mono: ['ui-monospace', 'SFMono-Regular', 'JetBrains Mono', 'Consolas', 'monospace']
      },
      /* 字号刻度第四轮放大，正文 24px */
      fontSize: {
        '3xs': ['12px', { lineHeight: '1.45' }],
        '2xs': ['13px', { lineHeight: '1.5' }],
        xs:   ['14px', { lineHeight: '1.55' }],
        sm:   ['16px', { lineHeight: '1.6' }],
        base: ['16px', { lineHeight: '1.65' }],
        md:   ['16px', { lineHeight: '1.65' }],
        lg:   ['18px', { lineHeight: '1.55' }],
        xl:   ['22px', { lineHeight: '1.45' }],
        '2xl': ['26px', { lineHeight: '1.35' }],
        '3xl': ['34px', { lineHeight: '1.25' }]
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '22px'
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        film: 'var(--shadow-film)'
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      maxWidth: { prose: '68ch' }
    }
  },
  plugins: []
};
