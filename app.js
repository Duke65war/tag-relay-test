(() => {
'use strict';
const KEY='tag-relay-v2', $=id=>document.getElementById(id), TTL=300000;
let s=null, scanner=null, shown='', lastTick='';
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const now=()=>Date.now();
const fmt=t=>new Date(t).toLocaleString();
function notice(msg){$('notice').textContent=msg||''}
function log(msg){s.events.push({at:new Date().toISOString(),message:msg})}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s));render();return true}catch(e){notice('SAVE FAILED: stop testing. Browser storage unavailable.');return false}}
function makeqr(element,text,size=190){element.replaceChildren();if(typeof QRCode==='function'){try{new QRCode(element,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M})}catch(e){notice('QR drawing failed; use the text code below.')}}else notice('QR library not loaded. Connect once online to install, or use the text code.')}
function activeTag(){return s&&s.offer?s.tags[s.offer.n-1]:null}
function validOffer(){return s.offer&&activeTag()?.status==='OFFERED'&&now()-s.offer.at<TTL}
function codeForOffer(){let a=s.offer;return ['TR2','O',s.game,s.team,s.id,s.mode,a.n,a.id,a.at,Math.floor(now()/8000),encodeURIComponent(s.name)].join('|')}
function finished(){return s.mode!=='U'&&s.tags.every(t=>t.status==='LOST')}
function available(){return s.tags.some(t=>t.status==='LIVE')}
function showqr(text,where){if(text!==shown){shown=text;makeqr(where,text)}}
function render(){
$('setup').classList.toggle('hidden',!!s);$('play').classList.toggle('hidden',!s);if(!s)return;
$('identity').textContent=`${s.name} · Team ${s.team} · game ${s.game} · ${s.mode==='U'?'Unlimited':s.mode+' lives'}`;
const bar=$('bar');bar.replaceChildren();s.tags.forEach((tag,i)=>{let el=document.createElement('span');el.className='segment '+tag.status;el.title=`Life ${i+1}: ${tag.status}`;bar.append(el)});bar.setAttribute('aria-label',`Life status: ${s.tags.map(t=>t.status).join(', ')}`);
$('hit').disabled=!!s.offer||!available()||finished()||s.tags.some(t=>t.status==='RETURN');
$('scan').disabled=!!s.offer||finished()||s.tags.some(t=>t.status==='RETURN');
let st=$('stage');st.replaceChildren();shown='';
if(validOffer()){
let title=document.createElement('h2');title.textContent=`Offer ${s.team}${s.offer.n} · ${s.name}`;st.append(title);
let timer=document.createElement('p');timer.id='timer';st.append(timer);
let instruction=document.createElement('p');instruction.textContent='Enemy scans once; you tap LIFE LOST while they watch. Teammate scans twice, at least 30 seconds apart; then you tap MEDIC COMPLETE.';st.append(instruction);
let q=document.createElement('div');q.id='qr';st.append(q);let payload=document.createElement('div');payload.id='payload';st.append(payload);
let lost=document.createElement('button');lost.className='danger';lost.textContent=`LIFE LOST — ${s.team}${s.offer.n}`;lost.onclick=lose;st.append(lost);
let medic=document.createElement('button');medic.className='alt';medic.textContent='MEDIC COMPLETE — teammate showed success';medic.onclick=heal;st.append(medic);
let code=codeForOffer();showqr(code,q);payload.textContent=code;updateTimer();
}else if(s.tags.some(t=>t.status==='RETURN')||(s.mode==='U'&&s.tags[0].status==='LOST')){
let p=document.createElement('h2');p.textContent='RETURN TO BASE — scan your team base QR to play again';st.append(p);
}else if(finished()){
let p=document.createElement('h2');p.textContent='ELIMINATED — leave play safely';st.append(p);
}else{let p=document.createElement('p');p.className='muted';p.textContent='Call HIT and mark yourself out before using this phone.';st.append(p)}
$('overlay').classList.toggle('hidden',!finished());document.body.classList.toggle('mist',finished());$('overlay').textContent=finished()?'ELIMINATED — leave play. Safety instructions and trophy wall remain accessible.':'';
const win=$('trophies');win.replaceChildren();let groups=new Map();for(let event of s.wins){let group=groups.get(event.owner)||{name:event.name,events:[]};group.events.push(event);groups.set(event.owner,group)}
if(!groups.size)win.textContent='None yet';for(const group of groups.values()){let b=document.createElement('button');b.className='tile';let symbol=document.createElement('strong');symbol.textContent=`🏆${group.events.length}`;let short=document.createElement('span');short.textContent=group.name.slice(0,4).toUpperCase();b.append(symbol,short);b.onclick=()=>{let box=$('dialogtext');box.replaceChildren();let h=document.createElement('h2');h.textContent=group.name;box.append(h);for(let event of [...group.events].reverse()){let p=document.createElement('p');p.textContent=`${event.team}${event.tag} — ${fmt(event.at)}`;box.append(p)}$('dialog').showModal()};win.append(b)}
$('medals').textContent=s.medics.length?`💉 ${s.medics.length} medic assists`:'';
$('history').replaceChildren();for(const x of [...s.events].reverse()){let li=document.createElement('li');li.textContent=`${x.at}: ${x.message}`;$('history').append(li)}
$('baseqr').replaceChildren();let q=document.createElement('div');q.id='qr';$('baseqr').append(q);let base=`TR2|B|${s.game}|${s.team}`;makeqr(q,base,145);let txt=document.createElement('small');txt.textContent=base;$('baseqr').append(txt);
}
function updateTimer(){if(!validOffer())return;let sec=Math.max(0,Math.ceil((TTL-(now()-s.offer.at))/1000));let t=$('timer');if(t)t.textContent=`Time to resolve: ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
function tick(){if(!s||!s.offer)return;if(now()-s.offer.at>=TTL){let t=activeTag();if(t&&t.status==='OFFERED'){t.status='RETURN';log(`${s.team}${s.offer.n} expired; return to base`)}s.offer=null;persist();notice('Five minutes expired. Return to base and scan your base QR.');return}updateTimer();let nonce=Math.floor(now()/8000);if(nonce!==lastTick){lastTick=nonce;let q=$('stage').querySelector('#qr'),payload=$('stage').querySelector('#payload');if(q&&payload){let code=codeForOffer();showqr(code,q);payload.textContent=code}}}
function setup(){let game=$('game').value.trim().toUpperCase(),name=$('name').value.trim(),team=$('team').value,mode=$('mode').value;if(!/^[A-Z0-9_-]{3,12}$/.test(game)||!name||name.includes('|')){notice('Enter a game code (3–12 letters/numbers) and a name.');return}let count=mode==='U'?1:Number(mode);s={version:2,game,name,team,mode,id:hex(),tags:Array.from({length:count},()=>({status:'LIVE'})),offer:null,wins:[],medics:[],seen:[],medPending:null,events:[]};log('Started v2 playtest');persist();notice('Check the same game code and life mode on every phone. Export logs before reset.')}
function hit(){if(!s||s.offer||!available()||s.tags.some(t=>t.status==='RETURN'))return;let n=s.tags.findIndex(t=>t.status==='LIVE')+1;s.tags[n-1].status='OFFERED';s.offer={n,id:hex(),at:now()};log(`${s.team}${n} offered`);persist()}
function lose(){if(!validOffer())return;let n=s.offer.n;if(!confirm(`Confirm life lost: ${s.team}${n}? The capturer must see your bar turn red.`))return;s.tags[n-1].status='LOST';log(`${s.team}${n} lost (witnessed tap)`);s.offer=null;persist();notice(finished()?'All lives lost — eliminated.':s.mode==='U'?'Out — return to base.':'Life lost.')}
function heal(){if(!validOffer())return;let n=s.offer.n;if(!confirm(`Has a TEAM ${s.team} teammate shown you the completed second scan after 30 seconds? Restore ${s.team}${n}?`))return;s.tags[n-1].status='LIVE';log(`${s.team}${n} medic restored (witnessed tap)`);s.offer=null;persist();notice('Medic complete. Life restored.')}
function decode(text){let p=String(text||'').trim().split('|');if(!s||p[0]!=='TR2'||p[2]!==s.game)throw Error('Wrong game or invalid QR');return p}
function accept(text){let p=decode(text);
if(p[1]==='B'){if(p.length!==4||p[3]!==s.team)throw Error('This is not your team base');if(s.offer)throw Error('Resolve the yellow offer first');let rest=s.tags.filter(t=>t.status==='RETURN');if(s.mode==='U'&&s.tags[0].status==='LOST')rest=[s.tags[0]];if(!rest.length)throw Error('No life is waiting for a base respawn');for(let t of rest)t.status='LIVE';log('Base QR scanned; returned to play');persist();notice('Respawn complete — green.');return}
if(p[1]!=='O'||p.length!==11||!['A','B'].includes(p[3])||!/^\d+$/.test(p[6])||!/^\d+$/.test(p[8])||!/^\d+$/.test(p[9]))throw Error('Unrecognised offer QR');
let [team,owner,mode,n,offer,issued,challenge]=[p[3],p[4],p[5],+p[6],p[7],+p[8],p[9]],name;try{name=decodeURIComponent(p[10])}catch(e){throw Error('Invalid player name in QR')}
if(!name||mode!==s.mode)throw Error('Different life settings or missing player name');if(owner===s.id)throw Error('You cannot scan your own offer');if(n<1||(mode!=='U'&&n>Number(mode))||(mode==='U'&&n!==1))throw Error('Invalid life number');if(!/^[a-f0-9]{24}$/.test(owner)||! /^[a-f0-9]{24}$/.test(offer))throw Error('Invalid offer ID');
if(team===s.team){let m=s.medPending;if(!m){s.medPending={owner,offer,challenge,started:now(),name,team,n};log(`Medic started for ${name} ${team}${n}`);persist();notice('Medic started. Stay together; scan this player again after at least 30 seconds.');return}
if(m.owner!==owner||m.offer!==offer)throw Error('Finish your current medic attempt first');if(challenge===m.challenge)throw Error('Wait for a fresh QR on the hit player’s phone');if(now()-m.started<30000)throw Error(`Medic: wait ${Math.ceil((30000-(now()-m.started))/1000)} more seconds`);if(now()-m.started>TTL)throw Error('Medic attempt expired; start again');if(s.medics.some(x=>x.offer===offer))throw Error('Medic assist already recorded');s.medics.push({owner,offer,name,team,tag:n,at:now()});s.medPending=null;log(`Medic complete for ${name} ${team}${n}`);persist();notice('💉 Medic complete! Show this screen; hit player taps MEDIC COMPLETE.');return}
if(s.seen.includes(offer))throw Error('This offer was already captured on your phone');if(s.wins.some(x=>x.offer===offer))throw Error('This trophy is already on your wall');s.seen.push(offer);s.wins.push({owner,offer,name,team,tag:n,at:now()});log(`Captured ${name} ${team}${n} (honour-system scan; watch owner tap LIFE LOST)`);persist();notice(`🏆 ${name} ${team}${n} captured. Watch the hit player tap LIFE LOST and turn red.`)
}
async function stopScan(){if(scanner){let a=scanner;scanner=null;try{await a.stop()}catch(e){}try{a.clear()}catch(e){}}$('camera').classList.add('hidden')}
async function scan(){if(!s)return;await stopScan();$('camera').classList.remove('hidden');if(typeof Html5Qrcode!=='function'){notice('Camera library unavailable. Enter QR text or connect once online to install.');return}try{scanner=new Html5Qrcode('reader');await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:190,height:190}},async text=>{await stopScan();try{accept(text)}catch(e){notice(e.message)}},()=>{})}catch(e){notice('Camera could not start: '+e.message+'. Enter QR text instead.');await stopScan()}}
function exportLog(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tag-relay-v2-${s.game}-${s.team}-${s.id.slice(0,6)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
$('start').onclick=setup;$('hit').onclick=hit;$('scan').onclick=scan;$('stop').onclick=stopScan;$('closeDialog').onclick=()=>$('dialog').close();
$('readmanual').onclick=async()=>{await stopScan();try{accept($('manual').value);$('manual').value=''}catch(e){notice(e.message)}};
$('export').onclick=exportLog;$('reset').onclick=()=>{if(confirm('Export first. Erase THIS phone’s v2 test game, lives and trophy history?')){localStorage.removeItem(KEY);s=null;render();notice('This phone’s v2 game reset. Original v1 browser data remains untouched.')}};
try{let raw=localStorage.getItem(KEY);if(raw){s=JSON.parse(raw);if(s.version!==2||!Array.isArray(s.tags)||!Array.isArray(s.events))throw Error('Invalid state')}}catch(e){s=null;notice('Saved v2 state could not be read. Do not reset if you need to recover it.')}render();setInterval(tick,1000);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>notice('Offline install failed. Stay online and reload before an airplane-mode test.'));
})();