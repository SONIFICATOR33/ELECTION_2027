import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitView } from '../js/portrait-view.js';

test('an explicitly pending portrait retries once on reopening and stays available after a failed share', async t => {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {
        addEventListener() {}, querySelectorAll: () => []
      });
      return elements.get(selector);
    },
    querySelectorAll: () => []
  };
  const saved = new Map([
    ['pdm-portrait:alice', 'chatte'],
    ['pdm-portrait:alice:pending', '1']
  ]);
  const localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key)
  };
  const previous = { document: globalThis.document, localStorage: globalThis.localStorage };
  Object.assign(globalThis, { document, localStorage });
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });

  let player = { pid: 'alice' };
  let receive, resolveSave, rejectSave, stopped = false, writes = 0;
  const updates = [];
  const store = {
    watchPortrait(pid, update) { receive = update; return () => { stopped = true; }; },
    setPortrait: () => {
      writes++;
      return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; });
    }
  };
  const profile = portraitView({
    getPlayer: () => player, getStore: () => store,
    onUpdate: (pid, value) => updates.push([pid, value])
  });
  const share = document.querySelector('#portrait-save');
  profile.render();
  receive('bouc');
  assert.equal(profile.value(), 'chatte');
  assert.equal(writes, 1);
  assert.deepEqual(updates.at(-1), ['alice', 'chatte']);
  receive('bouc');
  rejectSave(new Error('offline'));
  await new Promise(resolve => setImmediate(resolve));
  receive('bouc');
  assert.equal(writes, 1);
  assert.equal(profile.value(), 'chatte');
  assert.equal(saved.get('pdm-portrait:alice:pending'), '1');

  const retry = share.onclick();
  assert.equal(writes, 2);
  resolveSave();
  await retry;
  assert.equal(saved.has('pdm-portrait:alice:pending'), false);
  receive('bouc');
  assert.equal(profile.value(), 'bouc');
  assert.deepEqual(updates.at(-1), ['alice', 'bouc']);

  const late = receive;
  player = { pid: 'bob' };
  profile.render();
  late('chatte');
  assert.equal(stopped, true);
  assert.equal(profile.value(), '');
});
