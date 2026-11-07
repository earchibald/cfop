// Fullscreen (js/app.js, #fullBtn): a chip on the cube fills the screen with the cube through the
// browser's fullscreen on the page, with body.fullcube while it is on. Checks: the chip hides where
// the browser has no fullscreen; with one, a click asks for the page, the change puts body.fullcube
// on and flips the chip's label, icon and title, the chip again leaves, a change with no element
// (Esc) takes the class off, F toggles it and a letter typed in a field does not, the Keys card
// lists F; in the stage view the chip is in the action bar after Save image, for the beginner
// method it is on the cube box. A fake Fullscreen API stands in: jsdom has none.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size;},_m:m};}
function open(seed,{wide=true,full=true}={}){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const calls=[];let fe=null;
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:/min-width/.test(q)?wide:/max-width/.test(q)?!wide:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};
      Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});
      if(full){const d=w.document;Object.defineProperty(d,'fullscreenEnabled',{get:()=>true,configurable:true});Object.defineProperty(d,'fullscreenElement',{get:()=>fe,configurable:true});
        w.Element.prototype.requestFullscreen=function(){calls.push('in');fe=this;return Promise.resolve();};
        d.exitFullscreen=function(){calls.push('out');fe=null;return Promise.resolve();};}}});
  const api={calls,get el(){return fe;},set el(v){fe=v;}};
  return new Promise(res=>dom.window.addEventListener('load',()=>setTimeout(()=>res({w:dom.window,d:dom.window.document,errs,api}),100)));}
(async()=>{try{
  const base={'cw:method':'"cfop"','cw:level':'4','cw:cubeSrc':'"mine"'};
  // No Fullscreen API (jsdom as it is, an iPhone): the chip hides, titled still.
  {const {w,d,errs}=await open(base,{full:false});assert.deepStrictEqual(errs,[],'no script errors without the API');
    const b=d.querySelector('#fullBtn');assert.ok(b&&b.classList.contains('hidden'),'no fullscreen: the chip hides');assert.ok(b.title,'titled still');
    assert.ok(!d.body.classList.contains('fullcube'));w.close();}
  const {w,d,errs,api}=await open(base);const $=s=>d.querySelector(s);
  const change=()=>d.dispatchEvent(new w.Event('fullscreenchange'));
  const key=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  assert.deepStrictEqual(errs,[],'no script errors');
  const b=$('#fullBtn');assert.ok(b&&!b.classList.contains('hidden'),'the chip shows');
  assert.ok(d.body.classList.contains('sv')&&b.closest('#svActs'),'the stage view: the chip is in the action bar');
  assert.strictEqual(b.previousElementSibling.id,'saveImgBtn','after Save image');
  assert.strictEqual(b.getAttribute('aria-pressed'),'false');assert.match(b.textContent,/^Fullscreen/);assert.match(b.title,/^Fill the screen with the cube.*\(F\)$/);
  assert.strictEqual(b.querySelector('.hk').textContent,'F','the key badge');
  b.click();assert.deepStrictEqual(api.calls,['in'],'a click asks the browser for fullscreen');
  assert.strictEqual(api.el,d.documentElement,'the page, not the cube box alone: windows and the clock still show');
  assert.ok(!d.body.classList.contains('fullcube'),'nothing until the browser answers');
  change();assert.ok(d.body.classList.contains('fullcube'),'the change: body.fullcube');
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','the chip is pressed');assert.match(b.textContent,/^Exit fullscreen/,'the label says Exit');assert.match(b.title,/^Leave fullscreen/);
  const icon=b.querySelector('svg').innerHTML;
  b.click();assert.deepStrictEqual(api.calls,['in','out'],'the chip again leaves');change();
  assert.ok(!d.body.classList.contains('fullcube'),'the class goes');assert.strictEqual(b.getAttribute('aria-pressed'),'false');assert.match(b.textContent,/^Fullscreen/);
  assert.notStrictEqual(b.querySelector('svg').innerHTML,icon,'the icon flips back');
  // Esc: the browser leaves by itself; the change takes the class off.
  key('f');assert.deepStrictEqual(api.calls,['in','out','in'],'F asks for fullscreen');change();assert.ok(d.body.classList.contains('fullcube'),'F: on');
  api.el=null;change();assert.ok(!d.body.classList.contains('fullcube'),'Esc: the page comes back');assert.strictEqual(b.getAttribute('aria-pressed'),'false');
  key('F');assert.strictEqual(api.calls.length,4,'F again asks again');change();assert.ok(d.body.classList.contains('fullcube'));
  key('F');assert.strictEqual(api.calls[4],'out','F leaves');change();assert.ok(!d.body.classList.contains('fullcube'));
  // A letter typed in a field is no key.
  const inp=$('#seed');inp.focus();key('f');assert.strictEqual(api.calls.length,5,'a letter in a field is no key');inp.blur();
  // The Keys card lists F.
  assert.match(w.helpHTML(),/kbd">F<\/span>[^]*?fullscreen on or off/,'the Keys card lists F');
  // Another fullscreen (not the chip's) is not the cube's.
  api.el=$('#cube');change();assert.ok(!d.body.classList.contains('fullcube'),'a fullscreen the chip did not ask for is not the cube fullscreen');assert.strictEqual(b.getAttribute('aria-pressed'),'false');api.el=null;change();
  w.close();
  // The beginner method: no stage; the chip is on the cube box, and works the same.
  {const {w,d,errs,api}=await open({'cw:method':'"beginner"','cw:level':'1','cw:btab':'"learn"'});assert.deepStrictEqual(errs,[]);
    const b=d.querySelector('#fullBtn');assert.ok(!d.body.classList.contains('sv'),'no stage for the beginner method');
    assert.ok(b&&b.parentElement.classList.contains('cubebox'),'the chip is on the cube box');assert.ok(!b.classList.contains('hidden'));
    b.click();assert.deepStrictEqual(api.calls,['in']);d.dispatchEvent(new w.Event('fullscreenchange'));assert.ok(d.body.classList.contains('fullcube'),'fullscreen for the beginner method');
    w.close();}
  console.log('fullscreen: ok');
}catch(e){console.error(e);process.exit(1);}})();
