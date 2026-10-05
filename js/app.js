import {
  STORAGE_KEY, WEEKDAYS, uid, round, kcal, targetsFor, totals, dateKey, parseKey, addDays,
  findType, typeIdForDate, getLog, ensureLog, daySummary, normalizeState, defaultState,
  MEALS, amountLabel, syncDiet, applyDiet, removeDiet, dietItem, defaultDiet, scaleDiet,
  GOALS, newPhase, phaseFor, phaseName, weeksInPhase, dayTargets, weightFor, weightTrend, weightRate,
  estimateMaintenance, weeklyBaseKcal, calibrateTypes, adaptiveCheck, rateStatus, phaseAdvice,
  lastExercise, waterTarget, bodyEntries,
} from './core.js';

// ---------- Estado y persistencia ----------

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultState();
  }
}

let state = load();
let tab = 'hoy';
let currentDay = dateKey();
let historyRange = 14;
const openDiets = new Set(); // dietas desplegadas en la pestaña Entrenos

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    alert('No se pudieron guardar los datos: ' + err.message);
  }
}

function commit() {
  save();
  render();
}

// ---------- Utilidades de vista ----------

const $view = document.getElementById('view');
const $dialog = document.getElementById('dialog');
const $dialogForm = document.getElementById('dialog-form');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const fmtDate = (key) => parseKey(key).toLocaleDateString('es-ES', {
  weekday: 'long', day: 'numeric', month: 'long',
});
const fmtShort = (key) => parseKey(key).toLocaleDateString('es-ES', {
  weekday: 'short', day: '2-digit', month: '2-digit',
});

function typeBadge(type) {
  if (!type) return '<span class="muted">—</span>';
  return `<span class="badge" style="background:${esc(type.color)}">${esc(type.name)}</span>`;
}

function typeOptions(selectedId) {
  return state.types
    .map((t) => `<option value="${esc(t.id)}" ${t.id === selectedId ? 'selected' : ''}>${esc(t.name)}</option>`)
    .join('');
}

function macroBar(label, eaten, target, color, unit = 'g') {
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
  const over = target > 0 && eaten > target * 1.05;
  const left = round(target - eaten);
  return `
    <div class="macro">
      <div class="label">
        <span><span class="dot" style="background:${color}"></span> ${label}</span>
        <span><b>${round(eaten)}</b> / ${target} ${unit}
          <span class="muted">· ${left >= 0 ? `faltan ${left}` : `+${-left}`}</span></span>
      </div>
      <div class="bar ${over ? 'over' : ''}"><i style="width:${pct}%;background:${color}"></i></div>
    </div>`;
}

// ---------- Vista: Día ----------

function entryRow(e, i) {
  const t = totals([e]);
  const amount = amountLabel(e);
  return `
    <li>
      <div class="grow">
        <div class="name">${esc(e.name)}${amount ? ` <span class="muted">${esc(amount)}</span>` : ''}${e.diet ? ' <span class="tag">dieta</span>' : ''}</div>
        <div class="muted small">P ${t.p} · C ${t.c} · G ${t.f} · ${t.kcal} kcal</div>
      </div>
      <button class="icon" data-action="edit-entry" data-i="${i}" title="Editar">✏️</button>
      <button class="icon danger" data-action="del-entry" data-i="${i}" title="Borrar">✕</button>
    </li>`;
}

function mealsList(entries) {
  const byMeal = new Map(MEALS.map((m) => [m, []]));
  entries.forEach((e, i) => {
    const m = byMeal.has(e.meal) ? e.meal : 'Extra';
    byMeal.get(m).push([e, i]);
  });
  return [...byMeal].filter(([, list]) => list.length).map(([meal, list]) => `
    <div class="meal">
      <div class="row between meal-head">
        <h3>${esc(meal)}</h3>
        <span class="muted small">${totals(list.map(([e]) => e)).kcal} kcal</span>
      </div>
      <ul class="list">${list.map(([e, i]) => entryRow(e, i)).join('')}</ul>
    </div>`).join('');
}

