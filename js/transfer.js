// ===== Your data: all the cw: keys of this browser as one block of text, and that text back =====
// Each browser keeps its own saved data, and so does the Mac app's window: localStorage is one
// per browser and per address. Settings > Your data copies it all to the clipboard (Copy my data),
// and another browser takes it in (Paste my data), so data moves Mac app to Chrome, Safari to
// Chrome, or any other way. The first visit offers Paste my data in the method chooser. Paste
// replaces all the data in this browser, after a question, then loads the page again.
// The text: {"twistwright":1,"version":"1.47.0","saved":"<ISO date>","keys":{"cw:…":"<the stored text>"}}.
// The pure part (dataCollect, dataText, dataRead, dataReplace) takes a store in the shape of
// localStorage and has no DOM.

const DATA_FORMAT=1;
const DATA_NOT='This is not Twistwright data. In the other browser, open Settings and choose Copy my data. Then paste again.';
function dataCollect(ls){const keys={};
  try{for(let i=0;i<ls.length;i++){const k=ls.key(i);if(k&&k.slice(0,3)==='cw:')keys[k]=ls.getItem(k);}}catch(e){}
  return keys;}
function dataText(keys,version,now){return JSON.stringify({twistwright:DATA_FORMAT,version:String(version),saved:new Date(now).toISOString(),keys});}
// {ok, keys, count, version, saved} or {ok:false, error}. Only cw: keys with stored JSON come in.
function dataRead(text){
  let o;try{o=JSON.parse(String(text==null?'':text).trim());}catch(e){return {ok:false,error:DATA_NOT};}
  if(!o||typeof o!=='object'||typeof o.twistwright!=='number'||!o.keys||typeof o.keys!=='object'||Array.isArray(o.keys))return {ok:false,error:DATA_NOT};
  if(o.twistwright>DATA_FORMAT)return {ok:false,error:`This data comes from a newer Twistwright${typeof o.version==='string'?' ('+o.version+')':''}. Update this one, then paste again.`};
  const keys={};
  for(const [k,v] of Object.entries(o.keys)){if(k.slice(0,3)!=='cw:'||typeof v!=='string')continue;try{JSON.parse(v);}catch(e){continue;}keys[k]=v;}
  const count=Object.keys(keys).length;
  if(!count)return {ok:false,error:'This data is empty. The other browser has nothing saved.'};
  return {ok:true,keys,count,version:typeof o.version==='string'?o.version:'',saved:typeof o.saved==='string'?o.saved:null};}
// All the cw: keys out, the new ones in. Where the browser has no room, the old data goes back and
// the error goes on.
function dataReplace(ls,keys){const old=dataCollect(ls);
  try{for(const k of Object.keys(old))ls.removeItem(k);for(const [k,v] of Object.entries(keys))ls.setItem(k,v);}
  catch(e){for(const k of Object.keys(dataCollect(ls)))ls.removeItem(k);for(const [k,v] of Object.entries(old))ls.setItem(k,v);throw e;}}

// ---------- the page ----------
// The store this page uses: localStorage, or the memory of the first-visit preview (?onboard).
function dataStore(){
  if(ONBOARD)return {get length(){return onboardMem.size;},key:i=>{const k=[...onboardMem.keys()][i];return k==null?null:'cw:'+k;},
    getItem:k=>onboardMem.has(k.slice(3))?onboardMem.get(k.slice(3)):null,setItem:(k,v)=>onboardMem.set(k.slice(3),v),removeItem:k=>onboardMem.delete(k.slice(3))};
  return localStorage;}
var dataReload=()=>location.reload(); // var: tests put their own in
const dataCount=n=>n+' saved item'+(n===1?'':'s');
// The Your data part of the Settings window.
function dataSectionHTML(){return `<h3>Your data</h3>
    <div id="setData">
     <p class="muted">Your times, case statuses, progress and settings are saved in this browser only. To use them in another browser or in the Mac app, copy them here, then paste them there.</p>
     <div class="row" style="gap:8px;margin-top:8px"><button type="button" class="small" id="dataCopy" title="Copy all your saved data to the clipboard, to paste in another browser or the Mac app">Copy my data</button><button type="button" class="small" id="dataPaste" title="Replace the data in this browser with data copied from another browser or the Mac app">Paste my data</button></div>
     <div class="data-msg" id="dataMsg" role="status"></div>
    </div>`;}
