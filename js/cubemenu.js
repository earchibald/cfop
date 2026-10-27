// ===== Your cube: the cube chip and the cube menu =====
// The chip in the top bar names the cube the page follows: My cube (turned by hand; scan, paint or
// type it), Smart cube (GAN over Bluetooth) or Screen cube (six keys turn the cube in the section,
// js/screencube.js). A click opens the cube menu over the page, on every page, in every method.
// The menu takes over the seed bar's Scan, Paint and Smart cube and the connect of the Smart cube
// dialog (which stays as Options). cw:cubeSrc keeps the choice; a change fires cw:cubesrc.
const CUBE_SRCS=[
  {id:'screen',name:'Screen cube',tip:'A cube on the screen, turned by keys'},
  {id:'mine',name:'My cube',tip:'A cube you turn by hand'},
  {id:'smart',name:'Smart cube',tip:'A GAN smart cube over Bluetooth'}];
function cubeSrc(){const v=store.get('cubeSrc','mine');return CUBE_SRCS.some(s=>s.id===v)?v:'mine';}
function cubeSrcName(id){return (CUBE_SRCS.find(s=>s.id===(id||cubeSrc()))||CUBE_SRCS[1]).name;}
function smartLive(){return typeof smartConn!=='undefined'&&!!smartConn;}
function setCubeSrc(id){if(!CUBE_SRCS.some(s=>s.id===id))return;store.set('cubeSrc',id);cubeChipDraw();cubeScreenWire();
  if(cubePopOpen())cubePopDraw();document.dispatchEvent(new CustomEvent('cw:cubesrc',{detail:id}));}
// A key of the screen cube turns the cube in the section: the move goes on the player after the
// step in view (the moves after it drop off), and the layer turns.
function cubePlayerTurn(m){const i=seqState.idx;seqState.moves=seqState.moves.slice(0,i).concat(parseAlg(m));seqState.idx=i+1;
  if(!/your moves/.test(seqState.label))seqState.label=(seqState.label?seqState.label+' · ':'')+'your moves';
  renderSequence();applySequence();}
const cubePlayerScreen={el:null,keys:true,turn:m=>cubePlayerTurn(m)};
// The player takes the screen cube's keys while Screen cube is the choice and no other screen cube
// (the getting-started pages) has them.
function cubeScreenWire(){cubePlayerScreen.el=$('#player');
  if(cubeSrc()==='screen'){if(!SCREEN.active||SCREEN.active===cubePlayerScreen||!SCREEN.active.el.isConnected)SCREEN.active=cubePlayerScreen;}
  else if(SCREEN.active===cubePlayerScreen)SCREEN.active=null;
  document.body.dataset.cubesrc=cubeSrc();}
function cubeChipDraw(){const id=smartLive()?'smart':cubeSrc();const c=$('#cubeChip');if(!c)return;
  c.dataset.src=id;$('#cubeChipName').textContent=cubeSrcName(id);}
function cubePopOpen(){const p=$('#cubePop');return !!p&&!p.classList.contains('hidden');}
function cubePopClose(){const p=$('#cubePop');if(!p)return;p.classList.add('hidden');$('#cubeChip').setAttribute('aria-expanded','false');}
function cubePopOpenNow(){if(typeof closeMethodPop==='function')closeMethodPop();const p=$('#cubePop'),chip=$('#cubeChip');cubePopDraw();
  if(!mobileMQ.matches)p.style.left=Math.max(8,chip.offsetLeft)+'px';else p.style.left='';
  p.classList.remove('hidden');chip.setAttribute('aria-expanded','true');setTimeout(()=>{const b=p.querySelector('.csrc.on');if(b)b.focus();},20);}
