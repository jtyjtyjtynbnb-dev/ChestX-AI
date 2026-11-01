<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAppContext } from '../composables/useAppContext.js';
import { DISEASE_KNOWLEDGE_LIST } from '../stores/referenceData.js';

const ctx = useAppContext();
const { actions, store, AppState } = ctx;

const open = ref(false);
const query = ref('');
const active = ref(0);
const inputEl = ref(null);
let previousOverflow = '';

const pageDefs = [
  { key: 'home', label: '首页', desc: '产品首页与样例入口' },
  { key: 'interpret', label: '智能解读', desc: '上传胸片 / 载入样例 / AI 共脑' },
  { key: 'records', label: '健康档案', desc: '时间线、随访对比与家庭摘要' },
  { key: 'knowledge', label: '健康科普', desc: '14 个词条与报告术语速查' },
  { key: 'academy', label: '影像课堂', desc: '读片工作站、征象与自测' },
  { key: 'about', label: '关于我们', desc: '架构、边界与隐私' }
];

const actionsDefs = [
  { key: 'new-read', label: '新增一张胸片解读', desc: '跳到智能解读工作台', run: () => actions.switchPage('interpret') },
  { key: 'records', label: '打开健康档案', desc: '查看时间线与随访对比', run: () => actions.switchPage('records') },
  { key: 'academy', label: '打开影像课堂', desc: '进入读片工作站', run: () => actions.switchPage('academy') }
];

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  const match = (...values) => !q || values.some((value) => String(value || '').toLowerCase().includes(q));

  const groups = [];
  const pageItems = pageDefs
    .filter((item) => match(item.label, item.desc))
    .map((item) => ({
      key: `page-${item.key}`,
      label: item.label,
      desc: item.desc,
      kind: 'page',
      run: () => actions.switchPage(item.key)
    }));
  if (pageItems.length) groups.push({ key: 'pages', label: '页面', items: pageItems });

  const diseaseItems = DISEASE_KNOWLEDGE_LIST
    .filter((item) => match(item.name, item.shortName, item.overview, item.xrayFeature))
    .slice(0, 8)
    .map((item) => ({
      key: `disease-${item.code}`,
      label: item.shortName,
      desc: item.name,
      kind: 'disease',
      run: () => {
        AppState.selectedDiseaseCode = item.code;
        AppState.knowledge.search = '';
        actions.switchPage('knowledge');
      }
    }));
  if (diseaseItems.length) groups.push({ key: 'diseases', label: '病种与科普', items: diseaseItems });

  const recordItems = (store.records || [])
    .filter((item) => match(item.title, item.summary, item.createdAt))
    .slice(0, 6)
    .map((item) => ({
      key: `record-${item.id}`,
      label: item.title,
      desc: `${item.createdAt || ''} · ${item.summary || ''}`,
      kind: 'record',
      run: () => {
        actions.switchPage('records');
        setTimeout(() => actions.openRecordDetailModal(item), 180);
      }
    }));
  if (recordItems.length) groups.push({ key: 'records', label: '健康档案', items: recordItems });

  const actionItems = actionsDefs
    .filter((item) => match(item.label, item.desc))
    .map((item) => ({ key: `action-${item.key}`, label: item.label, desc: item.desc, kind: 'action', run: item.run }));
  if (actionItems.length) groups.push({ key: 'actions', label: '快捷操作', items: actionItems });

  return groups;
});

const flat = computed(() => results.value.flatMap((group) => group.items));

/** 搜到病种时，在结果上方给一条 AI 速答，而不是只让用户跳页 */
const aiAnswer = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (q.length < 2) return null;
  const hit = DISEASE_KNOWLEDGE_LIST.find((item) => {
    const values = [item.shortName, item.name, item.overview, item.xrayFeature].map((value) => String(value || '').toLowerCase());
    return values.some((value) => value.includes(q) || q.includes(value));
  });
  if (!hit) return null;
  const text = [hit.overview, hit.xrayFeature].filter(Boolean).join(' ').slice(0, 210);
  return { disease: hit, text };
});

