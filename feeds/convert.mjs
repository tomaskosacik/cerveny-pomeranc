// Červený pomeranč – stažení a sjednocení XML feedů partnerů (Dovolená.cz, Invia.cz).
//
//   node convert.mjs            -> stáhne všechny feedy z feeds.json do raw/<partner>/ a převede
//   node convert.mjs --local    -> převede jen to, co už leží v raw/
//
// Výstup (out/):
//   offers.xml   – 1 <offer> = 1 termín u 1 partnera (pro importer v Next.js, recordElement "offer")
//   hotels.xml   – 1 <hotel> = sloučený hotel napříč partnery, nejlevnější termín u každého partnera
//   data.json    – kompaktní data pro statický web
//   report.txt   – počty, chyby, nenamapované hodnoty
//
// Affiliate odkazy přebíráme z feedů beze změny – už obsahují naše ID (Dovolená: cid, Invia: aid).

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';

const HERE = new URL('.', import.meta.url).pathname;
const OUT = HERE + 'out/';
const cfg = JSON.parse(await readFile(HERE + 'feeds.json', 'utf8'));
const LOCAL = process.argv.includes('--local');

// ------------------------------------------------------------ číselníky
const BOARD = {
  'bez stravy': 'RO', 'snídaně': 'BB', 'polopenze': 'HB', 'polopenze s nápoji': 'HB', 'večeře': 'HB',
  'plná penze': 'FB', 'all inclusive': 'AI', 'light all inclusive': 'AI', 'ultra all inclusive': 'UAI',
};
const AIRPORT = {
  'praha': 'PRG', 'brno': 'BRQ', 'ostrava': 'OSR', 'pardubice': 'PED', 'karlovy vary': 'KLV', 'české budějovice': 'JCL',
  'vídeň': 'VIE', 'bratislava': 'BTS', 'košice': 'KSC', 'katovice': 'KTW', 'katowice': 'KTW', 'krakov': 'KRK',
  'vratislav': 'WRO', 'varšava': 'WAW', 'budapešť': 'BUD', 'salzburg': 'SZG', 'graz': 'GRZ', 'mnichov': 'MUC',
  'berlín': 'BER', 'drážďany': 'DRS', 'frankfurt nad mohanem': 'FRA',
};
const TRANSPORT = { 'letecky': 'flight', 'autobusem': 'bus', 'autobus': 'bus', 'vlastní': 'own', 'vlastní doprava': 'own', 'vlakem': 'train' };
const unknown = { board: new Set(), airport: new Set(), transport: new Set() };
const mapBoard = (s) => { if (!s) return; const v = BOARD[s.toLowerCase()]; if (!v) unknown.board.add(s); return v; };
const mapAirport = (s) => { if (!s) return; const v = AIRPORT[s.toLowerCase()]; if (!v) unknown.airport.add(s); return v; };
const mapTransport = (s) => { if (!s) return; const v = TRANSPORT[s.toLowerCase()]; if (!v) unknown.transport.add(s); return v ?? s; };

