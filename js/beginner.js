// ===== Beginner method: the Rubik's solution guide, layer by layer =====
// Source: "You can do the Rubik's Cube, Solution Guide" (Spin Master, V1-EU-M-2020), the current
// guide at rubiks.com/solve-it. Three layers, eight steps. The holds, the algorithms and the
// sayings are the guide's own.
// Data: the steps, their goals, the algorithms with their sayings.
// Solver: solveBeginner(cube) returns the plan a beginner follows, part by part, with only the
// guide's moves and holds. It reads the cube as held: the color of the top center is "yellow" and
// the color of the bottom center is "white", whatever the real colors are. Every part carries
// `up`, the center on top while it is done: 'yellow' for every step but step 3, which works with
// the white cross on top. Where `up` changes, the cube turns over (z2).
// Pure: no DOM. Loads after engine.js.

const BEGINNER_COLOR_NAMES=['white','red','green','yellow','orange','blue'];

// The algorithms the guide names, with its sayings. `parts` splits one into the groups the guide
// chants, for the boxes in the player. `step` is the step that teaches it.
const BEGINNER_ALGS={
  // One move, so it is never boxed in a plan: chunk:false.
  edgeUp:{id:'edgeUp',name:'Bring it up',alg:'F2',say:'F2, the front twice',step:1,chunk:false,
    when:'A white edge in the bottom layer, white facing down. Hold it under the front.',
    why:'Two turns of the front bring the edge from the bottom layer to the top layer. White that faced down then faces up. Any side face works the same way: turn the face with the edge twice.'},
  edgeFlip:{id:'edgeFlip',name:'Flip the edge',alg:"R' U F'",say:"R', U, F'",step:1,
    when:'A white edge in the top layer, white facing out. Hold it on the right.',
    why:"R' brings the edge down to the right of the front. U moves a petal out of its way. F' brings the edge up again, white on top."},
  cornerDown:{id:'cornerDown',name:'Corner down',alg:"R' D' R",say:"R', D', R",step:3,
    why:"R' brings the corner down. D' moves it along the bottom. R brings the right face back up. The corner is in the bottom layer, and the cross stays."},
  cornerFront:{id:'cornerFront',name:'White to the front',alg:"F D' F' D2",say:"F, D', F', D2",step:3,
    why:'Four moves that turn the corner in its place at the bottom right, so white faces you. Then it goes in like any other corner.'},
  cornerLeft:{id:'cornerLeft',name:'Corner in, left',alg:"D L D' L'",say:"D, L, D', L'",step:3,
    why:"D moves the corner out of the way. L brings its corner position down. D' moves it into place. L' brings it up to the top layer."},
  cornerRight:{id:'cornerRight',name:'Corner in, right',alg:"D' R' D R",say:"D', R', D, R",step:3,
    why:"D' moves the corner out of the way. R' brings its corner position down. D moves it into place. R brings it up to the top layer."},
  moveLeft:{id:'moveLeft',name:'Moving Left',alg:"U' L' U L U F U' F'",say:"U', L', U, L, then U, F, U', F'",step:4,
    parts:[[4,'next to its corner'],[4,'into the middle layer']],
    why:'The first four moves put the edge next to its corner. The last four bring the two into the middle layer together.'},
  moveRight:{id:'moveRight',name:'Moving Right',alg:"U R U' R' U' F' U F",say:"U, R, U', R', then U', F', U, F",step:4,
    parts:[[4,'next to its corner'],[4,'into the middle layer']],
    why:'The first four moves put the edge next to its corner. The last four bring the two into the middle layer together.'},
  yellowCross:{id:'yellowCross',name:'Yellow cross',alg:"F U R U' R' F'",say:"FUR says U'R'F'",step:5,
    why:"Remember it as FUR says U'R'F'. The first three moves go clockwise, the next three counterclockwise."},
  yellowFace:{id:'yellowFace',name:'Yellow face',alg:"R U R' U R U2 R'",say:"R, U, R', U, R, U2, R'",step:6,
    why:'The right face turns the other way each time. The top face always turns clockwise.'},
  yellowCorners:{id:'yellowCorners',name:'Yellow corners',alg:"R' F R' B2 R F' R' B2 R2 U'",step:7,
    say:'Run to me, Fast, Run to me, Back Back. Run away, Fast, Run to me, Back Back. Run Run away, Up',
    parts:[[4,'Run to me, Fast, Run to me, Back Back'],[4,'Run away, Fast, Run to me, Back Back'],[2,'Run Run away, Up']],
    why:"The words under the moves are a chant. R' is \"run to me\", R is \"run away\", F is \"fast\", B2 is \"back back\", U' is \"up\"."},
  yellowEdges:{id:'yellowEdges',name:'Yellow edges',alg:"F2 U L R' F2 L' R U F2",say:"F2, U, L, R', F2, L', R, U, F2",step:8,
    why:'The back edge stays. The other three move round clockwise, to the left.'},
  yellowEdgesRight:{id:'yellowEdgesRight',name:'Yellow edges, the other way',alg:"F2 U' L R' F2 L' R U' F2",say:"the same, with both U turns as U'",step:8,
    why:'The back edge stays. The other three move round counterclockwise, to the right.'},
};
// For the chunk finder: the algorithms as move lists, longest first.
const BEGINNER_CHUNK_ALGS=Object.values(BEGINNER_ALGS).filter(a=>a.chunk!==false).map(a=>({id:a.id,name:a.name,moves:parseAlg(a.alg),parts:a.parts})).sort((a,b)=>b.moves.length-a.moves.length);

