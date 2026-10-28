// ================= Smart cube dialog =================
// Connect a GAN smart cube over Bluetooth, read its state, and load a scramble that gives the
// same cube (scrambleFromCube). The link stays open when the dialog closes, so a second read
// needs no new connection. While the dialog is open, the net follows each turn of the cube.
// The protocol is in gan.js. The MAC address of each cube is saved by its name in cw:ganMac.
// The cube cannot see its stickers: it counts its turns from the last reset, and a turn it missed
// leaves the count off until the next reset. Scan my cube (the camera, scan.js) and Paint my cube
// (paint.js) read the real state and hand it to conn.correct (gan.js): from then on every state
// from the cube is corrected, here, in the cube tab and in the lab. The fix is kept by the cube's
// name in cw:ganFix, with the day it was made, and goes to the link on connect. My cube is solved
// drops it: the cube counts from solved again.
// Without Web Bluetooth, the page can reach a cube through the Twistwright app for macOS
// (bridge.js): the app serves the page and the chooser is a list in this dialog. A Mac with
// neither gets the download dialog instead.
// Every change of the link goes out as a cw:smart event on document, for the cube tab in the top
// bar (cubetab.js): {type:'connect',conn}, 'disconnect', 'gone', and each 'move', 'state', 'gyro'
// and 'battery' message.
// The charge: the link asks the cube for it on connect and once a minute (gan.js), and the dialog
// shows it by the cube's name as a small battery with the percent, smartBatteryDraw. The cube tab
// and the lab draw theirs the same way.
let smartConn=null,smartCube=null,smartBusy=false,smartTimer=0,smartMacWait=null;
function smartNotify(detail){if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('cw:smart',{detail}));}
const MAC_APP_URL='https://github.com/earchibald/cfop/releases/latest/download/Twistwright-mac.zip';
// How this page can reach a cube: 'bt' (Web Bluetooth), 'bridge' (the app serves the page),
// 'download' (a Mac with neither: offer the app) or 'none'.
function smartMode(){
  if(typeof navigator!=='undefined'&&navigator.bluetooth)return 'bt';
  if((typeof BRIDGE!=='undefined'&&BRIDGE)||smartInApp())return 'bridge';
  return smartIsMac()?'download':'none';
}
// The page in the app's own window. Its message handler is there from the start, before the
// app answers hello (BRIDGE), so a click at once never gets the download.
function smartInApp(){return typeof bridgeNative==='function'&&!!bridgeNative();}
// How a smart cube connects here, in one line: the app says nothing of browsers.
function smartHowWords(){
  if(smartInApp())return 'The app connects to your cube over Bluetooth.';
  if(smartMode()==='bridge')return 'The Twistwright app connects to your cube.';
  return 'Chrome and Edge connect directly. Safari connects through the Mac app.';
}
// An iPad says Mac too, but has touch.
function smartIsMac(){const n=typeof navigator==='undefined'?{}:navigator;return /Mac/.test(n.platform||'')&&!(n.maxTouchPoints>1);}
// The Bluetooth name of a cube as a person says it: GAN12uiM_A1B2 is a GAN 12 ui Maglev,
// GAN356iC_... a GAN 356 i Carry. A name of another shape comes back without its id suffix.
function smartNiceName(raw){
  const name=String(raw||'GAN cube').replace(/[_-][0-9A-Za-z]{2,6}$/,'');
  const m=/^GAN(\d+)([A-Za-z0-9]*)$/.exec(name);
  if(!m)return name==='GAN'||!name?'GAN cube':name;
  const t=/^(ui|i\d?|iC(?:arry)?\d?|ic)?(M)?$/i.exec(m[2]);
  if(!t)return `GAN ${m[1]} ${m[2]}`.trim();
  const parts=['GAN',m[1]];
  if(t[1])parts.push(/^ic/i.test(t[1])?'i Carry'+t[1].replace(/^iC(?:arry)?/i,'').replace(/^(\d)$/,' $1'):t[1]);
  if(t[2])parts.push('Maglev');
  return parts.join(' ');
}
// The button in the seed bar: Smart cube, or the download of the app on a Mac that cannot connect.
function smartLabel(){
  const b=$('#smartBtn');if(!b)return;
  const dl=smartMode()==='download';
  b.classList.toggle('dl',dl);
  b.textContent=dl?'Download macOS app to use a Smart Cube':'Smart cube';
  b.title=dl?'Safari cannot use Bluetooth. The Twistwright app for macOS connects to your cube.':'Read a GAN smart cube with Bluetooth';
}
// With `note`, the dialog opens on the cube it has (smartCube) and says `note`, with no new read.
function openSmart(note){
  if($('#smartBg'))return;
  if(typeof note!=='string')note='';
  if(smartMode()==='download'){openSmartDownload();return;}
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='smartBg';
  bg.innerHTML=`<div class="modal smart" role="dialog" aria-label="Smart cube">
   <button class="close small ghost" id="smartClose" aria-label="Close" title="Close this window (Esc)">✕</button>
   <h2>Smart cube</h2>
   <p class="muted" style="margin-top:0">Connect a GAN smart cube, such as the GAN 12 ui, with Bluetooth. Twistwright reads the cube, then loads a scramble that gives the same cube. Turn the cube once to wake it up before you connect.</p>
   <div class="smart-grid">
    <div class="scan-net" id="smartNet"><svg viewBox="0 0 400 300" role="img" aria-label="The cube as the smart cube reads it"></svg></div>
    <div>
     <div class="scan-row"><button class="primary" id="smartConnect" title="Look for a GAN cube over Bluetooth">Connect</button><button class="small ghost hidden" id="smartDisconnect" title="Drop the link to the cube">Disconnect</button><span class="muted" id="smartInfo" style="font-size:13px"></span><span class="batt" id="smartBatt" hidden></span></div>
     <div id="smartList" class="hidden">
      <p class="muted" id="smartListNote" style="font-size:13px;margin:6px 0"></p>
      <div class="scan-row" id="smartListItems"></div>
      <div class="scan-row"><button class="small ghost" id="smartListCancel" title="Stop the search and choose no cube">Cancel</button></div>
     </div>
     <div id="smartMacRow" class="hidden">
      <p class="muted" style="font-size:13px;margin:6px 0">The cube needs its MAC address to talk, and this browser cannot read it. Type it here. Or turn on <span class="kbd">chrome://flags/#enable-experimental-web-platform-features</span> in Chrome and connect again: then Twistwright reads the address itself.</p>
      <div class="scan-row"><input id="smartMac" placeholder="AB:12:34:56:78:9A" spellcheck="false" autocomplete="off" style="flex:1;min-width:180px" title="The MAC address of the cube: six pairs of letters and digits"><button class="primary" id="smartMacGo" title="Connect with this address">Use this address</button></div>
     </div>
     <div class="scan-row"><button class="primary" id="smartUse" disabled title="Load a scramble that gives the cube as the net shows it">Use this cube</button><button class="small" id="smartRead" disabled title="Ask the cube for its state again">Read again</button></div>
     <p class="muted" style="font-size:13px;margin:6px 0">The cube counts its own turns. It cannot see its colors. If the net does not match your cube, solve your cube, then press My cube is solved. Or read the colors of your cube as it is, with the camera or by hand: the net then follows your cube from that state.</p>
     <div class="scan-row"><button class="small ghost" id="smartSolved" disabled title="Tell the cube its state is solved, so the net starts from there">My cube is solved</button><button class="small ghost" id="smartScan" disabled title="Read the colors of the cube with the camera, so the net matches it">Scan my cube</button><button class="small ghost" id="smartPaint" disabled title="Tap the colors of the cube onto a map, so the net matches it">Paint my cube</button></div>
     <p class="muted hidden" id="smartFixNote" style="font-size:13px;margin:6px 0"></p>
    </div>
   </div>
   <div id="smartStatus" class="notice"></div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeSmart();});
  $('#smartClose').onclick=closeSmart;
  $('#smartConnect').onclick=()=>smartConnect();
  $('#smartDisconnect').onclick=smartDisconnect;
  $('#smartRead').onclick=()=>smartRead();
  $('#smartSolved').onclick=smartSolved;
  $('#smartScan').onclick=()=>smartReadColors('scan');
  $('#smartPaint').onclick=()=>smartReadColors('paint');
  $('#smartUse').onclick=smartUse;
  $('#smartMacGo').onclick=smartMacGo;
  $('#smartMac').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();smartMacGo();}});
  document.addEventListener('keydown',smartKeys,true);
  smartDraw();smartButtons();
  if(!ganAvailable()&&!smartInApp())smartStatus('This browser cannot use Bluetooth. Use Chrome or Edge on a computer or an Android phone. On an iPhone or iPad, use the Bluefy browser.');
  else if(smartConn&&note&&smartCube)smartStatus(note);
  else if(smartConn){smartStatus(`Connected to ${smartConn.name}. Reading the cube.`);smartRead();}
  else if(smartMode()==='bridge')smartStatus('Press Connect, then choose your cube in the list.');
  else smartStatus('Press Connect, then choose your cube in the list that the browser shows.');
}
// Connect now, for a button that says so ("Connect my cube"): the dialog with the look already
// begun, as a press of its Connect. Where the page cannot connect, the dialog (or the download).
function smartConnectNow(){
  openSmart();
  const m=smartMode();
  if(smartConn||(m!=='bt'&&m!=='bridge')||!$('#smartBg'))return;
  smartStatus(m==='bridge'?'Choose your cube in the list. Turn a face to wake it up.':'Choose your cube in the list that the browser shows.');
  smartConnect();
}
// A Mac that cannot connect: offer the Twistwright app for macOS, which opens this page itself.
// Never in the app's own window: there the page connects.
function openSmartDownload(){
  if(smartInApp()){openSmart();return;}
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='smartBg';
  bg.innerHTML=`<div class="modal smart dl" role="dialog" aria-label="Smart cube on a Mac">
   <button class="close small ghost" id="smartClose" aria-label="Close" title="Close this window (Esc)">✕</button>
   <h2>Smart cube on a Mac</h2>
   <p class="muted" style="margin-top:0">Safari cannot use Bluetooth. The Twistwright app for macOS can. It shows Twistwright in a window of its own and connects to your GAN cube.</p>
   <div class="scan-row"><button class="primary" id="smartDl" title="Get the Twistwright app for macOS from GitHub">Download for macOS</button><button class="small" id="smartOpenApp" title="Open the Twistwright app if it is installed">Open the app</button></div>
   <ol class="muted" style="font-size:14px;padding-left:20px">
    <li>Unzip the download and move Twistwright to Applications.</li>
    <li>Open Twistwright. macOS asks once if you want to open an app from the internet. Press Open.</li>
    <li>Allow Bluetooth when the app asks. Then press Smart cube in the app's window.</li>
   </ol>
   <p class="muted" style="font-size:14px">Chrome and Edge have Bluetooth without an app.</p>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeSmart();});
  $('#smartClose').onclick=closeSmart;
  $('#smartDl').onclick=()=>{location.href=MAC_APP_URL;};
  $('#smartOpenApp').onclick=()=>{location.href='twistwright://smart';};
  document.addEventListener('keydown',smartKeys,true);
}
function closeSmart(){
  document.removeEventListener('keydown',smartKeys,true);clearTimeout(smartTimer);
  if(smartMacWait){const w=smartMacWait;smartMacWait=null;w(null);}
  if(smartLook&&smartLook.where==='dialog')smartLook.end(null);
  const b=$('#smartBg');if(b)b.remove();
  smartNotify({type:'close'});
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
  $('#smartScan').disabled=!on||smartBusy||typeof openScan!=='function';$('#smartPaint').disabled=!on||smartBusy||typeof openPaint!=='function';
  $('#smartUse').disabled=!on||!smartCube||smartBusy;
  $('#smartInfo').textContent=on?smartConn.name:'';
  smartBatteryDraw($('#smartBatt'),on?smartConn.battery:null);
  const note=$('#smartFixNote'),fix=on?smartFixes()[smartConn.name]:null;
  note.classList.toggle('hidden',!(on&&smartConn.fix&&fix));
  if(on&&smartConn.fix&&fix)note.textContent=`The net is corrected from ${fix.from==='paint'?'the colors you painted':'a scan'}${fix.at?' on '+new Date(fix.at).toLocaleDateString():''}. My cube is solved drops the correction.`;
}
// The charge of the cube in `el`: a small battery, filled to the level, and the percent. Under
// SMART_BATTERY_LOW it is marked low. null (the cube has not said, or no cube) hides it.
const SMART_BATTERY_LOW=20;
function smartBatteryDraw(el,level){
  if(!el)return;
  const known=typeof level==='number'&&level>=0;
  el.hidden=!known;
  if(!known){el.textContent='';el.classList.remove('low');return;}
  const pct=Math.max(0,Math.min(100,Math.round(level)));
  if(!el.querySelector('.batt-box'))el.innerHTML='<span class="batt-box" aria-hidden="true"><span class="batt-fill"></span></span><span class="batt-pct"></span>';
  el.querySelector('.batt-fill').style.width=pct+'%';
  el.querySelector('.batt-pct').textContent=pct+'%';
  el.classList.toggle('low',pct<SMART_BATTERY_LOW);
  el.title=`The charge of the cube: ${pct}%`+(pct<SMART_BATTERY_LOW?'. Charge the cube soon.':'');
  el.setAttribute('aria-label',`Charge ${pct}%`);
}
// The fixes by cube name: {fix:{cp,co,ep,eo}, from:'scan'|'paint', at:ms}.
function smartFixes(){return store.get('ganFix',{});}
function smartSaveFix(name,fix,from){const m=smartFixes();if(fix)m[name]={fix:ganFixSave(fix),from,at:Date.now()};else delete m[name];store.set('ganFix',m);}
function smartLoadFix(name){const e=smartFixes()[name];return e?ganFixLoad(e.fix):null;}
// Scan my cube or Paint my cube: the dialog closes for the scanner or the painter (the link stays),
// the cube that comes back is the real state, and the dialog opens again on the corrected net.
function smartReadColors(how){
  if(!smartConn||smartBusy)return;
  const conn=smartConn,name=conn.name;
  if(typeof (how==='scan'?openScan:openPaint)!=='function')return;
  const open=how==='scan'?opts=>openScan(Object.assign({n:3},opts)):opts=>openPaint(opts);
  closeSmart();
  open({onCube:async cube=>{
    if(conn!==smartConn){openSmart();smartStatus('The cube is no longer connected. Connect, then read the colors again.');return;}
    smartBusy=true;
    try{smartCube=await conn.correct(cube,3000);smartSaveFix(name,conn.fix,how);}
    catch(e){smartBusy=false;openSmart('The cube did not answer, so the colors were not used. Turn a face to wake it up, then try again.');return;}
    smartBusy=false;
    openSmart(`The net now shows your cube as ${how==='scan'?'scanned':'painted'}. Each turn of your cube turns the net from here.`);
  },onClose:()=>openSmart(),go:'Use this cube'});
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
// The cubes this browser has connected, by name: {mac, id, at}. The lab keeps the same map
// (cw:labCubes), so a cube connected in one connects by itself in the other.
function smartKnown(){return store.get('labCubes',{});}
function smartRemember(name,d){const m=smartKnown();m[name]=Object.assign(m[name]||{},d,{at:Date.now()});store.set('labCubes',m);}
function smartIsKnown(d,known){return !!(known[d.name]||Object.values(known).some(k=>k.id&&k.id===d.id));}
// The look for a cube, as the lab does it: the chooser (the browser's own with Web Bluetooth, a
// list over the bridge), or, with `known`, the look with no click, where a known cube is taken as
// soon as it is heard. `where` is the place that shows the look: 'dialog' (this dialog) or 'tab'
// (the Smart cube tab, cubetab.js). One look at a time: smartLook {where, why, end}. `why` is
// 'show' for the look that the tab starts when it opens (it ends when the user leaves the tab) and
// 'drop' for the one after the link drops (it goes on wherever the user is).
let smartLook=null,smartPickSeq=0;
async function smartPick(known,where,why,seq){
  if(navigator.bluetooth)return known?smartPickKnown(known,where,why,seq):ganPick();
  const link=BRIDGE||await bridgeStart();
  if(!link)throw new Error('The Twistwright app is not running. Open it, then press Connect again.');
  if(link.bluetooth==='unauthorized')throw new Error('macOS did not allow Bluetooth for Twistwright. Allow it in System Settings › Privacy & Security › Bluetooth, then press Connect again.');
  if(link.bluetooth==='poweredOff')throw new Error('Bluetooth is off on this Mac. Turn it on, then press Connect again.');
  // The look with no click (known is set) does not make macOS ask for Bluetooth. A press does.
  if(known&&link.bluetooth==='notAsked')throw Object.assign(new Error('not asked'),{name:'NotAsked'});
  return smartList(link,known,where,why,seq,!!known);
}
// The row of the look: a note, the cubes found as buttons (over the bridge) and Cancel, in the
// dialog (#smartList) or the tab (#smartTabList). start(end, p) begins the look and returns what
// stops it; end(dev) ends the look with that device. Cancel, or the link closing, ends it with
// none: the promise rejects with NotFoundError, as it does at once when a newer look has begun
// (seq is not smartPickSeq).
function smartRow(note,where,why,seq,start){
  if(seq!==smartPickSeq)return Promise.reject(Object.assign(new Error('cancelled'),{name:'NotFoundError'}));
  const p=where==='tab'?'#smartTabList':'#smartList';
  const row=$(p);row.classList.remove('hidden');$(p+'Items').textContent='';$(p+'Note').textContent=note;
  return new Promise((res,rej)=>{
    let stop=null,ended=false;
    const end=dev=>{if(ended)return;ended=true;if(stop)stop();if(smartLook&&smartLook.end===end)smartLook=null;if($(p))row.classList.add('hidden');
      if(dev)res(dev);else rej(Object.assign(new Error('cancelled'),{name:'NotFoundError'}));};
    $(p+'Cancel').onclick=()=>end(null);smartLook={where,why,end};
    stop=start(end,p);if(ended)stop();
  });
}
function smartLookNote(names){return `Looking for ${names.map(smartNiceName).join(', ')}. Turn a face to wake the cube up.`;}
// End the look that `why` started (any look with no `why`), if it runs.
function smartLookStop(why){if(smartLook&&(!why||smartLook.why===why))smartLook.end(null);}
// The list over the bridge. A known cube ends the look as soon as the scan hears it, with the
// address the scan carries or the one saved; any other cube is a button. auto: the look with no click.
function smartList(link,known,where,why,seq,auto){
  const names=known?Object.keys(known):[];if(!names.length)known=null;
  const seen=new Map();
  return smartRow(known?smartLookNote(names):'Looking for cubes. Turn a face to wake the cube up.',where,why,seq,(end,p)=>{
    const items=$(p+'Items'),note=$(p+'Note');
    const stop=link.scan(d=>{
      if(known&&smartIsKnown(d,known)){end(bridgeDevice(link,{id:d.id,name:d.name,mac:d.mac||(known[d.name]||{}).mac||smartMacs()[d.name]||null}));return;}
      let b=seen.get(d.id);
      if(!b){b=document.createElement('button');b.className='small';items.appendChild(b);seen.set(d.id,b);}
      b.textContent=d.name;b.dataset.mac=d.mac||'';b.title='Connect to '+d.name;
      b.onclick=()=>end(bridgeDevice(link,{id:d.id,name:d.name,mac:b.dataset.mac||null}));
      if(!known)note.textContent='Choose your cube.';
    },auto);
    const onEv=e=>{
      if(e.ev==='bluetooth'&&e.state==='unauthorized')note.textContent='macOS did not allow Bluetooth for Twistwright. Allow it in System Settings › Privacy & Security › Bluetooth.';
      if(e.ev==='bluetooth'&&e.state==='poweredOff')note.textContent='Bluetooth is off on this Mac.';
      if(e.ev==='closed')end(null);
    };
    link.on(onEv);
    return()=>{stop();link.off(onEv);};
  });
}
// Web Bluetooth with no click: of the cubes this page was once allowed (getDevices, where the
// browser has it), the known ones; the first heard advertising is taken. Where the browser cannot
// listen, the first known one is taken at once and the link tried. null where the browser has no
// getDevices or none of its cubes is known: then only Connect, a click, can open the chooser.
async function smartPickKnown(known,where,why,seq){
  const bt=navigator.bluetooth;
  if(typeof bt.getDevices!=='function')return null;
  const devs=(await bt.getDevices()).filter(d=>smartIsKnown(d,known));
  if(!devs.length)return null;
  if(devs.some(d=>typeof d.watchAdvertisements!=='function'))return devs[0];
  return smartRow(smartLookNote(devs.map(d=>d.name)),where,why,seq,end=>{
    const ab=new AbortController();
    const ons=devs.map(d=>{const f=()=>end(d);d.addEventListener('advertisementreceived',f);d.watchAdvertisements({signal:ab.signal}).catch(()=>{});return [d,f];});
    return()=>{ab.abort();for(const [d,f] of ons)d.removeEventListener('advertisementreceived',f);};
  });
}
// Can the page look for a cube with no click? Over the bridge, always: the list comes up at once.
// With Web Bluetooth only for a known cube, through getDevices: the chooser needs a click.
function smartCanLook(){
  if(smartConn||smartBusy||smartLook||!ganAvailable())return false;
  if(smartMode()==='bridge')return true;
  return smartMode()==='bt'&&!!Object.keys(smartKnown()).length&&typeof navigator.bluetooth.getDevices==='function';
}
// The look with no click: when the Smart cube tab opens with no cube ('show'), and when the link
// drops ('drop'). What it says goes to the tab.
function smartAuto(why){if(smartCanLook())smartConnect({auto:true,where:'tab',why:why||'show'});}
// What a look says: in the dialog, its status line; on the tab, a cw:smart 'look' event.
function smartSay(where,t){if(where==='dialog')smartStatus(t);else smartNotify({type:'look',text:t});}
// o.where: the place that shows the look ('dialog' by default, or 'tab'). o.auto: the look with no
// click (smartAuto). A press of Connect while a look runs ends that look and starts the chooser.
async function smartConnect(o){
  o=o||{};const auto=!!o.auto;let where=o.where||'dialog';
  if(smartBusy||smartConn||!ganAvailable())return;
  smartLookStop();
  const seq=++smartPickSeq,why=o.why||'show';
  // The look holds its place from the start: a second look cannot begin while getDevices or the
  // bridge is still on its way. The row takes the place over (smartRow); an end before it drops
  // this look.
  const hold={where,why,end:()=>{if(smartLook===hold)smartLook=null;smartPickSeq++;}};smartLook=hold;
  let device;
  try{device=await smartPick(auto?smartKnown():null,where,why,seq);}
  catch(e){if(smartLook===hold)smartLook=null;if(seq===smartPickSeq)smartSay(where,e.name==='NotAsked'?'Press Connect to look for your cube.':e.name==='NotFoundError'?(auto?'Press Connect to look for your cube again.':'No cube was chosen. Turn the cube to wake it up, then press Connect again.'):'Bluetooth did not start: '+e.message);return;}
  if(smartLook===hold)smartLook=null;
  if(seq!==smartPickSeq||smartConn||smartBusy)return;
  if(!device){smartSay(where,'Press Connect, then choose your cube in the list that the browser shows.');return;}
  const name=device.name||'GAN cube';
  smartBusy=true;smartButtons();
  // The app reads the address from the advertisement (device.mac); a saved one is the next best.
  let mac=device.mac||smartMacs()[name]||(smartKnown()[name]||{}).mac,typed=false;const fix=smartLoadFix(name);
  if(!mac){smartSay(where,`Looking for the address of ${name}. Turn a face now and then to keep the cube awake.`);mac=await ganWatchMac(device,8000);}
  for(;;){
    if(!mac){
      smartBusy=false;smartButtons();
      // The address is typed in the dialog. The look with no click does not open it.
      if(auto){smartSay(where,`Press Connect to connect ${smartNiceName(name)}.`);return;}
      if(where==='tab'){where='dialog';openSmart();}
      if(!$('#smartBg'))return;
      mac=await smartAskMac(name);typed=true;
      if(!mac)return;
      smartBusy=true;smartButtons();
    }
    smartSay(where,`Connecting to ${name}.`);
    let conn=null;
    try{conn=await ganOpen(device,mac,ev=>smartEvent(ev,conn),{fix});}
    catch(e){smartBusy=false;smartButtons();smartSay(where,e.code==='model'?e.message:'The connection did not start. Turn the cube to wake it up, then press Connect again.');return;}
    try{
      const cube=await conn.readState(3000);
      smartSaveMac(name,conn.mac);smartRemember(name,{mac:conn.mac,id:device.id||null});
      smartConn=conn;smartBusy=false;smartGot(cube);smartNotify({type:'connect',conn,cube,auto});return;
    }catch(e){
      conn.close();
      if(e.code!=='badmac'&&e.code!=='timeout'){smartBusy=false;smartButtons();smartSay(where,'The cube did not answer: '+e.message);return;}
      smartSaveMac(name,null);smartRemember(name,{mac:null});
      if(auto){smartBusy=false;smartButtons();smartSay(where,`${smartNiceName(name)} did not answer. Press Connect to try again.`);return;}
      smartSay(where,typed?'The cube did not answer. Check the MAC address, then try again.':`The cube did not answer. Type the MAC address of ${name}.`);
      mac=null; // ask for it
    }
  }
}
// Events from a link that is not the current one (a failed try, or one that was closed) are dropped.
function smartEvent(ev,conn){
  if(!conn||conn!==smartConn)return;
  if(ev.type==='gone'){smartConn=null;smartBusy=false;smartButtons();smartStatus('The cube is no longer connected. Press Connect to connect again.');smartNotify({type:'gone',conn});smartAuto('drop');return;}
  if(ev.type==='move'||ev.type==='state'||ev.type==='gyro'||ev.type==='battery')smartNotify(Object.assign({conn},ev));
  if(ev.type==='battery')smartBatteryDraw($('#smartBatt'),ev.level);
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
  smartStatus(cube.isSolved()?'The cube is solved. Press Use this cube to start from here, or mix it up first: the net follows each turn.'
    :'Check the net against your cube: white up, green front. If it matches, press Use this cube.');
}
async function smartSolved(){
  if(!smartConn||smartBusy)return;
  try{await smartConn.send('reset');}catch(e){smartStatus('The cube did not take the change: '+e.message);return;}
  smartSaveFix(smartConn.name,null); // the reset dropped the fix on the link (gan.js); drop the saved one too
  clearTimeout(smartTimer); // a quiet read after a turn would take the place of this read, and its status
  await new Promise(r=>setTimeout(r,100));await smartRead();
}
function smartUse(){
  if(!smartCube)return; // a solved cube loads too: an empty scramble, as the scanner and the painter give one
  const r=scrambleFromCube(smartCube,customName('smart'));
  if(r.ok)closeSmart();else smartStatus(r.errors.join(' '));
}
function smartDisconnect(){if(smartConn){const c=smartConn;smartConn=null;c.close();smartNotify({type:'disconnect',conn:c});}smartCube=null;smartBusy=false;smartDraw();smartButtons();smartStatus('Disconnected. Press Connect to connect again.');}
if(typeof document!=='undefined'&&$('#smartBtn')){
  $('#smartBtn').onclick=openSmart;smartLabel();
  document.addEventListener('cw:bridge',smartLabel);
  // twistwright://smart opens this page with ?smart=1: open the dialog once the app has answered.
  if(/[?&]smart=1/.test(location.search)){
    try{window.history.replaceState(null,'',location.pathname);}catch(e){} // history alone is the scramble history in app.js
    bridgeStart().then(()=>{if(METHODS[method].puzzle!=='3x3')setMethod('cfop');openSmart();});
  }
  // Bring History from Safari in the app opens this page in Safari with ?migrate=1: send the
  // history saved here to the app, then say what happened.
  if(/[?&]migrate=1/.test(location.search)){
    try{window.history.replaceState(null,'',location.pathname);}catch(e){}
    bridgeStart().then(l=>l&&!l.native?bridgeMigrate(l):{count:0,error:'no app'}).then(smartMigrated);
  }
}
// The note of a history move, at the top of the Safari page.
function smartMigrated(r){
  const t=r.error?'The Twistwright app did not answer. Open the app, then choose File > Bring History from Safari.'
    :r.cancelled?'The app did not take the history. Nothing changed.'
    :r.count?`Your history is in the Twistwright app now: ${r.count} saved ${r.count===1?'item':'items'}. You can close this tab.`
    :'This page has no saved history to move.';
  let n=$('#migrateNote');
  if(!n){n=document.createElement('div');n.id='migrateNote';n.className='migrate-note';n.setAttribute('role','status');document.body.appendChild(n);}
  const s=document.createElement('span');s.textContent=t;
  const b=document.createElement('button');b.textContent='Close';b.title='Close this note';b.onclick=()=>n.remove();
  n.replaceChildren(s,b);
}
