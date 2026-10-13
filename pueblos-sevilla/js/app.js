import {
  STORAGE_KEY, CATEGORIES, TOWNS, findTown, normalizeState, defaultState, townStats, townReviews,
  reviewScore, ranking, searchTowns, upsertReview, deleteReview, mergeImport, shareText, stars,
  round1, todayKey, uid,
} from './core.js';
import { COMARCAS } from './data.js';

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
let tab = 'pueblos';
let townId = null; // ficha abierta
const ui = { query: '', comarca: '', mark: '', rankCat: 'global', rankComarca: '' };

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
const $title = document.getElementById('title');
const $back = document.getElementById('back');
const $dialog = document.getElementById('dialog');
const $dialogForm = document.getElementById('dialog-form');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const fmtDate = (key) => new Date(key + 'T12:00').toLocaleDateString('es-ES', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const fmtScore = (n) => round1(n).toLocaleString('es-ES', { minimumFractionDigits: 1 });

function scoreBadge(score) {
  if (score == null) return '<span class="score none">—</span>';
  const level = score >= 4 ? 'hi' : score >= 3 ? 'mid' : 'lo';
  return `<span class="score ${level}">${fmtScore(score)}</span>`;
}

function starLine(score) {
  return `<span class="stars" aria-label="${fmtScore(score)} de 5">${stars(score)}</span>`;
}

function bar(score) {
  return `<div class="bar"><div style="width:${(score / 5) * 100}%"></div></div>`;
}

const comarcaOptions = (selected, empty) => `<option value="">${empty}</option>`
  + Object.keys(COMARCAS).map((c) => `<option ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('');

const MARK_LABEL = { visitado: '✅ Visitado', pendiente: '📌 Quiero ir' };

// ---------- Pestaña Pueblos ----------

function townRow(town) {
  const stats = townStats(state, town.id);
  const mark = state.marks[town.id];
  return `<button class="town" data-open="${town.id}">
    <div class="grow">
      <div class="name">${esc(town.name)} ${mark === 'pendiente' ? '📌' : mark === 'visitado' ? '✅' : ''}</div>
      <div class="muted small">${esc(town.comarca)}${stats.count ? ` · ${stats.count} valoraci${stats.count === 1 ? 'ón' : 'ones'}` : ''}</div>
    </div>
    ${scoreBadge(stats.overall)}
  </button>`;
}

function renderList() {
  const rated = new Set(state.reviews.map((r) => r.townId)).size;
  const towns = searchTowns(ui.query, { comarca: ui.comarca, mark: ui.mark, state });
  $view.innerHTML = `
    <div class="card">
      <input type="search" id="q" placeholder="Buscar pueblo…" value="${esc(ui.query)}" autocomplete="off">
      <div class="row" style="margin-top:8px">
        <select id="f-comarca" class="grow">${comarcaOptions(ui.comarca, 'Todas las comarcas')}</select>
        <select id="f-mark" class="grow">
          ${[['', 'Todos'], ['valorado', 'Valorados'], ['sin-valorar', 'Sin valorar'], ['pendiente', '📌 Quiero ir'], ['visitado', '✅ Visitados']]
            .map(([v, l]) => `<option value="${v}" ${v === ui.mark ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <p class="muted small" style="margin:8px 0 0">Has valorado ${rated} de ${TOWNS.length} pueblos.</p>
      <div class="bar thin">${`<div style="width:${(rated / TOWNS.length) * 100}%"></div>`}</div>
    </div>
    <div id="list" class="card list">${towns.map(townRow).join('') || '<p class="muted">No hay pueblos con ese filtro.</p>'}</div>`;

  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    ui.query = q.value;
    document.getElementById('list').innerHTML = searchTowns(ui.query, { comarca: ui.comarca, mark: ui.mark, state })
      .map(townRow).join('') || '<p class="muted">No hay pueblos con ese filtro.</p>';
  });
  document.getElementById('f-comarca').addEventListener('change', (e) => { ui.comarca = e.target.value; render(); });
  document.getElementById('f-mark').addEventListener('change', (e) => { ui.mark = e.target.value; render(); });
}

// ---------- Ficha de un pueblo ----------

function renderTown() {
  const town = findTown(townId);
  const stats = townStats(state, town.id);
  const reviews = townReviews(state, town.id);
  const mark = state.marks[town.id];

  $view.innerHTML = `
    <div class="card hero">
      <div class="row between">
        <div class="grow">
          <h2>${esc(town.name)}</h2>
          <div class="muted">${esc(town.comarca)}</div>
        </div>
        ${scoreBadge(stats.overall)}
      </div>
      ${stats.overall != null ? `<div class="row" style="margin-top:6px">${starLine(stats.overall)}
        <span class="muted small">${stats.count} valoraci${stats.count === 1 ? 'ón' : 'ones'}</span></div>` : ''}
      <div class="row" style="margin-top:12px">
        <button class="primary grow" data-act="rate">⭐ Valorar</button>
        <button class="${mark === 'pendiente' ? 'on' : ''}" data-mark="pendiente">📌 Quiero ir</button>
        <button class="${mark === 'visitado' ? 'on' : ''}" data-mark="visitado">✅ Visitado</button>
      </div>
    </div>

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
      <div class="row between"><h2>Valoraciones</h2>
        ${stats.count && navigator.share ? '<button class="icon" data-act="share" aria-label="Compartir">📤</button>' : ''}
      </div>
      ${reviews.map(reviewCard).join('') || '<p class="muted">Aún no hay valoraciones. ¡Sé el primero!</p>'}
    </div>

    <p class="center"><a class="btn" target="_blank" rel="noopener"
      href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(town.name + ', Sevilla')}">🗺️ Ver en el mapa</a></p>`;

  $view.querySelector('[data-act="rate"]').addEventListener('click', () => openReview({ townId: town.id }));
  $view.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mark;
    if (state.marks[town.id] === m) delete state.marks[town.id];
    else state.marks[town.id] = m;
    commit();
  }));
  $view.querySelector('[data-act="share"]')?.addEventListener('click', () => {
    navigator.share({ title: town.name, text: shareText(state, town.id) }).catch(() => {});
  });
  $view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    openReview(state.reviews.find((r) => r.id === b.dataset.edit));
  }));
}

