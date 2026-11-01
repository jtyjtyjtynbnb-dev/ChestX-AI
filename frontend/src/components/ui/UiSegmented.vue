<script setup>
/**
 * 分段控件。用于"图表/列表""患者版/医生版"这类互斥切换。
 * 键盘可达：左右箭头切换，Home/End 跳首尾。
 */
const props = defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true }, // [{ value, label }]
  size: { type: String, default: 'md' },    // md | sm
  ariaLabel: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue']);

function select(value) {
  if (value !== props.modelValue) emit('update:modelValue', value);
}

function onKeydown(event) {
  const index = props.options.findIndex((option) => option.value === props.modelValue);
  if (index < 0) return;
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % props.options.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + props.options.length) % props.options.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = props.options.length - 1;
  if (next === null) return;
  event.preventDefault();
  select(props.options[next].value);
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="ariaLabel"
    :class="[
      'inline-flex items-center gap-0.5 rounded-md border border-border-line bg-surface-sunken p-0.5',
      size === 'sm' ? 'text-2xs' : 'text-xs'
    ]"
    @keydown="onKeydown"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      :id="option.id"
      :aria-selected="option.value === modelValue"
      :tabindex="option.value === modelValue ? 0 : -1"
      :class="[
        'rounded px-2.5 font-medium transition-colors duration-150',
        size === 'sm' ? 'h-6' : 'h-7',
        option.value === modelValue
          ? 'bg-card-bg text-text-1 shadow-1'
          : 'text-text-2 hover:text-text-1'
      ]"
      @click="select(option.value)"
    >
      {{ $t(option.label) }}
    </button>
  </div>
</template>
