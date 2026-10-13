// Lógica pura de la app (sin DOM) para poder probarla con `node --test`.
import { COMARCAS } from './data.js';
import { GEO } from './geo.js';
import { INFO, fiestaRange, SEMANA_SANTA } from './info.js';

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

// Tipos de sitios recomendados dentro de un pueblo.
export const PLACE_KINDS = [
  { id: 'comer', name: 'Comer y tapear', icon: '🍷' },
  { id: 'dormir', name: 'Dormir', icon: '🛏️' },
  { id: 'ver', name: 'Ver y visitar', icon: '📸' },
  { id: 'otro', name: 'Otro', icon: '📍' },
];

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
  return {
    version: 2,
    author: '',
    reviews: [],
    places: [],
    marks: {},
    weights: {},
    // Cambios pendientes de subir cuando hay valoraciones compartidas (ids).
    dirty: { reviews: [], places: [] },
    deleted: { reviews: [], places: [] },
  };
}

function validScore(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const validId = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : uid());

// Fotos: "idb:<id>" (guardada en este móvil) o una URL https (subida al servidor).
function validPhotos(list) {
  return (Array.isArray(list) ? list : [])
    .filter((p) => typeof p === 'string' && (/^idb:[\w-]+$/.test(p) || /^https:\/\/\S+$/.test(p)))
    .slice(0, 6);
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
    id: validId(r.id),
    townId: r.townId,
    author: text(r.author, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : todayKey(),
    scores,
    comment: text(r.comment, 2000),
    tip: text(r.tip, 300),
    photos: validPhotos(r.photos),
    mine: r.mine !== false, // false = de otra persona (importada o del servidor): no se puede editar
    synced: r.synced === true,
    updatedAt: Number(r.updatedAt) || Date.now(),
  };
}

export function normalizePlace(p) {
  if (!p || typeof p !== 'object' || !findTown(p.townId) || !text(p.name, 80)) return null;
  return {
    id: validId(p.id),
    townId: p.townId,
    name: text(p.name, 80),
    kind: PLACE_KINDS.some((k) => k.id === p.kind) ? p.kind : 'otro',
    score: validScore(p.score),
    note: text(p.note, 500),
    author: text(p.author, 40),
    mine: p.mine !== false,
    synced: p.synced === true,
    updatedAt: Number(p.updatedAt) || Date.now(),
  };
}

const idList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

export function normalizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  s.author = text(raw.author, 40);
  s.reviews = (Array.isArray(raw.reviews) ? raw.reviews : []).map(normalizeReview).filter(Boolean);
  s.places = (Array.isArray(raw.places) ? raw.places : []).map(normalizePlace).filter(Boolean);
  for (const [id, m] of Object.entries(raw.marks ?? {})) {
    if (findTown(id) && (m === 'visitado' || m === 'pendiente')) s.marks[id] = m;
  }
  for (const id of CATEGORY_IDS) {
    const w = Number(raw.weights?.[id]);
    if (Number.isInteger(w) && w >= 0 && w <= 3 && w !== 1) s.weights[id] = w;
  }
  for (const k of ['reviews', 'places']) {
    s.dirty[k] = idList(raw.dirty?.[k]);
    s.deleted[k] = idList(raw.deleted?.[k]);
  }
  return s;
}

// Copia para exportar o compartir: sin datos internos de sincronización y sin fotos locales.
export function exportState(state) {
  const strip = ({ mine, synced, ...rest }) => rest;
  return {
    version: 2,
    author: state.author,
    reviews: state.reviews.map((r) => ({ ...strip(r), photos: r.photos.filter((p) => p.startsWith('https:')) })),
    places: state.places.map(strip),
    marks: state.marks,
  };
}

// ---------- Notas ----------

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

export const weightOf = (state, cat) => state.weights[cat] ?? 1;

