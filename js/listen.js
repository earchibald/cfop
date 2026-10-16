// Listen: the phone hears a case name and shows its algorithm, one move per second.
//
// The Listen button on the phone Reference section turns the microphone on (the browser asks once).
// The page listens through the browser's speech recognition. When it hears a case name ("T perm",
// "Sune", "G a perm", "F2L 12"), the card at the top of the section shows that case with every move
// covered, then uncovers one move per second. A tap on the card uncovers the next move at once. The
// card stays until the next name; the same name again plays the reveal again.
//
// listenCatalog(), listenNormalize(text) and listenMatch(text, catalog) are pure (no DOM).

// The words a recognizer gives for a letter said alone, and the words it gives for "perm".
const LISTEN_WORDS={tea:'t',tee:'t',you:'u',yu:'u',why:'y',jay:'j',are:'r',ar:'r',zed:'z',zee:'z',bee:'b',be:'b',eh:'a',ay:'a',see:'c',sea:'c',gee:'g',jee:'g',
  ef:'f',eff:'f',em:'m',en:'n',vee:'v',aitch:'h',age:'h',oh:'o',ell:'l',el:'l',pee:'p',
  perms:'perm',permutation:'perm',permutations:'perm',pll:'perm',pie:'pi',pies:'pi',two:'2',to:'2',too:'2'};
// A number said in words, 1 to 41, for the F2L cases.
const LISTEN_ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const LISTEN_TENS={twenty:20,thirty:30,forty:40};
// Lower case, letters and digits only, each spoken letter as its letter, "f 2 l" as "f2l", numbers as digits.
function listenNormalize(text){
  let t=String(text).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(!t)return '';
  const out=[];let tens=0;
  for(const w0 of t.split(' ')){
    const w=LISTEN_WORDS[w0]||w0;
    const one=LISTEN_ONES.indexOf(w);
    if(LISTEN_TENS[w]){tens=LISTEN_TENS[w];continue;}
    if(tens){if(one>0&&one<10){out.push(String(tens+one));tens=0;continue;}out.push(String(tens));tens=0;}
    if(one>=0){out.push(String(one));continue;}
    out.push(w);}
  if(tens)out.push(String(tens));
  return (' '+out.join(' ')+' ').replace(/ f ?2 ?l /g,' f2l ').replace(/ anti ?(sune|soon|sooner|sunny|sunni|suna|sun) /g,' antisune ').replace(/ bow tie /g,' bowtie ')
    .replace(/ head lights /g,' headlights ').replace(/ sue (nay|ney|knee|nee) /g,' sune ').replace(/\s+/g,' ').trim();}

// The names of the OLL and PLL cases as people say them, by case id, in normalized form. A letter alone
// names an OLL case only where the letter is not a word a recognizer hears often ("you" is u, so Headlights).
const LISTEN_SAY={
  'eo-dot':['dot','dot oll','no edges','oll dot'],
  'eo-L':['l shape','small l','l oll edges'],
  'eo-line':['line','bar','line oll','oll line'],
  'co-sune':['sune','soon','sooner','sunny','sunni','suna','sune oll'],
  'co-antisune':['antisune','antisune oll'],
  'co-H':['h','h oll','oll h','double sune','double soon'],
  'co-pi':['pi','pi oll','oll pi','bruno'],
  'co-L':['l','l oll','oll l','bowtie'],
  'co-T':['t','t oll','oll t','chameleon'],
  'co-U':['u oll','oll u','headlights','head lights'],
  'pll-T':['t perm','perm t'],'pll-Y':['y perm','perm y'],
  'pll-Ua':['u a perm','u perm a','ua perm','u perm','perm u a'],'pll-Ub':['u b perm','u perm b','ub perm','perm u b'],
  'pll-H':['h perm','perm h'],'pll-Z':['z perm','perm z'],
};
// Every case a phone can ask for: the two-look cases, the rest of the full PLL, the F2L cases by number.
// Each entry: {kind, id, name, alg, say}, with kind and id as the Reference tiles carry them.
function listenCatalog(){
  const out=[];
  for(const a of [...ALG_DB.eo,...ALG_DB.co,...ALG_DB.cp,...ALG_DB.ep])out.push({kind:'ll',id:a.id,name:a.name,alg:a.alg,say:LISTEN_SAY[a.id]||[]});
  for(const p of PLL_FULL){if(out.some(o=>o.id==='pll-'+p.name))continue;
    const x=p.name[0].toLowerCase(),s=p.name[1]||'';
    const say=s?[`${x} ${s} perm`,`${x} perm ${s}`,`${x}${s} perm`,`perm ${x} ${s}`]:[`${x} perm`,`perm ${x}`];
    if(s==='a')say.push(`${x} perm`); // "J perm" alone is the a case
    out.push({kind:'pll',id:p.name,name:p.name+' perm',alg:p.alg,say});}
  for(const f of F2L_CASES)out.push({kind:'f2l',id:f.n,name:'F2L case #'+f.n,alg:f.alg,say:[`f2l ${f.n}`,`f2l case ${f.n}`,`case ${f.n}`,`f2l number ${f.n}`]});
  return out;}
