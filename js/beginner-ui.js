// ===== The method chip and its chooser, the beginner packs, and the progress panel =====
// Loads after app.js, enter.js and scan.js. The beginner tabs live in their own files:
// learn.js (Learn, Cheat sheet), guide.js (Solve my cube), paint.js (Paint the colors),
// practice.js (Practice, Progress). They use the hooks below and the ones app.js exports:
//   method, METHODS, isBeg(), puzzleN(), setMethod(m), goTab(name), tabShow[tab],
//   setSequence(moves,label,base,drill), heldCube(), begPack(), begProgress, stBtn(id),
//   cycleStatus(id), and the events cw:scramble, cw:status, cw:method, cw:tab on document.
//
// A beginner pack is everything the beginner modules need from a method: the steps and the
// algorithms, the solver, how the cube is held, and the words that differ. Two packs: the 3×3
// (js/beginner.js, the 3×3 guide) and the 2×2 (js/mini.js, the 2×2 guide).
// Both solvers return the same plan shape: stages of parts, each part with a hold `pre` (a
// string of whole-cube turns), `moves`, `chunks` and `up`, the face on top while it is done.
// All markup is built from fixed strings and the method data; every dynamic string goes
// through esc(), as in every other module (no build step, no templating library).

const BEG_PACKS={
  beginner:{
    id:'beginner',steps:BEGINNER_STEPS,algs:BEGINNER_ALGS,solve:solveBeginner,chunks:beginnerChunks,count:8,word:'eight',prefix:'beg-',prog:'begProg',
    // The cube as the beginner holds it for the solver: yellow up, so the scramble after z2.
    held:()=>applyAlg(scr.cube,['z2']),heldMoves:['z2'],startUp:'yellow',scan:true,
    holdText:'White on top, green facing you.',
    basics:'About five minutes. The three kinds of piece, how to hold the cube, and the six turns. No cube needed yet.',
    short:['Daisy','White cross','White corners','Middle layer','Yellow cross','Yellow face','Yellow corners','Yellow edges'],
    frame:n=>n===3?new Cube():applyAlg(new Cube(),['z2']), // step 3 works white up, the rest yellow up
    caseBase(n){const h=this.frame(n);if(n===1)return applyAlg(h,['F2','R2','B2','L2']);if(n===2)return applyAlg(h,['R2','B2','L2']);return h;}, // a daisy for steps 1 and 2
    goalBelow:{2:true,4:true},
    lessonStart:()=>applyAlg(new Cube(),[...randomMoveScramble('lesson',22),'z2']),
    // The goal picture of step n: seen as the step holds it, green in front again.
    goalCube(n,c){const want=n===3?0:3;let g=c.toFacelets()[4]===want?c:applyAlg(c,['z2']);for(let i=0;i<4&&g.toFacelets()[22]!==2;i++)g=applyAlg(g,['y']);return g;},
    faces:{basics:'.W.WWW.W.',daisy:'.W.WYW.W.',cross:'.W.WWW.W.',corners:'WWWWWWWWW',middle:'GGGGGGGGG',ycross:'.Y.YYY.Y.',yface:'YYYYYYYYY',ycorners:'YYYYYYYYY',yedges:'YYYYYYYYY'},
    caseTitles:{1:'Where you find a white edge, and what to do',2:'Line up each edge, then turn it down',3:'Where you find a white corner, and what to do',4:'Where the edge goes, and what to do',5:'What you see on top, and what to do',6:'What you see on top, and what to do',7:'What you see, and what to do',8:'What you see, and what to do'},
    cheatIntro:'Keep this page open while you solve. Yellow on top for steps 1 and 2, white on top for step 3, yellow on top from step 4 to the end.',
    cheat:{
      1:{rule:'Yellow on top. Look at the top layer, then the middle, then the bottom. Turn the top to move a petal out of the way first.',
         list:[['Middle layer, white facing you, at the front right','R'],['Middle layer, white facing right, at the front right',"U' F'"]]},
      2:{rule:'Yellow on top. Turn the top until the front tile of the top edge matches the front center. Then F2. Then flip the cube over.',list:[['Edge over its center, in front','F2']]},
      3:{rule:'White cross on top. Turn the bottom until the corner sits between its centers. Hold white facing you: bottom left or bottom right, then that algorithm. White facing down: white to the front first. Wrong corner on top: corner down first.'},
      4:{rule:'Flip over: white down. Turn the top until a top edge makes a vertical line with the front center. Top tile matches the left center: Moving Left. The right center: Moving Right. Stuck edge: hold it on the right, Moving Right.'},
      5:{rule:'Dot: hold the cube any way. Line: left to right. L: back left. FUR says U\'R\'F\'. Repeat until you see the cross.'},
      6:{rule:'One corner: feed the fish, that corner at the front left. None: a yellow tile on the left face, front left. Two: left thumb on a yellow tile on the front, front left. Repeat.'},
      7:{rule:'Turn the top until two corners are right. Next to each other: tail lights at the back. Across from each other: the chant once, then look again.'},
      8:{rule:'Solved side at the back. The front edge matches the left center: as written. The right center: both U turns as U\'. No side solved: once, any way.'},
    },
    topNote:{1:'The daisy grows around the yellow center.',2:'The daisy sits on top.',3:'Step 3 works with the white cross on top.',4:'From here to the end, yellow stays on top.'},
    next:{method:'cfop',name:'CFOP',text:'Try CFOP, from the chip in the top bar.',foot:'Switch to CFOP from the chip in the top bar. Your times and history come with you.',btn:'Show me CFOP'},
  },
  mini:{
    id:'mini',steps:MINI_STEPS,algs:MINI_ALGS,solve:solveMini,chunks:miniChunks,count:5,word:'five',prefix:'mini-',prog:'miniProg',
    // The 2×2 has no centers: the solver reads the cube as it is, white up, and holds it itself.
    held:()=>scr.cube,heldMoves:[],startUp:'white',scan:true,
    holdText:'White on top, green facing you, like the picture. A 2×2 has no centers, so the app follows the corners.',
    basics:'About three minutes. Two layers, eight corners, how to hold the cube, and the six turns. No cube needed yet.',
    short:['First corners','Third corner','Fourth corner','Yellow face','Yellow corners'],
    frame:n=>n>=4?applyAlg(new Cube(),['z2']):new Cube(), // the top layer white up, the rest yellow up
    caseBase(n){return this.frame(n);},
    goalBelow:{},
    lessonStart:()=>applyAlg(new Cube(),twoScramble('lesson',11)),
    goalCube(n,c,up){const want=n>=4?'yellow':'white';return up===want?c:applyAlg(c,['z2']);},
    faces:{basics:'WWWW',first:'.W.W',third:'WW.W',fourth:'WWWW',yface:'YYYY',ycorners:'YYYY'},
    caseTitles:{1:'Where you find the corner, and what to do',2:'Where you find the corner, and what to do',3:'Where you find the corner, and what to do',4:'What you see on top, and what to do',5:'What you see, and what to do'},
    cheatIntro:'Keep this page open while you solve. White on top for steps 1 to 3, yellow on top for steps 4 and 5.',
    cheat:{
      1:{rule:'White up, the white-red-blue corner at the top front right. Then the white-blue-orange corner. Top layer: hold it on the right, R\', D\', R, then hold the first corner on the left again. Bottom right of the front: white facing you R; facing right R\', D\', R; facing down D, R2.'},
      2:{rule:'Hold the placed corners on the left, white up. Back right with white facing back: R\'. Back right any other way: R, D\'. Front right but twisted: R2, D\'. Then the three bottom cases, as for the second corner.'},
      3:{rule:'Hold the placed corners on the left, white up. Front right but twisted: R\', D\', R. Bottom right of the front: white facing down, White to the front first. Facing you: Corner in. Facing right: R\', D\', R.'},
      4:{rule:'Turn over, white down. One yellow on top: Top one, that tile at the front left. None: None left, a yellow tile on the left face at the front. Two: left thumb on a yellow tile on the front at the left. Up, Over, Down, Over, Up, Over over, Down. Repeat.'},
      5:{rule:'Twist the top until two corners match the bottom layer. Next to each other: hold them at the back, then the chant. Across from each other: the chant once, then look again.'},
    },
    topNote:{1:'The white face grows on top, one corner at a time.',4:'From here to the end, yellow stays on top.'},
    next:{method:'speed2',name:'Speed',text:'Try the speed methods, from the chip in the top bar.',foot:'Switch to the 2×2 speed section from the chip in the top bar: Ortega, then CLL.',btn:'Show me the speed methods'},
    // The guided solve's hold line (fixed strings): the part's own text says how to hold the cube.
    holdLine:e=>e.flip?'<b>Turn the cube over</b> so the yellow face is on top. The dashed move is this turn.':e.part.pre?'<b>Hold the cube</b> as the next line says. The dashed moves turn the whole cube.':'<b>Keep the hold</b> from the part before. The 3D cube shows this view.',
  },
  master:{
    id:'master',steps:MASTER_STEPS,algs:MASTER_ALGS,solve:solveMaster,chunks:masterChunks,count:10,word:'ten',prefix:'master-',prog:'masterProg',
    // The 4×4 has no fixed centers: the solver reads the cube as it is and holds it itself. Every
    // turn of the whole cube is a part's own `pre`; `up` never changes.
    held:()=>scr.cube,heldMoves:[],startUp:'white',scan:true,
    holdText:'White on top, green facing you, like the picture. A 4×4 has no fixed centers, so the app builds them where the corners say they belong.',
    basics:'About five minutes. The pieces, the color layout, face turns and slice turns. No cube needed yet.',
    short:['Centers','Edges','Daisy','White cross','White corners','Middle layer','Yellow cross','Yellow face','Yellow corners','Yellow edges'],
    frame:n=>n<=2||n===5?new FourCube():new FourCube().apply('z2'), // the 3×3 steps as the 3×3 pack holds them, two steps later
    caseBase(n){const h=this.frame(n);if(n===3)return applyAlg(h,['F2','R2','B2','L2']);if(n===4)return applyAlg(h,['R2','B2','L2']);return h;},
    goalBelow:{4:true,6:true},
    lessonStart:()=>new FourCube(fourApply(FOUR_SOLVED,fourScramble('lesson',40))),
    goalCube(n,c){return c;},
    faces:{basics:'WWWWWWWWWWWWWWWW',centers:'.....WW..WW.....',edges:'.WW.W..WW..W.WW.',daisy:'.WW.WYYWWYYW.WW.',cross:'.WW.WWWWWWWW.WW.',corners:'WWWWWWWWWWWWWWWW',middle:'GGGGGGGGGGGGGGGG',ycross:'.YY.YYYYYYYY.YY.',yface:'YYYYYYYYYYYYYYYY',ycorners:'YYYYYYYYYYYYYYYY',yedges:'YYYYYYYYYYYYYYYY'},
    caseTitles:{1:'Where the tile is, and what to do',2:'Where the two pieces are, and what to do',3:'Where you find a white edge, and what to do',4:'Line up each edge, then turn it down',5:'Where you find a white corner, and what to do',6:'Where the edge goes, and what to do',7:'What you see on top, and what to do',8:'What you see on top, and what to do',9:'What you see, and what to do',10:'What you see, and what to do'},
    cheatIntro:'Keep this page open while you solve. Centers, then edges, then the 3×3 steps: yellow on top for steps 3 and 4, white on top for step 5, yellow on top from step 6 to the end. Two parity fixes: at the yellow cross and at the yellow edges.',
    cheat:{
      1:{rule:'White, yellow, red, green, orange, blue. Target on top. A tile on a side: that side in front, turn it to the lower right. On the bottom: turn it to the lower right. Turn the top until another color is at the upper left. Front tile: Rr, U, R\'r\'. Bottom tile: Rr2, U, Rr2.'},
      2:{rule:'Two pieces of the same colors to the left and right of the front with outside turns. Across from each other, same color facing you: Don\'t Run Fast Unless Running Fast Daily. Not across: R, F\', U, F first.'},
      3:{rule:'Yellow on top. Look at the top layer, then the middle, then the bottom. Turn the top to move a petal out of the way first.',
         list:[['Middle layer, white facing you, at the front right','R'],['Middle layer, white facing right, at the front right',"U' F'"]]},
      4:{rule:'Yellow on top. Turn the top until the front tile of the top edge matches the front center. Then F2. Then flip the cube over.',list:[['Edge over its center, in front','F2']]},
      5:{rule:'White cross on top. Turn the bottom until the corner sits between its centers. Hold white facing you: bottom left or bottom right, then that algorithm. White facing down: white to the front first. Wrong corner on top: corner down first.'},
      6:{rule:'Flip over: white down. Turn the top until a top edge makes a vertical line with the front center. Top tile matches the left center: Moving Left. The right center: Moving Right. Stuck edge: hold it on the right, Moving Right.'},
      7:{rule:'One or three yellow edges up: parity. With one up hold it at the back, with three hold the gap at the front, then r2 B2 U2 l U2 r\' U2 r U2 F2 r F2 l\' B2 r2. Then as on a 3×3: dot any way, line left to right, L at the back left, FUR says U\'R\'F\'.'},
      8:{rule:'One corner: feed the fish, that corner at the front left. None: a yellow tile on the left face, front left. Two: left thumb on a yellow tile on the front, front left. Repeat.'},
      9:{rule:'Turn the top until two corners are right. Next to each other: tail lights at the back. Across from each other: the chant once, then look again.'},
      10:{rule:'Two correct edges across from each other: hold them left and right, Are you? Are you you? Are you?. Next to each other: hold them left and back, the parity, then the 3×3 algorithm. Otherwise as on a 3×3: solved side at the back.'},
    },
    topNote:{1:'Each center grows on top, one tile at a time.',2:'Outside turns only, between the algorithms.',3:'The daisy grows around the yellow center.',5:'Step 5 works with the white cross on top.',6:'From here to the end, yellow stays on top.'},
    next:{method:'speed4',name:'Advanced',text:'Try the advanced method, from the chip in the top bar.',foot:'Switch to the 4×4 advanced section from the chip in the top bar: reduction with CFOP, and the way to Yau.',btn:'Show me the advanced method'},
    holdLine:e=>e.part.pre?'<b>Hold the cube</b> as the next line says. The dashed moves turn the whole cube.':'<b>Keep the hold</b> from the part before. The 3D cube shows this view.',
  },
};
function begPack(){return BEG_PACKS[method]||BEG_PACKS.beginner;}
// The cube as the beginner holds it for the solver.
function heldCube(){return begPack().held();}
function begStepCount(){return begPack().count;}
const begStatusId=n=>begPack().prefix+n;

