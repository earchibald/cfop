// Stages 1-3: render synthetic cube faces with random tilt, perspective, scale, offset,
// light tint, shading, glare and noise. readFace must return the right nine colours
// (up to a quarter turn; stage 5 finds the turn) in at least 95% of trials.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js','js/scan.js');
const T=run(`({readFace,rotateFace})`);
const {render,rnd,U}=require('./synth-render');

// Stickered faces must give the right colours. Stickerless faces are glossy and their red and
// orange sit close together, so per frame they must give the right lattice; test/scan-vote.js
// checks their colours across frames, where the joint read in stage 5 settles red and orange.
const N=+(process.env.TRIALS||200);const t0=Date.now();const rates={};
const onCells=(img,pts)=>pts&&[0,1,2,3].some(k=>T.rotateFace(img.centres,k).every((c,i)=>Math.hypot(c.x-pts[i].x,c.y-pts[i].y)<0.3*img.cell));
for(const style of ['stickers','stickerless']){
  let ok=0,geo=0;const fails={};
  for(let n=0;n<N;n++){
    const solid=rnd()<0.1,base=Math.floor(U(0,6));
    const truth=Array.from({length:9},()=>solid?base:Math.floor(U(0,6)));
    const img=render(truth,320,240,false,style),r=T.readFace(img);
    const match=r.ok&&[0,1,2,3].some(k=>T.rotateFace(truth,k).join()===r.colours.join());
    if(r.ok&&onCells(img,r.points))geo++;
    if(match)ok++;else{const why=r.ok?(onCells(img,r.points)?'colour':'lattice'):r.reason;fails[why]=(fails[why]||0)+1;}
  }
  rates[style]=style==='stickers'?ok/N:geo/N;
  console.log(`scan-synth: ${style}: lattice right ${geo}/${N}, colours right ${ok}/${N}, failures ${JSON.stringify(fails)}`);
}
console.log(`scan-synth: ${((Date.now()-t0)/(2*N)).toFixed(0)} ms per trial`);
assert.ok(rates.stickers>=0.95,'stickered faces: colour read rate is below 95%');
assert.ok(rates.stickerless>=0.95,'stickerless faces: lattice rate is below 95%');
// Frames with no cube must not give a face.
let falseReads=0;for(let n=0;n<40;n++)if(T.readFace(render(new Array(9).fill(0),320,240,true)).ok)falseReads++;
console.log(`scan-synth: ${falseReads}/40 frames with no cube gave a face`);
assert.ok(falseReads<=1,'too many faces read from frames with no cube');
