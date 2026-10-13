import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, upsertPlace, normalizePlace, dayPlan, bestPlaces } from '../js/core.js';
import { buildQuery, parseOverpass, fetchNearby, hoursEs } from '../js/nearby.js';
import { GEO } from '../js/geo.js';
import { INFO } from '../js/info.js';

const C = GEO.carmona;
const OVERPASS = {
  elements: [
    { type: 'node', id: 1, lat: C.lat + 0.001, lon: C.lon, tags: { amenity: 'cafe', name: 'Café La Plaza', opening_hours: 'Mo-Su 07:00-13:00' } },
    { type: 'node', id: 2, lat: C.lat + 0.01, lon: C.lon, tags: { amenity: 'restaurant', name: 'Mesón El Arco', cuisine: 'spanish;tapas' } },
    { type: 'way', id: 3, center: { lat: C.lat, lon: C.lon + 0.002 }, tags: { amenity: 'bar', name: 'Bar Churrería Paco', cuisine: 'churros' } },
    { type: 'node', id: 4, lat: C.lat, lon: C.lon, tags: { amenity: 'bar' } }, // sin nombre: fuera
    { type: 'node', id: 5, lat: C.lat, lon: C.lon + 0.03, tags: { tourism: 'hotel', name: 'Parador', website: 'https://parador.es' } },
    { type: 'node', id: 6, lat: C.lat, lon: C.lon, tags: { tourism: 'guest_house', name: 'Casa X', website: 'javascript:alert(1)' } },
    { type: 'relation', id: 7, tags: { route: 'hiking', name: 'Sendero de la Vega', distance: '12 km' } },
    { type: 'relation', id: 8, tags: { route: 'hiking', name: 'Sendero de la Vega' } }, // repetido
    { type: 'node', id: 9, lat: C.lat + 0.002, lon: C.lon, tags: { amenity: 'cafe', name: 'Café La Plaza' } }, // repetido
  ],
};

test('la consulta a Overpass busca alrededor del pueblo', () => {
  const q = buildQuery(C);
  assert.match(q, /^\[out:json\]/);
  assert.ok(q.includes(`(around:2500,${C.lat},${C.lon})`));
  assert.ok(q.includes('"tourism"="hotel"'));
  assert.ok(q.includes('route"~"^(hiking|foot)$"'));
});

test('parseOverpass clasifica, ordena por cercanía y quita repetidos y enlaces peligrosos', () => {
  const r = parseOverpass(OVERPASS, C);
  assert.deepEqual(r.desayunar.map((x) => x.name), ['Café La Plaza', 'Bar Churrería Paco']);
  assert.equal(r.desayunar[0].hours, 'L-D 07:00-13:00');
  assert.equal(r.desayunar[0].label, 'Cafetería');
  assert.deepEqual(r.comer.map((x) => x.name), ['Bar Churrería Paco', 'Mesón El Arco']);
  assert.equal(r.comer[1].cuisine, 'española, tapas');
  assert.ok(r.comer[1].dist > 1 && r.comer[1].dist < 1.3);
  assert.deepEqual(r.dormir.map((x) => [x.name, x.website]), [['Casa X', ''], ['Parador', 'https://parador.es']]);
  assert.deepEqual(r.ruta.map((x) => [x.name, x.detail, x.osm]), [['Sendero de la Vega', '12 km', 'relation/7']]);
  assert.equal(parseOverpass(null, C).comer.length, 0);
});

test('fetchNearby guarda una semana, prueba el servidor de reserva y sirve lo guardado sin red', async () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const calls = [];
  const ok = async (url) => { calls.push(url); return { ok: true, status: 200, json: async () => OVERPASS }; };
  const firstDown = async (url) => {
    calls.push(url);
    if (url.includes('overpass-api.de')) return { ok: false, status: 504 };
    return { ok: true, status: 200, json: async () => OVERPASS };
  };
  const offline = async () => { throw new TypeError('offline'); };

  const a = await fetchNearby('carmona', { fetchImpl: firstDown, storage, now: 1000 });
  assert.equal(a.fromCache, false);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /kumi/);
  assert.equal(a.data.comer.length, 2);

  const b = await fetchNearby('carmona', { fetchImpl: ok, storage, now: 1000 + 3 * 864e5 });
  assert.equal(b.fromCache, true);
  assert.equal(calls.length, 2);

  const c = await fetchNearby('carmona', { fetchImpl: offline, storage, now: 1000 + 30 * 864e5 });
  assert.equal(c.fromCache, true);
  assert.equal(c.data.dormir.length, 2);

  await assert.rejects(fetchNearby('osuna', { fetchImpl: offline, storage }));
});

test('sitios de tipo desayunar y ruta, con enlace a OpenStreetMap válido', () => {
  assert.equal(normalizePlace({ townId: 'osuna', name: 'X', kind: 'desayunar' }).kind, 'desayunar');
  assert.equal(normalizePlace({ townId: 'osuna', name: 'X', kind: 'ruta', osm: 'relation/7' }).osm, 'relation/7');
  assert.equal(normalizePlace({ townId: 'osuna', name: 'X', osm: 'node/1"><script>' }).osm, '');
});

test('plan del día: primero lo recomendado por la gente, luego el mapa, luego un consejo', () => {
  const s = defaultState();
  const nb = parseOverpass(OVERPASS, C);
  let plan = dayPlan(s, 'carmona');
  assert.equal(plan[0].title, 'Desayuno');
  assert.equal(plan[0].place, null);
  assert.ok(plan[0].tip);
  assert.equal(plan[1].title, INFO.carmona.ver[0]);
  assert.ok(plan.every((p) => p.icon !== '🛏️')); // Carmona está cerca de Sevilla

  plan = dayPlan(s, 'carmona', nb);
  assert.deepEqual([plan[0].place.name, plan[0].place.source], ['Café La Plaza', 'mapa']);
  const lunch = plan.find((p) => p.title === 'Comida');
  assert.equal(lunch.place.name, 'Bar Churrería Paco');
  assert.match(lunch.tip, /Tortas de Carmona/);

  upsertPlace(s, { townId: 'carmona', name: 'Bar Bueno', kind: 'desayunar', score: 3 });
  upsertPlace(s, { townId: 'carmona', name: 'Bar Mejor', kind: 'desayunar', score: 5 });
  assert.deepEqual(bestPlaces(s, 'carmona', 'desayunar').map((p) => p.name), ['Bar Mejor', 'Bar Bueno']);
  plan = dayPlan(s, 'carmona', nb);
  assert.deepEqual([plan[0].place.name, plan[0].place.source], ['Bar Mejor', 'gente']);

  // Pueblo lejano y con rutas: sale la ruta y dónde dormir, sin repetir la visita de la tarde.
  const far = dayPlan(s, 'san-nicolas-del-puerto');
  assert.ok(far.some((p) => p.icon === '🥾' && p.title === 'Sendero del Cerro del Hierro'));
  assert.ok(far.some((p) => p.icon === '🛏️'));
  assert.ok(!far.some((p) => p.icon === '🌅' && p.title === 'Cerro del Hierro'));
});

test('horarios en español', () => {
  assert.equal(hoursEs('Mo-Fr 08:00-14:00; Sa 09:00-13:00; Su,PH off'), 'L-V 08:00-14:00; S 09:00-13:00; D,festivos cerrado');
  assert.equal(hoursEs('24/7'), 'abierto 24 h');
  assert.equal(hoursEs(undefined), '');
});
