/**
 * 离线环境 ECharts 与 Vue 运行时优雅降级守卫
 */
window.addEventListener('DOMContentLoaded', () => {
  if (typeof window.echarts === 'undefined') {
    window.echarts = {
      init: (dom) => ({
        setOption: (opt) => {
          if (dom) {
            dom.innerHTML = '<div style="padding:16px;font-size:12px;color:#4E5969;">[离线模式图表已就绪] 概率分布已在右侧列表中完整展示</div>';
          }
        },
        resize: () => {},
        dispose: () => {}
      })
    };
  }
});
