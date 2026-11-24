import { groupView } from './group-view.js?v=20';
import { COMMON_GROUP } from './groups.js?v=19';
/* =====================================================================
   LES PRONOS DES MEMBRÉS — interface
   ===================================================================== */
import * as D from './data.js?v=19';
import { C, by } from './data.js';
import * as S from './scoring.js';
import { openStore } from './store.js';
import { snd } from './sound.js';
import { guilloche } from './guilloche.js';
import { initFiches, portraitThumb } from './fiches.js?v=16';

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
const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2400); };

/* ---------- état ---------- */
let store, ME = null, ALL = { players: {}, pronos: {} };
const blankTeam = () => ({ coeur: '', pm: '', min: {}, jl: '', jn: '' });
const teamKey = () => 'pdm-team-' + (ME ? ME.pid : 'anon');
const readTeam = () => { try { return JSON.parse(localStorage.getItem(teamKey())) || {}; } catch (e) { return {}; } };
let draft = { l1: [], l2: [], gp: { pres: null, top: [], win: 52 }, team: blankTeam() };
const dirty = { l1: false, l2: false, gp: false, team: false };
let pending = null;

const mine = () => ME ? (ALL.pronos[ME.pid] || {}) : {};
const isOpen = k => now() < { l1: +D.LOCK1, l2: +D.LOCK2, gp: +D.LOCKGP }[k];
const inBlackout = () => D.BLACKOUT.some(([a, b]) => now() >= +a && now() < +b);

function loadDraft() {
  const p = mine();
  draft.l1 = (p.l1 || []).slice(); draft.l2 = (p.l2 || []).slice();
  const cur = S.current(p); draft.gp = cur ? clone(cur) : { pres: null, top: [], win: 52 };
  draft.team = Object.assign(blankTeam(), readTeam());
  for (const k in dirty) dirty[k] = false;
}

async function refresh(force) {
  try { ALL = await store.loadAll(force); } catch (e) { console.error(e); toast('Connexion difficile : données peut-être pas à jour'); }
}

/* ===================== EN-TÊTE ===================== */
function renderHeader() {
  const mb = $('#meBtn');
  mb.textContent = ME ? ME.pseudo.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?' : 'Entrer';
  mb.classList.toggle('in', !!ME); mb.setAttribute('aria-label', ME ? 'Tu joues en tant que ' + ME.pseudo : 'Entrer dans le jeu');
  const b = $('#banner');
  if (store.mode === 'local') {
    b.hidden = false;
    b.textContent = store.fallback ? 'Base partagée injoignable : tes paris restent sur ce téléphone pour l’instant.' : 'Mode essai : en attendant la base partagée, tes paris restent sur ce téléphone.';
  } else b.hidden = true;
}

/* ===================== ACCUEIL ===================== */
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
  if (d <= 0) return { txt: 'Clôture ce soir à 23 h 59 (Paris)', hot: true };
  return { txt: `Clôture dans ${d} j, ${dateFr(t)} à 23 h 59 (Paris)`, hot: d <= 3 };
}
const done = k => { const p = mine(); return k === 'gp' ? !!S.current(p) : !!(p[k] && p[k].length); };