// The lessons. Prose is written for the app; the method, the holds, the algorithms and the sayings
// follow the guide. A case's `setup` is the alg that makes its start from the lesson's base cube;
// without one, the case starts where its own moves, undone, put it.
const BEGINNER_STEPS=[
  {n:0,id:'basics',name:'Get to know your cube',
   goal:'Know the three kinds of piece, how to hold the cube, and the six moves.',
   goals:['Learn the three kinds of pieces','How to hold the cube','The six moves'],
   what:'A cube has three kinds of pieces: centers, edges and corners. There are 6 centers, one for every color, and they never move in relation to each other. An edge has two colors. A corner has three colors.',
   how:'Every step in the solution tells you how to hold the cube: which side should be the Front (F, toward you) and which side should be Up (U, on top).',
   note:'The centers tell you the color of each face. White is always opposite yellow, green opposite blue, red opposite orange. Keep the same front face for a whole algorithm.',
   kinds:[['centers','center'],['edges','edge'],['corners','corner']]},
  {n:1,id:'daisy',name:'The daisy',
   goal:'Four white edges around the yellow center, like petals.',
   goals:['The yellow center on top','Four white edges around it, white side up','The other pieces can go anywhere'],
   what:'Hold the cube with the yellow center on top. Find a white edge. Bring it up next to the yellow center, white side up. It is now a petal. Do this for all four white edges.',
   how:'Look in the top layer first, then the middle layer, then the bottom layer. Before you bring an edge up, turn the top. Then no petal is in its way.',
   note:'Leave a petal where it is. Only the white edges matter in this step.',
   // Words in the text that light pieces on the goal cube (js/learn.js lnMarkSet).
   marks:[['yellow center','ycenter'],['white edge','wedges'],['petal','wedges'],['top layer','top'],['middle layer','middle'],['bottom layer','bottom']],
   // The goal picture plays these moves, from the goal with them undone: one petal, then three
   // cases, one per part. Each part is [number of moves, caption].
   demo:{moves:"R U' F2 R' U F'",start:'One petal. Three white edges to bring up.',end:'Four petals around the yellow center: the daisy.',
     parts:[[1,'Middle layer, white facing you. R brings it up.'],[1,"U' turns the top. The petals move out of the way of the front."],[1,'Bottom layer, white facing down. F2 brings it up.'],[3,"Top layer, white facing out. R', U, F' flips it up."]],
     // What each move does, shown beside its tile once the demo plays. A group is an algorithm.
     list:[['R','Move blue-white to Up.'],["U'",'Turn the Up face to leave a space for red-white.'],['F2','Move red-white to Up.'],
       {group:'Flip the edge',rows:[["R'",'Move green-white down to the side.'],['U','Turn the Up face to leave a space for green-white.'],["F'",'Move green-white to Up.']]}]},
   algs:['edgeUp','edgeFlip'],
   // The lesson puts the algorithms in the text column, under How, and leaves out the case list:
   // the demo shows each case.
   algsInText:true,hideCases:true,
   cases:[
     {name:'Already on top, white up',text:'Leave it.',moves:''},
     {name:'Middle layer, white facing you',text:'Hold the edge at the front right. Turn the right face up: R.',moves:'R'},
     {name:'Middle layer, white facing right',text:'Hold the edge at the front right. Turn the top to make room: U\'. Then turn the front face back: F\'.',moves:"U' F'"},
     {name:'Bottom layer, white facing down',text:'Hold it under the front. Turn the front twice: F2.',moves:'F2'},
     {name:'Bottom layer, white facing you',text:'Hold it under the front. F2 brings it up, white facing out. Then flip it: hold it on the right, and do R\', U, F\'.',moves:"F2 y' R' U F'"},
     {name:'Top layer, white facing out',text:'Hold the edge on the right. R\', U, F\'.',moves:"R' U F'"},
   ]},
  {n:2,id:'cross',name:'The white cross',
   goal:'A white cross on the bottom. Each side color of the cross matches its center.',
   what:'Hold the daisy on top. Move each white edge down to the white face, with its other color under the matching center.',
   how:'Look at the front face. If the front tile of the top edge matches the front center, turn the front twice: F2. If not, turn the top until it does. Repeat for each white edge. Then flip the cube over to see the white cross.',
   note:'Check from the side: the color under each center must match. Two edges that match and two that do not means the cross is not done.',
   cases:[{name:'Edge over its center',text:'Turn the top to match, then a half turn of the front.',moves:"U' F2"}]},
  {n:3,id:'corners',name:'The white corners',
   goal:'The white face is complete, on top. The top row of every side matches its center.',
   what:'Hold the white cross on top. Find each white corner in the bottom layer and move it up to its place, between the centers of its two other colors.',
   how:'Turn the bottom until the corner sits between its two matching centers. Hold the cube so the white tile faces you. White at the bottom left: D, L, D\', L\'. White at the bottom right: D\', R\', D, R.',
   note:'White facing down? Hold the corner at the bottom right and do F, D\', F\', D2 first. A white corner in the top layer but in the wrong place? Hold it at the top right and do R\', D\', R to bring it down.',
   algs:['cornerLeft','cornerRight','cornerFront','cornerDown'],
   cases:[
     {name:'White at the bottom left of the front',text:'The corner sits between its centers. D, L, D\', L\'.',moves:"D L D' L'"},
     {name:'White at the bottom right of the front',text:'The corner sits between its centers. D\', R\', D, R.',moves:"D' R' D R"},
     {name:'White facing down',text:'Hold the corner at the bottom right. F, D\', F\', D2 turns white to the front. Then D\', R\', D, R.',moves:"F D' F' D2 D' R' D R"},
     {name:'Top layer, wrong place',text:'Hold it at the top right of the front. R\', D\', R brings it down. Then place it like the cases above.',moves:"R' D' R",setup:"R U R' U' R' F R2 U' R' U' R U R' F'"},
   ]},
  {n:4,id:'middle',name:'The middle layer',
   goal:'The bottom two layers are complete.',
   what:'Flip the cube over so the white face is on the bottom. Find the top edges with no yellow on them. Move each one between the two centers that match its colors.',
   how:'Choose a front face. Turn the top until a top edge makes a vertical line with the front center: the edge\'s front tile matches it. Look at the edge\'s top tile. If it matches the left center, do Moving Left. If it matches the right center, do Moving Right.',
   note:'No vertical line possible? Every top edge has yellow, and an edge is stuck in the middle layer. Hold the stuck edge on the right and do Moving Right with any top edge. The stuck edge comes up.',
   algs:['moveLeft','moveRight'],
   cases:[
     {name:'Top tile matches the left center',text:'Moving Left: U\', L\', U, L, then U, F, U\', F\'.',moves:"U' L' U L U F U' F'"},
     {name:'Top tile matches the right center',text:'Moving Right: U, R, U\', R\', then U\', F\', U, F.',moves:"U R U' R' U' F' U F"},
     {name:'An edge is stuck in the middle layer',text:'Hold it on the right. Moving Right with the top edge that is there. The stuck edge comes up.',moves:"U R U' R' U' F' U F",setup:"U R U' R' U' F' U F U2 U R U' R' U' F' U F"},
   ]},
  {n:5,id:'ycross',name:'The yellow cross',
   goal:'A yellow cross on top. The side colors do not matter yet.',
   what:'Flip the yellow edges so they all face up. Look at the yellow edges on the top only, not the corners.',
   how:'A dot: hold the cube any way, like a person standing. A line: hold it left to right, like a person lying down. An L: hold it at the back left, like a person sitting. Do the algorithm. Repeat until you see the cross.',
   note:'Remember the algorithm as FUR says U\'R\'F\'. The first three moves go clockwise, the next three counterclockwise.',
   algs:['yellowCross'],
   cases:[
     {name:'A dot',text:'Hold the cube any way. FUR says U\'R\'F\'. You get a line or an L.',moves:"F U R U' R' F'",setup:"R U2 R2 F R F' U2 R' F R F'"},
     {name:'An L',text:'Hold the L at the back left. FUR says U\'R\'F\'. You get the cross.',moves:"F U R U' R' F'"},
     {name:'A line',text:'Hold the line left to right. FUR says U\'R\'F\'. You get an L.',moves:"F U R U' R' F'",setup:"F R U R' U' F' F R U R' U' F'"},
   ]},
  {n:6,id:'yface',name:'The yellow face',
   goal:'The whole top face is yellow.',
   what:'Twist the yellow corners so their yellow sides face up.',
   how:'Count the corners with yellow on top. One: feed the fish. Hold the cube so that corner is at the front left, and the fish eats out of your left hand. None: none, left. Hold a yellow tile on the left face, at the front left corner. Two: I see two, my left thumb\'s on you. Hold the cube so your left thumb covers a yellow tile on the front face, at the front left corner. Do the algorithm. Count again. Repeat.',
   note:'The right face turns the other way each time. The top always turns clockwise. You may need to do this two or three times.',
   algs:['yellowFace'],
   cases:[
     {name:'One corner yellow on top: feed the fish',text:'That corner at the front left. The fish eats out of your left hand.',moves:"R U R' U R U2 R'"},
     {name:'No corner yellow on top: none, left',text:'A yellow tile on the left face, at the front left corner.',moves:"R U R' U R U2 R'",setup:"R U2 R' U' R U' R' R U2 R' U' R U' R'"},
     {name:'Two corners yellow on top: my left thumb\'s on you',text:'Your left thumb on a yellow tile on the front face, at the front left corner.',moves:"R U R' U R U2 R'",setup:"F R' F' R U R U' R'"},
   ]},
  {n:7,id:'ycorners',name:'The yellow corners',
   goal:'Each yellow corner sits between its centers. The top corners of every side match.',
   what:'Move the yellow corners to their places. The yellow face breaks while you do it and comes back at the end.',
   how:'Turn the top until two corners are in the right place: their side tiles match the centers. Two corners next to each other: they are the tail lights. Hold them at the back, like the tail lights of a car. Do the algorithm. Two corners across from each other: do the algorithm once, then look again.',
   note:'The words under the moves are a chant: run to me, fast, run to me, back back; run away, fast, run to me, back back; run run away, up.',
   algs:['yellowCorners'],
   cases:[
     {name:'Two corners next to each other are right',text:'Tail lights at the back. Do the chant.',moves:"R' F R' B2 R F' R' B2 R2 U'"},
     {name:'Two corners across from each other are right',text:'Hold the cube any way. Do the chant. Then two corners next to each other are right.',moves:"R' F R' B2 R F' R' B2 R2 U'",setup:"U R2 B2 R F R' B2 R F' R y2 U R2 B2 R F R' B2 R F' R U"},
   ]},
  {n:8,id:'yedges',name:'The yellow edges',
   goal:'The cube is solved.',
   what:'Move the last three or four edges round until each is between its centers.',
   how:'Hold the one side that is solved at the back, with yellow on top. Look at the unsolved edge on the front. The same color as the left center: do the algorithm. The same color as the right center: change the two U turns to U\'. No side solved? Hold the cube any way and do the algorithm once. Then one side is solved.',
   note:'The back edge stays still. The other three go round.',
   algs:['yellowEdges','yellowEdgesRight'],
   cases:[
     {name:'The front edge matches the left center',text:'Solved side at the back. Do the algorithm.',moves:"F2 U L R' F2 L' R U F2"},
     {name:'The front edge matches the right center',text:'Solved side at the back. Both U turns as U\'.',moves:"F2 U' L R' F2 L' R U' F2"},
     {name:'No side is solved',text:'Hold the cube any way. Do the algorithm. Then one side is solved.',moves:"F2 U L R' F2 L' R U F2",setup:"R2 U2 R U2 R2 U2 R2 U2 R U2 R2"},
   ]},
];

