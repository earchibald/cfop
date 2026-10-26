// The GAN smart cube protocol: AES against Node's, the cipher, the state messages of the three
// protocols, the MAC address from manufacturer data, and a whole read from a fake cube.
const assert=require('assert');const crypto=require('crypto');
const run=require('./vm-load')('js/engine.js','js/gan.js');
Object.assign(run('this'),{setTimeout,clearTimeout,AbortController}); // the Bluetooth part waits on timers
const {encrypt,stateMsg,batteryMsg,gyroMsg,moveMsg,fakeDevice,mfDataFor}=require('./fake-gan');
const Cube=run('Cube'),applyAlg=run('applyAlg'),randomMoveScramble=run('randomMoveScramble');
const aesExpand=run('aesExpand'),aesEncrypt=run('aesEncrypt'),aesDecrypt=run('aesDecrypt');
const ganCipher=run('ganCipher'),ganDecode=run('ganDecode'),ganCommand=run('ganCommand'),ganMacFromData=run('ganMacFromData'),ganParseMac=run('ganParseMac');
const hex=b=>Buffer.from(b).toString('hex');
// ----- AES-128 -----
const fk=Buffer.from('000102030405060708090a0b0c0d0e0f','hex'),fp=Buffer.from('00112233445566778899aabbccddeeff','hex');
assert.strictEqual(hex(aesEncrypt(aesExpand(fk),fp)),'69c4e0d86a7b0430d8cdb78070b4c55a','the FIPS-197 example');
assert.strictEqual(hex(aesDecrypt(aesExpand(fk),Buffer.from('69c4e0d86a7b0430d8cdb78070b4c55a','hex'))),hex(fp));
for(let i=0;i<200;i++){
  const k=crypto.randomBytes(16),p=crypto.randomBytes(16),c=crypto.createCipheriv('aes-128-ecb',k,null);c.setAutoPadding(false);
  const want=Buffer.concat([c.update(p),c.final()]),w=aesExpand(k);
  assert.strictEqual(hex(aesEncrypt(w,p)),hex(want),'AES encrypt matches Node');assert.strictEqual(hex(aesDecrypt(w,want)),hex(p),'AES decrypt matches Node');
}
// ----- the cipher -----
const MAC='AB:12:34:5C:9D:E1';
assert.strictEqual(ganParseMac('ab-12-34-5c-9d-e1'),MAC);assert.strictEqual(ganParseMac('ab:12:34'),null);assert.strictEqual(ganParseMac('zz:12:34:5c:9d:e1'),null);
const ci=ganCipher(MAC);
for(const n of [16,20]){const m=crypto.randomBytes(n);
  assert.strictEqual(hex(ci.encrypt(m)),hex(encrypt(MAC,m)),'the GAN cipher matches the reference for '+n+' bytes');
  assert.strictEqual(hex(ci.decrypt(encrypt(MAC,m))),hex(m),'and decrypts it');}
