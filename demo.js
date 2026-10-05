/* M.A.S.H. Unit — Demo v6
   Two-phone flow demos + single-phone onboarding demo.
   Tap-driven for flows. NEXT-driven for onboarding. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const KEY='mash-unit-demo';
const SCAN_STD='./Reapersrewards1.jpg';
const SCAN_MED='./qrscanbu.jpg';
const SCAN_BASE='./baserespawn.jpg';

/* --- STYLES --- */
const css=`
#demoOverlay{position:fixed;inset:0;background:#0b1813;z-index:12000;display:flex;flex-direction:column;color:#f0f6ef;font:14px system-ui,Arial,sans-serif}
#demoOverlay.hidden{display:none}
#demoBody{flex:1;display:flex;overflow:hidden;min-height:0}
.demoCol{flex:1;display:flex;flex-direction:column;border:2px solid #354d40;border-radius:8px;margin:4px;overflow:hidden;background:#0e1c17;transition:border-color .15s,box-shadow .15s;min-width:0}
.demoCol.flash{border-color:#b8e96b;box-shadow:0 0 14px rgba(184,233,107,0.65)}
.demoColText{flex:1;padding:8px 10px;font-size:11px;line-height:1.4;color:#e6efea;background:#1b3429;overflow-y:auto;border-bottom:2px solid #0e1c17}
.demoColText strong{color:#ffe176}
.demoColText .h{font-size:12px;font-weight:900;letter-spacing:1px;display:block;margin-bottom:4px;color:#b8e96b}
.demoColText ul{margin:4px 0 0 0;padding-left:16px}
.demoColText li{margin-bottom:3px}
.demoColPhone{flex:3;padding:0;overflow:hidden;display:flex;flex-direction:column;background:#0e1c17;min-height:0}
.phHeader{padding:5px 6px 4px;text-align:center;border-bottom:1px solid #354d40;background:#0e1c17;flex-shrink:0}
.phHeaderTitle{font-size:11px;font-weight:900;letter-spacing:1px;color:#6b8e23;line-height:1.1}
.phHeaderTitle .unit{font-size:10px;font-weight:700}
.phHeaderSub{font-size:6px;font-weight:700;letter-spacing:2px;color:#d4af37;margin-top:2px}
.phContent{flex:1;padding:6px;display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0;justify-content:flex-start}
.phContent.center{justify-content:center}

.phBar{display:flex;overflow:hidden;border-radius:4px;height:14px;flex-shrink:0}
.phBar span{flex:1;border-right:1px solid #14241b}
.phBar span:last-child{border:0}
.phBar .LIVE{background:#75d868}
.phBar .OFFERED{background:#ffd653}
.phBar .LOST{background:#e65d5d}
.phBar .tappable{background:#ffd653;box-shadow:0 0 10px #ffd653 inset;animation:pulseYellow 1.2s infinite;position:relative;cursor:pointer}
.phBar .tappable::after{content:'+';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#142219;font-weight:900;font-size:10px}
@keyframes pulseYellow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.5)}}
@keyframes pulseOutline{0%,100%{outline-color:#ffe176;outline-offset:2px}50%{outline-color:rgba(255,225,118,0.3);outline-offset:3px}}
.demoTarget{outline:3px solid #ffe176;outline-offset:2px;border-radius:6px;cursor:pointer;animation:pulseOutline 1.2s infinite}

.phBtn{font-weight:900;border-radius:6px;padding:7px;text-align:center;font-size:11px;cursor:pointer;border:0;width:100%;box-sizing:border-box}
.phBtn.hit{background:#b8e96b;color:#142219}
.phBtn.medic{background:#354d40;color:#fff}
.phBadge{align-self:center;padding:2px 8px;border-radius:5px;font-size:9px;font-weight:900;color:#fff;flex-shrink:0}
.phBadge.red{background:#a7222c}
.phBadge.blue{background:#1c5daa}
.phH{font-size:11px;font-weight:900;letter-spacing:1px;text-align:center;color:#ffe176;margin:0}
.phH.danger{color:#ff5963}
.phH.green{color:#75d868}
.phTimer{font-size:13px;font-weight:900;color:#ffe176;text-align:center;margin:0}
.phSmall{font-size:9px;color:#c5d3cb;text-align:center;line-height:1.3}
.phQR{background:#fff;border-radius:4px;padding:5px;display:flex;align-items:center;justify-content:center;width:70%;aspect-ratio:1;margin:2px auto;flex-shrink:0}
.phQR svg{width:100%;height:100%;display:block}
.phDogtag{position:relative;background:#3d6b52;border:2px solid #0e1c17;border-radius:6px;padding:7px;font-weight:900;color:#111;font-size:10px;text-align:center;letter-spacing:1px;box-shadow:inset 0 0 10px rgba(0,0,0,0.5);cursor:pointer;flex-shrink:0}
.phScanWrap{position:relative;cursor:pointer;border-radius:6px;overflow:hidden;background:#0b1813;flex-shrink:0}
.phScanImg{display:block;width:100%;height:auto;pointer-events:none}
.phScanOverlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,34,25,0.5);color:#fff;font-size:12px;font-weight:900;letter-spacing:2px;text-shadow:0 0 8px rgba(0,0,0,0.9)}
.phCam{background:#1e2a24;border-radius:6px;min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#7fa08d;border:2px dashed #354d40;text-align:center;padding:8px;cursor:pointer;box-sizing:border-box}
.phCam .cam{font-size:24px;line-height:1;margin-bottom:4px}
.phPanel{flex:1;min-height:50px;border-radius:6px;display:flex;align-items:center;justify-content:center;padding:4px;margin-top:auto}
.phPanel.red{background:#af222e}
.phPanel.blue{background:#1855a5}
.phPanel img{max-width:74%;max-height:56px;object-fit:contain;display:block}
.phCenter{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;flex:1}
.phList{font-size:10px;line-height:1.75;color:#e6efea;text-align:left;width:100%}
.phList b{color:#ffe176}
.phTip{font-size:10px;line-height:1.6;color:#e6efea;text-align:left;width:100%;display:flex;gap:6px;margin-bottom:5px;align-items:flex-start}
.phTip .ico{font-size:14px;line-height:1.2;flex-shrink:0}
.phInstallMenu{background:#354d40;color:#fff;padding:6px 8px;border-radius:8px;width:100%;max-width:200px;font-size:10px;margin:4px auto}
.phInstallMenu .row{padding:6px 4px;border-bottom:1px solid #14241b}
.phInstallMenu .row:last-child{border:0}
.phInstallMenu .hi{background:#b8e96b;color:#142219;font-weight:900;border-radius:4px;padding:6px 6px;text-align:center}
.phIdentity{background:#1b3429;color:#f5dc87;font-size:9px;text-align:center;padding:5px;border-radius:5px;line-height:1.4}

#demoStepRow{padding:6px 10px 8px;background:#10201a;border-top:1px solid #354d40;text-align:center}
#demoStepTxt{font-size:11px;color:#c5d3cb;letter-spacing:1px;line-height:1.3}
#demoStepTxt strong{color:#b8e96b}
#demoNext{width:100%;margin-top:6px;padding:10px;font-size:14px;font-weight:900;letter-spacing:2px;background:#b8e96b;color:#142219;border:0;border-radius:8px;cursor:pointer}

#demoClose{position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.9);color:#fff;border:2px solid #fff;border-radius:50%;width:34px;height:34px;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:50}

#demoChooser{flex:1;display:flex;flex-direction:column;gap:10px;padding:16px;justify-content:center}
#demoChooser h2{margin:0 0 6px 0;font-size:15px;color:#d4af37;text-align:center;letter-spacing:2px}
#demoChooser button{min-height:60px;font-size:14px;font-weight:900;letter-spacing:1px;border-radius:10px;padding:10px 16px;text-align:left;border:0;cursor:pointer}
#demoChooser button small{display:block;font-size:10px;font-weight:600;opacity:0.75;margin-top:3px;letter-spacing:0}
#demoChooser .primary{background:#b8e96b;color:#142219}
#demoChooser .secondary{background:#354d40;color:#fff}
#demoChooser .tertiary{background:#4a3d5c;color:#fff}

#demoEnd{position:absolute;inset:0;background:rgba(0,0,0,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;z-index:100}
#demoEnd.hidden{display:none}
#demoEnd h2{margin:0;color:#d4af37;font-size:18px;letter-spacing:2px;text-align:center}
#demoEnd .btnrow{display:flex;flex-direction:column;gap:8px;width:min(280px,80vw)}
#demoEnd button{width:100%;padding:12px;font-size:13px;font-weight:900;letter-spacing:1px;border:0;border-radius:9px;cursor:pointer}
`;

