// Listen: the phone hears a case name and shows its algorithm, one move per second.
//
// The Listen button on the phone Reference section turns the microphone on (the browser asks once). A
// hold on the button listens once, while it is held: a short sentence is what the phone's recognizer
// is built for. The page listens through the browser's speech recognition. When it hears a case name
// ("T perm", "Sune", "G a perm", "F2L 12", "twelve"), the case window opens, as a tap on the row's picture
// opens it, and its covered moves uncover one per second. A tap on the line uncovers the next move at
// once. The window keeps listening: the next name swaps it for that case; the same name again plays the
// reveal again; Close ends the listening a hold began. A strip at the top of the window says what was
// heard, asks between close cases and carries Not this.
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
// Each row of the phone Reference carries the shortest name that works ("Say: T perm"). Chrome with
// on-device recognition is told every name as a phrase to favor (SpeechRecognitionPhrase).
//
// Pure (no DOM): listenCatalog, listenNormalize, listenKey, listenTokens, listenParse, listenRank, listenDecide,
// listenMatch, listenPick, listenFresh.

// The words a recognizer gives for a letter said alone (the spelling alphabet counts too), and the
// words it gives for "perm" and "OLL".
const LISTEN_WORDS={tea:'t',tee:'t',tango:'t',you:'u',yu:'u',uniform:'u',why:'y',yankee:'y',jay:'j',juliet:'j',juliett:'j',are:'r',ar:'r',our:'r',romeo:'r',
  zed:'z',zee:'z',zulu:'z',bee:'b',be:'b',bravo:'b',eh:'a',ay:'a',alpha:'a',see:'c',sea:'c',charlie:'c',gee:'g',jee:'g',golf:'g',dee:'d',de:'d',delta:'d',echo:'e',
  ef:'f',eff:'f',foxtrot:'f',em:'m',en:'n',november:'n',vee:'v',victor:'v',aitch:'h',age:'h',hotel:'h',oh:'o',ell:'l',el:'l',lima:'l',pee:'p',papa:'p',
  cue:'q',queue:'q',eye:'i',kay:'k',ex:'x',ooh:'u',oo:'u',ew:'u',eww:'u',ewe:'u',yew:'u',hugh:'u',hue:'u',who:'u',
  ua:'u a',uae:'u a',ewa:'u a',yua:'u a',ub:'u b',ube:'u b',ubi:'u b',ubee:'u b',yubi:'u b',uv:'u b',youtube:'u b',
  perms:'perm',permutation:'perm',permutations:'perm',pll:'perm',pill:'perm',peel:'perm',purm:'perm',term:'perm',firm:'perm',berm:'perm',burm:'perm',palm:'perm',
  all:'oll',awl:'oll',olly:'oll',orientation:'oll',pie:'pi',pies:'pi',ftl:'f2l',ftol:'f2l'};
// A number said in words, 1 to 41, for the F2L cases.
const LISTEN_ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const LISTEN_TENS={twenty:20,thirty:30,forty:40};
// Talk around a name. "Can you" and friends go as a pair, so "you" is not the letter U.
const LISTEN_FILLER=new Set(['show','me','the','an','please','what','whats','is','it','its','how','do','does','give','open','play','let','lets','see','want','i','my',
  'that','this','next','now','hey','ok','okay','um','uh','cube','twistwright','algorithm','alg','moves','for','of','to','too','go','and','then','again','one']);
