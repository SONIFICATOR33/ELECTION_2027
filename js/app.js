/* =====================================================================
   LES PRONOS DES MEMBRÉS — interface
   ===================================================================== */
import * as D from './data.js';
import { C, by } from './data.js';
import * as S from './scoring.js';
import { openStore } from './store.js';
import { snd } from './sound.js';

/* place de chaque candidat sur l'axe gauche-droite (-1 à 1), null = hors axe : sert au son */
const AXIS = (() => { const a = C.filter(c => !c.off), m = {}; a.forEach((c, i) => m[c.id] = -1 + 2 * i / (a.length - 1)); return id => id in m ? m[id] : null; })();
const byName = Object.fromEntries(C.map(c => [c.p + ' ' + c.n, c.id]));

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = v => v == null ? '–' : (+v).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const ini = c => (c.p[0] + c.n.replace(/^de /, '')[0]).toUpperCase();
const av = (c, s = 40) => c ? `<span class="av${c.und ? ' und' : ''}" style="--s:${s}px;--c:${c.col}" aria-hidden="true">${ini(c)}</span>` : '';
const clone = o => JSON.parse(JSON.stringify(o));
const OKSVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><path d="M5 12l5 5 9-10"/></svg>';
const now = () => Date.now();
const mid = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const daysTo = t => Math.round((mid(t) - mid(now())) / 864e5);
const dateFr = (t, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('fr-FR', o);

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
  $('#meBtn').textContent = ME ? ME.pseudo : 'Entrer';
  const b = $('#banner');
  if (store.mode === 'local') {
    b.hidden = false;
    b.textContent = store.fallback ? 'Base partagée injoignable : tes paris restent sur ce téléphone pour l’instant.' : 'Mode essai : en attendant la base partagée, tes paris restent sur ce téléphone.';
  } else b.hidden = true;
}

/* ===================== ACCUEIL ===================== */
function renderHero() {
  $('#jx').textContent = 'J-' + Math.max(0, daysTo(D.TOUR1));
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
  if (d <= 0) return { txt: 'Clôture ce soir à minuit', hot: true };
  return { txt: `Clôture dans ${d} j, ${dateFr(t)} minuit`, hot: d <= 3 };
}
const done = k => { const p = mine(); return k === 'gp' ? !!S.current(p) : !!(p[k] && p[k].length); };

function renderCTA() {
  const el = $('#cta');
  if (!ME) {
    el.innerHTML = `<h2>Entre dans le jeu</h2><p>Un pseudo et un code à 4 chiffres, pas d'email. Le premier pari se clôt le ${dateFr(D.LOCK1, { day: 'numeric', month: 'long' })}.</p><button class="big" data-join>Choisir mon pseudo</button>`;
    return;
  }
  const todo = ['l1', 'l2', 'gp'].filter(k => isOpen(k) && !done(k));
  const names = { l1: 'Étape 1 : qui sera encore là le 31 janvier ?', l2: 'Étape 2 : qui aura ses 500 signatures ?', gp: 'Le Grand Prono : qui va gagner, 1er tour, finale' };
  const anchor = { l1: 'st1', l2: 'st2', gp: 'st3' };
  if (todo.length) {
    const k = todo[0], dl = deadline(k);
    el.innerHTML = `<h2>${esc(ME.pseudo)}, ${todo.length === 1 ? 'il te reste un pari' : `il te reste ${todo.length} paris`}</h2><p><b>${names[k]}</b><br>${dl.txt}.</p><button class="big" data-go="paris#${anchor[k]}">Faire ce pari</button>`;
  } else {
    const w = S.clampWeek(S.weekOf(now()));
    el.innerHTML = `<h2>Tous tes paris sont faits</h2><p>Tu peux encore ajuster ton Grand Prono : la photo de lundi prochain comptera ×${fmt(D.mult(Math.min(w + 1, D.NWEEKS - 1)))}.</p><button class="big" data-go="classement">Voir le classement</button>`;
  }
}

function renderPollsHome() {
  const box = $('#pollsHome');
  if (inBlackout()) { box.innerHTML = '<p class="blackout">Sondages masqués la veille et le jour du vote, comme le veut la loi du 19 juillet 1977.</p>'; return; }
  $('#podSrc').textContent = D.POLL_DATE;
  $('#podium').innerHTML = [1, 0, 2].map(i => { const [id, v] = D.POD[i], c = by[id]; return `<div class="pcol p${i + 1}">${av(c, i === 0 ? 62 : 50)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><div class="blk"><span class="rk">${i + 1}</span><span class="pv">${fmt(v)} %</span></div></div>`; }).join('');
  const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const DN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
  $('#moves').innerHTML = D.MOVES.map(([h, l]) => `<div><h3>${h}</h3>${l.map(([id, u, t]) => `<div class="mv"><span class="ar ${u ? 'up' : 'dn'}">${u ? UP : DN}</span>${av(by[id], 40)}<div><b>${by[id].p} ${by[id].n}</b><span>${t}</span></div></div>`).join('')}</div>`).join('');
  $('#lastSrc').textContent = D.LAST_SRC;
  $('#last').innerHTML = D.LAST.map(([id, v]) => `<div class="bar">${av(by[id], 28)}<span class="nm">${by[id].n}</span><div class="tr"><i style="width:${v / 35 * 100}%;--c:${by[id].col}"></i></div><span class="v">${v} %</span></div>`).join('');
}