/* --- QR SVG --- */
const QRSVG=`<svg viewBox="0 0 29 29" xmlns="http://www.w3.org/2000/svg"><rect width="29" height="29" fill="#fff"/><rect x="0" y="0" width="7" height="7" fill="#000"/><rect x="1" y="1" width="5" height="5" fill="#fff"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="22" y="0" width="7" height="7" fill="#000"/><rect x="23" y="1" width="5" height="5" fill="#fff"/><rect x="24" y="2" width="3" height="3" fill="#000"/><rect x="0" y="22" width="7" height="7" fill="#000"/><rect x="1" y="23" width="5" height="5" fill="#fff"/><rect x="2" y="24" width="3" height="3" fill="#000"/><g fill="#000"><rect x="10" y="3" width="2" height="2"/><rect x="14" y="1" width="1" height="3"/><rect x="17" y="4" width="2" height="1"/><rect x="9" y="7" width="1" height="2"/><rect x="13" y="7" width="2" height="1"/><rect x="16" y="8" width="1" height="2"/><rect x="19" y="6" width="1" height="1"/><rect x="2" y="10" width="2" height="1"/><rect x="5" y="11" width="1" height="2"/><rect x="0" y="14" width="2" height="2"/><rect x="4" y="15" width="2" height="1"/><rect x="9" y="10" width="2" height="2"/><rect x="12" y="11" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="18" y="12" width="2" height="2"/><rect x="10" y="14" width="1" height="2"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="14" width="2" height="1"/><rect x="9" y="18" width="2" height="1"/><rect x="15" y="17" width="2" height="2"/><rect x="22" y="10" width="1" height="2"/><rect x="25" y="11" width="2" height="2"/><rect x="23" y="14" width="1" height="1"/><rect x="26" y="14" width="1" height="2"/><rect x="22" y="17" width="2" height="1"/><rect x="25" y="19" width="1" height="2"/><rect x="24" y="22" width="1" height="1"/><rect x="20" y="23" width="1" height="2"/><rect x="22" y="25" width="2" height="1"/><rect x="11" y="23" width="2" height="1"/><rect x="14" y="22" width="1" height="2"/><rect x="12" y="26" width="1" height="1"/><rect x="15" y="25" width="2" height="1"/><rect x="18" y="24" width="1" height="1"/></g></svg>`;

