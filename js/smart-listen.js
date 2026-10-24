// ================= Voice commands for the smart cube window =================
// The window of a smart cube (cubetab.js) listens for two commands.
// "Reset", or "reset cube": the list of moves is emptied, the picture is lined up with the cube in
// the hands (as Reset view does, once the tilt is live) and the stage is read again. The hold stays.
// "Top yellow, bottom white": the hold, how the cube sits in the hands, so the moves and the stage
// read as held. The top color sets the hold. The bottom must be the color under it, or the window
// says so and nothing changes. The front stays where it was when it can ("top yellow" from white
// up, green in front is z2: green stays in front), else the hold the fewest turns away is taken;
// "front green" or "green toward me" in the same breath sets it. A hold said with moves on the list
// puts the whole-cube turn on the list, as the turn buttons do, so the moves before it still read
// right; an empty list takes none.
// The Listen button sits with Clear moves and Hidden faces. A click listens until Stop; a hold of
// the button listens once, while it is held. The line under the buttons says what was heard and what
// was done. The listening ends with the window, and when the link drops. One microphone: the
// Reference's Listen and this one stop each other.
// The recognizer is a dictation model: it hears "wait" for white, "read" for red and "blew" for
// blue, so each color has the words it comes out as (SMART_COLOR_WORDS). A command must be the whole
// of what was said, bar the small words around it ("the top is yellow and the bottom is white"): a
// color word inside talk is no command. As in listen.js, a command acts on two early guesses in a
// row, or on the final one, and only the new end of a long result is read.
// Pure (no DOM): smartWords, smartCommand, smartHoldFor.

const SMART_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
// The words a recognizer gives for each color.
const SMART_COLOR_WORDS={white:0,whites:0,wait:0,wide:0,wight:0,
  red:1,reds:1,read:1,bread:1,
  green:2,greens:2,grain:2,greene:2,
  yellow:3,yellows:3,jello:3,yella:3,
  orange:4,oranges:4,orangey:4,
  blue:5,blues:5,blew:5,blu:5,glue:5};
// The words for a place: the top, the bottom, the front.
const SMART_PLACE_WORDS={top:'up',up:'up',upper:'up',above:'up',
  bottom:'down',down:'down',under:'down',underneath:'down',below:'down',beneath:'down',
  front:'front',forward:'front',forwards:'front',facing:'front',toward:'front',towards:'front',ahead:'front'};
const SMART_PLACE_NAMES={up:'top',down:'bottom',front:'front'};
// The small words around a command.
const SMART_FILLER=new Set(['the','a','an','is','are','on','at','in','of','to','my','me','with','and','then','cube','side','face','color','colour','colors',
  'has','its','it','please','now','put','hold','holding','held','i','im','am','ok','okay','hey','so','um','uh','twistwright','orientation','position','set','goes','go']);
// "Reset" with the words that may go with it: "reset the cube", "reset view", "reset it please".
const SMART_RESET_WORDS=new Set(['reset','reseat']);
const SMART_RESET_AROUND=new Set(['the','my','cube','view','it','please','now','position','orientation','q','cue','queue','you','everything','all','moves','move','list','ok','okay','hey']);
// Lower case, letters and digits only, "re set" as one word.
function smartWords(text){
  const ws=String(text).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean),out=[];
  for(let i=0;i<ws.length;i++){if(ws[i]==='re'&&ws[i+1]==='set'){out.push('reset');i++;}else out.push(ws[i]);}
  return out;}
