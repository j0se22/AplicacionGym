// Sitios reales cerca de cada pueblo según OpenStreetMap (API de Overpass, gratuita y sin clave).
// Se piden desde el móvil al abrir la ficha y se guardan una semana para verlos sin conexión.
import { GEO } from './geo.js';
import { distanceKm } from './core.js';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CACHE_PREFIX = 'pueblos-sevilla:osm:';
const CACHE_DAYS = 7;

// Qué etiquetas de OpenStreetMap van a cada apartado, y cómo se llaman en español.
const TYPES = [
  { kind: 'desayunar', key: 'amenity', value: 'cafe', label: 'Cafetería' },
  { kind: 'desayunar', key: 'shop', value: 'bakery', label: 'Panadería' },
  { kind: 'desayunar', key: 'shop', value: 'pastry', label: 'Pastelería' },
  { kind: 'desayunar', key: 'shop', value: 'confectionery', label: 'Confitería' },
  { kind: 'comer', key: 'amenity', value: 'restaurant', label: 'Restaurante' },
  { kind: 'comer', key: 'amenity', value: 'bar', label: 'Bar' },
  { kind: 'comer', key: 'amenity', value: 'pub', label: 'Bar de copas' },
  { kind: 'comer', key: 'amenity', value: 'fast_food', label: 'Comida rápida' },
  { kind: 'comer', key: 'amenity', value: 'ice_cream', label: 'Heladería' },
  { kind: 'dormir', key: 'tourism', value: 'hotel', label: 'Hotel' },
  { kind: 'dormir', key: 'tourism', value: 'guest_house', label: 'Casa rural / pensión' },
  { kind: 'dormir', key: 'tourism', value: 'hostel', label: 'Albergue' },
  { kind: 'dormir', key: 'tourism', value: 'apartment', label: 'Apartamento turístico' },
  { kind: 'dormir', key: 'tourism', value: 'chalet', label: 'Casa rural' },
  { kind: 'dormir', key: 'tourism', value: 'motel', label: 'Motel' },
  { kind: 'dormir', key: 'tourism', value: 'camp_site', label: 'Camping' },
  { kind: 'ver', key: 'tourism', value: 'viewpoint', label: 'Mirador' },
  { kind: 'ver', key: 'tourism', value: 'museum', label: 'Museo' },
  { kind: 'ver', key: 'historic', value: 'castle', label: 'Castillo' },
];

const CUISINES = {
  spanish: 'española', regional: 'regional', tapas: 'tapas', andalusian: 'andaluza', seafood: 'marisco',
  fish: 'pescado', grill: 'brasa', barbecue: 'brasa', pizza: 'pizza', italian: 'italiana', burger: 'hamburguesas',
  kebab: 'kebab', chinese: 'china', japanese: 'japonesa', sushi: 'sushi', mexican: 'mexicana', churros: 'churros',
  coffee_shop: 'café', breakfast: 'desayunos', ice_cream: 'helados', sandwich: 'bocadillos', chicken: 'pollo',
  vegetarian: 'vegetariana', vegan: 'vegana', mediterranean: 'mediterránea', international: 'internacional',
};

// Radio de búsqueda (m): el casco urbano para comer, algo más para dormir y para rutas.
const R_TOWN = 2500;
const R_STAY = 6000;
const R_ROUTE = 10000;

export function buildQuery({ lat, lon }) {
  const around = (r) => `(around:${r},${lat},${lon})`;
  const sel = (t, r) => `nwr["${t.key}"="${t.value}"]["name"]${around(r)};`;
  return `[out:json][timeout:25];(${TYPES.map((t) => sel(t, t.kind === 'dormir' ? R_STAY : R_TOWN)).join('')}`
    + `relation["route"~"^(hiking|foot)$"]["name"]${around(R_ROUTE)};);out center tags 400;`;
}

function cuisineLabel(tags) {
  const list = String(tags.cuisine ?? '').split(';').map((c) => CUISINES[c.trim()]).filter(Boolean);
  return list.length ? [...new Set(list)].slice(0, 2).join(', ') : '';
}

