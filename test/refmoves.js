// What it moves: every Reference picture marks the pieces the algorithm moves, and in the details a
// click on a part of What it moves lights that part on the picture and fades the rest.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const texts=alg=>JSON.parse(w.eval(`JSON.stringify(moveParts(${JSON.stringify(alg)}).parts.map(p=>p.text))`));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const DB=w.eval('ALG_DB'),PLL=w.eval('PLL_FULL'),F2L=w.eval('F2L_CASES');
  // The parts: a T perm swaps two corners and two edges; the dot case flips the edges it swaps.
  const T=PLL.find(p=>p.name==='T').alg;
  assert.deepStrictEqual(texts(T).map(t=>t.split(' ')[0]).sort(),['corners','edges'],'T perm: one corner swap, one edge swap');
  const dot=DB.eo.find(a=>/Dot/.test(a.name));assert.ok(texts(dot.alg).filter(t=>/^edges.*with flip/.test(t)).length===2,'dot: both edge swaps flip');
  assert.ok(texts(dot.alg).some(t=>/twists in place/.test(t)),'dot: a corner twists in place');
  // Every Reference picture carries one mark group per part, desktop and phone alike.
  const card=(sel,alg)=>{const svg=$(sel+' svg');return [svg.querySelectorAll('.mv').length,texts(alg).length];};
  for(const [k,list] of [['refOLLe',DB.eo],['refOLLc',DB.co],['refPLLc',DB.cp],['refPLLe',DB.ep]])
    list.forEach(a=>{const [m,n]=card(`#${k} .rcard[data-id="${a.id}"]`,a.alg);assert.strictEqual(m,n,`${a.name}: one mark per part`);});
  PLL.forEach(p=>{const [m,n]=card(`#refPLL tr[data-id="${p.name}"]`,p.alg);assert.strictEqual(m,n,p.name+' perm: one mark per part');});
  F2L.forEach(f=>{const [m,n]=card(`#refF2L tr[data-id="${f.n}"]`,f.alg);assert.strictEqual(m,n,'F2L '+f.n+': one mark per part');});
  // Every mark draws something: an arrow for a piece that travels, a curve or a two-way arrow in place.
  assert.strictEqual($$('#refDesktop .mv').filter(g=>!g.querySelector('path')).length,0,'no empty marks');
  // A move this step does not care about is dashed: the T perm edges in look 1, its corners in nothing.
  const tc=$(`#refPLLc .rcard[data-id="${DB.cp.find(a=>/^T/.test(a.name)).id}"] svg`);
  assert.ok([...tc.querySelectorAll('.mv')].some(g=>g.querySelector('[stroke-dasharray]')),'look 1: the edge swap is dashed');
  assert.ok([...tc.querySelectorAll('.mv')].some(g=>!g.querySelector('[stroke-dasharray]')),'look 1: the corner swap is solid');
  // The details: one button per part; a click lights that part and its stickers; a second click clears.
  click($(`#refPLL tr[data-id="T"]`));const bg=$('#modalBg'),pic=bg.querySelector('.pic svg'),btns=[...bg.querySelectorAll('.mvpart')];
  assert.deepStrictEqual(btns.map(b=>b.textContent),texts(T),'one button per part');
  click(btns[0]);assert.ok(pic.classList.contains('mv-focus'),'the picture fades');
  assert.ok(pic.querySelector('.mv[data-mv="0"]').classList.contains('on')&&!pic.querySelector('.mv[data-mv="1"]').classList.contains('on'),'only that part is lit');
  const lit=[...pic.querySelectorAll('.fc.lit')].map(e=>e.getAttribute('class').match(/\bf(\d+)/)[1]).sort();
  assert.deepStrictEqual(lit,pic.querySelector('.mv[data-mv="0"]').dataset.f.split(' ').sort(),'the stickers of its pieces are lit');
  assert.strictEqual(btns[0].getAttribute('aria-pressed'),'true','the button is pressed');
  click(btns[1]);assert.ok(pic.querySelector('.mv[data-mv="1"]').classList.contains('on')&&!btns[0].classList.contains('on'),'another part takes over');
  click(btns[1]);assert.ok(!pic.classList.contains('mv-focus')&&!pic.querySelector('.lit,.mv.on'),'a second click clears');
  assert.ok($('#modalBg'),'the details stay open');$('#modalClose').click();
  // The F2L details: the 3D picture lights the stickers too.
  click($(`#refF2L tr[data-id="${F2L[0].n}"]`));const fb=$('#modalBg');click(fb.querySelector('.mvpart'));
  assert.ok(fb.querySelector('.pic svg.mv-focus polygon.lit'),'F2L: the 3D stickers light');$('#modalClose').click();
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('refmoves: marks on every Reference picture, dashed for ignored pieces, a click lights one part ok');process.exit(0);
}catch(e){console.error('refmoves: FAIL',e.message,errs);process.exit(1);}});
