import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOWNS, defaultState, normalizeState, exportState, upsertReview, deleteReview, upsertPlace, deletePlace,
  townPlaces, mergeImport, ranking, personalScore, townStats, kmFromSevilla, townDistance, planRoute,
  suggestRoute, mapsRouteUrl, randomTown, passport, achievements, upcomingFiestas, mergeRemote,
} from '../js/core.js';
import { GEO, MAP_SIZE } from '../js/geo.js';
import { easterSunday, fiestaRange, INFO } from '../js/info.js';
import { createSync, validConfig } from '../js/sync.js';

const rate = (state, townId, scores, extra = {}) => upsertReview(state, { townId, scores, ...extra });

test('todos los pueblos tienen coordenadas y contorno dentro del mapa', () => {
  for (const t of TOWNS) {
    const g = GEO[t.id];
    assert.ok(g, t.name);
    assert.match(g.d, /^M/);
    assert.ok(g.x >= 0 && g.x <= MAP_SIZE.width && g.y >= 0 && g.y <= MAP_SIZE.height, t.name);
    assert.ok(g.lat > 36.8 && g.lat < 38.3 && g.lon > -6.6 && g.lon < -4.6, t.name);
  }
});

test('distancias razonables desde Sevilla', () => {
  assert.equal(Math.round(kmFromSevilla('sevilla')), 0);
  const carmona = kmFromSevilla('carmona');
  assert.ok(carmona > 25 && carmona < 40, String(carmona));
  const ecija = kmFromSevilla('ecija');
  assert.ok(ecija > 75 && ecija < 95, String(ecija));
  assert.ok(townDistance('estepa', 'gilena') < townDistance('estepa', 'guadalcanal'));
});

test('la ruta sale de Sevilla y visita primero lo más cercano', () => {
  const { order, km } = planRoute(['ecija', 'carmona', 'osuna', 'carmona']);
  assert.deepEqual(order, ['carmona', 'ecija', 'osuna']);
  assert.ok(km > 100);
  const url = mapsRouteUrl(order);
  assert.match(url, /destination=Osuna%2C\+Sevilla/);
  assert.match(url, /waypoints=Carmona%2C\+Sevilla%7C%C3%89cija%2C\+Sevilla/);
});

test('la ruta sugerida da prioridad a «Quiero ir» y no repite', () => {
  const s = defaultState();
  s.marks.alanis = 'pendiente';
  const { order } = suggestRoute(s, 'Sierra Norte', 3);
  assert.equal(order.length, 3);
  assert.equal(new Set(order).size, 3);
  assert.ok(order.includes('alanis'));
  assert.ok(order.every((id) => TOWNS.find((t) => t.id === id).comarca === 'Sierra Norte'));
});

test('pueblo sorpresa respeta la lista y la distancia', () => {
  const s = defaultState();
  assert.equal(randomTown(s, { pool: 'pendiente' }), null);
  s.marks.coripe = 'pendiente';
  assert.equal(randomTown(s, { pool: 'pendiente' }).id, 'coripe');
  for (let i = 0; i < 30; i++) {
    const t = randomTown(s, { pool: 'nuevo', maxKm: 30 });
    assert.ok(kmFromSevilla(t.id) <= 30);
  }
  s.marks.sevilla = 'visitado';
  assert.notEqual(randomTown(s, { pool: 'nuevo' }, () => 0.999).id, 'sevilla');
});

test('pasaporte y logros', () => {
  const s = defaultState();
  rate(s, 'estepa', { comida: 5 }, { date: '2026-05-01' });
  rate(s, 'estepa', { comida: 4 }, { date: '2026-03-01' });
  s.marks.gilena = 'visitado';
  const p = passport(s);
  assert.deepEqual(p.map((x) => [x.town.id, x.date]), [['estepa', '2026-03-01'], ['gilena', null]]);
  const logros = Object.fromEntries(achievements(s).map((l) => [l.id, l]));
  assert.equal(logros.primer.done, true);
  assert.equal(logros.diez.value, 2);
  assert.equal(logros.lejos.done, true); // Estepa está a más de 80 km
  assert.equal(logros['comarca-comarca-de-estepa'].value, 2);
  assert.equal(logros['comarca-comarca-de-estepa'].goal, 11);
});

test('ranking «para ti» pondera lo que importa', () => {
  const s = defaultState();
  rate(s, 'carmona', { comida: 5, fiestas: 1 });
  rate(s, 'osuna', { comida: 2, fiestas: 5 });
  assert.equal(ranking(s, 'global')[0].score, 3.5); // empate a 3,5
  s.weights = { comida: 3, fiestas: 0 };
  assert.deepEqual(ranking(s, 'parati').map((r) => r.town.id), ['carmona', 'osuna']);
  assert.equal(personalScore(s, townStats(s, 'carmona')), 5);
  s.weights = { comida: 0, fiestas: 3 };
  assert.equal(ranking(s, 'parati')[0].town.id, 'osuna');
});

