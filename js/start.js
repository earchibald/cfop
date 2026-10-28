// ===== Getting started =====
// The first visit asks the cube level, then starts each level in its own place (the onboarding
// storyboard, docs/onboarding.md). The pages cover the page under the top bar (#start,
// body.starting); each track ends in the site with a method, a tab, a cube source and the
// statuses the user marked. cw:level keeps the level (1 to 5); the method menu can open the
// picker again (startLevelRow in js/start-app.js).
//   Level 1, never touched one: the basics first, in four pages (what the cube is, how to hold
//     it, the pieces, the six moves), on a picture that a drag looks around. No question about a
//     cube and no move letter before the moves page. Then which cube (the keys page for the
//     screen cube), then the beginner method.
//   Level 2, played but never solved: which cube, then the beginner method.
//   Level 3, have solved it: how, then the beginner steps checked off, then the bridge to CFOP
//     and the Cross lesson.
//   Level 4, know advanced algorithms: the CFOP sets (None, Some with the cases, All), a quiz
//     on what was marked, then OLL · PLL on the cases still to learn.
//   Level 5, already a speedcuber: one setup page, then the Scramble tab with a large timer.
const LEVELS=[
  {n:1,name:'Never touched one',sub:'New to the cube. Start with what it is.',goes:'→ Basics',first:'t1-what',tip:'Start with the basics'},
  {n:2,name:'Played but never solved',sub:'You can turn it. You have not solved it yet.',goes:'→ Beginner method',first:'t2-moves',tip:'Start the beginner method'},
  {n:3,name:'Have solved it',sub:'You can solve it, slowly or with notes.',goes:'→ Check, then CFOP',first:'t3-start',tip:'Review the beginner method'},
  {n:4,name:'Know advanced algorithms',sub:'You know some CFOP: F2L, OLL or PLL.',goes:'→ CFOP sets',first:'t4-sets',tip:'Go to CFOP'},
  {n:5,name:'Already a speedcuber',sub:'You time your solves. You want drills.',goes:'→ CFOP, timer',first:'t5-setup',tip:'Go to CFOP with the timer'}];
const LEVEL_COLORS=['W','Y','O','R','G'];
// The CFOP sets of level 4. ids() gives the case statuses a set marks; a set with no cases in the
// site (by feel, the full OLL) is kept in cw:known only.
const START_SETS=[
  {id:'cross',name:'Cross, by feel',sec:'W',feel:true},
  {id:'f2lfeel',name:'F2L, by feel',sec:'G',feel:true},
  {id:'f2l',name:'F2L cases',sec:'G',ids:()=>F2L_CASES.map(c=>'f2l-'+c.n)},
  {id:'oll2',name:'Two-look OLL',sec:'Y',ids:()=>[...ALG_DB.eo,...ALG_DB.co].map(a=>a.id)},
  {id:'pll2',name:'Two-look PLL',sec:'Y',ids:()=>[...ALG_DB.cp,...ALG_DB.ep].map(a=>a.id)},
  {id:'pll',name:'Full PLL',sec:'Y',ids:()=>PLL_FULL.map(p=>'pllf-'+p.name)},
  {id:'oll',name:'Full OLL',sec:'Y',count:57,note:'Not in Twistwright yet. Your mark is kept.'}];
function startSetCount(s){return s.ids?s.ids().length:s.count||0;}
// The sticker index sets the basics pages light. Facelets: 9*face+pos, faces U R F D L B.
const ST_ALL=[0,1,2,3,4,5,6,7,8];
const ST_PIECES={centers:[4],edges:[1,3,5,7],corners:[0,2,6,8]};
function stFaces(pos){const s=new Set();for(let f=0;f<6;f++)for(const p of pos)s.add(9*f+p);return s;}
// The stickers of each face's layer: the face and the row of each face beside it.
const ST_LAYER={U:[[0,ST_ALL],[1,[0,1,2]],[2,[0,1,2]],[4,[0,1,2]],[5,[0,1,2]]],D:[[3,ST_ALL],[1,[6,7,8]],[2,[6,7,8]],[4,[6,7,8]],[5,[6,7,8]]],
  F:[[2,ST_ALL],[0,[6,7,8]],[1,[0,3,6]],[3,[0,1,2]],[4,[2,5,8]]],B:[[5,ST_ALL],[0,[0,1,2]],[1,[2,5,8]],[3,[6,7,8]],[4,[0,3,6]]],
  R:[[1,ST_ALL],[0,[2,5,8]],[2,[2,5,8]],[3,[2,5,8]],[5,[0,3,6]]],L:[[4,ST_ALL],[0,[0,3,6]],[2,[0,3,6]],[3,[0,3,6]],[5,[2,5,8]]]};
function stLayer(f){const s=new Set();for(const [face,pos] of ST_LAYER[f])for(const p of pos)s.add(9*face+p);return s;}
const ST_MOVE_WORDS={
  U:['Up','Turn the top face to the left.','Turn the top face to the right.'],
  D:['Down','Turn the bottom face to the right.','Turn the bottom face to the left.'],
  F:['Front','Turn the front face clockwise, like a wheel.','Turn the front face counterclockwise.'],
  B:['Back','Turn the back face. Clockwise as seen from behind.','Turn the back face the other way.'],
  R:['Right','Turn the right face up, away from you.','Turn the right face down, toward you.'],
  L:['Left','Turn the left face down, toward you.','Turn the left face up, away from you.']};
// A turn in words, with no letter: "Right face, clockwise". The keys page shows it, and a level 2
// user has not met the letters.
function stMoveSay(m){const w=ST_MOVE_WORDS[m[0]];if(!w)return m;return `${w[0]} face, ${/['′]/.test(m)?'counterclockwise':'clockwise'}`;}
const ST_HIDDEN={D:'The bottom face is hidden. You see its edge.',B:'The back face is hidden. You see its edge.',L:'The left face is hidden. You see its edge.'};
const START={on:false,screen:'level',level:null,src:'mine',kind:null,found:false,face:'R',prime:false,
  check:null,sets:null,caseSet:null,quiz:null,five:null,sc:null,last:'—',way:null};
function startEl(){let el=$('#start');if(el)return el;el=document.createElement('div');el.id='start';el.className='start hidden';
  el.setAttribute('role','region');el.setAttribute('aria-label','Getting started');$('header.top').after(el);return el;}
function startIsOpen(){return START.on;}
function startOpen(screen){START.on=true;document.body.classList.add('starting');
  if(typeof closeMethodPop==='function')closeMethodPop();if(typeof cubePopClose==='function')cubePopClose();
  startEl().classList.remove('hidden');startGo(screen||'level');if(window.scrollTo)try{window.scrollTo(0,0);}catch(e){}}
function startClose(){START.on=false;document.body.classList.remove('starting');const el=startEl();el.classList.add('hidden');el.textContent='';
  if(SCREEN.active&&SCREEN.active===START.sc)SCREEN.active=null;START.sc=null;if(typeof cubeScreenWire==='function')cubeScreenWire();}
