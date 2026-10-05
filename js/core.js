// Lógica pura de la app (sin DOM) para poder probarla con `node --test`.

export const STORAGE_KEY = 'aplicaciongym:v1';

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const MEALS = ['Desayuno', 'Comida', 'Merienda', 'Cena', 'Extra'];

// Alimentos base. Macros por ración: `size` gramos/ml (`unit`) o, sin `size`, por unidad.
export const CATALOG = {
  pollo: { name: 'Pechuga de pollo', size: 100, unit: 'g', p: 31, c: 0, f: 3.6 },
  pavo: { name: 'Pechuga de pavo', size: 100, unit: 'g', p: 29, c: 0, f: 1.7 },
  ternera: { name: 'Ternera magra', size: 100, unit: 'g', p: 21, c: 0, f: 5 },
  salmon: { name: 'Salmón', size: 100, unit: 'g', p: 20, c: 0, f: 13 },
  merluza: { name: 'Merluza', size: 100, unit: 'g', p: 17, c: 0, f: 1.5 },
  huevo: { name: 'Huevo', p: 6.3, c: 0.4, f: 4.8 },
  whey: { name: 'Proteína whey', size: 30, unit: 'g', p: 24, c: 2.4, f: 1.5 },
  yogur: { name: 'Yogur griego 0%', size: 125, unit: 'g', p: 11, c: 5, f: 0.5 },
  leche: { name: 'Leche semidesnatada', size: 100, unit: 'ml', p: 3.3, c: 4.8, f: 1.6 },
  avena: { name: 'Copos de avena', size: 100, unit: 'g', p: 13.5, c: 59, f: 7 },
  arroz: { name: 'Arroz cocido', size: 100, unit: 'g', p: 2.7, c: 28, f: 0.3 },
  pasta: { name: 'Pasta cocida', size: 100, unit: 'g', p: 5.8, c: 31, f: 0.9 },
  patata: { name: 'Patata cocida', size: 100, unit: 'g', p: 2, c: 17, f: 0.1 },
  quinoa: { name: 'Quinoa cocida', size: 100, unit: 'g', p: 4.4, c: 21, f: 1.9 },
  tostada: { name: 'Tostada de pan integral', p: 3.5, c: 13, f: 1 },
  platano: { name: 'Plátano', p: 1.3, c: 27, f: 0.4 },
  manzana: { name: 'Manzana', p: 0.3, c: 19, f: 0.2 },
  verduras: { name: 'Verduras variadas', size: 100, unit: 'g', p: 2, c: 5, f: 0.3 },
  aceite: { name: 'Aceite de oliva', size: 10, unit: 'g', p: 0, c: 0, f: 10 },
  nueces: { name: 'Nueces', size: 100, unit: 'g', p: 15, c: 7, f: 65 },
  aguacate: { name: 'Aguacate', size: 100, unit: 'g', p: 2, c: 2, f: 15 },
};

// Cantidades base: gramos/ml para alimentos con `size`, unidades para el resto.
const DIET_TEMPLATES = {
  entreno: {
    Desayuno: [['avena', 70], ['leche', 250], ['platano', 1], ['whey', 30]],
    Comida: [['arroz', 250], ['pollo', 150], ['verduras', 200], ['aceite', 10]],
    Merienda: [['yogur', 125], ['nueces', 20], ['manzana', 1]],
    Cena: [['patata', 250], ['salmon', 150], ['verduras', 150], ['aceite', 10]],
  },
  pierna: {
    Desayuno: [['avena', 80], ['leche', 250], ['platano', 1], ['whey', 30]],
    Comida: [['pasta', 300], ['pollo', 150], ['verduras', 150], ['aceite', 10]],
    Merienda: [['yogur', 125], ['nueces', 20], ['platano', 1]],
    Cena: [['arroz', 200], ['pavo', 150], ['verduras', 150], ['aceite', 10]],
  },
  descanso: {
    Desayuno: [['huevo', 3], ['tostada', 2], ['aguacate', 50]],
    Comida: [['ternera', 150], ['quinoa', 150], ['verduras', 200], ['aceite', 10]],
    Merienda: [['yogur', 125], ['nueces', 30]],
    Cena: [['merluza', 200], ['verduras', 200], ['patata', 150], ['aceite', 10]],
  },
};

const TYPE_TEMPLATE = { pierna: 'pierna', descanso: 'descanso' };

export function dietItem(food, meal, amount) {
  const qty = food.size ? amount / food.size : amount;
  const item = { id: uid(), meal, name: food.name, p: food.p, c: food.c, f: food.f, qty };
  if (food.size) Object.assign(item, { size: food.size, unit: food.unit || 'g' });
  return item;
}

