// Glossary: links appear in description text, never inside moves or controls; a link opens a
// card; Esc and a tap close it; a see-also link opens another entry; text rendered later is linked.
const assert=require('assert');const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};}});
const w=dom.window,d=w.document;
const key=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
const tick=()=>new Promise(r=>setTimeout(r,60));
w.addEventListener('load',()=>setTimeout(async()=>{
  assert.deepStrictEqual(errs,[]);
  const links=[...d.querySelectorAll('.gl')];
  const ids=new Set(links.map(l=>l.dataset.gl));
  console.log(`glossary: ${links.length} links, ${ids.size} terms linked`);
  for(const id of ['sexy','sledgehammer','sune','oll','pll','f2l','cfop','commutator','conjugate'])assert.ok(ids.has(id),'no link for '+id);
  assert.ok(!d.querySelector('.m .gl, .mono .gl, button .gl, label .gl, h2 .gl, .timer .gl, .tag .gl'),'link inside a skipped element');
  // "fat sexy move" links as one phrase, not as "fat" plus "sexy move".
  const fp=d.createElement('p');fp.textContent="Fat sexy move then sledgehammer: (r U R' U') (r' F R F').";d.querySelector('#tab-ref .panel').append(fp);await tick();
  const fl=[...fp.querySelectorAll('.gl')].map(l=>l.dataset.gl+':'+l.textContent);
  assert.deepStrictEqual(fl,['fat-sexy:Fat sexy move','sledgehammer:sledgehammer']);
  // Open, see also, Esc.
  const sx=links.find(l=>l.dataset.gl==='sexy');sx.click();
  let pop=d.querySelector('.gl-pop');assert.ok(pop,'card did not open');
  assert.match(pop.textContent,/Sexy move/);assert.match(pop.textContent,/R U R' U'/);
  pop.querySelector('.gl[data-gl="sledgehammer"]').click();
  pop=d.querySelector('.gl-pop');assert.match(pop.textContent,/Sledgehammer/);assert.strictEqual(d.querySelectorAll('.gl-pop').length,1);
  key('Escape');assert.ok(!d.querySelector('.gl-pop'),'Esc did not close the card');
  // A tap anywhere closes it, and the tap does not reach the page.
  sx.click();let reached=false;const t=d.getElementById('timer');t.addEventListener('click',()=>{reached=true;});
  d.querySelector('.gl-back').click();
  assert.ok(!d.querySelector('.gl-pop'),'tap did not close the card');assert.ok(!reached);
  // Esc in a dialog closes the card first, then the dialog.
  w.openEnter();await tick();
  const p=d.createElement('p');p.textContent='Do a sexy move.';d.querySelector('.modal.enter').append(p);await tick();
  const ml=d.querySelector('.modal.enter .gl');assert.ok(ml,'text added later was not linked');
  ml.click();key('Escape');assert.ok(!d.querySelector('.gl-pop'));assert.ok(d.getElementById('enterBg'),'Esc closed the dialog too');
  key('Escape');assert.ok(!d.getElementById('enterBg'));
  // The full list is in the Reference tab.
  assert.ok(d.querySelectorAll('#glossary dt').length>=35);
  assert.ok(![...d.querySelectorAll('#glossary dd')].some(dd=>dd.querySelector(`.gl[data-gl="${dd.dataset.glSelf}"]`)),'an entry links to itself');
  console.log('glossary: ok');process.exit(0);
},500));