// Talk words that join one thing to the next. A sentence with one is talk, so a weak name in it names nothing ("you and me").
const LISTEN_LINK=new Set(['and','then','of','to','too']);
// Lower case, letters and digits only, each spoken letter as its letter, "f 2 l" as "f2l", numbers as
// digits, a letter and "perm" run together apart ("jperm", "gaperm"), a two-letter case apart ("ga").
function listenNormalize(text){
  let t=String(text).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  if(!t)return '';
  const out=[];let tens=0;let m;
  for(const w0 of t.split(' ')){
    if((m=w0.match(/^([a-z])([abcd])?perm$/))){out.push(m[1]);if(m[2])out.push(m[2]);out.push('perm');continue;}
    if((m=w0.match(/^([aegjnru])([abcd])$/))&&!LISTEN_WORDS[w0]){out.push(m[1],m[2]);continue;}
    const one=LISTEN_ONES.indexOf(w0);
    if(LISTEN_TENS[w0]){if(tens)out.push(String(tens));tens=LISTEN_TENS[w0];continue;}
    if(tens){if(one>0&&one<10){out.push(String(tens+one));tens=0;continue;}out.push(String(tens));tens=0;}
    if(one>=0){out.push(one===1?'one':String(one));continue;} // "one" stays a word: "that one" is talk, "F2L one" a number (listenTokens)
    out.push(LISTEN_WORDS[w0]||w0);}
  if(tens)out.push(String(tens));
  return (' '+out.join(' ')+' ').replace(/ f ?(2|to|too) ?l /g,' f2l ').replace(/ o (double )?l l? /g,' oll ').replace(/ p l l /g,' perm ')
    .replace(/ (anti|auntie|aunty|ante|and he|anty) ?(sune|soon|sooner|sunny|sunni|suna|sun|sooney|sunday) /g,' antisune ').replace(/ bow tie /g,' bowtie ')
    .replace(/ head lights? /g,' headlights ').replace(/ sue (nay|ney|knee|nee) /g,' sune ')
    .replace(/ ([agjnru]) perm ([abcd])(?= )/g,(s,x,y)=>x==='g'||'ab'.includes(y)?` ${x} ${y} perm`:s) // "U perm B" is "U B perm"
    .replace(/\s+/g,' ').trim();}
// A word as it sounds: the first letter, then the consonants, with the letters that sound the same
// made one. "sune", "soon" and "sunny" are all SN. A single letter is itself.
function listenKey(w){let s=String(w).toLowerCase().replace(/[^a-z]/g,'');if(s.length<2)return s.toUpperCase();
  s=s.replace(/x/g,'ks').replace(/ph/g,'f').replace(/ck/g,'k').replace(/gh/g,'').replace(/^wh/,'w').replace(/^kn/,'n').replace(/(ch|sh)/g,'X').replace(/th/g,'0')
    .replace(/c(?=[eiy])/g,'s').replace(/c/g,'k').replace(/q/g,'k').replace(/z/g,'s').replace(/dg/g,'j');
  s=s[0]+s.slice(1).replace(/[aeiouyhw]/g,'');
  return s.replace(/(.)\1+/g,'$1').toUpperCase();}
