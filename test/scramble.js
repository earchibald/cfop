// WCA scrambles (js/wca.js): New gives a random state made from a seed name; the same seed gives the
// same scramble; the moves make the state from solved; no length menu; history loads a seed again.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {pathToFileURL}=require('url');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.console.info=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
(async()=>{try{
  const {w,d,errs}=await boot({'cw:method':'"cfop"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const moves=()=>[...w.scr.moves].join(' ');
  const Cube=w.puzzleCube().constructor;
  assert.deepStrictEqual(errs,[],'no script errors');
  assert.ok(!$('#scrLen'),'no length menu');
  assert.strictEqual(typeof w.RS,'undefined','no random-state pool');
  // ----- a seed -----
  w.newScramble('otter');const a=moves();
  assert.ok(w.scr.moves.length>=2&&w.scr.moves.length<=22,'at most 22 moves: '+w.scr.moves.length);
  assert.ok(w.applyAlg(new Cube(),w.scr.moves).equals(w.wcaState('otter')),'the moves make the state of the seed');
  assert.strictEqual($('#seed').value,'otter','the seed shows in the box');
  w.newScramble('heron');assert.notStrictEqual(moves(),a,'another seed, another scramble');
  w.WCA.cache.clear();w.newScramble('otter');assert.strictEqual(moves(),a,'the same seed, the same scramble');
  assert.ok(/^[URFDLB]['2]?$/.test(w.scr.moves[0])&&w.scr.moves.every(m=>/^[URFDLB]['2]?$/.test(m)),'face moves only');
  assert.ok(w.scr.moves.every((m,i)=>!i||m[0]!==w.scr.moves[i-1][0]),'no face twice in a row');
  // ----- New, and the history -----
  w.newScramble();const seed=w.scr.seed;assert.ok(/^[a-z]+-[a-z]+-\d+$/.test(seed),'New names a seed: '+seed);
  assert.ok(w.applyAlg(new Cube(),w.scr.moves).equals(w.wcaState(seed)),'New is a WCA scramble of its seed');
  const b=moves();w.newScramble('x');
  const h=$$('#history .alt').find(e=>e.dataset.s===seed);assert.ok(h,'the seed is in the history');h.click();
  assert.strictEqual(moves(),b,'the history loads the same scramble');
  // ----- many seeds: legal, never solved, quick -----
  const t0=Date.now();for(let i=0;i<40;i++){const m=w.wcaScramble('t'+i);assert.ok(m.length>=2&&m.length<=22);assert.ok(!w.applyAlg(new Cube(),m).isSolved());}
  console.log('scramble: 40 WCA scrambles in',Date.now()-t0,'ms');
  console.log('scramble (page): ok');
  process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
