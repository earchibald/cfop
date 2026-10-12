// ===== The 2×2 beginner method: the Rubik's Mini solution guide =====
// Source: "You can do the Rubik's Mini, Solution Guide" (Spin Master, V1-EU-M-2020), the current
// guide at rubiks.com/solve-it. Two layers, five steps: the top layer corner by corner, then the
// yellow face, then the yellow corners. The holds, the algorithms and the sayings are the
// guide's own.
// Data: MINI_STEPS, MINI_ALGS. miniChunks boxes the named algorithms inside a move list.
// Solver: solveMini(cube) returns the plan a beginner follows, part by part, with only the
// guide's moves and holds. The cube is read as it is: the colors are the real colors, there are
// no centers. Every part carries `up`, the face on top while it is done: 'white' for the top
// layer, 'yellow' for the rest; where it changes, the cube turns over (z2). A part's `pre` is
// the hold before it: one or two whole-cube turns as a string, '' for none.
// Pure: no DOM. Loads after engine.js and two.js.

const MINI_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
// The guide's four white corners, in its order, as engine corner numbers. Each goes to the top
// front right while the one before it sits at the top front left.
const MINI_ORDER=[3,2,1,0]; // white-red-blue, white-blue-orange, white-green-orange, white-green-red

const MINI_ALGS={
  cornerDown:{id:'cornerDown',name:"R', D', R",alg:"R' D' R",say:"R', D', R",step:1,
    why:"R' brings the right side down. D' moves the corner along the bottom. R brings the right side back up. From the top, it moves a corner down. From the bottom, it puts a corner in with white facing right."},
  cornerFront:{id:'cornerFront',name:'White to the front',alg:"F D' F' D2",say:"F, D', F', D2",step:3,
    why:'Four moves that turn the corner in its place at the bottom right, so white faces you. Then it goes in like any other corner.'},
  cornerIn:{id:'cornerIn',name:'Corner in',alg:"D' R' D R",say:"D', R', D, R",step:3,
    why:"D' moves the corner out of the way. R' brings its place down. D moves it into place. R brings it up to the top layer. The three corners already on top stay."},
  yellowFace:{id:'yellowFace',name:'Yellow face',alg:"R U R' U R U2 R'",say:'Up, Over, Down, Over, Up, Over over, Down',step:4,
    parts:[[3,'Up, Over, Down'],[1,'Over'],[3,'Up, Over over, Down']],
    why:'The words under the turns are a chant. The right face turns in opposite directions every other time, and the top face always turns clockwise.'},
  yellowCorners:{id:'yellowCorners',name:'Yellow corners',alg:"R' F R' B2 R F' R' B2 R2 U'",step:5,
    say:'Run to me, Fast, Run to me, Back Back. Run away, Fast, Run to me, Back Back. Run Run away, Up',
    parts:[[4,'Run to me, Fast, Run to me, Back Back'],[4,'Run away, Fast, Run to me, Back Back'],[2,'Run Run away, Up']],
    why:"The words under the moves are a chant. R' is \"run to me\", R is \"run away\", F is \"fast\", B2 is \"back back\", U' is \"up\". It swaps the two front corners on top."},
};
const MINI_CHUNK_ALGS=Object.values(MINI_ALGS).map(a=>({id:a.id,name:a.name,moves:parseAlg(a.alg),parts:a.parts})).sort((a,b)=>b.moves.length-a.moves.length);
function miniChunks(moves){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const out=[];
  for(let i=0;i<ms.length;){
    const hit=MINI_CHUNK_ALGS.find(a=>i+a.moves.length<=ms.length&&a.moves.every((m,k)=>ms[i+k]===m));
    if(!hit){i++;continue;}
    if(hit.parts){let at=i;for(const [len,label] of hit.parts){out.push({label,id:hit.id,at,len});at+=len;}}
    else out.push({label:hit.name,id:hit.id,at:i,len:hit.moves.length});
    i+=hit.moves.length;
  }
  return out;
}

