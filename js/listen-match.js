// The Listen matcher: a sentence a speech recognizer heard, read as a case name or a command for
// the case window. Pure (no DOM), so the Reference's Listen (js/listen.js), the Smart cube tab's
// voice commands (js/smart-listen.js) and the Quest page's drill (quest/voice.js) share it. How it
// reads a sentence is at the top of js/listen.js.
//
// listenCommand, listenCatalog, listenNormalize, listenKey, listenTokens, listenParse, listenRank,
// listenRankAll, listenDecide, listenMatch, listenPick, listenFresh. Needs ALG_DB, PLL_FULL and
// F2L_CASES (js/algs.js).

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

// A command for the open case window, said alone: 'play' ("play moves", "play"), 'reveal' ("reveal moves",
// "reveal all", "show all the moves", "uncover"), 'hide' ("hide moves", "hide", "cover them up"), or null.
// Only a sentence that is the command counts, so "hide and seek" in talk does nothing.
function listenCommand(text){const t=String(text).toLowerCase().replace(/[’']/g,'').replace(/[^a-z ]+/g,' ').split(/\s+/)
    .filter(w=>w&&!/^(please|the|me|now|them|it|its|ok|okay|of|those|these|again)$/.test(w)).join(' ');
  if(/^(reveal|uncover)( all)?( moves?| algorithm| alg)?$/.test(t)||/^(show|open)( all( moves?| algorithm| alg)?| moves?)$/.test(t))return 'reveal';
  if(/^(hide|cover)( all)?( moves?| algorithm| alg)?( up)?$/.test(t))return 'hide';
  if(/^play( all)?( moves?| algorithm| alg)?$/.test(t))return 'play';
  return null;}

// The words of a result after the ones a match used, the last LISTEN_RECENT, for each alternative. In
// constant talk a result can grow long (Safari keeps one for the whole session); only its end is new.
const LISTEN_RECENT=8;
function listenFresh(alts,n){return alts.map(a=>a.split(/\s+/).filter(Boolean).slice(n).slice(-LISTEN_RECENT).join(' ')).filter(Boolean);}