function startGo(screen){START.screen=screen;startDraw();const h=$('#start h1');if(h){h.setAttribute('tabindex','-1');try{h.focus({preventScroll:true});}catch(e){}}}
// The end of a track: the level, the cube source, the method and the section.
function startFinish(m,tab,after){if(START.level)store.set('level',START.level);if(START.src&&typeof setCubeSrc==='function')setCubeSrc(START.src);
  startClose();setMethod(m,{force:true});if(tab)goTab(tab);
  // The screen cube starts mixed up, in the player (a beginner sees it at once, not the question).
  if(START.src==='screen'&&!after){newScramble();if(isBeg()&&typeof showBegLetters==='function')showBegLetters();}
  if(after)after();
  document.dispatchEvent(new CustomEvent('cw:level',{detail:START.level}));}
// Statuses: '' (not started), 'learning', 'finished' in the one map, llState.status.
function startMark(ids,v){for(const id of ids){if(v)llState.status[id]=v;else delete llState.status[id];}
  store.set('llStatus',llState.status);if(typeof saveLL==='function')saveLL();
  try{renderLLGroups();renderF2LGrid();renderCaseStats();}catch(e){}
  document.dispatchEvent(new CustomEvent('cw:status',{detail:ids[0]||''}));}
function startKnown(){return store.get('known',{});}
function startSetKnown(id,v){const k=startKnown();k[id]=v;store.set('known',k);}
// Pictures.
function stPic(cube,fade,label){return `<svg viewBox="0 0 400 370" role="img" aria-label="${esc(label||'A cube')}">${renderCube3D((cube||new Cube()).toFacelets(),{yaw:-32,pitch:28,scale:46,n:3,fade:fade||null})}</svg>`;}
function stBars(n){return LEVEL_COLORS.map((c,i)=>`<i class="lvbar${i<n?'':' off'}" style="--sec:var(--sticker-${c})"></i>`).join('');}
function stBar(crumb,right){return `<div class="st-bar"><span class="st-crumb">Getting started${crumb?' · '+esc(crumb):''}</span><span class="spacer"></span>${right||''}</div>`;}
function stBack(to,label){return `<button class="st-link" data-go="${to}" title="${esc(label||'Back')}">${esc(label||'← Back')}</button>`;}
function stSources(note){const notes={mine:'Scan or paint it later, from the cube chip.',smart:'The browser asks to connect next.',screen:'Keys turn it. A drag turns the whole cube.'};
  const order=['mine','smart','screen'].map(id=>CUBE_SRCS.find(s=>s.id===id));
  return `<div class="st-srcs"><span class="st-lbl">Your cube</span><div class="st-seg" role="group" aria-label="Cube source">${order.map(s=>`<button data-src="${s.id}" aria-pressed="${START.src===s.id}" title="${esc(s.tip)}"><i class="cdot" data-src="${s.id}"></i>${esc(s.name)}</button>`).join('')}</div>${note===false?'':`<span class="muted">${esc((notes[START.src]||'')+' Change it any time in the top bar.')}</span>`}</div>`;}
// The nine beginner steps by short name: Basics, The daisy, White cross ...
function stSteps(){return BEGINNER_STEPS.map(s=>s.n===0?'Basics':s.name.replace(/^The (white|yellow|middle)/,(_,w)=>w[0].toUpperCase()+w.slice(1)));}
function stStepStatus(n){return llState.status['beg-'+n]||'';}
const START_SCREENS={};
// ---------- 0 · the level ----------
START_SCREENS.level=()=>{const first=store.get('level',null)==null;
  return `${stBar('',first?'':`<button class="st-link" data-close="1" title="Back to the page">Close</button>`)}
  <div class="st-center"><div class="st-head"><h1>What's your cube level?</h1><p>Pick one. We start you in the right place. You can change it later.</p></div>
  <div class="st-levels">${LEVELS.map(l=>`<button class="st-level" data-level="${l.n}" title="${esc(l.tip)}"><span class="lvbars" aria-hidden="true">${stBars(l.n)}</span><b>${esc(l.name)}</b><span class="muted">${esc(l.sub)}</span><span class="st-goes">${esc(l.goes)}</span></button>`).join('')}</div>
  <p class="muted st-small">Your times and history stay on this device.</p>
  <p class="st-small"><button class="st-link" data-paste="1" title="Paste the data that you copied in another browser with Settings &gt; Copy my data">Used Twistwright in another browser? Paste my data</button> · <button class="st-link" data-close="1" title="Close this and look at the whole site">Skip: look around first</button></p></div>`;};
// ---------- Track 1 · never touched one ----------
// The basics come first: no question about a cube, and no move letter before the moves page.
// The picture is the cube for these pages (a drag looks around it); the cube question follows
// the basics (t2-cube).
function stBasicsBar(n){return stBar('Basics',`<span class="st-dots" aria-label="Part ${n} of 4">${[1,2,3,4].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`);}
function stCubeSide(){return `<div class="st-pic"><div class="st-cube" id="stCube"></div><span class="muted st-small" id="stCap"></span></div>`;}
START_SCREENS['t1-what']=()=>`${stBasicsBar(1)}
  <div class="st-split"><div class="st-text"><span class="st-lbl">Basics · 1 of 4</span><h1>Meet the cube</h1><p>The cube is a puzzle. It has six faces. Each face has nine stickers.</p>
    <ul class="st-rules"><li><b>Solved</b>: each face is one color. The six colors are white, yellow, green, blue, red and orange.</li><li><b>A turn</b>: each face can turn. A turn moves stickers onto the faces next to it.</li><li><b>The puzzle</b>: many turns mix up the colors. You bring each face back to one color.</li></ul>
    <div class="st-box st-say"><span>See one face turn, then turn back.</span><button class="small" data-demo="1" title="Turn one face on the picture, then turn it back">Show me a turn</button></div>
    <p class="muted">No cube yet? That is fine. The picture is your cube on these pages. After the basics, you pick a real cube or a cube on the screen.</p>
    <div class="st-foot">${stBack('level','← Change my level')}<span class="spacer"></span><button class="primary" data-go="t1-hold" title="Go on to how to hold it">Next: how to hold it →</button></div></div>
  ${stCubeSide()}</div>`;
