// Voice commands for the Smart cube tab (js/smart-listen.js): the words of a command ("reset",
// "top yellow, bottom white", "green toward me"; talk is no command; a pair that is no pair, or a
// front that is on top, is said so), the card commands (reveal, hide, play, stop, close, said
// alone), the hold a command names from the hold now (the front stays when it can, else the
// fewest turns), and the tab: the Listen button with Clear moves and Hidden faces, beside the
// picture, a click listens until Stop, a hold of the button listens once, the hints while it
// listens, "reset" empties the list and takes the heading again with the tilt live (Lock off),
// "clear moves" empties the list alone, a hold goes
// on the list only with moves on it, an early guess acts on two in a row, a case name opens the
// reference card (close calls as chips, a pick by click or by the next sentence, a weak name asks
// while a card is open, the stage breaks a tie), the card commands, the Reference's Listen and
// this one stop each other, and the listening ends with the tab and with the link. With a fake
// recognizer and a fake GAN cube.
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
  for(const t of ['clear','Clear moves.','clear the moves','clear the list','clear move list','clear them please','okay clear it','empty the list','clean up the moves'])assert.deepStrictEqual(cmd(t),{cmd:'clear'},`"${t}" is clear`);
  for(const [t,up,front] of [['top yellow bottom white',3,null],['Top yellow, bottom white.',3,null],['yellow top white bottom',3,null],
    ['the top is yellow and the bottom is white',3,null],['yellow up white down',3,null],['top yellow',3,null],['bottom white',3,null],
    ['top white bottom yellow',0,null],['top red bottom orange',1,null],['top blue bottom green',5,null],['top orange bottom red',4,null],
    ['top yellow bottom white front green',3,2],['green toward me',null,2],['front red',null,1],['top yellow, green in front',3,2],
    ['I am holding it yellow up, green facing me',3,2],['wait on top, read in front',0,1],['top is yella bottom is wide',3,null],['top blew bottom grain',5,null]])
    assert.deepStrictEqual(cmd(t),{cmd:'hold',up,front},`"${t}" is up ${up}, front ${front}`);
  for(const t of ['','hello','top','yellow','yellow white','top yellow white','I think the top of the hill is green','the green light is on','reset the thing',
    'so I reset my password','put the kettle on','white and red','T perm','top of the morning','top yellow bottom white I think','the bottom line',
    'the coast is clear','clear skies today','clear clear','clear the cube','is that clear'])
    assert.strictEqual(cmd(t),null,`no command: "${t}"`);
  assert.strictEqual(cmd('top white bottom red').cmd,'error');assert.match(cmd('top white bottom red').msg,/^White and red are not opposite faces\./);
  assert.match(cmd('top white front yellow').msg,/^Yellow cannot face you with white on top\./);
  assert.match(cmd('bottom white front yellow').msg,/^Yellow cannot face you with yellow on top\./);
  assert.match(cmd('top white top yellow').msg,/^Two colors for the top\./);
  // The top and the front, the way the hints say it.
  for(const [t,up,front] of [['top yellow front green',3,2],['Top yellow, front green.',3,2],['yellow on top green in front',3,2],['top white front red',0,1],['front blue top orange',4,5]])
    assert.deepStrictEqual(cmd(t),{cmd:'hold',up,front},`"${t}" is up ${up}, front ${front}`);
  // ----- the words of a turn of the whole cube -----
  for(const [t,m,sure] of [['x','x',false],['X.','x',false],['y','y',false],['why','y',false],['z','z',false],['zee','z',false],['ex','x',false],
    ['x prime','x\'',true],["x'","x'",true],["X’","x'",true],['x counter-clockwise',"x'",true],['x counterclockwise',"x'",true],['x counter clockwise',"x'",true],['x anticlockwise',"x'",true],
    ['back x',"x'",true],['x back',"x'",true],['y prime',"y'",true],['back y',"y'",true],['z counter-clockwise',"z'",true],['back z',"z'",true],['why prime',"y'",true],
    ['x clockwise','x',true],['turn x','x',false],['rotate the cube y','y',false],['x two','x2',true],['y2','y2',true],['double z','z2',true]])
    assert.deepStrictEqual(cmd(t),{cmd:'turn',m,sure},`"${t}" is ${m}`);
  for(const t of ['x y','Y perm','Z perm','x marks the spot','why not','back','prime','clockwise','the x factor','back up'])
    assert.ok(!cmd(t)||cmd(t).cmd!=='turn',`no turn: "${t}"`);
  // ----- the words of a card command -----
  const cc=t=>w.smartCardCommand(t);
  for(const t of ['reveal moves','reveal','show all moves','uncover','Reveal the moves, please'])assert.strictEqual(cc(t),'reveal',`"${t}" is reveal`);
  for(const t of ['hide moves','hide','cover them up','hide the algorithm'])assert.strictEqual(cc(t),'hide',`"${t}" is hide`);
  for(const t of ['play','Play it','play the moves','play the algorithm','animate','play it again'])assert.strictEqual(cc(t),'play',`"${t}" is play`);
  for(const t of ['stop','Stop!','pause','stop playing','stop the animation'])assert.strictEqual(cc(t),'stop',`"${t}" is stop`);
  for(const t of ['close','Close.','close the card','close it','dismiss','hide the card'])assert.strictEqual(cc(t),'close',`"${t}" is close`);
  for(const t of ['','T perm','let us play a game','the bus stop','close call','stop it right there','reset','top yellow'])assert.strictEqual(cc(t),null,`no card command: "${t}"`);
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
  // ----- in the tab -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  run('cubeTab.stillMs=150;cubeTab.revealMs=120;cubeTab.awayMs=60;SMART_CARD.ms=60');
  esc();assert.strictEqual(ev('curTab'),'smart','the page is on the tab');
  const btn=()=>$('#cubeWinListen'),row=()=>$('#cubeWinListenRow'),txt=()=>row().querySelector('.txt').textContent,heard=()=>row().querySelector('.heard').textContent;
  const chips=()=>$$('#cubeWinListenRow .ask button').map(b=>b.textContent),hints=()=>$('#cubeWinHints');
  const readout=()=>$$('#cubeWinMoves .mv').map(s=>s.textContent).join(' ');
  const warnOn=()=>!$('#cubeWinWarn').classList.contains('hidden');
  const card=()=>$('#smartCard'),cardName=()=>card()&&card().querySelector('.sc-head .nm').textContent,onCount=()=>$$('#smartCard .algbig .sp-m.on').length,allCount=()=>$$('#smartCard .algbig .sp-m').length;
  assert.ok(btn()&&btn().closest('.cw-side')&&btn().previousElementSibling===$('#cubeWinHidden'),'Listen sits with Clear moves and Hidden faces');
  assert.ok(btn().closest('.cw-aside')&&$('#cubeWinSvg').closest('.cw-main'),'beside the picture, not under it');
  assert.ok(/"reset"/.test(btn().title)&&/top yellow, front green/.test(btn().title)&&/x prime/.test(btn().title)&&/T perm/.test(btn().title),'the button says what to say: '+btn().title);
  assert.ok(row().classList.contains('hidden'),'nothing heard yet: no line');assert.strictEqual(row().getAttribute('role'),'status');
  assert.ok(hints().classList.contains('hidden'),'no hints until it listens');
  assert.ok(d.body.classList.contains('can-listen')&&!btn().disabled);
  // A click listens until Stop. The hints show.
  click(btn());const rec=recs[recs.length-1];assert.ok(rec&&rec.started===1&&rec.continuous===true,'the recognizer starts, continuous');
  assert.strictEqual(btn().textContent,'Stop');assert.ok(btn().classList.contains('on')&&row().classList.contains('on'));assert.strictEqual(btn().getAttribute('aria-pressed'),'true');
  assert.ok(!row().classList.contains('hidden')&&txt()==='Listening. Say one of these.',txt());
  assert.ok(!hints().classList.contains('hidden'),'the hints show while it listens');
  assert.deepStrictEqual($$('#cubeWinHints .hint .hd').map(b=>b.textContent),['Cube','Turn','Case','Card'],'four groups');
  assert.deepStrictEqual($$('#cubeWinHints .hint').map(h=>[...h.querySelectorAll('.says q')].map(q=>q.textContent)),
    [['Reset','Clear moves','Top yellow, front green'],['x','x prime','back x','y','z'],['T perm','Sune','F2L 12'],['Reveal','Hide','Play','Stop','Close']],'the things to say');
  assert.ok($$('#cubeWinHints .what').every(s=>s.textContent.length>20&&s.textContent.length<50),'each line on what they do is short');
  assert.ok($('#cubeWin').classList.contains('listening'),'the long note goes while it listens');
  assert.ok(hints().closest('.cw-aside'),'beside the picture');
  // Moves on the list, then "reset": the list is emptied, the stage read again. The hold stays.
  run("cubeTab.moves=['R','U'];cubeTabMovesDraw()");assert.strictEqual(readout(),'R U');
  rec.say(0,'reset',true);
  assert.strictEqual(readout(),'');assert.ok($('#cubeWinMoves .none'),'reset empties the list');
  assert.strictEqual(txt(),'Listening. Reset. The moves are cleared.');assert.strictEqual(heard(),'Heard: reset');
  assert.strictEqual(ev('cubeTab.hold'),null);
  // "Clear moves": the list is emptied, and nothing else changes. An empty list says so.
  run("cubeTab.moves=['R','U'];cubeTabMovesDraw()");
  rec.say(40,'clear moves',true);
  assert.strictEqual(readout(),'');assert.strictEqual(txt(),'Listening. The moves are cleared.');assert.strictEqual(heard(),'Heard: clear moves');
  rec.say(41,'clear',true);assert.strictEqual(txt(),'Listening. No moves to clear.');
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
  // A pair that is no pair: the line says so, nothing changes.
  rec.say(4,'top white bottom red',true);
  assert.strictEqual(txt(),'Listening. White and red are not opposite faces. Say the top color and the front color.');
  assert.strictEqual(ev('cubeTab.hold'),null);assert.strictEqual(readout(),'R z2');
  // The front alone: red toward me is y.
  rec.say(5,'red toward me',true);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));assert.match(txt(),/Held white up, red in front\./);assert.strictEqual(readout(),'R z2 y');
  // A front that is on top cannot be.
  rec.say(6,'front white',true);assert.strictEqual(txt(),'Listening. White cannot face you with white on top.');assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));
  // Talk is no command, and no case.
  rec.say(7,'I think the top of the hill is green',true);
  assert.strictEqual(txt(),'Listening. No command heard. Say "reset", "clear moves", "top yellow, front green", "x prime", or a case name such as "T perm".');assert.strictEqual(heard(),'Heard: think the top of the hill is green','the last eight words show');
  assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']));assert.ok(!card(),'no card');
  // An early guess acts when the same command comes twice in a row; the final guess of the same words acts no more.
  rec.say(8,'top yellow',false);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']),'one early guess: nothing yet');assert.strictEqual(txt(),'Listening. Heard so far.');assert.strictEqual(heard(),'Heard: top yellow');
  rec.say(8,'top yellow',false);const held8=ev('cubeTab.hold');assert.ok(held8&&held8.cube.center[0]===3,'two in a row: yellow up');
  assert.strictEqual(held8.cube.center[2],1,'red stays in front');
  const list8=readout();assert.ok(/[xyz]/.test(list8.slice(-3)),'a turn went on the list: '+list8);
  rec.say(8,'top yellow',true);assert.strictEqual(ev('cubeTab.hold'),held8);assert.strictEqual(readout(),list8,'the final guess acts no more');
  // A hold that cannot be waits for the final guess, which may mend it.
  rec.say(9,'top white bottom red',false);rec.say(9,'top white bottom red',false);assert.ok(!/not opposite/.test(txt()),'an early error waits: '+txt());
  rec.say(9,'top white bottom yellow',true);assert.strictEqual(ev('cubeTab.hold'),holdOf(['y']),'the final guess mended it');
  // ----- a case name opens the reference card beside the cube -----
  rec.say(10,['T perm','tea perm'],true);
  assert.ok(card(),'the card opens');assert.strictEqual(cardName(),'T perm');assert.strictEqual(txt(),'Listening. Showing T perm.');assert.strictEqual(heard(),'Heard: T perm');
  assert.deepStrictEqual(chips(),[],'no chips for a sure name');assert.strictEqual(onCount(),0,'the moves start covered');
  assert.ok(await until(()=>onCount()===1,400),'and uncover one per tick');
  // The card commands: reveal, hide, play, stop.
  rec.say(11,'reveal moves',true);assert.strictEqual(onCount(),allCount(),'reveal moves uncovers them all');assert.strictEqual(txt(),'Listening. All moves shown.');
  rec.say(12,'hide moves',true);assert.strictEqual(onCount(),0,'hide moves covers them again');assert.match(txt(),/^Listening\. Moves hidden\./);
  await sleep(150);assert.strictEqual(onCount(),0,'and the reveal has stopped');
  rec.say(13,'play',true);const pv=$('#smartCard .pic .pv[data-v="play"]');assert.ok(pv&&!pv.hidden&&w.loopRunning(pv),'play turns the moves on the small cube');assert.match(txt(),/^Listening\. Playing the moves on the card\./);
  rec.say(14,'stop',true);assert.ok(pv.hidden&&!w.loopRunning(pv),'stop puts the still picture back');assert.strictEqual(txt(),'Listening. Stopped.');
  // Another name takes the card's place; the same card, the new moves covered.
  const el1=card();rec.say(15,'Sune',true);assert.strictEqual(card(),el1,'the same card');assert.strictEqual(cardName(),'Sune');assert.strictEqual(onCount(),0);
  // A strong name acts on two early guesses in a row.
  rec.say(16,'antisune',false);assert.strictEqual(cardName(),'Sune','one early guess: nothing yet');
  rec.say(16,'antisune',false);assert.strictEqual(cardName(),'Anti-Sune','two in a row: the card changes');
  rec.say(16,'antisune',true);assert.strictEqual(cardName(),'Anti-Sune');
  // A weak name (a letter alone) does not change an open card: it asks; the same name again shows it.
  run("cubeTab.stage={stage:'cp',name:'x',sub:'',moves:[]}");
  rec.say(17,'tea',true);assert.strictEqual(cardName(),'Anti-Sune','a letter alone does not change the card');assert.match(txt(),/^Listening\. Is it this one\?/);
  assert.deepStrictEqual(chips(),['T perm'],'the stage after the top is oriented: the T perm, as a chip');
  rec.say(18,'tea',true);assert.strictEqual(cardName(),'T perm','said again: it shows');assert.deepStrictEqual(chips(),[],'the chip goes');
  // The stage breaks a tie the other way while the top is being oriented.
  run("cubeTab.stage={stage:'co',name:'x',sub:'',moves:[]}");
  rec.say(19,'tea',true);assert.deepStrictEqual(chips().length,1,'asks with the OLL case');
  click($('#cubeWinListenRow .ask button'));assert.strictEqual(ev('SMART_CARD.entry').id,'co-T','a click on the chip shows the OLL T');assert.deepStrictEqual(chips(),[]);
  run("cubeTab.stage=null");
  // Close calls come as chips; the next sentence picks one.
  rec.say(20,'d perm',true);assert.strictEqual(txt(),'Listening. Which one?');assert.strictEqual(chips().length,5,'d perm: the five perms of the E set as chips: '+chips().join(', '));
  assert.ok(chips().every(c=>/ perm$/.test(c)),'all perms');assert.strictEqual(ev('SMART_CARD.entry').id,'co-T','the card did not change');
  const second=chips()[1];
  rec.say(21,'second',true);assert.strictEqual(cardName(),second,'the next sentence picks');assert.deepStrictEqual(chips(),[]);assert.strictEqual(txt(),'Listening. Showing '+second+'.');
  // "G perm" alone is the a case, as the Reference's Listen takes it.
  rec.say(22,'G perm',true);assert.strictEqual(cardName(),'Ga perm');
  // A number alone is an F2L case.
  rec.say(23,'F2L 12',true);assert.strictEqual(cardName(),'F2L case #12');
  // Close by voice; a card command with no card says so.
  rec.say(24,'close',true);assert.ok(!card(),'close closes the card');assert.strictEqual(txt(),'Listening. Card closed.');
  rec.say(25,'play',true);assert.strictEqual(txt(),'Listening. Say a case name first, then "play".');
  rec.say(26,'reveal moves',true);assert.strictEqual(txt(),'Listening. Say a case name first, then "reveal moves".');
  // A color word is never a case: the tab's own commands come first.
  rec.say(27,'top yellow bottom white',true);assert.ok(!card());assert.match(txt(),/^Listening\. Held yellow up/);
  // A turn said is a press of its button: the turn goes on the list and the hold moves on.
  run("cubeTab.moves=['R'];cubeTabMovesDraw()");const h0=ev('cubeTab.hold'),after=ms=>ev('CUBE_TAB_HOLD_BY').get(w.applyAlg(h0.cube,ms).center.join());
  rec.say(28,'x',false);rec.say(28,'x',false);assert.strictEqual(ev('cubeTab.hold'),h0,'a letter alone waits for the final guess');assert.strictEqual(readout(),'R');
  rec.say(28,'x prime',false);rec.say(28,'x prime',false);assert.strictEqual(readout(),"R x'",'x prime: two early guesses in a row act');
  assert.strictEqual(ev('cubeTab.hold'),after(["x'"]));assert.match(txt(),/^Listening\. Turned x'\. Held /);
  rec.say(28,'x prime',true);assert.strictEqual(readout(),"R x'",'the final guess acts no more');
  rec.say(29,'back y',true);assert.strictEqual(readout(),"R x' y'");assert.strictEqual(ev('cubeTab.hold'),after(["x'","y'"]));
  rec.say(30,'why',true);assert.strictEqual(readout(),"R x'",'y after y\' takes both off, as the buttons do');
  rec.say(31,'z counter-clockwise',true);assert.strictEqual(readout(),"R x' z'");
  click($('#cubeWinTurns button[data-turn="z"]'));assert.strictEqual(readout(),"R x'",'the button and the voice are one list');
  rec.say(32,'x',true);assert.strictEqual(readout(),'R');assert.strictEqual(ev('cubeTab.hold'),h0,'back to the hold');assert.ok(!card(),'no card for a turn');
  // The recognizer stops on its own after a quiet spell: it starts again.
  rec.end();await sleep(300);assert.strictEqual(rec.started,2,'started again');
  // Stop: the line keeps the last outcome, without the word Listening. The hints go.
  click(btn());assert.ok(!ev('SMART_LISTEN.on')&&rec.stopped===1,'Stop stops the recognizer');assert.strictEqual(btn().textContent,'Listen');assert.strictEqual(btn().getAttribute('aria-pressed'),'false');
  assert.match(txt(),/^Turned x\. Held yellow up/);assert.ok(hints().classList.contains('hidden'),'the hints go with the listening');
  // A hold of the button listens once; let go, and the recognizer stops and gives its sentence. The hints show meanwhile.
  ptr(btn(),'pointerdown');await sleep(350);const rec2=recs[recs.length-1];assert.ok(rec2!==rec&&rec2.started===1&&rec2.continuous===false,'a hold listens once');
  assert.strictEqual(btn().textContent,'Let go when done');assert.strictEqual(txt(),'Say one of these, then let go.');
  assert.ok(!hints().classList.contains('hidden'),'the hints show while the button is held');
  ptr(btn(),'pointerup');click(btn());assert.strictEqual(rec2.stopped,1,'let go: the recognizer stops');assert.ok(ev('SMART_LISTEN.hold'),'still the hold until the sentence comes');
  run("cubeTab.moves=['R'];cubeTabMovesDraw()");
  rec2.say(0,'reset cube',true);rec2.end();
  assert.strictEqual(txt(),'Reset. The moves are cleared.');assert.strictEqual(readout(),'');assert.ok(!ev('SMART_LISTEN.hold'));assert.strictEqual(btn().textContent,'Listen');
  assert.ok(hints().classList.contains('hidden'),'the hints go when the hold ends');
  // A hold that hears nothing says so.
  ptr(btn(),'pointerdown');await sleep(350);const rec3=recs[recs.length-1];ptr(btn(),'pointerup');click(btn());rec3.end();
  assert.strictEqual(txt(),'Nothing heard. Hold the button and say "reset", "clear moves", "top yellow, front green", "x prime", or a case name.');
  // A hold can name a case too.
  ptr(btn(),'pointerdown');await sleep(350);const rec3b=recs[recs.length-1];ptr(btn(),'pointerup');click(btn());rec3b.say(0,'Y perm',true);rec3b.end();
  assert.strictEqual(cardName(),'Y perm','a held sentence opens the card');assert.strictEqual(txt(),'Showing Y perm.');
  w.smartCardClose();
  // One microphone: the Reference's Listen and this one stop each other.
  click($('#listenBtn'));assert.ok(ev('LISTEN.on'),'the Reference listens');
  click(btn());assert.ok(ev('SMART_LISTEN.on')&&!ev('LISTEN.on'),'the tab takes the microphone');
  click($('#listenBtn'));assert.ok(ev('LISTEN.on')&&!ev('SMART_LISTEN.on'),'and gives it back');assert.strictEqual(btn().textContent,'Listen');
  w.listenStop();
  // The tilt live (Lock off): "reset" takes the heading again, as Reset view does, and the band goes. The hold stays.
  click(btn());const rec4=recs[recs.length-1];
  assert.ok(ev('cubeTab.lock'),'Lock is on by default');run('cubeTabSetLock(false)');
  const rawOf=q=>({x:q[0],y:-q[2],z:q[1],w:q[3]}),tilt=q=>dev.notify(gyroMsg(4,rawOf(w.quatMul(w.quatConj(ev('cubeTab.basis')||[0,0,0,1]),q))));
  const hy=ev('cubeTab.hold');assert.ok(hy&&hy.cube.center[0]===3,'yellow up from the last hold');
  tilt(hy.q);await sleep(30);assert.ok(ev('cubeTab.gyro'),'the tilt is on');assert.ok(!warnOn());
  const hy2=H.find(h=>h.cube.equals(w.applyAlg(hy.cube,['y2'])));
  tilt(hy2.q);assert.ok(await until(()=>warnOn(),500),'turned a half turn: the band');
  const basis1=ev('cubeTab.basis');
  rec4.say(0,'reset',true);
  assert.ok(!warnOn()&&!ev('cubeTab.away'),'reset: the band goes');assert.ok(w.quatAngle(ev('cubeTab.basis'),basis1)>80,'the heading moved');
  assert.strictEqual(ev('cubeTab.hold'),hy,'the hold stays');assert.strictEqual(txt(),'Listening. Reset. The moves are cleared and the picture is lined up with your cube.');
  // A hold said while the cube sits another way: the band says so, as the buttons would.
  rec4.say(1,'top white bottom yellow',true);assert.strictEqual(ev('cubeTab.hold')?ev('cubeTab.hold').cube.center[0]:0,0,'white up');
  assert.ok(await until(()=>warnOn(),500),'the cube still sits yellow up: the band');assert.match($('#cubeWinWarn .txt').textContent,/^Your cube sits with yellow up, .* read with white up/);
  tilt((ev('cubeTab.hold')||H[0]).q);await sleep(100);assert.ok(!warnOn(),'turned over as said: no band');
  // Another tab: the listening ends with the tab. Back on the tab, the button is at rest.
  w.goTab('cross');assert.ok(!ev('SMART_LISTEN.on')&&rec4.stopped===1,'the listening ends when the user leaves the tab');
  w.goTab('smart');assert.ok(btn().textContent==='Listen'&&hints().classList.contains('hidden'),'back on the tab: at rest');
  // The link drops: the listening ends and the button is off.
  click(btn());const rec5=recs[recs.length-1];assert.ok(ev('SMART_LISTEN.on'));
  dev.gatt.disconnect();await sleep(20);
  assert.ok(!ev('SMART_LISTEN.on')&&rec5.stopped===1,'a dropped link ends the listening');assert.ok(btn().disabled,'the button is off');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('smart-listen ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