test('sitios recomendados', () => {
  const s = defaultState();
  assert.equal(upsertPlace(s, { townId: 'utrera', name: '  ' }), null);
  const a = upsertPlace(s, { townId: 'utrera', name: 'Bar A', kind: 'comer', score: 3 });
  upsertPlace(s, { townId: 'utrera', name: 'Hostal B', kind: 'dormir', score: 5 });
  upsertPlace(s, { townId: 'utrera', name: 'Rincón', kind: 'raro' });
  assert.deepEqual(townPlaces(s, 'utrera').map((p) => p.name), ['Hostal B', 'Bar A', 'Rincón']);
  assert.equal(townPlaces(s, 'utrera')[2].kind, 'otro');
  deletePlace(s, a.id);
  assert.equal(townPlaces(s, 'utrera').length, 2);
});

test('exportar no incluye fotos locales ni datos internos, e importar no deja editar lo ajeno', () => {
  const s = defaultState();
  rate(s, 'lebrija', { gente: 5 }, { photos: ['idb:abc', 'https://x.supabase.co/f.jpg', 'javascript:alert(1)'] });
  upsertPlace(s, { townId: 'lebrija', name: 'Peña', kind: 'ver' });
  assert.deepEqual(s.reviews[0].photos, ['idb:abc', 'https://x.supabase.co/f.jpg']);
  const out = exportState(s);
  assert.deepEqual(out.reviews[0].photos, ['https://x.supabase.co/f.jpg']);
  assert.equal('mine' in out.reviews[0], false);
  assert.equal('dirty' in out, false);

  const friend = defaultState();
  mergeImport(friend, JSON.parse(JSON.stringify(out)));
  assert.equal(friend.reviews[0].mine, false);
  assert.equal(friend.places[0].mine, false);
  assert.equal(friend.dirty.reviews.length, 0);
});

test('fiestas: Semana Santa y Feria se calculan cada año', () => {
  assert.equal(easterSunday(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  assert.equal(easterSunday(2027).toDateString(), new Date(2027, 2, 28).toDateString());
  const [a, b] = fiestaRange(INFO.sevilla.fiestas[0], 2026); // Feria de Abril
  assert.equal(a.toDateString(), new Date(2026, 3, 18).toDateString());
  assert.equal(b.toDateString(), new Date(2026, 3, 25).toDateString());
  const list = upcomingFiestas(new Date(2026, 2, 20), 30);
  assert.ok(list.some((f) => f.town === null && f.fiesta.name === 'Semana Santa'));
  assert.ok(list.some((f) => f.town?.id === 'mairena-del-alcor')); // feria en abril
  assert.ok(upcomingFiestas(new Date(2026, 6, 1), 20).some((f) => f.town?.id === 'lebrija'));
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].start <= list[i].start);
});

test('mergeRemote: lo pendiente manda, lo borrado en el servidor desaparece', () => {
  const s = defaultState();
  const keep = rate(s, 'pilas', { comida: 3 });
  s.reviews.push({ ...s.reviews[0], id: 'gone', synced: true });
  s.reviews.push({ ...s.reviews[0], id: 'local-only', synced: false });
  s.dirty.reviews = [keep.id];
  s.deleted.reviews = ['borrada'];
  mergeRemote(s, {
    reviews: [
      { id: keep.id, townId: 'pilas', scores: { comida: 1 }, updatedAt: keep.updatedAt + 10, mine: true },
      { id: 'nueva', townId: 'gines', scores: { gente: 4 }, updatedAt: 1, mine: false },
      { id: 'borrada', townId: 'gines', scores: { gente: 4 }, updatedAt: 1, mine: true },
    ],
  });
  const ids = s.reviews.map((r) => r.id).sort();
  assert.deepEqual(ids, [keep.id, 'local-only', 'nueva'].sort());
  assert.equal(s.reviews.find((r) => r.id === keep.id).scores.comida, 3);
  assert.equal(s.reviews.find((r) => r.id === 'nueva').synced, true);
});

test('normalizeState rechaza ids raros y pesos fuera de rango', () => {
  const s = normalizeState({
    reviews: [{ id: '../../x', townId: 'pilas', scores: { comida: 3 } }],
    weights: { comida: 9, gente: 2, precio: 1 },
  });
  assert.match(s.reviews[0].id, /^[\w-]+$/);
  assert.deepEqual(s.weights, { gente: 2 });
});

// ---------- Sincronización contra un Supabase simulado ----------

