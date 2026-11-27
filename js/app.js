import { homeCalendar } from './home-calendar.js?v=107';
import { drawTeamGauge, gaugeHeight, teamPosition } from './team-gauge.js?v=102';
import { playersView } from './players-view.js?v=105';
import { accountView } from './account-view.js?v=103';
import { portraitView } from './portrait-view.js?v=85';
import { GROUP_ADMIN } from './groups.js?v=60';
import { normalizeTeam, hasTeam } from './team-state.js';
/* =====================================================================
   LES PRONOS DES MEMBRÉS — interface
   ===================================================================== */
import * as D from './data.js?v=102';
import * as S from './scoring.js';
import { openStore } from './store.js?v=60';
import { snd } from './sound.js';
import { guilloche } from './guilloche.js';
import { initFiches, portraitThumb } from './fiches.js?v=51';

const { C, by } = D;

/* place de chaque candidat sur l'axe gauche-droite (-1 à 1), null = hors axe : sert au son */
const AXIS = (() => { const a = C.filter(c => !c.off), m = {}; a.forEach((c, i) => m[c.id] = -1 + 2 * i / (a.length - 1)); return id => id in m ? m[id] : null; })();
const byName = Object.fromEntries(C.map(c => [c.p + ' ' + c.n, c.id]));

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = v => v == null ? '–' : (+v).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const av = (c, s = 40) => c ? `<span class="av${c.und ? ' und' : ''}" style="--s:${s}px;--c:${c.col}" aria-hidden="true">${portraitThumb(c)}</span>` : '';
const clone = o => JSON.parse(JSON.stringify(o));
const OKSVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><path d="M5 12l5 5 9-10"/></svg>';
const now = () => Date.now();
const mid = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const daysTo = t => Math.round((mid(t) - mid(now())) / 864e5);
const dateFr = (t, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('fr-FR', { ...o, timeZone: 'Europe/Paris' });

const toastEl = $('#toast'); let tt;
const toast = (m, duration = 2400) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), duration); };

/* ---------- état ---------- */
let store, ME = null, ALL = { players: {}, pronos: {} };
const blankTeam = () => ({ coeur: '', pm: '', min: {}, jl: '', jn: '' });
const teamKey = () => 'pdm-team-' + (ME ? ME.pid : 'anon');
const readTeam = () => { try { return JSON.parse(localStorage.getItem(teamKey())) || {}; } catch (e) { return {}; } };
const pendingTeamSync = new Set();
const teamNeedsSync = () => {
  if (pendingTeamSync.has(teamKey())) return true;
  try { return localStorage.getItem(teamKey() + '-pending') === '1'; } catch { return false; }
};
let teamRevision = 0;
let draft = { l1: [], l2: [], gp: { pres: null, top: [], win: 52 }, team: blankTeam() };
const dirty = { l1: false, l2: false, gp: false, team: false };

const mine = () => ME ? (ALL.pronos[ME.pid] || {}) : {};
const isOpen = k => now() < { l1: +D.LOCK1, l2: +D.LOCK2, gp: +D.LOCKGP }[k];
const inBlackout = () => D.BLACKOUT.some(([a, b]) => now() >= +a && now() < +b);

function loadDraft() {
  const p = mine();
  draft.l1 = (p.l1 || []).slice(); draft.l2 = (p.l2 || []).slice();
  const cur = S.current(p); draft.gp = cur ? clone(cur) : { pres: null, top: [], win: 52 };
  draft.team = normalizeTeam(!teamNeedsSync() && Object.hasOwn(p, 'team') ? p.team : readTeam());
  teamRevision++;
  for (const k in dirty) dirty[k] = false;
}

async function refresh(force) {
  try { ALL = await store.loadAll(force); } catch (e) { console.error(e); toast('Connexion difficile : données peut-être pas à jour'); }
}

function renderSession() {
  $('#welcome-title').textContent = ME ? 'Bienvenue ' + ME.pseudo : 'Bienvenue';
  $('#space-pseudo').textContent = ME?.pseudo || '';
  const b = $('#banner');
  b.hidden = store.mode !== 'local';
  if (store.mode === 'local') b.textContent = store.fallback
    ? 'Connexion au jeu indisponible. Recharge la page pour réessayer.'
    : 'Mode essai · Tes données restent sur cet appareil.';
}

/* ===================== CALENDRIER ===================== */
function renderHero() {
  requestAnimationFrame(() => guilloche($('#gHero'), { cx: 0.85, cy: 0.3, alpha: 0.16, scale: 1.1 }));
  const jj = Math.max(0, daysTo(D.TOUR1));
  $('#jx').textContent = jj; $('#jxl').textContent = (jj > 1 ? 'jours' : 'jour') + ' avant le 1er tour, dimanche 18 avril 2027';
  const a = +D.T0, z = +D.TOUR2, pos = t => Math.max(0, Math.min(100, (t - a) / (z - a) * 100));
  const n = now(), next = D.MILESTONES.find(m => +m.at > n);
  $('#track').innerHTML = `<div class="ln0"></div><div class="ln1" style="width:${pos(n)}%"></div>` +
    D.MILESTONES.map(m => `<span class="nd ${m.kind}${+m.at < n ? ' past' : ''}" style="left:${pos(+m.at)}%" title="${esc(m.short + ' : ' + m.label)}"></span>`).join('') +
    `<span class="now" style="left:${pos(n)}%"></span>`;
  $('#steps').innerHTML = D.MILESTONES.map(m => {
    const d = daysTo(m.at), past = +m.at < n;
    return `<div class="stp${m === next ? ' next' : ''}${past ? ' past' : ''}"><b>${past ? 'Fait' : d === 0 ? 'Auj.' : 'J-' + d}</b><span>${esc(m.label)}</span><small>${esc(m.short)}</small></div>`;
  }).join('');
  const nx = $('#steps .next'); if (nx) requestAnimationFrame(() => { $('#steps').scrollLeft = Math.max(0, nx.offsetLeft - 16); });
}

function deadline(k) {
  const t = { l1: D.LOCK1, l2: D.LOCK2, gp: D.LOCKGP }[k], d = daysTo(t);
  if (!isOpen(k)) return { txt: 'Pari clos', hot: false };
  if (d <= 0) return { txt: 'Clôture ce soir', hot: true };
  return { txt: `Clôture le ${dateFr(t, { day: 'numeric', month: 'short' })}`, hot: d <= 3 };
}
const done = k => { const p = mine(); return k === 'gp' ? !!S.current(p) : !!(p[k] && p[k].length); };

