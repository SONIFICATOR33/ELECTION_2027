// Apply before the stylesheet loads to avoid flashing the wrong background.
(() => {
  const key = 'pdm-theme';
  const normalize = value => value === 'light' ? 'light' : 'dark';
  let preference = 'dark';
  function apply(value) {
    preference = normalize(value);
    const theme = preference;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ffffff' : '#121212');
    for (const input of document.querySelectorAll('[name="game-theme"]')) input.checked = input.value === preference;
  }
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  apply(saved);
  document.addEventListener('DOMContentLoaded', () => {
    apply(preference);
    for (const input of document.querySelectorAll('[name="game-theme"]')) {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        apply(input.value);
        const status = document.querySelector('#theme-status');
        try { localStorage.setItem(key, normalize(input.value)); status.hidden = true; }
        catch { status.textContent = 'Le choix est appliqué, mais cet appareil ne permet pas de le mémoriser.'; status.hidden = false; }
      });
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
