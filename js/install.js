const button = document.querySelector('#install-app');
const help = document.querySelector('#install-help');
let prompt;
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
button.hidden = !!installed;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  prompt = event;
});
window.addEventListener('appinstalled', () => { button.hidden = true; help.hidden = true; });
button.addEventListener('click', async () => {
  if (prompt) {
    const event = prompt;
    prompt = null;
    try { await event.prompt(); return; } catch { /* Instructions below */ }
  }
  help.hidden = !help.hidden;
  button.setAttribute('aria-expanded', String(!help.hidden));
});