// The screen cube's keys: after the basics for level 1, after the cube question for level 2.
// The last turn is in words (stMoveSay): a level 2 user has not met the letters.
START_SCREENS['t1-keys']=()=>{const k=screenKeys(SCREEN.layout);const key=(f,word,tip)=>`<button class="st-key" data-turn="${f}" title="${esc(tip)}"><b>${esc(k[f])}</b><span>${word}</span></button>`;
  return `${stBar('Your screen cube',stBack('t2-cube'))}
  <div class="st-split"><div class="st-pic"><div class="st-cube" id="stCube"></div><span class="muted st-small">Drag to look around. Double-click to put it back.</span><span class="st-small">Last turn: <b id="stLast">${esc(START.last)}</b></span></div>
  <div class="st-text"><h1>Meet your screen cube</h1><p class="st-kbd">Six keys turn the six faces. Rest your hand on them. The middle key turns the face toward you.</p><p class="st-touch">The six buttons under the cube turn the six faces, clockwise.</p>
    <div class="st-keys st-kbd" aria-label="The six keys"><i></i>${key('U','Up','Turn the top face')}${key('B','Back','Turn the back face')}${key('L','Left','Turn the left face')}${key('F','Front','Turn the front face')}${key('R','Right','Turn the right face')}<i></i>${key('D','Down','Turn the bottom face')}<i></i></div>
    <ul class="st-rules"><li class="st-kbd"><b>Key alone</b>: the face turns clockwise.</li><li class="st-kbd"><b>Shift + key</b>: it turns the other way.</li><li><b>Drag</b>: the whole cube turns. No face moves.</li></ul>
    <div class="st-kbd"><div class="st-lbl">Keys for your keyboard</div><div class="row st-layouts">${Object.entries(SCREEN_KEYMAPS).map(([id,m])=>`<button class="small${id===SCREEN.layout?' on':''}" data-layout="${id}" aria-pressed="${id===SCREEN.layout}" title="Use these keys">${esc(m.name)}</button>`).join('')}</div></div>
    <div class="st-foot"><span class="st-kbd">Try it: press <b class="mono">${esc(k.F)}</b>, then <b class="mono">Shift+${esc(k.F)}</b>.</span><span class="spacer"></span><button class="primary" data-go="t2-screen" title="Go on">Next: a mixed-up screen cube →</button></div></div></div>`;};
START_SCREENS['t1-hold']=()=>`${stBasicsBar(2)}
  <div class="st-split"><div class="st-text"><span class="st-lbl">Basics · 2 of 4</span><h1>Hold it like this</h1><p>Each face has one center sticker. The centers never move. They give each face its color.</p>
    <label class="st-check" title="Check this when white is on top"><input type="checkbox"> <span><b>White center on top.</b> <span class="muted">The picture shows it this way.</span></span></label>
    <label class="st-check" title="Check this when green faces you"><input type="checkbox"> <span><b>Green center toward you.</b> <span class="muted">Red is then on your right.</span></span></label>
    <p class="muted">Opposite faces: white and yellow, green and blue, red and orange. Have a cube? Hold yours the same way.</p>
    <div class="st-foot">${stBack('t1-what')}<span class="spacer"></span><button class="primary" data-go="t1-pieces" title="Go on to the pieces">I see it →</button></div></div>
  ${stCubeSide()}</div>`;
// The pieces: a kind lifts its pieces out of the picture and puts them back (screenCube's bump).
// Find it is a click on the picture: the white and green edge brings up the callout.
const ST_KIND_SAY={centers:'A center never moves. It names its face.',edges:'An edge sits between two centers. It has two colors.',corners:'A corner sits where three faces meet. It has three colors.',
  find:'Top face, the row nearest you. Drag to see it from the side.',none:'Pick a kind, or click a piece on the picture.'};
const ST_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
// The faces a sticker's piece touches, U R F D L B: one for a center, two for an edge, three for a corner.
function stPieceFaces(idx){const g=FACE_GEOM[Math.floor(idx/9)],p=idx%9;const c=[0,1,2].map(t=>g.n[t]+g.r[t]*(p%3-1)+g.d[t]*(Math.floor(p/3)-1));
  return [0,1,2,3,4,5].filter(f=>FACE_GEOM[f].n.every((v,t)=>!v||v===c[t]));}
function stColorList(faces){const n=faces.map(f=>ST_COLOR_NAMES[f]);return n.length<3?n.join(' and '):n.slice(0,-1).join(', ')+' and '+n[n.length-1];}
const ST_FIND=7; // the white and green edge: U 7, F 1 on a solved cube
function stFoundCallout(){return `<div class="st-callout" id="stFound" role="status"><b>You found it!</b><span>The white and green edge. Its colors match the white center and the green center.</span><button class="primary small" data-go="t1-moves" title="Go on to the moves">Next: the six moves →</button></div>`;}
function stPiecesNext(){return START.found?`<button class="primary" data-go="t1-moves" title="Go on to the moves">Next: the six moves →</button>`:`<button data-go="t1-moves" data-skip="1" title="Go on to the moves without the puzzle">Skip →</button>`;}
START_SCREENS['t1-pieces']=()=>{const info={centers:['Centers','6 · one color','Lift out the centers'],edges:['Edges','12 · two colors','Lift out the edges'],corners:['Corners','8 · three colors','Lift out the corners']};
  return `${stBasicsBar(3)}
  <div class="st-split"><div class="st-text"><span class="st-lbl">Basics · 3 of 4</span><h1>Three kinds of pieces</h1><p>Pick a kind. Those pieces lift out of the picture, then go back. Drag the picture to look around.</p>
    <div class="st-kinds">${Object.entries(info).map(([k,[n,s,t]])=>`<button class="st-kind" data-kind="${k}" aria-pressed="${START.kind===k}" title="${t}"><b>${n}</b><span class="muted">${s}</span></button>`).join('')}</div>
    <div class="st-box st-find"><span class="st-lbl">Find it</span><span>Find and click on the <b>white and green edge</b>. It sits between the white center and the green center.</span><span class="st-small" id="stFindSay" aria-live="polite"></span><button class="small" data-hint="1" title="Lift this piece out of the picture">Show me</button></div>
    <div class="st-foot">${stBack('t1-hold')}<span class="spacer"></span><span id="stPiecesNext">${stPiecesNext()}</span></div></div>
  <div class="st-pic"><div class="st-cubewrap"><div class="st-cube" id="stCube"></div>${START.found?stFoundCallout():''}</div><span class="muted st-small" id="stCap"></span></div></div>`;};
// A click on the picture of the pieces page: the edge to find, or what was clicked and a try again.
function stPick(idx){if(START.found)return;const faces=stPieceFaces(idx),say=$('#stFindSay');
  if(faces.length===2&&faces.includes(0)&&faces.includes(2)){stFound();return;}
  if(START.sc)START.sc.bump(new Set([idx]),{up:300,hold:500,down:360});
  const kind=['center','edge','corner'][faces.length-1];
  if(say)say.textContent=`That is the ${stColorList(faces)} ${kind}. ${faces.length===2?'Look for white and green.':'An edge has two colors.'} Try again.`;}
