import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createPinia } from 'pinia';
import { useChestxStore } from '../src/stores/useChestxStore.js';

const frontendRoot = join(import.meta.dirname, '..');
const read = relativePath => readFileSync(join(frontendRoot, relativePath), 'utf8');
const filesIn = folder => readdirSync(join(frontendRoot, folder), { recursive: true }).filter(name => /\.(js|vue)$/.test(name)).map(name => join(folder, name));
function staticIds(source) {
  return [...source.matchAll(/(?<![:\w-])id="([^"]+)"/g)].map(match => match[1]).filter(id => !id.includes('${')).sort();
}

test('Vue templates preserve all 170 reference static DOM ids', () => {
  // Frozen from the original reference HTML. Page markup now lives in components,
  // and :data-*-id bindings are expressions, not static DOM ids.
  const templates = [...filesIn('src/components'), ...filesIn('src/views')].filter(name => name.endsWith('.vue'));
  assert.deepEqual(staticIds(templates.map(read).join('\n')), JSON.parse(read('tests/reference-static-ids.json')));
});

test('six real routes use one RouterView and preserve the shell order', () => {
  const main = read('src/main.js');
  const app = read('src/App.vue');
  assert.match(main, /createWebHistory\s*\(/);
  for (const page of ['home', 'interpret', 'records', 'knowledge', 'academy', 'about']) {
    const view = page[0].toUpperCase() + page.slice(1) + 'View';
    assert.match(main, new RegExp(`path:\\s*['"]/${page}['"].*component:\\s*${view}`));
    assert.ok(existsSync(join(frontendRoot, `src/views/${view}.vue`)));
    assert.doesNotMatch(app, new RegExp(`<${view}\\b|import\\s+${view}\\s+from`));
  }
  // Replaces the old simultaneous-six-views assertion per the RouterView requirement.
  assert.equal((app.match(/<RouterView\b/g) || []).length, 1);
  assert.doesNotMatch(app, /KeepAlive/);
  assert.match(app, /provide\(APP_CONTEXT,\s*useAppCoordinators\(\)\)/);
  assert.match(main, /router\.isReady\(\)\.then\([\s\S]*app\.mount\(/);
  const renderedOrder = ['AppGlobals', 'FloatingAiChat', 'AppHeader', 'RouterView', 'AppFooter', 'AppModals'].map(name => app.indexOf(`<${name}`));
  assert.ok(renderedOrder.every(index => index >= 0));
  assert.deepEqual(renderedOrder, [...renderedOrder].sort((a, b) => a - b));
  assert.match(app, /<main class="mx-auto w-full max-w-6xl flex-1 px-6 py-6">/);
});

test('the active coordinator owns only global services and cleanup', () => {
  const coordinator = read('src/composables/useAppCoordinators.js');
  assert.ok(coordinator.split(/\r?\n/).length < 300);
  for (const module of ['useNavigation', 'useFamilyMembers', 'useChat', 'useRecords', 'useDashboard']) assert.match(coordinator, new RegExp(`from ['"].*${module}\\.js['"]`));
  assert.doesNotMatch(coordinator, /import.*(?:useImageViewer|useImageUpload|useDiagnosis|useKnowledge|useAcademy|useChatWindow)/);
  assert.doesNotMatch(coordinator, /store\.initialize|Object\.assign\(AppState/);
  assert.match(coordinator, /onBeforeUnmount\s*\(/);
  assert.match(coordinator, /api\.dispose\(\)/);
  assert.match(coordinator, /scope\.dispose\(\)/);
});

test('Pinia owns the shared application state and reactive member records', () => {
  // Inspect the real store, including INITIAL_APP_STATE spread into it.
  const store = useChestxStore(createPinia());
  for (const key of ['familyMembers', 'currentMemberId', 'currentPage', 'currentCase', 'viewer', 'records', 'conversations']) assert.ok(key in store.appState, `missing ${key}`);
  store.appState.familyMembers = [{ id: 'test-member', profile: { name: '测试' }, records: [] }];
  store.appState.currentMemberId = 'test-member';
  store.appState.familyMembers[0].records.push({ id: 'record' });
  assert.equal(store.currentMember.profile.name, '测试');
  assert.equal(store.records.length, 1);
});

test('dependency boundaries prohibit business DOM rendering and upward imports', () => {
  assert.equal(existsSync(join(frontendRoot, 'src/runtime/legacyRuntime.js')), false);
  for (const name of ['useNavigation', 'useFamilyMembers', 'useImageViewer', 'useDiagnosis', 'useChat', 'useRecords', 'useKnowledge', 'useAcademy', 'useDashboard']) {
    const source = read(`src/composables/${name}.js`);
    assert.doesNotMatch(source, /runtime\.initialize|EventTarget\.prototype|innerHTML|querySelector|createElement|classList/);
    assert.doesNotMatch(source, /\.addEventListener\(/);
  }
  for (const file of filesIn('src/composables')) assert.doesNotMatch(read(file), /from\s+['"][^'"]*(?:components|views)\//, file);
  for (const folder of ['src/stores', 'src/api', 'src/utils']) {
    for (const file of filesIn(folder)) assert.doesNotMatch(read(file), /from\s+['"][^'"]*(?:components|views|composables)\//, file);
  }
  for (const file of filesIn('src/components')) assert.doesNotMatch(read(file), /\bfetch\s*\(|from\s+['"][^'"]*\/api\//, file);
});

test('global actions route to mounted page capabilities while pages own transport', () => {
  const coordinator = read('src/composables/useAppCoordinators.js');
  assert.match(coordinator, /createApiScope/);
  for (const action of ['showToast', 'switchPage', 'openSample', 'focusHeatmap', 'saveCurrentToHealthRecords', 'sendAiChatMessage']) assert.match(coordinator, new RegExp(`${action}:`));
  const interpret = read('src/composables/useInterpretPage.js');
  assert.match(interpret, /createApiScope\(\)/);
  assert.match(interpret, /api\.dispose\(\)/);
  assert.match(interpret, /delete modules\.interpret/);
  assert.match(read('src/composables/useDiagnosis.js'), /createDiagnosisApi/);
});