// Find the guide's algorithms inside a move list, so the player can box each one with its name.
// An algorithm with `parts` gives one box per part, with the words the guide chants.
function beginnerChunks(moves){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const out=[];
  for(let i=0;i<ms.length;){
    const hit=BEGINNER_CHUNK_ALGS.find(a=>i+a.moves.length<=ms.length&&a.moves.every((m,k)=>ms[i+k]===m));
    if(!hit){i++;continue;}
    if(hit.parts){let at=i;for(const [len,label] of hit.parts){out.push({label,id:hit.id,at,len});at+=len;}}
    else out.push({label:hit.name,id:hit.id,at:i,len:hit.moves.length});
    i+=hit.moves.length;
  }
  return out;
}

// ---------- the solver ----------
const BEG_FACE_OF=i=>Math.floor(i/9); // facelet index -> face 0..5 (U R F D L B)
const BEG_FACE_LETTER='URFDLB';
const BEG_EDGE_POS={UR:0,UF:1,UL:2,UB:3,DR:4,DF:5,DL:6,DB:7,FR:8,FL:9,BL:10,BR:11};
const BEG_CORNER_POS={URF:0,UFL:1,ULB:2,UBR:3,DFR:4,DLF:5,DBL:6,DRB:7};
const BEG_U_EDGE_RING=['UF','UL','UB','UR'];      // a U turn moves a piece one step along
const BEG_U_TOK=['','U','U2',"U'"];
const BEG_D_TOK=['','D','D2',"D'"];
const BEG_TO_FRONT={F:'',R:'y',B:'y2',L:"y'"};     // the rotation that brings a side to the front
const BEG_TO_RIGHT={R:'',B:'y',L:'y2',F:"y'"};
const BEG_TO_BACK={B:'',L:'y',F:'y2',R:"y'"};
const BEG_CORNER_TO_URF={URF:'',UFL:"y'",ULB:'y2',UBR:'y'};
const BEG_CORNER_TO_DFR={DFR:'',DLF:"y'",DBL:'y2',DRB:'y'};
const BEG_EDGE_TO_FR={FR:'',FL:"y'",BL:'y2',BR:'y'};
const begCap=s=>s[0].toUpperCase()+s.slice(1);

