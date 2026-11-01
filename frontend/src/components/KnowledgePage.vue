<script setup>
import { computed, reactive, ref } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';
import { useKnowledge } from '../composables/useKnowledge.js';
import { KNOWLEDGE_EXTRA, REPORT_GLOSSARY, EXAM_GUIDE, RED_FLAGS, COMMON_MYTHS } from '../constants/knowledgeContent.js';

const k = reactive(useKnowledge(useAppContext()));

const extensionCodes = ['edema', 'emphysema', 'fibrosis', 'thickening'];
const isExtension = (code) => extensionCodes.includes(code);
const modelList = computed(() => k.filteredList.filter((item) => !isExtension(item.code)));
const extensionList = computed(() => k.filteredList.filter((item) => isExtension(item.code)));

const fallbackExtra = {
  population: '关注人群因病因不同而异，建议结合年龄、吸烟史、职业暴露与基础疾病综合评估。',
  followUp: '按医生建议复查胸片或进一步做胸部 CT；不要仅凭一次影像自行判断。',
  whenToSeeDoctor: '出现持续咳嗽、胸痛、咯血、发热或呼吸困难加重时，应及时就医。',
  myths: ['胸片正常不代表完全健康。', '影像提示异常不等于确诊，需要结合临床。'],
  keyNumbers: [{ label: '影像类型', value: 'PA 胸片' }, { label: '建议', value: '结合临床' }]
};
const extra = computed(() => KNOWLEDGE_EXTRA[k.activeItem.code] || fallbackExtra);

const sections = computed(() => [
  { key: 'overview', no: '01', title: '疾病概述', text: k.activeItem.overview, icon: 'book' },
  { key: 'xray', no: '02', title: '影像表现', text: k.activeItem.xrayFeature, icon: 'scan' },
  { key: 'causes', no: '03', title: '常见病因', text: k.activeItem.causes, icon: 'search' },
  { key: 'population', no: '04', title: '易感人群', text: extra.value.population, icon: 'people' },
  { key: 'symptoms', no: '05', title: '典型症状', text: k.activeItem.symptoms, icon: 'pulse' },
  { key: 'followUp', no: '06', title: '检查与随访', text: extra.value.followUp, icon: 'calendar' },
  { key: 'prevention', no: '07', title: '预防与就医', text: k.activeItem.prevention, icon: 'shield' },
  { key: 'doctor', no: '08', title: '何时就医', text: extra.value.whenToSeeDoctor, icon: 'alert', accent: true }
]);

const readMinutes = computed(() => Math.max(2, Math.round(String(k.activeItem.overview || '').length / 120) + 1));
const indexNo = computed(() => {
  const index = k.filteredList.findIndex((item) => item.code === k.activeItem.code);
  return String(Math.max(0, index) + 1).padStart(2, '0');
});

const extendedTab = ref('glossary');
const extendedTabs = [
  { key: 'glossary', label: '报告术语速查' },
  { key: 'exam', label: '检查前后' },
  { key: 'redflags', label: '就医信号' },
  { key: 'myths', label: '常见误区' }
];
</script>

