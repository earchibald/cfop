// On a phone the page boots on the Reference section, the menu opens the other sections,
// and a case window button can take you to the section that trains the case.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=q=>({matches:/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
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
  $('#modalSetup').click();assert.ok(!$('#modalBg'),'window closes');assert.strictEqual(d.body.dataset.tab,'ll','Show on cube goes to OLL · PLL');
  assert.ok(!$('#drillNote').classList.contains('hidden'),'the player shows the case as a drill');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('mobile: reference home, menu, case window to player ok');process.exit(0);
}catch(e){console.error('mobile: FAIL',e.message,errs);process.exit(1);}});
