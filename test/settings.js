// The Settings window: a button left of Theme, an empty settings area, Cancel (Esc) and Save
// (Enter), and the version at the bottom right. The version matches package.json.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key=(type,k)=>d.activeElement.dispatchEvent(new w.KeyboardEvent(type,{key:k,code:k.length===1?'Key'+k.toUpperCase():k,bubbles:true,cancelable:true}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
  const v=w.eval('APP_VERSION');
  assert.ok(/^\d+\.\d+\.\d+$/.test(v),'the version has three numbers');
  assert.strictEqual(v,pkg.version,'js/version.js and package.json carry the same version');
  // The button sits just left of Theme.
  assert.strictEqual($('#settingsBtn').nextElementSibling.id,'themeBtn','Settings is left of Theme');
  // The window: the settings area, then the buttons, then the version.
  $('#settingsBtn').click();const m=$('#setBg .modal');
  assert.ok(m&&$('#setArea').textContent.trim(),'the settings area has a note');
  assert.ok(/Cancel/.test($('#setCancel').textContent)&&$('#setCancel .hk').textContent==='Esc','Cancel shows Esc');
  assert.ok(/Save/.test($('#setSave').textContent)&&$('#setSave .hk').textContent==='Enter','Save shows Enter');
  const kids=[...m.children];
  assert.ok(kids.indexOf($('#setArea'))<kids.indexOf($('#setSave').parentNode)&&kids.indexOf($('#setSave').parentNode)<kids.indexOf($('#appVer')),'area, buttons, version, in that order');
  assert.strictEqual(kids[kids.length-1].id,'appVer','the version is last');
  assert.ok($('#appVer').textContent.includes(v),'the window shows the version');
  // Keys go to the window only: N does not make a new scramble.
  await sleep(30);const seed=$('#seed').value;key('keydown','n');key('keyup','n');assert.strictEqual($('#seed').value,seed,'N does not reach the page');
  key('keydown','Escape');assert.ok(!$('#setBg'),'Esc closes');
  $('#settingsBtn').click();await sleep(30);key('keydown','Enter');assert.ok(!$('#setBg'),'Enter saves and closes');
  $('#settingsBtn').click();$('#setCancel').click();assert.ok(!$('#setBg'),'Cancel closes');
  $('#settingsBtn').click();$('#setBg').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.ok(!$('#setBg'),'a click outside closes');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('settings: button, empty area, Cancel and Save keys, version ok');process.exit(0);
}catch(e){console.error('settings: FAIL',e.message,errs);process.exit(1);}});
