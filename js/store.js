/* =====================================================================
   STOCKAGE — même interface en mode essai (localStorage) et en mode partagé (Firebase)
   ===================================================================== */
import { FIREBASE } from './config.js';
import { weekOf, clampWeek } from './scoring.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

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
  read() { try { return JSON.parse(localStorage.getItem(this.K)) || { me: null, players: {}, secrets: {}, pronos: {} }; } catch (e) { return { me: null, players: {}, secrets: {}, pronos: {} }; } }
  write() { try { localStorage.setItem(this.K, JSON.stringify(this.db)); } catch (e) { } }
  async init() { return this.me(); }
  me() { const pid = this.db.me; return pid && this.db.players[pid] ? { pid, pseudo: this.db.players[pid].pseudo } : null; }
  async join(pseudo, pin) {
    const pid = normPid(pseudo);
    if (pid.length < 2) throw new StoreError('pseudo', 'Pseudo trop court (2 caractères minimum).');
    if (!/^\d{4}$/.test(pin)) throw new StoreError('pin', 'Le code doit faire 4 chiffres.');
    const h = await sha256(pid + ':' + pin);
    if (this.db.players[pid]) {
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
  async save(patch, gp) {
    const pid = this.db.me; if (!pid) throw new StoreError('auth', 'Choisis d’abord ton pseudo.');
    const p = this.db.pronos[pid] || (this.db.pronos[pid] = { weeks: {} });
    Object.assign(p, patch);
    if (gp) p.weeks[clampWeek(weekOf(Date.now()))] = gp;
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
    const dev = await fs.getDoc(fs.doc(this.db, 'devices', this.user.uid));
    if (dev.exists()) {
      const pid = dev.data().pid, pl = await fs.getDoc(fs.doc(this.db, 'players', pid));
      if (pl.exists()) this._me = { pid, pseudo: pl.data().pseudo };
    }
    return this._me;
  }
  me() { return this._me; }
  async join(pseudo, pin) {
    const { F } = this, pid = normPid(pseudo);
    if (pid.length < 2) throw new StoreError('pseudo', 'Pseudo trop court (2 caractères minimum).');
    if (!/^\d{4}$/.test(pin)) throw new StoreError('pin', 'Le code doit faire 4 chiffres.');
    const h = await sha256(pid + ':' + pin), uid = this.user.uid;
    const pl = await F.getDoc(F.doc(this.db, 'players', pid));
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
      if (pl.exists()) throw new StoreError('badpin', 'Ce pseudo existe déjà et le code ne correspond pas.');
      throw new StoreError('net', 'Impossible de créer ton pseudo pour le moment. Réessaie.');
    }
    this.cache = null; return this._me;
  }
  async logout() {
    const { F } = this;
    try { await F.deleteDoc(F.doc(this.db, 'devices', this.user.uid)); } catch (e) { }
    this._me = null; this.cache = null;
  }
  async loadAll(force) {
    if (!force && this.cache && Date.now() - this.cacheAt < 60e3) return this.cache;
    const { F } = this;
    const [a, b] = await Promise.all([F.getDocs(F.collection(this.db, 'players')), F.getDocs(F.collection(this.db, 'pronos'))]);
    const players = {}, pronos = {};
    a.forEach(d => players[d.id] = { pseudo: d.data().pseudo });
    b.forEach(d => { const x = d.data(); delete x.updatedAt; pronos[d.id] = x; });
    this.cache = { players, pronos }; this.cacheAt = Date.now();
    return this.cache;
  }
  async save(patch, gp) {
    const { F } = this; if (!this._me) throw new StoreError('auth', 'Choisis d’abord ton pseudo.');
    const ref = F.doc(this.db, 'pronos', this._me.pid);
    const base = Object.assign({}, patch, { updatedAt: F.serverTimestamp() });
    const w0 = clampWeek(weekOf(Date.now()));
    /* l'horloge du téléphone peut différer de celle du serveur autour de lundi minuit */
    for (const w of gp ? [w0, w0 + 1, w0 - 1] : [null]) {
      const data = Object.assign({}, base); if (gp) data['weeks.' + w] = gp;
      try { await F.updateDoc(ref, data); this.cache = null; return; }
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
