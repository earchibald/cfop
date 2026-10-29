// ===== The virtual cube on the player: the Virtual cube chip and the Keys window =====
// The chip on the player cube (#vcubeBtn) turns the virtual cube on and off: on, the cube menu's
// source is Virtual cube (setCubeSrc('screen')) and the Keys window floats over the page. Its six
// buttons sit as the keys do (U and B on top, L F R across, D under), each with its key, and
// turn that face as the picture shows it (playerKeyMove). Counterclockwise makes the next presses
// turn the other way, as Shift does. One layout of keys at a time, A W D X · S E or the keypad
// 4 8 6 2 · 5 9 (cw:vcubeKeys): the keys of the other layout keep their own shortcuts. The head
// drags the window; its place is kept (cw:vcubeWin) and kept on the screen. Close turns the
// virtual cube off. A key or a press lights its button for a moment.
const VCUBE={prime:false,drag:null};
// The six buttons in the grid, as the keys sit: [face, column, row].
const VCUBE_GRID=[['U',2,1],['B',3,1],['L',1,2],['F',2,2],['R',3,2],['D',2,3]];
function vcubeLayout(){const v=store.get('vcubeKeys','awdx');return SCREEN_KEYMAPS[v]?v:'awdx';}
function vcubeOn(){return typeof cubeSrc==='function'&&cubeSrc()==='screen';}
// The window shows while the player takes the keys: Virtual cube is the choice, and no other
// virtual cube (the getting-started pages) has them.
function vcubeShown(){return vcubeOn()&&SCREEN.active===cubePlayerScreen&&!$('#player').closest('.hidden,[hidden]');}
function vcubeEl(tag,attrs,...kids){return liveEl(tag,attrs,...kids);}
function vcubeMount(){
  if($('#vcubeWin'))return $('#vcubeWin');
  const close=vcubeEl('button',{type:'button',class:'small ghost vk-close',title:'Turn the virtual cube off','aria-label':'Close'},'×');
  const head=vcubeEl('div',{class:'vk-head',title:'Drag to move the window'},vcubeEl('b',{},'Virtual cube'),vcubeEl('span',{class:'grow'}),close);
  const seg=vcubeEl('div',{class:'st-seg vk-lay',role:'group','aria-label':'Keys'});
  for(const [id,m] of Object.entries(SCREEN_KEYMAPS)){const b=vcubeEl('button',{type:'button','data-lay':id,title:`${m.where}: ${m.name}. The other keys keep their own shortcuts`},m.name);b.onclick=()=>{store.set('vcubeKeys',id);vcubeDraw();};seg.append(b);}
  const pad=vcubeEl('div',{class:'vk-pad'});
  for(const [f,c,r] of VCUBE_GRID){const b=vcubeEl('button',{type:'button',class:'vk-face','data-f':f,style:`grid-column:${c};grid-row:${r}`},vcubeEl('b',{},f),vcubeEl('span',{class:'vk-key'}));
    b.onclick=e=>cubePlayerScreen.turn(f+(VCUBE.prime!==e.shiftKey?"'":''));pad.append(b);}
  const prime=vcubeEl('button',{type:'button',class:'small vk-prime','aria-pressed':'false',title:'The buttons turn the faces counterclockwise, as Shift does'},'Counterclockwise');
  prime.onclick=()=>{VCUBE.prime=!VCUBE.prime;vcubeDraw();};
  const note=vcubeEl('p',{class:'muted vk-note'},'A key alone turns a face clockwise; Shift turns it the other way. Drag the cube to look around it.');
  const win=vcubeEl('div',{id:'vcubeWin',class:'vcubewin',role:'dialog','aria-label':'Virtual cube keys',hidden:''},head,seg,pad,prime,note);
  document.body.append(win);
  close.onclick=()=>setCubeSrc('mine');
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
  const btn=$('#vcubeBtn');if(btn)btn.setAttribute('aria-pressed',String(vcubeOn()));
  cubePlayerScreen.layout=vcubeLayout();
  const show=vcubeShown(),win=show?vcubeMount():$('#vcubeWin');if(!win)return;
  const was=win.hidden;win.hidden=!show;if(!show)return;
  const keys=screenKeys(vcubeLayout());
  win.querySelectorAll('[data-lay]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lay===vcubeLayout())));
  win.querySelectorAll('.vk-face').forEach(b=>{const f=b.dataset.f,k=keys[f];b.querySelector('.vk-key').textContent=k;
    b.title=`${f}${VCUBE.prime?"'":''}: turn the ${{U:'top',D:'bottom',L:'left',R:'right',F:'front',B:'back'}[f]} face ${VCUBE.prime?'counterclockwise':'clockwise'}, as the picture shows it. Key ${k}, Shift ${k} the other way`;
    b.querySelector('b').textContent=f+(VCUBE.prime?"'":'');});
  const p=win.querySelector('.vk-prime');p.setAttribute('aria-pressed',String(VCUBE.prime));
  // The first time: beside the player cube, on the side with room, so the cube stays in view.
  if(was){const at=store.get('vcubeWin',null);if(at&&isFinite(at.x))vcubePlace(at.x,at.y);else{const r=$('#player .cubebox').getBoundingClientRect(),w=win.offsetWidth||212;
    vcubePlace(r.left>w+24?r.left-w-12:(r.right||420)+12,(r.top||120));}}
}
// A key or a press: its button lights for a moment.
function vcubeFlash(f){const b=$(`#vcubeWin .vk-face[data-f="${f}"]`);if(!b)return;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),220);}
function vcubeToggle(){if(vcubeOn())setCubeSrc('mine');else setCubeSrc('screen');}
if(typeof document!=='undefined'){
  $('#vcubeBtn').onclick=vcubeToggle;
  // A key lights its button: every turn of the player's virtual cube comes through here.
  const turn=cubePlayerScreen.turn;cubePlayerScreen.turn=m=>{turn(m);vcubeFlash(m[0]);};
  for(const ev of ['cw:cubesrc','cw:tab','cw:method','cw:sequence','cw:smart'])document.addEventListener(ev,()=>vcubeDraw());
  vcubeDraw();
}