function stFound(){START.found=true;if(START.sc)START.sc.bump(new Set([ST_FIND]),{stay:true});
  const say=$('#stFindSay');if(say)say.textContent='';const c=$('#stCap');if(c)c.textContent=ST_KIND_SAY.find;
  START.kind=null;document.querySelectorAll('#start .st-kind').forEach(x=>x.setAttribute('aria-pressed','false'));
  const wrap=$('#start .st-cubewrap');if(wrap&&!$('#stFound'))wrap.insertAdjacentHTML('beforeend',stFoundCallout());
  const nx=$('#stPiecesNext');if(nx)nx.innerHTML=stPiecesNext();
  document.querySelectorAll('#start [data-go="t1-moves"]').forEach(b=>b.onclick=()=>startGo('t1-moves'));
  const b=$('#stFound button');if(b)try{b.focus({preventScroll:true});}catch(e){}}
// The moves page is where the letters come in: the face names first, then one letter for each.
// Level 2 has a short one before the cube question: it can turn a cube, but may not know the letters.
function stMovesPage(short){const f=START.face,p=START.prime;const w=ST_MOVE_WORDS[f];
  const doIt=w[p?2:1]+` Then ${p?f:f+'′'} turns it back.`;
  const intro=short?`<p>The lessons write each move as a letter: <b class="mono">U D F B R L</b>. They are up (the top), down, front, back, right and left, as you hold the cube: white on top, green toward you.</p>`
    :`<p>Each face has a name, as you hold the cube: up (the top), down (the bottom), front, back, right and left. The guide writes each one as its first letter: <b class="mono">U D F B R L</b>.</p>`;
  const foot=short?`${stBack('level','← Change my level')}<span class="spacer"></span><button class="primary" data-go="t2-cube" title="Pick the cube to learn with">I know the six moves →</button>`
    :`${stBack('t1-pieces')}<span class="spacer"></span><button class="primary" data-go="t1-done" title="Finish the basics">I know the six moves →</button>`;
  return `${short?stBar('Before you start'):stBasicsBar(4)}
  <div class="st-split"><div class="st-text"><span class="st-lbl">${short?'Before you start':'Basics · 4 of 4'}</span><h1>The six moves</h1>${intro}
    <p>The letter alone turns that face clockwise, as you look straight at that face. A <b>′</b> after the letter turns it the other way.</p>
    <div class="row st-moves">${['U','D','F','B','R','L'].map(x=>`<button class="st-move${p?' prime':''}" data-face="${x}" aria-pressed="${x===f}" title="${ST_MOVE_WORDS[x][0]} face">${x}${p?'′':''}</button>`).join('')}<button class="st-move st-prime" data-prime="1" aria-pressed="${p}" title="Turn the other way">′ other way</button></div>
    <div class="st-box st-say"><span><b class="mono${p?' mod':''}">${f}${p?'′':''}</b> · ${w[0]}</span><span>${esc(doIt)}</span><button class="small" data-show="1" title="Turn the layer on the picture, then back">Show me</button></div>
    <div class="st-foot">${foot}</div></div>
  ${stCubeSide()}</div>`;}
START_SCREENS['t1-moves']=()=>stMovesPage(false);
START_SCREENS['t2-moves']=()=>stMovesPage(true);

START_SCREENS['t1-done']=()=>{const names=stSteps();
  return `${stBar('Basics',`<span class="st-dots" aria-label="All four parts finished"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span>`)}
  <div class="st-center"><div class="st-head"><span class="st-tick" aria-hidden="true">✓</span><h1>You know the basics</h1><p>Basics is marked Learned. Next, pick the cube you learn with. Then solve it one step at a time.</p></div>
  <div class="st-donelist"><span>✓ What the cube is</span><span>✓ How to hold it</span><span>✓ Centers, edges, corners</span><span>✓ The six moves</span></div>
  <div class="st-box"><div class="row" style="justify-content:space-between"><b>The beginner method</b><span class="muted">1 of 9 learned</span></div>
    <div class="st-steps">${names.map((n,i)=>`<span class="st-step${i===0?' on':''}">${i===0?'✓ ':''}${esc(n)}</span>`).join('')}</div></div>
  <div class="st-foot">${stBack('t1-moves')}<span class="spacer"></span><button class="primary" data-go="t2-cube" title="Pick the cube to learn with">Next: pick your cube →</button></div></div>`;};
// ---------- Track 2 · played but never solved ----------
START_SCREENS['t2-cube']=()=>{const cards=[
    {id:'mine',name:'My cube',tag:'most people',what:'You turn it by hand. The page shows each step on a picture.',how:'Mixed up already? Scan it with the camera or paint its colors.',note:'Next: scan, paint, or mix it up with me.',cta:'Use my cube →'},
    {id:'smart',name:'Smart cube',tag:'GAN, Bluetooth',what:'The page sees every turn you make. Hints uncover as you turn.',how:'Chrome or Edge connect directly. Safari needs the Mac app.',note:'Next: the browser asks to connect.',cta:'Connect my cube →'},
    {id:'screen',name:'Screen cube',tag:'no cube needed',what:'Six keys turn the faces. Drag with the mouse to turn the whole cube.',how:'On a phone, buttons under the cube turn it.',note:'Next: the keys, then a mixed-up screen cube.',cta:'Use the screen cube →'}];
  const sel=cards.find(c=>c.id===START.src)||cards[0];
  return `${stBar('',stBack(START.level===1?'t1-done':START.level===2?'t2-moves':'level',START.level<=2?'← Back':'← Change my level'))}
  <div class="st-center"><div class="st-head"><h1>Which cube will you use?</h1><p>Every lesson works with all three. Change it at any time from the chip in the top bar.</p></div>
  <div class="st-three">${cards.map(c=>`<button class="st-card st-pick" data-src="${c.id}" aria-pressed="${c.id===sel.id}" title="${esc(cubeSrcName(c.id))}"><span class="row"><i class="cdot" data-src="${c.id}"></i><span class="tag">${esc(c.tag)}</span></span><b>${esc(c.name)}</b><span>${esc(c.what)}</span><span class="muted">${esc(c.how)}</span></button>`).join('')}</div>
  <div class="st-foot"><span class="muted">${esc(sel.note)}</span><span class="spacer"></span><button class="primary" data-t2go="1" title="Go on">${esc(sel.cta)}</button></div></div>`;};
// ---------- Track 3 · have solved it ----------
START_SCREENS['t3-start']=()=>{const ways=[
    {id:'memory',tag:'from memory',name:'With the beginner method',what:'The daisy, then layer by layer. I do not need notes.',next:'Next: check off the steps you know →',go:'t3-check',tip:'Check off the beginner steps'},
    {id:'help',tag:'with help',name:'With a guide open',what:'I follow notes or a video. I forget some steps.',next:'Next: the same check, then review →',go:'t3-check',tip:'Check off the steps, then review the rest'},
    {id:'cfop',tag:'some CFOP',name:'With some CFOP',what:'I know a cross on the bottom, some pairs or some algorithms.',next:'Next: the sets you know →',go:'t4-sets',tip:'Go to the CFOP sets'}];
  return `${stBar('',stBack('level','← Change my level'))}
  <div class="st-center"><div class="st-head"><h1>How do you solve it now?</h1><p>This picks where you start. Nothing is locked.</p></div>
  <div class="st-three">${ways.map(w=>`<button class="st-card" data-way="${w.id}" data-to="${w.go}" title="${esc(w.tip)}"><span class="tag">${esc(w.tag)}</span><b>${esc(w.name)}</b><span class="muted">${esc(w.what)}</span><span class="st-goes">${esc(w.next)}</span></button>`).join('')}</div>
  ${stSources()}</div>`;};