watch([query, open], () => { active.value = 0; });
watch(open, (value) => {
  if (typeof document === 'undefined') return;
  if (value) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = previousOverflow;
  }
});

function openPalette() {
  open.value = true;
  query.value = '';
  nextTick(() => inputEl.value?.focus());
}
function closePalette() {
  open.value = false;
  query.value = '';
  active.value = 0;
}
function move(delta) {
  if (!flat.value.length) return;
  active.value = (active.value + delta + flat.value.length) % flat.value.length;
}
function choose(item) {
  if (!item) return;
  closePalette();
  nextTick(() => item.run());
}
function openDisease(disease) {
  closePalette();
  nextTick(() => {
    AppState.selectedDiseaseCode = disease.code;
    AppState.knowledge.search = '';
    actions.switchPage('knowledge');
  });
}
function askAi(disease) {
  closePalette();
  nextTick(() => actions.askAiQuestion(`${disease.shortName}在胸片上有什么表现？需要怎么随访？`));
}
function onOpenCommand() {
  if (!open.value) openPalette();
}
function onInputKeydown(event) {
  if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
  else if (event.key === 'Enter') { event.preventDefault(); choose(flat.value[active.value]); }
  else if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
}
function onGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    open.value ? closePalette() : openPalette();
    return;
  }
  if (!open.value) return;
  if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
}
onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
  window.addEventListener('chestx-command-open', onOpenCommand);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  window.removeEventListener('chestx-command-open', onOpenCommand);
  if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow;
});
</script>

<template>
  <button
    type="button"
    data-command-open
    class="header-search-btn"
    :aria-label="$t('搜索')"
    :title="$t('搜索页面、病种、档案与操作')"
    @click="openPalette"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="m20 20-3.5-3.5" />
    </svg>
    <span class="hidden min-[1600px]:inline">{{ $t('搜索') }}</span>
    <kbd class="hidden min-[1600px]:inline-flex">Ctrl K</kbd>
  </button>

  <Teleport to="body">
    <div v-if="open" class="command-backdrop" @mousedown.self="closePalette">
      <div class="command-panel" role="dialog" aria-modal="true" :aria-label="$t('全局搜索')">
        <div class="command-input-row">
          <svg class="h-5 w-5 flex-none text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="inputEl"
            v-model="query"
            type="search"
            class="command-input"
            :placeholder="$t('搜索页面、病种、档案或操作…')"
            @keydown="onInputKeydown"
          />
          <button type="button" class="command-close" :aria-label="$t('关闭')" @click="closePalette">
            <span>Esc</span>
          </button>
        </div>

        <div class="command-results">
          <div v-if="aiAnswer" class="command-ai">
            <div class="flex flex-wrap items-center gap-2">
              <span class="command-ai-badge">AI {{ $t('速答') }}</span>
              <strong class="text-sm text-text-1">{{ $t(aiAnswer.disease.shortName) }}</strong>
              <span class="text-3xs text-text-3">{{ $t('基于本地知识库') }}</span>
            </div>
            <p class="command-ai-text">{{ aiAnswer.text }}</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-primary btn-sm" @click="askAi(aiAnswer.disease)">{{ $t('继续问 AI') }}</button>
              <button type="button" class="btn-secondary btn-sm" @click="openDisease(aiAnswer.disease)">{{ $t('查看完整科普') }}</button>
            </div>
          </div>

          <div v-if="!flat.length" class="command-empty">
            <p>{{ $t('没有找到匹配内容') }}</p>
            <p class="mt-1 text-xs">{{ $t('试试“肺结节”“档案”或“影像课堂”') }}</p>
          </div>

          <div v-for="group in results" :key="group.key" class="command-group">
            <p class="command-group-label">{{ $t(group.label) }}</p>
            <button
              v-for="item in group.items"
              :key="item.key"
              type="button"
              class="command-item"
              :class="{ 'is-active': flat[active] === item }"
              :data-command-item="item.key"
              @mousemove="active = flat.indexOf(item)"
              @click="choose(item)"
            >
              <span class="command-icon" :data-kind="item.kind">
                <svg v-if="item.kind === 'page'" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3h9l4 4v14H6z" /><path stroke-linecap="round" d="M9 12h6M9 16h4" /></svg>
                <svg v-else-if="item.kind === 'disease'" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" /></svg>
                <svg v-else-if="item.kind === 'record'" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path stroke-linecap="round" d="M15 3v5h5" /></svg>
                <svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
              </span>
              <span class="min-w-0 flex-1 text-left">
                <span class="command-item-label">{{ $t(item.label) }}</span>
                <span class="command-item-desc">{{ $t(item.desc) }}</span>
              </span>
              <span v-if="flat[active] === item" class="command-enter">↵</span>
            </button>
          </div>
        </div>

        <div class="command-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {{ $t('选择') }}</span>
          <span><kbd>Enter</kbd> {{ $t('打开') }}</span>
          <span><kbd>Esc</kbd> {{ $t('关闭') }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.header-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  color: var(--text-2);
  font-size: var(--text-2xs);
  font-weight: 500;
  transition: border-color var(--dur-1), color var(--dur-1), background-color var(--dur-1);
}
.header-search-btn:hover { border-color: var(--brand-300); background: var(--brand-50); color: var(--brand-800); }
.header-search-btn kbd { padding: 0 5px; border-radius: 4px; border: 1px solid var(--border-subtle); background: var(--surface-sunken); color: var(--text-3); font-size: 16px; line-height: 16px; }

