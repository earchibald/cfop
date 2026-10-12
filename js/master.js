// ===== The 4×4 beginner method: the Rubik's Master solution guide =====
// Source: "You can do the Rubik's Master, Solution Guide" (Spin Master, V1-EU-M-2020), the current
// guide at rubiks.com/solve-it. Three stages: solve the centers, pair the edges, then solve the
// cube like a 3×3 with the Rubik's Cube guide, plus two parity fixes a 3×3 never needs. The holds,
// the algorithms and the sayings are the guide's own; the 3×3 part comes from js/beginner.js.
// Data: MASTER_STEPS (the basics, centers, edges, then the eight 3×3 steps as steps 3 to 10),
// MASTER_ALGS. masterChunks boxes the named algorithms inside a move list.
// Solver: solveMaster(fourCube) returns the plan a beginner follows, part by part: stages of
// parts with a hold `pre` (whole-cube turns as a string), `moves` in the guide's notation,
// `chunks` and `up` ('white' throughout: every turn of the cube is a `pre`, never a hidden flip).
// Pure: no DOM. Loads after engine.js, two.js, four.js and beginner.js.

const MASTER_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
const MASTER_ORDER=[0,3,1,2,4,5]; // the guide's order: white, yellow, red, green, orange, blue
const MASTER_ALGS={
  centerFront:{id:'centerFront',name:'Center tile from the front',alg:"Rr U Rr'",say:"Rr, U, R'r'",step:1,
    why:"Rr brings the right column of the front up into the top. U moves the new tile away and a tile you do not need into the column. R'r' takes that tile down and brings the rest back."},
  centerDown:{id:'centerDown',name:'Center tile from the bottom',alg:"Rr2 U Rr2",say:"Rr2, U, Rr2",step:1,
    why:"Rr2 swaps the right columns of the top and the bottom. U moves the new tile away and a tile you do not need into the column. Rr2 swaps the columns back."},
  lineUp:{id:'lineUp',name:'Line them up',alg:"R F' U F",say:"R, F', U, F",step:2,
    why:'Four outside turns that turn the front right edge over, so the two pieces sit across from each other with the same color facing you.'},
  pairEdges:{id:'pairEdges',name:'Pair the edges',alg:"Dd R F' U R' F Dd'",say:"Don't Run Fast Unless Running Fast Daily",step:2,
    parts:[[1,"Don't"],[1,'Run'],[1,"F'ast"],[1,'Unless'],[1,"R'unning"],[1,'Fast'],[1,"D'd'aily"]],
    why:"Dd moves the bottom two layers out of the way. R F' U R' F swaps one edge piece between the left and the right of the front. D'd' brings the bottom back, and the two pieces sit together."},
  ollParity:{id:'ollParity',name:'Yellow cross parity',alg:"r2 B2 U2 l U2 r' U2 r U2 F2 r F2 l' B2 r2",say:"r2, B2, U2, l, U2, r', U2, r, U2, F2, r, F2, l', B2, r2",step:7,
    why:'A 4×4 can have one edge pair turned over, which a 3×3 cannot. This turns the front edge pair over and leaves everything else as it was. The left and right turns are slice turns; front, back and up are face turns.'},
  pllParity:{id:'pllParity',name:'Yellow edges parity',alg:"r2 U2 r2 Uu2 r2 u2",say:'Are you? Are you you? Are you?',step:10,
    parts:[[2,'Are you?'],[2,'Are you you?'],[2,'Are you?']],
    why:'The front and back edge pairs swap places. Two edges alone cannot swap on a 3×3; on a 4×4 they can. All the right turns are slice turns.'},
};
for(const k in BEGINNER_ALGS){const a=BEGINNER_ALGS[k];MASTER_ALGS[k]=Object.assign({},a,{step:a.step+2});}
const MASTER_CHUNK_ALGS=Object.values(MASTER_ALGS).map(a=>({id:a.id,name:a.name,moves:parseAlg(a.alg),parts:a.parts})).sort((a,b)=>b.moves.length-a.moves.length);
function masterChunks(moves){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const out=[];
  for(let i=0;i<ms.length;){
    const hit=MASTER_CHUNK_ALGS.find(a=>i+a.moves.length<=ms.length&&a.moves.every((m,k)=>ms[i+k]===m));
    if(!hit){i++;continue;}
    if(hit.parts){let at=i;for(const [len,label] of hit.parts){out.push({label,id:hit.id,at,len});at+=len;}}
    else out.push({label:hit.name,id:hit.id,at:i,len:hit.moves.length});
    i+=hit.moves.length;
  }
  return out;
}

