// ===== Beginner method: the Rubik's eight-step guide =====
// Data: the steps, their goals, the algorithms and the trigger mnemonics.
// Solver: solveBeginner(cube) returns the plan a beginner follows, part by part, with only
// the guide's moves and holds. It reads the cube as held: the color of the top center is
// "yellow" and the color of the bottom center is "white", whatever the real colors are.
// Pure: no DOM. Loads after engine.js.

const BEGINNER_COLOR_NAMES=['white','red','green','yellow','orange','blue'];

const BEGINNER_TRIGGERS={
  left:{id:'left',name:'Left Trigger',moves:["L'","U'","L"],hand:'left',
    hint:'Left hand. Left face up, top away from you, left face back down.'},
  right:{id:'right',name:'Right Trigger',moves:['R','U',"R'"],hand:'right',
    hint:'Right hand. Right face up, top away from you, right face back down.'},
};
const BEGINNER_ALGS={
  yellowCross:{id:'yellowCross',name:'Yellow cross',alg:"F R U R' U' F'",say:"F, Right Trigger, U', F'"},
  sune:{id:'sune',name:'Yellow face',alg:"R U R' U R U2 R'",say:"Right Trigger, U, R, U2, R'"},
  cornerSwap:{id:'cornerSwap',name:'Yellow corners',alg:"L' U R U' L U R'",say:"L', U, R, U', L, U, R'"},
  edgeCycle:{id:'edgeCycle',name:'Yellow edges',alg:"F2 U L R' F2 L' R U F2",say:"F2, U, L, R', F2, L', R, U, F2"},
};

