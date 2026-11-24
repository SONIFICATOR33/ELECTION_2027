const buttons = [...document.querySelectorAll('[data-install]')];
const standalone = matchMedia('(display-mode: standalone)');
const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
let installPrompt;
let installed = false;

function updateButtons() {
  for (const button of buttons) {
    button.hidden = installed || standalone.matches || !!navigator.standalone;
    if (button.hidden) {
      document.getElementById(button.getAttribute('aria-controls')).hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  }
}

function instruction() {
  if (isAppleMobile) return 'Dans Safari, touche Partager, puis Sur l’écran d’accueil. Active Ouvrir comme app web et touche Ajouter.';
  if (/Android/.test(navigator.userAgent)) return 'Dans Chrome, ouvre le menu ⋮, puis touche Installer l’application ou Ajouter à l’écran d’accueil.';
  return 'Sur ordinateur, utilise l’option Installer ce site dans le menu de ton navigateur si elle est disponible.';
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = null;
  updateButtons();
});
standalone.addEventListener?.('change', updateButtons);

for (const button of buttons) {
  button.addEventListener('click', async () => {
    if (installPrompt) {
      const event = installPrompt;
      installPrompt = null;
      try { await event.prompt(); return; } catch { /* Afficher la procédure manuelle. */ }
    }
    const help = document.getElementById(button.getAttribute('aria-controls'));
    help.textContent = instruction();
    help.hidden = !help.hidden;
    button.setAttribute('aria-expanded', String(!help.hidden));
    if (!help.hidden) help.scrollIntoView({ block: 'nearest' });
  });
}
updateButtons();
