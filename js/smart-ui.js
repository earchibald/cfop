// ================= Smart cube dialog =================
// Connect a GAN smart cube over Bluetooth, read its state, and load a scramble that gives the
// same cube (scrambleFromCube). The link stays open when the dialog closes, so a second read
// needs no new connection. While the dialog is open, the net follows each turn of the cube.
// The protocol is in gan.js. The MAC address of each cube is saved by its name in cw:ganMac.
let smartConn=null,smartCube=null,smartBusy=false,smartTimer=0,smartMacWait=null;
function openSmart(){
  if($('#smartBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='smartBg';
  bg.innerHTML=`<div class="modal smart" role="dialog" aria-label="Smart cube">
   <button class="close small ghost" id="smartClose" aria-label="Close">✕</button>
   <h2>Smart cube</h2>
   <p class="muted" style="margin-top:0">Connect a GAN smart cube, such as the GAN 12 ui, with Bluetooth. Twistwright reads the cube, then loads a scramble that gives the same cube. Turn the cube once to wake it up before you connect.</p>
   <div class="smart-grid">
    <div class="scan-net" id="smartNet"><svg viewBox="0 0 400 300" role="img" aria-label="The cube as the smart cube reads it"></svg></div>
    <div>
     <div class="scan-row"><button class="primary" id="smartConnect">Connect</button><button class="small ghost hidden" id="smartDisconnect">Disconnect</button><span class="muted" id="smartInfo" style="font-size:13px"></span></div>
     <div id="smartMacRow" class="hidden">
      <p class="muted" style="font-size:13px;margin:6px 0">The cube needs its MAC address to talk, and this browser cannot read it. Type it here. Or turn on <span class="kbd">chrome://flags/#enable-experimental-web-platform-features</span> in Chrome and connect again: then Twistwright reads the address itself.</p>
      <div class="scan-row"><input id="smartMac" placeholder="AB:12:34:56:78:9A" spellcheck="false" autocomplete="off" style="flex:1;min-width:180px"><button class="primary" id="smartMacGo">Use this address</button></div>
     </div>
     <div class="scan-row"><button class="primary" id="smartUse" disabled>Use this cube</button><button class="small" id="smartRead" disabled>Read again</button></div>
     <p class="muted" style="font-size:13px;margin:6px 0">The cube counts its own turns. If the net does not match your cube, solve your cube, then press My cube is solved.</p>
     <div class="scan-row"><button class="small ghost" id="smartSolved" disabled>My cube is solved</button></div>
    </div>
   </div>
   <div id="smartStatus" class="notice"></div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeSmart();});
  $('#smartClose').onclick=closeSmart;
  $('#smartConnect').onclick=smartConnect;
  $('#smartDisconnect').onclick=smartDisconnect;
  $('#smartRead').onclick=()=>smartRead();
  $('#smartSolved').onclick=smartSolved;
  $('#smartUse').onclick=smartUse;
  $('#smartMacGo').onclick=smartMacGo;
  $('#smartMac').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();smartMacGo();}});
  document.addEventListener('keydown',smartKeys,true);
  smartDraw();smartButtons();
  if(!ganAvailable())smartStatus('This browser cannot use Bluetooth. Use Chrome or Edge on a computer or an Android phone. On an iPhone or iPad, use the Bluefy browser.');
  else if(smartConn){smartStatus(`Connected to ${smartConn.name}. Reading the cube.`);smartRead();}
  else smartStatus('Press Connect, then choose your cube in the list that the browser shows.');
}
function closeSmart(){
  document.removeEventListener('keydown',smartKeys,true);clearTimeout(smartTimer);
  if(smartMacWait){const w=smartMacWait;smartMacWait=null;w(null);}
  const b=$('#smartBg');if(b)b.remove();
}
function smartKeys(e){
  if(!$('#smartBg'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSmart();return;}
  e.stopPropagation(); // keep tab/timer keys out while the dialog is open
}
function smartStatus(t){const e=$('#smartStatus');if(e)e.textContent=t;}
function smartDraw(){
  const svg=$('#smartNet svg');if(!svg)return;
  // Before the first read, only the centers show.
  const f=smartCube?smartCube.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);
  svg.innerHTML=renderNet(f,{n:3});
}
function smartButtons(){
  if(!$('#smartBg'))return;
  const on=!!smartConn;
  $('#smartConnect').classList.toggle('hidden',on);$('#smartDisconnect').classList.toggle('hidden',!on);
  $('#smartConnect').disabled=smartBusy||!ganAvailable();
  $('#smartRead').disabled=!on||smartBusy;$('#smartSolved').disabled=!on||smartBusy;
  $('#smartUse').disabled=!on||!smartCube||smartBusy;
  $('#smartInfo').textContent=on?smartConn.name:'';
}
function smartMacs(){return store.get('ganMac',{});}
function smartSaveMac(name,mac){const m=smartMacs();if(mac)m[name]=mac;else delete m[name];store.set('ganMac',m);}
// Wait for the user to type a MAC address. Resolves null if the dialog closes.
function smartAskMac(name){
  $('#smartMacRow').classList.remove('hidden');
  const inp=$('#smartMac');inp.value=smartMacs()[name]||'';setTimeout(()=>inp.focus(),20);
  return new Promise(res=>{smartMacWait=res;});
}
function smartMacGo(){
  const mac=ganParseMac($('#smartMac').value);
  if(!mac){smartStatus('Type six pairs of letters and digits, with a colon between each pair: AB:12:34:56:78:9A.');return;}
  $('#smartMacRow').classList.add('hidden');
  if(smartMacWait){const w=smartMacWait;smartMacWait=null;w(mac);}
}
async function smartConnect(){
  if(smartBusy||smartConn||!ganAvailable())return;
  let device;
  try{device=await ganPick();}
  catch(e){smartStatus(e.name==='NotFoundError'?'No cube was chosen. Turn the cube to wake it up, then press Connect again.':'Bluetooth did not start: '+e.message);return;}
  const name=device.name||'GAN cube';
  smartBusy=true;smartButtons();
  let mac=smartMacs()[name],typed=false;
  if(!mac){smartStatus(`Looking for the address of ${name}. Turn a face now and then to keep the cube awake.`);mac=await ganWatchMac(device,8000);}
  for(;;){
    if(!mac){
      if(!$('#smartBg')){smartBusy=false;return;}
      smartBusy=false;smartButtons();
      mac=await smartAskMac(name);typed=true;
      if(!mac)return;
      smartBusy=true;smartButtons();
    }
    smartStatus(`Connecting to ${name}.`);
    let conn=null;
    try{conn=await ganOpen(device,mac,ev=>smartEvent(ev,conn));}
    catch(e){smartBusy=false;smartButtons();smartStatus(e.code==='model'?e.message:'The connection did not start. Turn the cube to wake it up, then press Connect again.');return;}
    try{
      const cube=await conn.readState(3000);
      smartSaveMac(name,conn.mac);smartConn=conn;smartBusy=false;smartGot(cube);return;
    }catch(e){
      conn.close();
      if(e.code!=='badmac'&&e.code!=='timeout'){smartBusy=false;smartButtons();smartStatus('The cube did not answer: '+e.message);return;}
      smartSaveMac(name,null);
      smartStatus(typed?'The cube did not answer. Check the MAC address, then try again.':`The cube did not answer. Type the MAC address of ${name}.`);
      mac=null; // ask for it
    }
  }
}
// Events from a link that is not the current one (a failed try, or one that was closed) are dropped.
function smartEvent(ev,conn){
  if(!conn||conn!==smartConn)return;
  if(ev.type==='gone'){smartConn=null;smartBusy=false;smartButtons();smartStatus('The cube is no longer connected. Press Connect to connect again.');return;}
  if(ev.type==='off'){conn.close();return;}
  // A turn: read the state again once the turns stop for a moment.
  if(ev.type==='move'&&$('#smartBg')){clearTimeout(smartTimer);smartTimer=setTimeout(()=>smartRead(true),150);}
  if(ev.type==='state'&&!smartBusy){smartCube=ev.cube;smartDraw();smartButtons();}
}
async function smartRead(quiet){
  if(!smartConn||smartBusy)return;
  smartBusy=true;smartButtons();
  try{const cube=await smartConn.readState(3000);smartBusy=false;if(quiet){smartCube=cube;smartDraw();smartButtons();}else smartGot(cube);}
  catch(e){smartBusy=false;smartButtons();if(!quiet)smartStatus('The cube did not answer. Turn a face to wake it up, then press Read again.');}
}
function smartGot(cube){
  smartCube=cube;smartDraw();smartButtons();
  smartStatus(cube.isSolved()?'The cube is solved. Mix it up: the net follows each turn. Then press Use this cube.'
    :'Check the net against your cube: white up, green front. If it matches, press Use this cube.');
}
async function smartSolved(){
  if(!smartConn||smartBusy)return;
  try{await smartConn.send('reset');}catch(e){smartStatus('The cube did not take the change: '+e.message);return;}
  await new Promise(r=>setTimeout(r,100));await smartRead();
}
function smartUse(){
  if(!smartCube)return;
  if(smartCube.isSolved()){smartStatus('The cube is solved. Mix it up first.');return;}
  const r=scrambleFromCube(smartCube,customName('smart'));
  if(r.ok)closeSmart();else smartStatus(r.errors.join(' '));
}
function smartDisconnect(){if(smartConn){const c=smartConn;smartConn=null;c.close();}smartCube=null;smartBusy=false;smartDraw();smartButtons();smartStatus('Disconnected. Press Connect to connect again.');}
if(typeof document!=='undefined'&&$('#smartBtn'))$('#smartBtn').onclick=openSmart;
