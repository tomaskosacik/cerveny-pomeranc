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

// ------------------------------------------------------------ odběratelé
async function getSub(env, id) { return id ? env.PUSH.get('sub:' + id, 'json') : null; }
async function putSub(env, id, s) { await env.PUSH.put('sub:' + id, JSON.stringify(s)); }
async function addInbox(env, id, msgs) {
  const cur = (await env.PUSH.get('inbox:' + id, 'json')) || [];
  await env.PUSH.put('inbox:' + id, JSON.stringify(cur.concat(msgs).slice(-10)), { expirationTtl: 7 * 86400 });
}

async function notify(env, req) {
  const now = pragueNow();
  const M = await asset(env, req, '/data/main.json');
  const st = (await env.PUSH.get('notify:state', 'json')) || {};
  const dailyDue = (now.hour >= 7.75 && now.hour < 20 && st.dailyDay !== now.day) || (env.ALLOW_HTTP && new URL(req.url).searchParams.get('force') === 'daily');
  const gen = M.gen;
  if (!st.run || st.run.gen !== gen || st.run.done) {
    if (st.run && st.run.gen === gen && st.run.done && !dailyDue) return { done: true, note: 'nic nového' };
    st.run = { gen, cursor: null, done: false, daily: dailyDue, sent: 0, gone: 0 };
  }
  const run = st.run;
  const list = await env.PUSH.list({ prefix: 'sub:', cursor: run.cursor || undefined, limit: 25 });
  const files = {};
  for (const k of list.keys) {
    const id = k.name.slice(4), s = await getSub(env, id);
    if (!s) continue;
    const msgs = [];
    if (run.daily && s.daily !== false && s.lastDaily !== now.day) { msgs.push(dailySummary(M, s.air)); s.lastDaily = now.day; }
    if (s.watch && s.watch.length && s.lastGen !== gen) {
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
      s.lastGen = gen;
    }
    if (msgs.length) {
      await addInbox(env, id, msgs);
      const code = await sendPush(env, s);
      if (code === 404 || code === 410) { await env.PUSH.delete('sub:' + id); await env.PUSH.delete('inbox:' + id); run.gone++; continue; }
      run.sent++;
    }
    await putSub(env, id, s);
  }
  run.cursor = list.list_complete ? null : list.cursor;
  if (list.list_complete) { run.done = true; if (run.daily) st.dailyDay = now.day; }
  await env.PUSH.put('notify:state', JSON.stringify(st));
  return { done: run.done, sent: run.sent, gone: run.gone, daily: run.daily };
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
        return J({ msgs });
      }
      case 'notify': return J(await notify(env, req));
      default: return J({ error: 'neznámá cesta' }, 404);
    }
  } catch (e) {
    return J({ error: String(e && e.message || e) }, 500);
  }
}
