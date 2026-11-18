/* Červený pomeranč – sdílená logika stránek (tržiště, speciály).
   Zkušební provoz: nabídky generuje ukázkový generátor níže. Po napojení feedů partnerů
   se pole ITEMS naplní z API a zbytek stránky zůstane beze změny. */
(function(){
'use strict';
var PAGE = document.body.getAttribute('data-page') || 'home';
var INVIA_AID = '2803411';        // doplň své affiliate ID z Invie
var DEMO = true;
var INVIA = 'https://www.invia.cz';

// ------------------------------------------------------------------ pomocné
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
var R=rng(20261118);
function pick(a){return a[Math.floor(R()*a.length)];}
function $(id){return document.getElementById(id);}
function kc(n){return Math.round(n).toLocaleString('cs-CZ').replace(/\s/g,' ')+' Kč';}
function pad(n){return String(n).padStart(2,'0');}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function D0(y,m,d){return new Date(y,m-1,d);}
function addD(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function ds(d){return d.getDate()+'. '+(d.getMonth()+1)+'.';}
function dc(d){return d.getDate()+'.'+(d.getMonth()+1)+'.';}
function nights(n){return n+' '+(n===1?'noc':n<5?'noci':'nocí');}
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
var MONTHS_FULL=['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
var AIR={PRG:'Praha',OSR:'Ostrava',BRQ:'Brno',PED:'Pardubice',KTW:'Katovice',VIE:'Vídeň',BTS:'Bratislava',CAR:'autem'};
var AIR_FROM={PRG:'z Prahy',OSR:'z Ostravy',BRQ:'z Brna',PED:'z Pardubic',KTW:'z Katovic',VIE:'z Vídně',BTS:'z Bratislavy',CAR:'vlastní dopravou'};
var BOARD={AI:'all inclusive',UAI:'ultra all incl.',HB:'polopenze',BB:'snídaně',FB:'plná penze',RO:'bez stravy'};
var BOARD_SHORT={AI:'ALL INCL',UAI:'ULTRA AI',HB:'POLOPENZ',BB:'SNÍDANĚ',FB:'PLNÁ P.',RO:'BEZ STR.'};
var NOW=new Date(), TODAY=new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate());
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ destinace (údaje orientační)
// temps = prům. denní maximum: pro, led, úno, bře, dub, čer, čvc, srp, zář
var DEST={
 hrg:{city:'Hurghada',ctry:'Egypt',iata:'HRG',fly:4.5,km:2700,sea:24,temps:[24,22,23,26,29,33,35,35,33],base:15500,link:'/dovolena/last-minute/egypt/',sky:['#ffcf7a','#f28a3c','#1f6fa8'],hint:'Korály hned u břehu, nejjistější zimní teplo.'},
 rmf:{city:'Marsa Alam',ctry:'Egypt',iata:'RMF',fly:4.6,km:2900,sea:24,temps:[25,23,24,26,29,33,35,35,33],base:16900,link:'/dovolena/last-minute/egypt/',sky:['#ffd88f','#f07a3a','#167aa0'],hint:'Klidnější než Hurghada, nejhezčí šnorchlování v Egyptě.'},
 lpa:{city:'Gran Canaria',ctry:'Kanárské ostrovy',iata:'LPA',fly:5.2,km:3900,sea:20,temps:[23,21,22,23,23,25,26,27,27],base:19800,link:'/dovolena/last-minute/kanarske-ostrovy/',sky:['#fde2a8','#f5a35c','#2a7cb2'],hint:'Věčné jaro, duny Maspalomas a výlety do hor.'},
 tfs:{city:'Tenerife',ctry:'Kanárské ostrovy',iata:'TFS',fly:5.3,km:3950,sea:20,temps:[22,21,21,22,23,25,27,28,27],base:20900,link:'/dovolena/last-minute/kanarske-ostrovy/',sky:['#ffe0b0','#ef8f50','#24688f'],hint:'Sopka Teide, velryby a slunný jih ostrova.'},
 znz:{city:'Zanzibar',ctry:'Tanzanie',iata:'ZNZ',fly:8.5,km:6600,sea:28,temps:[31,32,32,31,28,28,28,28,29],base:38900,link:'/dovolena/zanzibar/',sky:['#fff1b8','#ffb15c','#0fa3a3'],hint:'Bílý písek, tyrkysová voda, malý časový posun.'},
 mle:{city:'Maledivy',ctry:'Maledivy',iata:'MLE',fly:10.5,km:7600,sea:29,temps:[30,30,31,32,31,30,30,30,30],base:62900,link:'/dovolena/maledivy/',sky:['#e6fbff','#7fd6e8','#0a7fa8'],hint:'Domek nad vodou, ryby pod podlahou.'},
 mru:{city:'Mauricius',ctry:'Mauricius',iata:'MRU',fly:12,km:9100,sea:27,temps:[30,30,30,29,28,24,24,24,25],base:54900,link:'/dovolena/mauricius/',sky:['#eafff2','#8fdcc0','#0e8c8c'],hint:'Laguny, hory a francouzská kuchyně.'},
 sez:{city:'Seychely',ctry:'Seychely',iata:'SEZ',fly:11,km:7700,sea:28,temps:[30,30,31,31,31,29,28,28,29],base:79900,link:'/dovolena/exotika/',sky:['#f2fff0','#a6e3b4','#127f9a'],hint:'Žulové balvany a nejhezčí pláže světa.'},
 sid:{city:'Sal',ctry:'Kapverdy',iata:'SID',fly:6.5,km:5100,sea:23,temps:[26,25,25,26,26,27,28,29,29],base:28900,link:'/dovolena/kapverdske-ostrovy/',sky:['#ffe7a6','#f39a4a','#1d82b8'],hint:'Exotika skoro bez časového posunu.'},
 hkt:{city:'Phuket',ctry:'Thajsko',iata:'HKT',fly:11.5,km:8400,sea:29,temps:[31,32,33,34,33,31,31,31,31],base:33900,link:'/dovolena/thajsko/',sky:['#fff0a0','#ffa24c','#1b9a7a'],hint:'Suchá sezóna, ostrovy na dosah lodí.'},
 mct:{city:'Maskat',ctry:'Omán',iata:'MCT',fly:6.5,km:4800,sea:25,temps:[28,25,27,31,36,40,40,38,37],base:31900,link:'/dovolena/oman/',sky:['#ffe1a0','#e98a3f','#2c6f9e'],hint:'Hory, poušť a fjordy. Arábie bez mrakodrapů.'},
 dxb:{city:'Dubaj',ctry:'SAE',iata:'DXB',fly:5.8,km:4300,sea:24,temps:[26,24,26,29,34,40,41,41,39],base:24900,link:'/dovolena/exotika/',sky:['#ffe9b8','#f2b06a','#3d7fb0'],hint:'Zimní slunce, pláž pod mrakodrapy, poušť za městem.'},
 pfo:{city:'Paphos',ctry:'Kypr',iata:'PFO',fly:3.3,km:2350,sea:21,temps:[19,17,18,20,23,29,32,32,30],base:12900,link:'/dovolena/last-minute/kypr/',sky:['#ffe2b6','#f2a065','#3e86b5'],hint:'Dlouhá sezóna, skvělé jídlo, výlety do hor.'},
 her:{city:'Kréta',ctry:'Řecko',iata:'HER',fly:2.8,km:1900,sea:24,temps:[17,16,16,18,21,27,29,29,27],base:16900,link:'/dovolena/first-minute/recko/',sky:['#ffe3a0','#f29d4e','#1e6fb3'],hint:'Největší ostrov: soutěsky, taverny, růžová pláž Elafonisi.'},
 kgs:{city:'Kos',ctry:'Řecko',iata:'KGS',fly:2.7,km:1800,sea:24,temps:[16,15,15,17,21,28,31,31,28],base:16400,link:'/dovolena/first-minute/recko/',sky:['#fff0b3','#f5b061','#1b7ab8'],hint:'Placatý ostrov na kolo, mělké pláže pro děti.'},
 rho:{city:'Rhodos',ctry:'Řecko',iata:'RHO',fly:2.8,km:1850,sea:24,temps:[17,15,16,18,21,28,31,31,28],base:16800,link:'/dovolena/first-minute/recko/',sky:['#ffe6aa','#f2a258','#2370b0'],hint:'Středověké město, Lindos a vítr na západním pobřeží.'},
 cfu:{city:'Korfu',ctry:'Řecko',iata:'CFU',fly:2.2,km:1300,sea:23,temps:[15,14,14,16,19,28,31,31,27],base:15900,link:'/dovolena/first-minute/recko/',sky:['#eaf7d8','#b9d98a','#1d6f9e'],hint:'Nejzelenější ostrov, benátská architektura a zátoky.'},
 zth:{city:'Zakynthos',ctry:'Řecko',iata:'ZTH',fly:2.4,km:1450,sea:24,temps:[16,14,15,17,20,28,31,31,28],base:15600,link:'/dovolena/first-minute/recko/',sky:['#e6f7ff','#9fd4ef','#0d7aa8'],hint:'Pláž Navagio, modré jeskyně a želvy karety.'},
 ayt:{city:'Side',ctry:'Turecko',iata:'AYT',fly:2.9,km:2000,sea:25,temps:[16,15,16,19,22,31,34,34,31],base:17900,link:'/dovolena/first-minute/turecko/',sky:['#ffd896','#f0863e','#1873a8'],hint:'Aquaparky, písečné pláže a all inclusive.'},
 dur:{city:'Durrës',ctry:'Albánie',iata:'TIA',fly:1.8,km:1100,sea:25,temps:[13,12,13,16,19,27,30,30,27],base:12900,link:'/dovolena/first-minute/albanie/',sky:['#ffe6ad','#f4a058','#2a86ad'],hint:'Řecko za cenu Bulharska.'},
 var:{city:'Zlaté písky',ctry:'Bulharsko',iata:'VAR',fly:2.0,km:1250,sea:24,temps:[7,5,7,11,16,25,28,28,24],base:10900,link:'/dovolena/first-minute/bulharsko/',sky:['#ffeab5','#f5ac63','#3a8fbc'],hint:'Nejlevnější moře s all inclusive.'},
 dje:{city:'Djerba',ctry:'Tunisko',iata:'DJE',fly:2.6,km:1900,sea:26,temps:[18,16,18,21,24,31,35,35,32],base:12400,link:'/dovolena/first-minute/tunisko/',sky:['#ffdf99','#ef9246','#2d7fb0'],hint:'Krátký let a dlouhé písečné pláže.'},
 pmi:{city:'Mallorca',ctry:'Španělsko',iata:'PMI',fly:2.4,km:1500,sea:24,temps:[16,15,16,18,20,27,30,31,27],base:18900,link:'/dovolena/first-minute/spanelsko/',sky:['#ffe4a8','#f39b52','#1f78b4'],hint:'Zátoky, kola a hory.'},
 kap:{city:'Kaprun',ctry:'Rakousko',iata:'AT',fly:0,km:420,sea:null,temps:[],base:3200,link:'/lyzovani/',sky:['#eef4fb','#c9d9ea','#5a7896'],hint:'Ledovec Kitzsteinhorn, lyžuje se od podzimu do jara.',car:true},
 sbh:{city:'Saalbach',ctry:'Rakousko',iata:'AT',fly:0,km:430,sea:null,temps:[],base:3600,link:'/lyzovani/',sky:['#f1f6fc','#cfdcec','#4f6f8f'],hint:'Jedna z největších propojených ski oblastí v Alpách.',car:true},
 bga:{city:'Bad Gastein',ctry:'Rakousko',iata:'AT',fly:0,km:470,sea:null,temps:[],base:3400,link:'/lyzovani/',sky:['#f4f1fb','#d8d0ec','#5f5a8f'],hint:'Belle époque, termální lázně a lyžování v jednom.',car:true},
 kef:{city:'Island',ctry:'Island',iata:'KEF',fly:3.8,km:2400,sea:null,temps:[],base:24900,link:'/eurovikendy/',sky:['#dfe9ff','#7f93d6','#20304f'],hint:'Polární záře, gejzíry a Modrá laguna.'},
 rvn:{city:'Laponsko',ctry:'Finsko',iata:'RVN',fly:3.2,km:2050,sea:null,temps:[],base:29900,link:'/eurovikendy/',sky:['#eaf2ff','#a7bde8','#28406b'],hint:'Psí spřežení, polární záře a sauna se sněhem.'},
 par:{city:'Paříž',ctry:'Francie',iata:'CDG',fly:1.7,km:880,sea:null,temps:[],base:7490,link:'/eurovikendy/',sky:['#fdf0e6','#f0c3a6','#6b7fa8'],hint:'Montmartre ráno, Seina večer.'},
 rom:{city:'Řím',ctry:'Itálie',iata:'FCO',fly:1.9,km:920,sea:null,temps:[],base:6990,link:'/eurovikendy/',sky:['#fff1d6','#f2c27a','#a35b3a'],hint:'Koloseum, Trastevere a nejlepší carbonara.'},
 lis:{city:'Lisabon',ctry:'Portugalsko',iata:'LIS',fly:3.4,km:2200,sea:null,temps:[],base:8990,link:'/eurovikendy/',sky:['#fff3d1','#f6c36b','#2b7fb0'],hint:'Tramvaj 28, pastéis de nata a oceán.'},
 lon:{city:'Londýn',ctry:'Velká Británie',iata:'LHR',fly:2.0,km:1040,sea:null,temps:[],base:8490,link:'/eurovikendy/',sky:['#eef0f6','#b8c0d8','#3b4a6b'],hint:'Muzea zdarma, muzikály a trhy.'}
};
Object.keys(DEST).forEach(function(k){DEST[k].k=k;});

// smyšlené hotely (ukázkový provoz)
var HN=['Coral Bay','Azur Palace','Blue Lagoon','Sea Garden','Palm Cove','Sunrise Reef','Golden Sands','Lighthouse','Olive Grove','White Pearl','Laguna Verde','Orange Tree','Seashell Bay','Aqua Vista','Paradise Rock','Horizon','Marina View','Sandy Point','Turtle Beach','Wind & Waves','Amphora','Kalimera','Thalassa','Mythos','Aegean Blue','Villa Ariadne'];
var PFX=['Hotel','Resort','Beach Club','Village','Suites'];
var ALP=['Alpenhof','Bergkristall','Sonnblick','Edelweiss','Gamskogel','Almrausch','Panorama Lodge','Tauernblick'];
var HOTELS={};
function hotelsFor(k,n,lux){
  var key=k+(lux?'L':''); HOTELS[key]=HOTELS[key]||[];
  while(HOTELS[key].length<n){
    var alp=DEST[k].car, nm;
    do{nm=alp?pick(['Hotel','Wellnesshotel','Chalet','Gasthof'])+' '+pick(ALP):pick(PFX)+' '+pick(HN);}while(HOTELS[key].some(function(h){return h.name===nm}));
    var stars=lux?5:(R()<.22?5:R()<.72?4:3);
    var rating=Math.round((7.3+R()*2.2+(stars===5?.3:0))*10)/10; if(lux) rating=Math.max(rating,9.0);
    HOTELS[key].push({name:nm,stars:stars,rating:Math.min(9.7,rating),reviews:Math.round(120+R()*3200),beach:alp?null:pick(lux?[0,0,0]:[0,0,50,120,250,400,700])});
  }
  return HOTELS[key].slice(0,n);
}

// ------------------------------------------------------------------ generátory
var ITEMS=[], NEXT=1;
function hist(ppp,dropChance){var h=[],p=ppp*(1+R()*.1),dr=R()<dropChance;for(var i=13;i>=0;i--){if(i===2&&dr)p=ppp*1.14;h.push(Math.round(p/10)*10);p=p*(1+(R()-.55)*.025);}h[13]=ppp;return h;}
function push(o){o.id=NEXT++;o.isNew=R()<.1;o.age=Math.floor(R()*72);o.tags=o.tags||[];var mx=Math.max.apply(null,o.hist.slice(0,13));o.drop=mx>o.ppp?mx-o.ppp:0;o.dropPct=o.drop/mx;o.ppn=Math.round(o.ppp/(o.n||1));ITEMS.push(o);return o;}
var AF={PRG:1,OSR:.97,BRQ:1.01,PED:1.02,KTW:.965,VIE:1.04,BTS:1.02};
var BF={AI:1,UAI:1.13,HB:.9,BB:.82,FB:.95};
function packages(k,opt){
  var d=DEST[k], hs=hotelsFor(k,opt.hotels||4,opt.lux);
  hs.forEach(function(h){
    for(var w=0;w<(opt.dates||3);w++){
      var span=(opt.to-opt.from)/864e5, dep=addD(opt.from,Math.floor(R()*Math.max(1,span)));
      (opt.air||['PRG','OSR','BRQ','KTW']).forEach(function(a){
        if(R()<.35&&a!=='PRG')return;
        (opt.nights||[7]).forEach(function(n){
          var b=pick(opt.boards||['AI','HB']);
          var f=(1+(h.stars-4)*.22)*(1+(h.rating-8)*.05)*(AF[a]||1)*(BF[b]||1)*(n>7?(R()<.18?.98:1+(n-7)*.11):1-(7-n)*.1)*(.9+R()*.22)*(opt.mult||1);
          var ppp=Math.round(d.base*f/10)*10-10;
          push({type:'package',d:d,hotel:h,air:a,dep:dep,ret:addD(dep,n),n:n,board:b,ppp:ppp,hist:hist(ppp,.15),tags:(opt.tags||[]).slice()});
        });
      });
    }
  });
}
function flight(from,k,dep,days,ppp,typical,tags,direct){
  var d=DEST[k]||k; return push({type:'flight',d:d,air:from,dep:dep,ret:addD(dep,days),n:days,ppp:ppp,typical:Math.round(ppp*(1.02+R()*.32)/100)*100,hist:hist(ppp,.4),tags:tags||[],direct:direct!==false});
}
function hotelOnly(k,n,opt){
  var d=DEST[k]; hotelsFor(k,n,opt.lux).forEach(function(h,i){
    var ppn=Math.round((opt.nightly||d.base)*(1+(h.stars-4)*.45)*(.85+R()*.3)/10)*10-10, dep=addD(opt.from,Math.floor(R()*20));
    push({type:'hotel',d:d,hotel:h,air:d.car?'CAR':'',dep:dep,ret:addD(dep,opt.stay||3),n:opt.stay||3,board:opt.board||'BB',ppp:ppn,perNight:true,hist:hist(ppn,.2),tags:opt.tags||[]});
  });
}
function combo(k,from,dep,n,ppp,what,tags){var d=DEST[k];return push({type:'combo',d:d,air:from,dep:dep,ret:addD(dep,n),n:n,board:'BB',ppp:ppp,typical:Math.round(ppp*(.95+R()*.3)/100)*100,what:what,hist:hist(ppp,.25),tags:tags||[]});}

// --- jarní prázdniny 2027 (týdny pondělí–neděle, odlet v sobotu před)
var SPRING=[
 {w:1,from:D0(2027,2,1),to:D0(2027,2,7),okresy:'Bruntál, Česká Lípa, Havlíčkův Brod, Jablonec nad Nisou, Jihlava, Kladno, Kolín, Kutná Hora, Liberec, Náchod, Pelhřimov, Písek, Semily, Třebíč, Žďár nad Sázavou'},
 {w:2,from:D0(2027,2,8),to:D0(2027,2,14),okresy:'Chomutov, Jeseník, Jičín, Mladá Boleslav, Most, Olomouc, Opava, Prachatice, Příbram, Rychnov nad Kněžnou, Strakonice, Šumperk, Tábor, Ústí nad Labem'},
 {w:3,from:D0(2027,2,15),to:D0(2027,2,21),okresy:'Benešov, Beroun, České Budějovice, Český Krumlov, Chrudim, Klatovy, Ostrava-město, Pardubice, Prostějov, Rokycany, Svitavy, Trutnov, Ústí nad Orlicí'},
 {w:4,from:D0(2027,2,22),to:D0(2027,2,28),okresy:'Praha 1–5, Blansko, Brno-město, Brno-venkov, Břeclav, Domažlice, Hodonín, Karviná, Louny, Tachov, Vyškov, Znojmo'},
 {w:5,from:D0(2027,3,1),to:D0(2027,3,7),okresy:'Praha 6–10, Cheb, Děčín, Frýdek-Místek, Jindřichův Hradec, Karlovy Vary, Litoměřice, Nymburk, Přerov, Sokolov'},
 {w:6,from:D0(2027,3,8),to:D0(2027,3,14),okresy:'Hradec Králové, Kroměříž, Mělník, Nový Jičín, Plzeň-jih, Plzeň-město, Plzeň-sever, Praha-východ, Praha-západ, Rakovník, Teplice, Uherské Hradiště, Vsetín, Zlín'}
];

function demoData(){
// --- obecný výpis: zima a léto
['hrg','rmf','lpa','tfs','znz','sid','hkt','pfo','mct','dxb'].forEach(function(k){packages(k,{from:addD(TODAY,5),to:addD(TODAY,70),hotels:3,dates:2,nights:[7,8],boards:k==='hkt'?['BB','HB']:['AI','HB','UAI'],air:DEST[k].fly>7?['PRG','VIE']:['PRG','OSR','BRQ','KTW','PED']});});
['her','ayt','dur','var','dje','pmi'].forEach(function(k){packages(k,{from:D0(2027,6,1),to:D0(2027,9,15),hotels:3,dates:2,nights:[7,8],tags:['fm']});});
// --- Vánoce a Silvestr
['hrg','rmf','lpa','tfs','dxb','znz','mle','mru','sid','mct','hkt'].forEach(function(k){packages(k,{from:D0(2026,12,19),to:D0(2027,1,1),hotels:2,dates:1,nights:[7,8],mult:1.32,boards:['AI','HB'],air:DEST[k].fly>7?['PRG','VIE']:['PRG','OSR','BRQ','KTW'],tags:['xmas']});});
SPRING.forEach(function(s){
  var sat=addD(s.from,-2);
  ['hrg','rmf','lpa','tfs','dxb','sid'].forEach(function(k,i){if(i>3&&R()<.4)return;packages(k,{from:sat,to:addD(sat,1),hotels:1,dates:1,nights:[7],mult:1.16,boards:['AI','HB'],air:['PRG','OSR','BRQ','KTW'],tags:['spring','sw'+s.w]});});
  ['kap','sbh'].forEach(function(k){hotelOnly(k,1,{from:sat,stay:7,board:'HB',tags:['spring','sw'+s.w,'ski']});});
});
// --- Zanzibar v nejjistějším období (srpen–září)
packages('znz',{from:D0(2027,8,1),to:D0(2027,9,25),hotels:4,dates:2,nights:[9,10],boards:['AI','HB'],air:['PRG','VIE'],tags:['zbest']});
// --- léto: první polovina července
['her','kgs','rho','ayt','dur','var','dje','pmi','pfo'].forEach(function(k){packages(k,{from:D0(2027,7,1),to:D0(2027,7,14),hotels:2,dates:1,nights:[7,8],mult:1.18,tags:['july','fm']});});
// --- Řecko po ostrovech (stránka speciál)
['her','kgs','rho','cfu','zth'].forEach(function(k){packages(k,{from:D0(2027,5,20),to:D0(2027,9,30),hotels:10,dates:2,nights:[7,8],boards:['AI','HB','BB'],air:['PRG','OSR','BRQ','PED','KTW'],tags:['greece','fm']});});
// --- letenky
var DXBF=[['PRG',D0(2027,1,14),7,8490,12900],['VIE',D0(2027,1,22),6,6990,10900],['KTW',D0(2027,2,5),8,7490,11500],['BTS',D0(2026,12,3),5,7990,11900],['PRG',D0(2027,3,4),7,9290,12900],['VIE',D0(2027,2,18),9,7290,10900]];
DXBF.forEach(function(f){flight(f[0],'dxb',f[1],f[2],f[3],f[4],['dxbflight'],true);});
[['PRG','lis',D0(2027,2,12),5,2990,4200],['KTW','rom',D0(2027,1,23),3,990,1900],['VIE',{city:'New York',ctry:'USA',iata:'JFK',fly:9.3,km:6800,sky:['#d9e9ff','#9cbcf0','#26446f'],hint:'Vánoční Manhattan za cenu týdne v Řecku.'},D0(2026,12,6),6,10990,15900,false],
 ['PRG',{city:'Bangkok',ctry:'Thajsko',iata:'BKK',fly:11.5,km:8600,sky:['#fff0a0','#ffa24c','#1b9a7a'],hint:'S přestupem. V Thajsku začíná suchá sezóna.'},D0(2027,1,20),14,13990,19900,false],
 ['VIE',{city:'Tokio',ctry:'Japonsko',iata:'NRT',fly:12.5,km:9100,sky:['#ffe1e6','#f39bb0','#3c4f8f'],hint:'Japonsko v zimě: onseny a Fudži bez mraků.'},D0(2027,2,8),10,16990,22900,false],
 ['BRQ','lon',D0(2027,1,29),3,1490,2600],['BTS','tfs',D0(2027,1,10),7,3490,5200],['PRG',{city:'Marrákeš',ctry:'Maroko',iata:'RAK',fly:3.9,km:2700,sky:['#ffe1c2','#e9935a','#b2552f'],hint:'Súky, poušť a přes 20 °C i v lednu.'},D0(2027,2,2),5,3290,4900],
 ['PRG','par',D0(2027,3,12),3,1890,3200],['VIE',{city:'Bali',ctry:'Indonésie',iata:'DPS',fly:15,km:9800,sky:['#eaffd8','#a6d985','#178f7a'],hint:'S přestupem. Rýžová pole, chrámy a surf.'},D0(2027,4,8),14,17990,24900,false]
].forEach(function(f){flight(f[0],f[1],f[2],f[3],f[4],f[5],['flights'],f[6]);});
// --- hotely
hotelOnly('dxb',3,{from:addD(TODAY,10),stay:4,board:'BB',nightly:3400,tags:['hotel-dxb']});
hotelOnly('kap',1,{from:D0(2027,1,9),stay:4,board:'HB',tags:['hotel-at','ski']});
hotelOnly('sbh',1,{from:D0(2027,1,16),stay:4,board:'HB',tags:['hotel-at','ski']});
hotelOnly('bga',1,{from:D0(2027,1,23),stay:4,board:'HB',tags:['hotel-at','ski']});
// --- kombinace a eurovíkendy
combo('kef','PRG',D0(2027,2,4),4,24900,'let + 4 noci + výlet za polární září',['combo']);
combo('rvn','PRG',D0(2026,12,10),4,29900,'let + 4 noci + psí spřežení',['combo']);
combo('par','PRG',D0(2027,1,15),3,7490,'let + 3 noci v centru',['combo']);
combo('rom','KTW',D0(2027,2,19),3,6990,'let + 3 noci u Trastevere',['combo']);
combo('lis','VIE',D0(2027,3,5),4,8990,'let + 4 noci v Alfamě',['combo']);
combo('lon','BRQ',D0(2027,1,22),3,8490,'let + 3 noci + muzikál',['combo']);
// --- pro náročné
packages('mle',{from:addD(TODAY,20),to:D0(2027,3,30),hotels:2,dates:1,nights:[9],lux:true,mult:1.9,boards:['AI'],air:['PRG','VIE'],tags:['lux']});
packages('mru',{from:addD(TODAY,25),to:D0(2027,3,30),hotels:1,dates:1,nights:[10],lux:true,mult:1.5,boards:['HB'],air:['PRG'],tags:['lux']});
packages('sez',{from:addD(TODAY,25),to:D0(2027,3,30),hotels:1,dates:1,nights:[9],lux:true,mult:1.4,boards:['HB'],air:['PRG','VIE'],tags:['lux']});
packages('dxb',{from:addD(TODAY,15),to:D0(2027,3,1),hotels:1,dates:1,nights:[6],lux:true,mult:2.4,boards:['HB'],air:['PRG'],tags:['lux']});
packages('znz',{from:addD(TODAY,20),to:D0(2027,3,1),hotels:1,dates:1,nights:[10],lux:true,mult:1.8,boards:['AI'],air:['PRG'],tags:['lux']});

}

// ------------------------------------------------------------------ reálná data partnerů (data/main.json)
var DATA=null;
// podnebí a orientační údaje po zemích; klíč = položka v DEST, jejíž teploty a barvy se použijí
var CTRY={
 'Egypt':'hrg','Kanárské ostrovy':'tfs','Zanzibar':'znz','Maledivy':'mle','Mauricius':'mru','Seychely':'sez','Kapverdské ostrovy':'sid',
 'Thajsko':'hkt','Omán':'mct','Spojené arabské emiráty':'dxb','Kypr':'pfo','Řecko':'her','Turecko':'ayt','Albánie':'dur','Bulharsko':'var',
 'Tunisko':'dje','Španělsko':'pmi','Itálie':'rom','Portugalsko':'lis','Francie':'par','Velká Británie':'lon','Rakousko':'kap'
};
var EXTRA={ // země, které nemají vlastní položku v DEST
 'Dominikánská republika':{iata:'PUJ',fly:10.5,km:7900,sea:27,temps:[29,29,29,30,30,31,32,32,32],sky:['#fff3b0','#ffb35c','#0f8fa8'],hint:'Karibské pláže s palmami a all inclusive resorty.'},
 'Mexiko':{iata:'CUN',fly:11.5,km:9000,sea:27,temps:[28,28,29,30,31,32,33,33,32],sky:['#fff0b8','#ffab55','#0c9aa6'],hint:'Riviera Maya: cenoty, mayské památky a tyrkysové moře.'},
 'Kuba':{iata:'VRA',fly:11,km:8300,sea:26,temps:[27,26,27,28,29,31,32,32,31],sky:['#ffe9b0','#f6a052','#1a86b0'],hint:'Varadero, staré Havana a rum pod palmou.'},
 'Srí Lanka':{iata:'CMB',fly:11,km:7800,sea:28,temps:[30,30,31,32,32,30,30,30,30],sky:['#fff1b0','#f7a64f','#16927e'],hint:'Čaj, sloni, chrámy a pláže na jihu ostrova.'},
 'Indonésie':{iata:'DPS',fly:15,km:9800,sea:28,temps:[31,31,31,31,31,30,30,30,31],sky:['#eaffd8','#a6d985','#178f7a'],hint:'Rýžová pole, chrámy, surf a džungle.'},
 'Kuba ':{}
};
var AIRX={BUD:'Budapešť',KRK:'Krakov',WRO:'Vratislav',FRA:'Frankfurt',KSC:'Košice',SZG:'Salzburg',BER:'Berlín',WAW:'Varšava',GRZ:'Graz',MUC:'Mnichov',KLV:'Karlovy Vary',JCL:'České Budějovice',DRS:'Drážďany'};
var AIRX_FROM={BUD:'z Budapešti',KRK:'z Krakova',WRO:'z Vratislavi',FRA:'z Frankfurtu',KSC:'z Košic',SZG:'ze Salzburgu',BER:'z Berlína',WAW:'z Varšavy',GRZ:'ze Grazu',MUC:'z Mnichova',KLV:'z Karlových Varů',JCL:'z Českých Budějovic',DRS:'z Drážďan'};
Object.keys(AIRX).forEach(function(k){AIR[k]=AIRX[k];AIR_FROM[k]=AIRX_FROM[k];});
var PARTNER={d:'Dovolená.cz',i:'Invia.cz'};
function slug(s){return norm(s||'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ostatni';}
var DCACHE={};
function destFor(country,locality,isl){
  var key=isl||null, loc=locality||'';
  if(!key){
    if(country==='Egypt') key=/marsa|quseir|hamata|ghalib|abu dabbab|port ghalib/i.test(loc)?'rmf':'hrg';
    else if(country==='Kanárské ostrovy') key=/gran canaria|maspalomas|playa del ingl/i.test(loc)?'lpa':/tenerife|adeje|americas|puerto de la cruz/i.test(loc)?'tfs':'kan-'+slug(loc);
    else if(country==='Španělsko'&&/mallorca|picafort|millor|magaluf|illot|sa coma|alcudia|palma/i.test(loc)) key='pmi';
    else if(country==='Spojené arabské emiráty'&&/dubaj/i.test(loc)) key='dxb';
    else key=CTRY[country]&&DEST[CTRY[country]]&&['her','rom','par','lon','lis','kap'].indexOf(CTRY[country])<0?CTRY[country]:'c-'+slug(country);
  }
  var id=key+'|'+(isl||key.indexOf('c-')===0||key.indexOf('kan-')===0?'':loc);
  if(DCACHE[id]) return DCACHE[id];
  var base=DEST[key]||DEST[CTRY[country]]||EXTRA[country]||{};
  var d={k:key,city:isl?DEST[isl].city:(loc||country),ctry:country,iata:base.iata||'',fly:base.fly||0,km:base.km||0,sea:base.sea||null,
    temps:base.temps||[],sky:base.sky||['#ffe7c2','#f4a463','#2f7fae'],hint:base.hint||'',car:false};
  if(!DEST[key]) DEST[key]=d;
  return DCACHE[id]=d;
}
function fromData(J){
  DATA=J; var gen=new Date(J.gen);
  var HS=J.h.map(function(h){return {gid:h[0],name:h[1],stars:h[2]||0,ctry:h[3],loc:h[4],rating:h[5]||null,reviews:h[6]||null,img:h[7],pt:h[8],isl:h[9],beach:null};});
  J.o.forEach(function(r){
    var h=HS[r[0]], d=destFor(h.ctry,h.loc,h.isl), dep=new Date(r[2]+'T00:00:00'), n=r[3]||7;
    var hist=r[10]&&r[10].length>1?r[10]:[r[6]];
    var o={type:'package',d:d,hotel:{name:h.name,stars:h.stars,rating:h.rating,reviews:h.reviews,beach:null,img:h.img,gid:h.gid,pt:h.pt},
      air:r[4],dep:dep,ret:addD(dep,n),n:n,board:r[5]||'',ppp:r[6],disc:r[7]||0,partner:r[1],okey:r[8],file:slug(h.ctry),hist:hist,tags:[]};
    var md=(dep.getMonth()+1)*100+dep.getDate(), y=dep.getFullYear(), t=o.tags;
    if((y===2026&&md>=1219)||(y===2027&&md<=101)) t.push('xmas');
    SPRING.forEach(function(s){if(dep>=addD(s.from,-3)&&dep<=addD(s.from,1)&&n>=5&&n<=9){t.push('spring');t.push('sw'+s.w);}});
    if(y===2027&&md>=701&&md<=715){t.push('july');}
    if(h.ctry==='Zanzibar'&&y===2027&&md>=801&&md<=930) t.push('zbest');
    if(h.isl) t.push('greece');
    if(dep>=D0(2027,5,1)) t.push('fm');
    if(h.stars>=5&&(o.ppp>=45000||/Maledivy|Seychely|Mauricius/.test(h.ctry))) t.push('lux');
    o.id=NEXT++;
    var ageDays=r[9]; o.age=ageDays>=999?9999:ageDays*24; o.isNew=ageDays<=1;
    var mx=Math.max.apply(null,o.hist); o.drop=mx>o.ppp?mx-o.ppp:0; o.dropPct=mx?o.drop/mx:0; o.ppn=Math.round(o.ppp/(o.n||1));
    o.checkedMin=Math.max(1,Math.round((Date.now()-gen)/6e4));
    ITEMS.push(o);
  });
}
// detail nabídky: popis, galerie, všechny termíny a odkaz k partnerovi (načítá se až při otevření)
var DFILES={};
function detailFile(name){if(!DFILES[name])DFILES[name]=fetch('data/d/'+name+'.json').then(function(r){if(!r.ok)throw 0;return r.json();});return DFILES[name];}

// ------------------------------------------------------------------ push: ranní poklady a hlídací pes
var PUSH_ID=null, WATCH=[];
try{PUSH_ID=localStorage.getItem('cp_push_id');WATCH=JSON.parse(localStorage.getItem('cp_watch')||'[]');}catch(e){}
function saveWatch(){try{localStorage.setItem('cp_watch',JSON.stringify(WATCH))}catch(e){}}
var IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var IS_APP=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function pushSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function b64uToU8(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var r=atob(s),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a;}
function api(path,body){return fetch('/api/'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j;});});}
function pushError(e){
  var m=String(e&&e.message||e);
  if(m==='ios') return 'Na iPhonu fungují upozornění jen z aplikace na ploše: v Safari klepni na Sdílet → Přidat na plochu, otevři Pomeranč z plochy a zapni to tam.';
  if(m==='unsupported') return 'Tenhle prohlížeč upozornění neumí. Zkus Chrome nebo Safari.';
  if(m==='denied') return 'Upozornění jsou v prohlížeči zakázaná. Povol je v nastavení webu (ikona zámku vedle adresy).';
  return 'Nepovedlo se: '+m;
}
function ensureSub(opts){
  if(!pushSupported()) return Promise.reject(new Error(IS_IOS&&!IS_APP?'ios':'unsupported'));
  var reg;
  return navigator.serviceWorker.register('/sw.js').then(function(r){reg=r;return Notification.requestPermission();})
    .then(function(p){if(p!=='granted')throw new Error('denied');return navigator.serviceWorker.ready;})
    .then(function(){return reg.pushManager.getSubscription();})
    .then(function(s){return s||api('vapid').then(function(k){return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToU8(k.key)});});})
    .then(function(s){var b={sub:s.toJSON()};if(opts&&'air' in opts)b.air=opts.air;if(opts&&'daily' in opts)b.daily=opts.daily;return api('subscribe',b);})
    .then(function(j){PUSH_ID=j.id;try{localStorage.setItem('cp_push_id',j.id)}catch(e){}return j;});
}
if(PUSH_ID&&pushSupported()) navigator.serviceWorker.register('/sw.js').catch(function(){});
if(navigator.clearAppBadge) navigator.clearAppBadge().catch(function(){});
function isWatched(gid){return WATCH.indexOf(gid)>=0;}
function toggleWatch(o,btn){
  var gid=o.hotel&&o.hotel.gid; if(!gid) return;
  if(isWatched(gid)){
    api('unwatch',{id:PUSH_ID,gid:gid}).catch(function(){});
    WATCH=WATCH.filter(function(x){return x!==gid});saveWatch();btn.textContent='🔔 Hlídat cenu';toast('Hlídání zrušeno');return;
  }
  btn.disabled=true;btn.textContent='Zapínám…';
  var price=o.hotelMin||o.ppp;
  (PUSH_ID?Promise.resolve({id:PUSH_ID}):ensureSub({daily:false}))
    .then(function(){return api('watch',{id:PUSH_ID,gid:gid,file:o.file,name:o.hotel.name,price:price});})
    .catch(function(e){if(/neznámý odběr/.test(String(e&&e.message))){PUSH_ID=null;return ensureSub({daily:false}).then(function(){return api('watch',{id:PUSH_ID,gid:gid,file:o.file,name:o.hotel.name,price:price});});}throw e;})
    .then(function(){WATCH.push(gid);saveWatch();btn.textContent='✓ Hlídáš cenu';toast('Hlídám. Dám vědět, až '+o.hotel.name+' zlevní pod '+kc(price)+'.');})
    .catch(function(e){btn.textContent='🔔 Hlídat cenu';toast(pushError(e));})
    .then(function(){btn.disabled=false;});
}