function renderPollsOverview() {
  const box = $('#pollsOverview');
  const blocked = inBlackout();
  const message = 'Sondages masqués la veille et le jour du vote.';
  box.hidden = $('#pollsBody').hidden = $('#home-poll-data').hidden = blocked;
  for (const element of [$('#home-blackout'), $('#polls-blackout')]) {
    element.hidden = !blocked;
    element.textContent = blocked ? message : '';
  }
  if (blocked) return;
  const longDate = { day: 'numeric', month: 'long', year: 'numeric' };
  $('#home-poll-date').textContent = 'Mis à jour le ' + dateFr(D.PODIUM_DATE, longDate);
  $('#home-podium').innerHTML = D.POD.slice(0, 5).map(([id, value], i) => {
    const candidate = by[id], name = candidate.p + ' ' + candidate.n;
    return `<button type="button" class="home-poll-row" data-fiche="${id}" aria-label="${esc(name)}, ${fmt(value)} %, ouvrir la fiche">
      <span class="home-rank">${i + 1}</span>${av(candidate, 32)}<span class="home-candidate">${esc(name)}</span><strong>${fmt(value)} %</strong>
    </button>`;
  }).join('');
  $('#podDate').textContent = 'Dernier sondage présenté · ' + dateFr(D.LAST_POLL_DATE, longDate);
  $('#podSrc').textContent = `${D.POLL_DATE} · Moyenne au ${dateFr(D.PODIUM_DATE, longDate)}`;
  $('#movesDate').dateTime = D.PODIUM_DATE.toISOString().slice(0, 10);
  $('#movesDate').textContent = 'MàJ le ' + dateFr(D.PODIUM_DATE, { day: 'numeric', month: 'long', year: 'numeric' });
  $('#podium').innerHTML = [1, 0, 2].map(i => { const [id, v] = D.POD[i], c = by[id]; return `<div class="pcol p${i + 1}" data-fiche="${id}" role="button" tabindex="0" aria-label="Fiche de ${esc(c.p + ' ' + c.n)}">${av(c, i === 0 ? 62 : 50)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><div class="blk"><span class="rk">${i + 1}</span><span class="pv">${fmt(v)} %</span></div></div>`; }).join('');
  const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const DN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
  $('#moves').innerHTML = D.MOVES.map(([h, l]) => `<div><h3>${h}</h3>${l.map(([id, u, t]) => `<div class="mv" data-fiche="${id}" role="button" tabindex="0"><span class="ar ${u ? 'up' : 'dn'}">${u ? UP : DN}</span>${av(by[id], 40)}<div><b>${by[id].p} ${by[id].n}</b><span>${t}</span></div></div>`).join('')}</div>`).join('');
  $('#lastSrc').textContent = D.LAST_SRC;
  $('#lastLink').href = D.LAST_LINK;
  $('#lastQuestion').textContent = D.LAST_QUESTION;
  $('#duelQuestion').textContent = D.DUEL_QUESTION;
  $('#last').innerHTML = D.LAST.map(([id, v]) => `<div class="bar" data-fiche="${id}" role="button" tabindex="0">${av(by[id], 28)}<span class="nm">${by[id].n}</span><div class="tr">${typeof v === 'number' ? `<i style="width:${v / 35 * 100}%;--c:${by[id].col}"></i>` : ''}</div><span class="v">${esc(v)} %</span></div>`).join('');
}

/* ===================== MES PARIS ===================== */
function renderHomeCalendar() {
  const { stages, current, next } = homeCalendar(now(), { l1: done('l1'), l2: done('l2'), gp: done('gp') });
  const shortDate = date => dateFr(date, { day: '2-digit', month: '2-digit' });
  const stageLink = stage => `<a class="stage-status-link" data-complete="${stage.complete}" href="#paris" data-go="paris#${stage.anchor}">Étape ${stage.number} · ${stage.complete ? 'Validée' : isOpen(stage.key) ? 'À valider' : 'Non jouée'} →</a>`;
  const banner = $('#home-deadline');
  banner.hidden = !next;
  banner.innerHTML = next ? `<div><strong>Prochaine étape · ${shortDate(next.date)}</strong><span>${esc(next.label)}${next.provisional ? ' · date provisoire' : ''}</span></div>${stageLink(stages[next.stage - 1])}` : '';
  $('#home-timeline').innerHTML = stages.map(stage => `<li${stage.number === current ? ' aria-current="step"' : ''}>
    <span class="timeline-dot" aria-hidden="true">${stage.number}</span>
    <div>${stage.number === current ? '<strong class="timeline-here">Vous êtes ici</strong>' : ''}
      <h3>${stage.title}</h3>
      <p>Clôture le ${shortDate(stage.lock)}${stage.provisional ? ' (provisoire)' : ''} · ${stage.number < 3 ? 'Résultat' : 'Scrutin'} le ${shortDate(stage.end)}</p>
      ${stageLink(stage)}
    </div></li>`).join('');
  $('#home-journey-end').hidden = Boolean(current);
}

function renderParisSummary() {
  const rows = [['l1', 'Qui sera là le 31 décembre ?', 'st1'], ['l2', 'Qui aura les 500 signatures ?', 'st2'], ['gp', '1er tour : mon top 5', 'st3'], ['gp', '2e tour : ma finale', 'st4']];
  $('#parisSummary').innerHTML = rows.map(([k, t, a], i) => {
    const ok = done(k);
    return `<div class="ms${ok ? ' done' : ''}${k === 'l1' && !ok && isOpen(k) ? ' needs-prono' : ''}"><i>${ok ? OKSVG.replace('12', '16').replace('12', '16') : i + 1}</i><span>${t}<small>${ok ? 'Fait' : isOpen(k) ? 'À faire' : 'Non joué'}</small></span><a href="#paris" data-go="paris#${a}">${isOpen(k) ? (ok ? 'Modifier' : 'Jouer') : 'Voir'}</a></div>`;
  }).join('');
}

