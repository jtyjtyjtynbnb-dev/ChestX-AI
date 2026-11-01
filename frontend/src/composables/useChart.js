import { onMounted, onBeforeUnmount, watch } from 'vue';

/**
 * 图表挂载。
 *
 * ECharts 体量较大（按需后仍有约 400KB），而它只在看板弹窗、关于页与
 * 对比面板里出现。这里改为首次真正挂载图表时才异步加载，把它拆成独立
 * chunk，首屏不必承担这部分体积。
 */
export function useChart(element, options) {
  let instance;
  let observer;
  let stop;
  let disposed = false;

  async function render() {
    if (!element.value || disposed) return;
    if (!instance) {
      const { echarts } = await import('../utils/echarts.js');
      // 异步等待期间组件可能已卸载
      if (disposed || !element.value) return;
      instance = echarts.init(element.value, 'chestx');
    }
    instance.setOption(options(), true);
    instance.resize();
  }

  onMounted(() => {
    render();
    observer = new ResizeObserver(() => instance?.resize());
    if (element.value) observer.observe(element.value);
    stop = watch(options, render, { deep: true, flush: 'post' });
  });

  function dispose() {
    disposed = true;
    stop?.();
    observer?.disconnect();
    instance?.dispose();
    instance = null;
  }

  onBeforeUnmount(dispose);
  return { dispose };
}
