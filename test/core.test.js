import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, kcal, targetsFor, totals, dateKey, addDays,
  typeIdForDate, ensureLog, daySummary, normalizeState,
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
