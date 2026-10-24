// The cube pictures of docs/cube-pictures.md: the shared net, the Color Blind Assist letters, the
// hidden faces, the PLL side view, the F2L flat diagram, Play case pictures, Save image (the
// standalone SVG) and the painter's hold. The pure parts run in a vm; the rest in the page.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/draw.js');
const count=(s,re)=>(s.match(re)||[]).length;

// The shared net: 54 cells, each face in its NET_POS place.
const cells=run(`netCells(3,{tile:10,gap:2,pad:1})`),fw=3*10+2*2+2;
assert.strictEqual(cells.length,54,'54 cells');
for(const c of cells){const [px,py]=run('NET_POS')[c.f];assert.ok(c.x>=px*fw&&c.x<(px+1)*fw&&c.y>=py*fw&&c.y<(py+1)*fw,'cell '+c.idx+' in its face');}
assert.strictEqual(run(`netCells(4,{faces:[0,2]})`).length,32,'a choice of faces');

// Letters: one per visible sticker in 3D, one per sticker on the net, none for gray.
const solved=run('new Cube().toFacelets()');
const pic=run(`renderCube3D(${JSON.stringify(solved)})`);
assert.strictEqual(count(pic,/<text class="cbl/g),27,'27 letters on the 3D view');
assert.ok(/class="cbl cb-W"[^>]*>W</.test(pic)&&/cb-G/.test(pic)&&/cb-R/.test(pic),'white, green and red letters');
assert.strictEqual(count(run(`renderNet(${JSON.stringify(solved)})`),/<text class="cbl/g),54,'54 letters on the net');
const gray=Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);
assert.strictEqual(count(run(`renderCube3D(${JSON.stringify(gray)})`),/<text class="cbl/g),3,'gray stickers have no letter');
assert.strictEqual(count(run(`renderCube3D(${JSON.stringify(solved)},{color:()=>'#000'})`),/<text/g),0,'a picture with its own colors has no letters');

// Hidden faces: the three faces the camera does not see, faded, drawn first; none when off.
const H=run(`cubePolys(${JSON.stringify(solved)},{hidden:true})`);
const hint=H.filter(p=>p.hint);
assert.strictEqual(hint.length,27,'three hidden faces of nine stickers');
assert.deepStrictEqual([...new Set(hint.map(p=>Math.floor(p.idx/9)))].sort(),[3,4,5],'the back, left and bottom');
assert.ok(H.slice(0,27).every(p=>p.hint),'drawn before the cube');
assert.ok(hint.every(p=>p.op===0.6),'a little faded');
assert.strictEqual(run(`cubePolys(${JSON.stringify(solved)},{})`).filter(p=>p.hint).length,0,'off by default');
const below=run(`cubePolys(${JSON.stringify(solved)},{hidden:true,pitch:-34})`).filter(p=>p.hint).map(p=>Math.floor(p.idx/9));
assert.ok(below.includes(0)&&!below.includes(3),'from below, the top is the hidden face');
assert.ok(/opacity="0.6"/.test(run(`renderCube3D(${JSON.stringify(solved)},{hidden:true})`)),'the SVG carries the fade');
assert.strictEqual(count(run(`renderCube3D(${JSON.stringify(solved)},{hidden:true,n:2})`),/<polygon/g)-count(run(`renderCube3D(${JSON.stringify(solved)},{n:2})`),/<polygon/g),12,'a 2×2 has four stickers a hidden face');

// The page
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};
    // A fake localStorage (jsdom has none for file: pages), so the settings save.
    const m=new Map();Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)],ev=s=>w.eval(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

w.addEventListener('load',async()=>{try{
  await sleep(100);ev("setMethod('cfop')");await sleep(50);

  // Settings: Play case pictures and Color Blind Assist, saved, and body.cba follows.
  $('#settingsBtn').click();
  assert.ok($('#setPlayPics')&&!$('#setPlayPics').checked,'Play case pictures, off by default');
  assert.ok($('#setCba')&&!$('#setCba').checked,'Color Blind Assist, off by default');
  assert.ok(/Color Blind Assist/.test($('#setArea').textContent),'the section is named');
  $('#setCba').checked=true;$('#setSave').click();
  assert.ok(d.body.classList.contains('cba'),'body.cba on save');
  assert.strictEqual(w.localStorage.getItem('cw:cba'),'true','saved in cw:cba');
  $('#settingsBtn').click();assert.ok($('#setCba').checked,'the window shows the setting');$('#setCba').checked=false;$('#setSave').click();
  assert.ok(!d.body.classList.contains('cba'),'off again');

  // Hidden faces chip on the player.
  const polys=()=>$$('#cube polygon').length;const before=polys();
  assert.strictEqual($('#hiddenBtn').getAttribute('aria-pressed'),'false','Hidden faces off');
  $('#hiddenBtn').click();
  assert.strictEqual($('#hiddenBtn').getAttribute('aria-pressed'),'true','Hidden faces on');
  assert.strictEqual(polys()-before,27,'27 more stickers on the player');
  assert.strictEqual(w.localStorage.getItem('cw:hidden'),'true','saved in cw:hidden');
  $('#viewNet').click();assert.ok($('#hiddenBtn').classList.contains('hidden'),'no chip on the net');
  $('#viewTop').click();$('#hiddenBtn').click();assert.strictEqual(polys(),before,'off again');

  // The PLL details: Top and Side. The side view has the top layer bright, the rest dim.
  ev("openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name==='T')))");
  assert.strictEqual($$('#modalBg .pvchip').map(b=>b.textContent).join(),'Top,Side','PLL views');
  const side=$('#modalBg .pv[data-v="side"]');assert.ok(side.hidden,'Side starts hidden');
  $('#modalBg .pvchip[data-v="side"]').click();assert.ok(!side.hidden&&$('#modalBg .pv[data-v="main"]').hidden,'Side shown');
  const sp=[...side.querySelectorAll('polygon[stroke]')];
  assert.ok(sp.some(p=>!p.getAttribute('opacity'))&&sp.some(p=>p.getAttribute('opacity')==='0.22'),'top layer bright, the rest dim');
  $('#modalBg .mvpart').click();assert.ok(!$('#modalBg .pv[data-v="main"]').hidden,'a What it moves part goes back to Top');
  assert.ok($('#modalSave'),'Save image in the window');
  // Save image: the standalone SVG has every color resolved and drops the marks that are not chosen.
  const out=ev(`pictureSVG(document.querySelector('#modalBg .pv[data-v="main"] svg'))`);
  assert.ok(!/var\(/.test(out),'no var( left');
  assert.ok(/^<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(out),'a standalone SVG');
  const groups=$$('#modalBg .pv[data-v="main"] .mv').length,shown=$$('#modalBg .pv[data-v="main"] .mv.on').length;
  assert.strictEqual(count(out,/class="mv/g),shown,`the ${groups-shown} marks not chosen are gone`);
  assert.strictEqual(count(out,/class="cbl/g),0,'no letters while Color Blind Assist is off');
  assert.strictEqual(ev("pictureName('T perm')"),'twistwright-t-perm.png','the file name');
  ev('closeModal()');await sleep(30);

  // The F2L details: 3D and Flat. Every case: the top and two slot faces, the pair and the centers in color.
  ev("openCaseModal(modalForF2L(F2L_CASES[0]))");
  assert.strictEqual($$('#modalBg .pvchip').map(b=>b.textContent).join(),'3D,Flat','F2L views');
  ev('closeModal()');await sleep(30);
  const flats=ev(`F2L_CASES.map(f=>{const c=caseState(f.alg);return thumbF2LFlat(c,phys(c));})`);
  flats.forEach((s,i)=>{const rects=count(s,/<rect/g),lit=rects-count(s,/fill="var\(--sticker-X\)"/g);
    assert.strictEqual(rects,27,'three faces, case '+(i+1));assert.ok(lit>=5&&lit<=8,`pair and centers in color, case ${i+1}: ${lit}`);});

  // Play case pictures: the details window opens on Play and loops; reduced motion turns it off.
  w.localStorage.setItem('cw:playPics','true');
  ev("openCaseModal(modalForLL(LL_ALL[0]))");
  assert.strictEqual($('#modalBg .pvchip').textContent,'Play','Play comes first');
  const pv=$('#modalBg .pv[data-v="play"]');assert.ok(!pv.hidden&&ev('loopRunning')(pv),'the loop runs');
  await sleep(1200);assert.ok(pv.querySelector('svg polygon'),'the loop draws the cube');
  $('#modalBg .pvchip[data-v="main"]').click();assert.ok(!ev('loopRunning')(pv),'another view stops it');
  ev('closeModal()');await sleep(30);
  // A desktop card plays under the pointer and stops when the pointer goes elsewhere.
  $('#rail button[data-tab="ll"]').click();await sleep(30);
  const card=$('#llGroups .case[data-id]');card.querySelector('svg').dispatchEvent(new w.Event('pointerover',{bubbles:true}));
  assert.ok(card.querySelector('.loopbox')&&ev('loopRunning')(card.querySelector('.loopbox')),'the card plays');
  $('#llGroups').parentNode.dispatchEvent(new w.Event('pointerover',{bubbles:true}));
  assert.ok(!ev('loopRunning')(card.querySelector('.loopbox'))&&card.querySelector('.loopbox svg'),'the still picture is back');
  w.localStorage.setItem('cw:playPics','false');
  ev("openCaseModal(modalForLL(LL_ALL[0]))");assert.ok(!$('#modalBg .pvchip[data-v="play"]'),'no Play with the setting off');ev('closeModal()');await sleep(30);

  // Letters on the top views: the main tiles carry one, gray tiles none.
  const top=ev(`thumbTop(caseCube(LL_ALL.find(a=>a.group==='PLL corners')),'pllc')`);
  assert.strictEqual(count(top,/<text class="cbl/g),9,'nine letters on a PLL top view');

  // The painter: the same layout as the net, and the hold of the solve.
  w.openPaint();
  const slots=$$('#paintNet .pt-slot').map(e=>{const m=/grid-column:(\d+);grid-row:(\d+)/.exec(e.getAttribute('style'));return m?m[1]+','+m[2]:'';});
  assert.strictEqual(JSON.stringify(slots),JSON.stringify(ev('NET_POS').map(([x,y])=>`${x+1},${y+1}`)),'the painter places faces by NET_POS');
  assert.ok(/yellow up and green in front/.test($('#paintBg p').textContent),'white cross: yellow up');
  w.closePaint();
  $('#crossColor').value='yellow';
  assert.strictEqual(ev('paintHold()'),'','yellow cross: no turn');
  w.openPaint();assert.ok(/white up and green in front/.test($('#paintBg p').textContent),'yellow cross: white up');w.closePaint();
  const c=ev('scr.cube').toFacelets();assert.strictEqual(JSON.stringify(w.heldToEngineFacelets(c)),JSON.stringify(c),'held is the engine frame then');
  $('#crossColor').value='white';
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('pictures: net, letters, hidden faces, side view, F2L flat, play, save image, painter ok');process.exit(0);
}catch(e){console.error('pictures: FAIL',e.stack||e.message,errs);process.exit(1);}});
