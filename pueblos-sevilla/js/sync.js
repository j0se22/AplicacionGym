// Valoraciones compartidas con Supabase (opcional).
// Usa la API REST directamente (sin librerías) y una sesión anónima por móvil:
// cada persona solo puede editar y borrar lo suyo (lo garantizan las reglas de supabase.sql).
import { mergeRemote, markSynced } from './core.js';

const TABLES = {
  reviews: {
    toRow: (r) => ({
      id: r.id, town_id: r.townId, author: r.author, date: r.date, scores: r.scores,
      comment: r.comment, tip: r.tip, photos: r.photos, updated_at: r.updatedAt,
    }),
    fromRow: (row, me) => ({
      id: row.id, townId: row.town_id, author: row.author, date: row.date, scores: row.scores,
      comment: row.comment, tip: row.tip, photos: row.photos, updatedAt: Number(row.updated_at), mine: row.user_id === me,
    }),
  },
  places: {
    toRow: (p) => ({
      id: p.id, town_id: p.townId, name: p.name, kind: p.kind, score: p.score, note: p.note,
      author: p.author, updated_at: p.updatedAt,
    }),
    fromRow: (row, me) => ({
      id: row.id, townId: row.town_id, name: row.name, kind: row.kind, score: row.score, note: row.note,
      author: row.author, updatedAt: Number(row.updated_at), mine: row.user_id === me,
    }),
  },
};

export class SyncError extends Error {}

export function validConfig(cfg) {
  return !!cfg && /^https:\/\/[\w.-]+(:\d+)?\/?$/.test(cfg.url ?? '') && typeof cfg.key === 'string' && cfg.key.length > 20;
}

// cfg: { url, key, session? }. Llama a onSession(session) cuando la sesión cambia para guardarla.
export function createSync(cfg, { fetchImpl = fetch, onSession = () => {}, now = () => Date.now() } = {}) {
  const base = cfg.url.replace(/\/$/, '');
  let session = cfg.session ?? null;

  async function call(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}) {
    const h = { apikey: cfg.key, ...headers };
    if (auth) h.Authorization = `Bearer ${session.accessToken}`;
    if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetchImpl(base + path, { method, headers: h, body: raw ? body : body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new SyncError('Sin conexión con el servidor');
    }
    if (!res.ok) {
      let msg = '';
      try { const j = await res.json(); msg = j.message || j.msg || j.error_description || j.error || ''; } catch { /* sin cuerpo */ }
      throw new SyncError(`Error ${res.status}${msg ? ': ' + msg : ''}`);
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  }

  function setSession(j) {
    session = {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: now() + (Number(j.expires_in) || 3600) * 1000,
      userId: j.user?.id ?? session?.userId,
    };
    onSession(session);
  }

  async function ensureSession() {
    if (session && session.expiresAt - 60_000 > now()) return session;
    if (session?.refreshToken) {
      try {
        setSession(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refreshToken }, auth: false }));
        return session;
      } catch { /* sesión caducada: se crea otra (lo anterior queda como de otra persona) */ }
    }
    setSession(await call('/auth/v1/signup', { method: 'POST', body: {}, auth: false }));
    return session;
  }

  async function pullTable(table) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const page = await call(`/rest/v1/${table}?select=*&order=id`, { headers: { Range: `${from}-${from + 999}` } });
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  // Sube las fotos locales (idb:) de una valoración y devuelve sus URLs públicas.
  async function uploadPhotos(review, getPhoto) {
    const out = [];
    for (const p of review.photos) {
      if (!p.startsWith('idb:')) { out.push(p); continue; }
      const blob = await getPhoto(p.slice(4));
      if (!blob) continue;
      const path = `${session.userId}/${p.slice(4)}.jpg`;
      await call(`/storage/v1/object/fotos/${path}`, {
        method: 'POST', body: blob, raw: true, headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      });
      out.push(`${base}/storage/v1/object/public/fotos/${path}`);
    }
    return out;
  }

  // Sube lo pendiente, descarga todo y lo une con lo local. Modifica `state`.
  async function sync(state, { getPhoto = async () => null } = {}) {
    await ensureSession();
    const done = { reviews: [], places: [], deleted: { reviews: [], places: [] } };
    for (const kind of ['reviews', 'places']) {
      for (const id of state.deleted[kind]) {
        await call(`/rest/v1/${kind}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        done.deleted[kind].push(id);
      }
      const items = state[kind].filter((x) => state.dirty[kind].includes(x.id) && x.mine);
      if (kind === 'reviews') for (const r of items) r.photos = await uploadPhotos(r, getPhoto);
      if (items.length) {
        await call(`/rest/v1/${kind}?on_conflict=id`, {
          method: 'POST', body: items.map(TABLES[kind].toRow),
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        });
      }
      done[kind] = items.map((x) => x.id);
    }
    markSynced(state, done);
    const remote = {};
    for (const kind of ['reviews', 'places']) {
      remote[kind] = (await pullTable(kind)).map((row) => TABLES[kind].fromRow(row, session.userId));
    }
    mergeRemote(state, remote);
    return { uploaded: done.reviews.length + done.places.length, total: remote.reviews.length };
  }

  return { sync, ensureSession, get session() { return session; } };
}