function listenEdit(a,b){const D=[];for(let i=0;i<=a.length;i++){D[i]=[i];}for(let j=1;j<=b.length;j++)D[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)D[i][j]=Math.min(D[i-1][j]+1,D[i][j-1]+1,D[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return D[a.length][b.length];}
// The words of a sentence that count, in order, with the talk taken out: {w}, an anchor {w, set} ("perm"
// is pll, "oll" is oll, "F2L", "case", "pair" and "number" are f2l) or a number {w, num}. "One" is a number
// only after an F2L word. A leading "a" before a name is the article.
function listenTokens(text){
  const toks=listenNormalize(text).split(' ').filter(Boolean),out=[];
  for(let i=0;i<toks.length;i++){const w=toks[i];
    if(/^(can|could|would|will|do)$/.test(w)&&toks[i+1]==='u'){i++;continue;}
    if(w==='one'){if(out.length&&out[out.length-1].set==='f2l')out.push({w:'1',num:1});continue;}
    if(LISTEN_LINK.has(w))out.linked=true;
    if(LISTEN_FILLER.has(w))continue;
    if(w==='perm')out.push({w,set:'pll'});else if(w==='oll')out.push({w,set:'oll'});
    else if(/^(f2l|case|pair|number)$/.test(w))out.push({w,set:'f2l'});
    else if(/^\d+$/.test(w))out.push({w,num:+w});else out.push({w});}
  const isName=x=>!x.set&&x.num==null;
  for(;;){const i=out.findIndex(isName),j=out.findIndex((x,k)=>k>i&&isName(x));
    if(i<0||j<0||out[i].w!=='a'||/^[ab]$/.test(out[j].w))break;out.splice(i,1);}
  return out;}
// A sentence in three parts: the set an anchor word names ("perm" is pll, "oll", a number is f2l),
// the number, and the name words.
function listenParse(text){
  let set=null,num=null;const name=[];
  for(const x of listenTokens(text)){
    if(x.set==='pll'||x.set==='oll'){set=set||x.set;continue;}
    if(x.set)continue;
    if(x.num!=null){if(num==null)num=x.num;continue;}
    name.push(x.w);}
  if(num!=null&&!set)set='f2l';
  return {set,num,name};}

// The names of the OLL and PLL cases as people say them, by case id, in normalized form, and the
// shortest name that works, for the row. A letter alone names an OLL case only with the OLL section
// in view, or as a choice.
const LISTEN_SAY={
  'eo-dot':{say:['dot','dots','no edges','dot case'],hint:'Dot'},
  'eo-L':{say:['l shape','small l','l edges','hook'],hint:'L shape'},
  'eo-line':{say:['line','bar','line edges'],hint:'Line'},
  'co-sune':{say:['sune','soon','sooner','sunny','sunni','suna','sun','sooney'],hint:'Sune'},
  'co-antisune':{say:['antisune','anti','auntie','aunty','anti sune'],hint:'Anti'},
  'co-H':{say:['h','double sune','double soon','flip'],hint:'H OLL'},
  'co-pi':{say:['pi','bruno'],hint:'Pi or Bruno'},
  'co-L':{say:['l','bowtie','bow'],hint:'Bowtie'},
  'co-T':{say:['t','chameleon','chamelion','camelion','cameleon','camel'],hint:'Chameleon'},
  'co-U':{say:['u','headlights','headlight'],hint:'Headlights'},
  'pll-T':{say:['t'],hint:'T perm'},'pll-Y':{say:['y'],hint:'Y perm'},
  'pll-Ua':{say:['u a','u'],hint:'U a perm'},'pll-Ub':{say:['u b'],hint:'U b perm'},
  'pll-H':{say:['h'],hint:'H perm'},'pll-Z':{say:['z'],hint:'Z perm'},
};
// Every case a phone can ask for: the two-look cases, the rest of the full PLL, the F2L cases by number.
// Each entry: {kind, id, name, alg, set, say, hint}, with kind and id as the Reference tiles carry them,
// set as the anchor names it (oll, pll, f2l).
function listenCatalog(){
  const out=[];
  for(const a of [...ALG_DB.eo,...ALG_DB.co])out.push({kind:'ll',id:a.id,name:a.name,alg:a.alg,set:'oll',...LISTEN_SAY[a.id]});
  for(const a of [...ALG_DB.cp,...ALG_DB.ep])out.push({kind:'ll',id:a.id,name:a.name,alg:a.alg,set:'pll',...LISTEN_SAY[a.id]});
  for(const p of PLL_FULL){if(out.some(o=>o.id==='pll-'+p.name))continue;
    const x=p.name[0].toLowerCase(),s=p.name[1]||'';
    const say=s?[`${x} ${s}`]:[x];
    if(s==='a')say.push(x); // "J perm" alone is the a case
    if(p.name==='Jb')say.push('l'); // some call it the L perm
    out.push({kind:'pll',id:p.name,name:p.name+' perm',alg:p.alg,set:'pll',say,hint:`${p.name[0]}${s?' '+s:''} perm`});}
  for(const f of F2L_CASES)out.push({kind:'f2l',id:f.n,name:'F2L case #'+f.n,alg:f.alg,set:'f2l',say:[String(f.n)],hint:String(f.n)});
  return out;}
// Letters a recognizer swaps for one another: the E set (B C D E G P T V Z), A J K H, F S X, M N, U Q W, I Y.
const LISTEN_SOUNDS=['bcdegptvz','ajkh','fsx','mn','uqw','iy'];
const LISTEN_OK=0.75,LISTEN_GAP=0.3;
// The cost of a heard word in the place of a name word: 0 the same, a little for a letter from the
// same sound set or a word that sounds alike, 1 for a different word.
function listenTokenCost(h,x){if(h===x)return 0;
  const hl=h.length===1,xl=x.length===1;
  if(hl&&xl)return LISTEN_SOUNDS.some(g=>g.includes(h)&&g.includes(x))?0.45:1;
  if(hl||xl)return 1;
  const kh=listenKey(h),kx=listenKey(x);
  if(kh===kx)return 0.25;
  if(kh.length>=3&&kx.length>=3&&listenEdit(kh,kx)<=1)return 0.5;
  if(listenEdit(h,x)/Math.max(h.length,x.length)<=0.34)return 0.5;
  return 1;}
// The cost of heard words against a name: words swapped by sound, an extra heard word between name words
// 0.6, a missing name word 1. The first and the last heard word must stand for name words: talk around a
// name is for listenRank to leave out.
function listenCost(heard,say){const n=heard.length,m=say.length,X=9;const D=[];for(let i=0;i<=n;i++){D[i]=[i*X];}for(let j=1;j<=m;j++)D[0][j]=j;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)D[i][j]=Math.min(D[i-1][j]+(j===m?X:0.6),D[i][j-1]+1,D[i-1][j-1]+listenTokenCost(heard[i-1],say[j-1]));
  return D[n][m];}
// Name words that are no everyday word, so they name a case from inside talk: "he said the Sune is easy".
const LISTEN_STRONG=new Set(['sune','sooney','suna','sunni','antisune','chameleon','chamelion','camelion','cameleon','headlights','headlight','bowtie','bruno']);
// What a name inside talk costs over the same name said alone. A weak name (no anchor, no word of
// LISTEN_STRONG) said alone must be the name or sound the same: "mine" is not "line", "see" is no perm.
const LISTEN_TALK=0.35,LISTEN_WEAK=0.25;
// Every case a sentence may name, with its cost, the best first: {entry, cost, strong}. The matcher reads
// each run of up to three name words. A run that is the whole sentence may be any name. A run inside talk
// counts only when it is strong: an anchor word touches it ("so I told him T perm") or it holds a word of
// LISTEN_STRONG. So a letter or a number in ordinary talk ("you know what", "I have two dogs") names
// nothing. An anchor rules the other sets out; with none, the section in view (oll, pll, f2l) costs the
// other sets a little. Strong tells a name that may change an open window (listenDo). Nothing costs more
// than LISTEN_OK.
function listenRank(text,catalog,section){
  const t=listenTokens(text),p=listenParse(text),out=[];
  const names=[];t.forEach((x,i)=>{if(!x.set&&x.num==null)names.push(i);});
  const hasNum=t.some(x=>x.num!=null),f2lWord=t.some(x=>x.set==='f2l');
  const ll=x=>x&&(x.set==='pll'||x.set==='oll')?x.set:null;
  // The runs, each with the anchor that touches it: the one after it ("T perm"), else before ("OLL T"), else inside.
  const runs=[];
  for(let a=0;a<names.length;a++)for(let b=a;b<names.length&&b<a+3;b++){const s=names[a],e=names[b];
    let anc=ll(t[e+1])||ll(t[s-1]);for(let k=s+1;!anc&&k<e;k++)anc=ll(t[k]);
    const words=names.slice(a,b+1).map(i=>t[i].w);
    runs.push({words,anc,s,e,whole:a===0&&b===names.length-1&&!hasNum,named:words.some(w=>LISTEN_STRONG.has(w))});}
  // A number with an F2L word beside it names the case from inside talk: "so we did F2L twelve".
  const f2lNear=t.filter((x,i)=>x.num!=null&&((t[i-1]&&t[i-1].set==='f2l')||(t[i+1]&&t[i+1].set==='f2l'))).map(x=>x.num);
  for(const c of catalog){let best=Infinity,strong=false,run=null;
    const take=(cost,s,r)=>{if(cost<best-1e-9||(cost<best+1e-9&&s&&!strong)){best=cost;strong=s;run=r;}};
    if(c.set==='f2l'){
      if(p.num!=null&&!names.length)take(p.num===+c.id?0:9,f2lWord,null);
      if(f2lNear.includes(+c.id))take(names.length?LISTEN_TALK:0,true,null);}
    else for(const r of runs){const anc=r.anc||(r.whole?p.set:null);
      if(anc&&anc!==c.set)continue;
      const sure=!!anc||r.named;if(!sure&&(!r.whole||t.linked))continue;
      const cost=Math.min(...c.say.map(s=>listenCost(r.words,s.split(' '))));if(cost>(sure?LISTEN_OK:LISTEN_WEAK))continue;
      take(cost+(r.whole?(!anc&&section&&section!==c.set?0.35:0):LISTEN_TALK),sure,r);}
    if(best<=LISTEN_OK)out.push({entry:c,cost:best,strong,run});}
  // Of two names on one anchor, the longer one wins: "the G a perm" is not the A perm.
  const kept=out.filter(x=>!(x.run&&x.run.anc&&out.some(o=>o!==x&&o.run&&o.run.anc===x.run.anc&&o.run.s<=x.run.s&&o.run.e>=x.run.e&&o.run.e-o.run.s>x.run.e-x.run.s&&o.cost<=x.cost+1e-9)));
  return kept.map(({entry,cost,strong})=>({entry,cost,strong})).sort((a,b)=>a.cost-b.cost);}
// The ranks of several sentences (the recognizer's alternatives) as one list: each case at its best cost.
function listenRankAll(texts,catalog,section){const best=new Map();
  for(const t of texts)for(const r of listenRank(t,catalog,section)){const k=r.entry.kind+':'+r.entry.id,o=best.get(k);
    if(!o||o.cost>r.cost||(o.cost===r.cost&&r.strong))best.set(k,r);}
  return [...best.values()].sort((a,b)=>a.cost-b.cost);}
// A sure winner, or the choices that lie within LISTEN_GAP of the best: {hit, strong, choices, ranked}, or null for none.
function listenDecide(ranked){if(!ranked.length)return null;
  const near=ranked.filter(r=>r.cost-ranked[0].cost<LISTEN_GAP);
  if(near.length===1)return {hit:ranked[0].entry,strong:!!ranked[0].strong,choices:null,ranked};
  return {hit:null,strong:false,choices:near.slice(0,5).map(r=>r.entry),ranked};}
// The catalog entry a sentence names for sure, or null.
function listenMatch(text,catalog,section){const d=listenDecide(listenRank(text,catalog,section));return d&&d.hit||null;}
// One of the choices on the screen, from the next sentence: "second", "two", "the perm", or the name again. Null for none.
function listenPick(text,choices){const p=listenParse(text);
  if(listenNormalize(text)==='one')return choices[0]||null;
  const ord={first:0,second:1,third:2,fourth:3,fifth:4};
  if(p.name.length===1&&ord[p.name[0]]!=null)return choices[ord[p.name[0]]]||null;
  if(p.set&&!p.name.length&&p.set!=='f2l'){const s=choices.filter(c=>c.set===p.set);return s.length===1?s[0]:null;}
  if(p.num!=null&&!p.name.length)return choices[p.num-1]||null;
  if(!p.name.length)return null;
  const d=listenDecide(listenRank(text,choices,null));return d&&d.hit||null;}

// ----- the microphone and the card -----
// card: the listening began for the window and ends with it. wantCard: a hold found a case; listen on when it ends.
const LISTEN={on:false,hold:false,card:false,wantCard:false,rec:null,entry:null,timer:null,ms:1000,wake:null,catalog:null,choices:null,last:null,local:false,section:undefined,used:{},pend:null};
function listenSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
// The section of the phone Reference in view: oll, pll, f2l, or null above the first. A test sets LISTEN.section.
function listenSection(){if(LISTEN.section!==undefined)return LISTEN.section;
  const top=$('.top');const off=(top?top.getBoundingClientRect().height:0)+20;let cur=null;
  for(const [id,set] of [['mg-ollE','oll'],['mg-ollC','oll'],['mg-pllC','pll'],['mg-pllE','pll'],['mg-pll','pll'],['mg-f2l','f2l']]){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top-off<=0)cur=set;}
  return cur;}
