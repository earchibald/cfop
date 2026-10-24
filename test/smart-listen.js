// Voice commands for the smart cube window (js/smart-listen.js): the words of a command ("reset",
// "top yellow, bottom white", "green toward me"; talk is no command; a pair that is no pair, or a
// front that is on top, is said so), the hold a command names from the hold now (the front stays
// when it can, else the fewest turns), and the window: the Listen button with Clear moves and
// Hidden faces, a click listens until Stop, a hold of the button listens once, "reset" empties the
// list and takes the heading again with the tilt live, a hold goes on the list only with moves on
// it, an early guess acts on two in a row, the Reference's Listen and this one stop each other, and
// the listening ends with the window and with the link. With a fake recognizer and a fake GAN cube.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor,gyroMsg}=require('./fake-gan');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
const MAC='AB:12:34:5C:9D:E1';
const recs=[];
class FakeRec{constructor(){this.started=0;this.stopped=0;this.continuous=false;recs.push(this);}start(){this.started++;}stop(){this.stopped++;}
  say(i,text,isFinal){const r=(Array.isArray(text)?text:[text]).map(t=>({transcript:t,confidence:.9}));r.isFinal=!!isFinal;const results=[];results[i]=r;results.length=i+1;this.onresult({resultIndex:i,results});}
  end(){if(this.onend)this.onend();}}
function boot(bt){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage({})});
      w.webkitSpeechRecognition=FakeRec;
      Object.defineProperty(w.navigator,'bluetooth',{value:bt});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
