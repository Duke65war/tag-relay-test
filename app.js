(()=>{'use strict';
const KEY='mash-unit-v4',HOST='mash-unit-v4-host',ANCHOR_KEY='mash-unit-anchors',CAREER_KEY='mash-unit-career',JOINS_KEY='mash-unit-joins',V='MU4',$=id=>document.getElementById(id),time=()=>Date.now(),hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
const RELEASE='P2-2026-11-10-01';
const HOST_MODE=(()=>{try{return typeof window!=='undefined'&&window.MASH_MODE==='host'}catch(e){return false}})();
const BASES={
 'Jb':{lat:-37.308088,lng:174.688677,group:'main'},
 'Diego Garcia':{lat:-37.306542,lng:174.690556,group:'main'},
 'Plokstine':{lat:-37.308096,lng:174.690661,group:'main'},
 'Church':{lat:-37.307203,lng:174.689177,group:'main'},
 'Tramp':{lat:-37.307149,lng:174.688747,group:'secondary'},
 'Jail':{lat:-37.307804,lng:174.689032,group:'secondary'},
 'Bonfire':{lat:-37.307160,lng:174.690905,group:'secondary'},
 'L-shed':{lat:-37.307798,lng:174.689366,group:'secondary'},
 'Gulag':{lat:-37.307002,lng:174.689703,group:'secondary'},
 'Safe Zone':{lat:-37.308053,lng:174.689799,group:'safe'}
};
const ANCHOR_LOCS={
 'Bird Rd Cnr':{lat:-37.306483,lng:174.688893},
 'Bonfire':{lat:-37.307160,lng:174.690905}
};
const DEFAULT_ANCHORS={
 'a':{lat:-37.306483,lng:174.688893,xPct:0.1923450894762124,yPct:0.056696830737264635,name:'Bird Rd Cnr'},
 'b':{lat:-37.30716,lng:174.690905,xPct:0.7685248202114145,yPct:0.2495413444810016,name:'Bonfire'}
};
const GUNS={
 'ak47':{name:'AK-47',tier:'Veteran',img:'./armoury/Ak47b-1.png'},
 'ames85':{name:'Ames 85',tier:'Service',img:'./armoury/Ames85.png'},
 'deagle':{name:'Desert Eagle',tier:'Elite',img:'./armoury/de-1.png'},
 'g36c':{name:'G36C',tier:'Prototype',img:'./armoury/G36c1.png'},
 'knife':{name:'Combat Knife',tier:'Field',img:'./armoury/Knife-1.png'},
 'm60':{name:'M60',tier:'Veteran',img:'./armoury/M60vn-1.png'},
 'mac10':{name:'MAC-10',tier:'Field',img:'./armoury/mac10-1.png'},
 'shotgun':{name:'Shotgun',tier:'Service',img:'./armoury/Shot1.png'}
};
const GUN_ORDER=['ak47','ames85','deagle','g36c','knife','m60','mac10','shotgun'];
const TIER_COLOUR={Field:'#888888',Service:'#b0b8c0',Veteran:'#3d6b57',Elite:'#d4af37',Prototype:'#e67e22'};
const FIVE_WEEKS=5*7*24*60*60*1000,EIGHT_WEEKS=8*7*24*60*60*1000;
const OUTLAST_BLEEDOUT=120000;
const OUTLAST_END_RADIUS=5;
let s=null,h=null,pending=null,view='choice',scanner=null,busy=false,offerShown='',offerSlot=-1,currentScanMode='normal',anchors=null,mapWatchId=null,calibrating=null,career=null,joins=[];
let lastGpsPos=null,boundaryWatchId=null,outOfBoundsSince=0,lastGpsBuzz=0,placingTarget=false,hostMode='standard',hostTarget=null,hostBatch=[],hostBatchDate='',batchMode='standard',batchTarget=null,hostScheduleId=null;
let lastOutlastLive=null,lastOutlastStep=null,lastHostOutlastLive=null,lastHostOutlastStep=null;
let pendingScanAction=null;
let previewFromMyGames=false;
let lastShrinkWarn=null;
const idOK=x=>typeof x==='string'&&/^[0-9a-f]{24}$/.test(x),labelOK=x=>typeof x==='string'&&/^[A-Z0-9.]{1,12}$/.test(x),nameOK=x=>typeof x==='string'&&x.trim().length>0&&x.length<=32;
const ruleOK=r=>r&&(/^(U|[1-9]|1[0-9]|20)$/.test(String(r.lives)))&&Number.isInteger(r.seconds)&&r.seconds>=30&&r.seconds<=600&&['none','one','two'].includes(r.medic)&&labelOK(r.a)&&labelOK(r.b)&&r.a!==r.b;
const ruleText=r=>`${r.lives==='U'?'Unlimited':r.lives+' lives'} · ${r.seconds}s · ${r.medic==='none'?'no medic':r.medic==='one'?'one-scan medic':'two-scan medic (30s)'} · ${r.respawnMode==='timed'?'Timed Respawn':'Base Respawn'}`;
const outlastRuleText=o=>`OUTLAST · ${o.startRadius}m → 5m · −${o.step}m every ${o.intervalMin}min · starts ${new Date(o.startEpoch).toLocaleString([],{dateStyle:'short',timeStyle:'short'})}`;
function note(x){const el=$('notice');if(el)el.textContent=x||''}function record(x,m){x.events.push({at:new Date().toISOString(),message:m})}
function buzz(kind){try{if(!navigator.vibrate)return;const p=kind==='elim'?[300,100,300,100,300]:kind==='start'?[500,200,500,200,500]:kind==='shrinkwarn'?[150]:kind==='shrink10'?[150,100,150]:[200,100,200];navigator.vibrate(p)}catch(e){}}
function persist(x){try{localStorage.setItem(KEY,JSON.stringify(x));s=x;render();return true}catch(e){note('SAVE FAILED. Do not continue play; browser storage unavailable.');return false}}
function edit(fn){if(!s)return false;let x=JSON.parse(JSON.stringify(s));fn(x);return persist(x)}
function saveHost(x){try{localStorage.setItem(HOST,JSON.stringify(x));h=x;return true}catch(e){note('Host setup could not be saved. Do not share game QRs.');return false}}
function makeQR(node,text,size=216){if(!node)return;node.replaceChildren();if(typeof QRCode!=='function'){node.textContent='QR library not loaded.';return}try{new QRCode(node,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M})}catch(e){node.textContent='QR drawing failed'}}
function releaseTag(){return 'M.A.S.H. '+RELEASE;}
/* --- CAREER --- */
function loadCareer(){try{const raw=localStorage.getItem(CAREER_KEY);if(raw){const c=JSON.parse(raw);if(c&&typeof c.lastPlayed==='number'&&Array.isArray(c.artefacts)){career=c;if(!Array.isArray(career.outlastWins))career.outlastWins=[];if(typeof career.lifetimeTags!=='number')career.lifetimeTags=0;if(typeof career.lifetimeMedics!=='number')career.lifetimeMedics=0;return}}}catch(e){}career={lastPlayed:Date.now(),artefacts:[],outlastWins:[],lifetimeTags:0,lifetimeMedics:0}}
function saveCareer(){try{localStorage.setItem(CAREER_KEY,JSON.stringify(career));return true}catch(e){note('Career save failed.');return false}}
function careerState(){const elapsed=time()-career.lastPlayed;if(elapsed>=EIGHT_WEEKS)return 'deleted';if(elapsed>=FIVE_WEEKS)return 'dormant';return 'active'}
function careerPurgeIfExpired(){if(careerState()==='deleted'){career.artefacts=[];career.lastPlayed=time();saveCareer()}}
function careerVariantsFor(gunId){return career.artefacts.filter(a=>a.gunId===gunId).sort((a,b)=>b.claimedAt-a.claimedAt)}
function careerHas(artifactId){return career.artefacts.some(a=>a.artifactId===artifactId)}
function careerAdd(gunId,gameName,artifactId){if(careerHas(artifactId))return false;career.artefacts.push({artifactId,gunId,gameName,claimedAt:time()});saveCareer();return true}
function careerAddOutlastWin(gid,hostStamp){if(!career.outlastWins)career.outlastWins=[];const key=gid+'_'+hostStamp;if(career.outlastWins.some(w=>w.key===key))return false;career.outlastWins.push({key,gid,at:time()});saveCareer();return true}
/* --- JOINS --- */
function loadJoins(){try{const raw=localStorage.getItem(JOINS_KEY);if(raw){const j=JSON.parse(raw);if(Array.isArray(j)){joins=j;return}}}catch(e){}joins=[]}
function saveJoins(list){try{localStorage.setItem(JOINS_KEY,JSON.stringify(list));return true}catch(e){note('Failed to save games to phone');return false}}
function updateJoinsStatus(){
 joins.forEach(j=>{
  if(j.status==='COMPLETED')return;
  if(j.status==='SCHEDULE_UNAVAILABLE')return;
  if(!Number.isFinite(j.startEpoch)||j.startEpoch<=0){j.status='SCHEDULE_UNAVAILABLE';return;}
  const now=time();
  const windowOpen=j.startEpoch-(30*60*1000);
  const windowClose=j.startEpoch+(30*60*1000);
  if(now<windowOpen)j.status='WAITING';
  else if(now>=windowOpen&&now<=windowClose)j.status='READY';
  else j.status='EXPIRED';
 });
}
function launchGame(gid){
 const j=joins.find(x=>x.gid===gid);
 if(!j)return;
 updateJoinsStatus();
 if(j.status!=='READY'){note('Joining is not open for this game.');return}
 pending=j.payload;
 previewFromMyGames=true;
 if(!pending.name){view='preview';render();note('Enter your callsign.');}
 else { join(); }
}
/* --- HELPERS --- */
function distanceMeters(lat1,lng1,lat2,lng2){const latAvg=((lat1+lat2)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const dx=(lng2-lng1)*mLng;const dy=(lat2-lat1)*mLat;return Math.hypot(dx,dy)}
function playerHostNow(){return time()}
function currentRadius(o,hostNow){if(!o)return null;if(hostNow<o.startEpoch)return o.startRadius;const elapsed=hostNow-o.startEpoch;const iv=o.intervalMs||(o.intervalMin?o.intervalMin*60000:60000);const steps=Math.floor(elapsed/iv);const r=o.startRadius-steps*o.step;return Math.max(o.endRadius,r)}
/* --- QR CODES --- */
const code=(type,...values)=>JSON.stringify([V,type,...values]);
const joinArray=(gd,t)=>{
 if(gd.mode==='outlast'){
  return [V,'J',gd.gid,gd.game,1,120,'none','S','T','S','outlast',gd.startEpoch,time(),gd.targetLat,gd.targetLng,gd.startRadius,OUTLAST_END_RADIUS,gd.step,gd.intervalMs,gd.scheduleId||null,gd.totalGames||null];
 }
 const baseLoc = t==='A' ? gd.baseA : gd.baseB;
 const b = BASES[baseLoc] || {lat:0, lng:0};
 const sign = t==='A' ? (gd.signA||'R1') : (gd.signB||'B1');
 return [V,'J',gd.gid,gd.game,gd.rules.lives,gd.rules.seconds,gd.rules.medic,gd.rules.a,gd.rules.b,t,sign,b.lat,b.lng,gd.rules.respawnMode,gd.startEpoch,gd.scheduleId||null,gd.totalGames||null];
};
const joinCode=t=>{
 if(h.mode==='outlast'&&h.outlast){
  return code('J',h.gid,h.game,1,120,'none','S','T','S','outlast',h.outlast.startEpoch,time(),h.outlast.targetLat,h.outlast.targetLng,h.outlast.startRadius,OUTLAST_END_RADIUS,h.outlast.step,h.outlast.intervalMin*60000,h.scheduleId||null,h.totalGames||null);
 }
 return JSON.stringify(joinArray(h,t));
};
const artifactCode=(gunId,artifactId,gid,game)=>code('A',gid,game,gunId,artifactId);
const winnerCode=()=>code('W',h.gid,time());
function offerCode(){let o=s.offer,r=s.rules;return code('O',s.gid,r.lives,r.seconds,r.medic,r.a,r.b,s.team,s.id,s.name,o.n,o.id,o.at,o.deadline,Math.floor(time()/8000))}
function returnCode(type,owner,offer){return code(type,s.gid,offer.id,owner.id,owner.name,offer.deadline||0)}
function thanksCode(offerId,medicId,victimName,deadline){return code('K',s.gid,offerId,medicId,victimName,deadline)}
function parse(raw){let a;try{a=JSON.parse(String(raw||'').trim())}catch(e){throw Error('Not a valid M.A.S.H. QR')}if(!Array.isArray(a)||a[0]!==V||!['J','B','O','T','H','K','A','W','SIGN','BATCH'].includes(a[1]))throw Error('Wrong game QR version or type');return a}
function validateScheduleMeta(sId,total,existing){
  const hasId=sId!==null&&sId!==undefined;
  const hasTotal=total!==null&&total!==undefined;
  if(!hasId&&!hasTotal)return {scheduleId:null,totalGames:null};
  if(hasId&&hasTotal){
    if(!idOK(sId))throw Error('Invalid scheduleId format.');
    if(!Number.isSafeInteger(total)||total<1||total>20)throw Error('Invalid totalGames.');
    if(existing){
      const conflict=joins.find(j=>j.scheduleId===sId&&j.totalGames!==null&&j.totalGames!==total);
      if(conflict)throw Error('Schedule '+sId.slice(0,8)+' already has '+conflict.totalGames+' games, this QR says '+total+'. Regenerate consistent QRs.');
    }
    return {scheduleId:sId,totalGames:total};
  }
  throw Error('Incomplete schedule metadata. Ask host to regenerate.');
}
function countUniqueForSchedule(sId){
  const seen=new Set();
  joins.forEach(j=>{if(j.scheduleId===sId)seen.add(j.gid);});
  return seen.size;
}
function persistCandidate(candidate){
  return new Promise(resolve=>{
    const ok=saveJoins(candidate);
    resolve(ok);
  });
}
function getJoin(raw){
 let a=parse(raw);
 if(a[1]==='BATCH'){
   if(!Array.isArray(a[2]))throw Error('Malformed batch');
   const validated=[];
   let duplicateCount=0;
   for(const j of a[2]){
     let p;try{p=parse(JSON.stringify(j))}catch(e){throw Error('Batch contains an invalid entry.')}
     if(p[1]!=='J')throw Error('Batch contains a non-JOIN entry.');
     if(p.length>=19&&p[10]==='outlast'){
        const gid=p[2],game=p[3],startEpoch=p[11],hostNow=p[12],targetLat=p[13],targetLng=p[14],startRadius=p[15],endRadius=p[16],step=p[17],intervalMs=p[18];
        if(joins.some(x=>x.gid===gid)){duplicateCount++;continue;}
        validated.push({gid,game,startEpoch,scheduleId:null,totalGames:null,status:'WAITING',payload:{gid,game,rules:{lives:'1',seconds:120,medic:'none',a:'S',b:'T',respawnMode:'base'},team:'S',mode:'outlast',outlast:{targetLat,targetLng,startRadius,endRadius,step,intervalMs,startEpoch,offset:0}}});
     } else if(p.length>=15&&['A','B'].includes(p[9])){
        const gid=p[2],game=p[3];
        let rules={lives:String(p[4]),seconds:p[5],medic:p[6],a:p[7],b:p[8],respawnMode:p[13]||'base'};
        if(!ruleOK(rules))throw Error('Invalid game settings in batch');
        const startEpoch=p[14];
        if(joins.some(x=>x.gid===gid)){duplicateCount++;continue;}
        validated.push({gid,game,startEpoch,scheduleId:null,totalGames:null,status:Number.isSafeInteger(startEpoch)&&startEpoch>0?'WAITING':'SCHEDULE_UNAVAILABLE',payload:{gid,game,rules,team:p[9],mode:'standard',baseSign:p[10],baseLat:p[11],baseLng:p[12]}});
     } else throw Error('Unrecognised batch entry.');
   }
   if(validated.length===0&&duplicateCount>0){note('All games already saved.');return;}
   if(validated.length===0)throw Error('No games in batch');
   const candidate=joins.concat(validated);
   if(!saveJoins(candidate)){throw Error('Could not save games. Try again.');}
   joins=candidate;
   if(!career.callsign){view='profileSetup';render();note('Enter your callsign.');}
   else {view='myGames';render();note(validated.length+' games added.');}
   return;
 }
 if(a[1]!=='J')throw Error('Not a valid team JOIN QR');
 if(HOST_MODE&&h&&h.gid!==a[2])throw Error('Host setup belongs to another game.');
 if(a.length>=19&&a[10]==='outlast'){
  const gid=a[2],game=a[3];
  if(!idOK(gid)||typeof game!=='string'||!/^[A-Z0-9 _-]{3,18}$/.test(game))throw Error('Invalid game');
  const startEpoch=a[11],targetLat=a[13],targetLng=a[14],startRadius=a[15],endRadius=a[16],step=a[17],intervalMs=a[18];
  if(!Number.isFinite(startEpoch)||!Number.isFinite(targetLat)||!Number.isFinite(targetLng))throw Error('Invalid OUTLAST data');
  if(!Number.isFinite(startRadius)||!Number.isFinite(endRadius)||!Number.isFinite(step)||!Number.isFinite(intervalMs))throw Error('Invalid OUTLAST schedule');
  let sId=null,tot=null;
  if(a.length>=21){const meta=validateScheduleMeta(a[19],a[20],true);sId=meta.scheduleId;tot=meta.totalGames;}
  const entry={gid,game,startEpoch,scheduleId:sId,totalGames:tot,status:Number.isSafeInteger(startEpoch)&&startEpoch>0?'WAITING':'SCHEDULE_UNAVAILABLE',payload:{gid,game,rules:{lives:'1',seconds:120,medic:'none',a:'S',b:'T',respawnMode:'base'},team:'S',mode:'outlast',outlast:{targetLat,targetLng,startRadius,endRadius,step,intervalMs,startEpoch,offset:0}}};
  const existing=joins.find(x=>x.gid===gid);
  if(existing){
    if(existing.status==='COMPLETED'){note('This game is already completed.');return;}
    if(s&&s.gid===gid){note('This game is in progress.');return;}
    const changed=existing.startEpoch!==startEpoch;
    if(!changed){note('Already saved.');return;}
    if(!confirm('Update saved game?\nOld start: '+new Date(existing.startEpoch).toLocaleString()+'\nNew start: '+new Date(startEpoch).toLocaleString())){note('No change.');return;}
    const candidate=joins.map(j=>j.gid===gid?{...entry}:j);
    if(!saveJoins(candidate)){throw Error('Could not update. Try again.');}
    joins=candidate;
    note('Updated.');
    if(sId){showProgress(sId);}else{view='myGames';render();}
    return;
  }
  const candidate=joins.concat([entry]);
  if(!saveJoins(candidate)){throw Error('Could not save. Try again.');}
  joins=candidate;
  if(sId){showProgress(sId);}else{view='myGames';render();note('Game saved.');}
  return;
 }
 if(a.length>=13&&['A','B'].includes(a[9])){
  let rules={lives:String(a[4]),seconds:a[5],medic:a[6],a:a[7],b:a[8],respawnMode:a[13]||'base'};
  if(!ruleOK(rules))throw Error('Invalid game settings');
  const gid=a[2],game=a[3];
  const startEpoch=a.length>=15?a[14]:null;
  let sId=null,tot=null;
  if(a.length>=17){const meta=validateScheduleMeta(a[15],a[16],true);sId=meta.scheduleId;tot=meta.totalGames;}
  const entry={gid,game,startEpoch,scheduleId:sId,totalGames:tot,status:Number.isSafeInteger(startEpoch)&&startEpoch>0?'WAITING':'SCHEDULE_UNAVAILABLE',payload:{gid,game,rules,team:a[9],mode:'standard',baseSign:a[10],baseLat:a[11],baseLng:a[12]}};
  const existing=joins.find(x=>x.gid===gid);
  if(existing){
    if(existing.status==='COMPLETED'){note('This game is already completed.');return;}
    if(s&&s.gid===gid){note('This game is in progress.');return;}
    const oldTime=existing.startEpoch?new Date(existing.startEpoch).toLocaleString():'—';
    const newTime=startEpoch?new Date(startEpoch).toLocaleString():'—';
    const changed=existing.startEpoch!==startEpoch||existing.payload.team!==a[9];
    if(!changed){note('Already saved.');return;}
    if(!confirm('Update saved game?\nOld: '+oldTime+' · '+existing.payload.team+'\nNew: '+newTime+' · '+a[9])){note('No change.');return;}
    const candidate=joins.map(j=>j.gid===gid?{...entry}:j);
    if(!saveJoins(candidate)){throw Error('Could not update. Try again.');}
    joins=candidate;
    note('Updated.');
    if(sId){showProgress(sId);}else{view='myGames';render();}
    return;
  }
  const candidate=joins.concat([entry]);
  if(!saveJoins(candidate)){throw Error('Could not save. Try again.');}
  joins=candidate;
  if(sId){showProgress(sId);}else{view='myGames';render();note('Game saved.');}
  return;
 }
 throw Error('Not a valid team JOIN QR');
}
function showProgress(sId){
  const saved=countUniqueForSchedule(sId);
  const meta=joins.find(j=>j.scheduleId===sId);
  const total=meta?meta.totalGames:saved;
  view='myGames';
  renderSetup();
  const list=$('joinsList');if(!list)return;
  const card=document.createElement('div');card.className='progressCard';
  const h2=document.createElement('h2');h2.textContent=saved>=total?`ALL ${total} GAMES SAVED`:`GAME ${saved} OF ${total} SAVED`;card.appendChild(h2);
  if(saved<total){
    const sub=document.createElement('div');sub.className='sub';sub.textContent=`${total-saved} more to scan`;card.appendChild(sub);
    const scan=document.createElement('button');scan.textContent='SCAN NEXT GAME';scan.onclick=()=>scan('join');card.appendChild(scan);
  }
  const view2=document.createElement('button');view2.className='alt';view2.textContent='VIEW MY GAMES';view2.onclick=()=>{view='myGames';render();};card.appendChild(view2);
  list.insertBefore(card,list.firstChild);
}
function hostCreate(){
 if(!HOST_MODE)return;
 if(h||s){note('Host/player game already exists. Reset explicitly before making a new one.');return}
 let game=$('game').value.trim().toUpperCase();
 if(hostMode==='outlast'){
  if(!hostTarget){note('Set target on map first.');return}
  if(!/^[A-Z0-9 _-]{3,18}$/.test(game)){note('Game: 3–18 letters/numbers.');return}
  const startRadius=Number($('olStartR').value),step=Number($('olStep').value),intervalMin=Number($('olInterval').value),startTimeStr=$('olStartTime').value;
  if(!Number.isFinite(startRadius)||startRadius<20||startRadius>500){note('Start radius 20–500m');return}
  if(!Number.isFinite(step)||step<5||step>100){note('Step 5–100m');return}
  if(!Number.isFinite(intervalMin)||intervalMin<1||intervalMin>30){note('Interval 1–30 min');return}
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startTimeStr)){note('Set a start date and time');return}
  const st=new Date(startTimeStr);
  if(isNaN(st.getTime())){note('Invalid start date/time');return}
  if(st.getTime()<time()-60000){note('Start time is in the past');return}
  const outlast={targetLat:hostTarget.lat,targetLng:hostTarget.lng,startRadius,endRadius:OUTLAST_END_RADIUS,step,intervalMin,startEpoch:st.getTime()};
  const rules={lives:'1',seconds:120,medic:'none',a:'S',b:'T',respawnMode:'base'};
  if(saveHost({version:4,gid:hex(),game,rules,baseA:'',baseB:'',mode:'outlast',outlast,created:time(),artifacts:[],artifactIds:{},unlockCareers:false})){
   view='hostPanel';render();note('OUTLAST game created. Show JOIN QR to players.');
  }
  return;
 }
 let a=$('labelA').value.trim().toUpperCase(),b=$('labelB').value.trim().toUpperCase();
 const rules={lives:$('lives').value,seconds:Number($('seconds').value),medic:$('medic').value,a,b,respawnMode:$('respawnMode').value};
 const baseA=$('baseA').value,baseB=$('baseB').value;
 const signA=$('signA').value,signB=$('signB').value;
 if(!/^[A-Z0-9 _-]{3,18}$/.test(game)||!ruleOK(rules)){note('Check rules: lives 1–20/U, time 30–600, distinct labels 1–12 chars.');return}
 if(rules.respawnMode==='base'&&baseA===baseB){note('Red and blue base locations must be different.');return}
 if(saveHost({version:4,gid:hex(),game,rules,baseA,baseB,signA,signB,mode:'standard',created:time(),artifacts:[],artifactIds:{},unlockCareers:false})){
  view='hostPanel';render();note('Game created.');
 }
}
function renderBatchArtifactCheckboxes(){
 const box=$('batchArtifactList');if(!box)return;
 box.replaceChildren();
 GUN_ORDER.forEach(gunId=>{
   const gun=GUNS[gunId];
   const label=document.createElement('label');
   const cb=document.createElement('input');
   cb.type='checkbox';cb.value=gunId;
   label.appendChild(cb);
   const span=document.createElement('span');
   span.textContent=gun.name+' ('+gun.tier+')';
   label.appendChild(span);
   box.appendChild(label);
 });
}
function addGameToBatch(){
 const game=$('batchGameName').value.trim().toUpperCase();
 const timeStr=$('batchGameTime').value;
 const gameDate=hostBatchDate;
 if(!gameDate){note('Pick a date first');return}
 if(!timeStr){note('Set a start time');return}
 const startEpoch=new Date(gameDate+'T'+timeStr).getTime();
 if(isNaN(startEpoch)){note('Invalid date/time');return}
 if(startEpoch<time()-60000){note('Start time is in the past');return}
 if(hostBatch.some(g=>g.game===game)){note('Game name already used in this schedule');return}
 
 const checked=[];document.querySelectorAll('#batchArtifactList input:checked').forEach(cb=>checked.push(cb.value));
 
 if(batchMode==='outlast'){
   if(!batchTarget){note('Set target on map first.');return}
   const startRadius=Number($('batchOlStartR').value),step=Number($('batchOlStep').value),intervalMin=Number($('batchOlInterval').value);
   if(!Number.isFinite(startRadius)||startRadius<20||startRadius>500){note('Start radius 20–500m');return}
   if(!Number.isFinite(step)||step<5||step>100){note('Step 5–100m');return}
   if(!Number.isFinite(intervalMin)||intervalMin<1||intervalMin>30){note('Interval 1–30 min');return}
   hostBatch.push({game,gid:hex(),startEpoch,mode:'outlast',targetLat:batchTarget.lat,targetLng:batchTarget.lng,startRadius,step,intervalMs:intervalMin*60000,artifacts:checked});
 } else {
   const rules={lives:$('batchLives').value,seconds:Number($('batchSeconds').value),medic:$('batchMedic').value,a:$('batchLabelA').value.trim().toUpperCase(),b:$('batchLabelB').value.trim().toUpperCase(),respawnMode:$('batchRespawnMode').value};
   const baseA=$('batchBaseA').value,baseB=$('batchBaseB').value;
   const signA=$('batchSignA').value,signB=$('batchSignB').value;
   if(!/^[A-Z0-9 _-]{3,18}$/.test(game)||!ruleOK(rules)){note('Check rules: lives 1–20/U, time 30–600, distinct labels 1–12 chars.');return}
   if(rules.respawnMode==='base'&&baseA===baseB){note('Red and blue base locations must be different.');return}
   if(hostBatch.some(g=>g.mode!=='outlast'&&(g.signA===signA||g.signB===signA))){note(`Sign ${signA} is already used in another game.`);return}
   if(hostBatch.some(g=>g.mode!=='outlast'&&(g.signA===signB||g.signB===signB))){note(`Sign ${signB} is already used in another game.`);return}
   hostBatch.push({game,gid:hex(),startEpoch,mode:'standard',rules,baseA,baseB,signA,signB,artifacts:checked});
 }
 hostBatch.sort((a,b)=>a.startEpoch-b.startEpoch);
 renderBatchList();
 $('batchGameName').value='';
 $('batchGameTime').value='';
 batchTarget=null;
 $('batchTargetInfo').textContent='No target set';
}
function getBatchSummary(g){
 if(g.mode==='outlast') return `OUTLAST`;
 let s='';
 s+= g.rules.lives==='U' ? '♾️' : g.rules.lives+'💜';
 s+= ` · 🩸${g.rules.seconds}`;
 s+= g.rules.medic==='none' ? ' · 🚑0' : (g.rules.medic==='one' ? ' · 🚑1' : ' · 🚑2');
 s+= g.rules.respawnMode==='timed' ? ' · ⏰️' : ' · 🏥';
 return s;
}
function renderBatchList(){
 const list=$('batchList');if(!list)return;
 list.replaceChildren();
 if(!hostBatch.length){list.textContent='No games added yet.';return}
 hostBatch.forEach((g,i)=>{
  let div=document.createElement('div');div.style.cssText='background:#30443a;padding:8px;margin:4px 0;border-radius:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;';
  let timeStr=new Date(g.startEpoch).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  let details = g.mode==='outlast' ? `Target: ${g.startRadius}m → 5m` : `Red: ${g.signA} @ ${g.baseA} · Blue: ${g.signB} @ ${g.baseB}`;
  let summary = getBatchSummary(g);
  let artText = g.artifacts && g.artifacts.length ? `<br><span class="compact" style="color:#ffd653">Artifacts: ${g.artifacts.length}</span>` : '';
  div.innerHTML=`<div><strong>${g.game}</strong> @ ${timeStr}<br><span class="compact muted">${details}</span><br><span class="compact" style="color:#75d868">${summary}</span>${artText}</div>`;
  let btn=document.createElement('button');btn.textContent='✕';btn.className='danger';btn.style.cssText='padding:4px 8px; min-height:auto; font-size:12px;';btn.onclick=()=>{hostBatch.splice(i,1);renderBatchList();};
  div.appendChild(btn);
  list.appendChild(div);
 });
}
function generateBatchQR(){
 if(!hostBatch.length){note('Add at least one game');return}
 if(!hostScheduleId){hostScheduleId=hex();}
 const totalGames=hostBatch.length;
 hostBatch.forEach(g=>{if(!g.scheduleId)g.scheduleId=hostScheduleId;if(g.totalGames===undefined||g.totalGames===null)g.totalGames=totalGames;});
 view='hostBatchPanel';render();
 const container=$('batchQRList');if(!container)return;container.replaceChildren();
 hostBatch.forEach(g=>{
   const card=document.createElement('div');card.className='card';
   const title=document.createElement('h3');card.appendChild(title);
   if(g.mode==='outlast'){
     title.textContent=g.game+' — SOLO';
     const box=document.createElement('div');box.className='qr';card.appendChild(box);
     makeQR(box,JSON.stringify(joinArray({...g,scheduleId:hostScheduleId,totalGames},'S')),216);
     const p=document.createElement('p');p.className='compact';p.textContent='Show to any player.';card.appendChild(p);
   } else {
     title.textContent=g.game+' — RED';
     const redBox=document.createElement('div');redBox.className='qr';card.appendChild(redBox);
     makeQR(redBox,JSON.stringify(joinArray({...g,scheduleId:hostScheduleId,totalGames},'A')),216);
     const titleB=document.createElement('h3');titleB.textContent=g.game+' — BLUE';card.appendChild(titleB);
     const blueBox=document.createElement('div');blueBox.className='qr';card.appendChild(blueBox);
     makeQR(blueBox,JSON.stringify(joinArray({...g,scheduleId:hostScheduleId,totalGames},'B')),216);
   }
   container.appendChild(card);
 });
 $('batchInfo').textContent=`${hostBatch.length} game${hostBatch.length>1?'s':''} in this schedule · scheduleId ${hostScheduleId.slice(0,8)}`;
}
function printBatchArtifacts(){
 const area=$('printArea');if(!area)return;area.replaceChildren();
 let hasAny = false;
 hostBatch.forEach(g=>{
   if(g.artifacts && g.artifacts.length > 0){
     hasAny = true;
     g.artifacts.forEach(gunId=>{
       const gun=GUNS[gunId];
       const artifactId=hex().slice(0,16);
       const wrapper=document.createElement('div');wrapper.className='printCard';
       const img=document.createElement('img');img.src=gun.img;img.alt=gun.name;wrapper.appendChild(img);
       const title=document.createElement('h3');title.textContent=gun.name+' | '+g.game;wrapper.appendChild(title);
       const qbox=document.createElement('div');qbox.className='qr';wrapper.appendChild(qbox);
       makeQR(qbox,artifactCode(gunId,artifactId,g.gid,g.game),200);
       const codeEl=document.createElement('p');codeEl.className='code';codeEl.textContent='MU4 · '+artifactId;wrapper.appendChild(codeEl);
       area.appendChild(wrapper);
     });
   }
 });
 if(!hasAny){note('No artifacts selected in any games');return}
 const po=$('printOverlay');if(po)po.classList.remove('hidden');
}
function join(){
 if(!pending||s)return;
 if(previewFromMyGames){
   const j=joins.find(x=>x.gid===pending.gid);
   if(!j){note('This game is no longer saved on this phone.');return}
   updateJoinsStatus();
   if(j.status!=='READY'){note('Joining is not open for this game.');return}
 }
 let name=$('name').value.trim();if(!nameOK(name)){note('Enter a callsign up to 32 characters');return}
 career.callsign=name;saveCareer();
 let p=pending;
 let livesCount=p.mode==='outlast'?1:(p.rules.lives==='U'?1:Number(p.rules.lives));
 let x={version:4,gid:p.gid,game:p.game,rules:p.rules,team:p.team,id:hex(),name,mode:p.mode||'standard',
  tags:Array.from({length:livesCount},()=>({status:'LIVE'})),
  phase:'ACTIVE',offer:null,outbound:null,wins:[],medics:[],seen:[],medPending:null,events:[],
  baseA:h?h.baseA:'',baseB:h?h.baseB:''};
 if(p.mode==='outlast'&&p.outlast)x.outlast=p.outlast;
 if(p.mode==='standard'){
   x.baseSign=p.baseSign;
   x.baseLat=p.baseLat;
   x.baseLng=p.baseLng;
 }
 record(x,`Joined ${p.game} [${p.mode||'standard'}], ${p.mode==='outlast'?'OUTLAST':(p.team==='A'?p.rules.a:p.rules.b)}; ${p.mode==='outlast'?outlastRuleText(p.outlast):ruleText(p.rules)}`);
 if(persist(x)){
  pending=null;
  previewFromMyGames=false;
  careerPurgeIfExpired();
  const cs=careerState();
  if(cs==='active'||(cs==='dormant'&&h&&h.unlockCareers)){career.lastPlayed=time();saveCareer()}
  note('Team fixed by host. Call HIT and mark out before touching the phone.');
 }
}
const offered=()=>s?.phase==='OFFERED'&&s.offer&&s.tags[s.offer.n-1]?.status==='OFFERED';
function reconcile(){
 if(offered()&&time()>=s.offer.deadline){
  edit(x=>{let n=x.offer.n;x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;
    if(x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')){
      x.phase='ELIMINATED';
      record(x,`Life ${n} spent by timer; ELIMINATED`);
    } else {
      if(x.rules.respawnMode==='timed'){
        x.phase='RESPAWNING';
        x.respawnDeadline=time()+10000;
        record(x,`Life ${n} spent; timed respawn`);
      } else {
        x.phase='RETURN';
        record(x,`Life ${n} spent; return to base`);
      }
    }
  });
  buzz(s.phase==='ELIMINATED'?'elim':'return');
  if(s.phase==='ELIMINATED')note('Final life expired — eliminated');
  else if(s.phase==='RESPAWNING')note('Life spent. Yell: BACK IN, IN 10!');
  else note('Life spent. Respawn at base.');
 }
 if(s?.outbound&&time()>=s.outbound.deadline){edit(x=>{x.outbound=null})}
 if(s?.phase==='RESPAWNING'&&time()>=s.respawnDeadline){
  edit(x=>{x.phase='ACTIVE';record(x,'Timed respawn complete');});
  buzz('return');
  note('BACK IN!');
 }
}
function outlastNotStarted(){return !!(s&&s.mode==='outlast'&&s.outlast&&time()<s.outlast.startEpoch)}
function hit(){
 reconcile();
 if(!s||s.phase!=='ACTIVE')return;
 if(outlastNotStarted()){note('Game has not started yet.');return}
 let n=s.tags.findIndex(t=>t.status==='LIVE')+1;if(n<1)return;
 let at=time();
 edit(x=>{x.tags[n-1].status='OFFERED';x.phase='OFFERED';x.offer={n,id:hex(),at,deadline:at+x.rules.seconds*1000};record(x,`Life ${n} offered`)});
 note('Show your dog tags. Bleedout timer is running.');
}
function offerData(a){
 if(a.length!==16||!idOK(a[2])||!idOK(a[9])||!idOK(a[12])||!['A','B','S'].includes(a[8])||!nameOK(a[10])||!Number.isInteger(a[11])||!Number.isSafeInteger(a[13])||!Number.isSafeInteger(a[14])||!Number.isSafeInteger(a[15]))throw Error('Malformed offer QR');
 let r={lives:String(a[3]),seconds:a[4],medic:a[5],a:a[6],b:a[7]};
 if(!ruleOK(r)||a[14]!==a[13]+r.seconds*1000||a[11]<1||a[11]>(r.lives==='U'?1:Number(r.lives)))throw Error('Invalid offer data');
 if(a[2]!==s.gid)throw Error('Different game ID');
 const sameRules=String(r.lives)===String(s.rules.lives)&&r.seconds===s.rules.seconds&&r.medic===s.rules.medic&&r.a===s.rules.a&&r.b===s.rules.b;
 if(!sameRules)throw Error('Different rules');
 if(a[9]===s.id)throw Error('Cannot scan own tags');
 if(time()>=a[14])throw Error('Tags expired');
 if(a[13]>time()+60000)throw Error('Phone clocks disagree');
 return {team:a[8],owner:a[9],name:a[10],n:a[11],offer:a[12],at:a[13],deadline:a[14],challenge:a[15]};
}
function acceptReturn(a){
 if(!offered())throw Error('You have no active offer');
 if(a.length!==7)throw Error('Malformed return QR');
 if(a[2]!==s.gid)throw Error('Wrong game');
 if(a[3]!==s.offer.id)throw Error('This is not for your current tags');
 if(time()>=a[6])throw Error('Return expired');
 if(!nameOK(a[5]))throw Error('Invalid return name');
 if(currentScanMode==='tag'&&a[1]!=='T')throw Error('Only TAGS TAKEN accepted');
 if(currentScanMode==='heal'&&a[1]!=='H')throw Error('Only HEALED accepted');
 let n=s.offer.n,name=a[5];
 if(a[1]==='T'){
  edit(x=>{x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;
    if(x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')){
      x.phase='ELIMINATED';record(x,`Tags taken by ${name}; ELIMINATED`);
    } else {
      if(x.rules.respawnMode==='timed'){
        x.phase='RESPAWNING';x.respawnDeadline=time()+10000;record(x,`Tags taken by ${name}; timed respawn`);
      } else {
        x.phase='RETURN';record(x,`Tags taken by ${name}; return to base`);
      }
    }
  });
  buzz(s.phase==='ELIMINATED'?'elim':'return');
  if(s.phase==='ELIMINATED')note('Tags taken. ELIMINATED.');
  else if(s.phase==='RESPAWNING')note('Tags taken. Yell: BACK IN, IN 10!');
  else note('Tags taken by '+name+'. Respawn at base.');
 }else if(a[1]==='H'){
  const medicId=a[4],medicName=a[5];
  edit(x=>{x.tags[n-1].status='LIVE';x.offer=null;x.phase='ACTIVE';x.outbound={type:'K',offer:s.offer.id,medicId,medicName,deadline:time()+180000};record(x,`Healed by ${medicName}`)});
  buzz('return');
  note('Healed by '+medicName+'. Show them your THANKS QR.');
 }
}
function acceptThanks(a){
 if(!s.outbound||s.outbound.type!=='H')throw Error('You have no pending heal');
 if(a.length!==7)throw Error('Malformed thanks QR');
 if(a[2]!==s.gid)throw Error('Wrong game');
 if(a[3]!==s.outbound.offer)throw Error('This is not for your current heal');
 if(a[4]!==s.id)throw Error('This thank-you is not for you');
 if(time()>=a[6])throw Error('Thank-you expired');
 const victimName=a[5];
 edit(x=>{x.medics.push({name:victimName,offer:x.outbound.offer,completedAt:time()});x.outbound=null;record(x,`Healed ${victimName}`)});
 career.lifetimeMedics=(career.lifetimeMedics||0)+1;
 saveCareer();
 note('Healed '+victimName+'. Thank-you received.');
}
function acceptArtifact(a){
 if(a.length!==6)throw Error('Malformed artifact QR');
 if(!s)throw Error('Join a team first');
 if(a[2]!==s.gid)throw Error('Artifact belongs to a different game');
 const gunId=a[4];if(!GUNS[gunId])throw Error('Unknown artifact');
 const artifactId=a[5];if(typeof artifactId!=='string'||!/^[0-9a-f]{12,24}$/.test(artifactId))throw Error('Invalid artifact');
 const gameName=a[3];if(typeof gameName!=='string'||gameName.length<1||gameName.length>18)throw Error('Invalid game name');
 if(careerHas(artifactId))throw Error('Already collected');
 if(careerAdd(gunId,gameName,artifactId)){const g=GUNS[gunId];buzz('return');note(`Collected ${g.name} | ${gameName}`);return}
 throw Error('Could not add artifact');
}
function acceptWinner(a){
 if(a.length!==4)throw Error('Malformed winner QR');
 if(!s)throw Error('Join a team first');
 if(a[2]!==s.gid)throw Error('Wrong game');
 const hostStamp=a[3];
 if(!Number.isSafeInteger(hostStamp))throw Error('Invalid winner QR');
 if(careerAddOutlastWin(s.gid,hostStamp)){
  buzz('return');
  showWinnerCelebration();
 }else{
  note('Already recorded.');
 }
}
function showWinnerCelebration(){
 const area=$('dialogText');area.replaceChildren();
 const h1=document.createElement('h1');h1.textContent='🥇';h1.style.fontSize='64px';h1.style.textAlign='center';h1.style.margin='8px 0';area.appendChild(h1);
 const h2=document.createElement('h2');h2.textContent='YOU HAVE OUTLASTED THEM ALL';h2.style.textAlign='center';h2.style.color='#d4af37';area.appendChild(h2);
 const p=document.createElement('p');p.textContent='A 🎯 has been added to your career.';p.style.textAlign='center';area.appendChild(p);
 const dlg=$('dialog');dlg.classList.remove('armoury');dlg.showModal();
}
async function accept(raw){
 reconcile();if(!s)throw Error('Join a team first');
 if(outlastNotStarted())throw Error('Game has not started yet.');
 let a=parse(raw);
 if(a[1]==='BATCH'){if(!Array.isArray(a[2]))throw Error('Malformed batch');note('Batch QRs are not used for scheduled games.');return;}
 if(a[1]==='SIGN'){
  if(a.length!==3||typeof a[2]!=='string'||!/^[RB][1-5]$/.test(a[2]))throw Error('Malformed sign QR');
  if(!s.baseSign)throw Error('No sign assigned to your base in this game.');
  if(s.phase!=='RETURN')throw Error('Only an out player can respawn');
  if(a[2]!==s.baseSign)throw Error(`Wrong base sign. Expected ${s.baseSign}`);
  if(!s.baseLat||!s.baseLng)throw Error('Base location not recorded.');
  try{
   const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:20000,maximumAge:30000,enableHighAccuracy:true}));
   const d=distanceMeters(pos.coords.latitude,pos.coords.longitude,s.baseLat,s.baseLng);
   if(d>50)throw Error(`Too far from base (${Math.round(d)}m). You must be within 50m.`);
  }catch(err){
   if(err.message&&err.message.includes('Too far'))throw err;
   if(err.code===1)throw Error('Location permission is off. Enable it in your phone settings to respawn.');
   if(err.code===3)throw Error('GPS is taking too long. Move to open sky and try again.');
   throw Error('GPS signal unavailable. Move to open sky and try again.');
  }
  edit(x=>{if(x.rules.lives==='U')x.tags[0].status='LIVE';x.phase='ACTIVE';record(x,'Correct base sign scan: respawn')});
  buzz('return');
  note('Respawned.');
  return;
 }
 if(a[1]==='B'){
  if(a.length!==6||!idOK(a[2])||a[2]!==s.gid||a[3]!==s.team)throw Error('Wrong game or team base');
  if(s.mode==='outlast')throw Error('No respawn in OUTLAST');
  if(s.phase!=='RETURN')throw Error('Only an out player can respawn');
  edit(x=>{if(x.rules.lives==='U')x.tags[0].status='LIVE';x.phase='ACTIVE';record(x,'Legacy base scan: respawn')});
  note('Respawned.');
  return;
 }
 if(a[1]==='T'||a[1]==='H'){acceptReturn(a);return}
 if(a[1]==='K'){acceptThanks(a);return}
 if(a[1]==='A'){acceptArtifact(a);return}
 if(a[1]==='W'){acceptWinner(a);return}
 if(a[1]!=='O')throw Error('Expected a player offer QR');
 if(s.phase!=='ACTIVE')throw Error('Cannot capture or medic while hit, out or eliminated');
 let o=offerData(a);
 const isCapture = s.mode==='outlast' || o.team !== s.team;
 if(isCapture){
  if(s.seen.includes(o.offer))throw Error('Already grabbed this offer on this phone');
  edit(x=>{x.seen.push(o.offer);x.wins.push({...o,capturedAt:time()});if(x.mode!=='outlast'){x.outbound={type:'T',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000}}record(x,`Grabbed tags from ${o.name}`)});
  career.lifetimeTags=(career.lifetimeTags||0)+1;
  saveCareer();
  if(s.mode==='outlast'){note('Tags recorded. No receipt in OUTLAST.')}
  else{note('Show TAGS TAKEN to '+o.name+'. They scan it to confirm.')}
  return;
 }
 if(s.rules.medic==='none')throw Error('No medics in this game');
 if(s.medics.some(m=>m.offer===o.offer))throw Error('You already healed this offer');
 if(s.rules.medic==='one'){
  edit(x=>{x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Heal offered to ${o.name}`)});
  note('Show HEALED to '+o.name+'. Then press their yellow life bar. Victim confirms by scanning back.');
  return;
 }
 let m=s.medPending;
 if(!m||time()>=m.deadline){edit(x=>{x.medPending={...o,started:time()};record(x,`Medic started for ${o.name}`)});note('First scan. Stay together and scan fresh QR after at least 30 seconds.');return}
 if(m.owner!==o.owner||m.offer!==o.offer)throw Error('Cancel existing medic attempt first');
 if(m.challenge===o.challenge)throw Error('Need fresh rotating QR from same offer');
 if(time()-m.started<30000)throw Error(`Wait ${Math.ceil((30000-(time()-m.started))/1000)} more seconds`);
 edit(x=>{x.medPending=null;x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Heal offered to ${o.name}`)});
 note('Show HEALED to '+o.name+'. Then press their yellow life bar.');
}
function cancelMedic(){if(!s?.medPending)return;edit(x=>{x.medPending=null;record(x,'Medic attempt cancelled')});note('Medic attempt cleared.')}
function secondsLeft(){let el=$('timer');if(!el||!offered())return;let t=Math.max(0,Math.ceil((s.offer.deadline-time())/1000));el.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`}
function refreshOffer(){if(!offered())return;let slot=Math.floor(time()/8000);if(slot===offerSlot)return;offerSlot=slot;let node=$('offerQR');if(node){let text=offerCode();offerShown=text;makeQR(node,text,216)}}
function hostDraw(type,t,target){if(!HOST_MODE||!h)return;let box=$(target);if(!box)return;box.replaceChildren();let title=document.createElement('h2');
 if(h.mode==='outlast'){title.textContent='OUTLAST JOIN';}
 else{title.textContent=`${t==='A'?h.rules.a:h.rules.b} (${t==='A'?'RED':'BLUE'}) JOIN`;}
 box.append(title);let square=document.createElement('div');square.className='qr';box.append(square);makeQR(square,joinCode(t));let p=document.createElement('p');p.className='compact';p.textContent=h.mode==='outlast'?'Show to every player. All players are solo.':'Show only to assigned players.';box.append(p)}
function renderArtifactCheckboxes(){if(!HOST_MODE)return;const box=$('artifactList');if(!box||!h)return;box.replaceChildren();GUN_ORDER.forEach(gunId=>{const gun=GUNS[gunId];const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.value=gunId;if(h.artifacts&&h.artifacts.includes(gunId))cb.checked=true;label.appendChild(cb);const span=document.createElement('span');span.textContent=gun.name+' ('+gun.tier+')';label.appendChild(span);box.appendChild(label)})}
function updateOutlastPreview(){if(!HOST_MODE)return;const el=$('olPreview');if(!el)return;const sr=Number($('olStartR').value)||0,st=Number($('olStep').value)||0,iv=Number($('olInterval').value)||0,tm=$('olStartTime').value||'';el.textContent=`Shrinks from ${sr}m to 5m in ${st}m steps every ${iv} min, starting ${tm||'—'}`}
function defaultOlStartValue(){const pad=n=>String(n).padStart(2,'0');const now=new Date();now.setMinutes(0,0,0);now.setHours(now.getHours()+1);return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`}
function statusLabel(st){
 if(st==='WAITING')return 'WAITING';
 if(st==='READY')return 'JOIN AVAILABLE';
 if(st==='EXPIRED')return 'JOIN WINDOW CLOSED';
 if(st==='COMPLETED')return 'COMPLETED';
 if(st==='SCHEDULE_UNAVAILABLE')return 'SCHEDULE UNAVAILABLE';
 return st;
}
function cardHint(j,now){
 if(j.status==='COMPLETED')return 'Ended';
 if(j.status==='EXPIRED')return 'Ask host if late entry is required';
 if(j.status==='SCHEDULE_UNAVAILABLE')return 'No start time on QR';
 if(j.status==='READY'){const close=j.startEpoch+30*60*1000;return `Joining closes at ${new Date(close).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;}
 const open=j.startEpoch-30*60*1000;
 return `Joining opens at ${new Date(open).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
}
function renderSetup(){
 const st=$('setup'),pl=$('play');
 if(st)st.classList.toggle('hidden',!!s);
 if(pl)pl.classList.toggle('hidden',!s);
 let v=(HOST_MODE&&h&&view==='choice')?'hostPanel':view;
 ['choice','profileSetup','myGames','hostForm','hostPanel','joinPanel','preview','hostBatchForm','hostBatchPanel'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',id!==v)});
 if(HOST_MODE&&h&&view==='choice'){const hp=$('hostPanel');if(hp)hp.classList.remove('hidden');}
 const rtm=$('releaseTagMyGames');if(rtm)rtm.textContent=releaseTag();
 const rtpl=$('releaseTagPlay');if(rtpl)rtpl.textContent=releaseTag();
 const rta=$('releaseTagArmoury');if(rta)rta.textContent=releaseTag();
 const rthp=$('releaseTagHostPanel');if(rthp)rthp.textContent=releaseTag();
 const rthb=$('releaseTagHostBatch');if(rthb)rthb.textContent=releaseTag();
 if(v==='hostPanel'&&h){
  const hi=$('hostInfo');
  if(hi)hi.textContent=h.mode==='outlast'?`${h.game} · ${h.gid.slice(0,8)} · ${outlastRuleText(h.outlast)}`:`${h.game} · ${h.gid.slice(0,8)} · ${ruleText(h.rules)} · RED ${h.rules.a} (${h.signA||'R1'}) @ ${h.baseA} / BLUE ${h.rules.b} (${h.signB||'B1'}) @ ${h.baseB}`;
  const isOL=h.mode==='outlast';
  const ja=$('hostJA');if(ja)ja.textContent=isOL?'JOIN OUTLAST':'JOIN RED';
  const jb=$('hostJB');if(jb)jb.style.display=isOL?'none':'';
  const hq=$('hostQR');if(hq&&!hq.childNodes.length)hostDraw('J','A','hostQR');
  renderArtifactCheckboxes();
  const uc=$('unlockCareers');if(uc)uc.checked=!!h.unlockCareers;
  const hp=$('hostPlayingSection');if(hp)hp.classList.toggle('hidden',isOL);
  let liveText='👁️ WATCH MAP (LIVE) — GAME IS ON';
  let liveClass='wide';
  if(isOL && h.outlast){
     const hostNow=time();
     const iv=h.outlast.intervalMs||(h.outlast.intervalMin?h.outlast.intervalMin*60000:60000);
     const stepsToEnd=Math.ceil((h.outlast.startRadius-h.outlast.endRadius)/h.outlast.step);
     const countdownStart= h.outlast.startEpoch + (stepsToEnd * iv);
     const gameEnd= countdownStart + 30000;
     if(hostNow < h.outlast.startEpoch) {liveText='👁️ WATCH MAP (LIVE) — STAND BY';liveClass='wide alt';}
     else if (hostNow >= gameEnd) {liveText='🏁 GAME OVER — VIEW MAP';liveClass='wide danger';}
  }
  const wm=$('hostWatchMap');
  if(wm){wm.style.display=isOL?'':'none'; wm.textContent=liveText; wm.className=liveClass;}
  const ws=$('winnerSection');
  if(ws){if(isOL&&time()>=h.outlast.startEpoch)ws.classList.remove('hidden');else ws.classList.add('hidden');}
 }
 if(v==='preview'&&pending){
  const pt=$('previewTeam');
  if(pt)pt.textContent=pending.mode==='outlast'?'OUTLAST — FREE FOR ALL':`${pending.team==='A'?'RED':'BLUE'} TEAM ${pending.team==='A'?pending.rules.a:pending.rules.b}`;
  const pr=$('previewRules');if(pr)pr.textContent=pending.mode==='outlast'?outlastRuleText(pending.outlast):ruleText(pending.rules);
  const ni=$('name');if(ni)ni.value=career.callsign||'';
 }
 if(v==='myGames'){
   updateJoinsStatus();
   const list=$('joinsList');if(!list)return;
   const summary=$('myGamesSummary');
   const activeBtn=$('myGamesActiveBtn');if(activeBtn)activeBtn.classList.toggle('hidden',!s);
   list.replaceChildren();
   if(!joins.length){list.textContent='No games loaded. Scan a host QR.';if(summary)summary.textContent='';return}
   if(summary)summary.textContent=`${joins.length} game${joins.length===1?'':'s'} saved on this phone`;
   const now=time();
   const sorted=[...joins].sort((a,b)=>(a.startEpoch||0)-(b.startEpoch||0));
   sorted.forEach(j=>{
     const div=document.createElement('div');div.className='gameCard';
     const header=document.createElement('div');header.className='gameCardHeader';
     const title=document.createElement('div');title.className='gameCardTitle';title.textContent=`${j.startEpoch?new Date(j.startEpoch).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'} · ${j.game}`;
     const pill=document.createElement('span');pill.className='gameCardStatus status-'+j.status;pill.textContent=statusLabel(j.status);
     header.append(title,pill);div.appendChild(header);
     const sub=document.createElement('div');sub.className='gameCardSub';
     const p=j.payload;
     if(p&&p.mode==='outlast')sub.textContent='Solo · Outlast';
     else if(p&&p.rules)sub.textContent=`${p.team==='A'?'Red '+p.rules.a:'Blue '+p.rules.b} · Standard`;
     else sub.textContent='Standard';
     div.appendChild(sub);
     const hint=document.createElement('div');hint.className='gameCardHint';hint.textContent=cardHint(j,now);div.appendChild(hint);
     const btns=document.createElement('div');btns.className='gameCardBtns';
     if(j.status==='READY' && !(s&&s.gid===j.gid)){
       const play=document.createElement('button');play.textContent='JOIN GAME';play.onclick=()=>launchGame(j.gid);btns.appendChild(play);
     }
     if(s&&s.gid===j.gid){
       const cur=document.createElement('button');cur.textContent='BACK TO GAME';cur.onclick=()=>{view='play';render();};btns.appendChild(cur);
     }
     const det=document.createElement('button');det.className='alt';det.textContent='Details';
     det.onclick=()=>{
       const dlg=$('dialog');dlg.classList.remove('armoury');
       const area=$('dialogText');area.replaceChildren();
       const hh=document.createElement('h2');hh.textContent=j.game;area.appendChild(hh);
       const pp=document.createElement('p');pp.textContent=j.startEpoch?`Starts ${new Date(j.startEpoch).toLocaleString()}`:'No scheduled start.';area.appendChild(pp);
       if(j.payload&&j.payload.mode==='outlast'&&j.payload.outlast){
         const ol=j.payload.outlast;
         const pp2=document.createElement('p');pp2.className='compact';pp2.textContent=`OUTLAST · ${ol.startRadius}m → 5m · −${ol.step}m every ${Math.round((ol.intervalMs||60000)/60000)}min`;area.appendChild(pp2);
       } else if(j.payload&&j.payload.rules){
         const r=j.payload.rules;
         const pp2=document.createElement('p');pp2.className='compact';pp2.textContent=ruleText(r);area.appendChild(pp2);
       }
       dlg.showModal();
     };
     btns.appendChild(det);
     div.appendChild(btns);
     list.appendChild(div);
   });
 }
}
function renderPlay(){
 if(!s)return;
 let phase=s.phase,ret=phase==='RETURN',dead=phase==='ELIMINATED',respawning=phase==='RESPAWNING';
 document.body.classList.toggle('returning',ret);
 document.body.classList.toggle('mist',dead);
 const pa=$('playarea');
 if(pa)pa.classList.toggle('teamB',s.team==='B');
 const idEl=$('identity');
 if(idEl)idEl.textContent=s.mode==='outlast'?`${s.name} · OUTLAST · ${s.game} · 2-minute bleedout`: `${s.name} · ${s.team==='A'?'Red '+s.rules.a+' @ '+s.baseSign:'Blue '+s.rules.b+' @ '+s.baseSign} · ${s.game} · ${ruleText(s.rules)}`;
 const bar=$('bar');
 if(bar){
  bar.replaceChildren();
  s.tags.forEach((tag,i)=>{let el=document.createElement('span');el.className=tag.status;el.title=`Life ${i+1}: ${tag.status}`;if(tag.status==='OFFERED'&&offered()&&s.rules.medic!=='none'&&s.mode!=='outlast'){el.classList.add('tappable');el.onclick=()=>scan('play','heal')}bar.append(el)});
  bar.setAttribute('aria-label','Life status: '+s.tags.map(t=>t.status).join(', '));
 }
 const act=$('actions');if(act)act.className='actions'+(ret||respawning?' return':dead||phase==='OFFERED'?' off':'');
 const preStart=outlastNotStarted();
 const hitBtn=$('hit');if(hitBtn){hitBtn.disabled=(phase!=='ACTIVE')||preStart;hitBtn.textContent=preStart?'STANDBY':'I\'M HIT';}
 const scanBtn=$('scan');if(scanBtn)scanBtn.disabled=(phase!=='ACTIVE'&&!ret&&!respawning)||preStart;
 const scanImg=$('scanImg');
 if(scanImg){
  if(ret)scanImg.src='./baserespawn.jpg';
  else if(s.mode==='outlast')scanImg.src='./Reapersrewards1.jpg';
  else if(s.rules.medic==='none')scanImg.src='./Reapersrewards1.jpg';
  else scanImg.src='./qrscanbu.jpg';
 }
 const st=$('stage');if(!st)return;
 st.replaceChildren();offerSlot=-1;offerShown='';
 if(s.outbound&&s.outbound.type==='K'){
  let head=document.createElement('h2');head.textContent='THANKS';st.append(head);
  let timer=document.createElement('p');timer.className='timer';let t=Math.max(0,Math.ceil((s.outbound.deadline-time())/1000));timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`;st.append(timer);
  let box=document.createElement('div');box.className='qr offerqr';st.append(box);
  makeQR(box,thanksCode(s.outbound.offer,s.outbound.medicId,s.name,s.outbound.deadline));
  let p=document.createElement('p');p.className='compact';p.textContent='Show this to '+s.outbound.medicName+'.';st.append(p);
  let b=document.createElement('button');b.className='alt';b.textContent='CLOSE';b.onclick=()=>{edit(x=>{x.outbound=null})};st.append(b);
 }else if(s.outbound){
  let head=document.createElement('h2');head.textContent=s.outbound.type==='T'?'TAGS TAKEN':'HEALED';st.append(head);
  let timer=document.createElement('p');timer.className='timer';let t=Math.max(0,Math.ceil((s.outbound.deadline-time())/1000));timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`;st.append(timer);
  let box=document.createElement('div');box.className='qr offerqr';st.append(box);
  makeQR(box,returnCode(s.outbound.type,{id:s.id,name:s.name},{id:s.outbound.offer,deadline:s.outbound.deadline}));
  let p=document.createElement('p');p.className='compact';p.textContent='Show this to '+s.outbound.victimName+'.';st.append(p);
  let b=document.createElement('button');b.className='alt';b.textContent='CLOSE';b.onclick=()=>{edit(x=>{x.outbound=null})};st.append(b);
 }else if(offered()){
  let head=document.createElement('h2');head.textContent=`LIFE ${s.offer.n} OFFERED`;st.append(head);
  let timer=document.createElement('p');timer.id='timer';timer.className='timer';st.append(timer);
  let box=document.createElement('div');box.id='offerQR';box.className='qr offerqr';st.append(box);
  let p=document.createElement('p');p.className='compact';p.textContent='Show your dog tags. Bleedout timer is running.';st.append(p);
  let tagBtn=document.createElement('button');tagBtn.className='tagButton';
  let span=document.createElement('span');span.className='tagButtonText';span.textContent=s.name.toUpperCase()+"'S";
  const chars=s.name.length+2;
  const cardW=Math.min((window.innerWidth||400)-40,540);
  const printableW=cardW*0.38;
  let fs=printableW/(chars*0.7);
  fs=Math.max(11,Math.min(32,fs));
  span.style.fontSize=fs+'px';
  tagBtn.appendChild(span);tagBtn.onclick=()=>scan('play','tag');st.append(tagBtn);
  let hint=document.createElement('p');hint.className='compact';
  hint.textContent=s.mode==='outlast'?'A Reaper will scan your tags. No receipt in OUTLAST.':(s.rules.medic==='none'?'Reaper presses TAG when they have your tags. Then scan their TAGS TAKEN QR.':'Reaper presses TAG to take tags. Medic presses the yellow bar to heal.');
  st.append(hint);
  secondsLeft();refreshOffer();
 }else if(respawning){
  let head=document.createElement('h2');head.textContent='YELL: BACK IN, IN 10!';head.style.color='#ffd653';head.style.fontSize='24px';st.append(head);
  let timer=document.createElement('p');timer.className='timer';timer.id='respawnTimer';timer.style.fontSize='48px';timer.style.color='#e65d5d';st.append(timer);
  let p=document.createElement('p');p.textContent='Stay where you are. You are not in play until the timer hits zero.';st.append(p);
 }else if(ret||dead){
  let head=document.createElement('h2');head.textContent=ret?'RESPAWN AT BASE':'ELIMINATED';st.append(head);
  if(dead){let gif=document.createElement('img');gif.src='./eliminated.gif';gif.alt='Eliminated';gif.style.maxWidth='80%';gif.style.borderRadius='12px';gif.style.margin='10px 0';st.append(gif)}
  let p=document.createElement('p');p.textContent=ret?'Scan your base sign. Spent finite lives stay red.':'Leave play safely. Help and history remain below.';st.append(p);
 }else{
  if(s.mode==='outlast'){
   let p=document.createElement('p');p.className='teamBadge';p.style.background='#3d6b57';p.textContent=`${s.name} · OUTLAST`;st.append(p);
   const hostNow=playerHostNow();
   const live=!!(s.outlast&&hostNow>=s.outlast.startEpoch);
   const iv=s.outlast.intervalMs||(s.outlast.intervalMin?s.outlast.intervalMin*60000:60000);
   const stepsToEnd=Math.ceil((s.outlast.startRadius-s.outlast.endRadius)/s.outlast.step);
   const countdownStart= s.outlast.startEpoch + (stepsToEnd * iv);
   const gameEnd= countdownStart + 30000;
   let panel=document.createElement('div');panel.className='readyPanel';
   panel.style.background=live?'#1b6b3a':'#0e1c17';
   panel.style.border=live?'2px solid #4ade80':'2px solid #d4af37';
   let status=document.createElement('div');
   status.className='liveStatus';
   status.dataset.live=live?'1':'0';
   status.style.cssText='font-size:18px;font-weight:900;letter-spacing:4px;margin-bottom:14px;color:'+(live?'#4ade80':'#d4af37');
   status.textContent=live?'GAME IS ON':'STAND BY';
   panel.appendChild(status);
   if(live){
      if(hostNow>=gameEnd){
         status.textContent='GAME OVER';status.style.color='#ff5963';
         panel.style.background='#0e1c17'; panel.style.border='2px solid #ff5963';
         let endText=document.createElement('div');endText.className='final-text';endText.textContent='AWAITING HOST RESULTS';panel.appendChild(endText);
      } else if(hostNow>=countdownStart){
         status.textContent='FINAL STAGE';status.style.color='#ff5963';
         let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
         let tLeft=Math.ceil((gameEnd-hostNow)/1000);
         let timer=document.createElement('div');timer.id='outlastTimer';timer.style.cssText='font-size:48px;font-weight:900;color:#fff;margin-top:10px;';timer.textContent=`0:${String(tLeft).padStart(2,'0')}`;panel.appendChild(timer);
         let finalText=document.createElement('div');finalText.className='final-text';finalText.textContent='KILL THEM ALL';panel.appendChild(finalText);
      } else {
         let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
         let word=document.createElement('div');word.style.cssText='font-size:22px;font-weight:900;letter-spacing:5px;margin-top:10px;color:#d4af37';word.textContent='OUTLAST';panel.appendChild(word);
         let nextShrink= s.outlast.startEpoch + (Math.floor((hostNow-s.outlast.startEpoch)/iv)+1)*iv;
         if(nextShrink - hostNow <= 30000){
            let warn=document.createElement('div');warn.className='shrink-warning';warn.textContent=`NEXT SHRINK IN ${Math.ceil((nextShrink-hostNow)/1000)}s`;panel.appendChild(warn);
         }
      }
   } else {
      let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
      let word=document.createElement('div');word.style.cssText='font-size:22px;font-weight:900;letter-spacing:5px;margin-top:10px;color:#d4af37';word.textContent='OUTLAST';panel.appendChild(word);
   }
   st.append(panel);
   lastOutlastLive=live;
  }else{
   let p=document.createElement('p');p.className='teamBadge';p.textContent=`${s.name} : ${s.team==='A'?s.rules.a:s.rules.b}`;st.append(p);
   let panel=document.createElement('div');panel.className='readyPanel';
   let container=document.createElement('div');
   container.style.cssText='position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:100%; flex-direction:column; padding:20px 0;';
   let statsTop=document.createElement('div');
   statsTop.style.cssText='font-size:28px; font-weight:900; color:#fff; text-shadow:2px 2px 6px #000; margin-bottom:20px; letter-spacing:1px;';
   statsTop.textContent=`Missions: ${(career.outlastWins||[]).length}`;
   let image=document.createElement('img');image.src='./war-adventures-logo.png';image.alt='War Adventures logo';
   image.style.maxHeight='min(30svh, 200px)';
   image.onerror=()=>{image.remove();let word=document.createElement('strong');word.textContent='WAR ADVENTURES';container.append(word)};
   let statsBottom=document.createElement('div');
   statsBottom.style.cssText='display:flex; flex-direction:column; align-items:center; gap:10px; margin-top:20px;';
   let tagStat=document.createElement('div');
   tagStat.style.cssText='font-size:32px; font-weight:900; color:#fff; text-shadow:2px 2px 6px #000; display:flex; align-items:center; gap:10px;';
   let tagImg=document.createElement('img');
   tagImg.src='./dogtag.svg';
   tagImg.style.width='32px';
   tagImg.style.height='32px';
   let tagNum=document.createElement('span');
   tagNum.textContent=career.lifetimeTags||0;
   tagStat.append(tagImg, tagNum);
   let medicStat=document.createElement('div');
   medicStat.style.cssText='font-size:32px; font-weight:900; color:#fff; text-shadow:2px 2px 6px #000; display:flex; align-items:center; gap:10px;';
   let medicEmoji=document.createElement('span');
   medicEmoji.textContent='💉';
   let medicNum=document.createElement('span');
   medicNum.textContent=career.lifetimeMedics||0;
   medicStat.append(medicEmoji, medicNum);
   statsBottom.append(tagStat, medicStat);
   container.append(statsTop, image, statsBottom);
   panel.append(container);
   st.append(panel);
  }
 }
 let groups=new Map();
 for(let w of s.wins){let g=groups.get(w.owner)||{name:w.name,items:[]};g.items.push(w);groups.set(w.owner,g)}
 let wall=$('trophies');
 if(wall){
  wall.replaceChildren();
  if(!groups.size)wall.textContent='None yet';
  const tileIcon=s.mode==='outlast'?'☠️':'./dogtag.svg';
  for(let g of groups.values()){
   let b=document.createElement('button');b.className='tile';
   if(tileIcon.startsWith('./')){let img=document.createElement('img');img.src=tileIcon;img.alt='';img.style.width='22px';img.style.height='22px';img.style.verticalAlign='middle';b.appendChild(img)}
   else{let em=document.createElement('span');em.textContent=tileIcon;em.style.fontSize='22px';b.appendChild(em)}
   let strong=document.createElement('strong');strong.textContent=' '+g.items.length;
   let label=document.createElement('span');label.textContent=g.name.slice(0,4).toUpperCase();
   b.append(strong,label);
   b.onclick=()=>{const dlg=$('dialog');dlg.classList.remove('armoury');let area=$('dialogText');area.replaceChildren();let hh=document.createElement('h2');hh.textContent=g.name;area.append(hh);for(let w of [...g.items].reverse()){let p=document.createElement('p');p.textContent=`${w.team}${w.n} · ${w.offer.slice(0,10)} · ${new Date(w.capturedAt).toLocaleString()}`;area.append(p)}dlg.showModal()};
   wall.append(b);
  }
 }
 const medals=$('medals');if(medals)medals.textContent=s.medics.length?'💉 '+s.medics.length+' medic assists':'';
 const hist=$('history');
 if(hist){hist.replaceChildren();for(let e of [...s.events].reverse()){let li=document.createElement('li');li.textContent=e.at+': '+e.message;hist.append(li)}}
 const pb=$('pendingBox');if(pb)pb.classList.toggle('hidden',!s.medPending);
 const pi=$('pendingInfo');if(pi)pi.textContent=s.medPending?`Waiting for fresh second scan of ${s.medPending.name} before ${new Date(s.medPending.deadline).toLocaleString()}`:'';
 const ht=$('hostTools');if(ht)ht.classList.toggle('hidden',!HOST_MODE||!h||h.gid!==s.gid);
 const pbb=$('playBaseBtns');if(pbb&&h)pbb.classList.toggle('hidden',h.mode==='outlast');
 if(respawning){const rt=$('respawnTimer');if(rt){let t=Math.max(0,Math.ceil((s.respawnDeadline-time())/1000));rt.textContent=t;}}
}
function render(){renderSetup();renderPlay()}
/* --- ARMOURY --- */
function renderArmoury(){
 const status=$('armouryStatus'),grid=$('armouryGrid');if(!status||!grid)return;
 status.textContent='';grid.replaceChildren();
 const state=careerState();
 const totalDistinct=new Set(career.artefacts.map(a=>a.gunId)).size;
 if(state==='dormant'){status.textContent='Collection dormant. '+career.artefacts.length+' artifacts hidden. Ask the host to unlock careers.'}
 else if(state==='active'){if(career.artefacts.length===0)status.textContent='No artifacts yet. Find them on the field.';else status.textContent=career.artefacts.length+' collected · '+totalDistinct+' of 8 variants'}
 GUN_ORDER.forEach(gunId=>{
  const gun=GUNS[gunId];
  const variants=state==='active'?careerVariantsFor(gunId):[];
  const tc=TIER_COLOUR[gun.tier];
  const slot=document.createElement('div');slot.className='armourySlot';
  const card=document.createElement('div');card.className='armouryCard';
  if(variants.length>0){
   const img=document.createElement('img');img.src=gun.img;img.alt=gun.name;card.appendChild(img);
   const nm=document.createElement('div');nm.className='armouryName';nm.textContent=gun.name;card.appendChild(nm);
   const pat=document.createElement('div');pat.className='armouryPattern';pat.textContent=(variants[0].gameName||'—')+(variants.length>1?' ×'+variants.length:'');card.appendChild(pat);
   card.onclick=()=>showArmouryDetail(gunId);
  }else{
   card.classList.add('locked');
   const q=document.createElement('div');q.className='armouryQ';q.textContent='?';card.appendChild(q);
   const nm=document.createElement('div');nm.className='armouryName';nm.textContent=gun.name;card.appendChild(nm);
  }
  slot.appendChild(card);
  const tierEl=document.createElement('div');tierEl.className='armouryTier';tierEl.style.color=tc;tierEl.textContent=gun.tier;slot.appendChild(tierEl);
  grid.appendChild(slot);
 });
 const winCount=(career.outlastWins||[]).length;
 const oslot=document.createElement('div');oslot.className='armouryOutlastSlot';
 const ocard=document.createElement('div');ocard.className='armouryOutlastCard';
 const icon=document.createElement('div');icon.className='icon';icon.textContent='🎯';ocard.appendChild(icon);
 const num=document.createElement('div');num.className='num';num.textContent=String(winCount);ocard.appendChild(num);
 const lbl=document.createElement('div');lbl.className='lbl';lbl.textContent='OUTLAST WINS';ocard.appendChild(lbl);
 oslot.appendChild(ocard);
 const otier=document.createElement('div');otier.className='armouryOutlastTier';otier.textContent='CAREER TALLY';oslot.appendChild(otier);
 grid.appendChild(oslot);
}
function showArmouryDetail(gunId){
 const gun=GUNS[gunId];
 const variants=careerVariantsFor(gunId);
 if(!variants.length)return;
 const dlg=$('dialog');
 dlg.classList.add('armoury');
 const area=$('dialogText');area.replaceChildren();
 const img=document.createElement('img');img.src=gun.img;img.alt=gun.name;img.style.display='block';img.style.width='100%';img.style.maxHeight='220px';img.style.objectFit='contain';img.style.margin='0 auto 8px';area.appendChild(img);
 const h1=document.createElement('h2');h1.textContent=gun.name;h1.style.textAlign='center';area.appendChild(h1);
 const tier=document.createElement('p');tier.textContent=gun.tier;tier.style.fontWeight='800';tier.style.textAlign='center';tier.style.margin='0 0 12px 0';area.appendChild(tier);
 if(variants.length===1){
  const v=variants[0];
  const p1=document.createElement('p');p1.textContent='Found in: '+v.gameName;area.appendChild(p1);
  const p2=document.createElement('p');p2.className='compact';p2.textContent='Collected '+new Date(v.claimedAt).toLocaleString();area.appendChild(p2);
 }else{
  const hh=document.createElement('p');hh.textContent='Variants found ('+variants.length+'):';hh.style.fontWeight='700';area.appendChild(hh);
  const ul=document.createElement('ul');ul.style.padding='0 0 0 20px';ul.style.margin='0';
  variants.forEach(v=>{const li=document.createElement('li');li.textContent=gun.name+' | '+v.gameName+' — '+new Date(v.claimedAt).toLocaleDateString();ul.appendChild(li)});
  area.appendChild(ul);
 }
 dlg.showModal();
}
/* --- PRINT --- */
function showPrintOverlay(){
 if(!HOST_MODE)return;
 if(!h||!h.artifacts||!h.artifacts.length){note('Select artifacts first');return}
 const area=$('printArea');if(!area)return;area.replaceChildren();
 h.artifacts.forEach(gunId=>{
  const gun=GUNS[gunId];
  const artifactId=(h.artifactIds&&h.artifactIds[gunId])||hex().slice(0,16);
  if(!h.artifactIds)h.artifactIds={};
  if(!h.artifactIds[gunId]){h.artifactIds[gunId]=artifactId}
  const wrapper=document.createElement('div');wrapper.className='printCard';
  const img=document.createElement('img');img.src=gun.img;img.alt=gun.name;wrapper.appendChild(img);
  const title=document.createElement('h3');title.textContent=gun.name+' | '+h.game;wrapper.appendChild(title);
  const qbox=document.createElement('div');qbox.className='qr';wrapper.appendChild(qbox);
  makeQR(qbox,artifactCode(gunId,artifactId,h.gid,h.game),200);
  const codeEl=document.createElement('p');codeEl.className='code';codeEl.textContent='MU4 · '+artifactId;wrapper.appendChild(codeEl);
  area.appendChild(wrapper);
 });
 saveHost(h);
 const po=$('printOverlay');if(po)po.classList.remove('hidden');
}
function printBaseSigns(){
 if(!HOST_MODE)return;
 const area=$('printArea');if(!area)return;area.replaceChildren();
 ['R1','R2','R3','R4','R5','B1','B2','B3','B4','B5'].forEach(id=>{
  const wrapper=document.createElement('div');wrapper.className='printCard';
  const title=document.createElement('h3');title.textContent=id;title.style.fontSize='32px';wrapper.appendChild(title);
  const qbox=document.createElement('div');qbox.className='qr';wrapper.appendChild(qbox);
  makeQR(qbox,code('SIGN',id),200);
  const codeEl=document.createElement('p');codeEl.className='code';codeEl.textContent='MU4 · SIGN · '+id;wrapper.appendChild(codeEl);
  area.appendChild(wrapper);
 });
 const po=$('printOverlay');if(po)po.classList.remove('hidden');
}
/* --- BOUNDARY WATCH --- */
function startBoundaryWatch(){
 if(boundaryWatchId!==null)return;
 if(!navigator.geolocation)return;
 try{
  boundaryWatchId=navigator.geolocation.watchPosition(p=>{
   lastGpsPos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy};
  },()=>{lastGpsPos=null},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
 }catch(e){}
}
function stopBoundaryWatch(){if(boundaryWatchId!==null){try{navigator.geolocation.clearWatch(boundaryWatchId)}catch(e){}boundaryWatchId=null;lastGpsPos=null;outOfBoundsSince=0}}
function tickBoundary(){
 if(!s||s.mode!=='outlast'||!s.outlast)return;
 if(s.phase!=='ACTIVE')return;
 if(time()<s.outlast.startEpoch){outOfBoundsSince=0;return}
 if(!lastGpsPos){outOfBoundsSince=0;return}
 const hostNow=time();
 const r=currentRadius(s.outlast,hostNow);
 const d=distanceMeters(lastGpsPos.lat,lastGpsPos.lng,s.outlast.targetLat,s.outlast.targetLng);
 if(d<=r){outOfBoundsSince=0;return}
 const now=time();
 if(outOfBoundsSince===0)outOfBoundsSince=now;
 const elapsed=now-outOfBoundsSince;
 if(now-lastGpsBuzz>=2000){lastGpsBuzz=now;buzz('return');note(`OUT OF BOUNDS — return to the circle. ${Math.max(0,Math.ceil((10000-elapsed)/1000))}s`)}
 if(elapsed>=10000){
  outOfBoundsSince=0;
  edit(x=>{x.tags[0].status='LOST';x.offer=null;x.outbound=null;x.phase='ELIMINATED';record(x,'Out of bounds — ELIMINATED')});
  buzz('elim');
  note('ELIMINATED — you left the circle.');
 }
}
/* --- SCAN --- */
async function stopScan(){let item=scanner;scanner=null;$('camera').classList.add('hidden');$('joinCamera').classList.add('hidden');if(item){try{await item.stop()}catch(e){}try{item.clear()}catch(e){}}busy=false}
async function scan(kind,mode){
 currentScanMode=mode||'normal';reconcile();
 if(kind==='play'&&!s)return;
 if(kind==='join'){
   if(!career)loadCareer();
   if(!career.callsign){
     pendingScanAction={kind,mode};
     view='profileSetup';render();
     return;
   }
   view='joinPanel';render();
 }
 await stopScan();
 if(typeof Html5Qrcode!=='function'){note('Scanner library unavailable.');return}
 let joinMode=kind==='join';
 let camBox=$(joinMode?'joinCamera':'camera');camBox.classList.remove('hidden');
 let lbl=camBox.querySelector('h2.scanLabel');
 if(!lbl){lbl=document.createElement('h2');lbl.className='scanLabel';camBox.insertBefore(lbl,camBox.firstChild)}
 lbl.textContent=joinMode?'SCAN HOST QR':(mode==='tag'?'SCAN TAGS TAKEN':(mode==='heal'?'SCAN HEALED':'SCAN QR'));
 try{
  let item=new Html5Qrcode(joinMode?'joinReader':'reader');
  scanner=item;
  await item.start({facingMode:'environment'},{fps:10,qrbox:{width:200,height:200}},async text=>{
   if(busy)return;busy=true;await stopScan();
   try{ await (joinMode?getJoin(text):accept(text)) }catch(e){note(e.message)}
  },()=>{});
 }catch(e){note('Camera error: '+((e&&e.message)?e.message:String(e)||'unknown'));await stopScan()}
}
function download(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mash-unit-${s.game}-${s.team}-${s.id.slice(0,6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
/* --- END GAME --- */
async function endGame(){
 if(!s)return;
 if(!confirm(`End ${s.game}? This removes this game's local log. Your career and saved schedule remain. Export first if you want a copy.`))return;
 await stopScan();
 try{stopBoundaryWatch()}catch(e){}
 let candidate=joins;
 if(s.gid){
  const idx=joins.findIndex(j=>j.gid===s.gid);
  if(idx>=0){
   candidate=joins.map(j=>j.gid===s.gid?{...j,status:'COMPLETED'}:j);
   if(!saveJoins(candidate)){note('Could not mark game complete. Try again.');return;}
   joins=candidate;
  }
 }
 localStorage.removeItem(KEY);
 s=null;
 document.body.classList.remove('returning','mist');
 view='myGames';
 render();
 note('Game ended.');
}
/* --- COMMON BINDINGS --- */
function bindClick(id,handler){const el=$(id);if(el)el.onclick=handler}
bindClick('joinOpen',()=>scan('join'));
bindClick('joinBack',async()=>{await stopScan();view=(HOST_MODE&&h)?'hostPanel':'choice';render();});
bindClick('joinScan',()=>scan('join'));
bindClick('joinStop',stopScan);
bindClick('previewBack',()=>{
  const fromMG=previewFromMyGames;
  pending=null;previewFromMyGames=false;
  view=fromMG?'myGames':((HOST_MODE&&h)?'hostPanel':'choice');
  render();
});
bindClick('confirmJoin',join);
bindClick('hit',hit);
bindClick('scan',()=>scan('play'));
bindClick('stop',stopScan);
bindClick('cancelMedic',cancelMedic);
bindClick('export',()=>{if(s)download()});
bindClick('endSessionActive',endGame);
bindClick('endGameDetails',endGame);
bindClick('reset',()=>{if(!s||!confirm("Erase this phone's player game and personal history?"))return;localStorage.removeItem(KEY);s=null;document.body.classList.remove('returning','mist');stopBoundaryWatch();view=(HOST_MODE&&h)?'hostPanel':'choice';render();note('Player reset.')});
bindClick('myGamesActiveBtn',()=>{if(s){view='play';render();}});
bindClick('joinActiveBtn',async()=>{await stopScan();if(s){view='play';render();}});
bindClick('closeDialog',()=>$('dialog').close());
bindClick('armouryOpen',()=>{loadCareer();careerPurgeIfExpired();renderArmoury();$('armouryOverlay').classList.remove('hidden')});
bindClick('armouryPlayBtn',()=>{loadCareer();careerPurgeIfExpired();renderArmoury();$('armouryOverlay').classList.remove('hidden')});
bindClick('armouryClose',()=>$('armouryOverlay').classList.add('hidden'));
bindClick('myGamesOpen',()=>{loadJoins();view='myGames';render()});
bindClick('myGamesBack',()=>{view=(HOST_MODE&&h)?'hostPanel':'choice';render()});
bindClick('myGamesScan',()=>scan('join'));
bindClick('saveCallsign',()=>{
  const input=$('batchCallsignInput');
  if(!input)return;
  let n=input.value.trim();
  if(!nameOK(n)){note('Enter a callsign up to 32 characters');return}
  career.callsign=n;saveCareer();
  if(pendingScanAction){const act=pendingScanAction;pendingScanAction=null;view='choice';render();scan(act.kind,act.mode);}
  else{view='myGames';render();}
});
bindClick('saveSetupCallsign',()=>{
  const n=$('setupCallsign').value.trim();
  if(!nameOK(n)){note('Enter a callsign up to 32 characters');return}
  career.callsign=n;saveCareer();
  const act=pendingScanAction||{kind:'join'};
  pendingScanAction=null;
  note('');
  scan(act.kind,act.mode);
});
/* --- HOST-ONLY BINDINGS --- */
if(HOST_MODE){
 bindClick('hostOpen',()=>{view='hostForm';hostMode='standard';hostTarget=null;applyHostMode();const el=$('olStartTime');if(el&&!el.value)el.value=defaultOlStartValue();render()});
 bindClick('hostBatchOpen',()=>{
  view='hostBatchForm';
  hostBatch=[]; hostScheduleId=null;
  batchMode='standard';
  let d=new Date(); d.setDate(d.getDate()+((7-d.getDay())%7||7));
  hostBatchDate=d.toISOString().split('T')[0];
  $('batchDate').value=hostBatchDate;
  renderBatchList();
  renderBatchArtifactCheckboxes();
  applyBatchMode();
  render();
 });
 bindClick('addGameToBatch',addGameToBatch);
 const bd=$('batchDate');if(bd)bd.onchange=e=>{hostBatchDate=e.target.value;};
 bindClick('genBatchQRs',generateBatchQR);
 bindClick('printBatchArtifactsBtn',printBatchArtifacts);
 bindClick('batchBack',()=>{view='choice';render()});
 bindClick('batchPanelBack',()=>{view='choice';render()});
 const bms=$('batchModeStandard'),bmo=$('batchModeOutlast');if(bms)bms.onclick=()=>{batchMode='standard';applyBatchMode();};if(bmo)bmo.onclick=()=>{batchMode='outlast';applyBatchMode();};
 const bpt=$('batchPickTarget');if(bpt)bpt.onclick=()=>{placingTarget=true;openMapForTarget()};
 bindClick('hostBack',()=>{view='choice';render()});
 bindClick('hostBackFromPanel',()=>{view='choice';render()});
 bindClick('create',hostCreate);
 const ms=$('modeStandard'),mo=$('modeOutlast');
 if(ms)ms.onclick=()=>{hostMode='standard';applyHostMode();updateOutlastPreview()};
 if(mo)mo.onclick=()=>{hostMode='outlast';applyHostMode();updateOutlastPreview()};
 ['olStartR','olStep','olInterval','olStartTime'].forEach(id=>{const el=$(id);if(el)el.oninput=updateOutlastPreview});
 const pt=$('pickTarget');if(pt)pt.onclick=()=>{placingTarget=true;openMapForTarget()};
 const wm=$('hostWatchMap');if(wm)wm.onclick=()=>{if(window._hostWatchMap)window._hostWatchMap()};
 for(let [id,type,t,target] of [['hostJA','J','A','hostQR'],['hostJB','J','B','hostQR'],['hostBA','B','A','hostQR'],['hostBB','B','B','hostQR'],['playJA','J','A','playHostQR'],['playJB','J','B','playHostQR'],['playBA','B','A','playHostQR'],['playBB','B','B','playHostQR']]){
  const el=$(id);if(el)el.onclick=()=>hostDraw(type,t,target);
 }
 bindClick('selfA',()=>{try{getJoin(joinCode('A'))}catch(e){note(e.message)}});
 bindClick('selfB',()=>{try{getJoin(joinCode('B'))}catch(e){note(e.message)}});
 bindClick('eraseHost',()=>{if(s){note('Reset player first.');return}if(confirm('Erase host codes on THIS phone?')){localStorage.removeItem(HOST);h=null;view='choice';render();note('Host setup erased.')}});
 const uc=$('unlockCareers');if(uc)uc.onchange=e=>{if(!h)return;h.unlockCareers=e.target.checked;saveHost(h);note(e.target.checked?'Career unlock ON':'Career unlock OFF')};
 bindClick('genArtifacts',()=>{if(!h)return;const checked=[];document.querySelectorAll('#artifactList input:checked').forEach(cb=>checked.push(cb.value));if(checked.length===0){note('Tick at least one artifact');return}h.artifacts=checked;if(!h.artifactIds)h.artifactIds={};checked.forEach(gunId=>{if(!h.artifactIds[gunId])h.artifactIds[gunId]=hex().slice(0,16)});saveHost(h);showPrintOverlay()});
 const gbs=$('genBaseSignsHome');if(gbs)gbs.onclick=printBaseSigns;
 const sw=$('showWinnerQR');
 if(sw)sw.onclick=()=>{
  if(!h||h.mode!=='outlast')return;
  const area=$('dialogText');area.replaceChildren();
  const hh=document.createElement('h2');hh.textContent='WINNER QR';hh.style.textAlign='center';area.appendChild(hh);
  const p=document.createElement('p');p.textContent='Have the winner scan this.';p.style.textAlign='center';area.appendChild(p);
  const box=document.createElement('div');box.className='qr';box.style.background='#fff';box.style.padding='16px';box.style.display='flex';box.style.justifyContent='center';box.style.width='max-content';box.style.margin='8px auto';box.style.borderRadius='4px';area.appendChild(box);
  makeQR(box,winnerCode(),216);
  const dlg=$('dialog');dlg.classList.remove('armoury');dlg.showModal();
 };
 const pc=$('printClose');if(pc)pc.onclick=()=>$('printOverlay').classList.add('hidden');
 const pb=$('printBtn');if(pb)pb.onclick=()=>{try{window.print()}catch(e){}};
}
function applyHostMode(){
 const isOutlast=hostMode==='outlast';
 ['livesLabel','secondsLabel','medicLabel','respawnModeLabel'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',isOutlast)});
 const la=$('labelA');if(la){const row=la.closest('.row');if(row)row.style.display=isOutlast?'none':''}
 const op=$('outlastPanel');if(op)op.classList.toggle('hidden',!isOutlast);
 const ms=$('modeStandard'),mo=$('modeOutlast');
 if(ms)ms.className=isOutlast?'wide alt':'wide';
 if(mo)mo.className=isOutlast?'wide':'wide alt';
 const ti=$('targetInfo');
 if(ti)ti.textContent=hostTarget?`Target set: ${hostTarget.lat.toFixed(5)}, ${hostTarget.lng.toFixed(5)}`:'No target set';
 updateOutlastPreview();
}
function applyBatchMode(){
 const isOutlast=batchMode==='outlast';
 ['batchStandardFields','batchStandardSigns'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',isOutlast)});
 const op=$('batchOutlastFields');if(op)op.classList.toggle('hidden',!isOutlast);
 const bms=$('batchModeStandard'),bmo=$('batchModeOutlast');
 if(bms)bms.className=isOutlast?'wide alt':'wide';
 if(bmo)bmo.className=isOutlast?'wide':'wide alt';
 const ti=$('batchTargetInfo');
 if(ti)ti.textContent=batchTarget?`Target set: ${batchTarget.lat.toFixed(5)}, ${batchTarget.lng.toFixed(5)}`:'No target set';
}
/* --- MAP --- */
(function(){
 let overlay=$('mapOverlay'),viewport=$('mapViewport'),inner=$('mapInner'),img=$('mapImage'),gridLayer=$('mapGridLayer'),markersBox=$('mapMarkers'),boundarySvg=$('mapBoundarySvg'),dot=$('mapBlueDot'),youLabel=$('mapYouLabel'),banner=$('mapBanner'),status=$('mapStatus'),countdown=$('mapCountdown');
 let debugPanel=$('mapDebugPanel'),debugText=$('mapDebugText');
 let tools={grid:$('mapGridBtn'),loc:$('mapLocBtn'),cal:$('mapCalBtn'),debug:$('mapDebugBtn')};
 const urlParams=new URLSearchParams(location.search);
 if(urlParams.has('debug'))try{localStorage.setItem('mash-debug','1')}catch(e){}
 if(urlParams.has('nodebug'))try{localStorage.removeItem('mash-debug')}catch(e){}
 const DEBUG_MODE=(()=>{try{return localStorage.getItem('mash-debug')==='1'}catch(e){return false}})();
 if(!DEBUG_MODE){if(tools.cal)tools.cal.style.display='none';if(tools.debug)tools.debug.style.display='none'}
 if(!overlay||!viewport||!inner||!img||!gridLayer)return;
 let scale=1,tx=0,ty=0,startScale=1,startTx=0,startTy=0,startDist=0,startMidX=0,startMidY=0,startX=0,startY=0,pinching=false,panning=false,lastLift=0,wasSingle=false,gridOn=false,calLock=false;
 function showBanner(msg,ms){banner.textContent=msg;banner.style.display='block';if(ms)setTimeout(()=>{if(banner.textContent===msg)banner.style.display='none'},ms)}
 function showStatus(msg){if(msg){status.textContent=msg;status.style.display='block'}else{status.style.display='none'}}
 function apply(){inner.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';document.querySelectorAll('.mapMarker').forEach(el=>{el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')'});dot.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';youLabel.style.transform='translate(-50%,30px) scale('+(1/scale)+')'}
 function reset(){scale=1;tx=0;ty=0;apply()}
 function dist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
 function midX(a,b){return (a.clientX+b.clientX)/2}
 function midY(a,b){return (a.clientY+b.clientY)/2}
 function clamp(s){return Math.max(1,Math.min(5,s))}
 function clampPan(){const vw=viewport.clientWidth,vh=viewport.clientHeight,iw=inner.clientWidth*scale,ih=inner.clientHeight*scale,minTx=Math.min(0,vw-iw),minTy=Math.min(0,vh-ih);if(tx>0)tx=0;if(tx<minTx)tx=minTx;if(ty>0)ty=0;if(ty<minTy)ty=minTy}
 function loadAnchors(){try{const raw=localStorage.getItem(ANCHOR_KEY);if(raw){const a=JSON.parse(raw);if(a.a&&a.b&&typeof a.a.xPct==='number'&&typeof a.b.xPct==='number'){anchors=a;return}}}catch(e){}anchors=DEFAULT_ANCHORS}
 function saveAnchors(){try{localStorage.setItem(ANCHOR_KEY,JSON.stringify(anchors))}catch(e){}}
 function getImgDims(){const iw=img.naturalWidth||img.clientWidth||1,ih=img.naturalHeight||img.clientHeight||1;return {iw,ih}}
 function mPerPxNow(){if(!anchors||!anchors.a||!anchors.b)return null;const a=anchors.a,b=anchors.b;const {iw,ih}=getImgDims();const latAvg=((a.lat+b.lat)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const vgx=(b.lng-a.lng)*mLng, vgy=(b.lat-a.lat)*mLat;const vpx=(b.xPct-a.xPct)*iw, vpy=(b.yPct-a.yPct)*ih;const lenG=Math.hypot(vgx,vgy),lenP=Math.hypot(vpx,vpy);if(lenG<1||lenP<1e-6)return null;return lenG/lenP}
 function gpsToPct(lat,lng){if(!anchors||!anchors.a||!anchors.b)return null;const a=anchors.a,b=anchors.b;const {iw,ih}=getImgDims();const latAvg=((a.lat+b.lat)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const vgx=(b.lng-a.lng)*mLng, vgy=(b.lat-a.lat)*mLat;const vpx=(b.xPct-a.xPct)*iw, vpy=(b.yPct-a.yPct)*ih;const lenG=Math.hypot(vgx,vgy),lenP=Math.hypot(vpx,vpy);if(lenG<1||lenP<1e-6)return null;const mPerPx=lenG/lenP;const dxUser=(lng-a.lng)*mLng;const dyUser=(lat-a.lat)*mLat;const pxUser=dxUser/mPerPx;const pyUser=-dyUser/mPerPx;return {xPct:a.xPct+pxUser/iw,yPct:a.yPct+pyUser/ih}}
 function pctToGps(xPct,yPct){if(!anchors||!anchors.a||!anchors.b)return null;const a=anchors.a,b=anchors.b;const {iw,ih}=getImgDims();const latAvg=((a.lat+b.lat)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const vgx=(b.lng-a.lng)*mLng, vgy=(b.lat-a.lat)*mLat;const vpx=(b.xPct-a.xPct)*iw, vpy=(b.yPct-a.yPct)*ih;const lenG=Math.hypot(vgx,vgy),lenP=Math.hypot(vpx,vpy);if(lenG<1||lenP<1e-6)return null;const mPerPx=lenG/lenP;const pxUser=(xPct-a.xPct)*iw, pyUser=(yPct-a.yPct)*ih;const dxUser=pxUser*mPerPx;const dyUser=-pyUser*mPerPx;return {lat:a.lat+dyUser/mLat,lng:a.lng+dxUser/mLng}}
 function computeGridSpacingNativePx(){const m=mPerPxNow();if(!m)return null;return 10/m}
 function applyGrid(){if(!anchors||!anchors.a||!anchors.b){gridLayer.classList.remove('on');return}const spacingNative=computeGridSpacingNativePx();if(!spacingNative){gridLayer.classList.remove('on');return}const {iw,ih}=getImgDims();const layoutW=img.clientWidth||iw;const layoutH=img.clientHeight||ih;const spacingX=(spacingNative/iw)*layoutW;const spacingY=(spacingNative/ih)*layoutH;const svg='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="0" x2="2" y2="0" stroke="black" stroke-width="0.15"/><line x1="4" y1="0" x2="6" y2="0" stroke="black" stroke-width="0.15"/><line x1="8" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.15"/><line x1="0" y1="0" x2="0" y2="2" stroke="black" stroke-width="0.15"/><line x1="0" y1="4" x2="0" y2="6" stroke="black" stroke-width="0.15"/><line x1="0" y1="8" x2="0" y2="10" stroke="black" stroke-width="0.15"/></svg>';const b64=btoa(svg);gridLayer.style.backgroundImage='url("data:image/svg+xml;base64,'+b64+'")';gridLayer.style.backgroundSize=spacingX+'px '+spacingY+'px';gridLayer.classList.toggle('on',gridOn)}
 function drawMarker(name,lat,lng,colour,showLabel){if(!markersBox)return;const pct=gpsToPct(lat,lng);if(!pct)return;if(pct.xPct<-0.05||pct.xPct>1.05||pct.yPct<-0.05||pct.yPct>1.05)return;const el=document.createElement('div');el.className='mapMarker';el.style.left=(pct.xPct*100)+'%';el.style.top=(pct.yPct*100)+'%';el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';const d=document.createElement('div');d.className='mapMarkerDot';d.style.background=colour;el.appendChild(d);if(showLabel){const l=document.createElement('div');l.className='mapMarkerLabel';l.textContent=name;el.appendChild(l)}markersBox.appendChild(el)}
 function renderMarkers(){
  if(!markersBox)return;markersBox.replaceChildren();
  if(!anchors||!anchors.a||!anchors.b)return;
  const myTeam=s?s.team:null;
  const isOutlast=s?.mode==='outlast';
  const myBaseLabel=myTeam?(myTeam==='A'?s.rules.a:s.rules.b):'';
  const myBaseName=myTeam?(myTeam==='A'?s.baseA:s.baseB):null;
  const myColour=myTeam==='A'?'#a7222c':(myTeam==='B'?'#1c5daa':'#888');
  drawMarker('SAFE ZONE',BASES['Safe Zone'].lat,BASES['Safe Zone'].lng,'#d4af37',true);
  if(!isOutlast&&myBaseName&&BASES[myBaseName]){
    drawMarker('🏰 START',BASES[myBaseName].lat,BASES[myBaseName].lng,myColour,true);
    if(s.rules.respawnMode!=='timed')drawMarker('🏥 RESPAWN',BASES[myBaseName].lat,BASES[myBaseName].lng,myColour,true);
  }
  if(gridOn&&!isOutlast){Object.keys(BASES).forEach(name=>{if(name==='Safe Zone')return;if(name===myBaseName)return;drawMarker(name,BASES[name].lat,BASES[name].lng,'#888',true)})}
  document.querySelectorAll('.mapMarker').forEach(el=>{el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')'});
 }
 function renderBoundary(){
  if(!boundarySvg)return;
  boundarySvg.replaceChildren();
  const olData = (s&&s.mode==='outlast'&&s.outlast) ? s.outlast : ((h&&h.mode==='outlast'&&h.outlast) ? h.outlast : null);
  if(!olData)return;
  const m=mPerPxNow();if(!m)return;
  const {iw,ih}=getImgDims();
  boundarySvg.setAttribute('viewBox','0 0 '+iw+' '+ih);
  const tp=gpsToPct(olData.targetLat,olData.targetLng);if(!tp)return;
  const cx=tp.xPct*iw,cy=tp.yPct*ih;
  const hostNow = time();
  const curR=currentRadius(olData,hostNow);
  const nextR=Math.max(olData.endRadius,curR-olData.step);
  const c1=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c1.setAttribute('cx',cx);c1.setAttribute('cy',cy);c1.setAttribute('r',curR/m);
  c1.setAttribute('fill','rgba(200,40,40,0.10)');
  c1.setAttribute('stroke','#c0392b');
  c1.setAttribute('stroke-width','3');
  c1.setAttribute('vector-effect','non-scaling-stroke');
  boundarySvg.appendChild(c1);
  if(nextR<curR&&nextR>olData.endRadius){
   const c2=document.createElementNS('http://www.w3.org/2000/svg','circle');
   c2.setAttribute('cx',cx);c2.setAttribute('cy',cy);c2.setAttribute('r',nextR/m);
   c2.setAttribute('fill','none');
   c2.setAttribute('stroke','#fff');
   c2.setAttribute('stroke-width','2');
   c2.setAttribute('stroke-dasharray','8 8');
   c2.setAttribute('vector-effect','non-scaling-stroke');
   boundarySvg.appendChild(c2);
  }
  if(curR<=10){
   const t=document.createElementNS('http://www.w3.org/2000/svg','text');
   t.setAttribute('x',cx);t.setAttribute('y',cy);
   t.setAttribute('text-anchor','middle');
   t.setAttribute('dominant-baseline','middle');
   t.setAttribute('font-size',String(iw*0.05));
   t.textContent='🎯';
   boundarySvg.appendChild(t);
  }
 }
 function updateStatusDefault(){if(anchors&&anchors.a&&anchors.b)showStatus('Anchors set. Grid + GPS ready.');else showStatus('No anchors. Tap CAL to set.')}
 function updateBlueDot(lat,lng,accuracy){if(!anchors||!anchors.a||!anchors.b){dot.style.display='none';youLabel.style.display='none';return}const pct=gpsToPct(lat,lng);if(!pct){dot.style.display='none';youLabel.style.display='none';return}dot.style.left=(pct.xPct*100)+'%';dot.style.top=(pct.yPct*100)+'%';dot.style.display='block';youLabel.style.left=(pct.xPct*100)+'%';youLabel.style.top=(pct.yPct*100)+'%';youLabel.textContent='You ±'+Math.round(accuracy||0)+'m';youLabel.style.display='block';dot.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';youLabel.style.transform='translate(-50%,30px) scale('+(1/scale)+')';if(pct.xPct<0||pct.xPct>1||pct.yPct<0||pct.yPct>1){showBanner('You appear to be off the map ('+(pct.xPct*100).toFixed(0)+'%, '+(pct.yPct*100).toFixed(0)+'%)',5000)}}
 function setLocActive(on){if(tools.loc){if(on)tools.loc.classList.add('active');else tools.loc.classList.remove('active')}}
 function startWatch(){if(mapWatchId!==null){setLocActive(true);return}if(!navigator.geolocation){showBanner('GPS not supported on this device',4000);return}try{mapWatchId=navigator.geolocation.watchPosition(p=>updateBlueDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy),e=>{dot.style.display='none';youLabel.style.display='none';showBanner('GPS error: '+e.message+' (code '+e.code+')',5000)}, {enableHighAccuracy:true,maximumAge:5000,timeout:20000});setLocActive(true)}catch(e){showBanner('GPS exception: '+e.message,5000)}}
 function stopWatch(){if(mapWatchId!==null){try{navigator.geolocation.clearWatch(mapWatchId)}catch(e){}mapWatchId=null}setLocActive(false)}
 function enterCalibrate(){calibrating={step:1};calLock=false;showBanner('Step 1 of 2: Tap the map where Bird Rd Cnr is (western field corner).');tools.cal.classList.add('active')}
 function exitCalibrate(){calibrating=null;calLock=false;banner.style.display='none';tools.cal.classList.remove('active')}
 function handleCalibrateTap(clientX,clientY){
  if(calLock)return;
  const rect=img.getBoundingClientRect();
  const xRatio=(clientX-rect.left)/rect.width;
  const yRatio=(clientY-rect.top)/rect.height;
  if(xRatio<0||xRatio>1||yRatio<0||yRatio>1){showBanner('Tap inside the image',2500);return}
  const {iw,ih}=getImgDims();
  if(calibrating.step===1){calibrating.a={lat:ANCHOR_LOCS['Bird Rd Cnr'].lat,lng:ANCHOR_LOCS['Bird Rd Cnr'].lng,xPct:xRatio,yPct:yRatio,name:'Bird Rd Cnr'};calibrating.step=2;calLock=true;showBanner('Locked. Now tap Bonfire — 1 second...',1000);setTimeout(()=>{calLock=false;showBanner('Step 2 of 2: Tap the map where Bonfire is (north-east of field).')},1000)}
  else if(calibrating.step===2){const dxPx=(xRatio-calibrating.a.xPct)*iw;const dyPx=(yRatio-calibrating.a.yPct)*ih;const tapDistPx=Math.hypot(dxPx,dyPx);const imgDiagPx=Math.hypot(iw,ih);if(tapDistPx<imgDiagPx*0.15){showBanner('Taps too close.',3500);return}calibrating.b={lat:ANCHOR_LOCS['Bonfire'].lat,lng:ANCHOR_LOCS['Bonfire'].lng,xPct:xRatio,yPct:yRatio,name:'Bonfire'};anchors={a:calibrating.a,b:calibrating.b};saveAnchors();exitCalibrate();updateStatusDefault();applyGrid();renderMarkers();startWatch();showBanner('Anchors set.',2500)}
 }
 function handleTargetTap(clientX,clientY){
  const rect=img.getBoundingClientRect();
  const xRatio=(clientX-rect.left)/rect.width;
  const yRatio=(clientY-rect.top)/rect.height;
  if(xRatio<0||xRatio>1||yRatio<0||yRatio>1){showBanner('Tap inside the image',2500);return}
  const g=pctToGps(xRatio,yRatio);if(!g){showBanner('Anchors not ready',2500);return}
  if(view==='hostBatchForm'){
    batchTarget={lat:g.lat,lng:g.lng};
    const ti=$('batchTargetInfo');if(ti)ti.textContent=`Target set: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
  } else {
    hostTarget={lat:g.lat,lng:g.lng};
    const ti=$('targetInfo');if(ti)ti.textContent=`Target set: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
  }
  placingTarget=false;
  overlay.classList.add('hidden');reset();stopWatch();
  showBanner('Target set.',2000);
 }
 viewport.addEventListener('touchstart',function(e){
  if(placingTarget){if(e.touches.length===1)handleTargetTap(e.touches[0].clientX,e.touches[0].clientY);return}
  if(calibrating){if(e.touches.length===1)handleCalibrateTap(e.touches[0].clientX,e.touches[0].clientY);return}
  if(e.touches.length===2){pinching=true;panning=false;wasSingle=false;startDist=dist(e.touches[0],e.touches[1]);startMidX=midX(e.touches[0],e.touches[1]);startMidY=midY(e.touches[0],e.touches[1]);startScale=scale;startTx=tx;startTy=ty}
  else if(e.touches.length===1){const now=Date.now();if(wasSingle&&now-lastLift<300){overlay.classList.add('hidden');reset();stopWatch();wasSingle=false;return}wasSingle=true;panning=true;pinching=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTx=tx;startTy=ty}
 },{passive:true});
 viewport.addEventListener('touchmove',function(e){if(calibrating||placingTarget)return;if(pinching&&e.touches.length===2){e.preventDefault();const d=dist(e.touches[0],e.touches[1]),newScale=clamp(startScale*(d/startDist)),mx=midX(e.touches[0],e.touches[1]),my=midY(e.touches[0],e.touches[1]),ix=(startMidX-startTx)/startScale,iy=(startMidY-startTy)/startScale;scale=newScale;tx=mx-ix*scale;ty=my-iy*scale;clampPan();apply()}else if(panning&&e.touches.length===1){e.preventDefault();tx=startTx+(e.touches[0].clientX-startX);ty=startTy+(e.touches[0].clientY-startY);clampPan();apply()}},{passive:false});
 viewport.addEventListener('touchend',function(e){if(calibrating||placingTarget)return;if(e.touches.length===0){if(wasSingle)lastLift=Date.now();pinching=false;panning=false}else if(e.touches.length===1){pinching=false;panning=true;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTx=tx;startTy=ty}},{passive:true});
 viewport.addEventListener('click',function(e){if(placingTarget)handleTargetTap(e.clientX,e.clientY);else if(calibrating)handleCalibrateTap(e.clientX,e.clientY)});
 const mbtn=$('mapButton');if(mbtn)mbtn.onclick=()=>{reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary()};
 const mclose=$('mapClose');if(mclose)mclose.onclick=()=>{overlay.classList.add('hidden');reset();stopWatch();placingTarget=false};
 if(tools.grid)tools.grid.onclick=()=>{gridOn=!gridOn;tools.grid.classList.toggle('active',gridOn);applyGrid();renderMarkers()};
 if(tools.loc)tools.loc.onclick=()=>{if(mapWatchId!==null){stopWatch();showBanner('GPS tracking off',1500);return}if(!anchors||!anchors.a||!anchors.b){showBanner('Anchors not ready',2500);return}if(!navigator.geolocation){showBanner('GPS not supported',3000);return}showBanner('Getting GPS...');navigator.geolocation.getCurrentPosition(p=>{banner.style.display='none';showStatus('GPS: '+(p.coords.latitude).toFixed(6)+', '+(p.coords.longitude).toFixed(6)+' ±'+Math.round(p.coords.accuracy)+'m');updateBlueDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy);startWatch()},e=>showBanner('GPS error: '+e.message+' (code '+e.code+')',6000),{enableHighAccuracy:true,timeout:20000,maximumAge:0})};
 if(tools.cal)tools.cal.onclick=()=>{if(calibrating){exitCalibrate();return}if(!confirm('Re-calibrate anchors?'))return;anchors=null;try{localStorage.removeItem(ANCHOR_KEY)}catch(e){}dot.style.display='none';youLabel.style.display='none';gridLayer.classList.remove('on');gridOn=false;tools.grid.classList.remove('active');renderMarkers();enterCalibrate()};
 if(tools.debug)tools.debug.onclick=()=>{const raw=localStorage.getItem(ANCHOR_KEY);if(raw){try{debugText.value=JSON.stringify(JSON.parse(raw),null,2)}catch(e){debugText.value=raw}}else{debugText.value=JSON.stringify(DEFAULT_ANCHORS,null,2)+'\n\n(DEFAULT)'}debugPanel.classList.add('on')};
 const dclose=$('mapDebugClose');if(dclose)dclose.onclick=()=>debugPanel.classList.remove('on');
 const dcopy=$('mapDebugCopy');if(dcopy)dcopy.onclick=()=>{debugText.select();debugText.setSelectionRange(0,99999);try{document.execCommand('copy')}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(debugText.value)}catch(e){}showBanner('Copied',1500)};
 function updateMapCountdown(){
   if(!countdown)return;
   const olData = (s && s.mode === 'outlast' && s.outlast) ? s.outlast : (h && h.mode === 'outlast' && h.outlast ? h.outlast : null);
   if(!olData){ countdown.style.display='none'; return; }
   const hostNow = time();
   if(hostNow < olData.startEpoch){ countdown.style.display='none'; return; }
   const iv=olData.intervalMs||(olData.intervalMin?olData.intervalMin*60000:60000);
   const stepsToEnd=Math.ceil((olData.startRadius-olData.endRadius)/olData.step);
   const countdownStart= olData.startEpoch + (stepsToEnd * iv);
   const gameEnd= countdownStart + 30000;
   if(hostNow>=gameEnd){
      countdown.textContent='GAME OVER';countdown.style.display='block';
   } else if(hostNow>=countdownStart){
      let tLeft=Math.ceil((gameEnd-hostNow)/1000);
      countdown.textContent=`KILL THEM ALL: 0:${String(tLeft).padStart(2,'0')}`;
      countdown.style.display='block';
   } else {
      let nextShrink= olData.startEpoch + (Math.floor((hostNow-olData.startEpoch)/iv)+1)*iv;
      if(nextShrink - hostNow <= 30000){
         countdown.textContent=`NEXT SHRINK IN ${Math.ceil((nextShrink-hostNow)/1000)}s`;
         countdown.style.display='block';
      } else {
         countdown.style.display='none';
      }
   }
 }
 loadAnchors();
 window._openMapForTarget=()=>{
  reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary();
  showBanner('Tap the map to place the target',4000);
 };
 window._hostWatchMap=()=>{
  reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary();
  updateMapCountdown();
  showBanner('Host live view — boundary updates automatically',3000);
 };
 window._refreshBoundary=()=>{renderBoundary();updateMapCountdown()};
 window._tickCountdown=()=>{updateMapCountdown()};
})();
function openMapForTarget(){if(window._openMapForTarget)window._openMapForTarget()}
/* --- INIT --- */
(function(){const ba=$('baseA'),bb=$('baseB'),sa=$('signA'),sb=$('signB'),bsa=$('batchSignA'),bsb=$('batchSignB'),bba=$('batchBaseA'),bbb=$('batchBaseB');const main=Object.keys(BASES).filter(k=>BASES[k].group==='main');const sec=Object.keys(BASES).filter(k=>BASES[k].group==='secondary');const safe=Object.keys(BASES).filter(k=>BASES[k].group==='safe');
 function opt(parent,keys){keys.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;parent.appendChild(o)})}
 if(ba&&bb){opt(ba,main);opt(ba,sec);opt(ba,safe);opt(bb,main);opt(bb,sec);opt(bb,safe);ba.value='Church';bb.value='Diego Garcia';}
 if(bsa&&bsb&&bba&&bbb){opt(bba,main);opt(bba,sec);opt(bba,safe);opt(bbb,main);opt(bbb,sec);opt(bbb,safe);bba.value='Church';bbb.value='Diego Garcia';for(let i=1;i<=5;i++){let ra=document.createElement('option');ra.value='R'+i;ra.textContent='R'+i;bsa.appendChild(ra);let rb=document.createElement('option');rb.value='B'+i;rb.textContent='B'+i;bsb.appendChild(rb)}bsa.value='R1';bsb.value='B1';}
 if(sa&&sb){for(let i=1;i<=5;i++){let ra=document.createElement('option');ra.value='R'+i;ra.textContent='R'+i;sa.appendChild(ra);let rb=document.createElement('option');rb.value='B'+i;rb.textContent='B'+i;sb.appendChild(rb)}sa.value='R1';sb.value='B1';}
})();
(function(){['lives','batchLives'].forEach(id=>{const el=$(id);if(!el)return;for(let i=1;i<=20;i++){let x=document.createElement('option');x.value=String(i);x.textContent=String(i);if(i===5)x.selected=true;el.append(x)}})})();
if(HOST_MODE){
 try{let raw=localStorage.getItem(HOST);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid))throw Error('host');h=x;if(!h.mode)h.mode='standard';view='hostPanel'}}catch(e){note('Saved host game unreadable.')}
}
try{let raw=localStorage.getItem(KEY);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!idOK(x.id)||!Array.isArray(x.tags)||!['ACTIVE','OFFERED','RETURN','ELIMINATED','RESPAWNING'].includes(x.phase))throw Error('player');if(!x.mode)x.mode='standard';s=x}}catch(e){note('Saved player data unreadable.')}
loadCareer();careerPurgeIfExpired();
loadJoins();
render();
if(s&&s.mode==='outlast'){startBoundaryWatch()}
reconcile();
setInterval(()=>{
 reconcile();secondsLeft();refreshOffer();tickBoundary();
 if(s&&s.mode==='outlast'&&s.phase==='ACTIVE'&&boundaryWatchId===null)startBoundaryWatch();
 if(s?.medPending&&time()>=s.medPending.deadline)edit(x=>{x.medPending=null;record(x,'Medic attempt expired')});
 if(s&&s.mode==='outlast'&&s.outlast){
  const hostNow=time();
  const live=hostNow>=s.outlast.startEpoch;
  if(live!==lastOutlastLive){
   if(live)buzz('start');
   lastOutlastLive=live;
   if(s.phase==='ACTIVE'&&!s.offer&&!s.outbound)renderPlay();
  }
  if(live){
   const iv=s.outlast.intervalMs||(s.outlast.intervalMin?s.outlast.intervalMin*60000:60000);
   const stepsToEnd=Math.ceil((s.outlast.startRadius-s.outlast.endRadius)/s.outlast.step);
   const countdownStart= s.outlast.startEpoch + (stepsToEnd * iv);
   const gameEnd= countdownStart + 30000;
   if(hostNow>=gameEnd){
      if(s.phase==='ACTIVE') {
         const hitBtn=$('hit');if(hitBtn)hitBtn.disabled=true;
         const scanBtn=$('scan');if(scanBtn)scanBtn.disabled=true;
         const panel=document.querySelector('.readyPanel');
         if(panel){
            const status=panel.querySelector('.liveStatus');
            if(status&&status.textContent!=='GAME OVER'){
               status.textContent='GAME OVER';status.style.color='#ff5963';
               panel.style.background='#0e1c17'; panel.style.border='2px solid #ff5963';
               const oldContents=panel.querySelectorAll('div:not(.liveStatus)');oldContents.forEach(c=>c.remove());
               let endText=document.createElement('div');endText.className='final-text';endText.textContent='AWAITING HOST RESULTS';panel.appendChild(endText);
            }
         }
      }
   } else if(hostNow>=countdownStart){
      if(s.phase==='ACTIVE') {
         const hitBtn=$('hit');if(hitBtn)hitBtn.disabled=true;
         const scanBtn=$('scan');if(scanBtn)scanBtn.disabled=true;
         const panel=document.querySelector('.readyPanel');
         if(panel){
            const status=panel.querySelector('.liveStatus');
            if(status&&status.textContent!=='FINAL STAGE'){
               status.textContent='FINAL STAGE';status.style.color='#ff5963';
               const oldContents=panel.querySelectorAll('div:not(.liveStatus)');oldContents.forEach(c=>c.remove());
               let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
               let timer=document.createElement('div');timer.id='outlastTimer';timer.style.cssText='font-size:48px;font-weight:900;color:#fff;margin-top:10px;';panel.appendChild(timer);
               let finalText=document.createElement('div');finalText.className='final-text';finalText.textContent='KILL THEM ALL';panel.appendChild(finalText);
            }
            let timer=panel.querySelector('#outlastTimer');
            if(timer){
               let tLeft=Math.ceil((gameEnd-hostNow)/1000);
               timer.textContent=`0:${String(tLeft).padStart(2,'0')}`;
            }
         }
      }
   } else {
      const nextShrink= s.outlast.startEpoch + (Math.floor((hostNow-s.outlast.startEpoch)/iv)+1)*iv;
      const stepsCount=Math.floor((hostNow-s.outlast.startEpoch)/iv);
      if(lastOutlastStep!==null&&stepsCount>lastOutlastStep){
         if(live)buzz('shrinkwarn');
      }
      if(nextShrink-hostNow<=30000&&lastShrinkWarn!==nextShrink){
         lastShrinkWarn=nextShrink;
         buzz('shrinkwarn');
      }
      if(nextShrink-hostNow<=10000&&lastShrinkWarn!==nextShrink+1){
         lastShrinkWarn=nextShrink+1;
         buzz('shrink10');
      }
      lastOutlastStep=stepsCount;
      const panel=document.querySelector('.readyPanel');
      if(panel&&s.phase==='ACTIVE'){
         const status=panel.querySelector('.liveStatus');
         if(status&&status.textContent!=='GAME IS ON'){
            status.textContent='GAME IS ON';status.style.color='#4ade80';
            panel.style.background='#1b6b3a'; panel.style.border='2px solid #4ade80';
            const oldContents=panel.querySelectorAll('div:not(.liveStatus)');oldContents.forEach(c=>c.remove());
            let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
            let word=document.createElement('div');word.style.cssText='font-size:22px;font-weight:900;letter-spacing:5px;margin-top:10px;color:#d4af37';word.textContent='OUTLAST';panel.appendChild(word);
         }
         if(nextShrink-hostNow<=30000){
            let warn=panel.querySelector('.shrink-warning');
            if(!warn){warn=document.createElement('div');warn.className='shrink-warning';panel.appendChild(warn);}
            warn.textContent=`NEXT SHRINK IN ${Math.ceil((nextShrink-hostNow)/1000)}s`;
         } else {
            let warn=panel.querySelector('.shrink-warning');if(warn)warn.remove();
         }
      }
   }
  }
 }
 if(HOST_MODE&&h&&h.mode==='outlast'&&h.outlast){
  const hostNow=time();
  const iv=h.outlast.intervalMs||(h.outlast.intervalMin?h.outlast.intervalMin*60000:60000);
  const stepsToEnd=Math.ceil((h.outlast.startRadius-h.outlast.endRadius)/h.outlast.step);
  const countdownStart= h.outlast.startEpoch + (stepsToEnd * iv);
  const gameEnd= countdownStart + 30000;
  const isLive = hostNow >= h.outlast.startEpoch && hostNow < gameEnd;
  const isEnded = hostNow >= gameEnd;
  const wm=$('hostWatchMap');
  if(wm){
     if(isEnded){
         if(wm.textContent!=='🏁 GAME OVER — VIEW MAP'){ wm.textContent='🏁 GAME OVER — VIEW MAP'; wm.className='wide danger'; }
     } else if(isLive){
         if(wm.textContent!=='👁️ WATCH MAP (LIVE) — GAME IS ON'){ wm.textContent='👁️ WATCH MAP (LIVE) — GAME IS ON'; wm.className='wide'; }
     } else {
         if(wm.textContent!=='👁️ WATCH MAP (LIVE) — STAND BY'){ wm.textContent='👁️ WATCH MAP (LIVE) — STAND BY'; wm.className='wide alt'; }
     }
  }
  if(isLive!==lastHostOutlastLive){
   if(isLive){
    buzz('start');
    const ac=$('artifactsCard');if(ac)ac.removeAttribute('open');
    const ws=$('winnerSection');if(ws)ws.classList.remove('hidden');
   }else{
    const ac=$('artifactsCard');if(ac)ac.setAttribute('open','');
    const ws=$('winnerSection');if(ws)ws.classList.add('hidden');
   }
   lastHostOutlastLive=isLive;
  }
  if(isLive){
   const step=Math.floor((time()-h.outlast.startEpoch)/iv);
   if(lastHostOutlastStep!==null&&step>lastHostOutlastStep)buzz('return');
   lastHostOutlastStep=step;
  }
 }
 const wb=window._refreshBoundary;if(wb&&!document.hidden){wb();window._tickCountdown();}
 if(view==='myGames'){updateJoinsStatus();renderSetup();}
},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile();secondsLeft();refreshOffer();render()}});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>note('Offline cache registration failed.'));
})();