// The strip at the top of the case window: what was heard, the choices and Not this.
function listenStrip(){return document.getElementById('listenStrip');}
// Show the case: the case window opens, the strip goes in, every covered move uncovers one per second.
// A window a hold opened keeps listening once the hold's recognizer ends.
function listenShow(e){LISTEN.entry=e;LISTEN.choices=null;clearTimeout(LISTEN.timer);$('#listenCard').classList.add('hidden');
  listenSwapOut();modalNext=null;listenOpen(e);
  const col=document.querySelector('#modalBg .modal > div:not(.pic)');if(!col)return;
  const strip=document.createElement('div');strip.className='listen-strip';strip.id='listenStrip';
  strip.innerHTML=`<span class="listen-dot"></span><span id="listenModalState"></span><button type="button" class="small ghost listen-not" title="This is not the case I said: show the other cases it could be">Not this</button><span id="listenModalAsk" class="listen-ask"></span>`;
  strip.querySelector('.listen-not').onclick=()=>listenNotThis(e);
  col.insertBefore(strip,col.firstChild);strip.classList.toggle('on',LISTEN.on);
  listenState($('#listenState').textContent,$('#listenHeard').textContent);
  if(!LISTEN.on){if(LISTEN.hold)LISTEN.wantCard=true;else listenStart(false,true);}
  listenReveal();}
