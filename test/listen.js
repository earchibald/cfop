// Listen: the phone hears a case name and shows its algorithm one move per second. The matcher takes
// what a recognizer gives ("tea perm", "anti soon", "you be perm", "F two L twelve"); the longest name
// wins. The card shows every move covered, uncovers one at once and one more each tick, a tap uncovers
// the next at once, an early guess only shows what was heard, the card stays until the next name, the
// same name again plays it again, the name
// opens the details, and Stop ends it. A browser with no recognizer gets a message.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const recs=[];
class FakeRec{constructor(){this.started=0;this.stopped=0;recs.push(this);}start(){this.started++;}stop(){this.stopped++;}
  say(i,text,isFinal){const r=[{transcript:text,confidence:.9}];r.isFinal=!!isFinal;const results=[];results[i]=r;results.length=i+1;this.onresult({resultIndex:i,results});}}
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=q=>({matches:/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const on=()=>$$('#listenCard .sp-m.on').length,all=()=>$$('#listenCard .sp-m').length;

w.addEventListener('load',async()=>{try{
  await sleep(100);const L=w.eval('LISTEN');
  // The matcher, on what a recognizer gives.
  const cat=w.listenCatalog(),m=t=>{const e=w.listenMatch(t,cat);return e&&e.id;};
  assert.strictEqual(w.listenNormalize('F two L twelve'),'f2l 12');assert.strictEqual(w.listenNormalize('Case twenty-one!'),'case 21');
  for(const [say,id] of [['T perm','pll-T'],['tea perm','pll-T'],['show me the T-Perm','pll-T'],['T','co-T'],['chameleon','co-T'],['Sune','co-sune'],['soon','co-sune'],['anti sune','co-antisune'],['anti soon','co-antisune'],['antisune','co-antisune'],
    ['you a perm','pll-Ua'],['U perm B','pll-Ub'],['u perm','pll-Ua'],['why perm','pll-Y'],['H','co-H'],['H perm','pll-H'],['double sune','co-H'],['pie','co-pi'],['headlights','co-U'],['bow tie','co-L'],['L shape','eo-L'],['dot','eo-dot'],['line','eo-line'],
    ['G a perm','Ga'],['J perm','Ja'],['jay be perm','Jb'],['e perm','E'],['are a perm','Ra'],['F2L 12',12],['F two L twelve',12],['case 41',41],['f 2 l 7',7],['can you show me nothing',null],['hello',null]]){
    assert.strictEqual(m(say),id,`"${say}" is ${id}`);}
  assert.ok(cat.every(c=>c.say.length&&c.alg&&c.name),'every case has names');
  // Listen: the button starts a recognizer, the state says so.
  assert.strictEqual(L.ms,1000,'one move per second');L.ms=200;
  const st=()=>$('#listenState').textContent;
  assert.ok($('#listenCard').classList.contains('hidden'),'no card at first');
  click($('#listenBtn'));assert.strictEqual(st(),'This browser cannot listen. Use Safari or Chrome.','no recognizer: a message');assert.ok(!L.on);
  w.webkitSpeechRecognition=FakeRec;click($('#listenBtn'));
  assert.ok(L.on&&recs.length===1&&recs[0].started===1,'the recognizer starts');assert.strictEqual($('#listenBtn').textContent,'Stop');
  assert.ok(recs[0].continuous&&recs[0].interimResults,'it listens on and reports early');
  // An early guess only shows what was heard. The final guess shows the card: every move covered but the
  // first, then one more each tick.
  const rec=recs[0];rec.say(0,'tea',false);assert.ok($('#listenCard').classList.contains('hidden'),'an early guess shows no card');assert.strictEqual($('#listenHeard').textContent,'Heard: tea');
  rec.say(0,'T perm',false);assert.ok($('#listenCard').classList.contains('hidden'),'still no card');assert.strictEqual($('#listenHeard').textContent,'Heard: T perm');
  rec.say(0,'T perm',true);assert.ok(!$('#listenCard').classList.contains('hidden'),'the final guess shows the card');assert.ok($('#listenPanel').classList.contains('pinned'),'the panel pins');
  const tAlg=w.eval('ALG_DB').cp.find(a=>a.id==='pll-T').alg.split(' ');
  assert.strictEqual(all(),tAlg.length,'one bar per move');assert.strictEqual(on(),1,'the first move shows at once');assert.strictEqual($('#listenCard .sp-m.on').textContent,tAlg[0]);
  assert.strictEqual($('.listen-nm').textContent,'T perm');assert.strictEqual(st(),'Listening. Heard T perm.');assert.strictEqual($('#listenHeard').textContent,'');
  await sleep(300);assert.strictEqual(on(),2,'one more after a tick');
  click($('.listen-alg'));assert.strictEqual(on(),3,'a tap uncovers the next move at once');
  await sleep(300);assert.strictEqual(on(),4,'and the timer goes on');
  await sleep(200*tAlg.length);assert.strictEqual(on(),all(),'every move shows in the end');
  // The card stays through other talk; the next name replaces it; the same name again plays again.
  rec.say(1,'hello there',true);assert.strictEqual($('.listen-nm').textContent,'T perm','the card stays');assert.strictEqual(st(),'Listening. No case is called that.');
  rec.say(2,'you a perm',false);assert.strictEqual($('.listen-nm').textContent,'T perm','an early guess changes nothing');
  rec.say(2,'you be perm',true);assert.strictEqual($('.listen-nm').textContent,'Ub perm','the next name replaces it');assert.strictEqual(on(),1);
  await sleep(300);assert.strictEqual(on(),2);
  rec.say(3,'U B perm',true);assert.strictEqual($('.listen-nm').textContent,'Ub perm');assert.strictEqual(on(),1,'the same name again plays it again');
  rec.say(4,'F2L 12',true);assert.strictEqual($('.listen-nm').textContent,'F2L case #12');assert.strictEqual(all(),w.listenUnits(w.eval('F2L_CASES')[11].alg).length);
  rec.say(5,'J perm',true);assert.strictEqual($('.listen-nm').textContent,'Ja perm');assert.strictEqual($('#listenCard .sp-m').textContent,'x R2','a lead rotation goes with the first turn');
  // The name opens the details.
  click($('.listen-nm'));assert.ok($('#modalBg'),'the details open');assert.strictEqual($('#modalBg .modal').getAttribute('aria-label'),'Ja perm');$('#modalClose').click();
  // The phone stops on its own: the page starts it again. Stop ends it and keeps the card.
  rec.onend();await sleep(300);assert.strictEqual(rec.started,2,'started again after it ended');
  click($('#listenBtn'));assert.ok(!L.on&&rec.stopped===1,'Stop stops it');assert.strictEqual($('#listenBtn').textContent,'Listen');
  rec.onend&&rec.onend();await sleep(300);assert.strictEqual(rec.started,2,'not started again after Stop');
  assert.ok(!$('#listenCard').classList.contains('hidden'),'the card stays after Stop');
  // A blocked microphone: a message, and it is off.
  click($('#listenBtn'));recs[1].onerror({error:'not-allowed'});assert.ok(!L.on);assert.ok(/blocked/.test(st()),'blocked: a message');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('listen: names matched, one move per second, tap, stays, again, details, stop ok');process.exit(0);
}catch(e){console.error('listen: FAIL',e.message,errs);process.exit(1);}});
