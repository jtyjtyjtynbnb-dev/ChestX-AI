<script setup>
import { reactive } from 'vue';
import { useModals } from '../composables/useModals.js';
import RecordDetailBody from './RecordDetailBody.vue';
import ChartCanvas from './ChartCanvas.vue';
const { AppState, modules }=useModals();
const family=modules.family, settings=modules.settings, records=modules.records, detail=modules.recordDetail;
const dashboard=reactive(modules.dashboard);
</script>
<template>


  <!-- ==========================================
       全局弹窗 1：健康档案详情 / 报告导出弹窗 (Record Detail & Export Modal)
       ========================================== -->
  <div id="detailModalBackdrop" :class="{ hidden: !AppState.recordDetail }" class="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="modal-content-anim w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-border-line shadow-2xl p-6 space-y-5">
      <div class="flex items-center justify-between border-b border-border-line pb-3">
        <div>
          <span class="text-xs text-primary font-semibold">胸影智识 · AI 科普解读报告</span>
          <h3 id="modalRecordTitle" class="text-lg font-semibold text-text-1">{{ AppState.recordDetail ? '胸部X光AI解读报告 · ' + AppState.recordDetail.title : '解读报告详情' }}</h3>
        </div>
        <button type="button" id="closeDetailModalBtn" @click="detail.closeDetailModal()" class="btn-secondary btn-sm">✕ 关闭</button>
      </div>

      <div id="modalRecordBody" class="space-y-4"><RecordDetailBody /></div>

      <div class="space-y-3 border-t border-border-line pt-4">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <span class="mb-1 block text-[11px] font-medium text-text-2">报告模板</span>
            <select v-model="AppState.reportTemplate" aria-label="报告模板" class="w-full rounded-md border border-border-line bg-white px-2.5 py-1.5 text-xs text-text-1">
              <option value="standard">标准版（结论 + 10 类概率 + 建议）</option>
              <option value="brief">简明版（结论 + Top 3 + 免责声明）</option>
            </select>
          </div>
          <div>
            <span class="mb-1 block text-[11px] font-medium text-text-2">报告签名 / 医师签名位</span>
            <input v-model="AppState.reportSignature" type="text" maxlength="40" placeholder="例如：影像科 张医生" aria-label="报告签名或医师签名" class="w-full rounded-md border border-border-line px-2.5 py-1.5 text-xs text-text-1" />
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-text-3">免责声明：本报告仅供健康科普参考，不作为临床医疗诊断证明</span>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" id="copyReportTextBtn" @click="detail.copyReportText()" class="btn-secondary btn-sm">复制摘要</button>
            <button type="button" data-export="json" @click="detail.exportJson()" class="btn-secondary btn-sm">导出 JSON</button>
            <button type="button" data-export="word" @click="detail.exportWord()" class="btn-secondary btn-sm">导出 Word</button>
            <button type="button" id="printReportBtn" @click="detail.printReport()" class="btn-primary !h-9 !text-xs">打印 / PDF</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==========================================
       全局弹窗 2：危险操作（删除记录）二次确认弹窗 (Delete Confirm Modal)
       ========================================== -->
  <div id="deleteConfirmModal" :class="{ hidden: !AppState.pendingDeleteRecordId }" class="fixed inset-0 z-[80] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="modal-content-anim w-full max-w-md rounded-lg bg-white border border-border-line shadow-xl p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger font-bold">!</div>
        <div>
          <h3 class="text-base font-semibold text-text-1">确认删除该条健康档案？</h3>
          <p class="text-xs text-text-3 mt-0.5">危险操作二次确认</p>
        </div>
      </div>
      <p id="deleteModalDesc" class="text-xs text-text-2 leading-5">
        删除后，该条胸部X光影像解读记录及其关联的概率分析数据将从个人健康档案中移除且不可恢复。
      </p>
      <div class="flex justify-end gap-2.5 pt-2">
        <button type="button" id="cancelDeleteBtn" @click="records.cancelDelete()" class="btn-secondary btn-sm">取消</button>
        <button type="button" id="confirmDeleteBtn" @click="records.confirmDelete()" class="btn-primary !h-8 !px-4 !text-xs !bg-danger hover:!bg-red-700">确认删除</button>
      </div>
    </div>
  </div>

  <!-- ==========================================
       全局弹窗 3：数据统计看板弹窗 （扩展功能）
       ========================================== -->
  <div id="statsModalBackdrop" :class="{ hidden: !AppState.statsOpen }" class="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="modal-content-anim w-full max-w-2xl rounded-lg bg-white border border-border-line shadow-2xl p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-border-line pb-3">
        <div>
          <h3 class="text-lg font-semibold text-text-1">个人胸部健康档案数据统计看板</h3>
          <p class="text-xs text-text-3">实时汇总历次胸片解读风险分布与高频关注征象</p>
        </div>
        <button type="button" id="closeStatsModalBtn" @click="dashboard.closeStatsModal()" class="btn-secondary btn-sm">✕ 关闭</button>
      </div>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="rounded-lg bg-page-bg p-3 border border-border-line">
          <div id="statTotalCount" class="text-xl font-semibold text-primary tabular-nums">{{ dashboard.stats.total || 0 }}</div>
          <div class="text-xs text-text-3 mt-0.5">累计解读档案</div>
        </div>
        <div class="rounded-lg bg-page-bg p-3 border border-border-line">
          <div id="statHighRiskCount" class="text-xl font-semibold text-danger tabular-nums">{{ dashboard.stats.high || 0 }}</div>
          <div class="text-xs text-text-3 mt-0.5">高风险提醒次数</div>
        </div>
        <div class="rounded-lg bg-page-bg p-3 border border-border-line">
          <div id="statLowRiskCount" class="text-xl font-semibold text-success tabular-nums">{{ dashboard.stats.low || 0 }}</div>
          <div class="text-xs text-text-3 mt-0.5">低风险正常次数</div>
        </div>
      </div>
      <ChartCanvas v-if="AppState.statsOpen" id="statsRiskPieChart" class="relative h-64 w-full" :option="dashboard.statsPieOption" />
      <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-text-2 leading-5">
        <div class="font-semibold text-text-1 mb-1">AI 解读摘要</div>
        <p id="statsAiInterpretation">{{ dashboard.summary }}</p>
      </div>
    </div>
  </div>

  <!-- ==========================================
       全局弹窗 4：家庭成员健康档案与切换
       ========================================== -->
  <div id="userModalBackdrop" :class="{ hidden: !AppState.familyModalOpen }" class="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="userModalTitle">
    <div class="modal-content-anim w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-border-line shadow-2xl p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-border-line pb-3">
        <div>
          <h3 id="userModalTitle" class="text-lg font-semibold text-text-1">设置</h3>
          <p class="text-xs text-text-3 mt-1">管理家庭成员与 AI 问答服务</p>
        </div>
        <button type="button" id="closeUserModalBtn" @click="family.closeUserModal()" class="btn-secondary btn-sm">✕ 关闭</button>
      </div>
      <button type="button" id="settingsStatsBtn" @click="dashboard.openStatsModal()" class="btn-secondary btn-sm" title="查看数据统计看板">查看数据统计看板</button>
      <section class="border-b border-border-line pb-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-text-1">Qwen AI 服务</h4>
            <p class="text-xs text-text-3">密钥会保存到本机 backend/.env，重启后仍生效</p>
          </div>
          <span id="qwenConfigStatus" class="shrink-0 rounded px-2 py-1 text-xs" :class="AppState.qwenSettings.statusTone">{{ AppState.qwenSettings.status }}</span>
        </div>
        <form id="qwenSettingsForm" @submit.prevent="settings.saveQwenSettings()" class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px] sm:items-end">
          <div>
            <label for="qwenApiKeyInput" class="mb-1 block text-xs font-medium text-text-2">DashScope API Key</label>
            <input id="qwenApiKeyInput" v-model="AppState.qwenSettings.apiKey" type="password" autocomplete="new-password" maxlength="500" placeholder="输入新的 API Key" class="w-full rounded-md border border-border-line px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label for="qwenModelInput" class="mb-1 block text-xs font-medium text-text-2">模型</label>
            <select id="qwenModelInput" v-model="AppState.qwenSettings.model" class="w-full rounded-md border border-border-line px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="qwen3.8-flash">Qwen3.8 Flash</option>
              <option value="qwen3.8-max">Qwen3.8 Max</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 sm:col-span-2">
            <button id="testQwenSettingsBtn" :disabled="AppState.qwenSettings.testing" @click="settings.testQwenConnection()" type="button" class="btn-secondary !h-9 !px-3 !text-xs">{{ AppState.qwenSettings.testing ? '测试中' : '测试连接' }}</button>
            <button id="saveQwenSettingsBtn" :disabled="AppState.qwenSettings.saving" type="submit" class="btn-primary !h-9 !px-3 !text-xs">保存配置</button>
          </div>
        </form>
        <p id="qwenTestResult" class="mt-2 text-xs" :class="AppState.qwenSettings.resultTone" aria-live="polite">{{ AppState.qwenSettings.result }}</p>
      </section>
      <div class="border-b border-border-line pb-2">
        <h4 class="text-sm font-semibold text-text-1">家庭成员管理</h4>
      </div>
      <div id="familyMemberList" class="space-y-2 max-h-40 overflow-y-auto" aria-label="家庭成员列表"><button v-for="member in AppState.familyMembers" :key="member.id" type="button" class="w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition" :class="member.id === AppState.currentMemberId ? 'border-primary bg-primary/5' : 'border-border-line hover:border-primary/50'" :data-member-id="member.id" :aria-pressed="member.id === AppState.currentMemberId" @click="family.selectMember(member.id)"><span class="min-w-0"><strong class="block text-sm text-text-1 truncate">{{ member.profile.name }}</strong><span class="text-[11px] text-text-3">{{ member.profile.age ? member.profile.age + ' 岁' : '年龄未填写' }} · {{ member.profile.gender || '未填写' }}</span></span><span class="shrink-0 text-xs" :class="member.id === AppState.currentMemberId ? 'text-primary font-semibold' : 'text-text-3'">{{ member.id === AppState.currentMemberId ? '当前成员' : '切换' }}</span></button></div>
      <form id="userProfileForm" @submit.prevent="family.saveMember()" class="space-y-3" novalidate>
        <input id="editingMemberId" v-model="AppState.memberForm.id" type="hidden" />
        <div>
          <label for="userNameInput" class="block text-xs font-medium text-text-2 mb-1">姓名 / 称呼</label>
          <input id="userNameInput" :class="{ 'border-danger': AppState.memberNameError }" v-model="AppState.memberForm.name" type="text" maxlength="20" placeholder="例如：爸爸、林知夏" class="w-full rounded-md border border-border-line px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none" />
          <p id="userNameError" :class="{hidden: !AppState.memberNameError}" class="mt-1 text-xs text-danger" role="alert">请输入 1-20 个字符的姓名</p>
        </div>
        <div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="userAgeInput" class="block text-xs font-medium text-text-2 mb-1">年龄</label>
              <input id="userAgeInput" v-model="AppState.memberForm.age" type="number" min="0" max="120" placeholder="年龄" class="w-full rounded-md border border-border-line px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label for="userGenderInput" class="block text-xs font-medium text-text-2 mb-1">性别</label>
              <select id="userGenderInput" v-model="AppState.memberForm.gender" class="w-full rounded-md border border-border-line px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none">
                <option value="未填写">未填写</option><option value="男">男</option><option value="女">女</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label for="userConditionInput" class="block text-xs font-medium text-text-2 mb-1">既往病症 / 过敏史</label>
          <input id="userConditionInput" v-model="AppState.memberForm.conditions" type="text" maxlength="120" placeholder="例如：高血压、青霉素过敏（可选）" class="w-full rounded-md border border-border-line px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label for="userNotesInput" class="block text-xs font-medium text-text-2 mb-1">健康备注</label>
          <textarea id="userNotesInput" v-model="AppState.memberForm.notes" rows="2" maxlength="240" placeholder="记录家人的健康关注点（可选）" class="w-full rounded-md border border-border-line px-3 py-2 text-sm text-text-1 focus:border-primary focus:outline-none"></textarea>
        </div>
        <div class="pt-1 flex flex-wrap justify-end gap-2">
          <button type="button" id="newMemberBtn" @click="family.newMember()" class="btn-secondary btn-sm">新增成员</button>
          <button type="button" id="deleteMemberBtn" @click="family.deleteMember()" class="btn-secondary btn-sm !text-danger hover:!border-danger">删除当前成员</button>
          <button type="submit" id="saveUserBtn" class="btn-primary !h-9 !text-xs">保存档案</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==========================================
       核心业务逻辑与状态管理脚本
       ========================================== -->
  
</template>