function cubeAct(name,note,tip,act,{key='',main=false}={}){return {name,note,tip,act,key,main};}
// What the menu offers for each source.
function cubePopActions(id){
  if(id==='screen')return {
    head:'Mixed up: scramble '+(scr.seed||''),
    text:'Keys '+SCREEN_KEYMAPS[SCREEN.layout].name+' turn the faces. Shift turns the other way. Drag to turn the whole cube.',
    acts:[cubeAct('Mix it up','A new scramble','Mix the screen cube up','mix',{key:'N',main:true}),cubeAct('Make it solved','Back to the start','Put the screen cube back to solved','solved'),
      cubeAct('Paint a state','Set each color','Paint the screen cube by hand','paint'),cubeAct('Keys','Choose a layout','Choose one of the four key layouts','keys')],
    foot:'The screen cube draws inside each section that needs it. It is never on top of the page.'};
  if(id==='smart'){const live=smartLive();return {
    head:live?(typeof smartNiceName==='function'&&smartConn.name?smartNiceName(smartConn.name):'Smart cube')+(smartConn.battery!=null?' · '+smartConn.battery+'%':''):'Not connected',
    text:live?'Connected. The page sees every turn. The live view is on the Smart cube tab.':'Connect a GAN smart cube. Chrome and Edge connect directly. Safari connects through the Mac app.',
    acts:live?[cubeAct('Live view','The Smart cube tab','Go to the Smart cube tab','live',{main:true}),cubeAct('My cube is solved','Reset what the page reads','Tell the page the cube is solved','smartSolved'),
      cubeAct('Fix the colors','Scan or paint it','Correct the state the cube reports','smartFix'),cubeAct('Disconnect','Back to My cube','Disconnect the smart cube','disconnect')]
      :[cubeAct('Connect','Look for a cube','Look for a GAN smart cube','connect',{main:true}),cubeAct('Options','The Smart cube window','Open the Smart cube window','options')],
    foot:'No smart cube yet? Connect opens the browser’s chooser. Safari connects through the Mac app.'};}
  return {head:'Following scramble '+(scr.seed||''),text:'The page thinks your cube looks like this. Not so? Show it to the page.',
    acts:[cubeAct('Scan my cube','With the camera','Read the cube with the camera','scan',{main:true}),cubeAct('Paint my cube','Click each color','Paint the colors by hand','paint'),
      cubeAct('Type the letters','Moves, or 54 letters','Type or paste a scramble or the letters of a state','type'),cubeAct('My cube is solved','Start from solved','Tell the page your cube is solved','solved')],
    foot:'A scanned, painted or typed cube becomes the current scramble. Every section uses it.'};
}
function cubePopDraw(){const p=$('#cubePop');if(!p)return;const id=cubeSrc(),a=cubePopActions(id);
  const pic=typeof displayedCube!=='undefined'&&displayedCube&&!displayedCube.isFour?displayedCube:scr.cube;
  const keys=Object.entries(SCREEN_KEYMAPS).map(([k,m])=>`<button class="small ckey${k===SCREEN.layout?' on':''}" data-keys="${k}" aria-pressed="${k===SCREEN.layout}" title="Use these keys">${esc(m.name)}</button>`).join('');
  p.innerHTML=`<div class="cpop-head"><h3>Your cube</h3><span class="muted">Every section uses it.</span></div>
    <div class="csrcs" role="group" aria-label="Cube source">${CUBE_SRCS.map(s=>`<button class="csrc${s.id===id?' on':''}" data-src="${s.id}" aria-pressed="${s.id===id}" title="${esc(s.tip)}"><i class="cdot" data-src="${s.id}"></i>${esc(s.name)}</button>`).join('')}</div>
    <div class="cstat"><div class="cpic" aria-hidden="true">${pic&&pic.toFacelets?`<svg viewBox="40 30 320 300">${renderCube3D(pic.toFacelets(),{yaw:-32,pitch:28,scale:48})}</svg>`:''}</div>
      <div><b>${esc(a.head)}</b><span class="muted">${esc(a.text)}</span></div></div>
    <div class="cacts">${a.acts.map(x=>`<button class="cact${x.main?' main':''}" data-act="${x.act}" title="${esc(x.tip)}"><b>${esc(x.name)}${x.key?`<span class="hk" aria-hidden="true">${x.key}</span>`:''}</b><span>${esc(x.note)}</span></button>`).join('')}</div>
    <div class="ckeys hidden" id="cubeKeys"><span class="muted">Keys for your keyboard</span><div class="row">${keys}</div></div>
    <span class="muted cfoot">${esc(a.foot)}</span>`;
  p.querySelectorAll('.csrc').forEach(b=>b.onclick=()=>{setCubeSrc(b.dataset.src);if(b.dataset.src==='smart'&&!smartLive())cubeDo('options');});
  p.querySelectorAll('.cact').forEach(b=>b.onclick=()=>cubeDo(b.dataset.act));
  p.querySelectorAll('.ckey').forEach(b=>b.onclick=()=>{screenSetLayout(b.dataset.keys);cubePopDraw();$('#cubeKeys').classList.remove('hidden');});
}
function cubeDo(act){
  const close=()=>cubePopClose();
  switch(act){
    case 'mix':close();newScramble();break;
    case 'solved':close();loadScramble('solved',[],true);break;
    case 'paint':close();openPaint();break;
    case 'scan':close();$('#camBtn').click();break;
    case 'type':close();openEnter();break;
    case 'keys':$('#cubeKeys').classList.toggle('hidden');break;
    case 'live':close();if(method!=='cfop')setMethod('cfop');goTab('smart');break;
    case 'connect':close();openSmart();break;
    case 'options':case 'smartSolved':case 'smartFix':close();openSmart();break;
    case 'disconnect':close();if(typeof smartDisconnect==='function')smartDisconnect();setCubeSrc('mine');break;
  }
}
// The chip and the menu, after the method chip.
(function cubeMenuInit(){
  const chip=document.createElement('button');chip.className='cubechip';chip.id='cubeChip';chip.setAttribute('aria-expanded','false');chip.setAttribute('aria-controls','cubePop');
  chip.title='Your cube: choose it, scan it, paint it or connect it';
  chip.innerHTML='<i class="cdot" aria-hidden="true"></i><span id="cubeChipName">My cube</span> <span aria-hidden="true">▾</span>';
  const pop=document.createElement('div');pop.id='cubePop';pop.className='method-pop cube-pop hidden';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Your cube');
  const mpop=$('#methodPop');mpop.after(chip);chip.after(pop);
  chip.onclick=()=>{if(cubePopOpen())cubePopClose();else cubePopOpenNow();};
  document.addEventListener('click',e=>{if(!cubePopOpen())return;if(e.target.closest('#cubePop')||e.target.closest('#cubeChip'))return;cubePopClose();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cubePopOpen()){cubePopClose();$('#cubeChip').focus();}});
  document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;if(t==='connect')store.set('cubeSrc','smart');
    if(t==='connect'||t==='disconnect'||t==='gone'||t==='battery'){cubeChipDraw();cubeScreenWire();if(cubePopOpen())cubePopDraw();}});
  document.addEventListener('cw:scramble',()=>{if(cubePopOpen())cubePopDraw();});
  SCREEN.layout=store.get('screenKeys','awdx');if(!SCREEN_KEYMAPS[SCREEN.layout])SCREEN.layout='awdx';
  cubeChipDraw();cubeScreenWire();
})();
