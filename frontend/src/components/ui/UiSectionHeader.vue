<script setup>
/**
 * 区块标题。eyebrow 是上方的小标签（如"核心能力"），
 * actions 插槽放右侧操作（分段控件、按钮）。
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  level: { type: String, default: 'h2' }
});
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <div v-if="eyebrow" class="mb-1.5 flex items-center gap-2">
        <span class="h-px w-6 bg-brand-500"></span>
        <span class="text-2xs font-semibold uppercase tracking-[0.12em] text-brand-700">{{ $t(eyebrow) }}</span>
      </div>
      <component :is="level" class="text-xl font-semibold tracking-tight text-text-1">{{ $t(title) }}</component>
      <p v-if="subtitle" class="mt-1 max-w-prose text-sm leading-relaxed text-text-2">{{ $t(subtitle) }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-none items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
