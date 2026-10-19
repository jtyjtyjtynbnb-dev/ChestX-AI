<script setup>
import { computed } from 'vue';
import { useUserStore } from '../stores/useUserStore.js';

const userStore = useUserStore();
const records = computed(() => userStore.currentMember?.records || []);
</script>

<template>
  <div class="space-y-4">
    <div v-for="rec in records" :key="rec.id" class="med-card">
      <div class="font-semibold text-text-1">{{ rec.title }}</div>
      <div class="text-xs text-text-3">{{ rec.date }} · {{ rec.riskLevel }}</div>
      <p class="mt-2 text-sm text-text-2">{{ rec.summary }}</p>
    </div>
  </div>
</template>
