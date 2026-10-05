/* M.A.S.H. Unit — Demo v3
   Two-column storyboard. Tap-driven. Simplified phone mockups.
   Does not touch real game, career, host, or anchor storage. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const KEY='mash-unit-demo';
const SCAN_STD='./Reapersrewards1.jpg';
const SCAN_MED='./qrscanbu.jpg';
const SCAN_BASE='./baserespawn.jpg';

/* --- STYLES --- */
const css=`
#demoOverlay{position:fixed;inset:0;background:#0b1813;z-index:12000;display:flex;flex-direction:column;color:#f0f6ef;font:15px system-ui,Arial,sans-serif}
#demoOverlay.hidden{display:none}
#demoTop{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#10201a;border-bottom:1px solid #354d40}
#demoTitle{font-size:12px;font-weight:900;letter-spacing:3px;color:#d4af37}
#demoBadge{display:inline-block;background:#d4af37;color:#142219;font-size:9px;font-weight:900;letter-spacing:2px;padding:2px 7px;border-radius:6px;margin-left:6px}
#demoClose{background:rgba(0,0,0,0.85);color:#fff;border:2px solid #fff;border-radius:50%;width:36px;height:36px;font-size:18px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
#demoBody{flex:1;display:flex;overflow:hidden;min-height:0}
.demoCol{flex:1;display:flex;flex-direction:column;border:3px solid #354d40;border-radius:8px;margin:5px;overflow:hidden;background:#0e1c17;transition:border-color .12s,box-shadow .12s}
.demoCol.flash{border-color:#b8e96b;box-shadow:0 0 14px rgba(184,233,107,0.65)}
.demoColHead{padding:5px 8px;font-size:11px;font-weight:900;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;background:#10201a;gap:4px}
.demoColHead .who{color:#fff}
.demoColHead .team{font-size:9px;padding:2px 6px;border-radius:5px;font-weight:900}
.demoColHead .team.red{background:#a7222c;color:#fff}
.demoColHead .team.blue{background:#1c5daa;color:#fff}
.demoColHead .role{font-size:9px;opacity:0.7;font-weight:600;letter-spacing:0}
.demoColText{padding:6px 8px;font-size:11px;line-height:1.35;color:#e6efea;background:#1b3429;min-height:52px;border-bottom:1px solid #354d40}
.demoColScreen{flex:1;padding:6px;overflow:hidden;display:flex;flex-direction:column;gap:5px;align-items:stretch;justify-content:flex-start}
#demoFoot{padding:6px 10px 10px;background:#10201a;border-top:1px solid #354d40;display:flex;flex-direction:column;gap:6px}
#demoStepTxt{font-size:10px;color:#c5d3cb;text-align:center;letter-spacing:1px}
#demoNext{width:100%;padding:12px;font-size:15px;font-weight:900;letter-spacing:2px;background:#b8e96b;color:#142219;border:0;border-radius:9px;cursor:pointer}
#demoChooser{flex:1;display:flex;flex-direction:column;gap:10px;padding:20px;justify-content:center}
#demoChooser h2{margin:0 0 8px 0;font-size:16px;color:#d4af37;text-align:center;letter-spacing:2px}
#demoChooser button{min-height:66px;font-size:15px;font-weight:900;letter-spacing:1px;border-radius:12px;padding:12px;text-align:left;padding-left:20px;border:0;cursor:pointer}
#demoChooser button small{display:block;font-size:11px;font-weight:600;opacity:0.75;margin-top:4px;letter-spacing:0}
#demoChooser .primary{background:#b8e96b;color:#142219}
#demoChooser .secondary{background:#354d40;color:#fff}
#demoEnd{position:absolute;inset:0;background:rgba(0,0,0,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;z-index:10}
#demoEnd.hidden{display:none}
#demoEnd h2{margin:0;color:#d4af37;font-size:20px;letter-spacing:2px;text-align:center}
#demoEnd .btnrow{display:flex;flex-direction:column;gap:8px;width:min(280px,80vw)}
#demoEnd button{width:100%;padding:12px;font-size:13px;font-weight:900;letter-spacing:1px;border:0;border-radius:9px;cursor:pointer}

/* Mockup pieces */
.ph{background:#1b3429;border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:5px;flex:1}
.phBar{display:flex;overflow:hidden;border-radius:5px;height:16px}
.phBar span{flex:1;border-right:1px solid #14241b}
.phBar span:last-child{border:0}
.phBar .LIVE{background:#75d868}
.phBar .OFFERED{background:#ffd653}
.phBar .LOST{background:#e65d5d}
.phBar .tappable{background:#ffd653;box-shadow:0 0 8px #ffd653 inset;animation:pulseYellow 1.2s infinite;position:relative;cursor:pointer}
.phBar .tappable::after{content:'+';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#142219;font-weight:900;font-size:11px}
@keyframes pulseYellow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4)}}
.phH{font-size:11px;font-weight:900;letter-spacing:1px;text-align:center;color:#ffe176;margin:0}
.phH.danger{color:#ff5963}
.phH.green{color:#75d868}
.phTimer{font-size:14px;font-weight:900;color:#ffe176;text-align:center;margin:0}
.phBadge{align-self:center;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:900;color:#fff}
.phBadge.red{background:#a7222c}
.phBadge.blue{background:#1c5daa}
.phQR{background:#fff;border-radius:4px;padding:6px;display:flex;align-items:center;justify-content:center;width:78%;aspect-ratio:1;margin:2px auto}
.phQR svg{width:100%;height:100%;display:block}
.phBtnHit{background:#b8e96b;color:#142219;font-weight:900;border-radius:7px;padding:9px;text-align:center;font-size:12px;cursor:pointer;border:0}
.phBtnMedic{background:#354d40;color:#fff;font-weight:900;border-radius:7px;padding:9px;text-align:center;font-size:12px;cursor:pointer;border:0}
.phScanWrap{position:relative;cursor:pointer;border-radius:7px;overflow:hidden;background:#0b1813}
.phScanImg{display:block;width:100%;height:auto;pointer-events:none}
.phScanOverlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,34,25,0.55);color:#fff;font-size:14px;font-weight:900;letter-spacing:2px;text-shadow:0 0 8px rgba(0,0,0,0.9)}
.phCam{background:#1e2a24;border-radius:6px;min-height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#7fa08d;border:2px dashed #354d40;text-align:center;padding:8px;cursor:pointer}
.phCam .cam{font-size:22px;line-height:1;margin-bottom:4px}
.phDogtag{position:relative;background:#3d6b52;border:2px solid #0e1c17;border-radius:7px;padding:8px;font-weight:900;color:#111;font-size:10px;text-align:center;letter-spacing:1px;box-shadow:inset 0 0 10px rgba(0,0,0,0.5)}
.phPanel{flex:1;min-height:60px;border-radius:7px;display:flex;align-items:center;justify-content:center;padding:4px}
.phPanel.red{background:#af222e}
.phPanel.blue{background:#1855a5}
.phPanel img{max-width:72%;max-height:52px;object-fit:contain;display:block}
.phCenter{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;flex:1}
.phBig{font-size:16px;font-weight:900;letter-spacing:1px;text-align:center}
.phBig.red{color:#ff5963}
.phBig.green{color:#75d868}
.phSmall{font-size:10px;color:#c5d3cb;text-align:center;line-height:1.3}
.phGold{background:#d4af37;color:#142219;font-weight:900;border-radius:7px;padding:8px;text-align:center;font-size:11px;letter-spacing:1px}
`;