START_SCREENS['t3-check']=()=>{const names=stSteps(),labels=['Not yet','Shaky','Can do it'],st=['Not started','Learning','Learned'];
  if(!START.check)START.check=names.map((_,i)=>{const s=stStepStatus(i);return s==='finished'?2:s==='learning'?1:START.way==='memory'||i===0?2:0;});
  const m=START.check,learned=m.filter(v=>v===2).length,rest=9-learned;
  return `${stBar('Check',stBack('t3-start'))}
  <div class="st-split st-wide"><div class="st-text"><h1>Which steps can you do without notes?</h1><p class="muted">One tap per step. "Can do it" marks it Learned. "Shaky" marks it Learning.</p>
    <div class="st-rows">${names.map((n,i)=>`<div class="st-row"><span class="mono muted">${i}</span><b>${esc(n)}</b><span class="st-st s${m[i]}">${st[m[i]]}</span><div class="st-seg" role="group" aria-label="${esc(n)}">${labels.map((l,v)=>`<button data-step="${i}" data-v="${v}" aria-pressed="${m[i]===v}" title="${esc(n+': '+l)}">${l}</button>`).join('')}</div></div>`).join('')}</div></div>
  <div class="st-side"><div class="st-box"><span class="st-lbl">So far</span><b class="st-big">${learned} of 9 learned</b><div class="st-strip">${m.map(v=>`<i class="s${v}"></i>`).join('')}</div>
      <span class="muted">${rest===0?'All nine are learned. CFOP is next.':rest+(rest===1?' step is':' steps are')+' still to learn. CFOP is open now. The beginner steps stay in the menu.'}</span></div>
    <div class="st-box"><b>Not sure? Solve one.</b><span class="muted">Mix up your cube and solve it with the timer. Your first time goes on the Progress tab. Optional.</span><button class="st-link" data-check="timer" title="Go to the Scramble tab with the timer">Solve one with the timer →</button></div>
    <button class="primary" data-check="cfop" title="Save the marks and go on">${rest===0?'On to CFOP →':'Save, then on to CFOP →'}</button>
    <button class="st-link" data-check="${rest===0?'home':'review'}" title="Go to the beginner method">${rest===0?'Go to the beginner home':'Review the '+rest+' first'}</button></div></div>`;};
function startSaveCheck(){const v=['','learning','finished'];startMark(START.check.map((_,i)=>'beg-'+i).filter((_,i)=>START.check[i]===2),'finished');
  startMark(START.check.map((_,i)=>'beg-'+i).filter((_,i)=>START.check[i]===1),'learning');
  startMark(START.check.map((_,i)=>'beg-'+i).filter((_,i)=>START.check[i]===0),v[0]);}
START_SCREENS['t3-bridge']=()=>{const rows=[
    ['The daisy','White cross','W','Cross','by feel','All four white edges at once, on the bottom. Eight moves or fewer.'],
    ['White corners','Middle layer','G','F2L','by feel, then 41 cases','A corner and its edge go in together. Four pairs fill the first two layers.'],
    ['Yellow cross','Yellow face','Y','OLL','3 + 7','The top turns all yellow, in two looks.'],
    ['Yellow corners','Yellow edges','Y','PLL','2 + 4','The top pieces go to their places, in two looks.']];
  const path=[['Cross','W','You are here',true],['F2L, by feel','G','Next'],['Two-look OLL and PLL','Y','16 algorithms'],['Full PLL','Y','21'],['Full OLL','Y','57']];
  return `${stBar('CFOP',stBack('t3-check'))}
  <div class="st-center st-left"><div class="st-head"><h1>What you know, in CFOP</h1><p>CFOP solves the same layers, in fewer looks. Each pair of beginner steps becomes one CFOP stage.</p></div>
  <div class="st-split st-wide"><div class="st-bridge">${rows.map(r=>`<div class="st-brow"><span class="st-pair">${esc(r[0])}<br>${esc(r[1])}</span><span aria-hidden="true" class="muted">→</span><span class="st-stage"><b><i class="sec-sq" style="--sec:var(--sticker-${r[2]})"></i>${esc(r[3])} <span class="muted">${esc(r[4])}</span></b><span>${esc(r[5])}</span></span></div>`).join('')}
    <div class="st-box st-note"><b>One change</b><span>The cross goes on the bottom, white side down. You look at it from the side, not the top.</span></div></div>
  <div class="st-side"><div class="st-box"><span class="st-lbl">Your CFOP path</span>${path.map(p=>`<div class="st-path${p[3]?' on':''}"><i class="sec-sq" style="--sec:var(--sticker-${p[1]})"></i>${esc(p[0])}<span class="spacer"></span><span class="muted">${esc(p[2])}</span></div>`).join('')}
    <span class="muted">Solve with the beginner method while you learn. The full sets come last, and are optional.</span></div>
    <button class="primary" data-finish="cross" title="Open the Cross tab with its first lesson">Start with the cross →</button>
    <button class="st-link" data-finish="menu" title="Open the method menu">Every method is in the menu</button></div></div></div>`;};
// ---------- Track 4 · know advanced algorithms ----------
function startSetMark(i){const s=START_SETS[i];if(!s.ids)return (startKnown()[s.id]||0);const ids=s.ids();const n=ids.filter(id=>llState.status[id]==='finished').length;return n===0?0:n===ids.length?2:1;}
START_SCREENS['t4-sets']=()=>{if(!START.sets)START.sets=START_SETS.map((_,i)=>startSetMark(i));const labels=['None','Some','All'];
  const known=START_SETS.reduce((t,s,i)=>{if(s.feel)return t;const v=START.sets[i];if(v===2)return t+startSetCount(s);if(v===1)return t+(s.ids?s.ids().filter(id=>llState.status[id]==='finished').length:Math.round(startSetCount(s)/2));return t;},0);
  return `${stBar('',stBack(START.level===3?'t3-start':'level',START.level===3?'← Back':'← Change my level'))}
  <div class="st-split st-wide"><div class="st-text"><h1>Which CFOP sets do you know?</h1><p class="muted">"All" marks the set Learned. "Some" lets you pick the cases.</p>
    <div class="st-rows">${START_SETS.map((s,i)=>{const v=START.sets[i];const opts=s.feel?[0,2]:[0,1,2];
      return `<div class="st-row"><i class="sec-sq" style="--sec:var(--sticker-${s.sec})"></i><b>${esc(s.name)} <span class="muted mono">${s.feel?'':startSetCount(s)}</span></b>${v===1&&s.ids?`<button class="st-link" data-cases="${i}" title="Pick the cases you know">Pick the cases →</button>`:v===1&&s.note?`<span class="muted st-small">${esc(s.note)}</span>`:'<span></span>'}<div class="st-seg" role="group" aria-label="${esc(s.name)}">${opts.map(o=>`<button data-set="${i}" data-v="${o}" aria-pressed="${v===o}" title="${esc(s.name+': '+labels[o])}">${s.feel&&o===2?'I can':labels[o]}</button>`).join('')}</div></div>`;}).join('')}</div></div>
  <div class="st-side"><div class="st-box"><span class="st-lbl">Marked so far</span><b class="st-big">${known} cases</b><span class="muted">Learned now. A quiz can check them. A wrong answer sets a case back to Learning.</span></div>
    ${stSources(false)}<span class="muted st-small">Later: the cube chip in the top bar.</span>
    <button class="primary" data-sets="quiz" title="A short quiz on the cases you marked">Quiz me on these →</button>
    <button class="st-link" data-sets="skip" title="Go to OLL · PLL now">Skip the quiz</button></div></div>`;};
