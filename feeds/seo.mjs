// Statické stránky pro vyhledávače: /dovolena/<země>/, letoviska, odlety z letišť, měsíce, all inclusive, last/first minute.
// Spouští se po convert.mjs:  node seo.mjs [složka s daty webu] [výstupní složka]
// Všechno se počítá z aktuálních dat, stránky se přegenerují při každé aktualizaci (každé 2 h).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { COUNTRIES, RESORTS, AIRPORTS, MONTHS, BOARD, RELATED } from './seo-dest.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const DATA = process.argv[2] || HERE + 'out/web/';
const OUT = process.argv[3] || HERE + 'out/seo/';
const SITE = 'https://cervenypomeranc.cz';
const MIN_HOTELS = 6;

const M = JSON.parse(await readFile(DATA + 'main.json', 'utf8'));
const now = new Date(M.gen || Date.now());
const todayS = now.toISOString().slice(0, 10);
const minDep = new Date(now.getTime() + 2 * 864e5).toISOString().slice(0, 10);
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ostatni';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kc = (n) => Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ') + ' Kč';
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const dfmt = (s) => { const [y, m, d] = s.split('-'); return `${+d}. ${+m}.`; };
const dfmtY = (s) => { const [y, m, d] = s.split('-'); return `${+d}. ${+m}. ${y}`; };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const genTime = now.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ------------------------------------------------------------ podnebí z webové aplikace (orientační)
let CLIMA = {};
try {
  const app = await readFile(HERE + '../web/app.js', 'utf8');
  const i = app.indexOf('var DEST={'), j = app.indexOf('};', i);
  CLIMA = new Function(app.slice(i, j + 2) + 'return DEST;')();
} catch (e) { console.log('podnebí: ' + e.message); }
const CLIMA_C = { egypt: 'hrg', recko: 'her', turecko: 'ayt', emiraty: 'dxb', thajsko: 'hkt', 'kanarske-ostrovy': 'tfs', kypr: 'pfo', maledivy: 'mle', mauricius: 'mru',
  seychely: 'sez', zanzibar: 'znz', oman: 'mct', kapverdy: 'sid', bulharsko: 'var', tunisko: 'dje', spanelsko: 'pmi', albanie: 'dur' };
const CLIMA_M = [11, 0, 1, 2, 3, 5, 6, 7, 8]; // pořadí teplot v DEST: pro, led, úno, bře, dub, čer, čvc, srp, zář

// ------------------------------------------------------------ data: hotely a všechny termíny
const H = M.h.map((h) => ({ gid: h[0], name: h[1], stars: h[2] || 0, co: h[3], loc: h[4] || '', rating: h[5] || 0, reviews: h[6] || 0, img: h[7], isl: h[9] || '' }));
const byGid = new Map(H.map((h) => [h.gid, h]));
const T = []; // termíny: {h, p, dep, n, air, board, price, url}
const dfiles = {};
for (const c of new Set(H.map((h) => h.co))) {
  const f = `${DATA}d/${slug(c)}.json`;
  if (!existsSync(f)) continue;
  const D = JSON.parse(await readFile(f, 'utf8'));
  dfiles[c] = D;
  for (const [gid, dh] of Object.entries(D.h)) {
    const h = byGid.get(gid); if (!h) continue;
    for (const t of dh.t) {
      if (!t[1] || t[1] < minDep || !(t[5] > 0)) continue;
      T.push({ h, p: t[0], dep: t[1], n: t[2] || 0, air: t[3] || '', board: t[4] || '', price: t[5], url: D.u[t[6]] || (dh.hu && dh.hu[t[0]]) || '' });
    }
  }
}
console.log(`SEO: ${H.length} hotelů, ${T.length} termínů`);

