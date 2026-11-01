<script setup>
/**
 * 统一面板。
 * tone: 'card' 浅色临床面 ｜ 'film' 阅片深色面 ｜ 'sunken' 内嵌凹陷面
 * padding: 直接给 Tailwind 的 p-* 值，默认 5（20px）
 */
defineProps({
  tone: { type: String, default: 'card' },
  padding: { type: String, default: '5' },
  hoverable: { type: Boolean, default: false },
  as: { type: String, default: 'div' }
});
</script>

<template>
  <component
    :is="as"
    :class="[
      'border',
      tone === 'film'
        ? 'film-panel border-film-line'
        : tone === 'sunken'
          ? 'panel-sunken'
          : 'panel border-border-line',
      hoverable ? 'panel-hover' : '',
      `p-${padding}`
    ]"
  >
    <slot />
  </component>
</template>
