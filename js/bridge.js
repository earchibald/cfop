// ================= The macOS app as a Bluetooth bridge =================
// Safari has no Web Bluetooth. The Twistwright app for macOS (mac/) serves this page at
// http://127.0.0.1:27272/ and runs a WebSocket bridge to CoreBluetooth beside it. The page keeps
// the GAN protocol and the cipher (gan.js); the app moves bytes. bridgeDevice wraps a cube behind
// the bridge in the shape of a Web Bluetooth device, so ganOpen works on it unchanged. The
// messages are listed in mac/Sources/Bridge.swift. No DOM: smart-ui.js draws the chooser.
let BRIDGE=null; // the open link to the app, or null

// The page can only have a bridge when the app serves it, at a loopback address. BRIDGE_LOCAL
// lets a test say so for a page loaded from a file.
function bridgeLocal(){
  if(typeof BRIDGE_LOCAL!=='undefined'&&BRIDGE_LOCAL)return true;
  return typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}
// Ask the server of this page whether it is the app. Resolves {version, ws} or null.
async function bridgeProbe(){
  if(!bridgeLocal()||typeof fetch!=='function')return null;
  try{const r=await fetch('/bridge/info',{cache:'no-store'});if(!r.ok)return null;const i=await r.json();return i&&i.app==='Twistwright'&&i.ws?i:null;}
  catch(e){return null;}
}
function bridgeHex(buf){const u=buf instanceof Uint8Array?buf:new Uint8Array(buf.buffer||buf,buf.byteOffset||0,buf.byteLength);let s='';for(const b of u)s+=b.toString(16).padStart(2,'0');return s;}
function bridgeBytes(hex){const u=new Uint8Array(hex.length>>1);for(let i=0;i<u.length;i++)u[i]=parseInt(hex.substr(2*i,2),16);return u;}

// Open the WebSocket and wait for hello. Resolves the link:
// {version, bluetooth, send, request, on, off, close, scan}. bluetooth is the state of Bluetooth
// on the Mac: poweredOn, poweredOff, unauthorized, unsupported or unknown (not started yet).
function bridgeConnect(info){
  return new Promise((res,rej)=>{
    const ws=new WebSocket(info.ws);const handlers=new Set();let open=false;
    const link={version:info.version,bluetooth:'unknown',
      send:m=>ws.send(JSON.stringify(m)),
      on:f=>handlers.add(f),off:f=>handlers.delete(f),
      close:()=>ws.close(),
      // Send a request and wait for the event that answers it: ev with the same id, or written
      // and error with the same seq.
      request(m,ev,ms){return new Promise((ok,bad)=>{
        const t=setTimeout(()=>{link.off(f);bad(Object.assign(new Error('The app did not answer.'),{code:'timeout'}));},ms||10000);
        const f=e=>{if(e.ev==='closed'){clearTimeout(t);link.off(f);bad(Object.assign(new Error('The app went away.'),{code:'closed'}));return;}
          if(m.seq!=null?e.seq!==m.seq:e.id!==m.id)return;
          if(e.ev===ev){clearTimeout(t);link.off(f);ok(e);}
          else if(e.ev==='error'){clearTimeout(t);link.off(f);bad(Object.assign(new Error(e.message),{code:'bridge'}));}};
        link.on(f);link.send(m);});},
      // Look for cubes. onDevice gets {id, name, mac} for each; the mac can come in a second
      // message, once an advertisement carries it. Returns a function that stops the scan.
      scan(onDevice){const f=e=>{if(e.ev==='device')onDevice(e);};link.on(f);link.send({op:'scan'});return()=>{link.off(f);link.send({op:'stop'});};}};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}
      if(m.ev==='hello'){link.bluetooth=m.bluetooth;open=true;res(link);}
      if(m.ev==='bluetooth')link.bluetooth=m.state;
      handlers.forEach(f=>f(m));};
    ws.onerror=()=>{if(!open)rej(new Error('The app did not answer.'));};
    ws.onclose=()=>{if(!open)rej(new Error('The app did not answer.'));if(BRIDGE===link){BRIDGE=null;bridgeChanged();}handlers.forEach(f=>f({ev:'closed'}));};
  });
}
function bridgeChanged(){if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('cw:bridge'));}
// Find the app and open the link. Resolves the link, or null where there is no app.
let bridgeStarting=null;
function bridgeStart(){
  if(BRIDGE)return Promise.resolve(BRIDGE);
  if(bridgeStarting)return bridgeStarting;
  return bridgeStarting=(async()=>{
    const info=await bridgeProbe();
    if(info){try{BRIDGE=await bridgeConnect(info);}catch(e){BRIDGE=null;}}
    bridgeStarting=null;if(info)bridgeChanged();return BRIDGE;
  })();
}

// A cube behind the bridge, in the shape of a Web Bluetooth device: the parts that ganOpen uses.
function bridgeDevice(link,d){
  const L=()=>{const m=new Map();return {on:(t,f)=>{(m.get(t)||m.set(t,[]).get(t)).push(f);},off:(t,f)=>{const a=m.get(t)||[];const i=a.indexOf(f);if(i>=0)a.splice(i,1);},fire:(t,e)=>(m.get(t)||[]).slice().forEach(f=>f(e))};};
  const devL=L(),chars=new Map();let services=[],seq=0;
  const char=u=>{if(chars.has(u))return chars.get(u);const cl=L();const c={uuid:u,value:null,addEventListener:cl.on,removeEventListener:cl.off,
    async startNotifications(){link.send({op:'notify',id:d.id,char:u});return c;},
    async stopNotifications(){return c;},
    async writeValue(buf){const s=++seq;await link.request({op:'write',id:d.id,char:u,data:bridgeHex(buf),seq:s},'written',3000);},
    fire:v=>{c.value=new DataView(v.buffer,v.byteOffset,v.byteLength);cl.fire('characteristicvaluechanged',{target:c});}};
    chars.set(u,c);return c;};
  const svc=s=>({uuid:s.uuid,async getCharacteristic(u){u=u.toLowerCase();if(!s.chars.includes(u))throw new Error('no characteristic '+u);return char(u);}});
  const onEv=e=>{
    if(e.ev==='value'&&e.id===d.id){const c=chars.get(e.char);if(c)c.fire(bridgeBytes(e.data));}
    if((e.ev==='gone'&&e.id===d.id)||e.ev==='closed'){if(!gatt.connected)return;gatt.connected=false;link.off(onEv);devL.fire('gattserverdisconnected',{});}};
  const gatt={connected:false,
    async connect(){const r=await link.request({op:'connect',id:d.id},'connected',15000);services=r.services||[];gatt.connected=true;link.on(onEv);return gatt;},
    disconnect(){if(gatt.connected)link.send({op:'disconnect',id:d.id});},
    async getPrimaryServices(){return services.map(svc);},
    async getPrimaryService(u){u=u.toLowerCase();const s=services.find(x=>x.uuid===u);if(!s)throw new Error('no service '+u);return svc(s);}};
  return {id:d.id,name:d.name,mac:d.mac,gatt,addEventListener:devL.on,removeEventListener:devL.off};
}
if(typeof window!=='undefined')bridgeStart();