function renderPollsHome() {
  const box = $('#pollsHome');
  if (inBlackout()) { box.innerHTML = '<p class="blackout">Sondages masqués la veille et le jour du vote, comme le veut la loi du 19 juillet 1977.</p>'; return; }
  const longDate = { day: 'numeric', month: 'long', year: 'numeric' };
  $('#podDate').textContent = 'Dernier sondage présenté · ' + dateFr(D.LAST_POLL_DATE, longDate);
  $('#podSrc').textContent = `${D.POLL_DATE} · Moyenne au ${dateFr(D.PODIUM_DATE, longDate)}`;
  $('#movesDate').dateTime = D.PODIUM_DATE.toISOString().slice(0, 10);
  $('#movesDate').textContent = 'MàJ le ' + dateFr(D.PODIUM_DATE, { day: 'numeric', month: 'long', year: 'numeric' });
  $('#podium').innerHTML = [1, 0, 2].map(i => { const [id, v] = D.POD[i], c = by[id]; return `<div class="pcol p${i + 1}" data-fiche="${id}" role="button" tabindex="0" aria-label="Fiche de ${esc(c.p + ' ' + c.n)}">${av(c, i === 0 ? 62 : 50)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><div class="blk"><span class="rk">${i + 1}</span><span class="pv">${fmt(v)} %</span></div></div>`; }).join('');
  const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const DN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
  $('#moves').innerHTML = D.MOVES.map(([h, l]) => `<div><h3>${h}</h3>${l.map(([id, u, t]) => `<div class="mv" data-fiche="${id}" role="button" tabindex="0"><span class="ar ${u ? 'up' : 'dn'}">${u ? UP : DN}</span>${av(by[id], 40)}<div><b>${by[id].p} ${by[id].n}</b><span>${t}</span></div></div>`).join('')}</div>`).join('');
  $('#lastSrc').textContent = D.LAST_SRC;
  $('#last').innerHTML = D.LAST.map(([id, v]) => `<div class="bar" data-fiche="${id}" role="button" tabindex="0">${av(by[id], 28)}<span class="nm">${by[id].n}</span><div class="tr"><i style="width:${v / 35 * 100}%;--c:${by[id].col}"></i></div><span class="v">${v} %</span></div>`).join('');
}

/* ===================== MES PARIS ===================== */
const sharePronos = $('#share-pronos');
const sharePronosStatus = $('#share-pronos-status');
const sharePronosAction = $('#share-pronos-action');
let shareRequest = 0;
async function renderPronoSharing() {
  const request = ++shareRequest;
  sharePronos.disabled = true;
  sharePronos.checked = false;
  sharePronosAction.hidden = true;
  if (!store?.groups || !ME) {
    sharePronosStatus.textContent = 'Connecte-toi pour choisir qui voit tes pronos.';
    sharePronosAction.hidden = !!ME;
    sharePronosAction.textContent = 'Me connecter';
    sharePronosAction.onclick = () => openJoin();
    return;
  }
  sharePronosStatus.textContent = 'Vérification du partage…';
  try {
    await store.groups.ensureCommonGroup();
    const common = (await store.groups.list()).find(g => g.code === COMMON_GROUP);
    if (request !== shareRequest) return;
    if (!common) throw new Error();
    sharePronos.checked = common.shared;
    sharePronos.disabled = false;
    sharePronosStatus.textContent = common.shared
      ? 'Partagés dans le groupe commun, visibles à la clôture.'
      : 'Masqués dans le groupe commun.';
  } catch {
    if (request !== shareRequest) return;
    sharePronosStatus.textContent = 'Impossible de vérifier le partage.';
    sharePronosAction.hidden = false;
    sharePronosAction.textContent = 'Réessayer';
    sharePronosAction.onclick = renderPronoSharing;
  }
}
sharePronos.addEventListener('change', async () => {
  if (sharePronos.disabled || !ME) return;
  const shared = sharePronos.checked, request = ++shareRequest;
  sharePronos.disabled = true;
  sharePronosStatus.textContent = 'Enregistrement du choix…';
  try {
    await store.groups.setSharing(COMMON_GROUP, shared);
    if (request === shareRequest) await renderPronoSharing();
  } catch {
    if (request !== shareRequest) return;
    sharePronos.checked = !shared;
    sharePronos.disabled = false;
    sharePronosStatus.textContent = 'Choix non enregistré. Réessaie.';
  }
});

