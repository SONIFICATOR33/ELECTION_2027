// Keep the dock on the visible viewport edge, not iOS's stale layout bottom.
const nav = document.querySelector('.tabs');
const viewport = window.visualViewport;
let frame = 0;

function syncBottomNav() {
  frame = 0;
  const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  if (bottom > 0 && Number.isFinite(bottom)) {
    nav.style.setProperty('--nav-viewport-bottom', `${bottom}px`);
  }
}

function scheduleBottomNav() {
  if (!frame) frame = requestAnimationFrame(syncBottomNav);
}

if (nav) {
  syncBottomNav();
  viewport?.addEventListener('resize', scheduleBottomNav, { passive: true });
  viewport?.addEventListener('scroll', scheduleBottomNav, { passive: true });
  window.addEventListener('resize', scheduleBottomNav, { passive: true });
  window.addEventListener('pageshow', scheduleBottomNav);
}