// ------------------------------------------------------------ výpočty pro sadu termínů
function stats(S) {
  const hotels = new Map();
  for (const t of S) { const a = hotels.get(t.h.gid) || []; a.push(t); hotels.set(t.h.gid, a); }
  const minOf = (arr) => arr.reduce((m, t) => (t.price < m.price ? t : m), arr[0]);
  const cheapest = S.length ? minOf(S) : null;
  const weekly = S.filter((t) => t.n >= 6 && t.n <= 8);
  const hMinWeek = [...groupBy(weekly, (t) => t.h.gid).values()].map((a) => minOf(a).price);
  const typical = median(hMinWeek);
  const months = [...groupBy(S, (t) => t.dep.slice(0, 7)).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 12).map(([m, a]) => {
    const wk = a.filter((t) => t.n >= 6 && t.n <= 8);
    const hm = [...groupBy(wk.length >= 3 ? wk : a, (t) => t.h.gid).values()].map((x) => minOf(x).price);
    return { m, min: minOf(a).price, typ: median(hm), hotels: new Set(a.map((t) => t.h.gid)).size, t: minOf(a) };
  });
  const airports = [...groupBy(S.filter((t) => AIRPORTS[t.air]), (t) => t.air).entries()].map(([a, arr]) => ({ a, min: minOf(arr).price, hotels: new Set(arr.map((t) => t.h.gid)).size, t: minOf(arr) }))
    .sort((x, y) => y.hotels - x.hotels);
  const boards = [...groupBy(S.filter((t) => BOARD[t.board]), (t) => (t.board === 'UAI' ? 'AI' : t.board)).entries()].map(([b, arr]) => ({ b, min: minOf(arr).price, hotels: new Set(arr.map((t) => t.h.gid)).size }))
    .sort((x, y) => ['AI', 'FB', 'HB', 'BB', 'RO'].indexOf(x.b) - ['AI', 'FB', 'HB', 'BB', 'RO'].indexOf(y.b));
  return { hotels, cheapest, typical, months, airports, boards, terms: S.length };
}
function groupBy(arr, f) { const m = new Map(); for (const x of arr) { const k = f(x); const a = m.get(k); if (a) a.push(x); else m.set(k, [x]); } return m; }

// nejlepší nabídky: za každý hotel jeden termín, seřazeno podle „ceny za kvalitu“
function bestOffers(S, n = 12) {
  const per = [];
  for (const arr of groupBy(S, (t) => t.h.gid).values()) {
    const wk = arr.filter((t) => t.n >= 5 && t.n <= 10);
    const pool = wk.length ? wk : arr;
    per.push(pool.reduce((m, t) => (t.price / Math.max(t.n, 1) < m.price / Math.max(m.n, 1) ? t : m), pool[0]));
  }
  const ppn = (t) => t.price / Math.max(t.n, 1);
  const byStars = groupBy(per, (t) => Math.round(t.h.stars));
  const med = new Map([...byStars.entries()].map(([s, a]) => [s, median(a.map(ppn))]));
  for (const t of per) {
    const m = med.get(Math.round(t.h.stars)) || ppn(t);
    t.score = (m - ppn(t)) / m * 100 + (t.h.rating ? (t.h.rating - 7.5) * 6 : 0) + (t.h.stars >= 4 ? 4 : 0) + (t.board === 'AI' || t.board === 'UAI' ? 3 : 0);
    t.under = Math.round((m - ppn(t)) / m * 100);
  }
  per.sort((a, b) => b.score - a.score);
  const out = [], loc = {};
  for (const t of per) { if (out.length >= n) break; const k = t.h.loc || t.h.co; if ((loc[k] || 0) >= 3) continue; loc[k] = (loc[k] || 0) + 1; out.push(t); }
  return out;
}

// ------------------------------------------------------------ stránky
const PAGES = [];
const C = Object.fromEntries(COUNTRIES.map((c) => [c.slug, c]));
const termsOfCountry = (c) => T.filter((t) => t.h.co === c.co);
const hotelCount = (S) => new Set(S.map((t) => t.h.gid)).size;
const matchResort = (r) => (t) => (r.isl ? t.h.isl === r.isl : r.m.test(t.h.loc));