const smartCap=s=>s[0].toUpperCase()+s.slice(1);
// What a sentence asks for: {cmd:'reset'}, {cmd:'hold', up, front} (a color index, or null for
// unsaid), {cmd:'error', msg} for a hold that cannot be, or null for no command. A sentence is a
// command only when every word of it is part of one: a place word with its color ("top yellow",
// "yellow on top", "green toward me"), "reset", and the small words around them.
function smartCommand(text){
  const ws=smartWords(text);if(!ws.length)return null;
  const rest=ws.filter(w=>!SMART_RESET_AROUND.has(w));
  if(rest.length&&rest.every(w=>SMART_RESET_WORDS.has(w)))return {cmd:'reset'};
  const items=[];
  for(const w of ws){
    if(SMART_FILLER.has(w))continue;
    if(SMART_PLACE_WORDS[w])items.push({place:SMART_PLACE_WORDS[w]});
    else if(SMART_COLOR_WORDS[w]!=null)items.push({color:SMART_COLOR_WORDS[w]});
    else return null;} // a word that is no part of a command: talk
  // Each color takes the place word before it, else the one after it.
  const at={};let pairs=0;
  for(let i=0;i<items.length;i++){const it=items[i];if(it.color==null)continue;
    const j=i>0&&items[i-1].place&&!items[i-1].used?i-1:i+1<items.length&&items[i+1].place&&!items[i+1].used?i+1:-1;
    if(j<0)continue;
    items[j].used=true;it.used=true;const p=items[j].place;
    if(at[p]!=null&&at[p]!==it.color)return {cmd:'error',msg:`Two colors for the ${SMART_PLACE_NAMES[p]}. Say one.`};
    at[p]=it.color;pairs++;}
  if(!pairs||items.some(x=>!x.used))return null;
  const opp=c=>(c+3)%6,N=SMART_COLOR_NAMES;
  let up=at.up==null?null:at.up;const down=at.down==null?null:at.down,front=at.front==null?null:at.front;
  if(up!=null&&down!=null&&opp(up)!==down)return {cmd:'error',msg:`${smartCap(N[up])} and ${N[down]} are not opposite faces. Say the top color and the one under it.`};
  if(up==null&&down!=null)up=opp(down);
  if(front!=null&&up!=null&&(front===up||front===opp(up)))return {cmd:'error',msg:`${smartCap(N[front])} cannot face you with ${N[up]} on top.`};
  return {cmd:'hold',up,front};}
// The hold a command names, from the hold now (`cur`, one of CUBE_TAB_HOLDS): the top it says (the
// top now when unsaid) and the front it says (the front now when it can stay, else the hold the
// fewest turns away). Null when no hold has them: the front said is on top or under it.
function smartHoldFor(cmd,cur){
  cur=cur||CUBE_TAB_HOLDS[0];const c=cur.cube.center,up=cmd.up==null?c[0]:cmd.up;
  if(cmd.front!=null&&(cmd.front===up||cmd.front===(up+3)%6))return null;
  const want=CUBE_TAB_HOLDS.filter(h=>h.cube.center[0]===up&&(cmd.front==null||h.cube.center[2]===cmd.front));
  const score=h=>(h.cube.center[2]===c[2]?0:10)+cubeTabHoldDelta(cur,h).length;
  return want.sort((a,b)=>score(a)-score(b))[0]||null;}

// ----- the window: do what was said -----
// Returns the words for the line under the buttons.
function smartListenApply(cmd){
  if(cmd.cmd==='error')return cmd.msg;
  if(!cubeTab.conn)return 'The cube is not connected.';
  if(cmd.cmd==='reset'){
    cubeTab.moves=[];
    if(cubeTab.raw)cubeTabKeep();
    cubeTabStageReset();if(cubeTab.target)cubeTabSettle();
    cubeTabWindow();
    return cubeTab.raw?'Reset. The moves are cleared and the picture is lined up with your cube.':'Reset. The moves are cleared.';}
  const cur=cubeTab.hold||CUBE_TAB_HOLDS[0],h=smartHoldFor(cmd,cur);
  if(!h){const up=cmd.up==null?cur.cube.center[0]:cmd.up;return `${smartCap(COLOR_NAMES[cmd.front])} cannot face you with ${COLOR_NAMES[up]} on top.`;}
  const turns=cubeTabHoldDelta(cur,h);
  if(!turns.length)return `Already held ${cubeTabHoldWords(h)}.`;
  if(cubeTab.moves.length)for(const m of turns)cubeTab.moves=cubeTabMerge(cubeTab.moves,m);
  cubeTab.hold=h.moves.length?h:null;
  if(cubeTab.gyro&&cubeTab.raw){cubeTabKeep();cubeTabAwayCheck();} // the cube sits as said: the heading lines the picture up with it; a cube that sits otherwise brings the band
  else{if(!cubeTab.q)cubeTab.q=[0,0,0,1];cubeTab.qTo=h.q;cubeTabTurnView();}
  if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();
  cubeTabWindow();
  return `Held ${cubeTabHoldWords(cubeTab.hold)}. The moves and the stage read that way.`;}

