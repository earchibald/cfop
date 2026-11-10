// Keep the screen awake while a smart cube turns (js/awake.js): a turn sends awake to the macOS app
// at most once per sendMs and takes a wake lock; no turn for holdMs, or the cube gone, lets go of
// both; a move on the page (cw:smart) is a turn.
const assert=require('assert');
const vm=require('vm'),fs=require('fs'),path=require('path');
const timers=[];let now=0;
const sent=[],locks=[];
const listeners={};
const ctx=vm.createContext({console,Math,Date,Promise,
  setTimeout:(f,ms)=>{const t={f,at:now+ms,live:true};timers.push(t);return t;},
  clearTimeout:t=>{if(t)t.live=false;},
  navigator:{wakeLock:{request:async kind=>{const l={kind,released:false,release:async()=>{l.released=true;}};locks.push(l);return l;}}},
  document:{visibilityState:'visible',addEventListener:(ev,f)=>{(listeners[ev]=listeners[ev]||[]).push(f);}},
  BRIDGE:{send:m=>sent.push(m)}});
vm.runInContext('var BRIDGE=this.BRIDGE;'+fs.readFileSync(path.join(__dirname,'..','js/awake.js'),'utf8'),ctx,{filename:'js/awake.js'});
const run=c=>vm.runInContext(c,ctx);
const tick=async ms=>{now+=ms;for(const t of timers.filter(t=>t.live&&t.at<=now)){t.live=false;t.f();}await new Promise(r=>setImmediate(r));};
const smart=type=>listeners['cw:smart'].forEach(f=>f({detail:{type}}));
(async()=>{
  run('awakeKick(0)');await tick(0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(sent)),[{op:'awake',seconds:300}],'a turn: the app is told, for five minutes');
  assert.strictEqual(locks.length,1,'and a wake lock is asked for');assert.strictEqual(locks[0].kind,'screen');
  assert.ok(run('awakeOn()'),'held awake');
  run('awakeKick(5000)');await tick(0);
  assert.strictEqual(sent.length,1,'a turn 5 s later: no second message yet');assert.strictEqual(locks.length,1,'nor a second lock');
  run('awakeKick(21000)');await tick(0);
  assert.strictEqual(sent.length,2,'20 s on: the app is told again');
  await tick(299000);assert.ok(run('awakeOn()'),'less than five minutes after the last turn: still held');
  await tick(2000);
  assert.ok(!run('awakeOn()'),'five minutes with no turn: let go');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(sent[sent.length-1])),{op:'awake',seconds:0},'the app lets go too');assert.ok(locks[0].released,'and the wake lock');
  // the page's own events
  smart('move');await tick(0);assert.ok(run('awakeOn()')&&locks.length===2,'a move on the page holds it again');
  smart('gyro');smart('state');
  smart('disconnect');await tick(0);assert.ok(!run('awakeOn()')&&locks[1].released,'the cube disconnected: let go');
  // a hidden page asks for no lock
  ctx.document.visibilityState='hidden';run('awakeKick()');await tick(0);assert.strictEqual(locks.length,2,'a hidden page: no wake lock');
  run('awakeRelease()');
  console.log('awake: ok');
})().catch(e=>{console.error(e);process.exit(1);});