<template>
  <section id="page-knowledge" class="page-view active knowledge-page space-y-4">

    <!-- ══ Hero ═════════════════════════════════════════════════ -->
    <div class="kb-hero">
      <div class="kb-hero-glow" aria-hidden="true"></div>
      <div class="grid items-end gap-7 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <span class="kb-eyebrow">HEALTH LIBRARY · {{ $t('胸部X光疾病科普库') }}</span>
          <h1 class="kb-title">{{ $t('把胸片报告，读成看得懂的健康知识') }}</h1>
          <p class="kb-desc">{{ $t('14 个胸片词条、报告术语速查、检查指南与就医信号——从影像表现到下一步怎么做。') }}</p>
          <div class="kb-stats">
            <span><strong>14</strong> {{ $t('科普词条') }}</span>
            <span><strong>10</strong> {{ $t('模型类') }}</span>
            <span><strong>4</strong> {{ $t('扩展科普') }}</span>
            <span><strong>40</strong> {{ $t('循证来源') }}</span>
          </div>
        </div>
        <div class="lg:col-span-5">
          <div class="kb-search-card">
            <label for="knowledgeSearchInput" class="text-3xs font-semibold uppercase tracking-[0.12em] text-brand-300">{{ $t('搜索词条') }}</label>
            <div class="kb-search">
              <svg class="h-4 w-4 flex-none text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="m20 20-3.5-3.5" /></svg>
              <input id="knowledgeSearchInput" v-model="k.state.search" type="search" :placeholder="$t('knowledgeSearch')" />
            </div>
            <p class="mt-2 text-3xs text-film-dim">{{ $t('支持病种、症状与影像术语，例如「斑片影」「结节」「心影增大」。') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">

      <!-- ══ 左：词条索引 ═══════════════════════════════════════ -->
      <aside id="knowledgeNavList" class="kb-nav lg:col-span-4 xl:col-span-3 lg:sticky lg:top-[76px]">
        <div class="kb-nav-head">
          <span class="text-2xs font-semibold uppercase tracking-[0.12em] text-text-3">{{ $t('词条索引') }}</span>
          <span class="text-2xs text-text-3 tnum">{{ k.filteredList.length }} / 14</span>
        </div>

        <div class="p-1.5">
          <p class="kb-nav-group">{{ $t('模型 10 类') }}</p>
          <button
            v-for="(d, idx) in modelList"
            :key="d.code"
            type="button"
            :data-disease-code="d.code"
            class="kb-item"
            :class="{ 'is-active': d.code === k.activeItem.code }"
            @click="k.selectDisease(d.code)"
          >
            <span class="kb-item-no tnum">{{ String(idx + 1).padStart(2, '0') }}</span>
            <span class="h-1.5 w-1.5 flex-none rounded-full" :style="{ backgroundColor: k.getRiskStyle(d.severity).color }"></span>
            <span class="min-w-0 flex-1 truncate">{{ $t(d.shortName) }}</span>
            <span class="kb-item-risk" :class="k.getRiskStyle(d.severity).badgeClass">{{ $t(k.getRiskStyle(d.severity).shortLabel) }}</span>
          </button>
          <p v-if="!modelList.length" class="px-3 py-4 text-center text-xs text-text-3">{{ $t('没有匹配的病种') }}</p>

          <template v-if="extensionList.length">
            <p class="kb-nav-group mt-1">{{ $t('扩展科普 4 类') }} · {{ $t('不在模型输出内') }}</p>
            <button
              v-for="d in extensionList"
              :key="d.code"
              type="button"
              :data-disease-code="d.code"
              class="kb-item"
              :class="{ 'is-active': d.code === k.activeItem.code }"
              @click="k.selectDisease(d.code)"
            >
              <span class="kb-item-no"></span>
              <span class="h-1.5 w-1.5 flex-none rounded-full bg-ink-300"></span>
              <span class="min-w-0 flex-1 truncate">{{ $t(d.shortName) }}</span>
            </button>
          </template>
        </div>

        <div class="kb-nav-tip">
          <p>{{ $t('本页是健康科普，不是诊断工具。') }}</p>
          <button type="button" class="mt-1 text-2xs font-semibold text-brand-700" @click="k.toInterpret">{{ $t('去解读台体验') }} →</button>
        </div>
      </aside>

      <!-- ══ 右：正文 ═══════════════════════════════════════════ -->
      <div id="knowledgeDetailBox" class="min-w-0 space-y-4 lg:col-span-8 xl:col-span-9">

        <!-- 标题 + 快速事实 -->
        <header class="kb-article-head">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="kb-index tnum">{{ $t('词条') }} {{ indexNo }} / 14</span>
                <span class="kb-risk" :class="k.activeRisk.badgeClass">{{ $t(k.activeRisk.shortLabel) }}</span>
                <span class="text-2xs text-text-3">{{ readMinutes }} {{ $t('分钟阅读') }}</span>
              </div>
              <h2 class="kb-article-title">{{ $t(k.activeItem.name) }}</h2>
              <p class="mt-1 max-w-[62ch] text-sm leading-relaxed text-text-2">{{ $t(k.activeItem.overview) }}</p>
            </div>
            <button type="button" id="knowledgeToInterpretBtn" class="btn-secondary btn-sm flex-none" @click="k.toInterpret">{{ $t('在解读台体验') }}</button>
          </div>

          <div class="kb-facts">
            <div v-for="item in extra.keyNumbers" :key="item.label" class="kb-fact">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="kb-fact kb-fact--wide">
              <span>{{ $t('典型影像特征') }}</span>
              <strong class="font-medium">{{ $t(k.activeItem.xrayFeature) }}</strong>
            </div>
          </div>
        </header>

        <!-- 影像观察 -->
        <section class="kb-image-card" aria-labelledby="knowledgeImageHeading">
          <div class="kb-card-head">
            <div>
              <h3 id="knowledgeImageHeading" class="text-sm font-semibold text-text-1">{{ $t(k.activeItem.shortName + '影像互动观察') }}</h3>
              <p class="text-3xs text-text-3">{{ $t('点击影像上的编号，查看对应观察提示') }}</p>
            </div>
            <span class="tag">{{ k.activeItem.imageType }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-5">
            <div data-surface="film" class="kb-image-stage md:col-span-3">
              <div class="kb-image-grid" aria-hidden="true"></div>
              <img id="knowledgeDiseaseImage" :src="k.activeItem.image" :alt="k.activeItem.imageAlt" loading="lazy" />
              <div id="knowledgeHotspots" role="group" :aria-label="$t('影像交互观察点')" class="pointer-events-none absolute inset-3">
                <button
                  v-for="(spot, index) in k.activeItem.hotspots"
                  :key="index"
                  type="button"
                  class="knowledge-hotspot pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-2xs font-bold transition-transform duration-150"
                  :class="index === k.state.hotspot
                    ? 'scale-110 border-white bg-brand-500 text-white shadow-lg'
                    : 'border-brand-400 bg-ink-950/85 text-brand-300 hover:scale-105'"
                  :style="{ left: spot.x + '%', top: spot.y + '%' }"
                  :data-hotspot-index="index"
                  :aria-label="`观察点 ${index + 1}：${spot.title}`"
                  :aria-pressed="index === k.state.hotspot"
                  @click="k.selectHotspot(index)"
                >{{ index + 1 }}</button>
              </div>
              <span class="kb-image-pa">PA</span>
            </div>

            <div class="flex flex-col justify-between gap-3 p-4 md:col-span-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-3xs font-bold text-white tnum">{{ k.state.hotspot + 1 }}</span>
                  <h4 id="knowledgeImageNoteTitle" class="text-sm font-semibold text-text-1">{{ $t(k.activeHotspot.title) }}</h4>
                </div>
                <p id="knowledgeImageNote" class="mt-2 text-xs leading-relaxed text-text-2" aria-live="polite">{{ $t(k.activeHotspot.text) }}</p>
                <div class="mt-3 flex flex-wrap gap-1">
                  <button
                    v-for="(spot, index) in k.activeItem.hotspots"
                    :key="'nav-' + index"
                    type="button"
                    class="h-6 w-6 rounded border text-3xs font-semibold tnum transition-colors duration-150"
                    :class="index === k.state.hotspot ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-border-line text-text-3 hover:text-text-1'"
                    @click="k.selectHotspot(index)"
                  >{{ index + 1 }}</button>
                </div>
              </div>
              <div class="space-y-2 border-t border-border-line pt-3">
                <p class="text-3xs leading-relaxed text-text-3">{{ $t('影像仅作科普与教学展示，标记点用于说明，不代表 AI 病灶定位或诊断。') }}</p>
                <a :href="k.activeItem.imageSource" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-2xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{{ $t('查看原图与授权来源') }} ↗</a>
              </div>
            </div>
          </div>
        </section>

        <!-- 一分钟看懂 -->
        <section class="kb-quick">
          <div class="kb-quick-head">
            <span class="kb-quick-badge">{{ $t('一分钟看懂') }}</span>
            <span class="text-3xs text-text-3">{{ $t('先记住这三件事') }}</span>
          </div>
          <div class="kb-quick-grid">
            <div class="kb-quick-item">
              <span class="kb-quick-no">01</span>
              <h4>{{ $t('影像上看到什么') }}</h4>
              <p>{{ $t(k.activeItem.xrayFeature) }}</p>
            </div>
            <div class="kb-quick-item">
              <span class="kb-quick-no">02</span>
              <h4>{{ $t('谁更需要关注') }}</h4>
              <p>{{ extra.population }}</p>
            </div>
            <div class="kb-quick-item kb-quick-item--alert">
              <span class="kb-quick-no">03</span>
              <h4>{{ $t('什么时候必须就医') }}</h4>
              <p>{{ extra.whenToSeeDoctor }}</p>
            </div>
          </div>
        </section>

        <!-- 八段正文 -->
        <div class="kb-section-grid">
          <article v-for="section in sections" :key="section.key" class="kb-section" :class="{ 'is-alert': section.accent }">
            <div class="kb-section-head">
              <span class="kb-section-no tnum">{{ section.no }}</span>
              <h3>{{ $t(section.title) }}</h3>
            </div>
            <p class="kb-section-text">{{ $t(section.text) }}</p>
          </article>
        </div>

        <!-- 常见误区 -->
        <section class="kb-myths">
          <div class="kb-card-head">
            <div>
              <h3 class="text-sm font-semibold text-text-1">{{ $t('关于这个征象，最常见的两个误区') }}</h3>
              <p class="text-3xs text-text-3">{{ $t('先分清「影像提示」与「临床诊断」') }}</p>
            </div>
            <span class="tag border-warning-line bg-warning-soft text-warning-strong">{{ $t('常见误区') }}</span>
          </div>
          <div class="kb-myth-grid">
            <div v-for="(myth, index) in extra.myths" :key="index" class="kb-myth">
              <span class="kb-myth-mark">×</span>
              <p>{{ myth }}</p>
            </div>
          </div>
        </section>

        <!-- 延伸阅读：术语 / 检查 / 就医 / 误区 -->
        <section class="kb-extended">
          <div class="kb-card-head">
            <div>
              <h3 class="text-sm font-semibold text-text-1">{{ $t('延伸阅读 · 一页带走') }}</h3>
              <p class="text-3xs text-text-3">{{ $t('报告术语、检查准备、就医信号与通用误区') }}</p>
            </div>
            <div class="kb-ext-tabs" role="tablist" :aria-label="$t('延伸阅读')">
              <button
                v-for="tab in extendedTabs"
                :key="tab.key"
                type="button"
                role="tab"
                :aria-selected="extendedTab === tab.key"
                :class="{ 'is-active': extendedTab === tab.key }"
                @click="extendedTab = tab.key"
              >{{ $t(tab.label) }}</button>
            </div>
          </div>

          <div v-if="extendedTab === 'glossary'" class="kb-glossary">
            <div v-for="item in REPORT_GLOSSARY" :key="item.term" class="kb-glossary-item">
              <h4>{{ item.term }}</h4>
              <p>{{ item.plain }}</p>
            </div>
          </div>

          <div v-else-if="extendedTab === 'exam'" class="kb-exam">
            <div v-for="(item, index) in EXAM_GUIDE" :key="item.title" class="kb-exam-item">
              <span class="kb-exam-no tnum">{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <h4>{{ item.title }}</h4>
                <p>{{ item.desc }}</p>
              </div>
            </div>
          </div>

          <div v-else-if="extendedTab === 'redflags'" class="kb-redflags">
            <div v-for="flag in RED_FLAGS" :key="flag" class="kb-redflag">
              <span>!</span>
              <p>{{ flag }}</p>
            </div>
            <p class="mt-3 rounded-md border border-danger-line bg-danger-soft p-3 text-2xs leading-relaxed text-danger-strong">
              {{ $t('出现以上任一情况，请立即前往急诊或拨打急救电话，不要等待 AI 结果。') }}
            </p>
          </div>

          <div v-else class="kb-myth-list">
            <div v-for="item in COMMON_MYTHS" :key="item.myth" class="kb-myth-row">
              <div class="kb-myth-q">
                <span>误区</span>
                <p>{{ item.myth }}</p>
              </div>
              <div class="kb-myth-a">
                <span>事实</span>
                <p>{{ item.fact }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 底部：相关词条 + CTA -->
        <div class="kb-footer">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-text-1">{{ $t('想在真实胸片上对比解剖部位？') }}</p>
              <p class="mt-0.5 text-2xs text-text-3">{{ $t('去影像小课堂，用工作台查看热区、征象与九步读片法。') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="knowledgeToAcademySignsBtn" class="btn-primary btn-sm" @click="k.toAcademy">{{ $t('去影像小课堂看示例') }} →</button>
              <button type="button" class="btn-secondary btn-sm" @click="k.toInterpret">{{ $t('去解读台体验') }}</button>
            </div>
          </div>

          <div class="mt-3 border-t border-border-line pt-3">
            <p class="text-2xs font-medium text-text-3">{{ $t('相关征象') }}</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <button
                v-for="related in k.filteredList.filter(item => item.code !== k.activeItem.code).slice(0, 8)"
                :key="related.code"
                type="button"
                class="rounded-full border border-border-line px-2.5 py-0.5 text-3xs text-text-2 transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                @click="k.selectDisease(related.code)"
              >{{ $t(related.shortName) }}</button>
            </div>
          </div>

          <p class="mt-3 border-t border-border-line pt-2 text-3xs leading-relaxed text-text-3">
            {{ $t('内容仅供健康科普参考，不构成诊断或治疗建议；具体诊疗请遵循医生意见。') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ══ Hero ══════════════════════════════════════════════════════ */
.kb-hero {
  position: relative;
  overflow: hidden;
  padding: 24px 28px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--film-line);
  background:
    radial-gradient(680px 340px at 8% -20%, color-mix(in srgb, var(--brand-500) 22%, transparent), transparent 62%),
    radial-gradient(520px 300px at 96% 10%, color-mix(in srgb, var(--cat-effusion) 14%, transparent), transparent 62%),
    linear-gradient(135deg, var(--film-850) 0%, var(--film-panel) 55%, var(--film-850) 100%);
  box-shadow: var(--shadow-3);
}
.kb-hero-glow { position: absolute; inset: -30% -10% auto; height: 70%; background: radial-gradient(36% 50% at 20% 30%, color-mix(in srgb, var(--brand-500) 24%, transparent), transparent 70%); filter: blur(38px); pointer-events: none; }
.kb-eyebrow { position: relative; color: var(--brand-300); font-size: var(--text-3xs); font-weight: 700; letter-spacing: 0.14em; }
.kb-title { position: relative; margin-top: 6px; font-size: clamp(22px, 2.8vw, 30px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: var(--film-text); }
.kb-desc { position: relative; max-width: 58ch; margin-top: 8px; font-size: var(--text-sm); line-height: 1.7; color: var(--film-dim); }
.kb-stats { position: relative; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.kb-stats span { padding: 4px 10px; border-radius: var(--radius-pill); border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-raise) 48%, transparent); color: var(--film-dim); font-size: var(--text-3xs); }
.kb-stats strong { color: var(--brand-300); font-size: var(--text-2xs); }
.kb-search-card { position: relative; padding: 14px; border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--film-line) 82%, transparent); background: color-mix(in srgb, var(--film-950) 50%, transparent); }
.kb-search { display: flex; align-items: center; gap: 7px; margin-top: 6px; padding: 0 10px; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--film-line); background: color-mix(in srgb, var(--film-panel) 76%, transparent); }
.kb-search:focus-within { border-color: var(--brand-400); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-400) 16%, transparent); }
.kb-search input { width: 100%; border: 0; background: transparent; color: var(--film-text); font-size: var(--text-xs); outline: none; }
.kb-search input::placeholder { color: var(--film-dim); }

/* ══ 左导航 ═════════════════════════════════════════════════════ */
.kb-nav { overflow: hidden; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.kb-nav-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); }
.kb-nav-group { padding: 6px 8px 3px; color: var(--color-text-3); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.kb-item { display: flex; width: 100%; align-items: center; gap: 7px; padding: 8px; border-radius: var(--radius-sm); color: var(--color-text-1); font-size: var(--text-2xs); text-align: left; }
.kb-item:hover { background: var(--surface-hover); }
.kb-item.is-active { background: var(--brand-50); color: var(--brand-900); }
.kb-item-no { width: 18px; flex: none; color: var(--color-text-3); font-size: var(--text-xs); font-weight: 600; }
.kb-item.is-active .kb-item-no { color: var(--brand-700); }
.kb-item-risk { flex: none; padding: 0 5px; border-radius: 4px; border: 1px solid; font-size: var(--text-xs); font-weight: 600; }
.kb-nav-tip { padding: 10px 12px; border-top: 1px solid var(--border-subtle); background: var(--surface-sunken); color: var(--color-text-3); font-size: var(--text-xs); line-height: 1.6; }

/* ══ 文章头 ════════════════════════════════════════════════════ */
.kb-article-head { padding: 22px 24px 18px; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.kb-index { padding: 1px 7px; border-radius: var(--radius-pill); background: var(--brand-50); color: var(--brand-800); font-size: var(--text-xs); font-weight: 700; }
.kb-risk { padding: 1px 8px; border-radius: var(--radius-pill); border: 1px solid; font-size: var(--text-xs); font-weight: 600; }
.kb-article-title { margin-top: 7px; font-size: clamp(24px, 2.8vw, 30px); font-weight: 700; letter-spacing: -0.02em; color: var(--color-text-1); }
.kb-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
@media (min-width: 768px) { .kb-facts { grid-template-columns: 1.1fr 1.1fr 2fr; } }
.kb-fact { padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-sunken); }
.kb-fact span { display: block; color: var(--color-text-3); font-size: var(--text-xs); }
.kb-fact strong { display: block; margin-top: 3px; color: var(--color-text-1); font-size: var(--text-md); font-weight: 700; line-height: 1.45; }
.kb-fact--wide { grid-column: span 2; }
@media (min-width: 768px) { .kb-fact--wide { grid-column: auto; } .kb-fact--wide strong { font-size: var(--text-2xs); font-weight: 500; } }

/* ══ 影像卡 ════════════════════════════════════════════════════ */
.kb-image-card { overflow: hidden; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.kb-card-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
.kb-image-stage { position: relative; display: flex; min-height: 300px; align-items: center; justify-content: center; overflow: hidden; background: var(--film-bg); padding: 8px; }
.kb-image-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
.kb-image-stage img { position: relative; max-height: 380px; width: 100%; object-fit: contain; }
.kb-image-pa { position: absolute; left: 8px; top: 8px; padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, var(--ink-950) 80%, transparent); color: var(--brand-300); font-size: var(--text-xs); font-weight: 700; }

/* ══ 一分钟 ════════════════════════════════════════════════════ */
.kb-quick { padding: 16px 18px; border-radius: var(--radius-xl); border: 1px solid var(--brand-200); background: linear-gradient(180deg, var(--brand-50) 0%, var(--surface-card) 100%); }
.kb-quick-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.kb-quick-badge { padding: 2px 8px; border-radius: var(--radius-pill); background: var(--brand-600); color: #fff; font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.06em; }
.kb-quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
.kb-quick-item { padding: 10px 12px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--surface-card) 80%, transparent); border: 1px solid var(--border-subtle); }
.kb-quick-item--alert { border-color: var(--risk-high-line); background: var(--risk-high-soft); }
.kb-quick-no { color: var(--brand-600); font-size: var(--text-xs); font-weight: 700; }
.kb-quick-item h4 { margin-top: 3px; font-size: var(--text-2xs); font-weight: 600; color: var(--color-text-1); }
.kb-quick-item p { margin-top: 3px; font-size: var(--text-2xs); line-height: 1.7; color: var(--color-text-2); }

/* ══ 八段正文 ══════════════════════════════════════════════════ */
.kb-section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.kb-section { padding: 14px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.kb-section.is-alert { border-color: var(--risk-high-line); background: linear-gradient(180deg, var(--risk-high-soft) 0%, var(--surface-card) 100%); }
.kb-section-head { display: flex; align-items: baseline; gap: 7px; }
.kb-section-no { color: var(--brand-700); font-size: var(--text-xs); font-weight: 700; }
.kb-section h3 { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1); }
.kb-section-text { margin-top: 6px; font-size: var(--text-xs); line-height: 1.85; color: var(--color-text-2); text-wrap: pretty; }

/* ══ 误区 / 延伸 ═══════════════════════════════════════════════ */
.kb-myths, .kb-extended, .kb-footer { border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); background: var(--surface-card); box-shadow: var(--shadow-1); }
.kb-myth-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 12px 16px 16px; }
.kb-myth { display: flex; gap: 8px; padding: 9px 10px; border-radius: var(--radius-md); border: 1px solid var(--risk-mid-line); background: var(--risk-mid-soft); }
.kb-myth-mark { flex: none; color: var(--risk-mid-strong); font-size: var(--text-sm); font-weight: 700; line-height: 1.2; }
.kb-myth p { color: var(--risk-mid-strong); font-size: var(--text-2xs); line-height: 1.65; }

