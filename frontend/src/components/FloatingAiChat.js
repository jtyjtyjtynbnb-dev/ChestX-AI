/**
 * 右下角悬浮 AI 助手模块 (支持 SSE 流式输出、拖拽贴边吸附、Alt+K 快捷键与画布联动)
 */
import { consumeSseStream } from '../api/client.js';

export async function streamFloatingChatQuestion(payload, handlers) {
  return consumeSseStream('/api/agent/chat/stream', payload, handlers);
}
