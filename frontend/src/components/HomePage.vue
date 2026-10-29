<script setup>
import { useShell } from '../composables/useShell.js';
const { actions } = useShell();
</script>
<template>
<section id="page-home" class="page-view active space-y-6">
      <!-- Hero区：大标题+副标题+核心slogan；主按钮「立即开始解读」；右侧配产品示意图 -->
      <div class="med-card stagger-1 relative overflow-hidden bg-gradient-to-br from-white via-white to-primary/[0.04]">
        <div class="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div class="space-y-4 lg:col-span-7">
            <div class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
              <span class="h-2 w-2 rounded-full bg-primary"></span>
              <span>DenseNet-121 多标签胸部影像模型 + 模型热力定位</span>
            </div>
            <h1 class="text-2xl sm:text-[28px] font-semibold text-text-1 tracking-tight">
              胸影智识 —— 胸部X光影像AI健康科普与管理系统
            </h1>
            <p class="text-lg font-medium text-primary">
              “洞见胸片毫厘征象，传递有温度、可解释的AI健康科普”
            </p>
            <p class="text-sm text-text-2 leading-6">
              面向体检人群、患者家属与医学影像初学者打造。上传正位胸部X光片，即可获取 10 类常见胸部病变概率评估、模型注意力热力图、权威医学科普解读与全周期健康档案追踪。
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <button type="button" id="heroStartBtn" @click="actions.switchPage('interpret')" class="btn-primary">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span>立即开始解读</span>
              </button>
              <button type="button" id="heroDemoCaseBtn" @click="actions.openSample('case-high')" class="btn-secondary">
                <span>一键体验典型胸片案例</span>
              </button>
              <button type="button" id="heroAcademyBtn" @click="actions.switchPage('academy')" class="btn-secondary">
                <span>进入影像小课堂</span>
              </button>
            </div>
            <!-- 关键性能指标栏 (tabular-nums) -->
            <div class="grid grid-cols-3 gap-4 border-t border-border-line pt-4">
              <div>
                <div class="text-lg font-semibold text-primary tabular-nums">14 类</div>
                <div class="text-xs text-text-3">模型 10 类 + 扩展 4 类科普</div>
              </div>
              <div>
                <div class="text-lg font-semibold text-success tabular-nums">本地</div>
                <div class="text-xs text-text-3">ONNX CPU 推理，不上传云端</div>
              </div>
              <div>
                <div class="text-lg font-semibold text-text-1 tabular-nums">可解释</div>
                <div class="text-xs text-text-3">概率 + 热力图 + 检索依据</div>
              </div>
            </div>
          </div>

          <!-- 右侧产品示意图 -->
          <div class="lg:col-span-5">
            <div class="relative overflow-hidden rounded-lg border border-border-line bg-slate-900 shadow-md">
              <img
                src="/assets/sample_1.jpg"
                alt="胸影智识胸部X光AI智能解读产品示意图"
                width="420"
                height="288"
                decoding="async"
                class="w-full h-64 sm:h-72 object-cover opacity-95"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/20 to-transparent"></div>
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-md bg-white/95 backdrop-blur px-3.5 py-2.5 shadow">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-success"></span>
                    <span class="text-xs font-semibold text-text-1">可解释热力引擎已就绪</span>
                  </div>
                  <p class="text-[11px] text-text-2 mt-0.5">支持缩放/平移/热力透明度无级调节/左右卷帘对比</p>
                </div>
                <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">v2.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 核心价值区：4张卡片，每张含图标+标题+描述 -->
      <div class="stagger-2">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-text-1">核心功能价值</h2>
            <p class="text-xs text-text-3 mt-0.5">融合医学影像深度学习与结构化健康科普，打造闭环式个人胸部健康助手</p>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="med-card med-card-hover cursor-pointer" data-jump="interpret" @click="actions.switchPage('interpret')">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="mt-3 text-lg font-medium text-text-1">智能影像解读</h3>
            <p class="mt-1.5 text-xs text-text-2 leading-5">
              基于 DenseNet-121 多标签分类网络，对肺炎、肺结节、胸腔积液、心脏扩大等 10 类胸部征象进行定量概率评估与风险分级。
            </p>
          </div>

          <div class="med-card med-card-hover cursor-pointer" data-jump="interpret" @click="actions.switchPage('interpret')">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 class="mt-3 text-lg font-medium text-text-1">可解释热力分析</h3>
            <p class="mt-1.5 text-xs text-text-2 leading-5">
              告别“黑盒AI”，通过模型注意力输出生成伪彩热力图层，支持 0%-100% 透明度调节与原图/热力图左右对比。
            </p>
          </div>

          <div class="med-card med-card-hover cursor-pointer" data-jump="knowledge" @click="actions.switchPage('knowledge')">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15 text-primary">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="mt-3 text-lg font-medium text-text-1">胸部健康科普</h3>
            <p class="mt-1.5 text-xs text-text-2 leading-5">
              涵盖模型 10 类与扩展 4 类胸片征象的概述、常见病因、典型症状与预防建议，并与交互式「影像小课堂」解剖热区无缝联动。
            </p>
          </div>

          <div class="med-card med-card-hover cursor-pointer" data-jump="records" @click="actions.switchPage('records')">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 class="mt-3 text-lg font-medium text-text-1">个人健康档案</h3>
            <p class="mt-1.5 text-xs text-text-2 leading-5">
              一键归档历次胸片解读报告，支持按时间范围、风险等级多维筛选、详情回溯、二次确认安全删除与规范化报告导出。
            </p>
          </div>
        </div>
      </div>

      <!-- 使用流程区：三步流程图示：上传影像 -> AI智能分析 -> 获取科普解读 -->
      <div class="med-card stagger-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-line">
          <div>
            <h2 class="text-xl font-semibold text-text-1">三步标准使用流程</h2>
            <p class="text-xs text-text-3 mt-0.5">极简交互设计，零医学背景也能轻松看懂胸片AI分析结果</p>
          </div>
          <span class="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">3 步完成 · 本地推理</span>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="relative rounded-lg border border-border-line bg-page-bg/60 p-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white text-sm font-semibold tabular-nums">01</span>
              <span class="text-xs font-medium text-primary">支持 JPG / PNG ≤ 10MB</span>
            </div>
            <h3 class="mt-3 text-base font-semibold text-text-1">上传胸部X光影像</h3>
            <p class="mt-1 text-xs text-text-2 leading-5">
              拖拽或点击上传后前位 (PA) / 前后位 (AP) 胸部X光片，或直接选用系统内置的临床典型胸片样本，系统自动完成格式与大小校验。
            </p>
          </div>

          <div class="relative rounded-lg border border-border-line bg-page-bg/60 p-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white text-sm font-semibold tabular-nums">02</span>
              <span class="text-xs font-medium text-primary">DenseNet + 模型热力</span>
            </div>
            <h3 class="mt-3 text-base font-semibold text-text-1">AI 智能特征分析</h3>
            <p class="mt-1 text-xs text-text-2 leading-5">
              神经网络自动执行肺野区域定位、10 类常见征象多标签概率测算，并同步生成可调节透明度的模型热力关注图层。
            </p>
          </div>

          <div class="relative rounded-lg border border-border-line bg-page-bg/60 p-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white text-sm font-semibold tabular-nums">03</span>
              <span class="text-xs font-medium text-success">科普联动 + 档案归档</span>
            </div>
            <h3 class="mt-3 text-base font-semibold text-text-1">获取科普解读与归档</h3>
            <p class="mt-1 text-xs text-text-2 leading-5">
              直观查看高/中/低风险定级与排序概率条形图，点击任意病种即可查阅防治科普，并可将结果保存至个人健康档案或导出报告。
            </p>
          </div>
        </div>
      </div>

      <!-- 适用场景区：3个场景卡片：体检报告解读、健康知识学习、个人健康管理 -->
      <div class="stagger-4">
        <div class="mb-3">
          <h2 class="text-xl font-semibold text-text-1">三大核心适用场景</h2>
          <p class="text-xs text-text-3 mt-0.5">贴合真实公众健康咨询与医学影像入门教学需求</p>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="med-card med-card-hover flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">场景一 · 个人与家庭</span>
                <span class="text-xs text-text-3">高频需求</span>
              </div>
              <h3 class="mt-3 text-lg font-medium text-text-1">体检报告解读</h3>
              <p class="mt-1.5 text-xs text-text-2 leading-5">
                年度体检或入职体检拿到胸片后，针对“双肺纹理增粗”、“右下肺斑片影”或“微小结节影”等专业术语，提供直观热力图定位与通俗易懂的科学解释，缓解盲目焦虑。
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-border-line flex items-center justify-between">
              <span class="text-xs text-text-3">支持 10 类常见征象筛查</span>
              <button type="button" data-jump="interpret" @click="actions.switchPage('interpret')" class="text-xs font-medium text-primary hover:underline cursor-pointer">去体验解读 →</button>
            </div>
          </div>

          <div class="med-card med-card-hover flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="rounded bg-info/15 px-2 py-0.5 text-xs font-medium text-primary">场景二 · 医学生与科普</span>
                <span class="text-xs text-text-3">图文互动</span>
              </div>
              <h3 class="mt-3 text-lg font-medium text-text-1">健康知识学习</h3>
              <p class="mt-1.5 text-xs text-text-2 leading-5">
                内置模型 10 类 + 扩展 4 类胸片征象百科与交互式「影像小课堂」，点击胸片上的气管、肺门、心影、肋膈角等解剖热点即可对照学习正常与异常征象，轻松掌握九步标准读片法。
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-border-line flex items-center justify-between">
              <span class="text-xs text-text-3">含交互解剖热区与读片自测</span>
              <button type="button" data-jump="academy" @click="actions.switchPage('academy')" class="text-xs font-medium text-primary hover:underline cursor-pointer">进入课堂 →</button>
            </div>
          </div>

          <div class="med-card med-card-hover flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">场景三 · 长期随访</span>
                <span class="text-xs text-text-3">结构化归档</span>
              </div>
              <h3 class="mt-3 text-lg font-medium text-text-1">个人健康管理</h3>
              <p class="mt-1.5 text-xs text-text-2 leading-5">
                为个人与家庭成员建立数字化胸部影像健康档案，按时间轴记录历次胸片影像、热力分布与风险评分，支持多条件筛选、前后复查对比与标准化科普报告打印。
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-border-line flex items-center justify-between">
              <span class="text-xs text-text-3">支持时间/风险多维筛选</span>
              <button type="button" data-jump="records" @click="actions.switchPage('records')" class="text-xs font-medium text-primary hover:underline cursor-pointer">管理档案 →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
</template>
