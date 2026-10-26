// ================= The smart cube tab =================
// The Smart cube tab on the CFOP rail (tab 7) shows a smart cube live, large, in the main panel:
// each turn of the real cube turns the layer on the screen. With no cube connected the tab offers
// Connect, which opens the chooser at once (the browser's own, or the list over the bridge, on
// the tab): no dialog comes between. The connect itself is in smart-ui.js (smartConnect).
// From 1.39.0 the tab connects as the lab does: when it opens with no cube, it looks for one with
// no click (smartAuto). Over the bridge the list comes up at once; a cube connected before
// (cw:labCubes, the lab's map) is taken as soon as it is heard, and with Web Bluetooth one the
// page was once allowed (getDevices) is taken when it advertises. The look ends when the user
// leaves the tab. When a cube connects from the dialog, the page goes to the tab, so the live
// cube is there when the dialog closes; a cube that connects by itself does not move the page.
// Disconnect in the dialog puts the Connect card back. When the link drops by itself (the cube
// went to sleep), the panel stays, dimmed, and the page looks for the cube again by itself,
// wherever the user is; Connect again opens the chooser. What the look says shows on the Connect
// card, or in the note of the dimmed panel (`look`, from the cw:smart 'look' event). The rail
// button carries a dot: green while the cube is live, orange while it is held unlike the hold,
// gray while the link is down.
// Versions 1.4 to 1.33 put the cube in the top bar, as a tab that opened a floating window. 1.35
// made it this tab: the picture is big, and every control sits beside it, in view. The reference
// card (smart-card.js) is the one floating window left: a case said to the tab opens it.
// The dialog reports every change of the link as a cw:smart event (smart-ui.js); nothing here
// reaches into the dialog. All markup is fixed text in index.html; the cube's name goes in as text.
// The charge (`battery`, from the link and each battery event) shows after the name in the head
// of the panel, as the dialog shows it (smartBatteryDraw); it goes while the link is down.
// `shown` is the cube the picture is on (or turns toward), `queue` the moves still to turn, and
// `target` the cube at the end of the queue: the real cube, as far as the page knows.
// `moves` is every move since the cube connected, merged as they come (cubeTabMerge): R then R is
// R2, R then R' is nothing, so a turn back takes its move off the list. The readout beside the
// picture shows the last CUBE_TAB_SHOWN of them; a triangle after them says there are more.
// Clear moves empties the list.
// The hold: the cube names its faces its own way (its white face is U however it sits), and the
// panel shows it as the user holds it. Six buttons under the picture turn the whole cube: x, y, z
// and their primes (cubeTabTurn). A press turns the picture (`q` is the turn of the body the
// picture shows, `qTo` the one it turns toward, in the frame of draw.js), puts the turn on the
// list, and sets the hold (`hold`, one of the 24 CUBE_TAB_HOLDS, null for white up, green front).
// The moves then read as held (cubeTabRelabel): held white down (z2), the cube's R is the user's L.
// Versions 1.6 to 1.9 took the hold from the cube's tilt reading; it twitched between holds and
// put turns on the list that the user had not made, so the buttons replaced it (1.10.0).
// The tilt: a gen 2 or gen 4 cube reports its tilt many times a second (a gyro message, `q` in
// gan.js). From 1.11.0 the tilt drives the picture only (cubeTabGyro): the picture turns as the
// cube turns in the hands, a little closer each frame, and the hold stays with the buttons. The
// cube knows which way is up (gravity) but not which way the user faces, so a heading (`basis`,
// a turn about the vertical) lines the reading up with the hold (cubeTabYawBasis); the first
// reading sets it, and so do Reset view (a button beside Clear moves, shown while the tilt is
// live: hold the cube as the moves read, then press) and Keep this hold. Nothing lines the
// heading up on its own: 1.11.0 did so until the first layer turn, and a y turn of the cube
// before then showed as the picture turned back the other way.
// The warning: the hold the tilt sits in (`away`, the nearest of the 24, cubeTabSnap, once the
// reading is more than `awayDeg` from the hold and until it is within `backDeg` again) differs
// from the hold for `awayMs`, and a band under the picture says how the cube sits and how the
// moves read, with Read as held (the turns from the hold to the cube, cubeTabHoldDelta, pressed
// for the user) and, where only the heading differs, Keep this hold (the heading is taken
// again: the cube did not turn). The rail's dot turns orange meanwhile. The stage and the moves
// keep reading by the hold: the band is the only place the two meet. A gen 3 cube has no tilt,
// and nothing here changes for it.
// Beside the picture, the stage of a CFOP solve (cfopStage, stage.js): Cross, F2L, or the two-look
// case ("Sune") with the hold under it and its moves hidden. The stage is read only after the
// cube has been still for `stillMs` (1200); every `revealMs` (1500) more without a turn, one
// more move shows. A turn fades what is shown but leaves it there, until the cube is still
// again. A pause part way through the algorithm keeps the case, with the moves done so far
// marked (cfopStageDone); the same case read again (after a U turn, say) keeps the moves already
// revealed. The stage never falls back on its own: a reading further back than the stage shown
// (a Sune breaks the cross with its first move) keeps the stage, cubeTabBehind, until the cube is
// at or past it again, or more moves have gone by since it was read (`since`) than the user needs
// for it. A turn of the whole cube with the cube still reads the stage again at once.
// The lock (1.40.0): a Lock button beside Reset view, on by default (`lock`, kept in cw:smartLock).
// Locked, the picture stays on the hold and the tilt is not used: no band, and Reset view is off.
// Unlocked, the picture follows the tilt as above, and Reset view lines it up with the hold. The
// lock shows only while the tilt is live. The readings still come while it is locked, so the lock
// off takes the heading from the cube as it sits then (cubeTabKeep).
// The hold row (1.40.0): under the picture, a tile for each top color the user holds up (white,
// yellow) and each front color (green, orange, blue, red). A tile sets the hold and turns the
// picture to it, and no turn goes on the list (cubeTabSetHold): the moves made so far keep the
// names they had. The turn buttons are for a turn made in the middle of a solve, which the list
// must show. Versions before 1.40.0 had only the turn buttons and the voice.
// Clear moves empties the list: the button, the C key on the tab (cubeTabKeys), and the voice.
// The voice commands (smart-listen.js): a Listen button with Clear moves and Hidden faces, a line
// under them for what was heard, and the hints while it listens. The listening ends when the user
// leaves the tab, and when the link drops. The turns and the tilt draw only while the tab is in
// view (cubeTabShown); the moves and the stage count all the same.
const cubeTab={conn:null,name:'',shown:null,target:null,queue:[],anim:null,raf:0,asked:false,want:false,
  q:null,qTo:null,qraf:0,qAt:0,moves:[],hold:null,
  gyro:false,raw:null,basis:null,away:null,awayTimer:0,awayMs:500,awayDeg:55,backDeg:40,warn:false,
  stage:null,done:0,revealed:0,stale:false,stillTimer:0,revealTimer:0,stillMs:1200,revealMs:1500,since:0,keepMoves:12,battery:null,look:'',
  lock:typeof store==='undefined'||store.get('smartLock',true)!==false,
  front:typeof store!=='undefined'&&store.get('smartFront',false)===true};
