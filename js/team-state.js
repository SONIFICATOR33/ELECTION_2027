// Une même forme pour les anciens brouillons et les sauvegardes du compte.
export function normalizeTeam(value) {
  const t = value && typeof value === 'object' ? value : {};
  const text = key => typeof t[key] === 'string' ? t[key] : '';
  const min = t.min && typeof t.min === 'object' && !Array.isArray(t.min) ? t.min : {};
  return { coeur: text('coeur'), pm: text('pm'),
    min: Object.fromEntries(Object.entries(min).filter(([, v]) => typeof v === 'string')),
    jl: text('jl'), jn: text('jn') };
}

export function hasTeam(value) {
  const t = normalizeTeam(value);
  return Boolean(t.coeur || t.pm || Object.values(t.min).some(Boolean) || t.jl || t.jn);
}

export function sameTeam(a, b) {
  const left = normalizeTeam(a), right = normalizeTeam(b);
  return ['coeur', 'pm', 'jl', 'jn'].every(k => left[k] === right[k])
    && JSON.stringify(Object.entries(left.min).sort()) === JSON.stringify(Object.entries(right.min).sort());
}