assert.throws(()=>ganCipher('nope'));
// ----- commands -----
assert.deepStrictEqual([...ganCommand(2,'state')],[4,...Array(19).fill(0)]);
assert.deepStrictEqual([...ganCommand(3,'state')],[0x68,1,...Array(14).fill(0)]);
assert.deepStrictEqual([...ganCommand(4,'state')].slice(0,6),[0xDD,4,0,0xED,0,0]);assert.strictEqual(ganCommand(4,'reset').length,20);
// ----- the cubie order is the engine's: the example in gan-web-bluetooth, after F R -----
const fr=applyAlg(new Cube(),['F','R']);
assert.deepStrictEqual([fr.cp,fr.co,fr.ep,fr.eo].map(a=>[...a]),[[0,5,2,1,7,4,6,3],[1,2,0,2,1,1,0,2],[1,9,2,3,11,8,6,7,4,5,10,0],[1,1,0,0,0,1,0,0,0,1,0,0]]);
// ----- state messages, all three protocols, through the cipher -----
for(const gen of [2,3,4])for(let i=0;i<60;i++){
  const c=applyAlg(new Cube(),randomMoveScramble(25));
  const ev=ganDecode(gen,ci.decrypt(encrypt(MAC,stateMsg(gen,c,i))));
  assert.strictEqual(ev.type,'state','gen '+gen+' reads a state');assert.ok(ev.cube.equals(c),'gen '+gen+' reads the same cube');
}
// A wrong MAC address decrypts to noise. Noise is never a state.
const wrong=ganCipher('AB:12:34:5C:9D:E2');let states=0;
for(const gen of [2,3,4])for(let i=0;i<100;i++){const ev=ganDecode(gen,wrong.decrypt(encrypt(MAC,stateMsg(gen,applyAlg(new Cube(),randomMoveScramble(25)),i))));if(ev&&ev.type==='state')states++;}
assert.strictEqual(states,0,'a wrong MAC address gives no cube');
for(const gen of [2,3,4])assert.deepStrictEqual({...ganDecode(gen,batteryMsg(gen,64))},{type:'battery',level:64},'gen '+gen+' battery');
// ----- the tilt: gen 2 and gen 4 report it, gen 3 has none. The cube's x,y,z go to x,z,-y -----
for(const gen of [2,4]){
  const ev=ganDecode(gen,ci.decrypt(encrypt(MAC,gyroMsg(gen,{w:0.5,x:-0.25,y:0.75,z:-1}))));
  assert.strictEqual(ev.type,'gyro','gen '+gen+' reads the tilt');
  [-0.25,-1,-0.75,0.5].forEach((v,i)=>assert.ok(Math.abs(ev.q[i]-v)<1e-4,'gen '+gen+' q['+i+']='+ev.q[i]));
}
assert.strictEqual(ganDecode(3,gyroMsg(3,{w:1,x:0,y:0,z:0})),null,'gen 3: no such message');
// ----- a move: the quarter turn, the cube's count and its clock, all three protocols -----
for(const gen of [3,4])for(const [m,i] of [['U',0],["R'",1],['F',2],["D'",3],['L',4],["B'",5]]){
  const ev=ganDecode(gen,ci.decrypt(encrypt(MAC,moveMsg(gen,{moves:[{move:m}],serial:300+i,ts:123456+i}))));
  assert.deepStrictEqual({...ev},{type:'move',move:m,serial:300+i,ts:123456+i},'gen '+gen+' reads '+m);
}
{
  const ms=["R'",'R','U','F',"L'",'B','D'],el=[85,240,1200,60,9,700,33];
  const ev=ganDecode(2,ci.decrypt(encrypt(MAC,moveMsg(2,{moves:ms.map((move,i)=>({move,elapsed:el[i]})),serial:261}))));
  assert.strictEqual(ev.type,'move');assert.strictEqual(ev.move,"R'",'gen 2 reads the newest move');assert.strictEqual(ev.elapsed,85,'with the ms since the one before');assert.strictEqual(ev.serial,5,'an 8-bit count');
  assert.strictEqual(JSON.stringify(ev.past.map(p=>p.move)),JSON.stringify(ms.slice(1)),'and the six before it, newest first');assert.strictEqual(ev.past.map(p=>p.elapsed).join(),el.slice(1).join());
}
assert.strictEqual(ganDecode(4,Uint8Array.from([0x01,...Array(19).fill(0)])).move,null,'no face bit: no move named');
// ----- the MAC address from manufacturer data -----
assert.strictEqual(ganMacFromData(mfDataFor(MAC)),MAC);assert.strictEqual(ganMacFromData(mfDataFor(MAC,0xFF01)),MAC);
assert.strictEqual(ganMacFromData(new Map()),null);assert.strictEqual(ganMacFromData(new Map([[0x004C,new DataView(new ArrayBuffer(9))]])),null,'another company is not a GAN cube');
// ----- a whole read from a fake cube -----
// ----- the correction: a scan says `actual` while the cube says `raw`; every later turn moves both -----
const ganFixFor=run('ganFixFor'),ganFixApply=run('ganFixApply'),ganFixSave=run('ganFixSave'),ganFixLoad=run('ganFixLoad');
{
  const raw=applyAlg(new Cube(),randomMoveScramble(20)),actual=applyAlg(new Cube(),randomMoveScramble(20)),fix=ganFixFor(actual,raw);
  assert.ok(ganFixApply(fix,raw).equals(actual),'the fix takes the cube\'s state to the real one');
  const later=randomMoveScramble(15);
  assert.ok(ganFixApply(fix,applyAlg(raw,later)).equals(applyAlg(actual,later)),'and stays right after more turns');
  assert.ok(ganFixApply(null,raw).equals(raw),'no fix changes nothing');
  const back=ganFixLoad(JSON.parse(JSON.stringify(ganFixSave(fix))));
  assert.ok(back&&back.equals(fix),'a fix survives storage');
  assert.strictEqual(ganFixLoad(null),null);assert.strictEqual(ganFixLoad({cp:[1]}),null,'a broken fix loads as none');
  assert.strictEqual(ganFixSave(null),null);
}
const ganOpen=run('ganOpen'),ganWatchMac=run('ganWatchMac');
(async()=>{
  for(const gen of [2,3,4]){
    const c=applyAlg(new Cube(),randomMoveScramble(25)),dev=fakeDevice(gen,MAC,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]},{mfData:mfDataFor(MAC)});
    assert.strictEqual(await ganWatchMac(dev,500),MAC,'gen '+gen+': the MAC address from the advertisement, after one without data');
    const evs=[];const conn=await ganOpen(dev,MAC,e=>evs.push(e));
    assert.strictEqual(conn.gen,gen,'the service names the protocol');
    const got=await conn.readState(500);assert.ok(got.equals(c),'gen '+gen+' reads the fake cube');
    assert.strictEqual(conn.battery,null,'the charge is unknown until the cube says');
    await new Promise(r=>setTimeout(r,400));assert.strictEqual(conn.battery,77,'the link asks for the charge by itself and keeps it');
    await conn.send('reset');await conn.send('battery');await new Promise(r=>setTimeout(r,30));
    assert.ok((await conn.readState(500)).isSolved(),'reset marks the cube solved');
    assert.ok(evs.some(e=>e.type==='battery'&&e.level===77),'the battery level arrives as an event');
    conn.close();assert.ok(evs.some(e=>e.type==='gone'),'close fires gone');
    // the wrong MAC address
    // A wrong MAC address: the fake cube cannot read the request, so it does not answer.
    const bad=await ganOpen(fakeDevice(gen,MAC,{...new Cube()}),'11:22:33:44:55:66',()=>{});
    await assert.rejects(bad.readState(80),e=>e.code==='timeout','a wrong MAC address and a quiet cube: no answer');bad.close();
    const badDev=fakeDevice(gen,MAC,{...new Cube()},{chatter:true}),bad2=await ganOpen(badDev,'11:22:33:44:55:66',()=>{});
    await assert.rejects(bad2.readState(80),e=>e.code==='badmac','a wrong MAC address and a cube that talks: noise');bad2.close();
    const mute=await ganOpen(fakeDevice(gen,MAC,{...new Cube()},{silent:true}),MAC,()=>{});
    await assert.rejects(mute.readState(80),e=>e.code==='timeout','no answer times out');mute.close();
    // The correction on the link: correct(actual) reads the cube, sets the fix and sends a state
    // event; readState and the state events then show the corrected cube; a fix given at open
    // applies from the first read; the reset command drops it.
    const raw=applyAlg(new Cube(),randomMoveScramble(20)),actual=applyAlg(new Cube(),['R','U',"F'"]),cube2={cp:[...raw.cp],co:[...raw.co],ep:[...raw.ep],eo:[...raw.eo]};
    const evs2=[],dev2=fakeDevice(gen,MAC,cube2),fx=await ganOpen(dev2,MAC,e=>evs2.push(e));
    assert.ok((await fx.readState(500)).equals(raw),'before the correction, the state is the cube\'s own');
    assert.ok(fx.raw.equals(raw),'raw is the last state as sent');assert.strictEqual(fx.fix,null);
    const got2=await fx.correct(actual,500);
    assert.ok(got2.equals(actual),'correct gives the real state');assert.ok(fx.fix&&fx.fix.equals(ganFixFor(actual,raw)),'and sets the fix');
    assert.ok(evs2.filter(e=>e.type==='state').pop().cube.equals(actual),'a state event with the corrected cube went out');
    const turned=applyAlg(raw,['L2','D']);Object.assign(cube2,{cp:[...turned.cp],co:[...turned.co],ep:[...turned.ep],eo:[...turned.eo]});
    assert.ok((await fx.readState(500)).equals(applyAlg(actual,['L2','D'])),'later states are corrected');
    assert.ok(fx.raw.equals(turned),'raw stays the cube\'s own');
    await fx.send('reset');assert.strictEqual(fx.fix,null,'the reset command drops the fix');await new Promise(r=>setTimeout(r,30));
    assert.ok((await fx.readState(500)).isSolved(),'and the cube reads solved');
    fx.close();
    const fix3=ganFixFor(actual,raw),cube3={cp:[...raw.cp],co:[...raw.co],ep:[...raw.ep],eo:[...raw.eo]},evs3=[];
    const op=await ganOpen(fakeDevice(gen,MAC,cube3),MAC,e=>evs3.push(e),{fix:fix3});
    assert.ok((await op.readState(500)).equals(actual),'a fix given at open applies from the first read');
    assert.ok(evs3.filter(e=>e.type==='state').pop().cube.equals(actual),'and to the state events');
    op.setFix(null);assert.ok((await op.readState(500)).equals(raw),'setFix(null) drops it');op.close();
  }
  assert.strictEqual(await ganWatchMac(fakeDevice(4,MAC,{},{noWatch:true}),100),null,'no watchAdvertisements, no MAC address');
  assert.strictEqual(await ganWatchMac(fakeDevice(4,MAC,{}),60),null,'no manufacturer data, no MAC address');
  console.log('gan ok');
})().catch(e=>{console.error(e);process.exit(1);});
