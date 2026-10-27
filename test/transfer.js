// Your data (js/transfer.js): the cw: keys as one block of text and back, Copy my data and Paste
// my data in the Settings window, the box where the clipboard is not allowed, the question before
// a replace, the first visit's offer in the method chooser, and the first-visit preview.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const VER=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8')).version;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// A page with its own localStorage (o.storage) and a clipboard that can say no (o.read, o.write).
function boot(o){o=o||{};const clip=o.clip||{text:''};const errs=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html')+(o.query||''),virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
      const m=new Map(Object.entries(o.storage||{}));
      Object.defineProperty(w,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),
        key:i=>[...m.keys()][i]??null,get length(){return m.size;}}});
      Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{
        writeText:t=>o.write==='deny'?Promise.reject(new Error('not allowed')):(clip.text=t,Promise.resolve()),
        readText:()=>{clip.reads=(clip.reads||0)+1;return o.read==='deny'?Promise.reject(new Error('not allowed')):Promise.resolve(clip.text);}}});}});
  const w=dom.window;
  return new Promise(res=>w.addEventListener('load',async()=>{await sleep(400);const t={w,d:w.document,errs,clip,reloads:0,ls:w.localStorage};
    w.dataReload=()=>{t.reloads++;};res(t);}));}
const $=(t,s)=>t.d.querySelector(s);
const cwKeys=ls=>{const o={};for(let i=0;i<ls.length;i++){const k=ls.key(i);if(k.startsWith('cw:'))o[k]=ls.getItem(k);}return o;};

