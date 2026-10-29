// Your moves (js/live.js): the hold row turns the player's picture and renames the virtual cube's
// keys; a smart cube that connects away from the page's cube brings the ask (Use my cube, Skip,
// Don't ask again); in step, its turns go on the player; the Cross tab's Check my plan follows
// the moves made, and moves typed there go on the player.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};
    // A fake localStorage (jsdom has none for file: pages), so the settings save.
    const m=new Map([['cw:method','"cfop"']]);Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,what){for(let i=0;i<200;i++){if(f())return;await sleep(50);}throw new Error('timed out: '+what);}
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const ev=(name,detail)=>d.dispatchEvent(new w.CustomEvent(name,{detail}));
const keyCode=(code,shift)=>d.dispatchEvent(new w.KeyboardEvent('keydown',{code,key:code.slice(-1).toLowerCase(),shiftKey:!!shift,bubbles:true}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const E=s=>w.eval(s);
  E("setMethod('cfop')");
  // The hold row: six tiles; the player's own hold lights its colors.
  assert.strictEqual($$('#viewHold .ht').length,6,'two tops, four fronts');
  E("newScramble('live-1')");E("goTab('solve')");
  const on=()=>$$('#viewHold .ht[aria-pressed="true"]').map(b=>b.parentNode.dataset.place+b.dataset.c);
  assert.deepStrictEqual(on(),['up3','front2'],'yellow on top, green in front: the scramble, then z2 to the grip');
  // White on top: the picture turns, the list stays, and a key names the face as the picture shows it.
  const n0=E('seqState.moves.length');
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  assert.deepStrictEqual(on(),['up0','front2'],'white on top, green stays in front');
  assert.strictEqual(E('seqState.moves.length'),n0,'no turn on the list');
  assert.strictEqual(E("playerKeyMove('U')"),'D',"U as shown is the player's D");
  assert.strictEqual(E("playerKeyMove(\"R'\")"),"L'","R as shown is the player's L");
  assert.strictEqual(E("playerKeyMove('F')"),'F','the front stays');
  // A press of the tile that is on: the player's own hold again.
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  assert.strictEqual(E('PLAYER.hold'),null,'back to the player hold');assert.strictEqual(E("playerKeyMove('U')"),'U');
  // Net toggles.
  click($('#viewNet'));assert.strictEqual(E('view.mode'),'net');click($('#viewNet'));assert.strictEqual(E('view.mode'),'3d');

  // A smart cube connects at a cube that is not the scramble: the ask.
  E("cubeTab.conn={send:()=>Promise.resolve()}");
  const real=E("applyAlg(new Cube(),parseAlg(\"R U F' D2 L B R2 U'\"))");
  w.__real=real;E('cubeTab.target=window.__real');
  ev('cw:smartmoves',{moves:null,from:null,to:real});
  assert.ok($('#liveAskBg'),'the ask shows');
  assert.ok($('#liveNote')&&!$('#liveNote').hidden,'the note under the moves');
  // Skip with Don't ask again: no ask next time; the setting is off.
  $('#liveAskNo').checked=true;click($('#liveAskSkip'));assert.ok(!$('#liveAskBg'),'closed');
  assert.strictEqual(E("store.get('smartAsk',true)"),false,"Don't ask again turns the ask off");
  E("LIVE.asked=false");ev('cw:smartmoves',{moves:null,from:null,to:real});assert.ok(!$('#liveAskBg'),'no ask while it is off');
  E("store.set('smartAsk',true);LIVE.asked=false");ev('cw:smartmoves',{moves:null,from:null,to:real});assert.ok($('#liveAskBg'),'the ask again once on');
  // Use my cube: the scramble is the cube; the note goes.
  click($('#liveAskUse'));
  await until(()=>/^smart-/.test(E('scr.seed')),'the scramble from the cube');
  assert.ok(E('liveInStep(cubeTab.target)'),'the player shows the cube in your hands');
  assert.ok($('#liveNote').hidden,'no note in step');

  // In step, a turn of the cube goes on the player, named as the player holds the cube.
  E("goTab('cross')");await until(()=>E('crossState.sol'),'the cross solver');
  assert.strictEqual(E('liveInStep(cubeTab.target)'),true,'the cross tab shows the same cube, turned to the grip');
  const before=E('seqState.moves.length');
  const turn=m=>{const from=E('cubeTab.target'),to=E(`applyAlg(cubeTab.target,["${m}"])`);w.__to=to;E('cubeTab.target=window.__to');ev('cw:smartmoves',{moves:[m],from,to});};
  turn('U'); // the cube's own U: the white face. Held white down (z2), it is D.
  assert.strictEqual(E('seqState.moves.length'),before+1,'one move on the player');
  assert.strictEqual(E('seqState.moves[seqState.moves.length-1]'),'D','the white face, held down, is D');
  assert.strictEqual($('#crossTry').value,'D','Check my plan follows');
  turn("R");assert.strictEqual($('#crossTry').value,'D L','R of the cube is L held upside down');
  turn("R'");assert.strictEqual($('#crossTry').value,'D','a move and its undo come off');
  assert.ok($('#crossTryOut').textContent.length>0,'the check runs');
  // A turn while out of step: nothing on the player, the note shows.
  E("cubeTab.target=applyAlg(new Cube(),['L','B'])");const n1=E('seqState.moves.length');
  ev('cw:smartmoves',{moves:['B'],from:E("applyAlg(new Cube(),['L'])"),to:E('cubeTab.target')});
  assert.strictEqual(E('seqState.moves.length'),n1,'out of step: no move');assert.ok(!$('#liveNote').hidden,'the note');
  E('cubeTab.conn=null;cubeTab.target=null');ev('cw:smart',{type:'disconnect'});assert.ok($('#liveNote').hidden,'no note with no cube');

  // The virtual cube: a key goes on the player and on Check my plan.
  E("setCubeSrc('screen')");E("newScramble('live-2')");E("goTab('cross')");await sleep(50);
  assert.strictEqual($('#crossTry').value,'','a new scramble: an empty plan');
  keyCode('KeyD');assert.strictEqual(E('seqState.moves[seqState.moves.length-1]'),'R','D is R');
  assert.strictEqual($('#crossTry').value,'R','Check my plan follows the keys');
  keyCode('KeyD',true);assert.strictEqual($('#crossTry').value,'','R then R’: nothing left');
  // Typed moves go on the player.
  const inp=$('#crossTry');inp.value="F2 D' R";inp.dispatchEvent(new w.Event('input',{bubbles:true}));
  await until(()=>/^your cross plan/.test(E('seqState.label')),'the typed plan on the player');
  assert.deepStrictEqual([...E('seqState.moves')],['F2',"D'",'R'],'the typed moves');
  assert.strictEqual(inp.value,"F2 D' R",'the typed text stays');
  // Then a key adds to the typed plan.
  keyCode('KeyW');assert.strictEqual(inp.value,"F2 D' R U",'a key adds to the typed plan');
  E("setCubeSrc('mine')");

  // The Virtual cube chip and the Keys window.
  assert.ok(!$('#vcubeWin')||$('#vcubeWin').hidden,'no window for a regular cube');
  click($('#vcubeBtn'));assert.strictEqual(E('cubeSrc()'),'screen','the chip turns the virtual cube on');
  assert.strictEqual($('#vcubeBtn').getAttribute('aria-pressed'),'true');const win=$('#vcubeWin');assert.ok(win&&!win.hidden,'the window floats');
  assert.deepStrictEqual($$('#vcubeWin .vk-face').map(b=>b.dataset.f+b.querySelector('.vk-key').textContent),['UW','BE','LA','FS','RD','DX'],'the buttons sit as the keys do');
  E("newScramble('live-3')");E("goTab('cross')");await sleep(50);
  click($('#vcubeWin .vk-face[data-f="F"]'));assert.strictEqual($('#crossTry').value,'F','a press turns the face');
  click($('#vcubeWin .vk-prime'));click($('#vcubeWin .vk-face[data-f="F"]'));assert.strictEqual($('#crossTry').value,'','counterclockwise undoes it');
  assert.strictEqual($('#vcubeWin .vk-face[data-f="R"] b').textContent,"R'",'the buttons say which way');click($('#vcubeWin .vk-prime'));
  // The keypad only: the letter keys keep their shortcuts.
  click($('#vcubeWin [data-lay="pad"]'));assert.strictEqual(E("store.get('vcubeKeys')"),'pad');
  assert.strictEqual($('#vcubeWin .vk-face[data-f="R"] .vk-key').textContent,'6','the keypad keys');
  keyCode('KeyD');assert.strictEqual($('#crossTry').value,'','D is no move with the keypad');
  keyCode('Numpad6');assert.strictEqual($('#crossTry').value,'R','6 is R');
  click($('#vcubeWin [data-lay="awdx"]'));
  // Close: back to a regular cube.
  click($('#vcubeWin .vk-close'));assert.strictEqual(E('cubeSrc()'),'mine');assert.ok($('#vcubeWin').hidden,'the window goes');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('live: the hold row, the ask, Use my cube, smart turns on the player, Check my plan follows the cube, the keys and the typing ok');process.exit(0);
}catch(e){console.error('live: FAIL',e.stack||e.message,errs);process.exit(1);}});