function tilesHTML(key) {
  const sel = new Set(draft[key]), open = isOpen(key);
  let h = '', off = false;
  h += '<span class="grp">De gauche à droite</span>';
  for (const c of C) {
    if (!(key === 'l1' ? D.U1 : D.U2).includes(c.id)) continue;
    if (c.off && !off) { h += '<span class="grp">Hors axe gauche-droite</span>'; off = true; }
    const on = sel.has(c.id);
    h += `<div class="tile-wrap"><button class="tile${on ? ' on' : ''}" data-id="${c.id}" aria-pressed="${on}"${open ? '' : ' disabled'}>${av(c, 44)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><small>${esc(c.note || c.party || '')}</small><span class="ok">${OKSVG}</span></button><button type="button" class="tile-fiche" data-fiche="${c.id}" aria-label="Voir la fiche de ${esc(c.p + ' ' + c.n)}">?</button></div>`;
  }
  return h;
}
function renderStage(key) {
  const n = key === 'l1' ? 1 : 2, open = isOpen(key), dl = deadline(key);
  $('#st' + n).classList.toggle('closed', !open);
  $('#st' + n).classList.toggle('needs-prono', key === 'l1' && open && !done(key));
  const e = $('#dl' + n); e.textContent = dl.txt; e.classList.toggle('hot', dl.hot);
  $('#tiles' + n).innerHTML = tilesHTML(key);
  $('#n' + n).textContent = draft[key].length;
  const b = $('#save' + n); b.hidden = !open;
  b.textContent = done(key) ? (dirty[key] ? 'Enregistrer mes changements' : 'Pari enregistré') : 'Valider mon pari';
  $('#pre' + n).hidden = !open;
}
function renderStages() {
  $('#retires').innerHTML = D.RETIRES.length ? 'Déjà retirés : ' + D.RETIRES.map(r => `<s>${esc(r.nom)}</s> (${esc(r.quand)})`).join(', ') : '';
  $('#lock2note').textContent = D.LOCK2_PROVISOIRE ? 'Date provisoire, à confirmer avant les premiers parrainages.' : '';
  renderStage('l1'); renderStage('l2');
}
['1', '2'].forEach(n => {
  const key = 'l' + n;
  $('#tiles' + n).addEventListener('click', e => {
    const b = e.target.closest('.tile'); if (!b || !isOpen(key)) return;
    const id = b.dataset.id, i = draft[key].indexOf(id);
    if (i >= 0) draft[key].splice(i, 1); else draft[key].push(id);
    dirty[key] = true; b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', i < 0);
    if (i < 0) snd.pick(AXIS(id)); else snd.unpick(AXIS(id));
    $('#n' + n).textContent = draft[key].length;
    $('#save' + n).textContent = done(key) ? 'Enregistrer mes changements' : 'Valider mon pari';
  });
  $('#save' + n).addEventListener('click', () => withMe(async () => {
    if (!draft[key].length) { snd.error(); toast('Touche au moins un candidat'); return; }
    await store.save({ [key]: draft[key].slice(), [key + 'at']: now() });
    snd.vote(); dirty[key] = false; await refresh(true); initSB(); renderAll(); $('#v-paris').scrollIntoView(); toast(n === '1' ? 'Pari « Qui sera là ? » enregistré' : 'Pari « 500 signatures » enregistré');
  }));
});
$('#pre1').onclick = () => { draft.l1 = D.U1.filter(id => !by[id].und); dirty.l1 = true; renderStage('l1'); snd.sweep(draft.l1.map(AXIS)); toast('Les déclarés actuels sont cochés : décoche ceux qui vont renoncer'); };
$('#pre2').onclick = () => { if (!draft.l1.length) { toast('Fais d’abord ton étape 1'); return; } draft.l2 = draft.l1.slice(); dirty.l2 = true; renderStage('l2'); snd.sweep(draft.l2.map(AXIS)); toast('Repris de ton étape 1 : décoche ceux qui n’auront pas leurs signatures'); };