// The steps. 0 to 2 are the 4×4's own; 3 to 10 are the eight 3×3 steps, with the two parity
// fixes added where the guide puts them (the yellow cross and the yellow edges).
const MASTER_STEPS=(()=>{
  const own=[
    {n:0,id:'basics',name:'Get to know your Master',
     goal:'Know the pieces, the color layout, the slices and the moves.',
     goals:['24 center tiles, 24 edge pieces, 8 corners','The color layout','Face turns and slice turns'],
     what:'A 4×4 cube has 8 corners like a 3×3, but 24 center tiles instead of 6 and 24 edge pieces instead of 12. No center is fixed, so nothing tells you the color of a face until you build it.',
     how:'White is opposite yellow, red opposite orange, blue opposite green. When white is on top, red is to the left of blue, green to the left of red, and orange to the right of blue. A capital letter turns an outside face. A small letter turns the inside slice next to it. Two letters, like Rr, turn both as one.',
     note:'Each move is a quarter turn. A mark means counterclockwise, a 2 means twice. Keep the same front face for a whole algorithm.',
     kinds:[['corners','corner'],['center tiles','center'],['edge pieces','edge']]},
    {n:1,id:'centers',name:'Solve the centers',
     goal:'Six centers of four tiles each: white, yellow, red, green, orange and blue, in the right places.',
     what:'Group the 24 center tiles into six centers of one color. Start with white: hold a white center tile on top and bring the other white tiles up, one at a time. Then yellow, red, green, orange and blue, in that order.',
     how:'Find a tile of the color you want that is not on top. On a side face: hold that face in front and turn the front until the tile is at the lower right of the center. On the bottom: turn the bottom until it is at the lower right. Then turn the top until a tile of another color sits at the upper left of the top center. From the front: Rr, U, R\'r\'. From the bottom: Rr2, U, Rr2. Repeat.',
     note:'From the third color on you must keep the color layout: when yellow is up, green is to the right of red. The app holds the cube so each new center goes on the right face. A capital letter turns an outside face, a small letter the slice next to it, two letters both.',
     algs:['centerFront','centerDown'],
     cases:[
       {name:'Tile on the front, at the lower right',text:'A tile of another color sits at the upper left of the top. Rr, U, R\'r\'.',moves:"Rr U Rr'"},
       {name:'Tile on the bottom, at the lower right',text:'A tile of another color sits at the upper left of the top. Rr2, U, Rr2.',moves:"Rr2 U Rr2"},
     ]},
    {n:2,id:'edges',name:'Pair the edges',
     goal:'Twelve edge pairs, like the edges of a 3×3. They do not need to match the centers yet.',
     what:'Each edge of a 3×3 is two pieces on a 4×4. Find the two pieces with the same two colors and put them side by side.',
     how:'Use outside turns to bring the two pieces to the left and the right of the front face. Across from each other, the same color facing you: pair them with Don\'t Run Fast Unless Running Fast Daily. Not across: R, F\', U, F lines them up first. Repeat until all twelve edges are paired.',
     note:'Outside turns never break a center or a pair you already made. The slice turns inside the pairing algorithm do, and D\'d\' at the end puts everything back.',
     algs:['pairEdges','lineUp'],
     cases:[
       {name:'Across from each other',text:'The two pieces sit in the same row, left and right of the front, with the same color facing you. Pair them.',moves:"Dd R F' U R' F Dd'"},
       {name:'Not across from each other',text:'Line them up first: R, F\', U, F. Then pair them.',moves:"R F' U F Dd R F' U R' F Dd'"},
     ]},
  ];
  const rest=BEGINNER_STEPS.slice(1).map(s=>Object.assign({},s,{n:s.n+2}));
  const ycross=rest.find(s=>s.id==='ycross');
  ycross.note=ycross.note+' On a 4×4, one or three yellow edges up is a parity case: hold the cube so a yellow edge that is not up is at the front, do the parity algorithm, then go on as on a 3×3.';
  ycross.algs=[...ycross.algs,'ollParity'];
  ycross.cases=[...ycross.cases,{name:'One or three yellow edges up: parity',text:'A 4×4 only. With one up, hold it at the back. With three up, hold the gap at the front. Then the parity algorithm. You get a line or the cross.',moves:MASTER_ALGS.ollParity.alg}];
  const yedges=rest.find(s=>s.id==='yedges');
  yedges.how=yedges.how+' On a 4×4, two correct edges is a parity case. Across from each other: hold them left and right, then the parity algorithm. Next to each other: hold them left and back, the parity algorithm, then the 3×3 algorithm.';
  yedges.algs=[...yedges.algs,'pllParity'];
  yedges.cases=[...yedges.cases,{name:'Two correct edges across from each other: parity',text:'Hold the correct edges left and right. Are you? Are you you? Are you?',moves:MASTER_ALGS.pllParity.alg},
    {name:'Two correct edges next to each other: parity',text:'Hold the correct edges left and back. The parity algorithm. Then one side is solved: turn the cube so it is at the back, and do the 3×3 algorithm.',moves:MASTER_ALGS.pllParity.alg+' y '+BEGINNER_ALGS.yellowEdges.alg}];
  return [...own,...rest];
})();

