// ================= Glossary =================
// Cubing words in the description text link to a short entry. A link opens a floating card;
// Esc or a tap anywhere closes it. The full list is at the end of the Reference tab.
// Each entry: id, term, def, optional alg (example moves), see (ids), match (regex for the text).
// Order matters: longer phrases come first, so "fat sexy move" wins over "sexy move" and "fat".
const GLOSSARY=[
  {id:'fat-sexy',term:'Fat sexy move',alg:"r U R' U'",match:/\bfat[ -]sexy(?: moves?)?/i,see:['sexy','wide'],
   def:'The sexy move with a wide r in place of the first R. The middle slice turns with R, so the move also changes the M-slice edges and centers. OLL uses it often.'},
  {id:'sexy',term:'Sexy move',alg:"R U R' U'",match:/\bsexy(?: moves?)?/i,see:['sledgehammer','trigger','fat-sexy'],
   def:'A four-move trigger. Many algorithms are built from it. Do it six times in a row and the cube returns to where it started. Its inverse is U R U\' R\'.'},
  {id:'sledgehammer',term:'Sledgehammer',alg:"R' F R F'",match:/\bsledge(?:hammers?)?\b/i,see:['sexy','hedgeslammer'],
   def:'A four-move trigger. It often comes right after a sexy move, as in some OLL cases and the T perm. Its inverse is the hedgeslammer.'},
  {id:'hedgeslammer',term:'Hedgeslammer',alg:"F R' F' R",match:/\bhedgeslammers?\b/i,see:['sledgehammer'],
   def:'The inverse of the sledgehammer. It undoes a sledgehammer move for move.'},
  {id:'antisune',term:'Anti-Sune',alg:"R U2 R' U' R U' R'",match:/\banti-?sunes?\b/i,see:['sune','oll'],
   def:'The inverse of the Sune. It twists the same three corners as the Sune, in the opposite direction.'},
  {id:'sune',term:'Sune',alg:"R U R' U R U2 R'",match:/\bsunes?\b/i,see:['antisune','oll'],
   def:'A seven-move OLL algorithm. It twists three top corners and keeps the first two layers solved. Many last-layer algorithms are built from Sunes.'},
  {id:'niklas',term:'Niklas',alg:"R U' L' U R' U' L U",match:/\bniklas\b/i,see:['commutator'],
   def:'An eight-move commutator that cycles three corners. The rest of the cube stays where it was.'},
  {id:'wide',term:'Wide move (fat move)',alg:"r = R + M'",match:/\b(?:wide|fat)(?:-[rlfbud])?(?: moves?)?\b/i,see:['slice','notation'],
   def:'A turn of two layers together: a face and the middle slice next to it. Lowercase letters write it, so r is R plus the middle slice. Some cubers say "fat move". Some write Rw.'},
  {id:'slice',term:'Slice move',alg:'M  E  S',match:/\bslice(?: moves?)?\b/i,see:['wide','notation'],
   def:'A turn of a middle layer only. M turns the layer between L and R, in the same direction as L. E turns the layer between U and D, like D. S turns the layer between F and B, like F.'},
  {id:'commutator',term:'Commutator',alg:"[A, B] = A B A' B'",match:/\bcommutators?\b/i,see:['conjugate','niklas'],
   def:'Do A, do B, undo A, undo B. Only the pieces that both A and B move end up changed. A short commutator can move just three pieces.'},
  {id:'conjugate',term:'Conjugate',alg:"[S: X] = S X S'",match:/\bconjugates?\b|\bconjugated\b/i,see:['setup','commutator'],
   def:'Do a setup move S, do X, then undo S. The setup brings pieces to where X acts on them. X then acts, and the undo puts everything else back.'},
  {id:'setup',term:'Setup move',match:/\bset ?up(?: moves?)?\b/i,see:['conjugate'],
   def:'A move that brings pieces into position before an algorithm. You undo it after the algorithm. In the trainer, "set up" also means: put a case on the cube.'},
  {id:'moving-left',term:'Moving Left',alg:"U' L' U L U F U' F'",match:/\bMoving Left\b/,see:['moving-right','beginner-method'],
   def:'The middle-layer algorithm of the beginner method for an edge whose top tile matches the left center. The first four moves put the edge next to its corner. The last four bring the two into the middle layer.'},
  {id:'moving-right',term:'Moving Right',alg:"U R U' R' U' F' U F",match:/\bMoving Right\b/,see:['moving-left','beginner-method'],
   def:'The middle-layer algorithm of the beginner method for an edge whose top tile matches the right center. The first four moves put the edge next to its corner. The last four bring the two into the middle layer.'},
  {id:'trigger',term:'Trigger',match:/\btriggers?\b/i,see:['sexy','sledgehammer'],
   def:'A short, fast move group that many algorithms share, such as the sexy move or the sledgehammer. Learn triggers as one motion, not as single moves.'},
  {id:'fur',term:"FUR says U'R'F'",alg:"F U R U' R' F'",match:/\bFUR\b/,see:['yellow-cross'],
   def:'The saying for the yellow cross algorithm of the beginner method: F, U, R, then U\', R\', F\'. The first three moves go clockwise, the next three counterclockwise.'},
  {id:'fish',term:'Feed the fish',match:/\bfeed the fish\b|\bthe fish\b/i,see:['beginner-method'],
   def:'The saying for step 6 of the beginner method when one corner has yellow on top. The yellow tiles make a fish. Hold the cube so the fish eats out of your left hand: that corner at the front left.'},
  {id:'tail-lights',term:'Tail lights',match:/\btail ?lights?\b/i,see:['beginner-method'],
   def:'Two yellow corners next to each other that already sit in their places. In step 7 of the beginner method, hold them at the back before the algorithm, like the tail lights of a car.'},
  {id:'chant',term:'The chant',alg:"R' F R' B2 R F' R' B2 R2 U'",match:/\bchant\b/i,see:['tail-lights'],
   def:'Words under the moves of the yellow corners algorithm: R\' is "run to me", R is "run away", F is "fast", B2 is "back back", U\' is "up". Run to me, fast, run to me, back back; run away, fast, run to me, back back; run run away, up.'},
  {id:'cancel',term:'Cancel (move cancellation)',match:/\bcancel(?:s|led|lation|lations)?\b/i,
   def:'When two moves next to each other turn the same face, they join into one move or none. For example, U followed by U\' cancels to nothing, and U followed by U is U2.'},
  {id:'parity',term:'Parity (4×4)',match:/\bparit(?:y|ies)\b/i,see:['reduction','yau'],
   def:'A state a 4×4 reaches that a 3×3 never shows: one edge pair turned over (OLL parity), or two edge pairs swapped (PLL parity). Each has its own algorithm of slice turns. The 4×4 beginner method meets them at the yellow cross and at the yellow edges.'},
  {id:'reduction',term:'Reduction',match:/\breduction\b/i,see:['parity','yau'],
   def:'The way most people solve a 4×4: build the six centers, pair the twelve edges, then solve it like a 3×3 with outside turns. The 4×4 beginner method is reduction with the beginner 3×3 method; the advanced section is reduction with CFOP.'},
  {id:'yau',term:'Yau',match:/\bYau\b/,see:['reduction','parity'],
   def:'A 4×4 method the fast solvers use: two opposite centers, three cross edges, the last four centers with the cross kept out of the way, the last cross edge, the other eight edges three-two-three, then the 3×3 stage from F2L on. Named after Robert Yau.'},
  {id:'wing',term:'Edge piece (wing)',match:/\bedge pieces?\b|\bwings?\b/i,see:['reduction'],
   def:'One of the 24 edge pieces of a 4×4. Two with the same colors sit side by side to make one edge like a 3×3 edge. Edge pieces cannot flip in place; where one sits decides which way round it shows.'},
  {id:'ortega',term:'Ortega',match:/\bOrtega\b/,see:['pbl','cll'],
   def:'A 2×2 speed method in three steps: a face of one color (not a whole layer), OLL to orient the top, then PBL to permute both layers at once. Twelve algorithms.'},
  {id:'pbl',term:'PBL (permute both layers)',match:/\bPBL\b/,see:['ortega','bar'],
   def:'The last step of Ortega. Both layers are oriented. One algorithm swaps corners on the top and the bottom together. Five cases, told apart by the bars on each layer.'},
  {id:'cll',term:'CLL (corners of the last layer)',match:/\bCLL\b/,see:['ortega','oll'],
   def:'A 2×2 method: solve one whole layer, then one algorithm orients and permutes the four top corners. 42 cases, grouped by the OLL shape they start from.'},
  {id:'eg',term:'EG',match:/\bEG(?:-[12])?\b/,see:['cll'],
   def:'The 2×2 method after CLL. A face of one color, then one algorithm that solves the top and fixes the bottom layer too. EG-1 covers a bottom with a bar, EG-2 a diagonal bottom; 43 cases each.'},
  {id:'bar',term:'Bar',match:/\b(?:a|one|no|the|two) bars?\b(?!\s+(?:below|above|in the top))/i,see:['pbl'],
   def:'Two corners next to each other that share the color on their common side. On a 2×2 layer, a bar means the other two corners need to swap; no bar means a diagonal swap.'},
  {id:'mini',term:'2×2 cube',match:/\b2×2 cube\b/i,see:['ortega'],
   def:'The 2×2 cube: eight corners, no centers, no edges. White is opposite yellow, blue opposite green, orange opposite red. Its beginner method takes five steps.'},
  {id:'cfop',term:'CFOP',match:/\bCFOP\b/,see:['cross','f2l','oll','pll'],
   def:'The most common speed-solving method. Its four steps are Cross, F2L, OLL and PLL. It is also called the Fridrich method.'},
  {id:'f2l',term:'F2L (first two layers)',match:/\bF2L\b/,see:['pair','slot','cross'],
   def:'The second step of CFOP. After the cross, you solve the four corner-edge pairs of the first two layers, one slot at a time.'},
  {id:'oll',term:'OLL (orient the last layer)',match:/\bOLL\b/,see:['orientation','two-look','pll'],
   def:'The third step of CFOP. You turn the last-layer pieces so the top face is all one color. The pieces can still be in the wrong places.'},
  {id:'pll',term:'PLL (permute the last layer)',match:/\bPLL\b/,see:['permutation','perm','two-look'],
   def:'The last step of CFOP. You move the last-layer pieces to their correct places. The top color stays on top.'},
  {id:'two-look',term:'Two-look',match:/\b(?:two|2)-look\b/i,see:['oll','pll'],
   def:'A step split into two shorter steps, each with fewer algorithms to learn. Two-look OLL orients the edges, then the corners. Two-look PLL permutes the corners, then the edges.'},
  {id:'xcross',term:'X-cross',match:/\bx-cross\b/i,see:['cross','pair'],
   def:'A cross with one F2L pair solved in the same step. Fast solvers plan one during inspection.'},
  {id:'daisy',term:'The daisy',match:/\bdais(?:y|ies)\b/i,see:['white-cross','beginner-method'],
   def:'The first step of the beginner method. Four white edges sit around the yellow center, white side up, like petals round a flower. From the daisy, each edge goes down to make the white cross.'},
  {id:'white-cross',term:'White cross',match:/\bwhite cross\b/i,see:['daisy','cross'],
   def:'Four white edges around the white center, in a plus sign. The other color of each edge matches the center next to it. In the beginner method it is step 2, and it sits on the bottom.'},
  {id:'yellow-cross',term:'Yellow cross',alg:"F U R U' R' F'",match:/\byellow cross\b/i,see:['beginner-method','fur','cross'],
   def:'Step 5 of the beginner method: a plus sign of yellow on the top face. You see a dot, an L or a line first. One algorithm, FUR says U\'R\'F\', done up to three times, finishes it.'},
  {id:'beginner-method',term:'Beginner method',match:/\bbeginner(?:'s)? method\b|\beight-step method\b/i,see:['daisy','cfop'],
   def:'The cube layer by layer in eight steps, one small part at a time. It uses a handful of short algorithms, each with a saying to remember it by. Most people learn it first, then move on to CFOP for speed.'},
  {id:'cross',term:'Cross',match:/\bcross\b/i,see:['cfop','f2l'],
   def:'The first step of CFOP. You solve the four edges around one center, usually white, so they make a plus sign that matches the side centers.'},
  {id:'pair',term:'Pair (F2L pair)',match:/\bpairs?\b/i,see:['f2l','slot','insert'],
   def:'One corner and the edge that goes beside it in the first two layers. In F2L you join the two in the top layer, then put them into their slot together.'},
  {id:'slot',term:'Slot',match:/\bslots?\b/i,see:['pair','insert'],
   def:'One of the four places for an F2L pair, between two side centers: front-right, front-left, back-right or back-left.'},
  {id:'insert',term:'Insert',match:/\b(?:re-)?inserts?\b|\binserted\b/i,see:['pair','slot'],
   def:'The last moves of an F2L case. They put a joined pair into its slot.'},
  {id:'auf',term:'AUF (adjust the U face)',match:/\bAUF\b/,see:['oll','pll'],
   def:'A turn of the top layer (U, U\' or U2) before or after a last-layer algorithm. Before, it lines the case up. After, it finishes the solve.'},
  {id:'perm',term:'Perm (PLL case)',match:/\b[AEFGHJNRTUVYZ][ab]? perms?\b/,see:['pll'],
   def:'A PLL case, named by a letter, such as T perm, Y perm or U perm. The letter often looks like the arrows of the swap. Some come in two mirror forms, a and b.'},
  {id:'headlights',term:'Headlights',match:/\bheadlights\b/i,
   def:'Two stickers of the same color side by side on the corners of one side face. In PLL they help you recognize the case. In two-look OLL, the U corner case shows two top stickers that face you like headlights.'},
  {id:'orientation',term:'Orientation (orient)',match:/\borient(?:ation|ations|ed|s)?\b/i,see:['permutation','edge-flip','corner-twist'],
   def:'Which way a piece faces in its place. A piece can be in the right place but turned the wrong way. Orient means: turn pieces so they face the right way.'},
  {id:'permutation',term:'Permutation (permute)',match:/\bpermut(?:ation|ations|e|es|ed)\b/i,see:['orientation','parity'],
   def:'Where the pieces are, without regard to which way they face. Permute means: move pieces to their correct places.'},
  {id:'parity',term:'Parity',match:/\bparity\b/i,see:['permutation'],
   def:'Whether a swap count is even or odd. On a 3x3, a legal move always keeps corner parity equal to edge parity. So two pieces alone can never be swapped.'},
  {id:'edge-flip',term:'Edge flip',match:/\bedge flips?\b|\bflipped edges?\b|\bone edge is flipped\b/i,see:['orientation'],
   def:'An edge in its correct place but turned over, so its two colors face the wrong ways. One flipped edge alone cannot happen on a legal cube.'},
  {id:'corner-twist',term:'Corner twist',match:/\bcorner twists?\b|\btwisted corners?\b|\bone corner is twisted\b/i,see:['orientation'],
   def:'A corner in its correct place but turned a third of a turn. One twisted corner alone cannot happen on a legal cube.'},
  {id:'rotation',term:'Cube rotation',alg:'x  y  z',match:/\b(?:cube )?rotat(?:ions?|es?)\b/i,see:['notation'],
   def:'A turn of the whole cube in your hands. No layer moves against another. x turns it like R, y like U, and z like F.'},
  {id:'notation',term:'Notation',alg:"R  R'  R2",match:/\bnotation\b/i,see:['wide','slice','rotation'],
   def:'Letters for moves. U R F D L B turn one face clockwise, as you look at that face. A prime (\') means counterclockwise. A 2 means a half turn.'},
  {id:'prime',term:'Prime',alg:"R'",match:/\bprime\b/i,see:['notation'],
   def:'The apostrophe after a move. It means: turn that face counterclockwise. Say R\' as "R prime".'},
  {id:'alg',term:'Alg (algorithm)',match:/\balgs?\b/i,see:['notation','trigger'],
   def:'A fixed sequence of moves that does one known job, such as solving one OLL case.'},
  {id:'pieces',term:'Piece names (UF, URF)',match:/\b(?:[UD][FBRL][FBRL]?|[FB][RL])\b/,see:['cubie'],
   def:'Short names for the places of pieces. Each letter is a face the piece touches. UF is the edge between the top (U) and front (F) faces. URF is the corner where the top, right and front faces meet.'},
  {id:'three-cycle',term:'3-cycle',match:/\b(?:3|three)-cycles?\b/i,see:['commutator','pure'],
   def:'Three pieces that trade places in a loop. The first goes to the place of the second, the second to the place of the third, and the third to the place of the first. The A perm and the U perm are 3-cycles.'},
  {id:'pure',term:'Pure',match:/\bpure\b/i,see:['three-cycle','commutator'],
   def:'An algorithm is pure when it changes only the pieces it is for. A pure corner 3-cycle moves three corners, and every other piece ends where it started.'},
  {id:'fingertrick',term:'Finger trick',match:/\bfinger[- ]?tricks?\b/i,see:['trigger'],
   def:'A way to turn a face with your fingers, not your whole hand, so the moves flow fast. For example, push the U face to the left with your right index finger.'},
  {id:'cubie',term:'Cubie',match:/\bcubies?\b/i,
   def:'One of the small pieces of the cube: 8 corners, 12 edges and 6 centers.'},
  {id:'inspection',term:'Inspection',match:/\binspection\b/i,see:['cross','penalty'],
   def:'The 15 seconds you may look at the cube before a timed solve. Most cubers plan the cross during inspection. A late start costs a penalty.'},
  {id:'penalty',term:'Penalties (+2, DNF)',match:/\bDNF\b/,see:['inspection'],
   def:'Time penalties from competition rules. Start the solve more than 15 seconds into inspection and 2 seconds are added: +2. Start it after 17 seconds and the solve does not count: DNF, which means did not finish.'},
  {id:'wca',term:'WCA',match:/\bWCA\b/,see:['inspection'],
   def:'The World Cube Association. It runs official competitions and sets their rules, such as how to hold the cube for a scramble and how long inspection lasts.'},
  {id:'average',term:'Average (ao5, ao12)',match:/\bao(?:5|12)\b/i,
   def:'A fair average of recent solves. For ao5, drop the best and the worst of the last five times, then take the mean of the other three. For ao12, drop the best and the worst of the last twelve, then average the other ten.'},
  {id:'random-state',term:'Random state',match:/\brandom[- ]state\b/i,see:['wca','seed'],
   def:'A scramble that puts the cube in a random position, each position as likely as any other. WCA competitions use random-state scrambles from TNoodle. Twistwright makes them with cubing.js, which has the same solvers as TNoodle. A seed gives random moves instead.'},
  {id:'seed',term:'Seed',match:/\bseeds?\b/i,
   def:'A word that picks a scramble in Twistwright. The same seed always gives the same scramble, so you can repeat or share one.'},
  {id:'smart-cube',term:'Smart cube',match:/\bsmart cubes?\b/i,
   def:'A cube with a sensor inside that counts each turn and sends it to a phone or a computer with Bluetooth. Twistwright reads GAN smart cubes, such as the GAN 12 ui.'},
  {id:'regular-cube',term:'Regular cube',match:/\bregular cubes?\b/i,see:['smart-cube','virtual-cube'],
   def:'A cube with nothing electronic inside, the kind most people have. Twistwright cannot see it turn. So you scan it with the camera or paint its colors in, then you turn it by hand as the app shows each move.'},
  {id:'virtual-cube',term:'Virtual cube',match:/\bvirtual cubes?\b/i,see:['smart-cube','regular-cube'],
   def:'A cube on the screen. Six keys on the keyboard or the numeric keypad turn its faces, and a drag turns the whole cube. You need no real cube to learn with it.'}
];
const GLOSSARY_BY_ID=Object.fromEntries(GLOSSARY.map(g=>[g.id,g]));

// Small DOM builder: el('div', {className:'x'}, 'text', childNode, ...).
function glEl(tag,props,...kids){
  const e=document.createElement(tag);
  for(const k in props||{}){if(k==='data')Object.assign(e.dataset,props.data);else if(k in e)e[k]=props[k];else e.setAttribute(k,props[k]);}
  for(const c of kids)if(c!=null)e.append(c);
  return e;
}
function glLinkEl(id,text){return glEl('span',{className:'gl',tabIndex:0,role:'button',title:'What is '+GLOSSARY_BY_ID[id].term+'? Click for the meaning',data:{gl:id}},text);}

// ---------- link the description text ----------
// Never link inside these: moves, controls, labels (a click would toggle them), headings, case names.
const GL_SKIP='button,input,select,option,textarea,label,svg,script,style,code,kbd,a,h1,h2,h3,dt,th,.sec>b,.gl,.gl-pop,.m,.mono,.kbd,.scramble,.algbig,.big,.alg,.tag,.timer,.times,.stats,.rail,header.top,.nm,.case,.alt,.lbl,#seqLabel,.viewbtns,.draghint,.animbtn,.cw-hints .says';
const GL_BLOCK='p,li,td,dd,.sec,.tip,.notice,.muted,.step,div';
const glDone=new WeakMap(); // block -> Set of ids already linked there
function glossaryLink(root){
  if(!root||root.nodeType!==1&&root.nodeType!==3)return;
  const texts=[];
  if(root.nodeType===3)texts.push(root);
  else{
    if(root.closest&&root.closest(GL_SKIP))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
      const p=n.parentElement;if(!p||!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
      return p.closest(GL_SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    while(w.nextNode())texts.push(w.currentNode);
  }
  for(const t of texts)glLinkText(t);
}
function glLinkText(t){
  const p=t.parentElement;if(!p||!t.isConnected||p.closest(GL_SKIP))return;
  const block=p.closest(GL_BLOCK)||p;let done=glDone.get(block);if(!done){done=new Set(block.dataset.glSelf?[block.dataset.glSelf]:[]);glDone.set(block,done);}
  // The earliest match of any entry not yet linked in this block.
  let best=null;
  for(const g of GLOSSARY){
    if(done.has(g.id))continue;const m=t.nodeValue.match(g.match);
    if(m&&(!best||m.index<best.m.index))best={g,m};
  }
  if(!best)return;
  done.add(best.g.id);
  const after=t.splitText(best.m.index),rest=after.splitText(best.m[0].length);
  after.replaceWith(glLinkEl(best.g.id,after.nodeValue));
  glLinkText(rest); // more terms later in the same text
}

// ---------- the floating card ----------
let glOpen=null;
function glossaryShow(id,anchor){
  const g=GLOSSARY_BY_ID[id];if(!g)return;glossaryHide(false);
  const back=glEl('div',{className:'gl-back'});
  const see=(g.see||[]).filter(s=>GLOSSARY_BY_ID[s]);
  const seeRow=see.length?glEl('div',{className:'gl-see'},'See also: ',...see.flatMap((s,i)=>i?[', ',glLinkEl(s,GLOSSARY_BY_ID[s].term)]:[glLinkEl(s,GLOSSARY_BY_ID[s].term)])):null;
  const pop=glEl('div',{className:'gl-pop',role:'dialog','aria-label':g.term,tabIndex:-1},
    glEl('div',{className:'gl-term'},g.term),g.alg?glEl('div',{className:'gl-alg mono'},g.alg):null,glEl('p',{},g.def),seeRow);
  document.body.append(back,pop);
  // Below the link, or above it when there is no room. Kept inside the window.
  const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight,vw=document.documentElement.clientWidth,vh=window.innerHeight;
  const left=Math.max(12,Math.min(vw-pw-12,r.left+r.width/2-pw/2));
  const top=r.bottom+8+ph<=vh-8||r.top-8-ph<8?r.bottom+8:r.top-8-ph;
  pop.style.left=left+'px';pop.style.top=Math.max(8,top)+'px';
  glOpen={pop,back,anchor};
  pop.focus({preventScroll:true});
}
function glossaryHide(refocus){
  if(!glOpen)return;const {pop,back,anchor}=glOpen;glOpen=null;pop.remove();back.remove();
  if(refocus&&anchor&&anchor.isConnected)anchor.focus({preventScroll:true});
}
function glossaryInit(){
  // A tap on a link opens its entry. While a card is open, any tap closes it; a tap on a
  // see-also link inside the card opens that entry instead. The backdrop keeps the tap from
  // reaching the page, so it does not start the timer or turn the cube.
  document.addEventListener('click',e=>{
    const l=e.target.closest&&e.target.closest('.gl');
    if(glOpen){
      e.preventDefault();e.stopPropagation();
      if(l&&glOpen.pop.contains(l))glossaryShow(l.dataset.gl,glOpen.anchor);else glossaryHide(false);
      return;
    }
    if(l){e.preventDefault();e.stopPropagation();glossaryShow(l.dataset.gl,l);}
  },true);
  // Esc closes the card only, not a dialog under it. This listener is added first, so it runs first.
  document.addEventListener('keydown',e=>{
    if(glOpen&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();glossaryHide(true);return;}
    const l=e.target.closest&&e.target.closest('.gl');
    if(l&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();glossaryShow(l.dataset.gl,l);return;}
    if(glOpen&&e.key!=='Tab')e.stopImmediatePropagation(); // keep timer and tab keys out while the card is open
  },true);
  window.addEventListener('resize',()=>glossaryHide(false));
  document.addEventListener('scroll',e=>{if(glOpen&&!glOpen.pop.contains(e.target))glossaryHide(false);},true);

  // The full list, at the end of the Reference tab.
  const ref=document.getElementById('tab-ref');
  if(ref){
    const dl=glEl('dl',{className:'gl-list'});
    for(const g of GLOSSARY.slice().sort((a,b)=>a.term.localeCompare(b.term)))
      dl.append(glEl('dt',{id:'gl-'+g.id},g.term),glEl('dd',{data:{glSelf:g.id}},g.alg?glEl('span',{className:'mono'},g.alg):null,g.alg?' · ':null,g.def));
    ref.append(glEl('div',{className:'panel',id:'glossary'},glEl('h3',{},'Glossary'),
      glEl('p',{className:'muted'},'Underlined words in the description text open these entries.'),dl));
  }
  glossaryLink(document.body);
  // Text that the app renders later gets linked too. Work is batched to one pass per frame.
  let pending=new Set(),queued=false;
  new MutationObserver(ms=>{
    for(const m of ms)for(const n of m.addedNodes){
      if(n.nodeType===1&&(n.classList.contains('gl')||n.classList.contains('gl-pop')||n.classList.contains('gl-back')))continue;
      pending.add(n);
    }
    if(pending.size&&!queued){queued=true;requestAnimationFrame(()=>{queued=false;const ns=pending;pending=new Set();for(const n of ns)glossaryLink(n);});}
  }).observe(document.body,{childList:true,subtree:true});
}
glossaryInit();