/* --- DUMMY QR SVG --- */
const QRSVG=`<svg viewBox="0 0 29 29" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="3" width="2" height="2"/><rect x="14" y="1" width="1" height="3"/><rect x="17" y="4" width="2" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="2"/><rect x="19" y="6" width="1" height="1"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="0" y="14" width="2" height="2"/><rect x="4" y="15" width="2" height="1"/><rect x="9" y="10" width="2" height="2"/><rect x="12" y="11" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="18" y="12" width="2" height="2"/><rect x="10" y="14" width="1" height="2"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="14" width="2" height="1"/><rect x="9" y="18" width="2" height="1"/><rect x="15" y="17" width="2" height="2"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="23" y="14" width="1" height="1"/><rect x="26" y="14" width="1" height="2"/><rect x="22" y="17" width="2" height="1"/><rect x="25" y="19" width="1" height="2"/><rect x="24" y="22" width="1" height="1"/><rect x="20" y="23" width="1" height="2"/><rect x="22" y="25" width="2" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="12" y="26" width="1" height="1"/><rect x="15" y="25" width="2" height="1"/><rect x="18" y="24" width="1" height="1"/></g></svg>`;

/* --- MOCKUP BUILDERS --- */
function bar(states){return `<div class="phBar">${states.map(s=>s==='Y'?'<span class="OFFERED"></span>':`<span class="${s==='G'?'LIVE':s==='R'?'LOST':s==='P'?'OFFERED tappable':'LIVE'}"></span>`).join('')}</div>`}

