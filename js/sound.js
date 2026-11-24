/* =====================================================================
   IDENTITÉ SONORE — tout est synthétisé en Web Audio (aucun fichier).
   - Sélection d'un candidat : note pentatonique dont la hauteur ET la position
     stéréo suivent sa place sur l'axe gauche-droite (gauche à gauche, droite à droite).
   - Top 5 : la note descend avec le rang (1er = plus aigu).
   - % et score : tic dont la hauteur suit la valeur.
   - Validation : « A voté » = bulletin qui glisse, tombe dans l'urne, carillon.
   - Logo : trois cloches bleu-blanc-rouge, panoramiquées gauche, centre, droite.
   ===================================================================== */

let ctx = null, bus = null, on = true;
try { on = localStorage.getItem('pdm-son') !== '0'; } catch (e) { }

/* Construit la chaîne de sortie dans un contexte donné (temps réel ou hors ligne) */
function buildBus(c) {
  const out = c.createGain(); out.gain.value = 0.75;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
  out.connect(comp); comp.connect(c.destination);
  /* petite salle : réponse impulsionnelle synthétique, stéréo décorrélée, assombrie */
  const len = Math.floor(c.sampleRate * 0.9), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) { const n = Math.random() * 2 - 1; lp += 0.35 * (n - lp); d[i] = lp * Math.pow(1 - i / len, 3.2); }
  }
  const verb = c.createConvolver(); verb.buffer = ir;
  const wet = c.createGain(); wet.gain.value = 0.22;
  verb.connect(wet); wet.connect(out);
  return { c, out, verb };
}
function live() {
  if (!on) return null;
  try {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); bus = buildBus(ctx); }
    if (ctx.state === 'suspended') ctx.resume();
    return bus;
  } catch (e) { return null; }
}

/* ---------- briques ---------- */
function pan(B, p) {
  if (B.c.createStereoPanner) { const s = B.c.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p || 0)); return s; }
  return B.c.createGain();
}
function route(B, node, p, send) {
  const s = pan(B, p); node.connect(s); s.connect(B.out);
  if (send) { const g = B.c.createGain(); g.gain.value = send; s.connect(g); g.connect(B.verb); }
}
function tone(B, { f, t = 0, dur = 0.2, gain = 0.2, type = 'sine', p = 0, att = 0.004, glide = 1, send = 0.3, partials = null }) {
  const c = B.c, t0 = c.currentTime + t, env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + att);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  route(B, env, p, send);
  const parts = partials || [[1, 1, 1]];
  for (const [ratio, amp, decay] of parts) {
    const o = c.createOscillator(); o.type = parts.length > 1 ? 'sine' : type;
    o.frequency.setValueAtTime(f * ratio, t0);
    if (glide !== 1) o.frequency.exponentialRampToValueAtTime(f * ratio * glide, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(amp, t0);
    if (decay < 1) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.001), t0 + dur * decay);
    o.connect(g); g.connect(env); o.start(t0); o.stop(t0 + dur + 0.05);
  }
}
let noiseBuf = null;
function noise(B, { t = 0, dur = 0.1, gain = 0.1, f = 2000, f2 = null, q = 1, type = 'bandpass', p = 0, send = 0.2, att = 0.004 }) {
  const c = B.c, t0 = c.currentTime + t;
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const env = c.createGain(); env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + att); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(fl); fl.connect(env); route(B, env, p, send);
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
}
const BELL = [[1, 1, 1], [2.01, 0.45, 0.55], [2.76, 0.28, 0.35], [5.4, 0.12, 0.18]];
const PLUCK = [[1, 1, 1], [2, 0.35, 0.4], [3, 0.12, 0.22]];

/* pentatonique de ré, du ré 4 au ré 6 */
const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66];
const noteAt = axis => PENTA[Math.round((Math.max(-1, Math.min(1, axis)) + 1) / 2 * (PENTA.length - 1))];

