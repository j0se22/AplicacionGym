import {
  STORAGE_KEY, CATEGORIES, PLACE_KINDS, TOWNS, findTown, normalizeState, defaultState, exportState,
  townStats, townReviews, reviewScore, ranking, searchTowns, upsertReview, deleteReview, mergeImport,
  upsertPlace, deletePlace, townPlaces, shareText, stars, round1, todayKey, uid, weightOf, personalScore,
  kmFromSevilla, planRoute, suggestRoute, mapsRouteUrl, randomTown, passport, achievements, townInfo,
  upcomingFiestas,
} from './core.js';
import { COMARCAS } from './data.js';
import { GEO, MAP_SIZE, PROVINCE_PATH } from './geo.js';
import { townFiestas, fiestaRange } from './info.js';
import { addPhoto, getPhoto, deletePhoto, photoUrl } from './photos.js';
import { createSync, validConfig } from './sync.js';

// ---------- Estado y persistencia ----------

const SYNC_KEY = 'pueblos-sevilla:sync';
const ROUTE_KEY = 'pueblos-sevilla:ruta';

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { alert('No se pudieron guardar los datos: ' + err.message); }
}

let state = (() => { try { return normalizeState(readJSON(STORAGE_KEY)); } catch { return defaultState(); } })();
let syncCfg = readJSON(SYNC_KEY); // { url, key, session, lastSync }
let route = (readJSON(ROUTE_KEY) ?? []).filter(findTown);
let tab = 'pueblos';
let townId = null; // ficha abierta
const ui = {
  query: '', comarca: '', mark: '', view: 'lista', mapMode: 'nota', mapZoom: 1, mapSel: null,
  rankCat: 'global', rankComarca: '', surprisePool: 'nuevo', surpriseKm: 0, surprise: null,
  routeComarca: 'Sierra Norte', routeN: 3, syncStatus: '',
};

const save = () => writeJSON(STORAGE_KEY, state);
const saveRoute = () => writeJSON(ROUTE_KEY, route);

function commit() {
  save();
  render();
  scheduleSync();
}

// ---------- Utilidades de vista ----------

