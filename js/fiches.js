/* =====================================================================
   FICHES DES CANDIDATS — lues dans fiches/fiches.json, ouvertes en feuille
   Image : fiches/img/<id>.jpg|png|webp si présente, sinon médaillon.
   ===================================================================== */
import { C, by, TOUR1 } from './data.js';
import { snd } from './sound.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ini = c => (c.p[0] + c.n.replace(/^de /, '')[0]).toUpperCase();
export function portraitThumb(c) {
  return `<span>${ini(c)}</span><img class="candidate-thumb" src="fiches/img/${c.id}.webp" alt="" loading="lazy" decoding="async">`;
}
const pct = (v, d = 2) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' %';
const ORDER = C.map(c => c.id);
const AX = (() => { const a = C.filter(c => !c.off), m = {}; a.forEach((c, i) => m[c.id] = -1 + 2 * i / (a.length - 1)); return id => id in m ? m[id] : null; })();
const TAG = { 'élu': ['élu', 'élue'], 'nommé': ['nommé', 'nommée'] };

/* âge au 1er tour, à l'heure de Paris */
function ageAu(iso, at) {
  const [y, m, d] = iso.split('-').map(Number);
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(at).map(x => [x.type, +x.value]));
  return p.year - y - (p.month < m || (p.month === m && p.day < d) ? 1 : 0);
}