/* --- HELPERS --- */
function bar(states){return `<div class="phBar">${states.map(s=>`<span class="${s}"></span>`).join('')}</div>`}
function phHeader(){return `<div class="phHeader"><div class="phHeaderTitle">M·A·S·H <span class="unit">unit</span></div><div class="phHeaderSub">BY WAR ADVENTURES</div></div>`}
function wrap(content,center){return `${phHeader()}<div class="phContent${center?' center':''}">${content}</div>`}

/* --- TWO-PHONE MOCKUPS --- */
function scrReady(o){
 const col=o.team==='blue'?'blue':'red';
 const hitClass=o.hitTarget?'demoTarget':'';
 const medicClass=o.medicTarget?'demoTarget':'';
 return wrap(`
  ${bar(['LIVE','LIVE','LIVE','LIVE','LIVE'])}
  <button class="phBtn hit ${hitClass}" ${o.hitTarget?`data-tap="${o.hitTarget}"`:''}>I'M HIT</button>
  <button class="phBtn medic ${medicClass}" ${o.medicTarget?`data-tap="${o.medicTarget}"`:''}>MEDIC</button>
  <div class="phBadge ${col}">${o.name} : ${o.team==='blue'?'BLU':'RED'}</div>
  <div class="phPanel ${col}"><img src="./war-adventures-logo.png" alt=""></div>
 `);
}

function scrOffer(o){
 const img=o.scanImg||SCAN_MED;
 const scanClass=o.scanTarget?'demoTarget':'';
 const yellowBar=o.yellowTarget?`<span class="tappable" data-tap="${o.yellowTarget}"></span>`:`<span class="OFFERED"></span>`;
 const tagClass=o.tagTarget?'demoTarget':'';
 return wrap(`
  <div class="phBar"><span class="LOST"></span>${yellowBar}<span class="LIVE"></span><span class="LIVE"></span><span class="LIVE"></span></div>
  <p class="phH">LIFE 1 OFFERED</p>
  <p class="phTimer">4:56 remaining</p>
  <div class="phQR">${QRSVG}</div>
  <div class="phDogtag ${tagClass}" ${o.tagTarget?`data-tap="${o.tagTarget}"`:''}>${(o.name||'DUKE').toUpperCase()}'S TAGS</div>
  ${o.showScan?`<div class="phScanWrap ${scanClass}" ${o.scanTarget?`data-tap="${o.scanTarget}"`:''}><img class="phScanImg" src="${img}" alt=""><div class="phScanOverlay">SCAN</div></div>`:''}
 `);
}

