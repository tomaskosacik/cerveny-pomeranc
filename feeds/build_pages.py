# Generátor statického webu Červený pomeranč (verze pro schválení partnery).
import os, html

SITE = "Červený pomeranč"
CONTACT_EMAIL = "info@cervenypomeranc.cz"   # <- doplň kontaktní e-mail
INVIA_AID = "2803411"                        # <- doplň své affiliate ID z Invie (číslo aid)
INVIA = "https://www.invia.cz"

DEST = [
  dict(slug="egypt", name="Egypt", where="Hurghada · Marsa Alam · Sharm el-Sheikh", fly="4–5 h", season="celoročně, nejpříjemněji říjen–duben",
       sea="kolem 22–28 °C podle měsíce", who="Šnorchlování, korály hned u břehu a all inclusive za rozumné peníze. Jistota tepla i v zimě.",
       watch="V létě bývá přes 40 °C. Vízum se vyřizuje a platí při příletu. U levnějších hotelů bývá jídlo spíš průměrné, vyplatí se číst hodnocení.",
       tip="Marsa Alam je klidnější a korály jsou tam hezčí, Hurghada má víc života a víc odletů z regionů.",
       link="/dovolena/last-minute/egypt/", now=True),
  dict(slug="kanarske-ostrovy", name="Kanárské ostrovy", where="Gran Canaria · Tenerife · Fuerteventura · Lanzarote", fly="kolem 5 h", season="celoročně, v zimě jaro kolem 20–24 °C",
       sea="chladnější, přibližně 19–23 °C", who="Nejspolehlivější teplo v Evropě přes zimu. Příroda, výlety, sopky, pláže.",
       watch="Moře je osvěžující i v létě. Na severu ostrovů bývá víc mraků než na jihu, hlídej, kde hotel leží.",
       tip="Fuerteventura na pláže a vítr, Tenerife na výlety, Gran Canaria je od obojího trochu.",
       link="/dovolena/last-minute/kanarske-ostrovy/", now=True),
  dict(slug="zanzibar", name="Zanzibar", where="Nungwi · Kendwa · Paje", fly="orientačně 8–10 h, s mezipřistáním déle", season="červen–říjen a prosinec–únor (sušší období)",
       sea="kolem 27–29 °C", who="Bílý písek, tyrkysová voda a jen malý časový posun. Exotika, kterou zvládneš i na 10 dní.",
       watch="Na východním pobřeží je silný odliv, moře ustupuje daleko. Na plavání je lepší sever ostrova. Ověř si aktuální vstupní podmínky.",
       tip="Kendwa a Nungwi na severu mají moře i při odlivu, Paje je ráj kiteboardistů.",
       link="/dovolena/zanzibar/", now=True),
  dict(slug="maledivy", name="Maledivy", where="atoly kolem Male", fly="s přestupem orientačně 10–12 h", season="listopad–duben (suché období)",
       sea="kolem 28–30 °C", who="Jednou za život. Domek nad vodou, ryby pod podlahou, nic dalšího nepotřebuješ.",
       watch="Jídlo a pití navíc jsou drahé, polopenze nebo all inclusive se obvykle vyplatí. Transfer hydroplánem bývá placený zvlášť.",
       tip="Rozhoduje ostrov, ne hotelová značka. Hlídej domácí útes a typ transferu.",
       link="/dovolena/maledivy/", now=True),
  dict(slug="recko", name="Řecko", where="Kréta · Rhodos · Kos · Korfu · Zakynthos", fly="2,5–3 h", season="květen–říjen",
       sea="přibližně 22–26 °C v sezóně", who="Taverny, výlety, krásná moře a hodně odletů i z Ostravy, Brna a Pardubic.",
       watch="Hotely jsou často menší a starší než v Turecku. Ve vrcholné sezóně je plno, nejlepší pokoje mizí v first minute.",
       tip="Kréta je velká, na týden si vyber jednu část ostrova. Na Kos a Rhodos to s dětmi bývá nejjednodušší.",
       link="/dovolena/first-minute/recko/", now=False),
  dict(slug="turecko", name="Turecko", where="Antalya · Side · Alanya · Belek", fly="kolem 3 h", season="květen–říjen",
       sea="v létě kolem 25–28 °C", who="All inclusive v obřích resortech, aquaparky, dětské kluby. Rodinná klasika.",
       watch="Velké komplexy bývají daleko od centra. Ověř si vzdálenost k pláži, část hotelů má pláž přes silnici.",
       tip="Side a Belek mají písečné pláže, Alanya je živější a levnější.",
       link="/dovolena/first-minute/turecko/", now=False),
  dict(slug="albanie", name="Albánie", where="Durrës · Vlora · Saranda", fly="kolem 2 h", season="červen–září",
       sea="v létě kolem 24–26 °C", who="Řecko za cenu Bulharska. Pořád ještě objev, ceny rostou každý rok.",
       watch="Služby a silnice nejsou všude na úrovni Řecka. Hotel vybírej podle hodnocení, ne podle fotek.",
       tip="Saranda na jihu má nejhezčí moře, Durrës je nejblíž letišti.",
       link="/dovolena/first-minute/albanie/", now=False),
  dict(slug="bulharsko", name="Bulharsko", where="Zlaté písky · Slunečné pobřeží · Nesebar", fly="kolem 2 h, jezdí se i autem", season="červen–září",
       sea="v létě kolem 24–26 °C", who="Nejlevnější moře s all inclusive. Dlouhé písečné pláže, mělko pro děti.",
       watch="Slunečné pobřeží je hlučné a plné. Kdo chce klid, ať míří dál od center.",
       tip="Starý Nesebar je hezký na večerní procházku, pláže jsou lepší kousek vedle.",
       link="/dovolena/first-minute/bulharsko/", now=False),
  dict(slug="tunisko", name="Tunisko", where="Monastir · Sousse · Djerba · Hammamet", fly="kolem 2,5 h", season="červen–září na koupání, jaro a podzim na výlety",
       sea="v létě kolem 25–27 °C", who="Levné teplo s krátkým letem a dlouhými písečnými plážemi.",
       watch="Hotely bývají starší, hodnocení hostů je tu důležitější než hvězdičky.",
       tip="Koloseum v El Džemu je jen kousek od Monastiru a Sousse.",
       link="/dovolena/first-minute/tunisko/", now=False),
  dict(slug="kypr", name="Kypr", where="Paphos · Larnaka · Ayia Napa · Protaras", fly="kolem 3,5 h", season="duben–listopad",
       sea="v létě kolem 26–27 °C", who="Dlouhá sezóna, dobré jídlo, výlety do hor i k moři. Babí léto ještě v říjnu.",
       watch="Jezdí se vlevo. S polopenzí nebo snídaní počítej s útratou za večeře venku.",
       tip="Ayia Napa a Protaras na pláže, Paphos na výlety a památky.",
       link="/dovolena/last-minute/kypr/", now=True),
]