// opts.stages: run these steps only (the 4×4 runs the 3×3 steps in groups round its parity fixes).
function solveBeginner(start,opts){
  const only=opts&&opts.stages;const want=n=>!only||only.includes(n);
  let c=start;const stages=[];let cur=null;let up='yellow';
  const name=x=>BEGINNER_COLOR_NAMES[x];
  const fl=()=>c.toFacelets();
  const cen=(f,letter)=>f[9*BEG_FACE_LETTER.indexOf(letter)+4];
  const after=(cube,ms)=>ms.length?applyAlg(cube,ms):cube;
  // The real colors: yellow is the top center as held, white the bottom one. Step 3 turns the cube over.
  const T=()=>up==='yellow'?fl()[4]:fl()[31],W=()=>up==='yellow'?fl()[31]:fl()[4];
  function stage(n,id,label){cur={n,id,name:label,parts:[]};stages.push(cur);}
  function part(title,text,pre,moves,extra){
    const ms=(Array.isArray(moves)?moves:parseAlg(moves||'')).filter(Boolean);
    if(pre)c=applyAlg(c,[pre]);c=after(c,ms);
    const p=Object.assign({title,text,pre:pre||'',moves:ms,chunks:beginnerChunks(ms),up},extra||{});
    cur.parts.push(p);return p;
  }
  function turnOver(to){if(up!==to){c=applyAlg(c,['z2']);up=to;}}
  const edgeSt=(f,i)=>edgeFacelet[i].map(x=>f[x]);
  const cornerSt=(f,i)=>cornerFacelet[i].map(x=>f[x]);
  const edgeSolved=(f,i)=>edgeFacelet[i].every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]);
  const cornerSolved=(f,i)=>cornerFacelet[i].every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]);
  // U turns so that the top slot `slot` holds no edge with color w on top.
  function freeTop(f,slot,w){const idx=BEG_U_EDGE_RING.indexOf(slot);
    for(const k of [0,1,3,2]){const from=BEG_U_EDGE_RING[(idx-k+4)%4];if(f[edgeFacelet[BEG_EDGE_POS[from]][0]]!==w)return BEG_U_TOK[k];}return '';}
  const room=u=>u?' Turn the top to move a petal out of the way: '+u+'.':'';
  // The guided solve shows `short` in place of the text: one line that names the moves.
  const bring=(other,u,m,more)=>({short:`${u?`Turn the top so no petal is in the way (${u}). Then turn`:'Turn'} the ${other}-white edge to the top (${m}).${more?' '+more:''}`});

  // ----- Step 1: the daisy (yellow up) -----
  if(want(1)){
  stage(1,'daisy','The daisy');
  for(let guard=0;guard<16;guard++){
    const f=fl(),w=W();
    if(BEG_U_EDGE_RING.every(s=>f[edgeFacelet[BEG_EDGE_POS[s]][0]]===w))break;
    // The guide looks at the top layer first, then the middle layer, then the bottom layer.
    let e=null;
    for(const i of [0,1,2,3,8,9,10,11,4,5,6,7]){const st=edgeSt(f,i);const k=st.indexOf(w);if(k<0)continue;if(EDGE_NAMES[i][0]==='U'&&k===0)continue;e={i,k,st};break;}
    const other=name(e.st[1-e.k]);const en=EDGE_NAMES[e.i];const whiteFace=en[e.k];const piece={type:'edge',colors:e.st};
    if(en[0]==='U'){ // top layer, white facing out: hold it on the right and flip it
      part(`White and ${other} edge: flip it`,`It is in the top layer, but white faces out. Hold the cube so this edge is on the right. Then R', U, F': the edge comes back up with white on top.`,BEG_TO_RIGHT[whiteFace],BEGINNER_ALGS.edgeFlip.alg,{piece,alg:'edgeFlip',short:`Flip the ${other}-white edge so white is on top (R', U, F').`});
    }else if(en[0]==='D'){ // bottom layer: hold it under the front, F2
      const pre=BEG_TO_FRONT[en[1]];const g=after(c,pre?[pre]:[]).toFacelets();const u=freeTop(g,'UF',w);
      if(e.k===0)part(`White and ${other} edge`,`It is in the bottom layer, under the front, white facing down.${room(u)} A half turn of the front brings it up: F2.`,pre,[u,'F2'],{piece,...bring(other,u,'F2')});
      else part(`White and ${other} edge`,`It is in the bottom layer, under the front, white facing you.${room(u)} A half turn of the front brings it up: F2. White then faces out, so the next part flips it.`,pre,[u,'F2'],{piece,...bring(other,u,'F2','White then faces out, so the next part flips it.')});
    }else{ // middle layer: hold it at the front right
      const pre=BEG_EDGE_TO_FR[en];const g=after(c,pre?[pre]:[]).toFacelets();const st=edgeSt(g,BEG_EDGE_POS.FR);
      if(st[0]===w){const u=freeTop(g,'UR',w);part(`White and ${other} edge`,`It is in the middle layer. Hold it at the front right: white faces you.${room(u)} Turn the right face up: R.`,pre,[u,'R'],{piece,...bring(other,u,'R')});}
      else{const u=freeTop(g,'UF',w);part(`White and ${other} edge`,`It is in the middle layer. Hold it at the front right: white faces right.${room(u)} Turn the front face back: F'.`,pre,[u,"F'"],{piece,...bring(other,u,"F'")});}
    }
  }

  }
  // ----- Step 2: the white cross (yellow up) -----
  if(want(2)){
  stage(2,'cross','The white cross');
  for(let guard=0;guard<4;guard++){
    const f=fl(),w=W();
    let e=null;for(const s of BEG_U_EDGE_RING){const i=BEG_EDGE_POS[s];const st=edgeSt(f,i);if(st[0]===w){e={s,st};break;}}
    if(!e)break;
    const col=e.st[1];const face=['F','R','B','L'].find(x=>cen(f,x)===col);const pre=BEG_TO_FRONT[face];
    const g=after(c,pre?[pre]:[]).toFacelets();
    let slot=null;for(const s of BEG_U_EDGE_RING){const st=edgeSt(g,BEG_EDGE_POS[s]);if(st[0]===w&&st[1]===col)slot=s;}
    const k=(BEG_U_EDGE_RING.indexOf('UF')-BEG_U_EDGE_RING.indexOf(slot)+4)%4;const u=BEG_U_TOK[k];
    part(`White and ${name(col)} edge`,`Hold ${name(col)} in front.${u?' Turn the top until the front tile of the top edge matches the '+name(col)+' center: '+u+'.':' The front tile of the top edge already matches the '+name(col)+' center.'} Turn the front twice: F2. The white tile is now on the bottom.`,pre,[u,'F2'],{piece:{type:'edge',colors:e.st}});
  }

  }
  // ----- Step 3: the white corners (white up) -----
  if(want(3)){
  stage(3,'corners','The white corners');
  turnOver('white');
  for(let guard=0;guard<24;guard++){
    const f=fl(),w=W();
    if([0,1,2,3].every(i=>cornerSolved(f,i)))break;
    // The guide looks for a white corner in the bottom layer first. Only when none is there does a
    // white corner in the top layer, but not in its place, come down.
    let cnr=null;for(let i=4;i<8;i++){const st=cornerSt(f,i);if(st.includes(w)){cnr={i,st};break;}}
    if(!cnr){
      const wrong=(()=>{for(let i=0;i<4;i++){const st=cornerSt(f,i);if(st.includes(w)&&!cornerSolved(f,i))return {i,st};}return null;})();
      if(!wrong)throw new Error('beginner: no white corner left to place');
      const cols=wrong.st.filter(x=>x!==w).map(name).join(' and ');
      part(`White, ${cols} corner: bring it down`,`It is in the top layer, but not in its place. Hold it at the top right of the front. R', D', R brings it down to the bottom layer. The cross stays.`,BEG_CORNER_TO_URF[CORNER_NAMES[wrong.i]],BEGINNER_ALGS.cornerDown.alg,{piece:{type:'corner',colors:wrong.st},alg:'cornerDown'});
      continue;}
    const sides=cnr.st.filter(x=>x!==w);const cols=sides.map(name).join(' and ');const piece={type:'corner',colors:cnr.st};
    // Turn the bottom until the corner sits between its two centers.
    let k=0,pos=null;
    for(k=0;k<4;k++){const g=after(c,BEG_D_TOK[k]?[BEG_D_TOK[k]]:[]).toFacelets();
      for(let i=4;i<8;i++){const fc=cornerFacelet[i];const st=fc.map(x=>g[x]);if(!st.includes(w)||!st.includes(sides[0])||!st.includes(sides[1]))continue;
        const cs=[g[9*BEG_FACE_OF(fc[1])+4],g[9*BEG_FACE_OF(fc[2])+4]];if(cs.includes(sides[0])&&cs.includes(sides[1]))pos=i;}
      if(pos!=null)break;}
    if(pos==null)throw new Error('beginner: no home under a white corner');
    const d=BEG_D_TOK[k];const turned=d?'Turn the bottom until the corner sits between the '+cols+' centers: '+d+'. ':'It already sits between the '+cols+' centers. ';
    const g=after(c,d?[d]:[]).toFacelets();const fc=cornerFacelet[pos];const wk=fc.map(x=>g[x]).indexOf(w);
    if(wk===0){ // white faces down: hold the corner at the bottom right, turn white to the front, then put it in
      part(`White, ${cols} corner: turn white to the front`,`${turned}White faces down. Hold the corner at the bottom right of the front. F, D', F', D2 turns it so white faces you.`,BEG_CORNER_TO_DFR[CORNER_NAMES[pos]],[d,...parseAlg(BEGINNER_ALGS.cornerFront.alg)],{piece,alg:'cornerFront'});
      part(`White, ${cols} corner: put it in`,`White faces you at the bottom right of the front. D', R', D, R.`,'',BEGINNER_ALGS.cornerRight.alg,{piece,alg:'cornerRight'});
    }else{
      const face=BEG_FACE_LETTER[BEG_FACE_OF(fc[wk])];const pre=BEG_TO_FRONT[face];
      const h=applyAlg(c,[d,pre].filter(Boolean)).toFacelets();
      const atLeft=(()=>{const st=cornerSt(h,BEG_CORNER_POS.DLF);return st.includes(w)&&st.includes(sides[0])&&st.includes(sides[1]);})();
      const a=atLeft?BEGINNER_ALGS.cornerLeft:BEGINNER_ALGS.cornerRight;
      part(`White, ${cols} corner`,`${turned}Hold the cube so white faces you: the corner is at the bottom ${atLeft?'left':'right'} of the front. ${a.say}.`,pre,[d,...parseAlg(a.alg)],{piece,alg:a.id});
    }
  }
  turnOver('yellow');

  }
  // ----- Step 4: the middle layer (yellow up) -----
  if(want(4)){
  stage(4,'middle','The middle layer');
  for(let guard=0;guard<16;guard++){
    const f=fl(),t=T();
    if([8,9,10,11].every(i=>edgeSolved(f,i)))break;
    let e=null;for(let i=0;i<4;i++){const st=edgeSt(f,i);if(!st.includes(t)){e={i,st};break;}}
    if(e){
      const side=e.st[1];const face=['F','R','B','L'].find(x=>cen(f,x)===side);
      let k=0;for(k=0;k<4;k++){const g=after(c,BEG_U_TOK[k]?[BEG_U_TOK[k]]:[]).toFacelets();const slot={F:'UF',L:'UL',B:'UB',R:'UR'}[face];const st=edgeSt(g,BEG_EDGE_POS[slot]);if(st[0]===e.st[0]&&st[1]===side)break;}
      const u=BEG_U_TOK[k];const pre=BEG_TO_FRONT[face];const g=applyAlg(c,[u,pre].filter(Boolean)).toFacelets();
      const right=cen(g,'R')===e.st[0];const a=right?BEGINNER_ALGS.moveRight:BEGINNER_ALGS.moveLeft;
      part(`${begCap(name(side))} and ${name(e.st[0])} edge`,`${u?'Turn the top until the edge makes a vertical line with the '+name(side)+' center: '+u+'. ':'The edge already makes a vertical line with the '+name(side)+' center. '}Hold ${name(side)} in front. The top tile is ${name(e.st[0])}, the color of the ${right?'right':'left'} center. ${a.name}: ${a.say}.`,pre,[u,...parseAlg(a.alg)],{piece:{type:'edge',colors:e.st},alg:a.id});
    }else{ // every top edge has yellow: an edge is stuck in the middle layer
      const i=[8,9,10,11].find(j=>!edgeSolved(f,j));const st=edgeSt(f,i);const a=BEGINNER_ALGS.moveRight;
      part(`${begCap(name(st[0]))} and ${name(st[1])} edge: it is stuck`,`Every top edge has yellow, so no vertical line is possible. This edge sits in the middle layer in the wrong place. Hold it on the right, at the front right. ${a.name} with the top edge that is there: ${a.say}. The stuck edge comes up.`,BEG_EDGE_TO_FR[EDGE_NAMES[i]],a.alg,{piece:{type:'edge',colors:st},alg:a.id});
    }
  }

  }
  // ----- Step 5: the yellow cross -----
  if(want(5)){
  stage(5,'ycross','The yellow cross');
  const upEdges=f=>{const t=f[4];const o={};for(const s of ['UF','UL','UB','UR'])o[s]=f[edgeFacelet[BEG_EDGE_POS[s]][0]]===t;return o;};
  for(let guard=0;guard<4;guard++){
    const f=fl();const upE=upEdges(f);const n=Object.values(upE).filter(Boolean).length;
    if(n===4)break;
    let pre='',shape='dot',hold='A dot: hold the cube any way, like a person standing.';
    if(n===2){for(const r of ['','y',"y'",'y2']){const g=after(c,r?[r]:[]).toFacelets();const u2=upEdges(g);
        if(u2.UB&&u2.UL){pre=r;shape='L';hold='An L: hold it at the back left, like a person sitting.';break;}
        if(u2.UL&&u2.UR){pre=r;shape='line';hold='A line: hold it left to right, like a person lying down.';break;}}}
    part(`${shape==='dot'?'A dot':shape==='L'?'An L':'A line'} on top`,`${hold} Yellow cross: FUR says U'R'F'. F, U, R, U', R', F'.`,pre,BEGINNER_ALGS.yellowCross.alg,{alg:'yellowCross',shape});
  }

  }
  // ----- Step 6: the yellow face -----
  if(want(6)){
  stage(6,'yface','The yellow face');
  const SUNE=parseAlg(BEGINNER_ALGS.yellowFace.alg);
  // The guide's holds: one corner up, at the front left (feed the fish). None up: a yellow tile on the
  // left face at the front left corner (none, left). Two up: a yellow tile on the front face at the
  // front left corner (I see two, my left thumb's on you).
  function yfacePath(cube,depth){
    const f=cube.toFacelets(),t=f[4];const n=[0,2,6,8].filter(i=>f[i]===t).length;
    if(n===4)return [];if(!depth)return null;
    let best=null;
    for(const r of ['','y',"y'",'y2']){const cr=after(cube,r?[r]:[]);const g=cr.toFacelets();
      const ok=n===1?g[6]===t:n===0?g[38]===t:g[18]===t;if(!ok)continue;
      const rest=yfacePath(applyAlg(cr,SUNE),depth-1);if(rest&&(!best||rest.length+1<best.length))best=[{r,n}].concat(rest);}
    return best;
  }
  const path=yfacePath(c,6)||[];
  for(const step of path){
    const how=step.n===1?'One corner has yellow on top. Feed the fish: hold the cube so that corner is at the front left, and the fish eats out of your left hand.'
      :step.n===0?'No corner has yellow on top. None, left: hold the cube with a yellow tile on the left face, at the front left corner.'
      :'Two corners have yellow on top. I see two, my left thumb\'s on you: hold the cube so your left thumb covers a yellow tile on the front face, at the front left corner.';
    part(`${step.n} ${step.n===1?'corner':'corners'} yellow on top`,`${how} Yellow face: R, U, R', U, R, U2, R'.`,step.r,BEGINNER_ALGS.yellowFace.alg,{alg:'yellowFace',count:step.n});
  }

  }
  // ----- Step 7: the yellow corners -----
  if(want(7)){
  stage(7,'ycorners','The yellow corners');
  const cornerPlaced=(f,i)=>cornerFacelet[i].slice(1).every(x=>f[x]===f[9*BEG_FACE_OF(x)+4]);
  const AP=parseAlg(BEGINNER_ALGS.yellowCorners.alg);const chant=BEGINNER_ALGS.yellowCorners.say;
  for(let guard=0;guard<3;guard++){
    // Turn the top until two corners, or all four, sit in their places.
    let k=null,ok=null;
    for(let j=0;j<4&&k==null;j++){const g=after(c,BEG_U_TOK[j]?[BEG_U_TOK[j]]:[]).toFacelets();const o=[0,1,2,3].filter(i=>cornerPlaced(g,i));if(o.length===4||o.length===2){k=j;ok=o;}}
    if(k==null)throw new Error('beginner: no hold with two corners placed');
    const u=BEG_U_TOK[k];
    if(ok.length===4){if(u)part('Line up the corners',`Turn the top until every corner sits between its centers: ${u}.`,'',[u]);break;}
    const lined=u?'Turn the top until two corners sit in their places: '+u+'. ':'';
    const adjacent=!((ok.includes(0)&&ok.includes(2))||(ok.includes(1)&&ok.includes(3)));
    if(adjacent){ // the tail lights go at the back
      let pre='';for(const r of ['','y','y2',"y'"]){const h=after(c,[u,r].filter(Boolean)).toFacelets();if(cornerPlaced(h,2)&&cornerPlaced(h,3)){pre=r;break;}}
      const col=name(cen(after(c,[u,pre].filter(Boolean)).toFacelets(),'B'));
      part('Two corners next to each other are right',`${lined}They are the tail lights: hold them at the back, on the ${col} side. Then the chant: ${chant}.`,pre,[u,...AP],{alg:'yellowCorners'});
    }else part('Two corners across from each other are right',`${lined}Hold the cube any way. Do the chant once: ${chant}. Then two corners next to each other are right, and you do it once more.`,'',[u,...AP],{alg:'yellowCorners'});
  }

  }
  // ----- Step 8: the yellow edges -----
  if(want(8)){
  stage(8,'yedges','The yellow edges');
  for(let guard=0;guard<4;guard++){
    const f=fl();const done=['UF','UR','UB','UL'].filter(s=>{const [a,b]=edgeFacelet[BEG_EDGE_POS[s]];return f[b]===f[9*BEG_FACE_OF(b)+4];});
    if(done.length===4)break;
    if(done.length){
      const pre=BEG_TO_BACK[done[0][1]];const g=after(c,pre?[pre]:[]).toFacelets();
      const front=edgeSt(g,BEG_EDGE_POS.UF)[1];const left=front===cen(g,'L');const a=left?BEGINNER_ALGS.yellowEdges:BEGINNER_ALGS.yellowEdgesRight;
      part('One side is solved',`The ${name(cen(f,done[0][1]))} side is solved: hold it at the back. The front edge is ${name(front)}, the color of the ${left?'left':'right'} center, so ${left?'do the algorithm as it is':'change the two U turns to U\''}: ${a.say}.`,pre,a.alg,{alg:a.id});
    }else part('No side is solved',`Hold the cube any way. Do the algorithm once: ${BEGINNER_ALGS.yellowEdges.say}. Then one side is solved.`,'',BEGINNER_ALGS.yellowEdges.alg,{alg:'yellowEdges'});
  }

  }
  // The flat move list, from the cube as held: z2 where the top changes.
  const moves=[];let o='yellow';
  for(const s of stages)for(const p of s.parts){if(p.up!==o){moves.push('z2');o=p.up;}if(p.pre)moves.push(p.pre);moves.push(...p.moves);}
  const f=c.toFacelets();const solved=[0,1,2,3,4,5].every(i=>{for(let j=0;j<9;j++)if(f[9*i+j]!==f[9*i+4])return false;return true;});
  return {stages,moves,solved,end:c};
}