(async()=>{try{
  let dev=null;const cube={};
  const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const bt={requestDevice:async()=>{if(!dev)throw Object.assign(new Error('cancelled'),{name:'NotFoundError'});return dev;}};
  const {w,d,errs}=await boot(bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const ptr=(el,type)=>el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0}));
  const esc=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  // The page's script-level bindings (const, let) are not on the window: a function made in the page's realm reads them.
  const ev=s=>new w.Function('return ('+s+')')(),run=s=>new w.Function(s)();
  const Cube=ev('Cube');
  // ----- the words of a command -----
  const cmd=t=>{const c=w.smartCommand(t);return c&&JSON.parse(JSON.stringify(c));};
  assert.deepStrictEqual([...w.smartWords('Re-set the Cube!')],['reset','the','cube']);
  for(const t of ['reset','Reset.','reset cube','reset the cube','Reset it, please','re set','reset view','reset everything','okay reset'])assert.deepStrictEqual(cmd(t),{cmd:'reset'},`"${t}" is reset`);
  for(const [t,up,front] of [['top yellow bottom white',3,null],['Top yellow, bottom white.',3,null],['yellow top white bottom',3,null],
    ['the top is yellow and the bottom is white',3,null],['yellow up white down',3,null],['top yellow',3,null],['bottom white',3,null],
    ['top white bottom yellow',0,null],['top red bottom orange',1,null],['top blue bottom green',5,null],['top orange bottom red',4,null],
    ['top yellow bottom white front green',3,2],['green toward me',null,2],['front red',null,1],['top yellow, green in front',3,2],
    ['I am holding it yellow up, green facing me',3,2],['wait on top, read in front',0,1],['top is yella bottom is wide',3,null],['top blew bottom grain',5,null]])
    assert.deepStrictEqual(cmd(t),{cmd:'hold',up,front},`"${t}" is up ${up}, front ${front}`);
  for(const t of ['','hello','top','yellow','yellow white','top yellow white','I think the top of the hill is green','the green light is on','reset the thing',
    'so I reset my password','put the kettle on','white and red','T perm','top of the morning','top yellow bottom white I think','the bottom line'])
    assert.strictEqual(cmd(t),null,`no command: "${t}"`);
  assert.strictEqual(cmd('top white bottom red').cmd,'error');assert.match(cmd('top white bottom red').msg,/^White and red are not opposite faces\./);
  assert.match(cmd('top white front yellow').msg,/^Yellow cannot face you with white on top\./);
  assert.match(cmd('bottom white front yellow').msg,/^Yellow cannot face you with yellow on top\./);
  assert.match(cmd('top white top yellow').msg,/^Two colors for the top\./);
  // ----- the hold a command names -----
  const H=ev('CUBE_TAB_HOLDS'),holdOf=ms=>ev('CUBE_TAB_HOLD_BY').get(w.applyAlg(new Cube(),ms).center.join());
  const hf=(c,cur)=>w.smartHoldFor(c,cur);
  assert.strictEqual(hf({up:3,front:null},null),holdOf(['z2']),'yellow up from white up, green in front: green stays in front (z2)');
  assert.strictEqual(hf({up:3,front:2},null),holdOf(['z2']));
  assert.strictEqual(hf({up:3,front:5},null),holdOf(['x2']),'blue in front: x2');
  assert.strictEqual(hf({up:2,front:null},null),holdOf(['x']),'green up: the fewest turns, x');
  assert.strictEqual(hf({up:null,front:1},null),holdOf(['y']),'red in front, white stays up');
  assert.strictEqual(hf({up:0,front:null},holdOf(['z2'])),H[0],'white up again from yellow up: green stays in front');
  const g=hf({up:2,front:null},holdOf(['y']));assert.ok(g.cube.center[0]===2&&g.cube.center[2]===1,'green up from red in front keeps red in front');
  assert.strictEqual(hf({up:null,front:0},null),null,'white cannot face you with white on top');
  assert.strictEqual(hf({up:null,front:3},null),null,'nor yellow');
  // ----- in the window -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  run('cubeTab.stillMs=150;cubeTab.revealMs=120;cubeTab.awayMs=60');
  esc();const spot=$('#cubeSpot');if(spot)click(spot.querySelector('.sh'));
  click($('#cubeTab'));assert.ok($('#cubeWin'),'the window opens');
  const btn=()=>$('#cubeWinListen'),row=()=>$('#cubeWinListenRow'),txt=()=>row().querySelector('.txt').textContent,heard=()=>row().querySelector('.heard').textContent;
  const readout=()=>$$('#cubeWinMoves .mv').map(s=>s.textContent).join(' ');
  const warnOn=()=>!$('#cubeWinWarn').classList.contains('hidden');
  assert.ok(btn()&&btn().closest('.cw-side')&&btn().previousElementSibling===$('#cubeWinHidden'),'Listen sits with Clear moves and Hidden faces');
  assert.ok(/"reset"/.test(btn().title)&&/top yellow, bottom white/.test(btn().title),'the button says what to say: '+btn().title);
  assert.ok(row().classList.contains('hidden'),'nothing heard yet: no line');assert.strictEqual(row().getAttribute('role'),'status');
  assert.ok(d.body.classList.contains('can-listen')&&!btn().disabled);
  // A click listens until Stop.
  click(btn());const rec=recs[recs.length-1];assert.ok(rec&&rec.started===1&&rec.continuous===true,'the recognizer starts, continuous');
  assert.strictEqual(btn().textContent,'Stop');assert.ok(btn().classList.contains('on')&&row().classList.contains('on'));assert.strictEqual(btn().getAttribute('aria-pressed'),'true');
  assert.ok(!row().classList.contains('hidden')&&/^Listening\. Say "reset", or "top yellow, bottom white"\./.test(txt()),txt());
  // Moves on the list, then "reset": the list is emptied, the stage read again. The hold stays.
  run("cubeTab.moves=['R','U'];cubeTabMovesDraw()");assert.strictEqual(readout(),'R U');
  rec.say(0,'reset',true);
  assert.strictEqual(readout(),'');assert.ok($('#cubeWinMoves .none'),'reset empties the list');
  assert.strictEqual(txt(),'Listening. Reset. The moves are cleared.');assert.strictEqual(heard(),'Heard: reset');
  assert.strictEqual(ev('cubeTab.hold'),null);
  // "Top yellow, bottom white": the hold is yellow up, green in front (z2). The list was empty: no turn goes on it.
  rec.say(1,['top yellow bottom white','top yellow bottom wait'],true);
  assert.strictEqual(ev('cubeTab.hold'),holdOf(['z2']),'yellow up, green in front');
  assert.strictEqual(readout(),'','an empty list takes no turn');
  assert.strictEqual(txt(),'Listening. Held yellow up, green in front. The moves and the stage read that way.');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&w.quatAngle(ev('cubeTab.q'),holdOf(['z2']).q)<1,1500),'the picture turns to the hold');
  // The same hold said again: nothing changes.
  rec.say(2,'top yellow bottom white',true);assert.match(txt(),/Already held yellow up, green in front\./);assert.strictEqual(ev('cubeTab.hold'),holdOf(['z2']));
  // With moves on the list, the turn goes on it: white up again is z2.
  run("cubeTab.moves=['R'];cubeTabMovesDraw()");
  rec.say(3,'top white bottom yellow',true);
  assert.strictEqual(ev('cubeTab.hold'),null,'white up, green in front');assert.strictEqual(readout(),'R z2','the turn is on the list');
  // A pair that is no pair: the window says so, nothing changes.
  rec.say(4,'top white bottom red',true);
  assert.strictEqual(txt(),'Listening. White and red are not opposite faces. Say the top color and the one under it.');
  assert.strictEqual(ev('cubeTab.hold'),null);assert.strictEqual(readout(),'R z2');
  // The front alone: red toward me is y.
  rec.say(5,'red toward me',true);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));assert.match(txt(),/Held white up, red in front\./);assert.strictEqual(readout(),'R z2 y');
  // A front that is on top cannot be.
  rec.say(6,'front white',true);assert.strictEqual(txt(),'Listening. White cannot face you with white on top.');assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));
  // Talk is no command.
  rec.say(7,'I think the top of the hill is green',true);
  assert.strictEqual(txt(),'Listening. No command heard. Say "reset", or "top yellow, bottom white".');assert.strictEqual(heard(),'Heard: think the top of the hill is green','the last eight words show');
  assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));
  // An early guess acts when the same command comes twice in a row; the final guess of the same words acts no more.
  rec.say(8,'top yellow',false);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']),'one early guess: nothing yet');assert.strictEqual(txt(),'Listening. Heard so far.');assert.strictEqual(heard(),'Heard: top yellow');
  rec.say(8,'top yellow',false);const held8=ev('cubeTab.hold');assert.ok(held8&&held8.cube.center[0]===3,'two in a row: yellow up');
  assert.strictEqual(held8.cube.center[2],1,'red stays in front');
  const list8=readout();assert.ok(/[xyz]/.test(list8.slice(-3)),'a turn went on the list: '+list8);
  rec.say(8,'top yellow',true);assert.strictEqual(ev('cubeTab.hold'),held8);assert.strictEqual(readout(),list8,'the final guess acts no more');
  // A hold that cannot be waits for the final guess, which may mend it.
  rec.say(9,'top white bottom red',false);rec.say(9,'top white bottom red',false);assert.ok(!/not opposite/.test(txt()),'an early error waits: '+txt());
  rec.say(9,'top white bottom yellow',true);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']),'the final guess mended it');
  // The recognizer stops on its own after a quiet spell: it starts again.
  rec.end();await sleep(300);assert.strictEqual(rec.started,2,'started again');
  // Stop: the line keeps the last outcome, without the word Listening.
  click(btn());assert.ok(!ev('SMART_LISTEN.on')&&rec.stopped===1,'Stop stops the recognizer');assert.strictEqual(btn().textContent,'Listen');assert.strictEqual(btn().getAttribute('aria-pressed'),'false');
  assert.match(txt(),/^Held white up, red in front\./);
  // A hold of the button listens once; let go, and the recognizer stops and gives its sentence.
  ptr(btn(),'pointerdown');await sleep(350);const rec2=recs[recs.length-1];assert.ok(rec2!==rec&&rec2.started===1&&rec2.continuous===false,'a hold listens once');
  assert.strictEqual(btn().textContent,'Let go when done');assert.strictEqual(txt(),'Say "reset", or "top yellow, bottom white", then let go.');
  ptr(btn(),'pointerup');click(btn());assert.strictEqual(rec2.stopped,1,'let go: the recognizer stops');assert.ok(ev('SMART_LISTEN.hold'),'still the hold until the sentence comes');
  run("cubeTab.moves=['R'];cubeTabMovesDraw()");
  rec2.say(0,'reset cube',true);rec2.end();
  assert.strictEqual(txt(),'Reset. The moves are cleared.');assert.strictEqual(readout(),'');assert.ok(!ev('SMART_LISTEN.hold'));assert.strictEqual(btn().textContent,'Listen');
  // A hold that hears nothing says so.
  ptr(btn(),'pointerdown');await sleep(350);const rec3=recs[recs.length-1];ptr(btn(),'pointerup');click(btn());rec3.end();
  assert.strictEqual(txt(),'Nothing heard. Hold the button and say "reset", or "top yellow, bottom white".');
  // One microphone: the Reference's Listen and this one stop each other.
  click($('#listenBtn'));assert.ok(ev('LISTEN.on'),'the Reference listens');
  click(btn());assert.ok(ev('SMART_LISTEN.on')&&!ev('LISTEN.on'),'the window takes the microphone');
  click($('#listenBtn'));assert.ok(ev('LISTEN.on')&&!ev('SMART_LISTEN.on'),'and gives it back');assert.strictEqual(btn().textContent,'Listen');
  w.listenStop();
  // The tilt live: "reset" takes the heading again, as Reset view does, and the band goes. The hold stays.
  click(btn());const rec4=recs[recs.length-1];
  const rawOf=q=>({x:q[0],y:-q[2],z:q[1],w:q[3]}),tilt=q=>dev.notify(gyroMsg(4,rawOf(w.quatMul(w.quatConj(ev('cubeTab.basis')||[0,0,0,1]),q))));
  tilt(holdOf(['y']).q);await sleep(30);assert.ok(ev('cubeTab.gyro'),'the tilt is on');assert.ok(!warnOn());
  tilt(holdOf(['y2']).q);assert.ok(await until(()=>warnOn(),500),'drifted a quarter turn: the band');
  const basis1=ev('cubeTab.basis');
  rec4.say(0,'reset',true);
  assert.ok(!warnOn()&&!ev('cubeTab.away'),'reset: the band goes');assert.ok(w.quatAngle(ev('cubeTab.basis'),basis1)>80,'the heading moved a quarter turn');
  assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']),'the hold stays');assert.strictEqual(txt(),'Listening. Reset. The moves are cleared and the picture is lined up with your cube.');
  // A hold said while the cube sits another way: the band says so, as the buttons would.
  rec4.say(1,'top yellow bottom white',true);assert.strictEqual(ev('cubeTab.hold').cube.center[0],3,'yellow up');assert.strictEqual(ev('cubeTab.hold').cube.center[2],1,'red stays in front');
  assert.ok(await until(()=>warnOn(),500),'the cube still sits white up: the band');assert.match($('#cubeWinWarn .txt').textContent,/^Your cube sits with white up, .* read with yellow up, red in front\./);
  tilt(ev('cubeTab.hold').q);await sleep(100);assert.ok(!warnOn(),'turned over as said: no band');
  // Close: the listening ends with the window. Opened again, the button is back at rest.
  esc();assert.ok(!$('#cubeWin'),'Esc closes the window');assert.ok(!ev('SMART_LISTEN.on')&&rec4.stopped===1,'the listening ends with the window');
  click($('#cubeTab'));assert.ok(btn()&&btn().textContent==='Listen'&&row().classList.contains('hidden'),'opened again: at rest');
  // The link drops: the listening ends and the button is off.
  click(btn());const rec5=recs[recs.length-1];assert.ok(ev('SMART_LISTEN.on'));
  dev.gatt.disconnect();await sleep(20);
  assert.ok(!ev('SMART_LISTEN.on')&&rec5.stopped===1,'a dropped link ends the listening');assert.ok(btn().disabled,'the button is off');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('smart-listen ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
