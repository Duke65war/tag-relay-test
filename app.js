(()=>{'use strict';
const KEY='mash-unit-v4',HOST='mash-unit-v4-host',V='MU4',$=id=>document.getElementById(id),time=()=>Date.now(),hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
let s=null,h=null,pending=null,view='choice',scanner=null,busy=false,offerShown='',offerSlot=-1,currentScanMode='normal';
const idOK=x=>typeof x==='string'&&/^[0-9a-f]{24}$/.test(x),labelOK=x=>typeof x==='string'&&/^[A-Z0-9.]{1,4}$/.test(x),nameOK=x=>typeof x==='string'&&x.trim().length>0&&x.length<=32;
const ruleOK=r=>r&&(/^(U|[1-9]|1[0-9]|20)$/.test(String(r.lives)))&&Number.isInteger(r.seconds)&&r.seconds>=30&&r.seconds<=600&&['none','one','two'].includes(r.medic)&&labelOK(r.a)&&labelOK(r.b)&&r.a!==r.b;
const ruleText=r=>`${r.lives==='U'?'Unlimited':r.lives+' lives'} · ${r.seconds}s · ${r.medic==='none'?'no medic':r.medic==='one'?'one-scan medic':'two-scan medic (30s)'}`;
function note(x){$('notice').textContent=x||''}function record(x,m){x.events.push({at:new Date().toISOString(),message:m})}
function buzz(kind){try{if(!navigator.vibrate)return;navigator.vibrate(kind==='elim'?[300,100,300,100,300]:[200,100,200])}catch(e){}}
function persist(x){try{localStorage.setItem(KEY,JSON.stringify(x));s=x;render();return true}catch(e){note('SAVE FAILED. Do not continue play; browser storage unavailable.');return false}}
function edit(fn){if(!s)return false;let x=JSON.parse(JSON.stringify(s));fn(x);return persist(x)}
function saveHost(x){try{localStorage.setItem(HOST,JSON.stringify(x));h=x;return true}catch(e){note('Host setup could not be saved. Do not share game QRs.');return false}}
function makeQR(node,text,size=216){node.replaceChildren();if(typeof QRCode!=='function'){node.textContent='QR library not loaded.';return}try{new QRCode(node,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M})}catch(e){node.textContent='QR drawing failed'}}
const code=(type,...values)=>JSON.stringify([V,type,...values]),joinCode=t=>code('J',h.gid,h.game,h.rules.lives,h.rules.seconds,h.rules.medic,h.rules.a,h.rules.b,t),baseCode=t=>code('B',h.gid,t);
function offerCode(){let o=s.offer,r=s.rules;return code('O',s.gid,r.lives,r.seconds,r.medic,r.a,r.b,s.team,s.id,s.name,o.n,o.id,o.at,o.deadline,Math.floor(time()/8000))}
function returnCode(type,owner,offer){return code(type,s.gid,offer.id,owner.id,owner.name,offer.deadline||0)}
function parse(raw){let a;try{a=JSON.parse(String(raw||'').trim())}catch(e){throw Error('Not a valid M.A.S.H. QR')}if(!Array.isArray(a)||a[0]!==V||!['J','B','O','T','H'].includes(a[1]))throw Error('Wrong game QR version or type');return a}
function getJoin(raw){let a=parse(raw);if(a[1]!=='J'||a.length!==10||!idOK(a[2])||typeof a[3]!=='string'||!/^[A-Z0-9_-]{3,12}$/.test(a[3])||!['A','B'].includes(a[9]))throw Error('Not a valid team JOIN QR');let rules={lives:String(a[4]),seconds:a[5],medic:a[6],a:a[7],b:a[8]};if(!ruleOK(rules))throw Error('Invalid game settings');if(s)throw Error('This phone already joined a game; reset explicitly to join another');if(h&&h.gid!==a[2])throw Error('Host setup belongs to another game');pending={gid:a[2],game:a[3],rules,team:a[9]};view='preview';render();note('Team assigned by host QR. Enter your callsign.')}
function hostCreate(){if(h||s){note('Host/player game already exists. Reset explicitly before making a new one.');return}let game=$('game').value.trim().toUpperCase(),rules={lives:$('lives').value,seconds:Number($('seconds').value),medic:$('medic').value,a:$('labelA').value.trim().toUpperCase(),b:$('labelB').value.trim().toUpperCase()};if(!/^[A-Z0-9_-]{3,12}$/.test(game)||!ruleOK(rules)){note('Game: 3–12 letters/numbers; lives 1–20/Unlimited; time 30–600; distinct team labels 1–4 letters/numbers/dots.');return}if(saveHost({version:4,gid:hex(),game,rules,created:time()})){view='hostPanel';render();note('Game created. Show JOIN codes to assigned teams, BASE codes at bases.')}}
function join(){if(!pending||s)return;let name=$('name').value.trim();if(!nameOK(name)){note('Enter a callsign up to 32 characters');return}let p=pending,x={version:4,gid:p.gid,game:p.game,rules:p.rules,team:p.team,id:hex(),name,tags:Array.from({length:p.rules.lives==='U'?1:Number(p.rules.lives)},()=>({status:'LIVE'})),phase:'ACTIVE',offer:null,outbound:null,wins:[],medics:[],seen:[],medPending:null,events:[]};record(x,`Joined ${p.game}, ${p.team==='A'?p.rules.a:p.rules.b} (${p.team}); ${ruleText(p.rules)}`);if(persist(x)){pending=null;note('Team fixed by host. Call HIT and mark out before touching the phone.')}}
const offered=()=>s?.phase==='OFFERED'&&s.offer&&s.tags[s.offer.n-1]?.status==='OFFERED';
function reconcile(){if(offered()&&time()>=s.offer.deadline){edit(x=>{let n=x.offer.n;x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;x.phase=x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')?'ELIMINATED':'RETURN';record(x,`Life ${n} spent by timer; ${x.phase}`)});buzz(s.phase==='ELIMINATED'?'elim':'return');note(s.phase==='ELIMINATED'?'Final life expired — eliminated':'Timer expired. Life spent. Respawn at base.')}if(s?.outbound&&time()>=s.outbound.deadline){edit(x=>{x.outbound=null})}}
function hit(){reconcile();if(s?.phase!=='ACTIVE')return;let n=s.tags.findIndex(t=>t.status==='LIVE')+1;if(n<1)return;let at=time();edit(x=>{x.tags[n-1].status='OFFERED';x.phase='OFFERED';x.offer={n,id:hex(),at,deadline:at+x.rules.seconds*1000};record(x,`Life ${n} offered`)});note('Show your dog tags. Bleedout timer is running.')}
function offerData(a){if(a.length!==16||!idOK(a[2])||!idOK(a[9])||!idOK(a[12])||!['A','B'].includes(a[8])||!nameOK(a[10])||!Number.isInteger(a[11])||!Number.isSafeInteger(a[13])||!Number.isSafeInteger(a[14])||!Number.isSafeInteger(a[15]))throw Error('Malformed offer QR');let r={lives:String(a[3]),seconds:a[4],medic:a[5],a:a[6],b:a[7]};if(!ruleOK(r)||a[14]!==a[13]+r.seconds*1000||a[11]<1||a[11]>(r.lives==='U'?1:Number(r.lives)))throw Error('Invalid offer data');if(a[2]!==s.gid||JSON.stringify(r)!==JSON.stringify(s.rules))throw Error('Different game ID or locked rules');if(a[9]===s.id)throw Error('Cannot scan own tags');if(time()>=a[14])throw Error('Tags expired');if(a[13]>time()+60000)throw Error('Phone clocks disagree. Check time settings');return {team:a[8],owner:a[9],name:a[10],n:a[11],offer:a[12],at:a[13],deadline:a[14],challenge:a[15]}}
function acceptReturn(a){
  if(!offered())throw Error('You have no active offer');
  if(a.length!==7)throw Error('Malformed return QR');
  if(a[2]!==s.gid)throw Error('Wrong game');
  if(a[3]!==s.offer.id)throw Error('This is not for your current tags');
  if(time()>=a[6])throw Error('Return expired');
  if(!nameOK(a[5]))throw Error('Invalid return name');
  if(currentScanMode==='tag'&&a[1]!=='T')throw Error('Only TAGS TAKEN accepted');
  let n=s.offer.n,name=a[5];
  if(a[1]==='T'){
    edit(x=>{x.tags[n-1].status='LOST';x.offer=null;x.outbound=null;x.phase=x.rules.lives!=='U'&&!x.tags.some(t=>t.status==='LIVE')?'ELIMINATED':'RETURN';record(x,`Tags taken by ${name}; ${x.phase}`)});
    buzz(s.phase==='ELIMINATED'?'elim':'return');
    note(s.phase==='ELIMINATED'?'Tags taken. ELIMINATED.':'Tags taken by '+name+'. Respawn at base.');
  }else{
    edit(x=>{x.tags[n-1].status='LIVE';x.offer=null;x.outbound=null;x.phase='ACTIVE';record(x,`Healed by ${name}`)});
    note('Healed by '+name+'. Back in play.');
  }
}
function accept(raw){reconcile();if(!s)throw Error('Join a team first');let a=parse(raw);
  if(a[1]==='B'){if(a.length!==4||!idOK(a[2])||a[2]!==s.gid||a[3]!==s.team)throw Error('Wrong game or team base');if(s.phase!=='RETURN')throw Error('Only an out player can respawn');edit(x=>{if(x.rules.lives==='U')x.tags[0].status='LIVE';x.phase='ACTIVE';record(x,'Correct team base scan: respawn; finite red lives remain spent')});note('Respawned. Finite spent lives stayed red.');return}
  if(a[1]==='T'||a[1]==='H'){acceptReturn(a);return}
  if(a[1]!=='O')throw Error('Expected a player offer QR');
  if(s.phase!=='ACTIVE')throw Error('Cannot capture or medic while hit, out or eliminated');
  let o=offerData(a);
  if(o.team!==s.team){
    if(s.seen.includes(o.offer))throw Error('Already grabbed this offer on this phone');
    edit(x=>{x.seen.push(o.offer);x.wins.push({...o,capturedAt:time()});x.outbound={type:'T',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Grabbed tags from ${o.name}`)});
    note('Show TAGS TAKEN to '+o.name+'. They scan it to confirm.');
    return;
  }
  if(s.rules.medic==='none')throw Error('No medics in this game');
  if(s.medics.some(m=>m.offer===o.offer))throw Error('You already healed this offer');
  if(s.rules.medic==='one'){
    edit(x=>{x.medics.push({...o,completedAt:time()});x.medPending=null;x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Healed ${o.name}`)});
    note('Show HEALED to '+o.name+'. They scan it to confirm.');
    return;
  }
  let m=s.medPending;
  if(!m||time()>=m.deadline){
    edit(x=>{x.medPending={...o,started:time()};record(x,`Medic started for ${o.name}`)});
    note('First scan. Stay together and scan fresh QR after at least 30 seconds.');
    return;
  }
  if(m.owner!==o.owner||m.offer!==o.offer)throw Error('Cancel existing medic attempt first');
  if(m.challenge===o.challenge)throw Error('Need fresh rotating QR from same offer');
  if(time()-m.started<30000)throw Error(`Wait ${Math.ceil((30000-(time()-m.started))/1000)} more seconds`);
  edit(x=>{x.medics.push({...o,completedAt:time()});x.medPending=null;x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Healed ${o.name}`)});
  note('Show HEALED to '+o.name+'. They scan it to confirm.');
}
function cancelMedic(){if(!s?.medPending)return;edit(x=>{x.medPending=null;record(x,'Medic attempt cancelled')});note('Medic attempt cleared.')}
function secondsLeft(){let el=$('timer');if(!el||!offered())return;let t=Math.max(0,Math.ceil((s.offer.deadline-time())/1000));el.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`}
function refreshOffer(){if(!offered())return;let slot=Math.floor(time()/8000);if(slot===offerSlot)return;offerSlot=slot;let node=$('offerQR');if(node){let text=offerCode();offerShown=text;makeQR(node,text,216)}}
function hostDraw(type,t,target){if(!h)return;let box=$(target);box.replaceChildren();let title=document.createElement('h2');title.textContent=`${t==='A'?h.rules.a:h.rules.b} (${t==='A'?'RED':'BLUE'}) ${type==='J'?'JOIN':'BASE'}`;box.append(title);let square=document.createElement('div');square.className='qr';box.append(square);makeQR(square,type==='J'?joinCode(t):baseCode(t));let p=document.createElement('p');p.className='compact';p.textContent=type==='J'?'Show only to assigned players.':'Post physically at this team base; a copy can be scanned anywhere.';box.append(p)}
function renderSetup(){$('setup').classList.toggle('hidden',!!s);$('play').classList.toggle('hidden',!s);if(s)return;let v=h&&view==='choice'?'hostPanel':view;for(let id of ['choice','hostForm','hostPanel','joinPanel','preview'])$(id).classList.toggle('hidden',id!==v);if(v==='hostPanel'&&h){$('hostInfo').textContent=`${h.game} · ${h.gid.slice(0,8)} · ${ruleText(h.rules)} · RED ${h.rules.a} / BLUE ${h.rules.b}`;if(!$('hostQR').childNodes.length)hostDraw('J','A','hostQR')}if(v==='preview'&&pending){$('previewTeam').textContent=`${pending.team==='A'?'RED':'BLUE'} TEAM ${pending.team==='A'?pending.rules.a:pending.rules.b}`;$('previewRules').textContent=ruleText(pending.rules)}}
function renderPlay(){if(!s)return;let phase=s.phase,ret=phase==='RETURN',dead=phase==='ELIMINATED';document.body.classList.toggle('returning',ret);document.body.classList.toggle('mist',dead);$('playarea').classList.toggle('teamB',s.team==='B');$('identity').textContent=`${s.name} · ${s.team==='A'?'Red '+s.rules.a:'Blue '+s.rules.b} · ${s.game} · ${ruleText(s.rules)}`;let bar=$('bar');bar.replaceChildren();s.tags.forEach((tag,i)=>{let el=document.createElement('span');el.className=tag.status;el.title=`Life ${i+1}: ${tag.status}`;bar.append(el)});bar.setAttribute('aria-label','Life status: '+s.tags.map(t=>t.status).join(', '));$('actions').className='actions'+(ret?' return':dead||phase==='OFFERED'?' off':'');$('hit').disabled=phase!=='ACTIVE';$('scan').disabled=phase!=='ACTIVE'&&!ret;let st=$('stage');st.replaceChildren();offerSlot=-1;offerShown='';
  if(s.outbound){
    let head=document.createElement('h2');head.textContent=s.outbound.type==='T'?'TAGS TAKEN':'HEALED';st.append(head);
    let timer=document.createElement('p');timer.className='timer';let t=Math.max(0,Math.ceil((s.outbound.deadline-time())/1000));timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`;st.append(timer);
    let box=document.createElement('div');box.className='qr offerqr';st.append(box);
    makeQR(box,returnCode(s.outbound.type,{id:s.id,name:s.name},{id:s.outbound.offer,deadline:s.outbound.deadline}));
    let p=document.createElement('p');p.className='compact';p.textContent='Show this to '+s.outbound.victimName+'. They scan it to confirm.';st.append(p);
    let b=document.createElement('button');b.className='alt';b.textContent='CLOSE';b.onclick=()=>{edit(x=>{x.outbound=null})};st.append(b);
  } else if(offered()){
    let head=document.createElement('h2');head.textContent=`LIFE ${s.offer.n} OFFERED`;st.append(head);
    let timer=document.createElement('p');timer.id='timer';timer.className='timer';st.append(timer);
    let box=document.createElement('div');box.id='offerQR';box.className='qr offerqr';st.append(box);
    let p=document.createElement('p');p.className='compact';p.textContent='Show your dog tags. Bleedout timer is running.';st.append(p);
    let tagBtn=document.createElement('button');tagBtn.className='tagButton';tagBtn.innerHTML='<span class="tagHole"></span><img src="./dogtag.svg" alt="" class="tagIcon"><span class="tagText">'+s.name+"'s TAGS</span>";tagBtn.onclick=()=>scan('play','tag');st.append(tagBtn);
    let hint=document.createElement('p');hint.className='compact';hint.textContent='Reaper presses TAG when they have your tags. Then scan their TAGS TAKEN QR.';st.append(hint);
    secondsLeft();refreshOffer();
  } else if(ret||dead){
    let head=document.createElement('h2');head.textContent=ret?'RESPAWN AT BASE':'ELIMINATED';st.append(head);
    if(dead){let gif=document.createElement('img');gif.src='./eliminated.gif';gif.alt='Eliminated';gif.style.maxWidth='80%';gif.style.borderRadius='12px';gif.style.margin='10px 0';st.append(gif)}
    let p=document.createElement('p');p.textContent=ret?'Scan your assigned base. Spent finite lives stay red.':'Leave play safely. Help and history remain below.';st.append(p);
  } else {
    let p=document.createElement('p');p.className='teamBadge';p.textContent=`${s.name} : ${s.team==='A'?s.rules.a:s.rules.b}`;st.append(p);
    let panel=document.createElement('div');panel.className='readyPanel';
    let image=document.createElement('img');image.src='./war-adventures-logo.png';image.alt='War Adventures logo';
    image.onerror=()=>{image.remove();let word=document.createElement('strong');word.textContent='WAR ADVENTURES';panel.append(word)};
    panel.append(image);st.append(panel);
  }
  let groups=new Map();for(let w of s.wins){let g=groups.get(w.owner)||{name:w.name,items:[]};g.items.push(w);groups.set(w.owner,g)}
  let wall=$('trophies');wall.replaceChildren();if(!groups.size)wall.textContent='None yet';
  for(let g of groups.values()){let b=document.createElement('button');b.className='tile';let img=document.createElement('img');img.src='./dogtag.svg';img.alt='';img.style.width='22px';img.style.height='22px';img.style.verticalAlign='middle';let strong=document.createElement('strong');strong.textContent=' '+g.items.length;let label=document.createElement('span');label.textContent=g.name.slice(0,4).toUpperCase();b.append(img,strong,label);
    b.onclick=()=>{let area=$('dialogText');area.replaceChildren();let hh=document.createElement('h2');hh.textContent=g.name;area.append(hh);for(let w of [...g.items].reverse()){let p=document.createElement('p');p.textContent=`${w.team}${w.n} · ${w.offer.slice(0,10)} · ${new Date(w.capturedAt).toLocaleString()}`;area.append(p)}$('dialog').showModal()};
    wall.append(b)}
  $('medals').textContent=s.medics.length?'💉 '+s.medics.length+' medic assists':'';
  $('history').replaceChildren();for(let e of [...s.events].reverse()){let li=document.createElement('li');li.textContent=e.at+': '+e.message;$('history').append(li)}
  $('pendingBox').classList.toggle('hidden',!s.medPending);$('pendingInfo').textContent=s.medPending?`Waiting for fresh second scan of ${s.medPending.name} before ${new Date(s.medPending.deadline).toLocaleString()}`:'';
  $('hostTools').classList.toggle('hidden',!h||h.gid!==s.gid)}
function render(){renderSetup();renderPlay()}
async function stopScan(){let item=scanner;scanner=null;$('camera').classList.add('hidden');$('joinCamera').classList.add('hidden');if(item){try{await item.stop()}catch(e){}try{item.clear()}catch(e){}}busy=false}
async function scan(kind,mode){currentScanMode=mode||'normal';reconcile();if(kind==='play'&&!s)return;await stopScan();if(typeof Html5Qrcode!=='function'){note('Scanner library unavailable. Load app once online.');return}let joinMode=kind==='join';let camBox=$(joinMode?'joinCamera':'camera');camBox.classList.remove('hidden');let lbl=camBox.querySelector('h2.scanLabel');if(!lbl){lbl=document.createElement('h2');lbl.className='scanLabel';camBox.insertBefore(lbl,camBox.firstChild)}lbl.textContent=joinMode?'SCAN HOST QR':(mode==='tag'?'SCAN TAGS TAKEN':'GRAB TAGS / HEAL');try{let item=new Html5Qrcode(joinMode?'joinReader':'reader');scanner=item;await item.start({facingMode:'environment'},{fps:8,qrbox:{width:190,height:190}},async text=>{if(busy)return;busy=true;await stopScan();try{joinMode?getJoin(text):accept(text)}catch(e){note(e.message)}},()=>{})}catch(e){note('Camera error: '+e.message);await stopScan()}}
function download(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mash-unit-${s.game}-${s.team}-${s.id.slice(0,6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
$('hostOpen').onclick=()=>{view='hostForm';render()};$('hostBack').onclick=()=>{view='choice';render()};$('create').onclick=hostCreate;$('joinOpen').onclick=()=>{view='joinPanel';render()};$('joinBack').onclick=()=>{view=h?'hostPanel':'choice';render()};$('joinScan').onclick=()=>scan('join');$('joinStop').onclick=stopScan;$('joinManual').onclick=()=>{try{getJoin($('joinText').value)}catch(e){note(e.message)}};$('previewBack').onclick=()=>{pending=null;view=h?'hostPanel':'joinPanel';render()};$('confirmJoin').onclick=join;
for(let [id,type,t,target] of [['hostJA','J','A','hostQR'],['hostJB','J','B','hostQR'],['hostBA','B','A','hostQR'],['hostBB','B','B','hostQR'],['playJA','J','A','playHostQR'],['playJB','J','B','playHostQR'],['playBA','B','A','playHostQR'],['playBB','B','B','playHostQR']])$(id).onclick=()=>hostDraw(type,t,target);
$('selfA').onclick=()=>{try{getJoin(joinCode('A'))}catch(e){note(e.message)}};$('selfB').onclick=()=>{try{getJoin(joinCode('B'))}catch(e){note(e.message)}};
$('eraseHost').onclick=()=>{if(s){note('Reset player first.');return}if(confirm('Erase host codes on THIS phone? Other phones will not be changed.')){localStorage.removeItem(HOST);h=null;view='choice';render();note('Host setup erased.')}};
$('hit').onclick=hit;$('scan').onclick=()=>scan('play');$('stop').onclick=stopScan;$('cancelMedic').onclick=cancelMedic;$('export').onclick=()=>{if(s)download()};$('reset').onclick=()=>{if(!s||!confirm('Erase THIS phone v4 player game and personal history?'))return;localStorage.removeItem(KEY);s=null;document.body.classList.remove('returning','mist');view=h?'hostPanel':'choice';render();note('Player reset. Older v1/v2/v3 storage untouched.')};$('closeDialog').onclick=()=>$('dialog').close();
$('mapButton').onclick=()=>{$('mapOverlay').classList.remove('hidden')};
$('mapClose').onclick=()=>{$('mapOverlay').classList.add('hidden')};
$('mapOverlay').addEventListener('dblclick',()=>{$('mapOverlay').classList.add('hidden')});
for(let i=1;i<=20;i++){let x=document.createElement('option');x.value=String(i);x.textContent=String(i);if(i===5)x.selected=true;$('lives').append(x)}
try{let raw=localStorage.getItem(HOST);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!ruleOK(x.rules))throw Error('host');h=x;view='hostPanel'}}catch(e){note('Saved host game unreadable. Do not clear browser storage.')}
try{let raw=localStorage.getItem(KEY);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!idOK(x.id)||!ruleOK(x.rules)||!Array.isArray(x.tags)||x.tags.length!==(x.rules.lives==='U'?1:Number(x.rules.lives))||!['ACTIVE','OFFERED','RETURN','ELIMINATED'].includes(x.phase)||!Array.isArray(x.events)||!Array.isArray(x.wins)||!Array.isArray(x.medics)||!Array.isArray(x.seen))throw Error('player');s=x}}catch(e){note('Saved player data unreadable. Do not clear browser storage.')}
render();reconcile();setInterval(()=>{reconcile();secondsLeft();refreshOffer();if(s?.medPending&&time()>=s.medPending.deadline)edit(x=>{x.medPending=null;record(x,'Medic attempt expired')})},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile();secondsLeft();refreshOffer()}});if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>note('Offline cache registration failed. Reload online before offline test.'));
})();
