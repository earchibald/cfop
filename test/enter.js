// Enter a scramble reads the letters of a cube state as well as moves, and a paste on the page
// outside a field loads a state. A state of another puzzle, or an illegal one, leaves an error in
// the dialog; other pasted text is left alone.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.confirm=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const moves=()=>[...d.querySelectorAll('#scramble .m')].map(e=>e.textContent);
const paste=(text,target)=>{const e=new w.Event('paste',{bubbles:true,cancelable:true});e.clipboardData={getData:()=>text};(target||d.body).dispatchEvent(e);return e;};
const state=alg=>w.stateText(w.applyAlg(new (w.eval('Cube'))(),alg));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const Cube=w.eval('Cube'),FourCube=w.eval('FourCube'),STATE=w.eval('STATE_LETTERS'); // a const or class in a classic script is not on window
  assert.strictEqual(STATE,'WRGYOB');
  w.setMethod('cfop');
  const want=w.applyAlg(new Cube(),"R U F' D2 L B");
  // the dialog: the letters load the cube, as a scanned cube does
  w.openEnter();$('#enterType').value=state("R U F' D2 L B");$('#enterGo').click();
  assert.ok(!$('#enterBg'),'the dialog closes on a good state');
  assert.ok(w.eval('scr.cube').equals(want),'the cube loads as the letters say');assert.ok(moves().length>0,'a scramble shows for it');
  assert.ok(/^state-/.test($('#seed').placeholder),'the seed is named for the state: '+$('#seed').placeholder);
  // a state written with another face up loads the same cube
  w.openEnter();$('#enterType').value=state("R U F' D2 L B y");$('#enterGo').click();
  assert.ok(w.eval('scr.cube').equals(want),'the stickers turn back to white up');
  // moves still work
  w.openEnter();$('#enterType').value="R U R' U'";$('#enterGo').click();
  assert.deepStrictEqual(moves().slice(0,4),['R','U',"R'","U'"],'a typed scramble still loads');
  // an illegal state stays in the dialog with the error
  w.openEnter();$('#enterType').value='WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBW';$('#enterGo').click();
  assert.ok($('#enterBg'),'the dialog stays on a bad state');assert.match($('#enterStatus').textContent,/white 10, blue 8/);
  // a 2x2 state on the 3x3 names the puzzle
  $('#enterType').value='WWWW RRRR GGGG YYYY OOOO BBBB';$('#enterGo').click();
  assert.match($('#enterStatus').textContent,/a 2x2 state. This is the 3x3/);
  w.closeEnter();
  // a paste on the page loads a state
  const want2=w.applyAlg(new Cube(),"L2 D' F U R' B2");
  let e=paste(state("L2 D' F U R' B2"));
  assert.ok(e.defaultPrevented,'the paste is taken');assert.ok(w.eval('scr.cube').equals(want2),'the pasted state loads');assert.ok(!$('#enterBg'),'no dialog on a good paste');
  // other text is left to the page; a paste into a field is left to the field
  e=paste('hello there');assert.ok(!e.defaultPrevented,'words are not taken');assert.ok(w.eval('scr.cube').equals(want2),'and change nothing');
  e=paste(state('R U'),$('#seed'));assert.ok(!e.defaultPrevented,'a paste into a field belongs to the field');assert.ok(w.eval('scr.cube').equals(want2));
  // a bad paste opens the dialog with the text and the error
  e=paste('WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBW');
  assert.ok(e.defaultPrevented&&$('#enterBg'),'a bad state opens the dialog');assert.match($('#enterStatus').textContent,/white 10, blue 8/);
  assert.strictEqual($('#enterType').value,'WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBW','with the text in the field');
  w.closeEnter();
  // the 2x2 and the 4x4 take their own letters
  w.setMethod('speed2');
  const two=w.applyAlg(new Cube(),"R U' F");
  e=paste(w.stateText({toFacelets:()=>w.twoFacelets(two)}));
  assert.ok(e.defaultPrevented,'a 2x2 state is taken on the 2x2');
  assert.deepStrictEqual(w.twoFacelets(w.eval('scr.cube')),w.twoFacelets(two),'the 2x2 loads as the letters say');
  w.setMethod('speed4');
  const four=new FourCube().apply("Rr U f'");
  e=paste(w.stateText(four));
  assert.ok(e.defaultPrevented,'a 4x4 state is taken on the 4x4');assert.ok(w.eval('scr.cube').equals(four),'the 4x4 loads as the letters say');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('enter ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}});