const CUBE_TAB_SHOWN=10;
// The two cameras of the picture (1.41.0): from above and to the right, three faces in view (the
// default); and straight on, the front face alone until the tilt turns the cube. Front view
// switches them (`front`, kept in cw:smartFront), the button and the V key. Straight on, the faces
// turned away sit behind the cube or edge on, so Hidden faces would show nothing: in Front view it
// draws only while the picture follows the tilt (cubeTabMirrors), and its button is off otherwise.
const CUBE_TAB_CAMS={iso:{yaw:-32,pitch:28,scale:52},front:{yaw:0,pitch:0,scale:80}};
// Does the picture show the hidden faces? The site's setting, and in Front view a live tilt too.
function cubeTabMirrors(){return hiddenOn()&&(!cubeTab.front||cubeTabLive());}
// The six turns of the whole cube, as buttons, with what each one does in the hands.
const CUBE_TAB_TURNS=[
  {m:'x',tip:'x: turn the whole cube like R. The front goes to the top.'},
  {m:"x'",tip:"x': turn the whole cube like R'. The front goes to the bottom."},
  {m:'y',tip:'y: turn the whole cube like U. The right face comes to the front.'},
  {m:"y'",tip:"y': turn the whole cube like U'. The left face comes to the front."},
  {m:'z',tip:'z: turn the whole cube like F. The top goes to the right.'},
  {m:"z'",tip:"z': turn the whole cube like F'. The top goes to the left."}];