// An open window goes away for the next one with no step back in the history: the next window takes its place there.
function listenSwapOut(){const b=document.getElementById('modalBg');if(!b)return;b.remove();document.removeEventListener('keydown',escClose);window.removeEventListener('popstate',popClose);}
// Uncover the next covered move of the window each second. A tap on the line uncovers one at once (app.js) and the timer goes on.
function listenReveal(){clearTimeout(LISTEN.timer);const s=document.querySelector('#modalBg .algbig .spoil');
  if(!s||document.body.classList.contains('refall')||!s.querySelector('.sp-m:not(.on)'))return;
  LISTEN.timer=setTimeout(()=>{const t=document.querySelector('#modalBg .algbig .spoil');if(t===s&&s.querySelector('.sp-m:not(.on)'))spoilStep(s);listenReveal();},LISTEN.ms);}
function listenOpen(e){if(e.kind==='ll')openCaseModal(modalForLL(LL_ALL.find(a=>a.id===e.id)));else if(e.kind==='pll')openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name===e.id)));else openCaseModal(modalForF2L(F2L_CASES.find(f=>f.n===+e.id)));}
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
function listenLogText(){return store.get('listenLog',[]).map(o=>`${new Date(o.t).toISOString()}\t${(o.heard||[]).join(' | ')}\t${o.hit?'shown '+o.hit:o.picked?'picked '+o.picked:o.choices?'asked '+o.choices.join(', '):'none'}${o.early?'\tearly':''}${o.wrong?'\tWRONG':''}`).join('\n');}
function listenLogClear(){store.set('listenLog',[]);}
// What a sentence (with the recognizer's alternatives) asks for: {pick} from the choices on the screen,
// or listenDecide's {hit, strong, choices, ranked}, or {} for nothing.
function listenAction(alts){LISTEN.catalog=LISTEN.catalog||listenCatalog();
  if(LISTEN.choices){for(const a of alts){const c=listenPick(a,LISTEN.choices);if(c)return {pick:c};}}
  return listenDecide(listenRankAll(alts,LISTEN.catalog,listenSection()))||{};}
