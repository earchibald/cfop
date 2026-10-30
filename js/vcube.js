// ===== The virtual cube on the player: the Virtual cube chip and the Keys window =====
// The chip on the player cube (#vcubeBtn) turns the virtual cube on: the cube menu's source is
// Virtual cube (setCubeSrc('screen')). The Keys window floats over the page only after a pick of
// Virtual cube (the menu, the chip, the getting-started pages): a load keeps it closed, and the
// keys work all the same. Close hides the window; the chip shows it again, and a press of the chip
// with the window open turns the virtual cube off. Its six face buttons sit as the keys do (U and B
// on top, L F R across, D under), each with its key and a bar of the color of the face it turns,
// as the picture shows it (playerHeldCube). M (the middle layer) sits right of D, as C sits right
// of X; x, y, z (the whole cube) sit in a row under them, as , . / do. The two modifiers sit on the
// left, as on the keyboard: Wide (Option) on top, Prime (Shift) under. A click on a modifier holds
// it on (sticky) for the clicks on the window's buttons until a second click; the keys of the
// keyboard take the modifiers held down with them, never the sticky ones. One layout of keys at a
// time, WASD+ (A W D X · S E, C) or NumKeys (4 8 6 2 · 5 9, 3) (cw:vcubeKeys): the keys of the
// other layout keep their own shortcuts. Wide shows on the 3×3 and the 4×4 (Rr), M on the 3×3
// only. The head drags the window; its place is kept (cw:vcubeWin) and kept on the screen. The
// first time it sits under the rail, or beside the player cube, so the moves stay in view. A key
// or a press lights its button for a moment.
const VCUBE={prime:false,wide:false,drag:null,open:false};
// The buttons in the grid: [face, column, row]. Faces and M as the keys sit; x y z in a row under.
const VCUBE_GRID=[['U',2,1],['B',3,1],['L',1,2],['F',2,2],['R',3,2],['D',2,3],['M',3,3],['x',1,4],['y',2,4],['z',3,4]];
const VCUBE_WORDS={U:'top',D:'bottom',L:'left',R:'right',F:'front',B:'back'};
function vcubeLayout(){const v=store.get('vcubeKeys','awdx');return SCREEN_KEYMAPS[v]?v:'awdx';}
function vcubeOn(){return typeof cubeSrc==='function'&&cubeSrc()==='screen';}
// The window shows while the player takes the keys: Virtual cube is the choice, and no other
// virtual cube (the getting-started pages) has them.
function vcubeShown(){return vcubeOn()&&VCUBE.open&&SCREEN.active===cubePlayerScreen&&!$('#player').closest('.hidden,[hidden]');}
function vcubeEl(tag,attrs,...kids){return liveEl(tag,attrs,...kids);}
// The modifiers in force for a click: the sticky ones, or the keys held down with the click. No wide
// turn on the 2×2.
function vcubeMods(e){return {prime:VCUBE.prime!==!!(e&&e.shiftKey),wide:(VCUBE.wide&&puzzleN()!==2)||!!(e&&e.altKey)};}
function vcubeMount(){
  if($('#vcubeWin'))return $('#vcubeWin');
  const close=vcubeEl('button',{type:'button',class:'small ghost vk-close',title:'Hide this window. The keys still turn the cube; the Virtual cube chip shows it again','aria-label':'Close'},'×');
  const head=vcubeEl('div',{class:'vk-head',title:'Drag to move the window'},vcubeEl('b',{},'Virtual cube'),vcubeEl('span',{class:'grow'}),close);
  const seg=vcubeEl('div',{class:'vk-lay',role:'group','aria-label':'Keys'});
  for(const [id,m] of Object.entries(SCREEN_KEYMAPS)){const b=vcubeEl('button',{type:'button','data-lay':id,title:`${m.where}: ${m.name}. The other keys keep their own shortcuts`},m.short);b.onclick=()=>{store.set('vcubeKeys',id);vcubeDraw();};seg.append(b);}
  const pad=vcubeEl('div',{class:'vk-pad'});
  for(const [f,c,r] of VCUBE_GRID){const b=vcubeEl('button',{type:'button',class:'xyz'.includes(f)?'vk-rot':'vk-face','data-f':f,style:`grid-column:${c};grid-row:${r}`},vcubeEl('b',{},f),vcubeEl('span',{class:'vk-key'}));
    b.onclick=e=>{const o=vcubeMods(e);cubePlayerScreen.turn(screenMove(f,o.prime,o.wide));};pad.append(b);}
  // The modifiers: a click holds one on for the clicks on this window; a second click lets it go.
  const mod=(id,word,col,row)=>{const b=vcubeEl('button',{type:'button',class:'vk-mod','data-mod':id,'aria-pressed':'false',style:`grid-column:${col};grid-row:${row}`},vcubeEl('b',{},word),vcubeEl('span',{class:'vk-key'}));
    b.onclick=()=>{VCUBE[id]=!VCUBE[id];vcubeDraw();};pad.append(b);};
  mod('wide','Wide',1,1);mod('prime','Prime',1,3);
  const win=vcubeEl('div',{id:'vcubeWin',class:'vcubewin',role:'dialog','aria-label':'Virtual cube keys',hidden:''},head,pad,seg);
  document.body.append(win);
  close.onclick=()=>{VCUBE.open=false;vcubeDraw();};
  head.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('button'))return;const r=win.getBoundingClientRect();VCUBE.drag={dx:e.clientX-r.left,dy:e.clientY-r.top};try{head.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
  head.addEventListener('pointermove',e=>{if(!VCUBE.drag)return;vcubePlace(e.clientX-VCUBE.drag.dx,e.clientY-VCUBE.drag.dy);});
  const end=()=>{if(!VCUBE.drag)return;VCUBE.drag=null;store.set('vcubeWin',{x:parseFloat(win.style.left)||0,y:parseFloat(win.style.top)||0});};
  head.addEventListener('pointerup',end);head.addEventListener('pointercancel',end);
  return win;
}
// Put the window at x, y, kept on the screen.
function vcubePlace(x,y){const win=$('#vcubeWin');if(!win)return;const W=innerWidth||800,H=innerHeight||600,w=win.offsetWidth||220,h=win.offsetHeight||200;
  win.style.left=Math.max(4,Math.min(W-w-4,x))+'px';win.style.top=Math.max(4,Math.min(H-h-4,y))+'px';}
