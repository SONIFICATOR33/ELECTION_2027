import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../js/theme.js', import.meta.url), 'utf8');
function setup(saved, blocked = false, dark = true) {
  const events = {}, storageEvents = {}, meta = {}, status = { hidden: true };
  const inputs = ['dark', 'light'].map(value => ({ value, checked: false, addEventListener(type, fn) { this[type] = fn; } }));
  const system = { matches: dark, addEventListener(type, fn) { this[type] = fn; } };
  const root = { dataset: {} };
  const document = { documentElement: root, querySelector: selector => selector.startsWith('meta') ? { setAttribute: (k, v) => meta[k] = v } : status, querySelectorAll: () => inputs, addEventListener: (type, fn) => events[type] = fn };
  const localStorage = { getItem() { if (blocked) throw Error(); return saved; }, setItem(key, value) { if (blocked) throw Error(); saved = value; } };
  runInNewContext(source, { document, localStorage, window: { matchMedia: () => system, addEventListener: (type, fn) => storageEvents[type] = fn } });
  events.DOMContentLoaded();
  return { root, meta, status, inputs, storageEvents, system, saved: () => saved };
}
test('defaults to black and restores saved white before interaction', () => {
  assert.equal(setup().root.dataset.theme, 'dark');
  const state = setup('light');
  assert.equal(state.root.dataset.theme, 'light');
  assert.equal(state.meta.content, '#ffffff');
  assert.equal(state.inputs[1].checked, true);
});
test('both choices are persisted and restored after reload', () => {
  const state = setup();
  state.inputs[1].checked = true; state.inputs[1].change();
  assert.equal(setup(state.saved()).root.dataset.theme, 'light');
  state.inputs[0].checked = true; state.inputs[0].change();
  assert.equal(setup(state.saved()).root.dataset.theme, 'dark');
});
test('blocked storage does not prevent changing appearance and reports persistence failure', () => {
  const state = setup(null, true);
  state.inputs[1].checked = true; state.inputs[1].change();
  assert.equal(state.root.dataset.theme, 'light');
  assert.equal(state.status.hidden, false);
});
test('other tabs and cleared preferences update the controls', () => {
  const state = setup();
  state.storageEvents.storage({ key: 'pdm-theme', newValue: 'light' });
  assert.equal(state.inputs[1].checked, true);
  state.storageEvents.storage({ key: null, newValue: null });
  assert.equal(state.root.dataset.theme, 'dark');
});

test('system light preference never overrides the default black background', () => {
  const state = setup(null, false, false);
  assert.equal(state.root.dataset.theme, 'dark');
  assert.equal(state.inputs[0].checked, true);
  assert.equal(setup('auto').root.dataset.theme, 'dark');
});
