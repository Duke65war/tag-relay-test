/* M.A.S.H. Unit — Demo system v2
   Two-column storyboard. Simplified phone mockups. Button-advanced.
   Does not touch real game, career, host, or anchor storage. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const KEY='mash-unit-demo';

/* --- STYLES --- */
const css=`
#demoOverlay{position:fixed;inset:0;background:#0b1813;z-index:12000;display:flex;flex-direction:column;color:#f0f6ef;font:15px system-ui,Arial,sans-serif}
#demoOverlay.hidden{display:none}
#demoTop{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#10201a;border-bottom:1px solid #354d40}
#demoTitle{font-size:13px;font-weight:900;letter-spacing:3px;color:#d4af37}
#demoBadge{display:inline-block;background:#d4af37;color:#142219;font-size:10px;font-weight:900;letter-spacing:2px;padding:2px 8px;border-radius:6px;margin-left:8px}
#demoClose{background:rgba(0,0,0,0.85);color:#fff;border:2px solid #fff;border-radius:50%;width:36px;height:36px;font-size:18px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
#demoBody{flex:1;display:flex;overflow:hidden}
.demoCol{flex:1;display:flex;flex-direction:column;border:3px solid #354d40;border-radius:8px;margin:6px;overflow:hidden;background:#0e1c17;transition:border-color .15s,box-shadow .15s}
.demoCol.flash{border-color:#b8e96b;box-shadow:0 0 16px rgba(184,233,107,0.7)}
.demoCol.flash.teamB{border-color:#4a90e2;box-shadow:0 0 16px rgba(74,144,226,0.7)}
.demoColHead{padding:6px 10px;font-size:12px;font-weight:900;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;background:#10201a}
.demoColHead .who{color:#fff}
.demoColHead .team{font-size:10px;padding:2px 6px;border-radius:5px;font-weight:900}
.demoColHead .team.red{background:#a7222c;color:#fff}
.demoColHead .team.blue{background:#1c5daa;color:#fff}
.demoColHead .role{font-size:10px;opacity:0.75;font-weight:600;letter-spacing:0}
.demoColText{padding:8px 10px;font-size:12px;line-height:1.35;color:#e6efea;background:#1b3429;min-height:56px;border-bottom:1px solid #354d40}
.demoColText.empty{color:#7a8f80;font-style:italic}
.demoColScreen{flex:1;padding:8px;overflow:auto;display:flex;flex-direction:column;gap:6px;align-items:stretch;justify-content:flex-start}
.demoColScreen.center{align-items:center;justify-content:center;text-align:center}
.demoStep{font-size:10px;color:#c5d3cb;text-align:center;padding:4px 0;letter-spacing:1px}
#demoFoot{padding:10px;background:#10201a;border-top:1px solid #354d40;display:flex;flex-direction:column;gap:8px}
#demoNext{width:100%;padding:14px;font-size:16px;font-weight:900;letter-spacing:2px;background:#b8e96b;color:#142219;border:0;border-radius:9px;cursor:pointer}
#demoNext:disabled{opacity:0.4}
#demoChooser{flex:1;display:flex;flex-direction:column;gap:10px;padding:20px;justify-content:center}
#demoChooser h2{margin:0 0 8px 0;font-size:18px;color:#d4af37;text-align:center;letter-spacing:2px}
#demoChooser button{min-height:66px;font-size:15px;font-weight:900;letter-spacing:1px;border-radius:12px;padding:12px;text-align:left;padding-left:20px}
#demoChooser button small{display:block;font-size:11px;font-weight:600;opacity:0.75;margin-top:4px;letter-spacing:0}
#demoEnd{position:absolute;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;z-index:10}
#demoEnd.hidden{display:none}
#demoEnd h2{margin:0;color:#d4af37;font-size:20px;letter-spacing:2px;text-align:center}
#demoEnd .btnrow{display:flex;flex-direction:column;gap:8px;width:min(280px,80vw)}
#demoEnd button{width:100%;padding:12px;font-size:14px;font-weight:900;letter-spacing:1px;border:0;border-radius:9px;cursor:pointer}

/* Simplified phone mockup pieces */
.ph{background:#1b3429;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px}
.phBar{display:flex;overflow:hidden;border-radius:6px;height:18px}
.phBar span{flex:1;border-right:1px solid #14241b}
.phBar span:last-child{border:0}
.phBar .LIVE{background:#75d868}
.phBar .OFFERED{background:#ffd653}
.phBar .LOST{background:#e65d5d}
.phH{font-size:12px;font-weight:900;letter-spacing:1px;text-align:center;color:#ffe176;margin:0}
.phTimer{font-size:16px;font-weight:900;color:#ffe176;text-align:center;margin:0}
.phBadge{align-self:center;padding:3px 10px;border-radius:7px;font-size:11px;font-weight:900;color:#fff}
.phBadge.red{background:#a7222c}
.phBadge.blue{background:#1c5daa}
.phQR{background:#fff;border-radius:4px;padding:8px;display:flex;align-items:center;justify-content:center;width:80%;aspect-ratio:1;margin:2px auto}
.phQR svg{width:100%;height:100%;display:block}
.phCam{background:#1e2a24;border-radius:6px;min-height:70px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#7fa08d;border:2px dashed #354d40;text-align:center;padding:6px}
.phBtn{background:#b8e96b;color:#142219;font-weight:900;border-radius:7px;padding:8px;text-align:center;font-size:12px}
.phBtn.danger{background:#e75961;color:#fff}
.phBtn.alt{background:#354d40;color:#fff}
.phDogtag{position:relative;background:#3d6b52;border:2px solid #0e1c17;border-radius:8px;padding:10px;font-weight:900;color:#111;font-size:12px;text-align:center;letter-spacing:1px;box-shadow:inset 0 0 12px rgba(0,0,0,0.5)}
.phPanel{flex:1;min-height:70px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:6px}
.phPanel.red{background:#af222e}
.phPanel.blue{background:#1855a5}
.phPanel img{max-width:70%;max-height:60px;object-fit:contain;display:block}
.phReady{padding:4px;display:flex;flex-direction:column;gap:6px;flex:1}
.phMap{position:relative;flex:1;min-height:120px;border-radius:8px;overflow:hidden;background:#000}
.phMap img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.9}
.phMap svg{position:absolute;inset:0;width:100%;height:100%}
.phDot{position:absolute;width:14px;height:14px;border-radius:50%;background:#0080ff;border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 0 8px rgba(0,128,255,0.9)}
.phBuzz{background:#3a0f14;border-radius:8px;padding:12px;text-align:center;border:2px solid #ff5963}
.phBuzz h3{color:#ff5963;font-size:14px;margin:4px 0;letter-spacing:2px}
.phBuzz p{color:#ffd0cc;font-size:11px;margin:4px 0}
.phWin{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px}
.phWin .icon{font-size:44px;line-height:1}
.phWin .txt{font-size:12px;font-weight:900;color:#d4af37;letter-spacing:1px;text-align:center;line-height:1.3}
.phIdle{font-size:11px;color:#7a8f80;font-style:italic;text-align:center;padding:20px 6px}
.phGold{background:#d4af37;color:#142219;font-weight:900;border-radius:8px;padding:10px;text-align:center;font-size:12px}
`;

