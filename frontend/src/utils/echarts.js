/**
 * ECharts 按需注册入口。
 *
 * 全量 import * as echarts 会把地图、3D、GL 等全部打包（约 1MB 源）。
 * 本项目只用到柱状、折线、饼图与 tooltip/legend/grid，按需注册后
 * 产物显著减小，同时保留统一的图表配色与字体。
 */

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer
]);

/**
 * 运行环境中 ECharts 入场动画会导致柱/折线停在 0 高度（动画未正确收敛）。
 * 注册统一主题关闭动画，所有实例 init 时使用，保证图形以最终态直接绘制。
 */
echarts.registerTheme('chestx', { animation: false });

/** 图表通用样式：与应用令牌保持一致（此处取运行时计算值，供 canvas 渲染使用） */
export const CHART_THEME = {
  text: '#4C5B65',
  textStrong: '#151B1F',
  textMuted: '#6A7A85',
  splitLine: '#DDE4E8',
  brand: '#12A594',
  riskHigh: '#B42318',
  riskMid: '#B54708',
  riskLow: '#17803D',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
};

export { echarts };
export default echarts;
