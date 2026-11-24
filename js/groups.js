import { LOCK1, LOCK2, LOCKGP } from './data.js';

export const GROUP_CODE = /^[a-f0-9]{32}$/;
export const STAGES = [
  ['l1', 'Qui sera là le 31 janvier ?', LOCK1],
  ['l2', 'Qui sera admis sur la ligne de départ ?', LOCK2],
  ['weeks', 'Grand Prono', LOCKGP]
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

  async function join(code, name) {
    if (!GROUP_CODE.test(code)) throw new Error('Ce lien d’invitation est invalide.');
    await F.runTransaction(db, async tx => {
      const [g, s] = await Promise.all([tx.get(group(code)), tx.get(settings())]);
      const list = s.data()?.groups || {};
      if (Object.hasOwn(list, code)) return;
      if (Object.keys(list).length >= 5) throw new Error('Tu as déjà rejoint cinq groupes.');
      if (name) {
        if (g.exists()) throw new Error('Impossible de créer le groupe. Réessaie.');
        tx.set(group(code), { name, creator: pid() });
      } else if (!g.exists()) throw new Error('Ce groupe est introuvable.');
      tx.set(member(code), { pseudo: store.me().pseudo, shared: false, submitted: [] });
      tx.set(settings(), { groups: { ...list, [code]: false } });
    });
    return code;
  }

  return {
    async create(name) {
      const title = name.trim();
      if (title.length < 2 || title.length > 48) throw new Error('Choisis un nom de 2 à 48 caractères.');
      return join(crypto.randomUUID().replaceAll('-', ''), title);
    },
    join,
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
            if (hasStage(values, stage)) tx.set(entry(code, stage), { value: values[stage] });
          }
        } else {
          for (const [stage] of STAGES) tx.delete(entry(code, stage));
        }
        tx.update(member(code), { shared, submitted: shared ? submitted(values) : [] });
        tx.set(settings(), { groups: { ...list, [code]: shared } });
      });
    },
    async publishTeam(code, team) {
      await F.setDoc(entry(code, 'teams'), { value: team });
    },
    async unpublishTeam(code) {
      await F.deleteDoc(entry(code, 'teams'));
    },
    async load(code, time) {
      const visible = STAGES.filter(([, , lock]) => time >= +lock);
      const [m, teams, ...entries] = await Promise.all([
        F.getDocs(members(code)),
        F.getDocs(F.collection(db, 'groups', code, 'teams')),
        ...visible.map(([stage]) => F.getDocs(F.collection(db, 'groups', code, stage)))
      ]);
      const players = Object.fromEntries(m.docs.map(d => [d.id, d.data()]));
      const pronos = {};
      entries.forEach((snapshot, i) => {
        for (const d of snapshot.docs) {
          if (!Object.hasOwn(players, d.id)) continue;
          pronos[d.id] ||= {};
          pronos[d.id][visible[i][0]] = d.data().value;
        }
      });
      return { players, pronos, teams: Object.fromEntries(teams.docs.map(d => [d.id, d.data().value])) };
    },
    async writeProno(ref, patch, gp, week) {
      await F.runTransaction(db, async tx => {
        const [s, p] = await Promise.all([tx.get(settings()), tx.get(ref)]);
        const data = p.data() || {};
        const change = { ...patch, updatedAt: F.serverTimestamp() };
        const stage = gp ? 'weeks' : Object.hasOwn(patch, 'l1') ? 'l1' : 'l2';
        const value = gp ? { ...data.weeks, [week]: gp } : patch[stage];
        if (gp) change.weeks = value;
        tx.update(ref, change);
        const next = { ...data, [stage]: value };
        for (const [code, shared] of Object.entries(s.data()?.groups || {})) {
          if (!shared) continue;
          tx.set(entry(code, stage), { value });
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
