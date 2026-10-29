<script setup>
import { reactive } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';
import { useAcademy } from '../composables/useAcademy.js';
const a = reactive(useAcademy(useAppContext()));
const tabs = [['basics','胸片基础 (解剖交互)'],['signs','常见征象 (典型图例)'],['guide','读片入门 (九步法+自测)']];
const selectedIndex = (disease) => a.state.hotspots[disease.code] || 0;
const selectedNote = (disease) => disease.hotspots[selectedIndex(disease)] || disease.hotspots[0];
const riskTextColor = (risk) => a.getRiskStyle(risk).level === 'HIGH' ? '#991B1B' : a.getRiskStyle(risk).level === 'MEDIUM' ? '#92400E' : '#166534';
function optionStyle(q, idx) {
  if (typeof a.quizChosen(q.id) === 'number') {
    if (idx === q.answerIndex) return 'border-success bg-success/10 text-success font-semibold';
    if (idx === a.quizChosen(q.id)) return 'border-danger bg-danger/10 text-danger';
  }
  return 'border-border-line bg-white text-text-2 hover:border-primary';
}
</script>

<template>
  <section id="page-academy" class="page-view active space-y-6">
    <div class="med-card flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><div class="flex items-center gap-2"><h1 class="text-xl font-semibold text-text-1">影像小课堂 · 交互式胸片读片教学</h1><span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">互动教学模块</span></div><p class="text-xs text-text-3 mt-0.5">图文结合 + 解剖热点点按交互，帮助非医学专业用户与医学生快速建立胸片读片思维</p></div>
      <div class="flex items-center gap-1.5 rounded-lg bg-page-bg p-1 border border-border-line">
        <button v-for="[key,label] in tabs" :key="key" type="button" :data-academy-tab="key" class="academy-tab-btn rounded-md px-3.5 py-1.5 text-xs cursor-pointer transition-all" :class="a.state.tab===key?'font-semibold bg-primary text-white':'font-medium text-text-2 hover:text-text-1'" @click="a.switchAcademyTab(key)">{{ label }}</button>
      </div>
    </div>

    <div id="academy-tab-basics" class="academy-tab-panel grid grid-cols-1 gap-6 lg:grid-cols-12 items-start" :class="{hidden:a.state.tab!=='basics'}">
      <div class="med-card lg:col-span-7 space-y-3">
        <div class="flex items-center justify-between"><h2 class="text-base font-semibold text-text-1">标准后前位 (PA) 胸片交互式解剖图谱</h2><span class="text-xs text-primary font-medium">💡 请点击胸片上的蓝色数字热点查看解剖释义</span></div>
        <div class="relative mx-auto h-[420px] w-full max-w-[440px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 select-none">
          <img src="/assets/sample_3.jpg" alt="标准正位胸片解剖标注底图" loading="lazy" decoding="async" class="h-full w-full object-contain" />
          <div id="anatomyHotspotsLayer" class="absolute inset-0">
            <button v-for="spot in a.anatomyHotspots" :key="spot.id" type="button" :data-spot-id="spot.id" :style="{left:spot.x+'%',top:spot.y+'%'}" class="anatomy-spot-btn absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer focus:outline-none" :title="spot.name" @click="a.selectSpot(spot.id)">
              <span class="hotspot-ring absolute inset-0 rounded-full" :class="spot.id===a.currentSpot.id?'bg-warning':'bg-primary'"></span><span class="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow" :class="spot.id===a.currentSpot.id?'bg-warning scale-110':'bg-primary'">{{spot.id}}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="med-card lg:col-span-5 space-y-4" id="anatomySpotDetailCard">
        <div class="flex items-center justify-between border-b border-border-line pb-3"><div class="flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold tabular-nums">{{ a.currentSpot.id }}</span><h3 class="text-base font-semibold text-text-1">{{ a.currentSpot.name }}</h3></div><span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">解剖热区详解</span></div>
        <div class="space-y-3 text-xs leading-5">
          <div class="rounded-md bg-success/5 border border-success/20 p-3"><div class="font-semibold text-success mb-1">✓ 正常胸片影像表现</div><p class="text-text-1">{{ a.currentSpot.normal }}</p></div>
          <div class="rounded-md bg-warning/5 border border-warning/20 p-3"><div class="font-semibold text-warning mb-1">! 常见异常病变征象</div><p class="text-text-1">{{ a.currentSpot.abnormal }}</p></div>
          <div class="rounded-md bg-primary/5 border border-primary/20 p-3"><div class="font-semibold text-primary mb-1">💡 放射科读片实战要点</div><p class="text-text-1">{{ a.currentSpot.tip }}</p></div>
        </div>
        <div class="pt-2 border-t border-border-line"><div class="text-xs text-text-3 mb-2">快速切换全部 8 个解剖部位：</div><div class="flex flex-wrap gap-1.5"><button v-for="spot in a.anatomyHotspots" :key="spot.id" type="button" :data-quick-spot="spot.id" class="quick-spot-btn rounded px-2.5 py-1 text-xs cursor-pointer transition-colors" :class="spot.id===a.currentSpot.id?'bg-primary text-white font-medium':'bg-page-bg text-text-2 hover:text-primary'" @click="a.selectSpot(spot.id)">{{spot.id}}. {{spot.name.split(' ')[0]}}</button></div></div>
      </div>
    </div>

    <div id="academy-tab-signs" class="academy-tab-panel space-y-4" :class="{hidden:a.state.tab!=='signs'}">
      <h2 class="text-base font-semibold text-text-1">胸片征象影像讲解（模型 10 类 + 扩展）</h2><p class="text-xs text-text-2">点击每张示例影像上的编号标记查看观察提示。影像和标注仅供科普教学，不作为诊断依据。</p>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" id="academySignsGrid">
        <article v-for="sg in a.academySigns" :key="sg.disease.code" class="med-card med-card-hover flex flex-col justify-between space-y-3" :data-sign-card="sg.disease.code">
          <div class="space-y-2"><div class="flex items-center justify-between"><span class="rounded border px-2 py-0.5 text-xs font-medium" :class="a.getRiskStyle(sg.risk).badgeClass" :style="{color:riskTextColor(sg.risk)}">{{sg.tag}}</span><span class="text-xs text-text-2">典型征象</span></div><h3 class="text-base font-semibold text-text-1">{{sg.title}}</h3><p class="text-xs text-text-2 leading-5">{{sg.desc}}</p></div>
          <div class="relative h-48 w-full overflow-hidden rounded-md bg-slate-950"><img :src="sg.disease.image" :alt="sg.disease.imageAlt" loading="lazy" decoding="async" class="h-full w-full object-contain" /><div class="pointer-events-none absolute inset-0" :aria-label="sg.disease.shortName+'观察点'" role="group"><button v-for="(spot,index) in sg.disease.hotspots" :key="index" type="button" class="academy-sign-hotspot pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" :class="index===selectedIndex(sg.disease)?'scale-110 ring-4 ring-primary/50':''" :style="{left:spot.x+'%',top:spot.y+'%'}" :data-hotspot-index="index" :aria-label="sg.disease.shortName+'观察点 '+(index+1)+'：'+spot.title" :aria-pressed="index===selectedIndex(sg.disease)" @click="a.selectSignHotspot(sg.disease.code,index)">{{index+1}}</button></div></div>
          <div class="min-h-20 rounded-md border border-primary/20 bg-primary/[0.04] p-3"><h4 class="academy-sign-note-title text-xs font-semibold text-text-1">{{selectedNote(sg.disease).title}}</h4><p class="academy-sign-note mt-1 text-[11px] leading-5 text-text-2" aria-live="polite">{{selectedNote(sg.disease).text}}</p></div>
          <div class="rounded bg-page-bg p-2.5 text-[11px] text-text-2 border border-border-line"><strong class="text-text-1">临床意义：</strong>{{sg.clinical}}</div><a :href="sg.disease.imageSource" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-primary underline underline-offset-2">查看影像来源 ↗</a>
        </article>
      </div>
    </div>

    <div id="academy-tab-guide" class="academy-tab-panel space-y-6" :class="{hidden:a.state.tab!=='guide'}">
      <div class="med-card"><h2 class="text-lg font-semibold text-text-1">放射科标准“九步读片法” (ABCDEF口诀扩展)</h2><p class="text-xs text-text-3 mt-0.5">养成固定顺序的阅片习惯，避免遗漏肋膈角、心后区或肺尖部隐匿病变</p><div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" id="nineStepGuideGrid"><div v-for="g in a.nineSteps" :key="g.step" class="rounded-lg border border-border-line bg-page-bg/60 p-3.5"><div class="flex items-center gap-2"><span class="rounded bg-primary text-white px-2 py-0.5 text-xs font-semibold tabular-nums">{{g.step}}</span><h4 class="text-sm font-semibold text-text-1">{{g.title}}</h4></div><p class="mt-1.5 text-xs text-text-2 leading-5">{{g.desc}}</p></div></div></div>
      <div class="med-card border-primary/20"><div class="flex items-center justify-between border-b border-border-line pb-3"><div><h3 class="text-lg font-semibold text-text-1">读片入门动动小测验</h3><p class="text-xs text-text-3">点击选项即时验证您的胸片基础知识掌握情况</p></div><span id="quizScoreBadge" class="rounded bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">已答对 {{a.score}} / {{a.quizzes.length}} 题</span></div>
        <div id="academyQuizContainer" class="mt-4 space-y-4"><div v-for="q in a.quizzes" :key="q.id" class="rounded-lg border border-border-line p-4 space-y-2.5"><div class="text-sm font-semibold text-text-1">{{q.question}}</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2"><button v-for="(opt,idx) in q.options" :key="idx" type="button" :data-quiz-id="q.id" :data-opt-idx="idx" class="quiz-opt-btn rounded-md border px-3 py-2 text-left text-xs cursor-pointer transition-all" :class="optionStyle(q,idx)" @click="a.answerQuiz(q.id,idx)">{{opt}}</button></div><div v-if="typeof a.quizChosen(q.id)==='number'" class="rounded p-2.5 text-xs" :class="a.quizChosen(q.id)===q.answerIndex?'bg-success/10 text-success':'bg-warning/10 text-text-1'">{{q.explanation}}</div></div></div>
      </div>
    </div>
  </section>
</template>
