import { portraitSource } from './player-portrait.js?v=112';
import { showTeamComments } from './team-comments.js?v=56';
import { monthlyPhotos } from './history.js';
import { by, RESULTS, U1, U2 } from './data.js?v=50';
import { classement, current } from './scoring.js';
import { COMMON_GROUP, STAGES, visibleGameData } from './groups.js?v=109';
import { normalizeTeam, hasTeam, sameTeam, completeTeam, countTeamRoles, TEAM_ROLE_COUNT } from './team-state.js?v=114';
import { teamVoteScores } from './team-votes.js?v=109';
import { teamPosition } from './team-gauge.js?v=102';
import { createVotingOrder, unvotedGovernments, nextUnvotedGovernment } from './voting-order.js?v=109';
import { firstRoundForecast, closedForecastWeeks, forecastPhotoDate } from './community-forecast.js?v=92';
import { portraitThumb } from './fiches.js?v=51';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const name = id => by[id] ? by[id].p + ' ' + by[id].n : id;
const fmt = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const PAGE_SIZE = 50;
const thumbIcon = '<svg class="score-thumb" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 10h4v11H3zM10 10l4-7c2 0 3 1 2 4l-1 3h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2h-8z"/></svg>';
const alphabetical = (a, b) => a.pseudo.localeCompare(b.pseudo, 'fr') || a.pid.localeCompare(b.pid);
const politicalColors = ['#8B142D', '#A1394E', '#A15665', '#726A71', '#486996', '#29517E', '#173968'];

