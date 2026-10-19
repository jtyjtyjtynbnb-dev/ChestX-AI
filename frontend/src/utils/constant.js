/**
 * 全局常量与存储键定义 (杜绝魔法数字)
 */
export const FAMILY_STORAGE_KEY = 'chestx-ai-family-members-v1';
export const FAMILY_CURRENT_KEY = 'chestx-ai-current-member-v1';
export const CHAT_STORAGE_KEY = 'chestx-ai-conversations-v1';
export const CHAT_POSITION_KEY = 'chestx-ai-chat-position';

export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export const DEFAULT_HEATMAP_OPACITY = 68;
export const FOCUS_HEATMAP_OPACITY = 75;