for (const c of COUNTRIES) {
  const S = termsOfCountry(c);
  if (hotelCount(S) < MIN_HOTELS) continue;
  const base = `/dovolena/${c.slug}/`;
  c.url = base; c.S = S;
  PAGES.push({ kind: 'country', c, url: base, S });
  for (const r of RESORTS.filter((r) => r.c === c.slug)) {
    const RS = S.filter(matchResort(r));
    if (hotelCount(RS) < MIN_HOTELS) continue;
    r.url = `${base}${r.slug}/`; r.S = RS;
    PAGES.push({ kind: 'resort', c, r, url: r.url, S: RS });
  }
  for (const [code, a] of Object.entries(AIRPORTS)) {
    const AS = S.filter((t) => t.air === code);
    if (hotelCount(AS) < 5 || hotelCount(AS) > hotelCount(S) * 0.85) continue; // skoro totéž co celá země = duplicita
    PAGES.push({ kind: 'airport', c, a, code, url: `${base}${a.slug}/`, S: AS });
  }
  const months = [...groupBy(S, (t) => t.dep.slice(0, 7)).entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).slice(0, 12);
  for (const [ym, MS] of months) {
    if (hotelCount(MS) < 8) continue;
    const mi = +ym.slice(5, 7) - 1, y = ym.slice(0, 4);
    PAGES.push({ kind: 'month', c, ym, mi, y, url: `${base}${MONTHS[mi][0]}-${y}/`, S: MS });
  }
  const AI = S.filter((t) => t.board === 'AI' || t.board === 'UAI');
  if (hotelCount(AI) >= 8) PAGES.push({ kind: 'ai', c, url: `${base}all-inclusive/`, S: AI });
  const LM = S.filter((t) => t.dep <= addDays(todayS, 21));
  if (hotelCount(LM) >= 5) PAGES.push({ kind: 'lm', c, url: `${base}last-minute/`, S: LM });
  const FM = S.filter((t) => t.dep >= '2027-05-01' && t.dep <= '2027-10-31');
  if (hotelCount(FM) >= 5) PAGES.push({ kind: 'fm', c, url: `${base}first-minute-2027/`, S: FM });
}

// ------------------------------------------------------------ texty stránek
function meta(p) {
  const c = p.c, st = p.st = stats(p.S), od = st.cheapest ? kc(st.cheapest.price) : '';
  const mon = (i) => MONTHS[i][1];
  switch (p.kind) {
    case 'country': return {
      title: `Dovolená ${c.loc}: zájezdy od ${od}, nejlevnější termíny | Červený pomeranč`,
      h1: `Dovolená ${c.loc}`, sub: `Aktuální zájezdy ${c.gen} od ${od} na osobu`,
      desc: `Zájezdy ${c.gen} z ${st.hotels.size} hotelů, od ${od}. Kdy je nejlevnější, odkud se létá, all inclusive a počasí. Ceny aktualizujeme každé 2 hodiny.` };
    case 'resort': return {
      title: `${p.r.name}: zájezdy od ${od}, kdy je nejlevněji | Červený pomeranč`,
      h1: `Dovolená ${p.r.loc}`, sub: `${c.name} · aktuální zájezdy ${p.r.gen} od ${od} na osobu`,
      desc: `${p.r.name}: ${st.hotels.size} hotelů a zájezdy od ${od}. Nejlevnější měsíce, odlety ${st.airports.slice(0, 3).map((x) => AIRPORTS[x.a].name).join(', ') || 'z Česka'}, all inclusive. Aktualizováno každé 2 hodiny.` };
    case 'airport': return {
      title: `${c.short || c.name} ${p.a.name}: zájezdy od ${od} | Červený pomeranč`,
      h1: `Zájezdy ${c.gen} ${p.a.name}`, sub: `Odlety z letiště ${p.a.city} · od ${od} na osobu`,
      desc: `Dovolená ${c.loc} s odletem ${p.a.name}: ${st.hotels.size} hotelů od ${od}. Termíny, ceny podle měsíců a nejlepší nabídky. Aktualizujeme každé 2 hodiny.` };
    case 'month': return {
      title: `${c.short || c.name} ${mon(p.mi)} ${p.y}: zájezdy od ${od}, počasí | Červený pomeranč`,
      h1: `Dovolená ${c.loc} ${mon(p.mi)} ${p.y}`, sub: `Zájezdy s odletem ${mon(p.mi)} ${p.y} · od ${od} na osobu`,
      desc: `Kam ${mon(p.mi)} ${p.y}? ${c.name}: ${st.hotels.size} hotelů s odletem ${mon(p.mi)} od ${od}. Teploty, ceny a nejlepší termíny.` };
    case 'ai': return {
      title: `${c.short || c.name} all inclusive: zájezdy od ${od} | Červený pomeranč`,
      h1: `${c.short || c.name} all inclusive`, sub: `Zájezdy ${c.gen} s all inclusive od ${od} na osobu`,
      desc: `All inclusive ${c.loc}: ${st.hotels.size} hotelů od ${od}. Porovnání cen podle měsíců a letišť, hodnocení hostů. Aktualizováno každé 2 hodiny.` };
    case 'lm': return {
      title: `Last minute ${c.short || c.name}: zájezdy od ${od} | Červený pomeranč`,
      h1: `Last minute ${c.loc}`, sub: `Odlety v příštích 3 týdnech · od ${od} na osobu`,
      desc: `Last minute ${c.gen} s odletem do 3 týdnů: ${st.hotels.size} hotelů od ${od}. Přehled aktualizujeme každé 2 hodiny.` };
    case 'fm': return {
      title: `First minute ${c.short || c.name} 2027: léto od ${od} | Červený pomeranč`,
      h1: `First minute ${c.short || c.name} 2027`, sub: `Léto a podzim 2027 · od ${od} na osobu`,
      desc: `First minute ${c.gen} na léto 2027: ${st.hotels.size} hotelů od ${od}. Které měsíce jsou nejlevnější a odkud se létá.` };
  }
}

