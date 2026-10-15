// The cube tab in the top bar (js/cubetab.js), with a fake GAN cube (test/fake-gan.js): the tab
// appears on connect with the cube's name, the first-time callout waits for the dialog to close,
// the window shows a live cube that turns the layer for each turn (turns queue, up to four moves
// between two states, further away snaps), the picture turns with the cube's tilt (Follow my cube,
// Reset view), the head drags the window, Close (Esc) collapses it, a dropped link dims the tab,
// Disconnect removes it.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor,gyroMsg}=require('./fake-gan');
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
  let dev=null;const cube={};
  const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const bt={requestDevice:async()=>{if(!dev)throw Object.assign(new Error('cancelled'),{name:'NotFoundError'});return dev;}};
  const {w,d,errs}=await boot({},bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const esc=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  const ev=s=>w.eval(s),Cube=ev('Cube');
  const winColors=()=>$$('#cubeWinSvg polygon').map(p=>p.getAttribute('fill'));
  const picOf=c=>[...new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),{yaw:-32,pitch:28,n:3})+'</svg>','text/html').querySelectorAll('polygon')].map(p=>p.getAttribute('fill'));
  // ----- names -----
  assert.strictEqual(w.smartNiceName('GAN12uiM_A1B2'),'GAN 12 ui Maglev');
  assert.strictEqual(w.smartNiceName('GAN14ui_7F3C'),'GAN 14 ui');
  assert.strictEqual(w.smartNiceName('GAN356i3_AB12'),'GAN 356 i3');
  assert.strictEqual(w.smartNiceName('GAN356iC_AB12'),'GAN 356 i Carry');
  assert.strictEqual(w.smartNiceName('GAN356iCarry2_AB12'),'GAN 356 i Carry 2');
  assert.strictEqual(w.smartNiceName('MG_AB12'),'MG');
  assert.strictEqual(w.smartNiceName(''),'GAN cube');
  // ----- before a cube: no tab -----
  assert.ok(!$('#cubeTab'),'no tab before a cube connects');
  // ----- connect: the tab appears in the top bar; the callout waits for the dialog -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  const tab=$('#cubeTab');assert.ok(tab,'the tab is there');
  assert.ok(tab.closest('header.top'),'in the top bar');
  assert.strictEqual(tab.querySelector('.nm').textContent,'GAN 12 ui Maglev','named after the cube');
  assert.ok(!tab.classList.contains('off'));assert.strictEqual(tab.getAttribute('aria-expanded'),'false');
  assert.ok(!$('#cubeSpot'),'the callout waits while the dialog is open');
  assert.strictEqual(w.localStorage.getItem('cw:cubeTip'),null);
  esc();assert.ok(!$('#smartBg'),'Esc closes the dialog');
  const spot=$('#cubeSpot');assert.ok(spot,'the page dims once the dialog is closed');
  assert.strictEqual(spot.querySelectorAll('.sh').length,4,'four shades around the tab');
  assert.strictEqual(spot.querySelector('.callout').textContent,'Click your smart cube to open the Smart Cube interface!');
  assert.strictEqual(w.localStorage.getItem('cw:cubeTip'),'1','seen once');
  assert.ok($('#cubeTab'),'the tab itself is not under a shade');
  click(spot.querySelector('.sh'));assert.ok(!$('#cubeSpot'),'a click on the shade ends it');
  // ----- the tab opens the window with the live cube -----
  click($('#cubeTab'));
  assert.ok($('#cubeWin'),'the window opens');assert.strictEqual($('#cubeTab').getAttribute('aria-expanded'),'true');
  assert.strictEqual($('#cubeWin .nm').textContent,'GAN 12 ui Maglev');
  assert.ok(/Esc/.test($('#cubeWinClose').textContent),'Close (Esc)');
  assert.ok(await until(()=>winColors().join()===picOf(c1).join()),'the window shows the cube');
  assert.ok(/Live/.test($('#cubeWinNote').textContent));
  assert.ok($('#cubeWinAgain').classList.contains('hidden'));
  await sleep(30);assert.strictEqual(d.activeElement,$('#cubeWinClose'),'Close has the focus');
  // ----- a turn: the layer turns, then the picture is the new cube -----
  const c2=w.applyAlg(c1,['U']);set(c2);
  const mv=new Uint8Array(20);mv[0]=0x01;dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='U',500),'the U layer turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c2).join(),1500),'the picture ends on the new cube');
  // Two turns between two states: both layers turn, one after the other.
  const c3=w.applyAlg(c2,['R','F']);set(c3);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='R',500),'the R layer turns first');
  assert.strictEqual(ev('cubeTab.queue').join(),'F','F waits in the queue');
  assert.ok(ev('cubeTab.target').equals(c3),'the target is the real cube');
  // A state that lands during a turn joins the queue; the running turn is not cut.
  const c4=w.applyAlg(c3,["U'"]);set(c4);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.queue').length===2,300),'the new turn joins the queue: '+JSON.stringify(ev('cubeTab.queue')));
  assert.strictEqual(ev('cubeTab.anim.move'),'R','the R turn goes on');
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='F',800),'then F');
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==="U'",800),"then U'");
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c4).join(),1500),'the picture ends on the real cube');
  // Four moves still turn; five snap.
  const Cube_=w.Cube;const c5=w.applyAlg(c4,['R','U',"R'","U'"]);set(c5);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim'),500),'four moves turn');
  assert.strictEqual(ev('cubeTab.queue').length+1,4,'four turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c5).join(),2500),'ends on the cube after four');
  const c6=w.applyAlg(c5,['R','U','F','D','L']);set(c6);dev.notify(mv);
  assert.ok(await until(()=>winColors().join()===picOf(c6).join(),500),'five turns show at once');
  assert.ok(!ev('cubeTab.anim')&&!ev('cubeTab.queue').length);
  // Turns speed up as the queue grows.
  assert.strictEqual(w.cubeTabDur('R',0),260);assert.strictEqual(w.cubeTabDur('R2',0),360);
  assert.ok(w.cubeTabDur('R',1)<w.cubeTabDur('R',0)&&w.cubeTabDur('R',3)<w.cubeTabDur('R',1)&&w.cubeTabDur('R',9)>=90);
  // ----- the picture turns with the cube -----
  // Stickers as their center and color, matched within a pixel: a turned body lists the corners of
  // a sticker from another start, and a center can round either way.
  const polysOf=svg=>[...svg.querySelectorAll('polygon')].map(p=>{const q=p.getAttribute('points').split(' ').map(v=>v.split(',').map(Number));return {x:q.reduce((a,v)=>a+v[0],0)/q.length,y:q.reduce((a,v)=>a+v[1],0)/q.length,fill:p.getAttribute('fill')};});
  const same=(A,B)=>{if(A.length!==B.length)return false;const used=new Set();for(const a of A){const i=B.findIndex((b,j)=>!used.has(j)&&b.fill===a.fill&&Math.hypot(a.x-b.x,a.y-b.y)<0.3);if(i<0)return false;used.add(i);}return true;};
  const winPolys=()=>polysOf($('#cubeWinSvg'));
  const held=(c,o)=>polysOf(new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),Object.assign({yaw:-24,pitch:18,n:3},o))+'</svg>','text/html'));
  const fixed=c=>polysOf(new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),{yaw:-32,pitch:28,n:3})+'</svg>','text/html'));
  assert.ok($('#cubeWinView').classList.contains('hidden'),'no tilt controls before the cube reports its tilt');
  assert.ok(same(winPolys(),fixed(c6)),'the fixed view until then');
  dev.notify(gyroMsg(4,{w:1,x:0,y:0,z:0}));await sleep(20);
  assert.ok(!$('#cubeWinView').classList.contains('hidden'),'the controls show once the tilt arrives');
  assert.strictEqual($('#cubeWinFollow').getAttribute('aria-pressed'),'true','Follow my cube is on');
  assert.ok(/turns with your cube/.test($('#cubeWinNote').textContent));
  assert.ok(same(winPolys(),held(c6)),'the first reading is white up, green front, from the held camera');
  // The cube turns half way round about its own z (up): the picture turns, then rests on y2.
  dev.notify(gyroMsg(4,{w:0,x:0,y:0,z:1}));
  assert.ok(await until(()=>w.quatAngle(ev('cubeTab.q'),[0,0,0,1])>1,500),'the picture starts to turn');
  const mid=w.quatAngle(ev('cubeTab.q'),[0,0,0,1]);assert.ok(mid>1&&mid<179,'part way round: '+mid);
  assert.ok(await until(()=>!ev('cubeTab.qraf'),1500),'then it rests');
  assert.ok(same(winPolys(),held(c6,{rot:w.quatMat([0,1,0,0])})),'the picture is the cube turned half round');
  assert.ok(same(winPolys(),held(w.applyAlg(c6,['y2']))),'the back is in front');
  // A turn of a layer while the cube is held turned: the picture turns the layer from that view.
  const c7=w.applyAlg(c6,['R']);set(c7);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='R',500),'the R layer turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&same(winPolys(),held(w.applyAlg(c7,['y2']))),1500),'and lands on the new cube, still turned round');
  // Reset view: the cube is white up, green front as it is held now.
  click($('#cubeWinHome'));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),held(c7)),1500),'Reset view lines the picture up');
  // From there, the cube turns a quarter turn like the move y. It reports the turn the other
  // way round (a quarter turn back about its z, on top of the half turn): the picture is the cube after y.
  const s=Math.SQRT1_2;dev.notify(gyroMsg(4,{w:s,x:0,y:0,z:-s}));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),held(w.applyAlg(c7,['y']))),1500),'a quarter turn of the cube is a quarter turn of the picture');
  // Follow my cube off: the fixed view. On again: the held view. The choice is kept.
  click($('#cubeWinFollow'));
  assert.strictEqual($('#cubeWinFollow').getAttribute('aria-pressed'),'false');
  assert.ok(same(winPolys(),fixed(c7)),'off: the fixed view');
  assert.strictEqual(w.localStorage.getItem('cw:cubeFollow'),'false','the choice is kept');
  assert.ok($('#cubeWinHome').disabled,'Reset view waits for Follow');
  esc();click($('#cubeTab'));assert.strictEqual($('#cubeWinFollow').getAttribute('aria-pressed'),'false','still off after a reopen');
  click($('#cubeWinFollow'));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),held(w.applyAlg(c7,['y']))),1500),'on again: the held view');
  // Back to white up, green front for the rest: the reading Reset view took as the frame.
  dev.notify(gyroMsg(4,{w:0,x:0,y:0,z:1}));assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),held(c7)),1500));
  // ----- the head drags the window -----
  const win=$('#cubeWin'),head=win.querySelector('.cw-head');
  assert.ok(/Drag/.test(head.title),'the head says it drags');
  const PE=w.PointerEvent||w.MouseEvent;
  const pe=(type,x,y,target)=>target.dispatchEvent(new PE(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
  Object.defineProperty(w,'innerWidth',{value:1200,configurable:true});Object.defineProperty(w,'innerHeight',{value:800,configurable:true});
  win.getBoundingClientRect=()=>({left:860,top:70,width:320,height:400,right:1180,bottom:470});
  pe('pointerdown',900,80,head);assert.ok(win.classList.contains('drag'),'a press on the head starts the drag');
  pe('pointermove',600,300,head);
  assert.strictEqual(win.style.left,'560px','the window follows the pointer');assert.strictEqual(win.style.top,'290px');assert.strictEqual(win.style.right,'auto');
  pe('pointermove',-500,2000,head);
  assert.strictEqual(win.style.left,'8px','kept on the screen on the left');assert.strictEqual(win.style.top,'752px','the head stays in view at the bottom');
  pe('pointermove',600,300,head);pe('pointerup',600,300,head);
  assert.ok(!win.classList.contains('drag'));
  assert.deepStrictEqual(JSON.parse(w.localStorage.getItem('cw:cubeWin')),{x:560,y:290},'the place is kept');
  pe('pointermove',100,100,head);assert.strictEqual(win.style.left,'560px','no drag after the release');
  // A press on Close is not a drag.
  pe('pointerdown',1100,80,$('#cubeWinClose'));assert.ok(!win.classList.contains('drag'));
  // Reopened, the window is where it was left.
  esc();click($('#cubeTab'));assert.strictEqual($('#cubeWin').style.left,'560px','the place survives a close');assert.strictEqual($('#cubeWin').style.top,'290px');
  // ----- Esc collapses the window back into the tab -----
  esc();assert.ok(!$('#cubeWin'),'Esc closes the window');assert.ok($('#cubeTab'),'the tab stays');
  assert.strictEqual($('#cubeTab').getAttribute('aria-expanded'),'false');assert.strictEqual(d.activeElement,$('#cubeTab'),'the tab has the focus');
  // A modal takes Esc first.
  click($('#cubeTab'));click($('#smartBtn'));await sleep(20);assert.ok($('#smartBg')&&$('#cubeWin'));
  esc();assert.ok(!$('#smartBg')&&$('#cubeWin'),'Esc closes the dialog, not the window');
  assert.ok(!$('#cubeSpot'),'no second callout');
  click($('#cubeWinClose'));assert.ok(!$('#cubeWin'),'the Close button closes');
  // ----- the link drops: the tab dims, the window offers the way back -----
  dev.gatt.disconnect();await sleep(10);
  assert.ok($('#cubeTab').classList.contains('off'),'a dropped link dims the tab');
  assert.ok(ev('cubeTab.gyro'),'the tilt frame stays while the link is down');
  click($('#cubeTab'));assert.ok(/no longer connected/.test($('#cubeWinNote').textContent));
  assert.ok(!$('#cubeWinAgain').classList.contains('hidden'),'Connect again shows');
  click($('#cubeWinConnect'));assert.ok($('#smartBg')&&!$('#cubeWin'),'Connect again opens the dialog');
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartConnect'));assert.ok(await until(()=>!$('#smartUse').disabled),'connected again');
  assert.ok(!$('#cubeTab').classList.contains('off'),'the tab is live again');
  esc();assert.ok(!$('#cubeSpot'),'the callout shows only once');
  // ----- Disconnect removes the tab -----
  click($('#cubeTab'));assert.ok($('#cubeWin'));
  click($('#smartBtn'));await sleep(20);click($('#smartDisconnect'));
  assert.ok(!$('#cubeTab'),'Disconnect removes the tab');assert.ok(!$('#cubeWin'),'and the window');
  assert.ok(!ev('cubeTab.gyro')&&!ev('cubeTab.basis'),'Disconnect forgets the tilt frame');
  esc();
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a browser that has seen the callout -----
  const b2=await boot({'cw:cubeTip':'1'},bt);const d2=b2.d,w2=b2.w;
  set(c1);dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN356iC_0001'});
  const click2=el=>el.dispatchEvent(new w2.MouseEvent('click',{bubbles:true}));
  click2(d2.querySelector('#smartBtn'));await sleep(20);click2(d2.querySelector('#smartConnect'));
  assert.ok(await until(()=>!d2.querySelector('#smartUse').disabled));
  assert.strictEqual(d2.querySelector('#cubeTab .nm').textContent,'GAN 356 i Carry');
  d2.dispatchEvent(new w2.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.ok(!d2.querySelector('#cubeSpot'),'no callout the second time');
  console.log('cubetab ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