function scrScan(o){
 const img=o.scanImg||SCAN_MED;
 const c=o.scanTarget?'demoTarget':'';
 return wrap(`<div class="phScanWrap ${c}" ${o.scanTarget?`data-tap="${o.scanTarget}"`:''}><img class="phScanImg" src="${img}" alt=""><div class="phScanOverlay">SCAN</div></div>`,true);
}

function scrCam(o){
 const c=o.camTarget?'demoTarget':'';
 return wrap(`
  <p class="phH">${o.label||'SCAN'}</p>
  <div class="phCam ${c}" ${o.camTarget?`data-tap="${o.camTarget}"`:''}><div class="cam">📷</div>Tap to scan</div>
  <button class="phBtn medic">Close camera</button>
 `);
}

function scrReturn(o){
 const lbl=o.type==='T'?'TAGS TAKEN':'HEALED';
 return wrap(`<p class="phH">${lbl}</p><div class="phQR">${QRSVG}</div><div class="phSmall">Show to ${o.name||'Duke'}</div>`,true);
}

function scrThanks(o){
 return wrap(`<p class="phH">THANKS</p><div class="phQR">${QRSVG}</div><div class="phSmall">Show to ${o.name||'Dibs'}</div>`,true);
}

function scrRespawn(o){
 const scanClass=o.scanTarget?'demoTarget':'';
 return wrap(`
  ${bar(['LOST','LIVE','LIVE','LIVE','LIVE'])}
  <p class="phH danger" style="font-size:13px;margin-top:6px">RESPAWN AT BASE</p>
  <div class="phSmall">Walk to your base and scan</div>
  <div class="phScanWrap ${scanClass}" ${o.scanTarget?`data-tap="${o.scanTarget}"`:''}><img class="phScanImg" src="${SCAN_BASE}" alt=""><div class="phScanOverlay">SCAN</div></div>
 `);
}

function scrBackIn(){
 return wrap(`
  ${bar(['LOST','LIVE','LIVE','LIVE','LIVE'])}
  <div class="phCenter"><p class="phH green" style="font-size:13px">BACK IN PLAY</p><div class="phSmall">Spent lives stay red</div></div>
 `);
}

function scrHealedConfirm(){
 return wrap(`<div class="phCenter"><p class="phH green" style="font-size:13px">HEALED DUKE</p><div class="phSmall">Assist recorded</div></div>`,true);
}

function scrDukeAfterHeal(){
 return wrap(`${bar(['LIVE','LIVE','LIVE','LIVE','LIVE'])}<div class="phCenter"><p class="phH green" style="font-size:13px">BACK IN PLAY</p><div class="phSmall">Full life restored</div></div>`);
}

/* --- SINGLE-PHONE MOCKUPS (Joining demo) --- */
function scrJoinReady(){
 return wrap(`
  ${bar(['LIVE','LIVE','LIVE','LIVE','LIVE'])}
  <div class="phCenter">
   <p class="phH">READY TO PLAY</p>
   <div class="phSmall">Wait for the host to show you a JOIN QR</div>
  </div>
 `);
}

function scrInstallMenu(){
 return wrap(`
  <div class="phCenter">
   <div style="font-size:10px;font-weight:900;color:#b8e96b;letter-spacing:2px;margin-bottom:6px">CHROME MENU</div>
   <div class="phInstallMenu">
    <div class="row">New tab</div>
    <div class="row">History</div>
    <div class="row hi">⬇ Install app</div>
    <div class="row">Add to Home screen</div>
   </div>
   <div class="phSmall" style="margin-top:8px">Tap "Install app" to add M.A.S.H. Unit to your home screen</div>
  </div>
 `,true);
}

function scrJoinButton(){
 return wrap(`
  <div class="phCenter">
   <p class="phH">PLAYER</p>
   <button class="phBtn hit" style="margin-top:6px">SCAN TEAM JOIN QR</button>
   <button class="phBtn medic">MY ARMOURY</button>
   <button class="phBtn medic">TRY A DEMO</button>
   <div class="phSmall" style="margin-top:8px">Tap the top button to open the scanner</div>
  </div>
 `);
}