// The lessons. Prose is written for the app; the method, the step names, the triggers and the
// "move left / move right" names follow the Rubik's solve guide.
const BEGINNER_STEPS=[
  {n:0,id:'basics',name:'Get to know your cube',
   goal:'Know the three kinds of piece, how to hold the cube, and the six moves.',
   what:'A cube has centers, edges and corners. A center has one color and never moves. An edge has two colors. A corner has three. Every piece has one home, next to the centers of its colors.',
   how:'Hold the cube with white on top to begin. Step 1 turns it over: from then on the yellow center is on top for every step. The face that looks at you is the front. A letter is a quarter turn of that face, clockwise as you look at it. A letter with a mark, such as R\', turns the other way. A 2 means a half turn.',
   note:'The centers tell you the color of each face. White is always opposite yellow, green opposite blue, red opposite orange.'},
  {n:1,id:'daisy',name:'The daisy',
   goal:'Four white edges around the yellow center, like petals.',
   what:'Turn the cube over so the yellow center is on top. Then find each white edge and bring it to the top face, white side up. Keep the ones you placed.',
   how:'Find a white edge. See where it is, then do the moves for that case. If the top spot you need is taken, turn the top first to make room.',
   note:'As you place edges, you may need to turn the top to make space next to the yellow center.',
   cases:[
     {name:'Already on top, white up',text:'Leave it.',moves:''},
     {name:'White on the left of the front face',text:'Turn the left face away from you.',moves:"L'"},
     {name:'White on the right of the front face',text:'Turn the right face away from you.',moves:'R'},
     {name:'White at the top of the front face, facing you',text:'Turn the front, then the right face.',moves:'F R'},
     {name:'White at the bottom of the front face, facing you',text:'Turn the front the other way, then the right face.',moves:"F' R"},
     {name:'White on the bottom face',text:'Half turn of the front face.',moves:'F2'},
   ]},
  {n:2,id:'cross',name:'The white cross',
   goal:'A white cross on the bottom. Each side color of the cross matches its center.',
   what:'Move each white edge from the daisy down to the white face, with its other color under the matching center.',
   how:'Turn the top until an edge sits over the center of its other color. Then do a half turn of that face. Repeat for all four edges.',
   note:'Check from the side: the color under each center must match. Two edges that match and two that do not means the cross is not done.',
   cases:[{name:'Edge over its center',text:'Turn the top to match, then a half turn of the front.',moves:"U' F2"}]},
  {n:3,id:'corners',name:'The white corners',
   goal:'The white face is complete. The bottom row of every side matches its center.',
   what:'Find each white corner and move it down to the white face. Its two other colors must match the centers next to it.',
   how:'Learn the two triggers first. Find a white corner in the top layer. Turn the top until its side color sits over the center of that color. Do the trigger for that side. Keep the cross and the corners you placed.',
   note:'Move a white corner above the empty bottom corner it belongs to before you do a trigger. Then the corners you placed stay placed.',
   triggers:['left','right'],
   cases:[
     {name:'Top layer, white facing out, matching tile top left',text:'Turn the top to match the center. Left Trigger.',moves:"L' U' L"},
     {name:'Top layer, white facing out, matching tile top right',text:'Turn the top to match the center. Right Trigger.',moves:"R U R'"},
     {name:'Top layer, white facing up',text:'Put it above its home. Right Trigger twice. Now white faces out: use the cases above.',moves:"R U R' R U R'"},
     {name:'Bottom layer, wrong spot or twisted',text:'Hold it at the bottom right of the front. Right Trigger lifts it out. Then use the cases above.',moves:"R U R'"},
   ]},
  {n:4,id:'middle',name:'The middle layer',
   goal:'The bottom two layers are complete.',
   what:'Find the edges with no yellow on them. Move each one between the two centers that match its colors.',
   how:'Turn the top until the edge\'s front color matches the front center. Look at its top color. If that color is on the left, do Move Left. If it is on the right, do Move Right. A white corner comes up. Put it back with a trigger, like Step 3.',
   note:'No edge without yellow on the top? One is stuck in the middle layer. Do Move Right on that spot with any yellow edge. The stuck edge comes up.',
   triggers:['left','right'],
   cases:[
     {name:'Move Left',text:'U\', Left Trigger. Then turn the top to match the white corner and do a Right Trigger.',moves:"U' L' U' L"},
     {name:'Move Right',text:'U, Right Trigger. Then turn the top to match the white corner and do a Left Trigger.',moves:"U R U R'"},
   ]},
  {n:5,id:'ycross',name:'The yellow cross',
   goal:'A yellow cross on top. The side colors do not matter yet.',
   what:'Flip the yellow edges so they all face up.',
   how:'Look at the top. A dot, an L, or a line. Hold the L at the back left. Hold the line left to right. Do the algorithm. Repeat until you see the cross.',
   note:'The algorithm is F, the Right Trigger, U\', F\'. Say it as one phrase.',
   algs:['yellowCross'],
   cases:[
     {name:'Dot',text:'Hold the cube any way. Do the algorithm. You get an L.',moves:"F R U R' U' F'"},
     {name:'L shape',text:'Hold the L at the back left. Do the algorithm. You get a line.',moves:"F R U R' U' F'"},
     {name:'Line',text:'Hold the line left to right. Do the algorithm. You get the cross.',moves:"F R U R' U' F'"},
   ]},
  {n:6,id:'yface',name:'The yellow face',
   goal:'The whole top face is yellow.',
   what:'Twist the yellow corners so their yellow sides face up.',
   how:'Count the corners with yellow on top. No corners or two corners: hold the cube so the front left corner has yellow facing you. One corner: hold that corner at the front left. Do the algorithm. Count again. Repeat.',
   note:'You may see the same picture twice in a row. Keep going. The algorithm is the Right Trigger, then U, R, U2, R\'.',
   algs:['sune'],
   cases:[
     {name:'No corner yellow on top',text:'Yellow faces you on the front left corner.',moves:"R U R' U R U2 R'"},
     {name:'One corner yellow on top',text:'That corner at the front left.',moves:"R U R' U R U2 R'"},
     {name:'Two corners yellow on top',text:'Yellow faces you on the front left corner.',moves:"R U R' U R U2 R'"},
   ]},
  {n:7,id:'ycorners',name:'The yellow corners',
   goal:'Each yellow corner sits between its centers. The top corners of every side match.',
   what:'Move the yellow corners to their places. The yellow face breaks while you do it and comes back at the end.',
   how:'Look for two corners on one side that show the same color. Turn the top so that color sits over its center. Hold that side on the left. Do the algorithm, then the yellow face algorithm. No matching pair? Do both algorithms once with any side in front, and a pair appears.',
   note:'After the first algorithm the top looks broken. That is right. The second algorithm brings the yellow face back.',
   algs:['cornerSwap','sune'],
   cases:[
     {name:'No matching corners',text:'Any side in front. Algorithm, then yellow face.',moves:"L' U R U' L U R' R U R' U R U2 R'"},
     {name:'Two matching corners',text:'Line them up with their center. Hold that side on the left. Algorithm, then yellow face.',moves:"L' U R U' L U R' R U R' U R U2 R'"},
   ]},
  {n:8,id:'yedges',name:'The yellow edges',
   goal:'The cube is solved.',
   what:'Move the last three or four edges round until each is between its centers.',
   how:'If one side is complete, hold it at the back. Do the algorithm. Not solved? Check for a complete side, put it at the back, and do it again. Up to three times.',
   note:'The back edge stays still. The other three go round. If no side is complete, use any side as the back: after one time, one side is complete.',
   algs:['edgeCycle'],
   cases:[
     {name:'One side complete',text:'Hold it at the back. Do the algorithm.',moves:"F2 U L R' F2 L' R U F2"},
     {name:'No side complete',text:'Any side at the back. Do the algorithm. Then one side is complete.',moves:"F2 U L R' F2 L' R U F2"},
   ]},
];