function scrReady(o){
 const col=o.team==='blue'?'blue':'red';
 return `<div class="ph">
  ${bar(['G','G','G','G','G'])}
  <button class="phBtnHit" ${o.hitId?`id="${o.hitId}"`:''}>I'M HIT</button>
  <button class="phBtnMedic" ${o.medicId?`id="${o.medicId}"`:''}>MEDIC</button>
  <div class="phBadge ${col}">${o.name} : ${o.team==='blue'?'BLU':'RED'}</div>
  <div class="phPanel ${col}"><img src="./war-adventures-logo.png" alt=""></div>
 </div>`;
}

function scrOffer(o){
 const scanImg = o.scanImg||SCAN_MED;
 return `<div class="ph">
  ${bar(['Y','G','G','G','G'])}
  <p class="phH">LIFE 1 OFFERED</p>
  <p class="phTimer">4:56 remaining</p>
  <div class="phQR">${QRSVG}</div>
  <div class="phDogtag">${(o.name||'DUKE').toUpperCase()}'S TAGS</div>
 </div>`;
}

function scrOfferYellow(o){
 return `<div class="ph">
  <div class="phBar"><span class="LOST"></span><span class="OFFERED tappable" id="${o.yellowId||'demoYellowBar'}"></span><span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
  <p class="phH">LIFE 1 OFFERED</p>
  <p class="phTimer">4:56 remaining</p>
  <div class="phQR">${QRSVG}</div>
  <div class="phDogtag">${(o.name||'DUKE').toUpperCase()}'S TAGS</div>
 </div>`;
}

function scrScanImg(o){
 const img = o.scanImg||SCAN_MED;
 return `<div class="ph">
  <div class="phScanWrap" id="${o.scanId||''}">
   <img class="phScanImg" src="${img}" alt="">
   <div class="phScanOverlay">SCAN</div>
  </div>
 </div>`;
}

function scrCam(o){
 return `<div class="ph">
  <p class="phH">${o.label||'SCAN'}</p>
  <div class="phCam" id="${o.camId||''}"><div class="cam">📷</div>Tap to scan</div>
  <button class="phBtnMedic">Close camera</button>
 </div>`;
}

function scrReturn(o){
 const lbl=o.type==='T'?'TAGS TAKEN':'HEALED';
 return `<div class="ph">
  <p class="phH">${lbl}</p>
  <div class="phQR">${QRSVG}</div>
  <div class="phSmall">Show to ${o.name||'Duke'}</div>
 </div>`;
}

function scrThanks(o){
 return `<div class="ph">
  <p class="phH">THANKS</p>
  <div class="phQR">${QRSVG}</div>
  <div class="phSmall">Show to ${o.name||'Dibs'}</div>
 </div>`;
}

function scrRespawn(){
 return `<div class="ph">
  ${bar(['R','G','G','G','G'])}
  <p class="phH danger">RESPAWN AT BASE</p>
  <div class="phSmall">Scan your base QR</div>
 </div>`;
}

function scrBackIn(){
 return `<div class="ph">
  ${bar(['R','G','G','G','G'])}
  <p class="phH green">BACK IN PLAY</p>
  <div class="phSmall">Spent lives stay red</div>
 </div>`;
}

function scrHealedConfirm(){
 return `<div class="phCenter">
  <p class="phH green">HEALED DUKE</p>
  <div class="phSmall">Assist recorded on medic's phone</div>
 </div>`;
}

function scrDukeAfterHeal(){
 return `<div class="ph">
  ${bar(['G','G','G','G','G'])}
  <p class="phH green">BACK IN PLAY</p>
  <div class="phSmall">Full life restored</div>
 </div>`;
}

