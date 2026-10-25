// ================= Voice commands for the Smart cube tab =================
// The Smart cube tab (cubetab.js) listens for four kinds of thing.
// "Reset", or "reset cube": the list of moves is emptied, the picture is lined up with the cube in
// the hands (as Reset view does, once the tilt is live) and the stage is read again. The hold stays.
// "Top yellow, front green": the hold, how the cube sits in the hands, so the moves and the stage
// read as held. The top color and the front color name it. Either one alone keeps the other where
// it can: the front stays where it was ("top yellow" from white up, green in front is z2: green
// stays in front), else the hold the fewest turns away is taken. "Green toward me" is the front
// too. A bottom color ("bottom white") is taken as the top's opposite, and must be one, or the line
// says so and nothing changes. A hold said with moves on the list puts the whole-cube turn on the
// list, as the turn buttons do, so the moves before it still read right; an empty list takes none.
// "X", "x prime", "x counterclockwise", "back x", "x two", and the same for y and z: a press of
// the turn button under the picture (cubeTabTurn), so the turn goes on the list and the hold moves
// on. A letter alone acts only on the final guess: an early "x" may yet become "x prime".
// A case name ("T perm", "Sune", "F2L 12"): the reference card (smart-card.js) opens beside the
// cube with that case, its moves covered and uncovered one per second. The names go through the
// Reference's matcher (listen.js: listenCatalog, listenRankAll, listenDecide): a sure winner shows;
// close calls come as chips on the listen line, and a click or the next sentence ("second", "the
// perm") picks one (listenPick); a weak name (a letter or a number said alone) does not change an
// open card, it asks, and the same name again shows it. The stage on the cube breaks a tie: an OLL
// case while the top is being oriented, a PLL case after (smartListenSection). In a card, five
// commands: "reveal moves" and "hide moves" (listenCommand), "play", "stop" and "close"
// (smartCardCommand, pure).
// The Listen button sits with Clear moves and Hidden faces, beside the picture, in view with the
// cube. A click listens until Stop; a hold of the button listens once, while it is held. While it
// listens, the hints under the line say what to say (SMART_HINTS). The line says what was heard
// and what was done. The listening ends when the user leaves the tab, and when the link drops. One
// microphone: the Reference's Listen and this one stop each other.
// The recognizer is a dictation model: it hears "wait" for white, "read" for red and "blew" for
// blue, so each color has the words it comes out as (SMART_COLOR_WORDS). A command must be the whole
// of what was said, bar the small words around it ("the top is yellow and the bottom is white"): a
// color word inside talk is no command. The tab's own commands are read first, so a color word is
// never taken for a case. As in listen.js, an action comes on two early guesses in a row, or on the
// final one, and only the new end of a long result is read.
// Pure (no DOM): smartWords, smartTurn, smartCommand, smartHoldFor, smartCardCommand.

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
  const ws=String(text).toLowerCase().replace(/\b([xyz])\s*['’′]/g,'$1 prime').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean),out=[];
  for(let i=0;i<ws.length;i++){if(ws[i]==='re'&&ws[i+1]==='set'){out.push('reset');i++;}else out.push(ws[i]);}
  return out;}
const smartCap=s=>s[0].toUpperCase()+s.slice(1);
// A turn of the whole cube: the words a recognizer gives for each letter, the words that make it a
// prime ("x prime", "x counterclockwise", "back x") or a double ("x two"), and the small words around.
const SMART_AXIS_WORDS={x:'x',ex:'x',ecks:'x',eks:'x',x2:'x2',y:'y',why:'y',wye:'y',y2:'y2',z:'z',zee:'z',zed:'z',z2:'z2'};
const SMART_PRIME_WORDS=new Set(['prime','primed','prim','counter','counterclockwise','anticlockwise','anti','back','backward','backwards','reverse','inverse','inverted','minus']);
const SMART_DOUBLE_WORDS=new Set(['two','2','double','twice','half']);
const SMART_TURN_AROUND=new Set(['turn','rotate','rotation','the','whole','cube','a','do','please','now','ok','okay','hey','so','then','it','clockwise','way','one','time']);
// {cmd:'turn', m, sure} for a sentence that is one turn of the whole cube, else null. `sure` is
// false for a letter alone: more words may yet come ("x" then "x prime").
function smartTurn(ws){
  let axis=null,prime=false,dbl=false,sure=false;
  for(const w of ws){
    const a=SMART_AXIS_WORDS[w];
    if(a){if(axis)return null;axis=a[0];if(a[1]){dbl=sure=true;}continue;}
    if(SMART_PRIME_WORDS.has(w)){prime=sure=true;continue;}
    if(SMART_DOUBLE_WORDS.has(w)){dbl=sure=true;continue;}
    if(w==='clockwise'){sure=true;continue;}
    if(!SMART_TURN_AROUND.has(w))return null;}
  if(!axis)return null;
  return {cmd:'turn',m:axis+(dbl?'2':prime?"'":''),sure};}
// What a sentence asks for: {cmd:'reset'}, {cmd:'turn', m, sure} (smartTurn), {cmd:'hold', up,
// front} (a color index, or null for unsaid), {cmd:'error', msg} for a hold that cannot be, or null
// for no command. A sentence is a command only when every word of it is part of one: a place word
// with its color ("top yellow", "yellow on top", "green toward me"), "reset", a turn ("x prime"),
// and the small words around them.
function smartCommand(text){
  const ws=smartWords(text);if(!ws.length)return null;
  const rest=ws.filter(w=>!SMART_RESET_AROUND.has(w));
  if(rest.length&&rest.every(w=>SMART_RESET_WORDS.has(w)))return {cmd:'reset'};
  const turn=smartTurn(ws);if(turn)return turn;
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
  if(up!=null&&down!=null&&opp(up)!==down)return {cmd:'error',msg:`${smartCap(N[up])} and ${N[down]} are not opposite faces. Say the top color and the front color.`};
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
// A command for the open card, said alone: 'reveal' and 'hide' as the Reference's Listen takes them
// (listenCommand: "reveal moves", "hide moves", "show all"), 'play' ("play", "play it", "play the
// moves", "animate"), 'stop' ("stop", "pause", "stop playing") and 'close' ("close", "close the
// card", "dismiss"). Only a sentence that is the command counts: "stop" in talk does nothing.
function smartCardCommand(text){
  const ws=String(text).toLowerCase().replace(/[’']/g,'').replace(/[^a-z ]+/g,' ').split(/\s+/).filter(w=>w&&!/^(please|the|me|now|it|its|ok|okay|again|that|this|hey|twistwright|a)$/.test(w)),t=ws.join(' ');
  if(!t)return null;
  if(/^(close|dismiss)( (card|window|reference))?$/.test(t)||/^(hide|remove) (card|window)$/.test(t))return 'close';
  const lc=typeof listenCommand==='function'?listenCommand(text):null;if(lc)return lc;
  if(/^(play|animate|loop)( (moves?|algorithm|alg|case|animation|cube|loop))?$/.test(t))return 'play';
  if(/^(stop|pause|freeze)( (playing|play|moves?|algorithm|alg|animation|cube|loop|animating))?$/.test(t))return 'stop';
  return null;}

// ----- the tab: do what was said -----
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
  if(cmd.cmd==='turn'){cubeTabTurn(cmd.m);return `Turned ${cmd.m}. Held ${cubeTabHoldWords(cubeTab.hold)}.`;}
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
// What a card command does, in words for the line.
function smartCardVoice(c){
  if(c==='reveal'||c==='hide')return smartCardMoves(c);
  if(c==='play')return smartCardPlay(true);
  if(c==='stop')return smartCardPlay(false);
  if(!smartCardOpenNow())return 'No card is open.';
  smartCardClose();return 'Card closed.';}

// ----- the microphone -----
const SMART_LISTEN={on:false,hold:false,rec:null,used:{},pend:null,catalog:null,choices:null};
const SMART_RECENT=8;
const SMART_SAY='Say "reset", "top yellow, front green", "x prime", or a case name such as "T perm".';
// The hints while the tab listens: four groups, each with the things to say and one short line on
// what they do. Short, so the hints fit beside the cube with no scroll.
const SMART_HINTS=[
  {head:'Cube',say:['Reset','Top yellow, front green'],what:'Clear the moves. Say how you hold the cube.'},
  {head:'Turn',say:['x','x prime','back x','y','z'],what:'Turn the whole cube, as the buttons do.'},
  {head:'Case',say:['T perm','Sune','F2L 12'],what:'Open its card, with the moves covered.'},
  {head:'Card',say:['Reveal','Hide','Play','Stop','Close'],what:'Show, cover or play the moves. Close the card.'}];
function smartListenSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
const smartListenPre=()=>SMART_LISTEN.on?'Listening. ':'';
// The hints: drawn once, shown while the tab listens.
function smartListenHintsDraw(){
  const el=$('#cubeWinHints');if(!el)return;
  if(!el.childElementCount){
    const lbl=document.createElement('div');lbl.className='lbl';lbl.textContent='You can say';el.appendChild(lbl);
    for(const g of SMART_HINTS){const row=document.createElement('div');row.className='hint';
      const h=document.createElement('span');h.className='hd';h.textContent=g.head;
      const body=document.createElement('div');body.className='bd';
      const says=document.createElement('div');says.className='says';
      for(const t of g.say){const q=document.createElement('q');q.textContent=t;says.appendChild(q);}
      body.appendChild(says);
      if(g.what){const s=document.createElement('div');s.className='what';s.textContent=g.what;body.appendChild(s);}
      row.append(h,body);el.appendChild(row);}}
  const on=SMART_LISTEN.on||SMART_LISTEN.hold;
  el.classList.toggle('hidden',!on);
  const w=$('#cubeWin');if(w)w.classList.toggle('listening',on);} // the long note under the hints goes while it listens
// The button: Listen, Stop while it listens, Let go when done while it is held.
function smartListenButton(){
  const b=$('#cubeWinListen');if(!b)return;
  const live=SMART_LISTEN.on||SMART_LISTEN.hold;
  b.textContent=SMART_LISTEN.on?'Stop':SMART_LISTEN.hold?'Let go when done':'Listen';
  b.classList.toggle('on',live);b.setAttribute('aria-pressed',String(SMART_LISTEN.on));
  const row=$('#cubeWinListenRow');if(row)row.classList.toggle('on',live);
  smartListenHintsDraw();}
// The line under the buttons: what was done, and what was heard. Hidden with nothing to say.
function smartListenSay(msg,heard){
  const row=$('#cubeWinListenRow');if(!row)return;
  row.classList.toggle('hidden',!msg);
  row.querySelector('.txt').textContent=msg||'';row.querySelector('.heard').textContent=heard||'';}
// The choices as chips on the line: a click shows the case; so does the next sentence, through listenPick.
function smartListenAsk(choices){
  SMART_LISTEN.choices=choices||null;
  const row=$('#cubeWinListenRow'),box=row&&row.querySelector('.ask');if(!box)return;
  box.textContent='';if(!choices)return;
  for(const c of choices){const b=document.createElement('button');b.type='button';b.className='small';b.textContent=c.name;b.title='Show this case';
    b.onclick=()=>{listenLogAdd({picked:c.id});smartListenShow(c,'Showing '+c.name+'.');};box.appendChild(b);}}
// Show a case: the card opens on it, the chips go.
function smartListenShow(c,msg,heard){smartListenAsk(null);smartCardOpen(c);smartListenSay(smartListenPre()+msg,heard);}
// The set the stage on the cube points to, for a tie between an OLL and a PLL name.
function smartListenSection(){const st=typeof cubeTab!=='undefined'&&cubeTab.stage?cubeTab.stage.stage:null;
  return st==='eo'||st==='co'?'oll':st==='cp'||st==='ep'||st==='auf'?'pll':st==='f2l'?'f2l':null;}
// What a sentence (with the recognizer's alternatives) asks for: {cmd} for the tab (reset, a hold,
// an error), {card} for the open card, {pick} from the chips, the matcher's {hit, strong, choices,
// ranked} for a case name, or {} for nothing. The tab's own commands come first.
function smartListenAction(fresh){
  for(const f of fresh){const c=smartCommand(f);if(c)return {cmd:c};}
  for(const f of fresh){const c=smartCardCommand(f);if(c)return {card:c};}
  if(SMART_LISTEN.choices)for(const f of fresh){const c=listenPick(f,SMART_LISTEN.choices);if(c)return {pick:c};}
  SMART_LISTEN.catalog=SMART_LISTEN.catalog||listenCatalog();
  return listenDecide(listenRankAll(fresh,SMART_LISTEN.catalog,smartListenSection()))||{};}
// The key of an action an early guess may act on, when it comes twice in a row: a command, a card
// command, a pick, a strong name. Null for the rest: a hold that cannot be, and a turn letter alone
// ("x" may yet become "x prime"), wait for the final guess.
function smartListenKey(a){
  if(a.cmd)return a.cmd.cmd==='error'||(a.cmd.cmd==='turn'&&!a.cmd.sure)?null:JSON.stringify(a.cmd);
  if(a.card)return 'card:'+a.card;
  if(a.pick)return 'p:'+a.pick.kind+':'+a.pick.id;
  if(a.hit&&a.strong)return 'h:'+a.hit.kind+':'+a.hit.id;
  return null;}
// Do what a sentence asks for. A weak name does not change an open card: it asks. Returns true when
// something was done, and the words of the sentence are then used up.
function smartListenDo(a,fresh,early){
  const pre=smartListenPre(),heard='Heard: '+fresh[0],ex=early?{early:true}:{};
  if(a.cmd){const ok=a.cmd.cmd!=='error';if(ok)listenLogAdd({heard:fresh,command:a.cmd.cmd,...ex});smartListenSay(pre+smartListenApply(a.cmd),heard);return ok;}
  if(a.card){listenLogAdd({heard:fresh,command:a.card,...ex});smartListenSay(pre+smartCardVoice(a.card),heard);return true;}
  if(a.pick){listenLogAdd({heard:fresh,picked:a.pick.id,...ex});smartListenShow(a.pick,'Showing '+a.pick.name+'.',heard);return true;}
  const again=a.hit&&SMART_LISTEN.choices&&SMART_LISTEN.choices.length===1&&SMART_LISTEN.choices[0]===a.hit;
  if(a.hit&&(a.strong||again||(!early&&!smartCardOpenNow()))){listenLogAdd({heard:fresh,hit:a.hit.id,...ex});smartListenShow(a.hit,'Showing '+a.hit.name+'.',heard);return true;}
  if(early)return false;
  const ch=a.hit?[a.hit]:a.choices;
  if(ch){listenLogAdd({heard:fresh,choices:ch.map(c=>c.id)});smartListenAsk(ch);smartListenSay(pre+(a.hit?'Is it this one? Say it again, or click it.':'Which one?'),heard);return false;}
  if(SMART_LISTEN.choices){smartListenSay(pre+'Which one? Say the name again, or click one.',heard);return false;}
  smartListenSay(pre+'No command heard. '+SMART_SAY,heard);return false;}
// A result from the recognizer. Only the words after the ones an action used are read, the last
// SMART_RECENT of them. An action comes on the final guess, or on two early guesses in a row.
function smartListenResult(ev){
  for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i];const alts=[];
    for(let j=0;j<r.length;j++){const t=(r[j].transcript||'').trim();if(t)alts.push(t);}
    if(!alts.length)continue;
    const n=SMART_LISTEN.used[i]||0;
    const fresh=alts.map(a=>a.split(/\s+/).filter(Boolean).slice(n).slice(-SMART_RECENT).join(' ')).filter(Boolean);
    if(!fresh.length)continue;
    const a=smartListenAction(fresh),key=smartListenKey(a);
    if(!r.isFinal){
      smartListenSay(smartListenPre()+'Heard so far.','Heard: '+fresh[0]);
      const ready=key&&SMART_LISTEN.pend&&SMART_LISTEN.pend.i===i&&SMART_LISTEN.pend.key===key;
      SMART_LISTEN.pend=key&&!ready?{i,key}:null;
      if(!ready)continue;}
    else SMART_LISTEN.pend=null;
    const none=!a.cmd&&!a.card&&!a.pick&&!a.hit&&!a.choices;
    if(none&&n)continue; // the rest of a sentence that was used: talk
    if(smartListenDo(a,fresh,!r.isFinal))SMART_LISTEN.used[i]=alts[0].split(/\s+/).filter(Boolean).length;}}
// Chrome with on-device recognition takes the commands and the case names as phrases to favor (as listen.js does).
function smartListenBias(rec){
  const local=typeof LISTEN!=='undefined'&&LISTEN.local;
  if(!local||typeof window.SpeechRecognitionPhrase!=='function'||!('phrases' in rec))return;
  try{const ph=[new SpeechRecognitionPhrase('reset',3),new SpeechRecognitionPhrase('reset cube',3)];
    SMART_COLOR_NAMES.forEach((c,i)=>{ph.push(new SpeechRecognitionPhrase(`top ${c}`,2),new SpeechRecognitionPhrase(`front ${c}`,2));
      SMART_COLOR_NAMES.forEach((f,j)=>{if(j!==i&&j!==(i+3)%6)ph.push(new SpeechRecognitionPhrase(`top ${c} front ${f}`,3));});});
    for(const a of ['x','y','z'])for(const s of [a,a+' prime','back '+a,a+' counterclockwise',a+' two'])ph.push(new SpeechRecognitionPhrase(s,3));
    for(const s of ['reveal moves','hide moves','play','stop','close'])ph.push(new SpeechRecognitionPhrase(s,3));
    SMART_LISTEN.catalog=SMART_LISTEN.catalog||listenCatalog();
    for(const c of SMART_LISTEN.catalog){if(c.set==='f2l')continue;for(const s of c.say)ph.push(new SpeechRecognitionPhrase(c.set==='pll'?s+' perm':s,3));}
    rec.processLocally=true;rec.phrases=ph;}catch(e){}}
// Start the recognizer: on until Stop, or once, for one sentence while the button is held.
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
      const row=$('#cubeWinListenRow');if(row&&/^Say /.test(row.querySelector('.txt').textContent))smartListenSay('Nothing heard. Hold the button and say "reset", "top yellow, front green", "x prime", or a case name.');return;}
    if(SMART_LISTEN.on)setTimeout(()=>{if(SMART_LISTEN.on&&SMART_LISTEN.rec===rec)try{SMART_LISTEN.used={};SMART_LISTEN.pend=null;rec.start();}catch(e){}},250);}; // the browser stops on its own after a quiet spell
  try{rec.start();}catch(e){SMART_LISTEN.on=SMART_LISTEN.hold=false;SMART_LISTEN.rec=null;smartListenButton();smartListenSay('The microphone did not start. Try again.');return;}
  smartListenButton();
  smartListenSay(once?'Say one of these, then let go.':'Listening. Say one of these.');} // the hints under the line list them
// Stop. The last outcome stays on the line, without the word Listening.
function smartListenStop(){
  const rec=SMART_LISTEN.rec;SMART_LISTEN.on=SMART_LISTEN.hold=false;SMART_LISTEN.rec=null;SMART_LISTEN.pend=null;
  if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  smartListenButton();
  const row=$('#cubeWinListenRow');if(row){const t=row.querySelector('.txt');t.textContent=t.textContent.replace(/^Listening\. /,'');if(/^(Heard so far|Say )/.test(t.textContent))smartListenSay('');}}
// The button let go after a hold: the recognizer stops and gives its final sentence.
function smartListenRelease(){const rec=SMART_LISTEN.rec;if(SMART_LISTEN.hold&&rec)try{rec.stop();}catch(e){}}
// The tab's button, wired once. A click toggles. A hold of 300 ms listens once, until the button
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
// The tab was wired before this script loaded (cubetab.js): wire the button now.
if(typeof document!=='undefined')smartListenMount();
