// Stages 1-3: render synthetic cube faces with random tilt, perspective, scale, offset,
// light tint, shading, glare and noise. readFace must return the right nine colours
// (up to a quarter turn; stage 5 finds the turn) in at least 95% of trials.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js','js/scan.js');
const T=run(`({readFace,rotateFace})`);
const {render,rnd,U}=require('./synth-render');

const N=+(process.env.TRIALS||150);let good=0;const fails={};const t0=Date.now();
for(let n=0;n<N;n++){
  const solid=rnd()<0.1,base=Math.floor(U(0,6));
  const truth=Array.from({length:9},()=>solid?base:Math.floor(U(0,6)));
  const img=render(truth),r=T.readFace(img);
  const match=r.ok&&[0,1,2,3].some(k=>T.rotateFace(truth,k).join()===r.colours.join());
  if(match)good++;else{const why=r.ok?'colour':r.reason;fails[why]=(fails[why]||0)+1;
}
}
const rate=good/N;
console.log(`scan-synth: ${good}/${N} faces read (${(100*rate).toFixed(1)}%), ${((Date.now()-t0)/N).toFixed(0)} ms per trial, failures ${JSON.stringify(fails)}`);
assert.ok(rate>=0.95,'stage 1-3 read rate is below 95%');
// Frames with no cube must not give a face.
let falseReads=0;for(let n=0;n<40;n++)if(T.readFace(render(new Array(9).fill(0),320,240,true)).ok)falseReads++;
console.log(`scan-synth: ${falseReads}/40 frames with no cube gave a face`);
assert.ok(falseReads<=1,'too many faces read from frames with no cube');