function scrHostList(){
 return wrap(`
  <div style="font-size:10px;font-weight:900;color:#ffe176;text-align:center;margin-bottom:6px">WHAT THE HOST SETS</div>
  <div class="phList">
   <div>• <b>Game name</b> — e.g. WAR7</div>
   <div>• <b>Lives</b> — 1–20 or Unlimited</div>
   <div>• <b>Bleedout</b> — 30 to 600 seconds</div>
   <div>• <b>Medic rule</b> — none / one-scan / two-scan</div>
   <div>• <b>Red label</b> — 1–12 chars, e.g. NZ1</div>
   <div>• <b>Blue label</b> — 1–12 chars, e.g. AUS</div>
   <div>• <b>Red base</b> — from the field list</div>
   <div>• <b>Blue base</b> — from the field list</div>
  </div>
 `);
}

function scrIdentity(){
 return wrap(`
  ${bar(['LIVE','LIVE','LIVE','LIVE','LIVE'])}
  <div class="phBadge red">DUKE : NZ1</div>
  <div class="phIdentity" style="margin-top:6px">
   DUKE · RED NZ1 @ CHURCH<br>WAR7 · 5 LIVES · 300s · NO MEDIC
  </div>
  <div class="phSmall" style="margin-top:8px;padding:0 6px">This line always shows on the play screen:<br>your callsign, team, base, game name, and rules.</div>
 `,true);
}

function scrMapTip(){
 return wrap(`
  <div style="flex:1;position:relative;border-radius:6px;overflow:hidden;background:#000;min-height:120px">
   <img src="./map1.jpeg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.85">
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
    <g stroke="black" stroke-width="0.3" fill="none" opacity="0.6">
     <path d="M0,0 L0,100 M10,0 L10,100 M20,0 L20,100 M30,0 L30,100 M40,0 L40,100 M50,0 L50,100 M60,0 L60,100 M70,0 L70,100 M80,0 L80,100 M90,0 L90,100"/>
     <path d="M0,0 L100,0 M0,10 L100,10 M0,20 L100,20 M0,30 L100,30 M0,40 L100,40 M0,50 L100,50 M0,60 L100,60 M0,70 L100,70 M0,80 L100,80 M0,90 L100,90"/>
    </g>
   </svg>
   <div style="position:absolute;left:48%;top:62%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#0080ff;border:2px solid #fff;box-shadow:0 0 8px rgba(0,128,255,0.9)"></div>
   <div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.85);color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;letter-spacing:1px">GRID</div>
   <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.85);color:#b8e96b;font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;letter-spacing:1px">ME ±4m</div>
  </div>
  <div class="phSmall" style="margin-top:6px;line-height:1.5">Pinch to zoom. Drag to pan. Double-tap to close.<br>Grid shows all field landmarks. Me shows your GPS dot.</div>
 `,true);
}

function scrPrepTips(){
 return wrap(`
  <div class="phCenter" style="justify-content:flex-start;padding-top:10px">
   <div style="font-size:11px;font-weight:900;color:#ffe176;letter-spacing:2px;margin-bottom:8px">BEFORE YOU GO</div>
   <div class="phTip"><span class="ico">✈️</span><div><b>Airplane mode:</b> turn it on and check the app opens. It works fully offline.</div></div>
   <div class="phTip"><span class="ico">🔆</span><div><b>Brightness:</b> max it. Field scanning needs a bright screen.</div></div>
   <div class="phTip"><span class="ico">🔋</span><div><b>Battery:</b> close other apps. GPS drains faster.</div></div>
   <div class="phTip"><span class="ico">💾</span><div><b>Backup:</b> export your log from Events before clearing browser data.</div></div>
   <div class="phTip"><span class="ico">🎒</span><div><b>Career:</b> your armoury survives updates but not full storage clear. Back it up with a career QR.</div></div>
  </div>
 `);
}

function scrOutlastTease(){
 return wrap(`
  <div class="phCenter">
   <div style="font-size:44px;line-height:1">☠️</div>
   <div style="font-size:16px;font-weight:900;color:#ff5963;letter-spacing:3px;margin-top:8px">OUTLAST</div>
   <div class="phSmall" style="margin-top:10px;line-height:1.6">A shrinking boundary.<br>One life. No respawn.<br>Only one winner.</div>
   <div style="font-size:11px;font-weight:900;color:#d4af37;text-align:center;margin-top:14px;letter-spacing:1px">Come to a game and find out.<br>— if you dare.</div>
  </div>
 `,true);
}

