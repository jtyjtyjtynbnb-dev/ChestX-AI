<script setup>
import { ref } from 'vue';
import { useChart } from '../composables/useChart.js';
const props = defineProps({ option: { type: Object, required: true } });
const element = ref(null);
useChart(element, () => props.option);
</script>
<template><div ref="element"></div></template>
