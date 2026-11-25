import { LOCK1, LOCK2, LOCKGP } from './data.js?v=22';
import { monthKey } from './history.js';

export const GROUP_CODE = /^[a-f0-9]{32}$/;
export const GROUP_ADMIN = 'vince';
export const COMMON_GROUP = 'e1ec7100202700000000000000000001';
export const STAGES = [
  ['l1', 'Qui sera là le 31 décembre ?', LOCK1],
  ['l2', 'Qui aura les 500 signatures ?', LOCK2],
  ['weeks', 'La présidentielle', LOCKGP]
];

export function groupsStore(store) {
  const { F, db } = store;
  const pid = () => {
    if (!store.me()) throw new Error('Choisis ton pseudo pour rejoindre un groupe.');
    return store.me().pid;
  };
  const doc = (...p) => F.doc(db, ...p);
  const group = code => doc('groups', code);
  const members = code => F.collection(db, 'groups', code, 'members');
  const member = code => doc('groups', code, 'members', pid());
  const settings = () => doc('players', pid(), 'settings', 'groups');
  const entry = (code, stage) => doc('groups', code, stage, pid());
  const comments = (code, team) => F.collection(db, 'groups', code, 'teams', team, 'comments');

  async function join(code, name, common = false) {
    if (!GROUP_CODE.test(code)) throw new Error('Ce lien d’invitation est invalide.');
    const joined = await F.runTransaction(db, async tx => {
      const [g, s] = await Promise.all([tx.get(group(code)), tx.get(settings())]);
      const list = s.data()?.groups || {};
      if (Object.hasOwn(list, code)) {
        if (!common || !list[code]) return false;
        const membership = await tx.get(member(code));
        return !membership.data()?.shared;
      }
      if (Object.keys(list).length >= 5) throw new Error('Tu as déjà rejoint cinq groupes.');
      if (name && !(common && g.exists())) {
        if (g.exists()) throw new Error('Impossible de créer le groupe. Réessaie.');
        tx.set(group(code), { name, creator: pid() });
      } else if (!g.exists()) throw new Error('Ce groupe est introuvable.');
      tx.set(member(code), { pseudo: store.me().pseudo, shared: false, submitted: [] });
      tx.set(settings(), { groups: { ...list, [code]: common } });
      return true;
    });
    return joined;
  }

  let commonEnrollment;
  return {
    ensureCommonGroup() {
      commonEnrollment ||= join(COMMON_GROUP, 'Tous les joueurs', true)
        .then(async () => {
          const groups = await this.list();
          await Promise.all(groups.filter(group => !group.shared || group.code === COMMON_GROUP)
            .map(group => this.setSharing(group.code, true)));
        })
        .catch(error => { commonEnrollment = null; throw error; });
      return commonEnrollment;
    },
    resetEnrollment() { commonEnrollment = null; },
    async create(name) {
      if (pid() !== GROUP_ADMIN) throw new Error('Seul Vincent peut créer un groupe.');
      const title = name.trim();
      if (title.length < 2 || title.length > 48) throw new Error('Choisis un nom de 2 à 48 caractères.');
      const code = crypto.randomUUID().replaceAll('-', '');
      await join(code, title);
      await this.setSharing(code, true);
      return code;
    },
    async join(code) {
      await join(code);
      await this.setSharing(code, true);
      return code;
    },
    async list() {
      const snap = await F.getDoc(settings());
      return Promise.all(Object.entries(snap.data()?.groups || {}).map(async ([code, shared]) => {
        const g = await F.getDoc(group(code));
        return { code, name: g.data()?.name || 'Groupe', shared };
      }));
    },
    async setSharing(code, shared) {
      await F.runTransaction(db, async tx => {
        const [s, p] = await Promise.all([tx.get(settings()), tx.get(doc('pronos', pid()))]);
        const list = s.data()?.groups || {};
        if (!Object.hasOwn(list, code)) throw new Error('Rejoins d’abord ce groupe.');
        const values = p.data() || {};
        if (shared) {
          for (const [stage] of STAGES) {
            if (hasStage(values, stage)) tx.set(entry(code, stage), sharedStage(values, stage));
          }
        } else {
          for (const [stage] of STAGES) tx.delete(entry(code, stage));
        }
        tx.update(member(code), { shared, submitted: shared ? submitted(values) : [] });
        tx.set(settings(), { groups: { ...list, [code]: shared } });
      });
    },
    async teamVisibility() {
      const groups = await this.list();
      return Promise.all(groups.map(async g => ({
        ...g, visible: (await F.getDoc(entry(g.code, 'teams'))).exists()
      })));
    },
    async publishTeam(code, team) {
      await F.setDoc(entry(code, 'teams'), { value: team });
    },
    async unpublishTeam(code) {
      await F.deleteDoc(entry(code, 'teams'));
    },
    async syncSharedTeam(team, onlyMissing) {
      const player = pid();
      const prefs = settings();
      await F.runTransaction(db, async tx => {
        const groups = Object.keys((await tx.get(prefs)).data()?.groups || {});
        const refs = groups.map(code => doc('groups', code, 'teams', player));
        const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
        const value = team || (onlyMissing ? snapshots.find(snapshot => snapshot.exists())?.data()?.value : null);
        groups.forEach((code, index) => {
          const exists = snapshots[index].exists();
          if (onlyMissing && (exists || code === COMMON_GROUP)) return;
          if (code === COMMON_GROUP && !exists) return;
          if (value) tx.set(refs[index], { value });
          else if (exists) tx.delete(refs[index]);
        });
      });
    },
    watchTeamComments(code, team, update, fail) {
      const recent = F.query(comments(code, team), F.orderBy('createdAt', 'desc'), F.limit(50));
      return F.onSnapshot(recent, { includeMetadataChanges: true }, snapshot => {
        if (!snapshot.metadata.fromCache) {
          update(snapshot.docs.map(item => ({ ...item.data(), id: item.id })).reverse());
        }
      }, fail);
    },
    async addTeamComment(code, team, text) {
      await F.addDoc(comments(code, team), {
        author: pid(), pseudo: store.me().pseudo, text, createdAt: F.serverTimestamp()
      });
    },
    async deleteTeamComment(code, team, id) {
      await F.deleteDoc(F.doc(comments(code, team), id));
    },
    async load(code, time = Date.now()) {
      // Old rules may remain in place during the rollout.
      const readStage = ([stage, , lock]) => F.getDocs(F.collection(db, 'groups', code, stage)).catch(err => {
        if (err.code === 'permission-denied' && time < +lock) return null;
        throw err;
      });
      const [m, teams, ...entries] = await Promise.all([
        F.getDocs(members(code)),
        F.getDocs(F.collection(db, 'groups', code, 'teams')),
        ...STAGES.map(readStage)
      ]);
      const players = Object.fromEntries(m.docs.map(d => [d.id, d.data()]));
      const pronos = {};
      entries.forEach((snapshot, i) => {
        if (!snapshot) return;
        const stage = STAGES[i][0];
        for (const d of snapshot.docs) {
          if (!Object.hasOwn(players, d.id)) continue;
          pronos[d.id] ||= {};
          const entry = d.data();
          pronos[d.id][stage] = entry.value;
          if (entry.history) (pronos[d.id].history ||= {})[stage] = entry.history;
          if (entry.at) pronos[d.id][stage + 'at'] = entry.at;
        }
      });
      return { players, pronos, teams: Object.fromEntries(teams.docs.map(d => [d.id, d.data().value])) };
    },
    async writeProno(ref, patch, gp, week, month = monthKey(Date.now())) {
      await F.runTransaction(db, async tx => {
        const [s, p] = await Promise.all([tx.get(settings()), tx.get(ref)]);
        const data = p.data() || {};
        const change = { ...patch, updatedAt: F.serverTimestamp() };
        const stage = gp ? 'weeks' : Object.hasOwn(patch, 'l1') ? 'l1' : 'l2';
        const value = gp ? { ...data.weeks, [week]: gp } : patch[stage];
        if (gp) change.weeks = value;
        change.history = { ...data.history, [stage]: { ...data.history?.[stage], [month]: gp || value } };
        tx.update(ref, change);
        const next = { ...data, ...change, [stage]: value };
        for (const [code, shared] of Object.entries(s.data()?.groups || {})) {
          if (!shared) continue;
          tx.set(entry(code, stage), sharedStage(next, stage));
          tx.update(member(code), { submitted: submitted(next) });
        }
      });
    }
  };
}

const hasStage = (data, stage) => stage === 'weeks'
  ? Object.keys(data.weeks || {}).length > 0
  : Array.isArray(data[stage]);
const submitted = data => STAGES.map(([stage]) => stage).filter(stage => hasStage(data, stage));

function sharedStage(prono, stage) {
  const result = { value: prono[stage] };
  if (prono.history?.[stage]) result.history = prono.history[stage];
  if (prono[stage + 'at']) result.at = prono[stage + 'at'];
  return result;
}