// ----- the microphone -----
const SMART_LISTEN={on:false,hold:false,rec:null,used:{},pend:null};
const SMART_RECENT=8;
const SMART_SAY='Say "reset", or "top yellow, bottom white".';
function smartListenSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
const smartListenPre=()=>SMART_LISTEN.on?'Listening. ':'';
// The button: Listen, Stop while it listens, Let go when done while it is held.
function smartListenButton(){
  const b=$('#cubeWinListen');if(!b)return;
  const live=SMART_LISTEN.on||SMART_LISTEN.hold;
  b.textContent=SMART_LISTEN.on?'Stop':SMART_LISTEN.hold?'Let go when done':'Listen';
  b.classList.toggle('on',live);b.setAttribute('aria-pressed',String(SMART_LISTEN.on));
  const row=$('#cubeWinListenRow');if(row)row.classList.toggle('on',live);}
// The line under the buttons: what was done, and what was heard. Hidden with nothing to say.
function smartListenSay(msg,heard){
  const row=$('#cubeWinListenRow');if(!row)return;
  row.classList.toggle('hidden',!msg);
  row.querySelector('.txt').textContent=msg||'';row.querySelector('.heard').textContent=heard||'';}
// A result from the recognizer. Only the words after the ones a command used are read, the last
// SMART_RECENT of them. A command acts on the final guess, or on two early guesses in a row; a hold
// that cannot be waits for the final guess, in case the next guess mends it.
function smartListenResult(ev){
  for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i];const alts=[];
    for(let j=0;j<r.length;j++){const t=(r[j].transcript||'').trim();if(t)alts.push(t);}
    if(!alts.length)continue;
    const n=SMART_LISTEN.used[i]||0;
    const fresh=alts.map(a=>a.split(/\s+/).filter(Boolean).slice(n).slice(-SMART_RECENT).join(' ')).filter(Boolean);
    if(!fresh.length)continue;
    let cmd=null;for(const f of fresh){cmd=smartCommand(f);if(cmd)break;}
    const key=cmd&&cmd.cmd!=='error'?JSON.stringify(cmd):null;
    if(!r.isFinal){
      smartListenSay(smartListenPre()+'Heard so far.','Heard: '+fresh[0]);
      const ready=key&&SMART_LISTEN.pend&&SMART_LISTEN.pend.i===i&&SMART_LISTEN.pend.key===key;
      SMART_LISTEN.pend=key&&!ready?{i,key}:null;
      if(!ready)continue;}
    else SMART_LISTEN.pend=null;
    if(!cmd){if(r.isFinal&&!n)smartListenSay(smartListenPre()+'No command heard. '+SMART_SAY,'Heard: '+fresh[0]);continue;}
    SMART_LISTEN.used[i]=alts[0].split(/\s+/).filter(Boolean).length;
    smartListenSay(smartListenPre()+smartListenApply(cmd),'Heard: '+fresh[0]);}}
// Chrome with on-device recognition takes the commands as phrases to favor (as listen.js does for the names).
function smartListenBias(rec){
  const local=typeof LISTEN!=='undefined'&&LISTEN.local;
  if(!local||typeof window.SpeechRecognitionPhrase!=='function'||!('phrases' in rec))return;
  try{const ph=[new SpeechRecognitionPhrase('reset',3),new SpeechRecognitionPhrase('reset cube',3)];
    SMART_COLOR_NAMES.forEach((c,i)=>{ph.push(new SpeechRecognitionPhrase(`top ${c} bottom ${SMART_COLOR_NAMES[(i+3)%6]}`,3),new SpeechRecognitionPhrase(`front ${c}`,2));});
    rec.processLocally=true;rec.phrases=ph;}catch(e){}}
