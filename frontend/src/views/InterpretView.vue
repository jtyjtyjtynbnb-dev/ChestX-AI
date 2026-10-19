<script setup>
import { useImageViewer } from '../composables/useImageViewer.js';
import { useDiagnoseFlow } from '../composables/useDiagnoseFlow.js';
import { useDiagnoseStore } from '../stores/useDiagnoseStore.js';

const viewer = useImageViewer();
const diagnoseFlow = useDiagnoseFlow();
const diagnoseStore = useDiagnoseStore();
</script>

<template>
<section id="page-interpret" class="page-view space-y-5">
      <!-- 顶部临床示例快速切换条 + 本地上传入口 -->
      <div class="med-card flex flex-col md:flex-row md:items-center justify-between gap-4 py-3.5 px-5">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs">AI</span>
          <div>
            <h1 class="text-base font-semibold text-text-1">胸部X光智能解读工作台</h1>
            <p class="text-xs text-text-3">可上传本地 JPG/PNG 胸片（≤10MB），或点击右侧典型临床样本快速演示</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-text-3 mr-1">临床典型胸片样本：</span>
          <button type="button" data-sample="case-high" class="sample-case-btn btn-secondary btn-sm !border-danger/40 !text-danger hover:!bg-danger/5">
            样本1：右下肺斑片影 (高风险)
          </button>
          <button type="button" data-sample="case-medium" class="sample-case-btn btn-secondary btn-sm !border-warning/40 !text-warning hover:!bg-warning/5">
            样本2：右肺微小结节 (中风险)
          </button>
          <button type="button" data-sample="case-low" class="sample-case-btn btn-secondary btn-sm !border-success/40 !text-success hover:!bg-success/5">
            样本3：标准正常胸片 (低风险)
          </button>
        </div>
      </div>

      <div class="med-card grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label for="agentQuestionInput" class="mb-1 block text-xs font-medium text-text-2">补充问题（可选）</label>
          <input id="agentQuestionInput" type="text" maxlength="500" placeholder="例如：模型提示的肺部征象一般需要结合哪些信息理解？" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none" />
        </div>
        <span class="text-xs text-text-3">影像推理、知识检索与报告生成由后端 Agent 工作流执行</span>
      </div>

      <!-- 主工作区：左 60% (lg:col-span-7) 影像区，右 40% (lg:col-span-5) 结果区 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

        <!-- 左侧 60% 影像区 -->
        <div class="med-card lg:col-span-7 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line pb-3">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-medium text-text-1">医学影像查看器</h2>
              <span id="viewerStatusBadge" class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">已载入样本</span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="switchToUploadBtn" class="btn-secondary btn-sm">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>上传本地胸片</span>
              </button>
            </div>
          </div>

          <!-- 子视图 A：上传区（拖拽+点击双模式，支持JPG/PNG ≤10MB，进度条） -->
          <div id="uploaderPanel" class="hidden">
            <div
              id="dropZone"
              role="button"
              tabindex="0"
              aria-label="选择胸部X光图片上传"
              aria-describedby="uploadHelpText"
              class="flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-line bg-page-bg/70 p-6 text-center transition-all duration-200 hover:border-primary hover:bg-primary/[0.02]"
            >
              <input id="xrayFileInput" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" class="hidden" aria-label="选择胸部X光图片" />
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 class="mt-4 text-lg font-medium text-text-1">点击选择或将胸部X光片拖拽至此处上传</h3>
              <p id="uploadHelpText" class="mt-1 text-xs text-text-3">支持后前位 (PA) / 前后位 (AP) 胸片，仅限 JPG / PNG 格式，单张大小 ≤ 10MB</p>

              <!-- 校验规则说明标签 -->
              <div class="mt-4 flex flex-wrap justify-center gap-2 text-xs text-text-2">
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 自动肺野方向校正</span>
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 本地隐私脱敏处理</span>
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 超限/格式错误即时拦截</span>
              </div>

              <!-- 上传进度条 -->
              <div id="uploadProgressBox" class="mt-5 hidden w-72 max-w-full">
                <div class="flex justify-between text-xs text-primary mb-1">
                  <span>正在读取并校验DICOM/光学灰阶矩阵...</span>
                  <span id="uploadProgressText" class="tabular-nums font-semibold">0%</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div id="uploadProgressBar" class="h-full bg-primary transition-all duration-150" style="width: 0%;"></div>
                </div>
              </div>

              <div class="mt-6 flex items-center gap-3">
                <button type="button" id="cancelUploadViewBtn" class="btn-secondary btn-sm">返回当前影像查看器</button>
                <button type="button" id="testInvalidFileBtn" class="btn-secondary btn-sm !text-text-3" title="测试格式/大小错误拦截提示">测试异常格式拦截</button>
              </div>
            </div>
          </div>

          <!-- 子视图 B：专业影像查看器（上传后） -->
          <div id="viewerPanel" class="space-y-3">
            <!-- 查看器操作工具栏：缩放、平移、旋转、1:1显示、重置、热力图开关、透明度滑块、原图/热力图对比 -->
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-line bg-page-bg px-3 py-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" id="zoomInBtn" class="btn-secondary btn-sm" title="放大影像 (+20%)">
                  <span>＋ 放大</span>
                </button>
                <button type="button" id="zoomOutBtn" class="btn-secondary btn-sm" title="缩小影像 (-20%)">
                  <span>－ 缩小</span>
                </button>
                <button type="button" id="rotateBtn" class="btn-secondary btn-sm" title="顺时针旋转90度">
                  <span>↻ 旋转</span>
                </button>
                <button type="button" id="oneToOneBtn" class="btn-secondary btn-sm" title="1:1 原始比例显示">
                  <span>1:1</span>
                </button>
                <button type="button" id="invertFilterBtn" class="btn-secondary btn-sm" title="切换胸片黑白反相负片模式">
                  <span>负片</span>
                </button>
                <button type="button" id="resetViewerBtn" class="btn-secondary btn-sm" title="重置缩放与位移 (或双击画面)">
                  <span>重置</span>
                </button>
              </div>

              <!-- 热力图控制区 -->
              <div class="flex flex-wrap items-center gap-3 text-xs">
                <label class="flex cursor-pointer items-center gap-1.5 font-medium text-text-1 select-none">
                  <input id="heatmapToggle" type="checkbox" checked class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span>热力图叠加</span>
                </label>

                <div class="flex items-center gap-1.5" title="调节Grad-CAM热力图层透明度 (0%-100%)">
                  <span class="text-text-3">透明度</span>
                  <input id="heatmapOpacitySlider" type="range" min="0" max="100" value="68" class="h-1.5 w-20 cursor-pointer accent-primary" />
                  <span id="heatmapOpacityValue" class="w-9 text-right font-medium tabular-nums text-primary">68%</span>
                </div>

                <button type="button" id="compareModeBtn" class="btn-secondary btn-sm" title="切换原图与热力图左右分屏对比模式">
                  <span>⇄ 左右对比</span>
                </button>
              </div>
            </div>

            <!-- 影像画布区：支持滚轮以鼠标为中心缩放、左键拖拽平移、双击重置、Grad-CAM 热力层平滑过渡 300ms -->
            <div
              id="xrayViewport"
              class="relative h-[430px] sm:h-[470px] w-full select-none overflow-hidden rounded-lg bg-slate-950 border border-slate-800 cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <!-- 放射科标准方位角标 -->
              <div class="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2">
                <span class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-sky-400">R 右侧</span>
                <span id="viewportCaseLabel" class="rounded bg-slate-900/80 border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300">PA 正位胸片</span>
              </div>
              <div class="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-2">
                <span id="zoomPercentBadge" class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-200 tabular-nums">缩放: 100%</span>
                <span class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-sky-400">L 左侧</span>
              </div>

              <!-- 变换容器 (缩放+平移+旋转) -->
              <div id="xrayTransformLayer" class="relative h-[420px] w-[420px] max-w-full max-h-full flex items-center justify-center" style="transform: translate(0px, 0px) scale(1) rotate(0deg); transition: transform 180ms ease-out;">
                <!-- 底层：原始胸部X光图像 -->
                <img
                  id="xrayBaseImg"
                  src="assets/sample_2.jpg"
                  alt="当前待解读胸部X光正位影像"
                  decoding="async"
                  class="h-full w-full object-contain pointer-events-none select-none"
                />
                <!-- 顶层：Grad-CAM 高斯伪彩热力图 Canvas (过渡300ms) -->
                <canvas
                  id="heatmapCanvas"
                  width="420"
                  height="420"
                  class="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300"
                  style="opacity: 0.68;"
                ></canvas>
              </div>

              <!-- 左右对比卷帘滑块控制层 (默认隐藏，开启左右对比时显示) -->
              <div id="compareSliderOverlay" class="hidden absolute inset-y-0 left-0 right-0 z-30 pointer-events-none">
                <div id="compareDividerLine" class="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" style="left: 50%;">
                  <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-lg border-2 border-white">
                    ⇄
                  </div>
                </div>
                <div class="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-4 py-1.5 text-xs text-white shadow-lg">
                  <span>原图</span>
                  <input id="compareSplitRange" type="range" min="5" max="95" value="50" class="w-32 cursor-pointer accent-primary" />
                  <span>热力图</span>
                </div>
              </div>

              <!-- 底部操作提示与热力色标图例 -->
              <div class="pointer-events-none absolute bottom-2.5 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                <span class="rounded bg-slate-900/80 px-2 py-0.5">滚轮缩放 · 左键拖拽平移 · 双击重置</span>
                <div class="flex items-center gap-1.5 rounded bg-slate-900/80 px-2.5 py-0.5">
                  <span>Grad-CAM 权重:</span>
                  <span>低</span>
                  <div class="h-2 w-20 rounded-sm" style="background: linear-gradient(90deg, #36BFFA 0%, #00B42A 35%, #FF8A00 70%, #F53F3F 100%);"></div>
                  <span>高</span>
                </div>
              </div>
            </div>

            <!-- 影像信息栏：文件名、尺寸、文件大小、上传时间 -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-md bg-page-bg px-3.5 py-2 text-xs text-text-2 border border-border-line">
              <div class="truncate">
                <span class="text-text-3">文件名：</span>
                <span id="infoFileName" class="font-medium text-text-1">PA_Chest_0192.jpg</span>
              </div>
              <div>
                <span class="text-text-3">尺寸：</span>
                <span id="infoDimensions" class="font-medium tabular-nums text-text-1">2048 × 2048 px</span>
              </div>
              <div>
                <span class="text-text-3">大小：</span>
                <span id="infoFileSize" class="font-medium tabular-nums text-text-1">2.84 MB</span>
              </div>
              <div>
                <span class="text-text-3">上传时间：</span>
                <span id="infoUploadTime" class="font-medium tabular-nums text-text-1">2026-10-17 20:50</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧 40% (lg:col-span-5) 结果区 -->
        <div class="lg:col-span-5 space-y-4">

          <!-- 状态 1：待分析面板 (idle) -->
          <div id="stateIdlePanel" class="hidden med-card text-center py-12 px-6 space-y-4">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-text-1">上传影像后点击开始分析</h3>
            <p class="text-xs text-text-2 max-w-xs mx-auto leading-5">
              当前胸片已载入就绪，点击下方按钮即可启动 DenseNet-121 多病种概率筛查与 Grad-CAM 热力定位分析。
            </p>
            <div class="pt-2">
              <button type="button" id="startAnalyzeBtn" class="btn-primary w-full sm:w-auto px-8">
                <span>开始 AI 智能分析</span>
              </button>
            </div>
          </div>

          <!-- 状态 2：分析中骨架屏面板 (analyzing - 1.5s循环骨架屏 + 进度提示) -->
          <div id="stateAnalyzingPanel" class="hidden space-y-4">
            <div class="med-card border-primary/30 bg-primary/[0.02]">
              <div class="flex items-center justify-between text-xs font-medium text-primary mb-2">
                <span id="analyzingStageText">正在运行 DenseNet-121 特征提取...</span>
                <span id="analyzingPercentText" class="tabular-nums font-semibold">45%</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div id="analyzingProgressBar" class="h-full bg-primary transition-all duration-200" style="width: 45%;"></div>
              </div>
            </div>

            <!-- 骨架屏卡片 -->
            <div class="med-card skeleton-pulse space-y-4">
              <div class="flex items-center justify-between">
                <div class="h-5 w-32 rounded bg-gray-200"></div>
                <div class="h-6 w-16 rounded bg-gray-200"></div>
              </div>
              <div class="h-16 w-full rounded bg-gray-100"></div>
              <div class="space-y-3 pt-2">
                <div class="h-4 w-40 rounded bg-gray-200"></div>
                <div class="space-y-2">
                  <div class="flex justify-between"><div class="h-3.5 w-28 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
                  <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between"><div class="h-3.5 w-32 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
                  <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between"><div class="h-3.5 w-24 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
                  <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between"><div class="h-3.5 w-28 rounded bg-gray-200"></div><div class="h-3.5 w-12 rounded bg-gray-200"></div></div>
                  <div class="h-2.5 w-full rounded-full bg-gray-100"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 状态 3：分析完成结构化结果面板 (done) -->
          <div id="stateDonePanel" class="space-y-4">
            <!-- 3.1 风险总览卡片：整体风险等级标签(低/中/高) + 一句话总结结论 + 风险仪表盘 -->
            <div class="med-card">
              <div class="flex items-center justify-between border-b border-border-line pb-3">
                <div>
                  <span class="text-xs text-text-3">AI 综合风险评估</span>
                  <h3 class="text-lg font-medium text-text-1 mt-0.5">整体风险总览</h3>
                </div>
                <span id="resultRiskBadge" class="inline-flex items-center gap-1.5 rounded border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
                  <span class="h-2 w-2 rounded-full bg-danger"></span>
                  <span>高风险关注</span>
                </span>
              </div>

              <!-- 一句话总结结论 -->
              <div class="mt-3 rounded-md bg-page-bg p-3 border border-border-line">
                <p id="resultSummaryText" class="text-sm font-medium text-text-1 leading-6">
                  右下肺野内中带可见局灶性斑片状高密度浸润影，肺炎（Pneumonia）倾向概率 78.4%，建议结合体温、血常规及胸部CT门诊复查。
                </p>
              </div>
            </div>

            <!-- 3.2 疾病概率列表：按概率从高到低排序；横向进度条+ECharts切换；hover显示说明；点击跳转科普 -->
            <div class="med-card">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h3 class="text-lg font-medium text-text-1">疾病征象概率列表</h3>
                  <p class="text-xs text-text-3">点击疾病名称可跳转查看对应健康科普详情</p>
                </div>
                <div class="flex items-center gap-1 rounded-md border border-border-line p-0.5 bg-page-bg text-xs">
                  <button type="button" id="probViewListBtn" class="rounded px-2.5 py-1 font-medium bg-white text-primary shadow-sm cursor-pointer">进度条</button>
                  <button type="button" id="probViewChartBtn" class="rounded px-2.5 py-1 font-medium text-text-2 hover:text-text-1 cursor-pointer">ECharts图表</button>
                </div>
              </div>

              <!-- 列表视图 -->
              <div id="probListView" class="space-y-2.5 max-h-[340px] overflow-y-auto pr-1"></div>

              <!-- ECharts 条形图视图 (固定高度容器 h-72) -->
              <div id="probChartView" class="hidden">
                <div id="probEchartContainer" class="relative h-72 w-full"></div>
              </div>
            </div>

            <!-- 3.3 可解释说明卡片：热力图区域说明 + 模型关注区域提示 -->
            <div class="med-card border-primary/20 bg-primary/[0.03]">
              <div class="flex items-center gap-2 text-primary font-semibold text-sm">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Grad-CAM 可解释热力说明</span>
              </div>
              <div class="mt-2 space-y-1.5 text-xs text-text-2 leading-5">
                <p><strong class="text-text-1">模型关注区域：</strong><span id="resultAttentionRegion">右下肺野内中带（第7-9后肋间，热力峰值 0.89）及右侧肺门下部、右肋膈角区域。</span></p>
                <p><strong class="text-text-1">热力图判读提示：</strong><span id="resultHeatmapNote">红色至橙色高激活区代表神经网络识别出局部肺纹理增粗或肺泡渗出性密度增高影的核心依据区域。</span></p>
              </div>
            </div>

            <div id="agentReportPanel" class="med-card hidden space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line pb-3">
                <div>
                  <h3 class="text-base font-semibold text-text-1">循证科普报告</h3>
                  <p id="agentProviderLabel" class="mt-0.5 text-xs text-text-3">由影像模型、知识库与 Qwen 共同生成</p>
                </div>
                <span id="agentSourceCount" class="text-xs text-text-3"></span>
              </div>
              <p id="agentReportSummary" class="text-sm leading-6 text-text-1"></p>
              <div>
                <h4 class="text-xs font-semibold text-text-2">建议与局限</h4>
                <ul id="agentReportActions" class="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-text-2"></ul>
              </div>
              <details class="border-t border-border-line pt-2">
                <summary class="cursor-pointer text-xs font-medium text-primary">查看检索依据与来源</summary>
                <div id="agentEvidenceList" class="mt-2 space-y-2"></div>
              </details>
              <p id="agentDisclaimer" class="border-t border-border-line pt-2 text-[11px] leading-5 text-text-3"></p>
            </div>

            <!-- 3.4 操作栏：「保存到健康档案」主按钮、「重新上传」次按钮、「导出报告」次按钮、「查看相关科普」文字按钮 -->
            <div class="med-card !p-4 flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button type="button" id="saveRecordBtn" class="btn-primary flex-1 sm:flex-initial">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>保存到健康档案</span>
                </button>
                <button type="button" id="exportReportBtn" class="btn-secondary">
                  <span>导出解读报告</span>
                </button>
                <button type="button" id="reuploadBtn" class="btn-secondary">
                  <span>重新上传</span>
                </button>
              </div>
              <button type="button" id="goRelatedKnowledgeBtn" class="text-xs font-medium text-primary hover:underline cursor-pointer py-1">
                查看相关科普 →
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- 手机端 (<768px) 底部悬浮快捷操作栏 -->
      <div class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-2 border-t border-border-line bg-white/95 backdrop-blur px-4 py-2.5 shadow-lg md:hidden">
        <button type="button" id="mobileReuploadBtn" class="btn-secondary btn-sm flex-1">重新上传</button>
        <button type="button" id="mobileSaveRecordBtn" class="btn-primary !h-9 !text-xs flex-1">保存到健康档案</button>
      </div>
    </section>
</template>
