import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createInteractionScope } from '../src/composables/interactionScope.js';

const legacyStyles = readFileSync(join(import.meta.dirname, '../src/legacy.css'), 'utf8');

test('closed AI chat panel stays hidden while its open state uses flex layout', () => {
  assert.ok(
    /\.ai-chat-panel:not\(\.hidden\)\s*\{[^}]*display:\s*flex/s.test(legacyStyles),
    'the open panel should opt into its flex layout explicitly'
  );
  assert.ok(
    !/\.ai-chat-panel\s*\{[^}]*display:\s*flex/s.test(legacyStyles),
    'the base panel rule must not override the hidden utility'
  );
});

test('dispose removes native handlers and cancels pending work', async () => {
  const scope = createInteractionScope();
  const target = new EventTarget();
  let events = 0;
  let work = 0;
  scope.on(target, 'click', () => events++);
  target.dispatchEvent(new Event('click'));
  assert.equal(events, 1);
  scope.schedule(() => work++, 5);
  scope.repeat(() => work++, 5);
  scope.dispose();
  scope.dispose();
  target.dispatchEvent(new Event('click'));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(events, 1);
  assert.equal(work, 0);
  assert.equal(scope.disposed, true);
});

test('re-rendering a listener group removes the previous handlers', () => {
  const scope = createInteractionScope();
  const target = new EventTarget();
  let calls = 0;
  scope.group('records', () => scope.on(target, 'click', () => calls++));
  scope.group('records', () => scope.on(target, 'click', () => calls += 10));
  target.dispatchEvent(new Event('click'));
  assert.equal(calls, 10);
  scope.dispose();
  target.dispatchEvent(new Event('click'));
  assert.equal(calls, 10);
});