function renderHomePlayers() {
  const pl = Object.keys(ALL.players), n = pl.length;
  const c = k => pl.filter(pid => { const p = ALL.pronos[pid] || {}; return k === 'gp' ? !!S.current(p) : !!(p[k] && p[k].length); }).length;
  $('#homePlayers').innerHTML = n
    ? `<div class="stat"><b>${n}</b><p>joueur${n > 1 ? 's' : ''} inscrit${n > 1 ? 's' : ''}</p></div><div class="stat"><b>${c('l1')}</b><p>ont fait l'étape 1, ${c('gp')} leur Grand Prono</p></div>`
    : '<p class="help">Personne n’est encore inscrit. Sois le premier !</p>';
}

/* ===================== MES PARIS ===================== */
function renderParisSummary() {
  const rows = [['l1', 'Qui sera là le 31 janvier ?', 'st1'], ['l2', 'Qui aura ses 500 signatures ?', 'st2'], ['gp', 'Le Grand Prono', 'st3']];
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
    if (!D.U1.includes(c.id)) continue;
    if (c.off && !off) { h += '<span class="grp">Hors axe gauche-droite</span>'; off = true; }
    const on = sel.has(c.id);
    h += `<button class="tile${on ? ' on' : ''}" data-id="${c.id}" aria-pressed="${on}"${open ? '' : ' disabled'}>${av(c, 44)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><small>${esc(c.note || c.party || '')}</small><span class="ok">${OKSVG}</span></button>`;
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
  $('#lock2note').textContent = D.LOCK2_PROVISOIRE ? 'Date de clôture provisoire : elle sera calée juste avant la première publication des parrainages par le Conseil constitutionnel.' : '';
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
let filt = 'main';
const list = () => filt === 'main' ? C.filter(c => c.main) : C;
const gp = () => draft.gp;
function renderPhoto() {
  const el = $('#photo'), w = S.weekOf(now()), dl = deadline('gp');
  const e = $('#dl3'); e.textContent = dl.txt; e.classList.toggle('hot', dl.hot);
  if (!isOpen('gp')) { el.innerHTML = '<p class="okbar">Le Grand Prono est clos. Rendez-vous au classement.</p>'; return; }
  const cw = S.clampWeek(w);
  el.innerHTML = done('gp')
    ? `<div class="photo"><b>×${fmt(D.mult(cw))}</b><span>Ta photo de cette semaine compte ×${fmt(D.mult(cw))}. Si tu ne changes rien, elle est reprise automatiquement chaque lundi.</span></div>`
    : `<div class="photo" style="background:var(--rougebg)"><b style="color:var(--rouge)">×${fmt(D.mult(cw))}</b><span>Pas encore de Grand Prono : cette semaine compterait ×${fmt(D.mult(cw))}. Chaque semaine sans prono compte zéro.</span></div>`;
}
function renderCar() {
  let h = '', sep = false;
  list().forEach(c => {
    if (c.off && !sep) { h += '<div class="sep">Hors axe gauche-droite</div>'; sep = true; }
    h += `<button class="cand${gp().pres === c.id ? ' sel' : ''}" data-id="${c.id}" aria-pressed="${gp().pres === c.id}">${av(c, 56)}<b><span class="pn">${esc(c.p)}</span>${esc(c.n)}</b><small>${esc(c.party || 'Sans parti précisé')}</small>${c.note ? `<em>${esc(c.note)}</em>` : ''}<span class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5"><path d="M5 12l5 5 9-10"/></svg></span></button>`;
  });
  $('#car').innerHTML = h;
}
const syncCar = () => $$('.cand').forEach(b => { const s = b.dataset.id === gp().pres; b.classList.toggle('sel', s); b.setAttribute('aria-pressed', s); });
$('#car').addEventListener('click', e => { const b = e.target.closest('.cand'); if (!b) return; gp().pres = gp().pres === b.dataset.id ? null : b.dataset.id; dirty.gp = true; if (gp().pres) snd.pick(AXIS(gp().pres), true); else snd.unpick(AXIS(b.dataset.id)); syncCar(); renderDuel(); renderGPBtn(); if (gp().pres) toast('Tu vois ' + by[gp().pres].n + ' gagner'); });
const scr = dir => { const c = $('#car'); c.scrollBy({ left: dir * Math.max(200, c.clientWidth * .8), behavior: 'smooth' }); };
$('#prev').onclick = () => scr(-1); $('#next').onclick = () => scr(1);
$('#car').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { scr(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { scr(-1); e.preventDefault(); } });
$$('.seg button').forEach(b => b.onclick = () => { filt = b.dataset.f; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); renderCar(); renderPick(); });