// Do what a sentence asks for. A sure winner shows. A weak one (a letter or a number said alone) does not
// change an open window: it asks, and the same name again shows it. Close scores ask. Early: an early
// result acts only for a pick or a strong name, and says nothing else. The case shown, or null.
function listenDo(a,alts,early){const pre=listenPre(),ex=early?{early:true}:{}; // listenShow may start the listening: the word comes after it
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
// The words of a result after the ones a match used, the last LISTEN_RECENT, for each alternative. In
// constant talk a result can grow long (Safari keeps one for the whole session); only its end is new.
const LISTEN_RECENT=8;
function listenFresh(alts,n){return alts.map(a=>a.split(/\s+/).filter(Boolean).slice(n).slice(-LISTEN_RECENT).join(' ')).filter(Boolean);}
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
      const key=a.pick?'p:'+a.pick.id:a.hit&&a.strong?'h:'+a.hit.kind+':'+a.hit.id:null;
      const ready=key&&LISTEN.pend&&LISTEN.pend.i===i&&LISTEN.pend.key===key;LISTEN.pend=key&&!ready?{i,key}:null;
      if(!ready)continue;}
    else{LISTEN.pend=null;if(u.entry&&!a.pick&&!a.hit)continue;} // the rest of a sentence that named a case: talk
    const e=listenDo(a,said,!r.isFinal);
    if(e)LISTEN.used[i]={n:alts[0].split(/\s+/).filter(Boolean).length,text:said[0],entry:e};}}