.kb-ext-tabs { display: flex; flex-wrap: wrap; gap: 3px; padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--surface-sunken); }
.kb-ext-tabs button { height: 26px; padding: 0 8px; border-radius: 5px; color: var(--color-text-2); font-size: var(--text-xs); font-weight: 600; }
.kb-ext-tabs button.is-active { background: var(--surface-card); color: var(--color-text-1); box-shadow: var(--shadow-1); }
.kb-glossary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 12px 16px 16px; }
.kb-glossary-item { padding: 9px 10px; border-radius: var(--radius-md); background: var(--surface-sunken); }
.kb-glossary-item h4 { color: var(--color-text-1); font-size: var(--text-2xs); font-weight: 600; }
.kb-glossary-item p { margin-top: 2px; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.7; }
.kb-exam { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 12px 16px 16px; }
.kb-exam-item { display: flex; gap: 8px; padding: 9px 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); }
.kb-exam-no { color: var(--brand-600); font-size: var(--text-xs); font-weight: 700; }
.kb-exam-item h4 { font-size: var(--text-2xs); font-weight: 600; color: var(--color-text-1); }
.kb-exam-item p { margin-top: 2px; color: var(--color-text-2); font-size: var(--text-xs); line-height: 1.65; }
.kb-redflags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 12px 16px 16px; }
.kb-redflag { display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--risk-high-line); background: var(--risk-high-soft); }
.kb-redflag span { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--risk-high); color: #fff; font-size: var(--text-xs); font-weight: 700; flex: none; }
.kb-redflag p { color: var(--risk-high-strong); font-size: var(--text-xs); line-height: 1.55; }
.kb-redflags > p { grid-column: 1 / -1; }
.kb-myth-list { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
.kb-myth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kb-myth-q, .kb-myth-a { padding: 8px 10px; border-radius: var(--radius-md); }
.kb-myth-q { background: var(--risk-mid-soft); border: 1px solid var(--risk-mid-line); }
.kb-myth-a { background: var(--risk-low-soft); border: 1px solid var(--risk-low-line); }
.kb-myth-q span, .kb-myth-a span { font-size: var(--text-xs); font-weight: 700; }
.kb-myth-q span { color: var(--risk-mid-strong); }
.kb-myth-a span { color: var(--risk-low-strong); }
.kb-myth-q p, .kb-myth-a p { margin-top: 2px; font-size: var(--text-xs); line-height: 1.6; }
.kb-myth-q p { color: var(--risk-mid-strong); }
.kb-myth-a p { color: var(--risk-low-strong); }

.kb-footer { padding: 16px; }

@media (max-width: 991px) {
  .kb-quick-grid, .kb-section-grid, .kb-myth-grid, .kb-glossary, .kb-exam, .kb-redflags, .kb-myth-row { grid-template-columns: 1fr; }
  .kb-hero { padding: 20px; }
}
@media (max-width: 575px) {
  .kb-facts { grid-template-columns: 1fr; }
  .kb-fact--wide { grid-column: auto; }
  .kb-article-head { padding: 16px; }
  .kb-image-stage { min-height: 240px; }
  .kb-ext-tabs button { font-size: var(--text-xs); }
}
</style>