function renderPick() {
  const ids = new Set(list().map(c => c.id)); gp().top.forEach(t => ids.add(t.id));
  $('#pick').innerHTML = C.filter(c => ids.has(c.id)).map(c => { const i = gp().top.findIndex(t => t.id === c.id); return `<button class="chip${i >= 0 ? ' on' : ''}" data-id="${c.id}" aria-pressed="${i >= 0}">${av(c, 32)}${esc(c.p + ' ' + c.n)}${i >= 0 ? `<span class="n">${i + 1}</span>` : ''}</button>`; }).join('');
}
$('#pick').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return; const id = b.dataset.id, i = gp().top.findIndex(t => t.id === id);
  if (i >= 0) { gp().top.splice(i, 1); snd.unpick(AXIS(id)); } else if (gp().top.length < 5) { gp().top.push({ id, pct: Math.round((by[id].poll || 2) * 2) / 2 }); snd.rank(gp().top.length - 1, AXIS(id)); } else { snd.error(); toast('Top 5 complet : retire d’abord un nom'); return; }
  dirty.gp = true; renderPick(); renderSlots(); renderDuel(); renderGPBtn();
});
function renderSlots() {
  let h = ''; for (let i = 0; i < 5; i++) {
    const t = gp().top[i];
    h += t ? `<li><span class="rkb">${i + 1}</span>${av(by[t.id], 34)}<span class="sn">${esc(by[t.id].p + ' ' + by[t.id].n)}</span><span class="step"><button data-i="${i}" data-s="-0.5" aria-label="Moins">−</button><output>${fmt(t.pct)} %</output><button data-i="${i}" data-s="0.5" aria-label="Plus">+</button></span></li>`
      : `<li class="empty"><span class="rkb">${i + 1}</span><span></span><span>À choisir</span><span></span></li>`;
  }
  $('#slots').innerHTML = h; renderTotal();
}
$('#slots').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const t = gp().top[+b.dataset.i]; t.pct = Math.min(60, Math.max(0, t.pct + +b.dataset.s)); snd.tick(t.pct); dirty.gp = true; renderSlots(); renderGPBtn(); });
function renderTotal() {
  const s = gp().top.reduce((a, t) => a + t.pct, 0), over = s > 100;
  $('#total').className = 'total' + (over ? ' over' : '');
  $('#total').innerHTML = `<p>${over ? `Ton top 5 fait ${fmt(s)} %, ça dépasse 100 %` : `Top 5 : ${fmt(s)} %, il reste ${fmt(100 - s)} % pour les autres`}</p><div class="tr"><i style="width:${Math.min(100, s)}%;--c:${over ? 'var(--rouge)' : 'var(--bleuT)'}"></i></div>`;
}
function renderDuel() {
  const el = $('#duel'), g = gp();
  if (g.top.length < 2) { el.innerHTML = '<p class="help">Ta finale se remplit toute seule avec tes deux premiers du 1er tour.</p>'; renderCoh(); return; }
  const [a, b] = [g.top[0].id, g.top[1].id], inF = g.pres === a || g.pres === b;
  const fin = id => `<button class="fin${g.pres === id ? ' win' : ''}" data-id="${id}">${av(by[id], 56)}<b><span class="pn">${esc(by[id].p)}</span>${esc(by[id].n)}</b><span class="fine">${g.pres === id ? 'Mon gagnant' : 'Le faire gagner'}</span></button>`;
  const w = inF ? g.pres : null, l = w === a ? b : a;
  el.innerHTML = `<div class="duel">${fin(a)}<span class="vs">contre</span>${fin(b)}</div>` +
    (w ? `<div class="range"><div class="score"><span>${by[w].n} ${fmt(g.win)} %</span><span>${by[l].n} ${fmt(100 - g.win)} %</span></div><input type="range" id="win" min="50" max="80" step="0.5" value="${g.win}" aria-label="Score du vainqueur au 2nd tour"></div>`
      : `<p class="warn">${g.pres ? `Ton gagnant (${by[g.pres].n}) n'est pas dans ta finale. Touche un finaliste ou revois ton top 2.` : 'Touche le finaliste que tu vois gagner.'}</p>`);
  renderCoh();
}
function renderCoh() {
  const g = gp(), el = $('#coh'), ref = draft.l2.length ? draft.l2 : draft.l1, lab = draft.l2.length ? 'ton pari des 500 signatures' : 'ton pari « Qui sera là ? »';
  const out = ref.length ? [g.pres, ...g.top.map(t => t.id)].filter((id, i, a) => id && a.indexOf(id) === i && !ref.includes(id)) : [];
  el.hidden = !out.length;
  if (out.length) el.textContent = `Attention : ${out.map(id => by[id].n).join(', ')} ${out.length > 1 ? 'ne sont pas' : 'n’est pas'} dans ${lab}. C’est permis, mais pas très cohérent.`;
}
$('#duel').addEventListener('click', e => { const b = e.target.closest('.fin'); if (!b) return; gp().pres = b.dataset.id; snd.pick(AXIS(b.dataset.id), true); dirty.gp = true; syncCar(); renderDuel(); renderGPBtn(); });
$('#duel').addEventListener('input', e => { if (e.target.id !== 'win') return; const g = gp(); g.win = +e.target.value; snd.tick((g.win - 50) * 1.5); const l = g.top[0].id === g.pres ? g.top[1].id : g.top[0].id; $('#duel .score').innerHTML = `<span>${by[g.pres].n} ${fmt(g.win)} %</span><span>${by[l].n} ${fmt(100 - g.win)} %</span>`; dirty.gp = true; renderGPBtn(); });
function renderGPBtn() {
  const b = $('#saveGP'); b.hidden = !isOpen('gp');
  b.textContent = done('gp') ? (dirty.gp ? 'Enregistrer mes changements' : 'Grand Prono enregistré') : 'Enregistrer mon Grand Prono';
}
$('#saveGP').onclick = () => withMe(async () => {
  const g = gp(), er = [], s = g.top.reduce((a, t) => a + t.pct, 0);
  if (!g.pres) er.push('Choisis qui va gagner.');
  if (g.top.length < 5) er.push('Complète ton top 5 du 1er tour.');
  if (s > 100) er.push('Ton top 5 dépasse 100 %.');
  if (g.top.some((t, i) => i && t.pct > g.top[i - 1].pct)) er.push('Les % doivent suivre l’ordre d’arrivée.');
  if (g.pres && g.top.length >= 2 && g.top[0].id !== g.pres && g.top[1].id !== g.pres) er.push('Ton gagnant doit être dans ta finale.');
  const E = $('#errs');
  if (er.length) { snd.error(); E.innerHTML = er.map(esc).join('<br>'); E.classList.add('on'); E.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  E.classList.remove('on');
  await store.save({}, { pres: g.pres, top: g.top.map(t => ({ id: t.id, pct: t.pct })), win: g.win });
  snd.vote(); dirty.gp = false; await refresh(true); renderAll(); toast('Grand Prono enregistré : photo de la semaine prise');
});
$('#copy').onclick = async () => {
  const g = gp(), t = ['Les pronos des membrés' + (ME ? ' (' + ME.pseudo + ')' : ''),
  'Mon prono pour l’Élysée : ' + (g.pres ? by[g.pres].p + ' ' + by[g.pres].n : 'à choisir'),
  '1er tour : ' + (g.top.map((x, i) => (i + 1) + '. ' + by[x.id].n + ' ' + fmt(x.pct) + ' %').join(', ') || 'à faire'),
  g.top.length > 1 && g.pres ? '2nd tour : ' + by[g.pres].n + ' ' + fmt(g.win) + ' %' : '',
  location.origin + location.pathname].filter(Boolean).join('\n');
  try { await navigator.clipboard.writeText(t); toast('Copié, colle-le dans WhatsApp'); } catch (e) { toast('Copie impossible depuis cette fenêtre'); }
};

/* ===================== TEAM DE RÊVE ===================== */
const CAND_NAMES = C.map(c => c.p + ' ' + c.n);
const ALL_NAMES = new Set([...CAND_NAMES, ...D.PEOPLE_GROUPS.flatMap(g => g[1])]);
const lastName = n => n.replace(/^(\S+\s)+?(?=(de |Le |La )?\S+$)/, '');
const GROUPS_HTML = D.PEOPLE_GROUPS.map(([g, l]) => `<optgroup label="${esc(g)}">${l.slice().sort((a, b) => lastName(a).localeCompare(lastName(b), 'fr')).map(n => `<option>${esc(n)}</option>`).join('')}</optgroup>`).join('');
const OPTS = '<option value="">Choisir…</option>' + GROUPS_HTML + '<option value="__autre">Autre…</option>';
const OPTS_PM = '<option value="">Choisir…</option>' + GROUPS_HTML;
const OPTS_COEUR = '<option value="">Choisir…</option>' + [['De gauche à droite', C.filter(c => !c.off)], ['Hors axe gauche-droite', C.filter(c => c.off)]]
  .map(([g, l]) => `<optgroup label="${g}">${l.map(c => `<option>${esc(c.p + ' ' + c.n)}</option>`).join('')}</optgroup>`).join('');
const selHTML = (k, label, opts = OPTS) => `<div class="sel" data-k="${esc(k)}"><select aria-label="${esc(label)}">${opts}</select><input type="text" placeholder="Tape le nom" maxlength="40" autocomplete="off" aria-label="${esc(label)}, autre nom"></div>`;
$('#t-pm').innerHTML = selHTML('pm', 'Premier ministre', OPTS_PM);
$('#t-coeur').innerHTML = selHTML('coeur', 'Mon président de cœur', OPTS_COEUR);
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
    else { s.value = ''; d.classList.remove('other'); }
  });
  $('#t-jl').value = draft.team.jl || '';
  renderPublish();
}
const teamCount = () => (draft.team.coeur ? 1 : 0) + (draft.team.pm ? 1 : 0) + D.POSTES.filter(p => (draft.team.min || {})[p]).length;
function renderPublish() {
  const n = teamCount(), ok = n === 12, b = $('#teamShare');
  b.disabled = !ok; b.classList.toggle('off', !ok);
  b.textContent = ok ? 'Publier la photo de mon gouvernement' : `Publier la photo de mon gouvernement (${n}/12)`;
  $('#pubHelp').textContent = ok ? 'Ton gouvernement est complet : publie la photo et envoie-la à tes amis.' : 'Choisis ton président de cœur, ton Premier ministre et tes 10 ministres pour publier la photo. Le joker est en bonus.';
}
$('#v-team').addEventListener('change', e => {
  const d = e.target.closest('.sel'); if (!d || e.target.tagName !== 'SELECT') return;
  const v = e.target.value;
  if (v === '__autre') { d.classList.add('other'); const i = d.querySelector('input'); setT(d.dataset.k, i.value.trim()); i.focus(); }
  else { d.classList.remove('other'); setT(d.dataset.k, v); if (v) snd.pick(v in byName ? AXIS(byName[v]) : null); }
  const was = !$('#teamShare').disabled; renderPublish(); if (!was && !$('#teamShare').disabled) { snd.logo(); toast('Gouvernement complet : tu peux publier la photo !'); }
});
$('#v-team').addEventListener('input', e => {
  if (e.target.id === 't-jl') { draft.team.jl = e.target.value; dirty.team = true; return; }
  const d = e.target.closest('.sel'); if (d && e.target.tagName === 'INPUT') { setT(d.dataset.k, e.target.value.trim()); renderPublish(); }
});
async function saveTeam() { try { localStorage.setItem(teamKey(), JSON.stringify(draft.team)); } catch (e) { } dirty.team = false; }
$('#teamSave').onclick = async () => { if (!draft.team.pm && !draft.team.coeur) { toast('Choisis au moins ton président de cœur ou ton Premier ministre'); return; } await saveTeam(); snd.vote(); toast('Team enregistrée sur ton téléphone'); };
$('#teamShare').onclick = async () => {
  if (teamCount() < 12) { snd.error(); toast('Complète d’abord ton gouvernement'); return; }
  if (dirty.team) await saveTeam();
  snd.logo();
  const blob = await drawTeam();
  const file = new File([blob], 'ma-team-de-reve.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Ma team de rêve', text: 'Mon gouvernement de rêve, et toi ? ' + location.origin + location.pathname }); } catch (e) { }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Image téléchargée : envoie-la à tes amis');
  }
};
async function drawTeam() {
  try { await Promise.all([document.fonts.load('800 60px "Barlow Condensed"'), document.fonts.load('600 30px Barlow')]); } catch (e) { }
  const cv = $('#cv'), x = cv.getContext('2d'), W = 1080, H = 1350, t = draft.team;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#000091'; x.fillRect(0, 0, W, 250);
  [['#2730C9', 0], ['#fff', 1], ['#E1000F', 2]].forEach(([c, i]) => { x.fillStyle = c; x.fillRect(64 + i * 34, 58, 34, 66); });
  x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.strokeRect(64, 58, 102, 66);
  x.fillStyle = '#fff'; x.font = '800 64px "Barlow Condensed", sans-serif'; x.fillText('MA TEAM DE RÊVE', 196, 118);
  x.font = '600 34px Barlow, sans-serif'; x.fillText('Le gouvernement de ' + (ME ? ME.pseudo : 'moi'), 64, 196);
  [['#000091', 0], ['#fff', 1], ['#E1000F', 2]].forEach(([c, i]) => { x.fillStyle = c; x.fillRect(i * W / 3, 250, W / 3, 10); });
  let y0 = 325;
  if (t.coeur) {
    x.fillStyle = '#E1000F'; x.font = '700 28px Barlow, sans-serif'; x.fillText('MON PRÉSIDENT DE CŒUR', 64, y0);
    x.fillStyle = '#141414'; x.font = '800 64px "Barlow Condensed", sans-serif'; x.fillText(fit(x, t.coeur, W - 128), 64, y0 + 66);
    y0 += 125;
  }
  x.fillStyle = '#5B5B66'; x.font = '700 28px Barlow, sans-serif'; x.fillText('PREMIER MINISTRE', 64, y0);
  x.fillStyle = '#000091'; x.font = '800 ' + (t.coeur ? 60 : 76) + 'px "Barlow Condensed", sans-serif'; x.fillText(fit(x, t.pm || '—', W - 128), 64, y0 + (t.coeur ? 62 : 75));
  let y = y0 + (t.coeur ? 135 : 155);
  const step = t.coeur ? 56 : 64;
  x.strokeStyle = '#E1E1E6'; x.lineWidth = 2;
  for (const p of D.POSTES) {
    x.fillStyle = '#5B5B66'; x.font = '600 27px Barlow, sans-serif'; x.fillText(fit(x, p, 410), 64, y);
    x.fillStyle = '#141414'; x.font = '700 38px "Barlow Condensed", sans-serif'; x.fillText(fit(x, (t.min || {})[p] || '—', W - 560), 500, y);
    x.beginPath(); x.moveTo(64, y + 20); x.lineTo(W - 64, y + 20); x.stroke(); y += step;
  }
  if (t.jl && t.jn) {
    x.fillStyle = '#E1000F'; x.font = '700 28px Barlow, sans-serif'; x.fillText(fit(x, 'JOKER : ' + t.jl.toUpperCase(), W - 128), 64, y + 20);
    x.fillStyle = '#141414'; x.font = '800 44px "Barlow Condensed", sans-serif'; x.fillText(fit(x, t.jn, W - 128), 64, y + 70);
  }
  x.fillStyle = '#000091'; x.fillRect(0, H - 90, W, 90);
  x.fillStyle = '#fff'; x.font = '700 32px "Barlow Condensed", sans-serif'; x.fillText('LES PRONOS DES MEMBRÉS', 64, H - 34);
  x.font = '500 26px Barlow, sans-serif'; const u = (location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, ''); x.fillText(u, W - 64 - x.measureText(u).width, H - 36);
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
function standings() {
  const R = D.RESULTS;
  return { R, has: S.hasResults(R), rows: S.hasResults(R) ? S.classement(ALL.players, ALL.pronos, R, D.U1, D.U2) : [] };
}
function presShares() {
  const cnt = {}; let n = 0;
  for (const pid in ALL.players) { const c = S.current(ALL.pronos[pid]); if (c && c.pres) { cnt[c.pres] = (cnt[c.pres] || 0) + 1; n++; } }
  return { cnt, n };
}
function renderMeCard() {
  const el = $('#meCard');
  if (!ME) { el.innerHTML = '<h2>Ta carte d’analyste</h2><p>Entre dans le jeu pour voir tes points, tes jauges et ton titre.</p><button class="big" data-join style="background:#fff;color:#000091">Choisir mon pseudo</button>'; return; }
  const { has, rows } = standings(), me = rows.find(r => r.pid === ME.pid);
  const ouverts = S.parisOuverts(now()), faits = ouverts.filter(done).length;
  const ti = S.titre({ rank: me && me.rank, n: rows.length, parisFaits: faits, parisOuverts: ouverts.length, results: has });
  const w = S.clampWeek(S.weekOf(now())), m = D.mult(w);
  const { cnt, n } = presShares(), cur = S.current(mine());
  const same = cur && cur.pres ? cnt[cur.pres] || 0 : 0, aud = cur && n ? 1 - same / n : null;
  let next = '';
  if (!has) next = ti === 0 ? `Fais tes ${ouverts.length} paris ouverts pour passer ${S.TITRES[1]}.` : 'Prochaine montée en grade avec les premiers résultats, le 31 janvier.';
  else if (me && ti < 5) {
    const cut = [0, .75, .5, .25, .1, 0][ti + 1], target = ti + 1 === 5 ? rows[0] : rows[Math.min(rows.length - 1, Math.floor(cut * Math.max(1, rows.length - 1)))];
    next = target && target.total > me.total ? `Encore ${fmt(Math.round((target.total - me.total) * 10) / 10)} pts pour passer ${S.TITRES[ti + 1]}.` : '';
  }
  const pts = k => me ? fmt(me[k]) : '–';
  el.innerHTML = `<div class="shead"><h2>${esc(ME.pseudo)}</h2><span class="badge">${S.TITRES[ti]}</span></div>` +
    (has && me ? `<p style="margin:6px 0 0"><b style="font:800 34px/1 var(--cond)">${fmt(me.total)} pts</b> · ${me.rank}${me.rank === 1 ? 'er' : 'e'} sur ${rows.length}</p>` : `<p style="margin:6px 0 0">Premiers points le 31 janvier, avec le résultat de l’étape 1.</p>`) +
    `<div class="gauges">
      <div class="gg"><div class="lbl"><span>Paris ouverts faits</span><span>${faits}/${ouverts.length || 0}</span></div><div class="tr"><i style="width:${ouverts.length ? faits / ouverts.length * 100 : 100}%"></i></div></div>
      ${isOpen('gp') ? `<div class="gg"><div class="lbl"><span>Points en jeu cette semaine</span><span>×${fmt(m)}</span></div><div class="tr"><i style="width:${(m - 1) * 100}%"></i></div><p>Ta photo du Grand Prono compte ×${fmt(m)} cette semaine, puis un peu moins chaque lundi.</p></div>` : ''}
      <div class="gg"><div class="lbl"><span>Audace</span><span>${aud == null ? '–' : Math.round(aud * 100) + ' %'}</span></div><div class="tr"><i style="width:${aud == null ? 0 : aud * 100}%"></i></div><p>${cur && cur.pres ? `Vous êtes ${same} sur ${n} à voir ${esc(by[cur.pres].n)} gagner. Plus tu es seul, plus ça rapporte si ça arrive.` : 'Fais ton Grand Prono pour mesurer ton audace.'}</p></div>
    </div>
    <div class="ptsgrid"><div><b>${pts('e1')}</b><span>Qui sera là<br>31 janv.</span></div><div><b>${pts('e2')}</b><span>500 signat.<br>26 mars</span></div><div><b>${pts('t1')}</b><span>1er tour<br>18 avril</span></div><div><b>${pts('fin')}</b><span>Finale<br>2 mai</span></div></div>` +
    (next ? `<p class="fine" style="color:#fff;opacity:.85;margin-top:10px">${next}</p>` : '');
}
function renderRank() {
  const { has, rows } = standings(), el = $('#rank');
  if (has) {
    el.innerHTML = `<div class="scroll"><table class="rank"><tr><th></th><th>Joueur</th><th>Pts</th></tr>${rows.map(r => {
      const ti = S.titre({ rank: r.rank, n: rows.length, results: true });
      return `<tr class="${ME && r.pid === ME.pid ? 'mine' : ''}"><td>${r.rank}</td><td>${esc(r.pseudo)}<small>${S.TITRES[ti]}</small></td><td><b>${fmt(r.total)}</b></td></tr>`;
    }).join('')}</table></div>`;
    return;
  }
  const pl = Object.keys(ALL.players);
  const k = pid => ['l1', 'l2'].filter(x => (ALL.pronos[pid] || {})[x] && ALL.pronos[pid][x].length).length + (S.current(ALL.pronos[pid]) ? 1 : 0);
  const sorted = pl.sort((a, b) => k(b) - k(a) || ALL.players[a].pseudo.localeCompare(ALL.players[b].pseudo, 'fr'));
  el.innerHTML = `<p class="help">Les premiers points tombent le 31 janvier. En attendant, voici qui a fait ses paris.</p>` +
    (sorted.length ? `<div class="scroll"><table class="rank"><tr><th></th><th>Joueur</th><th>Paris faits</th></tr>${sorted.map((pid, i) => `<tr class="${ME && pid === ME.pid ? 'mine' : ''}"><td>${i + 1}</td><td>${esc(ALL.players[pid].pseudo)}<small>${S.TITRES[S.titre({ results: false, parisFaits: S.parisOuverts(now()).filter(x => x === 'gp' ? !!S.current(ALL.pronos[pid]) : !!((ALL.pronos[pid] || {})[x] || []).length).length, parisOuverts: S.parisOuverts(now()).length })]}</small></td><td><b>${k(pid)}/3</b></td></tr>`).join('')}</table></div>` : '<p class="help">Personne pour l’instant.</p>');
}
function renderCons() {
  const { cnt, n } = presShares(), el = $('#cons');
  let h = '';
  if (n) {
    h += `<h3>Qui va gagner selon nous (${n} Grand${n > 1 ? 's' : ''} Prono${n > 1 ? 's' : ''})</h3>` + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id, k]) => `<div class="bar">${av(by[id], 28)}<span class="nm">${by[id].n}</span><div class="tr"><i style="width:${k / n * 100}%;--c:var(--vert)"></i></div><span class="v">${Math.round(k / n * 100)} %</span></div>`).join('');
  }
  const bloc = (key, titre, lock) => {
    const bets = Object.keys(ALL.players).map(pid => (ALL.pronos[pid] || {})[key]).filter(x => x && x.length);
    if (!bets.length) return '';
    if (now() < +lock) return `<h3>${titre}</h3><p class="help">${bets.length} pari${bets.length > 1 ? 's' : ''} déposé${bets.length > 1 ? 's' : ''}. Les choix de chacun seront dévoilés à la clôture, le ${dateFr(lock, { day: 'numeric', month: 'long' })}.</p>`;
    const sh = D.U1.map(id => [id, bets.filter(b => b.includes(id)).length / bets.length]).sort((a, b) => b[1] - a[1]);
    return `<h3>${titre} (${bets.length} paris)</h3>` + sh.map(([id, s]) => `<div class="bar">${av(by[id], 28)}<span class="nm">${by[id].n}</span><div class="tr"><i style="width:${s * 100}%;--c:var(--bleuT)"></i></div><span class="v">${Math.round(s * 100)} %</span></div>`).join('');
  };
  h += bloc('l1', 'Qui sera là le 31 janvier ?', D.LOCK1) + bloc('l2', 'Qui aura ses 500 signatures ?', D.LOCK2);
  el.innerHTML = h || '<p class="help">Pas encore de paris. Lance-toi !</p>';
}
function renderPList() {
  const q = $('#q').value.trim().toLowerCase();
  const pl = Object.keys(ALL.players).filter(pid => !q || ALL.players[pid].pseudo.toLowerCase().includes(q))
    .sort((a, b) => ALL.players[a].pseudo.localeCompare(ALL.players[b].pseudo, 'fr'));
  $('#plist').innerHTML = pl.map(pid => {
    const p = ALL.pronos[pid] || {}, c = S.current(p);
    const reveal = (k, lock) => (p[k] && p[k].length) ? (now() < +lock ? 'pari déposé' : p[k].length + ' candidats') : 'pas joué';
    return `<div class="prow${ME && pid === ME.pid ? ' mine' : ''}"><div><b>${esc(ALL.players[pid].pseudo)}</b><p class="fine">Qui sera là : ${reveal('l1', D.LOCK1)} · 500 signatures : ${reveal('l2', D.LOCK2)}</p></div>` +
      (c ? `<div class="avs5" title="Gagnant pronostiqué puis top 5">${av(by[c.pres], 34)}<span style="width:6px"></span>${c.top.map(t => av(by[t.id], 24)).join('')}</div>` : '<span class="fine">pas de Grand Prono</span>') + '</div>';
  }).join('') || '<p class="help">Aucun joueur trouvé.</p>';
}
$('#q').addEventListener('input', renderPList);

