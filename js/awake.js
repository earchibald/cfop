// ===== Keep the screen awake while a smart cube turns (1.87) =====
// A smart cube's turns come over Bluetooth, not from the keyboard or the mouse, so the computer
// sees no one there: part way through a drill the screen dims, sleeps and locks. Each turn here
// counts as the user at the computer, for `holdMs` after the last one:
// - In the macOS app (its window, or Safari over its bridge): the page sends {op:'awake', seconds}
//   at most once per `sendMs`; the app tells macOS the user is active and holds the display awake
//   until `seconds` after the last one (mac/Sources/Awake.swift). seconds 0 lets it go. An app from
//   before 1.87 answers "Unknown request", which nothing reads.
// - In a browser with the Screen Wake Lock API (Chrome): a wake lock, let go after holdMs with no
//   turn. The browser lets go of it when the page is hidden; the next turn asks again.
// The site calls it on each `cw:smart` move; the lab calls awakeKick itself. No other DOM.
const AWAKE={holdMs:5*60000,sendMs:20000,sent:null,lock:null,asking:false,timer:0};
function awakeKick(now){
  now=now==null?Date.now():now;
  if(typeof BRIDGE!=='undefined'&&BRIDGE&&(AWAKE.sent==null||now-AWAKE.sent>=AWAKE.sendMs)){AWAKE.sent=now;try{BRIDGE.send({op:'awake',seconds:AWAKE.holdMs/1000});}catch(e){}}
  const wl=typeof navigator!=='undefined'&&navigator.wakeLock;
  if(wl&&!AWAKE.lock&&!AWAKE.asking&&(typeof document==='undefined'||document.visibilityState!=='hidden')){
    AWAKE.asking=true;
    Promise.resolve().then(()=>wl.request('screen')).then(l=>{AWAKE.lock=l;
      if(l&&l.addEventListener)l.addEventListener('release',()=>{if(AWAKE.lock===l)AWAKE.lock=null;});}).catch(()=>{}).then(()=>{AWAKE.asking=false;});}
  clearTimeout(AWAKE.timer);AWAKE.timer=setTimeout(awakeRelease,AWAKE.holdMs);
}
// No turn for holdMs, or the cube went away: the screen may sleep as it would.
function awakeRelease(){
  clearTimeout(AWAKE.timer);AWAKE.timer=0;
  if(AWAKE.sent!=null&&typeof BRIDGE!=='undefined'&&BRIDGE){try{BRIDGE.send({op:'awake',seconds:0});}catch(e){}}
  AWAKE.sent=null;
  const l=AWAKE.lock;AWAKE.lock=null;if(l&&l.release)Promise.resolve().then(()=>l.release()).catch(()=>{});
}
// Is the screen held awake now (a turn within holdMs)?
function awakeOn(){return !!AWAKE.timer;}
if(typeof document!=='undefined')document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;
  if(t==='move')awakeKick();else if(t==='disconnect'||t==='gone')awakeRelease();});