function reviewCard(r) {
  return `<div class="review">
    <div class="row between">
      <div><b>${esc(r.author || 'Anónimo')}</b> <span class="muted small">· ${fmtDate(r.date)}</span></div>
      <div class="row">${scoreBadge(reviewScore(r))}<button class="icon" data-edit="${r.id}" aria-label="Editar">✏️</button></div>
    </div>
    <div class="chips">${CATEGORIES.filter((c) => r.scores[c.id])
      .map((c) => `<span class="chip">${c.icon} ${r.scores[c.id]}</span>`).join('')}</div>
    ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
    ${r.tip ? `<p class="tip">💡 ${esc(r.tip)}</p>` : ''}
  </div>`;
}

// ---------- Diálogo de valoración ----------

function openReview(review) {
  const editing = !!review.id;
  const town = findTown(review.townId);
  const scores = { ...(review.scores ?? {}) };

  $dialogForm.innerHTML = `
    <h2>${editing ? 'Editar valoración' : 'Valorar'} · ${esc(town.name)}</h2>
    <p class="muted small">Toca las estrellas. Deja sin puntuar lo que no conozcas.</p>
    ${CATEGORIES.map((c) => `<div class="rate" data-cat="${c.id}">
      <span class="cat-name">${c.icon} ${esc(c.name)}</span>
      <span class="star-input">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} estrellas">★</button>`).join('')}</span>
    </div>`).join('')}
    <label>Comentario<textarea name="comment" rows="3" maxlength="2000" placeholder="¿Qué te pareció?">${esc(review.comment)}</textarea></label>
    <label>Recomendación<input name="tip" maxlength="300" placeholder="Un bar, plato, alojamiento o rincón que no hay que perderse" value="${esc(review.tip)}"></label>
    <div class="row">
      <label class="grow">Tu nombre<input name="author" maxlength="40" value="${esc(review.author ?? state.author)}"></label>
      <label class="grow">Fecha<input type="date" name="date" value="${esc(review.date ?? todayKey())}"></label>
    </div>
    <p id="err" class="error" hidden>Puntúa al menos un aspecto.</p>
    <div class="row between" style="margin-top:12px">
      ${editing ? '<button type="button" class="danger" data-act="delete">Borrar</button>' : '<span></span>'}
      <div class="row">
        <button type="button" data-act="cancel">Cancelar</button>
        <button type="submit" class="primary">Guardar</button>
      </div>
    </div>`;

  const paint = () => $dialogForm.querySelectorAll('.rate').forEach((row) => {
    const v = scores[row.dataset.cat] ?? 0;
    row.querySelectorAll('[data-n]').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= v));
  });
  paint();

  $dialogForm.querySelectorAll('.rate [data-n]').forEach((b) => b.addEventListener('click', () => {
    const cat = b.closest('.rate').dataset.cat;
    const n = Number(b.dataset.n);
    if (scores[cat] === n) delete scores[cat]; // tocar la misma estrella la quita
    else scores[cat] = n;
    paint();
  }));
  $dialogForm.querySelector('[data-act="cancel"]').addEventListener('click', () => $dialog.close());
  $dialogForm.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    if (!confirm('¿Borrar esta valoración?')) return;
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
    upsertReview(state, {
      id: review.id ?? uid(), townId: town.id, author, date: f.get('date'), scores,
      comment: f.get('comment'), tip: f.get('tip'),
    });
    $dialog.close();
    commit();
  };
  $dialog.showModal();
}

// ---------- Ranking ----------