/* --- DUMMY QR SVG --- */
const QRSVG=`<svg viewBox="0 0 29 29" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="3" width="2" height="2"/><rect x="14" y="1" width="1" height="3"/><rect x="17" y="4" width="2" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="2"/><rect x="19" y="6" width="1" height="1"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="0" y="14" width="2" height="2"/><rect x="4" y="15" width="2" height="1"/><rect x="9" y="10" width="2" height="2"/><rect x="12" y="11" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="18" y="12" width="2" height="2"/><rect x="10" y="14" width="1" height="2"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="14" width="2" height="1"/><rect x="9" y="18" width="2" height="1"/><rect x="15" y="17" width="2" height="2"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="23" y="14" width="1" height="1"/><rect x="26" y="14" width="1" height="2"/><rect x="22" y="17" width="2" height="1"/><rect x="25" y="19" width="1" height="2"/><rect x="24" y="22" width="1" height="1"/><rect x="20" y="23" width="1" height="2"/><rect x="22" y="25" width="2" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="12" y="26" width="1" height="1"/><rect x="15" y="25" width="2" height="1"/><rect x="18" y="24" width="1" height="1"/></g></svg>`;

/* --- SCREEN BUILDERS --- */
function sIdle(txt){return `<div class="phIdle">${txt||'waiting…'}</div>`}

