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
function offerData(a){if(a.length!==16||!idOK(a[2])||!idOK(a[9])||!idOK(a[12])||!['A','B'].includes(a[8])||!nameOK(a[10])||!Number.isInteger(a[11])||!Number.isSafeInteger(a[13])||!Number.isSafeInteger(a[14])||!Number.isSafeInteger(a[15]))throw Error('Malformed offer QR');let r={lives:String(a[3]),seconds:a[4],medic:a[5],a:a[6],b:a[7]};if(!ruleOK(r)||a[14]!==a[13]+r.seconds*1000||a[11]<1||a[11]>(r.lives==='U'?1:Number(r.lives)))throw Error('Invalid offer data');if(a[2]!==s.gid||JSON.stringify(r)!==JSON.stringify(s.rules))throw Error('Different game ID or locked rules');if(a[9]===s.id)throw Error('Cannot scan own tags');if(time()>=a[14])throw Error('Tags expired');if(a[13]>time()+60000)throw Error('Phone clocks disagree. Check time settings');return {team:a[8],owner:a[9],name:a[10],n:a[11],offer:a[12],at:a[13],deadline:a[14],challenge:a[15]}}
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
    edit(x=>{
      x.tags[n-1].status='LIVE';
      x.offer=null;
      x.phase='ACTIVE';
      x.outbound={type:'K',offer:s.offer.id,medicId,medicName,deadline:time()+180000};
      record(x,`Healed by ${medicName}`);
    });
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
function accept(raw){reconcile();if(!s)throw Error('Join a team first');let a=parse(raw);
  if(a[1]==='B'){if(a.length!==6||!idOK(a[2])||a[2]!==s.gid||a[3]!==s.team)throw Error('Wrong game or team base');if(s.phase!=='RETURN')throw Error('Only an out player can respawn');edit(x=>{if(x.rules.lives==='U')x.tags[0].status='LIVE';x.phase='ACTIVE';record(x,'Correct team base scan: respawn; finite red lives remain spent')});note('Respawned. Finite spent lives stayed red.');return}
  if(a[1]==='T'||a[1]==='H'){acceptReturn(a);return}
  if(a[1]==='K'){acceptThanks(a);return}
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
    edit(x=>{x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Heal offered to ${o.name}`)});
    note('Show HEALED to '+o.name+'. Then press their yellow life bar. Victim confirms by scanning back.');
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
  edit(x=>{x.medPending=null;x.outbound={type:'H',offer:o.offer,victimId:o.owner,victimName:o.name,deadline:time()+180000};record(x,`Heal offered to ${o.name}`)});
  note('Show HEALED to '+o.name+'. Then press their yellow life bar.');
}
function cancelMedic(){if(!s?.medPending)return;edit(x=>{x.medPending=null;record(x,'Medic attempt cancelled')});note('Medic attempt cleared.')}
function secondsLeft(){let el=$('timer');if(!el||!offered())return;let t=Math.max(0,Math.ceil((s.offer.deadline-time())/1000));el.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`}
function refreshOffer(){if(!offered())return;let slot=Math.floor(time()/8000);if(slot===offerSlot)return;offerSlot=slot;let node=$('offerQR');if(node){let text=offerCode();offerShown=text;makeQR(node,text,216)}}
function hostDraw(type,t,target){if(!h)return;let box=$(target);box.replaceChildren();let title=document.createElement('h2');title.textContent=`${t==='A'?h.rules.a:h.rules.b} (${t==='A'?'RED':'BLUE'}) ${type==='J'?'JOIN':'BASE'}`;box.append(title);let square=document.createElement('div');square.className='qr';box.append(square);makeQR(square,type==='J'?joinCode(t):baseCode(t));let p=document.createElement('p');p.className='compact';p.textContent=type==='J'?'Show only to assigned players.':'Post physically at this team base; a copy can be scanned anywhere.';box.append(p)}
function renderSetup(){$('setup').classList.toggle('hidden',!!s);$('play').classList.toggle('hidden',!s);if(s)return;let v=h&&view==='choice'?'hostPanel':view;for(let id of ['choice','hostForm','hostPanel','joinPanel','preview'])$(id).classList.toggle('hidden',id!==v);if(v==='hostPanel'&&h){$('hostInfo').textContent=`${h.game} · ${h.gid.slice(0,8)} · ${ruleText(h.rules)} · RED ${h.rules.a} @ ${h.baseA} / BLUE ${h.rules.b} @ ${h.baseB}`;if(!$('hostQR').childNodes.length)hostDraw('J','A','hostQR')}if(v==='preview'&&pending){$('previewTeam').textContent=`${pending.team==='A'?'RED':'BLUE'} TEAM ${pending.team==='A'?pending.rules.a:pending.rules.b}`;$('previewRules').textContent=ruleText(pending.rules)}}
function renderPlay(){if(!s)return;let phase=s.phase,ret=phase==='RETURN',dead=phase==='ELIMINATED';document.body.classList.toggle('returning',ret);document.body.classList.toggle('mist',dead);$('playarea').classList.toggle('teamB',s.team==='B');$('identity').textContent=`${s.name} · ${s.team==='A'?'Red '+s.rules.a+' @ '+s.baseA:'Blue '+s.rules.b+' @ '+s.baseB} · ${s.game} · ${ruleText(s.rules)}`;let bar=$('bar');bar.replaceChildren();s.tags.forEach((tag,i)=>{let el=document.createElement('span');el.className=tag.status;el.title=`Life ${i+1}: ${tag.status}`;if(tag.status==='OFFERED'&&offered()&&s.rules.medic!=='none'){el.classList.add('tappable');el.onclick=()=>scan('play','heal')}bar.append(el)});bar.setAttribute('aria-label','Life status: '+s.tags.map(t=>t.status).join(', '));$('actions').className='actions'+(ret?' return':dead||phase==='OFFERED'?' off':'');$('hit').disabled=phase!=='ACTIVE';$('scan').disabled=phase!=='ACTIVE'&&!ret;let st=$('stage');st.replaceChildren();offerSlot=-1;offerShown='';
  if(s.outbound&&s.outbound.type==='K'){
    let head=document.createElement('h2');head.textContent='THANKS';st.append(head);
    let timer=document.createElement('p');timer.className='timer';let t=Math.max(0,Math.ceil((s.outbound.deadline-time())/1000));timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} remaining`;st.append(timer);
    let box=document.createElement('div');box.className='qr offerqr';st.append(box);
    makeQR(box,thanksCode(s.outbound.offer,s.outbound.medicId,s.name,s.outbound.deadline));
    let p=document.createElement('p');p.className='compact';p.textContent='Show this to '+s.outbound.medicName+' so they get credit.';st.append(p);
    let b=document.createElement('button');b.className='alt';b.textContent='CLOSE';b.onclick=()=>{edit(x=>{x.outbound=null})};st.append(b);
  } else if(s.outbound){
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
    let tagBtn=document.createElement('button');tagBtn.className='tagButton';
    let span=document.createElement('span');span.className='tagButtonText';span.textContent=s.name.toUpperCase()+"'S";
    const chars=s.name.length+2;
    const cardW=Math.min((window.innerWidth||400)-40,540);
    const printableW=cardW*0.38;
    let fs=printableW/(chars*0.7);
    fs=Math.max(11,Math.min(32,fs));
    span.style.fontSize=fs+'px';
    tagBtn.appendChild(span);tagBtn.onclick=()=>scan('play','tag');st.append(tagBtn);
    let hint=document.createElement('p');hint.className='compact';hint.textContent=s.rules.medic==='none'?'Reaper presses TAG when they have your tags. Then scan their TAGS TAKEN QR.':'Reaper presses TAG to take tags. Medic presses the yellow bar to heal.';st.append(hint);
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
async function scan(kind,mode){currentScanMode=mode||'normal';reconcile();if(kind==='play'&&!s)return;await stopScan();if(typeof Html5Qrcode!=='function'){note('Scanner library unavailable. Load app once online.');return}let joinMode=kind==='join';let camBox=$(joinMode?'joinCamera':'camera');camBox.classList.remove('hidden');let lbl=camBox.querySelector('h2.scanLabel');if(!lbl){lbl=document.createElement('h2');lbl.className='scanLabel';camBox.insertBefore(lbl,camBox.firstChild)}lbl.textContent=joinMode?'SCAN HOST QR':(mode==='tag'?'SCAN TAGS TAKEN':(mode==='heal'?'SCAN HEALED':'GRAB TAGS / HEAL / THANKS'));try{let item=new Html5Qrcode(joinMode?'joinReader':'reader');scanner=item;await item.start({facingMode:'environment'},{fps:8,qrbox:{width:190,height:190}},async text=>{if(busy)return;busy=true;await stopScan();try{joinMode?getJoin(text):accept(text)}catch(e){note(e.message)}},()=>{})}catch(e){note('Camera error: '+e.message);await stopScan()}}
function download(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mash-unit-${s.game}-${s.team}-${s.id.slice(0,6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
$('hostOpen').onclick=()=>{view='hostForm';render()};$('hostBack').onclick=()=>{view='choice';render()};$('create').onclick=hostCreate;$('joinOpen').onclick=()=>{view='joinPanel';render()};$('joinBack').onclick=()=>{view=h?'hostPanel':'choice';render()};$('joinScan').onclick=()=>scan('join');$('joinStop').onclick=stopScan;$('previewBack').onclick=()=>{pending=null;view=h?'hostPanel':'joinPanel';render()};$('confirmJoin').onclick=join;
for(let [id,type,t,target] of [['hostJA','J','A','hostQR'],['hostJB','J','B','hostQR'],['hostBA','B','A','hostQR'],['hostBB','B','B','hostQR'],['playJA','J','A','playHostQR'],['playJB','J','B','playHostQR'],['playBA','B','A','playHostQR'],['playBB','B','B','playHostQR']])$(id).onclick=()=>hostDraw(type,t,target);
$('selfA').onclick=()=>{try{getJoin(joinCode('A'))}catch(e){note(e.message)}};$('selfB').onclick=()=>{try{getJoin(joinCode('B'))}catch(e){note(e.message)}};
$('eraseHost').onclick=()=>{if(s){note('Reset player first.');return}if(confirm('Erase host codes on THIS phone? Other phones will not be changed.')){localStorage.removeItem(HOST);h=null;view='choice';render();note('Host setup erased.')}};
$('hit').onclick=hit;$('scan').onclick=()=>scan('play');$('stop').onclick=stopScan;$('cancelMedic').onclick=cancelMedic;$('export').onclick=()=>{if(s)download()};$('reset').onclick=()=>{if(!s||!confirm("Erase this phone's player game and personal history?"))return;localStorage.removeItem(KEY);s=null;document.body.classList.remove('returning','mist');view=h?'hostPanel':'choice';render();note('Player reset.')};$('closeDialog').onclick=()=>$('dialog').close();
/* --- MAP --- */
(function(){
  let overlay=$('mapOverlay'),viewport=$('mapViewport'),inner=$('mapInner'),img=$('mapImage'),gridLayer=$('mapGridLayer'),markersBox=$('mapMarkers'),dot=$('mapBlueDot'),youLabel=$('mapYouLabel'),banner=$('mapBanner'),status=$('mapStatus');
  let debugPanel=$('mapDebugPanel'),debugText=$('mapDebugText');
  let tools={grid:$('mapGridBtn'),loc:$('mapLocBtn'),cal:$('mapCalBtn'),debug:$('mapDebugBtn')};
  if(!overlay||!viewport||!inner||!img||!gridLayer)return;
  let scale=1,tx=0,ty=0,startScale=1,startTx=0,startTy=0,startDist=0,startMidX=0,startMidY=0,startX=0,startY=0,pinching=false,panning=false,lastLift=0,wasSingle=false,gridOn=false,calLock=false;
  function showBanner(msg,ms){banner.textContent=msg;banner.style.display='block';if(ms)setTimeout(()=>{if(banner.textContent===msg)banner.style.display='none'},ms)}
  function showStatus(msg){if(msg){status.textContent=msg;status.style.display='block'}else{status.style.display='none'}}
  function apply(){
    inner.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
    document.querySelectorAll('.mapMarker').forEach(el=>{el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')'});
    dot.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';
    youLabel.style.transform='translate(-50%,30px) scale('+(1/scale)+')';
  }
  function reset(){scale=1;tx=0;ty=0;apply()}
  function dist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
  function midX(a,b){return (a.clientX+b.clientX)/2}
  function midY(a,b){return (a.clientY+b.clientY)/2}
  function clamp(s){return Math.max(1,Math.min(5,s))}
  function clampPan(){const vw=viewport.clientWidth,vh=viewport.clientHeight,iw=inner.clientWidth*scale,ih=inner.clientHeight*scale,minTx=Math.min(0,vw-iw),minTy=Math.min(0,vh-ih);if(tx>0)tx=0;if(tx<minTx)tx=minTx;if(ty>0)ty=0;if(ty<minTy)ty=minTy}
  function loadAnchors(){try{const raw=localStorage.getItem(ANCHOR_KEY);if(raw){const a=JSON.parse(raw);if(a.a&&a.b&&typeof a.a.xPct==='number'&&typeof a.b.xPct==='number')anchors=a}}catch(e){}}
  function saveAnchors(){try{localStorage.setItem(ANCHOR_KEY,JSON.stringify(anchors))}catch(e){}}
  function getImgDims(){const iw=img.naturalWidth||img.clientWidth||1,ih=img.naturalHeight||img.clientHeight||1;return {iw,ih}}
  function gpsToPct(lat,lng){if(!anchors||!anchors.a||!anchors.b)return null;const a=anchors.a,b=anchors.b;const {iw,ih}=getImgDims();const latAvg=((a.lat+b.lat)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const vgx=(b.lng-a.lng)*mLng, vgy=(b.lat-a.lat)*mLat;const vpx=(b.xPct-a.xPct)*iw, vpy=(b.yPct-a.yPct)*ih;const lenG=Math.hypot(vgx,vgy),lenP=Math.hypot(vpx,vpy);if(lenG<1||lenP<1e-6)return null;const mPerPx=lenG/lenP;const dxUser=(lng-a.lng)*mLng;const dyUser=(lat-a.lat)*mLat;const pxUser=dxUser/mPerPx;const pyUser=-dyUser/mPerPx;return {xPct:a.xPct+pxUser/iw,yPct:a.yPct+pyUser/ih}}
  function computeGridSpacingNativePx(){if(!anchors||!anchors.a||!anchors.b)return null;const a=anchors.a,b=anchors.b;const {iw,ih}=getImgDims();const latAvg=((a.lat+b.lat)/2)*Math.PI/180;const mLat=111320,mLng=111320*Math.cos(latAvg);const vgx=(b.lng-a.lng)*mLng, vgy=(b.lat-a.lat)*mLat;const vpx=(b.xPct-a.xPct)*iw, vpy=(b.yPct-a.yPct)*ih;const lenG=Math.hypot(vgx,vgy),lenP=Math.hypot(vpx,vpy);if(lenG<1||lenP<1e-6)return null;return 10/(lenG/lenP)}
  function applyGrid(){if(!anchors||!anchors.a||!anchors.b){gridLayer.classList.remove('on');return}const spacingNative=computeGridSpacingNativePx();if(!spacingNative){gridLayer.classList.remove('on');return}const {iw,ih}=getImgDims();const layoutW=img.clientWidth||iw;const layoutH=img.clientHeight||ih;const spacingX=(spacingNative/iw)*layoutW;const spacingY=(spacingNative/ih)*layoutH;const svg='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><line x1="0" y1="0" x2="2" y2="0" stroke="black" stroke-width="0.15"/><line x1="4" y1="0" x2="6" y2="0" stroke="black" stroke-width="0.15"/><line x1="8" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.15"/><line x1="0" y1="0" x2="0" y2="2" stroke="black" stroke-width="0.15"/><line x1="0" y1="4" x2="0" y2="6" stroke="black" stroke-width="0.15"/><line x1="0" y1="8" x2="0" y2="10" stroke="black" stroke-width="0.15"/></svg>';const b64=btoa(svg);gridLayer.style.backgroundImage='url("data:image/svg+xml;base64,'+b64+'")';gridLayer.style.backgroundSize=spacingX+'px '+spacingY+'px';gridLayer.classList.toggle('on',gridOn)}
  function drawMarker(name,lat,lng,colour,showLabel){if(!markersBox)return;const pct=gpsToPct(lat,lng);if(!pct)return;if(pct.xPct<-0.05||pct.xPct>1.05||pct.yPct<-0.05||pct.yPct>1.05)return;const el=document.createElement('div');el.className='mapMarker';el.style.left=(pct.xPct*100)+'%';el.style.top=(pct.yPct*100)+'%';el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';const d=document.createElement('div');d.className='mapMarkerDot';d.style.background=colour;el.appendChild(d);if(showLabel){const l=document.createElement('div');l.className='mapMarkerLabel';l.textContent=name;el.appendChild(l)}markersBox.appendChild(el)}
  function renderMarkers(){if(!markersBox)return;markersBox.replaceChildren();if(!anchors||!anchors.a||!anchors.b)return;const myTeam=s?s.team:null;const myBaseLabel=myTeam?(myTeam==='A'?s.rules.a:s.rules.b):'';const myBaseName=myTeam?(myTeam==='A'?s.baseA:s.baseB):null;const myColour=myTeam==='A'?'#a7222c':(myTeam==='B'?'#1c5daa':'#888');
    drawMarker('SAFE ZONE',BASES['Safe Zone'].lat,BASES['Safe Zone'].lng,'#d4af37',true);
    if(myBaseName&&BASES[myBaseName]){drawMarker((myBaseLabel||'')+' TEAM BASE',BASES[myBaseName].lat,BASES[myBaseName].lng,myColour,true)}
    if(gridOn){Object.keys(BASES).forEach(name=>{if(name==='Safe Zone')return;if(name===myBaseName)return;drawMarker(name,BASES[name].lat,BASES[name].lng,'#888',true)})}
    document.querySelectorAll('.mapMarker').forEach(el=>{el.style.transform='translate(-50%,-50%) scale('+(1/scale)+')'})}
  function updateStatusDefault(){if(anchors&&anchors.a&&anchors.b)showStatus('Anchors set. Grid + GPS ready.');else showStatus('No anchors. Tap CAL to set.')}
  function updateBlueDot(lat,lng,accuracy){if(!anchors||!anchors.a||!anchors.b){dot.style.display='none';youLabel.style.display='none';return}const pct=gpsToPct(lat,lng);if(!pct){dot.style.display='none';youLabel.style.display='none';return}dot.style.left=(pct.xPct*100)+'%';dot.style.top=(pct.yPct*100)+'%';dot.style.display='block';youLabel.style.left=(pct.xPct*100)+'%';youLabel.style.top=(pct.yPct*100)+'%';youLabel.textContent='You ±'+Math.round(accuracy||0)+'m';youLabel.style.display='block';dot.style.transform='translate(-50%,-50%) scale('+(1/scale)+')';youLabel.style.transform='translate(-50%,30px) scale('+(1/scale)+')';if(pct.xPct<0||pct.xPct>1||pct.yPct<0||pct.yPct>1){showBanner('You appear to be off the map ('+(pct.xPct*100).toFixed(0)+'%, '+(pct.yPct*100).toFixed(0)+'%)',5000)}}
  function startWatch(){if(mapWatchId!==null)return;if(!navigator.geolocation){showBanner('GPS not supported on this device',4000);return}try{mapWatchId=navigator.geolocation.watchPosition(p=>updateBlueDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy),e=>{dot.style.display='none';youLabel.style.display='none';showBanner('GPS error: '+e.message+' (code '+e.code+')',5000)},{enableHighAccuracy:true,maximumAge:5000,timeout:20000})}catch(e){showBanner('GPS exception: '+e.message,5000)}}
  function stopWatch(){if(mapWatchId!==null){try{navigator.geolocation.clearWatch(mapWatchId)}catch(e){}mapWatchId=null}}
  function enterCalibrate(){calibrating={step:1};calLock=false;showBanner('Step 1 of 2: Tap the map where Bird Rd Cnr is (western field corner).');tools.cal.classList.add('active')}
  function exitCalibrate(){calibrating=null;calLock=false;banner.style.display='none';tools.cal.classList.remove('active')}
  function handleCalibrateTap(clientX,clientY){
    if(calLock)return;
    const rect=img.getBoundingClientRect();
    const xRatio=(clientX-rect.left)/rect.width;
    const yRatio=(clientY-rect.top)/rect.height;
    if(xRatio<0||xRatio>1||yRatio<0||yRatio>1){showBanner('Tap inside the image',2500);return}
    const {iw,ih}=getImgDims();
    if(calibrating.step===1){
      calibrating.a={lat:ANCHOR_LOCS['Bird Rd Cnr'].lat,lng:ANCHOR_LOCS['Bird Rd Cnr'].lng,xPct:xRatio,yPct:yRatio,name:'Bird Rd Cnr'};
      calibrating.step=2;calLock=true;
      showBanner('Locked. Now tap Bonfire — 1 second...',1000);
      setTimeout(()=>{calLock=false;showBanner('Step 2 of 2: Tap the map where Bonfire is (north-east of field).')},1000);
    }else if(calibrating.step===2){
      const dxPx=(xRatio-calibrating.a.xPct)*iw;
      const dyPx=(yRatio-calibrating.a.yPct)*ih;
      const tapDistPx=Math.hypot(dxPx,dyPx);
      const imgDiagPx=Math.hypot(iw,ih);
      if(tapDistPx<imgDiagPx*0.15){showBanner('Taps too close ('+Math.round(tapDistPx)+'px). Pick two points far apart.',3500);return}
      calibrating.b={lat:ANCHOR_LOCS['Bonfire'].lat,lng:ANCHOR_LOCS['Bonfire'].lng,xPct:xRatio,yPct:yRatio,name:'Bonfire'};
      anchors={a:calibrating.a,b:calibrating.b};
      saveAnchors();exitCalibrate();updateStatusDefault();applyGrid();renderMarkers();startWatch();
      showBanner('Anchors set.',2500);
    }
  }
  viewport.addEventListener('touchstart',function(e){if(calibrating){if(e.touches.length===1)handleCalibrateTap(e.touches[0].clientX,e.touches[0].clientY);return}if(e.touches.length===2){pinching=true;panning=false;wasSingle=false;startDist=dist(e.touches[0],e.touches[1]);startMidX=midX(e.touches[0],e.touches[1]);startMidY=midY(e.touches[0],e.touches[1]);startScale=scale;startTx=tx;startTy=ty}else if(e.touches.length===1){const now=Date.now();if(wasSingle&&now-lastLift<300){overlay.classList.add('hidden');reset();stopWatch();wasSingle=false;return}wasSingle=true;panning=true;pinching=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTx=tx;startTy=ty}},{passive:true});
  viewport.addEventListener('touchmove',function(e){if(calibrating)return;if(pinching&&e.touches.length===2){e.preventDefault();const d=dist(e.touches[0],e.touches[1]),newScale=clamp(startScale*(d/startDist)),mx=midX(e.touches[0],e.touches[1]),my=midY(e.touches[0],e.touches[1]),ix=(startMidX-startTx)/startScale,iy=(startMidY-startTy)/startScale;scale=newScale;tx=mx-ix*scale;ty=my-iy*scale;clampPan();apply()}else if(panning&&e.touches.length===1){e.preventDefault();tx=startTx+(e.touches[0].clientX-startX);ty=startTy+(e.touches[0].clientY-startY);clampPan();apply()}},{passive:false});
  viewport.addEventListener('touchend',function(e){if(calibrating)return;if(e.touches.length===0){if(wasSingle)lastLift=Date.now();pinching=false;panning=false}else if(e.touches.length===1){pinching=false;panning=true;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTx=tx;startTy=ty}},{passive:true});
  viewport.addEventListener('click',function(e){if(calibrating)handleCalibrateTap(e.clientX,e.clientY)});
  $('mapButton').onclick=()=>{reset();overlay.classList.remove('hidden');loadAnchors();updateStatusDefault();applyGrid();renderMarkers();if(anchors&&anchors.a)startWatch();};
  $('mapClose').onclick=()=>{overlay.classList.add('hidden');reset();stopWatch()};
  tools.grid.onclick=()=>{gridOn=!gridOn;tools.grid.classList.toggle('active',gridOn);applyGrid();renderMarkers()};
  tools.loc.onclick=()=>{if(!anchors||!anchors.a||!anchors.b){showBanner('Set anchors first (tap CAL)',2500);return}if(!navigator.geolocation){showBanner('GPS not supported',3000);return}showBanner('Getting GPS...');navigator.geolocation.getCurrentPosition(p=>{banner.style.display='none';showStatus('GPS: '+(p.coords.latitude).toFixed(6)+', '+(p.coords.longitude).toFixed(6)+' ±'+Math.round(p.coords.accuracy)+'m');updateBlueDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy);startWatch()},e=>showBanner('GPS error: '+e.message+' (code '+e.code+')',6000),{enableHighAccuracy:true,timeout:20000,maximumAge:0})};
  tools.cal.onclick=()=>{if(calibrating){exitCalibrate();return}if(anchors&&anchors.a){if(!confirm('Re-calibrate anchors?'))return;anchors=null;try{localStorage.removeItem(ANCHOR_KEY)}catch(e){}dot.style.display='none';youLabel.style.display='none';gridLayer.classList.remove('on');gridOn=false;tools.grid.classList.remove('active');renderMarkers()}enterCalibrate()};
  tools.debug.onclick=()=>{
    const raw=localStorage.getItem(ANCHOR_KEY);
    if(raw){try{debugText.value=JSON.stringify(JSON.parse(raw),null,2)}catch(e){debugText.value=raw}}else{debugText.value='No anchors set yet. Run Cal first.'}
    debugPanel.classList.add('on');
  };
  $('mapDebugClose').onclick=()=>debugPanel.classList.remove('on');
  $('mapDebugCopy').onclick=()=>{debugText.select();debugText.setSelectionRange(0,99999);try{document.execCommand('copy')}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(debugText.value)}catch(e){}showBanner('Copied to clipboard',1500)};
  loadAnchors();
})();
/* --- INIT --- */
(function(){const ba=$('baseA'),bb=$('baseB');if(!ba||!bb)return;const main=Object.keys(BASES).filter(k=>BASES[k].group==='main');const sec=Object.keys(BASES).filter(k=>BASES[k].group==='secondary');const safe=Object.keys(BASES).filter(k=>BASES[k].group==='safe');function opt(parent,keys){keys.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;parent.appendChild(o)})}opt(ba,main);opt(ba,sec);opt(ba,safe);opt(bb,main);opt(bb,sec);opt(bb,safe);ba.value='Church';bb.value='Diego Garcia'})();
for(let i=1;i<=20;i++){let x=document.createElement('option');x.value=String(i);x.textContent=String(i);if(i===5)x.selected=true;$('lives').append(x)}
try{let raw=localStorage.getItem(HOST);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!ruleOK(x.rules))throw Error('host');h=x;view='hostPanel'}}catch(e){note('Saved host game unreadable. Do not clear browser storage.')}
try{let raw=localStorage.getItem(KEY);if(raw){let x=JSON.parse(raw);if(x.version!==4||!idOK(x.gid)||!idOK(x.id)||!ruleOK(x.rules)||!Array.isArray(x.tags)||x.tags.length!==(x.rules.lives==='U'?1:Number(x.rules.lives))||!['ACTIVE','OFFERED','RETURN','ELIMINATED'].includes(x.phase)||!Array.isArray(x.events)||!Array.isArray(x.wins)||!Array.isArray(x.medics)||!Array.isArray(x.seen))throw Error('player');s=x}}catch(e){note('Saved player data unreadable. Do not clear browser storage.')}
render();reconcile();setInterval(()=>{reconcile();secondsLeft();refreshOffer();if(s?.medPending&&time()>=s.medPending.deadline)edit(x=>{x.medPending=null;record(x,'Medic attempt expired')})},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile();secondsLeft();refreshOffer()}});if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>note('Offline cache registration failed. Reload online before offline test.'));
})();
