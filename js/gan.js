// ================= GAN smart cubes over Bluetooth =================
// Reads the state of a GAN smart cube (the GAN 12 ui and its family) through Web Bluetooth.
// GAN uses three protocols. The GATT service that the cube offers names its protocol:
//   gen 2  GAN12 ui, GAN12 ui FreePlay, GAN Mini ui FreePlay, GAN356 i Carry, i Carry S, i 3
//   gen 3  GAN356 i Carry 2
//   gen 4  GAN12 ui Maglev, GAN14 ui FreePlay
// The protocol facts come from gan-web-bluetooth (Andy Fedotov, MIT) and csTimer.
// Each message is 16 or 20 bytes. GAN encrypts the first 16 bytes with AES-128-CBC, then the
// last 16 bytes the same way. The key and the IV are fixed, salted with the cube's MAC address.
// Web Bluetooth does not give the MAC address. The cube puts it at the end of its
// manufacturer data, which only watchAdvertisements() can read. Where the browser cannot, the
// user types it.
// The cube reports its state as cubies in the Kociemba order that engine.js uses, relative to
// its own centers: white up, green front. ganDecode(...).cube is a Cube, ready for scrambleFromCube.
// Everything above ganPick runs without a browser.

const GAN_KEYS=[
  {key:[0x01,0x02,0x42,0x28,0x31,0x91,0x16,0x07,0x20,0x05,0x18,0x54,0x42,0x11,0x12,0x53],
   iv:[0x11,0x03,0x32,0x28,0x21,0x01,0x76,0x27,0x20,0x95,0x78,0x14,0x32,0x12,0x02,0x43]}, // GAN gen 2, 3 and 4
  {key:[0x05,0x12,0x02,0x45,0x02,0x01,0x29,0x56,0x12,0x78,0x12,0x76,0x81,0x01,0x08,0x03],
   iv:[0x01,0x44,0x28,0x06,0x86,0x21,0x22,0x28,0x51,0x05,0x08,0x31,0x82,0x02,0x21,0x06]}, // MoYu AI 2023 (gen 2 protocol)
];
const GAN_RESET=[0x05,0x39,0x77,0x00,0x00,0x01,0x23,0x45,0x67,0x89,0xAB]; // the solved state, as the reset command carries it
const GAN_GENS={
  2:{service:'6e400001-b5a3-f393-e0a9-e50e24dc4179',cmd:'28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4',state:'28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4',len:20,
     req:{state:[0x04],battery:[0x09],reset:[0x0A,...GAN_RESET]}},
  3:{service:'8653000a-43e6-47b7-9cb0-5fc21d4ae340',cmd:'8653000c-43e6-47b7-9cb0-5fc21d4ae340',state:'8653000b-43e6-47b7-9cb0-5fc21d4ae340',len:16,
     req:{state:[0x68,0x01],battery:[0x68,0x07],reset:[0x68,0x05,...GAN_RESET]}},
  4:{service:'00000010-0000-fff7-fff6-fff5fff4fff0',cmd:'0000fff5-0000-1000-8000-00805f9b34fb',state:'0000fff6-0000-1000-8000-00805f9b34fb',len:20,
     req:{state:[0xDD,0x04,0x00,0xED,0x00,0x00],battery:[0xDD,0x04,0x00,0xEF,0x00,0x00],reset:[0xD2,0x0D,...GAN_RESET]}},
};
// The company codes that GAN puts its manufacturer data under: 0x0001, 0x0101 ... 0xFF01.
const GAN_CIC=Array.from({length:256},(_,i)=>(i<<8)|0x01);

// ----- AES-128, one block at a time -----
const AES_S=new Uint8Array(256),AES_SI=new Uint8Array(256);
(()=>{const rot=(x,s)=>((x<<s)|(x>>(8-s)))&0xff;let p=1,q=1;
  do{p=(p^(p<<1)^(p&0x80?0x1b:0))&0xff;q^=q<<1;q^=q<<2;q^=q<<4;q&=0xff;if(q&0x80)q^=0x09;
    const x=q^rot(q,1)^rot(q,2)^rot(q,3)^rot(q,4)^0x63;AES_S[p]=x;AES_SI[x]=p;}while(p!==1);
  AES_S[0]=0x63;AES_SI[0x63]=0;})();