function vcubeDraw(){
  const btn=$('#vcubeBtn');if(btn){btn.setAttribute('aria-pressed',String(vcubeOn()));
    btn.title=!vcubeOn()?'Turn the cube here with the keys or the buttons of a small window, as a virtual cube':VCUBE.open?'Turn the virtual cube off: back to a regular cube':'Show the keys window of the virtual cube';}
  cubePlayerScreen.layout=vcubeLayout();
  const show=vcubeShown(),win=show?vcubeMount():$('#vcubeWin');if(!win)return;
  const was=win.hidden;win.hidden=!show;if(!show)return;
  const keys=screenKeys(vcubeLayout());
  win.querySelectorAll('[data-lay]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lay===vcubeLayout())));
  const D=typeof playerHeldCube==='function'?playerHeldCube():null,n=puzzleN(),alt=screenWideKey();
  const prime=VCUBE.prime,wide=VCUBE.wide&&n!==2;
  win.querySelectorAll('[data-f]').forEach(b=>{const f=b.dataset.f,k=keys[f],face='URFDLB'.includes(f),c=D&&face?D.center[FACE_NAMES.indexOf(f)]:-1;
    const mv=screenMoveFor(screenMove(f,prime,wide),n);b.hidden=!mv;if(!mv)return;
    b.querySelector('.vk-key').textContent=k;
    b.className=(face||f==='M'?'vk-face':'vk-rot')+(c>=0?' c'+c:'')+(b.classList.contains('on')?' on':'');
    const turn=face?`turn the ${VCUBE_WORDS[f]} face${wide?' and the layer next to it':''} ${prime?'counterclockwise':'clockwise'}`
      :f==='M'?`turn the middle layer between left and right, as L${prime?"'":''} turns`:`turn the whole cube, as ${{x:'R',y:'U',z:'F'}[f]}${prime?"'":''} turns`;
    b.title=`${mv}: ${turn}, as the picture shows it. Key ${k}; Shift+${k} turns the other way${face&&n!==2?`; ${alt}+${k} turns two layers`:''}`;
    b.querySelector('b').textContent=mv;});
  const pm=win.querySelector('[data-mod="prime"]'),wm=win.querySelector('[data-mod="wide"]');
  pm.setAttribute('aria-pressed',String(prime));pm.querySelector('.vk-key').textContent='Shift';
  pm.title=`Prime: the buttons here turn the other way, counterclockwise (R'). ${prime?'Click again to turn it off':'It stays on until you click it again'}. On the keyboard, hold Shift with a key`;
  wm.hidden=n===2;wm.setAttribute('aria-pressed',String(wide));wm.querySelector('.vk-key').textContent=alt;
  wm.title=`Wide: the face buttons here turn two layers, the face and the layer next to it (${n===4?'Rr':'r'}). ${wide?'Click again to turn it off':'It stays on until you click it again'}. On the keyboard, hold ${alt} with a key`;
  // The first time: under the rail where there is room, else left of the player cube, else under
  // the player, so the cube and the moves stay in view.
  if(was){const at=store.get('vcubeWin',null);if(at&&isFinite(at.x))vcubePlace(at.x,at.y);else vcubePlace(...vcubeHome(win));}
}
function vcubeHome(win){
  const box=$('#player .cubebox').getBoundingClientRect(),w=win.offsetWidth||180,h=win.offsetHeight||220,H=innerHeight||600;
  const rail=[...$$('.rail')].find(x=>x.offsetParent!==null),r=rail&&rail.getBoundingClientRect();
  if(r&&r.width>=w){const bot=[...rail.children].reduce((m,c)=>Math.max(m,c.getBoundingClientRect().bottom),r.top);if(bot+12+h<H)return [r.left,bot+12];}
  if(box.left-(r&&r.width?r.right:0)>w+24)return [box.left-w-12,box.top||120];
  const p=$('#player').getBoundingClientRect();return [box.left||8,(p.bottom||box.bottom||300)+12];
}
// A key or a press: its button lights for a moment.
// m: the move made (R, r, Rr, M, x').
function vcubeFlash(m){const f='xyzM'.includes(m[0])?m[0]:m[0].toUpperCase(),b=$(`#vcubeWin [data-f="${f}"]`);if(!b)return;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),220);}
// The chip: on with the window, or the window again when it was closed, or off when it shows.
function vcubeToggle(){if(!vcubeOn())setCubeSrc('screen');else if(!VCUBE.open){VCUBE.open=true;vcubeDraw();}else setCubeSrc('mine');}
if(typeof document!=='undefined'){
  $('#vcubeBtn').onclick=vcubeToggle;
  // A key lights its button: every turn of the player's virtual cube comes through here.
  const turn=cubePlayerScreen.turn;cubePlayerScreen.turn=m=>{const x=turn(m);if(x)vcubeFlash(x);return x;};
  // A pick of Virtual cube opens the window; any other pick closes it.
  document.addEventListener('cw:cubesrc',e=>{VCUBE.open=e.detail==='screen';vcubeDraw();});
  for(const ev of ['cw:tab','cw:method','cw:sequence','cw:smart','cw:step'])document.addEventListener(ev,()=>vcubeDraw());
  // The hold row turns the picture: the keys take the colors it shows.
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#viewHold'))vcubeDraw();});
  vcubeDraw();
}