// ---------- progress: step status in llState.status, counts per pack in cw:begProg / cw:miniProg ----------
const begProgs={};
function begProg(){const k=begPack().prog;if(!begProgs[k]){const d=Object.assign({solves:0,practiced:0,steps:{}},store.get(k,{}));
  if(d.practised!=null){d.practiced+=d.practised;delete d.practised;} // the key before the US spelling
  begProgs[k]=d;}return begProgs[k];}
var begProgress={ // var: tests read it from the window
  status(n){return llState.status[begStatusId(n)]||'';},
  counts(){let finished=0,learning=0;for(let n=1;n<=begStepCount();n++){const s=this.status(n);if(s==='finished')finished++;else if(s==='learning')learning++;}return {finished,learning};},
  // The first step that is not finished, the basics included. null when all are finished.
  next(){return begPack().steps.find(s=>this.status(s.n)!=='finished')||null;},
  solved(){const d=begProg();d.solves++;store.set(begPack().prog,d);renderProgress();},
  practiced(n){const d=begProg();d.practiced++;d.steps[n]=(d.steps[n]||0)+1;store.set(begPack().prog,d);renderProgress();},
  data(){return begProg();},
};
function begStepLabel(s){return s.n===0?'Basics, '+s.name:'Step '+s.n+', '+s.name;}
function renderProgress(){
  const sq=$('#progSq');if(!sq)return;const pk=begPack(),N=pk.count;
  sq.innerHTML=Array.from({length:N},(_,i)=>{const n=i+1,s=begProgress.status(n);return `<i class="${s}" title="Step ${n}: ${esc(pk.steps[n].name)}, ${stWord(s)}"></i>`;}).join('');
  sq.setAttribute('aria-label',`The ${pk.word} steps`);
  const {finished,learning}=begProgress.counts();
  $('#progText').textContent=finished===N?`All ${pk.word} steps finished.`:finished||learning?`${finished} step${finished===1?'':'s'} finished${learning?`, ${learning} in learning`:''}.`:'No steps finished yet.';
  const d=begProg();$('#progSolves').textContent=d.solves;$('#progPract').textContent=d.practiced;
  const nx=begProgress.next();$('#progNext').textContent=nx?begStepLabel(nx):pk.next.text;
  // The chooser's notes: how far each beginner method is.
  for(const id of ['beginner','mini','master']){const note=$('#mnote-'+id);if(!note)continue;const p=BEG_PACKS[id];let f=0;for(let n=1;n<=p.count;n++)if(llState.status[p.prefix+n]==='finished')f++;note.textContent=f?`${f} of ${p.count} steps finished`:'Start here';}
}
$('#progSolve').onclick=()=>goTab('bsolve');
// "Time my solves" puts the timer in the panel. "Progress" on the timer panel brings this back.
function showBegTimer(on){if(on)document.body.dataset.begtimer='1';else delete document.body.dataset.begtimer;store.set('begTimer',!!on);}
$('#progTimer').onclick=()=>showBegTimer(true);
$('#timerBack').onclick=()=>showBegTimer(false);
if(store.get('begTimer',false))showBegTimer(true);
document.addEventListener('cw:status',e=>{if(/^(beg-|mini-|master-)/.test(String(e.detail)))renderProgress();});