// The lessons. A case's `setup` makes its start from the lesson's hold (a solved cube held as
// the step holds it); its `moves` are the guide's answer. Without a setup, the case starts where
// its own moves, undone, put it.
const MINI_STEPS=[
  {n:0,id:'basics',name:'Get to know your Mini',
   goal:'Know the two layers, the six faces, the eight corners, and the six moves.',
   goals:['Two layers, six faces, eight corners','How to hold the cube','The six moves'],
   what:'A 2×2 cube has two layers, a top layer and a bottom layer. It has 6 faces, and it is made up of 8 corners. Every corner has three colored tiles. There are no centers and no edges.',
   how:'Every step in the solution tells you how to hold the cube: which corner goes to the front right, and which face is up. Keep the same front face for a whole algorithm.',
   note:'When the cube is solved, white is opposite yellow, blue is opposite green, and orange is opposite red. Each move is a quarter turn. A letter with a mark turns the other way. A 2 means twice.',
   kinds:[['corners','corner']]},
  {n:1,id:'first',name:'The first two corners',
   goal:'Two white corners on top, next to each other: white-red-blue, then white-blue-orange.',
   what:'Hold the cube so the white-red-blue corner is at the top front right: white up, red in front, blue on the right. That corner is placed. Now find the white-blue-orange corner and bring it next to it.',
   how:'Is the white-blue-orange corner in the top layer? Hold it on the right and do R\', D\', R to move it down. Then hold the cube again with the white-red-blue corner on the left. Twist the bottom until the corner is under its place, at the bottom right of the front. White facing you: R. White facing right: R\', D\', R. White facing down: D, R2.',
   note:'A corner in the bottom layer first, then up. The three turns R\', D\', R work both ways: they bring a corner down from the top, and up from the bottom when white faces right.',
   algs:['cornerDown'],
   cases:[
     {name:'Top layer, in the wrong place or twisted',text:'Hold it on the right. R\', D\', R brings it down. Then hold the placed corner on the left again.',moves:"R' D' R",setup:"R' D R2"},
     {name:'Bottom right, white facing you',text:'Turn the right face up: R.',moves:'R'},
     {name:'Bottom right, white facing right',text:'R\', D\', R.',moves:"R' D' R"},
     {name:'Bottom right, white facing down',text:'D, then R2.',moves:'D R2'},
   ]},
  {n:2,id:'third',name:'The third corner',
   goal:'Three white corners on top.',
   what:'Hold the cube so the white-blue-orange corner is on the left, white still up. Find the white-green-orange corner. It goes to the top front right.',
   how:'In the top layer at the back right with white facing back: R\' and it is in. At the back right any other way: R, D\' brings it down. At the front right but twisted: R2, D\' brings it down. Then twist the bottom until it is at the bottom right of the front. White facing you: R. White facing right: R\', D\', R. White facing down: D, R2.',
   note:'Every top-layer case ends in the bottom layer. From there the three bottom cases are the same as for the second corner.',
   algs:['cornerDown'],
   cases:[
     {name:'Back right, white facing back',text:'One turn: R\'.',moves:"R'",setup:"R"},
     {name:'Back right, white up or facing right',text:'R, D\' brings it down. Then place it from the bottom.',moves:"R D'",setup:"R' D R'"},
     {name:'Front right, twisted',text:'R2, D\' brings it down. Then place it from the bottom.',moves:"R2 D'",setup:"R' D R2"},
     {name:'Bottom right, white facing you',text:'R.',moves:'R'},
     {name:'Bottom right, white facing right',text:'R\', D\', R.',moves:"R' D' R"},
     {name:'Bottom right, white facing down',text:'D, then R2.',moves:'D R2'},
   ]},
  {n:3,id:'fourth',name:'The fourth corner',
   goal:'The top layer is solved: white on top, and each side of the top layer one color.',
   what:'Hold the cube so the white-green-orange corner is on the left, white up. Find the white-green-red corner. It goes to the top front right, between the three placed corners.',
   how:'In the top layer, at the front right but twisted: R\', D\', R brings it down. Then twist the bottom until it is at the bottom right of the front. White facing down: F, D\', F\', D2 first, so white faces you. White facing you: Corner in, D\', R\', D, R. White facing right: R\', D\', R.',
   note:'This corner has placed corners on both sides, so the single R turn is no longer allowed. The algorithms here keep the three corners on top where they are.',
   algs:['cornerIn','cornerFront','cornerDown'],
   cases:[
     {name:'Front right, twisted',text:'R\', D\', R brings it down. Then place it from the bottom.',moves:"R' D' R",setup:"R' D' R D R' D' R D"},
     {name:'Bottom right, white facing down',text:'F, D\', F\', D2 turns white to the front. Then Corner in: D\', R\', D, R.',moves:"F D' F' D2 D' R' D R"},
     {name:'Bottom right, white facing you',text:'Corner in: D\', R\', D, R.',moves:"D' R' D R"},
     {name:'Bottom right, white facing right',text:'R\', D\', R.',moves:"R' D' R"},
   ]},
  {n:4,id:'yface',name:'Make the yellow face',
   goal:'The whole top face is yellow.',
   what:'Turn the cube over so the white face is on the bottom. Twist the yellow corners so their yellow tiles face up.',
   how:'Count the yellow tiles on the top face. One: Top one. Hold the cube so that tile is at the front left. None: None left. Hold a yellow tile on the left face, at the front. Two: I see two, my left thumb is on you. Hold a yellow tile on the front face, at the left. Then the algorithm: Up, Over, Down, Over, Up, Over over, Down. Count again, and repeat.',
   note:'The right face turns in opposite directions every other time. The top face always turns clockwise. You may need to do this two or three times.',
   algs:['yellowFace'],
   cases:[
     {name:'One yellow tile on top: Top one',text:'That tile at the front left.',moves:"R U R' U R U2 R'"},
     {name:'No yellow tile on top: None left',text:'A yellow tile on the left face, at the front.',moves:"R U R' U R U2 R'",setup:"R U2 R' U' R U' R' R U2 R' U' R U' R'"},
     {name:'Two yellow tiles on top: my left thumb is on you',text:'Your left thumb on a yellow tile on the front face, at the left.',moves:"R U R' U R U2 R'",setup:"F R' F' R U R U' R'"},
   ]},
  {n:5,id:'ycorners',name:'Place the yellow corners',
   goal:'The cube is solved.',
   what:'Keep yellow on top. Move the yellow corners to their places. The yellow face breaks while you do it and comes back at the end.',
   how:'Twist the top layer until the side tiles of two corners match the bottom layer. All four match: the cube is solved. Two next to each other: hold them at the back. Do the chant. Two across from each other: do the chant from any side, then twist the top and look again.',
   note:'The words under the moves are a chant: run to me, fast, run to me, back back; run away, fast, run to me, back back; run run away, up.',
   algs:['yellowCorners'],
   cases:[
     {name:'Two corners next to each other match',text:'Hold them at the back. Do the chant.',moves:"R' F R' B2 R F' R' B2 R2 U'"},
     {name:'Two corners across from each other match',text:'Hold the cube any way. Do the chant. Then two corners next to each other match, and you do it once more.',moves:"R' F R' B2 R F' R' B2 R2 U'",setup:"U R2 B2 R F R' B2 R F' R y2 U R2 B2 R F R' B2 R F' R U"},
   ]},
];

