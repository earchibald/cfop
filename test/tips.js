// Tooltips: every control carries a title; a hover shows one styled card after a short wait,
// with the hotkey after the text; the browser's own tooltip is held off while the card is up;
// a keyboard focus shows the card too; a click, Escape or a move away hides it.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mouse=(el,type,to)=>el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,relatedTarget:to||null}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  // Every control in the page shell carries a title (or a label that does).
  const bare=$$('button, select, input, [role="button"]').filter(el=>{
    if(el.closest('#tipcard'))return false;
    if(el.hasAttribute('title'))return false;
    const lab=el.closest('label');
    return !(lab&&lab.hasAttribute('title'));
  });
  assert.deepStrictEqual(bare.map(e=>e.id||e.className||e.outerHTML.slice(0,60)),[],'every control carries a title');
  // The Keys button says Hotkeys.
  assert.strictEqual($('#helpBtn').title,'Hotkeys (?)','the Keys button says Hotkeys');
  // The key badge goes after the text, once.
  assert.strictEqual(w.tipText($('#newSeed')),'A new WCA scramble: a random state, as in a competition · N','the badge key follows the text');
  assert.ok(/\(A\)\.?$/.test(w.tipText($('#animBtn'))),'a key already named is not added again');
  // A hover: the browser's tooltip is held off at once, the card comes after a wait.
  // A first visit opens the method chooser after 300 ms and focuses a card: let that pass, then close it.
  await sleep(400);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  if(d.activeElement&&d.activeElement!==d.body)d.activeElement.blur();
  const b=$('#newSeed');
  mouse(b,'mouseover');
  assert.ok(!b.hasAttribute('title')&&b.dataset.tip,'the title is held while the pointer is over the button');
  assert.ok(!w.tipsShown(),'no card before the wait');
  await sleep(450);
  const card=$('#tipcard');
  assert.ok(card&&!card.classList.contains('hidden')&&card.getAttribute('role')==='tooltip','the card shows');
  assert.strictEqual(card.textContent,'A new WCA scramble: a random state, as in a competition · N','the card carries the text and the key');
  assert.strictEqual(w.tipsShown(),b,'the card is for the button');
  // Moving onto the badge inside the button keeps the card.
  mouse(b,'mouseout',b.querySelector('.hk'));
  assert.strictEqual(w.tipsShown(),b,'a move inside the button keeps the card');
  // Moving away hides the card and gives the title back.
  mouse(b,'mouseout',d.body);
  assert.ok(!w.tipsShown()&&b.title==='A new WCA scramble: a random state, as in a competition'&&!b.dataset.tip,'the card hides and the title comes back');
  // A quick pass never shows the card.
  mouse(b,'mouseover');mouse(b,'mouseout',d.body);await sleep(450);
  assert.ok(!w.tipsShown(),'a quick pass shows nothing');
  // A click hides the card.
  mouse(b,'mouseover');await sleep(450);assert.strictEqual(w.tipsShown(),b);
  b.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true}));
  assert.ok(!w.tipsShown(),'a press hides the card');
  mouse(b,'mouseout',d.body);
  // Escape hides the card.
  mouse(b,'mouseover');await sleep(450);assert.strictEqual(w.tipsShown(),b);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.ok(!w.tipsShown(),'Escape hides the card');
  mouse(b,'mouseout',d.body);
  // A keyboard focus while the pointer rests on a control: the focused card shows, and the
  // hovered control gets its title back when the pointer leaves.
  mouse(b,'mouseover');const t=$('#themeBtn');t.focus();
  assert.strictEqual(w.tipsShown(),t,'the focused control has the card');
  await sleep(450);assert.strictEqual(w.tipsShown(),t,'the hover does not take the card over');
  mouse(b,'mouseout',d.body);t.blur();
  assert.ok(!w.tipsShown()&&b.title==='A new WCA scramble: a random state, as in a competition','the hovered control has its title back');
  // The card never holds a title for an element that is gone: the title comes back on hide.
  const g=$('#reScramble');mouse(g,'mouseover');await sleep(450);
  assert.strictEqual(w.tipsShown(),g);mouse(g,'mouseout',d.body);
  assert.strictEqual(g.title,'Make the scramble for the seed name in the box','the title is whole again');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('tips ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}});