function fakeSupabase() {
  const db = { reviews: new Map(), places: new Map() };
  const tokens = new Map();
  const files = new Map();
  let n = 0;
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  async function fetchImpl(url, { method = 'GET', headers = {}, body } = {}) {
    const u = new URL(url);
    if (headers.apikey !== 'k'.repeat(30)) return json(401, { message: 'bad key' });
    if (u.pathname === '/auth/v1/signup') {
      const id = 'user-' + ++n;
      tokens.set('t' + n, id);
      return json(200, { access_token: 't' + n, refresh_token: 'r' + n, expires_in: 3600, user: { id } });
    }
    const user = tokens.get(String(headers.Authorization).replace('Bearer ', ''));
    if (!user) return json(401, { message: 'no auth' });
    const m = u.pathname.match(/^\/rest\/v1\/(reviews|places)$/);
    if (m) {
      const table = db[m[1]];
      if (method === 'GET') {
        const [from, to] = headers.Range.split('-').map(Number);
        return json(200, [...table.values()].sort((a, b) => a.id.localeCompare(b.id)).slice(from, to + 1));
      }
      if (method === 'POST') {
        const rows = JSON.parse(body);
        if (rows.some((r) => table.has(r.id) && table.get(r.id).user_id !== user)) return json(403, { message: 'RLS' });
        for (const r of rows) table.set(r.id, { ...r, user_id: user });
        return { ok: true, status: 201, json: async () => null };
      }
      if (method === 'DELETE') {
        const id = u.searchParams.get('id').replace('eq.', '');
        if (table.get(id)?.user_id === user) table.delete(id);
        return { ok: true, status: 204, json: async () => null };
      }
    }
    if (u.pathname.startsWith('/storage/v1/object/fotos/')) {
      const path = u.pathname.slice('/storage/v1/object/fotos/'.length);
      if (!path.startsWith(user + '/')) return json(403, { message: 'carpeta ajena' });
      files.set(path, body);
      return json(200, { Key: path });
    }
    return json(404, {});
  }
  return { fetchImpl, db, files };
}

const CFG = { url: 'https://demo.supabase.co', key: 'k'.repeat(30) };

test('validConfig', () => {
  assert.equal(validConfig(CFG), true);
  assert.equal(validConfig({ url: 'http://demo.supabase.co', key: CFG.key }), false);
  assert.equal(validConfig({ url: CFG.url, key: 'corta' }), false);
  assert.equal(validConfig(null), false);
});

test('dos móviles comparten valoraciones, sitios y fotos; cada uno solo edita lo suyo', async () => {
  const server = fakeSupabase();
  const ana = defaultState();
  const luis = defaultState();
  const sessions = {};
  const client = (who) => createSync({ ...CFG, session: sessions[who] }, {
    fetchImpl: server.fetchImpl, onSession: (s) => { sessions[who] = s; },
  });

  const r = rate(ana, 'carmona', { comida: 5 }, { author: 'Ana', photos: ['idb:foto1'] });
  upsertPlace(ana, { townId: 'carmona', name: 'Bar Goya', kind: 'comer', score: 5 });
  const res = await client('ana').sync(ana, { getPhoto: async (id) => (id === 'foto1' ? 'JPEGDATA' : null) });
  assert.equal(res.uploaded, 2);
  assert.equal(ana.dirty.reviews.length, 0);
  assert.equal(ana.reviews[0].synced, true);
  assert.match(ana.reviews[0].photos[0], /^https:\/\/demo\.supabase\.co\/storage\/v1\/object\/public\/fotos\/user-1\/foto1\.jpg$/);
  assert.equal(server.files.get('user-1/foto1.jpg'), 'JPEGDATA');

  rate(luis, 'carmona', { comida: 3 }, { author: 'Luis' });
  await client('luis').sync(luis);
  assert.equal(luis.reviews.length, 2);
  assert.equal(luis.places.length, 1);
  assert.equal(luis.reviews.find((x) => x.id === r.id).mine, false);
  assert.equal(townStats(luis, 'carmona').overall, 4);

  await client('ana').sync(ana);
  assert.equal(ana.reviews.length, 2);
  assert.equal(ana.reviews.find((x) => x.id === r.id).mine, true);

  // Ana borra su valoración: desaparece también en el móvil de Luis.
  deleteReview(ana, r.id);
  await client('ana').sync(ana);
  assert.equal(server.db.reviews.has(r.id), false);
  await client('luis').sync(luis);
  assert.deepEqual(luis.reviews.map((x) => x.author), ['Luis']);
});

test('si el servidor rechaza algo, se queda pendiente para el siguiente intento', async () => {
  const server = fakeSupabase();
  const s = defaultState();
  rate(s, 'osuna', { lugar: 5 });
  await assert.rejects(createSync({ ...CFG, key: 'x'.repeat(30) }, { fetchImpl: server.fetchImpl }).sync(s), /401/);
  assert.equal(s.dirty.reviews.length, 1);
  await assert.rejects(createSync(CFG, { fetchImpl: async () => { throw new TypeError('offline'); } }).sync(s), /Sin conexión/);
  assert.equal(s.dirty.reviews.length, 1);
});
