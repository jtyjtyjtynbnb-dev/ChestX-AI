<script setup>
import { useInterpretPage } from "../composables/useInterpretPage.js";
import AnalyzingPanel from "./AnalyzingPanel.vue";
import ImageViewerInfo from "./ImageViewerInfo.vue";
const vm = useInterpretPage();
</script>

<template>
<section id="page-interpret" class="page-view active space-y-5">
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
<button v-for="sample in vm.sampleCases" :key="sample.id" type="button" :data-sample="sample.id" class="sample-case-btn btn-secondary btn-sm" :class="sample.className" @click="vm.analyze(sample.id)">{{ sample.label }}</button>
        </div>
      </div>

      <div class="med-card grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label for="agentQuestionInput" class="mb-1 block text-xs font-medium text-text-2">补充问题（可选）</label>
          <input id="agentQuestionInput" v-model="vm.AppState.agentQuestion" type="text" maxlength="500" placeholder="例如：模型提示的肺部征象一般需要结合哪些信息理解？" class="w-full rounded-md border border-border-line bg-white px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none" />
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
              <button type="button" id="switchToUploadBtn" @click="vm.upload.showUploader()" class="btn-secondary btn-sm">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>上传本地胸片</span>
              </button>
            </div>
          </div>

          <!-- 子视图 A：上传区（拖拽+点击双模式，支持JPG/PNG ≤10MB，进度条） -->
          <div id="uploaderPanel" v-show="vm.upload.state.visible">
            <div
              id="dropZone" @click="vm.upload.chooseFile()" @keydown.enter.prevent="vm.upload.chooseFile()" @keydown.space.prevent="vm.upload.chooseFile()" @dragover.prevent="vm.upload.state.dragging = true" @dragleave.prevent="vm.upload.state.dragging = false" @drop.prevent="vm.upload.drop($event)" :class="{ '!border-primary !bg-primary/10': vm.upload.state.dragging }"
              role="button"
              tabindex="0"
              aria-label="选择胸部X光图片上传"
              aria-describedby="uploadHelpText"
              class="flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-line bg-page-bg/70 p-6 text-center transition-all duration-200 hover:border-primary hover:bg-primary/[0.02]"
            >
              <input id="xrayFileInput" :ref="el => vm.upload.fileInput = el" @click.stop @change="vm.upload.fileChanged($event)" type="file" multiple accept=".jpg,.jpeg,.png,.dcm,image/jpeg,image/png,application/dicom" class="hidden" aria-label="选择胸部X光图片或DICOM文件" />
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 class="mt-4 text-lg font-medium text-text-1">点击选择或将胸部X光片拖拽至此处上传</h3>
              <p id="uploadHelpText" class="mt-1 text-xs text-text-3">支持后前位 (PA) / 前后位 (AP) 胸片，JPG / PNG / 未压缩 DICOM；单张 ≤ 10MB（DICOM ≤ 40MB），多选可建立序列。压缩 DICOM 请先转为未压缩 DICOM 或 JPG/PNG。</p>

              <!-- 校验规则说明标签 -->
              <div class="mt-4 flex flex-wrap justify-center gap-2 text-xs text-text-2">
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 自动肺野方向校正</span>
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 本地隐私脱敏处理</span>
                <span class="rounded bg-white border border-border-line px-2.5 py-1">✓ 超限/格式错误即时拦截</span>
              </div>

              <!-- 上传进度条 -->
              <div id="uploadProgressBox" v-show="vm.upload.state.busy" class="mt-5 w-72 max-w-full">
                <div class="flex justify-between text-xs text-primary mb-1">
                  <span>正在读取并校验DICOM/光学灰阶矩阵...</span>
                  <span id="uploadProgressText" class="tabular-nums font-semibold">{{ vm.upload.state.percent + '%' }}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div id="uploadProgressBar" class="h-full bg-primary transition-all duration-150" :style="{ width: vm.upload.state.percent + '%' }"></div>
                </div>
              </div>

              <div class="mt-6 flex items-center gap-3">
                <button type="button" id="cancelUploadViewBtn" @click.stop="vm.upload.hideUploader()" class="btn-secondary btn-sm">返回当前影像查看器</button>
                <button type="button" id="testInvalidFileBtn" @click.stop="vm.upload.testInvalidFile()" class="btn-secondary btn-sm !text-text-3" title="测试格式/大小错误拦截提示">测试异常格式拦截</button>
              </div>
            </div>
          </div>

          <!-- 子视图 B：专业影像查看器（上传后） -->
          <div id="viewerPanel" v-show="!vm.upload.state.visible" class="space-y-3">
            <!-- 查看器操作工具栏：缩放、平移、旋转、1:1显示、重置、热力图开关、透明度滑块、原图/热力图对比 -->
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-line bg-page-bg px-3 py-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" id="zoomInBtn" @click="vm.viewer.zoom(0.2)" class="btn-secondary btn-sm" title="放大影像 (+20%)">
                  <span>＋ 放大</span>
                </button>
                <button type="button" id="zoomOutBtn" @click="vm.viewer.zoom(-0.2)" class="btn-secondary btn-sm" title="缩小影像 (-20%)">
                  <span>－ 缩小</span>
                </button>
                <button type="button" id="rotateBtn" @click="vm.viewer.rotate()" class="btn-secondary btn-sm" title="顺时针旋转90度">
                  <span>↻ 旋转</span>
                </button>
                <button type="button" id="oneToOneBtn" @click="vm.viewer.oneToOne()" class="btn-secondary btn-sm" title="1:1 原始比例显示">
                  <span>1:1</span>
                </button>
                <button type="button" id="invertFilterBtn" @click="vm.viewer.toggleInvert()" class="btn-secondary btn-sm" title="切换胸片黑白反相负片模式">
                  <span>负片</span>
                </button>
                <button type="button" id="resetViewerBtn" @click="vm.viewer.reset()" class="btn-secondary btn-sm" title="重置缩放与位移 (或双击画面)">
                  <span>重置</span>
                </button>
              </div>

              <!-- 热力图控制区 -->
              <div class="flex flex-wrap items-center gap-3 text-xs">
                <label class="flex cursor-pointer items-center gap-1.5 font-medium text-text-1 select-none">
                  <input id="heatmapToggle" v-model="vm.AppState.viewer.showHeatmap" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span>热力图叠加</span>
                </label>

                <div class="flex items-center gap-1.5" title="调节模型热力图层透明度 (0%-100%)">
                  <span class="text-text-3">透明度</span>
                  <input id="heatmapOpacitySlider" v-model.number="vm.AppState.viewer.heatmapOpacity" type="range" min="0" max="100" class="h-1.5 w-20 cursor-pointer accent-primary" />
                  <span id="heatmapOpacityValue" class="w-9 text-right font-medium tabular-nums text-primary">{{ vm.AppState.viewer.heatmapOpacity + '%' }}</span>
                </div>

                <button type="button" id="compareModeBtn" @click="vm.viewer.toggleCompare()" class="btn-secondary btn-sm" title="切换原图与热力图左右分屏对比模式">
                  <span>{{ vm.AppState.viewer.compareMode ? '✕ 退出对比' : '⇄ 左右对比' }}</span>
                </button>
              </div>

              <div class="flex w-full flex-wrap items-center gap-3 border-t border-border-line pt-2 text-xs">
                <label class="flex items-center gap-1.5 text-text-2" title="调节显示亮度，不改变原始像素">
                  <span>亮度</span>
                  <input v-model.number="vm.AppState.viewer.brightness" type="range" min="40" max="180" class="h-1.5 w-20 cursor-pointer accent-primary" aria-label="影像显示亮度" />
                  <span class="w-8 text-right tabular-nums text-primary">{{ vm.AppState.viewer.brightness }}%</span>
                </label>
                <label class="flex items-center gap-1.5 text-text-2" title="调节显示对比度，不改变原始像素">
                  <span>对比度</span>
                  <input v-model.number="vm.AppState.viewer.contrast" type="range" min="40" max="200" class="h-1.5 w-20 cursor-pointer accent-primary" aria-label="影像显示对比度" />
                  <span class="w-8 text-right tabular-nums text-primary">{{ vm.AppState.viewer.contrast }}%</span>
                </label>
                <span class="text-text-3">测量标注：</span>
                <button type="button" data-measure="length" class="btn-secondary btn-sm" :class="{ '!border-primary !text-primary': vm.AppState.viewer.measureMode === 'length' }" @click="vm.viewer.setMeasureMode('length')">长度</button>
                <button type="button" data-measure="angle" class="btn-secondary btn-sm" :class="{ '!border-primary !text-primary': vm.AppState.viewer.measureMode === 'angle' }" @click="vm.viewer.setMeasureMode('angle')">角度</button>
                <button type="button" data-measure="roi" class="btn-secondary btn-sm" :class="{ '!border-primary !text-primary': vm.AppState.viewer.measureMode === 'roi' }" @click="vm.viewer.setMeasureMode('roi')">矩形 ROI</button>
                <button type="button" data-measure="clear" class="btn-secondary btn-sm !text-text-3" @click="vm.viewer.clearMeasurements()">清除标注</button>
                <span v-if="vm.currentCase.isDicom" class="rounded bg-info/10 px-2 py-0.5 text-[11px] text-primary">DICOM 窗宽 {{ Math.round(vm.currentCase.windowWidth || 0) }} / 窗位 {{ Math.round(vm.currentCase.windowCenter || 0) }}</span>
                <span v-else-if="vm.AppState.viewer.pixelSpacing" class="text-[11px] text-text-3">已读取像素间距，长度以 mm 显示</span>
                <span v-if="vm.currentCase.isDicom && vm.AppState.viewer.pixelSpacing" class="text-[11px] text-text-3">已读取像素间距，长度以 mm 显示</span>
              </div>
            </div>

            <!-- 影像画布区：支持滚轮以鼠标为中心缩放、左键拖拽平移、双击重置、模型热力层平滑过渡 300ms -->
            <div
              id="xrayViewport" :ref="el => vm.viewport = el" @wheel.prevent="vm.viewer.wheel($event)" @pointerdown="vm.viewer.startDrag($event)" @pointermove="vm.viewer.drag($event)" @pointerup="vm.viewer.endDrag()" @pointercancel="vm.viewer.endDrag()" @lostpointercapture="vm.viewer.endDrag()" @dblclick="vm.viewer.resetViewerState()"
              class="relative h-[430px] sm:h-[470px] w-full select-none overflow-hidden rounded-lg bg-slate-950 border border-slate-800 cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <!-- 放射科标准方位角标 -->
              <div class="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2">
                <span class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-sky-400">R 右侧</span>
                <span id="viewportCaseLabel" class="rounded bg-slate-900/80 border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300">{{ vm.currentCase.caseBadge || 'PA 正位胸片' }}</span>
              </div>
              <div class="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-2">
                <span id="zoomPercentBadge" class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-200 tabular-nums">{{ '缩放: ' + Math.round(vm.AppState.viewer.scale * 100) + '%' }}</span>
                <span class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-sky-400">L 左侧</span>
              </div>

              <!-- 变换容器 (缩放+平移+旋转) -->
              <div id="xrayTransformLayer" class="relative h-[420px] w-[420px] max-w-full max-h-full flex items-center justify-center" :style="vm.viewer.transformStyle">
                <!-- 底层：原始胸部X光图像 -->
                <img
                  id="xrayBaseImg"
                  :src="vm.currentCase.imageUrl" :style="{ filter: vm.viewer.imageFilter }"
                  alt="当前待解读胸部X光正位影像"
                  decoding="async"
                  class="h-full w-full object-contain pointer-events-none select-none"
                />
                <!-- 顶层：模型注意力伪彩热力图 Canvas (过渡300ms) -->
                <canvas
                  id="heatmapCanvas" :ref="el => vm.heatmapCanvas = el"
                  width="420"
                  height="420"
                  class="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300"
                  :style="{ opacity: vm.AppState.viewer.showHeatmap ? vm.AppState.viewer.heatmapOpacity / 100 : 0 }"
                ></canvas>
                <!-- 测量标注层：长度/角度/矩形 ROI，坐标使用 0-1 归一化，跟随缩放与平移 -->
                <canvas
                  :ref="el => vm.measureCanvas = el"
                  width="420"
                  height="420"
                  class="absolute inset-0 h-full w-full"
                  :class="vm.AppState.viewer.measureMode === 'none' ? 'pointer-events-none' : 'cursor-crosshair'"
                  @pointerdown="vm.viewer.handleMeasurePointer($event)"
                  aria-label="影像测量标注层：支持长度、角度与矩形ROI"
                ></canvas>
              </div>

              <!-- 左右对比卷帘滑块控制层 (默认隐藏，开启左右对比时显示) -->
              <div id="compareSliderOverlay" v-show="vm.AppState.viewer.compareMode" class="absolute inset-y-0 left-0 right-0 z-30 pointer-events-none">
                <div id="compareDividerLine" class="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" :style="{ left: vm.AppState.viewer.splitPercent + '%' }">
                  <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-lg border-2 border-white">
                    ⇄
                  </div>
                </div>
                <div class="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-4 py-1.5 text-xs text-white shadow-lg">
                  <span>原图</span>
                  <input id="compareSplitRange" v-model.number="vm.AppState.viewer.splitPercent" @pointerdown.stop type="range" min="5" max="95" class="w-32 cursor-pointer accent-primary" />
                  <span>热力图</span>
                </div>
              </div>

              <!-- 底部操作提示与热力色标图例 -->
              <div class="pointer-events-none absolute bottom-2.5 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                <span class="rounded bg-slate-900/80 px-2 py-0.5">滚轮缩放 · 左键拖拽平移 · 双击重置</span>
                <div class="flex items-center gap-1.5 rounded bg-slate-900/80 px-2.5 py-0.5">
                  <span>热力权重:</span>
                  <span>低</span>
                  <div class="h-2 w-20 rounded-sm" style="background: linear-gradient(90deg, #36BFFA 0%, #00B42A 35%, #FF8A00 70%, #F53F3F 100%);"></div>
                  <span>高</span>
                </div>
              </div>
            </div>

            <ImageViewerInfo :current-case="vm.currentCase" />

            <!-- 多文件序列播放条 -->
            <div v-if="vm.series.length > 1" class="flex items-center gap-2 rounded-md border border-border-line bg-white px-3 py-2">
              <button type="button" data-series="prev" class="btn-secondary btn-sm" :disabled="vm.AppState.seriesIndex === 0" @click="vm.upload.stepSeries(-1)">上一张</button>
              <div class="flex flex-1 items-center gap-2 overflow-x-auto">
                <button v-for="(item, index) in vm.series" :key="item.id" type="button" :data-series-index="index" class="relative h-12 w-12 shrink-0 overflow-hidden rounded border-2" :class="index === vm.AppState.seriesIndex ? 'border-primary' : 'border-border-line'" :aria-label="'查看第 ' + (index + 1) + ' 张影像'" :aria-pressed="index === vm.AppState.seriesIndex" @click="vm.upload.selectSeries(index)">
                  <img :src="item.imageUrl" :alt="item.fileName" class="h-full w-full object-cover" />
                  <span class="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[10px] text-white">{{ index + 1 }}</span>
                </button>
              </div>
              <span class="text-xs tabular-nums text-text-3">{{ (vm.AppState.seriesIndex || 0) + 1 }} / {{ vm.series.length }}</span>
              <button type="button" data-series="next" class="btn-secondary btn-sm" :disabled="vm.AppState.seriesIndex >= vm.series.length - 1" @click="vm.upload.stepSeries(1)">下一张</button>
            </div>
          </div>
        </div>

        <!-- 右侧 40% (lg:col-span-5) 结果区 -->
        <div class="lg:col-span-5 space-y-4">

          <!-- 状态 1：待分析面板 (idle) -->
          <div v-if="vm.AppState.diagnosisError" id="diagnosisErrorPanel" class="med-card border-danger/30 bg-danger/5 space-y-3" role="alert">
            <h3 class="text-base font-semibold text-danger">{{ $t('分析未能完成') }}</h3>
            <p class="text-xs leading-5 text-text-2">{{ vm.AppState.diagnosisError }}</p>
            <p class="text-xs leading-5 text-text-3">{{ $t('请检查网络或后端服务后重试；也可以重新上传胸片。') }}</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="retryAnalysisBtn" class="btn-primary btn-sm" @click="vm.analyze()">{{ $t('重试分析') }}</button>
              <button type="button" class="btn-secondary btn-sm" @click="vm.upload.showUploader()">{{ $t('重新上传') }}</button>
            </div>
          </div>

          <div id="stateIdlePanel" v-show="vm.AppState.diagnoseStatus === 'idle' && !vm.AppState.diagnosisError" class="med-card text-center py-12 px-6 space-y-4">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-text-1">上传影像后点击开始分析</h3>
            <p class="text-xs text-text-2 max-w-xs mx-auto leading-5">
              当前胸片已载入就绪，点击下方按钮即可启动 DenseNet-121 多病种概率筛查与模型热力定位分析。
            </p>
            <div class="pt-2">
              <button type="button" id="startAnalyzeBtn" @click="vm.analyze()" class="btn-primary w-full sm:w-auto px-8">
                <span>开始 AI 智能分析</span>
              </button>
            </div>
          </div>

          <AnalyzingPanel v-if="vm.AppState.diagnoseStatus === 'analyzing'" :progress="vm.diagnosis.progress" />

          <!-- 状态 3：分析完成结构化结果面板 (done) -->
          <div id="stateDonePanel" v-show="vm.AppState.diagnoseStatus === 'done'" class="space-y-4">
            <!-- 3.1 风险总览卡片：整体风险等级标签(低/中/高) + 一句话总结结论 + 风险仪表盘 -->
            <div class="med-card">
              <div class="flex items-center justify-between border-b border-border-line pb-3">
                <div>
                  <span class="text-xs text-text-3">AI 综合风险评估</span>
                  <h3 class="text-lg font-medium text-text-1 mt-0.5">整体风险总览</h3>
                </div>
                <span v-if="vm.currentCase.isDemo" class="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">演示数据</span>
                <span id="resultRiskBadge" class="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold" :class="vm.results.risk.badgeClass"><span class="h-2 w-2 rounded-full" :class="vm.results.risk.dotClass"></span><span>{{ vm.results.risk.label }}</span></span>
              </div>

              <!-- 一句话总结结论 -->
              <div class="mt-3 rounded-md bg-page-bg p-3 border border-border-line">
                <p id="resultSummaryText" class="text-sm font-medium text-text-1 leading-6">{{ vm.currentCase.summary }}</p>
                <p v-if="vm.currentCase.preprocessing?.applied" id="preprocessNote" class="mt-2 text-[11px] text-text-3">{{ $t('已自动校正影像方向或曝光，仅用于模型输入；原始影像未上传云端。') }}</p>
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
                  <button type="button" id="probViewListBtn" @click="vm.results.setProbabilityMode('list')" class="rounded px-2.5 py-1 font-medium cursor-pointer" :class="vm.AppState.probViewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-text-2 hover:text-text-1'">进度条</button>
                  <button type="button" id="probViewChartBtn" @click="vm.results.setProbabilityMode('chart')" class="rounded px-2.5 py-1 font-medium cursor-pointer" :class="vm.AppState.probViewMode === 'chart' ? 'bg-white text-primary shadow-sm' : 'text-text-2 hover:text-text-1'">ECharts图表</button>
                </div>
              </div>

              <!-- 列表视图 -->
              <div id="probListView" v-show="vm.AppState.probViewMode === 'list'" class="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
