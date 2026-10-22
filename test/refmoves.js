// What it moves in the case details: a list of parts in plain words, a clean picture until a part is
// chosen, then only that part's arrow and the outline of its pieces. The small Reference cards stay clean.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const texts=expr=>JSON.parse(w.eval(`JSON.stringify((${expr}).parts.map(p=>p.text))`));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const DB=w.eval('ALG_DB'),PLL=w.eval('PLL_FULL'),F2L=w.eval('F2L_CASES');
  // The parts, in plain words. Each step lists only what it cares about.
  assert.deepStrictEqual(texts(`modalForPLL(PLL_FULL.find(p=>p.name==='T'))`),['Two corners swap: front right, back right','Two edges swap: right, left'],'T perm');
  const tc=DB.cp.find(a=>/^T/.test(a.name));
  assert.deepStrictEqual(texts(`modalForLL(LL_ALL.find(a=>a.id==='${tc.id}'))`),['Two corners swap: front right, back right'],'look 1 of PLL leaves out the edges');
  const sune=DB.co.find(a=>a.name==='Sune');
  assert.deepStrictEqual(texts(`modalForLL(LL_ALL.find(a=>a.id==='${sune.id}'))`),['Three corners twist the same way: front right, back left, back right'],'Sune: the twist only');
  const dot=DB.eo.find(a=>/Dot/.test(a.name));
  assert.deepStrictEqual(texts(`modalForLL(LL_ALL.find(a=>a.id==='${dot.id}'))`),['Four edges flip: right, front, left, back'],'dot: the flips only');
  assert.deepStrictEqual(texts(`modalForF2L(F2L_CASES[0])`),['Corner goes into the slot: from top front right','Edge goes into the slot: from top right'],'F2L 1');
  // Every case has a part, and no part uses piece codes such as UFR.
  const all=[...[...DB.eo,...DB.co,...DB.cp,...DB.ep].map(a=>texts(`modalForLL(LL_ALL.find(a=>a.id==='${a.id}'))`)),
    ...PLL.map(p=>texts(`modalForPLL(PLL_FULL.find(p=>p.name==='${p.name}'))`)),...F2L.map(f=>texts(`modalForF2L(F2L_CASES.find(f=>f.n===${f.n}))`))];
  assert.ok(all.every(t=>t.length),'every case has a part');
  assert.ok(all.flat().every(t=>!/\b[UDFBRL]{2,3}\b/.test(t)),'plain words, no piece codes');
  // Every case window's setup, then its algorithm, gives a solved cube; so does every F2L case drill.
  // (A case written with a turn first is pictured before the turn.)
  assert.deepStrictEqual(JSON.parse(w.eval(`JSON.stringify((()=>{const bad=[];const check=(o,name)=>{const c=applyAlg(applyAlg(new Cube(),o.setupMoves),removeRotations(parseAlg(o.alg)));if(!c.isSolvedAny())bad.push(name);};
    for(const f of F2L_CASES){check(modalForF2L(f),'f2l'+f.n);setF2LCase(f.n);if(!applyAlg(f2lSetupCube(),f2lSolution()).isSolvedAny())bad.push('drill'+f.n);}
    for(const p of PLL_FULL)check(modalForPLL(p),'pll'+p.name);for(const a of LL_ALL)check(modalForLL(a),a.id);return bad;})())`)),[],'every setup is solved by its algorithm');
  w.eval('showScr()');
  // F2L case 2 turns the cube first: its picture shows the front-right slot, not the front-left.
  assert.deepStrictEqual(texts(`modalForF2L(F2L_CASES[1])`),['Corner goes into the slot: from top front right','Edge goes into the slot: from top front'],'F2L 2 is pictured before its turn');
  // The small cards carry no What it moves marks.
  assert.strictEqual($$('#refDesktop .mv, #refMobileCases .mv').length,0,'clean cards');
  // The details open with a clean picture: the marks are there, one per part, and none shows.
  click($(`#refPLL tr[data-id="T"]`));let bg=$('#modalBg');const pic=bg.querySelector('.pic svg'),btns=[...bg.querySelectorAll('.mvpart')];
  assert.deepStrictEqual(btns.map(b=>b.textContent),texts(`modalForPLL(PLL_FULL.find(p=>p.name==='T'))`),'one button per part');
  assert.strictEqual(pic.querySelectorAll('.mv').length,2,'one mark group per part');
  assert.ok(![...pic.querySelectorAll('.mv')].some(g=>!g.querySelector('path')),'each part draws an arrow');
  assert.ok(!pic.querySelector('.mv.on,.lit'),'nothing shows at rest');
  assert.ok(!pic.querySelector(':scope > line'),'no flow arrows in the details');
  assert.strictEqual(w.getComputedStyle(pic.querySelector('.mv')).display,'none','a mark is hidden until chosen');
  // A choice shows that part only; a second choice of the same part clears the picture.
  click(btns[0]);
  assert.ok(pic.querySelector('.mv[data-mv="0"]').classList.contains('on')&&!pic.querySelector('.mv[data-mv="1"]').classList.contains('on'),'only that part shows');
  const lit=[...pic.querySelectorAll('.fc.lit')].map(e=>e.getAttribute('class').match(/\bf(\d+)/)[1]).sort();
  assert.deepStrictEqual(lit,pic.querySelector('.mv[data-mv="0"]').dataset.f.split(' ').sort(),'its pieces get an outline');
  assert.strictEqual(btns[0].getAttribute('aria-pressed'),'true','the button is pressed');
  assert.ok(/again/.test(bg.querySelector('.mvhint').textContent),'the hint says how to clear');
  click(btns[1]);assert.ok(pic.querySelector('.mv[data-mv="1"]').classList.contains('on')&&!btns[0].classList.contains('on'),'another part takes over');
  click(btns[1]);assert.ok(!pic.querySelector('.lit,.mv.on'),'a second choice clears');
  assert.ok($('#modalBg'),'the details stay open');$('#modalClose').click();
  // OLL: the twist arcs. F2L: the 3D picture.
  click($(`#refOLLc .rcard[data-id="${sune.id}"]`));bg=$('#modalBg');click(bg.querySelector('.mvpart'));
  assert.strictEqual(bg.querySelectorAll('.pic .mv.on path[d*=" A"]').length*1>=3,true,'Sune: an arc on each twisted corner');$('#modalClose').click();
  click($(`#refF2L tr[data-id="${F2L[0].n}"]`));bg=$('#modalBg');click(bg.querySelector('.mvpart'));
  assert.ok(bg.querySelector('.pic svg polygon.lit')&&bg.querySelector('.pic .mv.on path'),'F2L: the 3D stickers and the arrow show');$('#modalClose').click();
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('refmoves: plain parts, a clean picture, one part at a time, clean cards ok');process.exit(0);
}catch(e){console.error('refmoves: FAIL',e.message,errs);process.exit(1);}});
