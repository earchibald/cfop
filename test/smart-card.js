// The reference card (js/smart-card.js): opened on a Listen catalog entry, it carries the group, the
// name and Close (Esc) in its head, the picture with its views as chips (Top, Side and Play for a PLL
// case; Top and Play for an OLL case; 3D, Flat and Play for an F2L case) and Save image, the algorithm
// covered and uncovered one move per second (a click on the line uncovers one at once), Recognize, and
// Details, which opens the full window. Reveal, hide, play and stop by command. The next case takes
// the card's place. The head drags it; the grip zooms it (the font size and the width follow); the
// place and the zoom are kept in cw:smartCard and clamped to the screen. Esc closes it; a modal takes
// Esc first.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage({})});}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
const esc=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
const ev=s=>new w.Function('return ('+s+')')(),run=s=>new w.Function(s)();
w.addEventListener('load',async()=>{try{
  await sleep(300);
  const cat=w.listenCatalog(),by=(k,id)=>cat.find(c=>c.kind===k&&String(c.id)===String(id));
  const tperm=by('ll','pll-T'),sune=by('ll','co-sune'),ja=by('pll','Ja'),f12=by('f2l',12);
  assert.ok(tperm&&sune&&ja&&f12,'the catalog entries');
  run('SMART_CARD.ms=60');
  const card=()=>$('#smartCard'),chips=()=>$$('#smartCard .pvchip').map(b=>b.textContent),shownView=()=>$$('#smartCard .pic .pv').find(p=>!p.hidden).dataset.v;
  const onCount=()=>$$('#smartCard .algbig .sp-m.on').length,allCount=()=>$$('#smartCard .algbig .sp-m').length;
  Object.defineProperty(w,'innerWidth',{value:1024,configurable:true});Object.defineProperty(w,'innerHeight',{value:768,configurable:true});
  // ----- open: the head, the views, the covered moves -----
  assert.ok(!card()&&!w.smartCardOpenNow(),'no card at first');
  assert.ok(w.smartCardOpen(tperm),'the card opens on T perm');
  assert.ok(card()&&w.smartCardOpenNow()&&card().getAttribute('role')==='dialog');
  assert.strictEqual(card().getAttribute('aria-label'),'Reference card: T perm');
  assert.strictEqual($('#smartCard .sc-head .nm').textContent,'T perm','the name in the head');
  assert.ok(/PLL/.test($('#smartCard .sc-head .tag').textContent),'the group as a tag: '+$('#smartCard .sc-head .tag').textContent);
  assert.ok(/Esc/.test($('#smartCard .sc-close').textContent)&&/Esc/.test($('#smartCard .sc-close').title),'Close (Esc)');
  assert.ok(/Drag/.test($('#smartCard .sc-head').title),'the head says it drags');
  assert.deepStrictEqual(chips(),['Top','Side','Play'],'a PLL case: Top, Side and Play');
  assert.strictEqual(shownView(),'main','the window opens on the picture');
  assert.ok($('#smartCard .pic .pv[data-v="main"] svg'),'a picture');
  assert.ok($('#smartCard .sc-save')&&/Save/.test($('#smartCard .sc-save').title),'Save image');
  assert.ok(/^Recognize/.test($('#smartCard .sc-rec').textContent)&&$('#smartCard .sc-rec').textContent.length>20,'the Recognize line');
  for(const b of $$('#smartCard button'))assert.ok(b.title,'every button titled: '+b.outerHTML.slice(0,60));
  const spoil=$('#smartCard .algbig .spoil');assert.ok(spoil,'the algorithm is covered');
  assert.strictEqual(allCount(),tperm.alg.trim().split(/\s+/).length-1,'every move after the first is covered');
  assert.strictEqual(onCount(),0,'all covered at open');
  assert.ok(await until(()=>onCount()===1,400),'one move uncovers after a moment');
  assert.ok(await until(()=>onCount()===2,400),'then the next');
  // A click on the line uncovers one at once (app.js), and the timer goes on.
  click(spoil);assert.strictEqual(onCount(),3,'a click uncovers the next move');
  // ----- the commands -----
  assert.strictEqual(w.smartCardMoves('reveal'),'All moves shown.');assert.strictEqual(onCount(),allCount(),'reveal uncovers every move');
  await sleep(150);assert.strictEqual(onCount(),allCount(),'and the reveal has stopped');
  assert.match(w.smartCardMoves('hide'),/^Moves hidden\./);assert.strictEqual(onCount(),0,'hide covers them all');
  await sleep(150);assert.strictEqual(onCount(),0,'and no timer uncovers them');
  click(spoil);assert.strictEqual(onCount(),1,'a click still uncovers the next move');
  assert.match(w.smartCardPlay(true),/^Playing/);assert.strictEqual(shownView(),'play','play shows the Play view');
  const pv=$('#smartCard .pic .pv[data-v="play"]');assert.ok(w.loopRunning(pv),'the loop runs');assert.ok(pv.querySelector('svg'),'on a small cube');
  assert.strictEqual($('#smartCard .pvchip[data-v="play"]').getAttribute('aria-pressed'),'true','the Play chip is pressed');
  assert.strictEqual(w.smartCardPlay(false),'Stopped.');assert.strictEqual(shownView(),'main','stop goes back to the picture');assert.ok(!w.loopRunning(pv),'the loop stopped');
  assert.strictEqual(w.smartCardPlay(false),'Nothing is playing.');
  // The chips switch the views too.
  click($('#smartCard .pvchip[data-v="side"]'));assert.strictEqual(shownView(),'side');assert.ok($('#smartCard .pic .pv[data-v="side"] svg'),'the side picture');
  click($('#smartCard .pvchip[data-v="play"]'));assert.ok(w.loopRunning(pv),'the Play chip plays');
  click($('#smartCard .pvchip[data-v="main"]'));assert.ok(!w.loopRunning(pv),'another chip stops the loop');
  // ----- the next case takes the card's place -----
  const el1=card();
  w.smartCardOpen(sune);assert.strictEqual(card(),el1,'the same card');
  assert.strictEqual($('#smartCard .sc-head .nm').textContent,'Sune');assert.deepStrictEqual(chips(),['Top','Play'],'an OLL case: Top and Play');
  assert.strictEqual(onCount(),0,'the new case starts covered');assert.strictEqual(ev('SMART_CARD.entry'),sune);
  w.smartCardOpen(f12);assert.strictEqual($('#smartCard .sc-head .nm').textContent,'F2L case #12');assert.deepStrictEqual(chips(),['3D','Flat','Play'],'an F2L case: 3D, Flat and Play');
  w.smartCardOpen(ja);assert.strictEqual($('#smartCard .sc-head .nm').textContent,'Ja perm');assert.deepStrictEqual(chips(),['Top','Side','Play']);
  // ----- the place: the bottom right corner the first time, kept on the screen -----
  assert.strictEqual(card().style.left,'676px','at the right edge: the width from the left');assert.strictEqual(card().style.top,'720px','at the bottom (no height here: the head stays in view)');
  assert.strictEqual(card().style.width,'340px');assert.strictEqual(parseFloat(card().style.fontSize),13,'zoom 1');
  // ----- drag the head -----
  const PE=w.PointerEvent||w.MouseEvent;
  const pe=(type,x,y,target)=>target.dispatchEvent(new PE(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
  let rect={left:676,top:68,width:340,height:500,right:1016,bottom:568};card().getBoundingClientRect=()=>rect;
  pe('pointerdown',700,80,$('#smartCard .sc-head .nm'));assert.ok(card().classList.contains('drag'),'a press on the head starts the drag');
  pe('pointermove',400,300,card());assert.strictEqual(card().style.left,'376px','the card follows the pointer');assert.strictEqual(card().style.top,'288px');
  pe('pointermove',-500,2000,card());assert.strictEqual(card().style.left,'8px','kept on the screen');assert.strictEqual(card().style.top,'720px','the head stays in view');
  pe('pointermove',400,300,card());pe('pointerup',400,300,card());
  assert.ok(!card().classList.contains('drag'));assert.deepStrictEqual(JSON.parse(w.localStorage.getItem('cw:smartCard')),{x:376,y:288,z:1},'the place is kept');
  pe('pointermove',100,100,card());assert.strictEqual(card().style.left,'376px','no drag after the release');
  pe('pointerdown',1000,80,$('#smartCard .sc-close'));assert.ok(!card().classList.contains('drag'),'a press on Close is not a drag');
  // ----- zoom by the grip: the font size and the width follow, so everything inside scales -----
  rect={left:376,top:288,width:340,height:500,right:716,bottom:788};
  const grip=$('#smartCard .sc-grip');assert.ok(grip&&/zoom/i.test(grip.title),'the grip says it zooms');
  pe('pointerdown',710,780,grip);assert.ok(card().classList.contains('zoom'),'a press on the grip starts the zoom');
  pe('pointermove',376+510,288+200,card());
  assert.strictEqual(card().style.width,'510px','the width follows the pointer');assert.strictEqual(parseFloat(card().style.fontSize),19.5,'and the font size with it');
  assert.strictEqual(ev('SMART_CARD.z'),1.5);
  pe('pointermove',376+100,288+100,card());assert.strictEqual(ev('SMART_CARD.z'),0.7,'no smaller than 0.7');assert.strictEqual(card().style.width,'238px');
  pe('pointermove',376+1500,288+100,card());assert.strictEqual(ev('SMART_CARD.z'),2.6,'no larger than 2.6');assert.strictEqual(card().style.width,'884px');
  assert.strictEqual(card().style.left,'132px','a wide card moves left to stay on the screen');
  pe('pointermove',132+680,288+100,card());assert.strictEqual(ev('SMART_CARD.z'),2,'the height counts too: 100 of 500 is less than 680 of 340');
  pe('pointerup',132+680,288+100,card());assert.ok(!card().classList.contains('zoom'));
  assert.deepStrictEqual(JSON.parse(w.localStorage.getItem('cw:smartCard')),{x:132,y:288,z:2},'the zoom is kept');
  // A narrow window: the zoom is capped so the card fits.
  Object.defineProperty(w,'innerWidth',{value:500,configurable:true});w.dispatchEvent(new w.Event('resize'));
  assert.strictEqual(card().style.width,'484px','no wider than the screen');assert.strictEqual(card().style.left,'8px');
  Object.defineProperty(w,'innerWidth',{value:1024,configurable:true});w.dispatchEvent(new w.Event('resize'));
  assert.strictEqual(card().style.width,'484px','a wider screen does not zoom it back up');
  // ----- Details opens the full window; a modal takes Esc first; Esc closes the card -----
  click($('#smartCard .sc-details'));assert.ok($('#modalBg'),'Details opens the details window');
  assert.strictEqual($('#modalBg h2').textContent,'Ja perm');assert.ok($('#modalBg .algbig.spoiled'),'with the algorithm covered');
  esc();assert.ok(!$('#modalBg')&&card(),'Esc closes the window, not the card');
  esc();assert.ok(!card()&&!w.smartCardOpenNow(),'Esc closes the card');
  assert.ok(!ev('SMART_CARD.entry'),'and forgets the case');
  // Opened again: where it was, at its zoom.
  w.smartCardOpen(tperm);assert.strictEqual(card().style.left,'8px','where the narrow window left it');assert.strictEqual(card().style.top,'288px');assert.strictEqual(card().style.width,'484px');
  assert.strictEqual(parseFloat(card().style.fontSize),+((484/340)*13).toFixed(2));
  click($('#smartCard .sc-close'));assert.ok(!card(),'Close closes the card');
  // Playing when the card closes: the loop stops with it.
  w.smartCardOpen(sune);w.smartCardPlay(true);const pv2=$('#smartCard .pic .pv[data-v="play"]');assert.ok(w.loopRunning(pv2));
  w.smartCardClose();assert.ok(!w.loopRunning(pv2),'the loop stops with the card');
  assert.strictEqual(w.smartCardMoves('reveal'),'Say a case name first, then "reveal moves".');
  assert.strictEqual(w.smartCardPlay(true),'Say a case name first, then "play".');
  assert.strictEqual(w.smartCardOpen({kind:'ll',id:'no-such'}),null,'no card for an entry that is no case');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('smart-card ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}});
