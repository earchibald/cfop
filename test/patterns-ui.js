// The Patterns sheet (js/patterns-ui.js): on the Cross, F2L and OLL · PLL tabs only; three toggles,
// not exclusive, each tab with its own kind on by default and its own set kept; the cross of a new
// scramble and the moves it was made in; a free pair as its F2L case; the two-look case once; a read
// only once the cube is still; the covers; Clear.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const m=new Map([['cw:method','"cfop"'],['cw:stageView','false']]);
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};
    Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
// Page code runs in a script element of the page, so it sees the page's globals: X runs statements,
// V returns the value of an expression.
function X(code){const s=d.createElement('script');s.textContent=code;d.body.appendChild(s);s.remove();}
function V(expr){X('window.__v=('+expr+');');return w.__v;}

w.addEventListener('load',async()=>{try{
  await sleep(100);
  X("setMethod('cfop')");
  const on=()=>$$('#patPanel .pat-tog').filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.pat);
  const shown=()=>!$('#patPanel').classList.contains('hidden');
  const ents=()=>$$('#patList .pat-ent');
  // Each tab with its own kind on; not on Lab or Reference.
  X("goTab('cross')");assert.ok(shown(),'Cross tab');assert.deepStrictEqual(on(),['cross']);
  X("goTab('f2l')");assert.ok(shown(),'F2L tab');assert.deepStrictEqual(on(),['f2l']);
  X("goTab('ll')");assert.ok(shown(),'OLL · PLL tab');assert.deepStrictEqual(on(),['ll']);
  X("goTab('lab')");assert.ok(!shown(),'not on Lab');X("goTab('ref')");assert.ok(!shown(),'not on Reference');
  // Every control is titled.
  for(const b of $$('#patPanel button'))assert.ok(b.title,'titled: '+b.textContent);
  // The toggles are not exclusive, and each tab keeps its own set.
  X("goTab('f2l')");click($('#patPanel .pat-tog[data-pat="ll"]'));assert.deepStrictEqual(on(),['f2l','ll'],'two on');
  X("goTab('ll')");assert.deepStrictEqual(on(),['ll'],'the OLL · PLL tab keeps its own');
  X("goTab('f2l')");assert.deepStrictEqual(on(),['f2l','ll'],'kept');
  click($('#patPanel .pat-tog[data-pat="ll"]'));click($('#patPanel .pat-tog[data-pat="f2l"]'));assert.deepStrictEqual(on(),[],'all off');
  assert.deepStrictEqual(JSON.parse(m.get('cw:patOn')).f2l,{cross:false,f2l:false,ll:false},'saved');
  click($('#patPanel .pat-tog[data-pat="f2l"]'));
  // The cross: a new scramble names the cross on the bottom as held, its solutions covered.
  X("goTab('cross')");X("patClear()");X("newScramble('pat-ui-1')");
  let e=ents()[0];assert.ok(e,'an entry for the scramble');assert.strictEqual(e.querySelector('.name').textContent,'Cross first');
  assert.ok(/White cross/.test(e.querySelector('.pat-data').textContent),e.querySelector('.pat-data').textContent);
  assert.ok(e.querySelector('.pat-sols .spoil'),'the shortest crosses, covered');
  assert.strictEqual(V('PAT.goal.color'),'white');
  // The same scramble again adds nothing.
  X("goTab('f2l')");X("goTab('cross')");assert.strictEqual(ents().length,1,'once per scramble');
  // Make the cross on the player: the entry holds the moves made, plain.
  const sol=V('PAT.log[0].cross.sols[0]');
  X(`seqState.idx=seqState.moves.length;for(const x of ${JSON.stringify(sol)}.split(' '))cubePlayerTurn(x,'screen');`);
  assert.ok(V('PAT.timer'),'a read waits for the cube to be still');assert.strictEqual(ents().length,1,'not yet');
  await sleep(V('PAT_STILL')+150);
  e=ents()[0];assert.strictEqual(e.querySelector('b').textContent,'Cross');
  assert.strictEqual(e.querySelector('code').textContent,sol,'the moves made');assert.ok(!e.querySelector('.spoil'),'plain');
  const n=sol.split(' ').length;assert.strictEqual(e.querySelector('.name').textContent,n+(n===1?' move':' moves'));
  // F2L on the F2L tab: a free pair named as its case, its moves covered.
  X("goTab('f2l')");const c12=V("F2L_CASES[11]");
  X(`showCube(applyAlg(new Cube(),invertAlg(${JSON.stringify(c12.alg)})));patRead();`);
  e=ents()[0];assert.strictEqual(e.dataset.kind,'f2l');assert.strictEqual(e.querySelector('.pat-pair .cs').textContent,'Case '+c12.n);
  assert.strictEqual(e.querySelector('.pat-pair .pos').textContent,'front right');assert.ok(e.querySelector('.pat-pair .spoil'),'covered');
  X('patRead();');assert.strictEqual(ents()[0],e,'once');
  // OLL · PLL is off on the F2L tab: a last-layer case adds nothing there.
  const sune=V("ALG_DB.co.find(a=>a.name==='Sune').alg"),k=ents().length;
  X(`showCube(applyAlg(new Cube(),invertAlg(${JSON.stringify(sune)})));patRead();`);assert.strictEqual(ents().length,k,'off');
  // On the OLL · PLL tab it is named, once, with its algorithm covered; a click uncovers a move.
  X("goTab('ll')");X(`showCube(applyAlg(new Cube(),invertAlg(${JSON.stringify(sune)})));patRead();patRead();`);
  e=ents()[0];assert.strictEqual(e.querySelector('.name').textContent,'Sune');assert.strictEqual(e.querySelector('b').textContent,'OLL corners');
  assert.strictEqual(ents().length,k+1,'once');
  const sp=e.querySelector('.spoil'),hid=()=>sp.querySelectorAll('.sp-m:not(.on)').length,h0=hid();assert.ok(h0>0);
  click(sp);assert.strictEqual(hid(),h0-1,'one move uncovered');
  // A new entry goes on top and leaves the uncovered move as it is.
  X(`showCube(applyAlg(new Cube(),invertAlg(${JSON.stringify(V("ALG_DB.cp[0].alg"))})));patRead();`);
  assert.notStrictEqual(ents()[0],e);assert.strictEqual(hid(),h0-1,'still uncovered');
  // Kept in cw:patLog; Clear empties it.
  assert.ok(JSON.parse(m.get('cw:patLog')).length>=4);
  click($('#patClear'));assert.strictEqual(ents().length,0);assert.ok($('#patList .pat-none'),'the empty note');assert.deepStrictEqual(JSON.parse(m.get('cw:patLog')),[]);
  // The beginner method has no sheet.
  X("setMethod('beginner')");assert.ok(!shown(),'not in the beginner method');X("setMethod('cfop')");
  assert.deepStrictEqual(errs,[]);
  console.log('patterns-ui: the tabs, the toggles, the cross and its moves, F2L cases, OLL · PLL once, the wait, the covers, Clear ok');
  process.exit(0);
}catch(err){console.error(err);process.exit(1);}});