function crumbs(p) {
  const a = [['Červený pomeranč', '/'], ['Dovolená', '/dovolena/']];
  a.push([p.c.short || p.c.name, p.c.url]);
  if (p.kind === 'resort') a.push([p.r.name, p.url]);
  else if (p.kind === 'airport') a.push([p.a.name, p.url]);
  else if (p.kind === 'month') a.push([`${MONTHS[p.mi][2]} ${p.y}`, p.url]);
  else if (p.kind === 'ai') a.push(['All inclusive', p.url]);
  else if (p.kind === 'lm') a.push(['Last minute', p.url]);
  else if (p.kind === 'fm') a.push(['First minute 2027', p.url]);
  return a;
}

function introHtml(p) {
  const c = p.c, st = p.st;
  const cheapMonth = [...st.months].filter((m) => m.typ).sort((a, b) => a.typ - b.typ)[0];
  const lines = [];
  if (p.kind === 'resort') lines.push(`<p>${esc(p.r.text)}</p>`);
  if (p.kind === 'country' || p.kind === 'resort') lines.push(`<p>${esc(c.who)}</p>`);
  if (p.kind === 'airport') lines.push(`<p>Všechny zájezdy ${esc(c.gen)} s odletem ${esc(p.a.name)}, které právě nabízí cestovky. ${esc(c.who)}</p>`);
  if (p.kind === 'month') {
    const ck = CLIMA[CLIMA_C[c.slug]]; const ti = CLIMA_M.indexOf(p.mi);
    lines.push(`<p>Zájezdy ${esc(c.gen)} s odletem ${MONTHS[p.mi][1]} ${p.y}. ${ck && ti >= 0 && ck.temps[ti] ? `Přes den bývá kolem ${ck.temps[ti]} °C. ` : ''}Nejlepší sezóna: ${esc(c.season)}.</p>`);
  }
  if (p.kind === 'ai') lines.push(`<p>Jen zájezdy se stravou all inclusive nebo ultra all inclusive. ${esc(c.who)}</p>`);
  if (p.kind === 'lm') lines.push(`<p>Zájezdy s odletem v příštích třech týdnech. Last minute se mění každou hodinu, tenhle přehled se přepočítává každé dvě hodiny.</p>`);
  if (p.kind === 'fm') lines.push(`<p>Léto a podzim 2027 v first minute: nejlepší pokoje a nejnižší ceny bývají do konce února. ${esc(c.tip)}</p>`);
  if (cheapMonth && p.kind !== 'month') lines.push(`<p>Teď vychází nejlevněji odlet <b>${MONTHS[+cheapMonth.m.slice(5, 7) - 1][1]} ${cheapMonth.m.slice(0, 4)}</b>, týden typicky kolem <b>${kc(cheapMonth.typ)}</b> na osobu.</p>`);
  return lines.join('\n');
}