export function playersView(root, { getStore, getParticipation, getOwnPortrait, drawTeam, syncExistingTeam, notify }) {
  const find = selector => root.querySelector(selector);
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  let tab, panel;
  const status = find('#players-status');
  const startVote = find('#players-start-vote');
  const remainingBadge = find('#ranking-remaining');
  const retry = find('#players-retry');
  const syncStatus = find('#players-sync');
  const leaders = document.querySelector('[data-home-leaders]');
  const homeVote = document.querySelector('#home-vote');
  const homeVoteStatus = document.querySelector('#home-vote-status');
  const forecastPeriod = document.querySelector('#community-period');
  forecastPeriod.addEventListener('change', renderCommunityForecast);
  const dialog = document.querySelector('#player-dialog');
  const heading = document.querySelector('#player-title');
  const nextVote = document.querySelector('#player-next-vote');
  nextVote.onclick = () => nextGovernment();
  const details = document.querySelector('#player-detail');
  let display, rows = [], scores = {}, votes = [], votesReady = false, voteError = '';
  let active = false, visible = false, unsubscribes = [], generation = 0, frame, limit = PAGE_SIZE;
  let openTeam, votePending, dialogRequest, imageUrl, opener, sortViewer;
  const votingOrder = createVotingOrder();
  const portraitCache = new Map();
  function avatar(pid) {
    const value = pid === getStore().me()?.pid ? getOwnPortrait() : portraitCache.get(pid)?.value;
    return `<img class="player-avatar" data-public-portrait="${escape(pid)}" src="${escape(portraitSource(value))}" alt="" width="32" height="32" loading="lazy">`;
  }
  function updatePortrait(pid, value) {
    const src = portraitSource(value);
    for (const image of document.querySelectorAll('[data-public-portrait]')) {
      if (image.dataset.publicPortrait === pid && image.getAttribute('src') !== src) image.src = src;
    }
  }
  function loadVisiblePortraits() {
    const store = getStore(), me = store.me();
    const wanted = new Set();
    if (active && me) {
      for (const image of document.querySelectorAll('.view.on [data-public-portrait], dialog[open] [data-public-portrait]')) {
        const pid = image.dataset.publicPortrait;
        if (pid !== me.pid) wanted.add(pid);
      }
    }
    for (const [pid, entry] of portraitCache) {
      if (!wanted.has(pid)) {
        entry.stop();
        portraitCache.delete(pid);
      }
    }
    for (const pid of wanted) {
      if (portraitCache.has(pid)) continue;
      const entry = { value: '' };
      portraitCache.set(pid, entry);
      entry.stop = store.watchPortrait(pid, value => {
        if (portraitCache.get(pid) !== entry) return;
        entry.value = value;
        updatePortrait(pid, value);
      }, () => {
        if (portraitCache.get(pid) === entry) portraitCache.delete(pid);
      });
    }
  }

  function discoveryQueue() {
    const state = { pid: getStore().me()?.pid, teams: display?.teams || {}, scores, ready: Boolean(display) && votesReady };
    return unvotedGovernments(votingOrder(rows, state), state);
  }

  function renderVoteInvitation() {
    const failed = Boolean(voteError) || (!display && !retry.hidden);
    const ready = Boolean(display) && votesReady;
    const remaining = ready ? discoveryQueue().length : 0;
    const available = remaining > 0;
    homeVote.disabled = !available && !failed;
    startVote.hidden = !available;
    remainingBadge.hidden = !available;
    remainingBadge.textContent = available ? String(remaining) : '';
    find('#tab-gouves').setAttribute('aria-label', available ? `Gouves, ${remaining} à noter` : 'Gouves');
    const total = ready ? rows.filter(row => row.pid !== getStore().me().pid && completeTeam(display.teams[row.pid])).length : 0;
    find('#players-vote-count').textContent = total ? `${total - remaining} sur ${total}` : '';
    find('#players-vote-status').textContent = !ready
      ? voteError || (!display && !retry.hidden ? 'Gouvernements indisponibles.' : 'Chargement des votes…')
      : total ? (total === 1 ? 'gouve complet noté' : 'gouves complets notés') : 'Aucun gouve complet à noter pour le moment.';
    homeVote.textContent = failed ? 'Réessayer' : 'Découvrir un gouve';
    homeVoteStatus.textContent = failed ? voteError || 'Gouvernements indisponibles pour le moment.'
      : !ready ? 'Chargement des gouvernements…'
      : available ? '' : 'Tu as voté pour tous les gouvernements disponibles. Reviens découvrir les prochains !';
    homeVoteStatus.hidden = !homeVoteStatus.textContent;
  }

  function nextGovernment() {
    const next = nextUnvotedGovernment(discoveryQueue(), openTeam?.id);
    if (!next || votePending) return;
    showPlayer(opener || homeVote, { id: next.pid, kind: 'team', discovery: true });
  }

  startVote.onclick = () => { opener = startVote; nextGovernment(); };
  homeVote.onclick = () => {
    if (voteError || (!display && !retry.hidden)) { pause(); resume(false); }
    else nextGovernment();
  };

  function leaderRows(label, ranked, ready, unit) {
    const top = ranked.slice(0, 3);
    const entries = top.length ? top : [{ pseudo: '—', value: ready ? 0 : null }];
    return `<div><dt style="grid-row: span ${entries.length}">${label}</dt>` + entries.map(row =>
      `<dd class="leader-name"><span class="player-identity">${row.pid ? avatar(row.pid) : ''}<span>${escape(row.pseudo)}</span></span></dd><dd class="leader-score">${row.value == null ? '—' : fmt(row.value) + ' ' + unit}</dd>`
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
      + leaderRows('Gouves', topVotes, votesReady, '👍');
    const leaderStatus = document.querySelector('[data-leaders-status]');
    leaderStatus.textContent = !display ? status.textContent || 'Chargement…'
      : !votesReady ? voteError || 'Chargement des votes…' : '';
    leaderStatus.hidden = !leaderStatus.textContent;
    loadVisiblePortraits();
  }

  function renderCommunityForecast() {
    const podium = document.querySelector('#community-podium');
    const summary = document.querySelector('#community-podium-status');
    const note = document.querySelector('#community-history-note');
    if (!display) {
      podium.replaceChildren();
      forecastPeriod.disabled = true;
      forecastPeriod.value = 'live';
      note.textContent = '';
      summary.textContent = status.textContent || 'Chargement des pronostics…';
      return;
    }
    const photos = closedForecastWeeks();
    const dateLabel = date => date.toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris', day: 'numeric', month: 'short', year: 'numeric'
    });
    const selected = forecastPeriod.value;
    const options = '<option value="live">Aujourd’hui</option>' + photos.map(({ week, date }) =>
      `<option value="${week}">Photo du ${dateLabel(date)}</option>`).join('');
    if (forecastPeriod.innerHTML !== options) forecastPeriod.innerHTML = options;
    const archived = photos.find(({ week }) => String(week) === selected);
    forecastPeriod.value = archived ? selected : 'live';
    forecastPeriod.disabled = false;
    note.textContent = photos.length ? 'Une photo chaque lundi.'
      : 'Première photo le ' + dateLabel(forecastPhotoDate(0)) + '.';
    const { participants, rows: forecast } = firstRoundForecast(display.pronos, by, archived?.week);
    summary.textContent = participants
      ? `${archived ? 'Photo hebdo' : '1er tour'} · Moyenne de ${participants} prono${participants > 1 ? 's' : ''}`
      : archived ? 'Aucun top 5 enregistré à cette date.' : 'Le podium apparaîtra dès le premier top 5 enregistré.';
    podium.innerHTML = forecast.slice(0, 3).map(({ id, pct, rank }) => {
      const candidate = by[id], label = candidate.p + ' ' + candidate.n;
      return `<button type="button" class="home-poll-row" data-fiche="${escape(id)}" aria-label="${escape(label)}, ${fmt(pct)} %, ouvrir la fiche">
        <span class="home-rank">${rank}</span><span class="av" style="--s:32px;--c:${candidate.col}" aria-hidden="true">${portraitThumb(candidate)}</span><span class="home-candidate">${escape(label)}</span><strong>${fmt(pct)} %</strong>
      </button>`;
    }).join('');
  }

  function clearDialog() {
    dialogRequest?.abort();
    dialogRequest = null;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
    openTeam = null;
    nextVote.hidden = true;
    details.replaceChildren();
  }

  function focusPlayerAction(button) {
    if (!button?.dataset.player) return;
    const { player, detail } = button.dataset;
    const target = panel.querySelector(`[data-player="${CSS.escape(player)}"][data-detail="${detail}"]`);
    if (target) target.focus({ preventScroll: true });
    else if (!dialog.open) tab.focus({ preventScroll: true });
  }

  dialog.addEventListener('close', () => {
    clearDialog();
    loadVisiblePortraits();
    if (opener === homeVote) homeVote.focus({ preventScroll: true });
    else if (opener === startVote) (startVote.hidden ? tab : startVote).focus({ preventScroll: true });
    else if (visible) focusPlayerAction(opener);
    opener = null;
  });

  function pause() {
    generation++;
    active = visible = false;
    loadVisiblePortraits();
    for (const unsubscribe of unsubscribes) unsubscribe();
    unsubscribes = [];
    cancelAnimationFrame(frame);
    frame = null;
    if (dialog.open) dialog.close();
    clearDialog();
  }

  function selectTab(selected) {
    if (selected === tab) return;
    if (panel) {
      panel.hidden = true;
      panel.querySelector('.players-list').replaceChildren();
    }
    tab = selected;
    panel = find('#' + tab.getAttribute('aria-controls'));
    for (const item of tabs) {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    }
    panel.hidden = false;
    limit = PAGE_SIZE;
    if (visible) renderPlayers();
  }

  for (const item of tabs) {
    item.onclick = () => selectTab(item);
    item.onkeydown = event => {
      let selected;
      if (event.key === 'Home') selected = tabs[0];
      else if (event.key === 'End') selected = tabs[tabs.length - 1];
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') selected = tabs.find(other => other !== item);
      else return;
      event.preventDefault();
      selectTab(selected);
      selected.focus();
    };
  }
  selectTab(find('#tab-gouves'));

  function playerRow(row, { own, kind, subtitle, value, scoreLabel, badge = '', available, indicator = '' }) {
    const label = escape(row.pseudo);
    const identity = `<span class="player-identity">${indicator}${avatar(row.pid)}<span class="player-caption"><strong>${label}${own ? '<small> (toi)</small>' : ''}</strong><small>${subtitle}</small></span></span>`;
    const content = identity + `<span class="player-score"><span class="visually-hidden">${scoreLabel} </span>${value}</span>`
      + badge + (available || own ? '<span class="row-chevron" aria-hidden="true"></span>' : '');
    if (own) {
      const target = kind === 'team' ? 'team' : 'paris';
      return `<li><a class="ranking-row own-player" data-player="${escape(row.pid)}" data-detail="${kind}" href="#${target}" data-go="${target}">${content}</a></li>`;
    }
    if (!available) return `<li><div class="ranking-row">${content}</div></li>`;
    return `<li><button type="button" class="ranking-row" data-player="${escape(row.pid)}" data-detail="${kind}" aria-haspopup="dialog"><span class="visually-hidden">${kind === 'team' ? 'Voir le gouve de' : 'Voir les pronos de'} </span>${content}</button></li>`;
  }

  function governmentRow(row, own, positions) {
    const team = display.teams[row.pid];
    const count = own ? getParticipation().team : countTeamRoles(team);
    const full = count === TEAM_ROLE_COUNT;
    const slots = `${count}/${TEAM_ROLE_COUNT}`;
    const available = hasTeam(team);
    const subtitle = !count && !available ? 'Aucun gouve' : (full ? '' : 'En cours · ') + slots + ' postes';
    const score = scores[row.pid];
    let state = 'partial', ballot = slots, voteLabel = '';
    if (own) { ballot = '—'; voteLabel = 'Ton propre gouve'; }
    else if (votesReady && score?.rating != null) {
      state = 'rated';
      ballot = '✓ Noté';
      voteLabel = ` · ${score.rating} ${score.rating > 1 ? 'pouces' : 'pouce'}`;
    } else if (full && votesReady) { state = 'pending'; ballot = 'À noter'; }
    else if (full || !available) ballot = '—';
    const badge = `<span class="vote-badge" data-state="${state}">${ballot}<span class="visually-hidden">${voteLabel}</span></span>`;
    let indicator = '';
    if (positions) {
      const balance = positions.get(row.pid);
      const color = balance == null ? '' : politicalColors[Math.round((balance + 1) * 3)];
      const position = balance == null ? 'Sans repère' : balance < 0 ? 'À gauche' : balance > 0 ? 'À droite' : 'À l’équilibre';
      indicator = `<span class="politics-swatch" ${color ? 'style="--position:' + color + '"' : ''} title="${position}" aria-label="${position}"></span>`;
    }
    const value = votesReady ? fmt(score?.points || 0) + ' ' + thumbIcon : '—';
    return playerRow(row, { own, kind: 'team', subtitle, value, scoreLabel: 'Pouces reçus', badge, available, indicator });
  }

  function pronoRow(row, own) {
    const prono = display.pronos[row.pid] || {};
    const stages = own ? getParticipation().pronos : [prono.l1?.length, prono.l2?.length, current(prono)].filter(Boolean).length;
    const subtitle = stages ? `${stages}/3 étapes renseignées` : 'Aucun prono';
    return playerRow(row, { own, kind: 'pronos', subtitle, value: fmt(row.total), scoreLabel: 'Points', available: stages > 0 });
  }

  function renderPlayers() {
    const results = panel.querySelector('.ranking-results');
    results.hidden = !display;
    const list = panel.querySelector('.players-list');
    if (!display) { list.replaceChildren(); return; }
    const pid = getStore().me().pid;
    const isGouve = panel.id === 'ranking-gouves';
    const order = panel.querySelector('select').value;
    const positions = order === 'politics' ? new Map(rows.map(row =>
      [row.pid, teamPosition(normalizeTeam(display.teams[row.pid])).balance])) : null;
    const others = rows.filter(row => row.pid !== pid);
    if (order === 'name') others.sort(alphabetical);
    if (order === 'thumbs') others.sort((a, b) =>
      (scores[b.pid]?.points || 0) - (scores[a.pid]?.points || 0) || alphabetical(a, b));
    if (positions) others.sort((a, b) =>
      (positions.get(a.pid) ?? Infinity) - (positions.get(b.pid) ?? Infinity) || alphabetical(a, b));
    const own = rows.find(row => row.pid === pid);
    const shown = others.slice(0, limit);
    if (own) shown.unshift(own);
    const focus = document.activeElement;
    list.innerHTML = shown.map(row => isGouve ? governmentRow(row, row.pid === pid, positions) : pronoRow(row, row.pid === pid)).join('');
    focusPlayerAction(focus);
    loadVisiblePortraits();
    find('.politics-legend').hidden = !positions;
    panel.querySelector('.players-more').hidden = others.length <= limit;
  }

  function refresh() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!active) return;
      if (display) {
        rows = classement(display.players, display.pronos, RESULTS, U1, U2);
        scores = teamVoteScores(display.teams, votes, getStore().me().pid);
      }
      renderVoteInvitation();
      renderLeaders();
      renderCommunityForecast();
      if (visible) renderPlayers();
      refreshVotePanel();
    });
  }

  function refreshVotePanel() {
    nextVote.hidden = !openTeam;
    nextVote.disabled = Boolean(votePending) || !nextUnvotedGovernment(discoveryQueue(), openTeam?.id);
    const panel = details.querySelector('[data-team-vote]');
    if (!panel || !openTeam || !display) return;
    const score = scores[openTeam.id], points = score?.points || 0, voters = score?.voters || 0;
    const changed = !hasTeam(display.teams[openTeam.id]) || !sameTeam(openTeam.composition, display.teams[openTeam.id]);
    const pending = votePending === openTeam;
    const incomplete = !completeTeam(display.teams[openTeam.id]);
    const disabled = !votesReady || changed || pending || incomplete;
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset.rating : undefined;
    const voted = score?.rating != null;
    const reveal = !openTeam.discovery || voted;
    panel.innerHTML = (reveal ? '<p class="vote-score">' + (votesReady ? points + ' 👍 · ' + voters + ' votant' + (voters === 1 ? '' : 's') : escape(voteError || 'Chargement des votes…')) + '</p>' : '') +
      '<p id="team-rating-label">Pour voter, touche le nombre de pouces que tu donnes à ce gouve.</p><div class="team-rating" role="group" aria-labelledby="team-rating-label">' +
      [0, 1, 2, 3].map(rating => {
        const label = rating === 0 ? '0 · Non' : rating + ' 👍';
        const ariaLabel = rating === 0 ? '0 · Non, sans pouce' : rating + (rating === 1 ? ' pouce' : ' pouces');
        return `<button data-rating="${rating}" aria-label="${ariaLabel}" aria-pressed="${score?.rating === rating}"${disabled ? ' disabled' : ''}>${label}</button>`;
      }).join('') + '</div>' +
      (score?.rating != null ? '<button class="linkbtn" data-vote-withdraw' + ((!votesReady || pending) ? ' disabled' : '') + '>Annuler mon vote</button>' : '') +
      (openTeam.discovery && voted ? (discoveryQueue().length
        ? '<button class="big" data-vote-next' + (pending ? ' disabled' : '') + '>Gouve suivant</button>'
        : '<p role="status">Tu as voté pour tous les gouvernements disponibles. Merci !</p>') : '') +
      (incomplete ? '<p role="status">Gouve en cours : les votes ouvrent à 12/12 postes.</p>' : '') +
      (pending ? '<p role="status">Enregistrement…</p>' : '') +
      (changed ? '<p role="status">Ce gouvernement a changé. Rouvre sa fiche pour voir sa nouvelle composition.</p>' : '');
    if (focused != null && !disabled) panel.querySelector('[data-rating="' + focused + '"]')?.focus({ preventScroll: true });
  }

  details.addEventListener('click', async event => {
    if (event.target.closest('[data-vote-next]')) { nextGovernment(); return; }
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
      scores = teamVoteScores(display.teams, votes, voter);
      refresh();
      if (openTeam === target) {
        if (!target.discovery) dialog.close();
        notify(withdrawing ? 'Vote annulé.' : 'Vote enregistré !');
      }
    } catch (error) {
      if (openTeam === target) notify(error.code === 'permission-denied' ? 'Le vote n’est pas encore disponible.' : error.message || 'Vote non enregistré. Vérifie ta connexion.');
    } finally {
      votePending = null;
      if (dialog.open) refreshVotePanel();
      if (dialog.open && openTeam === target) {
        const selector = withdrawing ? '[data-vote-withdraw]' : `[data-rating="${rating}"]`;
        (details.querySelector('[data-vote-next]') || details.querySelector(selector))?.focus({ preventScroll: true });
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
      renderCommunityForecast();
      if (visible) renderPlayers();
      else loadVisiblePortraits();
      return;
    }

    active = true;
    const request = ++generation, store = getStore();
    display = null;
    if (sortViewer !== store.me().pid) {
      sortViewer = store.me().pid;
      for (const select of root.querySelectorAll('.ranking-sort select')) select.selectedIndex = 0;
      selectTab(find('#tab-gouves'));
      limit = PAGE_SIZE;
    }
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

  async function showPlayer(button, choice) {
    const { id, kind, discovery = false } = choice || { id: button.dataset.player, kind: button.dataset.detail };
    const player = display?.players[id];
    if (!player || (dialog.open && !discovery)) return;
    if (kind === 'team' && !hasTeam(display.teams[id])) return;
    clearDialog();
    opener = button;
    heading.textContent = (kind === 'team' ? 'Gouvernement de ' : 'Pronos de ') + player.pseudo;
    heading.classList.toggle('visually-hidden', kind === 'team');
    if (kind === 'pronos') details.innerHTML = playerPronos(id, display);
    else {
      openTeam = { id, discovery, composition: structuredClone(display.teams[id]) };
      details.innerHTML = '<div class="player-owner player-identity">' + avatar(id) + '<strong>' + escape(player.pseudo) + '</strong></div><div data-team-image>Chargement de l’image…</div><section class="team-vote-panel" data-team-vote></section><section class="group-stage" data-team-comments></section>';
      refreshVotePanel();
    }
    if (!dialog.open) dialog.showModal();
    else dialog.querySelector('.dialog-close').focus({ preventScroll: true });
    dialog.scrollTop = 0;
    loadVisiblePortraits();
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

  for (const select of root.querySelectorAll('.ranking-sort select')) {
    select.onchange = () => { limit = PAGE_SIZE; renderPlayers(); };
  }
  for (const more of root.querySelectorAll('.players-more')) {
    more.onclick = () => { limit += PAGE_SIZE; renderPlayers(); };
  }
  retry.onclick = () => { pause(); resume(true); };
  find('#players-resync').onclick = async () => {
    syncStatus.hidden = await syncExistingTeam();
    if (!syncStatus.hidden) notify('La synchronisation a échoué. Réessaie.');
  };
  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-player]');
    if (button) showPlayer(button);
  });

  return { resume, pause, updatePortrait };
}