// Convierte la respuesta de Overpass en listas por apartado, ordenadas por cercanía y sin repetidos.
export function parseOverpass(json, center) {
  const out = { desayunar: [], comer: [], dormir: [], ver: [], ruta: [] };
  const seen = new Set();
  for (const el of json?.elements ?? []) {
    const tags = el.tags ?? {};
    const name = String(tags.name ?? '').trim();
    if (!name || !['node', 'way', 'relation'].includes(el.type)) continue;
    const osm = `${el.type}/${el.id}`;
    if (el.type === 'relation' && /^(hiking|foot)$/.test(tags.route)) {
      const key = 'ruta:' + name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.ruta.push({
        osm, name, kind: 'ruta', label: tags.network === 'lwn' ? 'Sendero local' : 'Sendero',
        detail: [tags.distance && `${String(tags.distance).replace(/\s*km$/, '')} km`, tags.ref].filter(Boolean).join(' · '),
        website: safeUrl(tags.website), dist: null,
      });
      continue;
    }
    const type = TYPES.find((t) => tags[t.key] === t.value);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!type || lat == null || lon == null) continue;
    // Un bar o restaurante que anuncia desayunos sale también en «Desayunar».
    const breakfast = tags.breakfast === 'yes' || /churros|breakfast|coffee_shop/.test(tags.cuisine ?? '');
    const kinds = type.kind === 'comer' && breakfast ? ['comer', 'desayunar'] : [type.kind];
    for (const kind of kinds) {
      const key = kind + ':' + name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out[kind].push({
        osm, name, kind, label: type.label, cuisine: cuisineLabel(tags),
        hours: hoursEs(tags.opening_hours), phone: String(tags.phone ?? tags['contact:phone'] ?? '').slice(0, 30),
        website: safeUrl(tags.website ?? tags['contact:website']),
        lat, lon, dist: distanceKm(center, { lat, lon }),
      });
    }
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0) || a.name.localeCompare(b.name, 'es'));
    out[k] = out[k].slice(0, 30);
  }
  return out;
}

// Horario de OpenStreetMap en español: "Mo-Sa 07:30-12:30; Su off" → "L-S 07:30-12:30; D cerrado".
const DAYS = { Mo: 'L', Tu: 'M', We: 'X', Th: 'J', Fr: 'V', Sa: 'S', Su: 'D', PH: 'festivos' };
export function hoursEs(h) {
  return String(h ?? '').slice(0, 80)
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAYS[d])
    .replace(/\boff\b/g, 'cerrado')
    .replace(/\b24\/7\b/, 'abierto 24 h');
}

function safeUrl(u) {
  const s = String(u ?? '').trim();
  return /^https?:\/\/[^\s"'<>]+$/.test(s) ? s : '';
}

function readCache(storage, townId, now) {
  try {
    const c = JSON.parse(storage.getItem(CACHE_PREFIX + townId));
    return c && c.data ? { data: c.data, fresh: now - c.at < CACHE_DAYS * 864e5 } : null;
  } catch { return null; }
}

// Devuelve { data, fromCache }. Si no hay red, usa lo guardado aunque sea antiguo.
export async function fetchNearby(townId, { fetchImpl = fetch, storage = globalThis.localStorage, now = Date.now(), force = false } = {}) {
  const cached = storage ? readCache(storage, townId, now) : null;
  if (cached?.fresh && !force) return { data: cached.data, fromCache: true };
  const center = GEO[townId];
  const query = buildQuery(center);
  let lastError = null;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetchImpl(url + '?data=' + encodeURIComponent(query));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = parseOverpass(await res.json(), center);
      try { storage?.setItem(CACHE_PREFIX + townId, JSON.stringify({ at: now, data })); } catch { /* sin espacio */ }
      return { data, fromCache: false };
    } catch (err) {
      lastError = err;
    }
  }
  if (cached) return { data: cached.data, fromCache: true };
  throw lastError ?? new Error('Sin conexión');
}