const $view = document.getElementById('view');
const $title = document.getElementById('title');
const $back = document.getElementById('back');
const $dialog = document.getElementById('dialog');
const $dialogForm = document.getElementById('dialog-form');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const fmtDate = (key) => new Date(key + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDay = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const fmtScore = (n) => round1(n).toLocaleString('es-ES', { minimumFractionDigits: 1 });
const fmtKm = (km) => `${Math.round(km)} km`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const scoreLevel = (s) => (s == null ? 'none' : s >= 4 ? 'hi' : s >= 3 ? 'mid' : 'lo');

function scoreBadge(score) {
  if (score == null) return '<span class="score none">—</span>';
  return `<span class="score ${scoreLevel(score)}">${fmtScore(score)}</span>`;
}

const starLine = (score) => `<span class="stars" aria-label="${fmtScore(score)} de 5">${stars(score)}</span>`;
const bar = (score, max = 5) => `<div class="bar"><div style="width:${(score / max) * 100}%"></div></div>`;

const comarcaOptions = (selected, empty) => (empty === null ? '' : `<option value="">${empty}</option>`)
  + Object.keys(COMARCAS).map((c) => `<option ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('');

function fiestaWhen(f) {
  const year = new Date().getFullYear();
  let [a, b] = fiestaRange(f, year);
  if (b < new Date()) [a, b] = fiestaRange(f, year + 1);
  if (!f.easter) return a.toLocaleDateString('es-ES', { month: 'long' });
  return +a === +b ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}`;
}

// Las fotos se cargan después de pintar (las locales salen de IndexedDB).
function hydratePhotos(root = $view) {
  root.querySelectorAll('img[data-photo]').forEach(async (img) => {
    img.src = await photoUrl(img.dataset.photo);
  });
}

const photoThumbs = (photos) => (photos.length
  ? `<div class="photos">${photos.map((p) => `<img data-photo="${esc(p)}" alt="Foto" loading="lazy">`).join('')}</div>` : '');

// ---------- Pestaña Pueblos ----------

function townRow(town, extra = '') {
  const stats = townStats(state, town.id);
  const mark = state.marks[town.id];
  return `<button class="town" data-open="${town.id}">
    <div class="grow">
      <div class="name">${esc(town.name)} ${mark === 'pendiente' ? '📌' : mark === 'visitado' ? '✅' : ''}</div>
      <div class="muted small">${esc(town.comarca)}${stats.count ? ` · ${plural(stats.count, 'valoración', 'valoraciones')}` : ''}${extra}</div>
    </div>
    ${scoreBadge(stats.overall)}
  </button>`;
}

const listHtml = () => searchTowns(ui.query, { comarca: ui.comarca, mark: ui.mark, state })
  .map((t) => townRow(t)).join('') || '<p class="muted">No hay pueblos con ese filtro.</p>';

function renderPueblos() {
  const visited = TOWNS.filter((t) => state.marks[t.id] === 'visitado').length;
  $view.innerHTML = `
    <div class="seg two">
      <button data-view="lista" class="${ui.view === 'lista' ? 'on' : ''}">📋 Lista</button>
      <button data-view="mapa" class="${ui.view === 'mapa' ? 'on' : ''}">🗺️ Mapa</button>
    </div>
    ${ui.view === 'mapa' ? mapHtml() : `
    <div class="card">
      <input type="search" id="q" placeholder="Buscar pueblo…" value="${esc(ui.query)}" autocomplete="off">
      <div class="row" style="margin-top:8px">
        <select id="f-comarca" class="grow">${comarcaOptions(ui.comarca, 'Todas las comarcas')}</select>
        <select id="f-mark" class="grow">
          ${[['', 'Todos'], ['valorado', 'Valorados'], ['sin-valorar', 'Sin valorar'], ['pendiente', '📌 Quiero ir'], ['visitado', '✅ Visitados']]
            .map(([v, l]) => `<option value="${v}" ${v === ui.mark ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <p class="muted small" style="margin:8px 0 0">Has visitado ${visited} de ${TOWNS.length} pueblos.</p>
      <div class="bar thin"><div style="width:${(visited / TOWNS.length) * 100}%"></div></div>
    </div>
    <div id="list" class="card list">${listHtml()}</div>`}`;

  $view.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { ui.view = b.dataset.view; render(); }));
  if (ui.view === 'mapa') return bindMap();
  const q = document.getElementById('q');
  q.addEventListener('input', () => { ui.query = q.value; document.getElementById('list').innerHTML = listHtml(); });
  document.getElementById('f-comarca').addEventListener('change', (e) => { ui.comarca = e.target.value; render(); });
  document.getElementById('f-mark').addEventListener('change', (e) => { ui.mark = e.target.value; render(); });
}

// ---------- Mapa ----------

function mapFill(id) {
  if (ui.mapMode === 'visitas') {
    const m = state.marks[id];
    return m === 'visitado' ? 'var(--hi)' : m === 'pendiente' ? 'var(--albero)' : 'var(--map-empty)';
  }
  const s = townStats(state, id).overall;
  return s == null ? 'var(--map-empty)' : `var(--${scoreLevel(s)})`;
}

function mapHtml() {
  const sel = ui.mapSel && findTown(ui.mapSel);
  const legend = ui.mapMode === 'visitas'
    ? '<span><i style="background:var(--hi)"></i>Visitado</span><span><i style="background:var(--albero)"></i>Quiero ir</span><span><i style="background:var(--map-empty)"></i>Sin visitar</span>'
    : '<span><i style="background:var(--hi)"></i>≥ 4</span><span><i style="background:var(--mid)"></i>3 – 4</span><span><i style="background:var(--lo)"></i>&lt; 3</span><span><i style="background:var(--map-empty)"></i>Sin nota</span>';
  return `
    <div class="card map-card">
      <div class="row between">
        <div class="seg">
          <button data-mapmode="nota" class="${ui.mapMode === 'nota' ? 'on' : ''}">⭐ Notas</button>
          <button data-mapmode="visitas" class="${ui.mapMode === 'visitas' ? 'on' : ''}">✅ Mis visitas</button>
        </div>
        <div class="row nowrap">
          <button class="icon" data-zoom="-1" aria-label="Alejar">−</button>
          <button class="icon" data-zoom="1" aria-label="Acercar">+</button>
        </div>
      </div>
      <div class="map-wrap" id="map-wrap">
        <svg id="map" viewBox="0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}" style="width:${ui.mapZoom * 100}%" role="img" aria-label="Mapa de la provincia de Sevilla">
          <path d="${PROVINCE_PATH}" class="province"/>
          ${TOWNS.map((t) => `<path d="${GEO[t.id].d}" data-town="${t.id}" fill="${mapFill(t.id)}" class="${t.id === ui.mapSel ? 'sel' : ''}"><title>${esc(t.name)}</title></path>`).join('')}
        </svg>
      </div>
      <div class="legend">${legend}</div>
    </div>
    ${sel ? `<div class="card list map-sel">${townRow(sel, ` · ${fmtKm(kmFromSevilla(sel.id))} de Sevilla`)}</div>`
    : '<p class="muted small center">Toca un pueblo del mapa para verlo.</p>'}`;
}

function bindMap() {
  $view.querySelectorAll('[data-mapmode]').forEach((b) => b.addEventListener('click', () => { ui.mapMode = b.dataset.mapmode; render(); }));
  const wrap = document.getElementById('map-wrap');
  $view.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const old = ui.mapZoom;
    ui.mapZoom = Math.min(4, Math.max(1, ui.mapZoom * (b.dataset.zoom === '1' ? 1.6 : 1 / 1.6)));
    // Mantiene el centro de la vista al hacer zoom.
    const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / old;
    const cy = (wrap.scrollTop + wrap.clientHeight / 2) / old;
    document.getElementById('map').style.width = ui.mapZoom * 100 + '%';
    wrap.scrollLeft = cx * ui.mapZoom - wrap.clientWidth / 2;
    wrap.scrollTop = cy * ui.mapZoom - wrap.clientHeight / 2;
  }));
  document.getElementById('map').addEventListener('click', (e) => {
    const p = e.target.closest('[data-town]');
    if (!p) return;
    ui.mapSel = p.dataset.town;
    const scroll = [wrap.scrollLeft, wrap.scrollTop];
    render();
    const w = document.getElementById('map-wrap');
    [w.scrollLeft, w.scrollTop] = scroll;
  });
}

// ---------- Ficha de un pueblo ----------

function renderTown() {
  const town = findTown(townId);
  const stats = townStats(state, town.id);
  const reviews = townReviews(state, town.id);
  const places = townPlaces(state, town.id);
  const mark = state.marks[town.id];
  const info = townInfo(town.id);
  const forYou = personalScore(state, stats);
  const allPhotos = reviews.flatMap((r) => r.photos);
  const inRoute = route.includes(town.id);

  $view.innerHTML = `
    <div class="card hero">
      <div class="row between">
        <div class="grow">
          <h2>${esc(town.name)}</h2>
          <div class="muted">${esc(town.comarca)}${town.id !== 'sevilla' ? ` · ${fmtKm(kmFromSevilla(town.id))} de Sevilla` : ''}</div>
        </div>
        ${scoreBadge(stats.overall)}
      </div>
      ${stats.overall != null ? `<div class="row" style="margin-top:6px">${starLine(stats.overall)}
        <span class="muted small">${plural(stats.count, 'valoración', 'valoraciones')}${forYou != null && Math.abs(forYou - stats.overall) >= 0.05 ? ` · 🎯 para ti ${fmtScore(forYou)}` : ''}</span></div>` : ''}
      <div class="row" style="margin-top:12px">
        <button class="primary grow" data-act="rate">⭐ Valorar</button>
        <button class="${mark === 'pendiente' ? 'on' : ''}" data-mark="pendiente">📌 Quiero ir</button>
        <button class="${mark === 'visitado' ? 'on' : ''}" data-mark="visitado">✅ Visitado</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="grow ${inRoute ? 'on' : ''}" data-act="route">${inRoute ? '🚗 En tu ruta' : '🚗 Añadir a ruta'}</button>
        ${stats.count ? '<button class="grow" data-act="card">🖼️ Tarjeta</button>' : ''}
        <a class="btn grow center" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(town.name + ', Sevilla')}">🗺️ Mapa</a>
      </div>
    </div>

    ${allPhotos.length ? `<div class="card"><h2>📷 Fotos</h2>${photoThumbs(allPhotos)}</div>` : ''}

    ${info.ver || info.comer || info.fiestas ? `<div class="card info">
      ${info.ver ? `<h3>📸 Qué ver</h3><ul>${info.ver.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${info.comer ? `<h3>🍴 Qué comer</h3><ul>${info.comer.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h3>🎉 Fiestas</h3><ul>${townFiestas(town.id).map((f) => `<li>${esc(f.name)} <span class="muted small">· ${fiestaWhen(f)}</span></li>`).join('')}</ul>
      <p class="muted small">Información orientativa. Las fechas pueden variar cada año.</p>
    </div>` : ''}

    <div class="card">
      <h2>Puntuación por aspecto</h2>
      ${CATEGORIES.map((c) => {
        const e = stats.byCat[c.id];
        return `<div class="cat">
          <span class="cat-name">${c.icon} ${esc(c.name)}</span>
          ${e ? `${bar(e.avg)}<b>${fmtScore(e.avg)}</b>` : '<span class="muted small">Sin valorar</span>'}
        </div>`;
      }).join('')}
    </div>

    <div class="card">
      <div class="row between"><h2>📍 Sitios recomendados</h2><button class="icon" data-act="add-place" aria-label="Añadir sitio">＋</button></div>
      ${places.map(placeCard).join('') || '<p class="muted">¿Un bar, un restaurante, un alojamiento? Añade el primero con ＋.</p>'}
    </div>

    <div class="card">
      <div class="row between"><h2>Valoraciones</h2>
        ${stats.count && navigator.share ? '<button class="icon" data-act="share" aria-label="Compartir">📤</button>' : ''}
      </div>
      ${reviews.map(reviewCard).join('') || '<p class="muted">Aún no hay valoraciones. ¡Sé el primero!</p>'}
    </div>`;

  hydratePhotos();
  const on = (sel, fn) => $view.querySelector(sel)?.addEventListener('click', fn);
  on('[data-act="rate"]', () => openReview({ townId: town.id }));
  on('[data-act="add-place"]', () => openPlace({ townId: town.id }));
  on('[data-act="route"]', () => {
    route = inRoute ? route.filter((id) => id !== town.id) : [...route, town.id];
    saveRoute();
    render();
  });
  on('[data-act="card"]', () => shareCard(town.id));
  on('[data-act="share"]', () => navigator.share({ title: town.name, text: shareText(state, town.id) }).catch(() => {}));
  $view.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mark;
    if (state.marks[town.id] === m) delete state.marks[town.id];
    else state.marks[town.id] = m;
    commit();
  }));
}

function reviewCard(r) {
  return `<div class="review">
    <div class="row between">
      <div><b>${esc(r.author || 'Anónimo')}</b> <span class="muted small">· ${fmtDate(r.date)}</span></div>
      <div class="row nowrap">${scoreBadge(reviewScore(r))}${r.mine ? `<button class="icon" data-edit="${r.id}" aria-label="Editar">✏️</button>` : ''}</div>
    </div>
    <div class="chips">${CATEGORIES.filter((c) => r.scores[c.id])
      .map((c) => `<span class="chip">${c.icon} ${r.scores[c.id]}</span>`).join('')}</div>
    ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
    ${r.tip ? `<p class="tip">💡 ${esc(r.tip)}</p>` : ''}
    ${photoThumbs(r.photos)}
  </div>`;
}

function placeCard(p) {
  const kind = PLACE_KINDS.find((k) => k.id === p.kind);
  return `<div class="review place">
    <div class="row between">
      <div class="grow"><b>${kind.icon} ${esc(p.name)}</b> <span class="muted small">· ${esc(kind.name)}</span></div>
      <div class="row nowrap">${p.score ? scoreBadge(p.score) : ''}${p.mine ? `<button class="icon" data-edit-place="${p.id}" aria-label="Editar">✏️</button>` : ''}</div>
    </div>
    ${p.note ? `<p>${esc(p.note)}</p>` : ''}
    <div class="row between">
      <span class="muted small">${p.author ? 'Por ' + esc(p.author) : ''}</span>
      <a class="small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ', ' + findTown(p.townId).name)}">Cómo llegar ›</a>
    </div>
  </div>`;
}

// ---------- Diálogos ----------

function starInput(name, value) {
  return `<span class="star-input" data-stars="${name}" data-value="${value ?? 0}">${[1, 2, 3, 4, 5]
    .map((n) => `<button type="button" data-n="${n}" aria-label="${n} estrellas">★</button>`).join('')}</span>`;
}

// Estrellas: tocar la misma estrella otra vez la quita. Devuelve un objeto con los valores.
function bindStars(root, values) {
  const paint = () => root.querySelectorAll('[data-stars]').forEach((el) => {
    const v = values[el.dataset.stars] ?? 0;
    el.querySelectorAll('[data-n]').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= v));
  });
  root.querySelectorAll('[data-stars] [data-n]').forEach((b) => b.addEventListener('click', () => {
    const key = b.closest('[data-stars]').dataset.stars;
    const n = Number(b.dataset.n);
    if (values[key] === n) delete values[key];
    else values[key] = n;
    paint();
  }));
  paint();
}

function openDialog(html) {
  $dialogForm.innerHTML = html;
  $dialogForm.onsubmit = null;
  $dialogForm.querySelector('[data-act="cancel"]')?.addEventListener('click', () => $dialog.close());
  $dialog.showModal();
}

function openReview(review) {
  const editing = !!review.id;
  const town = findTown(review.townId);
  const scores = { ...(review.scores ?? {}) };
  let photos = [...(review.photos ?? [])];

  openDialog(`
    <h2>${editing ? 'Editar valoración' : 'Valorar'} · ${esc(town.name)}</h2>
    <p class="muted small">Toca las estrellas. Deja sin puntuar lo que no conozcas.</p>
    ${CATEGORIES.map((c) => `<div class="rate"><span class="cat-name">${c.icon} ${esc(c.name)}</span>${starInput(c.id)}</div>`).join('')}
    <label>Comentario<textarea name="comment" rows="3" maxlength="2000" placeholder="¿Qué te pareció?">${esc(review.comment)}</textarea></label>
    <label>Recomendación<input name="tip" maxlength="300" placeholder="Un plato, una calle o un rincón que no hay que perderse" value="${esc(review.tip)}"></label>
    <div class="label">Fotos</div>
    <div class="photos edit" id="photo-list"></div>
    <div class="row nowrap" style="margin-top:12px">
      <label class="grow">Tu nombre<input name="author" maxlength="40" value="${esc(review.author ?? state.author)}"></label>
      <label class="grow">Fecha<input type="date" name="date" value="${esc(review.date ?? todayKey())}"></label>
    </div>
    <p id="err" class="error" hidden>Puntúa al menos un aspecto.</p>
    <div class="row between" style="margin-top:12px">
      ${editing ? '<button type="button" class="danger" data-act="delete">Borrar</button>' : '<span></span>'}
      <div class="row nowrap">
        <button type="button" data-act="cancel">Cancelar</button>
        <button type="submit" class="primary">Guardar</button>
      </div>
    </div>`);

  bindStars($dialogForm, scores);

  const $photos = document.getElementById('photo-list');
  const paintPhotos = () => {
    $photos.innerHTML = photos.map((p, i) => `<span class="thumb"><img data-photo="${esc(p)}" alt="Foto"><button type="button" data-rm="${i}" aria-label="Quitar">✕</button></span>`).join('')
      + (photos.length < 6 ? '<label class="add-photo" aria-label="Añadir fotos">📷<input type="file" accept="image/*" multiple hidden></label>' : '');
    hydratePhotos($photos);
    $photos.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { photos.splice(Number(b.dataset.rm), 1); paintPhotos(); }));
    $photos.querySelector('input[type=file]')?.addEventListener('change', async (e) => {
      for (const file of [...e.target.files].slice(0, 6 - photos.length)) {
        try { photos.push(await addPhoto(file)); } catch { alert('No se pudo guardar la foto.'); }
      }
      paintPhotos();
    });
  };
  paintPhotos();

  const dropPhotos = (list) => list.filter((p) => p.startsWith('idb:')).forEach((p) => deletePhoto(p.slice(4)).catch(() => {}));

  $dialogForm.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    if (!confirm('¿Borrar esta valoración?')) return;
    dropPhotos(review.photos ?? []);
    deleteReview(state, review.id);
    $dialog.close();
    commit();
  });
  $dialogForm.onsubmit = (e) => {
    e.preventDefault();
    if (!Object.keys(scores).length) {
      document.getElementById('err').hidden = false;
      return;
    }
    const f = new FormData($dialogForm);
    const author = String(f.get('author')).trim();
    if (author) state.author = author;
    dropPhotos((review.photos ?? []).filter((p) => !photos.includes(p)));
    upsertReview(state, {
      id: review.id ?? uid(), townId: town.id, author, date: f.get('date'), scores,
      comment: f.get('comment'), tip: f.get('tip'), photos,
    });
    $dialog.close();
    commit();
  };
}

function openPlace(place) {
  const editing = !!place.id;
  const town = findTown(place.townId);
  const values = place.score ? { score: place.score } : {};
  openDialog(`
    <h2>${editing ? 'Editar sitio' : 'Recomendar un sitio'} · ${esc(town.name)}</h2>
    <label>Nombre<input name="name" maxlength="80" required placeholder="Bar Casa Manolo" value="${esc(place.name)}"></label>
    <label>Tipo<select name="kind" style="width:100%">${PLACE_KINDS.map((k) => `<option value="${k.id}" ${k.id === place.kind ? 'selected' : ''}>${k.icon} ${k.name}</option>`).join('')}</select></label>
    <div class="rate"><span class="cat-name">Nota (opcional)</span>${starInput('score')}</div>
    <label>Por qué lo recomiendas<textarea name="note" rows="3" maxlength="500" placeholder="Las mejores croquetas del pueblo…">${esc(place.note)}</textarea></label>
    <div class="row between" style="margin-top:12px">
      ${editing ? '<button type="button" class="danger" data-act="delete">Borrar</button>' : '<span></span>'}
      <div class="row nowrap">
        <button type="button" data-act="cancel">Cancelar</button>
        <button type="submit" class="primary">Guardar</button>
      </div>
    </div>`);
  bindStars($dialogForm, values);
  $dialogForm.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    if (!confirm('¿Borrar este sitio?')) return;
    deletePlace(state, place.id);
    $dialog.close();
    commit();
  });
  $dialogForm.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData($dialogForm);
    upsertPlace(state, {
      id: place.id ?? uid(), townId: town.id, name: f.get('name'), kind: f.get('kind'),
      score: values.score ?? null, note: f.get('note'), author: state.author,
    });
    $dialog.close();
    commit();
  };
}

function openPhoto(ref) {
  openDialog(`<img class="photo-full" data-photo="${esc(ref)}" alt="Foto">
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button type="button" data-act="cancel">Cerrar</button></div>`);
  hydratePhotos($dialogForm);
}

// ---------- Ranking ----------

function renderRanking() {
  const rows = ranking(state, ui.rankCat, ui.rankComarca);
  const medal = ['🥇', '🥈', '🥉'];
  $view.innerHTML = `
    <div class="card">
      <div class="seg">
        <button data-cat="global" class="${ui.rankCat === 'global' ? 'on' : ''}">⭐ Global</button>
        <button data-cat="parati" class="${ui.rankCat === 'parati' ? 'on' : ''}">🎯 Para ti</button>
        ${CATEGORIES.map((c) => `<button data-cat="${c.id}" class="${ui.rankCat === c.id ? 'on' : ''}">${c.icon} ${esc(c.name.split(' ')[0])}</button>`).join('')}
      </div>
      ${ui.rankCat === 'parati' ? `<p class="muted small">Ordenado según lo que más te importa. <button class="link" data-tab-go="ajustes">Cambiar mis prioridades ›</button></p>` : ''}
      <select id="r-comarca" style="margin-top:10px;width:100%">${comarcaOptions(ui.rankComarca, 'Toda la provincia')}</select>
    </div>
    <div class="card list">
      ${rows.map((r, i) => `<button class="town" data-open="${r.town.id}">
        <span class="pos">${medal[i] ?? i + 1}</span>
        <div class="grow">
          <div class="name">${esc(r.town.name)}</div>
          <div class="muted small">${esc(r.town.comarca)} · ${plural(r.count, 'voto', 'votos')}</div>
        </div>
        ${scoreBadge(r.score)}
      </button>`).join('') || '<p class="muted">Todavía no hay pueblos valorados aquí. Ve a «Pueblos» y valora alguno.</p>'}
    </div>`;
  $view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { ui.rankCat = b.dataset.cat; render(); }));
  document.getElementById('r-comarca').addEventListener('change', (e) => { ui.rankComarca = e.target.value; render(); });
}

// ---------- Explorar: sorpresa, rutas y fiestas ----------

function renderExplorar() {
  const s = ui.surprise && findTown(ui.surprise);
  const r = planRoute(route);
  const suggestion = suggestRoute(state, ui.routeComarca, ui.routeN);
  const fiestas = upcomingFiestas(new Date(), 60);

  $view.innerHTML = `
    <div class="card">
      <h2>🎲 Pueblo sorpresa</h2>
      <p class="muted small">¿No sabes adónde ir este finde? Deja que decida el azar.</p>
      <div class="row nowrap">
        <select id="s-pool" class="grow">
          ${[['nuevo', 'Que no conozca'], ['pendiente', 'De mi «Quiero ir»'], ['todos', 'Cualquiera']]
            .map(([v, l]) => `<option value="${v}" ${v === ui.surprisePool ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="s-km" class="grow">
          ${[[0, 'A cualquier distancia'], [30, 'A menos de 30 km'], [60, 'A menos de 60 km'], [100, 'A menos de 100 km']]
            .map(([v, l]) => `<option value="${v}" ${v === ui.surpriseKm ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <button class="primary wide" data-act="surprise" style="margin-top:10px">🎲 ¡Sorpréndeme!</button>
      ${ui.surprise === false ? '<p class="muted">No hay pueblos con esas condiciones.</p>' : ''}
      ${s ? `<div class="surprise">
        <div class="big">${esc(s.name)}</div>
        <div class="muted">${esc(s.comarca)} · ${fmtKm(kmFromSevilla(s.id))} de Sevilla</div>
        ${townInfo(s.id).ver ? `<div class="small" style="margin-top:6px">📸 ${esc(townInfo(s.id).ver[0])}</div>` : ''}
        <div class="row" style="justify-content:center;margin-top:10px">
          <button data-open="${s.id}">Ver ficha</button>
          <button data-act="surprise-route">🚗 A la ruta</button>
        </div>
      </div>` : ''}
    </div>

    <div class="card">
      <h2>🚗 Tu ruta</h2>
      ${route.length ? `
        <ol class="route">${r.order.map((id) => `<li><button class="link" data-open="${id}">${esc(findTown(id).name)}</button>
          <button class="icon" data-rm-route="${id}" aria-label="Quitar">✕</button></li>`).join('')}</ol>
        <p class="muted small">Saliendo de Sevilla, ordenado para hacer menos kilómetros (≈ ${fmtKm(r.km * 1.25)} por carretera hasta el último).</p>
        <div class="row">
          <a class="btn primary grow center" target="_blank" rel="noopener" href="${esc(mapsRouteUrl(r.order))}">Abrir en Google Maps</a>
          <button data-act="clear-route">Vaciar</button>
        </div>`
      : '<p class="muted small">Añade pueblos desde su ficha («🚗 Añadir a ruta») o usa una ruta sugerida.</p>'}
      <h3>Ruta sugerida de un día</h3>
      <div class="row nowrap">
        <select id="r-com" class="grow">${comarcaOptions(ui.routeComarca, null)}</select>
        <select id="r-n">${[2, 3, 4, 5].map((n) => `<option ${n === ui.routeN ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      ${suggestion.order.length ? `<p>${suggestion.order.map((id) => `<button class="link" data-open="${id}">${esc(findTown(id).name)}</button>`).join(' → ')}</p>
        <button class="wide" data-act="use-route">Usar esta ruta</button>` : ''}
    </div>

    <div class="card">
      <h2>🎉 Próximas fiestas</h2>
      ${fiestas.map((f) => `<div class="fiesta">
        <div class="date">${fmtDay(f.start)}${+f.start !== +f.end ? `<br><span class="muted small">a ${fmtDay(f.end)}</span>` : ''}</div>
        <div class="grow"><b>${esc(f.fiesta.name)}</b><br>
          ${f.town ? `<button class="link" data-open="${f.town.id}">${esc(f.town.name)}</button>` : '<span class="muted small">En todos los pueblos</span>'}
          ${f.fiesta.month ? '<span class="muted small"> · durante el mes</span>' : ''}</div>
      </div>`).join('') || '<p class="muted">No hay fiestas destacadas en los próximos dos meses.</p>'}
      <p class="muted small">Selección orientativa de fiestas conocidas; consulta las fechas exactas en cada ayuntamiento.</p>
    </div>`;

  const sel = (id, key, num) => document.getElementById(id).addEventListener('change', (e) => {
    ui[key] = num ? Number(e.target.value) : e.target.value;
    render();
  });
  sel('s-pool', 'surprisePool');
  sel('s-km', 'surpriseKm', true);
  sel('r-com', 'routeComarca');
  sel('r-n', 'routeN', true);
  const on = (s2, fn) => $view.querySelector(s2)?.addEventListener('click', fn);
  on('[data-act="surprise"]', () => {
    const t = randomTown(state, { pool: ui.surprisePool, maxKm: ui.surpriseKm, exclude: ui.surprise || '' })
      ?? randomTown(state, { pool: ui.surprisePool, maxKm: ui.surpriseKm });
    ui.surprise = t ? t.id : false;
    render();
  });
  on('[data-act="surprise-route"]', () => {
    if (!route.includes(ui.surprise)) route.push(ui.surprise);
    saveRoute();
    render();
  });
  on('[data-act="clear-route"]', () => { route = []; saveRoute(); render(); });
  on('[data-act="use-route"]', () => { route = [...suggestion.order]; saveRoute(); render(); });
  $view.querySelectorAll('[data-rm-route]').forEach((b) => b.addEventListener('click', () => {
    route = route.filter((id) => id !== b.dataset.rmRoute);
    saveRoute();
    render();
  }));
}

// ---------- Yo: pasaporte, logros y mis valoraciones ----------

function renderYo() {
  const stamps = passport(state);
  const logros = achievements(state);
  const done = logros.filter((l) => l.done).length;
  const pending = TOWNS.filter((t) => state.marks[t.id] === 'pendiente');
  const mine = state.reviews.filter((r) => r.mine).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);

  $view.innerHTML = `
    <div class="card passport">
      <div class="row between"><h2>🛂 Pasaporte de pueblos</h2><b>${stamps.length}/${TOWNS.length}</b></div>
      ${stamps.length ? `<div class="stamps">${stamps.map(({ town, date }, i) => `<button class="stamp" data-open="${town.id}" style="--rot:${((i * 37) % 13) - 6}deg">
          <span class="stamp-name">${esc(town.name)}</span>
          <span class="stamp-date">${date ? fmtDate(date) : '✓'}</span>
        </button>`).join('')}</div>`
      : '<p class="muted">Marca pueblos como ✅ Visitado (o valóralos) y aquí irán apareciendo sus sellos.</p>'}
    </div>

    <div class="card">
      <div class="row between"><h2>🏆 Logros</h2><b>${done}/${logros.length}</b></div>
      ${logros.sort((a, b) => b.done - a.done || b.value / b.goal - a.value / a.goal).map((l) => `<div class="logro ${l.done ? 'done' : ''}">
        <span class="logro-icon">${l.icon}</span>
        <div class="grow"><b>${esc(l.name)}</b><div class="muted small">${esc(l.desc)}</div>
          ${l.done ? '' : `<div class="row nowrap">${bar(l.value, l.goal)}<span class="small muted">${l.value}/${l.goal}</span></div>`}</div>
        ${l.done ? '<span>✅</span>' : ''}
      </div>`).join('')}
    </div>

    ${pending.length ? `<div class="card list"><h2>📌 Quiero ir (${pending.length})</h2>${pending.map((t) => townRow(t)).join('')}</div>` : ''}

    <div class="card">
      <h2>Mis valoraciones (${mine.length})</h2>
      ${mine.map((r) => `<div class="mine">
        <button class="link" data-open="${r.townId}">${esc(findTown(r.townId).name)}</button>
        ${reviewCard(r)}</div>`).join('') || '<p class="muted">Todavía no has valorado ningún pueblo.</p>'}
    </div>`;
  hydratePhotos();
}

// ---------- Ajustes ----------

const WEIGHT_LABELS = ['No me importa', 'Normal', 'Bastante', 'Mucho'];

function renderSettings() {
  const connected = validConfig(syncCfg);
  $view.innerHTML = `
    <div class="card">
      <h2>Tu nombre</h2>
      <p class="muted small">Aparece en tus valoraciones y recomendaciones.</p>
      <input id="author" maxlength="40" value="${esc(state.author)}" placeholder="Por ejemplo: Ana">
    </div>

    <div class="card">
      <h2>🎯 ¿Qué te importa más?</h2>
      <p class="muted small">Se usa para el ranking «Para ti» y la nota «para ti» de cada pueblo.</p>
      ${CATEGORIES.map((c) => `<div class="weight">
        <span class="cat-name">${c.icon} ${esc(c.name)}</span>
        <select data-weight="${c.id}">${WEIGHT_LABELS.map((l, i) => `<option value="${i}" ${weightOf(state, c.id) === i ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>`).join('')}
    </div>

    <div class="card">
      <h2>🌍 Valoraciones compartidas</h2>
      ${connected ? `
        <p class="small">Conectado: tus valoraciones, sitios y fotos se comparten con todos los que usan la app, y ves las suyas.</p>
        <p class="muted small" id="sync-status">${esc(ui.syncStatus || (syncCfg.lastSync ? 'Última sincronización: ' + new Date(syncCfg.lastSync).toLocaleString('es-ES') : ''))}</p>
        <div class="row"><button class="primary" data-act="sync">🔄 Sincronizar ahora</button><button data-act="disconnect">Desconectar</button></div>`
      : `
        <p class="muted small">Para que todos veáis las valoraciones de todos, conecta la app a un proyecto gratuito de
          <b>Supabase</b> (los pasos están en el README). Pega aquí la URL del proyecto y la clave pública (<i>anon key</i>).
          Si alguien ya lo ha configurado, pídele estos dos datos.</p>
        <label>URL del proyecto<input id="sb-url" placeholder="https://xxxx.supabase.co" autocomplete="off"></label>
        <label>Clave pública (anon key)<input id="sb-key" placeholder="eyJhbGciOi…" autocomplete="off"></label>
        <button class="primary" data-act="connect" style="margin-top:10px">Conectar</button>
        <p class="error" id="sync-status">${esc(ui.syncStatus)}</p>`}
    </div>

    <div class="card">
      <h2>Compartir con un archivo y copias de seguridad</h2>
      <p class="muted small">Sin servidor también puedes compartir: exporta y manda el archivo por WhatsApp. Al importar el de
        otra persona, sus valoraciones y sitios se <b>suman</b> a los tuyos. (Las fotos solo viajan con las valoraciones compartidas.)</p>
      <div class="row">
        <button data-act="export">⬇️ Exportar</button>
        <label class="btn">⬆️ Importar<input type="file" id="import" accept="application/json,.json" hidden></label>
      </div>
    </div>

    <div class="card">
      <h2>Borrar todo</h2>
      <button class="danger" data-act="reset">Borrar todas las valoraciones de este móvil</button>
    </div>
    <p class="muted small center">${TOWNS.length} municipios de la provincia de Sevilla.<br>Mapa: © Instituto Geográfico Nacional.</p>`;

  document.getElementById('author').addEventListener('change', (e) => { state.author = e.target.value.trim(); save(); });
  $view.querySelectorAll('[data-weight]').forEach((s) => s.addEventListener('change', () => {
    const w = Number(s.value);
    if (w === 1) delete state.weights[s.dataset.weight];
    else state.weights[s.dataset.weight] = w;
    save();
  }));
  const on = (sel, fn) => $view.querySelector(sel)?.addEventListener('click', fn);
  on('[data-act="export"]', exportData);
  document.getElementById('import').addEventListener('change', importData);
  on('[data-act="reset"]', () => {
    if (!confirm('¿Seguro? Se borrarán todas las valoraciones, sitios y marcas de este móvil.')) return;
    state = { ...defaultState(), author: state.author, weights: state.weights };
    commit();
  });
  on('[data-act="connect"]', async () => {
    const cfg = { url: document.getElementById('sb-url').value.trim(), key: document.getElementById('sb-key').value.trim() };
    if (!validConfig(cfg)) { ui.syncStatus = 'Revisa la URL (https://…supabase.co) y la clave.'; render(); return; }
    syncCfg = cfg;
    ui.syncStatus = 'Conectando…';
    render();
    const ok = await runSync();
    if (!ok) { syncCfg = null; writeJSON(SYNC_KEY, null); render(); }
  });
  on('[data-act="sync"]', () => runSync());
  on('[data-act="disconnect"]', () => {
    if (!confirm('¿Desconectar? Las valoraciones descargadas se quedan en este móvil.')) return;
    syncCfg = null;
    ui.syncStatus = '';
    writeJSON(SYNC_KEY, null);
    render();
  });
}

async function exportData() {
  const name = `pueblos-sevilla-${state.author ? state.author.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${todayKey()}.json`;
  const file = new File([JSON.stringify(exportState(state), null, 2)], name, { type: 'application/json' });
  shareOrDownload(file, 'Valoraciones de pueblos de Sevilla');
}

async function shareOrDownload(file, title) {
  // En el móvil, abre el menú de compartir (WhatsApp, Instagram, Archivos…).
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { added, updated } = mergeImport(state, JSON.parse(await file.text()));
    commit();
    alert(`Importado: ${added} nuevas, ${updated} actualizadas.`);
  } catch {
    alert('El archivo no es válido.');
  }
}

// ---------- Tarjeta para compartir (imagen) ----------

async function shareCard(id) {
  const town = findTown(id);
  const stats = townStats(state, id);
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, sans-serif`;

  g.fillStyle = '#9e1b32';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#e9b949';
  g.fillRect(0, 300, W, 14);
  // Silueta del pueblo en el mapa, de fondo.
  g.save();
  g.globalAlpha = 0.12;
  g.fillStyle = '#ffffff';
  const scale = 0.9;
  g.translate(W - MAP_SIZE.width * scale + 120, H - MAP_SIZE.height * scale + 60);
  g.scale(scale, scale);
  g.fill(new Path2D(PROVINCE_PATH));
  g.globalAlpha = 0.5;
  g.fillStyle = '#e9b949';
  g.fill(new Path2D(GEO[id].d));
  g.restore();

  g.fillStyle = '#ffffff';
  g.font = font(800, town.name.length > 18 ? 70 : 92);
  g.fillText(town.name, 70, 170, W - 140);
  g.font = font(500, 40);
  g.globalAlpha = 0.85;
  g.fillText(`${town.comarca} · Pueblos de Sevilla`, 70, 240);
  g.globalAlpha = 1;

  g.font = font(800, 190);
  g.fillText(fmtScore(stats.overall), 70, 540);
  g.font = font(400, 70);
  g.fillStyle = '#e9b949';
  g.fillText(stars(stats.overall), 70, 640);
  g.fillStyle = '#ffffff';
  g.font = font(500, 36);
  g.fillText(plural(stats.count, 'valoración', 'valoraciones'), 520, 470);

  let y = 760;
  for (const cat of CATEGORIES) {
    const e = stats.byCat[cat.id];
    if (!e) continue;
    g.font = font(500, 40);
    g.fillText(`${cat.icon}  ${cat.name}`, 70, y);
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.fillRect(620, y - 26, 280, 22);
    g.fillStyle = '#e9b949';
    g.fillRect(620, y - 26, 280 * (e.avg / 5), 22);
    g.fillStyle = '#ffffff';
    g.font = font(700, 40);
    g.fillText(fmtScore(e.avg), 930, y);
    y += 74;
  }
  g.font = font(600, 34);
  g.globalAlpha = 0.85;
  g.fillText('¿Y tú, qué nota le pones?', 70, H - 70);

  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `${id}.png`, { type: 'image/png' });
  openDialog(`<h2>Tarjeta de ${esc(town.name)}</h2>
    <img class="photo-full" src="${URL.createObjectURL(blob)}" alt="Tarjeta de ${esc(town.name)}">
    <div class="row" style="justify-content:flex-end;margin-top:10px">
      <button type="button" data-act="cancel">Cerrar</button>
      <button type="button" class="primary" data-act="share-card">📤 Compartir</button>
    </div>`);
  $dialogForm.querySelector('[data-act="share-card"]').addEventListener('click', () => shareOrDownload(file, town.name));
}

// ---------- Sincronización ----------

let syncTimer = null;
let syncing = false;

function scheduleSync() {
  if (!validConfig(syncCfg)) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, 1500);
}

async function runSync() {
  if (!validConfig(syncCfg) || syncing) return false;
  syncing = true;
  document.body.classList.add('syncing');
  try {
    const client = createSync(syncCfg, {
      onSession: (session) => { syncCfg = { ...syncCfg, session }; writeJSON(SYNC_KEY, syncCfg); },
    });
    const res = await client.sync(state, { getPhoto });
    syncCfg = { ...syncCfg, lastSync: Date.now() };
    writeJSON(SYNC_KEY, syncCfg);
    ui.syncStatus = `Sincronizado: ${plural(res.total, 'valoración', 'valoraciones')} en total.`;
    save();
    return true;
  } catch (err) {
    ui.syncStatus = 'No se pudo sincronizar. ' + err.message;
    return false;
  } finally {
    syncing = false;
    document.body.classList.remove('syncing');
    // No repinta si estás escribiendo o con un diálogo abierto.
    if (!$dialog.open && !document.activeElement?.matches('input, textarea')) render();
  }
}

// ---------- Navegación ----------

const TITLES = { pueblos: 'Pueblos de Sevilla', ranking: 'Ranking', explorar: 'Explorar', yo: 'Mi pasaporte', ajustes: 'Ajustes' };

function render() {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $back.hidden = !townId;
  $title.textContent = townId ? findTown(townId).name : TITLES[tab];
  if (townId) renderTown();
  else ({ pueblos: renderPueblos, ranking: renderRanking, explorar: renderExplorar, yo: renderYo, ajustes: renderSettings })[tab]();
}

function openTown(id) {
  if (townId) history.replaceState({ townId: id }, '');
  else history.pushState({ townId: id }, '');
  townId = id;
  render();
  window.scrollTo(0, 0);
}

function goTab(name) {
  tab = name;
  if (townId) history.back(); // cierra la ficha
  else render();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) {
    if ($dialog.open) $dialog.close();
    return openTown(open.dataset.open);
  }
  const go = e.target.closest('[data-tab-go]');
  if (go) return goTab(go.dataset.tabGo);
  const img = e.target.closest('#view img[data-photo]');
  if (img) return openPhoto(img.dataset.photo);
  const edit = e.target.closest('[data-edit]');
  if (edit) return openReview(state.reviews.find((r) => r.id === edit.dataset.edit));
  const editPlace = e.target.closest('[data-edit-place]');
  if (editPlace) return openPlace(state.places.find((p) => p.id === editPlace.dataset.editPlace));
});

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => goTab(b.dataset.tab)));

$back.addEventListener('click', () => history.back());
window.addEventListener('popstate', (e) => {
  townId = e.state?.townId ?? null;
  render();
});

render();

if (validConfig(syncCfg)) runSync();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleSync();
});

// ---------- Instalación y sin conexión ----------

const isStandalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (isIOS && !isStandalone && !localStorage.getItem('pueblos-sevilla:hint')) {
  const hint = document.getElementById('install-hint');
  hint.hidden = false;
  document.getElementById('install-hint-close').addEventListener('click', () => {
    hint.hidden = true;
    try { localStorage.setItem('pueblos-sevilla:hint', '1'); } catch { /* sin almacenamiento */ }
  });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Cuando se instala una versión nueva de la app, recarga para usarla (no en la primera instalación).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || $dialog.open) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      // Al volver a la app (desde segundo plano) comprueba si hay versión nueva.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {});
}
