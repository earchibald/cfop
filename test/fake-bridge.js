// A fake Twistwright app for the tests: a WebSocket class that speaks the bridge protocol of
// mac/Sources/Bridge.swift, with fake GAN cubes (fake-gan.js) behind it. Install it as the
// page's WebSocket, and answer /bridge/info from fetch with bridgeInfo().
const {UUID}=require('./fake-gan');
function bridgeInfo(){return {app:'Twistwright',version:'test',ws:'ws://127.0.0.1:27273/'};}
// devices: [{id, dev (a fakeDevice), mac}]. opts.bluetooth: the state in hello (default poweredOn).
// opts.rejectOrigin: close at once, as the app does for a page it does not serve.
// opts.migrate: 'cancel' to answer a history move as a user who says no; else the app takes it.
function fakeBridge(devices,opts={}){
  const sockets=[];
  class FakeWebSocket{
    constructor(url){
      this.url=url;this.readyState=0;this.sent=[];this.subs=new Map();sockets.push(this);
      setTimeout(()=>{
        if(opts.rejectOrigin){this.readyState=3;this.onclose&&this.onclose({code:1006});return;}
        this.readyState=1;this.onopen&&this.onopen({});
        this.emit({ev:'hello',version:'test',bluetooth:opts.bluetooth||'poweredOn'});
      },5);
    }
    emit(m){this.onmessage&&this.onmessage({data:JSON.stringify(m)});}
    close(){if(this.readyState===3)return;this.readyState=3;for(const d of devices)if(d.dev.gatt.connected)d.dev.gatt.disconnect();setTimeout(()=>this.onclose&&this.onclose({code:1000}),0);}
    send(s){
      const m=JSON.parse(s);this.sent.push(m);const d=devices.find(x=>x.id===m.id);
      const err=(msg)=>this.emit(Object.assign({ev:'error',message:msg},m.id?{id:m.id}:{},m.seq!=null?{seq:m.seq}:{}));
      switch(m.op){
        case 'scan':
          // Before macOS has asked (bluetooth notAsked), a scan with auto starts nothing; a scan
          // from a press asks, and the fake says yes.
          if(this.bt===undefined)this.bt=opts.bluetooth||'poweredOn';
          if(this.bt==='notAsked'){
            if(m.auto){this.emit({ev:'bluetooth',state:'notAsked'});break;}
            this.bt='poweredOn';setTimeout(()=>this.emit({ev:'bluetooth',state:'poweredOn'}),2);
          }
          // Each cube shows up; the second message carries the MAC address, as a real scan does.
          for(const x of devices){setTimeout(()=>this.emit({ev:'device',id:x.id,name:x.dev.name,mac:null}),5);setTimeout(()=>this.emit({ev:'device',id:x.id,name:x.dev.name,mac:x.mac||null}),15);}
          break;
        case 'stop': break;
        case 'connect':{
          if(!d){err('The cube is not in the list any more. Look for it again.');break;}
          const gen=d.gen;d.dev.gatt.connect().then(()=>{
            d.dev.addEventListener('gattserverdisconnected',()=>this.emit({ev:'gone',id:d.id}));
            this.emit({ev:'connected',id:d.id,services:[{uuid:'0000180a-0000-1000-8000-00805f9b34fb',chars:[]},{uuid:UUID[gen][0],chars:[UUID[gen][1],UUID[gen][2]]}]});});
          break;}
        case 'disconnect': if(d)d.dev.gatt.disconnect();break;
        case 'notify':{
          if(!d){err('No such cube.');break;}
          d.dev.gatt.getPrimaryService(UUID[d.gen][0]).then(s=>s.getCharacteristic(m.char)).then(ch=>{
            ch.addEventListener('characteristicvaluechanged',e=>{const v=e.target.value;this.emit({ev:'value',id:d.id,char:m.char,data:Buffer.from(v.buffer,v.byteOffset,v.byteLength).toString('hex')});});
          }).catch(()=>err('No such characteristic.'));
          break;}
        case 'write':{
          if(!d){err('No such cube.');break;}
          d.dev.gatt.getPrimaryService(UUID[d.gen][0]).then(s=>s.getCharacteristic(m.char)).then(ch=>ch.writeValue(Buffer.from(m.data,'hex'))).then(()=>this.emit({ev:'written',seq:m.seq})).catch(()=>err('No such characteristic.'));
          break;}
        case 'migrate':
          setTimeout(()=>this.emit(opts.migrate==='cancel'?{ev:'migrated',seq:m.seq,count:0,cancelled:true}
            :{ev:'migrated',seq:m.seq,count:Object.keys(m.data||{}).length}),5);
          break;
        default: err('Unknown request '+m.op+'.');
      }
    }
  }
  return {FakeWebSocket,sockets};
}
// The app's own window: a fake webkit.messageHandlers.bridge in front of the same fake app.
// hello answers {version, bluetooth}; every other message goes to a fake socket, and what comes
// back goes to window.bridgeEvent, as the app calls it. install(w) puts it on a window.
function fakeNative(devices,opts={}){
  const {FakeWebSocket}=fakeBridge(devices,opts);
  const ws=new FakeWebSocket('native');let win=null;const sent=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.ev!=='hello'&&win&&win.bridgeEvent)win.bridgeEvent(m);};
  const handler={postMessage(m){
    m=JSON.parse(JSON.stringify(m));sent.push(m);
    // opts.helloDelay: the app answers hello late (ms), as at launch.
    if(m.op==='hello'){const r={version:'test',bluetooth:opts.bluetooth||'poweredOn'};return opts.helloDelay?new Promise(ok=>setTimeout(()=>ok(r),opts.helloDelay)):Promise.resolve(r);}
    ws.send(JSON.stringify(m));return Promise.resolve(null);}};
  return {install(w){win=w;w.webkit={messageHandlers:{bridge:handler}};},sent};
}
module.exports={fakeBridge,fakeNative,bridgeInfo};