// ------------------------------------------------------------ pomocné
const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#t',
  isArray: (n) => ['hotel', 'offer', 'image', 'photo', 'review', 'airport', 'type'].includes(n),
  parseTagValue: false, trimValues: true, processEntities: true, htmlEntities: true,
});
const txt = (v) => { if (Array.isArray(v)) v = v[0]; const s = v == null ? undefined : typeof v === 'object' ? v['#t'] : v; return s == null ? undefined : String(s).trim() || undefined; };
const num = (v) => { const s = txt(v); if (!s) return; const n = Number(s.replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : undefined; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nightsBetween = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : undefined);
const stripHtml = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function perex(html) {
  const t = stripHtml(html).replace(/^Popis\s+Popis ubytování\s*/i, '').replace(/^Popis\s*/i, '');
  if (t.length <= 260) return t;
  const cut = t.slice(0, 260), dot = cut.lastIndexOf('. ');
  return dot > 120 ? cut.slice(0, dot + 1) : cut.trim() + '…';
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ stažení
async function download(partner) {
  const p = cfg[partner];
  await mkdir(`${HERE}raw/${partner}`, { recursive: true });
  const queue = [...p.feeds], log = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let f; (f = queue.shift()); ) {
      const url = p.base + f.id + (p.suffix || '');
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const r = await fetch(url, { headers: { 'user-agent': 'CervenyPomeranc-feed/1.0' } });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const xml = await r.text();
          if (!/<(hotels|offers)[\s>]/.test(xml)) throw new Error('neočekávaný obsah');
          await writeFile(`${HERE}raw/${partner}/${f.name}.xml`, xml);
          console.log(`✓ ${partner}/${f.name} ${(xml.length / 1048576).toFixed(1)} MB`);
          break;
        } catch (e) {
          console.warn(`✗ ${partner}/${f.name} pokus ${attempt}: ${e.message}`);
          if (attempt === 3) log.push(`${partner}/${f.name}: NESTAŽENO (${e.message}) – použije se poslední uložená verze, pokud existuje`);
          else await sleep(4000 * attempt);
        }
      }
    }
  }));
  return log;
}

async function readRaw(partner) {
  const dir = `${HERE}raw/${partner}/`;
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith('.xml')); } catch {}
  return Promise.all(files.map(async (f) => ({ name: f.replace(/\.xml$/, ''), xml: await readFile(dir + f, 'utf8') })));
}

// ------------------------------------------------------------ parsery
const hotels = new Map();  // "partner:hotelId" -> hotel
const offers = new Map();  // "partner:offerId" -> offer
const report = [];

function addHotel(key, h) { const cur = hotels.get(key); if (cur) { cur.feeds.add(h.feed); return cur; } h.feeds = new Set([h.feed]); hotels.set(key, h); return h; }

function parseDovolena(src) {
  const list = parser.parse(src.xml)?.hotels?.hotel ?? [];
  let n = 0;
  for (const h of list) {
    const hid = h['@id']; if (!hid) continue;
    const gps = txt(h.gps)?.split(',').map(Number);
    const key = 'dovolena:' + hid;
    addHotel(key, {
      key, partner: 'dovolena', pid: hid, feed: src.name,
      name: txt(h.name), stars: num(h.category),
      country: txt(h.destination?.country), locality: txt(h.destination?.locality),
      lat: gps?.[0], lng: gps?.[1],
      image: txt(h.image), gallery: (h.gallery?.image ?? []).map(txt).filter(Boolean).slice(0, 8),
      rating: num(h.rating?.total), ratingScale: 5, ratingCount: num(h.rating?.count),
      url: txt(h.url), perex: perex(txt(h.description)),
    });
    for (const o of h.offers?.offer ?? []) {
      const oid = o['@id'], from = txt(o.date_from), to = txt(o.date_to), price = num(o.price), url = txt(o.url);
      if (!oid || !from || !price || !url || offers.has('dovolena:' + oid)) continue;
      const ap = txt(o.airport);
      offers.set('dovolena:' + oid, {
        key: 'dovolena:' + oid, partner: 'dovolena', hotelKey: key, from, to,
        nights: nightsBetween(from, to), price, currency: o.price?.['@currency'] || 'CZK',
        board: mapBoard(txt(o.food)), boardText: txt(o.food),
        transport: mapTransport(txt(o.transport)), airport: mapAirport(ap), airportText: ap, url,
      });
      n++;
    }
  }
  return `dovolena/${src.name}: hotely ${list.length}, nové termíny ${n}`;
}