function offersHtml(p) {
  const list = bestOffers(p.S);
  return `<div class="offs">${list.map((t, i) => {
    const h = t.h, place = h.loc && h.loc !== h.co ? `${h.loc}, ${h.co}` : h.co;
    const why = [];
    if (t.under >= 10) why.push(`o ${Math.min(t.under, 60)} % levnější než jiné ${Math.round(h.stars)}★ hotely tady`);
    if (h.rating >= 8.5) why.push(`hosté dávají ${String(h.rating).replace('.', ',')}/10`);
    return `<article class="off"><div class="on">${String(i + 1).padStart(2, '0')}</div><div class="ob">
<h3>${esc(h.name)} <span class="st" aria-label="${Math.round(h.stars)} hvězdiček">${'★'.repeat(Math.round(h.stars))}</span>${h.rating ? ` <span class="rt">${String(h.rating).replace('.', ',')}</span>` : ''}</h3>
<div class="ol">${esc(place)}</div>
<div class="of">${esc((AIRPORTS[t.air] || {}).name || t.air)} · ${dfmt(t.dep)}–${dfmt(addDays(t.dep, t.n || 7))} · ${t.n || '?'} nocí · ${esc(BOARD[t.board] || 'strava dle nabídky')}</div>
${why.length ? `<div class="ow">✓ ${esc(why.join(' · '))}</div>` : ''}</div>
<div class="op"><b>${kc(t.price)}</b><small>za osobu</small>${t.url ? `<a class="go" href="${esc(t.url)}" target="_blank" rel="sponsored nofollow noopener" data-k="${t.p === 'd' ? 'Dovolená.cz' : 'Invia'}" data-x="${esc(h.co)}" data-v="${t.price}">Detail a cena →</a>` : ''}</div></article>`;
  }).join('\n')}</div>`;
}

function tableMonths(p) {
  const st = p.st, rows = st.months.filter((m) => m.hotels >= 2);
  if (rows.length < 2) return '';
  const mx = Math.max(...rows.map((m) => m.typ || m.min));
  const cheap = rows.reduce((a, b) => ((b.typ || b.min) < (a.typ || a.min) ? b : a));
  return `<section><h2>Kdy je nejlevnější${p.kind === 'resort' ? ' ' + esc(p.r.name) : ''}</h2>
<table class="tb"><thead><tr><th>Odlet</th><th>Od</th><th>Týden typicky</th><th>Hotelů</th></tr></thead><tbody>
${rows.map((m) => { const mi = +m.m.slice(5, 7) - 1; const link = p.kind === 'country' && PAGES.find((x) => x.kind === 'month' && x.c === p.c && x.ym === m.m);
    return `<tr${m === cheap ? ' class="hi"' : ''}><td>${link ? `<a href="${link.url}">${MONTHS[mi][2]} ${m.m.slice(0, 4)}</a>` : `${MONTHS[mi][2]} ${m.m.slice(0, 4)}`}</td><td>${kc(m.min)}</td><td><span class="bar"><i style="width:${Math.round((m.typ || m.min) / mx * 100)}%"></i></span>${m.typ ? kc(m.typ) : '–'}</td><td>${m.hotels}</td></tr>`; }).join('\n')}
</tbody></table><p class="note">„Od“ je nejlevnější termín v měsíci. „Týden typicky“ je střední cena 6–8 nocí napříč hotely, za osobu.</p></section>`;
}

function tableAirports(p) {
  const st = p.st; if (!st.airports.length || p.kind === 'airport') return '';
  return `<section><h2>Odkud se létá</h2><table class="tb"><thead><tr><th>Letiště</th><th>Od</th><th>Hotelů</th></tr></thead><tbody>
${st.airports.map((a) => { const link = p.kind === 'country' && PAGES.find((x) => x.kind === 'airport' && x.c === p.c && x.code === a.a);
    return `<tr><td>${link ? `<a href="${link.url}">${esc(AIRPORTS[a.a].city)}</a>` : esc(AIRPORTS[a.a].city)}</td><td>${kc(a.min)}</td><td>${a.hotels}</td></tr>`; }).join('\n')}
</tbody></table></section>`;
}

function tableBoards(p) {
  const b = p.st.boards; if (b.length < 2 || p.kind === 'ai') return '';
  return `<section><h2>Podle stravy</h2><table class="tb"><thead><tr><th>Strava</th><th>Od</th><th>Hotelů</th></tr></thead><tbody>
${b.map((x) => `<tr><td>${x.b === 'AI' ? `<a href="${p.c.url}all-inclusive/">${BOARD[x.b]}</a>` : BOARD[x.b]}</td><td>${kc(x.min)}</td><td>${x.hotels}</td></tr>`).join('\n')}
</tbody></table></section>`;
}

