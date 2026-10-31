// ================= Quest cube lab: the drill's voice =================
// Drill mode listens for case names until it ends. A two-look OLL or PLL case, or one of the full PLL,
// said by name ("T perm", "Sune", "headlights", "U a perm") drills that case: the picture starts as the
// case, set up as held (questDrill in quest.js). Said again, or "again" or "next", the case is set up
// again. "Stop drill" ends Drill mode. The Smart cube tab's cube commands work here too
// (js/smart-words.js): the hold ("yellow up", "green front", "top yellow, front green", "green
// toward me"), a turn of the whole cube ("x prime", "turn y"), "clear moves", and "reset" (the case
// again, and the picture lined up with the cube while the tilt is live). A new hold sets the case up
// for it, as the hold tiles do. The site's Listen matcher reads what was heard
// (js/listen-match.js): the names people say for each case, scored by sound. A tie between sets ("T"
// alone is the T OLL and the T perm) goes to the set of the case drilled now; else the line asks.
//
// Three recognizers. In the Quest app (quest/spatial/), the headset's own speech service through
// the app (questVoiceNative). The browser's speech recognition where it has one (Chrome or Safari on a computer).
// The Quest Browser has none, so there the page hears through Vosk in WebAssembly, on the headset
// itself: vosk-browser and a small English model in quest/voice/ (scripts/quest-voice.js fetches
// them; quest/run.sh runs it). Vosk is told the phrases it may hear (questVoiceGrammar), so it
// gives a case name or nothing. ?voice=native, ?voice=vosk or ?voice=speech picks one, for a test.
//
// Pure (no DOM): questVoiceCatalog, questVoiceGrammar, questVoiceCubePhrases, questVoiceCommand,
// questVoiceAction, questVoiceCase, questVoiceSection, questVoiceHold, questHoldTurn, questHoldWords.