function parseInvia(src) {
  const list = parser.parse(src.xml)?.offers?.offer ?? [];
  let n = 0;
  for (const o of list) {
    const hi = o.hotelinfo ?? {}, hid = txt(hi.id), url = txt(o.url);
    if (!hid || !url) continue;
    const key = 'invia:' + hid;
    addHotel(key, {
      key, partner: 'invia', pid: hid, feed: src.name,
      name: txt(o.hotel), stars: num(hi.stars),
      country: txt(o.destination?.country), locality: txt(o.destination?.locality),
      lat: num(hi.coords?.lat), lng: num(hi.coords?.lng),
      image: txt(o.image), gallery: (o.photos?.photo ?? []).map(txt).filter(Boolean).slice(0, 8),
      url: txt(hi.url),
    });
    const from = txt(o.term?.from), to = txt(o.term?.to), price = num(o.price);
    // s_offer_id v odkazu Invie je token, který se mění; stabilní klíč skládáme z termínu
    const oid = [hid, from, to, (o.airports?.airport ?? []).map(txt)[0] || '', txt(o.food) || ''].join('|');
    if (!from || !price || offers.has('invia:' + oid)) continue;
    const aps = (o.airports?.airport ?? []).map(txt).filter(Boolean);
    offers.set('invia:' + oid, {
      key: 'invia:' + oid, partner: 'invia', hotelKey: key, from, to,
      nights: nightsBetween(from, to), price, currency: o.price?.['@currency'] || 'CZK',
      discount: num(o.discount) || undefined, termType: txt(o.termtype),
      board: mapBoard(txt(o.food)), boardText: txt(o.food),
      transport: mapTransport(txt(o.transportation)), airport: mapAirport(aps[0]), airportText: aps[0], url,
      featured: src.name === 'bomby' || undefined,
    });
    n++;
  }
  return `invia/${src.name}: nabídky ${list.length}, nové ${n}`;
}

// ------------------------------------------------------------ běh
if (!LOCAL) for (const p of ['dovolena', 'invia']) report.push(...(await download(p)));
for (const src of await readRaw('dovolena')) { try { report.push(parseDovolena(src)); } catch (e) { report.push(`dovolena/${src.name}: CHYBA ${e.message}`); } }
for (const src of await readRaw('invia')) { try { report.push(parseInvia(src)); } catch (e) { report.push(`invia/${src.name}: CHYBA ${e.message}`); } }

// --- sjednocení zemí a míst (partneři je píšou různě)
const CANARY = /tenerife|gran canaria|fuerteventura|lanzarote|la palma|la gomera|puerto de la cruz|playa de las americas|costa adeje|maspalomas|corralejo/i;
const BOX = { // řecké ostrovy podle souřadnic
  her: [34.8, 35.75, 23.4, 26.4], rho: [35.85, 36.5, 27.6, 28.3], kgs: [36.65, 36.95, 26.9, 27.4],
  cfu: [39.35, 39.85, 19.6, 20.15], zth: [37.6, 37.95, 20.6, 21.0],
};
for (const h of hotels.values()) {
  if (h.country === 'Španělsko' && (CANARY.test(h.locality || '') || (h.lat && h.lat < 30))) h.country = 'Kanárské ostrovy';
  if (/^zanzibar/i.test(h.country || '')) h.country = 'Zanzibar';
  if (/^indon/i.test(h.country || '')) h.country = 'Indonésie';
  if (h.locality === 'Dubai') h.locality = 'Dubaj';
  if (h.locality === h.country) h.locality = undefined;
  if (h.country === 'Řecko' && h.lat) for (const [k, b] of Object.entries(BOX)) if (h.lat >= b[0] && h.lat <= b[1] && h.lng >= b[2] && h.lng <= b[3]) h.isl = k;
}

// --- jen budoucí termíny
const today = new Date().toISOString().slice(0, 10);
const byHotel = new Map();
for (const o of offers.values()) if (o.from >= today) (byHotel.get(o.hotelKey) ?? byHotel.set(o.hotelKey, []).get(o.hotelKey)).push(o);
for (const a of byHotel.values()) a.sort((x, y) => x.price - y.price || x.from.localeCompare(y.from));

