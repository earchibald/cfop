// Listen: the page hears a case name and shows its algorithm, one move per second.
//
// The Listen button on the Reference section (the phone and the desktop) turns the microphone on (the browser asks once). A
// hold on the button listens once, while it is held: a short sentence is what the phone's recognizer
// is built for. The page listens through the browser's speech recognition. When it hears a case name
// ("T perm", "Sune", "G a perm", "F2L 12", "twelve"), the case window opens, as a tap on the row's picture
// opens it, with its moves covered. A tap on the line uncovers the next move. The window keeps listening:
// the next name swaps it for that case; the same name again covers its moves again; Close ends the
// listening a hold began. A strip at the top of the window says what was heard, asks between close cases,
// carries Not this and shows three commands for the moves of the open window, said or tapped: "play
// moves" uncovers them one per second, "reveal moves" all at once, "hide moves" covers them all again
// (listenCommand, listenMoves).
//
// The recognizer is a dictation model: it cannot be told the case names, so it hears "tea perm",
// "soon", "you be perm" and "all" for OLL. The matcher reads a sentence in three parts: an anchor word
// ("perm", "OLL", "F2L", a number), the name words, and talk around them ("show me the"). It then
// scores every case against the name words: the same word costs 0, a letter the recognizer swaps for
// another (T for D, E, G) costs a little, a word that sounds alike ("soon" for Sune, by listenKey)
// costs a little, an extra word costs more, a missing word more still. The anchor rules out the other
// sets; without one, the section in view breaks a tie ("T" in the OLL part is the T OLL). In a noisy room
// the recognizer puts talk in the sentence, so the matcher finds the name inside it: a name inside talk
// counts when an anchor touches it ("so I told him T perm") or it is no everyday word ("Sune"); a letter
// or a number in ordinary talk names nothing. Such a strong name acts on an early guess, before the
// sentence ends, and only the new end of a long result is read. A weak name (a letter or a number said
// alone) does not change an open window: it asks, and the same name again shows it. A sure
// winner shows at once. Close scores show the choices as chips: a tap or the next word ("second", "the
// perm", "G a") picks one. Not this, on the window, marks a miss and offers the runners-up. What the
// phone heard, what was shown and the misses go to cw:listenLog; the Settings window copies it.
// Each row of the Reference (both layouts) carries the shortest name that works ("Say: T perm"). Chrome with
// on-device recognition is told every name as a phrase to favor (SpeechRecognitionPhrase).
//
// The matcher and the commands are pure (no DOM) and live in js/listen-match.js, which loads first.

// ----- the microphone and the card -----
// card: the listening began for the window and ends with it. wantCard: a hold found a case; listen on when it ends.
const LISTEN={on:false,hold:false,card:false,wantCard:false,rec:null,entry:null,timer:null,ms:1000,wake:null,catalog:null,choices:null,last:null,local:false,section:undefined,used:{},pend:null};
function listenSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
// The section of the Reference page in view: oll, pll, f2l, or null above the first. On the desktop the two-look
// OLL and PLL stand side by side, so only the full PLL and the F2L lists name a section. A test sets LISTEN.section.
function listenSection(){if(LISTEN.section!==undefined)return LISTEN.section;
  const top=$('.top');const off=(top?top.getBoundingClientRect().height:0)+20;let cur=null;
  const marks=mobileMQ.matches?[['mg-ollE','oll'],['mg-ollC','oll'],['mg-pllC','pll'],['mg-pllE','pll'],['mg-pll','pll'],['mg-f2l','f2l']]:[['foldPLL','pll'],['foldF2L','f2l']];
  for(const [id,set] of marks){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top-off<=0)cur=set;}
  return cur;}
