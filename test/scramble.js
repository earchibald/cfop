// Random-state scrambles (js/scramble.js): Random state is the first choice of the length menu;
// New takes a scramble from the pool and loads it with its moves; a seed name still gives repeatable
// random moves; no library means random moves; the boot scramble is replaced once, while unused.
// Then, when vendor/ holds cubing.js (npm run vendor), real 3x3 scrambles.
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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// A scramble as cubing.js writes it.
const FAKE333="F R2 U' F' R L' B D F2 B R2 B' U2 B D2 L2 B L2 F' L2 U'";
(async()=>{try{
  const {w,d,errs}=await boot({'cw:method':'"cfop"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const RS=w.RS,moves=()=>[...w.scr.moves].join(' ');
  const Cube=w.puzzleCube().constructor;
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- the menu -----
  assert.deepStrictEqual($$('#scrLen option').map(o=>o.textContent),['Random state','20','22','25']);
  assert.strictEqual($('#scrLen').value,'rs','Random state is the default');
  assert.strictEqual(w.scrLen(),22,'under Random state a random-move scramble has the middle length');
  // ----- no library: random moves -----
  for(let i=0;i<20&&RS.state==='loading';i++)await sleep(50);
  assert.notStrictEqual(RS.state,'ready','jsdom cannot load the library');
  w.newScramble();assert.strictEqual(w.scr.moves.length,22,'with no library, New gives 22 random moves');
  assert.ok($('#seed').value,'a random-move scramble shows its seed');
  // ----- a fake library: the pool -----
  const asked=[];
  RS.lib={randomScrambleForEvent:async e=>{asked.push(e);return {toString:()=>FAKE333};}};RS.state='ready';RS.want=2;RS.bootSeed=null;
  w.rsFill(3);await sleep(30);
  assert.strictEqual(RS.pool[3].length,2,'the pool fills to two');assert.deepStrictEqual(asked,['333','333']);
  w.newScramble();
  assert.strictEqual(moves(),FAKE333,'New takes a random-state scramble');
  assert.strictEqual($('#seed').value,'','no seed makes it again, so the box is empty');
  assert.strictEqual($('#seed').placeholder,w.scr.seed,'its name is the placeholder');
  const h=JSON.parse(w.localStorage.getItem('cw:history'))[0];
  assert.strictEqual(h.seed,w.scr.seed);assert.strictEqual(h.moves,FAKE333,'the history keeps its moves');
  await sleep(30);assert.strictEqual(RS.pool[3].length,2,'the pool fills again behind it');
  // A seed name: random moves, the same each time. History brings back the random-state moves.
  w.newScramble('otter');
  assert.strictEqual(w.scr.moves.length,22,'a seed name gives random moves');
  assert.strictEqual([...w.randomMoveScramble('otter',22)].join(' '),moves(),'the same seed, the same scramble');
  $$('#history .alt').find(e=>e.dataset.s===h.seed).click();
  assert.strictEqual(moves(),FAKE333,'history loads the random-state scramble again');
  // A length chosen: New gives random moves of that length.
  $('#scrLen').value='25';w.newScramble();assert.strictEqual(w.scr.moves.length,25,'25 random moves');
  assert.strictEqual(RS.pool[3].length,2,'the pool is not used');
  $('#scrLen').value='rs';
  // ----- the boot scramble -----
  w.newScramble('boot-test');RS.bootSeed=w.scr.seed;RS.t0=Date.now();RS.pool[3].length=0;
  w.rsFill(3);await sleep(30);
  assert.strictEqual(moves(),FAKE333,'an unused boot scramble gives way to a random-state one');
  assert.strictEqual(RS.bootSeed,null,'only once');
  w.newScramble('boot-test');RS.bootSeed=w.scr.seed;RS.t0=Date.now()-10000;RS.pool[3].length=0;
  w.rsFill(3);await sleep(30);
  assert.strictEqual(w.scr.seed,'boot-test','a boot scramble kept for a while stays');
  w.newScramble('boot-test');RS.bootSeed=w.scr.seed;RS.t0=Date.now();RS.pool[3].length=0;w.newScramble('in-use');
  w.rsFill(3);await sleep(30);
  assert.strictEqual(w.scr.seed,'in-use','another scramble since the boot stays');
  // ----- notation -----
  assert.strictEqual([...w.rsMoves(3,FAKE333)].join(' '),FAKE333,'the 3x3 as it comes');
  // ----- Settings -----
  $('#settingsBtn').click();assert.ok(/Random state, from cubing\.js/.test($('#setScr').textContent),'Settings names the scrambles');$('#setCancel').click();
  // ----- a failed search stops the pool -----
  RS.lib={randomScrambleForEvent:async()=>{throw new Error('no worker');}};RS.pool[3].length=0;RS.want=2;
  w.rsFill(3);await sleep(30);assert.strictEqual(RS.want,0,'a failed search stops the pool');
  w.newScramble();assert.strictEqual(w.scr.moves.length,22,'and New gives random moves');
  console.log('scramble (page): ok');

  // ----- the real library, when vendored -----
  const entry=path.join(__dirname,'..','vendor','cubing','scramble','index.js');
  if(!fs.existsSync(entry)){console.log('scramble (cubing.js): skipped, vendor/ is empty. Run: npm run vendor');process.exit(0);}
  const lib=await import(pathToFileURL(entry).href);
  (await import(pathToFileURL(path.join(entry,'..','..','search','index.js')).href)).setSearchDebug({logPerf:false,scramblePrefetchLevel:'none'});
  for(let i=0;i<3;i++){
    const text=(await lib.randomScrambleForEvent('333')).toString();
    const list=[...w.rsMoves(3,text)];
    assert.ok(list.length>=15&&list.length<=25,'333 length '+list.length);
    assert.ok(!w.applyAlg(new Cube(),list).isSolved());
  }
  console.log('scramble (cubing.js): ok');
  process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