<div v-for="item in vm.results.probabilities" :key="item.code" class="group rounded-md border border-transparent hover:border-border-line hover:bg-page-bg p-2 transition-all" :title="item.description"><div class="flex items-center justify-between text-xs sm:text-sm"><button type="button" :data-disease-jump="item.code" class="disease-jump-btn cursor-pointer font-medium text-text-1 hover:text-primary flex items-center gap-1.5 text-left" @click="vm.results.openKnowledge(item.code)"><span>{{ item.name }}</span><span class="text-[11px] text-primary opacity-80 group-hover:opacity-100">科普↗</span></button><div class="flex items-center gap-2"><span class="rounded px-1.5 py-0.5 text-[10px] font-medium border" :class="item.risk.badgeClass">{{ item.risk.shortLabel }}</span><span class="text-sm sm:text-base font-semibold tabular-nums text-text-1 w-14 text-right">{{ vm.formatProb(item.prob) }}</span></div></div><div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"><div class="h-full rounded-full transition-all duration-500" :style="{ width: item.prob + '%', backgroundColor: item.risk.color }"></div></div><p class="mt-1 text-[11px] text-text-3 line-clamp-1">{{ item.description }}</p></div>
</div>

              <!-- ECharts 条形图视图 (固定高度容器 h-72) -->
              <div id="probChartView" v-show="vm.AppState.probViewMode === 'chart'">
                <div id="probEchartContainer" :ref="el => vm.probabilityChart = el" class="relative h-72 w-full"></div>
              </div>
            </div>

            <!-- 3.3 可解释说明卡片：热力图区域说明 + 模型关注区域提示 -->
            <div class="med-card border-primary/20 bg-primary/[0.03]">
              <div class="flex items-center gap-2 text-primary font-semibold text-sm">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>可解释热力说明</span>
              </div>
              <div class="mt-2 space-y-1.5 text-xs text-text-2 leading-5">
                <p><strong class="text-text-1">模型关注区域：</strong><span id="resultAttentionRegion">{{ vm.currentCase.attentionRegion }}</span></p>
                <p><strong class="text-text-1">热力图判读提示：</strong><span id="resultHeatmapNote">{{ vm.currentCase.heatmapNote }}</span></p>
              </div>
            </div>

            <div id="agentReportPanel" v-if="vm.results.agentResult" class="med-card space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-line pb-3">
                <div>
                  <h3 class="text-base font-semibold text-text-1">循证科普报告</h3>
                  <p id="agentProviderLabel" class="mt-0.5 text-xs text-text-3">{{ vm.results.agentResult.provider === 'qwen' ? 'DashScope Qwen 循证报告已完成（未上传影像）' : 'Qwen 不可用，当前显示本地模型与知识库结果' }}</p>
                </div>
                <span id="agentSourceCount" class="text-xs text-text-3">检索到 {{ vm.results.agentResult.sources?.length || 0 }} 条知识依据</span>
              </div>
              <p id="agentReportSummary" class="text-sm leading-6 text-text-1">{{ vm.results.agentResult.report?.summary || '暂无报告摘要' }}</p>
              <div>
                <h4 class="text-xs font-semibold text-text-2">建议与局限</h4>
                <ul id="agentReportActions" class="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-text-2"><li v-for="(item, index) in vm.results.reportActions" :key="index">{{ item }}</li></ul>
              </div>
              <details class="border-t border-border-line pt-2">
                <summary class="cursor-pointer text-xs font-medium text-primary">查看检索依据与来源</summary>
                <div id="agentEvidenceList" class="mt-2 space-y-2"><article v-for="(item, index) in vm.results.evidence" :key="item.id + '-' + index" class="border-l-2 border-primary/40 pl-3 text-xs leading-5"><p class="font-medium text-text-1">{{ item.title }}</p><p class="text-text-2">{{ item.claim }}</p><a class="text-primary underline" :href="item.source_url" target="_blank" rel="noopener noreferrer">{{ item.source }}</a></article><p v-if="!vm.results.evidence.length" class="text-xs text-text-3">本次没有可展示的引用依据。</p></div>
              </details>
              <p id="agentDisclaimer" class="border-t border-border-line pt-2 text-[11px] leading-5 text-text-3">{{ vm.results.agentResult.report?.disclaimer || '' }}</p>
            </div>

            <!-- 3.4 操作栏：「保存到健康档案」主按钮、「重新上传」次按钮、「导出报告」次按钮、「查看相关科普」文字按钮 -->
            <div class="med-card !p-4 flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button type="button" id="saveRecordBtn" @click="vm.actions.saveCurrentToHealthRecords()" class="btn-primary flex-1 sm:flex-initial">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>保存到健康档案</span>
                </button>
                <button type="button" id="exportReportBtn" @click="vm.exportReport()" class="btn-secondary">
                  <span>导出解读报告</span>
                </button>
                <button type="button" id="reuploadBtn" @click="vm.upload.showUploader()" class="btn-secondary">
                  <span>重新上传</span>
                </button>
              </div>
              <button type="button" id="goRelatedKnowledgeBtn" @click="vm.results.openRelatedKnowledge()" class="text-xs font-medium text-primary hover:underline cursor-pointer py-1">
                查看相关科普 →
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
</template>