CSS = r"""
:root{--bg:#ffffff;--surface:#fff;--ink:#161514;--ink-2:#4a4745;--mute:#8a8582;--line:#e7e4e1;--accent:#f2621f;--accent-ink:#fff;
--type:"Bricolage Grotesque","Arial Narrow",system-ui,sans-serif;--sans:"Manrope","Helvetica Neue",Arial,system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121110;--surface:#1a1918;--ink:#f1efed;--ink-2:#c3bfbb;--mute:#8f8a86;--line:#2b2927;--accent:#ff5a33;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121110;--surface:#1a1918;--ink:#f1efed;--ink-2:#c3bfbb;--mute:#8f8a86;--line:#2b2927;--accent:#ff5a33;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit;text-underline-offset:3px}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:720px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-block:18px 6px;flex-wrap:wrap}
.logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-family:var(--type);font-weight:700;font-size:20px;text-transform:uppercase}
.logo i{width:18px;height:18px;border-radius:50%;background:var(--accent);display:inline-block}
.top nav{display:flex;gap:14px;font-size:14px;flex-wrap:wrap}.top nav a{text-decoration:none;color:var(--ink-2)}
h1{font-family:var(--type);font-size:clamp(26px,6vw,38px);line-height:1.1;margin:18px 0 10px;text-transform:uppercase;text-wrap:balance}
h2{font-family:var(--type);font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin:34px 0 4px;font-weight:700}
.lead{font-family:var(--type);font-size:16px;color:var(--ink-2);max-width:60ch;margin:0}
p{max-width:65ch}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;align-items:baseline;padding-block:16px;border-top:1px solid var(--line)}
.row .d{font-family:var(--type);font-weight:700;text-transform:uppercase;font-size:16px}
.row .d a{text-decoration:none}
.row .f{grid-column:1/-1;font-size:14px;color:var(--ink-2)}
.row .n{grid-column:1/-1;font-family:var(--type);font-size:14px;border-left:2px solid var(--accent);padding-left:8px;background:color-mix(in srgb,var(--accent) 8%,transparent)}
.go{color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap;font-size:14px;text-transform:uppercase;letter-spacing:.03em}
.cta{display:inline-block;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:12px 16px;border-radius:6px;font-size:15px}
dl.kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 18px;margin:18px 0}dl.kv dt{color:var(--mute)}dl.kv dd{margin:0}
.note{font-family:var(--type);border-left:2px solid var(--accent);padding:6px 10px;background:color-mix(in srgb,var(--accent) 8%,transparent)}
ol.steps{padding-left:22px}ol.steps li{margin-bottom:8px}
.soon{border:1px dashed var(--mute);border-radius:8px;padding:12px 14px;font-size:14px;color:var(--ink-2);margin-top:14px}
footer{border-top:1px solid var(--line);margin-top:40px;padding-block:24px 48px;font-size:13px;color:var(--mute);display:flex;flex-direction:column;gap:8px}
footer nav{display:flex;flex-wrap:wrap;gap:6px 16px}
@media (max-width:420px){.row{grid-template-columns:1fr}.top nav{gap:10px}}
"""

