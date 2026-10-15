// A fake GAN smart cube for the tests: a Web Bluetooth device that speaks the GAN protocol.
// It encrypts with Node's own AES, not the one in js/gan.js, so the tests check one against the other.
const crypto=require('crypto');
const KEY=[0x01,0x02,0x42,0x28,0x31,0x91,0x16,0x07,0x20,0x05,0x18,0x54,0x42,0x11,0x12,0x53];
const IV=[0x11,0x03,0x32,0x28,0x21,0x01,0x76,0x27,0x20,0x95,0x78,0x14,0x32,0x12,0x02,0x43];
const UUID={2:['6e400001-b5a3-f393-e0a9-e50e24dc4179','28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4','28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4'],
  3:['8653000a-43e6-47b7-9cb0-5fc21d4ae340','8653000c-43e6-47b7-9cb0-5fc21d4ae340','8653000b-43e6-47b7-9cb0-5fc21d4ae340'],
  4:['00000010-0000-fff7-fff6-fff5fff4fff0','0000fff5-0000-1000-8000-00805f9b34fb','0000fff6-0000-1000-8000-00805f9b34fb']};
function salted(mac){const s=mac.split(':').map(x=>parseInt(x,16)).reverse(),k=KEY.slice(),v=IV.slice();for(let i=0;i<6;i++){k[i]=(KEY[i]+s[i])%255;v[i]=(IV[i]+s[i])%255;}return {k:Buffer.from(k),v:Buffer.from(v)};}
function chunk(op,mac,b,o){const {k,v}=salted(mac);const c=(op==='enc'?crypto.createCipheriv:crypto.createDecipheriv)('aes-128-cbc',k,v);c.setAutoPadding(false);b.set(Buffer.concat([c.update(b.subarray(o,o+16)),c.final()]),o);}
function encrypt(mac,data){const b=Buffer.from(data);chunk('enc',mac,b,0);if(b.length>16)chunk('enc',mac,b,b.length-16);return b;}
function decrypt(mac,data){const b=Buffer.from(data);if(b.length>16)chunk('dec',mac,b,b.length-16);chunk('dec',mac,b,0);return b;}
// Write bits most significant first; a 16-bit word can be little-endian.
function writer(len){const bits=new Array(len*8).fill(0);return {put(start,n,v,le){if(le&&n>8){const lo=[];for(let i=0;i<n/8;i++)lo.push((v>>(8*i))&0xff);lo.forEach((x,i)=>this.put(start+8*i,8,x));return;}for(let i=0;i<n;i++)bits[start+i]=(v>>(n-1-i))&1;},bytes(){const out=new Uint8Array(len);for(let i=0;i<len;i++)for(let j=0;j<8;j++)out[i]=out[i]*2+bits[8*i+j];return out;}};}
const AT={2:{cp:12,co:33,ep:47,eo:91},3:{cp:40,co:61,ep:77,eo:121},4:{cp:32,co:53,ep:69,eo:113}};
// The plain state message for a cube {cp,co,ep,eo}.
function stateMsg(gen,c,serial){
  const w=writer(20),a=AT[gen]; // a gen 3 state runs past bit 128, so it is longer than 16 bytes
  if(gen===2){w.put(0,4,4);w.put(4,8,serial&0xff);}
  if(gen===3){w.put(0,8,0x55);w.put(8,8,0x02);w.put(16,8,13);w.put(24,16,serial,true);}
  if(gen===4){w.put(0,8,0xED);w.put(8,8,15);w.put(16,16,serial,true);}
  for(let i=0;i<7;i++){w.put(a.cp+3*i,3,c.cp[i]);w.put(a.co+2*i,2,c.co[i]);}
  for(let i=0;i<11;i++){w.put(a.ep+4*i,4,c.ep[i]);w.put(a.eo+i,1,c.eo[i]);}
  return w.bytes();
}
// A tilt message: w, x, y, z in the cube's own frame, each -1..1, as a sign bit and 15 bits. Gen 3 has none.
function gyroMsg(gen,q){const w=writer(20),at=gen===2?4:16;if(gen===2)w.put(0,4,1);else w.put(0,8,0xEC);
  [q.w,q.x,q.y,q.z].forEach((v,i)=>w.put(at+16*i,16,(v<0?0x8000:0)|Math.round(Math.abs(v)*0x7fff)));return w.bytes();}