// ---------- the solver ----------
const MASTER_TO_U={0:'',2:'x',5:"x'",3:'x2',1:"z'",4:'z'}; // the turn that brings a face to the top
const MASTER_TO_F={2:'',1:'y',5:'y2',4:"y'"};              // ... a side face to the front
const masterCap=s=>s[0].toUpperCase()+s.slice(1);
// Where a sticker goes under a move: FOUR_MOVES[m][j]=i means sticker i lands on j.
const MASTER_FWD={};
function masterFwd(m){if(!MASTER_FWD[m]){const perm=FOUR_MOVES[m];const f=new Array(96);for(let j=0;j<96;j++)f[perm[j]]=j;MASTER_FWD[m]=f;}return MASTER_FWD[m];}
const MASTER_OUTER=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
// The front's left and right edge slots, by sticker: [front sticker, side sticker].
const MASTER_FL_UP=[fourIdx(2,1,0),fourIdx(4,1,3)],MASTER_FL_LOW=[fourIdx(2,2,0),fourIdx(4,2,3)];
const MASTER_FR_UP=[fourIdx(2,1,3),fourIdx(1,1,0)],MASTER_FR_LOW=[fourIdx(2,2,3),fourIdx(1,2,0)];

// opts.reduceOnly: stop after the edges, for the advanced method, which goes on with CFOP.
function solveMaster(start,opts){
  let s=start.isFour?start.s:start;const stages=[];let cur=null;
  const name=c=>MASTER_COLOR_NAMES[c];
  function stage(n,id,label){const have=stages.find(x=>x.n===n);if(have){cur=have;return;}cur={n,id,name:label,parts:[]};stages.push(cur);}
  function part(title,text,pre,moves,extra){
    const ms=(Array.isArray(moves)?moves:parseAlg(moves||'')).filter(Boolean);
    if(pre)s=fourApply(s,pre);if(ms.length)s=fourApply(s,ms);
    const p=Object.assign({title,text,pre:pre||'',moves:ms,chunks:masterChunks(ms),up:'white'},extra||{});
    cur.parts.push(p);return p;
  }
  const tile=(f,i,j)=>s[fourIdx(f,i,j)];
  const centerCount=(f,c)=>FOUR_CENTER.filter(k=>s[16*f+k]===c).length;
  const turnsUntil=(face,test)=>{for(const t of ['',face,face+'2',face+"'"]){const g=t?fourApply(s,t):s;if(test(g))return t;}return null;};

  // ----- Stage 1: the centers -----
  stage(1,'centers','Solve the centers');
  const POS={5:'upper left',6:'upper right',9:'lower left',10:'lower right'};
  // Where each center belongs: the first (white) goes to the face with most white tiles, the
  // second opposite it, and from the third on the standard color layout decides, read from the
  // centers already built (the guide: when yellow is up, green is to the right of red).
  const built={};
  function faceFor(c){
    if(c===0){let best=0;for(let f=1;f<6;f++)if(centerCount(f,0)>centerCount(best,0))best=f;return best;}
    const faces=Object.keys(built).map(Number);
    for(const r of TWO_ROTS){const cen=applyAlg(new Cube(),r).center;if(faces.every(f=>cen[f]===built[f]))return cen.indexOf(c);}
    return -1;
  }
  for(let k=0;k<6;k++){
    const c=MASTER_ORDER[k];const cn=name(c);
    const face=faceFor(c);if(face<0)throw new Error('master: no face for '+cn);
    let hold=face===3?'z2':MASTER_TO_U[face];
    const holdText=k===0?`Hold the cube so a white center tile is on top${hold?': the dashed moves turn the whole cube':''}. `
      :k===1?'Turn the cube over: white on the bottom, yellow on top. '
      :k===2?`Turn the cube so the ${cn} center goes on top, white and yellow to the sides. `
      :`Turn the cube so the ${cn} center goes on top: the color layout says it belongs there. `;
    // the face a color was built on, in the frame after this hold
    const after=fourApply(FOUR_SOLVED.map((v,i)=>i),hold||[]);const faceAfter=f=>Math.floor(after.indexOf(16*f+5)/16);
    const nb={};for(const f in built)nb[faceAfter(+f)]=built[f];nb[0]=c;
    for(const f in built)delete built[f];Object.assign(built,nb);
    if(hold){const g=fourApply(s,hold);if(FOUR_CENTER.every(x=>g[x]===c)){part(`${masterCap(cn)} center: already done`,`${holdText}The ${cn} center is already complete.`,hold,[],{color:c});continue;}}
    let first=true;
    for(let guard=0;guard<8;guard++){
      const held=first&&hold?fourApply(s,hold):s;
      if(FOUR_CENTER.every(x=>held[x]===c))break;
      // a tile of this color that is not on top: a side face first, then the bottom
      let src=null;
      for(const f of [2,1,5,4,3]){for(const idx of FOUR_CENTER)if(held[16*f+idx]===c){src={f,idx};break;}if(src)break;}
      if(!src)throw new Error('master: no '+cn+' center tile left');
      const pre=[first?hold:'',src.f===3?'':MASTER_TO_F[src.f]].filter(Boolean).join(' ');
      if(src.f!==3&&MASTER_TO_F[src.f]){const t=fourApply(FOUR_SOLVED.map((v,i)=>i),MASTER_TO_F[src.f]);const fa=f=>Math.floor(t.indexOf(16*f+5)/16);const nb2={};for(const f in built)nb2[fa(+f)]=built[f];for(const f in built)delete built[f];Object.assign(built,nb2);}
      if(pre)s=fourApply(s,pre);
      const moves=[];let where='';
      if(src.f===3){const d=turnsUntil('D',g=>g[fourIdx(3,2,2)]===c);moves.push(d);where=`The ${cn} tile is on the bottom.${d?' Turn the bottom until it is at the lower right of the center: '+d+'.':' It is at the lower right of the center.'}`;}
      else{const f=turnsUntil('F',g=>g[fourIdx(2,2,2)]===c);moves.push(f);where=`The ${cn} tile is on the ${src.f===2?'front':'back'}.${src.f!==2?' Hold that face in front.':''}${f?' Turn the front until it is at the lower right of the center: '+f+'.':' It is at the lower right of the center.'}`;}
      const g1=fourApply(s,moves.filter(Boolean));
      let u='';for(const t of ['','U',"U'",'U2']){const g=t?fourApply(g1,t):g1;if(g[fourIdx(0,1,1)]!==c){u=t;break;}}
      moves.push(u);
      const a=src.f===3?MASTER_ALGS.centerDown:MASTER_ALGS.centerFront;
      const text=`${first?holdText:''}${where} Turn the top until a tile that is not ${cn} is at the upper left of the top center${u?': '+u:''}. Then ${a.say}.`;
      part(`${masterCap(cn)} center: ${4-centerCount(0,c)>1?'another':'the last'} tile`,text,'',[...moves.filter(Boolean),...parseAlg(a.alg)],{alg:a.id,color:c});
      cur.parts[cur.parts.length-1].pre=pre;
      first=false;
    }
    if(first&&hold){part(`${masterCap(cn)} center`,`${holdText}The ${cn} center is complete.`,hold,[],{color:c});}
  }
  if(!fourCentersSolid(s))throw new Error('master: centers not solid');

  // ----- Stage 2: pair the edges -----
  stage(2,'edges','Pair the edges');
  const wingAt=i=>[i,FOUR_PARTNER[i][0]]; // a wing as [this sticker, its partner]
  const colorsOf=w=>w.map(i=>s[i]);
  const slotOf=i=>FOUR_DEDGES.find(e=>e.wings.some(w=>w.includes(i)));
  for(let guard=0;guard<14;guard++){
    const open=FOUR_DEDGES.filter(e=>!fourPaired(s,e));if(!open.length)break;
    // the two pieces: the upper wing of the first open slot, and its twin elsewhere
    const A=open[0].wings[0];const cols=colorsOf(A);const key=cols.slice().sort().join();
    let B=null;for(const e of FOUR_DEDGES)for(const w of e.wings){if(w[0]===A[0]||w[1]===A[0])continue;if(colorsOf(w).slice().sort().join()===key&&w[0]!==A[0]&&w[0]!==A[1])B=w;}
    if(!B)throw new Error('master: no twin for an edge piece');
    // Outside turns until A and B sit across from each other at the front, the same color facing you.
    const across=(g,a,b)=>{const at=(w,slot)=>slot.includes(w[0])&&slot.includes(w[1]);
      for(const [L,R] of [[MASTER_FL_UP,MASTER_FR_UP],[MASTER_FL_LOW,MASTER_FR_LOW]]){if(((at(a,L)&&at(b,R))||(at(b,L)&&at(a,R)))&&g[L[0]]===g[R[0]])return true;}return false;};
    // BFS on the two stickers' positions
    const start2=[A[0],B[0]];const seen=new Set([start2.join()]);let frontier=[{p:start2,ms:[]}];let found=null;
    const trackA=A[0],trackB=B[0];
    for(let d=0;d<=6&&!found;d++){
      for(const {p,ms} of frontier){const g=ms.length?fourApply(s,ms):s;const a=wingAt(p[0]),b=wingAt(p[1]);
        if(across(g,a,b)){const after=fourApply(g,MASTER_ALGS.pairEdges.alg);
          if(FOUR_DEDGES.filter(e=>!fourPaired(after,e)).length<open.length&&fourCentersSolid(after)){found=ms;break;}}}
      if(found||d===6)break;
      const next=[];for(const {p,ms} of frontier)for(const m of MASTER_OUTER){if(ms.length&&ms[ms.length-1][0]===m[0])continue;const fw=masterFwd(m);const q=[fw[p[0]],fw[p[1]]];const k=q.join();if(seen.has(k))continue;seen.add(k);next.push({p:q,ms:[...ms,m]});}
      frontier=next;
    }
    if(!found){ // the last two edges can need the algorithm once more: do it from any across position, then look again
      let any=null;seen.clear();frontier=[{p:start2,ms:[]}];seen.add(start2.join());
      for(let d=0;d<=6&&!any;d++){for(const {p,ms} of frontier){const g=ms.length?fourApply(s,ms):s;if(across(g,wingAt(p[0]),wingAt(p[1]))){any=ms;break;}}
        if(any)break;const next=[];for(const {p,ms} of frontier)for(const m of MASTER_OUTER){if(ms.length&&ms[ms.length-1][0]===m[0])continue;const fw=masterFwd(m);const q=[fw[p[0]],fw[p[1]]];const k=q.join();if(seen.has(k))continue;seen.add(k);next.push({p:q,ms:[...ms,m]});}frontier=next;}
      if(!any)throw new Error('master: cannot line up an edge pair');found=any;}
    const cn=cols.map(name);const a=MASTER_ALGS.pairEdges;
    const setup=found.length?`Outside turns bring them to the left and the right of the front, across from each other: ${found.join(' ')}. `:'They already sit across from each other, left and right of the front. ';
    part(`${masterCap(cn[0])} and ${cn[1]} edge pieces`,`Find the two ${cn[0]} and ${cn[1]} edge pieces. ${setup}Then pair them: ${a.say}.`,'',[...found,...parseAlg(a.alg)],{alg:a.id,piece:{type:'wing',colors:cols}});
  }
  if(!fourAllPaired(s))throw new Error('master: edges not paired');
  if(opts&&opts.reduceOnly){const moves=[];for(const st of stages)for(const p of st.parts){if(p.pre)moves.push(...parseAlg(p.pre));moves.push(...p.moves);}return {stages,moves,solved:false,end:new FourCube(s)};}

  // ----- Stages 3 to 10: like a 3×3, with the parity fixes -----
  // Hold yellow on top, as the 3×3 guide starts; the 3×3 solver reads the cube as held.
  // holdPre is the pending turn of the whole cube: the next part carries it, so the state s stays
  // as it is until then, and every look at the cube goes through held().
  let holdPre=MASTER_TO_U[[0,1,2,3,4,5].find(f=>s[16*f+5]===3)];
  const held=()=>holdPre?fourApply(s,holdPre):s;
  let up3='yellow';
  const image=()=>{const c=fourToCube(held());if(!c)throw new Error('master: not reduced');return c;};
  function run3(list){
    const plan=solveBeginner(image(),{stages:list});
    for(const st of plan.stages){stage(st.n+2,st.id,st.name);
      for(const p of st.parts){const pre=[];if(holdPre){pre.push(holdPre);holdPre='';}if(p.up!==up3){pre.push('z2');up3=p.up;}pre.push(...parseAlg(p.pre||''));
        part(p.title,p.text,pre.join(' '),p.moves,{alg:p.alg,piece:p.piece});}}
  }
  run3([1,2,3,4]);
  if(up3!=='yellow')throw new Error('master: expected yellow up');
  // The yellow cross parity: one or three yellow edges up.
  stage(7,'ycross','The yellow cross');
  const upEdge={UB:[fourIdx(0,0,1)],UL:[fourIdx(0,1,0)],UR:[fourIdx(0,1,3)],UF:[fourIdx(0,3,1)]};
  const yellowUp=()=>{const g=held();return Object.keys(upEdge).filter(k=>g[upEdge[k][0]]===3);};
  {const ups=yellowUp();
    if(ups.length===1||ups.length===3){
      const toBack={UB:'',UL:"y'",UF:'y2',UR:'y'},toFront={UF:'',UR:"y'",UB:'y2',UL:'y'};
      const pre=[holdPre,ups.length===1?toBack[ups[0]]:toFront[Object.keys(upEdge).find(k=>!ups.includes(k))]].filter(Boolean).join(' ');holdPre='';
      const a=MASTER_ALGS.ollParity;
      part(`Parity: ${ups.length===1?'one yellow edge':'three yellow edges'} up`,`${ups.length===1?'One yellow edge is up: a 4×4 parity. Hold the cube so that edge is at the back.':'Three yellow edges are up: a 4×4 parity. Hold the cube so the gap is at the front.'} Then the parity algorithm: ${a.say}. The front edge turns over.`,pre,a.alg,{alg:a.id});}}
  run3([5,6,7]);
  // The yellow edges parity: two correct edges, across or next to each other.
  stage(10,'yedges','The yellow edges');
  const correct=()=>{const f=image().toFacelets();return ['UF','UR','UB','UL'].filter(k=>{const [a,b]=edgeFacelet[BEG_EDGE_POS[k]];return f[b]===f[9*Math.floor(b/9)+4];});};
  {let cube=derotate(image()); // a whole-cube turn changes the corner and edge parities together only in one fixed frame
    if(permParity(cube.cp)!==permParity(cube.ep)){
      for(let guard=0;guard<4;guard++){const done=correct();
        if(done.length===2){const pp=MASTER_ALGS.pllParity;
          const opposite=(done.includes('UF')&&done.includes('UB'))||(done.includes('UR')&&done.includes('UL'));
          if(opposite){const pre=done.includes('UF')?'y':'';part('Parity: two correct edges across from each other',`Two yellow edges are in their places, across from each other: a 4×4 parity. Hold them on the left and the right. Then: ${pp.say}. The front and back edges swap, and the cube is solved.`,[holdPre,pre].filter(Boolean).join(' '),pp.alg,{alg:pp.id});holdPre='';}
          else{let pre='';for(const r of ['','y',"y'",'y2']){const g=r?fourApply(held(),r):held();const c=fourToCube(g).toFacelets();const ok=['UL','UB'].every(k=>{const [a,b]=edgeFacelet[BEG_EDGE_POS[k]];return c[b]===c[9*Math.floor(b/9)+4];});if(ok){pre=r;break;}}
            part('Parity: two correct edges next to each other',`Two yellow edges are in their places, next to each other: a 4×4 parity. Hold them on the left and at the back. Then: ${pp.say}. After it, one side is solved, and the 3×3 algorithm finishes.`,[holdPre,pre].filter(Boolean).join(' '),pp.alg,{alg:pp.id});holdPre='';}
          break;}
        // none or one correct: the 3×3 algorithm once, as the guide says, then look again
        const a=BEGINNER_ALGS.yellowEdges;
        if(done.length===1){const toBack={UB:'',UL:"y'",UF:'y2',UR:'y'};part('One edge is right',`One yellow edge is in its place. Hold it at the back and do the 3×3 algorithm: ${a.say}. Then two edges are right, and the parity fix follows.`,[holdPre,toBack[done[0]]].filter(Boolean).join(' '),a.alg,{alg:a.id});holdPre='';}
        else{part('No edge is right',`No yellow edge is in its place. Hold the cube any way and do the 3×3 algorithm once: ${a.say}. Then one or two edges are right.`,holdPre,a.alg,{alg:a.id});holdPre='';}
      }
    }}
  run3([8]);
  const moves=[];for(const st of stages)for(const p of st.parts){if(p.pre)moves.push(...parseAlg(p.pre));moves.push(...p.moves);}
  return {stages,moves,solved:fourSolved(s),end:new FourCube(s)};
}