// The tiles of the hold row: the top colors and the front colors, as color indices.
const CUBE_TAB_TOPS=[0,3],CUBE_TAB_FRONTS=[2,4,5,1];
// The rail button of the tab.
function cubeTabBtn(){return $('nav.rail button[data-tab="smart"]');}
// Is the live panel in view? The tab is on, and a cube has connected.
function cubeTabShown(){return !!cubeTab.name&&typeof curTab!=='undefined'&&curTab==='smart';}
// The rail button and the panel: live, off (the link dropped), or no cube (the Connect card).
function cubeTabRender(){
  const b=cubeTabBtn(),off=!cubeTab.conn,warn=!off&&cubeTab.warn;
  if(b){
    b.classList.toggle('live',!!cubeTab.name);b.classList.toggle('off',!!cubeTab.name&&off);b.classList.toggle('warn',warn);
    b.title=!cubeTab.name?'Your smart cube, live: each turn of the cube turns the layer here, with the stage of your solve and the voice commands':off?`${cubeTab.name} is no longer connected. Open the tab to connect again.`:warn?`${cubeTab.name} is held differently from how the moves read.`:`${cubeTab.name}, live: each turn of your cube turns the layer here.`;
  }
  const w=$('#cubeWin'),home=$('#smartHome');
  if(w)w.hidden=!cubeTab.name;if(home)home.hidden=!!cubeTab.name;
  // One list row for the look: on the Connect card, or under Connect again in the dimmed panel.
  const list=$('#smartTabList');
  if(list&&home&&w){const at=cubeTab.name?$('#cubeWinAgain'):$('#smartTabStatus');if(at&&at.nextElementSibling!==list)at.after(list);}
  const st=$('#smartTabStatus');if(st)st.textContent=cubeTab.name?'':cubeTab.look;
}
// Connect on the tab: the chooser at once where the page can reach a cube; else the dialog, which
// offers the macOS app or says why the browser cannot connect.
function cubeTabConnect(){const m=smartMode();if(m==='bt'||m==='bridge')smartConnect({where:'tab'});else openSmart();}
// ----- the panel: wired once, at load -----
function cubeTabMount(){
  const turns=$('#cubeWinTurns');if(!turns||turns.dataset.ready)return;turns.dataset.ready='1';
  CUBE_TAB_TURNS.forEach((t,i)=>{
    if(i%2===0){const g=document.createElement('span');g.className='grp';turns.appendChild(g);}
    const b=document.createElement('button');b.className='small';b.dataset.turn=t.m;b.textContent=t.m;b.title=t.tip;b.setAttribute('aria-label',t.tip);
    b.onclick=()=>cubeTabTurn(t.m);turns.lastElementChild.appendChild(b);
  });
  for(const [place,cs] of [['up',CUBE_TAB_TOPS],['front',CUBE_TAB_FRONTS]]){
    const g=$(`#cubeWinHold .grp[data-place="${place}"]`);
    for(const c of cs){const b=document.createElement('button');b.type='button';b.className='ht';b.dataset.c=c;b.dataset.cb='WRGYOB'[c];
      b.style.setProperty('--c',stickerColor(c));
      const t=place==='up'?`${cubeTabCap(COLOR_NAMES[c])} on top`:`${cubeTabCap(COLOR_NAMES[c])} in front`;
      b.title=`${t}. Sets how you hold the cube. No turn goes on the list.`;b.setAttribute('aria-label',t);
      b.onclick=()=>cubeTabHoldPick(place,c);g.appendChild(b);}
  }
  $('#smartTabConnect').onclick=cubeTabConnect;
  $('#cubeWinOptions').onclick=()=>openSmart();
  $('#cubeWinConnect').onclick=cubeTabConnect;
  $('#cubeWinClear').onclick=cubeTabClear;
  $('#cubeWinLock').onclick=()=>cubeTabSetLock(!cubeTab.lock);
  $('#cubeWinHidden').onclick=()=>setHidden(!hiddenOn());
  $('#cubeWinFront').onclick=()=>cubeTabSetFront(!cubeTab.front);
  $('#cubeWinMatch').onclick=cubeTabMatch;$('#cubeWinKeep').onclick=cubeTabKeep;$('#cubeWinReset').onclick=cubeTabKeep;
  if(typeof smartListenMount==='function')smartListenMount(); // the voice commands (smart-listen.js)
  document.addEventListener('cw:tab',e=>cubeTabTab(e.detail));
  // The bridge can answer after the tab opens (the page asks the app on load).
  document.addEventListener('cw:bridge',()=>{if(typeof curTab!=='undefined'&&curTab==='smart'&&!cubeTab.conn)smartAuto('show');});
  cubeTabRender();cubeTabWindow();
  if(typeof curTab!=='undefined'&&curTab==='smart'&&typeof method!=='undefined'&&method==='cfop')smartAuto('show'); // the page opened on the tab
}
// The tab shown: the picture is drawn afresh and the cube asked for its state. Left: the turns stop
// (the picture lands on the cube), and so does the listening.
function cubeTabTab(tab){
  if(tab==='smart'){cubeTabWindow();if(cubeTab.conn)cubeTabAsk();else smartAuto('show');return;}
  smartLookStop('show'); // the look that the tab began ends with it; the one after a drop goes on
  cubeTabStopAnim();cubeTabStopView();if(cubeTab.qTo)cubeTab.q=cubeTab.qTo;
  if(typeof smartListenStop==='function')smartListenStop();
}
// Go to the tab: when a cube connects in CFOP. In another method the tab is not on the rail.
function cubeTabGo(){if(typeof method!=='undefined'&&method==='cfop'&&typeof goTab==='function'&&curTab!=='smart')goTab('smart');}
// The panel's text and the cube it shows.
function cubeTabWindow(){
  const w=$('#cubeWin');if(!w)return;
  const off=!cubeTab.conn;
  w.classList.toggle('off',off);
  w.querySelector('.nm').textContent=cubeTab.name;
  smartBatteryDraw($('#cubeWinBatt'),off?null:cubeTab.battery);
  $('#cubeWinNote').textContent=off?(cubeTab.look||'The cube is no longer connected. Turn a face to wake it up, then connect again.'):!cubeTab.shown?'Reading the cube.':cubeTabLive()?'Live. Each turn of your cube turns the layer here, and the picture tilts with the cube. When you turn the whole cube in your hands, press the same turn under the picture, so the moves read as you hold it.':'Live. Each turn of your cube turns the layer here. Pick the top and the front to say how you hold the cube. When you turn the whole cube in the middle of a solve, press the same turn under the picture, so the turn goes on the list.';
  $('#cubeWinAgain').classList.toggle('hidden',!off);
  $$('#cubeWinTurns button').forEach(b=>{b.disabled=off;});
  const lock=$('#cubeWinLock');lock.classList.toggle('hidden',!cubeTab.gyro);lock.disabled=off;lock.setAttribute('aria-pressed',String(cubeTab.lock));
  lock.title=cubeTab.lock?'Locked: the picture stays on the hold. Press to let it turn as you turn the cube in your hands.':'The picture turns as you turn the cube in your hands. Press to lock it to the hold.';
  const reset=$('#cubeWinReset');reset.classList.toggle('hidden',!cubeTab.gyro);reset.disabled=off||cubeTab.lock;
  const listen=$('#cubeWinListen');if(listen)listen.disabled=off;
  reset.title=cubeTab.lock?'Turn Lock off first. Then the picture turns with your cube, and Reset view lines it up.':`Hold the cube with ${cubeTabHoldWords(cubeTab.hold)}, then press. The picture lines up with your cube.`;
  cubeTabHoldDraw();
  $('#cubeWinHidden').setAttribute('aria-pressed',String(hiddenOn()));
  cubeTabFrontDraw();
  cubeTabWarnDraw();
  cubeTabMovesDraw();
  cubeTabStageDraw();
  cubeTabDraw();
}
// ----- the lock and the hold row -----
const cubeTabCap=s=>s[0].toUpperCase()+s.slice(1);
// Does the picture follow the tilt? The cube has one, the lock is off, and a reading has come.
function cubeTabLive(){return cubeTab.gyro&&!cubeTab.lock&&!!cubeTab.raw;}
// Lock on: the picture turns back to the hold, and the band goes. Lock off: the heading is taken
// from the cube as it sits now, and the picture follows the cube from there.
function cubeTabSetLock(on){
  cubeTab.lock=!!on;if(typeof store!=='undefined')store.set('smartLock',cubeTab.lock);
  if(cubeTab.lock){cubeTabAwayClear();if(!cubeTab.q)cubeTab.q=[0,0,0,1];cubeTab.qTo=cubeTabHoldQ();cubeTabTurnView();}
  else if(cubeTab.raw)cubeTabKeep();
  cubeTabWindow();
}
// The hold with `up` on top that is nearest the hold now: the same front where it can stay, else
// the fewest turns away. With `front`, only a hold with that front. Null when there is none.
function cubeTabHoldNear(up,front){
  const cur=cubeTab.hold||CUBE_TAB_HOLDS[0],c=cur.cube.center;
  const want=CUBE_TAB_HOLDS.filter(h=>h.cube.center[0]===up&&(front==null||h.cube.center[2]===front));
  const score=h=>(h.cube.center[2]===c[2]?0:10)+cubeTabHoldDelta(cur,h).length;
  return want.sort((a,b)=>score(a)-score(b))[0]||null;
}
// A tile of the hold row. A top keeps the front where it can. A front keeps the top where it can,
// else white goes on top.
function cubeTabHoldPick(place,c){
  const top=(cubeTab.hold||CUBE_TAB_HOLDS[0]).cube.center[0];
  const h=place==='up'?cubeTabHoldNear(c,null):cubeTabHoldNear(c!==top&&c!==(top+3)%6?top:0,c);
  cubeTabSetHold(h);
}
// Set the hold with no turn on the list: the moves still to come read as held, and the picture
// turns to the hold. With the picture on the tilt, the cube sits as the hold says: the heading is
// taken again (cubeTabKeep), and a cube held with another face up brings the band.
function cubeTabSetHold(h){
  if(!h)return;
  cubeTab.hold=h.moves.length?h:null;
  if(cubeTabLive()){cubeTabKeep();cubeTabAwayCheck();}
  else{if(!cubeTab.q)cubeTab.q=[0,0,0,1];cubeTab.qTo=h.q;cubeTabTurnView();}
  if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();
  cubeTabWindow();
}
// The tiles: the top and the front of the hold pressed, all of them off while the link is down.
function cubeTabHoldDraw(){
  const c=(cubeTab.hold||CUBE_TAB_HOLDS[0]).cube.center,off=!cubeTab.conn;
  $$('#cubeWinHold .ht').forEach(b=>{const place=b.parentNode.dataset.place,ci=+b.dataset.c;
    b.setAttribute('aria-pressed',String(c[place==='up'?0:2]===ci));b.disabled=off;});
}
// Clear moves: the list is emptied. False when it was empty.
function cubeTabClear(){if(!cubeTab.moves.length)return false;cubeTab.moves=[];cubeTabMovesDraw();return true;}
// The tab's keys (app.js asks first), while the live panel is in view: C clears the moves, V
// switches Front view.
function cubeTabKeys(e){
  if(!cubeTabShown())return false;
  if(e.key==='c'||e.key==='C'){cubeTabClear();return true;}
  if(e.key==='v'||e.key==='V'){cubeTabSetFront(!cubeTab.front);return true;}
  return false;
}
// Front view on: the picture looks at the cube straight on. Off: from above and to the right.
function cubeTabSetFront(on){
  cubeTab.front=!!on;if(typeof store!=='undefined')store.set('smartFront',cubeTab.front);
  cubeTabFrontDraw();cubeTabDraw();
}
// The Front view button: pressed while the picture looks straight on. The Hidden faces button is
// off in Front view while the picture stays on the hold.
function cubeTabFrontDraw(){
  const b=document.getElementById('cubeWinFront');if(!b)return;
  const h=document.getElementById('cubeWinHidden'),still=cubeTab.front&&!cubeTabLive();
  // Written only when they change: the panel redraws on every state the cube sends.
  const put=(el,k,v)=>{if(el.getAttribute(k)!==v)el.setAttribute(k,v);};
  put(b,'aria-pressed',String(cubeTab.front));
  put(b,'title',cubeTab.front?'Front view: the cube straight on, the front face alone. Press to see it from above and to the right, with three faces in view':'The cube from above and to the right, with three faces in view. Press to see it straight on, the front face alone');
  if(h.disabled!==still)h.disabled=still;
  put(h,'title',still?'Front view shows the front face alone. Turn Front view off to see the hidden faces':'Show the hidden faces: the faces turned away from you, as in a mirror behind the cube');
}
// ----- the moves: every turn since the cube connected, merged -----
// The turn count of a move: R is 1, R2 is 2, R' is 3.
const cubeTabTurns=m=>m.endsWith('2')?2:m.endsWith("'")?3:1;
// `moves` with `m` added. The same face as the last move merges with it: the turns add up round
// the four, and no turns left takes the last move off. So R U R' U' done, then U R U' R' undoes it
// move by move, and the list is empty again. Returns a new list.
function cubeTabMerge(moves,m){
  const last=moves[moves.length-1];
  if(!last||last[0]!==m[0])return moves.concat(m);
  const t=(cubeTabTurns(last)+cubeTabTurns(m))%4;
  return moves.slice(0,-1).concat(t?[m[0]+['','','2',"'"][t]]:[]);
}
// A move as the cube names it (its white face is U), named by the face it sits at in the hold:
// the hold's centers say which of the cube's faces is at each place.
function cubeTabRelabel(m,hold){
  if(!hold||!hold.moves.length||!/^[URFDLB]/.test(m))return m;
  return FACE_NAMES[hold.cube.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1);
}
// Record the moves the cube made between two states, as held.
function cubeTabRecord(path){
  for(const m of path)cubeTab.moves=cubeTabMerge(cubeTab.moves,cubeTabRelabel(m,cubeTab.hold));
  cubeTab.since+=path.length;
  cubeTabMovesDraw();
}
// The readout: the last CUBE_TAB_SHOWN moves, and a triangle after them when there are more.
function cubeTabMovesDraw(){
  const el=$('#cubeWinMoves');if(!el)return;
  const ms=cubeTab.moves,span=(cls,text)=>{const s=document.createElement('span');s.className=cls;if(text)s.textContent=text;return el.appendChild(s);};
  const clear=$('#cubeWinClear');if(clear)clear.disabled=!ms.length;
  el.textContent='';
  if(!ms.length){span('none','No moves yet');return;}
  for(const m of ms.slice(-CUBE_TAB_SHOWN))span('mv'+(/^[xyz]/.test(m)?' rot':''),m);
  if(ms.length>CUBE_TAB_SHOWN){
    const more=span('more');more.setAttribute('aria-label',`${ms.length-CUBE_TAB_SHOWN} more`);more.title=`${ms.length} moves in all`;
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),p=document.createElementNS(NS,'polygon');
    svg.setAttribute('viewBox','0 0 8 10');svg.setAttribute('aria-hidden','true');p.setAttribute('points','0,0 8,5 0,10');svg.appendChild(p);more.appendChild(svg);
  }
}
// The picture: the cube as the cube names it, turned by the hold (`rot`), seen from the camera
// that Front view picks (CUBE_TAB_CAMS).
// With Hidden faces (cw:hidden, the site's setting) the faces turned away show as in a mirror
// behind the cube, and the cube draws smaller so they fit. Drawn only while the tab is in view;
// the tab shown draws it afresh. The markup is the renderer's own (draw.js).
function cubeTabDraw(){
  const svg=$('#cubeWinSvg');if(!svg||!cubeTabShown())return;
  const a=cubeTab.anim,cam=CUBE_TAB_CAMS[cubeTab.front?'front':'iso'],o={yaw:cam.yaw,pitch:cam.pitch,scale:cam.scale,n:3};
  if(cubeTabMirrors())Object.assign(o,{hidden:true,scale:40});
  if(cubeTab.q)o.rot=quatMat(cubeTab.q);
  if(a&&a.t<1)svg.innerHTML=renderCube3D(a.from.toFacelets(),Object.assign(o,{move:a.move,t:Math.max(a.t,0.01)}));
  else{const f=cubeTab.shown?cubeTab.shown.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);svg.innerHTML=renderCube3D(f,o);}
}
// The Hidden faces button and the picture, after a change of the setting here or on the site.
function cubeTabHiddenDraw(){
  const b=$('#cubeWinHidden');if(!b)return;
  b.setAttribute('aria-pressed',String(hiddenOn()));
  cubeTabDraw();
}
// ----- live: a turn asks the cube for its state, the state turns the layer -----
// One request at a time. A turn during a request marks `want`, and the answer asks again, so the
// picture ends on the real cube however fast the turns come. On another tab, the request still
// goes: the move list needs every state.
function cubeTabAsk(){
  if(!cubeTab.conn)return;
  if(cubeTab.asked){cubeTab.want=true;return;}
  cubeTab.asked=true;
  cubeTab.conn.send('state').catch(()=>{cubeTab.asked=false;});
}
const CUBE_TAB_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
const cubeTabKey=c=>c.cp.join()+'/'+c.co.join()+'/'+c.ep.join()+'/'+c.eo.join();
// The shortest list of up to four moves that takes `from` to `to`: [] when they are equal, null
// when no such list exists. Two moves out from `from` meet two moves back from `to`. Under a
// millisecond, so it runs on every state message.
function cubeTabPath(from,to){
  if(!from||!to)return null;
  const inv=m=>m.endsWith("'")?m[0]:m.endsWith('2')?m:m+"'";
  const grow=layer=>{const next=[];for(const {c,ms} of layer)for(const m of CUBE_TAB_MOVES){if(ms.length&&ms[ms.length-1][0]===m[0])continue;next.push({c:applyAlg(c,[m]),ms:ms.concat(m)});}return next;};
  // back: the cubes one and two moves before `to`, each with the moves that lead from it to `to`
  const back=new Map();let bl=[{c:to,ms:[]}];
  for(let d=0;d<=2;d++){for(const {c,ms} of bl){const k=cubeTabKey(c);if(!back.has(k))back.set(k,ms.map(inv).reverse());}if(d<2)bl=grow(bl);}
  let layer=[{c:from,ms:[]}],best=null;
  for(let d=0;d<=2;d++){
    if(best&&best.length<=d)return best; // nothing from here on is shorter
    for(const {c,ms} of layer){const b=back.get(cubeTabKey(c));if(b&&(!best||ms.length+b.length<best.length))best=ms.concat(b);}
    if(best&&best.length<=d+1)return best;
    if(d<2)layer=grow(layer);
  }
  return best;
}
// Show `cube`, the real cube's state. Up to four moves past the last picture: queue the turns, so
// each one turns its layer, even when the turns come fast. Further away: show it at once.
// The moves on the way go on the list, tab in view or not. Five or more apart, the moves are not
// known, and the list keeps what it has.
function cubeTabShow(cube){
  const moved=cubeTabPath(cubeTab.target||cubeTab.shown,cube);
  if(moved&&moved.length)cubeTabRecord(moved);
  if(!moved||moved.length)cubeTabStir(); // the cube changed; a state read again with no turn is not a turn
  const still=(typeof reducedMotion==='function'&&reducedMotion())||typeof requestAnimationFrame!=='function';
  const path=still||!cubeTabShown()?null:moved;
  if(!path){cubeTabStopAnim();cubeTab.shown=cubeTab.target=cube;cubeTabWindow();return;}
  cubeTab.target=cube;cubeTab.queue.push(...path);
  if(cubeTab.anim)return; // the running turn goes on; the new ones follow it
  cubeTabNext();cubeTabWindow();
}
// How long one turn takes, with `n` more turns waiting: faster as the queue grows, so the picture
// catches up with the cube within a turn or two.
function cubeTabDur(move,n){return Math.max(90,Math.round((move.endsWith('2')?360:260)*[1,0.65,0.5][Math.min(n,2)]*(n>2?0.8:1)));}
// Turn the first move of the queue. When it ends, the next one starts in the same frame.
function cubeTabNext(){
  const m=cubeTab.queue.shift();
  if(!m){cubeTab.raf=0;cubeTab.anim=null;cubeTabWindow();return;}
  const from=cubeTab.shown;cubeTab.shown=applyAlg(from,[m]);
  const dur=cubeTabDur(m,cubeTab.queue.length),t0=performance.now();
  cubeTab.anim={from,move:m,t:0};
  const step=()=>{const x=Math.min(1,(performance.now()-t0)/dur);cubeTab.anim.t=x<1?0.5-0.5*Math.cos(Math.PI*x):1;
    if(x>=1){cubeTabNext();return;}
    cubeTabDraw();cubeTab.raf=requestAnimationFrame(step);};
  cubeTab.raf=requestAnimationFrame(step);
}
// Stop the turns. The picture lands on the real cube.
function cubeTabStopAnim(){if(cubeTab.raf){cancelAnimationFrame(cubeTab.raf);cubeTab.raf=0;}cubeTab.anim=null;cubeTab.queue=[];if(cubeTab.target)cubeTab.shown=cubeTab.target;}
// ----- the turn of the body: the picture turns to the hold -----
// Quaternions as [x,y,z,w]. quatMul(a,b) is a after b: its matrix is the matrix of a times the
// matrix of b. quatMat gives the 3×3 matrix (three rows) that draw.js takes as `rot`.
function quatMul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz];}
function quatNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);}
function quatConj(q){return [-q[0],-q[1],-q[2],q[3]];}
function quatMat(q){const [x,y,z,w]=quatNorm(q);
  return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
// Part of the way from a to b, the short way round. t=1 is b.
function quatSlerp(a,b,t){
  let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d;}
  if(d>0.9995)return quatNorm(a.map((v,i)=>v+(b[i]-v)*t));
  const th=Math.acos(Math.min(1,d)),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;
  return a.map((v,i)=>v*wa+b[i]*wb);
}
// The angle between two turns, in degrees.
function quatAngle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))*180/Math.PI;}
// Turn the picture toward qTo, a little closer each frame, so a press, or a turn of the cube in
// the hands, reads as a turn and not a jump. With reduced motion, or with the tab out of view, the
// picture goes straight there, drawn once a frame at most: the tilt readings come faster than that.
function cubeTabTurnView(){
  if(!cubeTab.qTo)return;
  const noRaf=typeof requestAnimationFrame!=='function';
  const still=!cubeTabShown()||(typeof reducedMotion==='function'&&reducedMotion())||noRaf;
  if(still){cubeTab.q=cubeTab.qTo;if(!cubeTabShown()||cubeTab.raf)return;
    if(noRaf){cubeTabDraw();return;}
    if(!cubeTab.qraf)cubeTab.qraf=requestAnimationFrame(()=>{cubeTab.qraf=0;if(!cubeTab.raf)cubeTabDraw();});return;}
  if(cubeTab.qraf)return;
  cubeTab.qAt=performance.now();
  const tc=cubeTabLive()?70:110; // most of the way within a tenth of a second for the tilt, a quarter for a press
  const step=()=>{
    const now=performance.now(),k=1-Math.exp(-(now-cubeTab.qAt)/tc);cubeTab.qAt=now;
    cubeTab.q=cubeTab.q?quatSlerp(cubeTab.q,cubeTab.qTo,k):cubeTab.qTo;
    const done=quatAngle(cubeTab.q,cubeTab.qTo)<0.05;if(done)cubeTab.q=cubeTab.qTo;
    if(!cubeTab.raf)cubeTabDraw(); // a running turn draws every frame already
    cubeTab.qraf=done?0:requestAnimationFrame(step);
  };
  cubeTab.qraf=requestAnimationFrame(step);
}
function cubeTabStopView(){if(cubeTab.qraf){cancelAnimationFrame(cubeTab.qraf);cubeTab.qraf=0;}}
// Forget the hold and the tilt: on connect and on disconnect. The picture goes back to the cube's
// own frame.
function cubeTabResetView(){cubeTabStopView();cubeTab.q=cubeTab.qTo=null;cubeTab.hold=null;
  cubeTab.gyro=false;cubeTab.raw=cubeTab.basis=null;cubeTabAwayClear();}