// ---------- the method chip and its popover ----------
function renderChip(){$('#methodName').textContent=methodInfo().name;const pz=$('#puzzleName');if(pz)pz.textContent=puzzleN()+'×'+puzzleN()+' ·';
  $$('#methodPop .mcard').forEach(c=>c.classList.toggle('on',c.dataset.method===method));}
function setMethod(m,opts){
  if(!METHODS[m])m='cfop';const changed=m!==method;const from=methodInfo().puzzle;method=m;applyMethodData();store.set('method',m);
  setScrLenOptions();
  if(from!==methodInfo().puzzle)swapPuzzleScramble(from,methodInfo().puzzle);
  renderChip();renderProgress();
  if(changed||(opts&&opts.force)){goTab(store.get(tabKey(),homeTab()));}
  document.dispatchEvent(new CustomEvent('cw:method',{detail:m}));
}
function openMethodPop(){const pop=$('#methodPop'),chip=$('#methodChip');renderChip();if(typeof startLevelRow==='function')startLevelRow();if(typeof cubePopClose==='function')cubePopClose();
  if(!mobileMQ.matches)pop.style.left=Math.max(8,chip.offsetLeft)+'px';else pop.style.left='';
  pop.classList.remove('hidden');chip.setAttribute('aria-expanded','true');document.body.classList.add('pop-open');pop.scrollTop=0;
  setTimeout(()=>{const c=$('#methodPop .mcard.on');if(c)c.focus();},20);}