// The strip at the top of the case window: what was heard, Not this, the two commands as buttons, and the choices.
function listenStrip(){return document.getElementById('listenStrip');}
// Show the case: the case window opens with its moves covered, and the strip goes in. "Play moves" uncovers them
// one per second. A window a hold opened keeps listening once the hold's recognizer ends.
function listenShow(e){LISTEN.entry=e;LISTEN.choices=null;clearTimeout(LISTEN.timer);$('#listenCard').classList.add('hidden');
  listenSwapOut();modalNext=null;listenOpen(e);
  const col=document.querySelector(mobileMQ.matches?'#modalBg .modal > div:not(.pic)':'#modalBg .modal > div:not(.picwrap)');if(!col)return; // the top of the sheet; on the desktop, of the text beside the picture
  const strip=document.createElement('div');strip.className='listen-strip';strip.id='listenStrip';
  strip.innerHTML=`<span class="listen-dot"></span><span id="listenModalState"></span><button type="button" class="small ghost listen-not" title="This is not the case I said: show the other cases it could be">Not this</button><span class="listen-cmds"><span class="muted">Say or tap:</span><button type="button" class="small" data-cmd="play" title="Uncover the moves one per second. You can also say &quot;play moves&quot;">play moves</button><button type="button" class="small" data-cmd="reveal" title="Show every move now. You can also say &quot;reveal moves&quot;">reveal moves</button><button type="button" class="small" data-cmd="hide" title="Cover every move again. You can also say &quot;hide moves&quot;">hide moves</button></span><span id="listenModalAsk" class="listen-ask"></span>`;
  strip.querySelector('.listen-not').onclick=()=>listenNotThis(e);
  strip.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>listenMoves(b.dataset.cmd)); // the commands, shown so people know them, and a tap does the same
  col.insertBefore(strip,col.firstChild);strip.classList.toggle('on',LISTEN.on);
  listenState($('#listenState').textContent,$('#listenHeard').textContent);
  if(!LISTEN.on){if(LISTEN.hold)LISTEN.wantCard=true;else listenStart(false,true);}}
// An open window goes away for the next one with no step back in the history: the next window takes its place there.
function listenSwapOut(){const b=document.getElementById('modalBg');if(!b)return;b.remove();document.removeEventListener('keydown',escClose);window.removeEventListener('popstate',popClose);}
// "Play moves": uncover the next covered move of the window each second. A tap on the line uncovers one at once (app.js) and the timer goes on.
function listenReveal(){clearTimeout(LISTEN.timer);const s=document.querySelector('#modalBg .algbig .spoil');
  if(!s||document.body.classList.contains('refall')||!s.querySelector('.sp-m:not(.on)'))return;
  LISTEN.timer=setTimeout(()=>{const t=document.querySelector('#modalBg .algbig .spoil');if(t===s&&s.querySelector('.sp-m:not(.on)'))spoilStep(s);listenReveal();},LISTEN.ms);}
// The commands for the moves of the open window: 'play' uncovers them one per second, from the moves shown on, or
// from the start when every move shows; 'reveal' uncovers them all at once; 'hide' covers them all again. Reveal
// and hide stop the play. A tap on the line still uncovers the next move. The next case opens covered.
function listenMoves(cmd){const pre=listenPre(),s=document.querySelector('#modalBg .algbig .spoil');
  if(!document.getElementById('modalBg')){listenState(pre+`Say a case name first, then "${cmd} moves".`);return;}
  if(!s){listenState(pre+'This window shows every move.');return;}
  clearTimeout(LISTEN.timer);
  if(cmd!=='reveal'&&document.body.classList.contains('refall')){listenState(pre+'Show all moves is on. Turn it off on the Reference page to cover the moves.');return;}
  if(cmd==='reveal'){s.querySelectorAll('.sp-m:not(.on)').forEach(m=>m.classList.add('on'));spoilSync(s);listenState(pre+'All moves shown.');}
  else if(cmd==='play'){if(!s.querySelector('.sp-m:not(.on)'))spoilReset(s);listenReveal();listenState(pre+'Playing the moves, one per second.');}
  else{spoilReset(s);listenState(pre+'Moves hidden. Say "play moves" or "reveal moves", or tap the line for the next move.');}}
// The window covers the algorithm on both layouts, for the commands.
function listenOpen(e){const o=e.kind==='ll'?modalForLL(LL_ALL.find(a=>a.id===e.id)):e.kind==='pll'?modalForPLL(PLL_FULL.find(p=>p.name===e.id)):modalForF2L(F2L_CASES.find(f=>f.n===+e.id));o.spoil=true;openCaseModal(o);}
// The choices as chips, in the window's strip while a window is open, else in the panel. A tap picks one; so does the next sentence, through listenPick.
function listenAsk(choices){LISTEN.choices=choices;
  const html=choices.map((c,i)=>`<button type="button" class="small" data-i="${i}" title="Show this case">${esc(c.name)}</button>`).join('');
  let box=document.getElementById('listenModalAsk');
  if(box)box.innerHTML=html; // the strip's text asks
  else{clearTimeout(LISTEN.timer);const card=$('#listenCard');card.innerHTML=`<div class="listen-ask"><span class="muted">Which one?</span>${html}</div>`;card.classList.remove('hidden');$('#listenPanel').classList.add('pinned');box=card;}
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const c=choices[+b.dataset.i];listenLogAdd({picked:c.id});listenShow(c);listenState(listenPre()+'Showing '+c.name+'.');});}
// Not this: the shown case was a miss. Log it; offer the runners-up, if the last match had any.
function listenNotThis(e){listenLogMark();
  const others=((LISTEN.last&&LISTEN.last.ranked)||[]).map(r=>r.entry).filter(c=>c!==e).slice(0,4);
  if(others.length){listenAsk(others);listenState(listenPre()+'Which one?');}
  else listenState(listenPre()+'Say it again, or tap the case in the list.');}
