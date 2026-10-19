/**
 * 家庭成员档案 CRUD 与 SQLite 双写同步管理模块
 */
import { requestJson } from '../api/client.js';

export async function fetchPersistedMembers() {
  return requestJson('/api/members');
}

export async function syncPersistedMembers(members, currentMemberId) {
  return requestJson('/api/members/sync', {
    method: 'POST',
    body: JSON.stringify({ members, current_member_id: currentMemberId })
  });
}