const aesX=a=>((a<<1)^(a&0x80?0x1b:0))&0xff;
function aesMul(a,b){let r=0;while(b){if(b&1)r^=a;a=aesX(a);b>>=1;}return r;}
function aesExpand(key){
  const w=new Uint8Array(176);w.set(key);let rc=1;
  for(let i=16;i<176;i+=4){
    let t=[w[i-4],w[i-3],w[i-2],w[i-1]];
    if(i%16===0){t=[AES_S[t[1]]^rc,AES_S[t[2]],AES_S[t[3]],AES_S[t[0]]];rc=aesX(rc);}
    for(let j=0;j<4;j++)w[i+j]=w[i-16+j]^t[j];
  }
  return w;
}
function aesRound(s,w,r){for(let i=0;i<16;i++)s[i]^=w[16*r+i];}
function aesShift(s,dir){const t=s.slice();for(let c=0;c<4;c++)for(let r=1;r<4;r++)s[r+4*c]=t[r+4*((c+dir*r+4)%4)];}
function aesMix(s,m){for(let c=0;c<4;c++){const a=s.slice(4*c,4*c+4);for(let r=0;r<4;r++)s[4*c+r]=aesMul(a[0],m[(4-r)%4])^aesMul(a[1],m[(5-r)%4])^aesMul(a[2],m[(6-r)%4])^aesMul(a[3],m[(7-r)%4]);}}
function aesEncrypt(w,block){
  const s=Uint8Array.from(block);aesRound(s,w,0);
  for(let r=1;r<=10;r++){for(let i=0;i<16;i++)s[i]=AES_S[s[i]];aesShift(s,1);if(r<10)aesMix(s,[2,3,1,1]);aesRound(s,w,r);}
  return s;
}
function aesDecrypt(w,block){
  const s=Uint8Array.from(block);aesRound(s,w,10);
  for(let r=9;r>=0;r--){aesShift(s,-1);for(let i=0;i<16;i++)s[i]=AES_SI[s[i]];aesRound(s,w,r);if(r>0)aesMix(s,[14,11,13,9]);}
  return s;
}

// ----- the GAN cipher -----
// mac: "AB:12:34:56:78:9A". The salt is its six bytes in reverse order. GAN adds them mod 255, not 256.
function ganParseMac(mac){
  const b=String(mac||'').trim().split(/[:\-\s]+/);
  if(b.length!==6||!b.every(x=>/^[0-9a-f]{2}$/i.test(x)))return null;
  return b.map(x=>x.toUpperCase()).join(':');
}
function ganCipher(mac,keyIdx){
  const m=ganParseMac(mac);if(!m)throw new Error('bad MAC address');
  const salt=m.split(':').map(x=>parseInt(x,16)).reverse(),K=GAN_KEYS[keyIdx||0];
  const key=K.key.slice(),iv=K.iv.slice();
  for(let i=0;i<6;i++){key[i]=(K.key[i]+salt[i])%255;iv[i]=(K.iv[i]+salt[i])%255;}
  const w=aesExpand(key);
  const enc=(b,o)=>{const blk=b.slice(o,o+16);for(let i=0;i<16;i++)blk[i]^=iv[i];b.set(aesEncrypt(w,blk),o);};
  const dec=(b,o)=>{const blk=aesDecrypt(w,b.slice(o,o+16));for(let i=0;i<16;i++)blk[i]^=iv[i];b.set(blk,o);};
  return {
    encrypt(data){const b=Uint8Array.from(data);if(b.length<16)throw new Error('message too short');enc(b,0);if(b.length>16)enc(b,b.length-16);return b;},
    decrypt(data){const b=Uint8Array.from(data);if(b.length<16)throw new Error('message too short');if(b.length>16)dec(b,b.length-16);dec(b,0);return b;},
  };
}
// A command, padded to the length the protocol uses. kind: state, battery or reset.
function ganCommand(gen,kind){const g=GAN_GENS[gen],m=new Uint8Array(g.len);m.set(g.req[kind]);return m;}

