/**
 * 悬浮 AI 问答窗与主看片台/家庭成员档案的双向联动总线
 */
export function focusMainWorkbenchHeatmap() {
  const toggle = document.getElementById('heatmapToggle');
  if (toggle && !toggle.checked) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
  }
  const slider = document.getElementById('heatmapOpacitySlider');
  if (slider) {
    slider.value = '75';
    slider.dispatchEvent(new Event('input'));
  }
  document.getElementById('heatmapCanvas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