/* ---------- la palette ---------- */
const P = {
  /* candidat sélectionné : hauteur et stéréo = place sur l'axe ; axis null = hors axe (centre, plus feutré) */
  pick(B, axis, big) {
    const a = axis == null ? 0 : axis, f = axis == null ? 523.25 : noteAt(a), p = a * 0.85;
    noise(B, { dur: 0.012, gain: 0.1, f: 3200, q: 0.7, p, send: 0 });
    tone(B, { f, dur: 0.32, gain: 0.45, p, partials: axis == null ? [[1, 1, 1], [2, 0.2, 0.3]] : PLUCK, send: 0.28 });
    if (big) tone(B, { f: f * 2, t: 0.07, dur: 0.5, gain: 0.16, p, partials: BELL, send: 0.45 });
  },
  unpick(B, axis) {
    const a = axis == null ? 0 : axis, f = (axis == null ? 523.25 : noteAt(a)) * 0.75;
    tone(B, { f, dur: 0.16, gain: 0.26, p: a * 0.85, type: 'triangle', glide: 0.94, send: 0.1 });
  },
  rank(B, i, axis) { const f = [880, 739.99, 659.25, 587.33, 493.88][i] || 440; tone(B, { f, dur: 0.3, gain: 0.4, p: (axis || 0) * 0.85, partials: PLUCK, send: 0.3 }); },
  tick(B, v) { tone(B, { f: 420 * Math.pow(2, (v || 0) / 40), dur: 0.05, gain: 0.2, att: 0.002, send: 0 }); },
  /* « A voté » : le bulletin glisse, tombe dans l'urne, carillon */
  vote(B) {
    noise(B, { dur: 0.17, gain: 0.16, f: 5200, f2: 1700, q: 0.9, p: -0.2, send: 0.1, att: 0.03 });
    noise(B, { t: 0.17, dur: 0.07, gain: 0.22, f: 900, type: 'lowpass', q: 0.5, send: 0.15 });
    tone(B, { f: 150, t: 0.17, dur: 0.22, gain: 0.42, glide: 0.42, send: 0.05 });
    noise(B, { t: 0.17, dur: 0.12, gain: 0.08, f: 330, q: 7, send: 0.2 });
    tone(B, { f: 880, t: 0.36, dur: 0.7, gain: 0.12, p: -0.3, partials: BELL, send: 0.5 });
    tone(B, { f: 1174.66, t: 0.5, dur: 0.95, gain: 0.13, p: 0.3, partials: BELL, send: 0.55 });
  },
  /* logo : trois cloches bleu (gauche), blanc (centre), rouge (droite) */
  logo(B) {
    tone(B, { f: 587.33, t: 0, dur: 0.7, gain: 0.14, p: -0.8, partials: BELL, send: 0.5 });
    tone(B, { f: 880, t: 0.12, dur: 0.8, gain: 0.14, p: 0, partials: BELL, send: 0.5 });
    tone(B, { f: 1174.66, t: 0.24, dur: 1.3, gain: 0.15, p: 0.8, partials: BELL, send: 0.6 });
    tone(B, { f: 293.66, t: 0.24, dur: 1.1, gain: 0.08, type: 'triangle', send: 0.3 });
  },
  error(B) {
    tone(B, { f: 329.63, dur: 0.12, gain: 0.13, type: 'triangle', send: 0.05 });
    tone(B, { f: 311.13, t: 0.13, dur: 0.2, gain: 0.13, type: 'triangle', send: 0.05 });
  },
  blip(B) { tone(B, { f: 880, dur: 0.18, gain: 0.3, partials: BELL, send: 0.3 }); },
  /* balayage de tout l'échiquier, de gauche à droite */
  sweep(B, axes) { axes.forEach((a, i) => tone(B, { f: noteAt(a == null ? 0 : a), t: i * 0.035, dur: 0.22, gain: 0.1, p: (a || 0) * 0.85, partials: PLUCK, send: 0.25 })); }
};

let lastTick = 0;
function play(name, ...args) {
  if (name === 'tick') { const n = performance.now(); if (n - lastTick < 35) return; lastTick = n; }
  const B = live(); if (!B) return;
  try { P[name](B, ...args); } catch (e) { }
  if (name === 'vote' && navigator.vibrate) navigator.vibrate([12, 150, 25]);
}

export const snd = {
  pick: (axis, big) => play('pick', axis, big),
  unpick: axis => play('unpick', axis),
  rank: (i, axis) => play('rank', i, axis),
  tick: v => play('tick', v),
  vote: () => play('vote'),
  logo: () => play('logo'),
  error: () => play('error'),
  sweep: axes => play('sweep', axes),
  isOn: () => on,
  toggle() { on = !on; try { localStorage.setItem('pdm-son', on ? '1' : '0'); } catch (e) { } if (on) play('blip'); return on; }
};

/* Pour les tests : rend un son hors ligne et renvoie l'AudioBuffer */
export async function renderOffline(name, args = [], seconds = 2, rate = 48000) {
  const c = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const B = buildBus(c); P[name](B, ...args);
  return c.startRendering();
}