function renderParisSummary() {
  const rows = [['l1', 'Qui sera là le 31 janvier ?', 'st1'], ['l2', 'Qui aura les 500 signatures ?', 'st2'], ['gp', 'La présidentielle', 'st3']];
  $('#parisSummary').innerHTML = rows.map(([k, t, a], i) => {
    const ok = done(k), dl = deadline(k);
    return `<div class="ms${ok ? ' done' : ''}"><i>${ok ? OKSVG.replace('12', '16').replace('12', '16') : i + 1}</i><span>${t}<small>${ok ? 'Fait' : isOpen(k) ? 'À faire' : 'Non joué'} · ${dl.txt}</small></span><a href="#paris" data-go="paris#${a}">${isOpen(k) ? (ok ? 'Modifier' : 'Jouer') : 'Voir'}</a></div>`;
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
  const e = $('#dl' + n); e.textContent = dl.txt; e.classList.toggle('hot', dl.hot);
  $('#tiles' + n).innerHTML = tilesHTML(key);
  $('#n' + n).textContent = draft[key].length;
  const b = $('#save' + n); b.hidden = !open;
  b.textContent = done(key) ? (dirty[key] ? 'Enregistrer mes changements' : 'Pari validé, modifiable jusqu’à la clôture') : 'Valider mon pari';
  $('#pre' + n).hidden = !open;
}
function renderStages() {
  $('#retires').innerHTML = D.RETIRES.length ? 'Déjà retirés : ' + D.RETIRES.map(r => `<s>${esc(r.nom)}</s> (${esc(r.quand)})`).join(', ') : '';
  $('#lock2note').textContent = D.LOCK2_PROVISOIRE ? 'La date de clôture du jeu est provisoire. Elle sera confirmée avant la première publication des parrainages.' : '';
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
const SB = { 1: false, 2: false, 3: false }, SBK = { 1: 'l1', 2: 'l2', 3: 'gp' };
function initSB() {
  const first = [1, 2, 3].find(i => isOpen(SBK[i]) && !done(SBK[i]));
  [1, 2, 3].forEach(i => SB[i] = i === (first || 3));
}
function renderSB() {
  [1, 2, 3].forEach(i => {
    const b = $(`.tog[data-sb="${i}"]`), body = $('#sb' + i), k = SBK[i];
    body.hidden = !SB[i]; b.setAttribute('aria-expanded', SB[i]);
    b.textContent = SB[i] ? 'Replier' : isOpen(k) ? (done(k) ? 'Voir et modifier mon pari' : 'Faire ce pari') : 'Voir mon pari';
    const p = mine();
    let t;
    if (k === 'gp') { const c = S.current(p); t = c ? `Ton gagnant : ${by[c.pres].p} ${by[c.pres].n} · finale contre ${by[c.top[0].id === c.pres ? c.top[1].id : c.top[0].id].n}` : (isOpen(k) ? 'Pas encore joué.' : 'Non joué.'); }
    else t = p[k] && p[k].length ? `Ton pari : ${p[k].length} candidats ${k === 'l1' ? 'encore là le 31 janvier' : 'auront leurs 500 signatures'}.` : (isOpen(k) ? 'Pas encore joué.' : 'Non joué.');
    $('#sum' + i).textContent = t;
  });
}
$$('.tog').forEach(b => b.onclick = () => { const i = +b.dataset.sb; SB[i] = !SB[i]; renderSB(); if (SB[i]) b.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

/* ---- Grand Prono ---- */
const gp = () => draft.gp;
function renderPhoto() {
  const el = $('#photo'), w = S.weekOf(now()), dl = deadline('gp');
  const e = $('#dl3'); e.textContent = dl.txt; e.classList.toggle('hot', dl.hot);
  if (!isOpen('gp')) { el.innerHTML = '<p class="okbar">Pronostic clos.</p>'; return; }
  const cw = S.clampWeek(w);
  el.innerHTML = done('gp')
    ? `<div class="photo"><b>×${fmt(D.mult(cw))}</b><span>Ton prono est repris chaque lundi.</span></div>`
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
      ${selected ? `<label class="prono-pct"><input type="number" min="0" max="60" step="any" inputmode="decimal" data-score="${c.id}" value="${selected.pct}" aria-label="Pourcentage de ${fullName}" ${locked ? 'disabled' : ''}> %</label>` : ''}</div>`;
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
    toast('Top 5 complet : retire d’abord un nom');
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
  b.textContent = done('gp') ? (dirty.gp ? 'Enregistrer mes changements' : 'Prono enregistré') : 'Enregistrer mon prono';
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
  const saved = mine(), g = S.current(saved);
  const candidate = id => by[id] ? by[id].p + ' ' + by[id].n : id;
  const sections = [
    ['Encore candidats le 31 janvier', (saved.l1 || []).map(candidate)],
    ['500 signatures', (saved.l2 || []).map(candidate)],
    ['Premier tour · Mon top 5', (g?.top || []).map((t, i) => `${i + 1}. ${candidate(t.id)} · ${fmt(t.pct)} %`)],
    ['Second tour · Mon vainqueur', g?.pres ? [`${candidate(g.pres)} · ${fmt(g.win)} %`] : []]
  ];
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 230 + sections.reduce((h, [, lines]) => h + 92 + Math.max(lines.length, 1) * 43, 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFCF6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#15120E';
  ctx.fillRect(0, 0, canvas.width, 192);
  ctx.fillStyle = '#F3E6C8';
  ctx.font = '64px Georgia';
  ctx.fillText('Mes pronos', 64, 96);
  ctx.font = '32px sans-serif';
  ctx.fillText(ME ? `Prone ton President · ${ME.pseudo}` : 'Prone ton President', 64, 151, 952);
  let y = 237;
  for (const [title, lines] of sections) {
    ctx.fillStyle = '#79591C';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(title, 64, y, 952);
    y += 52;
    ctx.fillStyle = '#15120E';
    ctx.font = '32px sans-serif';
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
const visibility = $('#team-visibility');
let visibilityRequest = 0;
async function renderTeamVisibility() {
  const request = ++visibilityRequest;
  if (!store.groups) {
    visibility.textContent = 'Le partage en groupe nécessite une connexion.';
    return;
  }
  if (!ME) {
    visibility.innerHTML = '<button class="ghost" data-join>Me connecter pour choisir</button>';
    return;
  }
  visibility.textContent = 'Chargement de tes groupes…';
  try {
    await store.groups.ensureCommonGroup().catch(console.warn);
    const groups = await store.groups.teamVisibility();
    if (request !== visibilityRequest) return;
    const visible = groups.some(g => g.visible);
    visibility.innerHTML = `<div class="visibility-choices" role="group" aria-label="Visibilité du gouvernement">
      <label class="choice-control"><input type="radio" name="government-visibility" value="yes" ${visible ? 'checked' : ''}> Oui</label>
      <label class="choice-control"><input type="radio" name="government-visibility" value="no" ${visible ? '' : 'checked'}> Non</label>
    </div><p class="help" role="status">${visible ? 'Ton gouvernement est visible.' : 'Ton gouvernement est privé.'}</p>`;
  } catch {
    if (request === visibilityRequest) visibility.innerHTML = '<p>Impossible de vérifier la visibilité.</p><button class="ghost" data-retry-visibility>Réessayer</button>';
  }
}
visibility.addEventListener('click', e => {
  if (e.target.closest('[data-retry-visibility]')) renderTeamVisibility();
});
visibility.addEventListener('change', async e => {
  if (e.target.name !== 'government-visibility' || !ME) return;
  const hide = e.target.value === 'no';
  if (!hide && !draft.team.coeur && !draft.team.pm) {
    toast('Choisis au moins ton président ou ton Premier ministre.');
    visibility.querySelector('[value="no"]').checked = true;
    return;
  }
  for (const input of visibility.querySelectorAll('input')) input.disabled = true;
  try {
    const groups = await store.groups.teamVisibility();
    if (hide) await Promise.all(groups.filter(g => g.visible).map(g => store.groups.unpublishTeam(g.code)));
    else {
      const common = groups.find(g => g.code === COMMON_GROUP);
      if (!common) throw new Error('Le groupe commun est indisponible.');
      await Promise.all(groups.filter(g => g.visible || g.code === COMMON_GROUP)
        .map(g => store.groups.publishTeam(g.code, clone(draft.team))));
      await saveTeam();
    }
    toast(hide ? 'Gouvernement privé.' : 'Gouvernement visible.');
    await renderTeamVisibility();
  } catch (err) {
    toast(err.message || 'Impossible de modifier la visibilité.');
    await renderTeamVisibility();
  }
});
const teamCount = () => (draft.team.coeur ? 1 : 0) + (draft.team.pm ? 1 : 0) + D.POSTES.filter(p => (draft.team.min || {})[p]).length;
function renderPublish() {
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
  const was = !$('#teamShare').disabled; renderPublish(); if (!was && !$('#teamShare').disabled) { snd.logo(); toast('Gouvernement complet : tu peux faire une image.'); }
});
$('#v-team').addEventListener('input', e => {
  if (e.target.id === 't-jl') { draft.team.jl = e.target.value; dirty.team = true; return; }
  const d = e.target.closest('.sel'); if (d && e.target.tagName === 'INPUT') { setT(d.dataset.k, e.target.value.trim()); renderPublish(); }
});
async function saveTeam() { try { localStorage.setItem(teamKey(), JSON.stringify(draft.team)); } catch (e) { } dirty.team = false; }
$('#teamSave').onclick = async () => { if (!draft.team.pm && !draft.team.coeur) { toast('Choisis au moins ton président ou ton Premier ministre'); return; } await saveTeam(); snd.vote(); toast('Team enregistrée sur ton téléphone'); };
$('#teamShare').onclick = async () => {
  if (teamCount() < 12) { snd.error(); toast('Complète d’abord ton gouvernement'); return; }
  if (dirty.team) await saveTeam();
  snd.logo();
  const blob = await drawTeam();
  const file = new File([blob], 'mon-gouvernement.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Mon gouvernement', text: 'Mon gouvernement de rêve, et toi ? ' + location.origin + location.pathname }); } catch (e) { }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Image téléchargée : envoie-la à tes amis');
  }
};
async function drawTeam(t = draft.team, pseudo = ME?.pseudo || 'moi') {
  try { await Promise.all([document.fonts.load('600 60px "Bodoni Moda"'), document.fonts.load('500 60px "Bodoni Moda"'), document.fonts.load('500 26px "Hanken Grotesk"')]); } catch (e) { }
  const cv = document.createElement('canvas'), W = cv.width = 1080, H = cv.height = 1350;
  const x = cv.getContext('2d');
  const SERIF = '"Bodoni Moda", Didot, Georgia, serif', SANS = '"Hanken Grotesk", system-ui, sans-serif';
  x.fillStyle = '#FFFCF6'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0E0E0E'; x.fillRect(0, 0, W, 250);
  [['#1F3A93', 0], ['#FBF9F4', 1], ['#C8102E', 2]].forEach(([c, i]) => { x.fillStyle = c; x.fillRect(64 + i * 30, 64, 30, 56); });
  x.strokeStyle = '#C6A15B'; x.lineWidth = 2; x.strokeRect(64, 64, 90, 56);
  x.fillStyle = '#FBF9F4'; x.font = '500 66px ' + SERIF; x.fillText('Mon gouvernement', 184, 116);
  x.fillStyle = '#E9D7A8'; x.font = '500 34px ' + SANS; x.fillText('Le gouvernement de ' + pseudo, 64, 196);
  x.fillStyle = '#C6A15B'; x.fillRect(0, 250, W, 4);
  let y0 = 325;
  if (t.coeur) {
    x.fillStyle = '#A8843F'; x.font = '600 26px ' + SANS; x.fillText('Président', 64, y0);
    x.fillStyle = '#1A1A1A'; x.font = '600 62px ' + SERIF; x.fillText(fit(x, t.coeur, W - 128), 64, y0 + 66);
    y0 += 125;
  }
  x.fillStyle = '#A8843F'; x.font = '600 26px ' + SANS; x.fillText('Premier ministre', 64, y0);
  x.fillStyle = '#1A1A1A'; x.font = '600 ' + (t.coeur ? 56 : 72) + 'px ' + SERIF; x.fillText(fit(x, t.pm || '—', W - 128), 64, y0 + (t.coeur ? 62 : 75));
  let y = y0 + (t.coeur ? 135 : 155);
  const step = t.coeur ? 56 : 64;
  x.strokeStyle = '#E8DDCB'; x.lineWidth = 1.5;
  for (const p of D.POSTES) {
    x.fillStyle = '#5D6377'; x.font = '500 26px ' + SANS; x.fillText(fit(x, p, 410), 64, y);
    x.fillStyle = '#1A1A1A'; x.font = '600 36px ' + SERIF; x.fillText(fit(x, (t.min || {})[p] || '—', W - 560), 500, y);
    x.beginPath(); x.moveTo(64, y + 20); x.lineTo(W - 64, y + 20); x.stroke(); y += step;
  }
  if (t.jl && t.jn) {
    x.fillStyle = '#C8102E'; x.font = '600 26px ' + SANS; x.fillText(fit(x, 'Joker : ' + t.jl, W - 128), 64, y + 20);
    x.fillStyle = '#1A1A1A'; x.font = '500 42px ' + SERIF; x.fillText(fit(x, t.jn, W - 128), 64, y + 70);
  }
  x.fillStyle = '#0E0E0E'; x.fillRect(0, H - 90, W, 90); x.fillStyle = '#C6A15B'; x.fillRect(0, H - 90, W, 3);
  x.fillStyle = '#FBF9F4'; x.font = '500 30px ' + SERIF; x.fillText('Les pronos des vieux boucs', 64, H - 34);
  x.fillStyle = '#E9D7A8'; x.font = '500 22px ' + SANS; const u = (location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, ''); x.fillText(u, W - 64 - x.measureText(u).width, H - 36);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
function fit(x, s, w) { s = String(s); if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }

/* ===================== SONDAGES ===================== */
const AVG = {}; D.SER.forEach((id, k) => AVG[id] = D.MO.map(m => { const v = D.P.filter(p => p[0].startsWith(m) && p[k + 2] != null).map(p => p[k + 2]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }));
const onS = new Set(D.SER);
let svg, tip, G = null;
function initPolls() {
  if (inBlackout()) { $('#pollsBody').innerHTML = '<p class="blackout">Sondages masqués la veille et le jour du vote, comme le veut la loi du 19 juillet 1977. Ils reviennent dimanche à 20 h.</p>'; return; }
  svg = $('#chart'); tip = $('#tip');
  $('#lchips').innerHTML = D.SER.map(id => `<button class="lchip" data-id="${id}" aria-pressed="true"><i style="--c:var(${D.CV[id]})"></i>${by[id].n}</button>`).join('');
  $('#lchips').addEventListener('click', e => { const b = e.target.closest('.lchip'); if (!b) return; const id = b.dataset.id; if (onS.has(id)) { if (onS.size > 1) onS.delete(id); } else onS.add(id); b.setAttribute('aria-pressed', onS.has(id)); draw(); });
  new ResizeObserver(draw).observe($('#fig'));
  svg.addEventListener('pointermove', e => {
    if (!G) return; const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
    const i = Math.max(0, Math.min(4, Math.round((px - G.m.l) / G.stepX))), cx = G.x(i), cr = $('#cross'); cr.setAttribute('x1', cx); cr.setAttribute('x2', cx);
    const rows = D.SER.filter(id => onS.has(id) && AVG[id][i] != null).sort((a, b) => AVG[b][i] - AVG[a][i]);
    tip.innerHTML = `<b>${['Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre (provisoire)'][i]}</b>` + rows.map(id => `<div><span>${by[id].n}</span><span>${fmt(AVG[id][i])} %</span></div>`).join('');
    tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.min(G.W - tw - 4, Math.max(4, cx + (cx > G.W / 2 ? -tw - 12 : 12))) + 'px';
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; const cr = $('#cross'); if (cr) { cr.setAttribute('x1', -9); cr.setAttribute('x2', -9); } });
  $('#tbl').innerHTML = '<tr><th>Candidat</th>' + D.ML.map(l => `<th>${l}</th>`).join('') + '</tr>' + D.SER.map(id => `<tr><td>${by[id].n}</td>${AVG[id].map(v => `<td>${v == null ? '–' : fmt(Math.round(v * 10) / 10)}</td>`).join('')}</tr>`).join('') + `<tr><td>Nb de sondages</td>${D.MO.map(m => `<td>${D.P.filter(p => p[0].startsWith(m)).length}</td>`).join('')}</tr>`;
  $('#novlist').innerHTML = D.NOV.map(([a, b, c]) => `<div class="poll"><b>${a}</b>, ${b}<p>${c} (en %)</p></div>`).join('');
  $('#duels').innerHTML = D.DUELS.map(([a, v, b, s]) => `<div class="db"><div class="lbl"><span>${by[a].n} ${v} %</span><span>${by[b].n} ${100 - v} %</span></div><div class="sp"><i style="width:${v}%;--c:${by[a].col}"></i><i style="width:${100 - v}%;--c:${by[b].col}"></i></div><span class="fine">${s}</span></div>`).join('');
}
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

/* ===================== CLASSEMENT ===================== */
const sheet = $('#sheet');
function openJoin(msg) {
  if (ME) {
    $('#sheetIn').innerHTML = `<h2 id="sheetT">Tu joues en tant que ${esc(ME.pseudo)}</h2><p class="help">Pour jouer sur un autre téléphone, entre le même pseudo et ton code à 4 chiffres.</p><div class="form"><button class="big" id="close">Continuer</button><button class="ghost" id="logout">Changer de pseudo</button></div>`;
  } else {
    $('#sheetIn').innerHTML = `<h2 id="sheetT">Bienvenue au club</h2><p class="help">${msg ? esc(msg) + ' ' : ''}Pas d'email ni de nom : juste un pseudo et un code à 4 chiffres. Note bien ce code : il te sert à te retrouver sur un autre téléphone. Tes pronos sont partagés dans le groupe commun par défaut et révélés à la clôture. Ton gouvernement reste privé jusqu’à ce que tu le partages.</p>
      <form class="form" id="joinF" novalidate><label>Ton pseudo<input id="jp" maxlength="24" autocomplete="nickname" autocapitalize="words" required></label>
      <label>Ton code secret (4 chiffres)<input id="jc" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label>
      <p class="err" id="jerr" role="alert"></p><p id="joinStatus" role="status"></p><button class="big" type="submit" id="jgo">C'est parti</button></form>`;
  }
  sheet.classList.add('open');
  setTimeout(() => { const f = $('#jp') || $('#close'); if (f) f.focus(); }, 50);
}
sheet.addEventListener('click', async e => {
  if (e.target === sheet || e.target.id === 'close') { sheet.classList.remove('open'); pending = null; return; }
  if (e.target.id === 'logout') { await store.logout(); ME = null; loadDraft(); initSB(); renderAll(); openJoin(); }
});
sheet.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target, b = form.querySelector('#jgo');
  if (b.disabled) return;
  const p = form.querySelector('#jp').value.trim(), c = form.querySelector('#jc').value.trim();
  const er = form.querySelector('#jerr'), status = form.querySelector('#joinStatus');
  er.textContent = '';
  status.textContent = 'Connexion en cours…';
  b.disabled = true;
  form.setAttribute('aria-busy', 'true');
  const slow = setTimeout(() => { status.textContent = 'La connexion prend plus de temps que prévu. Vérifie ton réseau.'; }, 8000);
  try {
    ME = await store.join(p, c);
    store.groups?.ensureCommonGroup().catch(console.warn);
  } catch (err) {
    er.textContent = err.message || 'Connexion impossible.';
    status.textContent = '';
    b.disabled = false;
    form.removeAttribute('aria-busy');
    return;
  } finally {
    clearTimeout(slow);
  }
  const action = pending;
  pending = null;
  sheet.classList.remove('open');
  renderHeader();
  toast('Salut ' + ME.pseudo + ' !');
  $('#meBtn').focus({ preventScroll: true });
  const keep = clone(draft), kd = { ...dirty };
  if (kd.team) {
    try { localStorage.setItem(teamKey(), JSON.stringify(keep.team)); } catch {}
  }
  await refresh(true);
  loadDraft();
  for (const k in kd) if (kd[k]) { draft[k] = keep[k]; dirty[k] = true; }
  initSB();
  renderAll();
  if (action) await action();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { sheet.classList.remove('open'); pending = null; } });
$('#meBtn').onclick = () => openJoin();
async function withMe(f) {
  if (!ME) { pending = async () => { try { await f(); } catch (e) { toast(e.message || 'Erreur'); } }; openJoin('Choisis d’abord ton pseudo pour enregistrer.'); return; }
  try { await f(); } catch (e) { snd.error(); toast(e.message || 'Erreur'); }
}
function renderSnd() { const b = $('#sndBtn'), o = snd.isOn(); b.setAttribute('aria-pressed', o); b.setAttribute('aria-label', o ? 'Son activé, toucher pour couper' : 'Son coupé, toucher pour activer'); }
$('#sndBtn').onclick = () => { snd.toggle(); renderSnd(); toast(snd.isOn() ? 'Son activé' : 'Son coupé'); };

/* ===================== NAVIGATION ===================== */
document.addEventListener('click', e => {
  const j = e.target.closest('[data-join]'); if (j) { openJoin(); return; }
  const g = e.target.closest('[data-go]'); if (!g) return;
  e.preventDefault(); const [v, a] = g.dataset.go.split('#');
  if (location.hash.slice(1) !== v) location.hash = v; else show();
  if (a && /^st[123]$/.test(a)) { SB[+a[2]] = true; renderSB(); }
  if (a) setTimeout(() => { const t = document.getElementById(a); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
});
const VIEWS = ['accueil', 'paris', 'team', 'sondages', 'classement'];
function show() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'accueil';
  VIEWS.forEach(n => $('#v-' + n).classList.toggle('on', n === v));
  $$('.tabs a').forEach(a => { const o = a.dataset.t === v; a.classList.toggle('on', o); if (o) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
  if (v === 'sondages') requestAnimationFrame(draw);
  if (v === 'classement') groupUI.render();
  if (v === 'team') renderTeamVisibility();
  if (v === 'paris') renderPronoSharing();
}
window.addEventListener('hashchange', show);
window.addEventListener('beforeunload', e => { if (Object.values(dirty).some(Boolean)) { e.preventDefault(); e.returnValue = ''; } });

const groupUI = groupView($('#group-view'), {
  getStore: () => store, withUser: withMe, drawTeam, notify: toast
});
function renderAll() {
  renderHeader(); renderSnd(); renderHero(); renderPollsHome();
  renderParisSummary(); renderStages(); renderSB(); renderPhoto(); renderPick(); renderTotal(); renderDuel(); renderGPBtn();
  renderTeam();
  if (location.hash === '#team') renderTeamVisibility();
  if (location.hash === '#paris') renderPronoSharing();
  if (location.hash === '#classement') groupUI.render();
}

/* ===================== AFFICHE D'ACCUEIL ===================== */
const splash = $('#splash');
function showSplash() {
  $('#splashJ').textContent = `J-${Math.max(0, daysTo(D.TOUR1))}`;
  $('#splashGo').textContent = 'Faire mes pronos';
  splash.hidden = false; document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => guilloche($('#gSplash'), { cy: 0.3, alpha: 0.16, scale: 1.1 }));
}
function hideSplash() { splash.hidden = true; document.body.style.overflow = ''; try { sessionStorage.setItem('pdm-splash', '1'); } catch (e) { } }
$('#splashGo').onclick = () => {
  snd.logo();
  hideSplash();
  const next = [1, 2, 3].find(i => isOpen(SBK[i]) && !done(SBK[i]));
  if (next) { SB[next] = true; renderSB(); }
  location.hash = 'paris';
};
$('#brandBtn').onclick = () => showSplash();

/* ===================== DÉMARRAGE ===================== */
(async function start() {
  initFiches();
  window.addEventListener('fiche-error', () => toast('Fiches indisponibles pour le moment, réessaie dans un instant'));
  store = await openStore();
  ME = store.me();
  if (ME) store.groups?.ensureCommonGroup().catch(console.warn);
  await refresh(true);
  loadDraft(); initSB();
  initPolls();
  renderAll(); show();
  let seen = false; try { seen = !!sessionStorage.getItem('pdm-splash'); } catch (e) { }
  if (groupUI.hasInvite()) { location.hash = 'classement'; }
  else if (!seen && !location.hash) showSplash();
})();
