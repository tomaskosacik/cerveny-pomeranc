// Souhlas s cookies + Meta pixel. Pixel se načte jen po souhlasu.
(function(){
  var PIXEL_ID=''; // ← sem patří ID pixelu z Ads Manageru (jen čísla)
  var K='cp_consent', st=null;
  try{st=localStorage.getItem(K)}catch(e){}
  function loadTP(){var s=document.createElement('script');s.async=1;s.setAttribute('data-cfasync','false');s.src='https://emrldtp.cc/NjAzNDMw.js?t=603430';document.head.appendChild(s);}
  function loadFB(){
    if(!PIXEL_ID||window.fbq)return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',PIXEL_ID);fbq('track','PageView');
  }
  function on(){loadFB();loadTP();}
  // měření událostí – volá web (proklik k partnerovi, přidání na plochu, upozornění)
  window.cpTrack=function(ev,data){try{if(window.fbq){if(ev==='Lead'||ev==='Subscribe')fbq('track',ev,data||{});else fbq('trackCustom',ev,data||{});}}catch(e){}};
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[rel~="sponsored"]');if(a)window.cpTrack('Lead',{content_name:a.getAttribute('data-name')||'', content_category:a.getAttribute('data-kind')||''});},true);
  function save(v){try{localStorage.setItem(K,v)}catch(e){}}
  function banner(){
    if(document.getElementById('ckb'))return;
    var d=document.createElement('div');d.id='ckb';d.setAttribute('role','dialog');d.setAttribute('aria-label','Cookies');
    d.innerHTML='<p>Používáme cookies, abychom věděli, které reklamy fungují, a mohli ti ukazovat relevantní nabídky. Bez nich web funguje stejně. <a href="/ochrana-udaju.html">Víc info</a></p><div><button type="button" data-c="no">Odmítnout</button><button type="button" data-c="yes">Přijmout</button></div>';
    var css=document.createElement('style');css.textContent='#ckb{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;max-width:560px;margin:0 auto;background:#141312;color:#f3efe4;border-radius:16px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}#ckb p{flex:1 1 260px;margin:0}#ckb a{color:#ffb37a}#ckb div{display:flex;gap:8px}#ckb button{border:1px solid #f3efe4;background:transparent;color:#f3efe4;border-radius:999px;padding:9px 16px;font-weight:700;font-size:14px;cursor:pointer}#ckb button[data-c=yes]{background:#f3efe4;color:#141312}body[data-page=home] #ckb{bottom:calc(76px + env(safe-area-inset-bottom))}@media(min-width:900px){body[data-page=home] #ckb{bottom:16px}}';
    document.head.appendChild(css);document.body.appendChild(d);
    d.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;var y=b.getAttribute('data-c')==='yes';save(y?'yes':'no');d.remove();if(y)on();});
  }
  window.cpCookies=function(){try{localStorage.removeItem(K)}catch(e){}banner();};
  if(st==='yes')on(); else if(st!=='no'){ if(document.body)banner(); else document.addEventListener('DOMContentLoaded',banner); }
})();
