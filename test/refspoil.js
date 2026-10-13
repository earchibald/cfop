// Reference spoilers: each algorithm shows its first move and covers the rest. A click on the line
// reveals it and a second click covers it again, without opening the case details. "Show all moves"
// uncovers every line on the three Reference tabs and is saved.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const shown=s=>s.firstChild.textContent.trim();

w.addEventListener('load',async()=>{try{
  await sleep(100);
  // An OLL card: the first move shows, the rest is covered, the button counts the rest.
  const card=$('#refOLLe .rcard'),sp=card.querySelector('.spoil'),alg=w.eval('ALG_DB').eo.find(a=>a.id===card.dataset.id).alg.split(' ');
  assert.strictEqual(shown(sp),alg[0],'the first move shows');
  assert.strictEqual(sp.querySelector('.sp-rest').textContent,alg.slice(1).join(' '),'the rest is under the spoiler');
  assert.strictEqual(sp.querySelector('.sp-btn').textContent,`Reveal ${alg.length-1} more moves`,'the button counts the moves');
  // The button reveals, a click on the line covers again; neither opens the details.
  click(sp.querySelector('.sp-btn'));assert.ok(sp.classList.contains('open'),'the button reveals');assert.ok(!$('#modalBg'),'no details');
  click(sp);assert.ok(!sp.classList.contains('open'),'a second click covers it');assert.ok(!$('#modalBg'),'still no details');
  click(sp.querySelector('.sp-rest'));assert.ok(sp.classList.contains('open'),'a click on the spoiler reveals');click(sp);
  click(card.querySelector('.nm'));assert.ok($('#modalBg'),'the rest of the card opens the details');$('#modalClose').click();
  // A lead rotation is a hold: the turn after it shows too.
  const f=w.eval('F2L_CASES').find(c=>/^y /.test(c.alg)),row=$(`#refF2L tr[data-id="${f.n}"] .spoil`);
  assert.strictEqual(shown(row),f.alg.split(' ').slice(0,2).join(' '),'y and the first turn show');
  // Every algorithm on the CFOP page has a spoiler.
  assert.strictEqual($$('#refDesktop .rcard .alg, #refDesktop .ref-alg').filter(e=>!e.querySelector('.spoil')).length,0,'every algorithm is covered');
  // Show all moves: every line uncovered, open lines reset, one setting for all tabs.
  click(sp.querySelector('.sp-btn'));const box=$('#tab-ref .refAll');assert.ok(box&&!box.checked,'the checkbox is off by default');
  box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(d.body.classList.contains('refall'),'all moves show');assert.ok(!sp.classList.contains('open'),'open lines reset');
  click(sp);assert.ok($('#modalBg'),'with all moves shown, a click on the line opens the details');$('#modalClose').click();
  // The 2x2 and 4x4 Reference tabs share the checkbox and cover their algorithms.
  for(const m of ['speed2','speed4']){w.setMethod(m);const t=m==='speed2'?'#tab-sref':'#tab-fref';
    assert.ok($(t+' .refAll').checked,m+': the checkbox follows the setting');
    assert.ok($$(t+' .alg, '+t+' .ref-alg').length>0&&$$(t+' .alg, '+t+' .ref-alg').every(e=>e.querySelector('.spoil')),m+': every algorithm is covered');}
  const b4=$('#tab-fref .refAll');b4.checked=false;b4.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(!d.body.classList.contains('refall')&&!$('#tab-ref .refAll').checked&&!$('#tab-sref .refAll').checked,'one checkbox turns them all off');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('refspoil: first move shows, spoilers reveal and cover, show all moves ok');process.exit(0);
}catch(e){console.error('refspoil: FAIL',e.message,errs);process.exit(1);}});
