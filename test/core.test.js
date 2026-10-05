import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, kcal, targetsFor, totals, dateKey, addDays,
  typeIdForDate, ensureLog, daySummary, normalizeState,
  scaleDiet, syncDiet, removeDiet, round,
  GOALS, newPhase, phaseFor, dayTargets, findType, weightFor, weightTrend, weightRate,
  estimateMaintenance, weeklyBaseKcal, calibrateTypes, adaptiveCheck, rateStatus, phaseAdvice,
  lastExercise, findExercise, ensureExercise, saveExercise, deleteExercise, dayExercise,
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

const DAY = '2026-10-05'; // lunes → empuje

test('sin fase (mantenimiento) los objetivos son los del tipo de entreno', () => {
  const s = defaultState();
  const type = findType(s, 'empuje');
  assert.deepEqual(dayTargets(s, type, DAY), targetsFor(type, 75));
});

test('volumen sube kcal y definición las baja subiendo la proteína', () => {
  const s = defaultState();
  const type = findType(s, 'empuje');
  const base = targetsFor(type, 75);
  s.phases.push(newPhase('volumen', '2026-10-01'));
  const vol = dayTargets(s, type, DAY);
  assert.ok(Math.abs(vol.kcal - base.kcal * 1.15) < 10, `${vol.kcal}`);
  assert.equal(vol.p, base.p);
  assert.ok(vol.c > base.c && vol.f >= base.f);

  s.phases.push(newPhase('definicion', '2026-10-03'));
  assert.equal(phaseFor(s, DAY).goal, 'definicion');
  assert.equal(phaseFor(s, '2026-10-02').goal, 'volumen');
  const cut = dayTargets(s, type, DAY);
  assert.ok(Math.abs(cut.kcal - base.kcal * 0.8) < 10, `${cut.kcal}`);
  assert.equal(cut.p, round(2.3 * 75));
  assert.ok(cut.f >= 0.6 * 75 - 0.5);
  assert.ok(cut.c < base.c);
});

test('el ciclado de carbohidratos se mantiene en cualquier fase', () => {
  const s = defaultState();
  s.phases.push(newPhase('definicion', '2026-01-01'));
  const pierna = dayTargets(s, findType(s, 'pierna'), DAY);
  const descanso = dayTargets(s, findType(s, 'descanso'), DAY);
  assert.ok(pierna.c > descanso.c * 1.5);
});

test('tendencia de peso suaviza fluctuaciones y se usa para los objetivos', () => {
  const s = defaultState();
  const ws = [80, 81.2, 79.6, 80.4, 80.9, 79.8, 80.3];
  ws.forEach((w, i) => { s.body[addDays('2026-09-01', i)] = { w }; });
  const tr = weightTrend(s, '2026-09-07');
  assert.equal(tr.length, 7);
  assert.ok(Math.abs(tr[6].trend - 80) < 0.5);
  assert.equal(weightFor(s, '2026-08-01'), 75); // antes de pesarse: peso del perfil
  assert.ok(Math.abs(weightFor(s, '2026-09-20') - tr[6].trend) < 0.11);
});

test('weightRate calcula kg/semana por regresión', () => {
  const s = defaultState();
  for (let i = 0; i < 21; i++) s.body[addDays('2026-09-01', i)] = { w: 80 - i * 0.1 };
  const r = weightRate(s, '2026-09-21');
  assert.ok(Math.abs(r.kgWeek + 0.7) < 0.01, `${r.kgWeek}`);
  assert.equal(weightRate(defaultState(), '2026-09-21'), null);
  s.phases.push(newPhase('definicion', '2026-09-01'));
  assert.equal(rateStatus(phaseFor(s, '2026-09-21'), r).level, 'ok');
  assert.equal(rateStatus(GOALS.volumen, r).level, 'warn');
});

test('mantenimiento estimado (Mifflin-St Jeor) y calibración de entrenos', () => {
  const s = defaultState();
  const m = estimateMaintenance({ weight: 75, height: 175, age: 30, sex: 'h', activity: 1.55 });
  assert.equal(m, round((750 + 1093.75 - 150 + 5) * 1.55));
  calibrateTypes(s, 2600);
  assert.ok(Math.abs(weeklyBaseKcal(s) - 2600) < 40, `${weeklyBaseKcal(s)}`);
  assert.equal(findType(s, 'pierna').perKg.p, 2.2);
});

