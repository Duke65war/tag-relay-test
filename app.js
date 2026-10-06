(()=>{'use strict';
const KEY='mash-unit-v4',HOST='mash-unit-v4-host',ANCHOR_KEY='mash-unit-anchors',CAREER_KEY='mash-unit-career',V='MU4',$=id=>document.getElementById(id),time=()=>Date.now(),hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
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
let s=null,h=null,pending=null,view='choice',scanner=null,busy=false,offerShown='',offerSlot=-1,currentScanMode='normal',anchors=null,mapWatchId=null,calibrating=null,career=null;
let lastGpsPos=null,boundaryWatchId=null,outOfBoundsSince=0,lastGpsBuzz=0,placingTarget=false,hostMode='standard',hostTarget=null;
let lastOutlastLive=null,lastOutlastStep=null,lastHostOutlastLive=null,lastHostOutlastStep=null;
const idOK=x=>typeof x==='string'&&/^[0-9a-f]{24}$/.test(x),labelOK=x=>typeof x==='string'&&/^[A-Z0-9.]{1,12}$/.test(x),nameOK=x=>typeof x==='string'&&x.trim().length>0&&x.length<=32;
const ruleOK=r=>r&&(/^(U|[1-9]|1[0-9]|20)$/.test(String(r.lives)))&&Number.isInteger(r.seconds)&&r.seconds>=30&&r.seconds<=600&&['none','one','two'].includes(r.medic)&&labelOK(r.a)&&labelOK(r.b)&&r.a!==r.b;
const ruleText=r=>`${r.lives==='U'?'Unlimited':r.lives+' lives'} · ${r.seconds}s · ${r.medic==='none'?'no medic':r.medic==='one'?'one-scan medic':'two-scan medic (30s)'}`;
const outlastRuleText=o=>`OUTLAST · ${o.startRadius}m → 5m · −${o.step}m every ${o.intervalMin}min · starts ${new Date(o.startEpoch).toLocaleString([],{dateStyle:'short',timeStyle:'short'})}`;
function note(x){const el=$('notice');if(el)el.textContent=x||''}function record(x,m){x.events.push({at:new Date().toISOString(),message:m})}
function buzz(kind){try{if(!navigator.vibrate)return;const p=kind==='elim'?[300,100,300,100,300]:kind==='start'?[500,200,500,200,500]:[200,100,200];navigator.vibrate(p)}catch(e){}}
function persist(x){try{localStorage.setItem(KEY,JSON.stringify(x));s=x;render();return true}catch(e){note('SAVE FAILED. Do not continue play; browser storage unavailable.');return false}}
function edit(fn){if(!s)return false;let x=JSON.parse(JSON.stringify(s));fn(x);return persist(x)}
function saveHost(x){try{localStorage.setItem(HOST,JSON.stringify(x));h=x;return true}catch(e){note('Host setup could not be saved. Do not share game QRs.');return false}}
function makeQR(node,text,size=216){if(!node)return;node.replaceChildren();if(typeof QRCode!=='function'){node.textContent='QR library not loaded.';return}try{new QRCode(node,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M})}catch(e){node.textContent='QR drawing failed'}}
/* --- CAREER --- */
function loadCareer(){try{const raw=localStorage.getItem(CAREER_KEY);if(raw){const c=JSON.parse(raw);if(c&&typeof c.lastPlayed==='number'&&Array.isArray(c.artefacts)){career=c;if(!Array.isArray(career.outlastWins))career.outlastWins=[];return}}}catch(e){}career={lastPlayed:Date.now(),artefacts:[],outlastWins:[]}}
function saveCareer(){try{localStorage.setItem(CAREER_KEY,JSON.stringify(career))}catch(e){}}
function careerState(){const elapsed=time()-career.lastPlayed;if(elapsed>=EIGHT_WEEKS)return 'deleted';if(elapsed>=FIVE_WEEKS)return 'dormant';return 'active'}
function careerPurgeIfExpired(){if(careerState()==='deleted'){career.artefacts=[];career.lastPlayed=time();saveCareer()}}
function careerVariantsFor(gunId){return career.artefacts.filter(a=>a.gunId===gunId).sort((a,b)=>b.claimedAt-a.claimedAt)}
function careerHas(artifactId){return career.artefacts.some(a=>a.artifactId===artifactId)}
function careerAdd(gunId,gameName,artifactId){if(careerHas(artifactId))return false;career.artefacts.push({artifactId,gunId,gameName,claimedAt:time()});saveCareer();return true}
function careerAddOutlastWin(gid,hostStamp){if(!career.outlastWins)career.outlastWins=[];const key=gid+'_'+hostStamp;if(career.outlastWins.some(w=>w.key===key))return false;career.outlastWins.push({key,gid,at:time()});saveCareer();return true}
/* --- HELPERS --- */
function distanceMeters(lat1,lng1,lat2,lng2){const latAvg=((lat1+lat2)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const dx=(lng2-lng1)*mLng;const dy=(lat2-lat1)*mLat;return Math.hypot(dx,dy)}
function playerHostNow(){if(!s?.outlast?.offset)return time();return time()+s.outlast.offset}
function currentRadius(o,hostNow){if(!o)return null;if(hostNow<o.startEpoch)return o.startRadius;const elapsed=hostNow-o.startEpoch;const iv=o.intervalMs||(o.intervalMin?o.intervalMin*60000:60000);const steps=Math.floor(elapsed/iv);const r=o.startRadius-steps*o.step;return Math.max(o.endRadius,r)}
/* --- QR CODES --- */
const code=(type,...values)=>JSON.stringify([V,type,...values]);
const joinCode=t=>{
 if(h.mode==='outlast'&&h.outlast){
  return code('J',h.gid,h.game,1,120,'none','S','T','S','outlast',h.outlast.startEpoch,time(),h.outlast.targetLat,h.outlast.targetLng,h.outlast.startRadius,OUTLAST_END_RADIUS,h.outlast.step,h.outlast.intervalMin*60000);
 }
 return code('J',h.gid,h.game,h.rules.lives,h.rules.seconds,h.rules.medic,h.rules.a,h.rules.b,t);
};
const baseCode=t=>{const b=BASES[h.baseA&&t==='A'?h.baseA:h.baseB]||{};return code('B',h.gid,t,Math.round((b.lat||0)*1e7),Math.round((b.lng||0)*1e7))};
const artifactCode=(gunId,artifactId)=>code('A',h.gid,h.game,gunId,artifactId);
const winnerCode=()=>code('W',h.gid,time());
function offerCode(){let o=s.offer,r=s.rules;return code('O',s.gid,r.lives,r.seconds,r.medic,r.a,r.b,s.team,s.id,s.name,o.n,o.id,o.at,o.deadline,Math.floor(time()/8000))}
function returnCode(type,owner,offer){return code(type,s.gid,offer.id,owner.id,owner.name,offer.deadline||0)}
function thanksCode(offerId,medicId,victimName,deadline){return code('K',s.gid,offerId,medicId,victimName,deadline)}
function parse(raw){let a;try{a=JSON.parse(String(raw||'').trim())}catch(e){throw Error('Not a valid M.A.S.H. QR')}if(!Array.isArray(a)||a[0]!==V||!['J','B','O','T','H','K','A','W'].includes(a[1]))throw Error('Wrong game QR version or type');return a}
function getJoin(raw){
 let a=parse(raw);
 if(a[1]!=='J')throw Error('Not a valid team JOIN QR');
 if(s)throw Error('This phone already joined a game; reset explicitly to join another');
 if(h&&h.gid!==a[2])throw Error('Host setup belongs to another game');
 if(a.length>=19&&a[10]==='outlast'){
  const gid=a[2],game=a[3];
  if(!idOK(gid)||typeof game!=='string'||!/^[A-Z0-9_-]{3,12}$/.test(game))throw Error('Invalid game');
  const startEpoch=a[11],hostNow=a[12],targetLat=a[13],targetLng=a[14],startRadius=a[15],endRadius=a[16],step=a[17],intervalMs=a[18];
  if(!Number.isFinite(startEpoch)||!Number.isFinite(hostNow)||!Number.isFinite(targetLat)||!Number.isFinite(targetLng))throw Error('Invalid OUTLAST data');
  if(!Number.isFinite(startRadius)||!Number.isFinite(endRadius)||!Number.isFinite(step)||!Number.isFinite(intervalMs))throw Error('Invalid OUTLAST schedule');
  const playerNow=time();
  const offset=hostNow-playerNow;
  if(playerNow+offset>startEpoch+1800000)throw Error('This game already started. Ask host for a new one.');
  const rules={lives:'1',seconds:120,medic:'none',a:'S',b:'T'};
  pending={gid,game,rules,team:'S',mode:'outlast',outlast:{targetLat,targetLng,startRadius,endRadius,step,intervalMs,startEpoch,offset}};
  view='preview';render();note('OUTLAST game. Enter your callsign.');
  return;
 }
 if(a.length!==10||!idOK(a[2])||typeof a[3]!=='string'||!/^[A-Z0-9_-]{3,12}$/.test(a[3])||!['A','B'].includes(a[9]))throw Error('Not a valid team JOIN QR');
 let rules={lives:String(a[4]),seconds:a[5],medic:a[6],a:a[7],b:a[8]};
 if(!ruleOK(rules))throw Error('Invalid game settings');
 pending={gid:a[2],game:a[3],rules,team:a[9],mode:'standard'};
 view='preview';render();note('Team assigned by host QR. Enter your callsign.');
}
function hostCreate(){
 if(!HOST_MODE)return;
 if(h||s){note('Host/player game already exists. Reset explicitly before making a new one.');return}
 let game=$('game').value.trim().toUpperCase();
 if(hostMode==='outlast'){
  if(!hostTarget){note('Set target on map first.');return}
  if(!/^[A-Z0-9_-]{3,12}$/.test(game)){note('Game: 3–12 letters/numbers.');return}
  const startRadius=Number($('olStartR').value),step=Number($('olStep').value),intervalMin=Number($('olInterval').value),startTimeStr=$('olStartTime').value;
  if(!Number.isFinite(startRadius)||startRadius<20||startRadius>500){note('Start radius 20–500m');return}
  if(!Number.isFinite(step)||step<5||step>100){note('Step 5–100m');return}
  if(!Number.isFinite(intervalMin)||intervalMin<1||intervalMin>30){note('Interval 1–30 min');return}
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startTimeStr)){note('Set a start date and time');return}
  const st=new Date(startTimeStr);
  if(isNaN(st.getTime())){note('Invalid start date/time');return}
  if(st.getTime()<time()-60000){note('Start time is in the past');return}
  const outlast={targetLat:hostTarget.lat,targetLng:hostTarget.lng,startRadius,endRadius:OUTLAST_END_RADIUS,step,intervalMin,startEpoch:st.getTime()};
  const rules={lives:'1',seconds:120,medic:'none',a:'S',b:'T'};
  if(saveHost({version:4,gid:hex(),game,rules,baseA:'',baseB:'',mode:'outlast',outlast,created:time(),artifacts:[],artifactIds:{},unlockCareers:false})){
   view='hostPanel';render();note('OUTLAST game created. Show JOIN QR to players.');
  }
  return;
 }
 let a=$('labelA').value.trim().toUpperCase(),b=$('labelB').value.trim().toUpperCase();
 const rules={lives:$('lives').value,seconds:Number($('seconds').value),medic:$('medic').value,a,b};
 const baseA=$('baseA').value,baseB=$('baseB').value;
 if(!/^[A-Z0-9_-]{3,12}$/.test(game)||!ruleOK(rules)){note('Check rules: lives 1–20/U, time 30–600, distinct labels 1–12 chars.');return}
 if(baseA===baseB){note('Red and blue bases must be different.');return}
 if(saveHost({version:4,gid:hex(),game,rules,baseA,baseB,mode:'standard',created:time(),artifacts:[],artifactIds:{},unlockCareers:false})){
  view='hostPanel';render();note('Game created.');
 }
}
function join(){
 if(!pending||s)return;
 let name=$('name').value.trim();if(!nameOK(name)){note('Enter a callsign up to 32 characters');return}
 let p=pending;
 let livesCount=p.mode==='outlast'?1:(p.rules.lives==='U'?1:Number(p.rules.lives));
 let x={version:4,gid:p.gid,game:p.game,rules:p.rules,team:p.team,id:hex(),name,mode:p.mode||'standard',
  tags:Array.from({length:livesCount},()=>({status:'LIVE'})),
  phase:'ACTIVE',offer:null,outbound:null,wins:[],medics:[],seen:[],medPending:null,events:[],
  baseA:h?h.baseA:'',baseB:h?h.baseB:''};
 if(p.mode==='outlast'&&p.outlast)x.outlast=p.outlast;
 record(x,`Joined ${p.game} [${p.mode||'standard'}], ${p.mode==='outlast'?'OUTLAST':(p.team==='A'?p.rules.a:p.rules.b)}; ${p.mode==='outlast'?outlastRuleText(p.outlast):ruleText(p.rules)}`);
 if(persist(x)){
  pending=null;
  careerPurgeIfExpired();
  const cs=careerState();
  if(cs==='active'||(cs==='dormant'&&h&&h.unlockCareers)){career.lastPlayed=time();saveCareer()}
  note('Team fixed by host. Call HIT and mark out before touching the phone.');
 }
}
const offered=()=>s?.phase==='OFFERED'&&s.offer&&s.tags[s.offer.n-1]?.status==='OFFERED';
function reconcile(){
 if(offered()&&time()>=s.offer.deadline){
  edit(x=>{let n=x.offer.n;x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;x.phase=x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')?'ELIMINATED':'RETURN';record(x,`Life ${n} spent by timer; ${x.phase}`)});
  buzz(s.phase==='ELIMINATED'?'elim':'return');
  note(s.phase==='ELIMINATED'?'Final life expired — eliminated':'Timer expired. Life spent. Respawn at base.');
 }
 if(s?.outbound&&time()>=s.outbound.deadline){edit(x=>{x.outbound=null})}
}
function hit(){reconcile();if(s?.phase!=='ACTIVE')return;let n=s.tags.findIndex(t=>t.status==='LIVE')+1;if(n<1)return;let at=time();edit(x=>{x.tags[n-1].status='OFFERED';x.phase='OFFERED';x.offer={n,id:hex(),at,deadline:at+x.rules.seconds*1000};record(x,`Life ${n} offered`)});note('Show your dog tags. Bleedout timer is running.')}
function offerData(a){if(a.length!==16||!idOK(a[2])||!idOK(a[9])||!idOK(a[12])||!['A','B','S'].includes(a[8])||!nameOK(a[10])||!Number.isInteger(a[11])||!Number.isSafeInteger(a[13])||!Number.isSafeInteger(a[14])||!Number.isSafeInteger(a[15]))throw Error('Malformed offer QR');let r={lives:String(a[3]),seconds:a[4],medic:a[5],a:a[6],b:a[7]};if(!ruleOK(r)||a[14]!==a[13]+r.seconds*1000||a[11]<1||a[11]>(r.lives==='U'?1:Number(r.lives)))throw Error('Invalid offer data');if(a[2]!==s.gid)throw Error('Different game ID');if(JSON.stringify(r)!==JSON.stringify(s.rules))throw Error('Different rules');if(a[9]===s.id)throw Error('Cannot scan own tags');if(time()>=a[14])throw Error('Tags expired');if(a[13]>time()+60000)throw Error('Phone clocks disagree');return {team:a[8],owner:a[9],name:a[10],n:a[11],offer:a[12],at:a[13],deadline:a[14],challenge:a[15]}}
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
  edit(x=>{x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;x.phase=x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')?'ELIMINATED':'RETURN';record(x,`Tags taken by ${name}; ${x.phase}`)});
  buzz(s.phase==='ELIMINATED'?'elim':'return');
  note(s.phase==='ELIMINATED'?'Tags taken. ELIMINATED.':'Tags taken by '+name+'. Respawn at base.');
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
 note('Healed '+victimName+'. Thank-you received.');
}
function acceptArtifact(a){
 if(a.length!==6)throw Error('Malformed artifact QR');
 if(!s)throw Error('Join a team first');
 if(a[2]!==s.gid)throw Error('Artifact belongs to a different game');
 const gunId=a[4];if(!GUNS[gunId])throw Error('Unknown artifact');
 const artifactId=a[5];if(typeof artifactId!=='string'||!/^[0-9a-f]{12,24}$/.test(artifactId))throw Error('Invalid artifact');
 const gameName=a[3];if(typeof gameName!=='string'||gameName.length<1||gameName.length>12)throw Error('Invalid game name');
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
function accept(raw){
 reconcile();if(!s)throw Error('Join a team first');
 let a=parse(raw);
 if(a[1]==='B'){if(a.length!==6||!idOK(a[2])||a[2]!==s.gid||a[3]!==s.team)throw Error('Wrong game or team base');if(s.mode==='outlast')throw Error('No respawn in OUTLAST');if(s.phase!=='RETURN')throw Error('Only an out player can respawn');edit(x=>{if(x.rules.lives==='U')x.tags[0].status='LIVE';x.phase='ACTIVE';record(x,'Correct team base scan: respawn; finite red lives remain spent')});note('Respawned.');return}
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
 else{title.textContent=`${t==='A'?h.rules.a:h.rules.b} (${t==='A'?'RED':'BLUE'}) ${type==='J'?'JOIN':'BASE'}`;}
 box.append(title);let square=document.createElement('div');square.className='qr';box.append(square);makeQR(square,type==='J'?joinCode(t):baseCode(t));let p=document.createElement('p');p.className='compact';p.textContent=h.mode==='outlast'?'Show to every player. All players are solo.':(type==='J'?'Show only to assigned players.':'Post physically at this team base; a copy can be scanned anywhere.');box.append(p)}
function renderArtifactCheckboxes(){if(!HOST_MODE)return;const box=$('artifactList');if(!box||!h)return;box.replaceChildren();GUN_ORDER.forEach(gunId=>{const gun=GUNS[gunId];const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.value=gunId;if(h.artifacts&&h.artifacts.includes(gunId))cb.checked=true;label.appendChild(cb);const span=document.createElement('span');span.textContent=gun.name+' ('+gun.tier+')';label.appendChild(span);box.appendChild(label)})}
function updateOutlastPreview(){if(!HOST_MODE)return;const el=$('olPreview');if(!el)return;const sr=Number($('olStartR').value)||0,st=Number($('olStep').value)||0,iv=Number($('olInterval').value)||0,tm=$('olStartTime').value||'';el.textContent=`Shrinks from ${sr}m to 5m in ${st}m steps every ${iv} min, starting ${tm||'—'}`}
function defaultOlStartValue(){const pad=n=>String(n).padStart(2,'0');const now=new Date();now.setMinutes(0,0,0);now.setHours(now.getHours()+1);return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`}
function renderSetup(){
 const st=$('setup'),pl=$('play');
 if(st)st.classList.toggle('hidden',!!s);
 if(pl)pl.classList.toggle('hidden',!s);
 if(s)return;
 let v=(HOST_MODE&&h&&view==='choice')?'hostPanel':view;
 ['choice','hostForm','hostPanel','joinPanel','preview'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',id!==v)});
 if(v==='hostPanel'&&h){
  const hi=$('hostInfo');
  if(hi)hi.textContent=h.mode==='outlast'?`${h.game} · ${h.gid.slice(0,8)} · ${outlastRuleText(h.outlast)}`:`${h.game} · ${h.gid.slice(0,8)} · ${ruleText(h.rules)} · RED ${h.rules.a} @ ${h.baseA} / BLUE ${h.rules.b} @ ${h.baseB}`;
  const isOL=h.mode==='outlast';
  const ja=$('hostJA');if(ja)ja.textContent=isOL?'JOIN OUTLAST':'JOIN RED';
  const jb=$('hostJB');if(jb)jb.style.display=isOL?'none':'';
  const hq=$('hostQR');if(hq&&!hq.childNodes.length)hostDraw('J','A','hostQR');
  renderArtifactCheckboxes();
  const uc=$('unlockCareers');if(uc)uc.checked=!!h.unlockCareers;
  const hb=$('hostBaseBtns');if(hb)hb.classList.toggle('hidden',isOL);
  const hp=$('hostPlayingSection');if(hp)hp.classList.toggle('hidden',isOL);
  const wm=$('hostWatchMap');if(wm){wm.style.display=isOL?'':'none';if(isOL&&h.outlast){const live=time()>=h.outlast.startEpoch;wm.textContent=live?'👁️ WATCH MAP (LIVE) — GAME IS ON':'👁️ WATCH MAP (LIVE) — STAND BY';wm.className=live?'wide':'wide alt'}}
  const ws=$('winnerSection');
  if(ws){
   if(isOL&&time()>=h.outlast.startEpoch)ws.classList.remove('hidden');
   else ws.classList.add('hidden');
  }
 }
 if(v==='preview'&&pending){
  const pt=$('previewTeam');
  if(pt)pt.textContent=pending.mode==='outlast'?'OUTLAST — FREE FOR ALL':`${pending.team==='A'?'RED':'BLUE'} TEAM ${pending.team==='A'?pending.rules.a:pending.rules.b}`;
  const pr=$('previewRules');if(pr)pr.textContent=pending.mode==='outlast'?outlastRuleText(pending.outlast):ruleText(pending.rules);
 }
}
function renderPlay(){
 if(!s)return;
 let phase=s.phase,ret=phase==='RETURN',dead=phase==='ELIMINATED';
 document.body.classList.toggle('returning',ret);
 document.body.classList.toggle('mist',dead);
 const pa=$('playarea');
 if(pa)pa.classList.toggle('teamB',s.team==='B');
 const idEl=$('identity');
 if(idEl)idEl.textContent=s.mode==='outlast'?`${s.name} · OUTLAST · ${s.game} · 2-minute bleedout`: `${s.name} · ${s.team==='A'?'Red '+s.rules.a+' @ '+s.baseA:'Blue '+s.rules.b+' @ '+s.baseB} · ${s.game} · ${ruleText(s.rules)}`;
 const bar=$('bar');
 if(bar){
  bar.replaceChildren();
  s.tags.forEach((tag,i)=>{let el=document.createElement('span');el.className=tag.status;el.title=`Life ${i+1}: ${tag.status}`;if(tag.status==='OFFERED'&&offered()&&s.rules.medic!=='none'&&s.mode!=='outlast'){el.classList.add('tappable');el.onclick=()=>scan('play','heal')}bar.append(el)});
  bar.setAttribute('aria-label','Life status: '+s.tags.map(t=>t.status).join(', '));
 }
 const act=$('actions');if(act)act.className='actions'+(ret?' return':dead||phase==='OFFERED'?' off':'');
 const hitBtn=$('hit');if(hitBtn)hitBtn.disabled=phase!=='ACTIVE';
 const scanBtn=$('scan');if(scanBtn)scanBtn.disabled=phase!=='ACTIVE'&&!ret;
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
 }else if(ret||dead){
  let head=document.createElement('h2');head.textContent=ret?'RESPAWN AT BASE':'ELIMINATED';st.append(head);
  if(dead){let gif=document.createElement('img');gif.src='./eliminated.gif';gif.alt='Eliminated';gif.style.maxWidth='80%';gif.style.borderRadius='12px';gif.style.margin='10px 0';st.append(gif)}
  let p=document.createElement('p');p.textContent=ret?'Scan your assigned base. Spent finite lives stay red.':'Leave play safely. Help and history remain below.';st.append(p);
 }else{
  if(s.mode==='outlast'){
   let p=document.createElement('p');p.className='teamBadge';p.style.background='#3d6b57';p.textContent=`${s.name} · OUTLAST`;st.append(p);
   const hostNow=playerHostNow();
   const live=!!(s.outlast&&hostNow>=s.outlast.startEpoch);
   let panel=document.createElement('div');panel.className='readyPanel';
   panel.style.background=live?'#1b6b3a':'#0e1c17';
   panel.style.border=live?'2px solid #4ade80':'2px solid #d4af37';
   let status=document.createElement('div');
   status.className='liveStatus';
   status.dataset.live=live?'1':'0';
   status.style.cssText='font-size:18px;font-weight:900;letter-spacing:4px;margin-bottom:14px;color:'+(live?'#4ade80':'#d4af37');
   status.textContent=live?'GAME IS ON':'STAND BY';
   panel.appendChild(status);
   let emoji=document.createElement('div');emoji.style.cssText='font-size:80px;line-height:1';emoji.textContent='🎯';panel.appendChild(emoji);
   let word=document.createElement('div');word.style.cssText='font-size:22px;font-weight:900;letter-spacing:5px;margin-top:10px;color:#d4af37';word.textContent='OUTLAST';panel.appendChild(word);
   st.append(panel);
   lastOutlastLive=live;
  }else{
   let p=document.createElement('p');p.className='teamBadge';p.textContent=`${s.name} : ${s.team==='A'?s.rules.a:s.rules.b}`;st.append(p);
   let panel=document.createElement('div');panel.className='readyPanel';
   let image=document.createElement('img');image.src='./war-adventures-logo.png';image.alt='War Adventures logo';
   image.onerror=()=>{image.remove();let word=document.createElement('strong');word.textContent='WAR ADVENTURES';panel.append(word)};
   panel.append(image);st.append(panel);
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
  makeQR(qbox,artifactCode(gunId,artifactId),200);
  const codeEl=document.createElement('p');codeEl.className='code';codeEl.textContent='MU4 · '+artifactId;wrapper.appendChild(codeEl);
  area.appendChild(wrapper);
 });
 saveHost(h);
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
 if(!lastGpsPos){outOfBoundsSince=0;return}
 const hostNow=playerHostNow();
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
   try{joinMode?getJoin(text):accept(text)}catch(e){note(e.message)}
  },()=>{});
 }catch(e){note('Camera error: '+((e&&e.message)?e.message:String(e)||'unknown'));await stopScan()}
}
function download(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mash-unit-${s.game}-${s.team}-${s.id.slice(0,6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
/* --- COMMON BINDINGS --- */
$('joinOpen').onclick=()=>{view='joinPanel';render()};
$('joinBack').onclick=()=>{view=(HOST_MODE&&h)?'hostPanel':'choice';render()};
$('joinScan').onclick=()=>scan('join');
$('joinStop').onclick=stopScan;
$('previewBack').onclick=()=>{pending=null;view=(HOST_MODE&&h)?'hostPanel':'joinPanel';render()};
$('confirmJoin').onclick=join;
$('hit').onclick=hit;
$('scan').onclick=()=>scan('play');
$('stop').onclick=stopScan;
$('cancelMedic').onclick=cancelMedic;
$('export').onclick=()=>{if(s)download()};
$('reset').onclick=()=>{if(!s||!confirm("Erase this phone's player game and personal history?"))return;localStorage.removeItem(KEY);s=null;document.body.classList.remove('returning','mist');stopBoundaryWatch();view=(HOST_MODE&&h)?'hostPanel':'choice';render();note('Player reset.')};
$('closeDialog').onclick=()=>$('dialog').close();
$('armouryOpen').onclick=()=>{loadCareer();careerPurgeIfExpired();renderArmoury();$('armouryOverlay').classList.remove('hidden')};
$('armouryPlayBtn').onclick=()=>{loadCareer();careerPurgeIfExpired();renderArmoury();$('armouryOverlay').classList.remove('hidden')};
$('armouryClose').onclick=()=>$('armouryOverlay').classList.add('hidden');
/* --- HOST-ONLY BINDINGS --- */
if(HOST_MODE){
 $('hostOpen').onclick=()=>{view='hostForm';hostMode='standard';hostTarget=null;applyHostMode();const el=$('olStartTime');if(el&&!el.value)el.value=defaultOlStartValue();render()};
 $('hostBack').onclick=()=>{view='choice';render()};
 $('create').onclick=hostCreate;
 const ms=$('modeStandard'),mo=$('modeOutlast');
 if(ms)ms.onclick=()=>{hostMode='standard';applyHostMode();updateOutlastPreview()};
 if(mo)mo.onclick=()=>{hostMode='outlast';applyHostMode();updateOutlastPreview()};
 ['olStartR','olStep','olInterval','olStartTime'].forEach(id=>{const el=$(id);if(el)el.oninput=updateOutlastPreview});
 const pt=$('pickTarget');if(pt)pt.onclick=()=>{placingTarget=true;openMapForTarget()};
 const wm=$('hostWatchMap');if(wm)wm.onclick=()=>{if(window._hostWatchMap)window._hostWatchMap()};
 for(let [id,type,t,target] of [['hostJA','J','A','hostQR'],['hostJB','J','B','hostQR'],['hostBA','B','A','hostQR'],['hostBB','B','B','hostQR'],['playJA','J','A','playHostQR'],['playJB','J','B','playHostQR'],['playBA','B','A','playHostQR'],['playBB','B','B','playHostQR']]){
  const el=$(id);if(el)el.onclick=()=>hostDraw(type,t,target);
 }
 $('selfA').onclick=()=>{try{getJoin(joinCode('A'))}catch(e){note(e.message)}};
 $('selfB').onclick=()=>{try{getJoin(joinCode('B'))}catch(e){note(e.message)}};
 $('eraseHost').onclick=()=>{if(s){note('Reset player first.');return}if(confirm('Erase host codes on THIS phone?')){localStorage.removeItem(HOST);h=null;view='choice';render();note('Host setup erased.')}};
 $('unlockCareers').onchange=e=>{if(!h)return;h.unlockCareers=e.target.checked;saveHost(h);note(e.target.checked?'Career unlock ON':'Career unlock OFF')};
 $('genArtifacts').onclick=()=>{if(!h)return;const checked=[];document.querySelectorAll('#artifactList input:checked').forEach(cb=>checked.push(cb.value));if(checked.length===0){note('Tick at least one artifact');return}h.artifacts=checked;if(!h.artifactIds)h.artifactIds={};checked.forEach(gunId=>{if(!h.artifactIds[gunId])h.artifactIds[gunId]=hex().slice(0,16)});saveHost(h);showPrintOverlay()};
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
 ['livesLabel','secondsLabel','medicLabel','basesRow'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',isOutlast)});
 const la=$('labelA');if(la){const row=la.closest('.row');if(row)row.style.display=isOutlast?'none':''}
 const op=$('outlastPanel');if(op)op.classList.toggle('hidden',!isOutlast);
 const ms=$('modeStandard'),mo=$('modeOutlast');
 if(ms)ms.className=isOutlast?'wide alt':'wide';
 if(mo)mo.className=isOutlast?'wide':'wide alt';
 const ti=$('targetInfo');
 if(ti)ti.textContent=hostTarget?`Target set: ${hostTarget.lat.toFixed(5)}, ${hostTarget.lng.toFixed(5)}`:'No target set';
 updateOutlastPreview();
}
/* --- MAP --- */
(function(){
 let overlay=$('mapOverlay'),viewport=$('mapViewport'),inner=$('mapInner'),img=$('mapImage'),gridLayer=$('mapGridLayer'),markersBox=$('mapMarkers'),boundarySvg=$('mapBoundarySvg'),dot=$('mapBlueDot'),youLabel=$('mapYouLabel'),banner=$('mapBanner'),status=$('mapStatus');
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
  if(!isOutlast&&myBaseName&&BASES[myBaseName]){drawMarker((myBaseLabel||'')+' TEAM BASE',BASES[myBaseName].lat,BASES[myBaseName].lng,myColour,true)}
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
  const hostNow = (s&&s.outlast&&s.outlast.offset) ? (time()+s.outlast.offset) : time();
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
  hostTarget={lat:g.lat,lng:g.lng};
  const ti=$('targetInfo');if(ti)ti.textContent=`Target set: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
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
 $('mapButton').onclick=()=>{reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary()};
 $('mapClose').onclick=()=>{overlay.classList.add('hidden');reset();stopWatch();placingTarget=false};
 tools.grid.onclick=()=>{gridOn=!gridOn;tools.grid.classList.toggle('active',gridOn);applyGrid();renderMarkers()};
 tools.loc.onclick=()=>{if(mapWatchId!==null){stopWatch();showBanner('GPS tracking off',1500);return}if(!anchors||!anchors.a||!anchors.b){showBanner('Anchors not ready',2500);return}if(!navigator.geolocation){showBanner('GPS not supported',3000);return}showBanner('Getting GPS...');navigator.geolocation.getCurrentPosition(p=>{banner.style.display='none';showStatus('GPS: '+(p.coords.latitude).toFixed(6)+', '+(p.coords.longitude).toFixed(6)+' ±'+Math.round(p.coords.accuracy)+'m');updateBlueDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy);startWatch()},e=>showBanner('GPS error: '+e.message+' (code '+e.code+')',6000),{enableHighAccuracy:true,timeout:20000,maximumAge:0})};
 tools.cal.onclick=()=>{if(calibrating){exitCalibrate();return}if(!confirm('Re-calibrate anchors?'))return;anchors=null;try{localStorage.removeItem(ANCHOR_KEY)}catch(e){}dot.style.display='none';youLabel.style.display='none';gridLayer.classList.remove('on');gridOn=false;tools.grid.classList.remove('active');renderMarkers();enterCalibrate()};
 tools.debug.onclick=()=>{const raw=localStorage.getItem(ANCHOR_KEY);if(raw){try{debugText.value=JSON.stringify(JSON.parse(raw),null,2)}catch(e){debugText.value=raw}}else{debugText.value=JSON.stringify(DEFAULT_ANCHORS,null,2)+'\n\n(DEFAULT)'}debugPanel.classList.add('on')};
 $('mapDebugClose').onclick=()=>debugPanel.classList.remove('on');
 $('mapDebugCopy').onclick=()=>{debugText.select();debugText.setSelectionRange(0,99999);try{document.execCommand('copy')}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(debugText.value)}catch(e){}showBanner('Copied',1500)};
 loadAnchors();
 window._openMapForTarget=()=>{
  reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary();
  showBanner('Tap the map to place the OUTLAST target',4000);
 };
 window._hostWatchMap=()=>{
  reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();renderBoundary();
  showBanner('Host live view — boundary updates automatically',3000);
 };
 window._refreshBoundary=()=>{renderBoundary()};
})();
function openMapForTarget(){if(window._openMapForTarget)window._openMapForTarget()}
/* --- INIT --- */
(function(){const ba=$('baseA'),bb=$('baseB');if(!ba||!bb)return;const main=Object.keys(BASES).filter(k=>BASES[k].group==='main');const sec=Object.keys(BASES).filter(k=>BASES[k].group==='secondary');const safe=Object.keys(BASES).filter(k=>BASES[k].group==='safe');function opt(parent,keys){keys.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;parent.appendChild(o)})}opt(ba,main);opt(ba,sec);opt(ba,safe);opt(bb,main);opt(bb,sec);opt(bb,safe);ba.value='Church';bb.value='Diego Garcia'})();
(function(){const lv=$('lives');if(!lv)return;for(let i=1;i<=20;i++){let x=document.createElement('option');x.value=String(i);x.textContent=String(i);if(i===5)x.selected=true;lv.append(x)}})();
if(HOST_MODE){
 try{let raw=localStorage.getItem(HOST);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid))throw Error('host');h=x;if(!h.mode)h.mode='standard';view='hostPanel'}}catch(e){note('Saved host game unreadable.')}
}
try{let raw=localStorage.getItem(KEY);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!idOK(x.id)||!Array.isArray(x.tags)||!['ACTIVE','OFFERED','RETURN','ELIMINATED'].includes(x.phase))throw Error('player');if(!x.mode)x.mode='standard';s=x}}catch(e){note('Saved player data unreadable.')}
loadCareer();careerPurgeIfExpired();
render();
if(s&&s.mode==='outlast'){startBoundaryWatch()}
reconcile();
setInterval(()=>{
 reconcile();secondsLeft();refreshOffer();tickBoundary();
 if(s&&s.mode==='outlast'&&s.phase==='ACTIVE'&&boundaryWatchId===null)startBoundaryWatch();
 if(s?.medPending&&time()>=s.medPending.deadline)edit(x=>{x.medPending=null;record(x,'Medic attempt expired')});
 if(s&&s.mode==='outlast'&&s.outlast){
  const hostNow=playerHostNow();
  const live=hostNow>=s.outlast.startEpoch;
  if(live!==lastOutlastLive){
   if(live)buzz('start');
   lastOutlastLive=live;
   if(s.phase==='ACTIVE'&&!s.offer&&!s.outbound)renderPlay();
  }
  if(live){
   const iv=s.outlast.intervalMs||(s.outlast.intervalMin?s.outlast.intervalMin*60000:60000);
   const step=Math.floor((hostNow-s.outlast.startEpoch)/iv);
   if(lastOutlastStep!==null&&step>lastOutlastStep)buzz('return');
   lastOutlastStep=step;
  }
 }
 if(HOST_MODE&&h&&h.mode==='outlast'&&h.outlast){
  const live=time()>=h.outlast.startEpoch;
  const wm=$('hostWatchMap');
  if(wm){
   const wantText=live?'👁️ WATCH MAP (LIVE) — GAME IS ON':'👁️ WATCH MAP (LIVE) — STAND BY';
   if(wm.textContent!==wantText){wm.textContent=wantText;wm.className=live?'wide':'wide alt'}
  }
  if(live!==lastHostOutlastLive){
   if(live){
    buzz('start');
    const ac=$('artifactsCard');if(ac)ac.removeAttribute('open');
    const ws=$('winnerSection');if(ws)ws.classList.remove('hidden');
   }else{
    const ac=$('artifactsCard');if(ac)ac.setAttribute('open','');
    const ws=$('winnerSection');if(ws)ws.classList.add('hidden');
   }
   lastHostOutlastLive=live;
  }
  if(live){
   const iv=h.outlast.intervalMs||(h.outlast.intervalMin?h.outlast.intervalMin*60000:60000);
   const step=Math.floor((time()-h.outlast.startEpoch)/iv);
   if(lastHostOutlastStep!==null&&step>lastHostOutlastStep)buzz('return');
   lastHostOutlastStep=step;
  }
 }
 const wb=window._refreshBoundary;if(wb&&!document.hidden)wb();
},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile();secondsLeft();refreshOffer();render()}});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>note('Offline cache registration failed.'));
})();