export function defaultDiet(typeId) {
  const tpl = DIET_TEMPLATES[TYPE_TEMPLATE[typeId] || 'entreno'];
  return Object.entries(tpl).flatMap(([meal, items]) => items.map(([k, amount]) => dietItem(CATALOG[k], meal, amount)));
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
  for (const t of types) {
    t.diet = defaultDiet(t.id);
    t.autoScale = true;
  }
  return {
    version: 1,
    profile: { weight: 75 },
    types,
    // 0 = domingo ... 6 = sábado
    weekPlan: { 0: 'descanso', 1: 'empuje', 2: 'tiron', 3: 'pierna', 4: 'cardio', 5: 'full', 6: 'descanso' },
    foods: Object.values(CATALOG).map((f) => ({ id: uid(), ...f })),
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
    diet: Array.isArray(t.diet) ? t.diet : defaultDiet(t.id),
    autoScale: t.autoScale !== false,
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

// ---------- Dieta por defecto ----------

// Cantidad mostrada de una entrada: "180 g", "250 ml" o "×2".
export function amountLabel(e) {
  const q = Number(e.qty ?? 1);
  if (e.size) return `${round(q * e.size)} ${e.unit || 'g'}`;
  return q === 1 ? '' : `×${round(q, 2)}`;
}

// Macro que más calorías aporta a un alimento (proteína, carbohidrato o grasa).
export function dominantMacro({ p = 0, c = 0, f = 0 }) {
  const k = { p: 4 * p, c: 4 * c, f: 9 * f };
  return Object.keys(k).reduce((a, b) => (k[b] > k[a] ? b : a));
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const k = M[r][col] / M[col][col];
      for (let j = col; j <= n; j++) M[r][j] -= k * M[col][j];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

function roundQty(item, qty) {
  if (item.size) {
    const amount = qty * item.size;
    const step = amount >= 100 ? 10 : 5;
    return Math.max(step, Math.round(amount / step) * step) / item.size;
  }
  return Math.max(0.5, Math.round(qty * 2) / 2);
}

// Ajusta las cantidades para acercarse al objetivo de P/C/G. Agrupa los alimentos
// por su macro dominante y busca un multiplicador por grupo (mínimos cuadrados
// sobre el error relativo de cada macro).
export function scaleDiet(items, target) {
  if (!items.length || !(target.kcal > 0)) return items.map((it) => ({ ...it }));
  const macros = ['p', 'c', 'f'];
  const sums = { p: { p: 0, c: 0, f: 0 }, c: { p: 0, c: 0, f: 0 }, f: { p: 0, c: 0, f: 0 } };
  for (const it of items) {
    const g = sums[dominantMacro(it)];
    const q = Number(it.qty ?? 1);
    for (const m of macros) g[m] += (Number(it[m]) || 0) * q;
  }
  const groups = macros.filter((g) => kcal(sums[g]) > 0);
  const w = Object.fromEntries(macros.map((m) => [m, 1 / Math.max(target[m], 1) ** 2]));
  const A = groups.map((gi) => groups.map((gj) => macros.reduce((a, m) => a + w[m] * sums[gi][m] * sums[gj][m], 0)));
  const b = groups.map((gi) => macros.reduce((a, m) => a + w[m] * sums[gi][m] * target[m], 0));
  const sol = solveLinear(A, b);
  const factor = { p: 1, c: 1, f: 1 };
  const uniform = target.kcal / kcal(totals(items));
  groups.forEach((g, i) => {
    const k = sol && Number.isFinite(sol[i]) ? sol[i] : uniform;
    factor[g] = Math.min(4, Math.max(0.25, k));
  });
  return items.map((it) => ({ ...it, qty: roundQty(it, Number(it.qty ?? 1) * factor[dominantMacro(it)]) }));
}

export function dietForDay(state, key) {
  const type = findType(state, typeIdForDate(state, key));
  if (!type) return [];
  const { target } = daySummary(state, key);
  const items = type.autoScale ? scaleDiet(type.diet, target) : type.diet;
  return items.map((it) => ({ ...it, id: uid(), diet: true }));
}

function dietSignature(state, key) {
  const type = findType(state, typeIdForDate(state, key));
  const log = getLog(state, key);
  return JSON.stringify([type?.id, log.weight ?? state.profile.weight, type?.perKg, type?.autoScale, type?.diet]);
}

// Pone (o recalcula) la dieta del día, conservando las comidas añadidas a mano.
export function applyDiet(state, key) {
  const log = ensureLog(state, key);
  log.entries = [...dietForDay(state, key), ...log.entries.filter((e) => !e.diet)];
  log.dietSig = dietSignature(state, key);
  log.dietLocked = false;
  log.dietOff = false;
  return log;
}

export function removeDiet(state, key) {
  const log = ensureLog(state, key);
  log.entries = log.entries.filter((e) => !e.diet);
  log.dietSig = null;
  log.dietLocked = false;
  log.dietOff = true;
  return log;
}

// Llamar al abrir un día. Rellena hoy y los días futuros con la dieta por defecto y
// la mantiene al día (si cambias el tipo de entreno, el peso o la dieta) mientras no
// la hayas editado. Los días pasados no se tocan. Devuelve true si cambió algo.
export function syncDiet(state, key, today = dateKey()) {
  const log = state.logs[key];
  if (!log) {
    if (key < today) return false;
    applyDiet(state, key);
    return true;
  }
  if (log.dietOff || log.dietLocked) return false;
  if (log.dietSig == null) {
    if (key < today || log.entries.length) return false;
    applyDiet(state, key);
    return true;
  }
  if (log.dietSig !== dietSignature(state, key)) {
    applyDiet(state, key);
    return true;
  }
  return false;
}
