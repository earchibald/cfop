// The phone stage (js/phone.js): on a phone in CFOP the page carries body.mst, the switch under the
// cube shows one of three sheets (the section, Moves · Timer, More), a move to the player shows the
// player's sheet, a section change goes back to the section's sheet, and the "..." button shows the
// rest of the cube's chips. The rail's buttons are the section bar. The beginner method and a
// computer have no phone stage.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function boot(phone,seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:phone?/max-width: ?760/.test(q):/min-width/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};
      const m=new Map(Object.entries(seed||{}));Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),150)));
}
const CFOP={'cw:method':'"cfop"','cw:level':'4','cw:cubeSrc':'"screen"'};
(async()=>{try{
  // A phone in CFOP.
  {const {w,d,errs}=await boot(true,CFOP);const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
   const pressed=()=>$$('#phSeg button').filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.sheet).join();
   assert.ok(d.body.classList.contains('mst'),'the phone stage is on');
   assert.strictEqual(d.body.dataset.tab,'ref','the phone starts on Reference');assert.strictEqual(d.body.dataset.cube,'none','with no cube there');
   // The rail is the section bar: a press on a button goes to the section.
   const rail=t=>$(`nav#rail button[data-tab="${t}"]`);
   rail('cross').click();assert.strictEqual(d.body.dataset.tab,'cross','the bar opens Cross');assert.ok(rail('cross').classList.contains('on'),'and lights its button');
   assert.strictEqual(d.body.dataset.cube,'side');
   // The switch: three sheets, the section first and named for it.
   const seg=$$('#phSeg button');assert.deepStrictEqual(seg.map(b=>b.dataset.sheet),['sec','play','more'],'three sheets');
   assert.strictEqual(seg[0].textContent,'Cross','the first is named for the section');assert.ok(seg.every(b=>b.title),'each has a title');
   assert.strictEqual(d.body.dataset.msheet,'sec','the section shows first');assert.strictEqual(pressed(),'sec');
   seg[1].click();assert.strictEqual(d.body.dataset.msheet,'play','Moves · Timer');assert.strictEqual(pressed(),'play');
   seg[2].click();assert.strictEqual(d.body.dataset.msheet,'more','More');assert.strictEqual(pressed(),'more');
   // Another section starts on its own sheet, and the switch takes its name.
   rail('f2l').click();assert.strictEqual(d.body.dataset.msheet,'sec','a new section shows itself');assert.strictEqual($('#phSeg button').textContent,'F2L');
   rail('ll').click();assert.strictEqual($('#phSeg button').textContent,'OLL · PLL');
   // Moves sent to the player show the player's sheet.
   w.focusPlayer();assert.strictEqual(d.body.dataset.msheet,'play','the player comes into view');
   // The "..." button shows and hides the rest of the cube's chips.
   const box=$('#cube').closest('.cubebox'),o=$('#phOpts');assert.ok(o&&o.title&&box.contains(o),'the button is on the cube box');
   assert.ok(!box.classList.contains('phopen'));o.click();assert.ok(box.classList.contains('phopen'),'open');assert.strictEqual(o.getAttribute('aria-expanded'),'true');
   o.click();assert.ok(!box.classList.contains('phopen'),'and put away');
   o.click();rail('cross').click();assert.ok(!box.classList.contains('phopen'),'a section change puts them away');
   // Reference has no cube: the sheets do not apply there (CSS asks for data-cube="side").
   rail('ref').click();assert.strictEqual(d.body.dataset.cube,'none');
   // The beginner method has no phone stage; CFOP gets it back.
   w.setMethod('beginner');assert.ok(!d.body.classList.contains('mst'),'none for the beginner method');assert.strictEqual(d.body.dataset.msheet,undefined);
   w.setMethod('cfop');assert.ok(d.body.classList.contains('mst'),'back in CFOP');
   // The F2L guide's line says tap, not the arrow keys.
   rail('f2l').click();await new Promise(r=>setTimeout(r,300));
   assert.ok(!/Right arrow/.test($('#tab-f2l').textContent),'no arrow keys on a phone');
   assert.deepStrictEqual(errs,[],'no script errors');w.close();}
  // A computer: no phone stage.
  {const {w,d,errs}=await boot(false,CFOP);
   assert.ok(!d.body.classList.contains('mst'),'no phone stage on a computer');assert.strictEqual(d.body.dataset.msheet,undefined);assert.ok(!d.querySelector('#phSeg'),'and no switch');
   assert.deepStrictEqual(errs,[],'no script errors');w.close();}
  console.log('phone: the phone stage, the section bar, the sheets, the chips ok');process.exit(0);
}catch(e){console.error('phone: FAIL',e.message);process.exit(1);}})();
