// Lógica pura de la app (sin DOM) para poder probarla con `node --test`.

export const STORAGE_KEY = 'aplicaciongym:v1';

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Objetivos de macros expresados en gramos por kg de peso corporal.
export function defaultState() {
  const types = [
    {
      id: 'pierna', name: 'Pierna', color: '#e4572e',
      perKg: { p: 2.2, c: 5.0, f: 0.9 },
      exercises: ['Sentadilla', 'Prensa', 'Peso muerto rumano', 'Zancadas', 'Curl femoral', 'Gemelos'],
    },
    {
      id: 'empuje', name: 'Empuje (pecho/hombro/tríceps)', color: '#f3a712',
      perKg: { p: 2.2, c: 4.0, f: 0.9 },
      exercises: ['Press banca', 'Press inclinado mancuernas', 'Press militar', 'Elevaciones laterales', 'Fondos', 'Extensión tríceps polea'],
    },
    {
      id: 'tiron', name: 'Tirón (espalda/bíceps)', color: '#29335c',
      perKg: { p: 2.2, c: 4.0, f: 0.9 },
      exercises: ['Dominadas', 'Remo con barra', 'Jalón al pecho', 'Remo en polea baja', 'Face pull', 'Curl bíceps'],
    },
    {
      id: 'full', name: 'Full body', color: '#669bbc',
      perKg: { p: 2.2, c: 4.5, f: 0.9 },
      exercises: ['Sentadilla', 'Press banca', 'Remo con barra', 'Press militar', 'Peso muerto'],
    },
    {
      id: 'cardio', name: 'Cardio / HIIT', color: '#43aa8b',
      perKg: { p: 2.0, c: 3.5, f: 0.8 },
      exercises: ['Cinta', 'Bicicleta', 'Remo ergómetro', 'HIIT 20 min', 'Abdominales'],
    },
    {
      id: 'descanso', name: 'Descanso', color: '#8d99ae',
      perKg: { p: 2.0, c: 2.0, f: 1.0 },
      exercises: ['Caminar', 'Estiramientos'],
    },
  ];
  return {
    version: 1,
    profile: { weight: 75 },
    types,
    // 0 = domingo ... 6 = sábado
    weekPlan: { 0: 'descanso', 1: 'empuje', 2: 'tiron', 3: 'pierna', 4: 'cardio', 5: 'full', 6: 'descanso' },
    foods: [
      { id: uid(), name: 'Pechuga de pollo (100 g)', p: 31, c: 0, f: 3.6 },
      { id: uid(), name: 'Arroz cocido (100 g)', p: 2.7, c: 28, f: 0.3 },
      { id: uid(), name: 'Huevo (1 ud)', p: 6.3, c: 0.4, f: 4.8 },
      { id: uid(), name: 'Avena (50 g)', p: 6.5, c: 33, f: 3.5 },
      { id: uid(), name: 'Whey (1 scoop)', p: 24, c: 3, f: 1.5 },
      { id: uid(), name: 'Plátano (1 ud)', p: 1.3, c: 27, f: 0.4 },
    ],
    logs: {},
  };
}

export function round(n, d = 0) {
  const m = 10 ** d;
  return Math.round((Number(n) || 0) * m) / m;
}

export function kcal({ p = 0, c = 0, f = 0 }) {
  return 4 * p + 4 * c + 9 * f;
}

export function targetsFor(type, weight) {
  if (!type) return { p: 0, c: 0, f: 0, kcal: 0 };
  const w = Number(weight) || 0;
  const t = {
    p: round(type.perKg.p * w),
    c: round(type.perKg.c * w),
    f: round(type.perKg.f * w),
  };
  t.kcal = round(kcal(t));
  return t;
}

export function totals(entries = []) {
  const t = entries.reduce(
    (acc, e) => {
      const q = Number(e.qty ?? 1) || 0;
      acc.p += (Number(e.p) || 0) * q;
      acc.c += (Number(e.c) || 0) * q;
      acc.f += (Number(e.f) || 0) * q;
      return acc;
    },
    { p: 0, c: 0, f: 0 },
  );
  t.p = round(t.p, 1);
  t.c = round(t.c, 1);
  t.f = round(t.f, 1);
  t.kcal = round(kcal(t));
  return t;
}

// Fecha local en formato YYYY-MM-DD (sin desfases por zona horaria).
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function findType(state, id) {
  return state.types.find((t) => t.id === id) || null;
}

// Tipo del día: el elegido manualmente en el registro o, si no, el del plan semanal.
export function typeIdForDate(state, key) {
  const log = state.logs[key];
  if (log && log.typeId && findType(state, log.typeId)) return log.typeId;
  const planned = state.weekPlan[parseKey(key).getDay()];
  return findType(state, planned) ? planned : state.types[0]?.id ?? null;
}

export function getLog(state, key) {
  return state.logs[key] || { typeId: null, entries: [], exercises: [] };
}

export function ensureLog(state, key) {
  if (!state.logs[key]) state.logs[key] = { typeId: null, entries: [], exercises: [] };
  return state.logs[key];
}

export function daySummary(state, key) {
  const type = findType(state, typeIdForDate(state, key));
  const log = getLog(state, key);
  const weight = log.weight ?? state.profile.weight;
  return {
    key,
    type,
    target: targetsFor(type, weight),
    eaten: totals(log.entries),
    exercisesDone: log.exercises.filter((e) => e.done).length,
    exercisesTotal: log.exercises.length,
  };
}

// Valida y completa un estado importado o cargado desde almacenamiento.
export function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = {
    version: 1,
    profile: { ...base.profile, ...(raw.profile || {}) },
    types: Array.isArray(raw.types) && raw.types.length ? raw.types : base.types,
    weekPlan: { ...base.weekPlan, ...(raw.weekPlan || {}) },
    foods: Array.isArray(raw.foods) ? raw.foods : base.foods,
    logs: raw.logs && typeof raw.logs === 'object' ? raw.logs : {},
  };
  s.types = s.types.map((t) => ({
    id: t.id || uid(),
    name: String(t.name || 'Sin nombre'),
    color: t.color || '#888888',
    perKg: { p: Number(t.perKg?.p) || 0, c: Number(t.perKg?.c) || 0, f: Number(t.perKg?.f) || 0 },
    exercises: Array.isArray(t.exercises) ? t.exercises.map(String) : [],
  }));
  for (const key of Object.keys(s.logs)) {
    const l = s.logs[key] || {};
    s.logs[key] = {
      ...l,
      typeId: l.typeId ?? null,
      entries: Array.isArray(l.entries) ? l.entries : [],
      exercises: Array.isArray(l.exercises) ? l.exercises : [],
    };
  }
  return s;
}