test('ajuste adaptativo detecta un mantenimiento real distinto al previsto', () => {
  const s = defaultState();
  // 21 días comiendo exactamente lo planificado y perdiendo 0,5 kg/semana → mantenimiento real mayor.
  for (let i = 1; i <= 21; i++) {
    const k = addDays('2026-10-05', -i);
    s.body[k] = { w: 75 + (i * 0.5) / 7 };
    syncDiet(s, k, '2000-01-01');
  }
  const r = adaptiveCheck(s, '2026-10-05');
  assert.equal(r.ready, true);
  assert.ok(r.correction >= 400 && r.correction <= 500, `${r.correction}`);
  assert.equal(adaptiveCheck(defaultState(), '2026-10-05').ready, false);
});

test('avisos de fase: descanso de dieta tras muchas semanas de definición', () => {
  const s = defaultState();
  s.phases.push(newPhase('definicion', '2026-07-01'));
  assert.ok(phaseAdvice(s, DAY).some((t) => t.includes('descanso de dieta')));
  s.phases.push(newPhase('minicut', '2026-08-01'));
  assert.ok(phaseAdvice(s, DAY).some((t) => t.includes('máximo de 6')));
});

test('lastExercise devuelve la última marca registrada', () => {
  const s = defaultState();
  ensureLog(s, '2026-09-28').exercises.push({ name: 'Press banca', sets: 4, reps: 8, kg: 80 });
  ensureLog(s, '2026-10-01').exercises.push({ name: 'Press banca', sets: '', reps: '', kg: '' });
  const l = lastExercise(s, 'Press banca', DAY);
  assert.deepEqual([l.key, l.sets, l.reps, l.kg], ['2026-09-28', 4, 8, 80]);
  assert.equal(lastExercise(s, 'Sentadilla', DAY), null);
});

test('normalizeState migra el peso guardado en los días', () => {
  const s = normalizeState({ logs: { '2026-09-01': { weight: 82, entries: [] } } });
  assert.equal(s.body['2026-09-01'].w, 82);
  assert.equal(s.logs['2026-09-01'].weight, undefined);
  assert.deepEqual(s.phases, []);
});

test('la biblioteca trae los ejercicios de las rutinas con su grupo y tipo', () => {
  const s = defaultState();
  for (const t of s.types) for (const n of t.exercises) assert.ok(findExercise(s, n), n);
  assert.equal(findExercise(s, 'press banca').group, 'Pecho');
  assert.equal(findExercise(s, 'Cinta').kind, 'tiempo');
});

test('crear, renombrar y borrar ejercicios propios', () => {
  const s = defaultState();
  assert.equal(saveExercise(s, { name: 'Hip thrust', group: 'Femoral y glúteo', kind: 'peso', sets: 4, reps: 10, notes: 'Pausa arriba' }), null);
  assert.match(saveExercise(s, { name: 'hip thrust' }), /Ya existe/);
  assert.match(saveExercise(s, { name: '  ' }), /nombre/);
  const x = findExercise(s, 'Hip thrust');
  assert.equal(x.custom, true);

  findExercise(s, 'Hip thrust');
  findType(s, 'pierna').exercises.push('Hip thrust');
  ensureLog(s, '2026-09-28').exercises.push({ ...dayExercise(s, 'Hip thrust'), kg: 100, done: true });
  assert.equal(saveExercise(s, { ...x, name: 'Hip thrust con barra' }, x.id), null);
  assert.ok(findType(s, 'pierna').exercises.includes('Hip thrust con barra'));
  assert.equal(lastExercise(s, 'Hip thrust con barra', DAY).kg, 100);

  deleteExercise(s, x.id);
  assert.equal(findExercise(s, 'Hip thrust con barra'), null);
  assert.ok(!findType(s, 'pierna').exercises.includes('Hip thrust con barra'));
  assert.equal(s.logs['2026-09-28'].exercises.length, 1); // el historial se conserva
});

test('dayExercise usa los valores por defecto y ensureExercise crea los desconocidos', () => {
  const s = defaultState();
  const d = dayExercise(s, 'Press banca', true);
  assert.equal(d.sets, 4);
  assert.equal(d.reps, 8);
  assert.equal(dayExercise(s, 'Cinta').min, 20);
  const n = s.exercises.length;
  ensureExercise(s, 'Remo Kroc');
  assert.equal(s.exercises.length, n + 1);
  assert.equal(findExercise(s, 'remo kroc').group, 'Otro');
  // Una rutina cargada pero no hecha no cuenta como "última vez".
  ensureLog(s, '2026-10-01').exercises.push(dayExercise(s, 'Sentadilla', true));
  assert.equal(lastExercise(s, 'Sentadilla', DAY), null);
});

test('normalizeState crea la biblioteca para datos antiguos', () => {
  const s = normalizeState({ types: [{ id: 'x', name: 'X', perKg: { p: 2, c: 3, f: 1 }, exercises: ['Mi ejercicio raro'] }] });
  assert.ok(findExercise(s, 'Mi ejercicio raro'));
  assert.ok(findExercise(s, 'Sentadilla'));
});