function sReady(name,team){
 const col=team==='B'?'blue':'red';
 return `
  <div class="ph">
   <div class="phBar"><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
   <div class="phBtn">I'M HIT</div>
   <div class="phBadge ${col}" style="margin-top:2px">${name} : ${team==='B'?'BLU':'RED'}</div>
   <div class="phPanel ${col}" style="flex:1;min-height:80px;margin-top:4px"><img src="./war-adventures-logo.png" alt=""></div>
  </div>`;
}

function sOffer(name,n,secs,red){
 const bar=red
  ?`<div class="phBar"><span class="OFFERED"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>`
  :`<div class="phBar"><span class="OFFERED"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>`;
 const mins=Math.floor(secs/60),s=secs%60;
 return `
  <div class="ph">
   ${bar}
   <p class="phH">LIFE ${n} OFFERED</p>
   <p class="phTimer">${mins}:${String(s).padStart(2,'0')} remaining</p>
   <div class="phQR">${QRSVG}</div>
   <div class="phDogtag">${name.toUpperCase()}'S TAGS</div>
  </div>`;
}

function sScanner(label){
 return `
  <div class="ph">
   <p class="phH">${label}</p>
   <div class="phCam">📷 Camera preview</div>
   <div class="phBtn alt">Close camera</div>
  </div>`;
}

function sReturn(type,name){
 const lbl=type==='T'?'TAGS TAKEN':'HEALED';
 return `
  <div class="ph">
   <p class="phH">${lbl}</p>
   <div class="phQR">${QRSVG}</div>
   <div style="font-size:10px;color:#c5d3cb;text-align:center">Show to ${name}</div>
  </div>`;
}

function sThanks(name){
 return `
  <div class="ph">
   <p class="phH">THANKS</p>
   <div class="phQR">${QRSVG}</div>
   <div style="font-size:10px;color:#c5d3cb;text-align:center">Show to ${name}</div>
  </div>`;
}

function sRedRespawn(){
 return `
  <div class="ph">
   <div class="phBar"><span class="LOST"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
   <p class="phH" style="color:#ff5963;font-size:16px;margin-top:8px">RESPAWN AT BASE</p>
   <div style="font-size:10px;color:#c5d3cb;text-align:center">Walk to your base. Scan the BASE QR.</div>
  </div>`;
}

function sGreenBack(){
 return `
  <div class="ph">
   <div class="phBar"><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
   <p class="phH" style="color:#75d868;font-size:14px;margin-top:8px">BACK IN PLAY</p>
   <div class="phBadge red" style="margin-top:6px">Duke : RED</div>
  </div>`;
}

function sElim(){
 return `
  <div class="ph">
   <div class="phBar"><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span><span class="LOST"></span></div>
   <p class="phH" style="color:#ffb5bd;font-size:18px;margin-top:10px">ELIMINATED</p>
   <div style="font-size:10px;color:#c5d3cb;text-align:center">Leave play safely.</div>
  </div>`;
}

function sMedicConfirm(){
 return `
  <div class="ph">
   <p class="phH" style="color:#b8e96b">HEALED DUKE</p>
   <div style="font-size:11px;color:#c5d3cb;text-align:center">Thank-you received. Assist recorded.</div>
  </div>`;
}

