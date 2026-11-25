import { showTeamComments } from './team-comments.js';
import { monthlyPhotos } from './history.js';
import { by, RESULTS, U1, U2 } from './data.js';
import { classement, current } from './scoring.js';
import { COMMON_GROUP, GROUP_ADMIN, GROUP_CODE, STAGES, visibleGameData } from './groups.js?v=53';
import { hasTeam, sameTeam } from './team-state.js';
import { teamVoteScores } from './team-votes.js?v=53';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const name = id => by[id] ? by[id].p + ' ' + by[id].n : id;
const fmt = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export function groupView(root, { getStore, withUser, drawTeam, syncExistingTeam, notify }) {
  let selected = COMMON_GROUP, generation = 0, display;
  let stopTeams, stopPronos, stopVotes;
  let votes = [], votesReady = false, voteError = '', ranking = 'team', openTeam, voting = false;
  function pause() {
    generation++;
    stopTeams?.();
    stopPronos?.();
    stopVotes?.();
    stopVotes = null;
    stopPronos = null;
    stopTeams = null;
    root.removeAttribute('aria-busy');
    if (dialog.open) dialog.close();
  }
  const dialog = document.querySelector('#player-dialog');
  const heading = document.querySelector('#player-title');
  const details = document.querySelector('#player-detail');
  let imageUrl;
  dialog.addEventListener('close', () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
    openTeam = null;
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
    const scores = teamVoteScores(data.teams, votes, pid);
    if (ranking === 'team') rows.sort((a, b) =>
      (scores[b.pid]?.points || 0) - (scores[a.pid]?.points || 0)
      || Number(hasTeam(data.teams[b.pid])) - Number(hasTeam(data.teams[a.pid]))
      || a.pseudo.localeCompare(b.pseudo, 'fr'));
    let rank = 0, previous = -1;
    return rows.length ? '<ul class="player-list">' + rows.map((row, index) => {
      const available = hasTeam(data.teams[row.pid]);
      const points = scores[row.pid]?.points || 0;
      if (points !== previous) rank = index + 1;
      previous = points;
      return `<li><strong>${ranking === 'team' && votesReady && points > 0 ? '<span class="player-rank">' + rank + '.</span> ' : ''}${escape(row.pseudo)}${row.pid === pid ? ' <small>(toi)</small>' : ''}</strong>
        <span class="player-points">${ranking === 'team'
          ? available ? '<span class="government-points" aria-label="' + (votesReady ? points + ' points gouvernement' : 'Votes indisponibles') + '">♥ ' + (votesReady ? points + ' pts' : '—') + '</span>' : 'À composer'
          : fmt(row.total) + ' pts pronos'}</span>
        <div class="group-actions">
          <button class="player-action" data-player="${escape(row.pid)}" data-detail="pronos">Pronos</button>
          <button class="player-action" data-player="${escape(row.pid)}" data-detail="team" ${available ? '' : 'disabled aria-label="Aucun gouvernement renseigné"'}>Gouvernement</button>
        </div></li>`;
    }).join('') + '</ul>' : '<p>Aucun joueur dans ce groupe.</p>';
  }

  function refreshRoster() {
    const target = root.querySelector('[data-player-roster]');
    if (target && display) target.innerHTML = roster(display, getStore().me().pid);
    const status = root.querySelector('[data-vote-status]');
    if (status) status.textContent = votesReady ? '1 vote = 1 point gouvernement. Ouvre une composition pour voter.' : voteError || 'Chargement des votes…';
    refreshVotePanel();
  }

  function refreshVotePanel() {
    const panel = details.querySelector('[data-team-vote]');
    if (!panel || !openTeam || !display) return;
    const score = teamVoteScores(display.teams, votes, getStore().me().pid)[openTeam.id];
    const points = score?.points || 0;
    const changed = !sameTeam(openTeam.composition, display.teams[openTeam.id]);
    panel.innerHTML = '<p class="vote-score">' + (votesReady ? points + ' vote' + (points === 1 ? '' : 's') + ' · ' + points + ' point' + (points === 1 ? '' : 's') : voteError || 'Chargement des votes…') + '</p>' +
      (openTeam.id === getStore().me().pid ? '<p class="fine">C’est ton gouvernement : à toi de convaincre les autres !</p>' :
        '<button class="team-vote-button" data-vote aria-pressed="' + Boolean(score?.supported) + '"' +
        (!votesReady || changed || voting ? ' disabled' : '') + '>' + (voting ? 'Enregistrement…' : score?.supported ? '♥ J’aime · Retirer mon vote' : '♡ J’aime ce gouvernement') + '</button>') +
      (changed ? '<p role="status">Ce gouvernement a changé. Ferme puis rouvre sa fiche pour le découvrir.</p>' : '') +
      '<p class="fine">Un vote par joueur et par gouvernement. Tu peux soutenir plusieurs compositions et retirer ton vote. Les votes comptent uniquement pour la composition soutenue.</p>';
  }

  details.addEventListener('click', async event => {
    if (!event.target.closest('[data-vote]') || voting || !votesReady || !openTeam) return;
    const target = openTeam;
    const store = getStore(), request = generation;
    const supported = teamVoteScores(display.teams, votes, store.me().pid)[target.id]?.supported;
    voting = true;
    refreshVotePanel();
    try {
      await store.groups.setTeamVote(target.id, target.composition, !supported);
      if (request === generation) notify(supported ? 'Vote retiré.' : 'Vote enregistré : +1 point !');
    } catch (error) {
      if (request === generation) notify(error.code === 'permission-denied' ? 'Le vote n’est pas encore disponible. Réessaie plus tard.' : error.message || 'Vote non enregistré. Vérifie ta connexion.');
    } finally {
      voting = false;
      if (request === generation) refreshVotePanel();
    }
  });

  function playerPronos(id, { players, pronos }) {
    const row = classement(players, pronos, RESULTS, U1, U2).find(r => r.pid === id);
    const live = STAGES.map(([key, label]) => {
      const value = pronos[id]?.[key];
      const g = key === 'weeks' && value ? current({ weeks: value }) : null;
      let text = 'Aucun prono enregistré pour cette étape.';
      if (g) text = g.top.map(t => escape(name(t.id)) + ' ' + fmt(t.pct) + ' %').join(' · ') +
        '<br>Finale : ' + escape(name(g.pres)) + ' gagne avec ' + fmt(g.win) + ' %.';
      else if (Array.isArray(value)) text = value.map(candidate => escape(name(candidate))).join(', ');
      else if (players[id]?.submitted?.includes(key) || display.unavailable?.includes(key)) {
        text = 'Prono temporairement indisponible.';
      }
      const points = key === 'weeks' ? (row?.t1 || 0) + (row?.fin || 0) : (key === 'l1' ? row?.e1 : row?.e2) || 0;
      return `<section class="group-stage"><h3>${label} · ${fmt(points)} pts</h3><p>${text}</p></section>`;
    }).join('');
    const photos = monthlyPhotos(pronos[id] || {});
    const names = ids => ids.map(x => escape(name(x))).join(', ');
    const history = photos.map(photo => `<details class="group-stage"><summary>${escape(photo.label)}</summary><ul>
      ${photo.l1 ? `<li>Encore candidats le 31 décembre : ${names(photo.l1)}</li>` : ''}
      ${photo.l2 ? `<li>500 signatures : ${names(photo.l2)}</li>` : ''}
      ${photo.weeks ? `<li>Top 5 : ${photo.weeks.top.map(t => escape(name(t.id)) + ' ' + fmt(t.pct) + ' %').join(' · ')}</li>
      <li>Vainqueur : ${escape(name(photo.weeks.pres))} · ${fmt(photo.weeks.win)} %</li>` : ''}
      </ul></details>`).join('');
    return live + '<h3>Photos mensuelles</h3>' + (history || '<p>La première photo s’affichera après la fin du mois.</p>');
  }

  async function render() {
    pause();
    const request = ++generation;
    votes = [];
    votesReady = false;
    voteError = '';
    const store = getStore();
    if (!store?.groups || !store.me()) {
      root.removeAttribute('aria-busy');
      root.innerHTML = !store?.groups ? '<p>La liste des joueurs nécessite une connexion.</p>' :
        '<p>Connecte-toi pour voir les pronos et les gouvernements de tous les joueurs.</p><button class="big" data-group-action="identify">Choisir mon pseudo</button>';
      return;
    }
    root.setAttribute('aria-busy', 'true');
    if (!root.querySelector('[data-player-roster]')) {
      root.innerHTML = '<p role="status">Chargement des joueurs…</p>';
    }
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
      display = visibleGameData(data);
      root.innerHTML = '<div class="players-toolbar"><h2>Joueurs</h2>' +
        (groups.length ? '<label class="group-filter"><span class="visually-hidden">Afficher les joueurs de</span><select id="active-group">' + groups.map(g =>
          '<option value="' + g.code + '"' + (g.code === selected ? ' selected' : '') + '>' + escape(g.name) + '</option>').join('') +
          '</select></label>' : '') + '</div>' +
        '<div class="ranking-switch" role="group" aria-label="Classer les joueurs"><button data-ranking="team" aria-pressed="' + (ranking === 'team') + '">Gouvernements</button><button data-ranking="pronos" aria-pressed="' + (ranking === 'pronos') + '">Pronos</button></div>' +
        '<p class="fine" role="status" data-vote-status>Chargement des votes…</p>' +
        '<div data-player-roster>' + roster(display, store.me().pid) + '</div>' +
        '<p class="fine">Tous les pronos et gouvernements enregistrés sont visibles par tous. Participe aux rubriques qui te plaisent.</p>' +
        '<p class="help" role="status" data-team-sync hidden>Ton gouvernement attend une connexion pour être partagé. <button class="ghost" data-group-action="retry">Réessayer</button></p>' +
        '<details class="player-groups"' + (invitation ? ' open' : '') + '><summary>Mes groupes</summary>' +
        (invitation ? '<p><button class="big" data-group-action="join">Accepter l’invitation au groupe</button></p>' : '') +
        (store.me().pid === GROUP_ADMIN ? '<p>Crée un groupe et envoie son lien aux amis que tu veux inviter.</p>' +
        '<details><summary>Créer un groupe</summary>' +
        '<form id="create-group" class="group-actions"><label>Nom du groupe <input name="name" required minlength="2" maxlength="48"></label>' +
        '<button class="big">Créer et ouvrir le groupe</button></form></details>' : '<p>Rejoins un groupe à partir du lien envoyé par Vincent.</p>') +
        (group && group.code !== COMMON_GROUP ? '<button class="ghost group-invite" data-group-action="invite">Inviter des amis dans ' + escape(group.name) + '</button>' : '') +
        '</details>';
      if (group) stopTeams = store.groups.watchTeams(group.code, teams => {
        if (request !== generation) return;
        data.teams = teams;
        display = visibleGameData(data);
        refreshRoster();
      }, () => {
        if (request === generation) notify('Actualisation des gouvernements interrompue. Rouvre cet onglet pour réessayer.');
      });
      if (data.canonical) stopPronos = store.groups.watchPronos(pronos => {
        if (request !== generation) return;
        data.canonical = pronos;
        display = visibleGameData(data);
        refreshRoster();
      }, () => {
        if (request === generation) notify('Actualisation interrompue. Rouvre cet onglet pour réessayer.');
      });
      stopVotes = store.groups.watchVotes(values => {
        if (request !== generation) return;
        votes = values;
        votesReady = true;
        voteError = '';
        refreshRoster();
      }, error => {
        if (request !== generation) return;
        votesReady = false;
        voteError = error.code === 'permission-denied' ? 'Le vote des gouvernements arrive bientôt.' : 'Votes indisponibles. Rouvre cet onglet pour réessayer.';
        refreshRoster();
      });
      // La lecture de la liste ne dépend pas de l'enregistrement du gouvernement.
      syncExistingTeam().then(synced => {
        if (request === generation) root.querySelector('[data-team-sync]').hidden = synced;
      }).catch(() => {
        if (request === generation) root.querySelector('[data-team-sync]').hidden = false;
      });
    } catch {
      if (request === generation) root.innerHTML = '<p>Impossible de charger les joueurs.</p><button class="ghost" data-group-action="retry">Réessayer</button>';
    } finally {
      if (request === generation) root.removeAttribute('aria-busy');
    }
  }

  async function showPlayer(id, kind) {
    const player = display?.players[id];
    if (!player || root.hasAttribute('aria-busy')) return;
    if (kind === 'team' && !hasTeam(display.teams[id])) return;
    heading.textContent = (kind === 'team' ? 'Gouvernement de ' : 'Pronos de ') + player.pseudo;
    heading.classList.toggle('visually-hidden', kind === 'team');
    if (kind === 'pronos') details.innerHTML = playerPronos(id, display);
    else {
      openTeam = { id, composition: structuredClone(display.teams[id]) };
      details.innerHTML = '<section class="team-vote-panel" data-team-vote></section><div data-team-image>Chargement de l’image…</div><section class="group-stage" data-team-comments></section>';
      refreshVotePanel();
    }
    dialog.showModal();
    if (kind !== 'team') return;
    const closeOnLoad = new AbortController();
    dialog.addEventListener('close', () => closeOnLoad.abort(), { once: true });
    const store = getStore();
    const image = details.querySelector('[data-team-image]');
    showTeamComments(details.querySelector('[data-team-comments]'), {
      groups: store.groups, code: selected, team: id, player: store.me().pid, signal: closeOnLoad.signal
    });
    try {
      const blob = await drawTeam(display.teams[id], player.pseudo);
      if (closeOnLoad.signal.aborted || !dialog.open) return;
      if (!blob) throw new Error();
      imageUrl = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Composition du gouvernement de ' + player.pseudo;
      image.replaceChildren(img);
    } catch {
      if (!closeOnLoad.signal.aborted && dialog.open) {
        heading.classList.remove('visually-hidden');
        image.textContent = 'Image indisponible.';
      }
    }
  }

  async function run(button, task) {
    button.disabled = true;
    try { await task(); await render(); }
    catch (err) { notify(err.message || 'Action impossible. Réessaie.'); }
    finally { button.disabled = false; }
  }

  root.addEventListener('change', async e => {
    const input = e.target;
    if (input.id === 'active-group') {
      selected = input.value;
      await render();
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const title = new FormData(e.target).get('name');
    run(e.submitter, async () => { selected = await getStore().groups.create(title); });
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ranking) {
      ranking = b.dataset.ranking;
      root.querySelectorAll('[data-ranking]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ranking === ranking)));
      refreshRoster();
      return;
    }
    if (b.dataset.player) { showPlayer(b.dataset.player, b.dataset.detail); return; }
    const action = b.dataset.groupAction;
    if (action === 'identify') { withUser(render); return; }
    if (action === 'retry') { render(); return; }
    if (!action) return;
    const code = selected;
    const groups = getStore().groups;
    run(b, async () => {
      if (action === 'join') { selected = await groups.join(invitation); removeInvite(); }
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
  return { render, pause, hasInvite: () => !!invitation };
}
