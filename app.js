(() => {
'use strict';
const KEY='tag-relay-v1';
const $=id=>document.getElementById(id);
let state=null, scanner=null, shown=null;
const rand=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(16).padStart(2,'0')).join('');
const other=()=>state.me==='A'?'B':'A';
function notice(text){$('notice').textContent=text;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));render();return true}catch(e){notice('SAVE FAILED: do not continue. Storage unavailable or full.');return false}}
function log(text){state.log.push({at:new Date().toISOString(),text});}
function parse(text){let p=String(text).trim().split('|');if(!state||p[0]!=='TR1'||p[1]!==state.game)throw Error('Wrong game or invalid code');return p}
function display(title,desc,data){shown=data;$('outbox').classList.remove('hidden');$('qrtitle').textContent=title;$('qrdesc').textContent=desc;$('payload').textContent=data;$('qr').replaceChildren();if(typeof QRCode==='function'){try{new QRCode($('qr'),{text:data,width:220,height:220,correctLevel:QRCode.CorrectLevel.M})}catch(e){notice('QR could not be drawn; use the printed code.')}}else notice('QR library unavailable; reconnect once to finish offline setup, or use printed codes.');}
function render(){
 $('setup').classList.toggle('hidden',!!state);$('play').classList.toggle('hidden',!state);if(!state)return;
 $('identity').textContent=`${state.name} · player ${state.me} · game ${state.game}`;
 const live=state.tags.filter(t=>t.status==='LIVE').length, held=state.tags.filter(t=>t.status==='OFFERED');
 $('stats').textContent=`${live} live · ${Object.keys(state.trophies).length} collected`;
 $('hit').disabled=live===0||held.length>0||!!state.pending;
 $('abort').classList.toggle('hidden',!held.length);
 $('tags').replaceChildren();state.tags.forEach(t=>{let row=document.createElement('p');row.textContent=`${state.me}${t.n}: ${t.status}${t.claimant?' → '+t.claimant:''}`;if(t.receipt){let b=document.createElement('button');b.className='alt';b.textContent='Show receipt';b.onclick=()=>display(`Receipt for ${state.me}${t.n}`,'The claimant scans this to complete their copy.',t.receipt);row.append(' ',b)}$('tags').append(row)});
 $('trophies').textContent=Object.keys(state.trophies).length?Object.keys(state.trophies).join(', '):'None yet';
 $('history').replaceChildren();state.log.slice().reverse().forEach(x=>{let li=document.createElement('li');li.textContent=`${x.at}: ${x.text}`;$('history').append(li)});
 $('outbox').classList.add('hidden');shown=null;
 if(held.length){let t=held[0];display(`Out — offer ${state.me}${t.n}`,'The other player scans this; your tag is already spent from your live count.',`TR1|${state.game}|O|${state.me}|${t.n}|${t.offer}`)}
 else if(state.pending){let p=state.pending;display(`Claim ${p.owner}${p.n}`,'The out player scans your claim; then scan their receipt.',`TR1|${state.game}|C|${p.owner}|${p.n}|${p.offer}|${state.me}|${p.claim}`)}
 else if(state.lastReceipt){display('Transfer recorded','The claimant scans this receipt. You may also reopen it from My tags.',state.lastReceipt)}
}
function setup(){let game=$('game').value.trim().toUpperCase(),name=$('name').value.trim(),me=$('slot').value;if(!/^[A-Z0-9_-]{3,12}$/.test(game)||!name){notice('Enter a game code of 3–12 letters/numbers and your name.');return}state={game,name,me,tags:Array.from({length:5},(_,i)=>({n:i+1,status:'LIVE'})),trophies:{},pending:null,lastReceipt:null,log:[]};log('Started with five live tags');save()}
function hit(){let t=state.tags.find(t=>t.status==='LIVE');if(!t||state.tags.some(t=>t.status==='OFFERED')||state.pending)return;t.status='OFFERED';t.offer=rand();t.hit=rand();state.lastReceipt=null;log(`Hit: ${state.me}${t.n} offered (${t.hit}); one life spent`);save()}
function unclaimed(){let t=state.tags.find(t=>t.status==='OFFERED');if(!t)return;if(!confirm(`End this hit without a claim? ${state.me}${t.n} stays spent.`))return;t.status='UNCLAIMED';log(`${state.me}${t.n} ended unclaimed`);save()}
function handle(raw){let p=parse(raw),type=p[2];
 if(type==='O'){
  if(p.length!==6||p[3]!==other()||!/^\d$/.test(p[4])||+p[4]<1||+p[4]>5||! /^[a-f0-9]{12}$/.test(p[5]))throw Error('Invalid offer');
  let [owner,n,offer]=[p[3],+p[4],p[5]];
  if(state.pending){if(state.pending.owner===owner&&state.pending.n===n&&state.pending.offer===offer){render();return}throw Error('Finish your existing pending claim first')}
  state.pending={owner,n,offer,claim:rand()};state.lastReceipt=null;log(`Saw offer ${owner}${n}; claim awaiting owner`);save();return;
 }
 if(type==='C'){
  if(p.length!==8||p[3]!==state.me||p[6]!==other())throw Error('Claim is not addressed to your tag');
  let t=state.tags[+p[4]-1];if(!t||t.status!=='OFFERED'||t.offer!==p[5]||! /^[a-f0-9]{12}$/.test(p[7]))throw Error('This tag is not currently claimable');
  if(!confirm(`${other()} claims your tag ${state.me}${t.n}. You are releasing THIS tag. Confirm?`))return;
  t.status='TRANSFERRED';t.claimant=p[6];t.claim=p[7];t.receipt=`TR1|${state.game}|R|${state.me}|${t.n}|${t.offer}|${t.claimant}|${t.claim}|${rand()}`;state.lastReceipt=t.receipt;log(`${state.me}${t.n} transferred to ${t.claimant}; receipt ${t.receipt.split('|')[8]}`);save();return;
 }
 if(type==='R'){
  if(p.length!==9||p[7]!==state.pending?.claim||p[6]!==state.me||p[3]!==state.pending.owner||+p[4]!==state.pending.n||p[5]!==state.pending.offer)throw Error('Receipt does not match your pending claim');
  let id=`${p[3]}${p[4]}`;if(state.trophies[id])throw Error('Already collected');state.trophies[id]={receipt:raw.trim(),at:new Date().toISOString()};state.pending=null;log(`Collected ${id}; receipt ${p[8]}`);save();notice(`Confirmed: ${id} collected`);return;
 }
 throw Error('Unknown code type');
}
async function stopScan(){if(scanner){let s=scanner;scanner=null;try{await s.stop()}catch(e){}try{s.clear()}catch(e){}}$('camera').classList.add('hidden')}
async function scan(){if(!state)return;$('camera').classList.remove('hidden');if(typeof Html5Qrcode!=='function'){notice('Scanner library unavailable. Use manual entry or reconnect once to finish offline setup.');return}try{scanner=new Html5Qrcode('reader');await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:220,height:220}},async text=>{await stopScan();try{handle(text);notice('Code accepted.')}catch(e){notice(e.message)}},()=>{})}catch(e){notice('Camera could not start: '+e.message+' Use manual entry.');await stopScan();$('camera').classList.remove('hidden')}}
function exportLog(){let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tag-relay-${state.game}-${state.me}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('start').onclick=setup;$('hit').onclick=hit;$('abort').onclick=unclaimed;$('scan').onclick=scan;$('stop').onclick=stopScan;
$('readmanual').onclick=async()=>{await stopScan();try{handle($('manual').value);$('manual').value='';notice('Code accepted.')}catch(e){notice(e.message)}};
$('export').onclick=exportLog;$('reset').onclick=()=>{if(confirm('Erase this phone’s entire test game, tags and history? Export first if needed.')){localStorage.removeItem(KEY);state=null;render();notice('This phone reset. The other phone was not changed.')}};
try{let data=localStorage.getItem(KEY);if(data){state=JSON.parse(data);if(!Array.isArray(state.tags)||!Array.isArray(state.log))throw Error('Invalid saved state')}}catch(e){state=null;notice('Saved state could not be read. Do not reset if you need to recover it.')}render();
if('serviceWorker'in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>notice('Offline app files cached. Test with airplane mode before field use.')).catch(()=>notice('Offline installation failed. Stay online and reload before testing.'))}
})();