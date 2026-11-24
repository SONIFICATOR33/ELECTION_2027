/* Rosace guillochée (façon billet de banque), dessinée à la volée : aucun fichier à charger */
export function guilloche(cv, { color = '#C6A15B', alpha = 0.22, cx = 0.5, cy = 0.5, scale = 1 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const x = cv.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, w, h);
  x.strokeStyle = color; x.globalAlpha = alpha; x.lineWidth = 0.6;
  const c = [w * cx, h * cy], S = Math.max(w, h) / 600 * scale;
  for (let i = 0, rho = 70; rho < 300; rho += 7, i++) {
    const n = 24, a = 6 + (i % 3), ph = i * 0.13;
    x.beginPath();
    for (let k = 0; k <= 720; k++) {
      const t = Math.PI * 2 * k / 720, r = (rho + a * Math.sin(n * t + ph)) * S;
      const px = c[0] + r * Math.cos(t), py = c[1] + r * Math.sin(t);
      k ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  const R = 60, r = 7.5, d = 22; x.beginPath();
  for (let k = 0; k <= 2400; k++) {
    const t = Math.PI * 6 * k / 2400;
    const px = c[0] + ((R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t)) * S, py = c[1] + ((R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)) * S;
    k ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.stroke();
}
