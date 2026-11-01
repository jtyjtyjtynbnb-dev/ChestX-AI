// One-off WCAG contrast checker for the new token palette.
function channel(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  return channel(hex)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((r, g, i) => r + [0.2126, 0.7152, 0.0722][i] * g, 0);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const white = '#FFFFFF';
const checks = [
  ['brand-600/white', '#087A92', white],
  ['brand-700/white', '#0B6278', white],
  ['brand-500/white', '#0BA2BC', white],
  ['risk-high/white', '#D12F2C', white],
  ['risk-high-strong/soft', '#A91E1C', '#FEF2F2'],
  ['risk-mid/soft', '#B25C09', '#FFFAEB'],
  ['risk-low/soft', '#0F6E4D', '#E9F8F1'],
  ['film-text/film-bg', '#E8EFF8', '#080D16'],
  ['film-dim/film-bg', '#98A6BC', '#080D16'],
];
for (const [name, a, b] of checks) {
  console.log(name.padEnd(22), contrast(a, b).toFixed(2));
}
