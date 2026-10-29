<script setup>
import { formatBytes } from '../utils/format.js';

defineProps({
  currentCase: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-md bg-page-bg px-3.5 py-2 text-xs text-text-2 border border-border-line">
    <div class="truncate">
      <span class="text-text-3">文件名：</span>{{ ' ' }}
      <span id="infoFileName" class="font-medium text-text-1">{{ currentCase.fileName }}</span>
    </div>
    <div>
      <span class="text-text-3">尺寸：</span>{{ ' ' }}
      <span id="infoDimensions" class="font-medium tabular-nums text-text-1">{{ currentCase.dimensions }}</span>
    </div>
    <div>
      <span class="text-text-3">大小：</span>{{ ' ' }}
      <span id="infoFileSize" class="font-medium tabular-nums text-text-1">{{ formatBytes(currentCase.fileSize) }}</span>
    </div>
    <div>
      <span class="text-text-3">上传时间：</span>{{ ' ' }}
      <span id="infoUploadTime" class="font-medium tabular-nums text-text-1">{{ currentCase.uploadedAt }}</span>
    </div>
  </div>
</template>