def invia(path):
    return INVIA + path

def page(title, desc, body, depth=0, canonical=""):
    up = "../" * depth
    return f"""<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="cs_CZ">
<meta name="theme-color" content="#fafaf9">
<link rel="icon" href="{up}icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Manrope:wght@400;600;700&display=swap">
<link rel="stylesheet" href="{up}style.css">
</head><body>
<header class="wrap top"><a class="logo" href="{up}index.html"><i aria-hidden="true"></i>{SITE}</a>
<nav aria-label="Hlavní"><a href="{up}index.html">Tržiště</a><a href="{up}jak-vybirame.html">Jak vybíráme</a><a href="{up}o-nas.html">O nás</a></nav></header>
<main class="wrap">
{body}
</main>
<footer class="wrap">
<div>Nejsme prodejci zájezdů. Vybíráme z nabídek cestovních kanceláří a agentur, u kterých zájezd koupíš.</div>
<nav><a href="{up}o-nas.html">O nás a kontakt</a><a href="{up}jak-vybirame.html">Jak vybíráme</a><a href="{up}ochrana-udaju.html">Ochrana osobních údajů</a></nav>
<div>© 2026 {SITE}</div>
</footer>
<script>(function(){{var aid={INVIA_AID!r};if(!aid)return;document.querySelectorAll('a[data-invia]').forEach(function(a){{var u=new URL(a.href);u.searchParams.set('aid',aid);a.href=u.toString();}});}})();</script>
</body></html>"""

def out(path, content):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    open(path, "w", encoding="utf-8").write(content)

def row(d, depth):
    up = "../" * depth
    return f"""<div class="row"><div class="d"><a href="{up}destinace/{d['slug']}.html">{d['name']}</a></div>
<a class="go" data-invia href="{invia(d['link'])}" rel="sponsored nofollow noopener" target="_blank">aktuální ceny →</a>
<div class="f">{d['where']} · let {d['fly']} · moře {d['sea']}</div>
<div class="n">„{d['who']}“</div></div>"""

now = [d for d in DEST if d["now"]]
summer = [d for d in DEST if not d["now"]]

index_body = f"""
<h1>Zajímavé dovolené, vybrané ručně</h1>
<p class="lead">Jsme rodina z Beskyd a rádi cestujeme. Projdeme za tebe nabídky cestovních kanceláří a necháme tu jen ty, které za svou cenu opravdu stojí. Bez katalogu, bez omáčky, s jednou větou pravdy u každé.</p>

<h2 id="ted">Kam teď k moři (listopad–březen)</h2>
{''.join(row(d,0) for d in now)}

<h2 id="leto">Léto 2027: kde se vyplatí first minute</h2>
{''.join(row(d,0) for d in summer)}

<h2>Jak to bude fungovat</h2>
<ol class="steps">
<li>Každých pár hodin projdeme nabídky partnerů (Invia, Dovolená.cz a cestovní kanceláře).</li>
<li>U každého zájezdu spočítáme cenu za osobu a noc a porovnáme ji se srovnatelnými termíny.</li>
<li>Nahoru dáme ty, kde sedí cena, kvalita hotelu a termín. Přidáme větu, proč stojí za to.</li>
<li>Klikneš a zájezd si koupíš přímo u cestovní kanceláře nebo agentury.</li>
</ol>
<div class="soon">Připravujeme denní výpis konkrétních zájezdů s cenou, historií ceny a upozorněním, když zlevní. Do té doby tu najdeš průvodce destinacemi a odkazy na aktuální nabídky.</div>
"""