// Chrome with on-device recognition takes the names as phrases to favor. Safari and Android take none.
function listenBias(rec){if(!LISTEN.local||typeof window.SpeechRecognitionPhrase!=='function'||!('phrases' in rec))return;
  try{LISTEN.catalog=LISTEN.catalog||listenCatalog();const ph=[];
    for(const c of LISTEN.catalog){if(c.set==='f2l')continue;for(const s of c.say)ph.push(new SpeechRecognitionPhrase(c.set==='pll'?s+' perm':s,3));}
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
// The words under the button at rest. In a noisy room a hold is best: the phone hears only what is said while the button is down.
const LISTEN_IDLE='Tap to listen, or hold and say a case name, such as "T perm" or "Sune". In a noisy room, hold the button while you speak.';
function listenStop(){LISTEN.on=false;LISTEN.hold=false;LISTEN.card=false;LISTEN.wantCard=false;const rec=LISTEN.rec;LISTEN.rec=null;if(rec)try{rec.onend=null;rec.stop();}catch(e){}
  if(LISTEN.wake){LISTEN.wake.release().catch(()=>{});LISTEN.wake=null;}
  listenButton();
  listenState(LISTEN_IDLE);}
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
// Each row of the phone Reference carries the shortest name that works. The rows are drawn again when the
// cross color changes, so the labels go on after every draw.
function listenLabelRows(){LISTEN.catalog=LISTEN.catalog||listenCatalog();
  for(const row of document.querySelectorAll('#refMobileCases .mrow')){const nm=row.querySelector('.nm');if(!nm||nm.querySelector('.say'))continue;
    const c=LISTEN.catalog.find(c=>c.kind===row.dataset.kind&&String(c.id)===row.dataset.id);if(!c)continue;
    const s=document.createElement('span');s.className='say';s.title='Say this to Listen';s.textContent='Say "'+c.hint+'"';nm.appendChild(s);}}
if(typeof renderMobileRef==='function'){const draw=renderMobileRef;renderMobileRef=function(){draw.apply(this,arguments);listenLabelRows();};}
listenLabelRows();
document.body.classList.toggle('can-listen',listenSupported());
// Is on-device recognition there, for the phrases? Asked once; Chrome on a desktop says yes, phones say no.
(function(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R||typeof R.available!=='function')return;
  try{R.available({langs:['en-US'],processLocally:true}).then(v=>{LISTEN.local=v==='available';}).catch(()=>{});}catch(e){}})();
// The screen lock lapses when the page is hidden; take it again when the page comes back.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&LISTEN.on&&navigator.wakeLock&&!LISTEN.wake)navigator.wakeLock.request('screen').then(l=>{LISTEN.wake=l;}).catch(()=>{});});