// ----- the words (pure) -----
// Words the model does not know, as words it does: listenNormalize reads them back.
const QUEST_VOICE_SPELL={antisune:'anti sune',oll:'all'};
// The commands, said alone, as Vosk may hear them.
const QUEST_VOICE_COMMANDS=['stop drill','end drill','exit drill','stop drilling','again','next','next one','first','second','third'];
// The cube commands (smartCommand) as Vosk may hear them: the hold by its top color, its front color
// or both; "clear moves"; "reset"; a turn of the whole cube with a word that is no letter ("x prime",
// "turn x"): a letter alone is left out, as below.
function questVoiceCubePhrases(){
  const N=SMART_COLOR_NAMES,out=[];
  for(const c of N)out.push('top '+c,c+' top',c+' on top',c+' up','front '+c,c+' front',c+' in front',c+' toward me','bottom '+c,c+' on the bottom');
  N.forEach((u,i)=>N.forEach((f,j)=>{if(j!==i&&j!==(i+3)%6)out.push(`top ${u} front ${f}`,`${u} up ${f} front`,`${u} on top ${f} in front`);}));
  for(const a of ['x','y','z'])out.push(a+' prime',a+' two','turn '+a,'rotate '+a,a+' counterclockwise','back '+a);
  out.push('clear','clear moves','clear the moves','reset','reset cube','reset view');
  return out;
}
// The cases the drill takes: every two-look OLL and PLL case and the rest of the full PLL (no F2L).
function questVoiceCatalog(){return listenCatalog().filter(c=>c.set!=='f2l');}
// The drill's case for a catalog entry ({kind:'ll', id:'co-sune'} or {kind:'pll', id:'Ja'}).
function questVoiceCase(e){return e?questDrillFind(e.kind==='pll'?'pll-'+e.id:e.id):null;}
// The set of a drill case, oll or pll: it breaks a tie between sets.
function questVoiceSection(c){return !c?null:/^(eo|co)-/.test(c.id)?'oll':'pll';}
// Spellings in the names that are only there for a dictation's mistakes: the model has no such word.
const QUEST_VOICE_NOT_WORDS=new Set(['sooney','chamelion','camelion','cameleon']);
// Each case name as people say it, a PLL name with "perm" after it; no OLL letter alone.
function questVoiceNames(catalog){
  const out=new Set();
  for(const c of catalog)for(const s of c.say){
    if(c.set==='oll'&&s.length===1)continue;
    if(s.split(' ').some(x=>QUEST_VOICE_NOT_WORDS.has(x)))continue;
    const w=s.split(' ').map(x=>QUEST_VOICE_SPELL[x]||x).join(' ');
    out.add(c.set==='pll'?w+' perm':w);}
  return [...out];
}
// The phrases Vosk listens for: each name as people say it, a PLL name with "perm" after it, and the
// commands. '[unk]' takes everything else, so talk names nothing. A letter alone is left out: told
// a letter, Vosk hears "uh" as U. Each OLL case has a name to say instead (headlights, chameleon).
function questVoiceGrammar(catalog){
  const out=new Set(questVoiceNames(catalog));
  for(const s of QUEST_VOICE_COMMANDS)out.add(s);
  for(const s of questVoiceCubePhrases())out.add(s);
  out.add('[unk]');
  return [...out];
}
// A command, said alone: 'stop' ("stop drill", "end the drill"), 'again' ("again", "next", "one
// more"), or null. "Reset" is a cube command (smartCommand). "Stop" alone does nothing: a word misheard must not end the drill.
function questVoiceCommand(text){
  const t=String(text).toLowerCase().replace(/[’']/g,'').replace(/[^a-z ]+/g,' ').split(/\s+/)
    .filter(w=>w&&!/^(please|the|now|ok|okay|um|uh|this|that)$/.test(w)).join(' ');
  if(/^(stop|end|exit|quit|leave)( drill| drilling| drill mode)$/.test(t)||t==='drill off'||t==='drill mode off')return 'stop';
  if(/^(again|next|next one|one more|another|another one|once more)$/.test(t))return 'again';
  return null;
}
// What a sentence (with the recognizer's alternatives) asks for: {cmd}, {cube} (a cube command:
// smartCommand's {cmd:'hold'|'turn'|'clear'|'reset'|'error'}), {pick} from the choices on the
// line, or the matcher's {hit, strong, choices, ranked}, or {} for nothing. The set drilled now only
// breaks a tie: a sure name wins without it ("double sune" is the H OLL in a PLL drill too).
function questVoiceAction(texts,choices,section,catalog){
  for(const t of texts){const c=questVoiceCommand(t);if(c)return {cmd:c};}
  for(const t of texts){const c=smartCommand(t);if(c)return {cube:c};}
  if(choices)for(const t of texts){const c=listenPick(t,choices);if(c)return {pick:c};}
  const sure=listenDecide(listenRankAll(texts,catalog,null));
  if(sure&&sure.hit)return sure;
  const long=sure&&questVoiceLongest(texts,sure.choices);
  if(long)return {hit:long,strong:true,choices:null,ranked:sure.ranked};
  if(!section)return sure||{};
  return listenDecide(listenRankAll(texts,catalog,section))||sure||{};
}
// Of close choices, the one whose name was heard whole and is the longest: "double sune a" (a stray
// word after it) is the H OLL, not Sune. A PLL name counts with "perm" or without. Null for a tie.
function questVoiceLongest(texts,choices){
  let best=null,n=0,tie=false;
  for(const c of choices||[]){let m=0;
    for(const t of texts){const w=' '+listenNormalize(t)+' ';
      for(const s of c.say)for(const x of c.set==='pll'?[s+' perm',s]:[s])if(w.includes(' '+x+' '))m=Math.max(m,x.split(' ').length);}
    if(m>n){best=c;n=m;tie=false;}else if(m&&m===n)tie=true;}
  return best&&!tie?best:null;
}

// The hold a hold command names, from the hold now, as the Smart cube tab takes it: the top said
// (the top now when unsaid) and the front said, else the front now where it can stay, else the
// hold the fewest turns away (questHoldPick). Null when the front said is on top or under it.
function questVoiceHold(cmd,cur){
  cur=cur||QUEST_HOLD_FIRST;const up=cmd.up==null?cur.top:cmd.up;
  if(cmd.front!=null&&(cmd.front===up||cmd.front===(up+3)%6))return null;
  if(cmd.front!=null)return QUEST_HOLDS[QUEST_COLOR_NAMES[up]+'-'+QUEST_COLOR_NAMES[cmd.front]];
  return questHoldPick(cur,'up',up);
}
// The hold after a turn of the whole cube, as held ("x": the front comes up).
function questHoldTurn(cur,m){
  cur=cur||QUEST_HOLD_FIRST;const c=applyAlg(cur.cube,[m]).center.join();
  return Object.values(QUEST_HOLDS).find(h=>h.cube.center.join()===c)||cur;
}
function questHoldWords(h){return `${QUEST_COLOR_NAMES[h.top]} up, ${QUEST_COLOR_NAMES[h.front]} in front`;}

// ----- the microphone -----
const QUEST_VOICE_IDLE='Say a case name, such as "T perm" or "Sune", or a hold, such as "yellow up".';
// on: Drill mode listens. engine: 'speech' or 'vosk'. line and heard: what the panel and the page say.
const QV={on:false,engine:null,rec:null,model:null,modelP:null,kaldi:null,ctx:null,stream:null,node:null,src:null,
  choices:null,line:'',heard:'',catalog:null,grammar:null,loadMs:120000};
function questVoiceOn(){return QV.on;}
function questVoiceEngine(){
  const want=typeof location!=='undefined'?new URLSearchParams(location.search).get('voice'):null;
  if(want==='vosk'||want==='speech'||want==='native')return want;
  if(questVoiceNativeHere())return 'native';
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  return !R||/OculusBrowser|Quest/.test(navigator.userAgent)?'vosk':'speech';
}
// The words on the page and on the panel's last line.
function questVoiceSay(line,heard){QV.line=line||'';QV.heard=heard||'';questVoiceDraw();}
function questVoiceWords(){return QV.line+(QV.heard?' Heard: "'+QV.heard+'"':'');}
function questVoiceDraw(){const el=document.getElementById('voice');if(el){el.textContent=questVoiceWords();el.hidden=!el.textContent;}}
function questVoicePre(){return QV.on?'Listening. ':'';}

function questVoiceStart(){
  if(QV.on)return;
  QV.on=true;QV.choices=null;QV.catalog=QV.catalog||questVoiceCatalog();
  QV.engine=questVoiceEngine();
  if(QV.engine!=='native'&&typeof questInApp==='function'&&questInApp()){questVoiceSay('This Quest app does not hear case names. Install the new Twistwright Quest app, or use the Quest Browser for the voice.');return;}
  if(QV.engine==='native')questVoiceNative();else if(QV.engine==='speech')questVoiceSpeech();else questVoiceVosk();
}
function questVoiceStop(){
  QV.on=false;QV.choices=null;
  const rec=QV.rec;QV.rec=null;if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  questVoiceRelease();
  questVoiceSay('');
}
// The microphone and the audio go; the model stays, for the next drill.
function questVoiceRelease(){
  if(QV.kaldi){try{QV.kaldi.remove();}catch(e){}QV.kaldi=null;}
  if(QV.node){QV.node.onaudioprocess=null;try{QV.node.disconnect();QV.src.disconnect();}catch(e){}QV.node=QV.src=null;}
  if(QV.stream){for(const t of QV.stream.getTracks())t.stop();QV.stream=null;}
  if(QV.ctx){QV.ctx.close().catch(()=>{});QV.ctx=null;}
}

// The browser's own recognizer: on until Drill mode ends, again after each quiet spell.
function questVoiceSpeech(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition,rec=new R();QV.rec=rec;
  rec.lang='en-US';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=5;
  rec.onresult=ev=>{
    for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i],alts=[];
      for(let j=0;j<r.length;j++){const t=(r[j].transcript||'').trim();if(t)alts.push(t);}
      if(!alts.length)continue;
      if(r.isFinal)questVoiceHeard(listenFresh(alts,0));else questVoiceSay(questVoicePre()+'Heard so far.',alts[0]);}};
  rec.onerror=e=>{
    if(QV.rec!==rec)return;
    if(e.error==='not-allowed'||e.error==='service-not-allowed'){QV.rec=null;rec.onend=null;questVoiceSay('The microphone is blocked. Allow it for this page in the browser settings, then start Drill mode again.');return;}
    if(e.error==='network'||e.error==='language-not-supported'){QV.rec=null;rec.onend=null;try{rec.stop();}catch(x){}QV.engine='vosk';questVoiceVosk();}};
  rec.onend=()=>{if(QV.on&&QV.rec===rec)setTimeout(()=>{if(QV.on&&QV.rec===rec)try{rec.start();}catch(e){}},250);};
  try{rec.start();}catch(e){QV.rec=null;QV.engine='vosk';questVoiceVosk();return;}
  questVoiceSay(questVoicePre()+QUEST_VOICE_IDLE);
}

