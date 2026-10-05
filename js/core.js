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
    profile: {
      weight: 75, sex: 'h', age: 30, height: 175, activity: 1.55,
      maintAdjust: 0, // corrección del mantenimiento (kcal/día) calculada con tus datos reales
    },
    phases: [], // historial de fases: volumen, definición...
    body: {}, // { 'YYYY-MM-DD': { w, waist, bf } }
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
  return {
    key,
    type,
    phase: phaseFor(state, key),
    weight: weightFor(state, key),
    target: dayTargets(state, type, key),
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
    phases: Array.isArray(raw.phases) ? raw.phases.filter((ph) => GOALS[ph?.goal] && ph.start) : [],
    body: raw.body && typeof raw.body === 'object' ? { ...raw.body } : {},
  };
  for (const [k, l] of Object.entries(s.logs)) {
    if (l && Number(l.weight) > 0 && !s.body[k]?.w) s.body[k] = { ...(s.body[k] || {}), w: Number(l.weight) };
    if (l) delete l.weight;
  }
  s.phases.sort((a, b) => a.start.localeCompare(b.start));
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
  const { type, target } = daySummary(state, key);
  return JSON.stringify([type?.id, target, type?.autoScale, type?.diet]);
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

// ---------- Fases (objetivos) ----------
// Valores basados en la evidencia:
//  - Volumen: superávit ~10-20 % y ganar ~0,25-0,5 % del peso/semana; proteína 1,6-2,2 g/kg;
//    grasa 0,5-1,5 g/kg; resto carbohidratos (Iraki et al., 2019).
//  - Definición: perder ~0,5-1 % del peso/semana; proteína alta (2,3-3,1 g/kg de masa magra);
//    grasa 15-30 % de las kcal (Helms et al., 2014; ISSN 2017).
//  - Proteína >1,6 g/kg apenas aporta más músculo en mantenimiento/superávit (Morton et al., 2018).
export const GOALS = {
  mantenimiento: {
    name: 'Mantenimiento', kcalPct: 0, protein: 1.8, minFat: 0.7, rate: 0,
    desc: 'Mantener el peso. Ideal entre fases o para centrarse en el rendimiento.',
  },
  volumen_limpio: {
    name: 'Volumen limpio', kcalPct: 8, protein: 1.8, minFat: 0.7, rate: 0.25,
    desc: 'Superávit pequeño para ganar músculo acumulando poca grasa. Recomendado si ya tienes experiencia.',
  },
  volumen: {
    name: 'Volumen', kcalPct: 15, protein: 1.8, minFat: 0.7, rate: 0.5,
    desc: 'Superávit moderado para ganar músculo más rápido. Recomendado para principiantes o si estás delgado.',
  },
  definicion: {
    name: 'Definición', kcalPct: -20, protein: 2.3, minFat: 0.6, rate: -0.7,
    desc: 'Déficit para perder grasa manteniendo el músculo. Proteína alta y no bajes de 0,5-1 %/semana.',
  },
  minicut: {
    name: 'Mini-cut', kcalPct: -30, protein: 2.5, minFat: 0.5, rate: -1, maxWeeks: 6,
    desc: 'Déficit agresivo y corto (2-6 semanas) para quitar grasa acumulada en un volumen.',
  },
  recomposicion: {
    name: 'Recomposición', kcalPct: -5, protein: 2.2, minFat: 0.7, rate: 0,
    desc: 'Ganar músculo y perder grasa a la vez manteniendo el peso. Funciona mejor en principiantes o tras un parón.',
  },
  descanso_dieta: {
    name: 'Descanso de dieta', kcalPct: 0, protein: 2.0, minFat: 0.7, rate: 0, maxWeeks: 2,
    desc: '1-2 semanas en mantenimiento durante una definición larga para recuperar energía y adherencia.',
  },
};

const DEFAULT_PHASE = { id: 'default', goal: 'mantenimiento', start: '0000-01-01', ...GOALS.mantenimiento };

export function newPhase(goal, start, extra = {}) {
  const g = GOALS[goal];
  return {
    id: uid(), goal, start,
    kcalPct: g.kcalPct, protein: g.protein, minFat: g.minFat, rate: g.rate,
    targetWeight: null, ...extra,
  };
}

export function phaseFor(state, key) {
  let found = null;
  for (const ph of state.phases || []) if (ph.start <= key) found = ph;
  return found || DEFAULT_PHASE;
}

export function phaseName(ph) {
  return GOALS[ph.goal]?.name ?? ph.goal;
}

export function weeksInPhase(ph, key) {
  if (ph.id === 'default') return 0;
  return Math.floor((parseKey(key) - parseKey(ph.start)) / (7 * 864e5));
}