(async()=>{try{
  // ---- the pure part ----
  const A=await boot({storage:{'cw:method':'"cfop"','cw:insp':'false','cw:times':'[{"t":12345}]','other':'kept'}});
  const {w}=A;
  const got=w.dataCollect(A.ls);
  assert.ok(got['cw:insp']==='false'&&got['cw:times']&&!('other' in got),'dataCollect takes the cw: keys only');
  const text=w.dataText(got,'9.9.9',Date.UTC(2026,9,26));
  const r=w.dataRead(text);
  assert.ok(r.ok&&r.count===Object.keys(got).length&&r.version==='9.9.9'&&r.saved==='2026-10-26T00:00:00.000Z','the text reads back');
  assert.deepStrictEqual(Object.assign({},r.keys),Object.assign({},got),'the keys come back as they were');
  assert.ok(!w.dataRead('hello').ok&&/not Twistwright data/.test(w.dataRead('hello').error),'other text is no data');
  assert.ok(!w.dataRead('{"keys":{}}').ok&&!w.dataRead('[1,2]').ok&&!w.dataRead('').ok&&!w.dataRead(null).ok,'JSON of another shape is no data');
  assert.ok(/newer Twistwright \(2\.0\.0\)/.test(w.dataRead('{"twistwright":2,"version":"2.0.0","keys":{"cw:a":"1"}}').error),'a newer format asks for an update');
  assert.ok(/empty/.test(w.dataRead('{"twistwright":1,"keys":{}}').error),'no keys: empty');
  const mixed=w.dataRead(JSON.stringify({twistwright:1,keys:{'x':'1','cw:a':'1','cw:b':'not json','cw:c':5,'cw:d':'{"n":2}'}}));
  assert.ok(mixed.ok&&mixed.count===2&&mixed.keys['cw:a']==='1'&&mixed.keys['cw:d']&&!mixed.keys['x']&&!mixed.keys['cw:b']&&!mixed.keys['cw:c'],'only cw: keys with stored JSON come in');
  // No room: the old data goes back.
  const m=new Map([['cw:a','1'],['cw:b','2'],['z','3']]);
  const full={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{if(k==='cw:big')throw new Error('QuotaExceededError');m.set(k,v);},removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size;}};
  assert.throws(()=>w.dataReplace(full,{'cw:new':'1','cw:big':'2'}),/Quota/,'a full store throws');
  assert.deepStrictEqual([...m.entries()].sort(),[['cw:a','1'],['cw:b','2'],['z','3']],'and keeps the old data');
  w.dataReplace(full,{'cw:new':'"x"'});
  assert.deepStrictEqual([...m.entries()].sort(),[['cw:new','"x"'],['z','3']],'a replace takes all the cw: keys out and leaves other keys');

  // ---- Copy my data ----
  assert.ok($(A,'#methodData').classList.contains('hidden'),'a return visit does not offer the data in the chooser');
  $(A,'#settingsBtn').click();
  assert.ok($(A,'#setData')&&/Your data/.test($(A,'#setArea').textContent),'the Settings window has Your data');
  assert.ok($(A,'#dataCopy').title&&$(A,'#dataPaste').title,'both buttons have a title');
  $(A,'#dataCopy').click();await sleep(20);
  const copied=w.dataRead(A.clip.text);
  assert.ok(copied.ok&&copied.count===Object.keys(cwKeys(A.ls)).length&&copied.version===VER,'Copy puts all the cw: keys on the clipboard, with the version');
  assert.ok(/Copied \d+ saved items/.test($(A,'#dataMsg').textContent)&&!$(A,'#dataText'),'and says so');
  $(A,'#dataCopy').focus();$(A,'#dataCopy').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.ok($(A,'#setBg'),'Enter in Your data does not close the window');
  $(A,'#setCancel').click();
  // The clipboard says no: the text in a box, selected.
  const A2=await boot({storage:{'cw:method':'"cfop"','cw:insp':'false'},write:'deny'});
  $(A2,'#settingsBtn').click();$(A2,'#dataCopy').click();await sleep(20);
  const ta=$(A2,'#dataText');
  assert.ok(ta&&ta.readOnly&&A2.w.dataRead(ta.value).ok&&/press ⌘C/.test($(A2,'#dataMsg').textContent),'no clipboard: the text shows in a box to copy');

  // ---- Paste my data ----
  const B=await boot({storage:{'cw:method':'"beginner"','cw:old':'1','keep':'y'},clip:{text:A.clip.text}});
  $(B,'#settingsBtn').click();$(B,'#dataPaste').click();await sleep(20);
  const ask=$(B,'#dataMsg').textContent;const nB=Object.keys(cwKeys(B.ls)).length;
  assert.ok(/Replace the data in this browser\?/.test(ask)&&new RegExp(`has ${copied.count} saved items, from Twistwright ${VER.replace(/\./g,'\\.')}`).test(ask)&&new RegExp(`The ${nB} saved items in this browser now go away`).test(ask),'Paste asks first, with both counts and the version');
  const [yes,no]=[...B.d.querySelectorAll('#dataMsg button')];
  assert.ok(yes.textContent==='Replace'&&no.textContent==='Keep my data'&&yes.title&&no.title&&B.d.activeElement===yes,'Replace and Keep my data, Replace in focus');
  no.click();
  assert.ok(B.ls.getItem('cw:old')==='1'&&B.reloads===0&&/Nothing changed/.test($(B,'#dataMsg').textContent),'Keep my data changes nothing');
  $(B,'#dataPaste').click();await sleep(20);B.d.querySelector('#dataMsg button').click();
  assert.deepStrictEqual(cwKeys(B.ls),Object.assign({},copied.keys),'Replace leaves exactly the pasted cw: keys');
  assert.ok(B.ls.getItem('keep')==='y'&&B.reloads===1,'other keys stay, and the page loads again');
  // The clipboard says no: a box to paste into.
  const C=await boot({storage:{'cw:method':'"cfop"'},read:'deny',clip:{text:A.clip.text}});
  $(C,'#settingsBtn').click();$(C,'#dataPaste').click();await sleep(20);
  const box=$(C,'#dataText');
  assert.ok(box&&!box.readOnly&&box.title&&C.d.activeElement===box,'no clipboard: an empty box in focus');
  box.value='my notes';box.dispatchEvent(new C.w.Event('input'));
  assert.ok($(C,'#dataMsg').classList.contains('warn')&&/not Twistwright data/.test($(C,'#dataMsg').textContent),'other text: a warning');
  box.value=A.clip.text;box.dispatchEvent(new C.w.Event('input'));
  assert.ok(/Replace the data/.test($(C,'#dataMsg').textContent),'the data pasted in the box: the question');
  // An empty clipboard: the box too.
  const C2=await boot({storage:{'cw:method':'"cfop"'},clip:{text:''}});
  $(C2,'#settingsBtn').click();$(C2,'#dataPaste').click();await sleep(20);
  assert.ok($(C2,'#dataText')&&!$(C2,'#dataText').readOnly,'an empty clipboard: the box');

  // ---- the first visit ----
  const F=await boot({clip:{text:A.clip.text}});
  assert.ok(!$(F,'#methodData').classList.contains('hidden')&&!$(F,'#methodPop').classList.contains('hidden'),'the first visit offers the data in the chooser');
  assert.ok($(F,'#methodPaste').title,'its button has a title');
  await sleep(300); // the chooser puts the focus on its card first
  $(F,'#methodPaste').click();await sleep(20);
  assert.ok($(F,'#methodPop').classList.contains('hidden')&&$(F,'#setBg')&&F.clip.reads===1,'it closes the chooser, opens Settings and reads the clipboard');
  assert.ok(/Replace the data/.test($(F,'#dataMsg').textContent),'and asks to replace');
  await sleep(40);assert.ok(F.d.activeElement.closest('#setData'),'the focus stays in Your data');
  F.d.querySelector('#dataMsg button').click();
  assert.ok(F.ls.getItem('cw:insp')==='false'&&F.reloads===1,'the data comes in');

  // ---- the first-visit preview saves nothing ----
  const P=await boot({query:'?onboard',storage:{'cw:insp':'true'},clip:{text:A.clip.text}});
  $(P,'#methodPaste').click();await sleep(20);
  assert.ok(/preview/.test($(P,'#dataMsg').textContent)&&P.ls.getItem('cw:insp')==='true'&&P.reloads===0,'the preview takes no data');

  for(const t of [A,A2,B,C,C2,F,P])assert.deepStrictEqual(t.errs,[],'no script errors');
  console.log('transfer: the text and back, Copy, Paste, the box, the question, the first visit, the preview ok');process.exit(0);
}catch(e){console.error('transfer: FAIL',e.message);process.exit(1);}})();
