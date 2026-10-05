/* M.A.S.H. Unit — Demo system
   Self-contained. Does not touch real game state, career, or host data.
   Entry point: window.MASHDemo.open() or the #demoOpen button. */
(()=>{'use strict';
const $=id=>document.getElementById(id);

/* --- STYLES --- */
const css=`
#demoOverlay{position:fixed;inset:0;background:#0e1c17;z-index:12000;display:flex;flex-direction:column;padding:8px;color:#f0f6ef;font:16px system-ui,Arial,sans-serif}
#demoOverlay.hidden{display:none}
#demoTop{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 8px}
#demoTitle{font-size:14px;font-weight:900;letter-spacing:3px;color:#d4af37}
#demoStep{font-size:12px;color:#c5d3cb}
#demoClose{background:rgba(0,0,0,0.85);color:#fff;border:2px solid #fff;border-radius:50%;width:40px;height:40px;font-size:20px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
#demoActive{flex:8;display:flex;flex-direction:column;min-height:0;border:3px solid #b8e96b;border-radius:12px;overflow:hidden;background:#0b1813;box-shadow:0 0 24px rgba(184,233,107,0.35);margin-bottom:8px}
#demoPassive{flex:2;display:flex;flex-direction:column;min-height:0;border:2px solid #354d40;border-radius:10px;overflow:hidden;background:#0b1813;opacity:0.75}
#demoActive.role-B{border-color:#c0392b;box-shadow:0 0 24px rgba(192,57,43,0.35)}
.demoPhoneHead{display:flex;align-items:center;justify-content:space-between;padding:4px 10px;font-size:11px;font-weight:800;letter-spacing:2px;background:#10201a;color:#c5d3cb}
.demoPhoneHead .who{color:#b8e96b;font-size:12px}
#demoActive.role-B .demoPhoneHead .who{color:#ff8b6f}
.demoPhoneHead .tag{font-size:10px;font-weight:900;color:#d4af37}
.demoScreen{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
.demoScreen.center{align-items:center;justify-content:center;text-align:center}
.demoHint{padding:8px 10px;background:#30443a;border-radius:9px;font-size:13px;font-weight:700;color:#f5dc87;text-align:center;margin-top:6px}
.demoHint.warn{background:#7a1f1f;color:#ffd0cc}
.demoPulse{animation:demoPulse 1.1s infinite;outline:3px solid #ffe176;outline-offset:3px;border-radius:10px}
@keyframes demoPulse{0%,100%{opacity:1}50%{opacity:0.55}}
.demoShake{animation:demoShake 0.4s}
@keyframes demoShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
.demoBadge{display:inline-block;background:#d4af37;color:#142219;font-size:10px;font-weight:900;letter-spacing:2px;padding:2px 8px;border-radius:6px}
.demoCam{background:#1e2a24;border-radius:8px;min-height:120px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#7fa08d;border:2px dashed #354d40;margin:6px 0}
.demoMapWrap{position:relative;flex:1;min-height:200px;border-radius:10px;overflow:hidden;background:#000}
.demoMapWrap img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.9}
.demoMapSvg{position:absolute;inset:0;width:100%;height:100%}
.demoMapLabel{position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;padding:3px 6px;border-radius:6px}
#demoEnd{position:absolute;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;z-index:10}
#demoEnd.hidden{display:none}
#demoEnd h2{margin:0;color:#d4af37;font-size:20px;letter-spacing:2px;text-align:center}
#demoEnd .btnrow{display:flex;flex-direction:column;gap:8px;width:min(280px,80vw)}
#demoEnd button{width:100%}
.demoChoice{display:flex;flex-direction:column;gap:10px;padding:20px;flex:1;justify-content:center}
.demoChoice button{min-height:70px;font-size:16px;font-weight:900;letter-spacing:1px;text-align:center;border-radius:12px;padding:14px}
.demoChoice button small{display:block;font-size:11px;font-weight:600;opacity:0.75;margin-top:4px;letter-spacing:0}
.demoKicker{font-size:12px;color:#c5d3cb;letter-spacing:2px;text-align:center;margin:0}
.demoWinTxt{font-size:22px;font-weight:900;color:#d4af37;letter-spacing:2px;margin:6px 0;text-align:center}
.demoWinSub{font-size:13px;color:#c5d3cb;text-align:center}
`;

/* --- DOM --- */
function injectDom(){
 if($('demoOverlay'))return;
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const o=document.createElement('div');o.id='demoOverlay';o.className='hidden';
 o.innerHTML=`
  <div id="demoTop">
   <div><span id="demoTitle">DEMO</span> <span class="demoBadge">DEMO ONLY</span></div>
   <div><span id="demoStep">1 / 8</span> <button id="demoClose">✕</button></div>
  </div>
  <div id="demoActive" class="role-A"></div>
  <div id="demoPassive"></div>
  <div id="demoEnd" class="hidden"></div>
 `;
 document.body.appendChild(o);
 $('demoClose').onclick=close;
}

/* --- STATE --- */
const KEY='mash-unit-demo';
let state=null; // {mode, step}
let demos={};

/* --- SCREEN RENDERERS --- */
function head(who,tag,role){return `<div class="demoPhoneHead"><span class="who">${who}</span><span class="tag">${tag||''}</span></div>`}

function screenReady(opts){
 const lives=opts?.lives||['LIVE','LIVE','LIVE','LIVE','LIVE'];
 const bar=lives.map(s=>`<span class="${s}"></span>`).join('');
 const team=opts?.team||'A';
 const name=opts?.name||'Duke';
 const badge=opts?.badge||`${name} : NZ1`;
 return `
  <div class="bar">${bar}</div>
  <div class="actions">
   <button id="demoHitBtn" class="demoPulse" style="font-size:20px;min-height:62px;background:#b8e96b;color:#142219;font-weight:900">I'M HIT</button>
   <div class="qrScanBtn" style="background:transparent;border-radius:10px;line-height:0"><img src="./qrscanbu.jpg" alt="" style="display:block;width:100%;pointer-events:none;border-radius:10px"></div>
  </div>
  <p class="teamBadge ${team==='B'?'teamB':''}" style="align-self:center;background:${team==='B'?'#1c5daa':'#a7222c'}">${badge}</p>
  <div class="readyPanel" style="flex:1;min-height:80px;background:${team==='B'?'#1855a5':'#af222e'};border-radius:12px;display:flex;align-items:center;justify-content:center">
   <img src="./war-adventures-logo.png" alt="" style="max-width:70%;max-height:110px;object-fit:contain">
  </div>`;
}

function screenOffer(opts){
 const n=opts?.n||1,secs=opts?.secs||298,name=opts?.name||'Duke';
 const mins=Math.floor(secs/60),s=secs%60;
 return `
  <h2 style="margin:0;text-align:center">LIFE ${n} OFFERED</h2>
  <p class="timer" style="text-align:center;font-size:23px;font-weight:bold;color:#ffe176;margin:4px 0">${mins}:${String(s).padStart(2,'0')} remaining</p>
  <div id="demoOfferQR" class="qr offerqr demoPulse" style="background:#fff;padding:10px;border-radius:6px;margin:4px auto;display:flex;align-items:center;justify-content:center;width:min(180px,50vw);height:min(180px,50vw)">
   <svg viewBox="0 0 29 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="29" height="29" fill="#fff"/>
    <rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/>
    <rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/>
    <rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/>
    <g fill="#000"><rect x="9" y="2" width="1" height="1"/><rect x="11" y="0" width="2" height="2"/><rect x="14" y="1" width="1" height="2"/><rect x="10" y="4" width="2" height="1"/><rect x="13" y="4" width="1" height="2"/><rect x="16" y="2" width="2" height="1"/><rect x="18" y="4" width="1" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="12" y="7" width="2" height="1"/><rect x="15" y="8" width="1" height="1"/><rect x="17" y="6" width="2" height="2"/><rect x="2" y="9" width="1" height="2"/><rect x="4" y="10" width="2" height="1"/><rect x="0" y="12" width="2" height="1"/><rect x="3" y="12" width="1" height="2"/><rect x="5" y="9" width="1" height="1"/><rect x="6" y="11" width="1" height="2"/><rect x="2" y="15" width="1" height="1"/><rect x="4" y="14" width="2" height="2"/><rect x="0" y="18" width="1" height="2"/><rect x="3" y="19" width="2" height="1"/><rect x="6" y="17" width="1" height="2"/><rect x="9" y="9" width="2" height="2"/><rect x="12" y="10" width="1" height="3"/><rect x="14" y="9" width="2" height="1"/><rect x="17" y="10" width="2" height="2"/><rect x="10" y="13" width="2" height="2"/><rect x="13" y="14" width="1" height="2"/><rect x="15" y="12" width="2" height="3"/><rect x="18" y="14" width="1" height="2"/><rect x="9" y="17" width="1" height="3"/><rect x="11" y="18" width="2" height="2"/><rect x="14" y="19" width="1" height="2"/><rect x="16" y="17" width="2" height="1"/><rect x="19" y="18" width="1" height="2"/><rect x="22" y="9" width="2" height="1"/><rect x="25" y="10" width="2" height="2"/><rect x="23" y="13" width="1" height="2"/><rect x="26" y="12" width="1" height="2"/><rect x="22" y="16" width="2" height="2"/><rect x="25" y="17" width="1" height="1"/><rect x="24" y="20" width="2" height="1"/><rect x="20" y="22" width="1" height="2"/><rect x="22" y="24" width="2" height="1"/><rect x="25" y="22" width="1" height="2"/><rect x="23" y="26" width="2" height="1"/><rect x="10" y="23" width="2" height="1"/><rect x="13" y="22" width="1" height="3"/><rect x="11" y="26" width="2" height="1"/><rect x="14" y="25" width="2" height="2"/><rect x="17" y="24" width="1" height="2"/><rect x="19" y="26" width="1" height="1"/><rect x="17" y="20" width="1" height="1"/><rect x="15" y="22" width="1" height="1"/></g>
   </svg>
  </div>
  <p class="compact" style="text-align:center;color:#c5d3cb;font-size:13px">Show your dog tags. Bleedout timer is running.</p>
  <button class="tagButton" style="display:block;width:100%;aspect-ratio:850/510;background:url('./dogtag-button.png') center/contain no-repeat;border:0;padding:0;margin:6px 0;position:relative">
   <span style="position:absolute;right:7%;top:36%;transform:translateY(-50%);color:#1a1a1a;font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:clamp(14px,4.5vw,24px);text-transform:uppercase;letter-spacing:1px">${name.toUpperCase()}'S</span>
  </button>`;
}

function screenScanner(label){
 return `
  <h2 style="margin:0;text-align:center;color:#ffe176;font-size:16px">${label}</h2>
  <div class="demoCam" id="demoScanBtn" class="demoPulse">📷 Camera preview<br><span style="font-size:10px;opacity:0.6">Tap to simulate a scan</span></div>
  <button class="alt" style="width:100%">Close camera</button>`;
}

function screenReturn(type,name){
 const label=type==='T'?'TAGS TAKEN':'HEALED';
 return `
  <h2 style="margin:0;text-align:center">${label}</h2>
  <div id="demoReturnQR" class="qr offerqr demoPulse" style="background:#fff;padding:10px;border-radius:6px;margin:4px auto;display:flex;align-items:center;justify-content:center;width:min(180px,50vw);height:min(180px,50vw)">
   <svg viewBox="0 0 29 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="29" height="29" fill="#fff"/>
    <rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/>
    <rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/>
    <rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/>
    <g fill="#000"><rect x="10" y="3" width="2" height="2"/><rect x="14" y="1" width="1" height="3"/><rect x="17" y="4" width="2" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="2"/><rect x="19" y="6" width="1" height="1"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="0" y="14" width="2" height="2"/><rect x="4" y="15" width="2" height="1"/><rect x="6" y="13" width="1" height="1"/><rect x="9" y="10" width="2" height="2"/><rect x="12" y="11" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="18" y="12" width="2" height="2"/><rect x="10" y="14" width="1" height="2"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="14" width="2" height="1"/><rect x="19" y="16" width="1" height="2"/><rect x="9" y="18" width="2" height="1"/><rect x="12" y="19" width="1" height="2"/><rect x="15" y="17" width="2" height="2"/><rect x="18" y="20" width="1" height="1"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="23" y="14" width="1" height="1"/><rect x="26" y="14" width="1" height="2"/><rect x="22" y="17" width="2" height="1"/><rect x="25" y="19" width="1" height="2"/><rect x="24" y="22" width="1" height="1"/><rect x="20" y="23" width="1" height="2"/><rect x="22" y="25" width="2" height="1"/><rect x="25" y="24" width="1" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="12" y="26" width="1" height="1"/><rect x="15" y="25" width="2" height="1"/><rect x="18" y="24" width="1" height="1"/><rect x="19" y="27" width="1" height="0"/></g>
   </svg>
  </div>
  <p class="compact" style="text-align:center;color:#c5d3cb;font-size:13px">Show this to ${name}.</p>`;
}

function screenRed(){
 return `
  <div class="bar"><span class="LOST"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
  <h2 style="color:#ff5963;font-size:clamp(24px,7vw,40px);text-align:center;margin:8px 0">RESPAWN AT BASE</h2>
  <p style="text-align:center;font-size:13px;color:#c5d3cb">Scan your assigned base. Spent finite lives stay red.</p>
  <button id="demoContinueBtn" class="demoPulse" style="margin-top:8px">CONTINUE</button>`;
}

function screenBaseScanner(){
 return `
  <h2 style="margin:0;text-align:center;color:#ffe176;font-size:16px">SCAN BASE</h2>
  <div class="demoCam" id="demoScanBaseBtn" class="demoPulse">📷 Camera preview<br><span style="font-size:10px;opacity:0.6">Tap to simulate a base scan</span></div>
  <button class="alt" style="width:100%">Close camera</button>`;
}

function screenElim(){
 return `
  <div class="bar"><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span></div>
  <h2 style="color:#ffb5bd;font-size:clamp(24px,7vw,40px);text-align:center;margin:8px 0">ELIMINATED</h2>
  <p style="text-align:center;font-size:13px;color:#c5d3cb">Leave play safely.</p>`;
}

function screenIdle(name){
 return `<div class="demoScreen center"><p style="color:#c5d3cb;font-size:13px;text-align:center">${name} · waiting…</p></div>`;
}

function screenOfferWithBar(name,barState){
 const lives=['LIVE','LIVE','LIVE','LIVE','LIVE'].map((s,i)=>i===0?barState:s);
 const bar=lives.map(s=>`<span class="${s}"></span>`).join('');
 const barSeg = barState==='OFFERED' ? bar.replace('<span class="OFFERED"></span>','<span class="OFFERED tappable" id="demoYellowBar" style="cursor:pointer;position:relative"><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:900;color:#142219">+</span></span>') : bar;
 return `
  <div class="bar">${barSeg}</div>
  <h2 style="margin:0;text-align:center">LIFE 1 OFFERED</h2>
  <p class="timer" style="text-align:center">4:56 remaining</p>
  <div class="qr offerqr" style="background:#fff;padding:10px;border-radius:6px;margin:4px auto;display:flex;align-items:center;justify-content:center;width:min(180px,50vw);height:min(180px,50vw)">
   <svg viewBox="0 0 29 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="3" width="2" height="2"/><rect x="14" y="1" width="1" height="3"/><rect x="17" y="4" width="2" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="2"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="9" y="10" width="2" height="2"/><rect x="12" y="11" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="18" y="12" width="2" height="2"/><rect x="10" y="14" width="1" height="2"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="14" width="2" height="1"/><rect x="9" y="18" width="2" height="1"/><rect x="15" y="17" width="2" height="2"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="23" y="14" width="1" height="1"/><rect x="22" y="17" width="2" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="15" y="25" width="2" height="1"/></g></svg>
  </div>
  <p class="compact" style="text-align:center;color:#c5d3cb;font-size:13px">Bleedout timer is running.</p>`;
}

function screenThanks(name){
 return `
  <h2 style="margin:0;text-align:center">THANKS</h2>
  <div id="demoThanksQR" class="qr offerqr demoPulse" style="background:#fff;padding:10px;border-radius:6px;margin:4px auto;display:flex;align-items:center;justify-content:center;width:min(180px,50vw);height:min(180px,50vw)">
   <svg viewBox="0 0 29 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="2" width="2" height="2"/><rect x="14" y="3" width="1" height="2"/><rect x="17" y="2" width="2" height="1"/><rect x="9" y="6" width="1" height="2"/><rect x="13" y="6" width="2" height="1"/><rect x="10" y="9" width="2" height="2"/><rect x="14" y="10" width="1" height="1"/><rect x="17" y="9" width="2" height="1"/><rect x="9" y="13" width="2" height="1"/><rect x="13" y="14" width="1" height="2"/><rect x="16" y="13" width="2" height="2"/><rect x="10" y="17" width="1" height="2"/><rect x="13" y="18" width="2" height="1"/><rect x="17" y="17" width="1" height="2"/><rect x="9" y="20" width="2" height="1"/><rect x="13" y="22" width="1" height="2"/><rect x="16" y="21" width="2" height="1"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="1"/><rect x="23" y="14" width="1" height="1"/><rect x="22" y="17" width="2" height="2"/><rect x="25" y="19" width="1" height="1"/><rect x="24" y="22" width="1" height="1"/><rect x="20" y="23" width="1" height="1"/></g></svg>
  </div>
  <p class="compact" style="text-align:center;color:#c5d3cb;font-size:13px">Show this to the Medic.</p>`;
}

function screenMedicConfirm(){
 return `
  <h2 style="margin:0;text-align:center;color:#b8e96b">HEALED DUKE</h2>
  <p style="text-align:center;color:#c5d3cb;font-size:13px">Thank-you received. Assist recorded.</p>
  <button id="demoContinueBtn" class="demoPulse" style="margin-top:8px">CONTINUE</button>`;
}

function screenOutlastMap(opts){
 const radius=opts.radius||'90';
 const nextRadius=opts.nextRadius||'0';
 const showDot=opts.showDot!==false;
 const dotPos=opts.dotPos||'48% 62%';
 const showTap=!!opts.showTap;
 return `
  <div class="demoMapWrap">
   <img src="./map1.jpeg" alt="Field map">
   <svg class="demoMapSvg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <circle cx="50" cy="45" r="${radius}" fill="rgba(200,40,40,0.10)" stroke="#c0392b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    ${nextRadius>0?`<circle cx="50" cy="45" r="${nextRadius}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`:''}
   </svg>
   ${showDot?`<div style="position:absolute;left:${dotPos.split(' ')[0]};top:${dotPos.split(' ')[1]};transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#0080ff;border:3px solid #fff;box-shadow:0 0 10px rgba(0,128,255,0.9)"></div>`:''}
   <div class="demoMapLabel">${opts.label||'OUTLAST'}</div>
  </div>
  ${showTap?`<button id="demoLeaveBtn" class="demoPulse" style="margin-top:6px;background:#e75961;color:#fff;font-weight:900">TAP TO LEAVE THE CIRCLE</button>`:''}`;
}

function screenOutlastBuzzing(){
 return `
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#3a0f14;border-radius:10px;padding:12px">
   <h2 style="color:#ff5963;font-size:clamp(20px,6vw,32px);margin:4px 0">OUT OF BOUNDS</h2>
   <p style="font-size:40px;font-weight:900;color:#ffdc63;margin:8px 0" id="demoCount">8</p>
   <p style="font-size:13px;color:#ffd0cc;text-align:center">Return to the circle.</p>
  </div>`;
}

function screenOutlastWinnerQR(){
 return `
  <h2 style="margin:0;text-align:center;color:#d4af37">WINNER QR</h2>
  <p style="text-align:center;color:#fff;font-size:13px">Last player scans this.</p>
  <div id="demoWinnerQR" class="qr demoPulse" style="background:#fff;padding:10px;border-radius:6px;margin:6px auto;display:flex;align-items:center;justify-content:center;width:min(190px,52vw);height:min(190px,52vw)">
   <svg viewBox="0 0 29 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="3" width="2" height="1"/><rect x="13" y="2" width="1" height="3"/><rect x="16" y="4" width="2" height="2"/><rect x="10" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="1"/><rect x="19" y="6" width="1" height="1"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="9" y="10" width="2" height="2"/><rect x="13" y="11" width="1" height="2"/><rect x="16" y="10" width="2" height="1"/><rect x="19" y="12" width="1" height="2"/><rect x="10" y="14" width="2" height="1"/><rect x="13" y="15" width="1" height="2"/><rect x="16" y="14" width="2" height="2"/><rect x="10" y="18" width="1" height="2"/><rect x="13" y="19" width="2" height="1"/><rect x="16" y="17" width="1" height="2"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="22" y="16" width="2" height="1"/><rect x="25" y="18" width="1" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="17" y="24" width="1" height="1"/><rect x="20" y="26" width="1" height="1"/></g></svg>
  </div>`;
}

function screenWinnerCelebration(){
 return `
  <div class="demoScreen center">
   <div style="font-size:60px;line-height:1">🥇</div>
   <div class="demoWinTxt">YOU HAVE OUTLASTED THEM ALL</div>
   <div class="demoWinSub">A 🎯 has been added to your career.</div>
  </div>`;
}

/* --- DEMO DEFINITIONS --- */
function buildDemos(){
 demos={
  standard:{
   title:'Standard Game',
   players:{A:'Duke',B:'Reaper'},
   steps:[
    {active:'A',A:()=>screenReady({name:'Duke',team:'A'}),B:()=>screenIdle('Reaper'),target:'demoHitBtn',hint:"Duke has just been hit. Tap I'M HIT.",wrong:"Wrong button. Tap I'M HIT."},
    {active:'A',A:()=>screenOffer({name:'Duke'}),B:()=>screenIdle('Reaper'),target:'demoOfferQR',hint:"Show your tags. When Reaper has scanned, tap the QR.",wrong:"That button isn't live yet. Tap the QR."},
    {active:'B',A:()=>screenOffer({name:'Duke'}),B:()=>screenScanner('SCAN TAGS TAKEN'),target:'demoScanBtn',hint:"Now Reaper's turn. Tap SCAN.",wrong:"Wrong screen. Reaper taps SCAN."},
    {active:'B',A:()=>screenOffer({name:'Duke'}),B:()=>screenReturn('T','Duke'),target:'demoReturnQR',hint:"Show TAGS TAKEN to Duke. Tap the QR when they've scanned.",wrong:"Tap the QR to continue."},
    {active:'A',A:()=>screenScanner('SCAN TAGS TAKEN'),B:()=>screenReturn('T','Duke'),target:'demoScanBtn',hint:"Duke scans Reaper's TAGS TAKEN QR. Tap SCAN.",wrong:"Tap the camera preview to scan."},
    {active:'A',A:()=>screenRed(),B:()=>screenIdle('Reaper'),target:'demoContinueBtn',hint:"Life is now spent. Tap CONTINUE.",wrong:"Tap CONTINUE to walk to base."},
    {active:'A',A:()=>screenBaseScanner(),B:()=>screenIdle('Reaper'),target:'demoScanBaseBtn',hint:"At the base. Tap the camera to scan the BASE QR.",wrong:"Tap the camera preview."},
    {active:'A',A:()=>screenReady({name:'Duke',team:'A'}),B:()=>screenIdle('Reaper'),target:'finish',hint:"Back in play. All done.",wrong:"Tap FINISH to end the demo.",autoFinish:true}
   ]
  },
  medic:{
   title:'Medic Game',
   players:{A:'Duke',B:'Medic'},
   steps:[
    {active:'A',A:()=>screenReady({name:'Duke',team:'A'}),B:()=>screenIdle('Medic'),target:'demoHitBtn',hint:"Duke has been hit. Tap I'M HIT.",wrong:"Tap I'M HIT."},
    {active:'A',A:()=>screenOffer({name:'Duke'}),B:()=>screenIdle('Medic'),target:'demoOfferQR',hint:"Show your tags. Tap the QR when the Medic has scanned.",wrong:"Tap the QR."},
    {active:'B',A:()=>screenOffer({name:'Duke'}),B:()=>screenScanner('SCAN OFFER'),target:'demoScanBtn',hint:"Medic scans Duke's offer. Tap SCAN.",wrong:"Tap SCAN."},
    {active:'B',A:()=>screenOffer({name:'Duke'}),B:()=>screenReturn('H','Duke'),target:'demoReturnQR',hint:"Show HEALED to Duke. Tap when ready.",wrong:"Tap the QR."},
    {active:'A',A:()=>screenOfferWithBar('Duke','OFFERED'),B:()=>screenReturn('H','Duke'),target:'demoYellowBar',hint:"Medic has arrived. Tap the yellow life bar.",wrong:"Tap the yellow segment of the life bar."},
    {active:'A',A:()=>screenScanner('SCAN HEALED'),B:()=>screenReturn('H','Duke'),target:'demoScanBtn',hint:"Scan the HEALED QR. Tap SCAN.",wrong:"Tap the camera preview."},
    {active:'A',A:()=>screenThanks('Medic'),B:()=>screenIdle('Medic'),target:'demoThanksQR',hint:"Show THANKS to the Medic. Tap the QR when scanned.",wrong:"Tap the QR."},
    {active:'B',A:()=>screenThanks('Medic'),B:()=>screenScanner('SCAN THANKS'),target:'demoScanBtn',hint:"Medic scans THANKS. Tap SCAN.",wrong:"Tap SCAN."},
    {active:'B',A:()=>screenIdle('Duke'),B:()=>screenMedicConfirm(),target:'demoContinueBtn',hint:"Medic credit recorded. Tap CONTINUE.",wrong:"Tap CONTINUE."},
    {active:'A',A:()=>screenReady({name:'Duke',team:'A'}),B:()=>screenIdle('Medic'),target:'finish',hint:"Duke is back in play. All done.",wrong:"Tap FINISH to end.",autoFinish:true}
   ]
  },
  outlast:{
   title:'OUTLAST',
   players:{A:'Duke',B:'Runner'},
   presentational:true,
   steps:[
    {active:'A',A:()=>screenOutlastMap({radius:'44',nextRadius:'0',showDot:true,dotPos:'50% 45%',label:'Boundary starts wide'}),B:()=>screenIdle('Runner'),hint:"Boundary starts wide. Everyone inside. Tap NEXT.",next:true},
    {active:'A',A:()=>screenOutlastMap({radius:'32',nextRadius:'22',showDot:true,dotPos:'48% 62%',label:'First shrink'}),B:()=>screenIdle('Runner'),hint:"First shrink. Circle tightening. Tap NEXT.",next:true},
    {active:'A',A:()=>screenOutlastMap({radius:'22',nextRadius:'12',showDot:true,dotPos:'48% 62%',label:'Second shrink'}),B:()=>screenIdle('Runner'),hint:"Second shrink. Runner is now outside. Tap NEXT.",next:true},
    {active:'B',A:()=>screenOutlastMap({radius:'22',nextRadius:'12',showDot:false,label:'Runner is outside'}),B:()=>screenOutlastMap({radius:'22',nextRadius:'12',showDot:true,dotPos:'30% 75%',label:'Tap to leave the circle',showTap:true}),target:'demoLeaveBtn',hint:"Runner is outside. Tap to leave the circle.",wrong:"Tap the button below the map."},
    {active:'B',A:()=>screenOutlastMap({radius:'22',nextRadius:'12',showDot:false,label:'Waiting'}),B:()=>screenOutlastBuzzing(),autoBuzz:true,autoCount:8,hint:"Buzz. Countdown begins. 10 seconds to return.",watch:true,duration:4000},
    {active:'B',A:()=>screenOutlastMap({radius:'22',nextRadius:'12',showDot:false,label:'Eliminated'}),B:()=>screenElim(),target:'finish',hint:"Runner eliminated. Tap CONTINUE.",next:true},
    {active:'A',A:()=>screenOutlastWinnerQR(),B:()=>screenIdle('Runner'),target:'demoWinnerQR',hint:"Host shows WINNER QR. Last player standing scans it. Tap the QR.",wrong:"Tap the winner QR."},
    {active:'A',A:()=>screenWinnerCelebration(),B:()=>screenIdle('Runner'),target:'finish',hint:"🎯 added to career. Demo complete.",autoFinish:true}
   ]
  }
 };
}

/* --- RENDER --- */
function render(){
 if(!state)return;
 const d=demos[state.mode];if(!d)return;
 const step=d.steps[state.step];if(!step)return;
 const a=state.mode==='outlast'?step.active:step.active;
 const activeRole=a;
 const $active=$('demoActive'),$passive=$('demoPassive');
 const activeWho=d.players[activeRole];
 const passiveRole=activeRole==='A'?'B':'A';
 const passiveWho=d.players[passiveRole];
 const activeTag=state.mode==='outlast'?(activeRole==='A'?'Host':'Runner'):(activeRole==='A'?'Player':'Opponent');
 const passiveTag=state.mode==='outlast'?(passiveRole==='A'?'Host':'Runner'):(passiveRole==='A'?'Player':'Opponent');
 const activeContent=activeRole==='A'?step.A():step.B();
 const passiveContent=passiveRole==='A'?step.A():step.B();
 $active.className='demoPanel active'+(activeRole==='B'?' role-B':'');
 $passive.className='demoPanel';
 $active.innerHTML=head(activeWho,activeTag,activeRole)+`<div class="demoScreen">${activeContent}</div>`;
 // Passive renders as a stripped-down screen
 $passive.innerHTML=head(passiveWho,passiveTag,passiveRole)+`<div class="demoScreen" style="font-size:11px;opacity:0.85">${passiveContent}</div>`;
 const idx=$('demoStep');if(idx)idx.textContent=(state.step+1)+' / '+d.steps.length;
 const hint=$('demoHint')||(()=>{const el=document.createElement('div');el.id='demoHint';el.className='demoHint';$('demoOverlay').insertBefore(el,$('demoEnd'));return el})();
 hint.textContent=step.hint||'';
 hint.className='demoHint';
 // Wire targets
 setTimeout(wireStep,0);
 // Persist
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
 // Auto buzz/count
 if(step.autoBuzz)autoBuzz(step);
 if(step.watch)autoWatch(step);
}

function wireStep(){
 if(!state)return;
 const d=demos[state.mode];const step=d.steps[state.step];
 if(step.autoFinish){
  const btn=document.createElement('button');
  btn.textContent='FINISH';
  btn.className='demoPulse';
  btn.style.marginTop='8px';
  btn.onclick=endScreen;
  const scr=$('demoActive').querySelector('.demoScreen');
  if(scr)scr.appendChild(btn);
  return;
 }
 if(step.next){
  const btn=document.createElement('button');
  btn.textContent=(state.step+1===d.steps.length)?'FINISH':'NEXT';
  btn.className='demoPulse';
  btn.style.marginTop='8px';
  btn.onclick=()=>{state.step++;render()};
  const scr=$('demoActive').querySelector('.demoScreen');
  if(scr)scr.appendChild(btn);
  return;
 }
 if(!step.target)return;
 const el=$('demoActive').querySelector('#'+step.target);
 if(!el)return;
 el.onclick=onCorrectTap;
 // Wire all non-target buttons for wrong-tap feedback
 const activeScreen=$('demoActive').querySelector('.demoScreen');
 activeScreen.querySelectorAll('button,.qrScanBtn,.tagButton,.bar span,.demoCam').forEach(node=>{
  if(node===el)return;
  if(node.id===step.target)return;
  node.style.cursor='pointer';
  node.onclick=ev=>{ev.stopPropagation();onWrongTap(node)};
 });
}
function onCorrectTap(){
 if(!state)return;
 const d=demos[state.mode];const step=d.steps[state.step];
 const el=$('demoActive').querySelector('#'+step.target);
 if(el){el.classList.remove('demoPulse');el.classList.add('demoShake');setTimeout(()=>el.classList.remove('demoShake'),450)}
 buzz(30);
 state.step++;render();
}
function onWrongTap(node){
 node.classList.add('demoShake');
 setTimeout(()=>node.classList.remove('demoShake'),450);
 buzz(15);
 const hint=$('demoHint');
 if(!hint)return;
 const d=demos[state.mode];const step=d.steps[state.step];
 hint.textContent=step.wrong||'Not that one.';
 hint.className='demoHint warn';
 setTimeout(()=>{if(state&&demos[state.mode]&&demos[state.mode].steps[state.step]===step){hint.textContent=step.hint;hint.className='demoHint'}},1600);
}
function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms||80)}catch(e){}}
function autoBuzz(step){
 let count=step.autoCount||10;
 const el=$('demoCount');
 if(!el)return;
 const iv=setInterval(()=>{
  if(!state)return clearInterval(iv);
  count--;
  const node=$('demoCount');
  if(node)node.textContent=count;
  buzz(40);
  if(count<=0){clearInterval(iv);state.step++;render()}
 },600);
}
function autoWatch(step){
 const iv=setInterval(()=>{
  if(!state)return clearInterval(iv);
  clearInterval(iv);
  state.step++;render();
 },step.duration||4000);
}

/* --- CHOOSER / END --- */
function showChooser(){
 const end=$('demoEnd');end.classList.add('hidden');
 const act=$('demoActive'),pass=$('demoPassive');
 act.innerHTML='';pass.innerHTML='';
 const hint=$('demoHint');if(hint)hint.remove();
 const head=$('demoTop');if(head)head.style.display='flex';
 const t=$('demoTitle');if(t)t.textContent='DEMO · CHOOSE';
 const s=$('demoStep');if(s)s.textContent='';
 const wrap=document.createElement('div');
 wrap.className='demoChoice';
 wrap.innerHTML=`
  <p class="demoKicker">What would you like to try?</p>
  <button data-mode="standard">STANDARD GAME<small>5 lives · 300s bleedout · no medic</small></button>
  <button data-mode="medic" class="alt">MEDIC GAME<small>5 lives · 300s bleedout · one-scan medic</small></button>
  <button data-mode="outlast" class="alt">OUTLAST<small>1 life · shrinking boundary · no respawn</small></button>
 `;
 act.appendChild(wrap);
 wrap.querySelectorAll('button[data-mode]').forEach(b=>{
  b.onclick=()=>{startDemo(b.getAttribute('data-mode'))};
 });
}
function startDemo(mode){
 state={mode,step:0};
 render();
}
function endScreen(){
 const end=$('demoEnd');
 end.classList.remove('hidden');
 end.innerHTML=`
  <h2>DEMO COMPLETE</h2>
  <p style="text-align:center;color:#c5d3cb;font-size:13px;margin:0">Nothing was saved to your real career.</p>
  <div class="btnrow">
   <button id="demoReplay">REPLAY THIS DEMO</button>
   <button id="demoOther" class="alt">TRY ANOTHER DEMO</button>
   <button id="demoBack" class="alt">BACK TO SETUP</button>
  </div>
 `;
 $('demoReplay').onclick=()=>{state.step=0;$('demoEnd').classList.add('hidden');render()};
 $('demoOther').onclick=showChooser;
 $('demoBack').onclick=close;
}

/* --- OPEN / CLOSE --- */
function open(){
 injectDom();
 // Resume if saved
 try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(s&&demos[s.mode]&&typeof s.step==='number'&&demos[s.mode].steps[s.step]){state=s;$('demoOverlay').classList.remove('hidden');render();return}}}catch(e){}
 state=null;
 $('demoOverlay').classList.remove('hidden');
 showChooser();
}
function close(){
 $('demoOverlay').classList.add('hidden');
 state=null;
 try{localStorage.removeItem(KEY)}catch(e){}
 const scr=document.querySelector('main');if(scr)scr.scrollTop=0;
}

/* --- INIT --- */
function init(){
 injectDom();
 buildDemos();
 const btn=$('demoOpen');
 if(btn)btn.onclick=open;
 // Also look for a generic demo trigger anywhere
 document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-demo-open]');
  if(t){e.preventDefault();open()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

window.MASHDemo={open,close};
})();