function climate(p) {
  const key = (p.r && p.r.dk) || CLIMA_C[p.c.slug]; const d = CLIMA[key];
  if (!d || !d.temps || !d.temps.length) return '';
  const order = CLIMA_M.map((m, i) => [m, d.temps[i]]).sort((a, b) => ((a[0] + 1) % 12) - ((b[0] + 1) % 12));
  return `<section><h2>Počasí a moře</h2><table class="tb clim"><thead><tr>${order.map(([m]) => `<th>${MONTHS[m][2].slice(0, 3)}</th>`).join('')}</tr></thead>
<tbody><tr>${order.map(([, t]) => `<td>${t}°</td>`).join('')}</tr></tbody></table>
<p class="note">Průměrná denní teplota vzduchu (orientačně). Moře ${esc(p.c.sea)}. Let ${esc(p.c.fly)}. Sezóna: ${esc(p.c.season)}.</p></section>`;
}

function subLinks(p) {
  const c = p.c, groups = [];
  const res = PAGES.filter((x) => x.kind === 'resort' && x.c === c && x !== p);
  if (res.length) groups.push(['Letoviska', res.map((x) => [x.r.name, x.url, x.st ? x.st.cheapest.price : stats(x.S).cheapest.price])]);
  const air = PAGES.filter((x) => x.kind === 'airport' && x.c === c && x !== p);
  if (air.length) groups.push(['Odlety', air.map((x) => [`${c.short || c.name} ${x.a.name}`, x.url])]);
  const mon = PAGES.filter((x) => x.kind === 'month' && x.c === c && x !== p);
  if (mon.length) groups.push(['Podle měsíce', mon.map((x) => [`${MONTHS[x.mi][2]} ${x.y}`, x.url])]);
  const oth = PAGES.filter((x) => ['ai', 'lm', 'fm', 'country'].includes(x.kind) && x.c === c && x !== p);
  if (oth.length) groups.push([`Další ${c.short || c.name}`, oth.map((x) => [x.kind === 'country' ? `Vše ${c.loc}` : x.kind === 'ai' ? 'All inclusive' : x.kind === 'lm' ? 'Last minute' : 'First minute 2027', x.url])]);
  const rel = (RELATED[c.slug] || []).map((s) => C[s]).filter((x) => x && x.url);
  if (rel.length) groups.push(['Kdo hledá ' + (c.short || c.name) + ', kouká i na', rel.map((x) => [x.short || x.name, x.url, stats(x.S).cheapest.price])]);
  return groups.map(([h, l]) => `<nav class="lk" aria-label="${esc(h)}"><h2>${esc(h)}</h2><div>${l.map(([t, u, pr]) => `<a href="${u}">${esc(t)}${pr ? ` <small>od ${kc(pr)}</small>` : ''}</a>`).join('')}</div></nav>`).join('\n');
}

function faq(p) {
  const c = p.c, st = p.st, where = p.kind === 'resort' ? p.r.loc : c.loc, kam = p.kind === 'resort' ? p.r.gen : c.gen;
  const q = [];
  if (st.cheapest) q.push([`Kolik stojí dovolená ${where}?`, `Nejlevnější zájezd teď stojí ${kc(st.cheapest.price)} na osobu (${st.cheapest.n} nocí, ${BOARD[st.cheapest.board] || 'strava dle nabídky'}, odlet ${dfmtY(st.cheapest.dep)}).${st.typical ? ` Týden typicky vychází kolem ${kc(st.typical)} na osobu.` : ''} Ceny se mění, přepočítáváme je každé dvě hodiny.`]);
  const cm = [...st.months].filter((m) => m.typ && m.hotels >= 3).sort((a, b) => a.typ - b.typ)[0];
  if (cm && p.kind !== 'month') q.push([`Kdy je nejlevnější dovolená ${where}?`, `Podle aktuálních nabídek je nejlevnější odlet ${MONTHS[+cm.m.slice(5, 7) - 1][1]} ${cm.m.slice(0, 4)}, kdy týden typicky stojí kolem ${kc(cm.typ)} na osobu.`]);
  if (st.airports.length && p.kind !== 'airport') q.push([`Odkud se létá ${kam}?`, st.airports.slice(0, 5).map((a) => `${AIRPORTS[a.a].name} od ${kc(a.min)}`).join(', ') + '.']);
  q.push([`Jak dlouho se letí ${kam}?`, `Let trvá ${c.fly}.`]);
  q.push([`Kdy je nejlepší sezóna ${where}?`, `${c.season.charAt(0).toUpperCase() + c.season.slice(1)}. Moře ${c.sea}.`]);
  return q;
}