// ----- messages -----
// Read `len` bits from bit `start`, most significant bit first. A 16-bit word can be little-endian.
function ganBits(msg){
  const s=Array.from(msg,b=>(b+256).toString(2).slice(1)).join('');
  return (start,len,le)=>{
    if(!le||len<=8)return parseInt(s.slice(start,start+len),2);
    let v=0;for(let i=len/8-1;i>=0;i--)v=v*256+parseInt(s.slice(start+8*i,start+8*i+8),2);return v;
  };
}
// Where each protocol keeps the state: the bit of the first corner and edge fields.
const GAN_STATE_AT={2:{cp:12,co:33,ep:47,eo:91},3:{cp:40,co:61,ep:77,eo:121},4:{cp:32,co:53,ep:69,eo:113}};
function ganState(bits,at){
  const cp=[],co=[],ep=[],eo=[],sum=a=>a.reduce((x,y)=>x+y,0);
  for(let i=0;i<7;i++){cp.push(bits(at.cp+3*i,3));co.push(bits(at.co+2*i,2));}
  cp.push(28-sum(cp));co.push((3-sum(co)%3)%3);
  for(let i=0;i<11;i++){ep.push(bits(at.ep+4*i,4));eo.push(bits(at.eo+i,1));}
  ep.push(66-sum(ep));eo.push((2-sum(eo)%2)%2);
  const perm=(a,n)=>a.length===n&&new Set(a).size===n&&a.every(x=>x>=0&&x<n);
  // A wrong MAC address decrypts to noise, and noise almost never gives two permutations.
  if(!perm(cp,8)||!perm(ep,12)||co.some(x=>x>2))return null;
  return new Cube(cp,co,ep,eo);
}
// The tilt of the cube: four 16-bit words w, x, y, z from bit `at`, each a sign bit and a 15-bit
// size. The cube's own axes (+x red, +y blue, +z white, right-handed) go to the axes of draw.js
// (x right, y up, z toward the viewer) as gan-cube-sample maps them: x, z, -y. The reading is
// the turn of the body (the cube's axes taken to the world's), and both gan-cube-sample and
// cubing.js apply it to the cube object as it is; draw.js takes `rot` the same way. Do not negate
// the vector part: 1.6.1 and 1.11.1 did, and every axis turned the wrong way. What looked wrong
// in 1.11.0 was the heading lined up again on its own part way through a y turn (cubetab.js,
// taken out in 1.12.0), not the sign. q is [x,y,z,w], a unit quaternion.
function ganGyro(bits,at){
  const f=i=>{const v=bits(at+16*i,16);return (v&0x8000?-1:1)*(v&0x7fff)/0x7fff;};
  const w=f(0),x=f(1),y=f(2),z=f(3);
  return {type:'gyro',q:[x,z,-y,w]};
}
// Decode a decrypted message. Returns {type:'state',cube}, {type:'move'}, {type:'gyro',q},
// {type:'battery',level}, {type:'off'}, {type:'bad'} for a state that is not a cube, or null for
// anything else. The gen 3 cube (i Carry 2) has no gyro.
function ganDecode(gen,msg){
  const bits=ganBits(msg);let type;
  if(gen===2){
    type=bits(0,4);
    if(type===0x04){const cube=ganState(bits,GAN_STATE_AT[2]);return cube?{type:'state',cube}:{type:'bad'};}
    if(type===0x02)return {type:'move'};
    if(type===0x01)return ganGyro(bits,4);
    if(type===0x09)return {type:'battery',level:Math.min(bits(8,8),100)};
    if(type===0x0D)return {type:'off'};
    return null;
  }
  if(gen===3){
    if(bits(0,8)!==0x55||!bits(16,8))return null;
    type=bits(8,8);
    if(type===0x02){const cube=ganState(bits,GAN_STATE_AT[3]);return cube?{type:'state',cube}:{type:'bad'};}
    if(type===0x01)return {type:'move'};
    if(type===0x10)return {type:'battery',level:Math.min(bits(24,8),100)};
    if(type===0x11)return {type:'off'};
    return null;
  }
  type=bits(0,8);
  if(type===0xED){const cube=ganState(bits,GAN_STATE_AT[4]);return cube?{type:'state',cube}:{type:'bad'};}
  if(type===0x01)return {type:'move'};
  if(type===0xEC)return ganGyro(bits,16);
  if(type===0xEF){const n=bits(8,8);return 8+n*8+8<=msg.length*8?{type:'battery',level:Math.min(bits(8+n*8,8),100)}:null;}
  if(type===0xEA)return {type:'off'};
  return null;
}
// The MAC address from manufacturer data: the last six bytes of the first nine, in reverse order.
function ganMacFromData(mfData){
  let dv=null;
  if(mfData instanceof DataView)dv=new DataView(mfData.buffer.slice(2,11)); // Bluefy gives the raw bytes
  else if(mfData&&mfData.has)for(const id of GAN_CIC)if(mfData.has(id)){dv=new DataView(mfData.get(id).buffer.slice(0,9));break;}
  if(!dv||dv.byteLength<6)return null;
  const b=[];for(let i=1;i<=6;i++)b.push(dv.getUint8(dv.byteLength-i).toString(16).toUpperCase().padStart(2,'0'));
  return b.join(':');
}

