<script setup>
import { reactive } from 'vue';
import { useModals } from '../composables/useModals.js';
import RecordDetailBody from './RecordDetailBody.vue';
import ChartCanvas from './ChartCanvas.vue';

const { AppState, modules } = useModals();
const family = modules.family;
const settings = modules.settings;
const records = modules.records;
const detail = modules.recordDetail;
const dashboard = reactive(modules.dashboard);

const statTiles = [
  { id: 'statTotalCount', key: 'total', label: '累计解读', tone: 'text-text-1' },
  { id: 'statHighRiskCount', key: 'high', label: '高风险关注', tone: 'text-danger' },
  { id: 'statMediumRiskCount', key: 'medium', label: '中风险随访', tone: 'text-warning' },
  { id: 'statLowRiskCount', key: 'low', label: '低风险正常', tone: 'text-success' },
  { id: 'statsMemberCount', key: 'memberCount', label: '覆盖成员', tone: 'text-text-1' },
  { id: 'statsFollowUpCount', key: 'followUpCount', label: '建议随访', tone: 'text-text-1' }
];
</script>

<template>
  <!-- ═══════════════ 1. 报告详情 ═══════════════ -->
  <div
    id="detailModalBackdrop"
    :class="{ hidden: !AppState.recordDetail }"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-content-anim flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border-line bg-card-bg shadow-3">
      <!-- 头部 -->
      <div class="flex items-start justify-between gap-3 border-b border-border-line px-5 py-3.5">
        <div class="min-w-0">
          <p class="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-700">{{ $t('胸影智识 · AI 科普解读报告') }}</p>
          <h2 id="modalRecordTitle" class="mt-0.5 truncate text-md font-semibold text-text-1">
            {{ AppState.recordDetail ? $t('胸部X光AI解读报告') + ' · ' + AppState.recordDetail.title : $t('解读报告详情') }}
          </h2>
        </div>
        <button type="button" id="closeDetailModalBtn" class="btn-ghost flex-none" @click="detail.closeDetailModal()">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          {{ $t('关闭') }}
        </button>
      </div>

      <!-- 正文 -->
      <div id="modalRecordBody" class="flex-1 overflow-y-auto px-5 py-4"><RecordDetailBody /></div>

      <!-- 导出区 -->
      <div class="space-y-3 border-t border-border-line bg-surface-sunken px-5 py-3.5">
        <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-2xs font-medium text-text-2">{{ $t('报告模板') }}</label>
            <select v-model="AppState.reportTemplate" :aria-label="$t('报告模板')" class="field h-9">
              <option value="standard">{{ $t('标准版（结论 + 10 类概率 + 建议）') }}</option>
              <option value="brief">{{ $t('简明版（结论 + Top 3 + 免责声明）') }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-text-2">{{ $t('报告签名 / 医师签名位') }}</label>
            <input
              v-model="AppState.reportSignature"
              type="text"
              maxlength="40"
              :placeholder="$t('例如：影像科 张医生')"
              :aria-label="$t('报告签名或医师签名')"
              class="field h-9"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <span class="text-3xs text-text-3">{{ $t('免责声明：本报告仅供健康科普参考，不作为临床诊断证明') }}</span>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" id="copyReportTextBtn" class="btn-secondary btn-sm" @click="detail.copyReportText()">{{ $t('复制摘要') }}</button>
            <button type="button" data-export="json" class="btn-secondary btn-sm" @click="detail.exportJson()">{{ $t('导出 JSON') }}</button>
            <button type="button" data-export="word" class="btn-secondary btn-sm" @click="detail.exportWord()">{{ $t('导出 Word') }}</button>
            <button type="button" id="printReportBtn" class="btn-primary btn-sm" @click="detail.printReport()">{{ $t('打印 / PDF') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════ 2. 删除确认 ═══════════════ -->
  <div
    id="deleteConfirmModal"
    :class="{ hidden: !AppState.pendingDeleteRecordId }"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-content-anim w-full max-w-sm rounded-lg border border-border-line bg-card-bg p-5 shadow-3">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-danger-soft text-danger">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 3.5h.01M10.3 4.3 2.8 17a1.8 1.8 0 0 0 1.5 2.7h15.4a1.8 1.8 0 0 0 1.5-2.7L13.7 4.3a1.8 1.8 0 0 0-3.4 0Z" /></svg>
        </span>
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-text-1">{{ $t('确认删除该条记录？') }}</h3>
          <p class="mt-0.5 text-2xs text-text-3">{{ $t('危险操作二次确认') }}</p>
        </div>
      </div>
      <p id="deleteModalDesc" class="mt-3 rounded-md border border-border-line bg-surface-sunken p-2.5 text-xs leading-relaxed text-text-2">
        {{ $t('删除后，该条解读记录及其概率数据将从健康档案中移除，且不可恢复。') }}
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" id="cancelDeleteBtn" class="btn-secondary btn-sm" @click="records.cancelDelete()">{{ $t('取消') }}</button>
        <button type="button" id="confirmDeleteBtn" class="btn-primary btn-sm !bg-danger hover:!bg-danger-strong" @click="records.confirmDelete()">{{ $t('确认删除') }}</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════ 3. 数据看板 ═══════════════ -->
  <div
    id="statsModalBackdrop"
    :class="{ hidden: !AppState.statsOpen }"
    class="fixed inset-0 z-[70] flex justify-end bg-ink-950/55 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-content-anim flex h-full w-full max-w-[1240px] flex-col overflow-hidden border-l border-border-line bg-page-bg shadow-3">
      <div class="flex items-start justify-between gap-3 border-b border-border-line bg-card-bg px-5 py-3.5">
        <div class="min-w-0">
          <h2 class="text-md font-semibold text-text-1">{{ $t('成员健康数据看板') }}</h2>
          <p class="mt-0.5 text-2xs text-text-3 tnum">
            {{ dashboard.currentMemberName }} · {{ dashboard.stats.total }} {{ $t('次解读') }} · {{ dashboard.stats.memberCount }} {{ $t('位成员') }} · {{ $t('仅统计本机档案') }}
          </p>
        </div>
        <button type="button" id="closeStatsModalBtn" class="btn-ghost flex-none" @click="dashboard.closeStatsModal()">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          {{ $t('关闭') }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[200px_minmax(0,1fr)_280px]">

          <!-- 成员 -->
          <section id="statsMemberTable" class="panel p-3">
            <h3 class="flex items-center justify-between text-2xs font-semibold text-text-1">
              {{ $t('成员列表') }}
              <span class="font-normal text-text-3">{{ $t('当前高亮') }}</span>
            </h3>
            <div class="mt-2 space-y-1.5">
              <div
                v-for="member in dashboard.memberRows"
                :key="member.id"
                class="rounded-md border p-2"
                :class="member.current ? 'border-brand-300 bg-brand-50' : 'border-border-line bg-surface-sunken'"
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="truncate text-xs font-medium text-text-1">{{ member.name }}</span>
                  <span v-if="member.current" class="rounded bg-brand-600 px-1.5 text-3xs font-semibold text-white">{{ $t('当前') }}</span>
                </div>
                <p class="mt-1 text-3xs text-text-3 tnum">
                  {{ member.total }} 次 · <span class="text-danger">{{ member.high }}</span>/<span class="text-warning">{{ member.medium }}</span>/<span class="text-success">{{ member.low }}</span>
                </p>
              </div>
              <p v-if="!dashboard.memberRows.length" class="py-3 text-center text-xs text-text-3">{{ $t('暂无家庭成员数据') }}</p>
            </div>
          </section>

          <div class="min-w-0 space-y-3">
            <!-- 指标：静态 id 供自动化验收定位 -->
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div class="panel px-3 py-2.5">
                <div id="statTotalCount" class="text-xl font-semibold leading-none text-text-1 tnum">{{ dashboard.stats.total || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('累计解读') }}</div>
              </div>
              <div class="panel px-3 py-2.5">
                <div id="statHighRiskCount" class="text-xl font-semibold leading-none text-danger tnum">{{ dashboard.stats.high || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('高风险关注') }}</div>
              </div>
              <div class="panel px-3 py-2.5">
                <div id="statMediumRiskCount" class="text-xl font-semibold leading-none text-warning tnum">{{ dashboard.stats.medium || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('中风险随访') }}</div>
              </div>
              <div class="panel px-3 py-2.5">
                <div id="statLowRiskCount" class="text-xl font-semibold leading-none text-success tnum">{{ dashboard.stats.low || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('低风险正常') }}</div>
              </div>
              <div class="panel px-3 py-2.5">
                <div id="statsMemberCount" class="text-xl font-semibold leading-none text-text-1 tnum">{{ dashboard.stats.memberCount || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('覆盖成员') }}</div>
              </div>
              <div class="panel px-3 py-2.5">
                <div id="statsFollowUpCount" class="text-xl font-semibold leading-none text-text-1 tnum">{{ dashboard.stats.followUpCount || 0 }}</div>
                <div class="mt-1 text-2xs text-text-3">{{ $t('建议随访') }}</div>
              </div>
            </div>

            <!-- 图表 -->
            <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <section class="panel p-3">
                <h3 class="text-xs font-semibold text-text-1">{{ $t('风险等级分布') }}</h3>
                <p class="mt-0.5 text-3xs text-text-3">{{ $t('按演示阈值汇总，不是临床风险分层') }}</p>
                <ChartCanvas v-if="AppState.statsOpen" id="statsRiskPieChart" class="relative h-52 w-full" :option="dashboard.statsPieOption" />
              </section>
              <section class="panel p-3">
                <h3 class="text-xs font-semibold text-text-1">{{ $t('高频关注征象') }}</h3>
                <p class="mt-0.5 text-3xs text-text-3">{{ $t('每次解读取最高非正常类别累计') }}</p>
                <ChartCanvas v-if="AppState.statsOpen" id="statsFindingsChart" class="relative h-52 w-full" :option="dashboard.statsFindingsOption" />
                <p v-if="!dashboard.stats.topFindings.length" class="py-6 text-center text-xs text-text-3">{{ $t('暂无达到 25% 的关注征象') }}</p>
              </section>
            </div>

            <!-- 摘要 -->
            <div class="rounded-md border border-brand-200 bg-brand-50 p-3">
              <p class="text-2xs font-semibold text-brand-800">{{ $t('AI 解读摘要') }}</p>
              <p id="statsAiInterpretation" class="mt-1 text-xs leading-relaxed text-text-2">{{ dashboard.summary }}</p>
            </div>
          </div>

          <!-- 知识提示 -->
          <section id="statsKnowledgeGrid" class="grid grid-cols-1 gap-2 self-start">
            <h3 class="text-2xs font-semibold text-text-1">{{ $t('知识提示') }}</h3>
            <button
              v-for="(point, index) in dashboard.knowledgePoints"
              :key="index"
              type="button"
              class="group panel p-3 text-left transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50"
              @click="dashboard.openKnowledge(point.code)"
            >
              <span class="tag border-brand-200 bg-brand-50 text-brand-800">{{ $t(point.tag) }}</span>
              <strong class="mt-1.5 block text-xs text-text-1 group-hover:text-brand-800">{{ $t(point.title) }}</strong>
              <span class="mt-1 block text-3xs leading-relaxed text-text-2">{{ $t(point.text) }}</span>
              <span class="mt-1 block text-3xs font-medium text-brand-700">{{ $t('查看科普') }} →</span>
            </button>
          </section>
        </div>

        <p class="mt-3 text-3xs text-text-3">{{ $t('数据来自本机已保存的解读记录；知识卡片用于科普，不构成诊断或治疗建议。') }}</p>
      </div>
    </div>
  </div>

  <!-- ═══════════════ 4. 设置 / 成员 ═══════════════ -->
  <div
    id="userModalBackdrop"
    :class="{ hidden: !AppState.familyModalOpen }"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="userModalTitle"
  >
    <div class="modal-content-anim flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border-line bg-card-bg shadow-3">
      <div class="flex items-start justify-between gap-3 border-b border-border-line px-5 py-3.5">
        <div>
          <h2 id="userModalTitle" class="text-md font-semibold text-text-1">{{ $t('设置') }}</h2>
          <p class="mt-0.5 text-2xs text-text-3">{{ $t('管理家庭成员与 AI 问答服务') }}</p>
        </div>
        <button type="button" id="closeUserModalBtn" class="btn-ghost flex-none" @click="family.closeUserModal()">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          {{ $t('关闭') }}
        </button>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">

        <!-- Qwen -->
        <section>
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-text-1">{{ $t('Qwen AI 服务') }}</h3>
              <p class="text-2xs text-text-3">{{ $t('密钥保存到本机 backend/.env，重启后仍生效') }}</p>
            </div>
            <span id="qwenConfigStatus" class="flex-none rounded px-2 py-0.5 text-2xs" :class="AppState.qwenSettings.statusTone">{{ AppState.qwenSettings.status }}</span>
          </div>

          <form id="qwenSettingsForm" class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_170px]" @submit.prevent="settings.saveQwenSettings()">
            <div>
              <label for="qwenApiKeyInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('DashScope API Key') }}</label>
              <input
                id="qwenApiKeyInput"
                v-model="AppState.qwenSettings.apiKey"
                type="password"
                autocomplete="new-password"
                maxlength="500"
                :placeholder="$t('输入新的 API Key')"
                class="field h-9"
              />
            </div>
            <div>
              <label for="qwenModelInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('模型') }}</label>
              <select id="qwenModelInput" v-model="AppState.qwenSettings.model" class="field h-9">
                <option value="qwen3.8-flash">Qwen3.8 Flash</option>
                <option value="qwen3.8-max">Qwen3.8 Max</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 sm:col-span-2">
              <button id="testQwenSettingsBtn" type="button" class="btn-secondary btn-sm" :disabled="AppState.qwenSettings.testing" @click="settings.testQwenConnection()">
                {{ AppState.qwenSettings.testing ? $t('测试中') : $t('测试连接') }}
              </button>
              <button id="saveQwenSettingsBtn" type="submit" class="btn-primary btn-sm" :disabled="AppState.qwenSettings.saving">{{ $t('保存配置') }}</button>
            </div>
          </form>
          <p id="qwenTestResult" class="mt-2 text-2xs" :class="AppState.qwenSettings.resultTone" aria-live="polite">{{ AppState.qwenSettings.result }}</p>
        </section>

        <!-- 成员列表 -->
        <section class="border-t border-border-line pt-4">
          <h3 class="mb-2 text-sm font-semibold text-text-1">{{ $t('家庭成员管理') }}</h3>
          <div id="familyMemberList" class="max-h-40 space-y-1.5 overflow-y-auto" :aria-label="$t('家庭成员列表')">
            <button
              v-for="member in AppState.familyMembers"
              :key="member.id"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-150"
              :class="member.id === AppState.currentMemberId ? 'border-brand-300 bg-brand-50' : 'border-border-line hover:border-brand-300'"
              :data-member-id="member.id"
              :aria-pressed="member.id === AppState.currentMemberId"
              @click="family.selectMember(member.id)"
            >
              <span class="min-w-0">
                <strong class="block truncate text-xs text-text-1">{{ member.profile.name }}</strong>
                <span class="text-3xs text-text-3">
                  {{ member.profile.age ? member.profile.age + ' ' + $t('岁') : $t('年龄未填写') }} · {{ member.profile.gender || $t('未填写') }}
                </span>
              </span>
              <span class="flex-none text-2xs" :class="member.id === AppState.currentMemberId ? 'font-semibold text-brand-700' : 'text-text-3'">
                {{ member.id === AppState.currentMemberId ? $t('当前成员') : $t('切换') }}
              </span>
            </button>
          </div>
        </section>

        <!-- 档案表单 -->
        <form id="userProfileForm" class="space-y-3 border-t border-border-line pt-4" novalidate @submit.prevent="family.saveMember()">
          <input id="editingMemberId" v-model="AppState.memberForm.id" type="hidden" />

          <div>
            <label for="userNameInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('姓名 / 称呼') }}</label>
            <input
              id="userNameInput"
              v-model="AppState.memberForm.name"
              type="text"
              maxlength="20"
              :placeholder="$t('例如：爸爸、林知夏')"
              class="field h-9"
              :class="{ '!border-danger': AppState.memberNameError }"
            />
            <p id="userNameError" :class="{ hidden: !AppState.memberNameError }" class="mt-1 text-2xs text-danger" role="alert">{{ $t('请输入 1-20 个字符的姓名') }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="userAgeInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('年龄') }}</label>
              <input id="userAgeInput" v-model="AppState.memberForm.age" type="number" min="0" max="120" :placeholder="$t('年龄')" class="field h-9" />
            </div>
            <div>
              <label for="userGenderInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('性别') }}</label>
              <select id="userGenderInput" v-model="AppState.memberForm.gender" class="field h-9">
                <option value="未填写">{{ $t('未填写') }}</option>
                <option value="男">{{ $t('男') }}</option>
                <option value="女">{{ $t('女') }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="userConditionInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('既往病症 / 过敏史') }}</label>
            <input id="userConditionInput" v-model="AppState.memberForm.conditions" type="text" maxlength="120" :placeholder="$t('例如：高血压、青霉素过敏（可选）')" class="field h-9" />
          </div>

          <div>
            <label for="userNotesInput" class="mb-1 block text-2xs font-medium text-text-2">{{ $t('健康备注') }}</label>
            <textarea id="userNotesInput" v-model="AppState.memberForm.notes" rows="2" maxlength="240" :placeholder="$t('记录家人的健康关注点（可选）')" class="field py-2"></textarea>
          </div>

          <div class="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" id="newMemberBtn" class="btn-secondary btn-sm" @click="family.newMember()">{{ $t('新增成员') }}</button>
            <button type="button" id="deleteMemberBtn" class="btn-ghost text-danger hover:bg-danger-soft" @click="family.deleteMember()">{{ $t('删除当前成员') }}</button>
            <button type="submit" id="saveUserBtn" class="btn-primary btn-sm">{{ $t('保存档案') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