// Some of a set: the marks go on the cases at once; "All" or "None" then sets the whole set.
function startSaveSets(){START.sets.forEach((v,i)=>{const s=START_SETS[i];if(!s.ids){startSetKnown(s.id,v);return;}
  if(v===2)startMark(s.ids(),'finished');else if(v===0)startMark(s.ids().filter(id=>llState.status[id]),'');});}
// The cases of a set, with a picture and the name.
function startCases(i){const s=START_SETS[i];
  if(s.id==='f2l')return F2L_CASES.map(c=>({id:'f2l-'+c.n,name:'#'+c.n,full:'F2L case '+c.n,alg:c.alg,cube:()=>caseSetupCube(c),pic(){return thumb3D(this.cube());}}));
  if(s.id==='pll')return PLL_FULL.map(p=>({id:'pllf-'+p.name,name:p.name,full:p.name+' perm',alg:p.alg,cube:()=>phys(derotate(applyAlg(new Cube(),invertAlg(p.alg)))),pic(){return thumbTop(this.cube(),'pll');}}));
  const list=s.id==='oll2'?[...ALG_DB.eo,...ALG_DB.co]:[...ALG_DB.cp,...ALG_DB.ep];
  return list.map(a=>({id:a.id,name:a.name,full:a.name,alg:a.alg,cube:()=>caseCube(a),pic(){return thumbTop(this.cube(),modeFor(a.group));}}));}
START_SCREENS['t4-cases']=()=>{const i=START.caseSet,s=START_SETS[i],cs=startCases(i);const lab={'':'Not started',learning:'Learning',finished:'Learned'};
  const n2=cs.filter(c=>llState.status[c.id]==='finished').length,n1=cs.filter(c=>llState.status[c.id]==='learning').length;
  return `${stBar(s.name,`<button class="st-link" data-sets-back="1" title="Back to the sets">← Back to the sets</button>`)}
  <div class="st-center st-left"><div class="st-head"><h1>${esc(s.name)} <span class="muted">${cs.length} cases</span></h1><p class="muted">Tap a case: Not started → Learning → Learned.</p></div>
  <div class="st-cases">${cs.map(c=>{const v=llState.status[c.id]||'';return `<button class="st-case ${v}" data-case="${esc(c.id)}" title="${esc((c.full||c.name)+': '+lab[v]+'. Tap to change.')}">${c.pic()}<b>${esc(c.name)}</b><span>${lab[v]}</span></button>`;}).join('')}</div>
  <div class="st-foot"><button class="small" data-all="finished" title="Mark all ${cs.length} Learned">All learned</button><button class="small ghost" data-all="" title="Mark all ${cs.length} Not started">None</button><span class="muted">${n2} learned · ${n1} learning · ${cs.length-n1-n2} not started</span><span class="spacer"></span><button class="primary" data-sets-back="1" title="Back to the sets">Save →</button></div></div>`;};
// The quiz: up to ten last-layer cases from the ones marked Learned. A miss sets a case back to Learning.
function startQuizNew(){const pool=[];for(const i of [3,4,5]){const all=startCases(i);for(const c of all)if(llState.status[c.id]==='finished')pool.push({...c,set:i,others:all,pic:c.pic,cube:c.cube});}
  for(let k=pool.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[pool[k],pool[j]]=[pool[j],pool[k]];}
  START.quiz={qs:pool.slice(0,10),q:0,picked:null,right:0,missed:[],mode:'name',choices:null,t0:0,ms:null};}
function startQuizChoices(c){const others=c.others.filter(o=>o.id!==c.id).sort(()=>Math.random()-0.5).slice(0,3);return [c,...others].sort(()=>Math.random()-0.5);}
START_SCREENS['t4-quiz']=()=>{if(!START.quiz)startQuizNew();const Q=START.quiz;
  if(!Q.qs.length)return `${stBar('Quiz',stBack('t4-sets','← Back to the sets'))}<div class="st-center"><div class="st-head"><h1>Nothing to quiz yet</h1><p>The quiz asks about last-layer cases you marked Learned: two-look OLL, two-look PLL or the full PLL.</p></div><div class="st-foot">${stBack('t4-sets','← Back to the sets')}<span class="spacer"></span><button class="primary" data-finish="ll" title="Go to OLL · PLL">See what is left to learn →</button></div></div>`;
  const c=Q.qs[Q.q];if(!Q.choices)Q.choices=startQuizChoices(c);const answered=Q.picked!==null;
  let verdict='';if(answered)verdict=Q.picked===c.id?`<span class="good">Right. ${esc(c.full)} stays Learned.</span>`:`<span class="warn">It is ${esc(c.full)}. It goes back to Learning.</span>`;
  const setup=Q.mode==='do'?caseSetupMoves(c.alg).join(' '):'';
  return `${stBar('Quiz',`<button class="st-link" data-finish="ll" title="Stop the quiz and go to OLL · PLL">Stop the quiz</button>`)}
  <div class="st-split st-wide"><div class="st-text"><div class="row" style="justify-content:space-between"><span class="st-lbl">Question ${Q.q+1} of ${Q.qs.length}</span><div class="st-seg" role="group" aria-label="Quiz kind"><button data-mode="name" aria-pressed="${Q.mode==='name'}" title="Name the case">Name it</button><button data-mode="do" aria-pressed="${Q.mode==='do'}" title="Solve the case on your cube, with the timer">Do it</button></div></div>
    <div class="st-quiz"><div class="st-qpic">${thumb3D(c.cube())}<span class="muted st-small">Yellow up, green toward you.</span></div>
    <div class="st-qtext"><h1>${Q.mode==='name'?'Which case is this?':'Solve it from here, with the timer.'}</h1>
    ${Q.mode==='name'?`<div class="st-choices">${Q.choices.map(o=>`<button class="st-choice${answered&&o.id===c.id?' right':''}${answered&&o.id===Q.picked&&o.id!==c.id?' wrong':''}" data-pick="${esc(o.id)}" title="${esc('Answer: '+o.full)}">${esc(o.full)}</button>`).join('')}</div>`
      :`<p>First make these moves on your cube, yellow up, green toward you: <b class="mono">${esc(setup)}</b></p><button class="st-qtimer" data-qtimer="1" title="Start and stop the time. Space works too">${Q.ms!=null?fmt(Q.ms):Q.t0?'…':'0.00'}</button><p class="muted st-small">Space starts and Space stops.</p>`}
    <p>${verdict}</p>
    <div class="row">${Q.mode==='do'&&!answered?`<button class="small" data-pick="${esc(c.id)}" title="I solved it">I solved it</button>`:''}<button class="small ghost" data-dunno="1" title="I do not know this one"${answered?' disabled':''}>I don't know it</button><span class="spacer"></span><button class="primary" data-next="1" title="The next case"${answered?'':' disabled'}>${Q.q+1<Q.qs.length?'Next case →':'Finish'}</button></div></div></div></div>
  <div class="st-side"><div class="st-box"><span class="st-lbl">Score</span><b class="st-big">${Q.right} of ${Q.q+(answered?1:0)} right</b><span class="muted">${Q.missed.length?'Back to Learning: '+esc(Q.missed.join(', '))+'.':'No case is back to Learning yet.'}</span></div>
    <div class="st-box"><b>How it picks</b><span class="muted">Up to ten cases from the ones you marked. A case you miss goes back to Learning. Nothing is lost: change it later on any case.</span></div>
    <button class="st-link" data-finish="ll" title="Go to OLL · PLL">See what is left to learn →</button></div></div>`;};