function sMap(o){
 const r1=o.r1||40,r2=o.r2||0,dot=o.dot!==false,dp=o.dotPos||'48% 62%';
 return `
  <div class="ph" style="flex:1">
   <div class="phMap">
    <img src="./map1.jpeg" alt="">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
     <circle cx="50" cy="45" r="${r1}" fill="rgba(200,40,40,0.12)" stroke="#c0392b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
     ${r2>0?`<circle cx="50" cy="45" r="${r2}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`:''}
    </svg>
    ${dot?`<div class="phDot" style="left:${dp.split(' ')[0]};top:${dp.split(' ')[1]}"></div>`:''}
   </div>
  </div>`;
}

function sBuzz(){
 return `
  <div class="ph">
   <div class="phBuzz">
    <h3>OUT OF BOUNDS</h3>
    <p>Buzz. Buzz. Buzz.</p>
    <p>10 seconds to return.</p>
   </div>
  </div>`;
}

function sWinnerQR(){
 return `
  <div class="ph">
   <p class="phH" style="color:#d4af37">WINNER QR</p>
   <div class="phQR">${QRSVG}</div>
   <div style="font-size:10px;color:#c5d3cb;text-align:center">Only the last player scans this.</div>
  </div>`;
}

function sWin(){
 return `
  <div class="ph">
   <div class="phWin">
    <div class="icon">🥇</div>
    <div class="txt">YOU HAVE OUTLASTED THEM ALL</div>
    <div style="font-size:10px;color:#c5d3cb;text-align:center">🎯 added to career</div>
   </div>
  </div>`;
}

/* --- DEMO SCRIPTS --- */
function buildDemos(){
 return {
  standard:{
   title:'STANDARD GAME',
   leftName:'Duke', leftTeam:'red', leftRole:'Player',
   rightName:'Jacko', rightTeam:'blue', rightRole:'Enemy Reaper',
   steps:[
    {leftTxt:"Duke has been hit. He taps I'M HIT.",rightTxt:"Jacko is the enemy Reaper. He's on the other team.",left:sReady('Duke','A'),right:sIdle('Jacko waiting'),flash:'left'},
    {leftTxt:"Duke shows his dog tags. A countdown starts.",rightTxt:"",left:sOffer('Duke',1,298),right:sIdle('Jacko waiting'),flash:'left'},
    {leftTxt:"Duke keeps showing his tags. He cannot move yet.",rightTxt:"Jacko opens his scanner.",left:sOffer('Duke',1,295),right:sScanner('SCAN TAGS'),flash:'right'},
    {leftTxt:"Duke waits for the receipt.",rightTxt:"Jacko now holds a TAGS TAKEN QR. This is his receipt.",left:sOffer('Duke',1,290),right:sReturn('T','Duke'),flash:'right'},
    {leftTxt:"Duke scans Jacko's TAGS TAKEN QR. His life goes red.",rightTxt:"Jacko's receipt is confirmed on Duke's phone.",left:sScanner('SCAN TAGS TAKEN'),right:sReturn('T','Duke'),flash:'left'},
    {leftTxt:"Duke's life is spent. He walks to his base.",rightTxt:"Jacko's job is done. He rejoins his team.",left:sRedRespawn(),right:sIdle('Jacko moving on'),flash:'left'},
    {leftTxt:"At the base, Duke scans the BASE QR.",rightTxt:"",left:sScanner('SCAN BASE'),right:sIdle(''),flash:'left'},
    {leftTxt:"Duke is back in play. Spent lives stay red.",rightTxt:"Demo complete.",left:sGreenBack(),right:sIdle(''),flash:'left'}
   ]
  },
  medic:{
   title:'MEDIC GAME',
   leftName:'Duke', leftTeam:'red', leftRole:'Player',
   rightName:'Dibs', rightTeam:'red', rightRole:'Teammate Medic',
   steps:[
    {leftTxt:"Duke has been hit. He taps I'M HIT.",rightTxt:"Dibs is on Duke's team. She's the squad medic.",left:sReady('Duke','A'),right:sIdle('Dibs waiting'),flash:'left'},
    {leftTxt:"Duke shows his dog tags. The countdown runs.",rightTxt:"",left:sOffer('Duke',1,298),right:sIdle('Dibs waiting'),flash:'left'},
    {leftTxt:"Duke keeps his tags up.",rightTxt:"Dibs opens her scanner and scans Duke's offer.",left:sOffer('Duke',1,295),right:sScanner('SCAN OFFER'),flash:'right'},
    {leftTxt:"Duke waits.",rightTxt:"Dibs now holds a HEALED QR. She must also press Duke's yellow life bar.",left:sOffer('Duke',1,290),right:sReturn('H','Duke'),flash:'right'},
    {leftTxt:"Dibs presses Duke's yellow bar. Duke's phone opens its scanner.",rightTxt:"Dibs keeps the HEALED QR ready to show.",left:sScanner('SCAN HEALED'),right:sReturn('H','Duke'),flash:'left'},
    {leftTxt:"Duke scans Dibs's HEALED QR. His life turns green.",rightTxt:"",left:sGreenBack(),right:sReturn('H','Duke'),flash:'left'},
    {leftTxt:"Duke now shows a THANKS QR.",rightTxt:"",left:sThanks('Dibs'),right:sIdle('Dibs waiting'),flash:'left'},
    {leftTxt:"Dibs scans the THANKS QR.",rightTxt:"Assist recorded on Dibs's phone.",left:sThanks('Dibs'),right:sScanner('SCAN THANKS'),flash:'right'},
    {leftTxt:"Duke is back in play.",rightTxt:"Dibs gets credit for the heal. Demo complete.",left:sGreenBack(),right:sMedicConfirm(),flash:'right'}
   ]
  },
  outlast:{
   title:'OUTLAST',
   leftName:'Duke', leftTeam:'red', leftRole:'Player',
   rightName:'Jacko', rightTeam:'blue', rightRole:'Player',
   steps:[
    {leftTxt:"The game starts. Both players are inside the boundary.",rightTxt:"",left:sMap({r1:42,dot:true,dotPos:'50% 45%'}),right:sMap({r1:42,dot:true,dotPos:'48% 62%'}),flash:'left'},
    {leftTxt:"First shrink. The boundary is tightening toward the target.",rightTxt:"",left:sMap({r1:32,r2:22,dot:true,dotPos:'50% 45%'}),right:sMap({r1:32,r2:22,dot:true,dotPos:'48% 62%'}),flash:'left'},
    {leftTxt:"Second shrink. Duke made it inside.",rightTxt:"Jacko is caught outside the new circle.",left:sMap({r1:22,r2:12,dot:true,dotPos:'50% 45%'}),right:sMap({r1:22,r2:12,dot:true,dotPos:'30% 78%'}),flash:'right'},
    {leftTxt:"Duke stays inside.",rightTxt:"Jacko's phone buzzes. He has 10 seconds to get back.",left:sMap({r1:22,r2:12,dot:true,dotPos:'50% 45%'}),right:sBuzz(),flash:'right'},
    {leftTxt:"Duke stays inside.",rightTxt:"Time's up. Jacko is eliminated.",left:sMap({r1:22,r2:12,dot:true,dotPos:'50% 45%'}),right:sElim(),flash:'right'},
    {leftTxt:"Duke is the last player standing. The host shows the WINNER QR.",rightTxt:"",left:sWinnerQR(),right:sIdle('Jacko out'),flash:'left'},
    {leftTxt:"Duke scans it. A 🎯 is added to his career.",rightTxt:"Demo complete.",left:sWin(),right:sIdle(''),flash:'left'}
   ]
  }
 };
}

/* --- STATE --- */
let demos={},state=null;

/* --- DOM --- */
function injectDom(){
 if($('demoOverlay'))return;
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const o=document.createElement('div');o.id='demoOverlay';o.className='hidden';
 o.innerHTML=`
  <div id="demoTop">
   <div><span id="demoTitle">DEMO</span><span id="demoBadge">DEMO ONLY</span></div>
   <button id="demoClose">✕</button>
  </div>
  <div id="demoBody"></div>
  <div id="demoFoot"></div>
  <div id="demoEnd" class="hidden"></div>
 `;
 document.body.appendChild(o);
 $('demoClose').onclick=close;
}

/* --- RENDER --- */
function renderChooser(){
 const body=$('demoBody');body.innerHTML='';
 const foot=$('demoFoot');foot.innerHTML='';
 $('demoTitle').textContent='TRY A DEMO';
 $('demoStep')&&$('demoStep').remove();
 const wrap=document.createElement('div');
 wrap.id='demoChooser';
 wrap.innerHTML=`
  <h2>What would you like to try?</h2>
  <button data-mode="standard">STANDARD GAME<small>5 lives · 300s bleedout · no medic</small></button>
  <button data-mode="medic">MEDIC GAME<small>5 lives · 300s bleedout · one-scan medic</small></button>
  <button data-mode="outlast">OUTLAST<small>1 life · shrinking boundary · no respawn</small></button>
 `;
 body.appendChild(wrap);
 wrap.querySelectorAll('button[data-mode]').forEach(b=>{b.onclick=()=>{state={mode:b.getAttribute('data-mode'),step:0};render()}});
 $('demoEnd').classList.add('hidden');
}

function render(){
 const d=demos[state.mode];if(!d)return renderChooser();
 const step=d.steps[state.step];
 if(!step){endScreen();return}
 $('demoTitle').textContent=d.title;
 $('demoEnd').classList.add('hidden');
 const body=$('demoBody');
 body.innerHTML=`
  <div class="demoCol team-${d.leftTeam}${step.flash==='left'?' flash':''}${d.leftTeam==='blue'?' teamB':''}">
   <div class="demoColHead">
    <div><span class="who">${d.leftName}</span> <span class="team ${d.leftTeam==='red'?'red':'blue'}">${d.leftTeam==='red'?'RED':'BLUE'}</span></div>
    <div class="role">${d.leftRole}</div>
   </div>
   <div class="demoColText${step.leftTxt?'':' empty'}">${step.leftTxt||'—'}</div>
   <div class="demoColScreen center">${step.left||''}</div>
  </div>
  <div class="demoCol team-${d.rightTeam}${step.flash==='right'?' flash':''}${d.rightTeam==='blue'?' teamB':''}">
   <div class="demoColHead">
    <div><span class="who">${d.rightName}</span> <span class="team ${d.rightTeam==='red'?'red':'blue'}">${d.rightTeam==='red'?'RED':'BLUE'}</span></div>
    <div class="role">${d.rightRole}</div>
   </div>
   <div class="demoColText${step.rightTxt?'':' empty'}">${step.rightTxt||'—'}</div>
   <div class="demoColScreen center">${step.right||''}</div>
  </div>
 `;
 const foot=$('demoFoot');
 const last=state.step===d.steps.length-1;
 const nextLabel=last?'FINISH':'NEXT →';
 foot.innerHTML=`<div class="demoStep">Step ${state.step+1} of ${d.steps.length}</div><button id="demoNext">${nextLabel}</button>`;
 $('demoNext').onclick=()=>{
  try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}
  if(state.step<d.steps.length-1){state.step++;render();try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
  else endScreen();
 };
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
}

function endScreen(){
 $('demoEnd').classList.remove('hidden');
 $('demoEnd').innerHTML=`
  <h2>DEMO COMPLETE</h2>
  <p style="text-align:center;color:#c5d3cb;font-size:12px;margin:0">Nothing was saved to your real career.</p>
  <div class="btnrow">
   <button id="dReplay" style="background:#b8e96b;color:#142219">REPLAY</button>
   <button id="dOther" style="background:#354d40;color:#fff">TRY ANOTHER DEMO</button>
   <button id="dBack" style="background:#354d40;color:#fff">BACK TO SETUP</button>
  </div>
 `;
 $('dReplay').onclick=()=>{state.step=0;$('demoEnd').classList.add('hidden');render()};
 $('dOther').onclick=()=>{state=null;try{localStorage.removeItem(KEY)}catch(e){}renderChooser()};
 $('dBack').onclick=close;
}

/* --- OPEN / CLOSE --- */
function open(){
 injectDom();
 $('demoOverlay').classList.remove('hidden');
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){const s=JSON.parse(raw);if(s&&demos[s.mode]&&typeof s.step==='number'&&demos[s.mode].steps[s.step]){state=s;render();return}}
 }catch(e){}
 state=null;
 renderChooser();
}
function close(){
 $('demoOverlay').classList.add('hidden');
 state=null;
 try{localStorage.removeItem(KEY)}catch(e){}
}

/* --- INIT --- */
function init(){
 injectDom();
 demos=buildDemos();
 const btn=$('demoOpen');
 if(btn)btn.onclick=open;
 document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-demo-open]');if(t){e.preventDefault();open()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.MASHDemo={open,close};
})();
