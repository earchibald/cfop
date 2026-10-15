// ================= The cube tab =================
// While a smart cube is connected, the top bar carries a tab with the name of the cube. The tab
// opens a floating window with a live cube: each turn of the real cube turns the layer on the
// screen. Close (Esc) collapses the window back into the tab. Disconnect in the Smart cube dialog
// removes the tab. When the link drops by itself (the cube went to sleep), the tab stays, dimmed,
// and the window offers the way back to the dialog.
// The first time a cube connects, the page dims around the tab for a moment and a callout points
// to it. The Smart cube dialog is a modal, so the callout waits until the dialog closes.
// The dialog reports every change of the link as a cw:smart event (smart-ui.js); nothing here
// reaches into the dialog. All markup here is fixed text; the cube's name goes in as text.
const cubeTab={conn:null,name:'',shown:null,anim:null,raf:0,yaw:-32,pitch:28,asked:false,want:false,tipWait:false,spotTimer:0};
const CUBE_TAB_TIP='Click your smart cube to open the Smart Cube interface!';
function cubeTabBtn(){return $('#cubeTab');}
// The tab: made when a cube connects, removed on Disconnect. `off` marks a link that dropped.
function cubeTabRender(){
  const top=$('header.top');if(!top)return;
  let b=cubeTabBtn();
  if(!cubeTab.name){if(b)b.remove();return;}
  if(!b){
    b=document.createElement('button');b.id='cubeTab';b.className='cubetab';b.setAttribute('aria-controls','cubeWin');
    b.innerHTML='<span class="dot" aria-hidden="true"></span><span class="nm"></span><span class="brk" aria-hidden="true">⧉</span>';
    b.onclick=()=>{cubeTabSpotEnd();if($('#cubeWin'))cubeTabClose();else cubeTabOpen();};
    const pop=$('#methodPop');if(pop)pop.after(b);else top.appendChild(b);
  }
  const off=!cubeTab.conn;
  b.classList.toggle('off',off);
  b.querySelector('.nm').textContent=cubeTab.name;
  b.setAttribute('aria-expanded',String(!!$('#cubeWin')));
  b.title=off?`${cubeTab.name} is no longer connected. Open its window to connect again.`:`Open the window of ${cubeTab.name}: a live view of your smart cube.`;
  b.setAttribute('aria-label',off?`${cubeTab.name}, not connected. Open its window.`:`Open the window of your smart cube, ${cubeTab.name}`);
}
// ----- the floating window -----
function cubeTabOpen(){
  if($('#cubeWin')||!cubeTab.name)return;
  const w=document.createElement('div');w.className='cubewin panel';w.id='cubeWin';w.setAttribute('role','dialog');w.setAttribute('aria-label',`Smart cube window: ${cubeTab.name}`);
  w.innerHTML=`<div class="cw-head"><span class="dot" aria-hidden="true"></span><b class="nm"></b><button class="small ghost" id="cubeWinClose" title="Collapse the window back into the tab (Esc)">Close<span class="hk" aria-hidden="true">Esc</span></button></div>
   <svg id="cubeWinSvg" viewBox="0 0 400 360" role="img" aria-label="Your smart cube, live"></svg>
   <p class="muted cw-note" id="cubeWinNote"></p>
   <div class="scan-row hidden" id="cubeWinAgain"><button class="small" id="cubeWinConnect">Connect again</button></div>`;
  document.body.appendChild(w);
  $('#cubeWinClose').onclick=cubeTabClose;
  $('#cubeWinConnect').onclick=()=>{cubeTabClose();openSmart();};
  document.addEventListener('keydown',cubeTabKeys,true);
  cubeTabRender();cubeTabWindow();
  if(cubeTab.conn)cubeTabAsk(); // the first picture
  setTimeout(()=>{const c=$('#cubeWinClose');if(c)c.focus();},20);
}
function cubeTabClose(){
  const w=$('#cubeWin');if(!w)return;
  document.removeEventListener('keydown',cubeTabKeys,true);
  cubeTabStopAnim();w.remove();cubeTabRender();
  const b=cubeTabBtn();if(b)b.focus();
}
// Esc closes the window, unless a modal is open: that one takes the key.
function cubeTabKeys(e){
  if(e.key!=='Escape'||!$('#cubeWin')||document.querySelector('.modal-bg'))return;
  e.preventDefault();e.stopPropagation();cubeTabClose();
}
// The window's text and the cube it shows.
function cubeTabWindow(){
  const w=$('#cubeWin');if(!w)return;
  const off=!cubeTab.conn;
  w.classList.toggle('off',off);
  w.querySelector('.nm').textContent=cubeTab.name;
  $('#cubeWinNote').textContent=off?'The cube is no longer connected. Turn a face to wake it up, then connect again.':cubeTab.shown?'Live. Each turn of your cube turns the layer here.':'Reading the cube.';
  $('#cubeWinAgain').classList.toggle('hidden',!off);
  cubeTabDraw();
}
function cubeTabDraw(){
  const svg=$('#cubeWinSvg');if(!svg)return;
  const a=cubeTab.anim,o={yaw:cubeTab.yaw,pitch:cubeTab.pitch,n:3};
  if(a&&a.t<1)svg.innerHTML=renderCube3D(a.from.toFacelets(),Object.assign(o,{move:a.move,t:Math.max(a.t,0.01)}));
  else{const f=cubeTab.shown?cubeTab.shown.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);svg.innerHTML=renderCube3D(f,o);}
}
// ----- live: a turn asks the cube for its state, the state turns the layer -----
// One request at a time. A turn during a request marks `want`, and the answer asks again, so the
// picture ends on the real cube however fast the turns come.
function cubeTabAsk(){
  if(!cubeTab.conn||!$('#cubeWin'))return;
  if(cubeTab.asked){cubeTab.want=true;return;}
  cubeTab.asked=true;
  cubeTab.conn.send('state').catch(()=>{cubeTab.asked=false;});
}
const CUBE_TAB_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
// The one move that takes `from` to `to`, or null.
function cubeTabMove(from,to){
  if(!from||!to||from.equals(to))return null;
  return CUBE_TAB_MOVES.find(m=>applyAlg(from,[m]).equals(to))||null;
}
// Show `cube`. One move away from the last picture: turn that layer. Otherwise show it at once.
function cubeTabShow(cube){
  const from=cubeTab.shown;cubeTabStopAnim();cubeTab.shown=cube;
  const m=cubeTabMove(from,cube);
  const still=(typeof reducedMotion==='function'&&reducedMotion())||typeof requestAnimationFrame!=='function';
  if(!m||still||!$('#cubeWin')){cubeTabWindow();return;}
  const dur=m.endsWith('2')?360:260,t0=performance.now();
  cubeTab.anim={from,move:m,t:0};
  const step=()=>{const x=Math.min(1,(performance.now()-t0)/dur);cubeTab.anim.t=x<1?0.5-0.5*Math.cos(Math.PI*x):1;
    if(x>=1){cubeTab.raf=0;cubeTab.anim=null;cubeTabWindow();return;}
    cubeTabDraw();cubeTab.raf=requestAnimationFrame(step);};
  cubeTabWindow();cubeTab.raf=requestAnimationFrame(step);
}
function cubeTabStopAnim(){if(cubeTab.raf){cancelAnimationFrame(cubeTab.raf);cubeTab.raf=0;}cubeTab.anim=null;}
// ----- the first time: dim the page around the tab and point to it -----
function cubeTabSpot(){
  if(store.get('cubeTip',0)||!cubeTabBtn()||$('#cubeSpot'))return;
  if(document.querySelector('.modal-bg')){cubeTab.tipWait=true;return;} // after the dialog closes
  cubeTab.tipWait=false;store.set('cubeTip',1);
  const s=document.createElement('div');s.className='spot';s.id='cubeSpot';
  s.innerHTML='<div class="sh"></div><div class="sh"></div><div class="sh"></div><div class="sh"></div><div class="ring" aria-hidden="true"></div><div class="callout" role="status"></div>';
  s.querySelector('.callout').textContent=CUBE_TAB_TIP;
  s.querySelectorAll('.sh').forEach(d=>{d.onclick=cubeTabSpotEnd;});
  document.body.appendChild(s);
  cubeTabSpotLayout();
  window.addEventListener('resize',cubeTabSpotLayout);
  document.addEventListener('keydown',cubeTabSpotKeys,true);
  cubeTab.spotTimer=setTimeout(cubeTabSpotEnd,8000);
}
// Four shades around a hole over the tab, a ring on the hole, the callout under it.
function cubeTabSpotLayout(){
  const s=$('#cubeSpot'),b=cubeTabBtn();if(!s||!b)return;
  const r=b.getBoundingClientRect(),pad=10,W=window.innerWidth;
  const top=Math.max(0,r.top-pad),left=Math.max(0,r.left-pad),bottom=r.bottom+pad,right=r.right+pad;
  const sh=s.querySelectorAll('.sh'),px=v=>Math.round(v)+'px';
  Object.assign(sh[0].style,{top:0,left:0,right:0,height:px(top)});
  Object.assign(sh[1].style,{top:px(bottom),left:0,right:0,bottom:0});
  Object.assign(sh[2].style,{top:px(top),left:0,width:px(left),height:px(bottom-top)});
  Object.assign(sh[3].style,{top:px(top),left:px(right),right:0,height:px(bottom-top)});
  Object.assign(s.querySelector('.ring').style,{top:px(top),left:px(left),width:px(right-left),height:px(bottom-top)});
  const c=s.querySelector('.callout'),cl=Math.max(8,Math.min(left,W-c.offsetWidth-8));
  c.style.top=px(bottom+12);c.style.left=px(cl);
  c.style.setProperty('--arrow',px(Math.max(12,Math.min(r.left-cl+r.width/2-8,Math.max(12,c.offsetWidth-28)))));
}
function cubeTabSpotKeys(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cubeTabSpotEnd();}}
function cubeTabSpotEnd(){
  const s=$('#cubeSpot');if(!s)return;
  clearTimeout(cubeTab.spotTimer);window.removeEventListener('resize',cubeTabSpotLayout);document.removeEventListener('keydown',cubeTabSpotKeys,true);
  s.remove();
}
// ----- what the Smart cube dialog reports -----
function cubeTabEvent(ev){
  if(ev.type==='connect'){
    cubeTab.conn=ev.conn;cubeTab.name=smartNiceName(ev.conn.name);cubeTab.shown=null;cubeTab.asked=false;cubeTab.want=false;cubeTabStopAnim();
    cubeTabRender();
    if(ev.cube)cubeTabShow(ev.cube);else cubeTabWindow();
    if($('#cubeWin'))cubeTabAsk();
    cubeTabSpot();return;
  }
  if(ev.type==='disconnect'){cubeTab.conn=null;cubeTab.name='';cubeTab.shown=null;cubeTabStopAnim();cubeTabClose();cubeTabSpotEnd();cubeTabRender();return;}
  if(ev.type==='gone'){if(ev.conn!==cubeTab.conn)return;cubeTab.conn=null;cubeTab.asked=false;cubeTab.want=false;cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='close'){if(cubeTab.tipWait)cubeTabSpot();return;}
  if(ev.conn!==cubeTab.conn)return;
  if(ev.type==='move')cubeTabAsk();
  if(ev.type==='state'){cubeTab.asked=false;if(cubeTab.want){cubeTab.want=false;cubeTabAsk();}cubeTabShow(ev.cube);}
}
if(typeof document!=='undefined')document.addEventListener('cw:smart',e=>cubeTabEvent(e.detail));
