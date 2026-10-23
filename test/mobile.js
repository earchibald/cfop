// On a phone the page boots on the Reference section, the menu opens the other sections,
// and a case window button can take you to the section that trains the case. The case window shows the
// algorithm under the Reference spoiler rule: the first move, one more per tap, the button for the rest,
// the runs of moves in "Why it works" covered too, and the Show all moves box on the Reference page uncovers it.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=q=>({matches:/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};
    // A fake localStorage (jsdom has none for file: pages), so the Settings window can save.
    const m=new Map();Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const menuOpen=()=>!$('#menuBg').classList.contains('hidden');

w.addEventListener('load',async()=>{try{
  await sleep(100);
  assert.strictEqual(d.body.dataset.tab,'ref','boots on Reference');
  assert.ok($('#tab-ref').classList.contains('on'));
  assert.ok($$('#refMobileCases .case').length>50,'mobile reference cards are built');
  assert.ok(!menuOpen(),'menu starts closed');

  // The menu lists every section and marks the current one.
  $('#menuBtn').click();assert.ok(menuOpen(),'menu button opens the menu');
  assert.strictEqual($('#menuBtn').getAttribute('aria-expanded'),'true');
  const items=$$('#menu button');assert.strictEqual(items.length,6,'six sections');
  assert.strictEqual($('#menu button.on').dataset.tab,'ref','current section is marked');
  items.find(b=>b.dataset.tab==='f2l').click();
  assert.ok(!menuOpen(),'picking a section closes the menu');
  assert.strictEqual(d.body.dataset.tab,'f2l','section changed');assert.ok($('#tab-f2l').classList.contains('on'));
  assert.strictEqual($('#mtitle').textContent,'F2L','title shows the section');
  $('#menuBtn').click();assert.ok(menuOpen());d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.ok(!menuOpen(),'Escape closes the menu');

  // From the Reference section, Show on cube opens the section that trains the case.
  $('#menuBtn').click();$$('#menu button').find(b=>b.dataset.tab==='ref').click();assert.strictEqual(d.body.dataset.tab,'ref');
  const card=$$('#refMobileCases .case').find(c=>c.dataset.kind==='ll');click(card);assert.ok($('#modalBg'),'case window opens');
  // The algorithm is a spoiler: the first move shows, a bar covers each move after it, a tap on the line reveals one
  // move and does not close the window, the button reveals the rest, a tap on the full line covers it again.
  const alg=w.eval('LL_ALL').find(a=>a.id===card.dataset.id).alg.split(' '),sp=$('#modalBg .algbig .spoil');
  assert.ok(sp,'the window covers the algorithm');assert.strictEqual(sp.firstChild.textContent.trim(),alg[0],'the first move shows');
  assert.strictEqual(sp.querySelectorAll('.sp-m').length,alg.length-1,'one bar per move after it');
  const on=()=>sp.querySelectorAll('.sp-m.on').length,spClick=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  spClick(sp.querySelector('.sp-rest'));assert.strictEqual(on(),1,'a tap reveals one move');assert.ok($('#modalBg'),'the window stays open');
  assert.strictEqual(sp.querySelector('.sp-m.on').textContent,alg[1],'the next move shows');
  spClick(sp.querySelector('.sp-btn'));assert.ok(sp.classList.contains('open')&&on()===alg.length-1,'the button reveals the rest');assert.ok($('#modalBg'),'still open');
  spClick(sp);assert.strictEqual(on(),0,'a tap on the full line covers it again');
  // "Why it works" names runs of moves: on the phone each run is covered too, every move a bar, one per tap, and a tap
  // on a full run covers it again. A lone letter in the text is a face name and stays in clear.
  {const why=w.eval('LL_ALL').find(a=>a.id===card.dataset.id).why,runs=[...$('#modalBg .sec').parentNode.querySelectorAll('.sec .sp-prose')];
   const want=[...why.matchAll(/(?<![A-Za-z0-9'])(?:[RLUDFBMES]w?|[rludfb]|[xyz])[2']?(?: (?:[RLUDFBMES]w?|[rludfb]|[xyz])[2']?)+(?![A-Za-z0-9'])/g)].map(m=>m[0]);
   assert.ok(want.length>0,'this case names a run of moves');assert.strictEqual(runs.length,want.length,'one spoiler per run in the text');
   runs.forEach((r,i)=>{assert.strictEqual([...r.querySelectorAll('.sp-m')].map(m=>m.textContent).join(' '),want[i],'the run is under the spoiler');
     assert.strictEqual(r.querySelectorAll('.sp-m.on').length,0,'every move of the run is covered');assert.ok(!r.querySelector('.sp-btn'),'no button in the text');});
   const r=runs[0],n=r.querySelectorAll('.sp-m').length,ron=()=>r.querySelectorAll('.sp-m.on').length;
   spClick(r.querySelector('.sp-m'));assert.strictEqual(ron(),1,'a tap on a run reveals one move');assert.ok($('#modalBg'),'the window stays open');
   for(let i=1;i<n;i++)spClick(r);assert.ok(r.classList.contains('open')&&ron()===n,'one tap per move reveals the run');
   spClick(r);assert.strictEqual(ron(),0,'a tap on a full run covers it again');
   assert.strictEqual(w.eval(`spoilProse("Read it as (R U R' U) (R U2 R'). The R layer, F or f, then U'.")`).match(/class="sp-m"/g).length,7,'two runs, seven moves; lone letters stay');
   assert.ok(!/sp-m/.test(w.eval(`spoilProse("Ua and Ub, the UF edge, F2L and the U face")`)),'names with cube letters are not moves');}
  // A tap on the sheet does nothing; the strip of scrim above it, the X and the Close bar close it.
  click($('#modalBg h2'));click($('#modalBg .sec'));assert.ok($('#modalBg'),'a tap on the sheet keeps the window open');
  assert.ok($('#modalBg .dismiss'),'the phone window has a strip to close it');click($('#modalBg .dismiss'));assert.ok(!$('#modalBg'),'a tap on the strip closes it');
  click(card);assert.ok($('#modalBg'),'opens again');$('#modalCloseBar').click();assert.ok(!$('#modalBg'),'the Close bar closes it');
  // A closed case goes on to the next stage, unless the setting is off.
  {const seen=[];w.HTMLElement.prototype.scrollIntoView=function(){seen.push(this.id);};
   const g=card.closest('.mgroup').id,next=w.eval('MOBILE_NEXT')[g];
   click(card);$('#modalCloseBar').click();await sleep(100);assert.ok(seen.includes(next),'closing a case goes to the next stage');
   click($('#settingsBtn'));assert.ok($('#setRefNext').checked,'the setting is on by default');
   $('#setRefNext').checked=false;$('#setSave').click();assert.strictEqual(w.eval("store.get('refNext',true)"),false,'Save keeps the setting');
   seen.length=0;click(card);$('#modalCloseBar').click();await sleep(100);assert.ok(!seen.includes(next),'with the setting off, the page stays');
   click($('#settingsBtn'));assert.ok(!$('#setRefNext').checked,'the window shows the saved setting');
   $('#setRefNext').checked=true;$('#setCancel').click();assert.strictEqual(w.eval("store.get('refNext',true)"),false,'Cancel keeps the old setting');
   w.eval("store.set('refNext',true)");w.HTMLElement.prototype.scrollIntoView=function(){};}
  click(card);assert.ok($('#modalBg'));
  // Show all moves on the phone Reference page: one box, the setting shared with the desktop boxes, the window uncovered.
  const box=$('#refMobile .refAll');assert.ok(box&&!box.checked,'the phone Reference page has the box, off by default');
  box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(d.body.classList.contains('refall'),'all moves show');assert.ok($('#refDesktop .refAll').checked,'the desktop box follows');
  {const r=$('#modalBg .sec .sp-prose');spClick(r);assert.strictEqual(r.querySelectorAll('.sp-m.on').length,0,'with all moves shown a tap on the text does nothing');}
  box.checked=false;box.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(!d.body.classList.contains('refall'));
  $('#modalSetup').click();assert.ok(!$('#modalBg'),'window closes');assert.strictEqual(d.body.dataset.tab,'ll','Show on cube goes to OLL · PLL');
  assert.ok(!$('#drillNote').classList.contains('hidden'),'the player shows the case as a drill');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('mobile: reference home, menu, case window to player ok');process.exit(0);
}catch(e){console.error('mobile: FAIL',e.message,errs);process.exit(1);}});
