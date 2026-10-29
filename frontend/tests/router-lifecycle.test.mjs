import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderer, h, nextTick, onUnmounted, provide } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { APP_CONTEXT } from '../src/composables/useAppContext.js';
import { useAppCoordinators } from '../src/composables/useAppCoordinators.js';
import { useInterpretPage } from '../src/composables/useInterpretPage.js';

// A Vue host renderer exercises real setup/mount/unmount hooks without a browser DOM.
const node = (type = 'root') => ({ type, children: [], parent: null });
const renderer = createRenderer({
  createElement: node, createText: node, createComment: node,
  setText() {}, setElementText() {}, patchProp() {},
  parentNode: element => element.parent,
  nextSibling: element => element.parent?.children[element.parent.children.indexOf(element) + 1],
  insert(element, parent, anchor) {
    if (element.parent) this.remove(element);
    element.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, element);
  },
  remove(element) {
    const siblings = element.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(element), 1);
    element.parent = null;
  }
});

test('router owns page lifetime while shared context survives navigation and aborts on app teardown', async (t) => {
  const requests = [];
  const storage = new Map();
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => {
    requests.push({ url, signal });
    if (url.startsWith('/api/samples/')) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    }
    if (url === '/api/agent/diagnose/stream' || url === '/api/agent/chat/stream' || url === '/pending-global') {
      return new Response(new ReadableStream({
        start(controller) {
          signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
        }
      }));
    }
    const data = url === '/api/members' ? { members: [] } : url === '/api/conversations' ? { conversations: [] } : {};
    return Response.json({ code: 200, data });
  });
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  t.after(() => { globalThis.localStorage = originalStorage; });

  const mountedPages = new Set();
  const pageInstances = [];
  const names = ['home', 'interpret', 'records', 'knowledge', 'academy', 'about'];
  const router = createRouter({ history: createMemoryHistory(), routes: names.map(name => ({
    path: '/' + name, name, component: {
      setup() {
        mountedPages.add(name);
        onUnmounted(() => mountedPages.delete(name));
        if (name === 'interpret') pageInstances.push(useInterpretPage());
        return () => h('section', name);
      }
    }
  })) });
  let context;
  const app = renderer.createApp({
    setup() {
      context = useAppCoordinators();
      provide(APP_CONTEXT, context);
      return () => h(RouterView);
    }
  });
  app.use(createPinia()).use(router);
  await router.push('/knowledge');
  await router.isReady();
  app.mount(node());
  t.after(() => app.unmount());
  await nextTick();
  assert.ok(context.AppState && context.modules && context.actions, 'App must provide the complete shared context');
  assert.deepEqual([...mountedPages], ['knowledge']);
  assert.equal(context.AppState.currentPage, 'knowledge');
  for (const name of ['viewer', 'diagnosis', 'diagnosisResults', 'imageUpload', 'knowledge', 'academy', 'interpret']) {
    assert.equal(context.modules[name], undefined, `${name} must not be initialized globally`);
  }
  const family = context.modules.family;
  const chat = context.modules.chat;
  context.AppState.knowledge.search = '肺炎';
  context.AppState.quizAnswered['retained-answer'] = 1;

  for (const name of names) {
    await context.actions.switchPage(name);
    await nextTick();
    assert.deepEqual([...mountedPages], [name]);
    assert.equal(context.AppState.currentPage, name);
    assert.match(context.modules.navigation.navClass(name), /font-semibold/);
    assert.equal(context.modules.family, family);
    assert.equal(context.modules.chat, chat);
  }
  assert.equal(context.AppState.knowledge.search, '肺炎');
  assert.equal(context.AppState.quizAnswered['retained-answer'], 1);
  assert.equal(context.modules.interpret, undefined);

  const globalResponse = await context.api.fetch('/pending-global');
  const globalRequest = requests.find(request => request.url === '/pending-global');
  await context.actions.switchPage('interpret');
  await nextTick();
  const firstPage = pageInstances.at(-1);
  context.AppState.currentCase.sourceFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
  const analysis = firstPage.analyze();
  assert.equal(context.AppState.diagnoseStatus, 'analyzing');
  assert.equal(context.api.pendingCount(), 1, 'page requests must have their own API scope');
  await context.actions.switchPage('home');
  await nextTick();
  await analysis;
  assert.equal(requests.find(request => request.url === '/api/agent/diagnose/stream').signal.aborted, true);
  assert.equal(globalRequest.signal.aborted, false, 'leaving a page must preserve global requests');
  assert.equal(context.AppState.diagnoseStatus, 'idle');
  assert.equal(context.modules.interpret, undefined);
  await context.actions.switchPage('interpret');
  await nextTick();
  assert.notEqual(pageInstances.at(-1), firstPage, 'returning creates fresh page resources');
  assert.ok(context.modules.interpret);
  const previousCase = context.AppState.currentCase;
  const loadingSample = context.actions.openSample('teaching-pneumonia');
  await new Promise(resolve => setImmediate(resolve));
  const sampleRequest = requests.find(request => request.url === '/api/samples/teaching-pneumonia');
  assert.equal(sampleRequest.signal.aborted, false);
  await context.actions.switchPage('home');
  await nextTick();
  assert.equal(await loadingSample, false, 'a departed page cannot complete a queued teaching sample');
  assert.equal(sampleRequest.signal.aborted, true);
  assert.equal(context.AppState.currentCase, previousCase);
  assert.equal(context.modules.interpret, undefined);
  const chatting = context.modules.chat.sendAiChatMessage('生命周期回归检查');
  await nextTick();
  const chatRequest = requests.find(request => request.url === '/api/agent/chat/stream');
  assert.equal(chatRequest.signal.aborted, false);
  assert.equal(context.AppState.chat.busy, true);
  app.unmount();
  await chatting;
  assert.equal(chatRequest.signal.aborted, true, 'app teardown aborts global chat SSE');
  assert.equal(context.AppState.chat.busy, false);
  assert.equal(context.AppState.chat.messages.some(message => message.pending), false);
  assert.equal(context.modules.interpret, undefined);
  assert.equal(globalRequest.signal.aborted, true);
  assert.equal(context.api.pendingCount(), 0);
  await assert.rejects(context.api.fetch('/after-unmount'), { name: 'AbortError' });
  context.api.release(globalResponse);
});