// The catalog entry a sentence names, or null. The longest name wins ("anti sune" over "sune", "t perm" over "t").
function listenMatch(text,catalog){
  const t=' '+listenNormalize(text)+' ';let best=null,len=0;
  for(const c of catalog)for(const s of c.say){if(s.length<=len)continue;if(t.indexOf(' '+s+' ')>=0){best=c;len=s.length;}}
  return best;}

// ----- the microphone and the card -----
const LISTEN={on:false,rec:null,entry:null,timer:null,ms:1000,wake:null,catalog:null};
function listenSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
function listenUnits(alg){const t=alg.trim().split(/\s+/),units=[];let rot=[];
  for(const m of t){rot.push(m);if(!isRot(m)){units.push(rot.join(' '));rot=[];}} // a rotation goes with the turn after it
  if(rot.length){if(units.length)units[units.length-1]+=' '+rot.join(' ');else units.push(rot.join(' '));}
  return units;}
// The card's markup. Names and moves come from the algorithm database, through esc.
function listenCardHTML(e){return `<button type="button" class="listen-nm" title="Open details">${esc(e.name)}</button><div class="listen-alg" title="Tap to show the next move">${listenUnits(e.alg).map(u=>`<span class="sp-m">${esc(u)}</span>`).join(' ')}</div>`;}
// Show the case: every move covered, then one more each second.
function listenShow(e){LISTEN.entry=e;clearTimeout(LISTEN.timer);
  const card=$('#listenCard');card.innerHTML=listenCardHTML(e);card.classList.remove('hidden');$('#listenPanel').classList.add('pinned');
  card.querySelector('.listen-nm').onclick=()=>listenOpen(e);
  card.querySelector('.listen-alg').onclick=()=>listenReveal();
  listenReveal();}
// Uncover the next move. The timer uncovers one per second; a tap uncovers one at once and the timer goes on.
function listenReveal(){clearTimeout(LISTEN.timer);const next=$('#listenCard .sp-m:not(.on)');if(!next)return;next.classList.add('on');
  if($('#listenCard .sp-m:not(.on)'))LISTEN.timer=setTimeout(listenReveal,LISTEN.ms);}
function listenOpen(e){if(e.kind==='ll')openCaseModal(modalForLL(LL_ALL.find(a=>a.id===e.id)));else if(e.kind==='pll')openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name===e.id)));else openCaseModal(modalForF2L(F2L_CASES.find(f=>f.n===+e.id)));}
function listenState(msg,heard){$('#listenState').textContent=msg;$('#listenHeard').textContent=heard||'';}
// A result from the recognizer. An early guess only shows what was heard: "tea" would name the OLL T
// before "T perm" arrives. The final guess for a sentence acts; the same name said again plays it again.
function listenResult(ev){LISTEN.catalog=LISTEN.catalog||listenCatalog();
  for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i];let hit=null,heard='';
    for(let j=0;j<r.length;j++){heard=heard||(r[j].transcript||'').trim();hit=hit||listenMatch(r[j].transcript||'',LISTEN.catalog);}
    if(!r.isFinal){if(heard)listenState('Listening.','Heard: '+heard);}
    else if(hit){listenShow(hit);listenState('Listening. Heard '+hit.name+'.');}
    else if(heard)listenState('Listening. No case is called that.','Heard: '+heard);}}
function listenStart(){
  if(!listenSupported()){listenState('This browser cannot listen. Use Safari or Chrome.');return;}
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;const rec=new R();LISTEN.rec=rec;LISTEN.on=true;
  rec.lang='en-US';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=3;
  rec.onresult=listenResult;
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){listenStop();listenState('The microphone is blocked. Allow it for this site in the browser settings.');}};
  rec.onend=()=>{if(LISTEN.on&&LISTEN.rec===rec){setTimeout(()=>{if(LISTEN.on&&LISTEN.rec===rec)try{rec.start();}catch(e){}},250);}}; // the phone stops on its own after a quiet spell
  try{rec.start();}catch(e){LISTEN.on=false;LISTEN.rec=null;listenState('The microphone did not start. Try again.');return;}
  $('#listenBtn').textContent='Stop';$('#listenBtn').classList.add('on');$('#listenBtn').setAttribute('aria-pressed','true');
  listenState('Listening. Say a case name.');
  if(navigator.wakeLock)navigator.wakeLock.request('screen').then(l=>{LISTEN.wake=l;}).catch(()=>{}); // keep the screen on while it listens
}
function listenStop(){LISTEN.on=false;const rec=LISTEN.rec;LISTEN.rec=null;if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  if(LISTEN.wake){LISTEN.wake.release().catch(()=>{});LISTEN.wake=null;}
  $('#listenBtn').textContent='Listen';$('#listenBtn').classList.remove('on');$('#listenBtn').setAttribute('aria-pressed','false');
  listenState('Say a case name, such as "T perm" or "Sune".');}
function listenToggle(){if(LISTEN.on)listenStop();else listenStart();}
$('#listenBtn').onclick=listenToggle;
// The screen lock lapses when the page is hidden; take it again when the page comes back.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&LISTEN.on&&navigator.wakeLock&&!LISTEN.wake)navigator.wakeLock.request('screen').then(l=>{LISTEN.wake=l;}).catch(()=>{});});
