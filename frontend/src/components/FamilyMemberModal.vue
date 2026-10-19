<template>
  <!-- 家庭成员健康档案管理与 SQLite 同步弹窗组件 -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold text-text-1">家庭成员管理（SQLite 服务端持久化）</h4>
      <span class="text-xs text-success">支持跨浏览器与跨电脑保存</span>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/useUserStore.js';
const userStore = useUserStore();
</script>
