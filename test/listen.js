// Listen: the phone hears a case name and shows its algorithm one move per second. The matcher reads
// what a recognizer gives ("tea perm", "anti soon", "you be perm", "F two L twelve") as an anchor, name
// words and talk; scores every case by sound; a sure winner shows, close scores ask with chips that a tap
// or the next word picks; the section in view breaks a tie; Not this offers the runners-up. A name opens
// the case window with a strip at the top: its covered moves uncover one each tick, a tap on the line
// uncovers the next at once, an early guess only shows what was heard, the window stays until the next
// name, which takes its place, the same name again covers it again, and Stop ends the listening. A hold on
// the button listens once; the window it opens keeps listening until it closes. Each row
// carries its shortest name. What was heard goes to a log the Settings window copies. Chrome with
// on-device recognition takes the names as phrases. A browser with no recognizer gets a message. The noise
// set: a name inside talk is found, ordinary talk names nothing; a strong name acts on two early guesses in a
// row, the words used are not read again, and a weak name does not change an open window. A case opens with its
// moves covered; "play moves", "reveal moves" and "hide moves", said or tapped, uncover or cover them.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const recs=[];
class FakeRec{constructor(){this.started=0;this.stopped=0;this.phrases=[];recs.push(this);}start(){this.started++;}stop(){this.stopped++;}
  say(i,text,isFinal){const r=(Array.isArray(text)?text:[text]).map(t=>({transcript:t,confidence:.9}));r.isFinal=!!isFinal;const results=[];results[i]=r;results.length=i+1;this.onresult({resultIndex:i,results});}}
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=q=>({matches:/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};
    // A fake localStorage (jsdom has none for file: pages), so the log can be kept.
    const m=new Map();Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const ptr=(el,type)=>el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0}));
// The window a name opens: its title, its covered moves (the first move is in clear), the strip's text and chips.
const win=()=>$('#modalBg'),title=()=>{const m=$('#modalBg .modal');return m&&m.getAttribute('aria-label');};
const sp=()=>$('#modalBg .algbig .spoil'),on=()=>$$('#modalBg .spoil .sp-m.on').length,all=()=>$$('#modalBg .spoil .sp-m').length;
const mst=()=>{const e=$('#listenModalState');return e&&e.textContent;};
const chips=()=>$$('#listenModalAsk button, #listenCard .listen-ask button').map(b=>b.textContent);
const log=()=>JSON.parse(w.localStorage.getItem('cw:listenLog')||'[]');

