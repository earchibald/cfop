// The scramble stays the same across tabs, case drills keep it, and the OLL/PLL case cards
// have a status button and open the case window.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,what){for(let i=0;i<100;i++){if(f())return;await sleep(50);}throw new Error('timed out: '+what);}
const tab=n=>$(`#rail button[data-tab="${n}"]`).click();
const label=()=>$('#seqLabel').textContent;
const moves=()=>$$('#scramble .m').map(e=>e.textContent);
const drill=()=>!$('#drillNote').classList.contains('hidden');
const click=(el,opts)=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,...opts}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const seed=$('#seed').value;assert.ok(seed,'a seed at boot');
  const scr=moves();assert.ok(label().includes('seed '+seed),'Solve shows the scramble');

  // F2L live works on the same scramble, with the solved part dashed.
  tab('f2l');await until(()=>moves().length>scr.length,'F2L state');
  assert.ok(label().includes('seed '+seed),'F2L keeps the seed');
  assert.deepStrictEqual(moves().slice(0,scr.length),scr,'F2L starts with the scramble moves');
  assert.ok($$('#scramble .m').slice(scr.length).every(e=>e.classList.contains('rot')),'solved moves are dashed');

  // Opening OLL/PLL does not start a drill or change the scramble.
  tab('ll');assert.ok(!drill(),'no drill on tab change');assert.deepStrictEqual(moves(),scr,'OLL/PLL shows the same moves');
  assert.ok(label().includes('seed '+seed),'OLL/PLL shows the scramble');

  // Next case starts a drill. Another tab keeps it. Back to scramble ends it.
  $('#llNext').click();assert.ok(drill(),'Next case starts a drill');assert.ok(/setup for case/.test(label()));
  tab('solve');assert.ok(drill(),'tab change keeps the drill');assert.ok(/setup for case/.test(label()));
  $('#drillBack').click();assert.ok(!drill(),'Back to scramble ends the drill');
  assert.deepStrictEqual(moves().slice(0,scr.length),scr,'the scramble is back');assert.ok(label().includes('seed '+seed));

  // Case cards: no algorithm on the card, an explicit status button, a click opens the case window.
  tab('ll');const card=$('#llGroups .case');const id=card.dataset.id;
  assert.ok(!$$('#llGroups .case').some(c=>/[RUFLDB]'/.test(c.title)),'no algorithm in card titles');
  const st=()=>$(`#llGroups .case[data-id="${id}"] .stbtn`);
  assert.strictEqual(st().textContent,'unlearned');
  click(st());assert.strictEqual(st().textContent,'learning','status button cycles');assert.ok(!$('#modalBg'),'status button does not open the window');
  click($(`#llGroups .case[data-id="${id}"] svg`));assert.ok($('#modalBg'),'card click opens the case window');
  const mb=()=>$('#modalBg .stbtn');assert.strictEqual(mb().textContent,'learning','window shows the status');
  click(mb());assert.strictEqual(mb().textContent,'finished','window button cycles');assert.strictEqual(st().textContent,'finished','card follows the window');
  $('#modalClose').click();assert.ok(!$('#modalBg'));
  const sel=()=>$(`#llGroups .case[data-id="${id}"]`).classList.contains('sel');const was=sel();
  click($(`#llGroups .case[data-id="${id}"] svg`),{shiftKey:true});assert.strictEqual(sel(),!was,'shift-click toggles selection');assert.ok(!$('#modalBg'));

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('tabs: scramble persists across tabs, drills, case cards ok');process.exit(0);
}catch(e){console.error('tabs: FAIL',e.message,errs);process.exit(1);}});
