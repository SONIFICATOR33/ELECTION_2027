export function accountView({ getStore, onJoin, onLogout, getParticipation, notify }) {
  const $ = selector => document.querySelector(selector);
  const accessForm = $('#access-form');
  const accessTitle = $('#access-form-title');
  const accessHelp = $('#access-help');
  const options = $('#access-options');
  const accessError = $('#access-error');
  const accessStatus = $('#access-status');
  const accessPending = $('#access-pending');
  const accessWait = $('#access-wait');
  const accessSubmit = $('#access-submit');
  const codeField = accessForm.elements.pin;
  const profileForm = $('#profile-name-form');
  const nameField = profileForm.elements['real-name'];
  const nameSubmit = profileForm.querySelector('button');
  const nameStatus = $('#profile-name-status');
  const vinceNames = $('#vince-names');
  const vinceList = $('#vince-names-list');
  const vinceStatus = $('#vince-names-status');
  const pinOutput = $('#profile-pin');
  const showPin = $('#show-pin');
  let mode = '', sessionPin = '', profileRequest = 0, listRequest = 0;

  function setAccess(action, focus = true) {
    mode = action;
    const registration = mode === 'register';
    accessForm.reset();
    accessError.hidden = accessPending.hidden = true;
    accessForm.hidden = !mode;
    options.hidden = Boolean(mode);
    accessTitle.textContent = registration ? 'Créer mon compte' : 'Retrouver mon compte';
    accessHelp.textContent = registration
      ? 'Choisis un pseudo et un code. Tes pronos et ton gouvernement enregistrés seront visibles par les autres joueurs.'
      : 'Entre le pseudo et le code de ton compte pour retrouver tes pronos et ton gouvernement.';
    codeField.autocomplete = registration ? 'new-password' : 'current-password';
    accessSubmit.textContent = registration ? 'S’inscrire' : 'Se reconnecter';
    if (focus) (mode ? accessForm.elements.pseudo : options.querySelector('button')).focus();
  }

  $('#v-acces').addEventListener('click', event => {
    const button = event.target.closest('[data-access]');
    if (button && !accessSubmit.disabled) setAccess(button.dataset.access);
  });

  accessForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (accessSubmit.disabled) return;
    const store = getStore();
    accessError.hidden = true;
    accessStatus.textContent = mode === 'register' ? 'Création de ton compte…' : 'Connexion en cours…';
    accessWait.textContent = 'Patiente un instant…';
    accessForm.hidden = true;
    accessPending.hidden = false;
    accessForm.setAttribute('aria-busy', 'true');
    accessSubmit.disabled = true;
    accessForm.querySelector('[data-access]').disabled = true;
    const slow = setTimeout(() => { accessWait.textContent = 'La connexion prend un peu de temps. La vérification continue…'; }, 8000);
    try {
      if (store.fallback) throw new Error('La connexion au jeu a échoué. Recharge la page pour réessayer.');
      const pin = codeField.value;
      const player = await store.join(accessForm.elements.pseudo.value, pin, mode);
      sessionPin = pin;
      clearTimeout(slow);
      accessStatus.textContent = 'Accès validé. Chargement de ton espace…';
      accessWait.textContent = 'Tu vas entrer dans le jeu automatiquement.';
      await onJoin(player);
      accessForm.reset();
    } catch (error) {
      accessError.textContent = error.code ? (
        error.code === 'unavailable' ? 'La connexion au jeu est momentanément indisponible.' : error.message
      ) : error.message || 'Connexion impossible. Réessaie.';
      accessError.hidden = false;
    } finally {
      clearTimeout(slow);
      accessPending.hidden = true;
      accessForm.hidden = false;
      accessSubmit.disabled = false;
      accessForm.querySelector('[data-access]').disabled = false;
      accessForm.removeAttribute('aria-busy');
      if (!accessError.hidden) codeField.focus();
    }
  });

  function setPinVisibility(visible) {
    pinOutput.textContent = visible ? sessionPin : '••••';
    showPin.textContent = visible ? 'Masquer' : 'Afficher';
    showPin.setAttribute('aria-pressed', String(visible));
  }
  showPin.onclick = () => setPinVisibility(Boolean(sessionPin) && showPin.getAttribute('aria-pressed') !== 'true');

  function renderSpaceCard(name, value, max, status, count, selection) {
    const card = $(`[data-space-card="${name}"]`);
    const progress = card.querySelector('progress');
    progress.max = max;
    progress.value = value;
    card.dataset.complete = String(value === max);
    card.querySelector('[data-space-status]').textContent = status;
    if (!count) return;
    progress.setAttribute('aria-valuetext', count);
    const counter = card.querySelector('[data-space-count]');
    const summary = card.querySelector('[data-space-summary]');
    const chosen = Boolean(selection.president || selection.primeMinister);
    counter.textContent = count;
    counter.hidden = chosen;
    summary.hidden = !chosen;

    const photo = summary.querySelector('[data-space-photo]');
    photo.hidden = !selection.photo;
    photo.innerHTML = selection.photo;
    for (const [key, person] of [['president', selection.president], ['pm', selection.primeMinister]]) {
      const choice = summary.querySelector(`[data-space-${key}]`);
      if (!choice) continue;
      choice.hidden = !person;
      choice.querySelector('b').textContent = person || '';
    }
  }

  let nameState = null;

  function renderProfileCompletion() {
    const store = getStore();
    const pid = store.me()?.pid;
    if (!pid) { nameState = null; return; }
    if (!nameState || nameState.store !== store || nameState.pid !== pid) {
      const state = nameState = { store, pid, filled: null };
      store.getRealName().then(name => {
        if (nameState !== state || store.me()?.pid !== pid || state.filled !== null) return;
        state.filled = Boolean(name.trim());
        renderProfileCompletion();
      }).catch(() => {
        if (nameState !== state) return;
        nameState = null;
        renderSpaceCard('profil', 0, 1, 'Indisponible');
      });
    }
    const filled = nameState.filled;
    renderSpaceCard('profil', Number(filled), 1, filled === null ? 'Chargement…' : filled ? 'Complet' : 'Facultatif');
  }

  function updateProfileCompletion(name) {
    nameState = { store: getStore(), pid: getStore().me()?.pid, filled: Boolean(name.trim()) };
    renderProfileCompletion();
  }

  function renderParticipation() {
    const {
      pronos, totalPronos, team, startedTeam, totalTeam,
      predictedName, predictedPortrait, presidentName, presidentPortrait, primeMinister
    } = getParticipation();
    const label = (filled, total, started = filled > 0) => filled === total ? 'Complet' : started ? 'Incomplet' : 'À remplir';
    $('#profile-pronos').textContent = label(pronos, totalPronos) + ' · ' + pronos + '/' + totalPronos;
    $('#profile-team').textContent = label(team, totalTeam, startedTeam) + ' · ' + team + '/' + totalTeam + ' postes';
    const percent = (value, max) => Math.round(100 * value / max) + ' %';
    renderProfileCompletion();
    renderSpaceCard('pronos', pronos, totalPronos, percent(pronos, totalPronos), `${pronos}/${totalPronos} pronos enregistrés`, {
      president: predictedName, photo: predictedPortrait
    });
    renderSpaceCard('gouvernement', team, totalTeam, percent(team, totalTeam), `${team}/${totalTeam} postes pourvus`, {
      president: presidentName, photo: presidentPortrait, primeMinister
    });
  }

  function closeProfile() {
    profileRequest++;
    listRequest++;
    setPinVisibility(false);
    nameField.value = '';
    vinceNames.open = false;
    vinceList.replaceChildren();
  }

  async function openProfile(player, isVince) {
    const request = ++profileRequest;
    $('#profile-pseudo').textContent = player.pseudo;
    showPin.hidden = !sessionPin;
    vinceNames.hidden = !isVince;
    nameField.value = '';
    nameField.disabled = nameSubmit.disabled = true;
    nameStatus.textContent = 'Chargement…';
    renderParticipation();
    try {
      const name = await getStore().getRealName();
      if (request !== profileRequest) return;
      updateProfileCompletion(name);
      nameField.value = name;
      nameField.disabled = nameSubmit.disabled = false;
      nameStatus.textContent = '';
    } catch {
      if (request === profileRequest) nameStatus.textContent = 'Le nom privé est indisponible pour le moment.';
    }
  }

  profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (nameSubmit.disabled) return;
    const request = profileRequest;
    const value = nameField.value.trim();
    nameField.disabled = nameSubmit.disabled = true;
    nameStatus.textContent = 'Enregistrement…';
    try {
      const store = getStore();
      const pid = store.me()?.pid;
      await store.setRealName(value);
      if (getStore() === store && store.me()?.pid === pid) updateProfileCompletion(value);
      if (request !== profileRequest) return;
      nameField.value = value;
      nameStatus.textContent = value ? 'Nom enregistré.' : 'Nom retiré.';
      if (vinceNames.open) loadNames();
    } catch {
      if (request === profileRequest) nameStatus.textContent = 'Impossible d’enregistrer ton nom. Réessaie.';
    } finally {
      if (request === profileRequest) nameField.disabled = nameSubmit.disabled = false;
    }
  });

  async function loadNames() {
    const request = ++listRequest;
    vinceList.replaceChildren();
    vinceStatus.textContent = 'Chargement…';
    try {
      const names = await getStore().listRealNames();
      if (!vinceNames.open || request !== listRequest) return;
      const list = document.createDocumentFragment();
      for (const [pseudo, name] of names.sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
        const row = document.createElement('li');
        row.textContent = pseudo + ' · ' + name;
        list.append(row);
      }
      vinceList.replaceChildren(list);
      vinceStatus.textContent = names.length ? '' : 'Aucun nom renseigné.';
    } catch {
      if (request === listRequest) vinceStatus.textContent = 'Liste indisponible pour le moment.';
    }
  }

  vinceNames.addEventListener('toggle', () => {
    if (vinceNames.open) loadNames();
    else {
      listRequest++;
      vinceList.replaceChildren();
    }
  });

  $('#logout').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await getStore().logout();
      sessionPin = '';
      ready();
      onLogout();
    } catch {
      notify('Impossible de te déconnecter. Vérifie ta connexion.');
    } finally {
      button.disabled = false;
    }
  };

  function ready() {
    $('#access-loading').hidden = true;
    setAccess('', false);
  }

  return { ready, openProfile, closeProfile, renderParticipation };
}