function renderDay() {
  const key = currentDay;
  if (syncDiet(state, key)) save();
  const log = getLog(state, key);
  const typeId = typeIdForDate(state, key);
  const type = findType(state, typeId);
  const plannedId = state.weekPlan[parseKey(key).getDay()];
  const { target, eaten, phase, weight } = daySummary(state, key);
  const isToday = key === dateKey();
  const bodyToday = state.body[key] || {};
  const advice = isToday ? phaseAdvice(state, key) : [];
  const water = Number(log.water) || 0;
  const waterGoal = waterTarget(weight);

  const hasDiet = log.entries.some((e) => e.diet);
  const dietNote = hasDiet
    ? `<p class="muted small">${log.dietLocked
      ? 'Has modificado la dieta de este día, así que ya no se recalcula sola.'
      : `Dieta por defecto de <b>${esc(type?.name ?? '')}</b>${type?.autoScale ? ', ajustada a tus macros' : ''}. Borra lo que no comas y añade los extras.`}</p>
       <div class="row">
         <button class="small-btn" data-action="apply-diet">↺ Recalcular dieta</button>
         <button class="small-btn" data-action="remove-diet">Quitar dieta</button>
       </div>`
    : `<p class="muted small">Este día no tiene dieta por defecto.</p>
       <button class="small-btn" data-action="apply-diet" ${type?.diet.length ? '' : 'disabled'}>Poner dieta de ${esc(type?.name ?? '')}</button>`;

  const exercises = log.exercises.map((x, i) => `
    <li class="${x.done ? 'done' : ''}">
      <input type="checkbox" data-action="toggle-ex" data-i="${i}" ${x.done ? 'checked' : ''} aria-label="Hecho">
      <div class="grow">
        <div class="name">${esc(x.name)}</div>
        ${lastHint(x.name, key)}
        <div class="ex-sets">
          <input type="number" min="0" inputmode="numeric" placeholder="series" value="${esc(x.sets ?? '')}" data-field="sets" data-i="${i}" aria-label="Series">×
          <input type="number" min="0" inputmode="numeric" placeholder="reps" value="${esc(x.reps ?? '')}" data-field="reps" data-i="${i}" aria-label="Repeticiones">
          <input type="number" min="0" step="0.5" inputmode="decimal" placeholder="kg" value="${esc(x.kg ?? '')}" data-field="kg" data-i="${i}" aria-label="Kilos"><span class="muted small">kg</span>
        </div>
      </div>
      <button class="icon danger" data-action="del-ex" data-i="${i}" title="Quitar">✕</button>
    </li>`).join('');

  const remaining = {
    p: Math.max(0, round(target.p - eaten.p)),
    c: Math.max(0, round(target.c - eaten.c)),
    f: Math.max(0, round(target.f - eaten.f)),
  };

  return `
    <div class="datebar">
      <button class="icon" data-action="day-prev" aria-label="Día anterior">◀</button>
      <div class="date">${esc(fmtDate(key))}${isToday ? ' <span class="muted">(hoy)</span>' : ''}</div>
      <button class="icon" data-action="day-next" aria-label="Día siguiente">▶</button>
    </div>
    ${isToday ? '' : '<p style="text-align:center;margin-top:-6px"><button data-action="day-today">Ir a hoy</button></p>'}

    <section class="card">
      <div class="row between">
        <label class="grow">Tipo de entrenamiento
          <select data-action="set-day-type">${typeOptions(typeId)}</select>
        </label>
        <label>Peso en ayunas
          <input type="number" min="20" step="0.1" inputmode="decimal" placeholder="${esc(weight)}" value="${esc(bodyToday.w ?? '')}" data-action="set-day-weight" aria-label="Peso en ayunas (kg)">
        </label>
      </div>
      <p class="muted small">
        ${log.typeId && log.typeId !== plannedId
          ? `Cambiado manualmente (el plan semanal decía ${esc(findType(state, plannedId)?.name ?? '—')}). <button class="icon small" data-action="reset-day-type">Volver al plan</button>`
          : 'Según tu plan semanal.'}
        · Peso de referencia (tendencia): <b>${esc(weight)} kg</b>
      </p>
    </section>
    ${advice.map((a) => `<div class="notice">💡 ${esc(a)}</div>`).join('')}

    <section class="card">
      <div class="row between">
        <h2>Macros del día</h2>
        <div class="row" style="gap:4px;justify-content:flex-end">${phaseBadge(phase)}${typeBadge(type)}</div>
      </div>
      <div class="row between" style="margin-bottom:10px">
        <div><span class="kcal-big">${eaten.kcal}</span> <span class="muted">/ ${target.kcal} kcal</span></div>
        <div class="muted small" style="text-align:right">Restante: P ${remaining.p} g · C ${remaining.c} g · G ${remaining.f} g</div>
      </div>
      <div class="macros">
        ${macroBar('Proteína', eaten.p, target.p, 'var(--p)')}
        ${macroBar('Carbohidratos', eaten.c, target.c, 'var(--c)')}
        ${macroBar('Grasas', eaten.f, target.f, 'var(--f)')}
        ${macroBar('Calorías', eaten.kcal, target.kcal, 'var(--accent)', 'kcal')}
      </div>
    </section>

    <section class="card">
      <div class="row between">
        <h2>Comidas</h2>
        <button class="primary" data-action="add-entry">+ Añadir</button>
      </div>
      ${dietNote}
      ${log.entries.length ? mealsList(log.entries) : '<div class="empty">Aún no has registrado comidas.</div>'}
    </section>

    <section class="card">
      <div class="row between">
        <h2>💧 Agua</h2>
        <span><b>${round(water / 1000, 2)}</b> / ${round(waterGoal / 1000, 2)} L</span>
      </div>
      <div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, (water / waterGoal) * 100)}%;background:#4cc9f0"></i></div>
      <div class="row">
        <button data-action="water" data-ml="250">+ Vaso (250 ml)</button>
        <button data-action="water" data-ml="500">+ 500 ml</button>
        <button class="icon" data-action="water" data-ml="-250" ${water ? '' : 'disabled'} aria-label="Quitar 250 ml">−</button>
      </div>
    </section>

    <section class="card">
      <div class="row between">
        <h2>Ejercicios</h2>
        <button data-action="load-routine" ${type?.exercises.length ? '' : 'disabled'}>Cargar rutina de ${esc(type?.name ?? '')}</button>
      </div>
      ${exercises ? `<ul class="list">${exercises}</ul>` : '<div class="empty">Sin ejercicios. Carga la rutina del tipo de día o añade uno.</div>'}
      <div class="row" style="margin-top:10px">
        <input class="grow" list="ex-suggestions" placeholder="Añadir ejercicio…" id="new-ex">
        <datalist id="ex-suggestions">${allExerciseNames().map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <button data-action="add-ex">Añadir</button>
      </div>
    </section>`;
}

function lastHint(name, key) {
  const l = lastExercise(state, name, key);
  if (!l) return '';
  const parts = [l.sets && l.reps ? `${l.sets}×${l.reps}` : l.reps ? `${l.reps} reps` : '', l.kg !== '' ? `${l.kg} kg` : ''].filter(Boolean);
  return `<div class="muted small">Última vez (${esc(fmtShort(l.key))}): ${esc(parts.join(' · ') || '—')}. ¡Intenta superarla!</div>`;
}

function phaseBadge(ph) {
  const pct = Number(ph.kcalPct) || 0;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '±';
  return `<span class="badge phase">${esc(phaseName(ph))} ${sign}${Math.abs(pct)}%</span>`;
}

function allExerciseNames() {
  return [...new Set(state.types.flatMap((t) => t.exercises))].sort((a, b) => a.localeCompare(b, 'es'));
}

// ---------- Vista: Semana ----------

function renderWeek() {
  const today = dateKey();
  const monday = addDays(today, -((parseKey(today).getDay() + 6) % 7));
  let sum = 0;
  const rows = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const k = addDays(monday, i);
    const d = parseKey(k).getDay();
    const type = findType(state, state.weekPlan[d]);
    const t = dayTargets(state, type, k);
    sum += t.kcal;
    return `
      <div class="day">
        <b>${WEEKDAYS[d]}</b>
        <div class="row">
          <span class="dot" style="background:${esc(type?.color ?? '#888')}"></span>
          <select class="grow" data-action="set-plan" data-day="${d}">${typeOptions(state.weekPlan[d])}</select>
          <span class="muted small" style="width:5.5em;text-align:right">${t.kcal} kcal</span>
        </div>
      </div>`;
  }).join('');
  const ph = phaseFor(state, today);

  return `
    <section class="card">
      <h2>Plan semanal</h2>
      <p class="muted">Elige qué entrenas cada día. Los macros se calculan con el tipo de entreno, tu peso (${esc(weightFor(state, today))} kg) y tu fase actual: ${phaseBadge(ph)}</p>
      <div class="week">${rows}</div>
      <p class="muted" style="margin-top:12px">Media esta semana: <b>${round(sum / 7)} kcal/día</b> · Mantenimiento previsto: ${weeklyBaseKcal(state, weightFor(state, today)) + (Number(state.profile.maintAdjust) || 0)} kcal/día</p>
    </section>`;
}

