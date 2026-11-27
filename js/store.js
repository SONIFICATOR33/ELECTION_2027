/* =====================================================================
   STOCKAGE — même interface en mode essai (localStorage) et en mode partagé (Firebase)
   ===================================================================== */
import { FIREBASE } from './config.js';
import { COMMON_GROUP, GROUP_ADMIN, groupsStore } from './groups.js?v=109';
import { monthKey } from './history.js';
import { weekOf, clampWeek } from './scoring.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

function checkJoin(exists, action) {
  if (exists && action === 'register') throw new StoreError('exists', 'Ce pseudo est déjà pris. Reconnecte-toi si c’est ton compte.');
  if (!exists && action === 'login') throw new StoreError('unknown', 'Pseudo introuvable. Vérifie-le ou inscris-toi.');
}

function cleanRealName(name) {
  const value = name.trim();
  if (value.length > 80) throw new StoreError('name', '80 caractères maximum.');
  return value;
}

export const normPid = s => String(s || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);

async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export class StoreError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

/* ---------------- Mode essai ---------------- */
class LocalStore {
  constructor() { this.mode = 'local'; this.K = 'pdm-v2'; this.db = this.read(); }
  read() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(this.K)); } catch {}
    return {
      me: saved?.me || null,
      players: Object.assign(Object.create(null), saved?.players),
      secrets: Object.assign(Object.create(null), saved?.secrets),
      pronos: Object.assign(Object.create(null), saved?.pronos),
      privateProfiles: Object.assign(Object.create(null), saved?.privateProfiles)
    };
  }
  write() { try { localStorage.setItem(this.K, JSON.stringify(this.db)); } catch (e) { } }
  async init() { return this.me(); }
  me() { const pid = this.db.me; return pid && this.db.players[pid] ? { pid, pseudo: this.db.players[pid].pseudo } : null; }
  async join(pseudo, pin, action) {
    const pid = normPid(pseudo);
    if (pid.length < 2) throw new StoreError('pseudo', 'Pseudo trop court (2 caractères minimum).');
    if (!/^\d{4}$/.test(pin)) throw new StoreError('pin', 'Le code doit faire 4 chiffres.');
    const h = await sha256(pid + ':' + pin);
    this.db = this.read();
    const exists = Object.hasOwn(this.db.players, pid);
    checkJoin(exists, action);
    if (exists) {
      if (this.db.secrets[pid] !== h) throw new StoreError('badpin', 'Ce pseudo existe déjà et le code ne correspond pas.');
    } else {
      this.db.players[pid] = { pseudo: pseudo.trim().slice(0, 24), createdAt: Date.now() };
      this.db.secrets[pid] = h;
      this.db.pronos[pid] = { weeks: {} };
    }
    this.db.me = pid; this.write(); return this.me();
  }
  async logout() { this.db.me = null; this.write(); }
  async loadAll() { return { players: structuredClone(this.db.players), pronos: structuredClone(this.db.pronos) }; }
  async getRealName() {
    if (!this.me()) throw new StoreError('auth', 'Reconnecte-toi.');
    return this.db.privateProfiles?.[this.me().pid] || '';
  }
  async setRealName(name) {
    if (!this.me()) throw new StoreError('auth', 'Reconnecte-toi.');
    const profiles = this.db.privateProfiles;
    const value = cleanRealName(name);
    if (value) profiles[this.me().pid] = value;
    else delete profiles[this.me().pid];
    this.write();
  }
  async listRealNames() {
    if (this.me()?.pid !== GROUP_ADMIN) throw new StoreError('auth', 'Accès réservé à Vince.');
    return Object.entries(this.db.privateProfiles || {}).map(([pid, name]) => [this.db.players[pid]?.pseudo || pid, name]);
  }
  async save(patch, gp) {
    const pid = this.db.me; if (!pid) throw new StoreError('auth', 'Choisis d’abord ton pseudo.');
    const p = this.db.pronos[pid] || (this.db.pronos[pid] = { weeks: {} });
    Object.assign(p, patch);
    if (gp) p.weeks[clampWeek(weekOf(Date.now()))] = gp;
    const stage = gp ? 'weeks' : Object.hasOwn(patch, 'l1') ? 'l1' : 'l2';
    const history = p.history ||= {};
    (history[stage] ||= {})[monthKey(Date.now())] = gp || patch[stage];
    p.updatedAt = Date.now(); this.write();
  }
}