/* ---- Repli des étapes ---- */
const SB = { 1: false, 2: false, 3: false, 4: false }, SBK = { 1: 'l1', 2: 'l2', 3: 'gp', 4: 'gp' };
function initSB() {
  const first = [1, 2, 3, 4].find(i => isOpen(SBK[i]) && !done(SBK[i]));
  [1, 2, 3, 4].forEach(i => SB[i] = i === (first || 3));
}
function renderSB() {
  [1, 2, 3, 4].forEach(i => {
    const b = $(`.tog[data-sb="${i}"]`), body = $('#sb' + i), k = SBK[i];
    body.hidden = !SB[i]; b.setAttribute('aria-expanded', SB[i]);
    b.textContent = SB[i] ? 'Replier' : isOpen(k) ? (done(k) ? 'Modifier mon pari' : 'Faire ce pari') : 'Voir mon pari';
    const p = mine();
    let t;
    if (k === 'gp') {
      const c = S.current(p);
      t = c ? (i === 3 ? 'Ton top 5 : ' + c.top.map(candidate => by[candidate.id].n).join(', ')
        : `Ton gagnant : ${by[c.pres].p} ${by[c.pres].n} · ${fmt(c.win)} %`)
        : (isOpen(k) ? 'Pas encore joué.' : 'Non joué.');
    }
    else t = p[k] && p[k].length ? `Ton pari : ${p[k].length} candidats ${k === 'l1' ? 'encore là le 31 décembre' : 'auront leurs 500 signatures'}.` : (isOpen(k) ? 'Pas encore joué.' : 'Non joué.');
    $('#sum' + i).textContent = t;
  });
}
$$('.tog').forEach(b => b.onclick = () => { const i = +b.dataset.sb; SB[i] = !SB[i]; renderSB(); if (SB[i]) b.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

/* ---- Grand Prono ---- */
const gp = () => draft.gp;
function renderPhoto() {
  const el = $('#photo'), w = S.weekOf(now()), dl = deadline('gp');
  for (const id of ['dl3', 'dl4']) { const e = $('#' + id); e.textContent = dl.txt; e.classList.toggle('hot', dl.hot); }
  if (!isOpen('gp')) { el.innerHTML = '<p class="okbar">Pronostic clos.</p>'; return; }
  const cw = S.clampWeek(w);
  el.innerHTML = done('gp')
    ? ''
    : `<div class="photo" style="background:var(--rougebg)"><b style="color:var(--rouge)">×${fmt(D.mult(cw))}</b><span>Une semaine sans prono vaut zéro.</span></div>`;
}
const rankedTop = () => [...gp().top].sort((a, b) => b.pct - a.pct);
const finalists = () => rankedTop().filter(t => t.pct > 0).slice(0, 2);
function renderPick() {
  const locked = !isOpen('gp');
  $('#pick').innerHTML = C.map(c => {
    const selected = gp().top.find(t => t.id === c.id);
    const fullName = esc(c.p + ' ' + c.n);
    return `<div class="candidate-choice"><button class="chip${selected ? ' on' : ''}" data-id="${c.id}" aria-pressed="${!!selected}" ${locked ? 'disabled' : ''}>${av(c, 32)}${fullName}</button>
      <button class="ghost candidate-help" data-fiche="${c.id}" aria-label="Fiche de ${fullName}">?</button>
      ${selected ? `<label class="prono-pct"><input type="number" min="0" max="60" step="any" inputmode="decimal" data-score="${c.id}" value="${selected.pct === 0 ? '' : selected.pct}" aria-label="Pourcentage de ${fullName}" ${locked ? 'disabled' : ''}> %</label>` : ''}</div>`;
  }).join('');
}
$('#pick').addEventListener('click', e => {
  const button = e.target.closest('.chip');
  if (!button || !isOpen('gp')) return;
  const id = button.dataset.id, i = gp().top.findIndex(t => t.id === id);
  if (i >= 0) {
    gp().top.splice(i, 1);
    snd.unpick(AXIS(id));
  } else if (gp().top.length < 5) {
    gp().top.push({ id, pct: 0 });
    snd.rank(gp().top.length - 1, AXIS(id));
  } else {
    snd.error();
    toast('Top 5 complet : retire d’abord un nom en cliquant sur le candidat que tu veux supprimer.', 6000);
    return;
  }
  dirty.gp = true;
  renderPick(); renderTotal(); renderDuel(); renderGPBtn();
  $(i < 0 ? `[data-score="${id}"]` : `#pick .chip[data-id="${id}"]`)?.focus({ preventScroll: true });
});
$('#pick').addEventListener('input', e => {
  const id = e.target.dataset.score;
  if (!id || !isOpen('gp')) return;
  gp().top.find(t => t.id === id).pct = e.target.valueAsNumber || 0;
  dirty.gp = true;
  renderTotal(); renderDuel(); renderGPBtn();
});
function renderTotal() {
  $('#total').hidden = !gp().top.length;
  const s = gp().top.reduce((a, t) => a + t.pct, 0), over = s > 100;
  $('#total').className = 'total' + (over ? ' over' : '');
  $('#total').innerHTML = `<p>${over ? `Ton top 5 fait ${fmt(s)} %, ça dépasse 100 %` : `Top 5 : ${fmt(s)} %, il reste ${fmt(100 - s)} % pour les autres`}</p><div class="tr"><i style="width:${Math.min(100, s)}%;--c:${over ? 'var(--rouge)' : 'var(--bleuT)'}"></i></div>`;
}
function renderDuel() {
  const el = $('#duel'), g = gp();
  const pair = finalists();
  if (pair.length < 2) { el.innerHTML = '<p class="help">Saisis deux scores au premier tour pour voir ta finale.</p>'; renderCoh(); return; }
  const [a, b] = pair.map(t => t.id), inF = g.pres === a || g.pres === b;
  const fin = t => `<button class="fin${g.pres === t.id ? ' win' : ''}" data-id="${t.id}" aria-pressed="${g.pres === t.id}" ${isOpen('gp') ? '' : 'disabled'}>${av(by[t.id], 56)}<b>${esc(by[t.id].p + ' ' + by[t.id].n)}</b><span>${fmt(t.pct)} % au 1er tour</span></button>`;
  const w = inF ? g.pres : null, l = w === a ? b : a;
  el.innerHTML = `<div class="duel">${fin(pair[0])}<span class="vs">contre</span>${fin(pair[1])}</div>` +
    (w ? `<div class="final-scores"><label class="prono-pct">${esc(by[w].n)} <input type="number" id="win" min="50" max="80" step="any" inputmode="decimal" value="${g.win}" ${isOpen('gp') ? '' : 'disabled'}> %</label>
      <span>${esc(by[l].n)} <output id="losing-score">${fmt(100 - g.win)}</output> %</span></div>`
      : '<p class="help">Touche ton vainqueur pour saisir son score.</p>');
  renderCoh();
}
function renderCoh() {
  const g = gp(), el = $('#coh'), ref = draft.l2.length ? draft.l2 : draft.l1, lab = draft.l2.length ? 'ton pari des 500 signatures' : 'ton pari « Qui sera là ? »';
  const out = ref.length ? [g.pres, ...g.top.map(t => t.id)].filter((id, i, a) => id && a.indexOf(id) === i && !ref.includes(id)) : [];
  el.hidden = !out.length;
  if (out.length) el.textContent = `Attention : ${out.map(id => by[id].n).join(', ')} ${out.length > 1 ? 'ne sont pas' : 'n’est pas'} dans ${lab}. C’est permis, mais pas très cohérent.`;
}
$('#duel').addEventListener('click', e => {
  const button = e.target.closest('.fin');
  if (!button || !isOpen('gp')) return;
  gp().pres = button.dataset.id;
  dirty.gp = true;
  snd.pick(AXIS(gp().pres), true);
  renderDuel(); renderGPBtn();
  $('#win')?.focus({ preventScroll: true });
});
$('#duel').addEventListener('input', e => {
  if (e.target.id !== 'win' || !isOpen('gp')) return;
  gp().win = e.target.valueAsNumber;
  $('#losing-score').textContent = Number.isFinite(gp().win) ? fmt(100 - gp().win) : '—';
  dirty.gp = true;
  renderGPBtn();
});
function renderGPBtn() {
  const b = $('#saveGP'); b.hidden = !isOpen('gp');
  b.textContent = done('gp') ? (dirty.gp ? 'Enregistrer mes changements' : 'Deux tours enregistrés') : 'Enregistrer les deux tours';
}
$('#saveGP').onclick = () => withMe(async () => {
  const g = gp(), er = [], s = g.top.reduce((a, t) => a + t.pct, 0);
  if (!g.pres) er.push('Choisis qui va gagner.');
  if (g.top.length < 5) er.push('Complète ton top 5 du 1er tour.');
  if (s === 0 || g.top.some(t => t.pct < 0 || t.pct > 60)) er.push('Renseigne les scores du top 5, entre 0 et 60 %.');
  if (s > 100) er.push('Ton top 5 dépasse 100 %.');
  if (g.pres && !finalists().some(t => t.id === g.pres)) er.push('Choisis le vainqueur parmi les deux meilleurs scores.');
  if (!Number.isFinite(g.win) || g.win < 50 || g.win > 80) er.push('Saisis un score de finale entre 50 et 80 %.');
  const E = $('#errs');
  if (er.length) { snd.error(); E.innerHTML = er.map(esc).join('<br>'); E.classList.add('on'); E.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  E.classList.remove('on');
  await store.save({}, { pres: g.pres, top: rankedTop().map(t => ({ id: t.id, pct: t.pct })), win: g.win });
  snd.vote(); dirty.gp = false; await refresh(true); renderAll(); toast('Prono enregistré');
});
const recapDialog = $('#recap-dialog');
let recapUrl, recapFile;
recapDialog.addEventListener('close', () => {
  if (recapUrl) URL.revokeObjectURL(recapUrl);
  recapUrl = recapFile = null;
  $('#recap-image').removeAttribute('src');
});
$('#prono-recap').onclick = async () => {
  const blob = await drawPronoRecap();
  if (!blob) { toast('Impossible de créer l’image.'); return; }
  recapFile = new File([blob], 'mes-pronos.png', { type: 'image/png' });
  recapUrl = URL.createObjectURL(recapFile);
  $('#recap-image').src = recapUrl;
  recapDialog.showModal();
};
$('#recap-share').onclick = async () => {
  if (navigator.canShare?.({ files: [recapFile] })) {
    try { await navigator.share({ files: [recapFile], title: 'Mes pronos' }); }
    catch (err) { if (err.name !== 'AbortError') toast('Partage de l’image impossible.'); }
  } else {
    const link = document.createElement('a');
    link.href = recapUrl;
    link.download = recapFile.name;
    link.click();
  }
};

async function drawPronoRecap() {
  try { await Promise.all([document.fonts.load('600 64px "Manrope"'), document.fonts.load('500 32px "Manrope"')]); } catch {}
  const font = '"Manrope", system-ui, sans-serif';
  const saved = mine(), g = S.current(saved);
  const candidate = id => by[id] ? by[id].p + ' ' + by[id].n : id;
  const sections = [
    ['Encore candidats le 31 décembre', (saved.l1 || []).map(candidate)],
    ['500 signatures', (saved.l2 || []).map(candidate)],
    ['Premier tour · Mon top 5', (g?.top || []).map((t, i) => `${i + 1}. ${candidate(t.id)} · ${fmt(t.pct)} %`)],
    ['Second tour · Mon vainqueur', g?.pres ? [`${candidate(g.pres)} · ${fmt(g.win)} %`] : []]
  ];
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 230 + sections.reduce((h, [, lines]) => h + 92 + Math.max(lines.length, 1) * 43, 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#F3E6C8';
  ctx.font = '600 64px ' + font;
  ctx.fillText('Mes pronos', 64, 96);
  ctx.font = '500 32px ' + font;
  ctx.fillText(ME ? `Prone ton President · ${ME.pseudo}` : 'Prone ton President', 64, 151, 952);
  let y = 237;
  for (const [title, lines] of sections) {
    ctx.fillStyle = '#E6D3A3';
    ctx.font = '700 36px ' + font;
    ctx.fillText(title, 64, y, 952);
    y += 52;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.87)';
    ctx.font = '500 32px ' + font;
    for (const line of lines.length ? lines : ['Prono non enregistré']) {
      ctx.fillText(line, 64, y, 952);
      y += 43;
    }
    y += 40;
  }
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/* ===================== TEAM DE RÊVE ===================== */
const excludedFromTeam = new Set(['Delphine Batho', 'Karim Bouamrane', 'Olivier Becht']);
const teamCandidates = C.filter(c => !excludedFromTeam.has(c.p + ' ' + c.n));
const lastName = n => n.replace(/^(\S+\s)+?(?=(de |Le |La )?\S+$)/, '');
const GROUPS_HTML = D.PEOPLE_GROUPS.map(([g, l]) => `<optgroup label="${esc(g)}">${l.filter(n => !excludedFromTeam.has(n)).sort((a, b) => lastName(a).localeCompare(lastName(b), 'fr')).map(n => `<option>${esc(n)}</option>`).join('')}</optgroup>`).join('');
const OPTS = '<option value="">Choisir…</option>' + GROUPS_HTML + '<option value="__autre">Autre…</option>';
const OPTS_PM = '<option value="">Choisir…</option>' + GROUPS_HTML;
const OPTS_COEUR = '<option value="">Choisir…</option>' + [['De gauche à droite', teamCandidates.filter(c => !c.off)], ['Hors axe gauche-droite', teamCandidates.filter(c => c.off)]]
  .map(([g, l]) => `<optgroup label="${g}">${l.map(c => `<option>${esc(c.p + ' ' + c.n)}</option>`).join('')}</optgroup>`).join('');
const selHTML = (k, label, opts = OPTS) => `<div class="sel" data-k="${esc(k)}"><select aria-label="${esc(label)}">${opts}</select><input type="text" placeholder="Tape le nom" maxlength="40" autocomplete="off" aria-label="${esc(label)}, autre nom"></div>`;
$('#t-pm').innerHTML = selHTML('pm', 'Premier ministre', OPTS_PM);
$('#t-coeur').innerHTML = selHTML('coeur', 'Président', OPTS_COEUR);
$('#mins').innerHTML = D.POSTES.map(p => `<div class="minrow"><span>${esc(p)}</span>${selHTML('min:' + p, p)}</div>`).join('');
$('#t-jn').innerHTML = selHTML('jn', 'Nommé au ministère joker');
function getT(k) { return ['pm', 'jn', 'coeur'].includes(k) ? draft.team[k] || '' : (draft.team.min || {})[k.slice(4)] || ''; }
function setT(k, v) { if (['pm', 'jn', 'coeur'].includes(k)) draft.team[k] = v; else { draft.team.min = draft.team.min || {}; draft.team.min[k.slice(4)] = v; } dirty.team = true; }
function renderTeam() {
  $$('#v-team .sel').forEach(d => {
    const v = getT(d.dataset.k), s = d.querySelector('select'), i = d.querySelector('input');
    if (!v) { s.value = ''; i.value = ''; d.classList.remove('other'); }
    else if ([...s.options].some(o => o.value === v)) { s.value = v; i.value = ''; d.classList.remove('other'); }
    else if ([...s.options].some(o => o.value === '__autre')) { s.value = '__autre'; i.value = v; d.classList.add('other'); }
    else { s.add(new Option(v, v)); s.value = v; d.classList.remove('other'); }
  });
  $('#t-jl').value = draft.team.jl || '';
  renderPublish();
}
let teamSync = Promise.resolve();

function queueTeamSync(onlyMissing) {
  if (!ME || !store?.groups) return Promise.resolve();
  const player = ME.pid, revision = teamRevision, key = teamKey();
  const team = hasTeam(draft.team) ? clone(draft.team) : null;
  teamSync = teamSync.catch(() => {}).then(async () => {
    if (ME?.pid !== player || revision !== teamRevision) return;
    const value = await store.groups.syncSharedTeam(team, onlyMissing && !teamNeedsSync());
    // Une sauvegarde terminée ne doit pas effacer une modification plus récente.
    if (ME?.pid === player && revision === teamRevision) {
      draft.team = normalizeTeam(value);
      (ALL.pronos[player] ||= {}).team = value;
      try {
        localStorage.setItem(key, JSON.stringify(draft.team));
        localStorage.removeItem(key + '-pending');
      } catch {}
      pendingTeamSync.delete(key);
      renderTeam();
      if (currentView === 'profil' || currentView === 'espace') account.renderParticipation();
    }
  });
  return teamSync;
}

function syncExistingTeam() {
  return queueTeamSync(true).then(() => true).catch(error => { console.warn(error); return false; });
}

const countTeamRoles = team => Number(Boolean(team?.coeur)) + Number(Boolean(team?.pm)) + D.POSTES.filter(p => team?.min?.[p]).length;
const teamCount = () => countTeamRoles(draft.team);
function renderTeamGauge() {
  const position = teamPosition(draft.team);
  const card = $('#team-gauge');
  card.hidden = !position.filled;
  if (card.hidden) return;
  const canvas = $('#team-gauge-canvas');
  canvas.height = gaugeHeight(position);
  canvas.setAttribute('aria-label', 'Polarité politique : ' + position.label);
  drawTeamGauge(canvas.getContext('2d'), 0, 0, canvas.width, position);
}
function renderPublish() {
  renderTeamGauge();
  const n = teamCount(), ok = n === 12, b = $('#teamShare');
  b.disabled = !ok; b.classList.toggle('off', !ok);
  b.textContent = 'Faire une image de mon gouvernement';
  $('#pubHelp').textContent = ok ? '' : `${n}/12 postes remplis`;
}
$('#v-team').addEventListener('change', e => {
  const d = e.target.closest('.sel'); if (!d || e.target.tagName !== 'SELECT') return;
  const v = e.target.value;
  if (v === '__autre') { d.classList.add('other'); const i = d.querySelector('input'); setT(d.dataset.k, i.value.trim()); i.focus(); }
  else { d.classList.remove('other'); setT(d.dataset.k, v); if (v) snd.pick(v in byName ? AXIS(byName[v]) : null); }
  const was = !$('#teamShare').disabled; saveTeam(); syncEditedTeam(); renderPublish(); if (!was && !$('#teamShare').disabled) { snd.logo(); toast('Gouvernement complet : tu peux faire une image.'); }
});
$('#v-team').addEventListener('input', e => {
  if (e.target.id === 't-jl') { draft.team.jl = e.target.value; dirty.team = true; saveTeam(); return; }
  const d = e.target.closest('.sel'); if (d && e.target.tagName === 'INPUT') { setT(d.dataset.k, e.target.value.trim()); saveTeam(); renderPublish(); }
});
$('#v-team').addEventListener('change', e => {
  if (e.target.matches('#t-jl, .sel input')) syncEditedTeam();
});
window.addEventListener('online', syncExistingTeam);
function syncEditedTeam() {
  queueTeamSync(false).catch(() => toast('Le gouvernement n’a pas pu être partagé. Vérifie ta connexion.'));
}
function saveTeam() {
  teamRevision++;
  pendingTeamSync.add(teamKey());
  try {
    localStorage.setItem(teamKey(), JSON.stringify(draft.team));
    localStorage.setItem(teamKey() + '-pending', '1');
    dirty.team = false;
  } catch {}
}

const teamImageDialog = $('#team-image-dialog');
const teamImagePreview = $('#team-image-preview');
const teamImageShare = $('#team-image-share');
const teamImageDownload = $('#team-image-download');
const castingTitle = pseudo => {
  const author = pseudo?.trim();
  return author ? 'Le casting ' + (/^[aeiouyàâäéèêëîïôöùûü]/i.test(author) ? 'd’' : 'de ') + author : 'Mon casting';
};
let teamImageUrl, teamImageFile;

teamImageDialog.addEventListener('close', () => {
  URL.revokeObjectURL(teamImageUrl);
  teamImagePreview.removeAttribute('src');
  teamImageDownload.removeAttribute('href');
  teamImageFile = null;
});

teamImageShare.onclick = async () => {
  if (!teamImageFile) return;
  try {
    await navigator.share({
      files: [teamImageFile], title: 'Mon gouvernement',
      text: 'Mon gouvernement de rêve, et toi ? ' + location.origin + location.pathname
    });
  } catch (error) {
    if (error.name !== 'AbortError') toast('Partage impossible. Tu peux télécharger l’image.');
  }
};

$('#teamShare').onclick = async event => {
  if (teamCount() < 12) { snd.error(); toast('Complète d’abord ton gouvernement'); return; }
  const button = event.currentTarget;
  button.disabled = true;
  try {
    if (dirty.team) saveTeam();
    snd.logo();
    const blob = await drawTeam();
    if (!blob) throw new Error('Image indisponible');
    teamImageFile = new File([blob], 'mon-gouvernement.png', { type: 'image/png' });
    teamImageUrl = URL.createObjectURL(blob);
    teamImagePreview.src = teamImageUrl;
    teamImagePreview.alt = castingTitle(ME?.pseudo) + ' · gouvernement et polarité politique';
    teamImageDialog.setAttribute('aria-label', castingTitle(ME?.pseudo));
    teamImageDownload.href = teamImageUrl;
    teamImageShare.hidden = !(navigator.share && navigator.canShare?.({ files: [teamImageFile] }));
    teamImageDialog.showModal();
  } catch {
    toast('Impossible de créer l’image. Réessaie.');
  } finally {
    renderPublish();
  }
};
async function drawTeam(t = draft.team, pseudo = ME?.pseudo || '') {
  try { await Promise.all([document.fonts.load('600 60px "Manrope"'), document.fonts.load('700 54px "Manrope"'), document.fonts.load('500 26px "Manrope"')]); } catch {}
  const position = teamPosition(t);
  const gaugeWidth = 912;
  const gaugeBottom = 1010 + gaugeHeight(position) * gaugeWidth / 640;
  const cv = document.createElement('canvas'), W = cv.width = 1080, H = cv.height = Math.ceil(gaugeBottom + 115);
  const x = cv.getContext('2d');
  const font = '"Manrope", system-ui, sans-serif';
  const cream = 'rgba(255, 255, 255, 0.87)';
  const black = '#0a0a0a';
  const margin = 54, gap = 16, cardWidth = (W - 2 * margin - gap) / 2;
  const colors = ['#F4D078', '#F5AE96', '#C9D9FF', '#9ED8D2', '#D9BBFF'];
  const title = castingTitle(pseudo);

  function card(label, name, left, top, width, height, accent, role = 'ministre') {
    const primary = role !== 'ministre', president = role === 'président';
    x.fillStyle = black;
    x.beginPath();
    x.roundRect(left, top, width, height, 15);
    x.fill();
    x.strokeStyle = primary ? accent : '#383838';
    x.lineWidth = 2;
    x.stroke();
    if (!primary) {
      x.fillStyle = accent;
      x.fillRect(left + 13, top + 15, 4, height - 30);
    }
    x.fillStyle = accent;
    const textWidth = width - 58;
    x.font = '700 ' + (president ? 34 : 29) + 'px ' + font;
    x.fillText(fit(x, label, textWidth), left + 28, top + 36);
    x.fillStyle = cream;
    const person = name || 'Poste libre';
    const baseSize = president ? 54 : primary ? 46 : 41;
    x.font = '700 ' + baseSize + 'px ' + font;
    const size = Math.max(30, Math.min(baseSize, Math.floor(baseSize * textWidth / x.measureText(person).width)));
    x.font = '700 ' + size + 'px ' + font;
    x.fillText(fit(x, person, textWidth), left + 28, top + (primary ? 94 : 80));
  }

  x.fillStyle = black;
  x.fillRect(0, 0, W, H);
  colors.forEach((color, index) => {
    x.fillStyle = color;
    x.fillRect(margin + index * 35, 43, 25, 6);
  });
  x.fillStyle = cream;
  x.font = '600 60px ' + font;
  const titleSize = Math.min(60, Math.floor(60 * (W - 2 * margin) / x.measureText(title).width));
  x.font = '600 ' + titleSize + 'px ' + font;
  x.fillText(title, margin, 140);
  card('Président', t.coeur, margin, 188, cardWidth, 120, colors[0], 'président');
  card('Premier ministre', t.pm, margin + cardWidth + gap, 188, cardWidth, 120, colors[3], 'premier ministre');
  D.POSTES.forEach((post, index) => {
    const left = margin + (index % 2) * (cardWidth + gap);
    const top = 329 + Math.floor(index / 2) * 107;
    card(post, t.min?.[post], left, top, cardWidth, 95, colors[index % colors.length]);
  });
  if (t.jl && t.jn) {
    x.fillStyle = colors[0];
    x.font = '700 30px ' + font;
    x.fillText(fit(x, 'Joker · ' + t.jl + ' · ' + t.jn, W - 2 * margin), margin, 903);
  }

  x.fillStyle = black;
  x.beginPath();
  x.roundRect(margin, 934, W - 2 * margin, gaugeBottom + 20 - 934, 24);
  x.fill();
  x.strokeStyle = '#383838';
  x.lineWidth = 2;
  x.stroke();
  x.textAlign = 'center';
  x.fillStyle = cream;
  x.font = '600 42px ' + font;
  x.fillText('Polarité politique', W / 2, 995);
  drawTeamGauge(x, margin + 30, 1010, gaugeWidth, position);
  x.fillStyle = colors[0];
  x.font = '600 26px ' + font;
  x.fillText('Prône ton Président · Just for fun', W / 2, H - 50);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
function fit(x, s, w) { s = String(s); if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }

/* ===================== SONDAGES ===================== */
const AVG = {}; D.SER.forEach((id, k) => AVG[id] = D.MO.map(m => { const v = D.P.filter(p => p[0].startsWith(m) && p[k + 2] != null).map(p => p[k + 2]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }));
const onS = new Set(D.SER);
let svg, tip, G = null;
function initPolls() {
  svg = $('#chart'); tip = $('#tip');
  $('#lchips').innerHTML = D.SER.map(id => `<button class="lchip" data-id="${id}" aria-pressed="true"><i style="--c:var(${D.CV[id]})"></i>${by[id].n}</button>`).join('');
  $('#lchips').addEventListener('click', e => { const b = e.target.closest('.lchip'); if (!b) return; const id = b.dataset.id; if (onS.has(id)) { if (onS.size > 1) onS.delete(id); } else onS.add(id); b.setAttribute('aria-pressed', onS.has(id)); draw(); });
  new ResizeObserver(draw).observe($('#fig'));
  $('#chart').closest('details').addEventListener('toggle', requestPollDraw);
  $('#gHero').closest('details').addEventListener('toggle', event => {
    if (event.currentTarget.open) renderHero();
  });
  svg.addEventListener('pointermove', e => {
    if (!G) return; const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
    const i = Math.max(0, Math.min(4, Math.round((px - G.m.l) / G.stepX))), cx = G.x(i), cr = $('#cross'); cr.setAttribute('x1', cx); cr.setAttribute('x2', cx);
    const rows = D.SER.filter(id => onS.has(id) && AVG[id][i] != null).sort((a, b) => AVG[b][i] - AVG[a][i]);
    tip.innerHTML = `<b>${['Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre (provisoire)'][i]}</b>` + rows.map(id => `<div><span>${by[id].n}</span><span>${fmt(AVG[id][i])} %</span></div>`).join('');
    tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.min(G.W - tw - 4, Math.max(4, cx + (cx > G.W / 2 ? -tw - 12 : 12))) + 'px';
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; const cr = $('#cross'); if (cr) { cr.setAttribute('x1', -9); cr.setAttribute('x2', -9); } });
  $('#tbl').innerHTML = '<tr><th>Candidat</th>' + D.ML.map(l => `<th>${l}</th>`).join('') + '</tr>' + D.SER.map(id => `<tr><td>${by[id].n}</td>${AVG[id].map(v => `<td>${v == null ? '–' : fmt(Math.round(v * 10) / 10)}</td>`).join('')}</tr>`).join('') + `<tr><td>Nb de sondages</td>${D.MO.map(m => `<td>${D.P.filter(p => p[0].startsWith(m)).length}</td>`).join('')}</tr>`;
  const notice = url => url ? ` · <a href="${esc(url)}">Notice</a>` : '';
  $('#novlist').innerHTML = D.NOV.map(([a, b, c, url]) => `<div class="poll"><b>${esc(a)}</b>, ${esc(b)}<p>${esc(c)} (en %)${notice(url)}</p></div>`).join('');
  $('#duels').innerHTML = D.DUELS.map(([a, v, b, s, url]) => `<div class="db"><div class="lbl"><span>${by[a].n} ${v} %</span><span>${by[b].n} ${100 - v} %</span></div><div class="sp"><i style="width:${v}%;--c:${by[a].col}"></i><i style="width:${100 - v}%;--c:${by[b].col}"></i></div><span class="fine">${esc(s)}${notice(url)}</span></div>`).join('');
  $('#pollUpdateDate').textContent = 'Données vérifiées le ' + dateFr(D.POLL_UPDATE_DATE, { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
}
function requestPollDraw() { requestAnimationFrame(draw); }
function draw() {
  if (!svg) return; const W = svg.clientWidth, H = svg.clientHeight; if (!W) return;
  const nar = W < 420, m = { l: 30, r: nar ? 98 : 116, t: 14, b: 28 }, stepX = (W - m.l - m.r) / (D.MO.length - 1);
  const x = i => m.l + i * stepX, y = v => m.t + (1 - v / 40) * (H - m.t - m.b);
  let g = ''; [0, 10, 20, 30, 40].forEach(t => g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`);
  D.ML.forEach((l, i) => g += `<text class="tick" x="${x(i)}" y="${H - 8}" text-anchor="middle">${l}</text>`);
  g += `<line id="cross" class="cross" x1="-9" x2="-9" y1="${m.t}" y2="${H - m.b}"/>`;
  const labs = [];
  D.SER.filter(id => onS.has(id)).forEach(id => {
    const st = `stroke:var(${D.CV[id]})`, pts = AVG[id].map((v, i) => v == null ? null : [x(i), y(v)]);
    let dd = '', f = true; for (let i = 0; i < 4; i++) { const p = pts[i]; if (!p) continue; dd += (f ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); f = false; }
    if (dd) g += `<path class="ln" d="${dd}" style="${st}"/>`;
    const pv = [3, 2, 1, 0].map(i => pts[i]).find(Boolean);
    if (pts[4] && pv) g += `<path class="ln dash" d="M${pv[0].toFixed(1)} ${pv[1].toFixed(1)}L${pts[4][0].toFixed(1)} ${pts[4][1].toFixed(1)}" style="${st}"/>`;
    pts.forEach(p => { if (p) g += `<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" style="fill:var(${D.CV[id]})"/>`; });
    labs.push({ id, y: pts[4] ? pts[4][1] : pv[1], v: AVG[id][4] });
  });
  labs.sort((a, b) => a.y - b.y); for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 16) labs[i].y = labs[i - 1].y + 16;
  const over = labs.length ? labs[labs.length - 1].y - (H - m.b) : 0; if (over > 0) labs.forEach(L => L.y -= over);
  labs.forEach(L => { const nm = nar ? by[L.id].n.replace('Glucksmann', 'Glucks.').replace('Retailleau', 'Retail.').replace('Mélenchon', 'Mélench.') : by[L.id].n; g += `<text class="lab" x="${W - m.r + 10}" y="${(L.y + 4).toFixed(1)}">${nm} ${fmt(L.v)}</text>`; });
  svg.innerHTML = g; G = { x, stepX, m, W };
}

/* ===================== NAVIGATION ===================== */
const VIEWS = ['acces', 'accueil', 'espace', 'profil', 'paris', 'team', 'classement', 'sondages'];
const TAB = { profil: 'espace', paris: 'espace', team: 'espace' };
let currentView = 'acces';

function show() {
  const requested = location.hash.slice(1);
  const hash = requested === 'joueurs' ? 'classement' : requested;
  const view = ME ? (VIEWS.includes(hash) && hash !== 'acces' ? hash : 'accueil') : 'acces';
  if (view === currentView) return;
  if (currentView === 'profil') account.closeProfile();
  currentView = view;
  VIEWS.forEach(name => $('#v-' + name).classList.toggle('on', name === view));
  $('.tabs').hidden = !ME;
  $$('.tabs a').forEach(tab => {
    const selected = tab.dataset.t === (TAB[view] || view);
    tab.classList.toggle('on', selected);
    if (selected) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  const heading = $('#v-' + view).querySelector('h1, h2');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  if (view === 'accueil') renderHomeCalendar();
  if (view === 'sondages' || view === 'accueil') renderPollsOverview();
  if (view === 'sondages') {
    if ($('#gHero').closest('details').open) renderHero();
    requestPollDraw();
  }
  if (view === 'profil') account.openProfile(ME, ME.pid === GROUP_ADMIN);
  if (view === 'accueil' || view === 'espace' || view === 'profil') portrait.render();
  if (view === 'espace') account.renderParticipation();
  if (ME) players.resume(view === 'classement');
  else players.pause();
}

function go(view, { replace = false } = {}) {
  if (location.hash !== '#' + view || replace) {
    history[replace ? 'replaceState' : 'pushState'](
      replace ? null : { gameFrom: currentView }, '', '#' + view
    );
  }
  show();
}

const entrySound = new Audio(new URL('../audio/bouchon2.wav', import.meta.url));
entrySound.preload = 'none';
function playEntrySound() {
  if (!snd.isOn()) return;
  entrySound.currentTime = 0;
  entrySound.play().catch(() => {});
}

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const back = event.target.closest('[data-back]');
  if (back) {
    event.preventDefault();
    if (history.state?.gameFrom && history.state.gameFrom !== 'acces') history.back();
    else go(back.hash.slice(1), { replace: true });
    return;
  }
  const link = event.target.closest('[data-go]');
  if (!link) return;
  event.preventDefault();
  const [view, anchor] = link.dataset.go.split('#');
  if (link.dataset.t && view !== currentView) playEntrySound();
  go(view);
  if (anchor && /^st[1234]$/.test(anchor)) {
    SB[+anchor[2]] = true;
    renderSB();
    requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start' }));
  }
});
window.addEventListener('popstate', show);
window.addEventListener('hashchange', show);
window.addEventListener('beforeunload', event => {
  if (Object.values(dirty).some(Boolean)) { event.preventDefault(); event.returnValue = ''; }
});

async function withMe(action) {
  if (!ME) return;
  try { await action(); } catch (error) { snd.error(); toast(error.message || 'Erreur'); }
}

function renderSnd() {
  const button = $('#sndBtn'), on = snd.isOn();
  $('#sound-state').textContent = on ? 'Son activé' : 'Son coupé';
  $('#sound-action').textContent = on ? 'Couper le son' : 'Activer le son';
  button.setAttribute('aria-pressed', on);
}
$('#sndBtn').onclick = () => {
  if (!snd.toggle()) entrySound.pause();
  renderSnd();
};

function getParticipation() {
  const team = draft.team;
  const predicted = by[S.current(mine())?.pres];
  const president = by[byName[team.coeur]];
  return {
    predictedName: predicted ? predicted.p + ' ' + predicted.n : '',
    predictedPortrait: av(predicted, 32),
    presidentName: team.coeur,
    presidentPortrait: av(president, 32),
    primeMinister: team.pm,
    pronos: ['l1', 'l2', 'gp', 'gp'].filter(done).length,
    totalPronos: 4,
    startedPronos: [draft.l1, draft.l2, draft.gp.top].some(values => values.length > 0) || Boolean(draft.gp.pres),
    team: countTeamRoles(team),
    startedTeam: hasTeam(team),
    totalTeam: D.POSTES.length + 2
  };
}

const players = playersView($('#players-view'), {
  getStore: () => store, getParticipation, drawTeam, syncExistingTeam, notify: toast
});
const portrait = portraitView({ getPlayer: () => ME, onUpdate: () => account.renderParticipation() });
const account = accountView({
  getStore: () => store,
  getParticipation,
  notify: toast,
  async onJoin(player) {
    playEntrySound();
    ME = player;
    await refresh(true);
    loadDraft();
    initSB();
    renderAll();
    go('accueil', { replace: true });
    syncExistingTeam();
  },
  onLogout() {
    ME = null;
    portrait.render();
    ALL = { players: {}, pronos: {} };
    loadDraft();
    initSB();
    go('acces', { replace: true });
  }
});

function renderAll() {
  renderSession(); renderSnd();
  renderHomeCalendar(); renderParisSummary(); renderStages(); renderSB(); renderPhoto(); renderPick(); renderTotal(); renderDuel(); renderGPBtn();
  renderTeam();
  if (currentView === 'profil') account.renderParticipation();
}

/* ===================== DÉMARRAGE ===================== */
(async function start() {
  initFiches();
  window.addEventListener('fiche-error', () => toast('Fiches indisponibles pour le moment, réessaie dans un instant'));
  initPolls();
  store = await openStore();
  ME = store.me();
  renderSession();
  if (ME) {
    await refresh(true);
    loadDraft();
    initSB();
    renderAll();
    go('accueil', { replace: true });
    syncExistingTeam();
  } else {
    account.ready();
    go('acces', { replace: true });
  }
})();
