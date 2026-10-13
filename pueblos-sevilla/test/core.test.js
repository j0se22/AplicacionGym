import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOWNS, findTown, fold, defaultState, normalizeState, townStats, ranking, searchTowns,
  upsertReview, deleteReview, mergeImport, reviewScore, shareText,
} from '../js/core.js';

const rate = (state, townId, scores, extra = {}) => upsertReview(state, { townId, scores, ...extra });

test('están los 106 municipios de la provincia, sin repetir', () => {
  assert.equal(TOWNS.length, 106);
  assert.equal(new Set(TOWNS.map((t) => t.id)).size, 106);
  assert.equal(findTown('ecija').name, 'Écija');
  assert.equal(findTown('el-palmar-de-troya').comarca, 'Bajo Guadalquivir');
});

test('la búsqueda ignora tildes y mayúsculas', () => {
  assert.equal(fold('ÉCIJA'), 'ecija');
  assert.deepEqual(searchTowns('ecija').map((t) => t.name), ['Écija']);
  assert.ok(searchTowns('', { comarca: 'Sierra Norte' }).every((t) => t.comarca === 'Sierra Norte'));
});

test('el orden alfabético ignora los artículos', () => {
  const names = TOWNS.map((t) => t.name);
  assert.ok(names.indexOf('El Viso del Alcor') > names.indexOf('Villanueva del Río y Minas'));
  assert.ok(names.indexOf('La Algaba') > names.indexOf('Albaida del Aljarafe'));
  assert.ok(names.indexOf('La Algaba') < names.indexOf('Algámitas'));
});

test('una valoración necesita al menos un aspecto válido', () => {
  const s = defaultState();
  assert.equal(rate(s, 'osuna', {}), null);
  assert.equal(rate(s, 'osuna', { comida: 9 }), null);
  assert.equal(rate(s, 'no-existe', { comida: 4 }), null);
  const r = rate(s, 'osuna', { comida: 4, lugar: 0, gente: 5 });
  assert.deepEqual(r.scores, { comida: 4, gente: 5 });
  assert.equal(s.marks.osuna, 'visitado');
});

test('medias por aspecto y nota global por visita', () => {
  const s = defaultState();
  rate(s, 'carmona', { comida: 5, lugar: 5, gente: 2 }); // media 4
  rate(s, 'carmona', { comida: 3 }); // media 3
  const st = townStats(s, 'carmona');
  assert.equal(st.count, 2);
  assert.equal(st.overall, 3.5);
  assert.deepEqual(st.byCat.comida, { avg: 4, count: 2 });
  assert.deepEqual(st.byCat.lugar, { avg: 5, count: 1 });
  assert.equal(st.byCat.precio, null);
  assert.equal(townStats(s, 'estepa').overall, null);
});

test('ranking por aspecto y comarca; empate → más votos', () => {
  const s = defaultState();
  rate(s, 'carmona', { comida: 4 });
  rate(s, 'osuna', { comida: 4 });
  rate(s, 'osuna', { comida: 4 });
  rate(s, 'ecija', { comida: 5, lugar: 1 });
  assert.deepEqual(ranking(s, 'comida').map((r) => r.town.id), ['ecija', 'osuna', 'carmona']);
  assert.deepEqual(ranking(s, 'global').map((r) => r.town.id), ['osuna', 'carmona', 'ecija']);
  assert.deepEqual(ranking(s, 'lugar').map((r) => r.town.id), ['ecija']);
  assert.deepEqual(ranking(s, 'comida', 'Los Alcores').map((r) => r.town.id), ['carmona']);
});

test('editar y borrar valoraciones', () => {
  const s = defaultState();
  const r = rate(s, 'lebrija', { comida: 2 });
  rate(s, 'lebrija', { comida: 5 }, { id: r.id });
  assert.equal(s.reviews.length, 1);
  assert.equal(reviewScore(s.reviews[0]), 5);
  deleteReview(s, r.id);
  assert.equal(s.reviews.length, 0);
});

test('importar suma las valoraciones de otro sin duplicar', () => {
  const mine = defaultState();
  const a = rate(mine, 'utrera', { comida: 3 });
  const friend = normalizeState(JSON.parse(JSON.stringify(mine)));
  friend.reviews[0] = { ...friend.reviews[0], scores: { comida: 5 }, updatedAt: a.updatedAt + 1 };
  rate(friend, 'marchena', { gente: 4 }, { author: 'Luis' });
  friend.marks.estepa = 'pendiente';

  const res = mergeImport(mine, friend);
  assert.deepEqual(res, { added: 1, updated: 1 });
  assert.equal(mine.reviews.length, 2);
  assert.equal(townStats(mine, 'utrera').overall, 5);
  assert.equal(mine.marks.estepa, 'pendiente');
  assert.deepEqual(mergeImport(mine, friend), { added: 0, updated: 0 });
});

test('normalizeState descarta datos corruptos', () => {
  const s = normalizeState({ reviews: [null, { townId: 'x' }, { townId: 'pilas', scores: { comida: '4' } }], marks: { pilas: 'raro', gines: 'pendiente' } });
  assert.equal(s.reviews.length, 1);
  assert.deepEqual(s.marks, { gines: 'pendiente' });
  assert.deepEqual(normalizeState('basura'), defaultState());
});

test('texto para compartir', () => {
  const s = defaultState();
  rate(s, 'constantina', { naturaleza: 5, comida: 4 });
  const text = shareText(s, 'constantina');
  assert.match(text, /^Constantina \(Sierra Norte\): ★★★★★ 4.5\/5/);
  assert.match(text, /Naturaleza y entorno: 5\/5/);
});