// Nota «para ti»: media de los aspectos ponderada por lo que más te importa (pesos 0-3).
export function personalScore(state, stats) {
  let sum = 0;
  let total = 0;
  for (const id of CATEGORY_IDS) {
    const w = weightOf(state, id);
    if (stats.byCat[id] && w > 0) {
      sum += stats.byCat[id].avg * w;
      total += w;
    }
  }
  return total ? sum / total : null;
}

// Ranking de pueblos valorados: 'global', 'parati' o un aspecto.
// A igualdad de nota, primero el que tiene más valoraciones.
export function ranking(state, category = 'global', comarca = '') {
  return TOWNS
    .filter((t) => !comarca || t.comarca === comarca)
    .map((town) => {
      const stats = townStats(state, town.id);
      let entry = null;
      if (category === 'global') entry = stats.overall == null ? null : { avg: stats.overall, count: stats.count };
      else if (category === 'parati') {
        const p = personalScore(state, stats);
        entry = p == null ? null : { avg: p, count: stats.count };
      } else entry = stats.byCat[category];
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

// ---------- Cambios ----------

function touch(state, kind, id) {
  if (!state.dirty[kind].includes(id)) state.dirty[kind].push(id);
}

function forget(state, kind, item) {
  state.dirty[kind] = state.dirty[kind].filter((x) => x !== item.id);
  if (item.synced && !state.deleted[kind].includes(item.id)) state.deleted[kind].push(item.id);
}

export function upsertReview(state, review) {
  const old = state.reviews.find((r) => r.id === review.id);
  const clean = normalizeReview({ ...review, mine: true, synced: old?.synced, updatedAt: Date.now() });
  if (!clean) return null;
  const i = state.reviews.findIndex((r) => r.id === clean.id);
  if (i >= 0) state.reviews[i] = clean;
  else state.reviews.push(clean);
  touch(state, 'reviews', clean.id);
  // Si lo has valorado, lo has visitado.
  state.marks[clean.townId] = 'visitado';
  return clean;
}

export function deleteReview(state, id) {
  const r = state.reviews.find((x) => x.id === id);
  if (!r) return;
  state.reviews = state.reviews.filter((x) => x.id !== id);
  forget(state, 'reviews', r);
}

export function upsertPlace(state, place) {
  const old = state.places.find((p) => p.id === place.id);
  const clean = normalizePlace({ ...place, mine: true, synced: old?.synced, updatedAt: Date.now() });
  if (!clean) return null;
  const i = state.places.findIndex((p) => p.id === clean.id);
  if (i >= 0) state.places[i] = clean;
  else state.places.push(clean);
  touch(state, 'places', clean.id);
  return clean;
}

export function deletePlace(state, id) {
  const p = state.places.find((x) => x.id === id);
  if (!p) return;
  state.places = state.places.filter((x) => x.id !== id);
  forget(state, 'places', p);
}

export function townPlaces(state, townId) {
  return state.places
    .filter((p) => p.townId === townId)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name, 'es'));
}

// Une valoraciones y sitios de otra copia (por ejemplo, la de un amigo).
// Si algo existe en las dos, se queda lo más reciente. Lo importado no se puede editar aquí.
export function mergeImport(state, raw) {
  const incoming = normalizeState(raw);
  let added = 0;
  let updated = 0;
  for (const kind of ['reviews', 'places']) {
    const byId = new Map(state[kind].map((x) => [x.id, x]));
    for (const item of incoming[kind]) {
      const mine = byId.get(item.id);
      if (!mine) {
        byId.set(item.id, { ...item, mine: false, synced: false });
        added++;
      } else if (item.updatedAt > mine.updatedAt) {
        byId.set(item.id, { ...item, mine: mine.mine, synced: mine.synced });
        updated++;
      }
    }
    state[kind] = [...byId.values()];
  }
  for (const [id, m] of Object.entries(incoming.marks)) if (!state.marks[id]) state.marks[id] = m;
  if (!state.author && incoming.author) state.author = incoming.author;
  return { added, updated };
}

// ---------- Distancias y rutas ----------

export const SEVILLA = { lat: GEO.sevilla.lat, lon: GEO.sevilla.lon };

// Distancia en línea recta (km).
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const townDistance = (a, b) => distanceKm(GEO[a], GEO[b]);
export const kmFromSevilla = (id) => distanceKm(SEVILLA, GEO[id]);

// Ordena las paradas para recorrerlas con el menor camino (vecino más cercano, saliendo de Sevilla).
export function planRoute(ids, start = SEVILLA) {
  const left = [...new Set(ids)].filter((id) => GEO[id]);
  const order = [];
  let here = start;
  let km = 0;
  while (left.length) {
    left.sort((a, b) => distanceKm(here, GEO[a]) - distanceKm(here, GEO[b]));
    const next = left.shift();
    km += distanceKm(here, GEO[next]);
    order.push(next);
    here = GEO[next];
  }
  return { order, km };
}

// Propone una ruta de un día: `n` pueblos cercanos entre sí de una comarca,
// dando prioridad a los de «Quiero ir» y después a los que aún no has visitado.
export function suggestRoute(state, comarca, n = 3) {
  const towns = TOWNS.filter((t) => t.comarca === comarca && t.id !== 'sevilla');
  const rank = (t) => (state.marks[t.id] === 'pendiente' ? 0 : state.marks[t.id] === 'visitado' ? 2 : 1);
  const best = Math.min(...towns.map(rank));
  const seed = towns.filter((t) => rank(t) === best).sort((a, b) => kmFromSevilla(a.id) - kmFromSevilla(b.id))[0];
  if (!seed) return { order: [], km: 0 };
  const picked = [seed.id];
  while (picked.length < Math.min(n, towns.length)) {
    const last = picked[picked.length - 1];
    const next = towns
      .filter((t) => !picked.includes(t.id))
      .sort((a, b) => rank(a) - rank(b) || townDistance(last, a.id) - townDistance(last, b.id))[0];
    picked.push(next.id);
  }
  return planRoute(picked);
}

export function mapsRouteUrl(ids) {
  const name = (id) => `${findTown(id).name}, Sevilla`;
  const stops = ids.map(name);
  const params = new URLSearchParams({ api: '1', origin: 'Sevilla', destination: stops[stops.length - 1], travelmode: 'driving' });
  if (stops.length > 1) params.set('waypoints', stops.slice(0, -1).join('|'));
  return 'https://www.google.com/maps/dir/?' + params;
}

// ---------- Pueblo sorpresa ----------

// pool: 'pendiente' (tu lista), 'nuevo' (no visitados) o 'todos'. maxKm: distancia máxima desde Sevilla.
export function randomTown(state, { pool = 'nuevo', maxKm = 0, exclude = '' } = {}, rnd = Math.random) {
  const list = TOWNS.filter((t) => t.id !== exclude
    && (pool === 'todos' || (pool === 'pendiente' ? state.marks[t.id] === 'pendiente' : state.marks[t.id] !== 'visitado'))
    && (!maxKm || kmFromSevilla(t.id) <= maxKm));
  return list.length ? list[Math.floor(rnd() * list.length)] : null;
}

// ---------- Pasaporte y logros ----------

// Pueblos visitados con la fecha de tu primera valoración (si la hay).
export function passport(state) {
  return TOWNS.filter((t) => state.marks[t.id] === 'visitado').map((t) => {
    const dates = state.reviews.filter((r) => r.townId === t.id && r.mine).map((r) => r.date).sort();
    return { town: t, date: dates[0] ?? null };
  });
}

export function achievements(state) {
  const visited = new Set(TOWNS.filter((t) => state.marks[t.id] === 'visitado').map((t) => t.id));
  const mine = state.reviews.filter((r) => r.mine);
  const photos = mine.reduce((n, r) => n + r.photos.length, 0);
  const places = state.places.filter((p) => p.mine).length;
  const far = [...visited].some((id) => kmFromSevilla(id) >= 80);
  const item = (id, icon, name, desc, value, goal) => ({ id, icon, name, desc, value: Math.min(value, goal), goal, done: value >= goal });
  const list = [
    item('primer', '👣', 'Primeros pasos', 'Visita tu primer pueblo', visited.size, 1),
    item('diez', '🧭', 'Trotamundos', 'Visita 10 pueblos', visited.size, 10),
    item('veinticinco', '🚗', 'Kilómetros en las piernas', 'Visita 25 pueblos', visited.size, 25),
    item('cincuenta', '🗺️', 'Media provincia', 'Visita 50 pueblos', visited.size, 50),
    item('todos', '👑', 'Sevilla al completo', `Visita los ${TOWNS.length} pueblos`, visited.size, TOWNS.length),
    item('critica', '✍️', 'Crítica de pueblos', 'Escribe 10 valoraciones', mine.length, 10),
    item('gastro', '🍽️', 'Ruta gastronómica', 'Puntúa la comida de 10 pueblos', new Set(mine.filter((r) => r.scores.comida).map((r) => r.townId)).size, 10),
    item('fotos', '📷', 'Reportaje gráfico', 'Sube 5 fotos', photos, 5),
    item('sitios', '📍', 'Guía local', 'Recomienda 5 sitios', places, 5),
    item('lejos', '🏔️', 'Hasta el último rincón', 'Visita un pueblo a más de 80 km de Sevilla', far ? 1 : 0, 1),
  ];
  for (const [comarca, names] of Object.entries(COMARCAS)) {
    if (names.length < 3) continue;
    const done = names.filter((n) => visited.has(slug(n))).length;
    list.push(item('comarca-' + slug(comarca), '🏅', `${comarca} completa`, `Visita los ${names.length} pueblos de ${comarca}`, done, names.length));
  }
  return list;
}

// ---------- Fiestas ----------

export function townInfo(townId) {
  return INFO[townId] ?? {};
}

// Fiestas que caen (o están en curso) en los próximos `days` días.
export function upcomingFiestas(from = new Date(), days = 45) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
  const out = [];
  const add = (town, fiesta) => {
    for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
      const [a, b] = fiestaRange(fiesta, year);
      if (b >= start && a <= end) out.push({ town, fiesta, start: a, end: b });
    }
  };
  for (const [id, info] of Object.entries(INFO)) for (const f of info.fiestas ?? []) add(findTown(id), f);
  add(null, SEMANA_SANTA); // en todos los pueblos
  return out.sort((x, y) => x.start - y.start);
}