/* --- DEMO SCRIPTS --- */
function buildDemos(){
 return {
  joining:{
   title:'JOINING THE M.A.S.H. UNIT',
   single:true,
   steps:[
    {text:`<span class="h">WELCOME</span>M.A.S.H. Unit is your phone-based airsoft HUD. It tracks your lives, records tag grabs and medic heals, and shows you the field map. It runs entirely offline — no signal, no server, no accounts.<br><br><strong>Tap NEXT to continue.</strong>`,phone:scrJoinReady,next:true},
    {text:`<span class="h">STEP 1 · INSTALL</span>Open Chrome and go to <strong>mashwar.club</strong>. Wait for the page to load. Tap the Chrome menu (three dots) and choose <strong>Install app</strong>. The M.A.S.H. Unit icon will appear on your home screen.<br><br>After install, the app never needs internet again.`,phone:scrInstallMenu,next:true},
    {text:`<span class="h">STEP 2 · JOIN</span>Open the app. Tap <strong>SCAN TEAM JOIN QR</strong>. Point your camera at the QR the host shows you. Enter a callsign. That's it — team is locked and you're in.`,phone:scrJoinButton,next:true},
    {text:`<span class="h">WHAT THE HOST SETS</span>Before the game starts, the host locks in the rules. You cannot change them once you join. Here is everything they choose:`,phone:scrHostList,next:true},
    {text:`<span class="h">WHERE YOU SEE IT</span>All the host's settings appear on your play screen, so you always know the rules, your team, and your base.`,phone:scrIdentity,next:true},
    {text:`<span class="h">THE FIELD MAP</span>Tap <strong>MAP</strong> on the ready screen. <strong>Pinch to zoom</strong> with two fingers. <strong>Drag</strong> to pan. <strong>Double-tap</strong> or tap <strong>✕</strong> to close.<br><br>Tap <strong>Grid</strong> to show a 10m reference grid plus every landmark on the field. Tap <strong>Me</strong> to turn on live GPS — a blue dot shows your position.`,phone:scrMapTip,next:true},
    {text:`<span class="h">BEFORE YOU GO</span>A few things worth doing before every game day.`,phone:scrPrepTips,next:true},
    {text:`<span class="h">ONE MORE THING</span>Some games are a mode called OUTLAST. A shrinking boundary. One life. No respawn. Only one winner. You'll see it when it happens.`,phone:scrOutlastTease,next:true},
    {text:`<span class="h">YOU'RE READY</span>That's everything. Turn up on Sunday, find the host, scan the JOIN QR, and play.<br><br>Play hard. Play fair. Call your hits.<br><br>— War Adventures`,phone:scrJoinReady,next:true}
   ]
  },
  standard:{
   title:'STANDARD GAME',
   left:{name:'Duke',team:'red',role:'Player'},
   right:{name:'Jacko',team:'blue',role:'Enemy Reaper'},
   steps:[
    {
     leftTxt:`<span class="h">DUKE</span>Duke has just been hit. He's raised his hand, called HIT, and moved to cover. He taps I'M HIT on his phone to open the tag exchange.<br><br><strong>Tap Duke's I'M HIT button.</strong>`,
     rightTxt:`<span class="h">JACKO</span>Jacko is the enemy Reaper. He's on the opposite team. He hasn't seen Duke yet.`,
     left:()=>scrReady({name:'Duke',team:'red',hitTarget:'t1'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left',target:'t1'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke's phone opened his offer QR and started a 5-minute bleedout timer. He must keep this QR showing so a Reaper can scan it. He cannot move yet.`,
     rightTxt:`<span class="h">JACKO</span>Jacko spots Duke. He needs to scan Duke's offer QR to take his tags.<br><br><strong>Tap Jacko's SCAN button.</strong>`,
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD}),
     right:()=>scrScan({scanImg:SCAN_STD,scanTarget:'t2'}),
     flash:'right',target:'t2'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke keeps his offer QR showing. Timer still counting down.`,
     rightTxt:`<span class="h">JACKO</span>Jacko's camera is open. He points it at Duke's offer QR.<br><br><strong>Tap the camera on Jacko's phone.</strong>`,
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD}),
     right:()=>scrCam({label:'SCAN TAGS',camTarget:'t3'}),
     flash:'right',target:'t3'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke still showing his tags. Bleedout timer is still running.<br><br>Jacko has scanned Duke's tags. Duke's tags are now on Jacko's phone as a TAGS TAKEN receipt — but the grab is NOT confirmed yet.`,
     rightTxt:`<span class="h">JACKO</span>Jacko's phone shows a TAGS TAKEN QR. He walks to Duke and presses the TAG button (the dog tag) on Duke's phone. This is how the grab gets confirmed.`,
     left:()=>scrOffer({name:'Duke',scanImg:SCAN_STD,tagTarget:'t4'}),
     right:()=>scrReturn({type:'T',name:'Duke'}),
     flash:'left',target:'t4'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Jacko pressed the TAG button on Duke's phone. Duke's camera opened automatically. He must now scan Jacko's TAGS TAKEN QR to complete the exchange.<br><br><strong>Tap the camera on Duke's phone.</strong>`,
     rightTxt:`<span class="h">JACKO</span>Jacko holds his TAGS TAKEN QR steady for Duke to scan.`,
     left:()=>scrCam({label:'SCAN TAGS TAKEN',camTarget:'t5'}),
     right:()=>scrReturn({type:'T',name:'Duke'}),
     flash:'left',target:'t5'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke scanned the TAGS TAKEN QR. The grab is confirmed. Jacko now owns Duke's tags. Duke's bleedout timer stops and his life goes red. He can now walk to his base.<br><br><strong>Tap the SCAN button on Duke's phone at the base.</strong>`,
     rightTxt:`<span class="h">JACKO</span>Jacko's receipt is signed on both phones. He has scored the tags. Jacko moves on.`,
     left:()=>scrRespawn({scanTarget:'t6'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left',target:'t6'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke is at his base. His camera is open to scan the base QR.<br><br><strong>Tap the camera on Duke's phone.</strong>`,
     rightTxt:`<span class="h">JACKO</span>`,
     left:()=>scrCam({label:'SCAN BASE',camTarget:'t7'}),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left',target:'t7'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke scanned the base QR. He's back in play with the spent life still showing red.`,
     rightTxt:`<span class="h">JACKO</span>Demo complete.`,
     left:()=>scrBackIn(),
     right:()=>scrReady({name:'Jacko',team:'blue'}),
     flash:'left',target:null
    }
   ]
  },
  medic:{
   title:'MEDIC GAME',
   left:{name:'Duke',team:'red',role:'Player'},
   right:{name:'Dibs',team:'red',role:'Teammate Medic'},
   steps:[
    {
     leftTxt:`<span class="h">DUKE</span>Duke has just been hit. He's called HIT and taken cover. He taps I'M HIT on his phone to open the offer QR.<br><br><strong>Tap Duke's I'M HIT button.</strong>`,
     rightTxt:`<span class="h">DIBS</span>Dibs is on Duke's team. She's the squad medic. She hasn't seen Duke get hit yet.`,
     left:()=>scrReady({name:'Duke',team:'red',hitTarget:'m1'}),
     right:()=>scrReady({name:'Dibs',team:'red'}),
     flash:'left',target:'m1'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke's offer QR is showing. Bleedout timer running. A medic can still save him if they reach him in time.`,
     rightTxt:`<span class="h">DIBS</span>Dibs sees Duke is hit. She taps MEDIC to open her scanner.<br><br><strong>Tap Dibs's MEDIC button.</strong>`,
     left:()=>scrOffer({name:'Duke'}),
     right:()=>scrReady({name:'Dibs',team:'red',medicTarget:'m2'}),
     flash:'right',target:'m2'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke keeps his tags showing. Timer still running.`,
     rightTxt:`<span class="h">DIBS</span>Dibs's camera is open. She points it at Duke's offer QR.<br><br><strong>Tap the camera on Dibs's phone.</strong>`,
     left:()=>scrOffer({name:'Duke'}),
     right:()=>scrCam({label:'SCAN OFFER',camTarget:'m3'}),
     flash:'right',target:'m3'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Dibs scanned Duke's offer. Duke's tags are now on Dibs's phone as a HEALED receipt. But the heal is NOT confirmed until Dibs presses Duke's yellow life bar.<br><br><strong>Tap the yellow segment on Duke's phone.</strong>`,
     rightTxt:`<span class="h">DIBS</span>Dibs's phone shows HEALED. She walks to Duke and presses the yellow life bar on his phone.`,
     left:()=>scrOffer({name:'Duke',yellowTarget:'m4'}),
     right:()=>scrReturn({type:'H',name:'Duke'}),
     flash:'left',target:'m4'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Dibs pressed Duke's yellow bar. Duke's camera opened automatically to scan Dibs's HEALED QR.<br><br><strong>Tap the camera on Duke's phone.</strong>`,
     rightTxt:`<span class="h">DIBS</span>Dibs holds her HEALED QR steady for Duke to scan.`,
     left:()=>scrCam({label:'SCAN HEALED',camTarget:'m5'}),
     right:()=>scrReturn({type:'H',name:'Duke'}),
     flash:'left',target:'m5'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke scanned HEALED. His life is green again. His phone now shows a THANKS QR for Dibs. Dibs needs to scan it to record her assist.<br><br><strong>Tap the SCAN button on Dibs's phone.</strong>`,
     rightTxt:`<span class="h">DIBS</span>Dibs must scan Duke's THANKS QR to log the medic assist on her phone.`,
     left:()=>scrThanks({name:'Dibs'}),
     right:()=>scrScan({scanImg:SCAN_MED,scanTarget:'m6'}),
     flash:'right',target:'m6'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke holds his THANKS QR steady.`,
     rightTxt:`<span class="h">DIBS</span>Dibs's camera is open.<br><br><strong>Tap the camera on Dibs's phone.</strong>`,
     left:()=>scrThanks({name:'Dibs'}),
     right:()=>scrCam({label:'SCAN THANKS',camTarget:'m7'}),
     flash:'right',target:'m7'
    },
    {
     leftTxt:`<span class="h">DUKE</span>Duke is fully back in play. His life bar is green. He rejoins the fight.`,
     rightTxt:`<span class="h">DIBS</span>Dibs scanned the THANKS QR. The medic assist is recorded. Demo complete.`,
     left:()=>scrDukeAfterHeal(),
     right:()=>scrHealedConfirm(),
     flash:'right',target:null
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
  <button id="demoClose">✕</button>
  <div id="demoBody"></div>
  <div id="demoStepRow"><div id="demoStepTxt"></div></div>
  <div id="demoEnd" class="hidden"></div>
 `;
 document.body.appendChild(o);
 $('demoClose').onclick=close;
}

/* --- RENDER --- */
function renderChooser(){
 $('demoBody').innerHTML='';
 $('demoStepRow').innerHTML='<div id="demoStepTxt"></div>';
 $('demoEnd').classList.add('hidden');
 const wrap=document.createElement('div');
 wrap.id='demoChooser';
 wrap.innerHTML=`
  <h2>TRY A DEMO</h2>
  <button class="primary" data-mode="joining">JOINING M.A.S.H. UNIT<small>New player? Start here. 3 minute tour.</small></button>
  <button class="secondary" data-mode="standard">STANDARD GAME<small>5 lives · 300s bleedout · no medic</small></button>
  <button class="secondary" data-mode="medic">MEDIC GAME<small>5 lives · 300s bleedout · one-scan medic</small></button>
 `;
 $('demoBody').appendChild(wrap);
 wrap.querySelectorAll('button[data-mode]').forEach(b=>{b.onclick=()=>{state={mode:b.getAttribute('data-mode'),step:0};render()}});
}

function render(){
 const d=demos[state.mode];if(!d)return renderChooser();
 const step=d.steps[state.step];
 if(!step){endScreen();return}
 $('demoEnd').classList.add('hidden');
 if(d.single){
  $('demoBody').innerHTML=`
   <div class="demoCol" style="margin:4px">
    <div class="demoColText">${step.text||''}</div>
    <div class="demoColPhone">${step.phone()}</div>
   </div>
  `;
 }else{
  $('demoBody').innerHTML=`
   <div class="demoCol${step.flash==='left'?' flash':''}">
    <div class="demoColText">${step.leftTxt||'—'}</div>
    <div class="demoColPhone">${step.left()}</div>
   </div>
   <div class="demoCol${step.flash==='right'?' flash':''}">
    <div class="demoColText">${step.rightTxt||'—'}</div>
    <div class="demoColPhone">${step.right()}</div>
   </div>
  `;
 }
 const last=state.step===d.steps.length-1;
 const btn=step.next?`<button id="demoNext">${last?'FINISH':'NEXT →'}</button>`:'';
 $('demoStepRow').innerHTML=`<div id="demoStepTxt"><strong>${d.title}</strong> · Step ${state.step+1} of ${d.steps.length}${step.target||step.next?'':' · Demo complete'}</div>${btn}`;
 if(step.next){
  $('demoNext').onclick=()=>{buzz(20);if(last)endScreen();else{state.step++;render()}};
 }
 if(step.target){
  const el=$('demoBody').querySelector(`[data-tap="${step.target}"]`);
  if(el){el.onclick=()=>{buzz(25);state.step++;render();}};
 }
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
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