// ------------------------------------------------------------------ přidání na plochu (nejdůležitější konverze)
var INST={prompt:null};
var IN_APP=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|TikTok|musical_ly|Bytedance|Line\//i.test(navigator.userAgent);
var IS_ANDROID=/Android/i.test(navigator.userAgent);
var IS_MOBILE=IS_IOS||IS_ANDROID;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();INST.prompt=e;});
window.addEventListener('appinstalled',function(){try{localStorage.setItem('cp_installed','1')}catch(e){}hideInstall();toast('Hotovo, Pomeranč je na ploše 🍊');});
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function installMode(){
  if(IS_APP) return null;
  if(IN_APP) return IS_ANDROID?'inapp-android':'inapp-ios';
  if(INST.prompt) return 'prompt';
  if(IS_IOS) return 'ios';
  if(IS_ANDROID) return 'android';
  return null;
}
var SHARE_ICO='<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px;color:#0a84ff" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
var PLUS_ICO='<span style="display:inline-grid;place-items:center;width:20px;height:20px;border:1.8px solid currentColor;border-radius:5px;font-weight:800;line-height:1;vertical-align:-4px">+</span>';
function hideInstall(){var el=document.getElementById('isheet');if(el)el.remove();}
function showInstall(why){
  var mode=installMode();
  if(!mode){ if(why==='manual') toast(IS_APP?'Pomeranč už máš na ploše 🍊':'Na počítači stačí záložka. Na plochu si Pomeranč přidej v mobilu.'); return; }
  hideInstall();
  var el=document.createElement('div');el.id='isheet';el.className='isheet'+(mode==='ios'?' ios':'');el.setAttribute('role','dialog');el.setAttribute('aria-label','Přidat Pomeranč na plochu');
  var head='<button type="button" class="ix" aria-label="Zavřít">✕</button><div class="ih"><img src="/icon-192.png?v=2" alt="" width="52" height="52"><div><b>Přidej si Pomeranč na plochu</b><span>Každé ráno poklady dne, na ikoně uvidíš, kolik přibylo nových nabídek. Zdarma, bez registrace.</span></div></div>';
  var body='';
  if(mode==='prompt') body='<button type="button" class="btn or ibtn" data-i="prompt">📲 Přidat na plochu</button>';
  else if(mode==='ios') body='<ol class="isteps"><li>Klepni dole na '+SHARE_ICO+' <b>Sdílet</b></li><li>Sjeď níž a vyber '+PLUS_ICO+' <b>Přidat na plochu</b></li><li>Vpravo nahoře klepni na <b>Přidat</b></li></ol><div class="iarrow" aria-hidden="true">↓</div>';
  else if(mode==='android') body='<ol class="isteps"><li>Klepni vpravo nahoře na <b>⋮</b></li><li>Vyber <b>Přidat na plochu</b> nebo <b>Instalovat aplikaci</b></li></ol>';
  else if(mode==='inapp-android') body='<p class="inote">Teď jsi v prohlížeči Facebooku nebo Instagramu, odsud na plochu přidat nejde.</p><button type="button" class="btn or ibtn" data-i="chrome">Otevřít v Chrome</button><p class="inote">Nebo klepni na <b>⋮</b> vpravo nahoře → <b>Otevřít v prohlížeči</b>.</p>';
  else if(mode==='inapp-ios') body='<p class="inote">Teď jsi v prohlížeči Facebooku nebo Instagramu, odsud na plochu přidat nejde.</p><button type="button" class="btn or ibtn" data-i="safari">Otevřít v Safari</button><p class="inote">Nebo klepni na <b>•••</b> vpravo nahoře → <b>Otevřít v prohlížeči</b>.</p>';
  el.innerHTML=head+body;
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.classList.add('on');});
  el.addEventListener('click',function(e){
    if(e.target.closest('.ix')){lsSet('cp_inst_dismiss',Date.now());hideInstall();return;}
    var b=e.target.closest('[data-i]');if(!b)return;var a=b.getAttribute('data-i');
    if(a==='prompt'&&INST.prompt){INST.prompt.prompt();INST.prompt.userChoice.then(function(r){if(r.outcome==='accepted')hideInstall();INST.prompt=null;});}
    if(a==='chrome') location.href='intent://'+location.host+location.pathname+location.search+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(location.href)+';end';
    if(a==='safari') location.href='x-safari-'+location.href;
  });
}
function autoInstall(){
  if(IS_APP||!IS_MOBILE||lsGet('cp_installed')) return;
  var d=+lsGet('cp_inst_dismiss')||0; if(Date.now()-d<20*3600e3) return;
  var done=false;function go(){if(done)return;done=true;window.removeEventListener('scroll',onS);showInstall('auto');}
  function onS(){if(window.scrollY>900)go();}
  window.addEventListener('scroll',onS,{passive:true});
  setTimeout(go,IN_APP?4000:9000);
}
// první spuštění z plochy: poděkovat a nabídnout ranní poklady
function welcomeApp(){
  if(!IS_APP||lsGet('cp_app_welcome')) return; lsSet('cp_app_welcome','1'); lsSet('cp_installed','1');
  if(!pushSupported()||PUSH_ID) return;
  var el=document.createElement('div');el.id='isheet';el.className='isheet';
  el.innerHTML='<button type="button" class="ix" aria-label="Zavřít">✕</button><div class="ih"><img src="/icon-192.png?v=2" alt="" width="52" height="52"><div><b>Vítej v Pomeranči 🍊</b><span>Chceš každé ráno vědět, co zlevnilo? Pošleme jedno upozornění denně kolem osmé.</span></div></div><button type="button" class="btn or ibtn" data-i="push">☀ Zapnout ranní poklady</button>';
  document.body.appendChild(el);requestAnimationFrame(function(){el.classList.add('on');});
  el.addEventListener('click',function(e){
    if(e.target.closest('.ix')){hideInstall();return;}
    if(e.target.closest('[data-i="push"]')){ensureSub({daily:true}).then(function(){hideInstall();toast('Hotovo, ranní poklady zapnuté ☀');}).catch(function(err){toast(pushError(err));});}
  });
}