.command-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh 16px 16px;
  background: color-mix(in srgb, var(--ink-950) 48%, transparent);
  backdrop-filter: blur(6px);
}
.command-panel {
  display: flex;
  flex-direction: column;
  width: min(640px, 100%);
  max-height: 72vh;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  box-shadow: var(--shadow-3);
}
.command-input-row { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); }
.command-input { width: 100%; border: 0; background: transparent; color: var(--text-1); font-size: var(--text-md); outline: none; }
.command-input::placeholder { color: var(--text-3); }
.command-close { flex: none; padding: 2px 6px; border-radius: 5px; border: 1px solid var(--border-subtle); color: var(--text-3); font-size: 16px; }
.command-results { flex: 1; overflow-y: auto; padding: 6px 8px 10px; }
.command-ai { margin: 6px 2px 8px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-200); background: linear-gradient(135deg, var(--brand-50), var(--surface-card)); }
.command-ai-badge { padding: 1px 7px; border-radius: var(--radius-pill); background: var(--brand-600); color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; }
.command-ai-text { margin-top: 7px; color: var(--color-text-2); font-size: var(--text-2xs); line-height: 1.7; }
.command-group { margin-top: 4px; }
.command-group-label { padding: 6px 8px 3px; color: var(--text-3); font-size: 16px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.command-item { display: flex; width: 100%; align-items: center; gap: 9px; padding: 8px; border-radius: var(--radius-sm); text-align: left; color: var(--text-1); }
.command-item.is-active { background: var(--brand-50); }
.command-icon { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 26px; height: 26px; border-radius: 7px; background: var(--brand-50); color: var(--brand-700); }
.command-icon[data-kind='disease'] { background: color-mix(in srgb, var(--cat-nodule) 12%, white); color: var(--cat-nodule); }
.command-icon[data-kind='record'] { background: var(--risk-low-soft); color: var(--risk-low); }
.command-item-label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); font-weight: 600; }
.command-item-desc { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); font-size: 17px; }
.command-enter { flex: none; color: var(--brand-700); font-size: var(--text-sm); }
.command-empty { padding: 40px 16px; text-align: center; color: var(--text-2); }
.command-footer { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 14px; border-top: 1px solid var(--border-subtle); background: var(--surface-sunken); color: var(--text-3); font-size: 16px; }
.command-footer kbd { padding: 0 4px; border-radius: 3px; border: 1px solid var(--border-subtle); background: var(--surface-card); color: var(--text-2); font-size: 15px; }
@media (max-width: 575px) {
  .command-backdrop { padding-top: 6vh; }
  .command-panel { max-height: 82vh; }
}
@media (max-width: 479px) {
  .header-search-btn { display: none; }
}
</style>
