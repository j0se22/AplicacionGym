// Lógica pura de la app (sin DOM) para poder probarla con `node --test`.
import { COMARCAS } from './data.js';

export const STORAGE_KEY = 'pueblos-sevilla:v1';

// Aspectos que se puntúan (de 1 a 5 estrellas). Se puede dejar alguno sin puntuar.
export const CATEGORIES = [
  { id: 'comida', name: 'Comida', icon: '🍽️' },
  { id: 'lugar', name: 'Lugar y monumentos', icon: '🏛️' },
  { id: 'estancia', name: 'Estancia y alojamiento', icon: '🛏️' },
  { id: 'gente', name: 'Gente', icon: '🤝' },
  { id: 'fiestas', name: 'Fiestas y ambiente', icon: '💃' },
  { id: 'naturaleza', name: 'Naturaleza y entorno', icon: '🌳' },
  { id: 'precio', name: 'Precios', icon: '💶' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Quita tildes y pasa a minúsculas: "Écija" → "ecija".
export function fold(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function slug(text) {
  return fold(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Para ordenar alfabéticamente sin que pesen los artículos ("El Viso" va con la V).
export function sortName(name) {
  return fold(name).replace(/^(el|la|los|las) /, '');
}

export const TOWNS = Object.entries(COMARCAS)
  .flatMap(([comarca, names]) => names.map((name) => ({ id: slug(name), name, comarca })))
  .sort((a, b) => sortName(a.name).localeCompare(sortName(b.name), 'es'));

const TOWN_BY_ID = new Map(TOWNS.map((t) => [t.id, t]));

export function findTown(id) {
  return TOWN_BY_ID.get(id) ?? null;
}

export const round1 = (n) => Math.round(n * 10) / 10;

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function defaultState() {
  return { version: 1, author: '', reviews: [], marks: {} };
}

function validScore(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function normalizeReview(r) {
  if (!r || typeof r !== 'object' || !findTown(r.townId)) return null;
  const scores = {};
  for (const id of CATEGORY_IDS) {
    const v = validScore(r.scores?.[id]);
    if (v) scores[id] = v;
  }
  if (!Object.keys(scores).length) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    townId: r.townId,
    author: String(r.author ?? '').trim().slice(0, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : todayKey(),
    scores,
    comment: String(r.comment ?? '').trim().slice(0, 2000),
    tip: String(r.tip ?? '').trim().slice(0, 300),
    updatedAt: Number(r.updatedAt) || Date.now(),
  };
}

export function normalizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  s.author = String(raw.author ?? '').trim().slice(0, 40);
  s.reviews = (Array.isArray(raw.reviews) ? raw.reviews : []).map(normalizeReview).filter(Boolean);
  for (const [id, m] of Object.entries(raw.marks ?? {})) {
    if (findTown(id) && (m === 'visitado' || m === 'pendiente')) s.marks[id] = m;
  }
  return s;
}

// Nota media de una valoración (media de los aspectos puntuados).
export function reviewScore(review) {
  const vals = Object.values(review.scores);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function townReviews(state, townId) {
  return state.reviews
    .filter((r) => r.townId === townId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
}

// Medias por aspecto y nota global de un pueblo.
// La global es la media de las notas de cada valoración: así cada visita pesa lo mismo.
export function townStats(state, townId) {
  const reviews = state.reviews.filter((r) => r.townId === townId);
  const byCat = {};
  for (const id of CATEGORY_IDS) {
    const vals = reviews.map((r) => r.scores[id]).filter(Boolean);
    byCat[id] = vals.length ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length } : null;
  }
  const overall = reviews.length
    ? reviews.reduce((sum, r) => sum + reviewScore(r), 0) / reviews.length
    : null;
  return { count: reviews.length, overall, byCat };
}

// Ranking de pueblos valorados por un aspecto (o 'global').
// A igualdad de nota, primero el que tiene más valoraciones.
export function ranking(state, category = 'global', comarca = '') {
  return TOWNS
    .filter((t) => !comarca || t.comarca === comarca)
    .map((town) => {
      const stats = townStats(state, town.id);
      const entry = category === 'global'
        ? (stats.overall == null ? null : { avg: stats.overall, count: stats.count })
        : stats.byCat[category];
      return entry ? { town, score: entry.avg, count: entry.count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.count - a.count
      || sortName(a.town.name).localeCompare(sortName(b.town.name), 'es'));
}

export function searchTowns(query, { comarca = '', mark = '', state = null } = {}) {
  const q = fold(query);
  return TOWNS.filter((t) => (!q || fold(t.name).includes(q))
    && (!comarca || t.comarca === comarca)
    && (!mark || state?.marks[t.id] === mark
      || (mark === 'valorado' && state?.reviews.some((r) => r.townId === t.id))
      || (mark === 'sin-valorar' && !state?.reviews.some((r) => r.townId === t.id))));
}

export function upsertReview(state, review) {
  const clean = normalizeReview({ ...review, updatedAt: Date.now() });
  if (!clean) return null;
  const i = state.reviews.findIndex((r) => r.id === clean.id);
  if (i >= 0) state.reviews[i] = clean;
  else state.reviews.push(clean);
  // Si lo has valorado, lo has visitado.
  state.marks[clean.townId] = 'visitado';
  return clean;
}

export function deleteReview(state, id) {
  state.reviews = state.reviews.filter((r) => r.id !== id);
}

// Une las valoraciones de otra copia (por ejemplo, la de un amigo).
// Si una valoración existe en las dos, se queda la más reciente.
export function mergeImport(state, raw) {
  const incoming = normalizeState(raw);
  const byId = new Map(state.reviews.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  for (const r of incoming.reviews) {
    const mine = byId.get(r.id);
    if (!mine) { byId.set(r.id, r); added++; } else if (r.updatedAt > mine.updatedAt) { byId.set(r.id, r); updated++; }
  }
  state.reviews = [...byId.values()];
  for (const [id, m] of Object.entries(incoming.marks)) if (!state.marks[id]) state.marks[id] = m;
  if (!state.author && incoming.author) state.author = incoming.author;
  return { added, updated };
}

// Texto para compartir la valoración de un pueblo.
export function shareText(state, townId) {
  const town = findTown(townId);
  const stats = townStats(state, townId);
  if (!town || stats.overall == null) return '';
  const lines = [`${town.name} (${town.comarca}): ${stars(stats.overall)} ${round1(stats.overall)}/5`];
  for (const c of CATEGORIES) {
    const e = stats.byCat[c.id];
    if (e) lines.push(`${c.icon} ${c.name}: ${round1(e.avg)}/5`);
  }
  return lines.join('\n');
}

export function stars(score) {
  const n = Math.round(score);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
