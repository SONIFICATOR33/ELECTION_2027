import { by, RESULTS, U1, U2 } from './data.js';
import { classement, current, hasResults, TITRES, titre } from './scoring.js';
import { GROUP_CODE, STAGES } from './groups.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const name = id => by[id] ? by[id].p + ' ' + by[id].n : id;
const fmt = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const choices = ids => Array.isArray(ids) ? ids.map(id => escape(name(id))).join(', ') : '';
const clock = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
});

export function groupView(root, { getStore, withUser, getTeam, notify }) {
  let selected = null, generation = 0, currentTab = 'pronos';
  const params = new URL(location.href).searchParams;
  const requested = params.get('groupe') || '';
  let invitation = GROUP_CODE.test(requested) ? requested : '';
  const removeInvite = () => {
    invitation = '';
    const url = new URL(location.href);
    url.searchParams.delete('groupe');
    history.replaceState(null, '', url);
  };

  function renderPronos(data) {
    const players = Object.entries(data.players);
    return STAGES.map(([key, label, lock]) => {
      const submitted = players.filter(([, p]) => p.submitted?.includes(key));
      const open = Date.now() < +lock;
      const revealed = submitted.map(([id, p]) => {
        const value = data.pronos[id]?.[key];
        if (!value) return '';
        const g = key === 'weeks' ? current({ weeks: value }) : null;
        const prediction = key === 'weeks'
          ? (g ? escape(name(g.pres)) + ' gagne avec ' + fmt(g.win) + ' %<br>' +
            g.top.map((t, i) => (i + 1) + '. ' + escape(name(t.id)) + ' ' + fmt(t.pct) + ' %').join(' · ') : '')
          : choices(value);
        return '<li><b>' + escape(p.pseudo) + '</b><br>' + prediction + '</li>';
      }).join('');
      return '<section class="group-stage"><h3>' + label + '</h3><p>' + submitted.length + ' sur ' +
        players.length + ' ont joué et partagé' + (open ? ' · Révélation le ' + clock.format(lock) + ' (Paris)' : '') +
        '</p>' + (open ? '' : '<ul>' + revealed + '</ul>') + '</section>';
    }).join('');
  }

  function renderTeams(data) {
    const rows = Object.entries(data.teams).map(([id, team]) => {
      const lines = [['Président de cœur', team.coeur], ['Premier ministre', team.pm],
        ...Object.entries(team.min || {}), [team.jl, team.jn]];
      return '<details><summary>' + escape(data.players[id]?.pseudo) + '</summary><ul>' +
        lines.filter(([role, person]) => role && person).map(([role, person]) =>
          '<li><b>' + escape(role) + '</b> · ' + escape(person) + '</li>').join('') + '</ul></details>';
    }).join('');
    return '<p>Publie une copie de ta Dream Team dans ce groupe.</p>' +
      '<div class="group-actions"><button class="ghost" data-group-action="team">Publier ma Dream Team</button>' +
      '<button class="ghost" data-group-action="unteam">Retirer ma Dream Team</button></div>' +
      (rows || '<p>Aucune Dream Team publiée.</p>');
  }

  function renderRank(data) {
    if (!hasResults(RESULTS)) return '<p>Les premiers points seront calculés après les résultats de l’étape 1.</p>';
    const players = Object.fromEntries(Object.entries(data.players).filter(([id]) => data.pronos[id]));
    const rows = classement(players, data.pronos, RESULTS, U1, U2);
    if (!rows.length) return '<p>Aucun prono révélé à classer.</p>';
    return '<div class="scroll"><table class="rank"><thead><tr><th>Rang</th><th>Joueur</th><th>Étape 1</th>' +
      '<th>Étape 2</th><th>1er tour</th><th>Finale</th><th>Total</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + r.rank + '</td><td>' + escape(r.pseudo) + '<small>' +
        TITRES[titre({ rank: r.rank, n: rows.length, results: true })] + '</small></td>' +
        [r.e1, r.e2, r.t1, r.fin, r.total].map(x => '<td>' + fmt(x) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  async function render() {
    const request = ++generation;
    const store = getStore();
    if (!store?.groups) {
      root.innerHTML = '<p>Les groupes sont indisponibles hors connexion ou en mode essai.</p>';
      return;
    }
    if (!store.me()) {
      root.innerHTML = '<p>' + (invitation ? 'Tu as reçu une invitation.' : 'Crée un groupe ou rejoins celui d’un ami.') +
        '</p><button class="big" data-group-action="identify">Choisir mon pseudo</button>';
      return;
    }
    root.setAttribute('aria-busy', 'true');
    try {
      const groups = await store.groups.list();
      if (request !== generation) return;
      if (invitation && groups.some(g => g.code === invitation)) {
        selected = invitation;
        removeInvite();
      }
      if (!groups.some(g => g.code === selected)) selected = groups[0]?.code || null;
      const group = groups.find(g => g.code === selected);
      const data = group ? await store.groups.load(group.code, Date.now()) : null;
      if (request !== generation) return;
      root.innerHTML = (invitation ? '<p>Invitation reçue</p><button class="big" data-group-action="join">Rejoindre le groupe</button>' : '') +
        (groups.length ? '<label>Groupe <select id="active-group">' + groups.map(g =>
          '<option value="' + g.code + '"' + (g.code === selected ? ' selected' : '') + '>' + escape(g.name) + '</option>').join('') +
          '</select></label>' : '<p>Crée ton premier groupe et partage le lien avec tes amis.</p>') +
        '<form id="create-group" class="group-actions"><label>Nom du nouveau groupe <input name="name" required minlength="2" maxlength="48"></label>' +
        '<button class="ghost">Créer le groupe</button></form>' +
        (!group ? '' : '<div class="group-actions"><button class="ghost" data-group-action="invite">Inviter un ami</button>' +
          '<button class="ghost" data-group-action="share" aria-pressed="' + group.shared + '">' +
          (group.shared ? 'Arrêter de partager mes pronos' : 'Partager mes pronos dans ce groupe') + '</button></div>' +
          '<p>Les choix partagés seront visibles par les membres après chaque clôture.</p>' +
          '<div class="group-actions" aria-label="Contenu du groupe">' +
          [['pronos', 'Pronos'], ['teams', 'Dream Teams'], ['rank', 'Classement']].map(([tab, label]) =>
            '<button class="ghost" data-tab="' + tab + '" aria-pressed="' + (tab === currentTab) + '">' + label + '</button>').join('') +
          '</div><div class="group-content">' + (currentTab === 'teams' ? renderTeams(data) :
            currentTab === 'rank' ? renderRank(data) : renderPronos(data)) + '</div>');
    } catch (err) {
      if (request === generation) root.innerHTML = '<p>Impossible de charger les groupes.</p><button class="ghost" data-group-action="retry">Réessayer</button>';
    } finally {
      if (request === generation) root.removeAttribute('aria-busy');
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
    if (b.dataset.tab) { currentTab = b.dataset.tab; render(); return; }
    const action = b.dataset.groupAction;
    if (action === 'identify') { withUser(render); return; }
    if (action === 'retry') { render(); return; }
    if (!action) return;
    const code = selected;
    const groups = getStore().groups;
    run(b, async () => {
      if (action === 'join') { selected = await groups.join(invitation); removeInvite(); }
      if (action === 'share') await groups.setSharing(code, b.getAttribute('aria-pressed') !== 'true');
      if (action === 'team') {
        const team = getTeam();
        if (!team.coeur && !team.pm) throw new Error('Choisis d’abord ton président de cœur ou ton Premier ministre.');
        await groups.publishTeam(code, team);
      }
      if (action === 'unteam') await groups.unpublishTeam(code);
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