// Find the triggers inside a move list, so the player can show each one as a chunk.
function beginnerChunks(moves){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const out=[];
  for(let i=0;i+2<ms.length;i++){
    for(const t of [BEGINNER_TRIGGERS.right,BEGINNER_TRIGGERS.left]){
      if(ms[i]===t.moves[0]&&ms[i+1]===t.moves[1]&&ms[i+2]===t.moves[2]){out.push({label:t.name,id:t.id,at:i,len:3});i+=2;break;}
    }
  }
  return out;
}

// ---------- the solver ----------
const BEG_FACE_OF=i=>Math.floor(i/9); // facelet index -> face 0..5 (U R F D L B)
const BEG_FACE_LETTER='URFDLB';
const BEG_EDGE_POS={UR:0,UF:1,UL:2,UB:3,DR:4,DF:5,DL:6,DB:7,FR:8,FL:9,BL:10,BR:11};
const BEG_CORNER_POS={URF:0,UFL:1,ULB:2,UBR:3,DFR:4,DLF:5,DBL:6,DRB:7};
const BEG_U_EDGE_RING=['UF','UL','UB','UR'];      // a U turn moves a piece one step along
const BEG_U_CORNER_RING=['URF','UFL','ULB','UBR'];
const BEG_SIDE_RING=['F','L','B','R'];             // a U turn moves a top sticker one face along
const BEG_U_TOK=['','U','U2',"U'"];
const BEG_TO_FRONT={F:'',R:'y',B:'y2',L:"y'"};     // the rotation that brings a side to the front
const BEG_TO_LEFT={L:'',F:'y',R:'y2',B:"y'"};
const BEG_TO_BACK={B:'',L:'y',F:'y2',R:"y'"};
const BEG_CORNER_TO_URF={URF:'',UFL:"y'",ULB:'y2',UBR:'y'};
const BEG_EDGE_TO_FR={FR:'',FL:"y'",BL:'y2',BR:'y'};