// ------------------------------------------------------------ HTML
const TRACK = `<script>(function(){var Q=[],T;function f(){if(!Q.length)return;var b=JSON.stringify({e:Q.splice(0,10)});try{if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/e',b)))fetch('/api/e',{method:'POST',body:b,keepalive:true})}catch(e){}}
function ev(e,o){o=o||{};o.ev=e;o.app=0;Q.push(o);clearTimeout(T);T=setTimeout(f,300)}addEventListener('pagehide',f);
var r='';try{r=new URL(document.referrer).hostname.replace(/^www\\./,'')}catch(e){}var s=/google|seznam|bing|duckduckgo/.test(r)?'vyhledávač ('+r.split('.')[0]+')':(r&&r.indexOf('cervenypomeranc')<0?r:'přímo');
ev('view',{src:'seo: '+s,k:location.pathname});
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.go');if(a){ev('click',{k:a.dataset.k,x:a.dataset.x,v:+a.dataset.v,src:'seo'});f();}},true);
[15,60].forEach(function(t){setTimeout(function(){if(!document.hidden)ev('stay',{v:t})},t*1000)});})();</script>`;

function page(p) {
  const m = meta(p), cr = crumbs(p), F = faq(p);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: cr.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: F.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const st = p.st;
  return `<!doctype html>
<html lang="cs"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.desc)}">
<link rel="canonical" href="${SITE}${p.url}">
<meta property="og:title" content="${esc(m.h1)} – zájezdy od ${st.cheapest ? kc(st.cheapest.price) : ''}"><meta property="og:description" content="${esc(m.desc)}">
<meta property="og:image" content="${SITE}/og.png"><meta property="og:url" content="${SITE}${p.url}"><meta property="og:type" content="website"><meta property="og:locale" content="cs_CZ"><meta property="og:site_name" content="Červený pomeranč">
<meta name="theme-color" content="#ffffff"><link rel="icon" href="/icon-192.png?v=2"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2"><link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/seo.css">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head><body>
<header class="top"><a class="brand" href="/"><img src="/icon-192.png?v=2" alt="" width="34" height="34">Červený pomeranč</a><a class="app" href="/">Dnešní tucet →</a></header>
<main class="w">
<nav class="bc" aria-label="Drobečková navigace">${cr.map(([n, u], i) => (i < cr.length - 1 ? `<a href="${u}">${esc(n)}</a>` : `<span>${esc(n)}</span>`)).join(' › ')}</nav>
<h1>${esc(m.h1)}</h1>
<p class="sub">${esc(m.sub)}</p>
<div class="facts">
<div><small>Nejlevněji</small><b>${st.cheapest ? kc(st.cheapest.price) : '–'}</b><span>${st.cheapest ? `${dfmt(st.cheapest.dep)} · ${st.cheapest.n} nocí` : ''}</span></div>
<div><small>Týden typicky</small><b>${st.typical ? kc(st.typical) : '–'}</b><span>za osobu, 6–8 nocí</span></div>
<div><small>Hotelů</small><b>${st.hotels.size}</b><span>${st.terms.toLocaleString('cs-CZ')} termínů</span></div>
<div><small>Let</small><b>${esc(p.c.fly.replace(/,.*$/, ''))}</b><span>${esc((st.airports[0] && AIRPORTS[st.airports[0].a].name) || '')}</span></div>
</div>
<p class="upd">Aktualizováno ${esc(genTime)} · ceny za osobu, přepočítáváme každé 2 hodiny</p>
<div class="intro">${introHtml(p)}</div>
<section><h2>Nejlepší nabídky teď</h2>${offersHtml(p)}<p class="note">Vybíráme podle ceny za noc proti hotelům stejné kategorie a podle hodnocení hostů. Rezervace probíhá přímo u cestovky.</p></section>
<aside class="cta"><img src="/icon-192.png?v=2" alt="" width="48" height="48"><div><b>Chceš vědět, až ${esc(p.kind === 'resort' ? p.r.name : (p.c.short || p.c.name))} zlevní?</b><span>Přidej si Pomeranč na plochu. Každý den 12 nejlepších zájezdů a upozornění, když něco výrazně zlevní. Zdarma, bez registrace.</span></div><a href="/">Otevřít Pomeranč</a></aside>
${tableMonths(p)}
${tableAirports(p)}
${tableBoards(p)}
${climate(p)}
<section><h2>Na co si dát pozor</h2><p>${esc(p.c.watch)}</p><p><b>Tip:</b> ${esc(p.c.tip)}</p></section>
<section class="faq"><h2>Časté otázky</h2>${F.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}</section>
${subLinks(p)}
</main>
<footer class="ft"><p><a href="/">Dnešní tucet</a> · <a href="/dovolena/">Všechny destinace</a> · <a href="/jak-vybirame.html">Jak vybíráme</a> · <a href="/o-nas.html">O nás</a> · <a href="/ochrana-udaju.html">Ochrana údajů</a></p>
<p>Nejsme cestovní kancelář. Ukazujeme nabídky partnerů (Invia.cz, Dovolená.cz), nakupuješ přímo u nich. Za zprostředkování můžeme dostat provizi, cenu to neovlivní. Provozovatel: Kosacik Publishing, s.r.o., IČO 14231069.</p></footer>
${TRACK}
</body></html>`;
}