function renderRanking() {
  const rows = ranking(state, ui.rankCat, ui.rankComarca);
  const medal = ['🥇', '🥈', '🥉'];
  $view.innerHTML = `
    <div class="card">
      <div class="seg">
        <button data-cat="global" class="${ui.rankCat === 'global' ? 'on' : ''}">⭐ Global</button>
        ${CATEGORIES.map((c) => `<button data-cat="${c.id}" class="${ui.rankCat === c.id ? 'on' : ''}">${c.icon} ${esc(c.name.split(' ')[0])}</button>`).join('')}
      </div>
      <select id="r-comarca" style="margin-top:10px;width:100%">${comarcaOptions(ui.rankComarca, 'Toda la provincia')}</select>
    </div>
    <div class="card list">
      ${rows.map((r, i) => `<button class="town" data-open="${r.town.id}">
        <span class="pos">${medal[i] ?? i + 1}</span>
        <div class="grow">
          <div class="name">${esc(r.town.name)}</div>
          <div class="muted small">${esc(r.town.comarca)} · ${r.count} voto${r.count === 1 ? '' : 's'}</div>
        </div>
        ${scoreBadge(r.score)}
      </button>`).join('') || '<p class="muted">Todavía no hay pueblos valorados aquí. Ve a «Pueblos» y valora alguno.</p>'}
    </div>`;
  $view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { ui.rankCat = b.dataset.cat; render(); }));
  document.getElementById('r-comarca').addEventListener('change', (e) => { ui.rankComarca = e.target.value; render(); });
}

// ---------- Mis valoraciones ----------

function renderMine() {
  const reviews = [...state.reviews].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  const pending = TOWNS.filter((t) => state.marks[t.id] === 'pendiente');
  $view.innerHTML = `
    ${pending.length ? `<div class="card list"><h2>📌 Quiero ir (${pending.length})</h2>${pending.map(townRow).join('')}</div>` : ''}
    <div class="card">
      <h2>Últimas valoraciones (${reviews.length})</h2>
      ${reviews.map((r) => `<div class="mine">
        <button class="link" data-open="${r.townId}">${esc(findTown(r.townId).name)}</button>
        ${reviewCard(r)}</div>`).join('') || '<p class="muted">Todavía no has valorado ningún pueblo.</p>'}
    </div>`;
  $view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    openReview(state.reviews.find((r) => r.id === b.dataset.edit));
  }));
}

// ---------- Ajustes ----------

function renderSettings() {
  $view.innerHTML = `
    <div class="card">
      <h2>Tu nombre</h2>
      <p class="muted small">Aparece en tus valoraciones (útil si juntas las de varios amigos).</p>
      <input id="author" maxlength="40" value="${esc(state.author)}" placeholder="Por ejemplo: Ana">
    </div>
    <div class="card">
      <h2>Compartir con amigos y copias de seguridad</h2>
      <p class="muted small">Exporta tus valoraciones y mándaselas a quien quieras. Al importar el archivo de otra
        persona, sus valoraciones se <b>suman</b> a las tuyas (no se borra nada) y las medias se recalculan.</p>
      <div class="row">
        <button data-act="export">⬇️ Exportar</button>
        <label class="btn">⬆️ Importar<input type="file" id="import" accept="application/json,.json" hidden></label>
      </div>
    </div>
    <div class="card">
      <h2>Borrar todo</h2>
      <button class="danger" data-act="reset">Borrar todas las valoraciones</button>
    </div>
    <p class="muted small center">${TOWNS.length} municipios de la provincia de Sevilla · Los datos se guardan solo en este móvil.</p>`;

  document.getElementById('author').addEventListener('change', (e) => { state.author = e.target.value.trim(); save(); });
  $view.querySelector('[data-act="export"]').addEventListener('click', exportData);
  document.getElementById('import').addEventListener('change', importData);
  $view.querySelector('[data-act="reset"]').addEventListener('click', () => {
    if (!confirm('¿Seguro? Se borrarán todas las valoraciones y marcas.')) return;
    state = { ...defaultState(), author: state.author };
    commit();
  });
}

async function exportData() {
  const name = `pueblos-sevilla-${state.author ? state.author.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${todayKey()}.json`;
  const file = new File([JSON.stringify(state, null, 2)], name, { type: 'application/json' });
  // En el móvil, abre el menú de compartir (WhatsApp, correo, Archivos…).
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Valoraciones de pueblos de Sevilla' }); return; } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { added, updated } = mergeImport(state, JSON.parse(await file.text()));
    commit();
    alert(`Importado: ${added} valoraciones nuevas, ${updated} actualizadas.`);
  } catch {
    alert('El archivo no es válido.');
  }
}

// ---------- Navegación ----------

const TITLES = { pueblos: 'Pueblos de Sevilla', ranking: 'Ranking', mias: 'Mis valoraciones', ajustes: 'Ajustes' };

function render() {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $back.hidden = !townId;
  $title.textContent = townId ? findTown(townId).name : TITLES[tab];
  if (townId) renderTown();
  else ({ pueblos: renderList, ranking: renderRanking, mias: renderMine, ajustes: renderSettings })[tab]();
}

function openTown(id, push = true) {
  townId = id;
  if (push) history.pushState({ townId: id }, '');
  render();
  window.scrollTo(0, 0);
}

$view.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) openTown(b.dataset.open);
});

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  if (townId) history.back(); // cierra la ficha
  else render();
  window.scrollTo(0, 0);
}));

$back.addEventListener('click', () => history.back());
window.addEventListener('popstate', (e) => {
  townId = e.state?.townId ?? null;
  render();
});

render();

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
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
