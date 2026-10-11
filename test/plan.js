// The guided solve with "Rotate to each algorithm" on: every plan ends solved, pairs with both pieces in the
// top layer or their own slot use a reference case, and the rotation is the first move of such a step.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))console.error(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
w.addEventListener('load',()=>{try{
  w.eval('buildCrossTable();tablesReady=true;');
  $('#planRef').checked=true;
  let refPairs=0,rotSteps=0;
  for(const seed of ['amber-fox-1','kelp-newt-2','dune-heron-3','iris-lynx-4']){
    w.eval(`newScramble(${JSON.stringify(seed)});buildPlan();`);
    const p=w.eval('planState.plan');assert.ok(p&&p.ll,seed+': plan with a last layer');
    assert.ok($('#planOut').textContent.includes('It ends solved.'),seed+': ends solved');
    for(const s of p.f2l.steps){if(s.ref){refPairs++;assert.ok(w.eval('F2L_CASES').some(c=>c.n===s.ref),'case number is real');}
      if(s.rot){rotSteps++;assert.strictEqual(s.moves[0],s.rot,seed+': rotation leads the step');}}
    for(const s of p.ll.steps)assert.ok(!s.pre||s.pre[0]==='y',seed+': last layer uses a rotation, not an AUF, before the alg');
    assert.ok($$('#planOut .step').length>=5,seed+': steps rendered');
  }
  assert.ok(refPairs>0,'some pairs use a reference case');assert.ok(rotSteps>0,'some steps turn the cube');
  // The case link opens the case window.
  const link=$('#planOut .case-link');if(link){link.click();assert.ok($('#modalBg'),'case link opens the case window');w.eval('closeModal()');}
  // Off: no rotations in the F2L steps, as before.
  $('#planRef').checked=false;w.eval('buildPlan()');const p=w.eval('planState.plan');
  assert.ok(p.f2l.steps.every(s=>!s.rot&&!s.moves.some(m=>m[0]==='y')),'fixed front has no rotations');
  console.log(`plan: 4 seeds end solved, ${refPairs} reference pairs, ${rotSteps} turned steps ok`);process.exit(0);
}catch(e){console.error('plan: FAIL',e.message);process.exit(1);}});