// ---------- Peso y tendencia ----------

export const KCAL_PER_KG = 7700;

export function bodyEntries(state) {
  return Object.entries(state.body || {})
    .filter(([, b]) => Number(b?.w) > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

// Media móvil exponencial (α = 0,1 por día): suaviza agua, sal, digestión...
export function weightTrend(state, until = dateKey()) {
  const entries = bodyEntries(state);
  if (!entries.length) return [];
  const byKey = Object.fromEntries(entries);
  const out = [];
  let trend = null;
  const last = entries[entries.length - 1][0] > until ? entries[entries.length - 1][0] : until;
  for (let k = entries[0][0]; k <= last; k = addDays(k, 1)) {
    const w = byKey[k]?.w ? Number(byKey[k].w) : null;
    if (w != null) trend = trend == null ? w : trend + 0.1 * (w - trend);
    out.push({ key: k, weight: w, trend: round(trend, 2) });
  }
  return out;
}

// Peso a usar para los objetivos de un día: tendencia en esa fecha, o el del perfil.
export function weightFor(state, key) {
  const series = weightTrend(state, key);
  const point = [...series].reverse().find((d) => d.key <= key);
  return point ? round(point.trend, 1) : Number(state.profile.weight) || 0;
}

// Pendiente (kg/semana) por regresión lineal de los pesos de los últimos `days` días.
export function weightRate(state, until = dateKey(), days = 21) {
  const from = addDays(until, -days);
  const pts = bodyEntries(state).filter(([k]) => k > from && k <= until)
    .map(([k, b]) => [(parseKey(k) - parseKey(from)) / 864e5, Number(b.w)]);
  if (pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 7) return null;
  const n = pts.length;
  const mx = pts.reduce((a, [x]) => a + x, 0) / n;
  const my = pts.reduce((a, [, y]) => a + y, 0) / n;
  const num = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
  const den = pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  const perDay = den ? num / den : 0;
  return { kgWeek: round(perDay * 7, 2), pctWeek: round((perDay * 7 / my) * 100, 2), points: n };
}

// ---------- Objetivos del día ----------

// Mifflin-St Jeor × factor de actividad.
export function estimateMaintenance(profile) {
  const { weight = 0, height = 0, age = 0, sex = 'h', activity = 1.55 } = profile;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? -161 : 5);
  return round(bmr * activity);
}

// Kcal base media de la semana según el plan de entrenos (= tu mantenimiento previsto).
export function weeklyBaseKcal(state, weight = state.profile.weight) {
  let sum = 0;
  for (let d = 0; d < 7; d++) sum += targetsFor(findType(state, state.weekPlan[d]), weight).kcal;
  return round(sum / 7);
}

// Macros del día: base del tipo de entreno (mantenimiento) + corrección de mantenimiento,
// y después la fase: ±% de kcal, proteína mínima y grasa mínima; el resto se reparte entre
// carbohidratos y grasas en la misma proporción que la base (conserva el ciclado de carbos).
export function dayTargets(state, type, key, phase = phaseFor(state, key)) {
  if (!type) return { p: 0, c: 0, f: 0, kcal: 0 };
  const w = weightFor(state, key);
  const base = targetsFor(type, w);
  const maint = Math.max(0, base.kcal + (Number(state.profile.maintAdjust) || 0));
  const kcalT = maint * (1 + (Number(phase.kcalPct) || 0) / 100);
  const p = Math.max(base.p, (Number(phase.protein) || 0) * w);
  const rest = Math.max(0, kcalT - 4 * p);
  const cK = 4 * base.c;
  const fK = 9 * base.f;
  const fatShare = cK + fK > 0 ? fK / (cK + fK) : 0.3;
  const f = Math.max((rest * fatShare) / 9, (Number(phase.minFat) || 0) * w);
  const c = Math.max(0, (rest - 9 * f) / 4);
  const t = { p: round(p), c: round(c), f: round(f) };
  t.kcal = round(kcal(t));
  return t;
}

// Recalcula los g/kg de carbos y grasas de todos los entrenos para que la media semanal
// coincida con `maintenance` (la proteína no cambia).
export function calibrateTypes(state, maintenance, weight = state.profile.weight) {
  let sumP = 0;
  let sumCF = 0;
  for (let d = 0; d < 7; d++) {
    const t = targetsFor(findType(state, state.weekPlan[d]), weight);
    sumP += 4 * t.p;
    sumCF += 4 * t.c + 9 * t.f;
  }
  if (!(sumCF > 0)) return 1;
  const k = (7 * maintenance - sumP) / sumCF;
  for (const t of state.types) {
    t.perKg.c = round(Math.max(0, t.perKg.c * k), 1);
    t.perKg.f = round(Math.max(0.3, t.perKg.f * k), 2);
  }
  state.profile.maintAdjust = 0;
  return k;
}

// Mantenimiento real estimado con tu ingesta registrada y la evolución de tu peso
// (como hacen las apps "adaptativas"): mantenimiento ≈ ingesta media − cambio de peso × 7700.
export function adaptiveCheck(state, until = dateKey(), days = 21) {
  const rate = weightRate(state, until, days);
  if (!rate) return { ready: false, reason: 'Necesito al menos 4 pesajes repartidos en 7 días o más.' };
  const logged = [];
  for (let i = 1; i <= days; i++) {
    const k = addDays(until, -i);
    const l = state.logs[k];
    if (l?.entries?.length) logged.push(k);
  }
  if (logged.length < 10) {
    return { ready: false, rate, reason: `Necesito al menos 10 días con comidas registradas (llevas ${logged.length}).` };
  }
  const intake = logged.reduce((a, k) => a + totals(state.logs[k].entries).kcal, 0) / logged.length;
  const planned = logged.reduce((a, k) => {
    const type = findType(state, typeIdForDate(state, k));
    return a + targetsFor(type, weightFor(state, k)).kcal + (Number(state.profile.maintAdjust) || 0);
  }, 0) / logged.length;
  const realMaint = intake - (rate.kgWeek / 7) * KCAL_PER_KG;
  const correction = Math.max(-500, Math.min(500, realMaint - planned));
  return {
    ready: true,
    rate,
    intake: round(intake),
    planned: round(planned),
    realMaint: round(realMaint),
    correction: Math.round(correction / 50) * 50,
    days: logged.length,
  };
}

// Valora el ritmo frente al objetivo de la fase.
export function rateStatus(phase, rate) {
  if (!rate) return null;
  const target = Number(phase.rate) || 0;
  const diff = rate.pctWeek - target;
  const tol = Math.max(0.15, Math.abs(target) * 0.35);
  if (Math.abs(diff) <= tol) return { level: 'ok', text: 'Vas al ritmo previsto.' };
  if (target < 0) {
    return diff < 0
      ? { level: 'warn', text: 'Estás perdiendo peso más rápido de lo recomendado: riesgo de perder músculo.' }
      : { level: 'warn', text: 'Pierdes peso más despacio de lo previsto.' };
  }
  if (target > 0) {
    return diff > 0
      ? { level: 'warn', text: 'Estás ganando peso más rápido de lo previsto: probablemente acumulando grasa extra.' }
      : { level: 'warn', text: 'Ganas peso más despacio de lo previsto.' };
  }
  return { level: 'warn', text: diff > 0 ? 'Estás subiendo de peso.' : 'Estás bajando de peso.' };
}

// Avisos de la fase actual (descansos de dieta, duración, peso objetivo...).
export function phaseAdvice(state, key = dateKey()) {
  const ph = phaseFor(state, key);
  const weeks = weeksInPhase(ph, key);
  const out = [];
  const g = GOALS[ph.goal];
  if (g?.maxWeeks && weeks >= g.maxWeeks) {
    out.push(`Llevas ${weeks} semanas en ${g.name}; se recomienda un máximo de ${g.maxWeeks}. Plantéate cambiar de fase.`);
  }
  if (ph.goal === 'definicion' && weeks >= 10) {
    out.push(`Llevas ${weeks} semanas en definición. Un descanso de dieta de 1-2 semanas en mantenimiento ayuda a recuperar energía, rendimiento y adherencia.`);
  }
  if ((ph.goal === 'volumen' || ph.goal === 'volumen_limpio') && weeks >= 20) {
    out.push(`Llevas ${weeks} semanas de volumen. Si has acumulado bastante grasa, valora un mini-cut o una definición.`);
  }
  const tw = Number(ph.targetWeight);
  if (tw > 0) {
    const w = weightFor(state, key);
    const reached = (ph.rate < 0 && w <= tw) || (ph.rate > 0 && w >= tw);
    if (reached) out.push(`¡Has llegado a tu peso objetivo (${tw} kg)! Valora pasar a mantenimiento.`);
  }
  return out;
}

// ---------- Ejercicios: sobrecarga progresiva ----------

export function lastExercise(state, name, beforeKey) {
  const keys = Object.keys(state.logs).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const x = state.logs[k].exercises?.find((e) => e.name === name && (e.kg !== '' || e.reps !== '' || e.sets !== ''));
    if (x) return { key: k, sets: x.sets, reps: x.reps, kg: x.kg };
  }
  return null;
}

// Agua recomendada: ~35 ml por kg de peso (más si sudas mucho).
export function waterTarget(weight) {
  return Math.round((weight * 35) / 250) * 250;
}
