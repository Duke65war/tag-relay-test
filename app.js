(()=>{'use strict';
const KEY='mash-unit-v4',HOST='mash-unit-v4-host',ANCHOR_KEY='mash-unit-anchors',V='MU4',$=id=>document.getElementById(id),time=()=>Date.now(),hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
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
let s=null,h=null,pending=null,view='choice',scanner=null,busy=false,offerShown='',offerSlot=-1,currentScanMode='normal',anchors=null,mapWatchId=null,calibrating=null;
const idOK=x=>typeof x==='string'&&/^[0-9a-f]{24}$/.test(x),labelOK=x=>typeof x==='string'&&/^[A-Z0-9.]{1,12}$/.test(x),nameOK=x=>typeof x==='string'&&x.trim().length>0&&x.length<=32;
const ruleOK=r=>r&&(/^(U|[1-9]|1[0-9]|20)$/.test(String(r.lives)))&&Number.isInteger(r.seconds)&&r.seconds>=30&&r.seconds<=600&&['none','one','two'].includes(r.medic)&&labelOK(r.a)&&labelOK(r.b)&&r.a!==r.b;
const ruleText=r=>`${r.lives==='U'?'Unlimited':r.lives+' lives'} · ${r.seconds}s · ${r.medic==='none'?'no medic':r.medic==='one'?'one-scan medic':'two-scan medic (30s)'}`;
function note(x){$('notice').textContent=x||''}function record(x,m){x.events.push({at:new Date().toISOString(),message:m})}
function buzz(kind){try{if(!navigator.vibrate)return;navigator.vibrate(kind==='elim'?[300,100,300,100,300]:[200,100,200])}catch(e){}}
function persist(x){try{localStorage.setItem(KEY,JSON.stringify(x));s=x;render();return true}catch(e){note('SAVE FAILED. Do not continue play; browser storage unavailable.');return false}}
function edit(fn){if(!s)return false;let x=JSON.parse(JSON.stringify(s));fn(x);return persist(x)}
function saveHost(x){try{localStorage.setItem(HOST,JSON.stringify(x));h=x;return true}catch(e){note('Host setup could not be saved. Do not share game QRs.');return false}}
function makeQR(node,text,size=216){node.replaceChildren();if(typeof QRCode!=='function'){node.textContent='QR library not loaded.';return}try{new QRCode(node,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M})}catch(e){node.textContent='QR drawing failed'}}
const code=(type,...values)=>JSON.stringify([V,type,...values]);
const joinCode=t=>code('J',h.gid,h.game,h.rules.lives,h.rules.seconds,h.rules.medic,h.rules.a,h.rules.b,t);
const baseCode=t=>{const b=BASES[h.baseA&&t==='A'?h.baseA:h.baseB]||{};return code('B',h.gid,t,Math.round((b.lat||0)*1e7),Math.round((b.lng||0)*1e7))};
function offerCode(){let o=s.offer,r=s.rules;return code('O',s.gid,r.lives,r.seconds,r.medic,r.a,r.b,s.team,s.id,s.name,o.n,o.id,o.at,o.deadline,Math.floor(time()/8000))}
function returnCode(type,owner,offer){return code(type,s.gid,offer.id,owner.id,owner.name,offer.deadline||0)}
function thanksCode(offerId,medicId,victimName,deadline){return code('K',s.gid,offerId,medicId,victimName,deadline)}
function parse(raw){let a;try{a=JSON.parse(String(raw||'').trim())}catch(e){throw Error('Not a valid M.A.S.H. QR')}if(!Array.isArray(a)||a[0]!==V||!['J','B','O','T','H','K'].includes(a[1]))throw Error('Wrong game QR version or type');return a}
function getJoin(raw){let a=parse(raw);if(a[1]!=='J'||a.length!==10||!idOK(a[2])||typeof a[3]!=='string'||!/^[A-Z0-9_-]{3,12}$/.test(a[3])||!['A','B'].includes(a[9]))throw Error('Not a valid team JOIN QR');let rules={lives:String(a[4]),seconds:a[5],medic:a[6],a:a[7],b:a[8]};if(!ruleOK(rules))throw Error('Invalid game settings');if(s)throw Error('This phone already joined a game; reset explicitly to join another');if(h&&h.gid!==a[2])throw Error('Host setup belongs to another game');pending={gid:a[2],game:a[3],rules,team:a[9]};view='preview';render();note('Team assigned by host QR. Enter your callsign.')}
function hostCreate(){if(h||s){note('Host/player game already exists. Reset explicitly before making a new one.');return}let game=$('game').value.trim().toUpperCase(),rules={lives:$('lives').value,seconds:Number($('seconds').value),medic:$('medic').value,a:$('labelA').value.trim().toUpperCase(),b:$('labelB').value.trim().toUpperCase()},baseA=$('baseA').value,baseB=$('baseB').value;if(!/^[A-Z0-9_-]{3,12}$/.test(game)||!ruleOK(rules)){note('Game: 3–12 letters/numbers; lives 1–20/Unlimited; time 30–600; distinct team labels 1–12 letters/numbers/dots.');return}if(baseA===baseB){note('Red and blue bases must be different.');return}if(saveHost({version:4,gid:hex(),game,rules,baseA,baseB,created:time()})){view='hostPanel';render();note('Game created. Show JOIN codes to assigned teams, BASE codes at bases.')}}
function join(){if(!pending||s)return;let name=$('name').value.trim();if(!nameOK(name)){note('Enter a callsign up to 32 characters');return}let p=pending,x={version:4,gid:p.gid,game:p.game,rules:p.rules,team:p.team,id:hex(),name,tags:Array.from({length:p.rules.lives==='U'?1:Number(p.rules.lives)},()=>({status:'LIVE'})),phase:'ACTIVE',offer:null,outbound:null,wins:[],medics:[],seen:[],medPending:null,events:[],baseA:h?h.baseA:'',baseB:h?h.baseB:''};record(x,`Joined ${p.game}, ${p.team==='A'?p.rules.a:p.rules.b} (${p.team}); ${ruleText(p.rules)}`);if(persist(x)){pending=null;note('Team fixed by host. Call HIT and mark out before touching the phone.')}}
const offered=()=>s?.phase==='OFFERED'&&s.offer&&s.tags[s.offer.n-1]?.status==='OFFERED';
function reconcile(){if(offered()&&time()>=s.offer.deadline){edit(x=>{let n=x.offer.n;x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;x.phase=x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')?'ELIMINATED':'RETURN';record(x,`Life ${n} spent by timer; ${x.phase}`)});buzz(s.phase==='ELIMINATED'?'elim':'return');note(s.phase==='ELIMINATED'?'Final life expired — eliminated':'Timer expired. Life spent. Respawn at base.')}if(s?.outbound&&time()>=s.outbound.deadline){edit(x=>{x.outbound=null})}}
function hit(){reconcile();if(s?.phase!=='ACTIVE')return;let n=s.tags.findIndex(t=>t.status==='LIVE')+1;if(n<1)return;let at=time();edit(x=>{x.tags[n-1].status='OFFERED';x.phase='OFFERED';x.offer={n,id:hex(),at,deadline:at+x.rules.seconds*1000};record(x,`Life ${n} offered`)});note('Show your dog tags. Bleedout timer is running.')}
function offerData(a){if(a.length!==16||!idOK(a[2])||!idOK(a[9])||!idOK(a[12])||!['A','B'].includes(a[8])||!nameOK(a[10])||!Number.isInteger(a[11])||!Number.isSafeInteger(a[13])||!Number.isSafeInteger(a[14])||!Number.isSafeInteger(a[15]))throw Error('Malformed offer QR');let r={lives:String(a[3]),seconds:a[4],medic:a[5],a:a[6],b:a[7]};if(!ruleOK(r)||a[14]!==a[13]+r.seconds*1000||a