function indexPage() {
  const list = PAGES.filter((p) => p.kind === 'country');
  const title = 'Dovolená 2026/2027: kam a za kolik, všechny destinace | Červený pomeranč';
  const body = list.map((p) => {
    const st = p.st || stats(p.S), res = PAGES.filter((x) => x.kind === 'resort' && x.c === p.c);
    return `<article class="dst"><h2><a href="${p.url}">${esc(p.c.name)}</a></h2><p class="dp">od <b>${kc(st.cheapest.price)}</b> · ${st.hotels.size} hotelů${st.typical ? ` · týden typicky ${kc(st.typical)}` : ''}</p><p>${esc(p.c.who)}</p>${res.length ? `<p class="dr">${res.map((r) => `<a href="${r.url}">${esc(r.r.name)}</a>`).join('')}</p>` : ''}</article>`;
  }).join('\n');
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title><meta name="description" content="Přehled destinací s aktuálními cenami zájezdů: Egypt, Řecko, Turecko, Dubaj, Kanáry, Maledivy a další. Kdy je kde nejlevněji, odkud se létá. Aktualizováno každé 2 hodiny.">
<link rel="canonical" href="${SITE}/dovolena/"><meta property="og:image" content="${SITE}/og.png"><meta property="og:title" content="Dovolená: všechny destinace s aktuálními cenami">
<link rel="icon" href="/icon-192.png?v=2"><link rel="stylesheet" href="/seo.css"></head><body>
<header class="top"><a class="brand" href="/"><img src="/icon-192.png?v=2" alt="" width="34" height="34">Červený pomeranč</a><a class="app" href="/">Dnešní tucet →</a></header>
<main class="w"><nav class="bc"><a href="/">Červený pomeranč</a> › <span>Dovolená</span></nav><h1>Kam na dovolenou</h1><p class="sub">${list.length} destinací s aktuálními cenami · aktualizováno ${esc(genTime)}</p>
<div class="dsts">${body}</div></main>
<footer class="ft"><p><a href="/">Dnešní tucet</a> · <a href="/jak-vybirame.html">Jak vybíráme</a> · <a href="/o-nas.html">O nás</a></p><p>Nejsme cestovní kancelář. Ukazujeme nabídky partnerů, nakupuješ přímo u nich.</p></footer>${TRACK}</body></html>`;
}

// ------------------------------------------------------------ zápis
await rm(OUT, { recursive: true, force: true });
for (const p of PAGES) { meta(p); }
for (const p of PAGES) {
  const dir = OUT + p.url.replace(/^\//, '');
  await mkdir(dir, { recursive: true });
  await writeFile(dir + 'index.html', page(p));
}
await mkdir(OUT + 'dovolena/', { recursive: true });
await writeFile(OUT + 'dovolena/index.html', indexPage());
const urls = ['/', '/dovolena/', ...PAGES.map((p) => p.url)];
await writeFile(OUT + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${todayS}</lastmod><changefreq>daily</changefreq></url>`).join('\n')}\n</urlset>\n`);
const kinds = {}; PAGES.forEach((p) => (kinds[p.kind] = (kinds[p.kind] || 0) + 1));
console.log(`SEO: ${PAGES.length + 1} stránek`, kinds);
await writeFile(OUT + 'seo-report.txt', `SEO ${now.toISOString()}: ${PAGES.length + 1} stránek ${JSON.stringify(kinds)}\n` + PAGES.map((p) => `${p.url} ${p.st.hotels.size}h ${p.st.terms}t od ${p.st.cheapest ? p.st.cheapest.price : '-'}`).join('\n'));