w.addEventListener('load',async()=>{try{
  await sleep(100);const L=w.eval('LISTEN');
  // The words: numbers as digits, letters apart from "perm", the two-letter cases apart, "oh l l" as oll.
  assert.strictEqual(w.listenNormalize('F two L twelve'),'f2l 12');assert.strictEqual(w.listenNormalize('Case twenty-one!'),'case 21');assert.strictEqual(w.listenNormalize('twenty two'),'22');
  assert.strictEqual(w.listenNormalize('Jperm'),'j perm');assert.strictEqual(w.listenNormalize('GA perm'),'g a perm');assert.strictEqual(w.listenNormalize('Gaperm'),'g a perm');
  assert.strictEqual(w.listenNormalize('oh l l T'),'oll t');assert.strictEqual(w.listenNormalize('anti soon'),'antisune');assert.strictEqual(w.listenNormalize("what's the T-Perm"),'whats the t perm');
  assert.ok(w.listenKey('sune')===w.listenKey('soon')&&w.listenKey('soon')===w.listenKey('sunny'),'sune, soon and sunny sound the same');
  assert.notStrictEqual(w.listenKey('bruno'),w.listenKey('pi'));
  const parse=t=>JSON.parse(JSON.stringify(w.listenParse(t)));
  assert.deepStrictEqual(parse('show me the G a perm'),{set:'pll',num:null,name:['g','a']});
  assert.deepStrictEqual(parse('can you show me nothing'),{set:null,num:null,name:['nothing']});
  assert.deepStrictEqual(parse('a T perm'),{set:'pll',num:null,name:['t']},'a leading "a" is the article');
  assert.deepStrictEqual(parse('a b perm'),{set:'pll',num:null,name:['a','b']},'but not before a suffix');
  // The matcher, on what a recognizer gives. A letter in both OLL and PLL is sure only with a section or an anchor.
  const cat=w.listenCatalog(),m=(t,s)=>{const e=w.listenMatch(t,cat,s);return e&&e.id;},pll=x=>'pll-'+x;
  for(const [say,id] of [['T perm','pll-T'],['tea perm','pll-T'],['tango perm','pll-T'],['show me the T-Perm','pll-T'],['go to the T perm','pll-T'],['Jperm','Ja'],['T',null],['H',null],['chameleon','co-T'],['T all','co-T'],['tee oll','co-T'],
    ['Sune','co-sune'],['soon','co-sune'],['sooner','co-sune'],['anti sune','co-antisune'],['anti soon','co-antisune'],['antisune','co-antisune'],['anti','co-antisune'],
    ['you a perm','pll-Ua'],['U perm B','pll-Ub'],['u perm','pll-Ua'],['why perm','pll-Y'],['H perm','pll-H'],['double sune','co-H'],['pie','co-pi'],['bruno','co-pi'],['headlights','co-U'],['bow tie','co-L'],['L shape','eo-L'],['dot','eo-dot'],['line','eo-line'],
    ['G a perm','Ga'],['GA perm','Ga'],['golf b perm','Gb'],['J perm','Ja'],['jay be perm','Jb'],['l perm','Jb'],['e perm','E'],['are a perm','Ra'],['a perm','Aa'],['the a perm','Aa'],['a b perm','Ab'],
    ['F2L 12',12],['F two L twelve',12],['case 41',41],['f 2 l 7',7],['twelve',12],['d perm',null],['can you show me nothing',null],['hello',null],
    ['U',null],['UA',pll('Ua')],['UB',pll('Ub')],['UAE',pll('Ua')],['Ewa',pll('Ua')],['Ubi',pll('Ub')],['YouTube',pll('Ub')],['you be',pll('Ub')],['Hugh perm',pll('Ua')],['ooh perm',pll('Ua')]]){
    assert.strictEqual(m(say),id,`"${say}" is ${id}`);}
  assert.strictEqual(m('U','pll'),'pll-Ua','U in the PLL section');assert.strictEqual(m('U','oll'),'co-U','U in the OLL section');assert.strictEqual(m('Ooh','pll'),'pll-Ua','"Ooh" is U');
  assert.deepStrictEqual([...w.listenDecide(w.listenRank('You',cat,null)).choices.map(c=>c.id)].sort(),['co-U','pll-Ua'],'U alone, no section: both');
  assert.strictEqual(m('T','oll'),'co-T','T in the OLL section');assert.strictEqual(m('T','pll'),'pll-T','T in the PLL section');assert.strictEqual(m('H','oll'),'co-H');
  assert.ok(cat.every(c=>c.say.length&&c.alg&&c.name&&c.hint&&c.set),'every case has names, a set and a hint');
  // The noise set, with no section in view. A name inside talk is found when an anchor touches it or it is
  // no everyday word; ordinary talk names nothing. A strong name may change an open window.
  const heard=t=>{const d=w.listenDecide(w.listenRankAll([t],cat,null));return d?d.hit?d.hit.id:'ask':null;};
  for(const [say,id] of [['so I told him T perm','pll-T'],['T perm yeah I think so','pll-T'],['and then the weather turned cold T perm tomorrow','pll-T'],
    ['he said the Sune is easy','co-sune'],['okay so the J perm','Ja'],['wait wait show me the Y perm','pll-Y'],['yeah the chameleon one','co-T'],
    ['right so headlights','co-U'],['um the bruno thing','co-pi'],['so we did F2L twelve',12],['he wants case seven now',7],
    ['I think it is the G a perm right','Ga'],['no not that the U perm B','pll-Ub'],['can you do the A perm','Aa'],['all the T perm','pll-T'],
    ['you know what',null],['I have two dogs',null],['all of them',null],['see you later',null],['that one is mine',null],['I think so',null],
    ['what time is it',null],['turn it up a bit',null],['are you coming',null],['the sun is out',null],['draw a line',null],['two of us',null],
    ['I will be there soon',null],['one more time',null],['are you okay',null],['be right back',null],['why not',null],['see you soon',null],
    ['let me see',null],['I said no',null],['we need to go',null],['the T is cold',null],['you and me',null],['give me two minutes',null],['that one',null]]){
    assert.strictEqual(heard(say),id,`noise: "${say}" is ${id}`);}
  const strong=t=>w.listenDecide(w.listenRankAll([t],cat,null)).strong;
  for(const t of ['T perm','Sune','F2L 12','he said the Sune is easy','chameleon'])assert.ok(strong(t),`"${t}" is strong`);
  for(const t of ['twelve','soon','dot'])assert.ok(!strong(t),`"${t}" is weak`);
  assert.strictEqual(m('F2L one'),1,'"one" after an F2L word is a number');assert.strictEqual(m('case one'),1);
  // Only the new end of a result is read: the words after the ones a match used, the last eight.
  assert.deepStrictEqual([...w.listenFresh(['so T perm and then','so T perm'],3)],['and then']);
  assert.strictEqual(w.listenFresh(['one two three four five six seven eight nine ten'],0)[0],'three four five six seven eight nine ten');
  // The commands, said alone: reveal and hide. Talk with the same words is no command.
  for(const [t,c] of [['reveal moves','reveal'],['Reveal all moves.','reveal'],['show me all the moves','reveal'],['show all','reveal'],['uncover','reveal'],['reveal','reveal'],
    ['play moves','play'],['Play.','play'],['play them all','play'],['play the T perm',null],
    ['hide moves','hide'],['Hide.','hide'],['cover them up','hide'],['hide the moves please','hide'],['hide all','hide'],
    ['show',null],['show me the T perm',null],['hide and seek',null],['I will hide it later',null],['moves',null],['reveal the T perm',null]])
    assert.strictEqual(w.listenCommand(t),c,`"${t}" is ${c}`);
  // Close scores are choices: "d perm" is one of the E-set perms. The next word picks one.
  const dd=w.listenDecide(w.listenRank('d perm',cat));assert.ok(!dd.hit&&dd.choices.length===5,'d perm: five choices');
  assert.ok(dd.choices.every(c=>c.set==='pll'),'all perms');
  assert.strictEqual(w.listenPick('second',dd.choices),dd.choices[1]);assert.strictEqual(w.listenPick('two',dd.choices),dd.choices[1]);assert.strictEqual(w.listenPick('tango',dd.choices).id,'pll-T');
  assert.strictEqual(w.listenPick('G a',dd.choices).id,'Ga');assert.strictEqual(w.listenPick('nothing',dd.choices),null);
  const tt=w.listenDecide(w.listenRank('T',cat,null));assert.strictEqual(tt.choices.length,2,'T alone: the perm and the OLL');
  assert.strictEqual(w.listenPick('the perm',tt.choices).id,'pll-T');assert.strictEqual(w.listenPick('oll',tt.choices).id,'co-T');
  // Each phone row carries its shortest name.
  const say=id=>{const s=$(`#refMobileCases .mrow[data-id="${id}"] .nm .say`);return s&&s.textContent;};
  assert.strictEqual(say('pll-T'),'Say "T perm"');assert.strictEqual(say('Ga'),'Say "G a perm"');assert.strictEqual(say('12'),'Say "12"');assert.strictEqual(say('co-pi'),'Say "Pi or Bruno"');assert.strictEqual(say('co-antisune'),'Say "Anti"');
  w.renderMobileRef();assert.strictEqual(say('pll-T'),'Say "T perm"','the labels come back after a redraw');assert.strictEqual($$('#refMobileCases .mrow[data-id="pll-T"] .say').length,1,'once');
  // Listen: the button starts a recognizer, the state says so.
  assert.strictEqual(L.ms,1000,'one move per second');L.ms=200;L.section=null;
  const st=()=>$('#listenState').textContent;
  assert.ok($('#listenCard').classList.contains('hidden'),'no card at first');
  click($('#listenBtn'));assert.strictEqual(st(),'This browser cannot listen. Use Safari or Chrome.','no recognizer: a message');assert.ok(!L.on);
  w.webkitSpeechRecognition=FakeRec;click($('#listenBtn'));
  assert.ok(L.on&&recs.length===1&&recs[0].started===1,'the recognizer starts');assert.strictEqual($('#listenBtn').textContent,'Stop');
  assert.ok(recs[0].continuous&&recs[0].interimResults,'it listens on and reports early');assert.strictEqual(recs[0].maxAlternatives,5);
  assert.strictEqual(recs[0].phrases.length,0,'no phrases without on-device recognition');
  // An early guess only shows what was heard. The final guess opens the case window: the first move in clear,
  // every other move covered, then one more each tick.
  const rec=recs[0];rec.say(0,'tea',false);assert.ok(!win(),'an early guess opens no window');assert.strictEqual($('#listenHeard').textContent,'Heard: tea');
  rec.say(0,'T perm',false);assert.ok(!win(),'still no window');assert.strictEqual($('#listenHeard').textContent,'Heard: T perm');
  rec.say(0,'T perm',true);assert.strictEqual(title(),'T perm','the final guess opens the window');assert.ok($('#listenStrip'),'with the strip');
  assert.ok($('#listenStrip').classList.contains('on'),'the strip shows it listens');
  const cmdBtns=()=>$$('#listenStrip .listen-cmds button');
  assert.deepStrictEqual(cmdBtns().map(b=>b.textContent),['play moves','reveal moves','hide moves'],'the strip shows the three commands');
  assert.ok(cmdBtns().every(b=>/You can also say/.test(b.title)),'each with a tooltip');assert.strictEqual($('#listenStrip .listen-cmds .muted').textContent,'Say or tap:');assert.ok(!L.card,'the button began the listening, not the window');
  const tAlg=w.eval('ALG_DB').cp.find(a=>a.id==='pll-T').alg.split(' ');
  assert.strictEqual(sp().firstChild.textContent.trim(),tAlg[0],'the first move in clear');assert.strictEqual(all(),tAlg.length-1,'one bar per move after it');assert.strictEqual(on(),0,'all covered at first');
  assert.strictEqual(mst(),'Listening. Heard T perm.','the strip says what was heard');assert.strictEqual(st(),'Listening. Heard T perm.');assert.strictEqual($('#listenHeard').textContent,'');
  assert.deepStrictEqual([...log().map(o=>o.hit)],['pll-T'],'the log has the hit');
  await sleep(300);assert.strictEqual(on(),0,'the moves stay covered');
  click($('#listenStrip [data-cmd="play"]'));assert.strictEqual(mst(),'Listening. Playing the moves, one per second.','play moves');
  await sleep(300);assert.strictEqual(on(),1,'one move after a tick');
  click(sp().querySelector('.sp-rest'));assert.strictEqual(on(),2,'a tap on the line uncovers the next move at once');assert.ok(win(),'and the window stays');
  await sleep(150);assert.strictEqual(on(),3,'and the timer goes on');
  await sleep(200*tAlg.length);assert.strictEqual(on(),all(),'every move shows in the end');assert.ok(sp().classList.contains('open'),'the reveal button goes');
  // The window stays through other talk; the next name takes its place, covered; the same name again covers it again.
  rec.say(1,'hello there',true);assert.strictEqual(title(),'T perm','the window stays');assert.strictEqual(mst(),'Listening. No case is called that. Heard: hello there');assert.strictEqual(log().pop().hit,null,'the miss is logged');
  rec.say(2,'you a perm',false);assert.strictEqual(title(),'T perm','an early guess changes nothing');
  rec.say(2,'you be perm',true);assert.strictEqual(title(),'Ub perm','the next name takes its place');assert.strictEqual(on(),0);assert.strictEqual($$('#modalBg').length,1,'one window');
  assert.ok(w.history.state&&w.history.state.modal,'one step in the history');
  await sleep(300);assert.strictEqual(on(),0,'the next case stays covered');sp().querySelector('.sp-rest').click();assert.strictEqual(on(),1);
  rec.say(3,'U B perm',true);assert.strictEqual(title(),'Ub perm');assert.strictEqual(on(),0,'the same name again covers it again');
  rec.say(4,'F2L 12',true);assert.strictEqual(title(),'F2L case #12');assert.strictEqual(all(),$$('#refMobileCases .mrow[data-kind="f2l"][data-id="12"] .spoil .sp-m').length,'covered as the row covers it');
  rec.say(5,'J perm',true);assert.strictEqual(title(),'Ja perm');assert.strictEqual(sp().firstChild.textContent.trim(),'x R2','a lead rotation goes with the first turn, in clear');
  // The recognizer's alternatives all count: the second one names the case.
  rec.say(6,['she perm','G a perm'],true);assert.strictEqual(title(),'Ga perm','an alternative names the case');
  // Close scores ask, in the strip. The next word picks; so does a tap on a chip.
  rec.say(7,'d perm',true);assert.strictEqual(chips().length,5,'d perm: five chips');assert.strictEqual(title(),'Ga perm','the window stays while it asks');
  assert.strictEqual(mst(),'Listening. Which one? Heard: d perm');assert.strictEqual($('#listenHeard').textContent,'Heard: d perm');
  assert.deepStrictEqual(log().pop().choices.length,5,'the question is logged');
  rec.say(8,'hello',true);assert.strictEqual(chips().length,5,'talk keeps the chips');assert.ok(/Which one\? Say the name again/.test(st()));
  rec.say(9,'second',true);assert.strictEqual(title(),'Z perm','"second" picks the second chip');assert.strictEqual(log().pop().picked,'pll-Z');assert.strictEqual(chips().length,0,'the chips go');
  rec.say(10,'d perm',true);click($$('#listenModalAsk button')[2]);assert.strictEqual(title(),'E perm','a tap picks');assert.strictEqual(log().pop().picked,'E');assert.strictEqual(mst(),'Listening. Showing E perm.');
  rec.say(11,'T',true);assert.deepStrictEqual([...chips()],['T (chameleon)','T perm'],'T alone, no section: both');
  rec.say(12,'the perm',true);assert.strictEqual(title(),'T perm','"the perm" picks the perm');
  // A weak name (a letter said alone) does not change an open window: it asks; the same name again shows it.
  L.section='oll';rec.say(13,'T',true);assert.strictEqual(title(),'T perm','a bare letter keeps the window');assert.deepStrictEqual([...chips()],['T (chameleon)'],'and asks');
  assert.strictEqual(mst(),'Listening. Is it this one? Say it again, or tap it. Heard: T');
  rec.say(14,'T',true);assert.strictEqual(title(),'T (chameleon)','T again, with the OLL section in view');L.section=null;
  // Not this: the runners-up as chips, and the miss marked in the log. With no runners-up, a word.
  rec.say(15,'tea perm',true);assert.strictEqual(title(),'T perm');click($('#listenStrip .listen-not'));
  assert.ok(chips().length>=2&&chips().length<=4&&!chips().includes('T perm'),'Not this: the runners-up');assert.strictEqual(log().pop().wrong,true,'the miss is marked');
  rec.say(16,'sune',true);assert.strictEqual(title(),'Sune');click($('#listenStrip .listen-not'));assert.strictEqual(mst(),'Listening. Say it again, or tap the case in the list.');assert.strictEqual(title(),'Sune','the window stays');
  // Close the window: the listening the button began goes on. With no window, the chips go in the panel.
  $('#modalClose').click();await sleep(20);assert.ok(!win()&&L.on,'closed, still listening');
  rec.say(17,'d perm',true);assert.strictEqual($$('#listenCard .listen-ask button').length,5,'the chips in the panel');assert.ok($('#listenPanel').classList.contains('pinned'));
  rec.say(18,'second',true);assert.strictEqual(title(),'Z perm');assert.ok($('#listenCard').classList.contains('hidden'),'the panel card goes');$('#modalClose').click();await sleep(20);
  // The phone stops on its own: the page starts it again. Stop ends it.
  rec.onend();await sleep(300);assert.strictEqual(rec.started,2,'started again after it ended');
  click($('#listenBtn'));assert.ok(!L.on&&rec.stopped===1,'Stop stops it');assert.strictEqual($('#listenBtn').textContent,'Listen');assert.ok(/^Tap to listen, or hold/.test(st()));
  rec.onend&&rec.onend();await sleep(300);assert.strictEqual(rec.started,2,'not started again after Stop');
  // A hold on the button listens once: the recognizer runs until the button is let go; the click after the hold does nothing.
  // The window a hold opens keeps listening, until it closes.
  const btn=$('#listenBtn');ptr(btn,'pointerdown');await sleep(400);
  assert.strictEqual(recs.length,2,'a hold starts a recognizer');const h=recs[1];assert.strictEqual(h.continuous,false,'once');assert.ok(L.hold&&!L.on);
  assert.strictEqual(btn.textContent,'Let go when done');assert.strictEqual(st(),'Say the case name, then let go.');
  ptr(btn,'pointerup');assert.strictEqual(h.stopped,1,'let go: the recognizer stops');click(btn);assert.ok(!L.on&&recs.length===2,'the click after a hold does nothing');
  h.say(0,'why perm',true);assert.strictEqual(title(),'Y perm');assert.strictEqual(mst(),'Heard Y perm.','no "Listening." while the hold is still on');assert.ok(!$('#listenStrip').classList.contains('on'));
  h.onend();assert.ok(!L.hold,'the hold is over when its recognizer ends');
  assert.ok(recs.length===3&&L.on&&L.card&&recs[2].continuous,'the window listens on');assert.strictEqual(mst(),'Listening. Say another case to change the card.');
  assert.ok($('#listenStrip').classList.contains('on'));assert.strictEqual(btn.textContent,'Stop');
  recs[2].say(0,'T perm',true);assert.strictEqual(title(),'T perm','the next name changes the card');assert.ok(L.on&&L.card,'and it listens on');
  $('#modalClose').click();await sleep(20);assert.ok(!win()&&!L.on&&!L.card&&recs[2].stopped===1,'Close ends the listening the window began');assert.strictEqual(btn.textContent,'Listen');
  ptr(btn,'pointerdown');await sleep(400);ptr(btn,'pointerup');recs[3].onend();assert.strictEqual(st(),'Nothing heard. Hold the button and say a case name.','a hold with nothing said');assert.strictEqual(recs.length,4,'no window, no listening on');
  ptr(btn,'pointerdown');await sleep(50);ptr(btn,'pointerup');click(btn);assert.ok(L.on&&recs.length===5&&recs[4].continuous,'a short tap toggles');click(btn);assert.ok(!L.on);
  // Chrome with on-device recognition: every name goes in as a phrase.
  w.SpeechRecognitionPhrase=class{constructor(p,b){this.phrase=p;this.boost=b;}};L.local=true;click(btn);
  const pr=recs[5];assert.ok(pr.processLocally&&pr.phrases.length>50,'the phrases');assert.ok(pr.phrases.some(p=>p.phrase==='t perm')&&pr.phrases.some(p=>p.phrase==='bruno'));assert.ok(pr.phrases.some(p=>p.phrase==='play moves')&&pr.phrases.some(p=>p.phrase==='reveal moves')&&pr.phrases.some(p=>p.phrase==='hide moves'),'the commands too');click(btn);
  // The Settings window copies the log, or clears it.
  let copied=null;w.navigator.clipboard={writeText:t=>{copied=t;return Promise.resolve();}};
  click($('#settingsBtn'));assert.ok($('#setListenLog'),'the copy button, with a log');click($('#setListenLog'));await sleep(20);
  assert.ok(copied&&/shown pll-T/.test(copied)&&/WRONG/.test(copied)&&/picked pll-Z/.test(copied),'the log is copied');assert.strictEqual($('#setListenLog').textContent,'Copied');
  click($('#setListenClear'));assert.ok(!$('#setListenLog')&&w.listenLogText()==='','cleared');click($('#setCancel'));
  click($('#settingsBtn'));assert.ok(!$('#setListenLog'),'no button without a log');click($('#setCancel'));
  // In constant talk: a strong name acts on an early guess, the same in two early guesses in a row; the words
  // it used are not read again; the words after it may change it; a long result is read at its end only;
  // a weak name does not change an open window, and talk leaves it as it is.
  L.local=false;click(btn);const n=recs[6];assert.ok(L.on&&n.continuous);
  n.say(0,'so I told him',false);n.say(0,'so I told him T perm',false);assert.ok(!win(),'one early guess: no window');
  n.say(0,'so I told him T perm and',false);assert.strictEqual(title(),'T perm','the same name in two early guesses: the window');
  assert.strictEqual(log().pop().early,true,'logged as early');
  n.say(0,'so I told him T perm and then',false);n.say(0,'so I told him T perm and then',true);assert.strictEqual(title(),'T perm');
  assert.strictEqual(log().length,1,'the words used are not read again; the rest of the sentence is talk');
  n.say(1,'U perm',false);n.say(1,'U perm',false);assert.strictEqual(title(),'Ua perm','early: U perm');
  n.say(1,'U perm B',false);n.say(1,'U perm B',false);assert.strictEqual(title(),'Ub perm','the word after it changes it');
  n.say(1,'U perm B and now the weather is nice but the Sune',false);n.say(1,'U perm B and now the weather is nice but the Sune is',false);
  assert.strictEqual(title(),'Sune','a long result: its new end is read');
  n.say(2,'twelve',true);assert.strictEqual(title(),'Sune','a bare number keeps the window');const strip=()=>$$('#listenModalAsk button').map(b=>b.textContent);assert.deepStrictEqual(strip(),['F2L case #12'],'and asks');
  n.say(3,'twelve',true);assert.strictEqual(title(),'F2L case #12','the same name again shows it');
  n.say(4,'you know what',true);assert.strictEqual(title(),'F2L case #12','talk keeps the window');assert.strictEqual(strip().length,0,'and asks nothing');
  n.say(5,'tea',false);n.say(5,'tea',false);assert.strictEqual(title(),'F2L case #12','a weak early guess does nothing');
  // "play moves" uncovers one move a tick; "hide moves" covers every move and stops it; a tap still uncovers one;
  // "reveal moves" shows them all; "play moves" with every move shown starts over. The next name opens covered.
  const cov=()=>$('#modalBg .algbig .spoil'),shown=()=>cov().querySelectorAll('.sp-m.on').length,moves=()=>cov().querySelectorAll('.sp-m').length;
  await sleep(250);assert.strictEqual(shown(),0,'covered until a command');
  n.say(20,'play moves',true);assert.strictEqual(log().pop().command,'play','the command is logged');await sleep(250);assert.ok(shown()>0,'play moves: the reveal has begun');
  n.say(6,'hide moves',true);assert.strictEqual(title(),'F2L case #12','a command keeps the window');assert.strictEqual(shown(),0,'hide: every move covered');
  assert.strictEqual(mst(),'Listening. Moves hidden. Say "play moves" or "reveal moves", or tap the line for the next move.');assert.strictEqual(log().pop().command,'hide');
  await sleep(450);assert.strictEqual(shown(),0,'and the reveal stops');
  click(cov().querySelector('.sp-rest'));assert.strictEqual(shown(),1,'a tap still uncovers the next move');await sleep(450);assert.strictEqual(shown(),1,'one only');
  n.say(7,'reveal moves',true);assert.strictEqual(shown(),moves(),'reveal: every move');assert.ok(cov().classList.contains('open'));assert.strictEqual(mst(),'Listening. All moves shown.');
  click($('#listenStrip [data-cmd="hide"]'));assert.strictEqual(shown(),0,'a tap on "hide moves" covers every move');assert.ok(/Moves hidden/.test(mst()));
  click($('#listenStrip [data-cmd="reveal"]'));assert.strictEqual(shown(),moves(),'a tap on "reveal moves" shows them all');assert.strictEqual(mst(),'Listening. All moves shown.');
  click($('#listenStrip [data-cmd="play"]'));assert.strictEqual(shown(),0,'play with every move shown: from the start');await sleep(250);assert.strictEqual(shown(),1);
  n.say(8,'Sune',true);assert.strictEqual(title(),'Sune');assert.strictEqual(shown(),0,'the next case: covered');await sleep(300);assert.strictEqual(shown(),0,'and it stays covered');
  n.say(21,'play moves',true);await sleep(300);assert.strictEqual(shown(),1,'until play moves');
  n.say(9,'hide',false);assert.ok(shown()>0,'one early guess of a command: nothing yet');n.say(9,'hide',false);assert.strictEqual(shown(),0,'two early guesses: the command acts');
  const before=log().length;n.say(9,'hide',true);assert.strictEqual(log().length,before,'the final guess of the same words does not act again');
  assert.ok(/\tearly/.test(w.listenLogText()),'the log text marks an early guess');assert.ok(/command hide/.test(w.listenLogText()),'and a command');
  $('#modalClose').click();await sleep(20);
  n.say(10,'reveal moves',true);assert.strictEqual(st(),'Listening. Say a case name first, then "reveal moves".','a command with no window');
  click(btn);assert.ok(!L.on);
  assert.ok(/In a noisy room, hold the button/.test(st()),'the words at rest say to hold in a noisy room');assert.ok(/A case opens with its moves covered: say "play moves" or "reveal moves"/.test(st()),'and name the commands');
  // A blocked microphone: a message, and it is off.
  click(btn);recs[7].onerror({error:'not-allowed'});assert.ok(!L.on);assert.ok(/blocked/.test(st()),'blocked: a message');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('listen: names matched, chips, pick, section, Not this, hold, labels, phrases, log, the window one move per second, tap, stays, swaps, listens on, stop, noise set, early guess, weak names, covered by default, play, reveal and hide, the command buttons ok');process.exit(0);
}catch(e){console.error('listen: FAIL',e.message,errs);process.exit(1);}});
