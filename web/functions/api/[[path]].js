// Červený pomeranč – push upozornění (ranní poklady + hlídací pes ceny).
// Běží jako Cloudflare Pages Function. Úložiště: KV namespace navázaný jako PUSH.
//
// GET  /api/vapid              -> veřejný VAPID klíč (při prvním volání se klíče vygenerují a uloží do KV)
// POST /api/subscribe          {sub, air?, daily?}         -> uloží odběr, vrátí {id}
// POST /api/unsubscribe        {id}
// POST /api/watch              {id, gid, file, name, price} -> přidá hlídaný hotel
// POST /api/unwatch            {id, gid}
// GET  /api/me?id=             -> stav odběru (hlídané hotely)
// GET  /api/inbox?id=          -> zprávy pro service worker (po přečtení se smažou)
// GET|POST /api/notify         -> projde odběratele po dávkách, rozešle push (volá GitHub Actions po aktualizaci dat)
//
// Push zprávy jsou bez obsahu (bez šifrování payloadu). Service worker si po probuzení stáhne text z /api/inbox.

const J = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = new TextEncoder();
async function sha(s) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 22); }
const kc = (n) => Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ') + ' Kč';
const AIR_FROM = { PRG: 'z Prahy', BRQ: 'z Brna', OSR: 'z Ostravy', PED: 'z Pardubic', VIE: 'z Vídně', KTW: 'z Katovic', BTS: 'z Bratislavy', BUD: 'z Budapešti', KRK: 'z Krakova' };

function pragueNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: +p.hour + +p.minute / 60 };
}

// ------------------------------------------------------------ VAPID
async function vapid(env) {
  let k = await env.PUSH.get('vapid', 'json');
  if (k) return k;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  k = { jwk: await crypto.subtle.exportKey('jwk', pair.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)) };
  await env.PUSH.put('vapid', JSON.stringify(k));
  return k;
}
async function vapidHeader(env, endpoint) {
  const k = await vapid(env);
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:info@cervenypomeranc.cz' })));
  const key = await crypto.subtle.importKey('jwk', k.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${k.pub}`;
}
async function sendPush(env, sub) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidHeader(env, sub.endpoint), TTL: '43200', Urgency: 'normal', 'Content-Length': '0' },
  });
  return r.status;
}

// ------------------------------------------------------------ data webu
async function asset(env, req, path) {
  const r = await env.ASSETS.fetch(new URL(path, req.url));
  if (!r.ok) throw new Error('asset ' + path + ' ' + r.status);
  return r.json();
}
function dailySummary(M, air) {
  const H = M.h, rows = air ? M.o.filter((r) => r[4] === air) : M.o;
  const seenNew = new Set(), seenDrop = new Set();
  let top = null, topScore = 0;
  for (const r of rows) {
    const hist = Array.isArray(r[10]) ? r[10] : null;
    const mx = hist ? Math.max(...hist) : r[6];
    const drop = mx > r[6] ? (mx - r[6]) / mx : 0;
    if (r[9] <= 1) seenNew.add(r[0]);
    if (drop >= 0.05) seenDrop.add(r[0]);
    const score = Math.max(drop * 100, r[7] || 0);
    if (score > topScore) { topScore = score; top = { r, drop }; }
  }
  const n = seenNew.size, d = seenDrop.size;
  let body = '';
  if (top) {
    const h = H[top.r[0]];
    body = `${h[4] || h[3]}: ${h[1]} od ${kc(top.r[6])}` + (top.drop >= 0.05 ? ` (−${Math.round(top.drop * 100)} %)` : top.r[7] ? ` (sleva ${top.r[7]} %)` : '');
  }
  const head = [n ? `${n} nových` : '', d ? `${d} zlevnilo` : ''].filter(Boolean).join(', ');
  return {
    title: '☀ Ranní poklady' + (air && AIR_FROM[air] ? ' ' + AIR_FROM[air] : '') + (head ? ': ' + head : ''),
    body: body || 'Podívej se, co je dnes nového.',
    url: '/?utm_source=push&utm_campaign=ranni#vypis',
    badge: Math.min(99, n + d) || undefined,
    tag: 'ranni',
  };
}

// průběžné upozornění během dne: nejsilnější novinka z poslední aktualizace
function flashPick(M, recent) {
  const H = M.h; let best = null, bs = 0;
  for (const r of M.o) {
    const h = H[r[0]]; if (!h || (h[2] || 0) < 4 || recent.includes(h[0])) continue;
    const hist = Array.isArray(r[10]) ? r[10] : null, mx = hist ? Math.max(...hist) : r[6];
    const drop = mx > r[6] ? (mx - r[6]) / mx : 0, isNew = r[9] <= 1;
    const days = (new Date(r[2] + 'T00:00:00') - Date.now()) / 864e5; if (days < 2) continue;
    const sc = Math.max(drop * 100, (r[7] || 0) * 0.8) + (isNew ? 4 : 0);
    if (sc > bs && (drop >= 0.08 || (r[7] || 0) >= 20)) { bs = sc; best = { r, h, drop }; }
  }
  if (!best) return null;
  const { r, h, drop } = best, place = h[4] && h[4] !== h[3] ? `${h[4]}, ${h[3]}` : h[3];
  const dep = r[2].split('-').reverse().slice(0, 2).map(Number).join('. ') + '.';
  return {
    gid: h[0],
    msg: {
      title: drop >= 0.08 ? `▼ Zlevnilo o ${Math.round(drop * 100)} %: ${place}` : `🔥 Sleva ${r[7]} %: ${place}`,
      body: `${h[1]} ${'★'.repeat(Math.round(h[2] || 0))} od ${kc(r[6])}, odlet ${dep}` ,
      url: `/?utm_source=push&utm_campaign=flash#hotel-${h[0]}`, tag: 'flash', badge: 1,
    },
  };
}