function closeMethodPop(){$('#methodPop').classList.add('hidden');$('#methodChip').setAttribute('aria-expanded','false');document.body.classList.remove('pop-open');}
function methodPopOpen(){return !$('#methodPop').classList.contains('hidden');}
$('#methodChip').onclick=()=>{if(methodPopOpen())closeMethodPop();else openMethodPop();};
$$('#methodPop .mcard').forEach(c=>c.onclick=()=>{closeMethodPop();setMethod(c.dataset.method);});
document.addEventListener('click',e=>{if(!methodPopOpen())return;if(e.target.closest('#methodPop')||e.target.closest('#methodChip'))return;closeMethodPop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&methodPopOpen()){closeMethodPop();$('#methodChip').focus();}});

// boot: the first visit asks the cube level (js/start.js); with no level picker, the popover opens once
const begFirstVisit=store.get('method',null)==null;
setMethod(method,{force:true});
if(begFirstVisit)setTimeout(()=>{if(typeof startIsOpen==='function'&&startIsOpen())return;if(typeof startOpen==='function'&&store.get('level',null)==null){START.first=true;startOpen('level');}else openMethodPop();},300);
// The first visit also offers the data from another browser or the Mac app (js/transfer.js).
if(begFirstVisit)$('#methodData').classList.remove('hidden');
$('#methodPaste').onclick=()=>{closeMethodPop();openSettings('data');};

// ?onboard: a strip at the foot of the page says that this is a first visit and nothing is saved.
// Start over loads the page again as a new visitor; Leave goes back to the page with the saved history.
if(ONBOARD){document.body.classList.add('onboard');
  const bar=document.createElement('div');bar.id='onboardBar';bar.className='onboard-bar';bar.setAttribute('role','status');
  const note=document.createElement('span'),b=document.createElement('b');b.textContent='First visit';note.append(b,' · nothing is saved');bar.append(note);
  const btn=(id,label,title,fn)=>{const x=document.createElement('button');x.type='button';x.id=id;x.textContent=label;x.title=title;x.onclick=fn;bar.append(x);};
  btn('onboardAgain','Start over','Load the page again as a new visitor',()=>location.reload());
  btn('onboardLeave','Leave','Go back to the page with your saved history',()=>{const q=location.search.replace(/[?&]onboard(=[^&]*)?/,'').replace(/^&/,'?');location.href=location.pathname+q+location.hash;});
  document.body.appendChild(bar);
}