// ---------- Compartir ----------

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

// ---------- Valoraciones compartidas ----------

// Une lo que hay en el servidor con lo local. Lo pendiente de subir (dirty) manda sobre el servidor;
// lo que ya estaba sincronizado y ya no está en el servidor se ha borrado allí.
export function mergeRemote(state, remote) {
  for (const kind of ['reviews', 'places']) {
    const norm = kind === 'reviews' ? normalizeReview : normalizePlace;
    const incoming = new Map();
    for (const row of remote[kind] ?? []) {
      const item = norm({ ...row, synced: true });
      if (item) incoming.set(item.id, item);
    }
    const dirty = new Set(state.dirty[kind]);
    const deleted = new Set(state.deleted[kind]);
    const result = [];
    for (const local of state[kind]) {
      const r = incoming.get(local.id);
      incoming.delete(local.id);
      if (dirty.has(local.id)) result.push(local);
      else if (r) result.push(r.updatedAt >= local.updatedAt ? r : local);
      else if (!local.synced) result.push(local);
    }
    for (const r of incoming.values()) if (!deleted.has(r.id)) result.push(r);
    state[kind] = result;
  }
}

// Marca como subido lo que estaba pendiente.
export function markSynced(state, done) {
  for (const kind of ['reviews', 'places']) {
    const ids = new Set(done[kind] ?? []);
    for (const item of state[kind]) if (ids.has(item.id)) item.synced = true;
    state.dirty[kind] = state.dirty[kind].filter((id) => !ids.has(id));
    const gone = new Set(done.deleted?.[kind] ?? []);
    state.deleted[kind] = state.deleted[kind].filter((id) => !gone.has(id));
  }
}
