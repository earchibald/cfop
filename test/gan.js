// The GAN smart cube protocol: AES against Node's, the cipher, the state messages of the three
// protocols, the MAC address from manufacturer data, and a whole read from a fake cube.
const assert=require('assert');const crypto=require('crypto');
const run=require('./vm-load')('js/engine.js','js/gan.js');
Object.assign(run('this'),{setTimeout,clearTimeout,AbortController}); // the Bluetooth part waits on timers
const {encrypt,stateMsg,batteryMsg,fakeDevice,mfDataFor}=require('./fake-gan');
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
// ----- the MAC address from manufacturer data -----
assert.strictEqual(ganMacFromData(mfDataFor(MAC)),MAC);assert.strictEqual(ganMacFromData(mfDataFor(MAC,0xFF01)),MAC);
assert.strictEqual(ganMacFromData(new Map()),null);assert.strictEqual(ganMacFromData(new Map([[0x004C,new DataView(new ArrayBuffer(9))]])),null,'another company is not a GAN cube');
// ----- a whole read from a fake cube -----
const ganOpen=run('ganOpen'),ganWatchMac=run('ganWatchMac');
(async()=>{
  for(const gen of [2,3,4]){
    const c=applyAlg(new Cube(),randomMoveScramble(25)),dev=fakeDevice(gen,MAC,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]},{mfData:mfDataFor(MAC)});
    assert.strictEqual(await ganWatchMac(dev,500),MAC,'gen '+gen+': the MAC address from the advertisement, after one without data');
    const evs=[];const conn=await ganOpen(dev,MAC,e=>evs.push(e));
    assert.strictEqual(conn.gen,gen,'the service names the protocol');
    const got=await conn.readState(500);assert.ok(got.equals(c),'gen '+gen+' reads the fake cube');
    await conn.send('reset');await conn.send('battery');await new Promise(r=>setTimeout(r,30));
    assert.ok((await conn.readState(500)).isSolved(),'reset marks the cube solved');
    assert.ok(evs.some(e=>e.type==='battery'&&e.level===77),'the battery level arrives as an event');
    conn.close();assert.ok(evs.some(e=>e.type==='gone'),'close fires gone');
    // the wrong MAC address
    // A wrong MAC address: the fake cube cannot read the request, so it does not answer.
    const bad=await ganOpen(fakeDevice(gen,MAC,{...new Cube()}),'11:22:33:44:55:66',()=>{});
    await assert.rejects(bad.readState(80),e=>e.code==='timeout','a wrong MAC address and a quiet cube: no answer');
    const badDev=fakeDevice(gen,MAC,{...new Cube()},{chatter:true}),bad2=await ganOpen(badDev,'11:22:33:44:55:66',()=>{});
    await assert.rejects(bad2.readState(80),e=>e.code==='badmac','a wrong MAC address and a cube that talks: noise');bad2.close();
    const mute=await ganOpen(fakeDevice(gen,MAC,{...new Cube()},{silent:true}),MAC,()=>{});
    await assert.rejects(mute.readState(80),e=>e.code==='timeout','no answer times out');
  }
  assert.strictEqual(await ganWatchMac(fakeDevice(4,MAC,{},{noWatch:true}),100),null,'no watchAdvertisements, no MAC address');
  assert.strictEqual(await ganWatchMac(fakeDevice(4,MAC,{}),60),null,'no manufacturer data, no MAC address');
  console.log('gan ok');
})().catch(e=>{console.error(e);process.exit(1);});