// ================================================================== start (po načtení dat)
function start(){
// ------------------------------------------------------------------ Pomeranč index a anomálie
function median(a){var s=a.slice().sort(function(x,y){return x-y});var m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;}
var groups={};
function gk(o){return o.type+'|'+o.d.ctry+'|'+(o.board||'')+'|'+o.dep.getFullYear()+'-'+o.dep.getMonth();}
ITEMS.forEach(function(o){(groups[gk(o)]=groups[gk(o)]||[]).push(o.ppn);});
ITEMS.forEach(function(o){
  var g=groups[gk(o)], price;
  if(o.type==='flight'||o.type==='combo') price=Math.max(0,Math.min(1,.5+(o.typical-o.ppp)/o.typical*1.4));
  else if(g.length>=4){var m=median(g);price=Math.max(0,Math.min(1,.5+(m-o.ppn)/m*2));}
  else price=null;
  var q=null; if(o.hotel){var hr=o.hotel.rating==null?(5+o.hotel.stars):o.hotel.rating;q=(Math.max(0,Math.min(1,(o.hotel.stars-2)/3))+2*Math.max(0,Math.min(1,(hr-6)/3.5))+(o.hotel.beach==null?0:.7*(o.hotel.beach<=50?1:o.hotel.beach<=200?.85:o.hotel.beach<=500?.6:.35)))/(3+(o.hotel.beach==null?0:.7));}
  var days=(o.dep-TODAY)/864e5, pr=((days<2?.3:days<=150?1:days<=270?.8:.6)+(o.board==='AI'||o.board==='UAI'?1:o.board==='HB'?.8:.65)+1)/3;
  var parts=[],w=0; if(price!=null){parts.push(price*35);w+=35;} if(q!=null){parts.push(q*25);w+=25;} parts.push(pr*15);w+=15;
  var core=parts.reduce(function(a,b){return a+b},0)/w;
  var dropS=o.dropPct>=.06?Math.min(1,o.dropPct/.2):null;
  o.idx=Math.round((core*.75+Math.max(core,dropS==null?core:dropS)*.2+core*.05)*100);
});
var byHotel={};
ITEMS.forEach(function(o){if(o.type==='package'){var k=o.d.k+'|'+o.hotel.name;(byHotel[k]=byHotel[k]||[]).push(o);}});
ITEMS.forEach(function(o){
  var best=null; function cand(kind,txt,s){if(!best||s>best.s)best={kind:kind,txt:txt,s:s};}
  if(o.dropPct>=.06&&o.drop>=(o.type==='flight'?300:800)){var ago=Math.max(2,13-o.hist.indexOf(Math.max.apply(null,o.hist.slice(0,13))));cand('drop','O '+kc(o.drop)+' méně než před '+ago+' dny.',o.dropPct*2);}
  if(o.type==='flight'&&o.ppp<o.typical*.85) cand('cheap','O '+kc(o.typical-o.ppp)+' pod běžnou cenou této trasy.',.5);
  if(o.type==='package') byHotel[o.d.k+'|'+o.hotel.name].forEach(function(x){
    if(x===o)return; var diff=x.ppp-o.ppp;
    if(+x.dep===+o.dep&&x.n===o.n&&x.board===o.board&&x.air!==o.air&&diff>=900&&diff/x.ppp>=.05) cand('air','O '+kc(diff)+' levněji než stejný termín '+AIR_FROM[x.air]+'.',diff/x.ppp);
    if(+x.dep===+o.dep&&x.air===o.air&&x.board===o.board&&o.n>x.n&&o.ppp<x.ppp) cand('nights',o.n+' nocí stojí o '+kc(x.ppp-o.ppp)+' méně než '+x.n+' nocí.',.6+(x.ppp-o.ppp)/x.ppp);
    if(+x.dep===+o.dep&&x.air===o.air&&x.n===o.n&&(o.board==='AI'||o.board==='UAI')&&(x.board==='HB'||x.board==='BB')&&o.ppp>=x.ppp&&(o.ppp-x.ppp)/x.ppp<=.06) cand('board','All inclusive jen o '+kc(o.ppp-x.ppp)+' dráž než '+BOARD[x.board]+'.',.45);
  });
  o.anom=best; if(best&&best.kind!=='drop') o.idx=Math.min(99,o.idx+4);
});
// z každého hotelu v rámci tématu jen nejlepší varianta
function bestOf(list){var m={};list.forEach(function(o){var k=o.type==='package'||o.type==='hotel'?o.d.k+'|'+o.hotel.name:'x'+o.id;if(!m[k]||o.idx>m[k].idx||(o.idx===m[k].idx&&o.ppp<m[k].ppp))m[k]=o;});return Object.keys(m).map(function(k){return m[k]});}
function withTag(t){return ITEMS.filter(function(o){return o.tags.indexOf(t)>=0});}
var lastSlot=(function(){var t=new Date(),l=new Date(t);l.setHours(Math.floor(t.getHours()/3)*3,0,0,0);return l;})();
if(DEMO) ITEMS.forEach(function(o){o.checkedMin=Math.max(1,Math.round((Date.now()-lastSlot)/6e4)-Math.floor(R()*30));});
function diverse(list,n,per){var c={},out=[];per=per||1;for(var i=0;i<list.length&&out.length<n;i++){var k=list[i].d.ctry;c[k]=(c[k]||0)+1;if(c[k]<=per)out.push(list[i]);}return out;}
function mix(list){var g={},keys=[];list.forEach(function(o){var k=o.d.ctry;if(!g[k]){g[k]=[];keys.push(k);}g[k].push(o);});var out=[];for(var r=0;out.length<list.length;r++){keys.forEach(function(k){if(g[k][r])out.push(g[k][r]);});}return out;}
function isTreasure(o){return o.idx>=88||o.dropPct>=.12;}
function why(o){
  if(o.anom) return o.anom.txt;
  if(o.type==='combo') return o.what.charAt(0).toUpperCase()+o.what.slice(1)+'.';
  if(o.hotel&&o.hotel.rating>=8.8) return 'Hosté hodnotí '+String(o.hotel.rating).replace('.',',')+'/10'+(o.hotel.reviews?' ('+o.hotel.reviews.toLocaleString('cs-CZ')+' hodnocení)':'')+'.';
  if(o.disc>=10) return 'Sleva '+o.disc+' % oproti ceníku u '+PARTNER[o.partner]+'.';
  if(o.hotel&&o.hotel.beach===0) return 'Hotel stojí přímo na pláži.';
  return o.d.hint;
}
function title(o){
  if(o.type==='flight') return AIR[o.air]+' → '+o.d.city;
  if(o.type==='combo') return o.d.city+(o.d.ctry!==o.d.city?' · '+o.d.ctry:'');
  if(PAGE==='greece'&&o.hotel) return o.hotel.name;
  return o.d.ctry===o.d.city?o.d.city:o.d.ctry+' – '+o.d.city;
}
function sub(o){
  if(o.type==='flight') return 'zpáteční · '+(o.direct?'přímý let':'s přestupem')+' · '+o.n+' dní';
  if(o.type==='combo') return o.what;
  if(o.type==='hotel') return esc(o.hotel.name)+' '+'★'.repeat(o.hotel.stars)+' · '+BOARD[o.board];
  return (PAGE==='greece'?'★'.repeat(o.hotel.stars)+' · '+(o.hotel.rating?String(o.hotel.rating).replace('.',',')+'/10 · ':''):'')+nights(o.n)+' · '+BOARD[o.board];
}
function unit(o){return o.type==='hotel'?'/ noc za pokoj':o.type==='flight'?'zpáteční / os.':'/ osoba';}
function linkOf(o){
  if(o.url) return o.url;
  if(!DEMO) return '#';
  if(o.type==='flight') return 'https://www.kiwi.com/cz/';
  return INVIA+o.d.link+(INVIA_AID?'?aid='+encodeURIComponent(INVIA_AID):'');
}

// ------------------------------------------------------------------ uložené
var saved; try{saved=JSON.parse(localStorage.getItem('cp_saved')||'[]')}catch(e){saved=[]}
function isSaved(id){return saved.indexOf(id)>=0;}
function syncSaved(){var el=$('tbSaved');if(el)el.textContent=saved.length;}
function toggleSave(id){var i=saved.indexOf(id);if(i>=0)saved.splice(i,1);else saved.push(id);try{localStorage.setItem('cp_saved',JSON.stringify(saved))}catch(e){}syncSaved();toast(i>=0?'Odebráno z uložených':'Uloženo ♥');if(i<0&&!IS_APP&&IS_MOBILE&&!lsGet('cp_installed'))setTimeout(function(){showInstall('save');},1200);document.querySelectorAll('[data-save="'+id+'"]').forEach(function(b){b.setAttribute('aria-pressed',isSaved(id))});}
syncSaved();

// ------------------------------------------------------------------ grafika
function pic(o,h){if(o.hotel&&o.hotel.img)return '<img src="'+esc(o.hotel.img)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width:100%;height:'+h+'px;object-fit:cover;display:block" onerror="this.style.display=\'none\'">';return sky(o,h);}
function sky(o,h){
  var c=o.d.sky, sx=25+((o.d.iata.charCodeAt(0)*7+o.d.iata.charCodeAt(1))%50), wave='', snow=o.d.car||o.d.k==='kef'||o.d.k==='rvn';
  if(!snow) for(var i=0;i<3;i++){var y=h*.62+i*9;wave+='<path d="M0 '+y+' Q 25 '+(y-4)+' 50 '+y+' T 100 '+y+' T 150 '+y+' T 200 '+y+'" fill="none" stroke="rgba(255,255,255,'+(.35-i*.1)+')" stroke-width="1.4"/>';}
  var ground=snow?'<path d="M0 '+(h*.75)+' L45 '+(h*.38)+' L80 '+(h*.62)+' L120 '+(h*.3)+' L165 '+(h*.6)+' L200 '+(h*.45)+' L200 '+h+' L0 '+h+' Z" fill="'+c[2]+'"/><path d="M45 '+(h*.38)+' L56 '+(h*.47)+' L36 '+(h*.47)+' Z M120 '+(h*.3)+' L133 '+(h*.41)+' L108 '+(h*.41)+' Z" fill="#fff"/>':'<rect y="'+(h*.55)+'" width="200" height="'+(h*.45)+'" fill="'+c[2]+'"/>'+wave;
  return '<svg viewBox="0 0 200 '+h+'" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" style="display:block"><rect width="200" height="'+h+'" fill="'+c[1]+'"/><rect width="200" height="'+(h*.55)+'" fill="'+c[0]+'"/><circle cx="'+sx+'%" cy="'+(h*.48)+'" r="'+(h*.19)+'" fill="'+(o.d.k==='kef'||o.d.k==='rvn'?'#c8f5d8':'#fff6dc')+'" opacity=".95"/>'+ground+'<text x="192" y="'+(h-9)+'" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="'+(h*.28)+'" font-weight="800" fill="rgba(255,255,255,.32)">'+(o.d.iata==='AT'?'ALPS':o.d.iata)+'</text></svg>';
}
function spark(h,W,H,dots){
  var mn=Math.min.apply(null,h),mx=Math.max.apply(null,h);
  var X=function(i){return 4+i*(W-8)/(h.length-1)},Y=function(v){return 6+(1-(v-mn)/((mx-mn)||1))*(H-12)};
  var d=h.map(function(v,i){return (i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)}).join(' ');
  var pts=dots?h.map(function(v,i){return i%3===0||i===h.length-1?'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(i===h.length-1?3.2:1.8)+'" fill="'+(i===h.length-1?'var(--orange)':'var(--ink)')+'"/>':''}).join(''):'';
  return '<path d="'+d+'" fill="none" stroke="'+(dots?'var(--ink)':'var(--orange)')+'" stroke-width="'+(dots?1.5:2.4)+'" stroke-linejoin="round" stroke-dasharray="'+(dots?'3 3':'0')+'"/>'+pts;
}
function lbl(o){
  if(o.tags.indexOf('lux')>=0) return '<span class="lbl" style="background:#141312;color:#e6b45a">◆ PRO NÁROČNÉ</span>';
  if(isTreasure(o)) return '<span class="lbl poklad">★ POKLAD</span>';
  if(o.type==='flight') return '<span class="lbl fm">✈ LETENKA</span>';
  if(o.type==='hotel') return '<span class="lbl fm">▣ UBYTOVÁNÍ</span>';
  if(o.type==='combo') return '<span class="lbl fm">✦ LET + HOTEL</span>';
  if(o.isNew) return '<span class="lbl nove">★ NOVÉ</span>';
  if(o.dep-TODAY<21*864e5) return '<span class="lbl lm">ϟ LAST MINUTE</span>';
  if(o.dropPct>=.06) return '<span class="lbl drop">▼ ZLEVNĚNO</span>';
  if(o.disc>=10) return '<span class="lbl drop">SLEVA '+o.disc+' %</span>';
  if(o.dep.getFullYear()>=2027&&o.dep.getMonth()>=4) return '<span class="lbl fm">FIRST MINUTE</span>';
  return '';
}
function ago(m){return m<60?'před '+m+' min':'před '+Math.round(m/60)+' h';}
function oldPrice(o){return Math.max.apply(null,o.hist.slice(0,13));}

// ------------------------------------------------------------------ řádek a dlaždice
function row(o){
  var pct=o.dropPct>=.05?'<span class="pct">−'+Math.round(o.dropPct*100)+' %</span>':o.disc>=5?'<span class="pct">−'+o.disc+' %</span>':'';
  var under=o.dropPct>=.05?'<div class="old">'+kc(oldPrice(o))+'</div>':'<div class="pp">'+unit(o)+'</div>';
  var where=o.type==='hotel'?'<span><svg class="i"><use href="#i-pin"/></svg>'+esc(o.d.city)+'</span>':'<span><svg class="i"><use href="#i-plane"/></svg>'+(AIR[o.air]||'')+'</span>';
  return '<article class="row" data-open="'+o.id+'" tabindex="0" aria-label="'+esc(title(o)+', '+kc(o.ppp))+'">'+
    '<div style="min-width:0">'+lbl(o)+'<div class="dest">'+esc(title(o))+'</div><div class="sub">'+sub(o)+'</div>'+
    '<div class="meta">'+where+'<span><svg class="i"><use href="#i-cal"/></svg>'+dc(o.dep)+'–'+dc(o.ret)+'</span></div></div>'+
    (o.hist.length>=3?'<div class="trend">'+pct+'<svg class="sp" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true">'+spark(o.hist,120,44,true)+'</svg><small>cena '+o.hist.length+' dní</small></div>':'<div class="trend">'+pct+'<small>'+(o.partner?PARTNER[o.partner]:'')+'</small></div>')+
    '<div class="pr"><div class="p">'+kc(o.ppp)+'</div>'+under+'<div class="upd">Aktualizováno '+ago(o.checkedMin)+'</div></div>'+
    '<div class="acts"><button type="button" class="heart" data-save="'+o.id+'" aria-pressed="'+isSaved(o.id)+'" aria-label="Uložit"><svg><use href="#hrt"/></svg></button><button type="button" class="go" data-open="'+o.id+'" aria-label="Detail nabídky"><svg class="i"><use href="#i-arrow"/></svg></button></div></article>';
}
function tile(o){
  var top=o.type==='hotel'?esc(o.hotel.name)+' '+'★'.repeat(o.hotel.stars):o.type==='flight'?(o.direct?'přímý let':'s přestupem')+' · zpáteční':o.type==='combo'?esc(o.what):esc(o.hotel.name)+' '+'★'.repeat(o.hotel.stars);
  var m=o.type==='hotel'?'<span>'+BOARD[o.board]+'</span><span>od '+ds(o.dep)+'</span>':'<span>'+dc(o.dep)+'–'+dc(o.ret)+'</span><span>'+(o.type==='flight'?o.n+' dní':nights(o.n))+'</span><span>✈ '+(o.air==='CAR'?'autem':o.air)+'</span>'+(o.board&&o.type==='package'?'<span>'+BOARD[o.board]+'</span>':'');
  return '<article class="tile" data-open="'+o.id+'" tabindex="0" aria-label="'+esc(title(o)+', '+kc(o.ppp))+'"><div class="sk">'+pic(o,96)+lbl(o)+'<button type="button" class="heart" data-save="'+o.id+'" aria-pressed="'+isSaved(o.id)+'" aria-label="Uložit"><svg><use href="#hrt"/></svg></button></div>'+
    '<div class="b"><div class="t">'+esc(o.type==='flight'?o.d.city+' z '+AIR[o.air].replace('Praha','Prahy').replace('Vídeň','Vídně').replace('Katovice','Katovic').replace('Bratislava','Bratislavy').replace('Brno','Brna'):o.d.city)+'</div><div class="s">'+top+'</div><div class="m">'+m+'</div>'+
    '<div class="w">'+esc(why(o))+'</div>'+
    '<div class="f"><div class="p">'+kc(o.ppp)+(o.dropPct>=.05?' <span class="old">'+kc(oldPrice(o))+'</span>':'')+'<small>'+unit(o)+'</small></div><span class="ix" title="Pomeranč index">'+o.idx+'</span></div></div></article>';
}

// ------------------------------------------------------------------ detail
function byId(id){for(var i=0;i<ITEMS.length;i++)if(ITEMS[i].id==id)return ITEMS[i];}
function route(o){if(!o.d.fly||!AIR[o.air])return '';return '<div class="dsec route"><h4>Cesta</h4><svg viewBox="0 0 500 96" role="img" aria-label="Let '+esc(AIR[o.air]||'')+' – '+esc(o.d.city)+', asi '+String(o.d.fly).replace('.',',')+' hodin"><path d="M40 70 Q 250 -10 460 70" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="4 6"/><circle cx="40" cy="70" r="6" fill="var(--ink)"/><circle cx="460" cy="70" r="7" fill="var(--orange)"/><text x="40" y="92" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="13" font-weight="800" fill="var(--ink)">'+o.air+'</text><text x="460" y="92" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="13" font-weight="800" fill="var(--orange)">'+o.d.iata+'</text><text x="250" y="24" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="12" fill="var(--mute)">≈ '+o.d.km.toLocaleString('cs-CZ')+' km · '+String(o.d.fly).replace('.',',')+' h letu'+(o.type==='flight'&&!o.direct?' + přestup':'')+'</text><text x="250" y="46" text-anchor="middle" font-size="18" fill="var(--ink)">✈</text></svg></div>';}
function kv(pairs){return '<div class="kv">'+pairs.map(function(p){return '<div><span>'+p[0]+'</span><b>'+p[1]+'</b></div>';}).join('')+'</div>';}
function openOffer(id,noHash){
  var o=byId(id); if(!o)return;
  var pax=+(($('fPax')||{}).value||2), ad=pax>=3?2:pax, kids=Math.max(0,pax-2);
  var total=o.type==='hotel'?o.ppp*o.n:o.ppp*ad+(o.type==='flight'?o.ppp*kids:Math.round(o.ppp*.45)*kids);
  var paxTxt=o.type==='hotel'?nights(o.n)+' (pokoj)':ad+(ad===1?' dospělého':' dospělé')+(kids?' + '+kids+(kids===1?' dítě':' děti'):'');
  var h='<div style="height:170px;margin:0 -18px;overflow:hidden" id="dPic">'+pic(o,170)+'</div>';
  h+=lbl(o).replace('class="lbl','style="margin-top:14px" class="lbl')+'<h3 id="dTitle">'+esc(o.type==='flight'?AIR[o.air]+' → '+o.d.city:o.d.city)+'</h3>';
  h+='<div style="color:var(--mute);font-weight:600">'+[o.d.ctry!==o.d.city?esc(o.d.ctry):'',o.type==='flight'?'zpáteční letenka':o.type==='combo'?esc(o.what):esc(o.hotel.name)+' '+'★'.repeat(o.hotel.stars)].filter(Boolean).join(' · ')+'</div>';
  h+='<div class="bigp">'+kc(o.ppp)+' <small>'+unit(o)+(o.dropPct>=.05?' · dříve <s>'+kc(oldPrice(o))+'</s>':'')+'</small></div>';
  h+='<div style="color:var(--mute);font-size:13px">'+kc(total)+' celkem za '+paxTxt+(o.type==='package'?' · '+kc(o.ppn)+' za noc a osobu':'')+(kids&&o.type==='package'?' (dětská cena orientačně)':'')+'</div>';
  h+='<div style="margin-top:12px;font-weight:700;background:var(--orange-soft);border-radius:12px;padding:10px 12px">„'+esc(why(o))+'“</div>';
  var mi=[1,2,3,4,4,5,6,7,8,8,0,0][o.dep.getMonth()], temp=o.d.temps&&o.d.temps.length?o.d.temps[mi]+' °C':null;
  if(o.type==='flight') h+=kv([['Tam',ds(o.dep)],['Zpět',ds(o.ret)],['Pobyt',o.n+' dní'],['Odlet',AIR[o.air]],['Let',o.direct?'přímý':'s přestupem'],['Index',o.idx+' / 100']]);
  else if(o.type==='hotel') h+=kv([['Lokalita',esc(o.d.city)],['Hotel','★'.repeat(o.hotel.stars)],['Strava',BOARD[o.board]],['Hodnocení',String(o.hotel.rating).replace('.',',')+'/10'],['Termín od',ds(o.dep)],['Doprava',o.d.car?'autem, '+o.d.km+' km':'letecky'],['Index',o.idx+' / 100']]);
  else if(o.type==='combo') h+=kv([['Termín',ds(o.dep)+' – '+ds(o.ret)],['Délka',nights(o.n)],['Odlet',AIR[o.air]],['V ceně',esc(o.what)],['Index',o.idx+' / 100']]);
  else h+=kv([['Termín',ds(o.dep)+' – '+ds(o.ret)],['Délka',nights(o.n)],['Strava',BOARD[o.board]],['Odlet',AIR[o.air]||o.air],['Hodnocení',o.hotel.rating?String(o.hotel.rating).replace('.',',')+'/10':'–'],['K pláži',o.hotel.beach==null?'–':o.hotel.beach===0?'na pláži':o.hotel.beach+' m'],['Vzduch',temp||'–'],['Moře',o.d.sea?'~'+o.d.sea+' °C':'–'],['Prodává',o.partner?PARTNER[o.partner]:'–'],['Index',o.idx+' / 100']]);
  if(o.type!=='hotel') h+=route(o);
  if(o.type==='flight') h+='<div class="dsec"><h4>Běžná cena trasy</h4><div class="alt"><div class="best"><span>Tahle letenka</span><b class="num">'+kc(o.ppp)+'</b></div><div><span>Obvykle zpáteční</span><b class="num">'+kc(o.typical)+'</b></div></div></div>';
  if(o.type==='package'){
    var sib=byHotel[o.d.k+'|'+o.hotel.name]||[];
    var dates={}; sib.filter(function(x){return x.air===o.air&&x.n===o.n}).forEach(function(x){var k=+x.dep;if(!dates[k]||x.ppp<dates[k].ppp)dates[k]=x;});
    var dl=Object.keys(dates).sort().map(function(k){return dates[k]});
    if(dl.length>1){var dmax=Math.max.apply(null,dl.map(function(x){return x.ppp}));h+='<div class="dsec"><h4>Cena v dalších termínech · '+AIR_FROM[o.air]+', '+nights(o.n)+'</h4><div class="bars">'+dl.map(function(x){return '<button type="button" class="'+(+x.dep===+o.dep?'cur':'')+'" data-open="'+x.id+'" aria-label="'+ds(x.dep)+' '+kc(x.ppp)+'"><small>'+(Math.round(x.ppp/100)/10)+'k</small><i style="height:'+Math.max(14,x.ppp/dmax*82)+'px"></i><small>'+dc(x.dep)+'</small></button>';}).join('')+'</div></div>';}
    var alts={}; sib.filter(function(x){return +x.dep===+o.dep&&x.n===o.n&&x.board===o.board}).forEach(function(x){alts[x.air]=x;});
    var al=Object.keys(alts).map(function(k){return alts[k]}).sort(function(a,b){return a.ppp-b.ppp});
    if(al.length>1) h+='<div class="dsec"><h4>Stejný termín z jiných letišť</h4><div class="alt">'+al.map(function(x,i){return '<div class="'+(i===0?'best':'')+'"><span>'+AIR[x.air]+(x.air===o.air?' <b>(tahle)</b>':'')+'</span><b class="num">'+kc(x.ppp)+'</b></div>';}).join('')+'</div></div>';
  }
  var hh=o.hist,mn=Math.min.apply(null,hh),mx=Math.max.apply(null,hh);
  if(hh.length>=3) h+='<div class="dsec"><h4>Vývoj ceny u nás · '+hh.length+' dní</h4><svg class="spk" viewBox="0 0 500 90" role="img" aria-label="Vývoj ceny za 14 dní">'+spark(hh,500,90,false)+'</svg><div class="mono" style="display:flex;justify-content:space-between;font-size:11px;color:var(--mute)"><span>před 14 dny '+kc(hh[0])+'</span><span>max '+kc(mx)+' · min '+kc(mn)+'</span><span>dnes '+kc(hh[13])+'</span></div></div>';
  h+='<div class="dsec" id="dAbout"'+(o.d.hint?'':' hidden')+'><h4>'+(DEMO?'Proč tam':'O hotelu')+'</h4><p style="margin:0" id="dPerex">'+esc(o.d.hint)+'</p></div><div class="dsec" id="dCmp" hidden></div>';
  if(DEMO) h+='<div class="demo-note">Zkušební provoz: '+(o.type==='flight'?'letenka':o.type==='hotel'?'hotel':'nabídka')+' a cena jsou ukázka, jak bude výpis vypadat. Tlačítko tě zatím pošle na aktuální nabídku u partnera.</div>';
  h+='<div class="cta-row"><button type="button" class="btn ghost" data-save="'+o.id+'" aria-pressed="'+isSaved(o.id)+'">♥</button>'+(!DEMO&&o.hotel&&o.hotel.gid?'<button type="button" class="btn ghost" id="watchBtn">'+(isWatched(o.hotel.gid)?'✓ Hlídáš cenu':'🔔 Hlídat cenu')+'</button>':'')+'<button type="button" class="btn ghost" id="shareBtn">Sdílet</button><a class="btn or" id="dGo" href="'+esc(linkOf(o))+'" target="_blank" rel="sponsored nofollow noopener"'+(!DEMO&&!o.url?' aria-disabled="true" style="opacity:.6;pointer-events:none"':'')+'>'+(o.partner?'Na '+PARTNER[o.partner]+' →':'K nabídce →')+'</a></div>';
  $('dEyebrow').textContent=({flight:'Letenka',hotel:'Ubytování',combo:'Let + hotel',package:'Zájezd'})[o.type]+' #'+o.id+' · index '+o.idx;
  $('dBody').innerHTML=h; $('dBody').scrollTop=0;
  $('drawer').classList.add('on');$('scrim').classList.add('on');$('drawer').setAttribute('aria-hidden','false');$('dClose').focus({preventScroll:true});
  if(!noHash){try{history.replaceState(null,'','#nabidka-'+o.id)}catch(e){}}
  if(!DEMO) enrich(o);
  if($('watchBtn')) $('watchBtn').addEventListener('click',function(){toggleWatch(o,this);});
  $('shareBtn').addEventListener('click',function(){var u=location.href.split('#')[0]+'#nabidka-'+o.id;if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){toast('Odkaz zkopírován')},function(){toast(u)});else toast(u);});
}
function enrich(o){
  detailFile(o.file).then(function(D){
    if($('dEyebrow').textContent.indexOf('#'+o.id+' ')<0) return;
    var H=D.h[o.hotel.gid], go=$('dGo');
    o.url=D.u[o.okey]||(H&&H.hu&&H.hu[o.partner])||null;
    if(go&&o.url){go.href=o.url;go.removeAttribute('aria-disabled');go.style.opacity='';go.style.pointerEvents='';}
    if(!D.u[o.okey]){ // mezitím proběhla aktualizace a termín zmizel
      var note=document.createElement('div');note.className='demo-note';
      note.innerHTML=H?'Ceny se mezitím aktualizovaly a tenhle termín už partner nemá. Tlačítko tě pošle na hotel, kde uvidíš aktuální termíny. <a href="#" onclick="location.reload();return false">Obnovit nabídky</a>':'Ceny se mezitím aktualizovaly a tahle nabídka už není dostupná. <a href="#" onclick="location.reload();return false">Obnovit nabídky</a>';
      $('dBody').insertBefore(note,$('dBody').querySelector('.cta-row'));
      if(!H&&go){go.textContent='Obnovit nabídky';go.href=location.pathname;go.removeAttribute('target');go.removeAttribute('aria-disabled');go.style.opacity='';go.style.pointerEvents='';}
    }
    if(!H) return;
    o.hotelMin=Math.min.apply(null,H.t.map(function(t){return t[5]}));
    if(H.p){$('dPerex').textContent=H.p;$('dAbout').hidden=false;}
    var mineT=H.t.filter(function(t){return t[0]===o.partner}), other=o.partner==='d'?'i':'d', alt=H.t.filter(function(t){return t[0]===other}).sort(function(a,b){return a[5]-b[5]})[0];
    var html='<h4>Kde to koupit</h4><div class="alt"><div class="best"><span>'+PARTNER[o.partner]+' · '+mineT.length+' termínů</span><b class="num">od '+kc(Math.min.apply(null,mineT.map(function(t){return t[5]})))+'</b></div>';
    if(alt){var au=D.u[alt[6]];html+='<div><span>'+PARTNER[other]+' · nejlevněji '+ds(new Date(alt[1]+'T00:00:00'))+', '+nights(alt[2])+'</span><b class="num">'+(au?'<a href="'+esc(au)+'" target="_blank" rel="sponsored nofollow noopener">'+kc(alt[5])+' →</a>':kc(alt[5]))+'</b></div>';}
    $('dCmp').innerHTML=html+'</div>'; $('dCmp').hidden=false;
  }).catch(function(){var go=$('dGo');if(go)go.textContent='Odkaz se nepodařilo načíst';});
}
function closeOffer(){$('drawer').classList.remove('on');if(!$('menu').classList.contains('on'))$('scrim').classList.remove('on');$('drawer').setAttribute('aria-hidden','true');if(/^#nabidka-/.test(location.hash)){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}}
$('dClose').addEventListener('click',closeOffer);
function closeMenu(){$('menu').classList.remove('on');$('menu').setAttribute('aria-hidden','true');if(!$('drawer').classList.contains('on'))$('scrim').classList.remove('on');}
$('scrim').addEventListener('click',function(){closeOffer();closeMenu();});
$('menuBtn').addEventListener('click',function(){$('menu').classList.add('on');$('menu').setAttribute('aria-hidden','false');$('scrim').classList.add('on');});
$('menu').addEventListener('click',function(e){if(e.target.closest('[data-close]'))closeMenu();});
var tt;function toast(t){var el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){el.classList.remove('on')},2200);}

// ------------------------------------------------------------------ odpočet
function nextSlot(){if(DATA){var n=new Date(DATA.next);if(n>new Date())return n;}var t=new Date(),x=new Date(t);x.setHours(Math.floor(t.getHours()/3)*3+3,0,0,0);return x;}
function tick(){var s=Math.max(0,Math.floor((nextSlot()-new Date())/1000));var v=pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60);document.querySelectorAll('[data-cd]').forEach(function(el){el.textContent=v});if(s===0&&window.__cpRefresh)window.__cpRefresh();}
setInterval(tick,1000); tick();