// ---------- Vista: Tipos de entrenamiento ----------

function dietEditor(t, target) {
  const scaled = t.autoScale ? scaleDiet(t.diet, target) : t.diet;
  const tot = totals(scaled);
  const rows = MEALS.map((meal) => {
    const items = t.diet.map((it, i) => [it, i]).filter(([it]) => (it.meal || 'Extra') === meal);
    if (!items.length) return '';
    return `
      <h4>${meal}</h4>
      <ul class="list">${items.map(([it, i]) => `
        <li>
          <div class="grow">${esc(it.name)}${t.autoScale ? ` <span class="muted small">→ ${esc(amountLabel(scaled[i]) || '×1')}</span>` : ''}</div>
          <input type="number" min="0" step="any" inputmode="decimal" value="${round(it.size ? it.qty * it.size : it.qty, 2)}"
            data-type="${esc(t.id)}" data-i="${i}" data-dfield="amount" aria-label="Cantidad">
          <span class="muted small unit">${esc(it.size ? it.unit || 'g' : 'ud')}</span>
          <button class="icon danger" data-action="del-diet-item" data-type="${esc(t.id)}" data-i="${i}" aria-label="Quitar">✕</button>
        </li>`).join('')}
      </ul>`;
  }).join('');

  return `
    <details class="diet" data-type="${esc(t.id)}" ${openDiets.has(t.id) ? 'open' : ''}>
      <summary><b>Dieta por defecto</b> <span class="muted small">· ${t.diet.length} alimentos · ${tot.kcal} kcal</span></summary>
      <label class="check">
        <input type="checkbox" data-action="set-autoscale" data-type="${esc(t.id)}" ${t.autoScale ? 'checked' : ''}>
        Ajustar cantidades a mis macros automáticamente
      </label>
      <p class="muted small">
        ${t.autoScale ? 'Cantidades base (a la izquierda) y ajustadas a tu objetivo (→).' : 'Se usan exactamente estas cantidades.'}
        Total: P ${round(tot.p)} · C ${round(tot.c)} · G ${round(tot.f)} g · <b>${tot.kcal}</b> / ${target.kcal} kcal
      </p>
      ${rows || '<div class="empty">Sin alimentos.</div>'}
      <div class="diet-add">
        <select data-dnew="meal" aria-label="Comida">${MEALS.map((m) => `<option>${m}</option>`).join('')}</select>
        <select data-dnew="food" class="grow" aria-label="Alimento">
          ${state.foods.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}
        </select>
        <input type="number" min="0" step="any" inputmode="decimal" placeholder="cant." data-dnew="amount" aria-label="Cantidad">
        <button data-action="add-diet-item" data-type="${esc(t.id)}">Añadir</button>
      </div>
      <p class="muted small">Cantidad en g/ml (o unidades). Para alimentos nuevos, créalos en Ajustes → Mis alimentos.</p>
      <button class="small-btn" data-action="reset-diet" data-type="${esc(t.id)}">Restaurar dieta original</button>
    </details>`;
}

function renderTypes() {
  const today = dateKey();
  const w = weightFor(state, today);
  const ph = phaseFor(state, today);
  const cards = state.types.map((t) => {
    const base = targetsFor(t, w);
    const g = dayTargets(state, t, today, ph);
    return `
      <section class="card">
        <div class="row">
          <input type="color" value="${esc(t.color)}" data-type="${esc(t.id)}" data-tfield="color" aria-label="Color">
          <input class="grow" value="${esc(t.name)}" data-type="${esc(t.id)}" data-tfield="name" aria-label="Nombre">
          <button class="icon danger" data-action="del-type" data-type="${esc(t.id)}" title="Eliminar tipo">🗑</button>
        </div>
        <h3>Macros en mantenimiento (g por kg de peso)</h3>
        <div class="row">
          <label>Proteína<input type="number" min="0" step="0.1" value="${t.perKg.p}" data-type="${esc(t.id)}" data-tfield="p"></label>
          <label>Carbos<input type="number" min="0" step="0.1" value="${t.perKg.c}" data-type="${esc(t.id)}" data-tfield="c"></label>
          <label>Grasas<input type="number" min="0" step="0.1" value="${t.perKg.f}" data-type="${esc(t.id)}" data-tfield="f"></label>
        </div>
        <p class="muted small">Mantenimiento con ${esc(w)} kg: P ${base.p} · C ${base.c} · G ${base.f} g · ${base.kcal} kcal</p>
        <p class="small">En tu fase (${esc(phaseName(ph))}): P ${g.p} · C ${g.c} · G ${g.f} g · <b>${g.kcal} kcal</b></p>
        ${dietEditor(t, g)}
        <h3>Ejercicios</h3>
        <div class="chips">
          ${t.exercises.map((x, i) => `<span class="chip">${esc(x)}<button data-action="del-type-ex" data-type="${esc(t.id)}" data-i="${i}" aria-label="Quitar">✕</button></span>`).join('') || '<span class="muted small">Ninguno</span>'}
        </div>
        <div class="row" style="margin-top:8px">
          <input class="grow" placeholder="Nuevo ejercicio" data-newex="${esc(t.id)}">
          <button data-action="add-type-ex" data-type="${esc(t.id)}">Añadir</button>
        </div>
      </section>`;
  }).join('');

  return `
    <p class="muted">Cada tipo de entrenamiento tiene sus propios objetivos de macros, su dieta por defecto y su lista de ejercicios.</p>
    ${cards}
    <button class="primary" data-action="add-type" style="width:100%">+ Nuevo tipo de entrenamiento</button>`;
}

// ---------- Vista: Progreso ----------

const ACTIVITY = [
  [1.2, 'Sedentaria (sin ejercicio)'],
  [1.375, 'Ligera (1-3 días/semana)'],
  [1.55, 'Moderada (3-5 días/semana)'],
  [1.725, 'Alta (6-7 días/semana)'],
  [1.9, 'Muy alta (doble sesión o trabajo físico)'],
];

function setBody(key, field, value) {
  const v = Number(value);
  const b = { ...(state.body[key] || {}) };
  if (v > 0) b[field] = v;
  else delete b[field];
  if (Object.keys(b).length) state.body[key] = b;
  else delete state.body[key];
  if (field === 'w' && v > 0) {
    const last = bodyEntries(state).at(-1);
    if (last && last[0] === key) state.profile.weight = v;
  }
}

