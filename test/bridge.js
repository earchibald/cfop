// The macOS app as a Bluetooth bridge: bridgeDevice over a fake app (test/fake-bridge.js) with
// ganOpen unchanged, then the page: the Smart cube button over the bridge, the chooser list in
// the dialog, a connect and a read, the app going away, and a Mac with no way to a cube, which
// gets the download of the app.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice}=require('./fake-gan');
const {fakeBridge,fakeNative,bridgeInfo}=require('./fake-bridge');
const MAC='AB:12:34:5C:9D:E1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
// ----- no DOM: bridgeDevice with ganOpen -----
async function pure(){
  const run=require('./vm-load')('js/engine.js','js/gan.js','js/bridge.js');
  const g=run('this');Object.assign(g,{setTimeout,clearTimeout,AbortController});
  const Cube=run('Cube'),applyAlg=run('applyAlg');
  const cube={};const c1=applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);Object.assign(cube,{cp:[...c1.cp],co:[...c1.co],ep:[...c1.ep],eo:[...c1.eo]});
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2'});
  const {FakeWebSocket,sockets}=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]);
  g.WebSocket=FakeWebSocket;
  assert.strictEqual(run('bridgeHex(new Uint8Array([0,255,16]))'),'00ff10');assert.deepStrictEqual([...run('bridgeBytes("00ff10")')],[0,255,16]);
  const link=await run('bridgeConnect')(bridgeInfo());
  assert.strictEqual(link.bluetooth,'poweredOn');
  const found=[];const stop=link.scan(d=>found.push(d));
  assert.ok(await until(()=>found.some(d=>d.mac===MAC)),'the scan names the cube with its address');stop();
  assert.ok(sockets[0].sent.some(m=>m.op==='stop'),'stop ends the scan');
  const bdev=run('bridgeDevice')(link,{id:'p1',name:'GAN12uiM_A1B2',mac:MAC});
  let gone=0;bdev.addEventListener('gattserverdisconnected',()=>gone++);
  const got=[];const conn=await run('ganOpen')(bdev,MAC,ev=>got.push(ev));
  assert.strictEqual(conn.gen,4,'the protocol comes from the services over the bridge');
  const read=await conn.readState(2000);
  assert.ok(read.equals(c1),'the state comes through the bridge');
  await conn.send('reset');assert.ok(dev.writes.some(m=>m[0]===0xD2),'a write goes through the bridge');
  await assert.rejects(run('ganOpen')(run('bridgeDevice')(link,{id:'nope',name:'x',mac:MAC}),MAC),/not in the list/,'an unknown cube is an error from the app');
  dev.gatt.disconnect();await sleep(10);
  assert.strictEqual(gone,1,'the cube going away reaches the device');assert.ok(got.some(e=>e.type==='gone'),'and ganOpen');
  console.log('bridge pure ok');
}
// ----- no DOM: the app's own window, through its message handler -----
async function pureNative(){
  const run=require('./vm-load')('js/engine.js','js/gan.js','js/bridge.js');
  const g=run('this');Object.assign(g,{setTimeout,clearTimeout,AbortController});
  assert.strictEqual(run('bridgeNative()'),null,'no message handler outside the app');
  const Cube=run('Cube'),applyAlg=run('applyAlg');
  const cube={};const c1=applyAlg(new Cube(),['R','U2',"B'"]);Object.assign(cube,{cp:[...c1.cp],co:[...c1.co],ep:[...c1.ep],eo:[...c1.eo]});
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2'});
  const nat=fakeNative([{id:'p1',gen:4,dev,mac:MAC}]);
  g.window=g;nat.install(g);g.fetch=()=>{throw new Error('the window asks no server');};
  const link=await run('bridgeStart')();
  assert.ok(link&&link.native,'the window takes the message handler');assert.strictEqual(run('BRIDGE'),link);
  assert.strictEqual(link.version,'test');assert.strictEqual(link.bluetooth,'poweredOn');
  assert.deepStrictEqual(nat.sent[0],{op:'hello'},'hello first');
  const found=[];const stop=link.scan(d=>found.push(d));
  assert.ok(await until(()=>found.some(d=>d.mac===MAC)),'the scan comes back through bridgeEvent');stop();
  const conn=await run('ganOpen')(run('bridgeDevice')(link,{id:'p1',name:'GAN12uiM_A1B2',mac:MAC}),MAC,()=>{});
  assert.ok((await conn.readState(2000)).equals(c1),'the state comes through the window bridge');
  await conn.send('reset');assert.ok(nat.sent.some(m=>m.op==='write'),'a write goes through the handler');
  console.log('bridge native ok');
}
// ----- the page -----
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(init={}){const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),
  key:i=>[...m.keys()][i]??null,get length(){return m.size;}};}