for d in DEST:
    others = [x for x in DEST if x is not d and x["now"] == d["now"]][:4]
    body = f"""
<p class="lead" style="margin-top:14px"><a href="../index.html">← zpět na výpis</a></p>
<h1>{d['name']}</h1>
<p class="lead">{d['who']}</p>
<dl class="kv">
<dt>Kam</dt><dd>{d['where']}</dd>
<dt>Let z Česka</dt><dd>{d['fly']} (orientačně, přímý let)</dd>
<dt>Kdy jet</dt><dd>{d['season']}</dd>
<dt>Moře</dt><dd>{d['sea']}</dd>
</dl>
<h2>Na co si dát pozor</h2>
<p>{d['watch']}</p>
<h2>Naše poznámka</h2>
<p class="note">{d['tip']}</p>
<p style="margin-top:22px"><a class="cta" data-invia href="{invia(d['link'])}" rel="sponsored nofollow noopener" target="_blank">Aktuální zájezdy: {d['name']} →</a></p>
<p style="font-size:13px;color:var(--mute)">Údaje o letu a teplotách jsou orientační. Přesné podmínky, cenu a vstupní požadavky vždy ověř u prodejce a na webu Ministerstva zahraničních věcí.</p>
<h2>Podobné destinace</h2>
{''.join(row(x,1) for x in others)}
"""
    out(f"destinace/{d['slug']}.html", page(f"{d['name']}: kdy jet a na co si dát pozor – {SITE}", f"{d['name']} ({d['where']}): let {d['fly']}, kdy jet, teplota moře a na co si dát pozor. Odkaz na aktuální zájezdy.", body, depth=1))

out("jak-vybirame.html", page(f"Jak vybíráme – {SITE}", "Podle čeho vybíráme zájezdy: cena za den, kvalita hotelu, termín a ověřené poklesy cen.", f"""
<h1>Jak vybíráme</h1>
<p class="lead">Nehledáme nejlevnější zájezd. Hledáme ten, který za svou cenu dává nejvíc.</p>
<h2>Cena za den, ne za katalog</h2><p>Celou cenu vydělíme počtem nocí a osob a porovnáme ji se srovnatelnými zájezdy: stejná země, strava, délka pobytu a měsíc odletu.</p>
<h2>Hotel, kam bychom jeli sami</h2><p>Díváme se na hodnocení hostů a jejich počet, hvězdičky a vzdálenost od pláže. Když nějaký údaj chybí, nabídku tím netrestáme ani si ho nedomýšlíme.</p>
<h2>Jen skutečné slevy</h2><p>Pokles ceny ukážeme jen tehdy, když jsme dřívější cenu sami viděli. Žádné vymyšlené „původní ceny“ ani odpočty, které tlačí do nákupu.</p>
<h2>Srovnáváme jen srovnatelné</h2><p>Když píšeme, že odlet z Ostravy je levnější než z Prahy, jde o stejný hotel, termín, délku, stravu a stejný počet cestujících.</p>
<h2>Provize nerozhoduje</h2><p>Od partnerů dostáváme provizi, ale ta do výběru ani pořadí nabídek nevstupuje.</p>
"""))

out("o-nas.html", page(f"O nás a kontakt – {SITE}", "Kdo stojí za Červeným pomerančem a jak nás kontaktovat.", f"""
<h1>O nás</h1>
<p class="lead">Jsme obyčejná rodina z Beskyd. Rádi jezdíme k moři a neradi přeplácíme.</p>
<p>Vybírání dovolené nás vždycky stálo celé večery: katalogy, recenze, pořád stejné fotky bazénů. Tak jsme si začali dělat vlastní výpis. Červený pomeranč je ten výpis, jen otevřený všem.</p>
<p>Pomeranč je náš talisman. Kutálí se s námi po světě a vždycky najde nejteplejší místo.</p>
<h2>Kontakt</h2>
<p>E-mail: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
<p style="font-size:14px;color:var(--mute)">Spolupráce s cestovními kancelářemi a agenturami: rádi zařadíme vaše nabídky. Pište na stejný e-mail.</p>
"""))


out("ochrana-udaju.html", page(f"Ochrana osobních údajů – {SITE}", "Jak nakládáme s osobními údaji a cookies.", f"""
<h1>Ochrana osobních údajů</h1>
<p>Tento web zatím nesbírá žádné osobní údaje. Nepoužívá analytické ani reklamní cookies a nemá registraci ani formuláře.</p>
<p>Když klikneš na odkaz partnera, přejdeš na jeho web. Tam platí zásady ochrany údajů daného partnera, který si může uložit vlastní cookies (např. pro přiřazení provize).</p>
<p>Pokud v budoucnu zavedeme měření návštěvnosti nebo upozornění, vyžádáme si předem tvůj souhlas a tuto stránku doplníme.</p>
<p>Dotazy: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
"""))

out("style.css", CSS)
out("icon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#e2421c"/><g stroke="#f7a37f" stroke-width="2.4" stroke-linecap="round">' + ''.join(f'<line x1="50" y1="50" x2="{50+33*__import__("math").cos(a*3.14159/180):.1f}" y2="{50+33*__import__("math").sin(a*3.14159/180):.1f}"/>' for a in range(0,360,60)) + '</g></svg>')
out("robots.txt", "User-agent: *\nAllow: /\n")
print("ok", len(DEST), "destinací")