/* ---------------- Mode partagé (Firebase) ---------------- */
class FirebaseStore {
  constructor(cfg) { this.mode = 'firebase'; this.cfg = cfg; this._me = null; this.cache = null; this.cacheAt = 0; }
  async init() {
    const [app, auth, fs] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
    this.F = fs; this.A = auth;
    this.app = app.initializeApp(this.cfg);
    this.auth = auth.getAuth(this.app);
    this.db = fs.getFirestore(this.app);
    const user = await new Promise(res => { const u = auth.onAuthStateChanged(this.auth, x => { u(); res(x); }); });
    this.user = user || (await auth.signInAnonymously(this.auth)).user;
    this.groups = groupsStore(this);
    const dev = await fs.getDoc(fs.doc(this.db, 'devices', this.user.uid));
    if (dev.exists()) {
      const pid = dev.data().pid, pl = await fs.getDoc(fs.doc(this.db, 'players', pid));
      if (pl.exists()) this._me = { pid, pseudo: pl.data().pseudo };
    }
    return this._me;
  }
  me() { return this._me; }
  async join(pseudo, pin, action) {
    const { F } = this, pid = normPid(pseudo);
    if (pid.length < 2) throw new StoreError('pseudo', 'Pseudo trop court (2 caractères minimum).');
    if (!/^\d{4}$/.test(pin)) throw new StoreError('pin', 'Le code doit faire 4 chiffres.');
    const h = await sha256(pid + ':' + pin), uid = this.user.uid;
    const pl = await F.getDocFromServer(F.doc(this.db, 'players', pid));
    checkJoin(pl.exists(), action);
    try {
      if (pl.exists()) {
        await F.setDoc(F.doc(this.db, 'devices', uid), { pid, pin: h });
        this._me = { pid, pseudo: pl.data().pseudo };
      } else {
        const b = F.writeBatch(this.db), ps = pseudo.trim().slice(0, 24);
        b.set(F.doc(this.db, 'players', pid), { pseudo: ps, createdAt: F.serverTimestamp() });
        b.set(F.doc(this.db, 'secrets', pid), { pin: h });
        b.set(F.doc(this.db, 'devices', uid), { pid, pin: h });
        b.set(F.doc(this.db, 'pronos', pid), { weeks: {}, updatedAt: F.serverTimestamp() });
        await b.commit();
        this._me = { pid, pseudo: ps };
      }
    } catch (e) {
      if (pl.exists() && e.code === 'permission-denied') throw new StoreError('badpin', 'Ce code ne correspond pas à ce pseudo.');
      if (!pl.exists() && e.code === 'permission-denied') {
        const latest = await F.getDocFromServer(F.doc(this.db, 'players', pid));
        checkJoin(latest.exists(), action);
      }
      throw new StoreError('net', 'Connexion impossible pour le moment. Réessaie.');
    }
    this.groups.resetEnrollment();
    this.cache = null; return this._me;
  }
  async logout() {
    const { F } = this;
    await F.deleteDoc(F.doc(this.db, 'devices', this.user.uid));
    this.groups.resetEnrollment();
    this._me = null; this.cache = null;
  }
  async registeredPlayers() {
    const { F } = this;
    const players = F.collection(this.db, 'players');
    const names = [];
    let cursor;
    do {
      const conditions = [F.orderBy(F.documentId()), F.limit(500)];
      if (cursor) conditions.push(F.startAfter(cursor));
      const page = await F.getDocs(F.query(players, ...conditions));
      names.push(...page.docs.map(doc => [doc.id, { pseudo: doc.data().pseudo }]));
      cursor = page.size === 500 ? page.docs.at(-1) : null;
    } while (cursor);
    return Object.fromEntries(names);
  }
  async getRealName() {
    const { F, db } = this;
    if (!this._me) throw new StoreError('auth', 'Reconnecte-toi.');
    const profile = await F.getDoc(F.doc(db, 'privateProfiles', this._me.pid));
    return profile.data()?.realName || '';
  }
  async setRealName(name) {
    const { F, db } = this;
    if (!this._me) throw new StoreError('auth', 'Reconnecte-toi.');
    const ref = F.doc(db, 'privateProfiles', this._me.pid);
    const realName = cleanRealName(name);
    if (realName) await F.setDoc(ref, { realName });
    else await F.deleteDoc(ref);
  }
  async listRealNames() {
    const { F, db } = this;
    if (this._me?.pid !== GROUP_ADMIN) throw new StoreError('auth', 'Accès réservé à Vince.');
    const [profiles, players] = await Promise.all([
      F.getDocsFromServer(F.collection(db, 'privateProfiles')), this.registeredPlayers()
    ]);
    return profiles.docs.map(doc => [players[doc.id]?.pseudo || doc.id, doc.data().realName]);
  }
  async loadAll(force) {
    if (!force && this.cache && Date.now() - this.cacheAt < 60e3) return this.cache;
    const { F } = this;
    const players = Object.create(null), pronos = Object.create(null);
    if (this._me) {
      const { pid, pseudo } = this._me;
      const own = await F.getDoc(F.doc(this.db, 'pronos', pid));
      players[pid] = { pseudo };
      if (own.exists()) {
        pronos[pid] = own.data();
        if (!Object.hasOwn(pronos[pid], 'team')) {
          const legacy = await F.getDoc(F.doc(this.db, 'groups', COMMON_GROUP, 'teams', pid)).catch(() => null);
          if (legacy?.exists()) pronos[pid].team = legacy.data().value;
        }
      }
    }
    this.cache = { players, pronos }; this.cacheAt = Date.now();
    return this.cache;
  }
  async save(patch, gp) {
    const { F } = this; if (!this._me) throw new StoreError('auth', 'Choisis d’abord ton pseudo.');
    const ref = F.doc(this.db, 'pronos', this._me.pid);
    const w0 = clampWeek(weekOf(Date.now()));
    /* l'horloge du téléphone peut différer de celle du serveur autour de lundi minuit */
    for (const w of gp ? [w0, w0 + 1, w0 - 1] : [null]) {
      try { await this.groups.writeProno(ref, patch, gp, w); this.cache = null; return; }
      catch (e) { if (!gp || e.code !== 'permission-denied') throw new StoreError('net', 'Enregistrement impossible : ' + (e.code === 'permission-denied' ? 'ce pari est clos.' : 'vérifie ta connexion.')); }
    }
    throw new StoreError('net', 'Enregistrement refusé : ce pari est peut-être clos.');
  }
}

export async function openStore() {
  if (FIREBASE) {
    try { const s = new FirebaseStore(FIREBASE); await s.init(); return s; }
    catch (e) { console.error(e); const s = new LocalStore(); s.fallback = true; await s.init(); return s; }
  }
  const s = new LocalStore(); await s.init(); return s;
}
