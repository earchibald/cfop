// Stages 1-3: render synthetic cube faces with random tilt, perspective, scale, offset,
// light tint, shading, glare and noise, for the 2x2, the 3x3 and the 4x4. readFace must
// return the right colors (up to a quarter turn; stage 5 finds the turn) in most trials.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js','js/scan.js');
const T=run(`({readFace,rotateFace,scanWidth})`);
const {render,rnd,U}=require('./synth-render');

// Stickered faces must give the right colors. Stickerless faces are glossy and their red and
// orange sit close together, so per frame they must give the right lattice; test/scan-vote.js
// checks their colors across frames, where the joint read in stage 5 settles red and orange.
// The 4x4 works on a wider frame (scanWidth), as its tiles are small. The 2x2 has only four
// cells, so one tile lost to glare costs the frame; its bar is lower.
const N=+(process.env.TRIALS||200);const t0=Date.now();
// The lattice is affine; across four cells at perspective its corner points sit a little off,
// which the strict point tolerance below counts against the 4x4.
const BAR={2:{stickers:0.9,stickerless:0.85},3:{stickers:0.95,stickerless:0.95},4:{stickers:0.95,stickerless:0.85}};
const onCells=(img,pts)=>pts&&[0,1,2,3].some(k=>T.rotateFace(img.centers,k).every((c,i)=>Math.hypot(c.x-pts[i].x,c.y-pts[i].y)<0.3*img.cell));
let trials=0;
for(const n of [3,2,4]){
  const W=T.scanWidth(n),H=W*3/4,M=n===3?N:Math.round(N/2);
  for(const style of ['stickers','stickerless']){
    let ok=0,geo=0;const fails={};
    for(let t=0;t<M;t++){
      trials++;
      const solid=rnd()<0.1,base=Math.floor(U(0,6));
      const truth=Array.from({length:n*n},()=>solid?base:Math.floor(U(0,6)));
      const img=render(truth,W,H,false,style),r=T.readFace(img,{n});
      const match=r.ok&&[0,1,2,3].some(k=>T.rotateFace(truth,k).join()===r.colors.join());
      if(r.ok&&onCells(img,r.points))geo++;
      if(match)ok++;else{const why=r.ok?(onCells(img,r.points)?'color':'lattice'):r.reason;fails[why]=(fails[why]||0)+1;}
    }
    const rate=style==='stickers'?ok/M:geo/M;
    console.log(`scan-synth: ${n}x${n} ${style}: lattice right ${geo}/${M}, colors right ${ok}/${M}, failures ${JSON.stringify(fails)}`);
    assert.ok(rate>=BAR[n][style],`${n}x${n} ${style} faces: ${style==='stickers'?'color':'lattice'} rate ${rate.toFixed(2)} is below ${BAR[n][style]}`);
  }
  // Frames with no cube must not give a face.
  const F=n===3?40:60;let falseReads=0;
  for(let t=0;t<F;t++)if(T.readFace(render(new Array(n*n).fill(0),W,H,true),{n}).ok)falseReads++;
  console.log(`scan-synth: ${n}x${n}: ${falseReads}/${F} frames with no cube gave a face`);
  assert.ok(falseReads<=(n===3?1:2),`${n}x${n}: too many faces read from frames with no cube`);
}
console.log(`scan-synth: ${((Date.now()-t0)/trials).toFixed(0)} ms per trial`);
