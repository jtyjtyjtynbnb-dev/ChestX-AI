<script setup>
import ChartCanvas from './ChartCanvas.vue';
import { aboutChartOption } from '../composables/useDashboard.js';
</script>
<template>
<section id="page-about" class="page-view active space-y-6">
      <!-- 1. 免责声明板块（显著位置） -->
      <div class="med-card border-2 border-warning/50 bg-warning/[0.04]">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning font-bold text-lg">
            !
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-semibold text-text-1">重要医疗免责声明（显著公示）</h2>
              <span class="rounded bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">必读声明</span>
            </div>
            <p class="mt-1.5 text-sm text-text-1 leading-6">
              「胸影智识 (ChestX-AI)」系统所提供的胸部X光影像概率分析、模型注意力热力图定位及全部健康科普内容，<strong>仅供公众健康科普参考与医学影像教学演示使用，不具备任何临床诊断效力，亦不可替代执业医师的面对面问诊与放射科正式审核报告</strong>。若您存在发热、胸痛、持续咳嗽或呼吸困难等症状，请立即前往正规医疗机构呼吸内科或胸外科就诊。
            </p>
          </div>
        </div>
      </div>

      <!-- 2. 产品介绍板块 -->
      <div class="med-card grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
        <div class="lg:col-span-8 space-y-3">
          <h1 class="text-xl font-semibold text-text-1">关于「胸影智识 ChestX-AI」</h1>
          <p class="text-sm text-text-2 leading-6">
            胸部X光正位片（Chest X-Ray）是目前临床体检与呼吸系统疾病初筛最广泛、最经济的影像学检查手段。然而传统胸片对比度有限、解剖结构重叠多，普通受检者面对报告上的专业术语往往一头雾水，传统AI辅助诊断又常因“黑盒输出”缺乏直观解释。
          </p>
          <p class="text-sm text-text-2 leading-6">
            本项目按标准化工程实践设计研发，将多标签深度卷积神经网络（DenseNet-121）与模型注意力热力图有机结合，打造集「智能影像解读」、「可解释热力分析」、「模型 10 类 + 扩展科普」、「交互式影像小课堂」与「个人健康档案管理」于一体的现代化医疗健康科普平台。
          </p>
        </div>
        <div class="lg:col-span-4 rounded-lg bg-page-bg p-4 border border-border-line space-y-2.5 text-xs">
          <div class="font-semibold text-sm text-text-1 border-b border-border-line pb-2">系统工程指标概览</div>
          <div class="flex justify-between"><span class="text-text-3">工程定位：</span><span class="font-medium text-primary">本地推理 · 可解释热力图 · 科普档案</span></div>
          <div class="flex justify-between"><span class="text-text-3">核心框架：</span><span class="font-medium text-text-1">Vue 3.5 / Vite 5 / Pinia 2</span></div>
          <div class="flex justify-between"><span class="text-text-3">UI与样式：</span><span class="font-medium text-text-1">Tailwind 3.4 + 原生组件</span></div>
          <div class="flex justify-between"><span class="text-text-3">部署方式：</span><span class="font-medium tabular-nums text-success">单端口 · 本地同源托管</span></div>
        </div>
      </div>

      <!-- 3. 技术架构图展示 -->
      <div class="med-card space-y-4">
        <div>
          <h2 class="text-xl font-semibold text-text-1">系统分层技术架构图</h2>
          <p class="text-xs text-text-3 mt-0.5">前后端分离与前端五层解耦架构（Views / Components / Composables & Store / API / Utils）</p>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div class="rounded-lg border border-primary/25 bg-primary/[0.03] p-4">
            <div class="text-xs font-semibold text-primary">01 视图与交互层 (Views & UI)</div>
            <ul class="mt-2 space-y-1.5 text-xs text-text-2">
              <li>• 首页 / 智能解读 / 健康档案</li>
              <li>• 健康科普 / 影像课堂 / 关于我们</li>
              <li>• Tailwind 医疗蓝设计令牌</li>
              <li>• 骨架屏脉冲加载与错误边界捕获</li>
            </ul>
          </div>
          <div class="rounded-lg border border-info/30 bg-info/[0.04] p-4">
            <div class="text-xs font-semibold text-primary">02 逻辑复用与状态层 (Pinia &amp; Hooks)</div>
            <ul class="mt-2 space-y-1.5 text-xs text-text-2">
              <li>• <code class="text-primary">useImageViewer</code> 缩放/平移/热力/测量</li>
              <li>• <code class="text-primary">useDiagnosis</code> 上传校验与推理流</li>
              <li>• <code class="text-primary">useChestxStore</code> 全局状态与成员档案</li>
              <li>• <code class="text-primary">useComparison</code> 随访对比与趋势</li>
            </ul>
          </div>
          <div class="rounded-lg border border-success/30 bg-success/[0.04] p-4">
            <div class="text-xs font-semibold text-success">03 统一接口与工具层 (API &amp; Utils)</div>
            <ul class="mt-2 space-y-1.5 text-xs text-text-2">
              <li>• <code class="text-success">/api</code> 统一前缀与 X-Request-Id 注入</li>
              <li>• 400 / 413 / 500 统一错误码拦截提示</li>
              <li>• <code class="text-success">format.js</code> / <code class="text-success">dicom.js</code> 工具函数</li>
              <li>• JPG/PNG/未压缩 DICOM 与 ≤10MB 校验</li>
            </ul>
          </div>
          <div class="rounded-lg border border-warning/30 bg-warning/[0.04] p-4">
            <div class="text-xs font-semibold text-warning">04 AI推理与知识检索层 (AI Engine)</div>
            <ul class="mt-2 space-y-1.5 text-xs text-text-2">
              <li>• ONNX Runtime CPU 本地推理</li>
              <li>• DenseNet-121 10类病变多标签概率预测</li>
              <li>• 模型第二输出 7×7 注意力图叠加</li>
              <li>• BM25 + TF-IDF 混合知识检索</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 4. 模型输出示例 + 隐私政策与技术栈说明 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div class="med-card lg:col-span-7 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text-1">示例胸片 10 类征象模型输出</h2>
              <p class="text-xs text-text-3">本包模型对 sample_2.jpg 的实际输出（CPU 推理，仅演示，非临床评测）</p>
            </div>
            <span class="rounded bg-success/10 px-2.5 py-1 text-xs font-semibold text-success tabular-nums">最高：浸润影 80.3%</span>
          </div>
          <ChartCanvas id="aboutModelEchart" class="relative h-72 w-full" :option="aboutChartOption" />
        </div>

        <!-- 5. 隐私政策与技术栈说明 -->
        <div class="lg:col-span-5 space-y-4">
          <div class="med-card space-y-2.5">
            <h3 class="text-lg font-semibold text-text-1">隐私政策与数据安全说明</h3>
            <p class="text-xs text-text-2 leading-5">
              1. <strong>上传与解码</strong>：浏览器端会压缩 JPG/PNG；DICOM 在浏览器端解码为图像。服务端仅在内存中解码像素用于推理，不保存原始影像文件。
            </p>
            <p class="text-xs text-text-2 leading-5">
              2. <strong>本地存储</strong>：健康档案保存在浏览器 localStorage 与本机 SQLite 中，当前未做加密，请勿录入真实患者身份信息或敏感影像。
            </p>
            <p class="text-xs text-text-2 leading-5">
              3. <strong>同源访问</strong>：默认仅监听 127.0.0.1:8000，不对外网开放；接口请求会注入 X-Request-Id 便于排查，但不使用 HTTPS。
            </p>
          </div>

          <div class="med-card space-y-2.5">
            <h3 class="text-lg font-semibold text-text-1">技术栈与工程实践</h3>
            <div class="flex flex-wrap gap-1.5 text-xs">
              <span class="rounded bg-primary/10 px-2.5 py-1 font-medium text-primary">Vue 3.5 (Script Setup)</span>
              <span class="rounded bg-primary/10 px-2.5 py-1 font-medium text-primary">Vite 5.x</span>
              <span class="rounded bg-primary/10 px-2.5 py-1 font-medium text-primary">Vue Router 4.x</span>
              <span class="rounded bg-primary/10 px-2.5 py-1 font-medium text-primary">Pinia 2.x</span>
              <span class="rounded bg-info/15 px-2.5 py-1 font-medium text-primary">Tailwind CSS 3.4</span>
              <span class="rounded bg-success/10 px-2.5 py-1 font-medium text-success">ECharts 5.5</span>
              <span class="rounded bg-success/10 px-2.5 py-1 font-medium text-success">ONNX Runtime</span>
              <span class="rounded bg-success/10 px-2.5 py-1 font-medium text-success">Canvas 2D</span>
              <span class="rounded bg-page-bg border border-border-line px-2.5 py-1 font-medium text-text-2">Axios + 原生 fetch/SSE 流</span>
              <span class="rounded bg-page-bg border border-border-line px-2.5 py-1 font-medium text-text-2">vue-i18n 9</span>
            </div>
          </div>
        </div>
      </div>
    </section>
</template>