/* --- DEMO SCRIPTS --- */
function buildDemos(){
 return {
  standard:{
   title:'STANDARD GAME',
   left:{name:'Duke',team:'red',role:'Player'},
   right:{name:'Jacko',team:'blue',role:'Enemy Reaper'},
   steps:[
    {
     leftTxt:"Duke has been hit. <strong>Press Duke's I'M HIT button.</strong>",
     rightTxt:"Jacko is the enemy Reaper. He is on the other team.",
     left:()=>scrReady({name:'Duke',team:'red',hitId:'demoDukeHit'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left'
    },
    {
     leftTxt:"Duke tapped I'M HIT. His phone opened the offer QR and started a countdown.",
     rightTxt:"Now it's Jacko's turn.",
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD}),
     right:()=>scrScanImg({name:'Jacko',scanImg:SCAN_STD,scanId:'demoJackoScan'}),
     flash:'right'
    },
    {
     leftTxt:"Duke keeps showing his tags.",
     rightTxt:"Jacko tapped SCAN. His camera opened.",
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD}),
     right:()=>scrCam({label:'SCAN TAGS',camId:'demoJackoCam'}),
     flash:'right'
    },
    {
     leftTxt:"Duke waits for the receipt.",
     rightTxt:"Jacko scanned Duke's tags. His phone now shows a TAGS TAKEN QR.",
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD}),
     right:()=>scrReturn({type:'T',name:'Duke'}),
     flash:'right'
    },
    {
     leftTxt:"Duke now scans Jacko's TAGS TAKEN QR.",
     rightTxt:"Jacko holds the QR steady.",
     left:()=>scrScanImg({name:'Duke',scanImg:SCAN_STD,scanId:'demoDukeScan'}),
     right:()=>scrReturn({type:'T',name:'Duke'}),
     flash:'left'
    },
    {
     leftTxt:"Duke's camera is open.",
     rightTxt:"Jacko waits.",
     left:()=>scrCam({label:'SCAN TAGS TAKEN',camId:'demoDukeCam'}),
     right:()=>scrReturn({type:'T',name:'Duke'}),
     flash:'left'
    },
    {
     leftTxt:"Duke scanned. His life went red. He walks to his base.",
     rightTxt:"Jacko moves on.",
     left:()=>scrRespawn(),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left'
    },
    {
     leftTxt:"At the base, Duke taps SCAN again to respawn.",
     rightTxt:"",
     left:()=>scrScanImg({name:'Duke',scanImg:SCAN_BASE,scanId:'demoDukeBaseScan'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left'
    },
    {
     leftTxt:"Duke's camera opens at the base.",
     rightTxt:"",
     left:()=>scrCam({label:'SCAN BASE',camId:'demoDukeBaseCam'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left'
    },
    {
     leftTxt:"Duke scanned the base QR. He's back in play. Spent lives stay red.",
     rightTxt:"Demo complete.",
     left:()=>scrBackIn(),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left'
    }
   ]
  },
  medic:{
   title:'MEDIC GAME',
   left:{name:'Duke',team:'red',role:'Player'},
   right:{name:'Dibs',team:'red',role:'Teammate Medic'},
   steps:[
    {
     leftTxt:"Duke has been hit. <strong>Press Duke's I'M HIT button.</strong>",
     rightTxt:"Dibs is on Duke's team. She is the squad medic.",
     left:()=>scrReady({name:'Duke',team:'red',hitId:'demoDukeHit2'}),
     right:()=>scrReady({name:'Dibs',team:'red'}),
     flash:'left'
    },
    {
     leftTxt:"Duke tapped I'M HIT. His phone opened the offer QR and started a countdown.",
     rightTxt:"Now it's Dibs's turn.",
     left:()=>scrOffer({name:'Duke'}),
     right:()=>scrScanImg({scanId:'demoDibsScan'}),
     flash:'right'
    },
    {
     leftTxt:"Duke keeps his tags showing.",
     rightTxt:"Dibs tapped SCAN. Her camera opened so she can scan Duke's offer.",
     left:()=>scrOffer({name:'Duke'}),
     right:()=>scrCam({label:'SCAN OFFER',camId:'demoDibsCam'}),
     flash:'right'
    },
    {
     leftTxt:"Duke waits. His yellow bar is about to be pressed.",
     rightTxt:"Dibs scanned Duke's offer. Her phone now shows a HEALED QR. She must also press Duke's yellow life bar.",
     left:()=>scrOffer({name:'Duke'}),
     right:()=>scrReturn({type:'H',name:'Duke'}),
     flash:'right'
    },
    {
     leftTxt:"Dibs pressed Duke's yellow bar. His phone opened its camera.",
     rightTxt:"Dibs holds the HEALED QR.",
     left:()=>scrCam({label:'SCAN HEALED',camId:'demoDukeHealCam'}),
     right:()=>scrReturn({type:'H',name:'Duke'}),
     flash:'left'
    },
    {
     leftTxt:"Duke scanned the HEALED QR. His life turned green and his phone now shows a THANKS QR.",
     rightTxt:"Dibs sees the THANKS QR on Duke's phone.",
     left:()=>scrThanks({name:'Dibs'}),
     right:()=>scrReturn({type:'H',name:'Duke'}),
     flash:'left'
    },
    {
     leftTxt:"Duke shows THANKS.",
     rightTxt:"Dibs taps SCAN to read the THANKS QR.",
     left:()=>scrThanks({name:'Dibs'}),
     right:()=>scrScanImg({scanId:'demoDibsThanksScan'}),
     flash:'right'
    },
    {
     leftTxt:"Duke waits.",
     rightTxt:"Dibs's camera opens.",
     left:()=>scrThanks({name:'Dibs'}),
     right:()=>scrCam({label:'SCAN THANKS',camId:'demoDibsThanksCam'}),
     flash:'right'
    },
    {
     leftTxt:"Duke is back in play.",
     rightTxt:"Dibs scanned the THANKS QR. The medic assist is recorded on her phone.",
     left:()=>scrDukeAfterHeal(),
     right:()=>scrHealedConfirm(),
     flash:'right'
    }
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
 $('demoEnd').classList.add('hidden');
 const wrap=document.createElement('div');
 wrap.id='demoChooser';
 wrap.innerHTML=`
  <h2>What would you like to try?</h2>
  <button class="primary" data-mode="standard">STANDARD GAME<small>5 lives · 300s bleedout · no medic</small></button>
  <button class="secondary" data-mode="medic">MEDIC GAME<small>5 lives · 300s bleedout · one-scan medic</small></button>
 `;
 body.appendChild(wrap);
 wrap.querySelectorAll('button[data-mode]').forEach(b=>{b.onclick=()=>{state={mode:b.getAttribute('data-mode'),step:0};render()}});
}

function render(){
 const d=demos[state.mode];if(!d)return renderChooser();
 const step=d.steps[state.step];
 if(!step){endScreen();return}
 $('demoTitle').textContent=d.title;
 $('demoEnd').classList.add('hidden');
 const body=$('demoBody');
 body.innerHTML=`
  <div class="demoCol${step.flash==='left'?' flash':''}">
   <div class="demoColHead">
    <div><span class="who">${d.left.name}</span> <span class="team ${d.left.team}">${d.left.team==='red'?'RED':'BLUE'}</span></div>
    <div class="role">${d.left.role}</div>
   </div>
   <div class="demoColText">${step.leftTxt||'—'}</div>
   <div class="demoColScreen">${step.left()}</div>
  </div>
  <div class="demoCol${step.flash==='right'?' flash':''}">
   <div class="demoColHead">
    <div><span class="who">${d.right.name}</span> <span class="team ${d.right.team}">${d.right.team==='red'?'RED':'BLUE'}</span></div>
    <div class="role">${d.right.role}</div>
   </div>
   <div class="demoColText">${step.rightTxt||'—'}</div>
   <div class="demoColScreen">${step.right()}</div>
  </div>
 `;
 const foot=$('demoFoot');
 foot.innerHTML=`<div id="demoStepTxt">Step ${state.step+1} of ${d.steps.length}</div>`;
 wireStep(step);
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
}

function wireStep(step){
 // Wire all interactive elements on both phones
 const overlay=$('demoOverlay');
 // Any element with an id becomes clickable
 overlay.querySelectorAll('[id^="demo"]').forEach(el=>{
  el.onclick=()=>advanceFromTap(el.id);
 });
}

function advanceFromTap(id){
 if(!state)return;
 const d=demos[state.mode];const step=d.steps[state.step];
 // Which target id corresponds to this step?
 const expected=expectedIdForStep(state.mode,state.step);
 buzz(25);
 if(id===expected){
  // Correct tap
  state.step++;render();
 }else{
  // Wrong tap — shake + hint
  const el=$('demoOverlay').querySelector('#'+id);
  if(el){el.classList.add('demoShake');setTimeout(()=>el.classList.remove('demoShake'),450)}
  const hintEl=$('demoStepTxt');
  if(hintEl){const old=hintEl.textContent;hintEl.textContent='Not that one. Try the flashing phone.';hintEl.style.color='#ffd0cc';setTimeout(()=>{if(hintEl){hintEl.textContent=old;hintEl.style.color=''}},1500)}
 }
}

function expectedIdForStep(mode,step){
 if(mode==='standard'){
  return ['demoDukeHit','demoJackoScan','demoJackoCam','','demoDukeScan','demoDukeCam','','demoDukeBaseScan','demoDukeBaseCam',''][step];
 }
 if(mode==='medic'){
  return ['demoDukeHit2','demoDibsScan','demoDibsCam','','demoDukeHealCam','','demoDibsThanksScan','demoDibsThanksCam',''][step];
 }
 return '';
}

function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms||60)}catch(e){}}

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