let DATA = null, loading = null;
const load = () => loading || (loading = fetch('fiches/fiches.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(j => (DATA = j))
  .catch(e => { loading = null; throw e; }));

const el = () => $('#fiche');
let cur = null, opener = null;

const dateLabel = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR');
function programmeLink(c, p) {
  if (!p || !/^https:\/\//.test(p.url)) return '';
  return `<a class="programme-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.label + ' de ' + c.p + ' ' + c.n)} — site officiel, nouvel onglet">${esc(p.label)} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`;
}
const searchKey = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
function filterDirectory() {
  const q = searchKey($('#candidateSearch').value);
  let count = 0;
  for (const row of document.querySelectorAll('.candidate-entry')) {
    const c = by[row.dataset.candidate];
    row.hidden = !searchKey(`${c.p} ${c.n} ${c.party || ''}`).includes(q);
    if (!row.hidden) count++;
  }
  $('#candidateEmpty').hidden = count > 0;
}
function renderDirectory(state = 'ready') {
  $('#candidateDirectory').innerHTML = C.map(c => {
    const p = DATA?.candidats[c.id]?.programme;
    const link = programmeLink(c, p);
    const note = link ? p.detail : state === 'ready' ? 'Programme 2027 non renseigné.' : state === 'error' ? 'Liens indisponibles pour le moment.' : 'Chargement des liens…';
    return `<li class="candidate-entry" data-candidate="${c.id}">
      <span class="medal sm" style="--c:${c.col}" aria-hidden="true">${portraitThumb(c)}</span>
      <div class="candidate-identity"><b>${esc(c.p + ' ' + c.n)}</b><small>${esc(c.party)}</small></div>
      <div class="candidate-actions"><button class="ghost" data-fiche="${c.id}" aria-label="Fiche de ${esc(c.p + ' ' + c.n)}">Fiche</button>${link}</div>
      <p class="programme-note">${esc(note)}</p>
    </li>`;
  }).join('');
  filterDirectory();
}
async function loadDirectory() {
  $('#programmeRetry').hidden = true;
  $('#programmeStatus').textContent = 'Chargement des liens…';
  try {
    await load();
    renderDirectory();
    $('#programmeStatus').textContent = DATA.programmesCheckedAt ? `Liens officiels vérifiés le ${dateLabel(DATA.programmesCheckedAt)} · ouverture dans un nouvel onglet.` : 'Liens vers les sites officiels · ouverture dans un nouvel onglet.';
  } catch {
    renderDirectory('error');
    $('#programmeStatus').textContent = 'Les liens n’ont pas pu être chargés. Réessaie dans un instant.';
    $('#programmeRetry').hidden = false;
  }
}

function body(id) {
  const c = by[id], f = DATA.candidats[id] || {}, fem = !!f.f;
  const pres = (f.pres || []).length
    ? `<ul class="fpres">${f.pres.map(([y, v, n]) => `<li><b>${y}</b>${v == null ? '' : `<span>${pct(v)}</span>`}${n ? `<small>${esc(n)}</small>` : ''}</li>`).join('')}</ul>`
    : '<p class="mut">Aucune</p>';
  const tl = (f.parcours || []).map(([d, t, k]) => `<li><time>${esc(d)}</time><span>${esc(t)}</span><i class="k-${esc(k.normalize('NFD').replace(/[̀-ͯ]/g, ''))}">${esc(TAG[k] ? TAG[k][fem ? 1 : 0] : k)}</i></li>`).join('');
  const src = (f.sources || []).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(', ');
  const photo = f.portrait;
  const credit = photo ? `<p class="fsrc">Photo <a href="${esc(photo.source)}">${esc(photo.titre)}</a> · ${esc(photo.auteur)} · <a href="${esc(photo.licenceUrl)}">${esc(photo.licence)}</a> · redimensionnée et recadrée à l’affichage.</p>` : '';
  const maj = DATA.maj ? new Date(DATA.maj + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const programme = programmeLink(c, f.programme);
  return `
  <section class="fsec fprogramme">
    <h3>Programme et propositions</h3>
    ${programme || '<p class="mut">Programme 2027 non renseigné.</p>'}
    ${programme ? `<p class="programme-note">${esc(f.programme.detail)}</p><p class="fsrc">Site officiel · lien vérifié le ${esc(dateLabel(f.programme.checkedAt))} · nouvel onglet.</p>` : ''}
  </section>
  <section class="fsec">
    <h3>Dans la course</h3>
    <p class="fstat">${esc(f.statut || '')}</p>
    <div class="frow"><span class="fl">Présidentielles passées</span><div class="fv">${pres}${f.autre ? `<p class="mut">${esc(f.autre)}</p>` : ''}</div></div>
  </section>
  <section class="fsec"><h3>Parcours</h3><ol class="ftl">${tl}</ol></section>
  <section class="fsec">
    <div class="frow"><span class="fl">Formation</span><p class="fv">${esc(f.formation || 'Non communiquée')}</p></div>
    <div class="frow"><span class="fl">Métier</span><p class="fv">${esc(f.metier || 'Non communiqué')}</p></div>
  </section>
  ${credit}
  <p class="fsrc">Sources : ${src}. À jour le ${esc(maj)}.</p>`;
}

function head(id) {
  const c = by[id], f = DATA.candidats[id] || {};
  const age = f.naissance ? ageAu(f.naissance, TOUR1) : null, i = ORDER.indexOf(id);
  $('#fImg').style.setProperty('--c', c.col);
  $('#fImg').innerHTML = `<span class="medal" aria-hidden="true">${ini(c)}</span>`;
  $('#fName').innerHTML = `<span class="pn">${esc(c.p)}</span>${esc(c.n)}`;
  $('#fParty').textContent = c.party || '';
  $('#fAge').innerHTML = age != null ? `<b>${age}</b> ans au 1er tour` : '';
  $('#fPos').textContent = `${i + 1} sur ${ORDER.length}`;
  $('#fTicks').innerHTML = ORDER.map((x, k) => `<i class="${k === i ? 'on' : ''}${by[x].off ? ' off' : ''}"></i>`).join('');
  $('#fRole').textContent = f.aujourdhui || '';
  if (f.portrait && /^[a-z0-9_-]+\.webp$/.test(f.portrait.fichier)) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.onload = () => { if (cur === id) $('#fImg').replaceChildren(img); };
    img.src = 'fiches/img/' + f.portrait.fichier;
  }
}

function render(id, dir) {
  cur = id;
  head(id);
  const b = $('#fBody');
  b.innerHTML = body(id);
  b.scrollTop = 0;
  const card = $('#fCard');
  card.classList.remove('in-l', 'in-r');
  if (dir) { void card.offsetWidth; card.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
}

export async function openFiche(id, from) {
  if (!by[id]) return;
  opener = from || document.activeElement;
  try { await load(); } catch (e) { window.dispatchEvent(new CustomEvent('fiche-error')); return; }
  const f = el();
  render(id, 0);
  f.hidden = false; document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => f.classList.add('open'));
  snd.sweep([AX(id)]);
  setTimeout(() => $('#fClose').focus({ preventScroll: true }), 30);
}
function step(d) {
  if (!cur) return;
  const i = (ORDER.indexOf(cur) + d + ORDER.length) % ORDER.length, id = ORDER[i];
  render(id, d); snd.sweep([AX(id)]);
}
export function closeFiche() {
  const f = el(); if (f.hidden) return;
  f.classList.remove('open'); f.hidden = true; document.body.style.overflow = ''; cur = null;
  if (opener && opener.focus) opener.focus({ preventScroll: true });
}

export function initFiches() {
  document.addEventListener('load', e => {
    if (e.target.classList?.contains('candidate-thumb')) e.target.classList.add('loaded');
  }, true);
  if ($('#candidateDirectory')) {
    renderDirectory('loading');
    $('#candidateSearch').addEventListener('input', filterDirectory);
    $('#programmeRetry').addEventListener('click', loadDirectory);
    loadDirectory();
  }
  const f = el();
  f.addEventListener('click', e => {
    if (e.target === f || e.target.closest('#fClose')) return closeFiche();
    if (e.target.closest('#fPrev')) return step(-1);
    if (e.target.closest('#fNext')) return step(1);
  });
  /* glisser à gauche ou à droite */
  let x0 = null, y0 = 0;
  const card = $('#fCard');
  card.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (f.hidden) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-fiche]:not(button)')) { e.preventDefault(); openFiche(e.target.dataset.fiche, e.target); }
      return;
    }
    if (e.key === 'Escape') closeFiche();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') { /* garder le focus dans la feuille */
      const q = [...f.querySelectorAll('button,a[href]')].filter(n => n.offsetParent);
      if (!q.length) return; const a = q[0], z = q[q.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-fiche]');
    if (t && !t.closest('#fiche')) { e.preventDefault(); openFiche(t.dataset.fiche, t); }
  });
}