// The line under the buttons: plain text, a bold lead, and buttons ([label, title, fn, primary]).
function dataSay(text,o){const m=$('#dataMsg');if(!m)return;o=o||{};m.textContent='';m.classList.toggle('warn',!!o.warn);
  if(o.lead){const b=document.createElement('b');b.textContent=o.lead+' ';m.append(b);}
  m.append(text);
  if(o.buttons){const row=document.createElement('span');row.className='row';row.style.cssText='gap:8px;margin-top:8px';
    for(const [label,title,fn,primary] of o.buttons){const x=document.createElement('button');x.type='button';x.className='small '+(primary?'primary':'ghost');x.textContent=label;x.title=title;x.onclick=fn;row.append(x);}
    m.append(row);}}
function dataBoxGone(){const ta=$('#dataText');if(ta)ta.remove();}
// A text box under the buttons: the copied text to select, or an empty box to paste into.
function dataBox(text){let ta=$('#dataText');
  if(!ta){ta=document.createElement('textarea');ta.id='dataText';ta.rows=4;ta.spellcheck=false;$('#dataMsg').before(ta);}
  if(text!=null){ta.readOnly=true;ta.value=text;ta.title='Your data as text. Copy all of it';ta.oninput=null;ta.focus();ta.select();}
  else{ta.readOnly=false;ta.value='';ta.title='Paste the data from the other browser here';ta.placeholder='Paste your data here: ⌘V, or Ctrl+V';ta.focus();
    ta.oninput=()=>{if(ta.value.trim())dataTake(ta.value);};}
  return ta;}
function dataCopy(){const keys=dataCollect(dataStore()),n=Object.keys(keys).length,t=dataText(keys,APP_VERSION,Date.now());
  const show=()=>{dataBox(t);dataSay('Copy this text: press ⌘C, or Ctrl+C. Then, in the other browser, open Settings and choose Paste my data.');};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>{dataBoxGone();
    dataSay(`Copied ${dataCount(n)}. In the other browser or the Mac app, open Settings and choose Paste my data.`);},show);
  else show();}
// The clipboard where the browser lets the page read it, else a box to paste into.
function dataPaste(){
  if(navigator.clipboard&&navigator.clipboard.readText)navigator.clipboard.readText().then(t=>t&&t.trim()?dataTake(t):dataPasteBox(),dataPasteBox);
  else dataPasteBox();}
function dataPasteBox(){dataBox(null);dataSay('Paste the data that you copied in the other browser into the box.');}
function dataTake(text){const r=dataRead(text);
  if(!r.ok){dataSay(r.error,{warn:true});return;}
  if(ONBOARD){dataSay('This is a first-visit preview, and it saves nothing. Leave the preview, then paste again.',{warn:true});return;}
  const here=Object.keys(dataCollect(dataStore())).length;
  const when=r.saved&&!isNaN(Date.parse(r.saved))?new Date(r.saved).toLocaleString():'';
  const yes=()=>{try{dataReplace(dataStore(),r.keys);}catch(e){dataSay('This browser has no room for the data. Nothing changed.',{warn:true});return;}
    dataBoxGone();dataSay(`Done: ${dataCount(r.count)} came in. The page loads again.`);dataReload();};
  const no=()=>{dataBoxGone();dataSay('Nothing changed.');};
  dataSay(`The pasted data has ${dataCount(r.count)}${r.version?', from Twistwright '+r.version:''}${when?', copied '+when:''}. `+
    (here?`The ${dataCount(here)} in this browser now go away.`:'This browser has no saved data now.'),
    {lead:'Replace the data in this browser?',buttons:[['Replace','Replace the data in this browser and load the page again',yes,true],['Keep my data','Keep the data in this browser as it is',no]]});
  const b=$('#dataMsg button');if(b)b.focus();}
function dataMount(){const c=$('#dataCopy'),p=$('#dataPaste');if(c)c.onclick=dataCopy;if(p)p.onclick=dataPaste;}
