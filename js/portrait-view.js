import { validPortrait, portraitSource } from './player-portrait.js?v=112';

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
    let result = canvas.toDataURL('image/jpeg', .82);
    for (const quality of [.65, .45, .25]) {
      if (result.length <= 120000) break;
      result = canvas.toDataURL('image/jpeg', quality);
    }
    if (!validPortrait(result)) throw new Error('Cette image n’a pas pu être enregistrée.');
    return result;
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function portraitView({ getPlayer, getStore, onUpdate }) {
  const previews = document.querySelectorAll('[data-player-portrait]');
  const dialog = document.querySelector('#portrait-dialog');
  const picker = document.querySelector('#portrait-file');
  const upload = document.querySelector('#portrait-upload');
  const status = document.querySelector('#portrait-status');
  const share = document.querySelector('#portrait-save');
  const profileStatus = document.querySelector('#profile-portrait-status');
  const options = [...dialog.querySelectorAll('[data-portrait]')];
  let player = null, selected = '', request = 0, saving = false, synced = false, syncError = false;
  let pending = false, stopWatching, session = 0;

  function storageKey() { return 'pdm-portrait:' + player; }

  function load() {
    const pid = getPlayer()?.pid ?? null;
    if (player === pid) return;
    stopWatching?.();
    stopWatching = null;
    const currentSession = ++session;
    player = pid;
    selected = ''; synced = false; syncError = false; saving = false; pending = false;
    request++;
    if (dialog.open) dialog.close();
    if (!player) return;
    try {
      const saved = localStorage.getItem(storageKey());
      if (validPortrait(saved)) {
        selected = saved;
        pending = localStorage.getItem(storageKey() + ':pending') === '1';
      }
    } catch {}
    stopWatching = getStore().watchPortrait(pid, value => {
      if (currentSession !== session || getPlayer()?.pid !== pid || saving) return;
      if (pending && value !== selected) return;
      if (!value && !synced) return;
      selected = value; synced = Boolean(value); pending = false; syncError = false;
      try {
        if (value) localStorage.setItem(storageKey(), value);
        else localStorage.removeItem(storageKey());
        localStorage.removeItem(storageKey() + ':pending');
      } catch {}
      render();
      onUpdate(pid, selected);
    }, () => {
      if (currentSession !== session || getPlayer()?.pid !== pid) return;
      syncError = true;
      render();
    });
  }

  function render() {
    load();
    const src = portraitSource(selected);
    for (const preview of previews) preview.src = src;
    for (const option of options) {
      option.setAttribute('aria-pressed', String(option.dataset.portrait === selected));
      option.disabled = saving;
    }
    share.disabled = saving || !selected;
    upload.disabled = saving;
    profileStatus.textContent = saving ? 'Enregistrement du portrait…' : synced ? (getStore().mode === 'local' ? 'Portrait conservé sur cet appareil (mode essai).' : 'Portrait partagé avec les autres joueurs.')
      : selected ? 'Ce portrait est sur cet appareil. Ouvre-le pour le partager.'
      : syncError ? 'Portrait du compte indisponible. Réessaie depuis ton profil.' : '';
  }

  function message(text) {
    status.textContent = text || '';
    status.hidden = !text;
  }

  async function save(portrait) {
    if (!player || saving || !validPortrait(portrait)) return;
    const pid = player, revision = ++request;
    const currentSession = session;
    selected = portrait; synced = false; saving = true; pending = true;
    // Preview immediately even if local storage is full or server sync fails.
    try { localStorage.setItem(storageKey(), portrait); localStorage.setItem(storageKey() + ':pending', '1'); } catch {}
    render(); onUpdate(pid, portrait); message('Enregistrement du portrait…');
    try {
      await getStore().setPortrait(portrait);
      if (player !== pid || revision !== request || getPlayer()?.pid !== pid) return;
      synced = true; syncError = false; pending = false;
      try { localStorage.removeItem(storageKey() + ':pending'); } catch {}
      if (dialog.open) dialog.close();
    } catch (error) {
      if (player === pid && revision === request) message(error.code === 'permission-denied'
        ? 'Photo affichée sur cet appareil. Le partage attend l’activation des portraits dans Firebase.'
        : 'Photo affichée sur cet appareil. Partage impossible : vérifie ta connexion puis réessaie.');
    } finally {
      if (currentSession === session) { saving = false; render(); }
    }
  }
  share.onclick = () => save(selected);

  for (const button of document.querySelectorAll('[data-edit-portrait]')) button.onclick = () => {
    render();
    if (player && !dialog.open) dialog.showModal();
  };
  for (const option of options) option.onclick = () => {
    if (!player || saving) return;
    save(option.dataset.portrait);
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
      if (current === request && dialog.open && player === getPlayer()?.pid) await save(image);
    } catch (error) {
      if (current === request && dialog.open) message(error.message || 'Image indisponible.');
    } finally {
      if (current === request) upload.disabled = false;
    }
  };
  dialog.addEventListener('close', () => {
    if (!saving) request++;
    upload.disabled = false;
    message('');
  });

  return {
    render,
    value() { load(); return selected; }
  };
}
