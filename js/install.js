const help = document.querySelector('#shortcut-help');
const instruction = document.querySelector('#shortcut-instruction');
const standalone = matchMedia('(display-mode: standalone)');
const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
let installed = false;

if (!isAppleMobile) {
  instruction.textContent = /Android/.test(navigator.userAgent)
    ? 'Ouvre le menu ⋮, puis choisis Ajouter à l’écran d’accueil.'
    : 'Dans le menu de ton navigateur, cherche Ajouter un raccourci ou Installer ce site.';
}

function updateHelp() {
  help.hidden = installed || standalone.matches || !!navigator.standalone;
}
window.addEventListener('appinstalled', () => { installed = true; updateHelp(); });
standalone.addEventListener?.('change', updateHelp);
updateHelp();