// --- sloučení stejného hotelu u různých partnerů (souřadnice do 1,5 km + shoda slova v názvu, nebo stejný název a země)
const STOP = new Set(['hotel', 'resort', 'spa', 'beach', 'club', 'the', 'and', 'by', 'suites', 'village', 'apartments', 'aparthotel', 'all', 'inclusive', 'ex', 'aqua', 'park', 'aquapark', 'palm', 'garden', 'gardens', 'collection', 'autograph', 'selection', 'level', 'mgallery', 'member', 'individuals']);
const words = (s) => new Set(fold(s).replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
const minus = (a, b) => new Set([...a].filter((w) => !b.has(w)));
const km = (a, b) => { const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const live = [...byHotel.keys()].map((k) => hotels.get(k));
const dv = live.filter((h) => h.partner === 'dovolena'), iv = live.filter((h) => h.partner === 'invia');
const groupOf = new Map(); let matches = 0;
for (const a of iv) {
  const wa = minus(words(a.name), words(a.locality + ' ' + a.country)); let best = null;
  for (const b of dv) {
    const wb = minus(words(b.name), words(b.locality + ' ' + b.country)), common = [...wa].filter((w) => wb.has(w)).length;
    if (!common) continue;
    const overlap = common / Math.min(wa.size, wb.size), jaccard = common / (wa.size + wb.size - common);
    if (overlap < 0.6 || jaccard < 0.4) continue;
    const geo = a.lat && b.lat ? km(a, b) : null;
    const ok = (geo != null && geo < 1.5) || (geo == null && fold(a.name) === fold(b.name));
    if (ok && (!best || common > best.common)) best = { b, common };
  }
  if (best && !groupOf.has(best.b.key)) { groupOf.set(a.key, best.b.key); groupOf.set(best.b.key, best.b.key); matches++; }
}
const groups = new Map();
for (const h of live) { const g = groupOf.get(h.key) || h.key; (groups.get(g) ?? groups.set(g, []).get(g)).push(h); }

// ------------------------------------------------------------ výstup 1: offers.xml
const now = new Date().toISOString();
const allLive = [...byHotel.values()].flat();
let x = `<?xml version="1.0" encoding="UTF-8"?>\n<offers generated="${now}" count="${allLive.length}">\n`;
for (const [hk, arr] of byHotel) {
  const h = hotels.get(hk), gid = groupOf.get(hk) || hk;
  for (const o of arr) x += `  <offer id="${esc(o.key.replace(':', '-'))}">
    <partner>${o.partner}</partner>
    <kind>package</kind>
    <group_id>${esc(gid.replace(':', '-'))}</group_id>
    <hotel_id>${esc(h.pid)}</hotel_id>
    <hotel_name>${esc(h.name)}</hotel_name>
    <stars>${h.stars ?? ''}</stars>
    <country>${esc(h.country)}</country>
    <destination>${esc(h.locality)}</destination>
    <departure_date>${o.from}</departure_date>
    <return_date>${o.to ?? ''}</return_date>
    <nights>${o.nights ?? ''}</nights>
    <departure_airport>${o.airport ?? ''}</departure_airport>
    <departure_city>${esc(o.airportText)}</departure_city>
    <transport>${esc(o.transport)}</transport>
    <board>${o.board ?? ''}</board>
    <board_text>${esc(o.boardText)}</board_text>
    <price_per_person currency="${esc(o.currency)}">${o.price}</price_per_person>
    <discount_pct>${o.discount ?? ''}</discount_pct>
    <term_type>${esc(o.termType)}</term_type>
    <rating scale="${h.ratingScale ?? ''}">${h.rating ?? ''}</rating>
    <photo>${esc(h.image)}</photo>
    <affiliate_url>${esc(o.url)}</affiliate_url>
  </offer>\n`;
}
x += '</offers>\n';

// ------------------------------------------------------------ výstup 2: hotels.xml (sloučené)
const pick = (hs, f) => { for (const h of hs) if (h[f] != null && h[f] !== '' && !(Array.isArray(h[f]) && !h[f].length)) return h[f]; };
const merged = [...groups].map(([gid, hs]) => {
  hs.sort((a, b) => (a.partner === 'dovolena' ? -1 : 1)); // Dovolená má popis a hodnocení
  const offs = hs.flatMap((h) => byHotel.get(h.key)).sort((a, b) => a.price - b.price);
  return {
    gid: gid.replace(':', '-'), hs, offs,
    name: pick(hs, 'name'), stars: pick(hs, 'stars'), country: pick(hs, 'country'), locality: pick(hs, 'locality'),
    lat: pick(hs, 'lat'), lng: pick(hs, 'lng'), image: pick(hs, 'image'), gallery: pick(hs, 'gallery') ?? [],
    rating: pick(hs, 'rating'), ratingScale: pick(hs, 'ratingScale'), ratingCount: pick(hs, 'ratingCount'), perex: pick(hs, 'perex'),
  };
});
let y = `<?xml version="1.0" encoding="UTF-8"?>\n<hotels generated="${now}" count="${merged.length}">\n`;
for (const m of merged) {
  const prices = m.offs.map((o) => o.price);
  y += `  <hotel id="${esc(m.gid)}">
    <name>${esc(m.name)}</name>
    <stars>${m.stars ?? ''}</stars>
    <country>${esc(m.country)}</country>
    <destination>${esc(m.locality)}</destination>
    <gps lat="${m.lat ?? ''}" lng="${m.lng ?? ''}"/>
    <rating scale="${m.ratingScale ?? ''}" count="${m.ratingCount ?? ''}">${m.rating ?? ''}</rating>
    <perex>${esc(m.perex)}</perex>
    <photo>${esc(m.image)}</photo>
    <gallery>${m.gallery.map((g) => `<image>${esc(g)}</image>`).join('')}</gallery>
    <terms count="${m.offs.length}" price_min="${Math.min(...prices)}" price_max="${Math.max(...prices)}"/>
${m.hs.map((h) => { const c = byHotel.get(h.key)[0]; return `    <partner name="${h.partner}" hotel_id="${esc(h.pid)}" terms="${byHotel.get(h.key).length}">
      <cheapest departure_date="${c.from}" nights="${c.nights ?? ''}" airport="${c.airport ?? esc(c.airportText ?? '')}" board="${c.board ?? ''}" price_per_person="${c.price}"/>
      <affiliate_url>${esc(c.url)}</affiliate_url>
      <hotel_url>${esc(h.url)}</hotel_url>
    </partner>\n`; }).join('')}  </hotel>\n`;
}
y += '</hotels>\n';

// ------------------------------------------------------------ výstup 3: data pro web (out/web/)
// main.json  – výběr termínů pro výpis (malý, načítá se hned)
// d/<země>.json – detail: popisy, galerie, všechny termíny a affiliate odkazy (načítá se při otevření nabídky)
// state/prices.json – historie cen po dnech (kvůli „cena klesla“ a „nové“); commituje se do repa
await mkdir(OUT, { recursive: true });
const STATE = HERE + 'state/prices.json';
let state = {};
try { state = JSON.parse(await readFile(STATE, 'utf8')); } catch {}
const firstRun = !Object.keys(state).length;
const day = today.replace(/-/g, '');
const nextState = {};
for (const o of allLive) {
  const st = state[o.key] || { f: firstRun ? '00000000' : day, h: [] };
  const h = st.h.filter((p) => p[0] !== +day);
  h.push([+day, o.price]);
  nextState[o.key] = { f: st.f, h: h.slice(-14) };
}
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ostatni';
const SPECIAL = [ // okna, ze kterých chceme mít ve výpisu vždy nejlevnější termín každého hotelu
  ['2026-12-19', '2027-01-01'], ['2027-01-29', '2027-03-08'], ['2027-07-01', '2027-07-15'], ['2027-08-01', '2027-09-30'],
];
const okeyOf = (o) => o.partner[0] + createHash('sha1').update(o.key).digest('base64url').slice(0, 8);
const hotelsOut = [], rows = [], detail = {};
merged.forEach((m, hi) => {
  const hs = m.hs[0];
  const isl = m.hs.map((h) => h.isl).find(Boolean);
  hotelsOut.push([m.gid, m.name, m.stars || 0, m.country || '', m.locality || '', m.rating != null ? Math.round(m.rating / (m.ratingScale || 10) * 100) / 10 : 0,
    m.ratingCount || 0, m.image || '', [...new Set(m.hs.map((h) => h.partner[0]))].join(''), isl || '']);
  // výběr termínů do main.json
  const pickSet = new Set();
  const add = (o) => o && pickSet.add(o);
  const offs = m.offs;
  add(offs[0]);
  for (const p of ['dovolena', 'invia']) add(offs.find((o) => o.partner === p));
  const months = new Map(); for (const o of offs) { const k = o.from.slice(0, 7); if (!months.has(k)) months.set(k, o); }
  [...months.values()].slice(0, 6).forEach(add);
  for (const [a, b] of SPECIAL) add(offs.find((o) => o.from >= a && o.from <= b));
  const c0 = offs[0]; // pro anomálie: stejný termín z jiného letiště / jiná délka / jiná strava
  offs.filter((o) => o.from === c0.from && o !== c0).slice(0, 3).forEach(add);
  [...pickSet].slice(0, 10).forEach((o) => {
    const st = nextState[o.key];
    const age = st.f === '00000000' ? 999 : Math.round((Date.parse(today) - Date.parse(st.f.replace(/(\d{4})(\d\d)(\d\d)/, '$1-$2-$3'))) / 864e5);
    rows.push([hi, o.partner[0], o.from, o.nights || 0, o.airport || o.airportText || '', o.board || '', o.price, o.discount || 0, okeyOf(o), age, st.h.length > 1 ? st.h.map((p) => p[1]) : 0]);
  });
  // detail po zemích
  const cs = slug(m.country);
  const D = (detail[cs] ??= { h: {}, u: {} });
  D.h[m.gid] = {
    p: m.perex || '', g: (m.gallery || []).slice(0, 6),
    hu: Object.fromEntries(m.hs.map((h) => [h.partner[0], h.url || ''])),
    t: offs.slice(0, 120).map((o) => [o.partner[0], o.from, o.nights || 0, o.airport || o.airportText || '', o.board || '', o.price, okeyOf(o)]),
  };
  for (const o of offs.slice(0, 120)) D.u[okeyOf(o)] = o.url;
  for (const o of rows.filter((r) => r[0] === hi)) D.u[o[8]] ??= offs.find((x) => okeyOf(x) === o[8])?.url;
});
const next = new Date(Date.now() + 2 * 3600e3).toISOString();
await mkdir(OUT + 'web/d', { recursive: true });
await mkdir(HERE + 'state', { recursive: true });
await writeFile(OUT + 'web/main.json', JSON.stringify({ gen: now, next, h: hotelsOut, o: rows }));
for (const [cs, D] of Object.entries(detail)) await writeFile(`${OUT}web/d/${cs}.json`, JSON.stringify(D));
await writeFile(STATE, JSON.stringify(nextState));
report.push(`Web: ${hotelsOut.length} hotelů, ${rows.length} termínů ve výpisu, ${Object.keys(detail).length} souborů detailu`);
await writeFile(OUT + 'offers.xml', x);
await writeFile(OUT + 'hotels.xml', y);

const per = (p) => allLive.filter((o) => o.partner === p).length;
const countries = {}; for (const m of merged) countries[m.country] = (countries[m.country] || 0) + 1;
report.push('',
  `CELKEM hotely ${merged.length} (Dovolená ${dv.length}, Invia ${iv.length}, u obou ${matches})`,
  `Budoucí termíny ${allLive.length} (Dovolená ${per('dovolena')}, Invia ${per('invia')})`,
  'Země: ' + Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
for (const [k, s] of Object.entries(unknown)) if (s.size) report.push(`Nenamapované (${k}): ${[...s].join(', ')}`);
await writeFile(OUT + 'report.txt', report.join('\n') + '\n');
console.log(report.slice(-6).join('\n'));
// ladění: node convert.mjs --local --pairs  (vypíše spárované hotely Invia <=> Dovolená)
if (process.argv.includes('--pairs')) for (const [a, b] of groupOf) if (a !== b) console.log(hotels.get(a).name, ' <=> ', hotels.get(b).name);