// The Quest app's recognizer (quest/spatial/, QuestSpeech.kt): the headset's own speech service,
// through Android's SpeechRecognizer. window.TwistwrightSpeech.start(json) asks for the microphone
// the first time and listens until stop(), again after each sentence; it answers 'ok', or 'none'
// with no speech service. The app sends each event to window.questSpeechEvent: {type: 'ready'
// (listening), 'partial' or 'final' with texts (the alternatives, the likeliest first), 'blocked'
// (no microphone), 'error' with msg}. The options bias it toward the case names and the commands.
function questVoiceNativeHere(){return typeof window!=='undefined'&&!!window.TwistwrightSpeech&&typeof window.TwistwrightSpeech.start==='function';}
function questVoiceBias(catalog){
  const out=new Set([...questVoiceNames(catalog),...QUEST_VOICE_COMMANDS]);
  for(const s of ['clear moves','reset','yellow up','white up','green front','x prime','y prime','z prime'])out.add(s);
  return [...out];
}
function questVoiceNative(){
  const S=window.TwistwrightSpeech,rec={ready:false,stop(){try{S.stop();}catch(e){}}};QV.rec=rec;
  window.questSpeechEvent=ev=>{
    if(!QV.on||QV.rec!==rec||!ev)return;
    const texts=(ev.texts||[]).map(t=>String(t).trim()).filter(Boolean);
    // 'ready' comes before each sentence: only the first one changes the line
    if(ev.type==='ready'){if(!rec.ready){rec.ready=true;questVoiceSay(questVoicePre()+QUEST_VOICE_IDLE);}}
    else if(ev.type==='partial'&&texts.length)questVoiceSay(questVoicePre()+'Heard so far.',texts[0]);
    else if(ev.type==='final'&&texts.length)questVoiceHeard(listenFresh(texts,0));
    else if(ev.type==='blocked'){QV.rec=null;questVoiceSay('The microphone is blocked. Allow it for Twistwright in the headset settings, then start Drill mode again.');}
    else if(ev.type==='error')questVoiceSay(questVoicePre()+'The voice stopped: '+(ev.msg||'no reason given')+'. It starts again by itself.');
  };
  let r='none';try{r=S.start(JSON.stringify({lang:'en-US',bias:questVoiceBias(QV.catalog)}));}catch(e){}
  if(r!=='ok'){QV.rec=null;questVoiceSay('This headset gives the app no speech service. The drill works without voice.');return;}
  questVoiceSay('Asking for the microphone.');
}

