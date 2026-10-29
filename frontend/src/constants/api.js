/** Shared API contract constants. Keep endpoint strings out of composables. */
export const API_ENDPOINTS = {
  health: '/api/health',
  members: '/api/members',
  membersSync: '/api/members/sync',
  conversations: '/api/conversations',
  conversationsSync: '/api/conversations/sync',
  chat: '/api/agent/chat',
  chatStream: '/api/agent/chat/stream',
  diagnose: '/api/diagnose',
  agentDiagnose: '/api/agent/diagnose',
  agentDiagnoseStream: '/api/agent/diagnose/stream',
  qwenSettings: '/api/settings/qwen',
  qwenTest: '/api/settings/qwen/test',
  sample: (id) => '/api/samples/' + encodeURIComponent(id),
};

export const REQUEST_TIMEOUT_MS = {
  default: 30000,
  diagnosis: 90000,
  qwenTest: 30000,
};
