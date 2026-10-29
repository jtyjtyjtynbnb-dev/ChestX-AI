import { onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';
export function useChart(element, options) {
  let instance, observer, stop;
  function render() {
    if (!element.value) return;
    if (!instance) instance = echarts.init(element.value);
    instance.setOption(options(), true);
    instance.resize();
  }
  onMounted(() => {
    render();
    observer = new ResizeObserver(() => instance?.resize());
    observer.observe(element.value);
    stop = watch(options, render, {deep: true, flush: 'post'});
  });
  function dispose() { stop?.(); observer?.disconnect(); instance?.dispose(); instance = null; }
  onBeforeUnmount(dispose);
  return { dispose };
}