// ---------- Track 5 · already a speedcuber ----------
START_SCREENS['t5-setup']=()=>{if(!START.five)START.five={all:true,insp:store.get('insp',true),hide:store.get('hideTime',false),rs:true};const F=START.five;
  const notes={mine:'Space starts and stops the timer. Total time only.',smart:'A smart cube connects next. The live view is on the Smart cube tab.',screen:'Keys turn it. Good for practice, not for times you compare.'};
  const sw=(k,label,tip)=>`<button class="st-switch" data-five="${k}" aria-pressed="${!!F[k]}" title="${esc(tip)}"><i aria-hidden="true"></i>${esc(label)}</button>`;
  return `${stBar('',stBack('level','← Change my level'))}
  <div class="st-center st-left"><div class="st-head"><h1>Set up, then time.</h1><p class="muted">Four choices. The timer ones are in Settings later.</p></div>
  <div class="st-grid2"><div class="st-box"><span class="st-lbl">1 · Your cube</span>${stSources(false)}<span class="muted">${esc(notes[START.src]||'')}</span></div>
    <div class="st-box"><span class="st-lbl">2 · What you know</span>${sw('all','Full CFOP: every case Learned','Mark every CFOP case Learned')}<button class="st-link" data-go="t4-sets" title="Pick the sets you know">Not all of it? Pick the sets →</button></div>
    <div class="st-box"><span class="st-lbl">3 · The timer</span>${sw('insp','15 s inspection','Inspection before each solve')}${sw('hide','Hide the time while I solve','Show only the final time')}${sw('rs','Random-state scrambles','Scrambles from a random state, as in competition')}</div>
    <div class="st-box"><span class="st-lbl">4 · Bring your times <span class="tag">new idea</span></span><span class="muted">Paste a csTimer export. Your averages and best start from there, not from zero.</span><button class="small" disabled title="Not built yet">Paste an export (not built yet)</button></div></div>
  <div class="st-foot"><span class="muted">2×2 Speed and 4×4 Advanced are in the menu.</span><span class="spacer"></span><button class="primary" data-finish="timer" title="Go to the Scramble tab with the timer">Go to the timer →</button></div></div>`;};
function startSaveFive(){const F=START.five;store.set('insp',F.insp);$('#inspChk').checked=F.insp;store.set('hideTime',F.hide);
  $('#scrLen').value=F.rs?'rs':String(SCR_LENS[3][1]);
  if(F.all){for(const i of [2,3,4,5])startMark(START_SETS[i].ids(),'finished');startSetKnown('cross',2);startSetKnown('f2lfeel',2);startSetKnown('oll',2);}
  store.set('timerHome',true);}
// t2-screen: the end of the keys page for level 2 with the screen cube.
START_SCREENS['t2-screen']=()=>{setTimeout(()=>startFinish('beginner','learn'),0);return '';};
// ---------- drawing and the clicks ----------
function startDraw(){const el=startEl();const f=START_SCREENS[START.screen]||START_SCREENS.level;
  el.dataset.screen=START.screen;el.innerHTML=f();startWire(el);}