// Vosk: the microphone through the page's audio, to a recognizer told the phrases.
function questVoiceScript(src){
  return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('no '+src));document.head.appendChild(s);});
}
async function questVoiceVosk(){
  const url=new URL('voice/model.tar.gz',location.href).href;
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Object.assign(new Error('no microphone here'),{why:'mic'});
    questVoiceSay('Asking for the microphone.');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
    if(!QV.on){for(const t of stream.getTracks())t.stop();return;}
    QV.stream=stream;
    if(!QV.model){
      if(!window.Vosk){
        const h=await fetch(url,{method:'HEAD'}).catch(()=>null);
        if(h&&h.status===404)throw Object.assign(new Error('no model'),{why:'model'});
        questVoiceSay('Loading the speech recognizer.');
        await questVoiceScript(new URL('voice/vosk.js',location.href).href).catch(()=>{throw Object.assign(new Error('no vosk.js'),{why:'model'});});}
      questVoiceSay('Loading the speech model. The first time takes a while.');
      QV.modelP=QV.modelP||window.Vosk.createModel(url);
      const late=new Promise((r,j)=>setTimeout(()=>j(Object.assign(new Error('the model did not load'),{why:'slow'})),QV.loadMs));
      QV.model=await Promise.race([QV.modelP,late]);
      if(!QV.on)return questVoiceRelease();}
    const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();QV.ctx=ctx;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    QV.grammar=QV.grammar||questVoiceGrammar(QV.catalog);
    const kaldi=new QV.model.KaldiRecognizer(ctx.sampleRate,JSON.stringify(QV.grammar));QV.kaldi=kaldi;
    kaldi.on('result',m=>{if(QV.kaldi!==kaldi)return;const t=questVoiceClean(m.result&&m.result.text);if(t)questVoiceHeard([t]);});
    kaldi.on('partialresult',m=>{if(QV.kaldi!==kaldi)return;const t=questVoiceClean(m.result&&m.result.partial);if(t)questVoiceSay(questVoicePre()+'Heard so far.',t);});
    const src=ctx.createMediaStreamSource(stream),node=ctx.createScriptProcessor(4096,1,1);
    node.onaudioprocess=e=>{if(QV.kaldi===kaldi)try{kaldi.acceptWaveform(e.inputBuffer);}catch(x){}};
    src.connect(node);node.connect(ctx.destination); // a script node runs only while it is joined to the output; it outputs silence
    QV.src=src;QV.node=node;
    questVoiceSay(questVoicePre()+QUEST_VOICE_IDLE);
  }catch(e){
    questVoiceRelease();if(!QV.on)return;
    const why=e.why||(e.name==='NotAllowedError'||e.name==='SecurityError'?'blocked':'');
    questVoiceSay(why==='blocked'?'The microphone is blocked. Allow it for this page in the browser settings, then start Drill mode again.':
      why==='model'?'No speech model here. On the Mac, run quest/run.sh (or node scripts/quest-voice.js), then reload.':
      why==='slow'?'The speech model did not load. Stop the drill and start it again.':
      why==='mic'?'This browser gives no microphone. The drill works without voice.':'Voice did not start: '+e.message);
  }
}
// Vosk's text with what it could not name taken out.
function questVoiceClean(t){return String(t||'').replace(/\[unk\]/g,' ').replace(/\s+/g,' ').trim();}

