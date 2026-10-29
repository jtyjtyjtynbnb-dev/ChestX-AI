import assert from 'node:assert/strict';
import test from 'node:test';

import { createApiScope } from '../src/api/client.js';

test('API scope aborts in-flight requests on teardown and releases completed streams', async () => {
  const originalFetch = globalThis.fetch;
  let capturedSignal = null;
  globalThis.fetch = async (_url, options) => {
    capturedSignal = options.signal;
    return new Response('ok', { status: 200 });
  };

  try {
    const scope = createApiScope();
    const response = await scope.fetch('/api/agent/chat/stream');
    assert.equal(scope.pendingCount(), 1);

    scope.release(response);
    assert.equal(scope.pendingCount(), 0);

    await scope.fetch('/api/agent/diagnose/stream');
    scope.abortAll();
    assert.equal(capturedSignal.aborted, true);
    assert.equal(scope.pendingCount(), 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