// Start the recognizer: on until Stop, or once, for one command while the button is held.
function smartListenStart(once){
  if(!smartListenSupported()){smartListenSay('This browser cannot listen. Use Safari or Chrome.');return;}
  if(typeof LISTEN!=='undefined'&&(LISTEN.on||LISTEN.hold)&&typeof listenStop==='function')listenStop(); // one microphone
  const R=window.SpeechRecognition||window.webkitSpeechRecognition,rec=new R();
  SMART_LISTEN.rec=rec;SMART_LISTEN.used={};SMART_LISTEN.pend=null;SMART_LISTEN.on=!once;SMART_LISTEN.hold=!!once;
  rec.lang='en-US';rec.continuous=!once;rec.interimResults=true;rec.maxAlternatives=5;
  smartListenBias(rec);
  rec.onresult=smartListenResult;
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){smartListenStop();smartListenSay('The microphone is blocked. Allow it for this site in the browser settings.');}};
  rec.onend=()=>{if(SMART_LISTEN.rec!==rec)return;
    if(once){SMART_LISTEN.rec=null;SMART_LISTEN.hold=false;smartListenButton();
      const row=$('#cubeWinListenRow');if(row&&/^Say /.test(row.querySelector('.txt').textContent))smartListenSay('Nothing heard. Hold the button and say "reset", or "top yellow, bottom white".');return;}
    if(SMART_LISTEN.on)setTimeout(()=>{if(SMART_LISTEN.on&&SMART_LISTEN.rec===rec)try{SMART_LISTEN.used={};SMART_LISTEN.pend=null;rec.start();}catch(e){}},250);}; // the browser stops on its own after a quiet spell
  try{rec.start();}catch(e){SMART_LISTEN.on=SMART_LISTEN.hold=false;SMART_LISTEN.rec=null;smartListenButton();smartListenSay('The microphone did not start. Try again.');return;}
  smartListenButton();
  smartListenSay(once?SMART_SAY.replace(/\.$/,', then let go.'):'Listening. '+SMART_SAY);}
// Stop. The last outcome stays on the line, without the word Listening.
function smartListenStop(){
  const rec=SMART_LISTEN.rec;SMART_LISTEN.on=SMART_LISTEN.hold=false;SMART_LISTEN.rec=null;SMART_LISTEN.pend=null;
  if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  smartListenButton();
  const row=$('#cubeWinListenRow');if(row){const t=row.querySelector('.txt');t.textContent=t.textContent.replace(/^Listening\. /,'');if(/^(Heard so far|Say )/.test(t.textContent))smartListenSay('');}}
// The button let go after a hold: the recognizer stops and gives its final sentence.
function smartListenRelease(){const rec=SMART_LISTEN.rec;if(SMART_LISTEN.hold&&rec)try{rec.stop();}catch(e){}}
// The window opened: the button. A click toggles. A hold of 300 ms listens once, until the button
// is let go; the click after it does nothing.
function smartListenMount(){
  const b=$('#cubeWinListen');if(!b||b.dataset.ready)return;b.dataset.ready='1';
  let t=null,held=false;
  b.addEventListener('pointerdown',e=>{if(e.button)return;held=false;clearTimeout(t);if(SMART_LISTEN.on||SMART_LISTEN.hold)return;t=setTimeout(()=>{held=true;smartListenStart(true);},300);});
  const up=()=>{clearTimeout(t);t=null;if(held)smartListenRelease();};
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
  b.addEventListener('click',()=>{if(held){held=false;return;}if(SMART_LISTEN.on)smartListenStop();else smartListenStart(false);});
  b.addEventListener('contextmenu',e=>e.preventDefault());
  smartListenButton();}
// The Reference's Listen starts: this one stops. (listen.js declares listenStart as a global function; the global is rebound here.)
if(typeof listenStart==='function'){const start=listenStart;listenStart=function(){if(SMART_LISTEN.on||SMART_LISTEN.hold)smartListenStop();return start.apply(this,arguments);};}
