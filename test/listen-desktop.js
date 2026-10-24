// Listen on the desktop Reference page: the one panel sits under the page's first panel and moves with the
// layout; the cards and the rows of the full PLL and F2L tables carry their names; the words say Click; a
// name opens the case window with the algorithm covered and the strip beside the picture, one move
// uncovered per tick, while a click on a card still opens it uncovered; only the full PLL and F2L lists
// name a section, since the two-look OLL and PLL stand side by side.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const recs=[];
class FakeRec{constructor(){this.started=0;this.stopped=0;recs.push(this);}start(){this.started++;}stop(){this.stopped++;}
  say(i,text,isFinal){const r=[{transcript:text,confidence:.9}];r.isFinal=!!isFinal;const results=[];results[i]=r;results.length=i+1;this.onresult({resultIndex:i,results});}}
// The layout query reads `phone`; a change calls the page's listeners, as a resize past 760px would.
let phone=false;const changes=[];
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=q=>({get matches(){return /760/.test(q)&&phone;},addEventListener(t,f){if(/760/.test(q))changes.push(f);},addListener(f){if(/760/.test(q))changes.push(f);}});
    w.scrollTo=()=>{};w.webkitSpeechRecognition=FakeRec;
    const m=new Map();Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const title=()=>{const m=$('#modalBg .modal');return m&&m.getAttribute('aria-label');};
const st=()=>$('#listenState').textContent;
const flip=to=>{phone=to;changes.forEach(f=>f({matches:to}));};

w.addEventListener('load',async()=>{try{
  await sleep(100);
  // LISTEN is a const of the page's shared scope: a script hands it to the test.
  const tag=d.createElement('script');tag.textContent='window.__listen=LISTEN;';d.body.appendChild(tag);const L=w.__listen;L.ms=200;
  // The panel under the desktop page's first panel, the words for a mouse, the names on the cards and rows.
  assert.strictEqual($('#refDesktop > .panel').nextElementSibling.id,'listenPanel','the panel under the desktop heading');
  assert.ok(/^Click to listen, or hold/.test(st()),'the words say Click');assert.ok(d.body.classList.contains('can-listen'));
  const say=sel=>{const s=$(sel+' .say');return s&&s.textContent;};
  assert.strictEqual(say('#refDesktop .rcard[data-id="pll-T"] .nm'),'Say "T perm"','a two-look card');assert.strictEqual(say('#refDesktop .rcard[data-id="co-pi"] .nm'),'Say "Pi or Bruno"');
  assert.strictEqual(say('#refPLL tr[data-id="Ga"]'),'Say "G a perm"','a row of the full PLL');assert.strictEqual(say('#refF2L tr[data-id="12"]'),'Say "12"','a row of the F2L list');
  assert.strictEqual($$('#refDesktop .ref-row').filter(r=>!r.querySelector('.say')).length,0,'every desktop case carries its name');
  // A click on a card opens the details as before: the algorithm in full.
  click($('#refDesktop .rcard[data-id="pll-T"]'));assert.strictEqual(title(),'T perm');assert.ok(!$('#modalBg .algbig.spoiled')&&$('#modalBg .algbig .m'),'a click: uncovered');
  $('#modalClose').click();await sleep(20);
  // Only the full PLL and the F2L lists name a section on the desktop.
  const at=(id,top)=>{d.getElementById(id).getBoundingClientRect=()=>({top,bottom:top+40,height:40,left:0,right:0,width:0});};
  at('foldPLL',900);at('foldF2L',1400);assert.strictEqual(w.listenSection(),null,'the two-look cases: no section');
  at('foldPLL',-10);assert.strictEqual(w.listenSection(),'pll','the full PLL list');at('foldF2L',-10);assert.strictEqual(w.listenSection(),'f2l');
  at('foldPLL',900);at('foldF2L',1400);
  // A name opens the window with the algorithm covered and the strip beside the picture; one move a tick.
  click($('#listenBtn'));const rec=recs[0];assert.ok(L.on&&rec.started===1&&rec.continuous,'the button listens');assert.strictEqual($('#listenBtn').textContent,'Stop');
  rec.say(0,'so I told him T perm',true);assert.strictEqual(title(),'T perm','a name inside talk opens the window');
  const sp=$('#modalBg .algbig.spoiled .spoil');assert.ok(sp,'covered');assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,0);
  assert.ok(/^Click the line/.test($('#modalBg .sp-hint').textContent),'the hint says Click');
  const strip=$('#listenStrip');assert.ok(strip&&!strip.closest('.picwrap')&&strip.parentElement.parentElement.classList.contains('modal'),'the strip at the top of the text beside the picture');
  assert.strictEqual(strip.parentElement.firstElementChild,strip);
  await sleep(300);assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,1,'one move after a tick');
  rec.say(1,'T',true);assert.strictEqual(title(),'T perm','with no section, a bare letter keeps the window');
  assert.deepStrictEqual($$('#listenModalAsk button').map(b=>b.textContent),['T (chameleon)','T perm'],'and asks');
  rec.say(2,'Sune',true);assert.strictEqual(title(),'Sune','a strong name changes it');assert.ok($('#modalBg .algbig.spoiled'),'covered again');
  $('#modalClose').click();await sleep(20);assert.ok(L.on,'the listening the button began goes on');
  click($('#listenBtn'));assert.ok(!L.on);assert.ok(/^Click to listen/.test(st()));
  // The layout changes: the panel moves to the phone page, and the words say Tap; then back.
  flip(true);assert.strictEqual($('#refMobile > .panel').nextElementSibling.id,'listenPanel','the panel under the phone heading');assert.ok(/^Tap to listen/.test(st()),'the words say Tap');
  flip(false);assert.strictEqual($('#refDesktop > .panel').nextElementSibling.id,'listenPanel','and back');assert.ok(/^Click to listen/.test(st()));
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('listen-desktop: the panel, the names, a click uncovered, the section, a name covered with the strip, one move a tick, weak and strong, the layout change ok');process.exit(0);
}catch(e){console.error('listen-desktop: FAIL',e.message,errs);process.exit(1);}});