// o.bridge: a fakeBridge to install, with /bridge/info answered; o.native: a fakeNative, the app's
// own window; o.platform: navigator.platform; o.search: the query; o.storage: saved keys.
function boot(o={}){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html')+(o.search||''),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(o.storage)});
      if(o.platform!=null)Object.defineProperty(w.navigator,'platform',{value:o.platform});
      if(o.native)o.native.install(w);
      if(o.bridge){w.BRIDGE_LOCAL=true;w.WebSocket=o.bridge.FakeWebSocket;w.fetch=async u=>u==='/bridge/info'?{ok:true,json:async()=>bridgeInfo()}:{ok:false};}}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
async function page(){
  const cube={};const set=(w,c)=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const dev=fakeDevice(4,MAC,cube,{name:'GAN-7F3C'});
  const bridge=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]);
  const {w,d,errs}=await boot({bridge,platform:'MacIntel'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const Cube=w.eval('Cube');const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2']);set(w,c1);
  const netColors=()=>$$('#smartNet rect').map(r=>r.getAttribute('fill'));const colorsOf=c=>c.toFacelets().map(i=>w.stickerColor(i));
  const ev=s=>w.eval(s);assert.ok(ev('BRIDGE'),'the page found the app');assert.strictEqual(w.smartMode(),'bridge');
  assert.strictEqual($('#smartBtn').textContent,'Smart cube','over the bridge the button is Smart cube');assert.ok(!$('#smartBtn').classList.contains('dl'));
  click($('#smartBtn'));await sleep(20);
  assert.ok(/choose your cube in the list\./.test($('#smartStatus').textContent),'the dialog names the list: '+$('#smartStatus').textContent);
  assert.ok(!$('#smartConnect').disabled,'Connect is on over the bridge');
  // Connect: the list shows the cube, Cancel ends the search.
  click($('#smartConnect'));
  assert.ok(!$('#smartList').classList.contains('hidden'),'the list shows');assert.ok(/Looking for cubes/.test($('#smartListNote').textContent));
  assert.ok(await until(()=>$$('#smartListItems button').length===1),'the cube is listed');
  assert.strictEqual($('#smartListItems button').textContent,'GAN-7F3C');
  assert.ok(await until(()=>$('#smartListItems button').dataset.mac===MAC),'the address arrives');
  click($('#smartListCancel'));await sleep(10);
  assert.ok($('#smartList').classList.contains('hidden'),'Cancel hides the list');assert.ok(/No cube was chosen/.test($('#smartStatus').textContent));
  assert.ok(bridge.sockets[0].sent.filter(m=>m.op==='stop').length>=1,'Cancel stops the scan');
  // Connect again and choose the cube: it connects and reads with the address from the app.
  click($('#smartConnect'));assert.ok(await until(()=>$$('#smartListItems button').length===1&&$('#smartListItems button').dataset.mac===MAC));
  click($('#smartListItems button'));
  assert.ok(await until(()=>!$('#smartUse').disabled,3000),'connected and read over the bridge: '+$('#smartStatus').textContent);
  assert.strictEqual(netColors().join(),colorsOf(c1).join(),'the net shows the cube');
  assert.ok($('#smartList').classList.contains('hidden'));
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:ganMac'))['GAN-7F3C'],MAC,'the address from the app is saved');
  // A turn follows, and Use this cube loads it.
  const c2=w.applyAlg(c1,['U']);set(w,c2);const mv=new Uint8Array(20);mv[0]=0x01;dev.notify(mv);
  assert.ok(await until(()=>netColors().join()===colorsOf(c2).join()),'the net follows a turn over the bridge');
  click($('#smartUse'));await sleep(50);
  assert.ok(!$('#smartBg'),'the dialog closes on Use');assert.ok(w.applyAlg(new Cube(),w.scr.moves).equals(c2),'the loaded scramble gives the cube');
  // The app goes away: the link is gone and the button changes to the download.
  click($('#smartBtn'));await sleep(20);assert.ok(await until(()=>!$('#smartUse').disabled),'a second open reads at once');
  bridge.sockets[0].close();await sleep(20);
  assert.ok(/no longer connected/.test($('#smartStatus').textContent),'the cube is gone with the app: '+$('#smartStatus').textContent);
  assert.strictEqual(ev('BRIDGE'),null);assert.strictEqual($('#smartBtn').textContent,'Download macOS app to use a Smart Cube','without the app a Mac gets the download');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!$('#smartBg'));
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('bridge page ok');
}
// ----- a Mac with no Bluetooth and no app -----
async function download(){
  const {w,d,errs}=await boot({platform:'MacIntel'});
  const $=s=>d.querySelector(s);const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.strictEqual(w.smartMode(),'download');
  assert.strictEqual($('#smartBtn').textContent,'Download macOS app to use a Smart Cube');assert.ok($('#smartBtn').classList.contains('dl'),'the button is marked');
  click($('#smartBtn'));await sleep(20);
  assert.ok($('#smartBg .modal.dl'),'the download dialog opens');assert.ok(/Safari cannot use Bluetooth/.test($('#smartBg').textContent));
  assert.ok($('#smartDl')&&$('#smartOpenApp'),'download and open buttons');
  assert.ok(/releases\/latest\/download\/Twistwright-mac\.zip$/.test(w.eval('MAC_APP_URL')),'the download is the latest release');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!$('#smartBg'),'Escape closes it');
  // An iPad says Mac too, but has touch: no download for it.
  Object.defineProperty(w.navigator,'maxTouchPoints',{value:5});assert.strictEqual(w.smartMode(),'none');
  assert.deepStrictEqual(errs,[]);
  // Any other computer: the plain dialog, as before.
  const b=await boot({platform:'Win32'});assert.strictEqual(b.w.smartMode(),'none');assert.strictEqual(b.d.querySelector('#smartBtn').textContent,'Smart cube');
  // ?smart=1 from twistwright://smart opens the dialog and lands on the 3x3.
  const c=await boot({platform:'MacIntel',search:'?smart=1'});c.w.localStorage.setItem('cw:method','"mini"');
  await sleep(50);assert.ok(c.d.querySelector('#smartBg'),'?smart=1 opens the dialog'); // jsdom keeps the query on a file: page; a browser drops it
  console.log('bridge download ok');
}
// ----- the page in the app's own window -----
async function pageNative(){
  const cube={cp:[0,1,2,3,4,5,6,7],co:[0,0,0,0,0,0,0,0],ep:[0,1,2,3,4,5,6,7,8,9,10,11],eo:[0,0,0,0,0,0,0,0,0,0,0,0]};
  const dev=fakeDevice(4,MAC,cube,{name:'GAN-7F3C'});
  const nat=fakeNative([{id:'p1',gen:4,dev,mac:MAC}]);
  const {w,d,errs}=await boot({native:nat,platform:'MacIntel'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  assert.deepStrictEqual(nat.sent[0],{op:'hello'},'the page in the window says hello to the message handler');
  assert.strictEqual(w.smartMode(),'bridge');assert.strictEqual($('#smartBtn').textContent,'Smart cube','no download in the app');
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>$$('#smartListItems button').length===1&&$('#smartListItems button').dataset.mac===MAC),'the list shows the cube');
  click($('#smartListItems button'));
  assert.ok(await until(()=>!$('#smartUse').disabled,3000),'connected and read in the window: '+$('#smartStatus').textContent);
  assert.ok(nat.sent.some(m=>m.op==='connect')&&nat.sent.some(m=>m.op==='notify'),'connect and notify go through the handler');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.deepStrictEqual(errs,[],'no script errors');
  // The app answers hello late, as at launch (boot waits 400 ms; hello takes 1500). The page is
  // in the app all the same: no download, the plain dialog with Connect on, and Connect my cube
  // (smartConnectNow) lists the cube once the app answers.
  const dev2=fakeDevice(4,MAC,cube,{name:'GAN-7F3C'});
  const late=fakeNative([{id:'p1',gen:4,dev:dev2,mac:MAC}],{helloDelay:1500});
  const b=await boot({native:late,platform:'MacIntel'});
  const $b=s=>b.d.querySelector(s);
  assert.ok(!late.sent.some(m=>m.op==='scan'),'nothing past hello yet');
  assert.strictEqual(b.w.smartMode(),'bridge','in the app before hello');assert.ok(b.w.ganAvailable());
  assert.strictEqual($b('#smartBtn').textContent,'Smart cube','no download button in the app');
  b.w.openSmartDownload();
  assert.ok($b('#smartBg')&&!$b('#smartBg .modal.dl'),'the download dialog never opens in the app');
  assert.ok(!$b('#smartConnect').disabled,'Connect is on before hello');
  assert.ok(!/cannot use Bluetooth/.test($b('#smartStatus').textContent),$b('#smartStatus').textContent);
  b.w.closeSmart();
  b.w.smartConnectNow();
  assert.ok($b('#smartBg')&&/Choose your cube in the list\./.test($b('#smartStatus').textContent),'Connect my cube: the dialog says to choose: '+$b('#smartStatus').textContent);
  assert.ok(await until(()=>!$b('#smartList').classList.contains('hidden'),3000),'the list comes up when the app answers');
  assert.ok(await until(()=>!!$b('#smartListItems button')&&$b('#smartListItems button').dataset.mac===MAC,3000),'the cube is listed once the app answers');
  $b('#smartListItems button').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));
  assert.ok(await until(()=>!$b('#smartUse').disabled,3000),'connected: '+$b('#smartStatus').textContent);
  assert.deepStrictEqual(b.errs,[],'no script errors');
  console.log('bridge window ok');
}
// ----- Bring History from Safari: the Safari page with ?migrate=1 -----
async function migrate(){
  const saved={'cw:method':'"cfop"','cw:times':'[1,2,3]','other':'x'};
  const bridge=fakeBridge([]);
  const a=await boot({bridge,platform:'MacIntel',search:'?migrate=1',storage:saved});
  const note=b=>b.d.querySelector('#migrateNote');
  assert.ok(await until(()=>note(a)),'a note shows');
  const sent=bridge.sockets[0].sent.filter(m=>m.op==='migrate');
  assert.strictEqual(sent.length,1,'the page sends the history once');assert.strictEqual(typeof sent[0].seq,'number');
  assert.strictEqual(sent[0].data['cw:times'],'[1,2,3]','the saved keys go as they are');assert.ok(!('other' in sent[0].data),'only cw: keys');
  const n=Object.keys(sent[0].data).length;
  assert.strictEqual(note(a).querySelector('span').textContent,`Your history is in the Twistwright app now: ${n} saved items. You can close this tab.`);
  assert.strictEqual(a.w.localStorage.getItem('cw:times'),'[1,2,3]','Safari keeps its copy');
  assert.ok(note(a).querySelector('button').title,'the Close button has a tooltip');
  note(a).querySelector('button').dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));assert.ok(!note(a),'Close removes the note');
  assert.deepStrictEqual(a.errs,[]);
  // The user says no in the app.
  const b=await boot({bridge:fakeBridge([],{migrate:'cancel'}),platform:'MacIntel',search:'?migrate=1',storage:saved});
  assert.ok(await until(()=>note(b)));
  assert.strictEqual(note(b).querySelector('span').textContent,'The app did not take the history. Nothing changed.');
  // No app: the note says how to start again.
  const c=await boot({platform:'MacIntel',search:'?migrate=1',storage:saved});
  assert.ok(await until(()=>note(c)));assert.ok(/did not answer/.test(note(c).textContent));
  // A page with no ?migrate=1 sends nothing.
  const e=fakeBridge([]);await boot({bridge:e,platform:'MacIntel',storage:saved});
  assert.ok(!e.sockets[0].sent.some(m=>m.op==='migrate'),'no move without the query');
  console.log('bridge migrate ok');
}
(async()=>{try{await pure();await pureNative();await page();await download();await pageNative();await migrate();process.exit(0);}catch(e){console.error(e);process.exit(1);}})();