function listenPre(){return LISTEN.on?'Listening. ':'';}
// The state goes under the button, and to the strip of an open window.
function listenState(msg,heard){$('#listenState').textContent=msg;$('#listenHeard').textContent=heard||'';
  const ms=document.getElementById('listenModalState');if(ms)ms.textContent=msg+(heard?' '+heard:'');}
// What the phone heard and what came of it, kept for tuning: cw:listenLog, the last 200.
function listenLogAdd(o){const log=store.get('listenLog',[]);log.push({t:Date.now(),...o});while(log.length>200)log.shift();store.set('listenLog',log);}
function listenLogMark(){const log=store.get('listenLog',[]);if(!log.length)return;log[log.length-1].wrong=true;store.set('listenLog',log);}
function listenLogText(){return store.get('listenLog',[]).map(o=>`${new Date(o.t).toISOString()}\t${(o.heard||[]).join(' | ')}\t${o.command?'command '+o.command:o.hit?'shown '+o.hit:o.picked?'picked '+o.picked:o.choices?'asked '+o.choices.join(', '):'none'}${o.early?'\tearly':''}${o.wrong?'\tWRONG':''}`).join('\n');}
function listenLogClear(){store.set('listenLog',[]);}
// What a sentence (with the recognizer's alternatives) asks for: a {command} for the open window, {pick} from
// the choices on the screen, or listenDecide's {hit, strong, choices, ranked}, or {} for nothing.
function listenAction(alts){LISTEN.catalog=LISTEN.catalog||listenCatalog();
  for(const a of alts){const c=listenCommand(a);if(c)return {command:c};}
  if(LISTEN.choices){for(const a of alts){const c=listenPick(a,LISTEN.choices);if(c)return {pick:c};}}
  return listenDecide(listenRankAll(alts,LISTEN.catalog,listenSection()))||{};}
// Do what a sentence asks for. A sure winner shows. A weak one (a letter or a number said alone) does not
// change an open window: it asks, and the same name again shows it. Close scores ask. Early: an early
// result acts only for a pick or a strong name, and says nothing else. The case shown, or null.
function listenDo(a,alts,early){const pre=listenPre(),ex=early?{early:true}:{}; // listenShow may start the listening: the word comes after it
  if(a.command){listenLogAdd({heard:alts,command:a.command,...ex});listenMoves(a.command);return null;}
  if(a.pick){listenLogAdd({heard:alts,picked:a.pick.id,...ex});listenShow(a.pick);listenState(listenPre()+'Heard '+a.pick.name+'.');return a.pick;}
  const again=a.hit&&LISTEN.choices&&LISTEN.choices.length===1&&LISTEN.choices[0]===a.hit;
  if(a.hit&&(a.strong||again||(!early&&!listenStrip()))){LISTEN.last={heard:alts,ranked:a.ranked};listenLogAdd({heard:alts,hit:a.hit.id,...ex});listenShow(a.hit);listenState(listenPre()+'Heard '+a.hit.name+'.');return a.hit;}
  if(early)return null;
  const ch=a.hit?[a.hit]:a.choices;
  if(ch){LISTEN.last={heard:alts,ranked:a.ranked};listenLogAdd({heard:alts,choices:ch.map(c=>c.id)});listenAsk(ch);listenState(pre+(a.hit?'Is it this one? Say it again, or tap it.':'Which one?'),'Heard: '+alts[0]);}
  else if(LISTEN.choices)listenState(pre+'Which one? Say the name again, or tap one.','Heard: '+alts[0]);
  else{listenLogAdd({heard:alts,hit:null});listenState(pre+'No case is called that.','Heard: '+alts[0]);}
  return null;}
