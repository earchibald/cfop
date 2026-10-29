// ===== The virtual cube on the player: the Virtual cube chip and the Keys window =====
// The chip on the player cube (#vcubeBtn) turns the virtual cube on: the cube menu's source is
// Virtual cube (setCubeSrc('screen')). The Keys window floats over the page only after a pick of
// Virtual cube (the menu, the chip, the getting-started pages): a load keeps it closed, and the
// keys work all the same. Close hides the window; the chip shows it again, and a press of the chip
// with the window open turns the virtual cube off. Its six keys sit as the keys do (U and B on top,
// L F R across, D under), each with its key and a bar of the color of the face it turns, as the
// picture shows it (playerHeldCube). The Shift key in the corner makes the next presses turn the
// other way, as Shift does. One layout of keys at a time, A W D X · S E or the keypad
// 4 8 6 2 · 5 9 (cw:vcubeKeys): the keys of the other layout keep their own shortcuts. The head
// drags the window; its place is kept (cw:vcubeWin) and kept on the screen. The first time it sits
// under the rail, or beside the player cube, so the moves stay in view. A key or a press lights
// its button for a moment.
const VCUBE={prime:false,drag:null,open:false};
// The six buttons in the grid, as the keys sit: [face, column, row].
const VCUBE_GRID=[['U',2,1],['B',3,1],['L',1,2],['F',2,2],['R',3,2],['D',2,3]];
function vcubeLayout(){const v=store.get('vcubeKeys','awdx');return SCREEN_KEYMAPS[v]?v:'awdx';}
function vcubeOn(){return typeof cubeSrc==='function'&&cubeSrc()==='screen';}
// The window shows while the player takes the keys: Virtual cube is the choice, and no other
// virtual cube (the getting-started pages) has them.
function vcubeShown(){return vcubeOn()&&VCUBE.open&&SCREEN.active===cubePlayerScreen&&!$('#player').closest('.hidden,[hidden]');}
function vcubeEl(tag,attrs,...kids){return liveEl(tag,attrs,...kids);}
function vcubeMount(){
  if($('#vcubeWin'))return $('#vcubeWin');
  const close=vcubeEl('button',{type:'button',class:'small ghost vk-close',title:'Hide this window. The keys still turn the cube; the Virtual cube chip shows it again','aria-label':'Close'},'×');
  const head=vcubeEl('div',{class:'vk-head',title:'Drag to move the window'},vcubeEl('b',{},'Virtual cube'),vcubeEl('span',{class:'grow'}),close);
  const seg=vcubeEl('div',{class:'vk-lay',role:'group','aria-label':'Keys'});
  for(const [id,m] of Object.entries(SCREEN_KEYMAPS)){const b=vcubeEl('button',{type:'button','data-lay':id,title:`${m.where}: ${m.name}. The other keys keep their own shortcuts`},m.name.replace(/ /g,''));b.onclick=()=>{store.set('vcubeKeys',id);vcubeDraw();};seg.append(b);}
  const pad=vcubeEl('div',{class:'vk-pad'});
  for(const [f,c,r] of VCUBE_GRID){const b=vcubeEl('button',{type:'button',class:'vk-face','data-f':f,style:`grid-column:${c};grid-row:${r}`},vcubeEl('b',{},f),vcubeEl('span',{class:'vk-key'}));
    b.onclick=e=>cubePlayerScreen.turn(f+(VCUBE.prime!==e.shiftKey?"'":''));pad.append(b);}
  const prime=vcubeEl('button',{type:'button',class:'vk-prime','aria-pressed':'false',style:'grid-column:1;grid-row:3',title:'Counterclockwise: the keys turn the faces the other way, as Shift does. Press again for clockwise'},vcubeEl('b',{},'↺'),vcubeEl('span',{class:'vk-key'},'Shift'));
  prime.onclick=()=>{VCUBE.prime=!VCUBE.prime;vcubeDraw();};pad.append(prime);
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
  const D=typeof playerHeldCube==='function'?playerHeldCube():null;
  win.querySelectorAll('.vk-face').forEach(b=>{const f=b.dataset.f,k=keys[f],c=D?D.center[FACE_NAMES.indexOf(f)]:-1;b.querySelector('.vk-key').textContent=k;
    b.className='vk-face'+(c>=0?' c'+c:'')+(b.classList.contains('on')?' on':'');
    b.title=`${f}${VCUBE.prime?"'":''}: turn the ${{U:'top',D:'bottom',L:'left',R:'right',F:'front',B:'back'}[f]} face ${VCUBE.prime?'counterclockwise':'clockwise'}, as the picture shows it. Key ${k}, Shift ${k} the other way`;
    b.querySelector('b').textContent=f+(VCUBE.prime?"'":'');});
  const p=win.querySelector('.vk-prime');p.setAttribute('aria-pressed',String(VCUBE.prime));
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
function vcubeFlash(f){const b=$(`#vcubeWin .vk-face[data-f="${f}"]`);if(!b)return;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),220);}
// The chip: on with the window, or the window again when it was closed, or off when it shows.
function vcubeToggle(){if(!vcubeOn())setCubeSrc('screen');else if(!VCUBE.open){VCUBE.open=true;vcubeDraw();}else setCubeSrc('mine');}
if(typeof document!=='undefined'){
  $('#vcubeBtn').onclick=vcubeToggle;
  // A key lights its button: every turn of the player's virtual cube comes through here.
  const turn=cubePlayerScreen.turn;cubePlayerScreen.turn=m=>{turn(m);vcubeFlash(m[0]);};
  // A pick of Virtual cube opens the window; any other pick closes it.
  document.addEventListener('cw:cubesrc',e=>{VCUBE.open=e.detail==='screen';vcubeDraw();});
  for(const ev of ['cw:tab','cw:method','cw:sequence','cw:smart','cw:step'])document.addEventListener(ev,()=>vcubeDraw());
  // The hold row turns the picture: the keys take the colors it shows.
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#viewHold'))vcubeDraw();});
  vcubeDraw();
}
