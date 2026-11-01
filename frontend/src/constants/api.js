/** Shared API contract constants. Keep endpoint strings out of composables. */
export const API_ENDPOINTS = {
  health: '/api/health',
  members: '/api/members',
  membersSync: '/api/members/sync',
  conversations: '/api/conversations',
  conversationsSync: '/api/conversations/sync',
  conversationDelete: (id) => '/api/conversations/' + encodeURIComponent(id),
  chat: '/api/agent/chat',
  chatStream: '/api/agent/chat/stream',
  coBrain: '/api/agent/cobrain',
  noteSummary: '/api/agent/note-summary',
  diagnose: '/api/diagnose',
  agentDiagnose: '/api/agent/diagnose',
  agentDiagnoseStream: '/api/agent/diagnose/stream',
  qwenSettings: '/api/settings/qwen',
  qwenTest: '/api/settings/qwen/test',
  sample: (id) => '/api/samples/' + encodeURIComponent(id),
};

export const REQUEST_TIMEOUT_MS = {
  default: 30000,
  diagnosis: 180000,
  qwenTest: 30000,
};