// A final sentence, with the recognizer's alternatives.
function listenHeard(alts){return listenDo(listenAction(alts),alts,false);}
// A result from the recognizer. In constant talk the final guess comes late or not at all, so an early
// guess acts too: a pick, or a strong name ("T perm", "Sune"), the same in two early guesses in a row.
// A weak early guess only shows what was heard: "tea" would name the OLL T before "T perm" arrives. The
// words a match used are not read again (LISTEN.used, by result). The words after a match may change it:
// "U perm", then "B", is the U b perm. The same name said again in a new sentence plays it again.
function listenResult(ev){
  for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i];const alts=[];
    for(let j=0;j<r.length;j++){const t=(r[j].transcript||'').trim();if(t)alts.push(t);}
    if(!alts.length)continue;
    const u=LISTEN.used[i]||{n:0},fresh=listenFresh(alts,u.n);
    if(!fresh.length)continue;
    let a=listenAction(fresh),said=fresh;
    if(u.text&&!a.pick&&!a.hit){const both=fresh.map(f=>u.text+' '+f),b=listenAction(both);if(b.hit&&b.strong&&b.hit!==u.entry){a=b;said=both;}}
    if(!r.isFinal){listenState(listenPre()+'Heard so far.','Heard: '+fresh[0]);
      const key=a.command?'c:'+a.command:a.pick?'p:'+a.pick.id:a.hit&&a.strong?'h:'+a.hit.kind+':'+a.hit.id:null;
      const ready=key&&LISTEN.pend&&LISTEN.pend.i===i&&LISTEN.pend.key===key;LISTEN.pend=key&&!ready?{i,key}:null;
      if(!ready)continue;}
    else{LISTEN.pend=null;if(u.entry&&!a.command&&!a.pick&&!a.hit)continue;} // the rest of a sentence that named a case: talk
    const e=listenDo(a,said,!r.isFinal),n=alts[0].split(/\s+/).filter(Boolean).length;
    if(e)LISTEN.used[i]={n,text:said[0],entry:e};else if(a.command)LISTEN.used[i]={n,text:'',entry:u.entry||null};}}
// Chrome with on-device recognition takes the names as phrases to favor. Safari and Android take none.
function listenBias(rec){if(!LISTEN.local||typeof window.SpeechRecognitionPhrase!=='function'||!('phrases' in rec))return;
  try{LISTEN.catalog=LISTEN.catalog||listenCatalog();const ph=[];
    for(const c of LISTEN.catalog){if(c.set==='f2l')continue;for(const s of c.say)ph.push(new SpeechRecognitionPhrase(c.set==='pll'?s+' perm':s,3));}
    for(const s of ['play moves','reveal moves','hide moves'])ph.push(new SpeechRecognitionPhrase(s,3));
    rec.processLocally=true;rec.phrases=ph;}catch(e){}}
function listenButton(){const b=$('#listenBtn');b.textContent=LISTEN.on?'Stop':LISTEN.hold?'Let go when done':'Listen';b.classList.toggle('on',LISTEN.on||LISTEN.hold);b.setAttribute('aria-pressed',LISTEN.on?'true':'false');
  const s=listenStrip();if(s)s.classList.toggle('on',LISTEN.on);}
// Start the recognizer: on until Stop, or once, for one sentence while the button is held. With card, it
// listens for the open case window and ends when the window closes.
function listenStart(once,card){
  if(!listenSupported()){listenState('This browser cannot listen. Use Safari or Chrome.');return;}
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;const rec=new R();LISTEN.rec=rec;LISTEN.used={};LISTEN.pend=null;LISTEN.on=!once;LISTEN.hold=!!once;LISTEN.card=!once&&!!card;
  rec.lang='en-US';rec.continuous=!once;rec.interimResults=true;rec.maxAlternatives=5;
  listenBias(rec);
  rec.onresult=listenResult;
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){listenStop();listenState('The microphone is blocked. Allow it for this site in the browser settings.');}};
  rec.onend=()=>{if(LISTEN.rec!==rec)return;
    if(once){LISTEN.rec=null;LISTEN.hold=false;listenButton();if(/^Say the case name/.test($('#listenState').textContent))listenState('Nothing heard. Hold the button and say a case name.');
      if(LISTEN.wantCard){LISTEN.wantCard=false;if(listenStrip())listenStart(false,true);}return;}
    if(LISTEN.on)setTimeout(()=>{if(LISTEN.on&&LISTEN.rec===rec)try{LISTEN.used={};LISTEN.pend=null;rec.start();}catch(e){}},250);}; // the phone stops on its own after a quiet spell
  try{rec.start();}catch(e){LISTEN.on=false;LISTEN.hold=false;LISTEN.card=false;LISTEN.rec=null;listenButton();listenState('The microphone did not start. Try again.');return;}
  listenButton();
  listenState(once?'Say the case name, then let go.':card?'Listening. Say another case to change the card.':'Listening. Say a case name.');
  if(!once&&navigator.wakeLock)navigator.wakeLock.request('screen').then(l=>{LISTEN.wake=l;}).catch(()=>{}); // keep the screen on while it listens
}
// The words under the button at rest. In a noisy room a hold is best: the microphone hears only what is said while the button is down.
function listenIdle(){return (mobileMQ.matches?'Tap':'Click')+' to listen, or hold and say a case name, such as "T perm" or "Sune". A case opens with its moves covered: say "play moves" or "reveal moves". In a noisy room, hold the button while you speak.';}
function listenStop(){LISTEN.on=false;LISTEN.hold=false;LISTEN.card=false;LISTEN.wantCard=false;const rec=LISTEN.rec;LISTEN.rec=null;if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  if(LISTEN.wake){LISTEN.wake.release().catch(()=>{});LISTEN.wake=null;}
  listenButton();
  listenState(listenIdle());}