// ----- Web Bluetooth -----
// Web Bluetooth, or the bridge of the macOS app (bridge.js) where the app serves the page.
// The app's own window counts before it answers hello: its message handler is there from the start.
function ganAvailable(){return (typeof navigator!=='undefined'&&!!navigator.bluetooth)||(typeof BRIDGE!=='undefined'&&!!BRIDGE)||(typeof bridgeNative==='function'&&!!bridgeNative());}
// Show the browser's device chooser. Needs a click.
function ganPick(){
  return navigator.bluetooth.requestDevice({
    filters:[{namePrefix:'GAN'},{namePrefix:'MG'},{namePrefix:'AiCube'}],
    optionalServices:[GAN_GENS[2].service,GAN_GENS[3].service,GAN_GENS[4].service],
    optionalManufacturerData:GAN_CIC});
}
// Listen for the cube's advertisements and take the MAC address from them. Resolves null where
// the browser cannot (Chrome needs chrome://flags/#enable-experimental-web-platform-features) or
// after `ms`. An advertisement without manufacturer data is skipped: some packets carry none.
function ganWatchMac(device,ms){
  return new Promise(res=>{
    if(typeof device.watchAdvertisements!=='function'){res(null);return;}
    const ab=new AbortController();let done=false;
    const end=mac=>{if(done)return;done=true;clearTimeout(t);device.removeEventListener('advertisementreceived',on);ab.abort();res(mac);};
    const on=e=>{const mac=ganMacFromData(e.manufacturerData);if(mac)end(mac);};
    const t=setTimeout(()=>end(null),ms||8000);
    device.addEventListener('advertisementreceived',on);
    device.watchAdvertisements({signal:ab.signal}).catch(()=>end(null));
  });
}
// A correction for a cube whose count is off. The cube cannot see its stickers: it counts its
// turns from the last reset, and a turn it missed leaves the count off for good. A scan or a
// painted net gives the real state `actual` while the cube reports `raw`. Every later turn moves
// both the same way, so the real state stays fix.mul(reported) with fix = actual.mul(raw.inverse()).
// ganFixFor builds the fix; ganFixApply applies one (null is no fix). A fix is a plain Cube and
// survives in storage as {cp,co,ep,eo}: ganFixSave and ganFixLoad.
function ganFixFor(actual,raw){return actual.mul(raw.inverse());}
function ganFixApply(fix,cube){return fix?fix.mul(cube):cube;}
function ganFixSave(fix){return fix?{cp:fix.cp.slice(),co:fix.co.slice(),ep:fix.ep.slice(),eo:fix.eo.slice()}:null;}
function ganFixLoad(o){
  if(!o||!Array.isArray(o.cp)||!Array.isArray(o.co)||!Array.isArray(o.ep)||!Array.isArray(o.eo))return null;
  if(o.cp.length!==8||o.co.length!==8||o.ep.length!==12||o.eo.length!==12)return null;
  return new Cube(o.cp.slice(),o.co.slice(),o.ep.slice(),o.eo.slice());
}
// How often the link asks the cube for its charge. The first ask comes soon after the connect, once
// the caller's first read is on its way. A cube sends the level by itself now and then too.
const GAN_BATTERY_MS=60000,GAN_BATTERY_FIRST_MS=300;
// Connect and start notifications. onEvent gets each decoded message, then {type:'gone'} when the
// link drops. Returns {gen, name, mac, fix, raw, battery, send(kind), readState(ms), correct(actual, ms),
// setFix(fix), close()}. `battery` is the charge, 0 to 100, or null until the cube has said.
// readState asks for the state and resolves with a Cube. It rejects with code 'badmac' when the
// cube talks but nothing decodes, and 'timeout' when there is no answer. A wrong MAC address
// often gives a timeout too: the cube cannot read the request, so it does not answer.
// Every state goes through the fix (opts.fix to start, ganFixFor above): readState, the state
// events and the 'connect' cube all show the corrected cube; `raw` is the last state as the cube
// sent it. correct(actual) reads the cube, takes `actual` as its real state now, sets the fix and
// sends a state event with the corrected cube. setFix(null) drops the fix. The reset command
// drops it too: the cube counts from solved again, and the fix would be wrong.
async function ganOpen(device,mac,onEvent,opts){
  opts=opts||{};
  const server=await device.gatt.connect();
  const uuids=(await server.getPrimaryServices()).map(s=>s.uuid.toLowerCase());
  const gen=[4,3,2].find(g=>uuids.includes(GAN_GENS[g].service));
  if(!gen){server.disconnect();throw Object.assign(new Error('This is not a GAN cube that Twistwright knows.'),{code:'model'});}
  const g=GAN_GENS[gen],svc=await server.getPrimaryService(g.service);
  const cmd=await svc.getCharacteristic(g.cmd),st=await svc.getCharacteristic(g.state);
  const cipher=ganCipher(mac,gen===2&&/^AiCube/.test(device.name||'')?1:0);
  const waiting=[];let heard=0,known=0,conn=null;
  const onValue=e=>{
    const v=e.target.value;if(!v||v.byteLength<16)return;heard++;
    let ev=ganDecode(gen,cipher.decrypt(new Uint8Array(v.buffer,v.byteOffset,v.byteLength)));if(!ev)return;
    if(ev.type!=='bad')known++;
    if(ev.type==='state'){const fix=conn?conn.fix:opts.fix||null;if(conn)conn.raw=ev.cube;ev={type:'state',cube:ganFixApply(fix,ev.cube)};}
    if(ev.type==='battery'&&conn)conn.battery=ev.level;
    if(ev.type==='state'||ev.type==='bad')waiting.splice(0).forEach(w=>w(ev));
    if(ev.type!=='bad')onEvent&&onEvent(ev);
  };
  let batTimer=0;
  const onGone=()=>{clearTimeout(batTimer);st.removeEventListener('characteristicvaluechanged',onValue);device.removeEventListener('gattserverdisconnected',onGone);onEvent&&onEvent({type:'gone'});};
  st.addEventListener('characteristicvaluechanged',onValue);
  device.addEventListener('gattserverdisconnected',onGone);
  await st.startNotifications();
  conn={gen,name:device.name||'GAN cube',mac:ganParseMac(mac),fix:opts.fix||null,raw:null,battery:null,
    send(kind){if(kind==='reset')conn.fix=null;return cmd.writeValue(cipher.encrypt(ganCommand(gen,kind)));},
    setFix(fix){conn.fix=fix||null;},
    async correct(actual,ms){
      await conn.readState(ms);
      conn.fix=ganFixFor(actual,conn.raw);
      const cube=ganFixApply(conn.fix,conn.raw);
      onEvent&&onEvent({type:'state',cube});
      return cube;
    },
    readState(ms){
      return new Promise((res,rej)=>{
        const t=setTimeout(()=>{const i=waiting.indexOf(f);if(i>=0)waiting.splice(i,1);const noise=heard>0&&!known;
          rej(Object.assign(new Error(noise?'The messages from the cube do not decode.':'The cube did not answer.'),{code:noise?'badmac':'timeout'}));},ms||3000);
        const f=ev=>{clearTimeout(t);ev.type==='state'?res(ev.cube):rej(Object.assign(new Error('The answer from the cube is not a cube state.'),{code:'badmac'}));};
        waiting.push(f);
        conn.send('state').catch(e=>{clearTimeout(t);const i=waiting.indexOf(f);if(i>=0)waiting.splice(i,1);rej(e);});
      });
    },
    close(){clearTimeout(batTimer);try{st.stopNotifications().catch(()=>{});}catch(e){}if(device.gatt.connected)device.gatt.disconnect();},
  };
  const askBattery=()=>{batTimer=setTimeout(askBattery,GAN_BATTERY_MS);if(device.gatt.connected)conn.send('battery').catch(()=>{});};
  batTimer=setTimeout(askBattery,GAN_BATTERY_FIRST_MS);
  return conn;
}