/* ===================== PSEUDO ===================== */
const sheet = $('#sheet');
function openJoin(msg) {
  if (ME) {
    $('#sheetIn').innerHTML = `<h2 id="sheetT">Tu joues en tant que ${esc(ME.pseudo)}</h2><p class="help">Pour jouer sur un autre téléphone, entre le même pseudo et ton code à 4 chiffres.</p><div class="form"><button class="big" id="close">Continuer</button><button class="ghost" id="logout">Changer de pseudo</button></div>`;
  } else {
    $('#sheetIn').innerHTML = `<h2 id="sheetT">Bienvenue au club</h2><p class="help">${msg ? esc(msg) + ' ' : ''}Pas d'email ni de nom : juste un pseudo et un code à 4 chiffres. Note bien ce code : il te sert à te retrouver sur un autre téléphone.</p>
      <form class="form" id="joinF" novalidate><label>Ton pseudo<input id="jp" maxlength="24" autocomplete="nickname" autocapitalize="words" required></label>
      <label>Ton code secret (4 chiffres)<input id="jc" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label>
      <p class="err" id="jerr" role="alert"></p><button class="big" type="submit" id="jgo">C'est parti</button></form>`;
  }
  sheet.classList.add('open');
  setTimeout(() => { const f = $('#jp') || $('#close'); if (f) f.focus(); }, 50);
}
sheet.addEventListener('click', async e => {
  if (e.target === sheet || e.target.id === 'close') { sheet.classList.remove('open'); pending = null; return; }
  if (e.target.id === 'logout') { await store.logout(); ME = null; loadDraft(); initSB(); renderAll(); openJoin(); }
});
sheet.addEventListener('submit', async e => {
  e.preventDefault(); const p = $('#jp').value.trim(), c = $('#jc').value.trim(), er = $('#jerr'), b = $('#jgo');
  er.textContent = ''; b.disabled = true; b.textContent = 'Un instant…';
  try {
    const keep = clone(draft), kd = Object.assign({}, dirty);
    ME = await store.join(p, c); await refresh(true); loadDraft(); initSB();
    for (const k in kd) if (kd[k]) { draft[k] = keep[k]; dirty[k] = true; }
    sheet.classList.remove('open'); renderAll(); snd.logo(); toast('Salut ' + ME.pseudo + ' !');
    if (pending) { const f = pending; pending = null; await f(); }
  } catch (err) { snd.error(); er.textContent = err.message || 'Erreur'; b.disabled = false; b.textContent = "C'est parti"; }
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
  if (v === 'classement' || v === 'accueil') refresh().then(() => { renderHomePlayers(); renderClassement(); });
}
window.addEventListener('hashchange', show);
window.addEventListener('beforeunload', e => { if (Object.values(dirty).some(Boolean)) { e.preventDefault(); e.returnValue = ''; } });

function renderClassement() { renderMeCard(); renderRank(); renderCons(); renderPList(); }
function renderAll() {
  renderHeader(); renderSnd(); renderHero(); renderCTA(); renderPollsHome(); renderHomePlayers();
  renderParisSummary(); renderStages(); renderSB(); renderPhoto(); renderCar(); renderPick(); renderSlots(); renderDuel(); renderGPBtn();
  renderTeam(); renderClassement();
}

/* ===================== DÉMARRAGE ===================== */
(async function start() {
  store = await openStore();
  ME = store.me();
  await refresh(true);
  loadDraft(); initSB();
  initPolls();
  renderAll(); show();
  if (!ME && !sessionStorage.getItem('pdm-skip')) { sessionStorage.setItem('pdm-skip', '1'); setTimeout(() => openJoin(), 600); }
})();
