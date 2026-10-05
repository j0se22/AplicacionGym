import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, kcal, targetsFor, totals, dateKey, addDays,
  typeIdForDate, ensureLog, daySummary, normalizeState,
  scaleDiet, syncDiet, removeDiet, round,
} from '../js/core.js';

test('kcal usa 4/4/9', () => {
  assert.equal(kcal({ p: 10, c: 10, f: 10 }), 170);
});

test('targetsFor escala por peso corporal', () => {
  const t = targetsFor({ perKg: { p: 2, c: 4, f: 1 } }, 80);
  assert.deepEqual(t, { p: 160, c: 320, f: 80, kcal: 2640 });
});

test('totals suma entradas con cantidad', () => {
  const t = totals([
    { p: 31, c: 0, f: 3.6, qty: 2 },
    { p: 2.7, c: 28, f: 0.3 },
  ]);
  assert.equal(t.p, 64.7);
  assert.equal(t.c, 28);
  assert.equal(t.f, 7.5);
});

test('dateKey/addDays cruzan meses', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('el tipo de día sale del plan semanal salvo que se sobrescriba', () => {
  const s = defaultState();
  // 2026-10-05 es lunes → empuje
  assert.equal(typeIdForDate(s, '2026-10-05'), 'empuje');
  ensureLog(s, '2026-10-05').typeId = 'pierna';
  assert.equal(typeIdForDate(s, '2026-10-05'), 'pierna');
  assert.equal(daySummary(s, '2026-10-05').type.name, 'Pierna');
});

test('normalizeState repara datos incompletos', () => {
  const s = normalizeState({ profile: { weight: 90 }, logs: { '2026-01-01': {} } });
  assert.equal(s.profile.weight, 90);
  assert.ok(s.types.length > 0);
  assert.deepEqual(s.logs['2026-01-01'].entries, []);
  assert.deepEqual(normalizeState(null).profile, defaultState().profile);
});

test('cada tipo trae una dieta por defecto', () => {
  const s = defaultState();
  for (const t of s.types) assert.ok(t.diet.length >= 8, t.id);
});

test('scaleDiet acerca la dieta al objetivo del tipo de entreno', () => {
  const s = defaultState();
  for (const t of s.types) {
    const target = targetsFor(t, 75);
    const got = totals(scaleDiet(t.diet, target));
    for (const m of ['p', 'c', 'f']) {
      const err = Math.abs(got[m] - target[m]) / target[m];
      assert.ok(err < 0.12, `${t.id} ${m}: ${got[m]} vs ${target[m]}`);
    }
  }
});

test('scaleDiet redondea a cantidades razonables', () => {
  const s = defaultState();
  const items = scaleDiet(s.types[0].diet, targetsFor(s.types[0], 90));
  for (const it of items) {
    if (it.size) assert.equal(round(it.qty * it.size) % 5, 0, it.name);
    else assert.equal((it.qty * 2) % 1, 0, it.name);
  }
});

test('syncDiet rellena hoy, no los días pasados, y se adapta al tipo de día', () => {
  const s = defaultState();
  const today = '2026-10-05'; // lunes → empuje
  assert.equal(syncDiet(s, '2026-10-04', today), false);
  assert.equal(s.logs['2026-10-04'], undefined);

  assert.equal(syncDiet(s, today, today), true);
  const kcalEmpuje = daySummary(s, today).eaten.kcal;
  assert.ok(Math.abs(kcalEmpuje - daySummary(s, today).target.kcal) / kcalEmpuje < 0.08);
  assert.equal(syncDiet(s, today, today), false);

  // Una comida extra se conserva al cambiar el tipo de día.
  s.logs[today].entries.push({ id: 'x', name: 'Helado', p: 4, c: 30, f: 10, qty: 1 });
  s.logs[today].typeId = 'pierna';
  assert.equal(syncDiet(s, today, today), true);
  assert.ok(daySummary(s, today).eaten.kcal > kcalEmpuje);
  assert.ok(s.logs[today].entries.some((e) => e.name === 'Helado'));

  // Si editas la dieta del día, ya no se recalcula sola.
  s.logs[today].dietLocked = true;
  s.logs[today].typeId = 'descanso';
  assert.equal(syncDiet(s, today, today), false);

  // Quitar la dieta deja solo las comidas añadidas.
  removeDiet(s, today);
  assert.deepEqual(s.logs[today].entries.map((e) => e.name), ['Helado']);
  assert.equal(syncDiet(s, today, today), false);
});

test('normalizeState añade dietas a tipos antiguos', () => {
  const s = normalizeState({ types: [{ id: 'pierna', name: 'Pierna', perKg: { p: 2, c: 4, f: 1 } }] });
  assert.ok(s.types[0].diet.length > 0);
  assert.equal(s.types[0].autoScale, true);
});