function weightChart(series, phases) {
  const pts = series.slice(-90);
  if (pts.filter((d) => d.weight != null).length < 2) {
    return '<div class="empty">Pésate varios días (mejor en ayunas, tras ir al baño) para ver la gráfica.</div>';
  }
  const W = 340; const H = 160; const P = 28;
  const vals = pts.flatMap((d) => [d.weight, d.trend]).filter((v) => v != null);
  let min = Math.min(...vals); let max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const x = (i) => P + (i / Math.max(1, pts.length - 1)) * (W - P - 6);
  const y = (v) => 8 + (1 - (v - min) / (max - min)) * (H - 28);
  const line = pts.map((d, i) => (d.trend != null ? `${x(i).toFixed(1)},${y(d.trend).toFixed(1)}` : '')).filter(Boolean).join(' ');
  const dots = pts.map((d, i) => (d.weight != null ? `<circle cx="${x(i).toFixed(1)}" cy="${y(d.weight).toFixed(1)}" r="2.4" class="dot-w"/>` : '')).join('');
  const marks = phases.map((ph) => {
    const i = pts.findIndex((d) => d.key === ph.start);
    return i < 0 ? '' : `<line x1="${x(i)}" x2="${x(i)}" y1="4" y2="${H - 20}" class="phase-line"/><text x="${x(i) + 3}" y="14" class="axis">${esc(phaseName(ph))}</text>`;
  }).join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Evolución del peso">
      <text x="2" y="${y(max) + 4}" class="axis">${round(max, 1)}</text>
      <text x="2" y="${y(min) + 4}" class="axis">${round(min, 1)}</text>
      <line x1="${P}" x2="${W}" y1="${y(max)}" y2="${y(max)}" class="grid"/>
      <line x1="${P}" x2="${W}" y1="${y(min)}" y2="${y(min)}" class="grid"/>
      ${marks}${dots}
      <polyline points="${line}" class="trend"/>
      <text x="${P}" y="${H - 4}" class="axis">${esc(fmtShort(pts[0].key))}</text>
      <text x="${W}" y="${H - 4}" class="axis" text-anchor="end">${esc(fmtShort(pts.at(-1).key))}</text>
    </svg>
    <p class="muted small">Puntos: pesajes · Línea: tendencia (filtra agua, sal y digestión).</p>`;
}

function renderProgress() {
  const today = dateKey();
  const ph = phaseFor(state, today);
  const goal = GOALS[ph.goal];
  const weeks = weeksInPhase(ph, today);
  const w = weightFor(state, today);
  const series = weightTrend(state, today);
  const rate = weightRate(state, today);
  const status = rateStatus(ph, rate);
  const adapt = adaptiveCheck(state, today);
  const adj = Number(state.profile.maintAdjust) || 0;
  const formula = estimateMaintenance({ ...state.profile, weight: w });
  const planned = weeklyBaseKcal(state, w) + adj;
  const b = state.body[today] || {};
  const isDefault = ph.id === 'default';
  const rateKg = round((w * (Number(ph.rate) || 0)) / 100, 2);
  const advice = phaseAdvice(state, today);

  const phaseFields = isDefault ? '' : `
    <details class="diet">
      <summary>Ajustes de esta fase</summary>
      <div class="row" style="margin-top:8px">
        <label>Kcal (%)<input type="number" step="1" value="${esc(ph.kcalPct)}" data-action="phase-field" data-id="${esc(ph.id)}" data-field="kcalPct"></label>
        <label>Proteína g/kg<input type="number" step="0.1" min="0" value="${esc(ph.protein)}" data-action="phase-field" data-id="${esc(ph.id)}" data-field="protein"></label>
        <label>Grasa mín. g/kg<input type="number" step="0.1" min="0" value="${esc(ph.minFat)}" data-action="phase-field" data-id="${esc(ph.id)}" data-field="minFat"></label>
        <label>Ritmo %/sem<input type="number" step="0.05" value="${esc(ph.rate)}" data-action="phase-field" data-id="${esc(ph.id)}" data-field="rate"></label>
        <label>Peso objetivo<input type="number" step="0.1" min="0" value="${esc(ph.targetWeight ?? '')}" placeholder="kg" data-action="phase-field" data-id="${esc(ph.id)}" data-field="targetWeight"></label>
      </div>
    </details>`;

  const history = [...state.phases].reverse().map((p) => `
    <li>
      <div class="grow"><b>${esc(phaseName(p))}</b> <span class="muted small">desde ${esc(fmtShort(p.start))} · ${p.kcalPct > 0 ? '+' : ''}${esc(p.kcalPct)}% kcal${p.targetWeight ? ` · objetivo ${esc(p.targetWeight)} kg` : ''}</span></div>
      <button class="icon danger" data-action="del-phase" data-id="${esc(p.id)}" aria-label="Borrar fase">✕</button>
    </li>`).join('');

  const recent = bodyEntries(state).slice(-8).reverse().map(([k, v]) => `
    <tr><td>${esc(fmtShort(k))}</td><td class="num">${esc(v.w)}</td><td class="num">${esc(v.waist ?? '')}</td><td class="num">${esc(v.bf ?? '')}</td></tr>`).join('');

  let adaptHtml;
  if (!adapt.ready) {
    adaptHtml = `<p class="muted small">${esc(adapt.reason)} Registra lo que comes y pésate casi a diario: tras 2-3 semanas la app calcula tu mantenimiento real.</p>`;
  } else {
    adaptHtml = `
      <p class="small">Últimos ${adapt.days} días registrados: comes <b>${adapt.intake}</b> kcal de media y tu peso cambia <b>${adapt.rate.kgWeek > 0 ? '+' : ''}${adapt.rate.kgWeek} kg/sem</b>.
        Tu mantenimiento real ronda <b>${adapt.realMaint} kcal</b> (la app suponía ${adapt.planned}).</p>
      ${Math.abs(adapt.correction) >= 100
        ? `<button class="primary" data-action="apply-adapt" data-kcal="${adapt.correction}">${adapt.correction > 0 ? 'Subir' : 'Bajar'} ${Math.abs(adapt.correction)} kcal/día mis objetivos</button>`
        : '<p class="small">✅ Tus objetivos están bien calibrados.</p>'}`;
  }

  return `
    <section class="card">
      <div class="row between"><h2>Fase actual</h2>${phaseBadge(ph)}</div>
      <p class="small">${esc(goal?.desc ?? '')}</p>
      <p class="muted small">${isDefault ? 'No has elegido fase: se usa mantenimiento.' : `Desde el ${esc(fmtDate(ph.start))} · semana ${weeks + 1}`}
        · Ritmo objetivo: <b>${ph.rate > 0 ? '+' : ''}${esc(ph.rate)}%/sem</b> (${rateKg > 0 ? '+' : ''}${rateKg} kg/sem)
        · Proteína ≥ ${esc(ph.protein)} g/kg</p>
      ${advice.map((a) => `<div class="notice">💡 ${esc(a)}</div>`).join('')}
      ${phaseFields}
      <h3>Cambiar de fase</h3>
      <div class="row">
        <select id="ph-goal" class="grow" data-action="ph-goal-preview">
          ${Object.entries(GOALS).map(([id, g]) => `<option value="${id}" ${id === (isDefault ? 'volumen_limpio' : ph.goal) ? 'selected' : ''}>${esc(g.name)} (${g.kcalPct > 0 ? '+' : ''}${g.kcalPct}%)</option>`).join('')}
        </select>
      </div>
      <p class="muted small" id="ph-desc">${esc(GOALS[isDefault ? 'volumen_limpio' : ph.goal].desc)}</p>
      <div class="row">
        <label>Empieza<input type="date" id="ph-start" value="${today}"></label>
        <label>Peso objetivo (opcional)<input type="number" id="ph-target" step="0.1" min="0" placeholder="kg"></label>
      </div>
      <button class="primary" data-action="start-phase" style="margin-top:10px;width:100%">Empezar fase</button>
      ${history ? `<h3>Historial de fases</h3><ul class="list">${history}</ul>` : ''}
    </section>

    <section class="card">
      <h2>Peso y medidas</h2>
      <div class="row">
        <label>Peso hoy (kg)<input type="number" step="0.1" min="20" inputmode="decimal" value="${esc(b.w ?? '')}" data-action="set-body" data-field="w"></label>
        <label>Cintura (cm)<input type="number" step="0.5" min="0" inputmode="decimal" value="${esc(b.waist ?? '')}" data-action="set-body" data-field="waist"></label>
        <label>% grasa<input type="number" step="0.1" min="0" inputmode="decimal" value="${esc(b.bf ?? '')}" data-action="set-body" data-field="bf"></label>
      </div>
      <p class="small" style="margin-top:10px">Tendencia: <b>${esc(w)} kg</b>
        ${rate ? ` · Ritmo (3 semanas): <b>${rate.kgWeek > 0 ? '+' : ''}${rate.kgWeek} kg/sem</b> (${rate.pctWeek > 0 ? '+' : ''}${rate.pctWeek}%)` : ''}</p>
      ${status ? `<div class="notice ${status.level}">${status.level === 'ok' ? '✅' : '⚠️'} ${esc(status.text)}</div>` : ''}
      ${weightChart(series, state.phases)}
      ${recent ? `<h3>Últimos registros</h3><table><thead><tr><th>Fecha</th><th class="num">Peso</th><th class="num">Cintura</th><th class="num">% grasa</th></tr></thead><tbody>${recent}</tbody></table>` : ''}
    </section>

    <section class="card">
      <h2>Tu mantenimiento</h2>
      <p class="small">Según la fórmula (Mifflin-St Jeor): <b>${formula} kcal</b> · Según tus entrenos: <b>${planned} kcal</b>${adj ? ` (incluye ${adj > 0 ? '+' : ''}${adj} de ajuste)` : ''}</p>
      <h3>Ajuste con tus datos reales</h3>
      ${adaptHtml}
      ${adj ? '<button class="small-btn" data-action="reset-adjust" style="margin-top:8px">Quitar ajuste</button>' : ''}
      <p class="muted small">Completa tu perfil (edad, altura, actividad) en Ajustes para afinar la fórmula.</p>
    </section>`;
}

// ---------- Vista: Historial ----------

function renderHistory() {
  const today = dateKey();
  const days = [];
  for (let i = 0; i < historyRange; i++) days.push(addDays(today, -i));
  const summaries = days.map((k) => daySummary(state, k));
  const logged = summaries.filter((s) => state.logs[s.key]?.entries.length);

  const avg = (fn) => (logged.length ? round(logged.reduce((a, s) => a + fn(s), 0) / logged.length) : 0);

  const rows = summaries.map((s) => {
    const has = state.logs[s.key]?.entries.length;
    const pct = s.target.kcal ? round((s.eaten.kcal / s.target.kcal) * 100) : 0;
    return `
      <tr data-action="goto-day" data-key="${s.key}" style="cursor:pointer">
        <td class="nowrap">${esc(fmtShort(s.key))}</td>
        <td><span class="dot" style="background:${esc(s.type?.color ?? '#888')}"></span> ${esc(s.type?.name ?? '—')}</td>
        <td class="num">${has
          ? `${s.eaten.kcal}<span class="muted">/${s.target.kcal}</span> <b>${pct}%</b>
             <div class="muted small">P${round(s.eaten.p)} C${round(s.eaten.c)} G${round(s.eaten.f)}</div>`
          : '<span class="muted">—</span>'}</td>
        <td class="num">${s.exercisesTotal ? `${s.exercisesDone}/${s.exercisesTotal}` : ''}</td>
      </tr>`;
  }).join('');

  return `
    <section class="card">
      <div class="row between">
        <h2>Historial</h2>
        <select data-action="history-range">
          ${[7, 14, 30, 90].map((n) => `<option value="${n}" ${n === historyRange ? 'selected' : ''}>${n} días</option>`).join('')}
        </select>
      </div>
      <p class="muted">Días registrados: <b>${logged.length}</b> · Media: ${avg((s) => s.eaten.kcal)} kcal ·
        P ${avg((s) => s.eaten.p)} g · C ${avg((s) => s.eaten.c)} g · G ${avg((s) => s.eaten.f)} g ·
        Cumplimiento kcal ${avg((s) => (s.target.kcal ? (s.eaten.kcal / s.target.kcal) * 100 : 0))}%</p>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Fecha</th><th>Entreno</th><th class="num">kcal</th><th class="num">Ej.</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="muted small">Toca un día para abrirlo.</p>
    </section>`;
}

// ---------- Vista: Ajustes ----------

function renderSettings() {
  const foods = state.foods.map((f) => `
    <li>
      <div class="grow">
        <div>${esc(f.name)}</div>
        <div class="muted small">${f.size ? `${f.size} ${esc(f.unit || 'g')}` : '1 ud'}: P ${f.p} · C ${f.c} · G ${f.f} · ${round(kcal(f))} kcal</div>
      </div>
      <button class="icon danger" data-action="del-food" data-id="${esc(f.id)}">✕</button>
    </li>`).join('');

  return `
    <section class="card">
      <h2>Perfil</h2>
      <div class="row">
        <label>Peso (kg)<input type="number" min="20" step="0.1" inputmode="decimal" value="${esc(state.profile.weight)}" data-action="set-weight"></label>
        <label>Sexo
          <select data-action="profile" data-field="sex">
            <option value="h" ${state.profile.sex !== 'm' ? 'selected' : ''}>Hombre</option>
            <option value="m" ${state.profile.sex === 'm' ? 'selected' : ''}>Mujer</option>
          </select>
        </label>
        <label>Edad<input type="number" min="10" max="100" value="${esc(state.profile.age)}" data-action="profile" data-field="age"></label>
        <label>Altura (cm)<input type="number" min="100" max="250" value="${esc(state.profile.height)}" data-action="profile" data-field="height"></label>
      </div>
      <label style="margin-top:8px">Actividad
        <select data-action="profile" data-field="activity">
          ${ACTIVITY.map(([v, l]) => `<option value="${v}" ${Number(state.profile.activity) === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <p class="small" style="margin-top:10px">Mantenimiento estimado: <b>${estimateMaintenance(state.profile)} kcal/día</b> ·
        Tus entrenos suman de media ${weeklyBaseKcal(state)} kcal/día.</p>
      <button data-action="calibrate">Ajustar mis entrenos a este mantenimiento</button>
      <p class="muted small">Recalcula los carbohidratos y grasas de cada tipo de entreno (la proteína no cambia) para que la media semanal sea tu mantenimiento. Después, la fase (volumen, definición...) suma o resta sobre eso.
        Si te pesas a menudo, la pestaña Progreso afinará el mantenimiento con tus datos reales.</p>
    </section>

    <section class="card">
      <h2>Mis alimentos</h2>
      <p class="muted small">Alimentos para añadir rápido y para montar tus dietas por defecto.</p>
      ${foods ? `<ul class="list">${foods}</ul>` : '<div class="empty">No hay alimentos guardados.</div>'}
      <button data-action="new-food" style="margin-top:8px">+ Nuevo alimento</button>
    </section>

    <section class="card">
      <h2>Copia de seguridad</h2>
      <p class="muted small">Los datos se guardan en este navegador. Exporta un archivo para no perderlos o pasarlos a otro dispositivo.</p>
      <div class="row">
        <button data-action="export">Exportar JSON</button>
        <button data-action="import">Importar JSON</button>
        <button class="danger" data-action="reset">Borrar todo</button>
      </div>
      <input type="file" accept="application/json,.json" id="import-file" hidden>
    </section>`;
}

// ---------- Diálogo de comida ----------

function defaultMeal() {
  const h = new Date().getHours();
  if (currentDay !== dateKey()) return 'Extra';
  if (h < 11) return 'Desayuno';
  if (h < 16) return 'Comida';
  if (h < 19) return 'Merienda';
  return 'Cena';
}

function openEntryDialog(index = null) {
  const log = ensureLog(state, currentDay);
  const editing = index !== null ? log.entries[index] : null;
  const e = editing || { name: '', p: '', c: '', f: '', qty: 1, meal: defaultMeal() };
  // Ración actual: `size` gramos/ml o, si no hay, unidades.
  let size = e.size || null;
  let unit = e.unit || 'g';
  const amountOf = (qty) => (size ? round(qty * size) : qty);

  $dialogForm.innerHTML = `
    <h2 style="margin-top:0">${editing ? 'Editar comida' : 'Añadir comida'}</h2>
    ${editing ? '' : `
      <label>Desde mis alimentos
        <select id="d-food">
          <option value="">— Personalizado —</option>
          ${state.foods.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}
        </select>
      </label>`}
    <div class="row" style="margin-top:8px">
      <label class="grow">Nombre <input id="d-name" required value="${esc(e.name)}"></label>
      <label>Comida
        <select id="d-meal">${MEALS.map((m) => `<option ${m === (e.meal || 'Extra') ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </label>
    </div>
    <p class="muted small" id="d-per" style="margin:8px 0 0"></p>
    <div class="fields">
      <label>Proteína (g)<input id="d-p" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(e.p)}"></label>
      <label>Carbos (g)<input id="d-c" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(e.c)}"></label>
      <label>Grasas (g)<input id="d-f" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(e.f)}"></label>
    </div>
    <label><span id="d-qty-label"></span><input id="d-qty" type="number" min="0" step="any" inputmode="decimal" value="${esc(amountOf(Number(e.qty ?? 1)))}"></label>
    ${editing ? '' : '<label style="flex-direction:row;align-items:center;margin-top:8px"><input type="checkbox" id="d-save"> Guardar en mis alimentos</label>'}
    <p class="muted small" id="d-kcal"></p>
    <div class="row" style="justify-content:flex-end">
      <button value="cancel" formnovalidate>Cancelar</button>
      <button value="ok" class="primary">${editing ? 'Guardar' : 'Añadir'}</button>
    </div>`;

  const val = (id) => $dialogForm.querySelector(id);
  const qty = () => {
    const n = Number(val('#d-qty').value) || 0;
    return size ? n / size : n;
  };
  const updateLabels = () => {
    val('#d-per').textContent = size ? `Macros por ${size} ${unit}:` : 'Macros por unidad/ración:';
    val('#d-qty-label').textContent = size ? `Cantidad (${unit})` : 'Cantidad (raciones)';
  };
  const updateKcal = () => {
    const q = qty();
    val('#d-kcal').textContent = `${round(kcal({
      p: Number(val('#d-p').value) * q, c: Number(val('#d-c').value) * q, f: Number(val('#d-f').value) * q,
    }))} kcal`;
  };
  $dialogForm.oninput = updateKcal;
  const sel = val('#d-food');
  if (sel) {
    sel.onchange = () => {
      const f = state.foods.find((x) => x.id === sel.value);
      size = f?.size || null;
      unit = f?.unit || 'g';
      if (!f) { updateLabels(); return; }
      val('#d-name').value = f.name;
      val('#d-p').value = f.p;
      val('#d-c').value = f.c;
      val('#d-f').value = f.f;
      val('#d-qty').value = size || 1;
      updateLabels();
      updateKcal();
    };
  }
  updateLabels();
  updateKcal();

  $dialog.onclose = () => {
    if ($dialog.returnValue !== 'ok') return;
    const item = {
      id: editing?.id ?? uid(),
      meal: val('#d-meal').value,
      name: val('#d-name').value.trim() || 'Comida',
      p: Number(val('#d-p').value) || 0,
      c: Number(val('#d-c').value) || 0,
      f: Number(val('#d-f').value) || 0,
      qty: qty(),
    };
    if (size) Object.assign(item, { size, unit });
    if (editing?.diet) {
      item.diet = true;
      log.dietLocked = true;
    }
    if (editing) log.entries[index] = item;
    else log.entries.push(item);
    if (val('#d-save')?.checked) {
      const food = { id: uid(), name: item.name, p: item.p, c: item.c, f: item.f };
      if (size) Object.assign(food, { size, unit });
      state.foods.push(food);
    }
    commit();
  };
  $dialog.returnValue = '';
  $dialog.showModal();
}

function openFoodDialog() {
  $dialogForm.innerHTML = `
    <h2 style="margin-top:0">Nuevo alimento</h2>
    <label>Nombre<input id="f-name" required placeholder="Ej. Yogur griego"></label>
    <div class="row" style="margin-top:8px">
      <label>Ración<input id="f-size" type="number" min="0" step="any" inputmode="decimal" value="100"></label>
      <label>Unidad
        <select id="f-unit"><option value="g">g</option><option value="ml">ml</option><option value="ud">unidad</option></select>
      </label>
    </div>
    <p class="muted small" style="margin:8px 0 0">Macros por esa ración:</p>
    <div class="fields">
      <label>Proteína (g)<input id="f-p" type="number" min="0" step="0.1" inputmode="decimal"></label>
      <label>Carbos (g)<input id="f-c" type="number" min="0" step="0.1" inputmode="decimal"></label>
      <label>Grasas (g)<input id="f-f" type="number" min="0" step="0.1" inputmode="decimal"></label>
    </div>
    <div class="row" style="justify-content:flex-end">
      <button value="cancel" formnovalidate>Cancelar</button>
      <button value="ok" class="primary">Guardar</button>
    </div>`;
  $dialogForm.oninput = null;
  $dialog.onclose = () => {
    if ($dialog.returnValue !== 'ok') return;
    const v = (id) => $dialogForm.querySelector(id).value;
    const food = {
      id: uid(), name: v('#f-name').trim() || 'Alimento',
      p: Number(v('#f-p')) || 0, c: Number(v('#f-c')) || 0, f: Number(v('#f-f')) || 0,
    };
    const sz = Number(v('#f-size'));
    if (v('#f-unit') !== 'ud' && sz > 0) Object.assign(food, { size: sz, unit: v('#f-unit') });
    state.foods.push(food);
    commit();
  };
  $dialog.returnValue = '';
  $dialog.showModal();
}

// ---------- Render principal ----------

const views = {
  hoy: renderDay, semana: renderWeek, tipos: renderTypes, progreso: renderProgress, historial: renderHistory, ajustes: renderSettings,
};

function render() {
  $view.innerHTML = views[tab]();
  document.querySelectorAll('.tabs button').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  });
}

// ---------- Eventos ----------

document.querySelector('.tabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
});

$view.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const i = Number(el.dataset.i);
  const log = () => ensureLog(state, currentDay);
  const type = () => findType(state, el.dataset.type);

  switch (el.dataset.action) {
    case 'day-prev': currentDay = addDays(currentDay, -1); render(); break;
    case 'day-next': currentDay = addDays(currentDay, 1); render(); break;
    case 'day-today': currentDay = dateKey(); render(); break;
    case 'reset-day-type': log().typeId = null; commit(); break;
    case 'add-entry': openEntryDialog(); break;
    case 'edit-entry': openEntryDialog(i); break;
    case 'del-entry': {
      const l = log();
      if (l.entries[i]?.diet) l.dietLocked = true;
      l.entries.splice(i, 1);
      commit();
      break;
    }
    case 'apply-diet': applyDiet(state, currentDay); commit(); break;
    case 'water': {
      const l = log();
      l.water = Math.max(0, (Number(l.water) || 0) + Number(el.dataset.ml));
      commit();
      break;
    }
    case 'start-phase': {
      const goal = document.getElementById('ph-goal').value;
      const start = document.getElementById('ph-start').value || dateKey();
      const tw = Number(document.getElementById('ph-target').value);
      state.phases = state.phases.filter((p) => p.start !== start);
      state.phases.push(newPhase(goal, start, { targetWeight: tw > 0 ? tw : null }));
      state.phases.sort((a, b) => a.start.localeCompare(b.start));
      commit();
      break;
    }
    case 'del-phase':
      if (!confirm('¿Borrar esta fase del historial?')) return;
      state.phases = state.phases.filter((p) => p.id !== el.dataset.id);
      commit();
      break;
    case 'apply-adapt':
      state.profile.maintAdjust = (Number(state.profile.maintAdjust) || 0) + Number(el.dataset.kcal);
      commit();
      break;
    case 'reset-adjust': state.profile.maintAdjust = 0; commit(); break;
    case 'calibrate': {
      const m = estimateMaintenance(state.profile);
      if (!confirm(`¿Ajustar los carbohidratos y grasas de tus entrenos para una media de ${m} kcal/día?`)) return;
      calibrateTypes(state, m);
      commit();
      break;
    }
    case 'remove-diet': removeDiet(state, currentDay); commit(); break;
    case 'add-diet-item': {
      const t = type();
      const box = el.closest('.diet-add');
      const food = state.foods.find((f) => f.id === box.querySelector('[data-dnew="food"]').value);
      if (!food) return;
      const amount = Number(box.querySelector('[data-dnew="amount"]').value) || food.size || 1;
      t.diet.push(dietItem(food, box.querySelector('[data-dnew="meal"]').value, amount));
      openDiets.add(t.id);
      commit();
      break;
    }
    case 'del-diet-item': type().diet.splice(i, 1); openDiets.add(el.dataset.type); commit(); break;
    case 'reset-diet':
      if (!confirm('¿Restaurar la dieta original de este entrenamiento?')) return;
      type().diet = defaultDiet(el.dataset.type);
      openDiets.add(el.dataset.type);
      commit();
      break;
    case 'del-ex': log().exercises.splice(i, 1); commit(); break;
    case 'load-routine': {
      const t = findType(state, typeIdForDate(state, currentDay));
      const l = log();
      const existing = new Set(l.exercises.map((x) => x.name));
      for (const name of t.exercises) {
        if (!existing.has(name)) l.exercises.push({ id: uid(), name, sets: '', reps: '', kg: '', done: false });
      }
      commit();
      break;
    }
    case 'add-ex': {
      const input = document.getElementById('new-ex');
      const name = input.value.trim();
      if (!name) return;
      log().exercises.push({ id: uid(), name, sets: '', reps: '', kg: '', done: false });
      commit();
      document.getElementById('new-ex')?.focus();
      break;
    }
    case 'add-type': {
      const id = uid();
      state.types.push({
        id, name: 'Nuevo entrenamiento', color: '#3d5afe', perKg: { p: 2, c: 3, f: 1 },
        exercises: [], diet: defaultDiet(id), autoScale: true,
      });
      commit();
      break;
    }
    case 'del-type': {
      if (state.types.length <= 1) { alert('Debe haber al menos un tipo de entrenamiento.'); return; }
      const t = type();
      if (!confirm(`¿Eliminar "${t.name}"? Los días que lo usaban pasarán a otro tipo.`)) return;
      state.types = state.types.filter((x) => x.id !== t.id);
      const fallback = state.types[0].id;
      for (const d of Object.keys(state.weekPlan)) if (state.weekPlan[d] === t.id) state.weekPlan[d] = fallback;
      for (const l of Object.values(state.logs)) if (l.typeId === t.id) l.typeId = null;
      commit();
      break;
    }
    case 'add-type-ex': {
      const input = $view.querySelector(`[data-newex="${CSS.escape(el.dataset.type)}"]`);
      const name = input.value.trim();
      if (!name) return;
      type().exercises.push(name);
      commit();
      break;
    }
    case 'del-type-ex': type().exercises.splice(i, 1); commit(); break;
    case 'goto-day': currentDay = el.dataset.key; tab = 'hoy'; render(); window.scrollTo(0, 0); break;
    case 'new-food': openFoodDialog(); break;
    case 'del-food': state.foods = state.foods.filter((f) => f.id !== el.dataset.id); commit(); break;
    case 'export': exportData(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset':
      if (confirm('¿Seguro? Se borrarán todos tus registros y ajustes.')) { state = defaultState(); commit(); }
      break;
    default: break;
  }
});

$view.addEventListener('change', (ev) => {
  const el = ev.target;
  const log = () => ensureLog(state, currentDay);

  if (el.id === 'import-file') return importData(el.files[0]);

  switch (el.dataset.action) {
    case 'set-day-type': {
      const planned = state.weekPlan[parseKey(currentDay).getDay()];
      log().typeId = el.value === planned ? null : el.value;
      return commit();
    }
    case 'set-day-weight': {
      setBody(currentDay, 'w', el.value);
      return commit();
    }
    case 'set-weight': {
      const w = Number(el.value);
      if (w > 0) state.profile.weight = w;
      return commit();
    }
    case 'set-plan': state.weekPlan[el.dataset.day] = el.value; return commit();
    case 'set-body': setBody(dateKey(), el.dataset.field, el.value); return commit();
    case 'profile': {
      const f = el.dataset.field;
      state.profile[f] = f === 'sex' ? el.value : Number(el.value) || state.profile[f];
      return commit();
    }
    case 'phase-field': {
      const ph = state.phases.find((p) => p.id === el.dataset.id);
      const f = el.dataset.field;
      const v = el.value === '' ? null : Number(el.value);
      ph[f] = f === 'targetWeight' ? (v > 0 ? v : null) : (v ?? 0);
      return commit();
    }
    case 'ph-goal-preview':
      document.getElementById('ph-desc').textContent = GOALS[el.value].desc;
      return undefined;
    case 'toggle-ex': log().exercises[Number(el.dataset.i)].done = el.checked; return commit();
    case 'history-range': historyRange = Number(el.value); return render();
    default: break;
  }

  if (el.dataset.field) {
    log().exercises[Number(el.dataset.i)][el.dataset.field] = el.value === '' ? '' : Number(el.value);
    return save();
  }

  if (el.dataset.dfield) {
    const t = findType(state, el.dataset.type);
    const item = t.diet[Number(el.dataset.i)];
    const n = Math.max(0, Number(el.value) || 0);
    if (el.dataset.dfield === 'amount') item.qty = item.size ? n / item.size : n;
    else if (el.dataset.dfield === 'meal') item.meal = el.value;
    openDiets.add(t.id);
    return commit();
  }

  if (el.dataset.action === 'set-autoscale') {
    findType(state, el.dataset.type).autoScale = el.checked;
    openDiets.add(el.dataset.type);
    return commit();
  }

  if (el.dataset.tfield) {
    const t = findType(state, el.dataset.type);
    const f = el.dataset.tfield;
    if (f === 'name') t.name = el.value.trim() || t.name;
    else if (f === 'color') t.color = el.value;
    else t.perKg[f] = Math.max(0, Number(el.value) || 0);
    return commit();
  }
});

$view.addEventListener('toggle', (ev) => {
  const d = ev.target;
  if (!d.matches?.('details.diet')) return;
  if (d.open) openDiets.add(d.dataset.type);
  else openDiets.delete(d.dataset.type);
}, true);

$view.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.id === 'new-ex') {
    ev.preventDefault();
    $view.querySelector('[data-action="add-ex"]').click();
  } else if (ev.target.dataset.newex) {
    ev.preventDefault();
    $view.querySelector(`[data-action="add-type-ex"][data-type="${CSS.escape(ev.target.dataset.newex)}"]`).click();
  }
});

// ---------- Exportar / importar ----------

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `macros-gym-${dateKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!confirm('Esto reemplazará tus datos actuales. ¿Continuar?')) return;
    state = normalizeState(data);
    commit();
    alert('Datos importados.');
  } catch (err) {
    alert('Archivo no válido: ' + err.message);
  }
}

// ---------- iPhone: aviso para instalar ----------

const HINT_KEY = 'aplicaciongym:hint-cerrado';
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

function setupInstallHint() {
  const hint = document.getElementById('install-hint');
  let dismissed = false;
  try { dismissed = localStorage.getItem(HINT_KEY) === '1'; } catch { /* sin almacenamiento */ }
  if (!isIOS || isStandalone || dismissed) return;
  hint.hidden = false;
  document.getElementById('install-hint-close').addEventListener('click', () => {
    hint.hidden = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* sin almacenamiento */ }
  });
}

// ---------- Arranque ----------

render();
setupInstallHint();

// Pide al navegador que no borre los datos (Safari puede limpiar webs no instaladas).
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