// ------------------------------------------------------------ odběratelé
async function getSub(env, id) { return id ? env.PUSH.get('sub:' + id, 'json') : null; }
async function putSub(env, id, s) { await env.PUSH.put('sub:' + id, JSON.stringify(s)); }
async function addInbox(env, id, msgs) {
  const cur = (await env.PUSH.get('inbox:' + id, 'json')) || [];
  await env.PUSH.put('inbox:' + id, JSON.stringify(cur.concat(msgs).slice(-10)), { expirationTtl: 7 * 86400 });
}

async function notify(env, req) {
  // Šetříme zápisy do KV (zdarma 1 000/den): ranní zprávu ukládáme jednou pro všechny (podle letiště),
  // do odběratele se zapisuje jen při skutečném poklesu hlídané ceny.
  const now = pragueNow();
  const M = await asset(env, req, '/data/main.json');
  const st = (await env.PUSH.get('notify:state', 'json')) || {};
  const dailyDue = (now.hour >= 7.75 && now.hour < 20 && st.dailyDay !== now.day) || (env.ALLOW_HTTP && new URL(req.url).searchParams.get('force') === 'daily');
  const gen = M.gen;
  if (!st.run || st.run.gen !== gen || st.run.done) {
    if (st.run && st.run.gen === gen && st.run.done && !dailyDue) return { done: true, note: 'nic nového' };
    st.run = { gen, cursor: null, done: false, daily: dailyDue, flash: false, sent: 0, gone: 0 };
    // přes den (9–21 h) po každé aktualizaci jedna novinka, pokud je opravdu silná
    if (!dailyDue && now.hour >= 9 && now.hour < 21) {
      const f = flashPick(M, st.flashRecent || []);
      if (f) {
        await env.PUSH.put('flash', JSON.stringify({ gen, msg: f.msg }), { expirationTtl: 86400 });
        st.flashRecent = [f.gid].concat(st.flashRecent || []).slice(0, 30);
        st.run.flash = true;
      }
    }
    if (dailyDue) {
      const byAir = {};
      for (const a of ['', 'PRG', 'BRQ', 'OSR', 'PED', 'VIE', 'KTW', 'BTS']) byAir[a] = dailySummary(M, a || null);
      await env.PUSH.put('daily', JSON.stringify({ day: now.day, byAir }), { expirationTtl: 3 * 86400 });
    }
  }
  const run = st.run;
  const list = await env.PUSH.list({ prefix: 'sub:', cursor: run.cursor || undefined, limit: 25 });
  const files = {};
  for (const k of list.keys) {
    const id = k.name.slice(4), s = await getSub(env, id);
    if (!s) continue;
    let push = (run.daily || run.flash) && s.daily !== false;
    const msgs = [];
    if (s.watch && s.watch.length) {
      for (const w of s.watch) {
        try {
          const D = files[w.file] || (files[w.file] = await asset(env, req, `/data/d/${w.file}.json`));
          const H = D.h[w.gid];
          if (!H || !H.t.length) continue;
          const best = H.t.reduce((a, t) => (t[5] < a[5] ? t : a));
          if (best[5] <= w.price - 200 && best[5] <= w.price * 0.98) {
            msgs.push({ title: `▼ ${w.name} zlevnil`, body: `Teď od ${kc(best[5])} (dřív ${kc(w.price)}), odlet ${best[1].split('-').reverse().map(Number).join('. ')}.`, url: `/?utm_source=push&utm_campaign=hlidac#hotel-${w.gid}`, tag: 'hlidac-' + w.gid, badge: 1 });
            w.price = best[5];
          }
        } catch {}
      }
      if (msgs.length) { await addInbox(env, id, msgs); await putSub(env, id, s); push = true; }
    }
    if (push) {
      const code = await sendPush(env, s);
      if (code === 404 || code === 410) { await env.PUSH.delete('sub:' + id); await env.PUSH.delete('inbox:' + id); run.gone++; continue; }
      run.sent++;
    }
  }
  run.cursor = list.list_complete ? null : list.cursor;
  if (list.list_complete) { run.done = true; if (run.daily) st.dailyDay = now.day; }
  await env.PUSH.put('notify:state', JSON.stringify(st));
  return { done: run.done, sent: run.sent, gone: run.gone, daily: run.daily, flash: run.flash };
}

