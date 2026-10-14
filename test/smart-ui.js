// The Smart cube dialog in the page, with a fake GAN cube (test/fake-gan.js) for navigator.bluetooth:
// connect, the MAC address from the advertisement or typed, the net, turns, My cube is solved,
// Use this cube, and a browser with no Bluetooth.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor}=require('./fake-gan');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
const MAC='AB:12:34:5C:9D:E1';
function boot(seed,bt){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});
      if(bt)Object.defineProperty(w.navigator,'bluetooth',{value:bt});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
(async()=>{try{
  // The fake cube's state, changed by the test as a hand would turn the cube.
  let dev=null;const cube={};
  const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const bt={requestDevice:async opts=>{bt.opts=opts;if(!dev)throw Object.assign(new Error('cancelled'),{name:'NotFoundError'});return dev;}};
  const {w,d,errs}=await boot({},bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};const ev=s=>w.eval(s);
  const Cube=ev('Cube');
  const netColors=()=>$$('#smartNet rect').map(r=>r.getAttribute('fill'));
  const colorsOf=c=>c.toFacelets().map(i=>w.stickerColor(i));
  assert.ok($('#smartBtn').classList.contains('three-only'),'the Smart cube button is for the 3x3');
  // ----- open, then a cancelled chooser -----
  click($('#smartBtn'));await sleep(20);
  assert.ok($('#smartBg'),'the dialog opens');
  assert.strictEqual($$('#smartNet rect').length,54,'a 3x3 net');
  assert.strictEqual(netColors().filter(c=>/sticker-X/.test(c)).length,48,'before a read, only the centers show');
  assert.ok($('#smartUse').disabled&&$('#smartRead').disabled&&$('#smartSolved').disabled);
  click($('#smartConnect'));await sleep(20);
  assert.ok(/No cube was chosen/.test($('#smartStatus').textContent),'a cancelled chooser is named');
  // ----- connect: the MAC address comes from the advertisement -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected and read: '+$('#smartStatus').textContent);
  assert.ok(bt.opts.filters.some(f=>f.namePrefix==='GAN')&&bt.opts.optionalServices.length===3,'the chooser asks for GAN cubes and their services');
  assert.strictEqual(netColors().join(),colorsOf(c1).join(),'the net shows the cube');
  assert.ok(/Check the net/.test($('#smartStatus').textContent));
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:ganMac'))['GAN12uiM_A1B2'],MAC,'the MAC address is saved by name');
  assert.ok($('#smartConnect').classList.contains('hidden')&&!$('#smartDisconnect').classList.contains('hidden'));
  assert.strictEqual($('#smartInfo').textContent,'GAN12uiM_A1B2');
  // ----- a turn: the net follows -----
  const c2=w.applyAlg(c1,['U']);set(c2);
  const mv=new Uint8Array(20);mv[0]=0x01;dev.notify(mv);
  assert.ok(await until(()=>netColors().join()===colorsOf(c2).join()),'the net follows a turn');
  // ----- My cube is solved -----
  click($('#smartSolved'));
  assert.ok(await until(()=>netColors().join()===colorsOf(new Cube()).join()),'reset shows a solved cube');
  assert.ok(dev.writes.some(m=>m[0]===0xD2),'the reset command went to the cube');
  assert.ok(/solved/.test($('#smartStatus').textContent));
  click($('#smartUse'));assert.ok($('#smartBg'),'a solved cube is not used');assert.ok(/Mix it up first/.test($('#smartStatus').textContent));
  // ----- Use this cube -----
  set(c2);dev.notify(mv);
  assert.ok(await until(()=>netColors().join()===colorsOf(c2).join()));
  click($('#smartUse'));await sleep(50);
  assert.ok(!$('#smartBg'),'the dialog closes on Use');
  assert.ok(w.applyAlg(new Cube(),w.scr.moves).equals(c2),'the loaded scramble gives the cube');
  assert.ok(/^smart-/.test(w.scr.seed),'the scramble is named after the smart cube');
  // ----- open again: the link is still there and reads at once -----
  click($('#smartBtn'));await sleep(20);
  assert.ok(await until(()=>!$('#smartUse').disabled),'a second open reads without a new connection');
  assert.ok(/Check the net/.test($('#smartStatus').textContent));
  // ----- the cube drops the link -----
  dev.gatt.disconnect();await sleep(10);
  assert.ok(/no longer connected/.test($('#smartStatus').textContent));assert.ok(!$('#smartConnect').classList.contains('hidden'));
  // ----- no watchAdvertisements: the user types the address -----
  set(c1);dev=fakeDevice(2,MAC,cube,{noWatch:true,name:'GAN-7F3C'});
  click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartMacRow').classList.contains('hidden')),'the MAC address row shows');
  $('#smartMac').value='AB:12';click($('#smartMacGo'));
  assert.ok(/six pairs/.test($('#smartStatus').textContent),'a short address is refused');
  $('#smartMac').value='11:22:33:44:55:66';click($('#smartMacGo'));
  assert.ok(await until(()=>/Check the MAC address/.test($('#smartStatus').textContent),5000),'a wrong address is named: '+$('#smartStatus').textContent);
  assert.ok(!$('#smartMacRow').classList.contains('hidden'),'and the row shows again');
  $('#smartMac').value='ab-12-34-5c-9d-e1';click($('#smartMacGo'));
  assert.ok(await until(()=>!$('#smartUse').disabled,5000),'the right address connects: '+$('#smartStatus').textContent);
  assert.strictEqual(netColors().join(),colorsOf(c1).join());
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:ganMac'))['GAN-7F3C'],MAC,'the typed address is saved');
  click($('#smartDisconnect'));assert.ok(/Disconnected/.test($('#smartStatus').textContent));assert.ok(!dev.gatt.connected,'Disconnect closes the link');
  // ----- the saved address is used next time, with no advertisement -----
  click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'the saved address connects');
  assert.ok($('#smartMacRow').classList.contains('hidden'));
  // Escape closes the dialog.
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!$('#smartBg'));
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a browser with no Bluetooth -----
  const b2=await boot({});b2.d.querySelector('#smartBtn').dispatchEvent(new b2.w.MouseEvent('click',{bubbles:true}));await sleep(20);
  assert.ok(/cannot use Bluetooth/.test(b2.d.querySelector('#smartStatus').textContent));assert.ok(b2.d.querySelector('#smartConnect').disabled);
  console.log('smart-ui ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