function batteryMsg(gen,level){const w=writer(gen===3?16:20);
  if(gen===2){w.put(0,4,9);w.put(8,8,level);}if(gen===3){w.put(0,8,0x55);w.put(8,8,0x10);w.put(16,8,1);w.put(24,8,level);}
  if(gen===4){w.put(0,8,0xEF);w.put(8,8,1);w.put(16,8,level);}return w.bytes();}
// A device for navigator.bluetooth. cube: {cp,co,ep,eo}, changed by the test as it likes.
// opts.mfData: the advertisement's manufacturer data; opts.silent: never answer; opts.chatter:
// send a battery message every 10 ms, as a real cube sends messages nobody asked for.
function fakeDevice(gen,mac,cube,opts={}){
  const L=()=>{const m=new Map();return {on:(t,f)=>{(m.get(t)||m.set(t,[]).get(t)).push(f);},off:(t,f)=>{const a=m.get(t)||[];const i=a.indexOf(f);if(i>=0)a.splice(i,1);},fire:(t,e)=>(m.get(t)||[]).slice().forEach(f=>f(e))};};
  const dev=L(),stL=L();let serial=0;const writes=[];
  const state={uuid:UUID[gen][2],value:null,addEventListener:stL.on,removeEventListener:stL.off,startNotifications:async()=>state,stopNotifications:async()=>state};
  let chat=0;
  const notify=bytes=>{const e=encrypt(mac,bytes);state.value=new DataView(e.buffer,e.byteOffset,e.byteLength);stL.fire('characteristicvaluechanged',{target:state});};
  const cmd={uuid:UUID[gen][1],async writeValue(buf){
    const plain=decrypt(mac,Buffer.from(buf));writes.push([...plain]);if(opts.silent)return;
    const want=gen===2?plain[0]===0x04:gen===3?plain[0]===0x68&&plain[1]===0x01:plain[0]===0xDD&&plain[3]===0xED;
    const reset=gen===2?plain[0]===0x0A:gen===3?plain[0]===0x68&&plain[1]===0x05:plain[0]===0xD2;
    const bat=gen===2?plain[0]===0x09:gen===3?plain[0]===0x68&&plain[1]===0x07:plain[0]===0xDD&&plain[3]===0xEF;
    if(reset){cube.cp=[0,1,2,3,4,5,6,7];cube.co=Array(8).fill(0);cube.ep=[...Array(12).keys()];cube.eo=Array(12).fill(0);}
    setTimeout(()=>{if(want)notify(stateMsg(gen,cube,++serial));if(bat)notify(batteryMsg(gen,opts.battery||77));},5);}};
  const svc={uuid:UUID[gen][0],getCharacteristic:async u=>u===cmd.uuid?cmd:u===state.uuid?state:Promise.reject(new Error('no characteristic'))};
  const other={uuid:'0000180a-0000-1000-8000-00805f9b34fb'};
  const gatt={connected:false,async connect(){gatt.connected=true;if(opts.chatter)chat=setInterval(()=>notify(batteryMsg(gen,50)),10);return gatt;},disconnect(){if(!gatt.connected)return;gatt.connected=false;clearInterval(chat);dev.fire('gattserverdisconnected',{});},
    getPrimaryServices:async()=>[other,svc],getPrimaryService:async u=>u===svc.uuid?svc:Promise.reject(new Error('no service'))};
  const device={name:opts.name||'GAN12uiM_TEST',id:'fake',gatt,addEventListener:dev.on,removeEventListener:dev.off,writes,notify,
    watchAdvertisements:opts.noWatch?undefined:async()=>{setTimeout(()=>{dev.fire('advertisementreceived',{manufacturerData:new Map()});if(opts.mfData)dev.fire('advertisementreceived',{manufacturerData:opts.mfData});},5);}};
  return device;
}
// Manufacturer data as a GAN cube sends it: nine bytes, the MAC address reversed at the end.
function mfDataFor(mac,cic){const b=new Uint8Array(9);b.set([0x12,0x34,0x56]);mac.split(':').map(x=>parseInt(x,16)).reverse().forEach((x,i)=>b[3+i]=x);return new Map([[cic||0x0501,new DataView(b.buffer)]]);}
module.exports={encrypt,decrypt,stateMsg,batteryMsg,gyroMsg,fakeDevice,mfDataFor,UUID};