// ------------------------------------------------------------ vlastní měření (D1 databáze STATS)
// Bez cookies: návštěvník = otisk z IP + prohlížeče + dne (sůl), nikdy se neukládá IP ani nic osobního.
let STATS_READY = false;
async function statsDb(env) {
  if (!env.STATS) return null;
  if (!STATS_READY) {
    await env.STATS.batch([
      env.STATS.prepare('CREATE TABLE IF NOT EXISTS ev (ts INTEGER, day TEXT, uid TEXT, ev TEXT, app INTEGER, src TEXT, k TEXT, x TEXT, v INTEGER, ctry TEXT)'),
      env.STATS.prepare('CREATE INDEX IF NOT EXISTS ev_day ON ev(day, ev)'),
    ]);
    STATS_READY = true;
  }
  return env.STATS;
}
const EVS = new Set(['view', 'detail', 'click', 'inst_show', 'inst_ok', 'push_on', 'app_first', 'search', 'share', 'watch', 'seen', 'stay', 'ab', 'lock_cta', 'unlock']);
const cut = (v, n) => (v == null ? null : String(v).slice(0, n));
async function logEvents(env, req, body) {
  const db = await statsDb(env); if (!db) return;
  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|preview|headless|lighthouse/i.test(ua)) return;
  const day = pragueNow().day, salt = (await vapid(env)).pub.slice(0, 12);
  const uid = (await sha((req.headers.get('cf-connecting-ip') || '') + '|' + ua + '|' + day + '|' + salt)).slice(0, 16);
  const ctry = (req.cf && req.cf.country) || null, now = Date.now();
  const list = (Array.isArray(body.e) ? body.e : [body]).slice(0, 10).filter((e) => e && EVS.has(e.ev));
  if (!list.length) return;
  const st = db.prepare('INSERT INTO ev (ts,day,uid,ev,app,src,k,x,v,ctry) VALUES (?,?,?,?,?,?,?,?,?,?)');
  await db.batch(list.map((e) => st.bind(now, day, uid, e.ev, e.app ? 1 : 0, cut(e.src, 60), cut(e.k, 60), cut(e.x, 80), Number.isFinite(+e.v) ? Math.round(+e.v) : null, ctry)));
}
async function prehled(env) {
  const db = await statsDb(env);
  const d0 = new Date(Date.now() - 29 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
  const out = { gen: new Date().toISOString(), db: !!db };
  if (db) {
    const q = (sql, ...a) => db.prepare(sql).bind(...a).all().then((r) => r.results);
    [out.days, out.appDays, out.src, out.clicksBy, out.topDest, out.ctry, out.inst, out.seen, out.stay, out.ab] = await Promise.all([
      q("SELECT day, ev, COUNT(*) n, COUNT(DISTINCT uid) u, SUM(v) v FROM ev WHERE day >= ? GROUP BY day, ev ORDER BY day", d0),
      q("SELECT day, COUNT(DISTINCT uid) u FROM ev WHERE day >= ? AND app = 1 GROUP BY day", d0),
      q("SELECT COALESCE(src,'přímo') src, COUNT(DISTINCT uid||day) u FROM ev WHERE day >= ? AND ev = 'view' GROUP BY 1 ORDER BY 2 DESC LIMIT 12", d0),
      q("SELECT COALESCE(k,'?') k, COUNT(*) n, SUM(v) v FROM ev WHERE day >= ? AND ev = 'click' GROUP BY 1 ORDER BY 2 DESC", d0),
      q("SELECT x, COUNT(*) n FROM ev WHERE day >= ? AND ev IN ('detail','click') AND x IS NOT NULL GROUP BY x ORDER BY 2 DESC LIMIT 12", d0),
      q("SELECT COALESCE(ctry,'?') c, COUNT(DISTINCT uid||day) u FROM ev WHERE day >= ? AND ev = 'view' GROUP BY 1 ORDER BY 2 DESC LIMIT 8", d0),
      q("SELECT COALESCE(k,'?') k, ev, COUNT(DISTINCT uid||day) u FROM ev WHERE day >= ? AND ev IN ('inst_show','inst_ok') GROUP BY 1,2", d0),
      q("SELECT day, k, COUNT(DISTINCT uid) u FROM ev WHERE day >= ? AND ev = 'seen' GROUP BY 1,2", d0),
      q("SELECT day, v, COUNT(DISTINCT uid) u FROM ev WHERE day >= ? AND ev = 'stay' GROUP BY 1,2", d0),
      q("SELECT a.k v, COUNT(DISTINCT a.uid||a.day) lide, COUNT(DISTINCT CASE WHEN e.ev='detail' THEN e.uid||e.day END) det, COUNT(DISTINCT CASE WHEN e.ev='click' THEN e.uid||e.day END) klik, COUNT(DISTINCT CASE WHEN e.ev='inst_show' THEN e.uid||e.day END) vyzva, COUNT(DISTINCT CASE WHEN e.ev='lock_cta' THEN e.uid||e.day END) cta, COUNT(DISTINCT CASE WHEN e.ev='unlock' THEN e.uid||e.day END) odemkli, COUNT(DISTINCT CASE WHEN e.ev='stay' AND e.v>=60 THEN e.uid||e.day END) min1 FROM ev a LEFT JOIN ev e ON e.uid = a.uid AND e.day = a.day AND e.ev IN ('detail','click','inst_show','lock_cta','unlock','stay') WHERE a.ev = 'ab' AND a.day >= ? GROUP BY a.k", d0),
    ]);
  }
  // odběratelé upozornění
  const subs = { total: 0, daily: 0, watching: 0, watches: 0, air: {}, new7: 0 };
  let cursor;
  do {
    const l = await env.PUSH.list({ prefix: 'sub:', cursor, limit: 1000 });
    for (const k of l.keys.slice(0, 1000)) {
      const s = await env.PUSH.get(k.name, 'json'); if (!s) continue;
      subs.total++; if (s.daily !== false) subs.daily++;
      if (s.watch && s.watch.length) { subs.watching++; subs.watches += s.watch.length; }
      const a = s.air || 'kdekoli'; subs.air[a] = (subs.air[a] || 0) + 1;
      if (s.created && Date.now() - s.created < 7 * 864e5) subs.new7++;
    }
    cursor = l.list_complete || subs.total >= 3000 ? null : l.cursor;
  } while (cursor);
  out.subs = subs;
  out.notify = await env.PUSH.get('notify:state', 'json').then((x) => x && { lastRun: x.run, dailyDay: x.dailyDay, flashRecent: (x.flashRecent || []).length }).catch(() => null);
  return out;
}

// ------------------------------------------------------------ router
export async function onRequest(ctx) {
  const { request: req, env } = ctx;
  if (!env.PUSH) return J({ error: 'Push zatím není zapnutý (chybí KV PUSH).' }, 503);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  try {
    switch (path) {
      case 'vapid': return J({ key: (await vapid(env)).pub });
      case 'subscribe': {
        const sub = body.sub;
        if (!sub || !sub.endpoint || !(/^https:\/\//.test(sub.endpoint) || env.ALLOW_HTTP)) return J({ error: 'chybí odběr' }, 400);
        const id = await sha(sub.endpoint);
        const s = (await getSub(env, id)) || { created: Date.now(), watch: [] };
        s.endpoint = sub.endpoint;
        if (body.air !== undefined) s.air = body.air || null;
        if (body.daily !== undefined) s.daily = !!body.daily;
        await putSub(env, id, s);
        return J({ id, daily: s.daily !== false, air: s.air || null, watch: s.watch });
      }
      case 'unsubscribe': { await env.PUSH.delete('sub:' + body.id); await env.PUSH.delete('inbox:' + body.id); return J({ ok: true }); }
      case 'me': { const s = await getSub(env, url.searchParams.get('id')); return s ? J({ daily: s.daily !== false, air: s.air || null, watch: s.watch || [] }) : J({ error: 'neznámý odběr' }, 404); }
      case 'watch': {
        const s = await getSub(env, body.id);
        if (!s) return J({ error: 'neznámý odběr' }, 404);
        if (!body.gid || !body.file || !(body.price > 0)) return J({ error: 'chybí hotel' }, 400);
        s.watch = (s.watch || []).filter((w) => w.gid !== body.gid);
        s.watch.unshift({ gid: String(body.gid).slice(0, 64), file: String(body.file).replace(/[^a-z0-9-]/g, '').slice(0, 64), name: String(body.name || 'Hotel').slice(0, 80), price: Math.round(body.price), since: Date.now() });
        s.watch = s.watch.slice(0, 20);
        await putSub(env, body.id, s);
        return J({ ok: true, watch: s.watch });
      }
      case 'unwatch': {
        const s = await getSub(env, body.id);
        if (s) { s.watch = (s.watch || []).filter((w) => w.gid !== body.gid); await putSub(env, body.id, s); }
        return J({ ok: true, watch: s ? s.watch : [] });
      }
      case 'inbox': {
        const id = url.searchParams.get('id');
        const msgs = (await env.PUSH.get('inbox:' + id, 'json')) || [];
        if (msgs.length) await env.PUSH.delete('inbox:' + id);
        const s = await getSub(env, id), d = await env.PUSH.get('daily', 'json');
        if (s && s.daily !== false && d && d.day === pragueNow().day) {
          const m = d.byAir[s.air || ''] || d.byAir[''];
          if (m) msgs.unshift(Object.assign({ once: 'ranni-' + d.day }, m));
        }
        const f = s && s.daily !== false ? await env.PUSH.get('flash', 'json') : null;
        if (f && f.msg) msgs.push(Object.assign({ once: 'flash-' + f.gen }, f.msg));
        return J({ msgs });
      }
      case 'notify': return J(await notify(env, req));
      case 'e': { try { await logEvents(env, req, body); } catch (e) {} return new Response(null, { status: 204 }); }
      case 'prehled-klic': {
        // jednorázově vydá klíč k přehledu; podruhé už ne
        if (await env.PUSH.get('prehled:key')) return J({ error: 'klíč už byl vydán' }, 403);
        const key = b64u(crypto.getRandomValues(new Uint8Array(15)));
        await env.PUSH.put('prehled:key', key);
        return J({ key });
      }
      case 'prehled': {
        const key = await env.PUSH.get('prehled:key');
        if (!key || req.headers.get('x-key') !== key) return J({ error: 'špatný klíč' }, 403);
        return J(await prehled(env));
      }
      case 'stats': {
        const ck = new Request(new URL('/api/stats', req.url)), cache = caches.default;
        const hit = await cache.match(ck); if (hit) return hit;
        let n = 0, cursor; do { const l = await env.PUSH.list({ prefix: 'sub:', cursor, limit: 1000 }); n += l.keys.length; cursor = l.list_complete ? null : l.cursor; } while (cursor);
        const res = J({ upozorneni: n, cas: new Date().toISOString() });
        res.headers.set('cache-control', 'public, max-age=600'); await cache.put(ck, res.clone()); return res;
      }
      default: return J({ error: 'neznámá cesta' }, 404);
    }
  } catch (e) {
    return J({ error: String(e && e.message || e) }, 500);
  }
}
