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
const keyCode=(code,shift,alt)=>d.dispatchEvent(new w.KeyboardEvent('keydown',{code,key:code.slice(-1).toLowerCase(),shiftKey:!!shift,altKey:!!alt,bubbles:true}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const E=s=>w.eval(s);
  E("setMethod('cfop')");
  // The hold row: six tiles; the player's own hold lights its colors.
  assert.strictEqual($$('#viewHold .ht').length,6,'two tops, four fronts');
  E("newScramble('live-1')");E("goTab('solve')");
  const on=()=>$$('#viewHold .ht[aria-pressed="true"]').map(b=>b.parentNode.dataset.place+b.dataset.c);
  assert.deepStrictEqual(on(),['up3','front2'],'yellow on top, green in front: the scramble, then z2 to the grip');
  // White on top: the picture turns, and the list stays.
  const n0=E('seqState.moves.length');
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  assert.deepStrictEqual(on(),['up0','front2'],'white on top, green stays in front');
  assert.strictEqual(E('seqState.moves.length'),n0,'no turn on the list');
  assert.deepStrictEqual([...E('playerHeldCube().center')],[0,1,2,3,4,5],'the picture: white up, green in front');
  // A press of the tile that is on: the player's own hold again.
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  assert.strictEqual(E('PLAYER.hold'),null,'back to the player hold');
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
  // Held white up by the hold row: the white face is U, after the whole-cube turn to that hold.
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  turn('U');assert.strictEqual($('#crossTry').value,'D z2 U','the white face, held up, is U');
  assert.ok(E('liveInStep(cubeTab.target)'),'still in step');
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
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
  // The player list joins a move with your move before it on the same layer; the scramble stays.
  const nScr=E('seqState.yours');keyCode('KeyW');keyCode('KeyW');
  assert.deepStrictEqual([...E('seqState.moves.slice(seqState.yours)')],['U2'],'U then U is U2');
  keyCode('KeyW');assert.deepStrictEqual([...E('seqState.moves.slice(seqState.yours)')],["U'"],'U2 then U is U’');
  keyCode('KeyW');assert.strictEqual(E('seqState.moves.length'),nScr,'U’ then U: nothing on the list');
  assert.strictEqual(E('seqState.idx'),nScr,'the step in view is the last move');
  keyCode('KeyD');keyCode('KeyW');keyCode('KeyW',true);assert.deepStrictEqual([...E('seqState.moves.slice(seqState.yours)')],['R'],'U then U’ after R: R');
  // Typed moves go on the player.
  const inp=$('#crossTry');inp.value="F2 D' R";inp.dispatchEvent(new w.Event('input',{bubbles:true}));
  await until(()=>/^your cross plan/.test(E('seqState.label')),'the typed plan on the player');
  assert.deepStrictEqual([...E('seqState.moves')],['F2',"D'",'R'],'the typed moves');
  assert.strictEqual(inp.value,"F2 D' R",'the typed text stays');
  // Then a key adds to the typed plan.
  keyCode('KeyW');assert.strictEqual(inp.value,"F2 D' R U",'a key adds to the typed plan');
  // The picture turned by the hold row: a key goes on the list as the picture shows it, after the
  // whole-cube turn to that hold. The cube on the player is the cube in the picture.
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));const n2=E('seqState.moves.length');
  w.__was=E('playerHeldCube()');
  keyCode('KeyD');assert.deepStrictEqual([...E(`seqState.moves.slice(${n2})`)],['z2','R'],'yellow up to white up, then R as shown');
  assert.strictEqual(E('cubeTabKey(displayedCube)'),E("cubeTabKey(applyAlg(window.__was,['R']))"),'the cube in the picture turned R');
  assert.strictEqual(E('playerHoldView(displayedCube)'),null,'the player now holds the cube as the picture does');
  assert.deepStrictEqual(on(),['up0','front2'],'the tiles stay');
  keyCode('KeyD');assert.deepStrictEqual([...E(`seqState.moves.slice(${n2})`)],['z2','R2'],'one turn to the hold: R then R is R2');
  keyCode('KeyW');assert.deepStrictEqual([...E(`seqState.moves.slice(${n2})`)],['z2','R2','U'],'U is the white face, on top');
  click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));
  E("setCubeSrc('mine')");

  // The Virtual cube chip and the Keys window.
  assert.ok(!$('#vcubeWin')||$('#vcubeWin').hidden,'no window for a regular cube');
  // A load with the virtual cube kept: the keys work, the window stays closed.
  assert.ok(!$('#vcubeWin')||$('#vcubeWin').hidden,'no window on its own');
  click($('#vcubeBtn'));assert.strictEqual(E('cubeSrc()'),'screen','the chip turns the virtual cube on');
  assert.strictEqual($('#vcubeBtn').getAttribute('aria-pressed'),'true');const win=$('#vcubeWin');assert.ok(win&&!win.hidden,'the window floats');
  assert.deepStrictEqual($$('#vcubeWin .vk-face').map(b=>b.dataset.f+b.querySelector('.vk-key').textContent),['UW','BE','LA','FS','RD','DX','MC'],'the buttons sit as the keys do, M right of D');
  assert.deepStrictEqual($$('#vcubeWin .vk-rot').map(b=>b.dataset.f+b.querySelector('.vk-key').textContent),['x,','y.','z/'],'x y z in a row under');
  assert.deepStrictEqual($$('#vcubeWin .vk-mod').map(b=>b.dataset.mod),['wide','prime'],'the modifiers');
  assert.strictEqual($('#vcubeWin [data-mod="prime"] .vk-key').textContent,'Shift');
  assert.deepStrictEqual($$('#vcubeWin [data-lay]').map(b=>b.textContent),['WASD+','NumKeys'],'the layout buttons');
  assert.ok($$('#vcubeWin button').every(b=>b.title),'every button has a title');
  E("newScramble('live-3')");E("goTab('cross')");await sleep(50);
  click($('#vcubeWin .vk-face[data-f="F"]'));assert.strictEqual($('#crossTry').value,'F','a press turns the face');
  // Prime is sticky: it stays on for every click until a second click.
  const prime=$('#vcubeWin [data-mod="prime"]');click(prime);assert.strictEqual(prime.getAttribute('aria-pressed'),'true');
  click($('#vcubeWin .vk-face[data-f="F"]'));assert.strictEqual($('#crossTry').value,'','prime undoes it');
  assert.strictEqual($('#vcubeWin .vk-face[data-f="R"] b').textContent,"R'",'the buttons say which way');
  const last=()=>E('seqState.moves[seqState.moves.length-1]');
  click($('#vcubeWin .vk-face[data-f="U"]'));assert.strictEqual(last(),"U'",'still on for the next click');
  // The keyboard takes no sticky modifier: D alone is R.
  const vn0=E('seqState.moves.length');keyCode('KeyD');assert.strictEqual(last(),'R','a key ignores the sticky prime');
  click(prime);assert.strictEqual(prime.getAttribute('aria-pressed'),'false');
  // Wide: sticky on the buttons, Option on the keys. M and x y z ignore it.
  const wide=$('#vcubeWin [data-mod="wide"]');click(wide);
  assert.deepStrictEqual(['R','M','x'].map(f=>$(`#vcubeWin [data-f="${f}"] b`).textContent),['r','M','x'],'the labels follow');
  click($('#vcubeWin .vk-face[data-f="R"]'));assert.strictEqual(last(),'r','a wide press');
  click(prime);click($('#vcubeWin .vk-face[data-f="L"]'));assert.strictEqual(last(),"l'",'wide and prime');click(prime);click(wide);
  keyCode('KeyW',false,true);assert.strictEqual(last(),'u','Option with a key');
  keyCode('KeyC');assert.strictEqual(last(),'M','C is M');click($('#vcubeWin [data-f="M"]'));assert.strictEqual(last(),'M2','the M button');
  keyCode('Comma',true);assert.strictEqual(last(),"x'",'Shift+, is x\'');click($('#vcubeWin [data-f="y"]'));assert.strictEqual(last(),'y','the y button');
  assert.ok(E('seqState.moves.length')>vn0);
  // A whole-cube turn with the picture turned by the hold row: the hold turns with it.
  // (The CFOP scramble ends yellow up, z2; the white tile turns the picture back to white up.)
  E("newScramble('live-3')");await sleep(50);click($('#viewHold .grp[data-place="up"] .ht[data-c="0"]'));const h0=E('seqState.moves.length');
  keyCode('Comma');const hm=[...E(`seqState.moves.slice(${h0})`)];assert.ok(hm.length===2&&hm[1]==='x','the turn to the hold, then x: '+hm);
  assert.deepStrictEqual({...E('PLAYER.hold')},{top:2,front:3},'green on top, yellow in front');
  assert.strictEqual(E('playerHoldView(displayedCube)'),null,'the picture shows the cube as it now stands');
  assert.deepStrictEqual($$('#viewHold .ht[aria-pressed="true"]').length,0,'no tile for green on top');
  keyCode('KeyD');assert.deepStrictEqual([...E(`seqState.moves.slice(${h0})`)],[...hm,'R'],'no second turn to the hold');
  E('PLAYER.hold=null;playerHoldDraw()');
  E("newScramble('live-3')");await sleep(50);assert.strictEqual($('#crossTry').value,'','a new scramble empties the plan');
  // The keypad only: the letter keys keep their shortcuts.
  click($('#vcubeWin [data-lay="pad"]'));assert.strictEqual(E("store.get('vcubeKeys')"),'pad');
  assert.strictEqual($('#vcubeWin .vk-face[data-f="R"] .vk-key').textContent,'6','the keypad keys');
  keyCode('KeyD');assert.strictEqual($('#crossTry').value,'','D is no move with the keypad');
  keyCode('Numpad6');assert.strictEqual($('#crossTry').value,'R','6 is R');
  click($('#vcubeWin [data-lay="awdx"]'));
  // The keys carry the color of the face they turn.
  assert.ok($('#vcubeWin .vk-face[data-f="F"]').classList.contains('c2'),'F is green');
  // Close hides the window; the virtual cube stays. The chip shows it again, then turns it off.
  click($('#vcubeWin .vk-close'));assert.strictEqual(E('cubeSrc()'),'screen','still the virtual cube');assert.ok($('#vcubeWin').hidden,'the window goes');
  click($('#vcubeBtn'));assert.ok(!$('#vcubeWin').hidden,'the chip shows it again');
  click($('#vcubeBtn'));assert.strictEqual(E('cubeSrc()'),'mine','the chip turns it off');assert.ok($('#vcubeWin').hidden,'the window goes');
  // Regular cube from the menu closes it too.
  click($('#vcubeBtn'));assert.ok(!$('#vcubeWin').hidden);E("setCubeSrc('mine')");assert.ok($('#vcubeWin').hidden,'a regular cube: no window');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('live: the hold row, the ask, Use my cube, smart turns on the player, Check my plan follows the cube, the keys and the typing ok');process.exit(0);
}catch(e){console.error('live: FAIL',e.stack||e.message,errs);process.exit(1);}});
