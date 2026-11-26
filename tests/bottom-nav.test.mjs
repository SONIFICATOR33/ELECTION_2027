import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../js/bottom-nav.js', import.meta.url), 'utf8');

function setup(withViewport = true) {
  const events = {}, viewportEvents = {}, values = {};
  let pending;
  const viewport = { height: 800, offsetTop: 0, addEventListener(type, fn) { viewportEvents[type] = fn; } };
  const window = { innerHeight: 900, scrollY: 0, visualViewport: withViewport ? viewport : undefined, addEventListener(type, fn) { events[type] = fn; } };
  runInNewContext(source, {
    window, document: { querySelector: () => ({ style: { setProperty: (key, value) => { values[key] = value; } } }) },
    requestAnimationFrame(fn) { pending = fn; return 1; }
  });
  return { window, viewport, events, viewportEvents, bottom: () => values['--nav-viewport-bottom'], flush() { const fn = pending; pending = null; fn?.(); } };
}

test('uses visible height instead of stale layout height; document scrolling adds no offset', () => {
  const s = setup();
  assert.equal(s.bottom(), '800px');
  s.window.scrollY = 2500;
  s.viewportEvents.scroll(); s.flush();
  assert.equal(s.bottom(), '800px');
});

test('follows keyboard, viewport panning and restoration without retaining the shortened height', () => {
  const s = setup();
  s.viewport.height = 400; s.viewport.offsetTop = 150;
  s.viewportEvents.resize(); s.viewportEvents.scroll(); s.flush();
  assert.equal(s.bottom(), '550px');
  s.viewport.height = 800; s.viewport.offsetTop = 0;
  s.viewportEvents.resize(); s.flush();
  assert.equal(s.bottom(), '800px');
  s.viewport.height = 360;
  s.events.resize(); s.flush();
  assert.equal(s.bottom(), '360px');
});

test('fallback handles resize and restoration without VisualViewport', () => {
  const s = setup(false);
  assert.equal(s.bottom(), '900px');
  s.window.innerHeight = 420; s.events.resize(); s.flush();
  assert.equal(s.bottom(), '420px');
  s.window.innerHeight = 900; s.events.pageshow(); s.flush();
  assert.equal(s.bottom(), '900px');
});