function startCubeMount(){const box=$('#stCube');if(!box)return;const scr0=START.screen;
  let fade=null,cap='';
  if(scr0==='t1-what')cap='Drag to look around the cube. Double-click to put it back.';
  if(scr0==='t1-hold'){fade=stFaces([4]);cap='Drag to look at the other faces. Double-click and it comes back to white on top, green toward you.';}
  if(scr0==='t1-pieces')cap=ST_KIND_SAY[START.found?'find':START.kind||'none'];
  if(scr0==='t1-moves'||scr0==='t2-moves'){fade=stLayer(START.face);cap=ST_HIDDEN[START.face]||'The lit stickers move with '+START.face+'.';}
  // Only the keys page takes the keys: the basics come before the cube question.
  const keys=scr0==='t1-keys';
  // The screen cube keeps its state from page to page; a lit page shows it solved.
  const prev=START.sc,cube=prev&&scr0==='t1-keys'?prev.cube:new Cube();
  START.sc=screenCube(box,{cube,fade,keys,label:'The screen cube',onPick:scr0==='t1-pieces'?stPick:null,onMove:m=>{START.last=stMoveSay(m);const l=$('#stLast');if(l)l.textContent=START.last;}});
  if(!keys&&SCREEN.active===START.sc)SCREEN.active=null;
  const c=$('#stCap');if(c)c.textContent=cap;
  if(scr0==='t1-pieces'&&START.found)START.sc.bump(new Set([ST_FIND]),{stay:true});
  // On a touch screen there are no keys: six buttons under the cube turn it.
  if(keys&&typeof matchMedia==='function'&&matchMedia('(hover: none)').matches){const pad=document.createElement('div');pad.className='st-pad';
    pad.innerHTML=['U','D','F','B','R','L'].map(f=>`<button class="small" data-pad="${f}" title="Turn the ${ST_MOVE_WORDS[f][0].toLowerCase()} face">${ST_MOVE_WORDS[f][0]}</button>`).join('');box.after(pad);
    pad.querySelectorAll('[data-pad]').forEach(b=>b.onclick=()=>START.sc.turn(b.dataset.pad));}
}
function startWire(el){
  startCubeMount();
  const on=(sel,fn)=>el.querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
  // The basics are Learned once the last page is passed, before the cube question.
  on('[data-go]',b=>{if(b.dataset.go==='t1-done')startMark(['beg-0'],'finished');startGo(b.dataset.go);});
  on('[data-close]',()=>startClose());
  on('[data-paste]',()=>{startClose();openSettings('data');});
  on('[data-level]',b=>{const l=LEVELS[+b.dataset.level-1];START.level=l.n;START.found=false;START.kind=null;START.check=null;START.sets=null;START.quiz=null;START.five=null;startGo(l.first);});
  on('[data-layout]',b=>{screenSetLayout(b.dataset.layout);startDraw();});
  on('.st-keys [data-turn]',b=>START.sc&&START.sc.turn(b.dataset.turn));
  on('.st-seg [data-src],.st-pick[data-src]',b=>{START.src=b.dataset.src;startDraw();});
  // A kind or the hint lifts pieces out and back. The page is not drawn again, so the view stays.
  on('[data-kind]',b=>{const k=b.dataset.kind;START.kind=k;el.querySelectorAll('.st-kind').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const c=$('#stCap');if(c)c.textContent=ST_KIND_SAY[k];if(START.sc)START.sc.bump(stFaces(ST_PIECES[k]));});
  on('[data-hint]',()=>{const c=$('#stCap');if(c)c.textContent=ST_KIND_SAY.find;if(START.sc)START.sc.bump(new Set([ST_FIND]),{stay:START.found});});
  on('[data-face]',b=>{START.face=b.dataset.face;startDraw();});
  on('[data-prime]',()=>{START.prime=!START.prime;startDraw();});
  on('[data-demo]',()=>{const sc=START.sc;if(!sc)return;sc.turn('R');setTimeout(()=>{if(START.sc===sc)sc.turn("R'");},900);});
  on('[data-show]',()=>{const sc=START.sc;if(!sc)return;const m=START.face+(START.prime?"'":'');sc.turn(m);setTimeout(()=>{if(START.sc===sc)sc.turn(invertAlg([m])[0]);},900);});
  on('[data-finish]',b=>startEnd(b.dataset.finish));
  on('[data-t2go]',()=>{if(START.src==='screen')startGo('t1-keys');else if(START.src==='smart')startFinish('beginner','learn',()=>openSmart());else startFinish('beginner','learn');});
  on('[data-way]',b=>{START.way=b.dataset.way;START.check=null;startGo(b.dataset.to);});
  on('[data-step]',b=>{START.check[+b.dataset.step]=+b.dataset.v;startDraw();});
  on('[data-check]',b=>{const a=b.dataset.check;startSaveCheck();if(a==='cfop')startGo('t3-bridge');else if(a==='timer')startFinish('cfop','solve');else startFinish('beginner','learn');});
  on('[data-set]',b=>{START.sets[+b.dataset.set]=+b.dataset.v;startDraw();});
  on('[data-cases]',b=>{START.caseSet=+b.dataset.cases;startGo('t4-cases');});
  on('[data-case]',b=>{const id=b.dataset.case,cur=llState.status[id]||'';startMark([id],LL_ORDER[(LL_ORDER.indexOf(cur)+1)%3]);startDraw();});
  on('[data-all]',b=>{startMark(startCases(START.caseSet).map(c=>c.id),b.dataset.all);startDraw();});
  on('[data-sets-back]',()=>{START.sets[START.caseSet]=startSetMark(START.caseSet);startGo('t4-sets');});
  on('[data-sets]',b=>{startSaveSets();if(b.dataset.sets==='quiz'){START.quiz=null;startGo('t4-quiz');}else startEnd('ll');});
  on('[data-mode]',b=>{START.quiz.mode=b.dataset.mode;startDraw();});
  on('[data-pick]',b=>startQuizPick(b.dataset.pick));
  on('[data-dunno]',()=>startQuizPick('?'));
  on('[data-next]',()=>{const Q=START.quiz;if(Q.q+1>=Q.qs.length){startEnd('ll');return;}Q.q++;Q.picked=null;Q.choices=null;Q.t0=0;Q.ms=null;startDraw();});
  on('[data-qtimer]',()=>startQuizTimer());
  on('[data-five]',b=>{const k=b.dataset.five;START.five[k]=!START.five[k];startDraw();});
}
function startQuizPick(id){const Q=START.quiz;if(Q.picked!==null)return;const c=Q.qs[Q.q];Q.picked=id;
  if(id===c.id)Q.right++;else{Q.missed.push(c.name);startMark([c.id],'learning');}startDraw();}
function startQuizTimer(){const Q=START.quiz;if(!Q||Q.mode!=='do')return;
  if(!Q.t0){Q.t0=performance.now();Q.ms=null;startDraw();return;}Q.ms=performance.now()-Q.t0;Q.t0=0;startDraw();}
// Where each track lands.
function startEnd(where){
  if(where==='beg'){START.level=START.level||1;startMark(['beg-0'],'finished');startFinish('beginner','learn');return;}
  if(where==='cross'){startFinish('cfop','cross',()=>{store.set('crossLesson',0);if(typeof crossLessonShow==='function')crossLessonShow(0);});return;}
  if(where==='menu'){startFinish('cfop','solve',()=>setTimeout(openMethodPop,50));return;}
  if(where==='ll'){startFinish('cfop','ll',()=>{if(typeof llShowSet==='function')llShowSet('left');});return;}
  if(where==='timer'){startSaveFive();startFinish('cfop','solve',()=>{if(START.src==='smart')openSmart();if(typeof timerHomeApply==='function')timerHomeApply();});return;}
}
// The keys while the pages are open: the screen cube takes its six (js/screencube.js runs first),
// Space runs the quiz timer, and the site's own keys wait.
// Only the keys aimed at the pages (the focus in #start; the pages put it on their heading).
document.addEventListener('keydown',e=>{if(!START.on||document.querySelector('.modal-bg'))return;const t=e.target;if(!t||!t.closest||!t.closest('#start'))return;if(t.tagName==='INPUT'||t.tagName==='TEXTAREA')return;
  if(e.code==='Space'&&START.screen==='t4-quiz'&&START.quiz&&START.quiz.mode==='do'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)startQuizTimer();return;}
  if(e.key==='Escape'){if(store.get('level',null)!=null&&START.screen==='level'&&!document.querySelector('.modal-bg'))startClose();return;} // Escape still closes a dialog
  e.stopImmediatePropagation();},true); // no preventDefault: Tab, Enter and Space still work on the buttons
document.addEventListener('keyup',e=>{const t=e.target;if(START.on&&!document.querySelector('.modal-bg')&&t&&t.closest&&t.closest('#start'))e.stopImmediatePropagation();},true);