// ----- the tilt: the picture follows the cube in the hands -----
// The heading for a reading: the turn about the vertical that puts the cube's axes, seen from
// above, where the hold puts them. Of the three axes (red, white, green), the one most level in
// both frames sets it, so a tilt in the reading stays in the picture. Only a yaw: a frame that
// took the whole reading as the hold went wrong whenever the cube lay some other way (1.6).
function cubeTabYawBasis(raw,holdQ){
  const M=quatMat(raw),H=quatMat(holdQ||[0,0,0,1]);
  let best=-1,a=0;
  for(const c of [2,0,1]){ // green, red, white
    const g=[M[0][c],M[2][c]],h=[H[0][c],H[2][c]],lv=Math.min(Math.hypot(g[0],g[1]),Math.hypot(h[0],h[1]));
    if(lv>best){best=lv;a=Math.atan2(h[0],h[1])-Math.atan2(g[0],g[1]);}
  }
  return [0,Math.sin(a/2),0,Math.cos(a/2)];
}
const cubeTabHoldQ=()=>(cubeTab.hold||CUBE_TAB_HOLDS[0]).q;
// A tilt reading from the cube. The first one sets the heading: the cube is taken to sit as the
// hold says, as far as a turn about the vertical goes. The up face comes from the reading itself.
// The first reading shows the Reset view button.
function cubeTabGyro(q){
  q=quatNorm(q);cubeTab.raw=q;
  const first=!cubeTab.gyro;cubeTab.gyro=true;
  if(cubeTab.lock){if(first)cubeTabWindow();return;} // locked: the picture stays on the hold; the first reading shows Lock
  if(!cubeTab.basis)cubeTab.basis=cubeTabYawBasis(q,cubeTabHoldQ());
  cubeTab.qTo=quatNorm(quatMul(cubeTab.basis,q));
  cubeTabAwayCheck();
  if(first){cubeTabStopView();cubeTab.q=cubeTab.qTo;cubeTabWindow();return;}
  cubeTabTurnView();
}
// The hold nearest to a turn of the body.
function cubeTabSnap(q){let best=null,bd=-1;for(const h of CUBE_TAB_HOLDS){const d=Math.abs(q[0]*h.q[0]+q[1]*h.q[1]+q[2]*h.q[2]+q[3]*h.q[3]);if(d>bd){bd=d;best=h;}}return best;}
// The turns of the whole cube from hold a to hold b (null is white up, green front).
function cubeTabHoldDelta(a,b){const A=(a||CUBE_TAB_HOLDS[0]).cube,B=(b||CUBE_TAB_HOLDS[0]).cube;const h=CUBE_TAB_HOLD_BY.get(A.inverse().mul(B).center.join());return h?h.moves:[];}
// Is the tilt away from the hold? More than awayDeg from it, and nearest another hold: `away` is
// that hold, and the band shows after awayMs of it. Within backDeg again: not away, at once.
function cubeTabAwayCheck(){
  if(!cubeTab.qTo||cubeTab.lock)return;
  const hold=cubeTab.hold||CUBE_TAB_HOLDS[0],deg=quatAngle(cubeTab.qTo,hold.q);
  let away=cubeTab.away;
  if(deg>cubeTab.awayDeg){const near=cubeTabSnap(cubeTab.qTo);away=near===hold?null:near;}
  else if(deg<cubeTab.backDeg||!away)away=null;
  if(away===cubeTab.away)return;
  cubeTab.away=away;clearTimeout(cubeTab.awayTimer);cubeTab.awayTimer=0;
  if(away){cubeTab.awayTimer=setTimeout(()=>{cubeTab.awayTimer=0;cubeTabWarnSet(true);},cubeTab.awayMs);}
  else cubeTabWarnSet(false);
}
function cubeTabWarnSet(on){if(cubeTab.warn===on)return;cubeTab.warn=on;cubeTabRender();cubeTabWarnDraw();}
function cubeTabAwayClear(){clearTimeout(cubeTab.awayTimer);cubeTab.awayTimer=0;cubeTab.away=null;cubeTabWarnSet(false);}
// Read as held: the turns from the hold to the way the cube sits, pressed for the user.
function cubeTabMatch(){const to=cubeTab.away;if(!to)return;for(const m of cubeTabHoldDelta(cubeTab.hold,to))cubeTabTurn(m);}
// Keep this hold, and Reset view: the cube sits as the hold says; the heading is taken again so
// the reading lines up with the hold. Only a turn about the vertical goes: the up face is what
// gravity says, and a cube held with another face up brings the band back.
function cubeTabKeep(){
  if(!cubeTab.raw||cubeTab.lock)return;
  cubeTab.basis=cubeTabYawBasis(cubeTab.raw,cubeTabHoldQ());cubeTab.qTo=quatNorm(quatMul(cubeTab.basis,cubeTab.raw));
  cubeTab.away=null;clearTimeout(cubeTab.awayTimer);cubeTab.awayTimer=0;cubeTabWarnSet(false);
  cubeTabTurnView();
}
// A hold in words: the center on top and the one in front.
function cubeTabHoldWords(h){const c=(h||CUBE_TAB_HOLDS[0]).cube.center;return `${COLOR_NAMES[c[0]]} up, ${COLOR_NAMES[c[2]]} in front`;}
// The band under the picture: how the cube sits, how the moves read, and the way to match.
function cubeTabWarnDraw(){
  const el=$('#cubeWinWarn');if(!el)return;
  const on=cubeTab.warn&&!!cubeTab.away&&!!cubeTab.conn;
  el.classList.toggle('hidden',!on);
  if(!on){el.querySelector('.txt').textContent='';return;}
  const hold=cubeTab.hold||CUBE_TAB_HOLDS[0],away=cubeTab.away,turns=cubeTabHoldDelta(hold,away);
  el.querySelector('.txt').textContent=`Your cube sits with ${cubeTabHoldWords(away)}. The moves and the stage read with ${cubeTabHoldWords(hold)}.`;
  const match=$('#cubeWinMatch');match.title=`Turn the hold to match the cube: ${turns.join(' ')}. The turn goes on the list.`;match.setAttribute('aria-label',`Read as held: ${turns.join(' ')}`);
  $('#cubeWinKeep').classList.toggle('hidden',away.cube.center[0]!==hold.cube.center[0]); // a different up face is no drift
}
// ----- the hold: which way the cube sits in the hands -----
// The 24 ways to hold a cube, each as the shortest turns from white up, green front (x, y, z and
// their primes and doubles), the cube after them (its centers say which of the cube's faces is at
// each place), and the turn of the body as a quaternion in the frame of draw.js. A quarter turn
// about an axis of draw.js is the prime of the move about that axis, and a later turn goes on
// the left (quatMul), as the renderer composes them.
const CUBE_TAB_HOLDS=(()=>{
  const s=Math.SQRT1_2,base={x:[-s,0,0,s],y:[0,-s,0,s],z:[0,0,-s,s]},conj=q=>[-q[0],-q[1],-q[2],q[3]];
  const qOf=m=>{const b=base[m[0]];return m.endsWith("'")?conj(b):m.endsWith('2')?quatMul(b,b):b;};
  const turns=['x','y','z',"x'","y'","z'",'x2','y2','z2'],out=[],seen=new Set();
  let layer=[{moves:[],cube:new Cube(),q:[0,0,0,1]}];
  while(layer.length){
    const next=[];
    for(const h of layer){const k=h.cube.center.join();if(seen.has(k))continue;seen.add(k);out.push(h);
      for(const m of turns)next.push({moves:h.moves.concat(m),cube:applyAlg(h.cube,[m]),q:quatMul(qOf(m),h.q)});}
    layer=next;
  }
  return out;
})();
const CUBE_TAB_HOLD_BY=new Map(CUBE_TAB_HOLDS.map(h=>[h.cube.center.join(),h]));
// The cube as held: the state the cube reports, turned the way it sits in the hands.
function cubeTabHeld(cube){return cube&&cubeTab.hold&&cubeTab.hold.moves.length?applyAlg(cube,cubeTab.hold.moves):cube;}
// A turn button: the whole cube turns by `m` (x, y, z, a prime or a double). The hold moves on,
// the turn goes on the list (where y then y' takes both off), the picture turns, and the stage
// reads the new hold at once when the cube is still.
function cubeTabTurn(m){
  const from=cubeTab.hold||CUBE_TAB_HOLDS[0],h=CUBE_TAB_HOLD_BY.get(applyAlg(from.cube,[m]).center.join());
  if(!h)return;
  cubeTab.hold=h.moves.length?h:null;
  cubeTab.moves=cubeTabMerge(cubeTab.moves,m);
  cubeTabMovesDraw();cubeTabHoldDraw();
  if(cubeTabLive())cubeTabAwayCheck(); // the picture follows the cube; the press may match it, or leave it
  else{if(!cubeTab.q)cubeTab.q=[0,0,0,1];cubeTab.qTo=h.q;cubeTabTurnView();} // the first press turns from the cube's own frame
  if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();
}
// ----- the stage beside the picture -----
// The cube turned (its state differs from the picture): fade the stage, and read it again once the
// cube has been still for stillMs. Only a change counts: a cube can send its state again on its
// own, and a state that matches the picture must not put the reveals off.
function cubeTabStir(){
  clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  if(cubeTab.stage&&!cubeTab.stale){cubeTab.stale=true;cubeTabStageDraw();}
  cubeTab.stillTimer=setTimeout(cubeTabSettle,cubeTab.stillMs);
}
// The cube is still: read the stage. Part way through the algorithm shown, the case stays and the
// moves done are marked; otherwise the stage is read anew. A reading that falls behind the stage
// shown keeps the stage (cubeTabBehind), with no move marked; the same case keeps its reveals.
function cubeTabSettle(){
  clearTimeout(cubeTab.stillTimer);cubeTab.stillTimer=0;
  const held=cubeTabHeld(cubeTab.target);if(!held)return;
  const old=cubeTab.stage,k=old?cfopStageDone(old,held):0;
  if(k>0&&k<old.moves.length){cubeTab.done=k;cubeTab.revealed=Math.max(cubeTab.revealed,k);}
  else{
    const st=cfopStage(held,typeof store!=='undefined'?store.get('crossColor','white'):'white');
    if(old&&cubeTabBehind(old,st))cubeTab.done=0;
    else{
      const same=old&&old.stage===st.stage&&old.name===st.name;
      cubeTab.stage=st;cubeTab.done=0;cubeTab.revealed=same?Math.min(cubeTab.revealed,st.moves.length):0;cubeTab.since=0;
    }
  }
  cubeTab.stale=false;cubeTabStageDraw();cubeTabRevealLater();
}
// `st`, read now, falls behind `old`, the stage shown, and the user may be part way through `old`:
// a Sune breaks the cross with its first move, and any other way through the algorithm (another
// algorithm for the case, a slip put right) leaves no prefix for cfopStageDone to find. Not behind
// a solved cube (a turn of it is a scramble) or the cross (nothing comes before it). And not once
// more moves have gone by since `old` was read than its algorithm twice and four more, twelve at
// the least (`keepMoves`): the user has moved on to something else, a new scramble say.
function cubeTabBehind(old,st){
  if(old.stage==='solved'||old.stage==='cross')return false;
  return stageRank(st.stage)<stageRank(old.stage)&&cubeTab.since<=Math.max(cubeTab.keepMoves,2*old.moves.length+4);
}
// One more move shows every revealMs, until all of them show.
function cubeTabRevealLater(){
  clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  const st=cubeTab.stage;if(!st||cubeTab.revealed>=st.moves.length)return;
  cubeTab.revealTimer=setTimeout(()=>{cubeTab.revealTimer=0;cubeTab.revealed++;cubeTabStageDraw();cubeTabRevealLater();},cubeTab.revealMs);
}
function cubeTabStageStop(){clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.stillTimer=cubeTab.revealTimer=0;}
function cubeTabStageReset(){cubeTabStageStop();cubeTab.stage=null;cubeTab.done=cubeTab.revealed=cubeTab.since=0;cubeTab.stale=false;}
// The panel: the name, the line under it, and the moves, each shown or hidden, the done ones marked.
function cubeTabStageDraw(){
  const el=$('#cubeWinStage');if(!el)return;
  const st=cubeTab.stage;
  el.classList.toggle('stale',cubeTab.stale);
  el.querySelector('.st-name').textContent=st?st.name:'';el.querySelector('.st-sub').textContent=st?st.sub:'';
  const alg=el.querySelector('.st-alg');alg.textContent='';
  if(!st)return;
  st.moves.forEach((m,i)=>{const s=document.createElement('span');
    if(i<cubeTab.revealed){s.className='mv'+(i<cubeTab.done?' done':'')+(/^[xyz]/.test(m)?' rot':'');s.textContent=m;}
    else{s.className='mv hid';s.textContent='•';s.setAttribute('aria-label','hidden move');}
    alg.appendChild(s);});
}
// ----- what the Smart cube dialog reports -----
function cubeTabEvent(ev){
  if(ev.type==='connect'){
    cubeTab.look='';cubeTab.conn=ev.conn;cubeTab.name=smartNiceName(ev.conn.name);cubeTab.battery=ev.conn.battery;cubeTab.asked=false;cubeTab.want=false;cubeTabStopAnim();cubeTab.shown=cubeTab.target=null;cubeTab.moves=[];cubeTabResetView();cubeTabStageReset();
    cubeTabRender();if(!ev.auto)cubeTabGo(); // a cube that connects by itself does not move the page
    if(ev.cube)cubeTabShow(ev.cube);else cubeTabWindow();
    if(cubeTabShown())cubeTabAsk();
    return;
  }
  if(ev.type==='look'){cubeTab.look=ev.text||'';cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='disconnect'){cubeTab.look='';cubeTab.conn=null;cubeTab.name='';cubeTabStopAnim();cubeTab.shown=cubeTab.target=null;cubeTab.moves=[];if(typeof smartListenStop==='function')smartListenStop();cubeTabResetView();cubeTabStageReset();cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='gone'){if(ev.conn!==cubeTab.conn)return;cubeTab.look='';cubeTab.conn=null;cubeTab.asked=false;cubeTab.want=false;cubeTabStageStop();cubeTabAwayClear();if(typeof smartListenStop==='function')smartListenStop();cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='close')return;
  if(ev.conn!==cubeTab.conn)return;
  if(ev.type==='move')cubeTabAsk(); // the state that answers shows the turn
  if(ev.type==='gyro')cubeTabGyro(ev.q);
  if(ev.type==='battery'){cubeTab.battery=ev.level;smartBatteryDraw($('#cubeWinBatt'),ev.level);}
  if(ev.type==='state'){cubeTab.asked=false;if(cubeTab.want){cubeTab.want=false;cubeTabAsk();}cubeTabShow(ev.cube);}
}
if(typeof document!=='undefined'){document.addEventListener('cw:smart',e=>cubeTabEvent(e.detail));cubeTabMount();}
