import { showTeamComments } from './team-comments.js?v=56';
import { monthlyPhotos } from './history.js';
import { by, RESULTS, U1, U2 } from './data.js?v=50';
import { classement, current } from './scoring.js';
import { COMMON_GROUP, STAGES, visibleGameData } from './groups.js?v=60';
import { normalizeTeam, hasTeam, sameTeam } from './team-state.js';
import { teamVoteScores } from './team-votes.js?v=60';
import { teamPosition } from './team-gauge.js?v=66';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const name = id => by[id] ? by[id].p + ' ' + by[id].n : id;
const fmt = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const PAGE_SIZE = 50;
const alphabetical = (a, b) => a.pseudo.localeCompare(b.pseudo, 'fr') || a.pid.localeCompare(b.pid);
const politicalColors = ['#8B142D', '#A1394E', '#A15665', '#726A71', '#486996', '#29517E', '#173968'];

export function playersView(root, { getStore, drawTeam, syncExistingTeam, notify }) {
  root.innerHTML = `<div class="players-toolbar" hidden>
    <label for="players-sort">Trier par</label>
    <select id="players-sort">
      <option value="thumbs">Nombre de pouces levés</option>
      <option value="name">Ordre alphabétique</option>
      <option value="points">Points de pronos</option>
      <option value="politics">De gauche à droite</option>
    </select>
  </div>
  <div class="politics-legend" hidden><span>Gauche</span><i aria-hidden="true"></i><span>Droite</span></div>
  <p class="fine" id="players-vote-status" role="status" hidden></p>
  <div class="players-table-wrap" hidden>
    <table class="players-table">
      <thead><tr><th scope="col">Joueur</th><th scope="col">Pronos</th><th scope="col" aria-label="Points">Pts</th><th scope="col" aria-label="Gouvernement"><abbr title="Gouvernement">Gouve</abbr></th><th scope="col" aria-label="Pouces levés">👍</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <button class="ghost" id="players-more" hidden>Afficher plus de joueurs</button>
  <p class="fine" id="players-status" role="status"></p>
  <button class="ghost" id="players-retry" hidden>Réessayer</button>
  <p class="fine" id="players-sync" hidden>Ton gouvernement attend une connexion pour être partagé. <button class="linkbtn" id="players-resync">Réessayer la synchronisation</button></p>`;

  const find = selector => root.querySelector(selector);
  const status = find('#players-status');
  const voteStatus = find('#players-vote-status');
  const tableBody = find('tbody');
  const sort = find('#players-sort');
  const more = find('#players-more');
  const retry = find('#players-retry');
  const syncStatus = find('#players-sync');
  const leaders = document.querySelector('[data-home-leaders]');
  const dialog = document.querySelector('#player-dialog');
  const heading = document.querySelector('#player-title');
  const details = document.querySelector('#player-detail');
  let display, rows = [], scores = {}, votes = [], votesReady = false, voteError = '';
  let active = false, visible = false, unsubscribes = [], generation = 0, frame, limit = PAGE_SIZE;
  let openTeam, votePending, dialogRequest, imageUrl, opener;

  function leaderRows(label, ranked, ready, unit) {
    const top = ranked.slice(0, 3);
    const entries = top.length ? top : [{ pseudo: '—', value: ready ? 0 : null }];
    return `<div><dt style="grid-row: span ${entries.length}">${label}</dt>` + entries.map(row =>
      `<dd class="leader-name">${escape(row.pseudo)}</dd><dd class="leader-score">${row.value == null ? '—' : fmt(row.value) + ' ' + unit}</dd>`
    ).join('') + '</div>';
  }

  function renderLeaders() {
    const pid = getStore().me()?.pid;
    const own = rows.find(row => row.pid === pid);
    document.querySelector('[data-player-points]').textContent = display ? fmt(own?.total || 0) + ' pts' : '—';
    document.querySelector('[data-player-thumbs]').textContent = votesReady ? fmt(scores[pid]?.points || 0) + ' 👍' : '—';
    const scoreStatus = document.querySelector('[data-player-score-status]');
    scoreStatus.textContent = !display ? status.textContent || 'Chargement des scores…'
      : !votesReady ? voteError || 'Chargement des pouces…' : '';
    scoreStatus.hidden = !scoreStatus.textContent;
    const topPoints = display ? rows.filter(row => row.total > 0).map(row => ({ ...row, value: row.total })) : [];
    const topVotes = votesReady ? rows.map(row => ({ ...row, value: scores[row.pid]?.points || 0 }))
      .filter(row => row.value > 0).sort((a, b) => b.value - a.value || alphabetical(a, b)) : [];
    leaders.innerHTML = leaderRows('Pronos', topPoints, Boolean(display), 'pts')
      + leaderRows('Gouvernement', topVotes, votesReady, '👍');
    const leaderStatus = document.querySelector('[data-leaders-status]');
    leaderStatus.textContent = !display ? status.textContent || 'Chargement…'
      : !votesReady ? voteError || 'Chargement des votes…' : '';
    leaderStatus.hidden = !leaderStatus.textContent;
  }

  function clearDialog() {
    dialogRequest?.abort();
    dialogRequest = null;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
    openTeam = null;
    details.replaceChildren();
  }

  function focusPlayerAction(button) {
    if (!button?.dataset.player) return;
    const { player, detail } = button.dataset;
    tableBody.querySelector(`[data-player="${CSS.escape(player)}"][data-detail="${detail}"]`)?.focus({ preventScroll: true });
  }

  dialog.addEventListener('close', () => {
    clearDialog();
    if (visible) focusPlayerAction(opener);
    opener = null;
  });

  function pause() {
    generation++;
    active = visible = false;
    for (const unsubscribe of unsubscribes) unsubscribe();
    unsubscribes = [];
    cancelAnimationFrame(frame);
    frame = null;
    if (dialog.open) dialog.close();
    clearDialog();
  }

  function rowHTML(row, pid, political, positions) {
    const own = row.pid === pid;
    const prono = display.pronos[row.pid] || {};
    const hasProno = Boolean(prono.l1?.length || prono.l2?.length || current(prono));
    const hasGovernment = hasTeam(display.teams[row.pid]);
    const balance = positions.get(row.pid);
    const color = balance == null ? '' : politicalColors[Math.round((balance + 1) * 3)];
    const position = balance == null ? 'Sans repère' : balance < 0 ? 'À gauche' : balance > 0 ? 'À droite' : 'À l’équilibre';
    const indicator = political ? `<span class="politics-swatch" ${color ? 'style="--position:' + color + '"' : ''} title="${position}" aria-label="${position}"></span>` : '';
    const label = escape(row.pseudo);
    const button = (labelType, type, available, target) => {
      const voted = type === 'team' && scores[row.pid]?.rating != null;
      const className = 'player-action' + (available ? ' available' : '') + (voted ? ' voted' : '');
      if (own) return `<a class="${className}" href="#${target}" data-go="${target}" aria-label="${type === 'pronos' ? 'Mes pronos' : 'Mon gouvernement'}">Ouvrir</a>`;
      const action = type === 'team' ? (voted ? 'A voté' : 'Voter') : '<svg class="player-eye" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
      const actionLabel = type === 'team'
        ? (voted ? 'A voté · Voir le gouvernement de ' : 'Voter pour le gouvernement de ')
        : 'Pronos de ';
      return available
        ? `<button class="${className}" data-player="${escape(row.pid)}" data-detail="${type}" aria-label="${actionLabel}${label}">${action}</button>`
        : `<span aria-label="${labelType} à remplir">—</span>`;
    };
    return `<tr class="${hasProno || hasGovernment ? 'participating' : ''}${own ? ' own-player' : ''}">
      <th scope="row">${indicator}${label}${own ? ' <small>toi</small>' : ''}</th>
      <td>${button('Pronos', 'pronos', hasProno, 'paris')}</td>
      <td>${fmt(row.total)}</td>
      <td>${button('Gouvernement', 'team', hasGovernment, 'team')}</td>
      <td>${votesReady ? scores[row.pid]?.points || 0 : '—'}</td>
    </tr>`;
  }

  function renderTable() {
    find('.players-toolbar').hidden = find('.players-table-wrap').hidden = !display;
    voteStatus.hidden = !display;
    if (!display) {
      tableBody.replaceChildren();
      more.hidden = find('.politics-legend').hidden = true;
      return;
    }

    const pid = getStore().me().pid;
    const political = sort.value === 'politics';
    const positions = political ? new Map(rows.map(row =>
      [row.pid, teamPosition(normalizeTeam(display.teams[row.pid])).balance])) : new Map();
    const ordered = rows.filter(row => row.pid !== pid);
    if (sort.value === 'name') ordered.sort(alphabetical);
    if (sort.value === 'thumbs') ordered.sort((a, b) =>
      (scores[b.pid]?.points || 0) - (scores[a.pid]?.points || 0) || alphabetical(a, b));
    if (political) ordered.sort((a, b) =>
      (positions.get(a.pid) ?? Infinity) - (positions.get(b.pid) ?? Infinity) || alphabetical(a, b));
    const own = rows.find(row => row.pid === pid);
    const focus = document.activeElement;
    tableBody.innerHTML = [...(own ? [own] : []), ...ordered.slice(0, limit)]
      .map(row => rowHTML(row, pid, political, positions)).join('');
    focusPlayerAction(focus);
    find('.politics-legend').hidden = !political;
    more.hidden = ordered.length <= limit;
    voteStatus.textContent = votesReady ? 'Ouvre un gouvernement pour voter de 0 à 3 👍.' : voteError || 'Chargement des votes…';
  }

  function refresh() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!active) return;
      if (display) {
        rows = classement(display.players, display.pronos, RESULTS, U1, U2);
        scores = teamVoteScores(display.teams, votes, getStore().me().pid);
      }
      renderLeaders();
      if (visible) renderTable();
      refreshVotePanel();
    });
  }

  function refreshVotePanel() {
    const panel = details.querySelector('[data-team-vote]');
    if (!panel || !openTeam || !display) return;
    const score = scores[openTeam.id], points = score?.points || 0, voters = score?.voters || 0;
    const changed = !hasTeam(display.teams[openTeam.id]) || !sameTeam(openTeam.composition, display.teams[openTeam.id]);
    const pending = votePending === openTeam;
    const disabled = !votesReady || changed || pending;
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset.rating : undefined;
    panel.innerHTML = '<p class="vote-score">' + (votesReady ? points + ' 👍 · ' + voters + ' votant' + (voters === 1 ? '' : 's') : escape(voteError || 'Chargement des votes…')) + '</p>' +
      '<p id="team-rating-label">Ton vote pour ce gouvernement</p><div class="team-rating" role="group" aria-labelledby="team-rating-label">' +
      [0, 1, 2, 3].map(rating => {
        const label = rating === 0 ? '0 · Non' : rating + ' 👍';
        const ariaLabel = rating === 0 ? '0 · Non, sans pouce' : rating + (rating === 1 ? ' pouce' : ' pouces');
        return `<button data-rating="${rating}" aria-label="${ariaLabel}" aria-pressed="${score?.rating === rating}"${disabled ? ' disabled' : ''}>${label}</button>`;
      }).join('') + '</div>' +
      (score?.rating != null ? '<button class="linkbtn" data-vote-withdraw' + (disabled ? ' disabled' : '') + '>Annuler mon vote</button>' : '') +
      (pending ? '<p role="status">Enregistrement…</p>' : '') +
      (changed ? '<p role="status">Ce gouvernement a changé. Rouvre sa fiche pour voir sa nouvelle composition.</p>' : '');
    if (focused != null && !disabled) panel.querySelector('[data-rating="' + focused + '"]')?.focus({ preventScroll: true });
  }

  details.addEventListener('click', async event => {
    const button = event.target.closest('[data-rating], [data-vote-withdraw]');
    if (!button || button.disabled || !openTeam || votePending || !votesReady) return;
    const target = openTeam;
    const withdrawing = button.hasAttribute('data-vote-withdraw');
    const rating = withdrawing ? null : Number(button.dataset.rating);
    if (rating === scores[target.id]?.rating) return;
    const store = getStore(), voter = store.me().pid, voteGeneration = generation;
    votePending = target;
    refreshVotePanel();
    try {
      let ballot;
      if (withdrawing) await store.groups.removeTeamVote(target.id);
      else ballot = await store.groups.setTeamVote(target.id, target.composition, rating);

      if (voteGeneration !== generation) return;
      votes = votes.filter(vote => vote.voter !== voter || vote.team !== target.id);
      if (ballot) votes.push(ballot);
      refresh();
      if (openTeam === target) {
        dialog.close();
        notify(withdrawing ? 'Vote annulé.' : 'A voté !');
      }
    } catch (error) {
      if (openTeam === target) notify(error.code === 'permission-denied' ? 'Le vote n’est pas encore disponible.' : error.message || 'Vote non enregistré. Vérifie ta connexion.');
    } finally {
      votePending = null;
      if (dialog.open) refreshVotePanel();
      if (dialog.open && openTeam === target) {
        const selector = withdrawing ? '[data-vote-withdraw]' : `[data-rating="${rating}"]`;
        details.querySelector(selector)?.focus({ preventScroll: true });
      }
    }
  });

  function playerPronos(id, { players, pronos }) {
    const row = rows.find(item => item.pid === id);
    const live = STAGES.map(([key, label]) => {
      const value = pronos[id]?.[key];
      const g = key === 'weeks' && value ? current({ weeks: value }) : null;
      let text = 'Aucun prono enregistré pour cette étape.';
      if (g) text = g.top.map(t => escape(name(t.id)) + ' ' + fmt(t.pct) + ' %').join(' · ') +
        '<br>Finale : ' + escape(name(g.pres)) + ' gagne avec ' + fmt(g.win) + ' %.';
      else if (Array.isArray(value) && value.length) text = value.map(candidate => escape(name(candidate))).join(', ');
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

  async function resume(showTable) {
    visible = showTable;
    if (!visible && dialog.open) dialog.close();
    if (active) {
      if (visible) renderTable();
      return;
    }

    active = true;
    const request = ++generation, store = getStore();
    display = null;
    rows = [];
    scores = {};
    votes = [];
    votesReady = false;
    voteError = '';
    retry.hidden = syncStatus.hidden = true;
    status.textContent = 'Chargement des joueurs…';
    refresh();

    if (!store.groups) {
      const data = await store.loadAll();
      if (request !== generation) return;
      display = visibleGameData({ ...data, canonical: data.pronos, teams: {} });
      voteError = 'Les votes partagés nécessitent une connexion.';
      status.textContent = '';
      refresh();
      return;
    }

    try {
      const loadPublic = async () => {
        try { return await store.groups.load(COMMON_GROUP); }
        catch (error) {
          if (error.code !== 'permission-denied') throw error;
          await store.groups.ensureCommonGroup();
          return store.groups.load(COMMON_GROUP);
        }
      };
      const [data, registered] = await Promise.all([
        loadPublic(), store.registeredPlayers().catch(error => {
          if (error.code !== 'permission-denied') throw error;
          return {};
        })
      ]);
      if (request !== generation) return;
      data.players = Object.assign(Object.create(null), data.players, registered);
      display = visibleGameData(data);
      const update = () => {
        display = visibleGameData(data);
        refresh();
      };
      status.textContent = '';
      const interrupted = () => {
        if (request !== generation) return;
        status.textContent = 'Actualisation interrompue.';
        retry.hidden = false;
      };
      unsubscribes.push(store.groups.watchTeams(COMMON_GROUP, teams => {
        if (request !== generation) return;
        data.teams = teams;
        update();
      }, interrupted));
      let loadingPlayers = false;
      if (data.canonical) unsubscribes.push(store.groups.watchPronos(pronos => {
        if (request !== generation) return;
        data.canonical = pronos;
        update();
        if (loadingPlayers || Object.keys(pronos).every(pid => Object.hasOwn(data.players, pid))) return;
        loadingPlayers = true;
        store.registeredPlayers().then(players => {
          if (request !== generation) return;
          Object.assign(data.players, players);
          update();
        }).catch(interrupted).finally(() => { loadingPlayers = false; });
      }, interrupted));
      unsubscribes.push(store.groups.watchVotes(values => {
        if (request !== generation) return;
        votes = values;
        votesReady = true;
        voteError = '';
        refresh();
      }, error => {
        if (request !== generation) return;
        votesReady = false;
        voteError = error.code === 'permission-denied' ? 'Les votes seront disponibles après activation.' : 'Votes temporairement indisponibles.';
        retry.hidden = false;
        refresh();
      }));
      refresh();
      syncExistingTeam().then(synced => { if (request === generation) syncStatus.hidden = synced; });
    } catch {
      if (request !== generation) return;
      status.textContent = 'Impossible de charger les joueurs.';
      retry.hidden = false;
      refresh();
    }
  }

  async function showPlayer(button) {
    const { player: id, detail: kind } = button.dataset;
    const player = display?.players[id];
    if (!player || dialog.open) return;
    if (kind === 'team' && !hasTeam(display.teams[id])) return;
    clearDialog();
    opener = button;
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

    dialogRequest = new AbortController();
    const { signal } = dialogRequest;
    const store = getStore();
    const image = details.querySelector('[data-team-image]');
    const composition = openTeam.composition;
    showTeamComments(details.querySelector('[data-team-comments]'), {
      groups: store.groups, code: COMMON_GROUP, team: id, player: store.me().pid, signal
    });
    try {
      const blob = await drawTeam(composition, player.pseudo);
      if (signal.aborted || !dialog.open) return;
      if (!blob) throw new Error();
      imageUrl = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Composition du gouvernement de ' + player.pseudo;
      image.replaceChildren(img);
    } catch {
      if (!signal.aborted && dialog.open) {
        heading.classList.remove('visually-hidden');
        image.textContent = 'Image indisponible.';
      }
    }
  }

  sort.addEventListener('change', () => {
    limit = PAGE_SIZE;
    renderTable();
  });
  more.onclick = () => {
    limit += PAGE_SIZE;
    renderTable();
  };
  retry.onclick = () => { pause(); resume(true); };
  find('#players-resync').onclick = async () => {
    syncStatus.hidden = await syncExistingTeam();
    if (!syncStatus.hidden) notify('La synchronisation a échoué. Réessaie.');
  };
  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-player]');
    if (button) showPlayer(button);
  });

  return { resume, pause };
}