function solveBeginner(start){
  let c=start;const stages=[];let cur=null;
  const name=x=>BEGINNER_COLOR_NAMES[x];
  const fl=()=>c.toFacelets();
  const cen=(f,letter)=>f[9*BEG_FACE_LETTER.indexOf(letter)+4];
  const sideOf=(f,i)=>BEG_FACE_LETTER[BEG_FACE_OF(i)];
  const after=(cube,ms)=>ms.length?applyAlg(cube,ms):cube;
  function stage(n,id,label){cur={n,id,name:label,parts:[]};stages.push(cur);}
  function part(title,text,pre,moves,extra){
    const ms=(Array.isArray(moves)?moves:parseAlg(moves||'')).filter(Boolean);
    if(pre)c=applyAlg(c,[pre]);c=after(c,ms);
    const p=Object.assign({title,text,pre:pre||'',moves:ms,chunks:beginnerChunks(ms)},extra||{});
    cur.parts.push(p);return p;
  }
  const edgeSt=(f,i)=>edgeFacelet[i].map(x=>f[x]);
  const cornerSt=(f,i)=>cornerFacelet[i].map(x=>f[x]);
  const edgeSolved=(f,i)=>edgeFacelet[i].every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]);
  const cornerSolved=(f,i)=>cornerFacelet[i].every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]);
  // U turns so that the top slot `slot` holds no edge with color w on top.
  function freeTop(f,slot,w){const idx=BEG_U_EDGE_RING.indexOf(slot);
    for(const k of [0,1,3,2]){const from=BEG_U_EDGE_RING[(idx-k+4)%4];if(f[edgeFacelet[BEG_EDGE_POS[from]][0]]!==w)return BEG_U_TOK[k];}return '';}
  const T=()=>fl()[4],W=()=>fl()[31];

  // ----- Step 1: the daisy -----
  stage(1,'daisy','The daisy');
  for(let guard=0;guard<12;guard++){
    const f=fl(),w=W();
    if(BEG_U_EDGE_RING.every(s=>f[edgeFacelet[BEG_EDGE_POS[s]][0]]===w))break;
    let e=null;
    for(let i=0;i<12;i++){const st=edgeSt(f,i);const k=st.indexOf(w);if(k<0)continue;if(EDGE_NAMES[i][0]==='U'&&k===0)continue;e={i,k,st};break;}
    const other=name(e.st[1-e.k]);const en=EDGE_NAMES[e.i];
    const whiteFace=en[e.k];
    if(en[0]==='U'){ // white on a side, piece on top: F then R, with room made for it
      const pre=BEG_TO_FRONT[whiteFace];const g=after(c,pre?[pre]:[]).toFacelets();
      const g2=applyAlg(c,[pre,'F'].filter(Boolean)).toFacelets();const u=freeTop(g2,'UR',w);
      part(`White and ${other} edge`,`It is at the top of the front face, white facing you. Turn the front: F.${u?' Turn the top to make room: '+u+'.':''} Then R lifts it up.`,pre,['F',u,'R'],{piece:{type:'edge',colors:e.st}});
    }else if(en[0]==='D'){
      const sideFace=en[1];const pre=BEG_TO_FRONT[sideFace];
      if(e.k===0){const g=after(c,pre?[pre]:[]).toFacelets();const u=freeTop(g,'UF',w);
        part(`White and ${other} edge`,`It is on the bottom face, under the front.${u?' Turn the top to make room: '+u+'.':''} A half turn of the front brings it up: F2.`,pre,[u,'F2'],{piece:{type:'edge',colors:e.st}});
      }else{const g2=applyAlg(c,[pre,"F'"].filter(Boolean)).toFacelets();const u=freeTop(g2,'UR',w);
        part(`White and ${other} edge`,`It is at the bottom of the front face, white facing you. Turn the front back: F'.${u?' Turn the top to make room: '+u+'.':''} Then R lifts it up.`,pre,["F'",u,'R'],{piece:{type:'edge',colors:e.st}});}
    }else{ // middle layer: bring the white sticker to the front face, then R or L'
      const pre=BEG_TO_FRONT[whiteFace];const g=after(c,pre?[pre]:[]).toFacelets();
      let at=null;for(const s of ['FR','FL']){const st=edgeSt(g,BEG_EDGE_POS[s]);if(st[0]===w&&st[1]===e.st[1-e.k])at=s;}
      if(at==='FR'){const u=freeTop(g,'UR',w);part(`White and ${other} edge`,`It is on the right of the front face, white facing you.${u?' Turn the top to make room: '+u+'.':''} R lifts it up.`,pre,[u,'R'],{piece:{type:'edge',colors:e.st}});}
      else{const u=freeTop(g,'UL',w);part(`White and ${other} edge`,`It is on the left of the front face, white facing you.${u?' Turn the top to make room: '+u+'.':''} L' lifts it up.`,pre,[u,"L'"],{piece:{type:'edge',colors:e.st}});}
    }
  }

  // ----- Step 2: the white cross -----
  stage(2,'cross','The white cross');
  for(let guard=0;guard<4;guard++){
    const f=fl(),w=W();
    let e=null;for(const s of BEG_U_EDGE_RING){const i=BEG_EDGE_POS[s];const st=edgeSt(f,i);if(st[0]===w){e={s,st};break;}}
    if(!e)break;
    const col=e.st[1];const face=['F','R','B','L'].find(x=>cen(f,x)===col);const pre=BEG_TO_FRONT[face];
    const g=after(c,pre?[pre]:[]).toFacelets();
    let slot=null;for(const s of BEG_U_EDGE_RING){const st=edgeSt(g,BEG_EDGE_POS[s]);if(st[0]===w&&st[1]===col)slot=s;}
    const k=(BEG_U_EDGE_RING.indexOf('UF')-BEG_U_EDGE_RING.indexOf(slot)+4)%4;const u=BEG_U_TOK[k];
    part(`White and ${name(col)} edge`,`Hold ${name(col)} in front.${u?' Turn the top until the edge sits over the '+name(col)+' center: '+u+'.':' The edge already sits over the '+name(col)+' center.'} A half turn of the front sends it down: F2.`,pre,[u,'F2'],{piece:{type:'edge',colors:e.st}});
  }

  // ----- Step 3: the white corners (also used to put a corner back in step 4) -----
  function placeTopCorner(){ // a white corner in the top layer, white on a side -> trigger
    const f=fl(),w=W();
    let cnr=null;for(let i=0;i<4;i++){const st=cornerSt(f,i);const k=st.indexOf(w);if(k>0){cnr={i,k,st};break;}}
    if(!cnr)return false;
    const other=cnr.st.find((x,j)=>j>0&&j!==cnr.k); // the side tile that is not white
    const face=['F','R','B','L'].find(x=>cen(f,x)===other);
    let k=0,g=null,pos=null;
    for(k=0;k<4;k++){g=after(c,BEG_U_TOK[k]?[BEG_U_TOK[k]]:[]).toFacelets();pos=null;
      for(let i=0;i<4;i++){const fc=cornerFacelet[i];const st=fc.map(x=>g[x]);if(st.indexOf(w)>0&&st.includes(other)){const j=st.indexOf(other);if(sideOf(g,fc[j])===face)pos=i;}}
      if(pos!=null)break;}
    if(pos==null)throw new Error('beginner: cannot line up a top corner');
    const u=BEG_U_TOK[k];const pre=BEG_TO_FRONT[face];
    const gr=applyAlg(c,[u,pre].filter(Boolean)).toFacelets();
    let at=null;for(const p of ['UFL','URF']){const st=cornerSt(gr,BEG_CORNER_POS[p]);if(st.indexOf(w)>0&&st.includes(other))at=p;}
    const trig=at==='UFL'?BEGINNER_TRIGGERS.left:BEGINNER_TRIGGERS.right;
    const cols=cnr.st.filter(x=>x!==w).map(name).join(' and ');
    part(`White, ${cols} corner`,`${u?'Turn the top until the '+name(other)+' tile sits over the '+name(other)+' center: '+u+'. ':'The '+name(other)+' tile already sits over its center. '}Hold ${name(other)} in front. The corner is at the top ${at==='UFL'?'left':'right'}, white facing ${at==='UFL'?'left':'right'}. ${trig.name}.`,pre,[u,...trig.moves],{piece:{type:'corner',colors:cnr.st},trigger:trig.id});
    return true;
  }
  stage(3,'corners','The white corners');
  for(let guard=0;guard<24;guard++){
    const f=fl(),w=W();
    if([4,5,6,7].every(i=>cornerSolved(f,i)))break;
    // A corner with white on a side goes home with one trigger. Place those first, so a
    // white-up corner never flips twice (the double trigger undoes itself).
    if(placeTopCorner())continue;
    let up=null;for(let i=0;i<4;i++){const st=cornerSt(f,i);if(st[0]===w){up={i,k:0,st};break;}}
    if(up){ // white facing up: put it above its home, Right Trigger twice
      let k=0,pos=null;
      for(k=0;k<4;k++){const g=after(c,BEG_U_TOK[k]?[BEG_U_TOK[k]]:[]).toFacelets();
        for(let i=0;i<4;i++){const fc=cornerFacelet[i];const st=fc.map(x=>g[x]);if(st[0]!==w||!st.includes(up.st[1])||!st.includes(up.st[2]))continue;
          // Above its home, a white-up corner shows its side colors crossed: compare as a set.
          const sides=[g[9*BEG_FACE_OF(fc[1])+4],g[9*BEG_FACE_OF(fc[2])+4]];if(sides.includes(st[1])&&sides.includes(st[2]))pos=CORNER_NAMES[i];}
        if(pos)break;}
      if(!pos)throw new Error('beginner: no home above a white-up corner');
      const u=BEG_U_TOK[k];const pre=BEG_CORNER_TO_URF[pos];
      const cols=up.st.slice(1).map(name).join(' and ');
      part(`White, ${cols} corner`,`White faces up.${u?' Turn the top until the corner sits between the '+cols+' centers: '+u+'.':' It already sits between its two centers.'} Hold it at the top right of the front. Right Trigger twice. Now white faces out.`,pre,[u,...BEGINNER_TRIGGERS.right.moves,...BEGINNER_TRIGGERS.right.moves],{piece:{type:'corner',colors:up.st},trigger:'right'});
    }else{ // all white corners are in the bottom layer, one is wrong: lift it out
      const i=[4,5,6,7].find(j=>!cornerSolved(f,j));const pos=CORNER_NAMES[i];
      const pre={DFR:'',DLF:"y'",DBL:'y2',DRB:'y'}[pos];
      const g=after(c,pre?[pre]:[]).toFacelets();
      let k=0;for(k=0;k<4;k++){const h=after(c,[pre,BEG_U_TOK[k]].filter(Boolean)).toFacelets();if(!cornerSt(h,0).includes(w))break;}
      const u=BEG_U_TOK[k];const st=cornerSt(f,i);const cols=st.filter(x=>x!==w).map(name).join(' and ');
      part(`White, ${cols} corner`,`It is in the bottom layer, but wrong. Hold it at the bottom right of the front.${u?' Turn the top so no white corner is above it: '+u+'.':''} Right Trigger lifts it out.`,pre,[u,...BEGINNER_TRIGGERS.right.moves],{piece:{type:'corner',colors:st},trigger:'right'});
    }
  }

  // ----- Step 4: the middle layer -----
  stage(4,'middle','The middle layer');
  for(let guard=0;guard<16;guard++){
    const f=fl(),t=T(),w=W();
    if([8,9,10,11].every(i=>edgeSolved(f,i)))break;
    let e=null;for(let i=0;i<4;i++){const st=edgeSt(f,i);if(!st.includes(t)){e={i,st};break;}}
    if(e){
      const side=e.st[1];const face=['F','R','B','L'].find(x=>cen(f,x)===side);
      let k=0;for(k=0;k<4;k++){const g=after(c,BEG_U_TOK[k]?[BEG_U_TOK[k]]:[]).toFacelets();const slot={F:'UF',L:'UL',B:'UB',R:'UR'}[face];const st=edgeSt(g,BEG_EDGE_POS[slot]);if(st[0]===e.st[0]&&st[1]===side)break;}
      const u=BEG_U_TOK[k];const pre=BEG_TO_FRONT[face];const g=applyAlg(c,[u,pre].filter(Boolean)).toFacelets();
      const right=cen(g,'R')===e.st[0];const cols=`${name(side)} and ${name(e.st[0])}`;
      const first=right?['U',...BEGINNER_TRIGGERS.right.moves]:["U'",...BEGINNER_TRIGGERS.left.moves];
      part(`${cols[0].toUpperCase()+cols.slice(1)} edge`,`${u?'Turn the top until the '+name(side)+' tile sits over the '+name(side)+' center: '+u+'. ':''}Hold ${name(side)} in front. The top tile is ${name(e.st[0])}, the color on the ${right?'right':'left'}. Move ${right?'Right: U, Right Trigger':'Left: U\', Left Trigger'}.`,pre,[u,...first],{piece:{type:'edge',colors:e.st},move:right?'right':'left'});
      cur.parts[cur.parts.length-1].text+=' A white corner came up.';
      const p=placeTopCorner();if(p)cur.parts[cur.parts.length-1].title='Put the white corner back';
    }else{ // an edge is stuck in the middle layer: kick it out with a yellow edge
      const i=[8,9,10,11].find(j=>!edgeSolved(f,j));const pos=EDGE_NAMES[i];const pre=BEG_EDGE_TO_FR[pos];
      let k=0;for(k=0;k<4;k++){const g=after(c,[pre,BEG_U_TOK[k]].filter(Boolean)).toFacelets();if(edgeSt(g,1).includes(t))break;}
      const u=BEG_U_TOK[k];const st=edgeSt(f,i);
      part(`${name(st[0])[0].toUpperCase()+name(st[0]).slice(1)} and ${name(st[1])} edge, stuck`,`It is in the middle layer, but wrong. Hold it at the front right.${u?' Turn the top so a yellow edge sits at the top of the front: '+u+'.':''} Move Right: U, Right Trigger. The stuck edge comes up.`,pre,[u,'U',...BEGINNER_TRIGGERS.right.moves],{piece:{type:'edge',colors:st},move:'right'});
      cur.parts[cur.parts.length-1].text+=' A white corner came up.';
      const p=placeTopCorner();if(p)cur.parts[cur.parts.length-1].title='Put the white corner back';
    }
  }

  // ----- Step 5: the yellow cross -----
  stage(5,'ycross','The yellow cross');
  const upEdges=f=>{const t=f[4];const o={};for(const s of ['UF','UL','UB','UR'])o[s]=f[edgeFacelet[BEG_EDGE_POS[s]][0]]===t;return o;};
  for(let guard=0;guard<4;guard++){
    const f=fl();const up=upEdges(f);const n=Object.values(up).filter(Boolean).length;
    if(n===4)break;
    let pre='',shape='dot',hold='Hold the cube any way.';
    if(n===2){for(const r of ['','y',"y'",'y2']){const g=after(c,r?[r]:[]).toFacelets();const u2=upEdges(g);
        if(u2.UB&&u2.UL){pre=r;shape='L';hold='Hold the L at the back left.';break;}
        if(u2.UL&&u2.UR){pre=r;shape='line';hold='Hold the line left to right.';break;}}}
    part(`${shape==='dot'?'A dot':shape==='L'?'An L':'A line'} on top`,`${hold} Do the yellow cross algorithm: F, Right Trigger, U', F'.`,pre,BEGINNER_ALGS.yellowCross.alg,{alg:'yellowCross',shape});
  }

  // ----- Step 6: the yellow face -----
  stage(6,'yface','The yellow face');
  const SUNE=parseAlg(BEGINNER_ALGS.sune.alg);
  function yfacePath(cube,depth){
    const f=cube.toFacelets(),t=f[4];const n=[0,2,6,8].filter(i=>f[i]===t).length;
    if(n===4)return [];if(!depth)return null;
    let best=null;
    for(const r of ['','y',"y'",'y2']){const cr=after(cube,r?[r]:[]);const g=cr.toFacelets();
      const ok=n===1?g[6]===t:g[18]===t;if(!ok)continue;
      const rest=yfacePath(applyAlg(cr,SUNE),depth-1);if(rest&&(!best||rest.length+1<best.length))best=[{r,n}].concat(rest);}
    return best;
  }
  const path=yfacePath(c,6)||[];
  for(const step of path){
    const how=step.n===1?'One corner has yellow on top. Hold it at the front left.':`${step.n===0?'No corner':'Two corners'} ${step.n===0?'has':'have'} yellow on top. Hold the cube so yellow faces you on the front left corner.`;
    part(`${step.n} ${step.n===1?'corner':'corners'} yellow on top`,`${how} Do the yellow face algorithm: Right Trigger, U, R, U2, R'.`,step.r,BEGINNER_ALGS.sune.alg,{alg:'sune',count:step.n});
  }

  // ----- Step 7: the yellow corners -----
  stage(7,'ycorners','The yellow corners');
  const cornersMatch=f=>[0,1,2,3].every(i=>cornerFacelet[i].slice(1).every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]));
  function aufForCorners(){for(let k=0;k<4;k++){const g=after(c,BEG_U_TOK[k]?[BEG_U_TOK[k]]:[]).toFacelets();if(cornersMatch(g))return k;}return null;}
  for(let guard=0;guard<3;guard++){
    const k=aufForCorners();
    if(k!=null){if(k)part('Line up the corners',`Turn the top until every corner matches its centers: ${BEG_U_TOK[k]}.`,'',[BEG_U_TOK[k]]);break;}
    const f=fl();
    const pairs=[{n:'F',a:18,b:20},{n:'R',a:9,b:11},{n:'B',a:45,b:47},{n:'L',a:36,b:38}];
    const m=pairs.find(x=>f[x.a]===f[x.b]);
    if(m){const col=f[m.a];const face=['F','R','B','L'].find(x=>cen(f,x)===col);
      const kk=(BEG_SIDE_RING.indexOf(face)-BEG_SIDE_RING.indexOf(m.n)+4)%4;const u=BEG_U_TOK[kk];const pre=BEG_TO_LEFT[face];
      part('Two corners match',`Two corners on one side show ${name(col)}.${u?' Turn the top until they sit over the '+name(col)+' center: '+u+'.':''} Hold that side on the left. Do the yellow corners algorithm: L', U, R, U', L, U, R'.`,pre,[u,...parseAlg(BEGINNER_ALGS.cornerSwap.alg)],{alg:'cornerSwap'});
    }else{
      part('No corners match','Hold the cube any way. Do the yellow corners algorithm: L\', U, R, U\', L, U, R\'. Two corners will match after the next part.','',BEGINNER_ALGS.cornerSwap.alg,{alg:'cornerSwap'});
    }
    part('Bring the yellow face back','The top looks broken. That is right. Do the yellow face algorithm: Right Trigger, U, R, U2, R\'.','',BEGINNER_ALGS.sune.alg,{alg:'sune'});
  }

  // ----- Step 8: the yellow edges -----
  stage(8,'yedges','The yellow edges');
  for(let guard=0;guard<4;guard++){
    const f=fl();const done=['UF','UR','UB','UL'].filter(s=>{const [a,b]=edgeFacelet[BEG_EDGE_POS[s]];return f[b]===f[9*BEG_FACE_OF(b)+4];});
    if(done.length===4)break;
    let pre='',hold='No side is complete. Hold the cube any way.';
    if(done.length===1){pre=BEG_TO_BACK[done[0][1]];hold=`The ${name(cen(f,done[0][1]))} side is complete. Hold it at the back.`;}
    part(done.length===1?'One side complete':'No side complete',`${hold} Do the yellow edges algorithm: F2, U, L, R', F2, L', R, U, F2.`,pre,BEGINNER_ALGS.edgeCycle.alg,{alg:'edgeCycle'});
  }

  const moves=[];for(const s of stages)for(const p of s.parts){if(p.pre)moves.push(p.pre);moves.push(...p.moves);}
  const f=c.toFacelets();const solved=[0,1,2,3,4,5].every(i=>{for(let j=0;j<9;j++)if(f[9*i+j]!==f[9*i+4])return false;return true;});
  return {stages,moves,solved,end:c};
}
