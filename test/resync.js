// Resync (js/resync.js): a regular cube a few moves off the hint is found again from the reset point
// and two or three scanned faces; the dialog asks for the face that splits the candidates; with six
// faces the state is unique; the way back brings the cube to the reset point.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/solver.js','js/resync.js');
const g=n=>run(n);
const J=x=>JSON.parse(JSON.stringify(x)),deq=(a,b,m)=>assert.deepStrictEqual(J(a),J(b),m);
const Cube=g('Cube'),applyAlg=g('applyAlg'),randomMoveScramble=g('randomMoveScramble'),rng=g('rng'),FACE_MOVES=g('FACE_MOVES'),invertAlg=g('invertAlg'),solveCross=g('solveCross');
const resyncBases=g('resyncBases'),resyncFind=g('resyncFind'),resyncReturn=g('resyncReturn'),resyncFaceOk=g('resyncFaceOk');
const face=(c,f,turn)=>{const s=c.toFacelets().slice(9*f,9*f+9);return turn?run(`resyncTurn(${JSON.stringify(s)},${turn})`):s;};
const T0=Date.now(),lap=n=>console.log(n+' ('+(Date.now()-T0)+' ms)');
const r=rng('resync');
const pick=a=>a[Math.floor(r()*a.length)];

// The bases: the reset point after each prefix of the hint, the one at `done` first.
{const reset=applyAlg(new Cube(),randomMoveScramble('rs-0',20)),hint=['R','U',"R'",'U',"F'"];
  const b=resyncBases(reset,hint,2);assert.strictEqual(b.length,6);assert.strictEqual(b[0].at,2);assert.ok(b[0].cube.equals(applyAlg(reset,hint.slice(0,2))));
  deq(b.map(x=>x.at),[2,1,3,0,4,5],'nearest to done first');
  assert.ok(resyncFaceOk(reset,0,face(reset,0,1)),'a face at any turn');assert.ok(!resyncFaceOk(reset,0,face(applyAlg(reset,['R','U']),0)),'a wrong face');
  assert.ok(resyncFaceOk(reset,2,face(reset,2).map((v,i)=>i<4?-1:v)),'a sticker not read matches anything');}

// Off the hint by one to three moves, from some prefix: the true state is a candidate from two
// faces, nearly always the first; a third face (the one asked for) makes it unique almost always;
// six faces always do. Depth 3.
{let firstTwo=0,uniqueThree=0,asked=0,n=0,askedFirst=0;
  for(let t=0;t<60;t++){
    const reset=applyAlg(new Cube(),randomMoveScramble('rs-'+t,20)),cross=solveCross(reset).solutions[0].split(' ');
    const hint=cross.length?cross:['R','U',"R'"],at=Math.floor(r()*(hint.length+1)),k=1+Math.floor(r()*3);
    let truth=applyAlg(reset,hint.slice(0,at));const slip=[];let lf='';
    for(let i=0;i<k;i++){let m;do{m=pick(FACE_MOVES);}while(m[0]===lf);slip.push(m);lf=m[0];}
    truth=applyAlg(truth,slip);
    const bases=resyncBases(reset,hint,at);
    const faces={0:face(truth,0,Math.floor(r()*4)),2:face(truth,2,Math.floor(r()*4))};
    const f2=resyncFind(bases,faces);n++;
    assert.ok(f2.candidates.some(c=>c.cube.equals(truth)),'the true state is a candidate from two faces (slip '+slip.join(' ')+')');
    if(f2.candidates[0].cube.equals(truth))firstTwo++;
    if(f2.unique){assert.strictEqual(f2.ask,null);uniqueThree++;continue;}
    assert.ok(f2.ask!=null&&f2.ask!==0&&f2.ask!==2,'asks for a face not scanned');asked++;
    faces[f2.ask]=face(truth,f2.ask,Math.floor(r()*4));
    const f3=resyncFind(bases,faces);assert.ok(f3.candidates.some(c=>c.cube.equals(truth)));
    if(f3.unique)uniqueThree++;if(f3.candidates[0].cube.equals(truth))askedFirst++;
    for(const f of [1,3,4,5])faces[f]=face(truth,f);
    const f6=resyncFind(bases,faces);assert.ok(f6.unique&&f6.candidates[0].cube.equals(truth),'six faces are unique');
  }
  console.log(`resync: ${n} slips; first from two faces ${firstTwo}, unique by three ${uniqueThree}, asked ${asked}`);
  assert.ok(firstTwo>=0.85*n,'two faces put the true state first most of the time');
  assert.ok(uniqueThree>=0.9*n,'three faces make it unique most of the time');}
lap('resync find ok');

// Past the depth: no candidate, the dialog falls back to a full read.
{const reset=applyAlg(new Cube(),randomMoveScramble('rs-far',20)),truth=applyAlg(reset,['R','U','F','L','D','B']);
  const faces={};for(let f=0;f<6;f++)faces[f]=face(truth,f);
  const r3=resyncFind(resyncBases(reset,[],0),faces);assert.strictEqual(r3.candidates.length,0);assert.ok(!r3.unique);}

// The way back: the slip undone, the shortest way up to four moves, else the solver.
{const reset=applyAlg(new Cube(),randomMoveScramble('rs-back',20));
  for(const slip of [['R'],['R','U'],["F'",'U2',"R'"],['R','U',"R'",'U'],['R','U','F','L','D','B','R2']]){
    const cur=applyAlg(reset,slip),back=resyncReturn(cur,reset);
    assert.ok(back&&applyAlg(cur,back).equals(reset),'back to the reset point: '+slip.join(' '));
    if(slip.length<=4)assert.strictEqual(back.length,slip.length,'the shortest way: '+back.join(' '));}
  deq(resyncReturn(reset,reset),[]);}
lap('resync return ok');
console.log('resync ok');