// ------------------------------------------------------------------ globální kliky
document.addEventListener('click',function(e){
  var s=e.target.closest('[data-save]');if(s){e.stopPropagation();toggleSave(+s.getAttribute('data-save'));return;}
  if(e.target.closest('[data-act]')) return;
  var o=e.target.closest('[data-open]');if(o)openOffer(o.getAttribute('data-open'));
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeOffer();closeMenu();}if(e.key==='Enter'){var t=e.target.closest&&e.target.closest('[data-open]');if(t&&t.tagName!=='BUTTON')openOffer(t.getAttribute('data-open'));}});
window.addEventListener('hashchange',function(){var m=location.hash.match(/^#nabidka-(\d+)$/);if(m)openOffer(m[1],true);});

// ------------------------------------------------------------------ stránky
var MAIN=DEMO?bestOf(ITEMS.filter(function(o){return o.tags.indexOf('greece')<0||o.tags.indexOf('july')>=0})):bestOf(ITEMS);
if(PAGE==='home') home(); else if(PAGE==='greece') greece();
welcomeApp(); autoInstall();
if(!DEMO) document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&DATA&&Date.now()>Date.parse(DATA.next)+10*60e3&&!$('drawer').classList.contains('on'))location.reload();});
document.addEventListener('click',function(e){if(e.target.closest('[data-install]')){e.preventDefault();showInstall('manual');}});
var mh=location.hash.match(/^#nabidka-(\d+)$/);if(mh)openOffer(mh[1],true);
var hh=location.hash.match(/^#hotel-(.+)$/);if(hh){var hg=decodeURIComponent(hh[1]),cand=ITEMS.filter(function(o){return o.hotel&&o.hotel.gid===hg}).sort(function(a,b){return a.ppp-b.ppp})[0];if(cand)openOffer(cand.id);}

function home(){
  // statistiky
  var newC=MAIN.filter(function(o){return o.isNew||o.age<24}).length, dropC=MAIN.filter(function(o){return o.dropPct>=.06}).length;
  function anim(el,to){var t0=performance.now();(function st(t){var k=Math.min(1,((t||t0)-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-k,3))).toLocaleString('cs-CZ');if(k<1)requestAnimationFrame(st);})(t0);}
  var treasC=MAIN.filter(isTreasure).length, discC=MAIN.filter(function(o){return o.disc>=10}).length;
  var s1=$('sNew').closest('.stat'), s2=$('sDrop').closest('.stat');
  if(!DEMO){
    s1.querySelector('.k').textContent='Pokladů teď'; s1.querySelector('.v').innerHTML='<span id="sNew">0</span>'; s1.setAttribute('data-act','poklady'); s1.style.cursor='pointer';
    if(!dropC){s2.querySelector('.k').textContent='Ve slevě u cestovek';}
    s2.setAttribute('data-act','sleva'); s2.style.cursor='pointer';
  }
  anim($('sNew'),DEMO?newC:treasC); anim($('sDrop'),DEMO||dropC?dropC:discC); $('bellN').textContent=newC; $('badge').textContent=newC;

  // výpis s filtry a záložkami
  var TABS=[['all','Všechny nabídky'],['poklady','Poklady'],['lm','Last minute'],['nove','Nové'],['letenky','Letenky'],['sleva','Zlevněné'],['fm','First minute'],['lux','Pro náročné']];
  var S={tab:'all',q:'',month:'all',max:0,board:'',air:'',sort:'idx',beach:false,rating:false,stars:false,dest:null,savedOnly:false,tag:null,tagName:''};
  var shown=10;
  var months={}; MAIN.forEach(function(o){months[o.dep.getFullYear()*12+o.dep.getMonth()]=1;});
  $('fMonth').innerHTML='<option value="all">Termín</option>'+Object.keys(months).sort(function(a,b){return a-b}).map(function(k){return '<option value="'+k+'">'+MONTHS_FULL[k%12]+' '+Math.floor(k/12)+'</option>';}).join('');
  function inTab(o,t){switch(t){case 'poklady':return isTreasure(o);case 'lm':return o.type!=='flight'&&o.dep-TODAY<21*864e5;case 'nove':return o.isNew||o.age<24;case 'letenky':return o.type==='flight';case 'sleva':return o.dropPct>=.06||o.disc>=10;case 'fm':return o.dep>=D0(2027,5,1);case 'lux':return o.tags.indexOf('lux')>=0;}return o.tags.indexOf('lux')<0||S.q||S.dest;}
  function base(){
    var q=norm(S.q); var src=S.tag?withTag(S.tag):MAIN;
    return src.filter(function(o){
      if(S.savedOnly) return isSaved(o.id);
      if(q&&norm(o.d.city+' '+o.d.ctry+' '+(o.hotel?o.hotel.name:'')+' '+(AIR[o.air]||'')).indexOf(q)<0) return false;
      if(S.month!=='all'&&(o.dep.getFullYear()*12+o.dep.getMonth())!=S.month) return false;
      if(S.max&&o.ppp>S.max) return false;
      if(S.board==='flight'&&o.type!=='flight') return false;
      if(S.board==='hotel'&&o.type!=='hotel') return false;
      if(S.board&&['AI','HB','BB'].indexOf(S.board)>=0&&(!o.board||o.type==='flight'||(S.board==='AI'?(o.board!=='AI'&&o.board!=='UAI'):o.board!==S.board))) return false;
      if(S.air&&o.air!==S.air) return false;
      if(S.dest&&o.d.k!==S.dest) return false;
      if(S.beach&&(!o.hotel||o.hotel.beach==null||o.hotel.beach>100)) return false;
      if(S.rating&&(!o.hotel||o.hotel.rating<8.5)) return false;
      if(S.stars&&(!o.hotel||o.hotel.stars<5)) return false;
      return true;
    });
  }
  function render(){
    var b=base();
    $('tabs').innerHTML=TABS.map(function(t){var n=b.filter(function(o){return inTab(o,t[0])}).length;if(!n&&t[0]!=='all'&&t[0]!==S.tab)return '';return '<button type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(S.tab===t[0]&&!S.savedOnly)+'">'+t[1]+' <span>'+n+'</span></button>';}).join('');
    var l=b.filter(function(o){return S.savedOnly||inTab(o,S.tab)}).sort(function(a,c){if(S.sort==='day')return a.ppn-c.ppn;if(S.sort==='price')return a.ppp-c.ppp;if(S.sort==='drop')return c.dropPct-a.dropPct;if(S.sort==='new')return a.age-c.age;return c.idx-a.idx;});
    if(S.sort==='idx'&&!S.savedOnly){
      if(S.tab==='lm') l.sort(function(a,c){return a.dep-c.dep||c.idx-a.idx;});
      else if(S.tab==='sleva') l.sort(function(a,c){return Math.max(c.disc||0,c.dropPct*100)-Math.max(a.disc||0,a.dropPct*100)||c.idx-a.idx;});
      else if(S.tab==='poklady') l.sort(function(a,c){return c.idx-a.idx||a.ppn-c.ppn;});
      else if(S.tab==='lux') l.sort(function(a,c){return c.hotel&&a.hotel?(c.hotel.rating||0)-(a.hotel.rating||0)||c.ppp-a.ppp:0;});
      else if(S.tab==='fm') l.sort(function(a,c){return a.ppn-c.ppn;});
      if(!S.q&&!S.dest&&S.tab!=='lm') l=mix(l);
    }
    var NOTE={all:'Nejlepší nabídky napříč destinacemi, seřazené podle Pomeranč indexu.',poklady:'Poklady: index 88 a víc nebo výrazný pokles ceny. Nejvýhodnější nahoře.',lm:'Odlet do 3 týdnů. Seřazeno od nejbližšího odletu.',sleva:'Nejvyšší slevy nahoře – sleva u cestovky nebo pokles ceny u nás.',fm:'Léto a podzim 2027. Seřazeno od nejnižší ceny za noc.',lux:'Pětihvězdičkové hotely a exotika, nejlépe hodnocené nahoře.',nove:'Nové nabídky za posledních 24 hodin.'};
    var chip=S.savedOnly?'Uložené nabídky':S.tag?S.tagName:S.dest?'Jen '+DEST[S.dest].city:'';
    $('list').innerHTML=(!chip&&!S.q&&NOTE[S.tab]&&S.sort==='idx'?'<p class="mono" style="font-size:12px;color:var(--mute);margin:12px 0 0">'+NOTE[S.tab]+'</p>':'')+(chip?'<p class="mono" style="font-size:12px;color:var(--mute);margin:12px 0 0">'+esc(chip)+' · <button type="button" class="btn ghost" data-act="clear" style="padding:4px 10px">zpět na celý výpis</button></p>':'')+
      (l.length?l.slice(0,shown).map(row).join(''):'<div class="empty">'+(S.savedOnly?'Zatím nic uloženého. Klikni na ♥ u nabídky.':'Na tenhle výběr teď nic nemáme. Zkus jiný termín nebo vyšší rozpočet.')+'</div>');
    $('moreBtn').hidden=l.length<=shown;
    $('ddMonth').classList.toggle('on',S.month!=='all');$('ddMax').classList.toggle('on',!!S.max);$('ddBoard').classList.toggle('on',!!S.board);$('ddAir').classList.toggle('on',!!S.air);
  }
  function toList(){$('vypis').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}
  $('tabs').addEventListener('click',function(e){var b=e.target.closest('[data-tab]');if(!b)return;S.tab=b.getAttribute('data-tab');S.savedOnly=false;shown=10;render();});
  $('list').addEventListener('click',function(e){if(e.target.closest('[data-act="clear"]')){S.savedOnly=false;S.tag=null;S.dest=null;render();}});
  $('q').addEventListener('input',function(e){S.q=e.target.value;shown=10;render();});
  function doSearch(){S.q=$('q').value;S.tab='all';S.savedOnly=false;S.tag=null;S.dest=null;shown=10;render();$('q').blur();toList();
    var n=base().filter(function(o){return inTab(o,'all')}).length;toast(S.q?(n?'Nalezeno '+n+' nabídek':'Nic jsme nenašli, zkus jiné slovo'):'Celý výpis');}
  $('q').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();doSearch();}});
  $('q').addEventListener('search',doSearch);
  var sb=$('q').closest('.sbox'); if(sb&&!document.getElementById('qGo')){var bt=document.createElement('button');bt.type='button';bt.id='qGo';bt.className='btn or';bt.textContent='Hledat';bt.style.cssText='padding:6px 14px;margin-left:6px;border-radius:999px;font-size:14px';bt.addEventListener('click',doSearch);sb.appendChild(bt);}
  // našeptávač destinací
  var dl=document.createElement('datalist');dl.id='qList';var seen={};MAIN.forEach(function(o){[o.d.ctry,o.d.city].forEach(function(x){if(x&&!seen[x]){seen[x]=1;dl.appendChild(new Option(x));}});});document.body.appendChild(dl);$('q').setAttribute('list','qList');
  document.addEventListener('click',function(e){var a=e.target.closest('.stat[data-act]');if(!a)return;S.tab=a.getAttribute('data-act');S.savedOnly=false;S.tag=null;shown=10;render();toList();});
  [['fMonth','month',String],['fMax','max',Number],['fBoard','board',String],['fAir','air',String],['fSort','sort',String]].forEach(function(f){$(f[0]).addEventListener('change',function(e){S[f[1]]=f[2](e.target.value);shown=10;render();});});
  $('fPax').addEventListener('change',function(){toast('Ceny jsou za osobu; celkovou cenu uvidíš v detailu');});
  [['fBeach','beach'],['fRating','rating'],['fStars','stars']].forEach(function(f){$(f[0]).addEventListener('change',function(e){S[f[1]]=e.target.checked;shown=10;render();});});
  $('advBtn').addEventListener('click',function(){var on=!$('adv').classList.contains('on');$('adv').classList.toggle('on',on);this.setAttribute('aria-pressed',on);});
  $('reset').addEventListener('click',function(){S.tab='all';S.q='';S.month='all';S.max=0;S.board='';S.air='';S.sort='idx';S.beach=S.rating=S.stars=false;S.dest=null;S.tag=null;S.savedOnly=false;$('q').value='';$('fMonth').value='all';$('fMax').value='0';$('fBoard').value='';$('fAir').value='';$('fSort').value='idx';['fBeach','fRating','fStars'].forEach(function(i){$(i).checked=false});shown=10;render();});
  $('moreBtn').addEventListener('click',function(){shown+=10;render();});
  $('bellBtn').addEventListener('click',function(){S.tab='nove';S.savedOnly=false;render();toList();});
  render();
  window.__showTag=function(tag,name){S.tag=tag;S.tagName=name;S.tab='all';S.dest=null;S.savedOnly=false;shown=10;render();toList();};

  // boční panel
  var CATCH=MAIN.filter(function(o){return o.anom&&o.type==='package'&&o.dep-TODAY<75*864e5}).sort(function(a,b){return b.idx-a.idx})[0]||MAIN[0];
  $('catchIdx').textContent='Pomeranč index '+CATCH.idx; $('catch').setAttribute('data-open',CATCH.id);
  $('catch').innerHTML='<div style="height:150px;border-radius:12px;overflow:hidden">'+pic(CATCH,150)+'</div><div class="dest">'+esc(CATCH.d.city)+'</div><div class="sub">'+esc(CATCH.d.ctry)+' · '+esc(CATCH.hotel.name)+' '+'★'.repeat(CATCH.hotel.stars)+'</div><div class="meta"><span><svg class="i"><use href="#i-plane"/></svg>'+AIR[CATCH.air]+'</span><span><svg class="i"><use href="#i-cal"/></svg>'+dc(CATCH.dep)+'–'+dc(CATCH.ret)+'</span><span>'+nights(CATCH.n)+' · '+BOARD[CATCH.board]+'</span></div><div class="p">'+kc(CATCH.ppp)+' <span style="font-family:var(--body);font-size:13px;color:var(--mute);font-weight:600;letter-spacing:0">/ osoba</span></div><div class="why">„'+esc(why(CATCH))+'“</div>';
  $('miniRows').innerHTML=diverse(MAIN.slice().sort(function(a,b){return b.idx-a.idx}).filter(function(o){return o.type!=='hotel'}),8,1).map(function(o){return '<div class="mrow" data-open="'+o.id+'" tabindex="0"><span>'+pad(o.dep.getDate())+'.'+pad(o.dep.getMonth()+1)+'</span><span>'+o.air+'</span><span class="c">'+esc(o.d.city.toUpperCase())+(o.type==='flight'?' ✈':'')+'</span><b>'+Math.round(o.ppp).toLocaleString('cs-CZ')+'</b></div>';}).join('');
  var kinds={drop:'Pokles ceny',air:'Jiné letiště',nights:'Víc nocí za míň',board:'Strava navíc skoro zdarma',cheap:'Letenka pod běžnou cenou'};
  var an=[];['drop','air','nights','board','cheap'].forEach(function(k){var x=ITEMS.filter(function(o){return o.anom&&o.anom.kind===k}).sort(function(a,b){return b.anom.s-a.anom.s})[0];if(x)an.push(x);});
  $('anoms').innerHTML=an.map(function(o){return '<button type="button" class="anom" data-open="'+o.id+'"><div class="t">'+kinds[o.anom.kind]+'</div><div class="q">'+esc(o.anom.txt)+'</div><div class="m">'+esc(title(o))+' · '+ds(o.dep)+' · '+kc(o.ppp)+'</div></button>';}).join('');

  // tematické pruhy
  function rail(list){return '<div class="rail">'+list.map(tile).join('')+'</div>';}
  function shelf(id,eyebrow,h2,p,list,tag,extra){
    if(!list.length) return '';
    return '<section class="wrap shelf" id="'+id+'" aria-labelledby="'+id+'-h"><div class="shelf-h"><div><div class="eyebrow">'+eyebrow+'</div><h2 id="'+id+'-h">'+h2+'</h2>'+(p?'<p>'+p+'</p>':'')+'</div>'+(tag?'<button type="button" class="all" data-act="tag" data-tag="'+tag+'" data-name="'+esc(h2)+'">Zobrazit vše ('+withTag(tag).length+') →</button>':'')+'</div>'+(extra||'')+rail(list)+'</section>';
  }
  var top=function(tag,n){return bestOf(withTag(tag)).sort(function(a,b){return b.idx-a.idx}).slice(0,n||12);};
  var html='';
  html+=shelf('vanoce','Vánoce a Silvestr 2026','Ještě volné mezi Vánoci a Novým rokem','Odlety od 19. 12. do 1. 1. Tyhle termíny mizí jako první, ceny jsou o třetinu vyšší než v listopadu, proto ukazujeme jen ty, které za to stojí.',top('xmas'),'xmas');
  html+=shelf('dubaj','Letenky','Dubaj: zpáteční letenky za nejnižší ceny','Hlídáme odlety z Prahy, Vídně, Katovic a Bratislavy. Zimní Dubaj je kolem 25 °C a přímý let trvá necelých 6 hodin.',bestOf(withTag('dxbflight')).sort(function(a,b){return a.ppp-b.ppp}),'dxbflight');
  // jarní prázdniny
  if(withTag('spring').length) html+='<section class="wrap shelf" id="jarni" aria-labelledby="jarni-h"><div class="shelf-h"><div><div class="eyebrow">Jarní prázdniny 2027</div><h2 id="jarni-h">Jarní prázdniny: vyber svůj okres</h2><p>Termíny podle MŠMT, rozhoduje okres školy. Odlet je vždy v sobotu před prázdninami, aby děti nepřišly o školu.</p></div><button type="button" class="all" data-act="tag" data-tag="spring" data-name="Jarní prázdniny 2027">Všech '+bestOf(withTag('spring')).length+' nabídek →</button></div>'+
    '<div class="district"><label for="okres">Náš okres:</label><input id="okres" type="search" list="okresy" placeholder="např. Frýdek-Místek" autocomplete="off"><datalist id="okresy">'+SPRING.map(function(s){return s.okresy.split(', ').map(function(x){return '<option value="'+esc(x)+'">';}).join('');}).join('')+'</datalist><span class="mono" id="okresHit" style="font-size:12px;color:var(--mute)"></span></div>'+
    '<div class="weeks" id="weeks">'+SPRING.map(function(s,i){return '<button type="button" data-act="week" data-w="'+s.w+'" aria-pressed="'+(i===4)+'"><b>'+ds(s.from)+' – '+ds(s.to)+'</b><span>'+esc(s.okresy)+'</span></button>';}).join('')+'</div><div id="springRail"></div></section>';
  // Zanzibar
  var rain=[75,60,150,350,250,60,45,40,45,90,170,130], rmx=350;
  if(withTag('zbest').length) html+='<section class="wrap shelf" id="zanzibar" aria-labelledby="znz-h"><div class="feature"><div><div class="eyebrow">Destinace v nejjistějším období</div><div class="big" id="znz-h">Zanzibar v srpnu a září</div><div class="bet">☀ Sázka na jistotu: 1. 8. – 30. 9.</div><p style="margin:0 0 8px;color:var(--ink-2)">Nevybíráme „většinou tam bývá hezky“. Z celého roku jsme vybrali jedno okno, kdy je nejmenší šance na déšť: suché období, kolem 28 °C, moře 26–27 °C a méně vlhko než v lednu.</p>'+
    '<div class="clim" role="img" aria-label="Orientační srážky po měsících, nejnižší v červenci až září">'+rain.map(function(r,i){return '<div class="'+(i===7||i===8?'best':'')+'"><i style="height:'+Math.max(6,r/rmx*100)+'px"></i><small>'+['L','Ú','B','D','K','Č','Č','S','Z','Ř','L','P'][i]+'</small></div>';}).join('')+'</div><div class="legend">Orientační měsíční srážky. Oranžově zvolené okno.</div></div>'+
    '<div class="compact">'+bestOf(withTag('zbest')).sort(function(a,b){return b.idx-a.idx}).slice(0,4).map(row).join('')+'<div style="padding-top:10px"><button type="button" class="btn ghost" data-act="tag" data-tag="zbest" data-name="Zanzibar v srpnu a září">Všechny termíny na Zanzibar →</button></div></div></div></section>';
  // hotely
  if(withTag('hotel-dxb').length||withTag('hotel-at').length) html+='<section class="wrap shelf" id="hotely" aria-labelledby="hot-h"><div class="shelf-h"><div><div class="eyebrow">Jen ubytování</div><h2 id="hot-h">Hotely, které jsme vybrali</h2><p>Když si let nebo cestu autem zařídíš sám. Cena je za noc a pokoj pro dva.</p></div></div><div class="split"><div><h3>Dubaj</h3><div class="compact">'+withTag('hotel-dxb').map(row).join('')+'</div></div><div><h3>Rakousko · lyže a wellness</h3><div class="compact">'+withTag('hotel-at').map(row).join('')+'</div></div></div></section>';
  // léto
  html+=shelf('cervenec','Léto 2027 · first minute','První polovina července mizí nejrychleji','Prázdniny mají všichni najednou, takže termíny od 1. do 15. 7. se vyprodávají jako první. Tady jsou ty nejzajímavější, které cestovky ještě nabízejí.',top('july'),'july');
  // Řecko promo
  html+='<section class="wrap shelf"><a class="promo" href="recko.html"><div class="tx"><div class="eyebrow" style="color:#ffb27a">Speciál</div><h2>Řecko po ostrovech</h2><p>First minute 2027 rozdělené podle ostrovů. Ke každému deset nejlepších nabídek, kdy jet a pro koho je.</p><div class="isl"><span>Kréta</span><span>Kos</span><span>Rhodos</span><span>Korfu</span><span>Zakynthos</span></div></div><div class="art">'+sky({d:{sky:['#bfe3ff','#5aa8e0','#0d3b66'],iata:'GR',k:'gr'}},180)+'</div></a></section>';
  html+=shelf('zazitky','Eurovíkendy a zážitky','Let + hotel na pár dní','Polární záře na Islandu, psí spřežení v Laponsku, nebo prodloužený víkend v Paříži. Letenka i ubytování v jedné ceně.',withTag('combo'),'combo');
  if(withTag('lux').length) html+='<section class="wrap shelf" id="luxus"><div class="lux">'+'<div class="shelf-h"><div><div class="eyebrow">Pro náročné</div><h2>Když má být dovolená zážitek na celý život</h2><p>Pětihvězdičkové resorty, vily nad vodou a soukromé pláže. Hlídáme i tady, kdy je cena rozumná.</p></div><button type="button" class="all" style="color:#e6b45a" data-act="tag" data-tag="lux" data-name="Pro náročné">Zobrazit vše →</button></div>'+rail(bestOf(withTag('lux')).sort(function(a,b){return b.ppp-a.ppp}))+'</div></section>';
  html+=shelf('letenky','Letenky','Další letenkové poklady','Města i daleké cesty. Zpáteční ceny za osobu.',bestOf(withTag('flights')).sort(function(a,b){return b.idx-a.idx}),'flights');
  if(!DEMO){
    // automatické police z reálných dat (jen když mají dost nabídek)
    var P=bestOf(ITEMS);
    function auto(id,eye,h2,p,fn,sort,n){var l=P.filter(fn).sort(sort||function(a,b){return b.idx-a.idx});l=mix(l).slice(0,n||14);return l.length>=4?shelf(id,eye,h2,p,l,null):'';}
    var byIdx=function(a,b){return b.idx-a.idx}, byPpn=function(a,b){return a.ppn-b.ppn}, byDep=function(a,b){return a.dep-b.dep};
    var A=[];
    A.push(auto('vikend','Rychlý únik','Prodloužený víkend u moře','3 až 5 nocí, odlet do dvou měsíců. Na baterky stačí.',function(o){return o.n>=3&&o.n<=5&&o.dep-TODAY<62*864e5},byIdx));
    A.push(auto('tyden15','Do 15 000 Kč','Týden u moře do 15 000 Kč na osobu','Nejlevnější poctivé týdny. Pořád s letenkou, transferem a ubytováním.',function(o){return o.ppp<=15000&&o.n>=6},byIdx));
    A.push(auto('ai','All inclusive','All inclusive, kde se vyplatí','Strava i pití v ceně, hotely s nejlepším poměrem cena/výkon.',function(o){return o.board==='AI'||o.board==='UAI'},byIdx));
    A.push(auto('dlouhe','10 a více nocí','Dva týdny za cenu jednoho','Delší pobyty s nejnižší cenou za noc.',function(o){return o.n>=10},byPpn));
    A.push(auto('hodnoceni','Hosté jsou nadšení','Nejlépe hodnocené hotely','Hodnocení 9/10 a víc od skutečných hostů.',function(o){return o.hotel&&o.hotel.rating>=9},byIdx));
    A.push(auto('exotika','Exotika','Exotika do 40 000 Kč','Maledivy, Zanzibar, Thajsko, Karibik a další – za rozumné peníze.',function(o){return /Maledivy|Zanzibar|Thajsko|Mauricius|Seychely|Dominik|Mexiko|Kuba|Srí|Indon|Kapverd/.test(o.d.ctry)&&o.ppp<=40000},byIdx));
    ['OSR','BRQ','VIE','KTW'].forEach(function(a){A.push(auto('z'+a,'Odlet '+AIR_FROM[a],'Nejlepší odlety '+AIR_FROM[a],'Když nechceš jezdit do Prahy.',function(o){return o.air===a},byIdx,12));});
    // police po zemích podle počtu nabídek
    var cnt={};P.forEach(function(o){cnt[o.d.ctry]=(cnt[o.d.ctry]||0)+1;});
    Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]}).slice(0,10).forEach(function(c){
      A.push(auto('z-'+slug(c),c,c+': nejlepší nabídky',cnt[c]+' hotelů s aktuálními termíny.',function(o){return o.d.ctry===c},byIdx,14));
    });
    // prokládat tematické a zemské police
    html+=A.filter(Boolean).join('');
  }
  if($('pushOn')){
    var pon=$('pushOn'),pmsg=$('pushMsg'),pair=$('pushAir');
    function pushUI(st){if(st&&st.daily){pon.textContent='Vypnout ranní poklady';pon.className='btn ghost';pmsg.textContent='Zapnuto'+(st.air?' pro odlety '+(AIR_FROM[st.air]||st.air):'')+'. Další poklady zítra kolem osmé.';if(st.air)pair.value=st.air;}else{pon.textContent='Zapnout ranní poklady';pon.className='btn or';}}
    if(PUSH_ID) api('me?id='+encodeURIComponent(PUSH_ID)).then(pushUI).catch(function(){PUSH_ID=null;});
    if(IS_IOS&&!IS_APP) pmsg.textContent='Na iPhonu nejdřív přidej Pomeranč na plochu (Safari → Sdílet → Přidat na plochu) a zapni to z aplikace.';
    pon.addEventListener('click',function(){
      var turnOff=pon.textContent.indexOf('Vypnout')===0; pon.disabled=true;
      (turnOff?navigator.serviceWorker.ready.then(function(r){return r.pushManager.getSubscription();}).then(function(s){return api('subscribe',{sub:s.toJSON(),daily:false});})
              :ensureSub({daily:true,air:pair.value}))
        .then(function(j){pushUI(j);toast(turnOff?'Ranní poklady vypnuty':'Hotovo, ranní poklady zapnuté ☀');})
        .catch(function(e){pmsg.textContent=pushError(e);})
        .then(function(){pon.disabled=false;});
    });
    pair.addEventListener('change',function(){if(PUSH_ID&&pon.textContent.indexOf('Vypnout')===0)ensureSub({daily:true,air:pair.value}).then(pushUI).catch(function(){});});
  }
  $('shelves').innerHTML=html;
  // nekonečný proud na konci stránky
  if(!DEMO&&!document.getElementById('feed')){
    var F=mix(bestOf(ITEMS).sort(function(a,b){return b.idx-a.idx})), fi=0;
    var sec=document.createElement('section');sec.className='wrap shelf';sec.id='feed';
    sec.innerHTML='<div class="shelf-h"><div><div class="eyebrow">Ještě nemáš dost?</div><h2>Další nabídky pro tebe</h2><p>Scrolluj dál, nabídky se načítají samy.</p></div></div><div id="feedGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"></div><div id="feedEnd" style="height:40px"></div>';
    var foot=document.querySelector('footer');foot.parentNode.insertBefore(sec,foot);
    function more(){var add=F.slice(fi,fi+12);fi+=add.length;$('feedGrid').insertAdjacentHTML('beforeend',add.map(tile).join(''));if(fi>=F.length){$('feedEnd').textContent='To je všechno. Další várka cen za '+document.querySelector('[data-cd]').textContent+'.';$('feedEnd').className='mono';}}
    more();
    if('IntersectionObserver' in window) new IntersectionObserver(function(e){if(e[0].isIntersecting&&fi<F.length)more();},{rootMargin:'800px'}).observe($('feedEnd'));
  }
  // výpis nahoře: další nabídky se načítají samy při scrollu (max 60, pak tlačítko)
  if('IntersectionObserver' in window){var autoN=0;new IntersectionObserver(function(e){if(e[0].isIntersecting&&!$('moreBtn').hidden&&autoN<5){autoN++;$('moreBtn').click();}},{rootMargin:'300px'}).observe($('moreBtn'));}

  function springRail(w){if(!$('springRail'))return;var l=bestOf(withTag('sw'+w)).sort(function(a,b){return b.idx-a.idx});$('springRail').innerHTML='<div class="rail">'+l.map(tile).join('')+'</div>';}
  springRail(5);
  $('shelves').addEventListener('click',function(e){
    var t=e.target.closest('[data-act="tag"]'); if(t){window.__showTag(t.getAttribute('data-tag'),t.getAttribute('data-name'));return;}
    var w=e.target.closest('[data-act="week"]'); if(w){document.querySelectorAll('#weeks button').forEach(function(b){b.setAttribute('aria-pressed',b===w)});springRail(+w.getAttribute('data-w'));}
  });
  if($('okres')) $('okres').addEventListener('input',function(e){var v=norm(e.target.value.trim());if(v.length<3){$('okresHit').textContent='';return;}
    var hit=SPRING.filter(function(s){return s.okresy.split(', ').some(function(x){return norm(x).indexOf(v)===0})})[0];
    if(!hit){$('okresHit').textContent='okres nenalezen';return;}
    $('okresHit').textContent='→ '+ds(hit.from)+' – '+ds(hit.to);
    document.querySelectorAll('#weeks button').forEach(function(b){var on=+b.getAttribute('data-w')===hit.w;b.setAttribute('aria-pressed',on);if(on)b.scrollIntoView({inline:'center',block:'nearest'});});springRail(hit.w);});

  // odletová tabule
  var boardAir='ALL', airs=['ALL','PRG','OSR','BRQ','KTW','VIE'];
  $('boardTabs').innerHTML=airs.map(function(a){return '<button type="button" data-ba="'+a+'" aria-pressed="'+(a==='ALL')+'">'+(a==='ALL'?'VŠE':a)+'</button>';}).join('');
  var CH='ABCDEFGHIJKLMNOPQRSTUVWXYZÁČÉÍŘŠŽ0123456789 ';
  function cells(text,len){text=(text+' '.repeat(len)).slice(0,len);return '<span class="cells" aria-hidden="true">'+text.split('').map(function(c){return '<span class="fl" data-c="'+esc(c)+'">'+(reduce?esc(c):' ')+'</span>';}).join('')+'</span><span class="sr">'+esc(text.trim())+'</span>';}
  function flapAll(root){if(reduce)return;root.querySelectorAll('.fl').forEach(function(el,i){var t=el.getAttribute('data-c'),steps=4+Math.floor(Math.random()*8),n=0;setTimeout(function run(){if(n>=steps){el.textContent=t;el.classList.remove('flip');void el.offsetWidth;el.classList.add('flip');return;}el.textContent=CH[Math.floor(Math.random()*CH.length)];el.classList.remove('flip');void el.offsetWidth;el.classList.add('flip');n++;setTimeout(run,55);},(i%60)*12);});}
  function renderBoard(){
    var l=diverse(MAIN.filter(function(o){return o.type!=='hotel'&&(boardAir==='ALL'||o.air===boardAir)}).sort(function(a,b){return b.idx-a.idx}),12,1);
    $('boardBody').innerHTML=l.map(function(o){var st=o.dropPct>=.06?'drop':o.isNew?'new':isTreasure(o)?'tip':'',tx=st==='drop'?'ZLEVNĚNO':st==='new'?'NOVÉ':st==='tip'?'POKLAD':'';
      return '<tr class="r st-'+st+'" data-open="'+o.id+'" tabindex="0"><td>'+cells(pad(o.dep.getDate())+'.'+pad(o.dep.getMonth()+1),5)+'</td><td>'+cells(o.air,3)+'</td><td>'+cells(o.d.city.toUpperCase(),11)+'</td><td>'+cells(String(o.n),2)+'</td><td>'+cells(o.type==='flight'?'LETENKA':o.type==='combo'?'LET+HOTEL':BOARD_SHORT[o.board],9)+'</td><td>'+cells(Math.round(o.ppp).toLocaleString('cs-CZ').replace(/\s/g,' '),7)+'</td><td>'+cells(String(o.idx),2)+'</td><td>'+cells(tx,8)+'</td></tr>';}).join('');
    flapAll($('boardBody'));
  }
  $('boardTabs').addEventListener('click',function(e){var b=e.target.closest('[data-ba]');if(!b)return;boardAir=b.getAttribute('data-ba');document.querySelectorAll('[data-ba]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});renderBoard();});
  renderBoard();
  if('IntersectionObserver' in window){var seen=false;new IntersectionObserver(function(e,io){if(e[0].isIntersecting&&!seen){seen=true;renderBoard();io.disconnect();}},{rootMargin:'100px'}).observe($('tabule'));}

  // teploty
  (function(){
    var LIST=['hrg','rmf','lpa','tfs','dxb','znz','mle','mru','sid','hkt','mct','pfo','her','ayt','pmi','dje','dur','var'];
    function col(t){var k=Math.max(0,Math.min(1,(t-10)/24));return 'background:hsl('+(210-190*k).toFixed(0)+' 85% '+(93-30*k).toFixed(0)+'%);color:'+(k>.55?'#3a0b00':'#0d2a3a');}
    var mi=[11,0,1,2,3,5,6,7,8], cur=NOW.getMonth();
    var head='<thead><tr><th style="text-align:left">DESTINACE</th><th>LET</th>'+['Pro','Led','Úno','Bře','Dub','Čer','Čvc','Srp','Zář'].map(function(m,i){return '<th'+(mi[i]===cur||(cur===10&&i===0)?' style="color:var(--orange)"':'')+'>'+m.toUpperCase()+'</th>';}).join('')+'<th>OD</th></tr></thead>';
    var rows=LIST.map(function(k){return DEST[k]}).sort(function(a,b){return b.temps[0]-a.temps[0]}).map(function(d){
      var mins=MAIN.filter(function(o){return o.d.k===d.k&&o.type==='package'}).map(function(o){return o.ppp});
      return '<tr class="click" data-dest="'+d.k+'" tabindex="0"><td class="n">'+esc(d.city)+'<small>'+esc(d.ctry)+'</small></td><td class="mono">'+String(d.fly).replace('.',',')+' h</td>'+d.temps.map(function(t){return '<td class="t" style="'+col(t)+'">'+t+'°</td>';}).join('')+'<td class="mono" style="font-weight:800">'+(mins.length?kc(Math.min.apply(null,mins)):'–')+'</td></tr>';}).join('');
    $('heat').innerHTML=head+'<tbody>'+rows+'</tbody>';
    function go(k){S.dest=k;S.tag=null;S.tab='all';S.savedOnly=false;shown=10;render();toList();}
    $('heat').addEventListener('click',function(e){var r=e.target.closest('[data-dest]');if(r)go(r.getAttribute('data-dest'));});
    $('heat').addEventListener('keydown',function(e){var r=e.target.closest('[data-dest]');if(r&&e.key==='Enter')go(r.getAttribute('data-dest'));});
  })();

  // hoď mě někam
  $('rollBtn').addEventListener('click',function(){
    var max=+$('rollMax').value,a=$('rollAir').value,btn=this,or=$('rollOrange');
    var pool=MAIN.filter(function(o){return o.idx>=65&&o.type!=='hotel'&&o.ppp<=max&&(!a||o.air===a)});
    or.classList.add('spinning');btn.disabled=true;
    setTimeout(function(){or.classList.remove('spinning');btn.disabled=false;btn.textContent='Ještě jednou';
      if(!pool.length){$('rollOut').innerHTML='<p style="margin:0">S tímhle rozpočtem a letištěm teď nemám nic dost dobrého. Zkus víc peněz nebo jiné letiště.</p>';return;}
      $('rollOut').innerHTML='<div style="border-top:1px solid var(--line)">'+row(pool[Math.floor(Math.random()*pool.length)])+'</div>';},reduce?0:1300);
  });

  // spodní lišta
  document.querySelector('.tabbar').addEventListener('click',function(e){var a=e.target.closest('[data-tb]');if(!a)return;var t=a.getAttribute('data-tb');document.querySelectorAll('[data-tb]').forEach(function(x){x.classList.toggle('on',x===a)});
    if(t==='hledat'){e.preventDefault();$('q').focus();$('q').scrollIntoView({block:'center'});}
    if(t==='ulozene'){e.preventDefault();S.savedOnly=true;S.tag=null;render();toList();}});

  if(!DEMO) window.__cpRefresh=function(){window.__cpRefresh=null;setTimeout(function(){fetch('data/main.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(J){if(J.gen!==DATA.gen){if(document.hidden)location.reload();else toast('Máme nové ceny – obnov stránku');}});},5*60e3);};
  else window.__cpRefresh=function(){ITEMS.forEach(function(o){if(Math.random()<.05){o.ppp=Math.round(o.ppp*(.96+Math.random()*.06)/10)*10;o.ppn=Math.round(o.ppp/(o.n||1));o.checkedMin=1;}});renderBoard();render();toast('Výpis aktualizován');};
  setTimeout(function(){try{localStorage.setItem('cp_last',Date.now())}catch(e){}},5000);
}

function greece(){
  var ISL=[
    ['her','Kréta','Největší ostrov. Na týden si vyber jednu část: sever = pláže a resorty, západ = Chania a Elafonisi, jih = klid.','květen–říjen','2,8 h'],
    ['kgs','Kos','Placatý ostrov na kolo, mělké písečné pláže a krátké vzdálenosti. Jeden z nejlepších ostrovů s dětmi.','květen–říjen','2,7 h'],
    ['rho','Rhodos','Středověké město, Lindos a dvě tváře: klidný východ na koupání, větrný západ pro surfaře.','květen–říjen','2,8 h'],
    ['cfu','Korfu','Nejzelenější řecký ostrov s benátskou architekturou. Nejkratší let ze všech.','červen–září','2,2 h'],
    ['zth','Zakynthos','Pláž Navagio, modré jeskyně a želvy karety. Na výlety lodí nejlepší ostrov v Jónském moři.','červen–září','2,4 h']
  ];
  var all=withTag('greece');
  $('gStats').innerHTML='<b>'+bestOf(all).length+'</b> hotelů · <b>'+all.length+'</b> termínů · aktualizace za <b data-cd>--:--:--</b>';
  $('isleNav').innerHTML=ISL.map(function(i){return '<a href="#o-'+i[0]+'">'+i[1]+'</a>';}).join('');
  $('isles').innerHTML=ISL.map(function(i){
    var l=bestOf(all.filter(function(o){return o.d.k===i[0]})).sort(function(a,b){return b.idx-a.idx}).slice(0,10);
    var minp=Math.min.apply(null,l.map(function(o){return o.ppp}));
    return '<section class="isle wrap" id="o-'+i[0]+'" aria-labelledby="h-'+i[0]+'"><div class="eyebrow">Ostrov</div><div class="shelf-h" style="margin-bottom:4px"><h2 id="h-'+i[0]+'">'+i[1]+': '+l.length+' nejlepších nabídek</h2></div>'+
      '<p style="margin:0;color:var(--ink-2);max-width:70ch">'+i[2]+'</p><div class="facts2"><span>let ~'+i[4]+'</span><span>nejlépe '+i[3]+'</span><span>moře v létě ~'+DEST[i[0]].sea+' °C</span><span>od '+kc(minp)+' / os.</span></div>'+
      '<div class="list">'+l.map(row).join('')+'</div></section>';
  }).join('');
}
}
fetch('data/main.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json();})
  .then(function(J){DEMO=false;fromData(J);start();})
  .catch(function(){DEMO=true;demoData();start();});
})();
