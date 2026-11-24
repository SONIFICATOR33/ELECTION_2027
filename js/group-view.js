import { by, RESULTS, U1, U2 } from './data.js';
import { classement, current } from './scoring.js';
import { COMMON_GROUP, GROUP_CODE, STAGES } from './groups.js?v=19';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const name = id => by[id] ? by[id].p + ' ' + by[id].n : id;
const fmt = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
});

export function groupView(root, { getStore, withUser, drawTeam, notify }) {
  let selected = COMMON_GROUP, generation = 0, display;
  const dialog = document.querySelector('#player-dialog');
  const heading = document.querySelector('#player-title');
  const details = document.querySelector('#player-detail');
  let imageUrl;
  dialog.addEventListener('close', () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
    details.replaceChildren();
  });
  const requested = new URL(location.href).searchParams.get('groupe') || '';
  let invitation = GROUP_CODE.test(requested) ? requested : '';
  function removeInvite() {
    invitation = '';
    const url = new URL(location.href);
    url.searchParams.delete('groupe');
    history.replaceState(null, '', url);
  }

  function roster(data, pid) {
    const rows = classement(data.players, data.pronos, RESULTS, U1, U2);
    return rows.length ? '<ul class="player-list">' + rows.map(row => {
      const player = data.players[row.pid];
      return `<li><strong>${escape(row.pseudo)}${row.pid === pid ? ' <small>(toi)</small>' : ''}</strong>
        <span class="player-points">${fmt(row.total)} pts</span>
        <div class="group-actions">
          <button class="player-action" data-player="${escape(row.pid)}" data-detail="pronos" ${player.shared ? '' : 'disabled'}>Pronos</button>
          <button class="player-action" data-player="${escape(row.pid)}" data-detail="team" ${Object.hasOwn(data.teams, row.pid) ? '' : 'disabled'}>Gouvernement</button>
        </div></li>`;
    }).join('') + '</ul>' : '<p>Aucun joueur dans ce groupe.</p>';
  }

  function playerPronos(id, { players, pronos }) {
    const row = classement(players, pronos, RESULTS, U1, U2).find(r => r.pid === id);
    return STAGES.map(([key, label, lock]) => {
      const value = pronos[id]?.[key];
      const g = key === 'weeks' && value ? current({ weeks: value }) : null;
      let text = 'Pas encore de prono partagé.';
      if (g) text = g.top.map(t => escape(name(t.id)) + ' ' + fmt(t.pct) + ' %').join(' · ') +
        '<br>Finale : ' + escape(name(g.pres)) + ' gagne avec ' + fmt(g.win) + ' %.';
      else if (Array.isArray(value)) text = value.map(candidate => escape(name(candidate))).join(', ');
      else if (players[id]?.submitted?.includes(key) && Date.now() < +lock) {
        text = 'Prono enregistré. Révélation le ' + clock.format(lock) + ' (Paris).';
      }
      const points = key === 'weeks' ? (row?.t1 || 0) + (row?.fin || 0) : (key === 'l1' ? row?.e1 : row?.e2) || 0;
      return `<section class="group-stage"><h3>${label} · ${fmt(points)} pts</h3><p>${text}</p></section>`;
    }).join('');
  }

  async function render() {
    const request = ++generation;
    const store = getStore();
    if (!store?.groups || !store.me()) {
      root.removeAttribute('aria-busy');
      root.innerHTML = !store?.groups ? '<p>La liste des joueurs nécessite une connexion.</p>' :
        '<p>Connecte-toi pour retrouver les joueurs et voir ce qu’ils partagent.</p><button class="big" data-group-action="identify">Choisir mon pseudo</button>';
      return;
    }
    root.setAttribute('aria-busy', 'true');
    try {
      await store.groups.ensureCommonGroup().catch(console.warn);
      const groups = await store.groups.list();
      if (request !== generation) return;
      if (invitation && groups.some(g => g.code === invitation)) {
        selected = invitation;
        removeInvite();
      }
      if (!groups.some(g => g.code === selected)) selected = groups[0]?.code || COMMON_GROUP;
      const group = groups.find(g => g.code === selected);
      const [data, registered] = await Promise.all([
        group ? store.groups.load(group.code, Date.now()) : { players: {}, pronos: {}, teams: {} },
        selected === COMMON_GROUP ? store.registeredPlayers().catch(() => ({})) : {}
      ]);
      if (request !== generation) return;
      data.players = Object.assign(Object.create(null), registered, data.players);
      display = data;
      root.innerHTML = (invitation ? '<p><button class="big" data-group-action="join">Accepter l’invitation au groupe</button></p>' : '') +
        (groups.length ? '<label class="group-filter">Afficher les joueurs de <select id="active-group">' + groups.map(g =>
          '<option value="' + g.code + '"' + (g.code === selected ? ' selected' : '') + '>' + escape(g.name) + '</option>').join('') +
          '</select></label>' : '') +
        roster(data, store.me().pid) +
        '<section class="player-groups" aria-labelledby="groups-title"><h3 id="groups-title">Mes groupes</h3>' +
        '<p>Crée un groupe pour retrouver tes amis et comparer vos pronos.</p>' +
        '<details><summary>Créer un groupe</summary>' +
        '<form id="create-group" class="group-actions"><label>Nom du groupe <input name="name" required minlength="2" maxlength="48"></label>' +
        '<button class="big">Créer et ouvrir le groupe</button></form></details>' +
        (group && group.code !== COMMON_GROUP ? '<button class="ghost group-invite" data-group-action="invite">Inviter des amis dans ' + escape(group.name) + '</button>' : '') +
        (group ? '<details><summary>Partage des pronos</summary><div class="group-actions">' +
          '<button class="ghost" data-group-action="share" aria-pressed="' + group.shared + '">' +
          (group.shared ? 'Masquer mes pronos dans ce groupe' : 'Partager mes pronos dans ce groupe') + '</button></div>' +
          '<p class="help">Les pronos partagés se révèlent à la clôture.</p></details>' : '') + '</section>';
    } catch {
      if (request === generation) root.innerHTML = '<p>Impossible de charger les joueurs.</p><button class="ghost" data-group-action="retry">Réessayer</button>';
    } finally {
      if (request === generation) root.removeAttribute('aria-busy');
    }
  }

  async function showPlayer(id, kind) {
    const player = display?.players[id];
    if (!player) return;
    heading.textContent = (kind === 'team' ? 'Gouvernement de ' : 'Pronos de ') + player.pseudo;
    if (kind === 'pronos') details.innerHTML = playerPronos(id, display);
    else details.textContent = 'Chargement de l’image…';
    dialog.showModal();
    if (kind !== 'team') return;
    const closeOnLoad = new AbortController();
    dialog.addEventListener('close', () => closeOnLoad.abort(), { once: true });
    try {
      const blob = await drawTeam(display.teams[id], player.pseudo);
      if (closeOnLoad.signal.aborted || !dialog.open) return;
      if (!blob) throw new Error();
      imageUrl = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Composition du gouvernement de ' + player.pseudo;
      details.replaceChildren(img);
    } catch {
      if (!closeOnLoad.signal.aborted && dialog.open) details.textContent = 'Image indisponible.';
    }
  }

  async function run(button, task) {
    button.disabled = true;
    try { await task(); await render(); }
    catch (err) { notify(err.message || 'Action impossible. Réessaie.'); }
    finally { button.disabled = false; }
  }

  root.addEventListener('change', e => {
    if (e.target.id !== 'active-group') return;
    selected = e.target.value;
    render();
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const title = new FormData(e.target).get('name');
    run(e.submitter, async () => { selected = await getStore().groups.create(title); });
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.player) { showPlayer(b.dataset.player, b.dataset.detail); return; }
    const action = b.dataset.groupAction;
    if (action === 'identify') { withUser(render); return; }
    if (action === 'retry') { render(); return; }
    if (!action) return;
    const code = selected;
    const groups = getStore().groups;
    run(b, async () => {
      if (action === 'join') { selected = await groups.join(invitation); removeInvite(); }
      if (action === 'share') await groups.setSharing(code, b.getAttribute('aria-pressed') !== 'true');
      if (action === 'invite') {
        const url = new URL(location.pathname, location.origin);
        url.searchParams.set('groupe', code);
        url.hash = 'classement';
        if (navigator.share) {
          try { await navigator.share({ title: 'Rejoins mon groupe de pronostics', url: url.href }); }
          catch (error) { if (error.name !== 'AbortError') throw error; }
        } else {
          await navigator.clipboard.writeText(url.href);
          notify('Lien d’invitation copié.');
        }
      }
    });
  });
  return { render, hasInvite: () => !!invitation };
}