// ---------- the solver ----------
const MINI_FACE_LETTER='URFDLB';
const MINI_D_TOK=['','D','D2',"D'"];
const MINI_U_TOK=['','U','U2',"U'"];
const MINI_TO_URF={0:'',1:"y'",2:'y2',3:'y'};  // the y turn that brings a top position to the front right
const MINI_TO_UFL={1:'',0:'y',3:'y2',2:"y'"};   // ... to the front left
const miniCap=s=>s[0].toUpperCase()+s.slice(1);

function solveMini(start){
  let c=start;const stages=[];let cur=null;let up='white';
  const name=x=>MINI_COLOR_NAMES[x];
  const fl=()=>c.toFacelets();
  const after=(cube,ms)=>ms.length?applyAlg(cube,ms):cube;
  function stage(n,id,label){cur={n,id,name:label,parts:[]};stages.push(cur);}
  function part(title,text,pre,moves,extra){
    const ms=(Array.isArray(moves)?moves:parseAlg(moves||'')).filter(Boolean);
    if(pre)c=applyAlg(c,parseAlg(pre));c=after(c,ms);
    const p=Object.assign({title,text,pre:pre||'',moves:ms,chunks:miniChunks(ms),up},extra||{});
    cur.parts.push(p);return p;
  }
  function turnOver(to){if(up!==to){c=applyAlg(c,['z2']);up=to;}}
  const pieceName=p=>'white, '+cornerColor[p].slice(1).map(name).join(' and ')+' corner';
  const pieceOf=p=>({type:'corner',colors:cornerColor[p].slice()});
  const posOf=p=>c.cp.indexOf(p);
  // The face a piece's white tile is on, as a letter, for the piece at position pos.
  const whiteFace=(cube,pos)=>MINI_FACE_LETTER[Math.floor(cornerFacelet[pos][cube.co[pos]]/9)];
  const placed=(cube,pos,p)=>cube.cp[pos]===p&&cube.co[pos]===0;

  // ----- the top layer: four corners, one at a time (white up) -----
  const names=['The first two corners','The third corner','The fourth corner'];
  for(let k=0;k<4;k++){
    const p=MINI_ORDER[k];const pn=pieceName(p);const piece=pieceOf(p);
    if(k===0){
      stage(1,'first',names[0]);
      // The first corner only needs a hold: top front right, white up, red in front, blue right.
      const rot=twoRotationTo(c,x=>placed(x,0,3));
      if(rot.length)part('Hold your Mini',`Find the ${pn}. Hold the cube so it is at the top front right: white up, red in front, blue on the right. This corner is placed. The dashed moves turn the whole cube.`,rot.join(' '),[],{piece});
      continue;
    }
    if(k===2)stage(2,'third',names[1]);if(k===3)stage(3,'fourth',names[2]);
    const q=MINI_ORDER[k-1];const qn=pieceName(q);
    // Hold: the corner before this one on the left. The first part of this corner carries it.
    let hold=MINI_TO_UFL[posOf(q)];let holdText=`Hold the cube so the ${qn} is on the left, white still up. `;
    const takeHold=()=>{const h=hold;const t=holdText;hold='';holdText='';return [h,t];};
    for(let guard=0;guard<6;guard++){
      const held=hold?applyAlg(c,parseAlg(hold)):c;
      const pos=held.cp.indexOf(p);
      if(placed(held,0,p))break; // already in place: no part, the next corner's hold follows from where things are
      if(pos<4){ // the top layer
        if(k===1){ // hold it on the right and bring it down; the next part holds the cube again
          const r=MINI_TO_URF[posOf(p)];hold='';holdText='';
          part(`${miniCap(pn)}: bring it down`,`It is in the top layer, but not in its place. Hold the cube so this corner is on the right, at the top front right. Then R', D', R moves it to the bottom layer.`,r,MINI_ALGS.cornerDown.alg,{piece,alg:'cornerDown'});
          hold=MINI_TO_UFL[posOf(q)];holdText=`Hold the cube again so the ${qn} is on the left, white up. `;
        }else if(k===2){
          const [h,t]=takeHold();
          if(pos===3){const wf=whiteFace(held,3);
            if(wf==='B')part(`${miniCap(pn)}: one turn`,`${t}The corner is at the back right of the top, with white facing back. One turn puts it in: R'.`,h,["R'"],{piece});
            else part(`${miniCap(pn)}: bring it down`,`${t}The corner is at the back right of the top, with white ${wf==='U'?'up':'facing right'}. R, D' brings it down to the bottom layer.`,h,['R',"D'"],{piece});
          }else part(`${miniCap(pn)}: bring it down`,`${t}The corner is at the front right of the top, but twisted. R2, D' brings it down to the bottom layer.`,h,['R2',"D'"],{piece});
        }else{
          const [h,t]=takeHold();
          part(`${miniCap(pn)}: bring it down`,`${t}The corner is at the front right of the top, but twisted. R', D', R brings it down to the bottom layer. The other three corners stay.`,h,MINI_ALGS.cornerDown.alg,{piece,alg:'cornerDown'});
        }
        continue;
      }
      // the bottom layer: twist the bottom until the corner is at the bottom right of the front
      let d=0;for(d=0;d<4;d++){const g=after(held,MINI_D_TOK[d]?[MINI_D_TOK[d]]:[]);if(g.cp[4]===p)break;}
      const dt=MINI_D_TOK[d];const g=after(held,dt?[dt]:[]);const wf=whiteFace(g,4);
      const twist=dt?`Twist the bottom until the corner is at the bottom right of the front: ${dt}. `:'The corner is at the bottom right of the front. ';
      const [h,t]=takeHold();
      if(k<3){
        if(wf==='F')part(`${miniCap(pn)}`,`${t}${twist}White faces you. Turn the right face up: R.`,h,[dt,'R'],{piece});
        else if(wf==='R')part(`${miniCap(pn)}`,`${t}${twist}White faces right. R', D', R.`,h,[dt,...parseAlg(MINI_ALGS.cornerDown.alg)],{piece,alg:'cornerDown'});
        else part(`${miniCap(pn)}`,`${t}${twist}White faces down. D, then R2.`,h,[dt,'D','R2'],{piece});
      }else{
        if(wf==='D'){part(`${miniCap(pn)}: turn white to the front`,`${t}${twist}White faces down. F, D', F', D2 turns the corner so white faces you.`,h,[dt,...parseAlg(MINI_ALGS.cornerFront.alg)],{piece,alg:'cornerFront'});
          part(`${miniCap(pn)}: put it in`,`White faces you at the bottom right of the front. Corner in: D', R', D, R.`,'',MINI_ALGS.cornerIn.alg,{piece,alg:'cornerIn'});}
        else if(wf==='F')part(`${miniCap(pn)}`,`${t}${twist}White faces you. Corner in: D', R', D, R.`,h,[dt,...parseAlg(MINI_ALGS.cornerIn.alg)],{piece,alg:'cornerIn'});
        else part(`${miniCap(pn)}`,`${t}${twist}White faces right. R', D', R.`,h,[dt,...parseAlg(MINI_ALGS.cornerDown.alg)],{piece,alg:'cornerDown'});
      }
    }
    if(!placed(hold?applyAlg(c,parseAlg(hold)):c,0,p))throw new Error('mini: corner '+(k+1)+' not placed');
  }

  // ----- the yellow face (yellow up) -----
  stage(4,'yface','Make the yellow face');
  turnOver('yellow');
  const SUNE=parseAlg(MINI_ALGS.yellowFace.alg);
  function yfacePath(cube,depth){
    const f=cube.toFacelets();const n=[0,2,6,8].filter(i=>f[i]===3).length;
    if(n===4)return [];if(!depth)return null;
    let best=null;
    for(const r of ['','y',"y'",'y2']){const cr=after(cube,r?[r]:[]);const g=cr.toFacelets();
      const ok=n===1?g[6]===3:n===0?g[38]===3:g[18]===3;if(!ok)continue;
      const rest=yfacePath(applyAlg(cr,SUNE),depth-1);if(rest&&(!best||rest.length+1<best.length))best=[{r,n}].concat(rest);}
    return best;
  }
  const path=yfacePath(c,6)||[];
  path.forEach((step,i)=>{
    const first=i===0?'Turn the cube over so the white face is on the bottom. ':'';
    const how=step.n===1?'One yellow tile is on top. Top one: hold the cube so that tile is at the front left.'
      :step.n===0?'No yellow tile is on top. None left: hold the cube with a yellow tile on the left face, at the front.'
      :'Two yellow tiles are on top. I see two, my left thumb is on you: hold the cube so your left thumb covers a yellow tile on the front face, at the left.';
    part(`${step.n} yellow ${step.n===1?'tile':'tiles'} on top`,`${first}${how} Then: Up, Over, Down, Over, Up, Over over, Down.`,step.r,MINI_ALGS.yellowFace.alg,{alg:'yellowFace',count:step.n});
  });

  // ----- the yellow corners (yellow up) -----
  stage(5,'ycorners','Place the yellow corners');
  // A top corner matches when its side tiles equal the side tiles of the corner below it.
  const BELOW={0:4,1:5,2:6,3:7};
  const matched=(f,i)=>{const sides=cornerFacelet[i].slice(1);const below=cornerFacelet[BELOW[i]];
    return sides.every(x=>{const face=Math.floor(x/9);const y=below.find(z=>Math.floor(z/9)===face);return f[x]===f[y];});};
  const AP=parseAlg(MINI_ALGS.yellowCorners.alg);const chant=MINI_ALGS.yellowCorners.say;
  for(let guard=0;guard<3;guard++){
    let k=null,ok=null;
    for(let j=0;j<4&&k==null;j++){const g=after(c,MINI_U_TOK[j]?[MINI_U_TOK[j]]:[]).toFacelets();const o=[0,1,2,3].filter(i=>matched(g,i));if(o.length===4||o.length===2){k=j;ok=o;}}
    if(k==null)throw new Error('mini: no hold with two corners matched');
    const u=MINI_U_TOK[k];
    if(ok.length===4){if(u)part('Line up the top layer',`Twist the top until the side tiles of every corner match the bottom layer: ${u}. The cube is solved.`,'',[u]);break;}
    const lined=u?'Twist the top until the side tiles of two corners match the bottom layer: '+u+'. ':'The side tiles of two corners already match the bottom layer. ';
    const adjacent=!((ok.includes(0)&&ok.includes(2))||(ok.includes(1)&&ok.includes(3)));
    if(adjacent){
      let pre='';for(const r of ['','y','y2',"y'"]){const h=after(c,[u,...(r?[r]:[])].filter(Boolean)).toFacelets();if(matched(h,2)&&matched(h,3)){pre=r;break;}}
      part('Two corners next to each other match',`${lined}Hold the cube so the two matching corners are at the back. Then the chant: ${chant}.`,pre,[u,...AP],{alg:'yellowCorners'});
    }else part('Two corners across from each other match',`${lined}Hold the cube any way. Do the chant once: ${chant}. Then two corners next to each other match, and you do it once more.`,'',[u,...AP],{alg:'yellowCorners'});
  }

  // The flat move list from the cube as held, white up: z2 where the top changes.
  const moves=[];let o='white';
  for(const s of stages)for(const p of s.parts){if(p.up!==o){moves.push('z2');o=p.up;}if(p.pre)moves.push(...parseAlg(p.pre));moves.push(...p.moves);}
  return {stages,moves,solved:twoSolved(c),end:c};
}