function listenToggle(){if(LISTEN.on)listenStop();else listenStart(false);}
// The button let go after a hold: the recognizer stops and gives its final sentence.
function listenRelease(){const rec=LISTEN.rec;if(LISTEN.hold&&rec)try{rec.stop();}catch(e){}}
// A tap toggles. A hold of 300 ms listens once, until the button is let go; the click after it does nothing.
(function(){const b=$('#listenBtn');let t=null,held=false;
  b.addEventListener('pointerdown',e=>{if(e.button)return;held=false;clearTimeout(t);if(LISTEN.on||LISTEN.hold)return;t=setTimeout(()=>{held=true;listenStart(true);},300);});
  const up=()=>{clearTimeout(t);t=null;if(held)listenRelease();};
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
  b.addEventListener('click',()=>{if(held){held=false;return;}listenToggle();});
  b.addEventListener('contextmenu',e=>e.preventDefault());})();
// The case window closes: the reveal stops, and so does the listening that began for the window.
new MutationObserver(()=>{if(document.getElementById('modalBg'))return;clearTimeout(LISTEN.timer);LISTEN.wantCard=false;if(LISTEN.card)listenStop();}).observe(document.body,{childList:true});
// Each row of the Reference carries the shortest name that works: the phone rows, the desktop cards and the rows
// of the full PLL and F2L tables. The phone rows are drawn again when the cross color changes, so the labels go on
// after every draw.
function listenLabelRows(){LISTEN.catalog=LISTEN.catalog||listenCatalog();
  for(const row of document.querySelectorAll('#refMobileCases .mrow, #refDesktop .ref-row')){const nm=row.querySelector('.nm')||row.querySelector('td:nth-child(2)');if(!nm||nm.querySelector('.say'))continue;
    const k=row.dataset.kind,id=row.dataset.id; // a full PLL row of a two-look case (T, Y, H, Z, Ua, Ub) carries that case's name
    const c=LISTEN.catalog.find(c=>c.kind===k&&String(c.id)===id)||(k==='pll'&&LISTEN.catalog.find(c=>c.kind==='ll'&&c.id==='pll-'+id));if(!c)continue;
    const s=document.createElement('span');s.className='say';s.title='Say this to Listen';s.textContent='Say "'+c.hint+'"';nm.appendChild(s);}}
if(typeof renderMobileRef==='function'){const draw=renderMobileRef;renderMobileRef=function(){draw.apply(this,arguments);listenLabelRows();};}
listenLabelRows();
// One Listen panel for both layouts: under the first panel of the Reference page in use, moved when the layout changes.
function listenPlace(){const p=$('#listenPanel'),host=$(mobileMQ.matches?'#refMobile > .panel':'#refDesktop > .panel');if(!p||!host)return;
  if(host.nextElementSibling!==p)host.after(p);
  if(!LISTEN.on&&!LISTEN.hold&&/^(Tap|Click) to listen/.test($('#listenState').textContent))listenState(listenIdle());}
listenPlace();
if(mobileMQ.addEventListener)mobileMQ.addEventListener('change',listenPlace);else if(mobileMQ.addListener)mobileMQ.addListener(listenPlace);
document.body.classList.toggle('can-listen',listenSupported());
// Is on-device recognition there, for the phrases? Asked once; Chrome on a desktop says yes, phones say no.
(function(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R||typeof R.available!=='function')return;
  try{R.available({langs:['en-US'],processLocally:true}).then(v=>{LISTEN.local=v==='available';}).catch(()=>{});}catch(e){}})();
// The screen lock lapses when the page is hidden; take it again when the page comes back.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&LISTEN.on&&navigator.wakeLock&&!LISTEN.wake)navigator.wakeLock.request('screen').then(l=>{LISTEN.wake=l;}).catch(()=>{});});
