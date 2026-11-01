<script setup>
/**
 * 空态。图标走 slot，保证各页面可以给不同语义的图形。
 */
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <slot name="icon">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6M12 9v6" />
        </svg>
      </slot>
    </div>
    <div>
      <p class="text-sm font-semibold text-text-1">{{ $t(title) }}</p>
      <p v-if="description" class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-2">{{ $t(description) }}</p>
    </div>
    <div v-if="$slots.action" class="mt-1">
      <slot name="action" />
    </div>
  </div>
</template>
