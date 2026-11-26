const portraits = {
  bouc: 'img/portraits/vieux-bouc.webp',
  chatte: 'img/portraits/chatte-noeud-rose.webp'
};
const photoPrefix = 'data:image/jpeg;base64,';

async function makePortrait(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choisis une image de moins de 20 Mo.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    try { await image.decode(); }
    catch { throw new Error('Cette image ne s’ouvre pas. Essaie une photo JPEG, PNG ou WebP.'); }
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height || width * height > 70_000_000) throw new Error('Choisis une image de plus petite taille.');

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 240;
    const context = canvas.getContext('2d');
    const side = Math.min(width, height);
    context.fillStyle = '#161211';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', .86);
    if (!result.startsWith(photoPrefix)) throw new Error('Cette image n’a pas pu être enregistrée.');
    return result;
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function portraitView({ getPlayer, onUpdate }) {
  const previews = document.querySelectorAll('[data-player-portrait]');
  const dialog = document.querySelector('#portrait-dialog');
  const picker = document.querySelector('#portrait-file');
  const upload = document.querySelector('#portrait-upload');
  const status = document.querySelector('#portrait-status');
  const options = [...dialog.querySelectorAll('[data-portrait]')];
  let player = null, selected = '', request = 0;

  function storageKey() { return 'pdm-portrait:' + player; }

  function load() {
    const pid = getPlayer()?.pid ?? null;
    if (player === pid) return;
    player = pid;
    selected = '';
    request++;
    if (dialog.open) dialog.close();
    if (!player) return;
    try {
      const saved = localStorage.getItem(storageKey());
      if (saved && (Object.hasOwn(portraits, saved) || saved.startsWith(photoPrefix))) selected = saved;
    } catch {}
  }

  function render() {
    load();
    const src = Object.hasOwn(portraits, selected) ? portraits[selected] : selected || portraits.bouc;
    for (const preview of previews) preview.src = src;
    for (const option of options) option.setAttribute('aria-pressed', String(option.dataset.portrait === selected));
  }

  function message(text) {
    status.textContent = text || '';
    status.hidden = !text;
  }

  function save(portrait) {
    try { localStorage.setItem(storageKey(), portrait); }
    catch { throw new Error('Impossible de conserver ce portrait sur cet appareil.'); }
    selected = portrait;
    render();
    onUpdate();
    dialog.close();
  }

  document.querySelector('#edit-portrait').onclick = () => {
    render();
    if (player && !dialog.open) dialog.showModal();
  };
  for (const option of options) option.onclick = () => {
    if (!player) return;
    request++;
    upload.disabled = false;
    try { save(option.dataset.portrait); }
    catch (error) { message(error.message); }
  };
  upload.onclick = () => picker.click();
  picker.onchange = async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file || !player) return;
    const current = ++request;
    upload.disabled = true;
    message('Préparation de ton image…');
    try {
      const image = await makePortrait(file);
      if (current === request && dialog.open && player === getPlayer()?.pid) save(image);
    } catch (error) {
      if (current === request && dialog.open) message(error.message || 'Image indisponible.');
    } finally {
      if (current === request) upload.disabled = false;
    }
  };
  dialog.addEventListener('close', () => {
    request++;
    upload.disabled = false;
    message('');
  });

  return {
    render,
    hasSelection() { load(); return Boolean(selected); }
  };
}
