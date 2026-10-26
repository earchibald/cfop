// ?onboard plays a first visit: the method chooser opens even with a saved method, the strip at the
// foot of the page shows, and nothing in localStorage is read or changed. Without ?onboard the saved
// method holds and there is no strip.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(query,seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const ls=fakeStorage(seed);
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html')+query,virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:ls});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs,ls}),400)));
}
const SEED={'cw:method':'"beginner"','cw:btab':'"blearn"','cw:animate':'false'};
(async()=>{try{
  // ----- with ?onboard -----
  let {w,d,errs,ls}=await boot('?onboard',SEED);
  const before=JSON.stringify([...ls.map]);
  const $=s=>d.querySelector(s);
  assert.deepStrictEqual(errs,[],'no script errors');
  assert.ok(!$('#methodPop').classList.contains('hidden'),'the method chooser opens as on a first visit');
  assert.strictEqual(d.body.dataset.method,'cfop','the saved method is not read');
  assert.ok(d.body.classList.contains('onboard'),'the body is marked');
  const bar=$('#onboardBar');assert.ok(bar,'the first-visit strip shows');
  assert.ok(/First visit/.test(bar.textContent)&&/nothing is saved/.test(bar.textContent));
  for(const id of ['onboardAgain','onboardLeave'])assert.ok($('#'+id).title,id+' carries a title');
  $('#methodPop .mcard[data-method="mini"]').click();
  assert.strictEqual(d.body.dataset.method,'mini','a card still switches the method');
  assert.strictEqual($('#puzzleName').textContent,'2×2 ·','the chip follows the choice');
  assert.strictEqual(JSON.stringify([...ls.map]),before,'localStorage is not changed');

  // ----- without ?onboard -----
  ({w,d,errs,ls}=await boot('',SEED));
  assert.deepStrictEqual(errs,[],'no script errors');
  assert.ok(d.querySelector('#methodPop').classList.contains('hidden'),'a returning visitor sees no chooser');
  assert.strictEqual(d.body.dataset.method,'beginner','the saved method holds');
  assert.ok(!d.querySelector('#onboardBar'),'no strip');

  console.log('onboard: ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