// A final sentence, with the recognizer's alternatives: a command, a pick or a case name acts.
function questVoiceHeard(texts){
  if(!QV.on||!texts.length)return;
  const heard=texts[0],a=questVoiceAction(texts,QV.choices,questVoiceSection(qs.drill&&qs.drill.c),QV.catalog);
  if(a.cmd==='stop'){questDrillMode(false);return;}
  if(a.cube){questVoiceSay(questVoicePre()+questVoiceCube(a.cube),heard);return;}
  if(a.cmd==='again'){if(qs.drill)questDrillAgain();questVoiceSay(questVoicePre()+(qs.drill?qs.drill.c.name+' again.':QUEST_VOICE_IDLE),heard);return;}
  const e=a.pick||a.hit;
  if(e){const c=questVoiceCase(e);QV.choices=null;
    if(c){if(qs.drill&&qs.drill.c.id===c.id)questDrillAgain();else questDrill(c.id);
      questVoiceSay(questVoicePre()+'Drilling '+c.name+'.',heard);return;}}
  if(a.choices){QV.choices=a.choices;
    questVoiceSay(questVoicePre()+'Which one? '+a.choices.map(c=>c.hint||c.name).join(', or ')+'.',heard);return;}
  questVoiceSay(questVoicePre()+'No case name heard. '+QUEST_VOICE_IDLE,heard);
}
// A cube command, done: the hold, a turn of the whole cube, "clear moves", "reset". Returns the
// words for the line.
function questVoiceCube(cmd){
  if(cmd.cmd==='error')return cmd.msg;
  if(cmd.cmd==='clear'){if(!qs.moves.length)return 'No moves to clear.';questClear();return 'The moves are cleared.';}
  if(cmd.cmd==='reset'){
    const live=qs.tilt&&!!qs.raw;if(live)questLevel();
    if(qs.drill)questDrillAgain();else questClear();
    return (qs.drill?`Reset. ${qs.drill.c.name} again`:'Reset. The moves are cleared')+(live?', and the picture is lined up with your cube.':'.');}
  const h=cmd.cmd==='turn'?questHoldTurn(qs.hold,cmd.m):questVoiceHold(cmd,qs.hold);
  if(!h){const up=cmd.up==null?qs.hold.top:cmd.up;return `${smartCap(QUEST_COLOR_NAMES[cmd.front])} cannot face you with ${QUEST_COLOR_NAMES[up]} on top.`;}
  if(cmd.cmd==='hold'&&h.id===qs.hold.id)return `Already held ${questHoldWords(h)}.`;
  questHoldSet(h);
  return (cmd.cmd==='turn'?`Turned ${cmd.m}. `:'')+`Held ${questHoldWords(h)}.`+(qs.drill?` ${qs.drill.c.name} is set up that way.`:'');
}
