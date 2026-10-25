// The Smart cube tab connects as the lab does (smartAuto in js/smart-ui.js): with Web Bluetooth, a
// cube in cw:labCubes among getDevices connects with no click when the tab opens, and again when
// the link drops, on any tab, without moving the page; Disconnect stops it; leaving the tab ends
// the look it began. Over the bridge (test/fake-bridge.js) the list comes up on the tab at once, a
// press connects with no dialog, and the next page takes the cube by itself.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor}=require('./fake-gan');
const {fakeBridge,bridgeInfo}=require('./fake-bridge');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const MAC='AB:12:34:5C:9D:E1',NAME='GAN12uiM_A1B2';
function fakeStorage(m){return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};}
// o.store: a Map kept across pages; o.bt: navigator.bluetooth; o.bridge: a fakeBridge.
function boot(o){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(o.store)});
      if(o.bt)Object.defineProperty(w.navigator,'bluetooth',{value:o.bt});
      if(o.bridge){w.BRIDGE_LOCAL=true;w.WebSocket=o.bridge.FakeWebSocket;w.fetch=async u=>u==='/bridge/info'?{ok:true,json:async()=>bridgeInfo()}:{ok:false};}}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>{
    const d=w.document,ev=s=>new w.Function('return ('+s+')')();
    res({w,d,errs,ev,$:s=>d.querySelector(s),click:el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));}});},400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
const solved=()=>({cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0),ep:[...Array(12).keys()],eo:Array(12).fill(0)});
async function chrome(){
  const cube=solved(),dev=fakeDevice(4,MAC,cube,{name:NAME,mfData:mfDataFor(MAC)});
  let picks=0;const bt={getDevices:async()=>[dev],requestDevice:async()=>{picks++;return dev;}};
  // Nothing known: the tab does not look by itself; the chooser needs a click.
  const store=new Map([['cw:tab','"smart"']]);
  let p=await boot({store,bt});
  assert.strictEqual(p.ev('curTab'),'smart');await sleep(60);
  assert.ok(!p.ev('smartConn')&&!picks,'nothing known: no connect, no chooser');
  p.click(p.$('#smartTabConnect'));assert.strictEqual(picks,1,'Connect opens the chooser');
  assert.ok(await until(()=>!!p.ev('smartConn')),'and connects');assert.ok(!p.$('#smartBg'),'with no dialog');
  assert.ok(JSON.parse(store.get('cw:labCubes'))[NAME].mac===MAC,'the cube is remembered, in the lab\'s map');
  assert.deepStrictEqual(p.errs,[]);
  // A known cube: the page opens on the tab and connects with no click.
  p=await boot({store,bt});picks=0;
  assert.ok(await until(()=>!!p.ev('smartConn')),'a known cube connects by itself when the tab opens');
  assert.strictEqual(picks,0,'with no chooser');assert.ok(!p.$('#cubeWin').hidden&&p.$('#smartHome').hidden,'the live panel shows');
  // The link drops: the page looks again by itself.
  dev.gatt.disconnect();
  assert.ok(await until(()=>!p.ev('smartConn')),'the link dropped');
  assert.ok(await until(()=>!!p.ev('smartConn')),'the cube connects again by itself');
  assert.ok(!p.$('#rail button[data-tab="smart"]').classList.contains('off'),'the dot is live again');
  // On another tab: the drop reconnects too, and the page stays where it is.
  p.w.goTab('solve');dev.gatt.disconnect();
  assert.ok(await until(()=>!p.ev('smartConn')));
  assert.ok(await until(()=>!!p.ev('smartConn')),'a drop on another tab reconnects');
  assert.strictEqual(p.ev('curTab'),'solve','a cube that connects by itself does not move the page');
  // Disconnect: no look by itself.
  p.w.goTab('smart');p.click(p.$('#cubeWinOptions'));await sleep(20);p.click(p.$('#smartDisconnect'));
  await sleep(60);assert.ok(!p.ev('smartConn'),'Disconnect: the page does not connect again by itself');
  p.d.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  // The next visit to the tab looks again.
  p.w.goTab('solve');p.w.goTab('smart');
  assert.ok(await until(()=>!!p.ev('smartConn')),'back on the tab: the cube connects by itself');
  assert.deepStrictEqual(p.errs,[]);
  console.log('smart-auto chrome ok');
}
async function bridge(){
  const cube=solved(),dev=fakeDevice(4,MAC,cube,{name:NAME});
  const br=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]);
  const store=new Map([['cw:tab','"solve"']]);
  let p=await boot({store,bridge:br});
  assert.ok(p.ev('BRIDGE'),'the page found the app');
  p.w.goTab('smart');
  assert.ok(!p.$('#smartTabList').classList.contains('hidden'),'over the bridge the list comes up on the tab at once');
  assert.ok(/Looking for cubes/.test(p.$('#smartTabListNote').textContent));
  assert.ok(await until(()=>!!p.$('#smartTabListItems button')),'the cube shows in the list');
  assert.strictEqual(p.$('#smartTabListItems button').textContent,NAME);
  // Leaving the tab ends the look; coming back starts it again.
  const scans=()=>br.sockets[0].sent.filter(m=>m.op==='scan').length,stops=()=>br.sockets[0].sent.filter(m=>m.op==='stop').length;
  const s0=stops();p.w.goTab('solve');
  assert.ok(!p.ev('smartLook')&&stops()===s0+1,'leaving the tab ends the look');
  const n0=scans();p.w.goTab('smart');assert.strictEqual(scans(),n0+1,'back on the tab: the look again');
  // Cancel ends it, and the card says how to look again.
  p.click(p.$('#smartTabListCancel'));
  assert.ok(await until(()=>/Press Connect/.test(p.$('#smartTabStatus').textContent)),'Cancel: '+p.$('#smartTabStatus').textContent);
  assert.ok(p.$('#smartTabList').classList.contains('hidden'));
  // Connect: the list again; a press connects, with no dialog.
  p.click(p.$('#smartTabConnect'));
  assert.ok(await until(()=>!!p.$('#smartTabListItems button')&&p.$('#smartTabListItems button').dataset.mac),'the list again');
  p.click(p.$('#smartTabListItems button'));
  assert.ok(await until(()=>!!p.ev('smartConn')),'a press in the list connects');assert.ok(!p.$('#smartBg'),'with no dialog');
  assert.ok(p.$('#smartTabList').classList.contains('hidden'),'the list goes');
  assert.strictEqual(p.$('#cubeWin .cw-head .nm').textContent,'GAN 12 ui Maglev');
  // The link drops: the list row sits in the dimmed panel while the page looks, and the known cube is taken.
  dev.gatt.disconnect();
  assert.ok(await until(()=>!p.ev('smartConn')));
  assert.ok(p.$('#smartTabList').closest('#cubeWin'),'the look shows in the dimmed panel');
  assert.ok(await until(()=>!!p.ev('smartConn')),'the cube connects again by itself over the bridge');
  assert.deepStrictEqual(p.errs,[]);
  // The next page: the known cube is taken as soon as the scan hears it.
  const br2=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]);
  p=await boot({store,bridge:br2});p.w.goTab('smart');
  assert.ok(/Looking for GAN 12 ui Maglev/.test(p.$('#smartTabListNote').textContent),'the note names the known cube: '+p.$('#smartTabListNote').textContent);
  assert.ok(await until(()=>!!p.ev('smartConn')),'the known cube connects by itself');
  assert.ok(!p.$('#smartBg'));
  assert.deepStrictEqual(p.errs,[]);
  console.log('smart-auto bridge ok');
}
(async()=>{await chrome();await bridge();process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});
