// ===================== APP =====================
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const COLOR_NAMES=['white','red','green','yellow','orange','blue'];
const store={get(k,d){try{const v=localStorage.getItem('cw:'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('cw:'+k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// format a move: a prime move (letter and prime) gets the prime color; plain and 2 moves keep the text color
const fmtMove=m=>{const t=esc(m);return t.includes("'")?`<span class="mod">${t}</span>`:t;};
// A move the app cannot read, as one plain message. extra adds the move kinds a box also accepts.
function badMoveText(e,extra){const m=String(e&&e.message||'').replace(/^bad move /,'');return (m?`"${m}" is not a move. `:'')+"Use U R F D L B. Add ' to turn counterclockwise, or 2 for a half turn."+(extra?' '+extra:'');}
function fmtMoves(ms){return (Array.isArray(ms)?ms:parseAlg(ms)).join(' ');}

// ---------- rotation removal (for physical setups) ----------
const WIDE_EXP={r:['x','L'],l:["x'",'R'],u:['y','D'],d:["y'",'U'],f:['z','B'],b:["z'",'F']};
function expandToken(m){const b=m[0],sfx=m.slice(1);const flip=t=>sfx===''?t:sfx==='2'?t.replace("'","")+'2':(t.endsWith("'")?t.slice(0,-1):t+"'");
  if('rludfb'.includes(b)){return WIDE_EXP[b].map(flip);}
  if(b==='M')return [...expandToken('l'+sfx),...expandToken('L'+(sfx===''?"'":sfx==='2'?'2':''))];
  if(b==='E')return [...expandToken('d'+sfx),...expandToken('D'+(sfx===''?"'":sfx==='2'?'2':''))];
  if(b==='S')return [...expandToken('f'+sfx),...expandToken('F'+(sfx===''?"'":sfx==='2'?'2':''))];
  return [m];}
function removeRotations(moves){
  moves=Array.isArray(moves)?moves:parseAlg(moves);
  const net=applyAlg(new Cube(),moves);
  if(!moves.some(m=>'xyz'.includes(m[0]))&&net.center.join()==='0,1,2,3,4,5')return moves.slice();
  let rot=new Cube();const out=[];
  for(const m0 of moves)for(const m of expandToken(m0)){
    const b=m[0];
    if('xyz'.includes(b)){rot=rot.mul(MOVES[m]);continue;}
    const idx=FACE_NAMES.indexOf(b);out.push(FACE_NAMES[rot.center[idx]]+m.slice(1));
  }
  return simplify(out);
}
// ---------- SVG cube rendering: js/draw.js ----------
const view={yaw:-32,pitch:28,mode:'3d'};
let displayedCube=new Cube();let fadeSet=null;
// Animation: a layer turns on the player cube when the player steps one move. On by default in
// beginner mode, off in CFOP; the Animate chip on the cube (or the A key) changes it, per method.
var anim={pref:Object.assign({beginner:true,cfop:false,mini:true,speed2:false,master:true,speed4:false},store.get('anim',{})),raf:0,move:null,t:0,from:null}; // var: tests read it
function animOn(){return !!anim.pref[method];}
function setAnim(on){anim.pref[method]=!!on;store.set('anim',anim.pref);if(!on)stopAnim();renderAnimBtn();}
function renderAnimBtn(){const b=$('#animBtn');if(!b)return;const on=animOn();b.setAttribute('aria-pressed',String(on));b.title=on?'Moves turn on the cube. Press to show each move at once (A).':'Each move shows at once. Press to turn the layer on the cube (A).';}
function stopAnim(){if(anim.raf){cancelAnimationFrame(anim.raf);anim.raf=0;}anim.move=null;}
function reducedMotion(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
function showCube(cube,fade){stopAnim();displayedCube=cube;fadeSet=fade||null;drawMain();}
// Show `cube` by turning `move` on `from` first. The picture ends on `cube`, as showCube would.
function showCubeMoved(from,move,cube,fade){
  displayedCube=cube;fadeSet=fade||null;
  if(!animOn()||view.mode!=='3d'||reducedMotion()||typeof requestAnimationFrame!=='function'){stopAnim();drawMain();return;}
  stopAnim();const half=move.endsWith('2');let dur=half?420:300;if(auto.on)dur=Math.min(dur,autoMs()*0.7);
  anim.from=from;anim.move=move;anim.t=0;const t0=performance.now();
  const step=()=>{const x=Math.min(1,(performance.now()-t0)/dur);anim.t=x<1?0.5-0.5*Math.cos(Math.PI*x):1; // ease in and out
    if(x>=1){anim.raf=0;anim.move=null;drawMain();return;}
    drawMain();anim.raf=requestAnimationFrame(step);};
  anim.raf=requestAnimationFrame(step);
}
// The "Drag to rotate" hint shows in the 3D view until the first drag of the session.
let dragHintDone=false;
function drawDragHint(){const h=$('#dragHint');if(h)h.classList.toggle('hidden',dragHintDone||view.mode!=='3d');const a=$('#animBtn');if(a)a.classList.toggle('hidden',view.mode!=='3d');}
function drawMain(){
  const f=displayedCube.toFacelets();const svg=$('#cube');
  if(view.mode==='net'){svg.setAttribute('viewBox','0 0 400 300');svg.innerHTML=renderNet(f,{fade:fadeSet});}
  else if(anim.move&&anim.t<1){svg.setAttribute('viewBox','0 0 400 360');svg.innerHTML=renderCube3D(anim.from.toFacelets(),{yaw:view.yaw,pitch:view.pitch,fade:fadeSet,move:anim.move,t:Math.max(anim.t,0.01)});}
  else{svg.setAttribute('viewBox','0 0 400 360');svg.innerHTML=renderCube3D(f,{yaw:view.yaw,pitch:view.pitch,fade:fadeSet});}
  drawDragHint();
}
// The mark: the solved cube in the player view, half way through R. The same code draws
// both, so the mark is the player cube. One SVG serves both themes: the U, R and D stickers
// take --mk-top, --mk-side and --mk-bottom, which the theme sets. Dark mode shows white up and
// red right. Light mode shows the same cube with yellow up and orange right.
const MARK_VIEWBOX='-21.17 -23.45 45.63 46.41';
function drawMark(){const el=$('#mark');if(!el)return;
  const color=ci=>ci===0?'var(--mk-top)':ci===1?'var(--mk-side)':ci===3?'var(--mk-bottom)':stickerColor(ci);
  const polys=cubePolys(new Cube().toFacelets(),{move:'R',t:0.5,scale:10,cx:0,cy:0,body:'var(--mk-body)',color,n:3});
  el.setAttribute('viewBox',MARK_VIEWBOX);el.innerHTML=polysSVG(polys);}
drawMark();
// thumbnails
let _mk=0;
function thumbTop(cube,mode,parts){ // mode 'eo' (edges only matter), 'oll' (U color vs gray), 'pll' (real colors + flow arrows); parts: the What it moves marks of the details, in place of the flow arrows
  const f=cube.toFacelets();const s=16,g=5,o=8;const W=3*s+2*g+2*o+4;let out=`<svg viewBox="0 0 ${W} ${W}">`;
  const uc=f[4];const isCornerFacelet=new Set(cornerFacelet.flat());
  const col=(c,idx)=>{if(mode.startsWith('pll'))return stickerColor(c);if(mode==='eo'&&isCornerFacelet.has(idx))return 'var(--sticker-X)';return c===uc?stickerColor(uc):'var(--sticker-X)';};
  const cx=j=>o+2+j*(s+1)+s/2,cy=i=>o+2+i*(s+1)+s/2;
  const at={},fc=idx=>parts?` class="fc f${idx}"`:'';
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){const idx=3*i+j;at[idx]=[cx(j),cy(i)];out+=`<rect${fc(idx)} x="${o+2+j*(s+1)}" y="${o+2+i*(s+1)}" width="${s}" height="${s}" rx="2" fill="${col(f[idx],idx)}"/>`;}
  const strip=(idxs,fx,vert)=>idxs.forEach((idx,k)=>{const [x,y]=fx(k);const w=vert?g:s,h=vert?s:g;at[idx]=[x+w/2,y+h/2];out+=`<rect${fc(idx)} x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${col(f[idx],idx)}"/>`;});
  strip([47,46,45],k=>[o+2+k*(s+1),0],false);strip([18,19,20],k=>[o+2+k*(s+1),o+2+3*(s+1)+1],false);
  strip([36,37,38],k=>[0,o+2+k*(s+1)],true);strip([11,10,9],k=>[o+2+3*(s+1)+1,o+2+k*(s+1)],true);
  if(parts)out+=moveMarks(parts,{pt:i=>at[i],side:s,mid:at[4],anchor:(k,p)=>(k==='c'?cornerFacelet:edgeFacelet)[p].find(i=>i<9)});
  else if(mode.startsWith('pll')){ // flow arrows: piece at U position p must travel to its home q ('pllc' corners only, 'plle' edges only)
    const S=rotCube();const id='ah'+(_mk++);
    out+=`<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs>`;
    const pos=idx=>[cx(idx%3),cy(Math.floor(idx/3))];const done=new Set();
    const arrow=(p1,p2,both)=>{const d=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);const ux=(p2[0]-p1[0])/d,uy=(p2[1]-p1[1])/d;const t=4;const x1=p1[0]+ux*t,y1=p1[1]+uy*t,x2=p2[0]-ux*t,y2=p2[1]-uy*t;
      out+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="1.8" marker-end="url(#${id})" ${both?`marker-start="url(#${id})"`:''}/>`;};
    const sets=[];if(mode!=='plle')sets.push([4,cube.cp,cornerFacelet]);if(mode!=='pllc')sets.push([4,cube.ep,edgeFacelet]);
    for(const [n,cp,fac] of sets){const ref=cp===cube.cp?S.cp:S.ep;
      for(let p=0;p<n;p++){const q=ref.indexOf(cp[p]);if(q===p||q>3)continue;const key=[Math.min(p,q),Math.max(p,q),fac===cornerFacelet].join();if(done.has(key))continue;const both=ref.indexOf(cp[q])===p;done.add(key);arrow(pos(fac[p][0]),pos(fac[q][0]),both);}}
  }
  return out+'</svg>';
}
// ---------- What it moves ----------
// The details list what the algorithm moves in plain words, one part per line, and the picture stays
// clean until the reader chooses a part. Then that part's pieces get an outline and its one arrow
// shows. A part covers only what the step cares about: OLL edges lists the edges that flip, OLL
// corners the corners that twist, PLL the pieces that change places, F2L the pair going into the
// slot. c is the case in the frame the moves are written in, so its positions match the picture;
// f is the picture's stickers.
const POS_WORD={U:'top',D:'bottom',F:'front',B:'back',R:'right',L:'left'};
const COUNT_WORD=['','One','Two','Three','Four'];
function posWords(k,p,top){const n=[...(k==='c'?CORNER_NAMES:EDGE_NAMES)[p]];const by=set=>n.filter(x=>set.includes(x));
  return [...(top?[]:by('UD')),...by('FB'),...by('RL')].map(x=>POS_WORD[x]).join(' ');}
function caseParts(c,f,mode){const parts=[],fac=k=>k==='c'?cornerFacelet:edgeFacelet,noun=(k,n)=>(k==='c'?'corner':'edge')+(n>1?'s':'');
  if(mode==='f2l'){ // the pair: each piece goes from where it is into its slot, or turns in the slot
    // The slot is the one the algorithm fills. After a y in the algorithm, it is not the front-right slot of the picture.
    const SLOT_EDGE={4:8,5:9,6:10,7:11},dc=f[31],out=(k,q)=>k==='c'?c.cp.indexOf(q)!==q||c.co[q]:c.ep.indexOf(q)!==q||c.eo[q];
    const sc=[4,5,6,7].find(q=>out('c',q)||out('e',SLOT_EDGE[q]));if(sc==null)return parts;
    [['c',c.cp.indexOf(sc),sc],['e',c.ep.indexOf(SLOT_EDGE[sc]),SLOT_EDGE[sc]]].forEach(([k,p,slot])=>{const N=k==='c'?'Corner':'Edge';
      if(p!==slot){parts.push({k,text:`${N} goes into the slot: from ${posWords(k,p)}`,pieces:[p,slot],arrows:[[p,slot,false]]});return;}
      if(k==='c'){const w=cornerFacelet[p].findIndex(i=>f[i]===dc);if(w>0)parts.push({k,text:'Corner twists in the slot',pieces:[p],twists:[[p,3-w]]});}
      else{const i=edgeFacelet[p][0];if(f[i]!==f[9*Math.floor(i/9)+4])parts.push({k,text:'Edge flips in the slot',pieces:[p],flips:[p]});}});
    return parts;}
  const uc=f[4],U=[0,1,2,3];
  if(mode==='oll'){const tw=U.map(p=>[p,cornerFacelet[p].findIndex(i=>f[i]===uc)]).filter(x=>x[1]>0);
    if(tw.length)parts.push({k:'c',text:`${COUNT_WORD[tw.length]} ${noun('c',tw.length)} twist${tw.length>1&&tw.every(x=>x[1]===tw[0][1])?' the same way':''}: ${tw.map(x=>posWords('c',x[0],1)).join(', ')}`,
      pieces:tw.map(x=>x[0]),twists:tw.map(([p,w])=>[p,3-w])});}
  if(mode==='eo'){const fl=U.filter(p=>f[edgeFacelet[p][0]]!==uc);
    if(fl.length)parts.push({k:'e',text:`${COUNT_WORD[fl.length]} ${noun('e',fl.length)} flip: ${fl.map(p=>posWords('e',p,1)).join(', ')}`,pieces:fl,flips:fl});}
  if(mode.startsWith('pll'))[['c',c.cp],['e',c.ep]].forEach(([k,perm])=>{if(mode==='pllc'&&k==='e'||mode==='plle'&&k==='c')return;const seen=new Set();
    U.forEach(a=>{if(seen.has(a)||perm[a]===a)return;const cyc=[];for(let p=a;!seen.has(p);p=perm[p]){seen.add(p);cyc.push(p);} // the piece at p goes to its home, perm[p]
      const n=cyc.length,names=cyc.map(p=>posWords(k,p,1));
      parts.push({k,text:n===2?`Two ${noun(k,2)} swap: ${names.join(', ')}`:`${COUNT_WORD[n]} ${noun(k,n)} move around: ${names.join(' → ')}`,
        pieces:cyc,arrows:n===2?[[cyc[0],cyc[1],true]]:cyc.map((p,j)=>[p,cyc[(j+1)%n],false])});});});
  return parts;}
// The marks for those parts: a dark arrow on a light halo from where a piece is to where it goes
// (two heads for a swap), a curved arrow on a corner that twists, a two-way arrow across an edge
// that flips. pt(facelet) is the center of that sticker in the picture, side is its size, mid the
// middle of the picture, anchor(kind, position) the sticker that stands for the piece. Each part is
// a hidden group that names its stickers; mvShow shows one.
function moveMarks(parts,{pt,side,mid,anchor}){
  const u=side/16,id='mh'+(_mk++),fac=k=>k==='c'?cornerFacelet:edgeFacelet,f2=v=>v.toFixed(2);
  let out=`<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs>`;
  const stroke=(d,both)=>`<path d="${d}" fill="none" stroke="#fff" stroke-width="${f2(4*u)}" stroke-linecap="round" opacity=".85"/><path d="${d}" fill="none" stroke="#111" stroke-width="${f2(1.8*u)}" marker-end="url(#${id})"${both?` marker-start="url(#${id})"`:''}/>`;
  // bow>0 bends the arrow to its left on screen.
  const line=(a,b,both,t0=4*u,t1=4*u,bow=0)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,ux=(b[0]-a[0])/d,uy=(b[1]-a[1])/d;
    const A=[a[0]+ux*t0,a[1]+uy*t0],B=[b[0]-ux*t1,b[1]-uy*t1];
    if(!bow)return stroke(`M${f2(A[0])} ${f2(A[1])} L${f2(B[0])} ${f2(B[1])}`,both);
    const C=[(A[0]+B[0])/2+uy*bow*d,(A[1]+B[1])/2-ux*bow*d];return stroke(`M${f2(A[0])} ${f2(A[1])} Q${f2(C[0])} ${f2(C[1])} ${f2(B[0])} ${f2(B[1])}`,both);};
  const side_=(A,B,M)=>(B[0]-A[0])*(M[1]-A[1])-(B[1]-A[1])*(M[0]-A[0]); // >0: M is on the arrow's right on screen
  parts.forEach((p,i)=>{let g='';const at=q=>pt(anchor(p.k,q));
    const P=(p.arrows||[]).flatMap(([a,b])=>[at(a),at(b)]),cm=P.length>2?[0,1].map(t=>P.reduce((x,q)=>x+q[t],0)/P.length):mid;
    (p.arrows||[]).forEach(([a,b,both])=>{const A=at(a),B=at(b);let bow=0;
      // An arrow bends away from the middle of its cycle, or for a swap from the middle of the picture, so it does not cover the pieces between its ends.
      if(cm){const s=side_(A,B,cm),L=Math.hypot(B[0]-A[0],B[1]-A[1])||1;if(Math.abs(s)/L>0.15*side)bow=(s>0?1:-1)*(P.length>2?0.18:0.15);}
      g+=line(A,B,both,4*u,4*u,bow);});
    (p.twists||[]).forEach(([q,d])=>{const a=anchor('c',q),A=pt(a),fs=fac('c')[q],k0=fs.indexOf(a),T=[0,1,2].map(m=>pt(fs[(k0+m*d)%3]));
      // The arc turns the way the twist moves the stickers on screen.
      const cw=(T[1][0]-T[0][0])*(T[2][1]-T[0][1])-(T[1][1]-T[0][1])*(T[2][0]-T[0][0])>0;
      const r=0.34*side,a0=-Math.PI*0.75,a1=a0+(cw?1:-1)*Math.PI*1.5,xy=t=>`${f2(A[0]+r*Math.cos(t))} ${f2(A[1]+r*Math.sin(t))}`;
      g+=stroke(`M${xy(a0)} A${f2(r)} ${f2(r)} 0 1 ${cw?1:0} ${xy(a1)}`,false);});
    (p.flips||[]).forEach(q=>{const a=anchor('e',q),b=fac('e')[q].find(x=>x!==a);g+=line(pt(a),pt(b),true,-0.3*side,-0.1*side);});
    out+=`<g class="mv" data-mv="${i}" data-f="${p.pieces.flatMap(q=>fac(p.k)[q]).join(' ')}">${g}</g>`;});
  return out;}
// The F2L case on the 3D cube with its hidden marks. A piece stands for itself on its top sticker, or else on the sticker that faces the camera most.
function thumb3DMarks(cube,parts,{scale=60,viewBox='20 10 360 340'}={}){const v={yaw:-32,pitch:28,scale};
  const anchor=(k,p)=>{const fs=(k==='c'?cornerFacelet:edgeFacelet)[p];if(fs[0]<9)return fs[0];
    let best=fs[0],bz=-1;for(const i of fs){const z=faceFacing(Math.floor(i/9),v);if(z>bz){bz=z;best=i;}}return best;};
  return `<svg viewBox="${viewBox}">${renderCube3D(cube.toFacelets(),{...v,n:3,cls:i=>'fc f'+i})}${moveMarks(parts,{pt:i=>faceletPt(i,v),side:0.88*scale,anchor})}</svg>`;}
// Show one part of What it moves on a details picture, or none (i null).
function mvShow(svg,i){if(!svg)return;svg.querySelectorAll('.fc.lit').forEach(e=>e.classList.remove('lit'));
  svg.querySelectorAll('.mv').forEach(g=>{const on=g.dataset.mv===i;g.classList.toggle('on',on);if(on)g.dataset.f.split(' ').forEach(f=>svg.querySelectorAll('.f'+f).forEach(e=>e.classList.add('lit')));});}
function modeFor(group){return group==='OLL edges'?'eo':group==='OLL corners'?'oll':group==='PLL corners'?'pllc':'plle';}
function thumb3D(cube){const f=cube.toFacelets();return `<svg viewBox="40 30 320 300">${renderCube3D(f,{yaw:-32,pitch:28,scale:48,n:3})}</svg>`;}

// ---------- sequence (scramble) panel ----------
// drill: a name when the player shows a case drill instead of the current scramble. Tab changes keep a drill.
var seqState={moves:[],idx:0,shown:-1,label:'scramble',base:new Cube(),drill:null}; // var: tests read it from the window
function setSequence(moves,label,base,drill){stopAuto();seqState.shown=-1;seqState.moves=Array.isArray(moves)?moves:parseAlg(moves);seqState.label=label||'';seqState.base=base||puzzleCube();seqState.idx=seqState.moves.length;
  if(!drill&&seqState.drill){currentLabel=scrLabel;if(/^(ll|f2l|two|four):/.test(timer.scope))setScope(TAB_SCOPE[curTab]||'solve');}
  seqState.drill=drill||null;$('#drillNote').classList.toggle('hidden',!drill);$('#drillName').textContent=drill||'';
  renderSequence();applySequence();document.dispatchEvent(new CustomEvent('cw:sequence',{detail:{drill:seqState.drill}}));}
function cubeAtSeq(i){return applyAlg(seqState.base,seqState.moves.slice(0,i));}
// seqState.shown is the index the picture showed last. One step away from it turns the layer.
function applySequence(){const i=seqState.idx,was=seqState.shown;seqState.shown=i;
  if(was===i-1&&i>0)showCubeMoved(cubeAtSeq(i-1),seqState.moves[i-1],cubeAtSeq(i));
  else if(was===i+1&&i<seqState.moves.length)showCubeMoved(cubeAtSeq(i+1),invertAlg([seqState.moves[i]]),cubeAtSeq(i));
  else showCube(cubeAtSeq(i));
  $('#scrub').max=seqState.moves.length;$('#scrub').value=seqState.idx;$('#scrubPos').textContent=seqState.idx+' / '+seqState.moves.length;$$('#scramble .m').forEach((el,i)=>{el.classList.toggle('done',i<seqState.idx);el.classList.toggle('cur',i===seqState.idx-1);});}
// In beginner mode every tile carries a caption in words (beghome.js: moveCaption), wrapped so the
// tile itself keeps its text and its classes.
function renderSequence(){$('#seqLabel').textContent=seqState.label||'';const cap=isBeg()&&typeof moveCaption==='function';
  $('#scramble').innerHTML=seqState.moves.map((m,i)=>{const t=`<span class="m${/^[xyz]/.test(m)?' rot':''}" data-i="${i}">${fmtMove(m)}</span>`;return cap?`<span class="mt">${t}<small>${esc(moveCaption(m))}</small></span>`:t;}).join('');
  $$('#scramble .m').forEach(el=>el.onclick=()=>{stopAuto();seqState.idx=+el.dataset.i+1;applySequence();});}
$('#scrub').oninput=e=>{stopAuto();seqState.idx=+e.target.value;applySequence();};
function focusPlayer(){const p=$('#player');window.scrollTo({top:0,behavior:'smooth'});p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash');}
// In beginner mode the home module shows the cube white up, with no z2 (beghome.js).
function showScr(){if(isBeg()&&typeof showBegScr==='function'){showBegScr();return;}
  const r=crossRotation();const end=applyAlg(scr.cube,r?[r]:[]);
  setSequence([...scr.moves,...(r?[r]:[])],'scramble · seed '+scr.seed+(r?' · last step '+r+' = solving grip: '+holdText(end).replace(/^Hold /,'').replace(/\.$/,''):''));
  if(r){const el=$$('#scramble .m').pop();el.classList.add('rot');el.title='Rotation only, not a scramble move. '+holdText(end);}}
// The current scramble as this tab shows it: F2L live adds the rotation and the solved cross.
// A beginner tab that shows something else registers it in tabShow[tab].
const tabShow={};
function showForTab(){if(tabShow[curTab])tabShow[curTab]();else if(curTab==='f2l'&&f2lState.mode==='live')showF2LState();else showScr();}
$('#showScramble').onclick=()=>{if(isBeg()&&typeof showBegLetters==='function'&&!tabShow[curTab])showBegLetters();else showForTab();focusPlayer();};
$('#drillBack').onclick=()=>showForTab();
function seqGo(i){stopAuto();seqState.idx=Math.max(0,Math.min(seqState.moves.length,i));applySequence();}
$('#scrubStart').onclick=()=>seqGo(0);$('#scrubEnd').onclick=()=>seqGo(seqState.moves.length);
$('#scrubPrev').onclick=()=>seqGo(seqState.idx-1);$('#scrubNext').onclick=()=>seqGo(seqState.idx+1);
$('#animBtn').onclick=()=>setAnim(!animOn());
// ---------- auto-step ----------
// Each step turns its move at the start of the interval, then the cube rests for the rest of it.
// Play turns the first move at once; from the end it shows the start first, for a short pause.
var auto={timer:0,on:false};
function autoMs(){return +$('#autoSpeed').value||1000;}
function autoLabel(){return isBeg()?'▷ Show me':'▷ Auto-step';}
function renderAutoBtn(){const b=$('#autoPlay');if(!b)return;b.classList.toggle('on',auto.on);b.firstChild.textContent=(auto.on?'⏸ Pause':autoLabel())+' ';}
function stopAuto(){if(auto.timer){clearTimeout(auto.timer);auto.timer=0;}auto.on=false;renderAutoBtn();}
function autoTick(){auto.timer=0;if(seqState.idx>=seqState.moves.length){stopAuto();return;}seqState.idx++;applySequence();
  if(seqState.idx>=seqState.moves.length)stopAuto();else auto.timer=setTimeout(autoTick,autoMs());}
function startAuto(){if(!seqState.moves.length)return;auto.on=true;renderAutoBtn();
  if(seqState.idx>=seqState.moves.length){seqState.idx=0;applySequence();auto.timer=setTimeout(autoTick,Math.min(autoMs(),700));}
  else autoTick();}
function toggleAuto(){if(auto.on)stopAuto();else startAuto();}
$('#autoPlay').onclick=toggleAuto;
$('#autoSpeed').value=String(store.get('autoSpeed',1000));
$('#autoSpeed').onchange=()=>{store.set('autoSpeed',autoMs());if(auto.timer){clearTimeout(auto.timer);auto.timer=setTimeout(autoTick,autoMs());}};
// scramble state
var scr={seed:'',moves:[],cube:new Cube()}; // var: tests read it from the window
let history=store.get('history',[]);
// The scramble lengths the seed bar offers, per puzzle. A 2×2 mix-up uses R, U and F only.
const SCR_LENS={3:[20,22,25],2:[9,11,13],4:[30,40,50]};
function setScrLenOptions(){const sel=$('#scrLen');const lens=SCR_LENS[puzzleN()];if([...sel.options].map(o=>+o.value).join()===lens.join())return;sel.innerHTML=lens.map(n=>`<option${n===lens[1]?' selected':''}>${n}</option>`).join('');}
function scrambleMoves(seed,n){return puzzleN()===2?twoScramble(seed,n):puzzleN()===4?fourScramble(seed,n):randomMoveScramble(seed,n);}
function newScramble(seed){
  seed=seed||randomSeedName();loadScramble(seed,scrambleMoves(seed,+$('#scrLen').value),false);}
function loadScramble(seed,moves,custom){
  scr.seed=seed;$('#seed').value=custom?'':seed;$('#seed').placeholder=custom?seed:'seed name';
  scr.moves=Array.isArray(moves)?moves:parseAlg(moves);scr.cube=applyAlg(puzzleCube(),scr.moves);
  const ent={seed,len:scr.moves.length,t:Date.now()};if(custom)ent.moves=scr.moves.join(' ');
  history=[ent,...history.filter(h=>h.seed!==seed)].slice(0,30);store.set('history',history);renderHistory();
  showForTab();
  planState.plan=null;$('#planOut').innerHTML='<p class="muted">New scramble. Press Plan.</p>';
  crossState.revealed=false;if(puzzleN()===3)refreshCross();
  document.dispatchEvent(new CustomEvent('cw:scramble'));
}
// A cube read from a painted 4×4: there is no scramble behind it, the state itself is the mix-up.
function loadState(name,cube){
  scr.seed=name;$('#seed').value='';$('#seed').placeholder=name;scr.moves=[];scr.cube=cube;
  showForTab();document.dispatchEvent(new CustomEvent('cw:scramble'));
}
function renderHistory(){$('#history').innerHTML=history.length?'<div class="muted">Recent seeds (click to reload):</div>'+history.map(h=>`<span class="alt" data-s="${esc(h.seed)}"${h.moves?` title="${esc(h.moves)}"`:''}>${esc(h.seed)}</span>`).join(''):'<span class="muted">No history yet.</span>';
  $$('#history .alt').forEach(el=>el.onclick=()=>{const h=history.find(x=>x.seed===el.dataset.s);if(h&&h.moves){loadScramble(h.seed,parseAlg(h.moves),true);return;}$('#seed').value=el.dataset.s;newScramble(el.dataset.s);});}
// One scramble per puzzle: a 3×3 mix-up is not a 2×2 one. setMethod swaps them when the puzzle changes.
const puzzleScr={};
function swapPuzzleScramble(from,to){if(from===to)return;puzzleScr[from]={seed:scr.seed,moves:scr.moves.slice(),custom:!$('#seed').value,cube:scr.cube};
  const s=puzzleScr[to];if(!s)newScramble();else if(s.moves.length)loadScramble(s.seed,s.moves,s.custom);else loadState(s.seed,s.cube);} // a painted 4×4 has a state and no moves
$('#newSeed').onclick=()=>newScramble();$('#reScramble').onclick=()=>newScramble($('#seed').value.trim()||undefined);
$('#seed').addEventListener('keydown',e=>{if(e.key==='Enter')newScramble($('#seed').value.trim()||undefined);});
$('#histBtn').onclick=()=>$('#history').classList.toggle('hidden');
// view controls
$('#viewTop').onclick=()=>{view.mode='3d';view.yaw=-32;view.pitch=28;drawMain();};
$('#viewBottom').onclick=()=>{view.mode='3d';view.yaw=-32;view.pitch=-34;drawMain();};
$('#viewNet').onclick=()=>{view.mode='net';drawMain();};
// Drag to rotate. preventDefault and body.cube-drag keep the drag from selecting page text.
(()=>{let drag=null;const svg=$('#cube');const stop=()=>{drag=null;document.body.classList.remove('cube-drag');};
svg.addEventListener('pointerdown',e=>{if(view.mode!=='3d')return;e.preventDefault();drag={x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};document.body.classList.add('cube-drag');if(svg.setPointerCapture)svg.setPointerCapture(e.pointerId);});
svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!dragHintDone&&dx*dx+dy*dy>16)dragHintDone=true;view.yaw=drag.yaw+dx*0.5;view.pitch=Math.max(-80,Math.min(80,drag.pitch+dy*0.5));drawMain();});
svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);})();

// ---------- timer ----------
const timer={state:'idle',t0:0,raf:0,inspT0:0,scope:'solve',holdT:0};
const times=store.get('times',{});
function fmt(ms){if(ms==null)return '—';const s=ms/1000;return s>=60?`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`:s.toFixed(2);}
function scopeTimes(){return times[timer.scope]||[];}
function avg(arr,n){if(arr.length<n)return null;const a=arr.slice(-n).map(x=>x.ms).sort((x,y)=>x-y);const trim=n>=12?Math.ceil(n*0.05):1;const mid=a.slice(trim,a.length-trim);return mid.reduce((x,y)=>x+y,0)/mid.length;}
function renderTimes(){const arr=scopeTimes();$('#stLast').textContent=fmt(arr.length?arr[arr.length-1].ms:null);$('#stAo5').textContent=fmt(avg(arr,5));$('#stAo12').textContent=fmt(avg(arr,12));const best=arr.length?Math.min(...arr.map(x=>x.ms)):null;$('#stBest').textContent=fmt(best);$('#stN').textContent=arr.length;
  $('#times').innerHTML=arr.slice(-40).map((x,i)=>`<span class="${x.ms===best?'best':''}" title="${esc(x.label||'')} · ${new Date(x.t).toLocaleString()}">${fmt(x.ms)}</span>`).reverse().join('');$('#timesScope').textContent='Times: '+scopeName();}
// The timer scope as words: a tab name, or the case name for a case drill.
function scopeName(){const s=timer.scope;if(s.startsWith('ll:')){const a=LL_ALL.find(x=>x.id===s.slice(3));return a?a.name:s.slice(3);}if(s.startsWith('f2l:'))return 'F2L case #'+s.slice(4);if(s.startsWith('two:')&&typeof twoCaseName==='function')return twoCaseName(s);if(s.startsWith('four:')&&typeof fourCaseName==='function')return fourCaseName(s);return {solve:'Solve',cross:'Cross',f2l:'F2L',ll:'OLL · PLL',lab:'Lab',ref:'Reference',two:'2×2 solve',four:'4×4 solve'}[s]||s;}
function setScope(s){timer.scope=s;renderTimes();}
function recordTime(ms){const arr=times[timer.scope]||(times[timer.scope]=[]);arr.push({ms,t:Date.now(),label:currentLabel()});store.set('times',times);renderTimes();if(onTimerStop)onTimerStop(ms);}
let onTimerStop=null;const scrLabel=()=>curTab==='f2l'?'f2l '+scr.seed:scr.seed;let currentLabel=scrLabel;
const tEl=$('#timer');
function timerTick(){if(timer.state==='running'){tEl.textContent=fmt(performance.now()-timer.t0);timer.raf=requestAnimationFrame(timerTick);}else if(timer.state==='inspecting'){const left=15-(performance.now()-timer.inspT0)/1000;tEl.textContent=left>0?Math.ceil(left).toString():(left>-2?'+2':'DNF');timer.raf=requestAnimationFrame(timerTick);}}
function timerHidden(){return isBeg()&&!document.body.dataset.begtimer;}
function timerPress(){ // key/finger down
  if(timerHidden())return;
  if(timer.state==='running'){timer.state='stopped';timer.justStopped=true;cancelAnimationFrame(timer.raf);const ms=performance.now()-timer.t0;tEl.textContent=fmt(ms);tEl.className='timer';recordTime(ms);return;}
  if(timer.state==='idle'||timer.state==='stopped'||timer.state==='inspecting'){timer.holdT=performance.now();tEl.className='timer ready';}
}
function timerRelease(){
  if(timerHidden())return;
  if(timer.justStopped){timer.justStopped=false;timer.state='idle';return;}
  if(timer.state==='stopped'){timer.state='idle';}
  if(timer.state==='idle'){if($('#inspChk').checked){timer.state='inspecting';timer.inspT0=performance.now();tEl.className='timer insp';timerTick();return;}stopAuto();timer.state='running';timer.t0=performance.now();tEl.className='timer run';timerTick();return;}
  if(timer.state==='inspecting'){cancelAnimationFrame(timer.raf);stopAuto();timer.state='running';timer.t0=performance.now();tEl.className='timer run';timerTick();}
}
// The player's keys read like a media player: arrows step, Shift jumps five, Home and End go to
// the ends, P plays. Space is the timer; without a timer (beginner mode) Space plays and pauses.
document.addEventListener('keydown',e=>{const tag=document.activeElement.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.code==='Space'){e.preventDefault();if(e.repeat)return;if(timerHidden())toggleAuto();else timerPress();return;}
  if(timer.state==='running')return;
  if(e.key>='1'&&e.key<='6'){const b=railButtons()[+e.key-1];if(b)b.click();}
  const jump=e.shiftKey?5:1;
  if(e.key==='ArrowLeft'){e.preventDefault();seqGo(seqState.idx-jump);}if(e.key==='ArrowRight'){e.preventDefault();seqGo(seqState.idx+jump);}
  if(e.key==='Home'){e.preventDefault();seqGo(0);}if(e.key==='End'){e.preventDefault();seqGo(seqState.moves.length);}
  if(e.key==='p'||e.key==='P'){toggleAuto();}if(e.key==='a'||e.key==='A'){setAnim(!animOn());}
  if(e.key==='n'||e.key==='N'){nextForTab();}if(e.key==='h'||e.key==='H'){hintForTab();}
  if(e.key==='?'){e.preventDefault();$('#helpBtn').click();}
  if(!timerHidden()){if(e.key==='d'||e.key==='D')deleteLast();if(e.key==='c'||e.key==='C')clearTimes();}
});
document.addEventListener('keyup',e=>{if(e.code==='Space'){const tag=document.activeElement.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;e.preventDefault();if(!timerHidden())timerRelease();}});
tEl.addEventListener('pointerdown',e=>{e.preventDefault();timerPress();});tEl.addEventListener('pointerup',e=>{e.preventDefault();timerRelease();});
// Delete last (D) and Clear (C) do nothing while the timer runs: the solve is not over.
function deleteLast(){if(timer.state==='running')return;const arr=scopeTimes();arr.pop();store.set('times',times);renderTimes();}
$('#delLast').onclick=deleteLast;
// A themed yes/no dialog in place of the browser confirm box. Enter confirms, Escape cancels.
// Space is swallowed while it is open so the timer does not start or stop behind it.
function askConfirm(title,text,yesLabel,onYes){
  if($('#askBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg ask-bg';bg.id='askBg';
  bg.innerHTML=`<div class="modal ask" role="alertdialog" aria-modal="true" aria-labelledby="askTitle" aria-describedby="askText">
   <h2 id="askTitle">${esc(title)}</h2>
   <p id="askText" class="muted">${esc(text)}</p>
   <div class="row" style="justify-content:flex-end;margin-top:14px"><button id="askNo">Cancel <span class="kbd">Esc</span></button><button class="primary" id="askYes">${esc(yesLabel)} <span class="kbd">Enter</span></button></div>
  </div>`;
  const close=()=>{document.removeEventListener('keydown',keys,true);document.removeEventListener('keyup',keys,true);bg.remove();};
  const yes=()=>{close();onYes();};
  const keys=e=>{if(e.code==='Space'){e.preventDefault();e.stopPropagation();return;}if(e.type!=='keydown')return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();yes();}};
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)close();});
  $('#askNo').onclick=close;$('#askYes').onclick=yes;
  document.addEventListener('keydown',keys,true);document.addEventListener('keyup',keys,true);
  setTimeout(()=>$('#askYes').focus(),20);
}
function clearTimes(){if(timer.state==='running'||!scopeTimes().length)return;askConfirm('Clear all times?','This removes every time for '+scopeName()+'. You cannot undo it.','Clear',()=>{times[timer.scope]=[];store.set('times',times);renderTimes();});}
$('#clearTimes').onclick=clearTimes;
$('#times').onclick=e=>{if(e.target.tagName!=='SPAN')return;const arr=scopeTimes();const shown=arr.slice(-40).reverse();const i=[...e.target.parentNode.children].indexOf(e.target);const item=shown[i];if(item)askConfirm('Delete this time?',fmt(item.ms)+' is removed from '+scopeName()+'. You cannot undo it.','Delete',()=>{arr.splice(arr.indexOf(item),1);store.set('times',times);renderTimes();});};

// ---------- tabs and the method ----------
// Four methods on two puzzles share the page. A method has a puzzle (3x3 or 2x2), a kind (beg:
// the beginner modules and the beginner player dress; speed: a timer and case drills), a rail of
// tabs and a key for its last tab. beginner-ui.js draws the chip that switches them.
const METHODS={
  beginner:{puzzle:'3x3',kind:'beg',name:'Beginner',rail:'brail',tabKey:'btab'},
  cfop:{puzzle:'3x3',kind:'speed',name:'CFOP',rail:'rail',tabKey:'tab'},
  mini:{puzzle:'2x2',kind:'beg',name:'Beginner',rail:'brail',tabKey:'minitab'},
  speed2:{puzzle:'2x2',kind:'speed',name:'Speed',rail:'srail',tabKey:'speedtab'},
  master:{puzzle:'4x4',kind:'beg',name:'Beginner',rail:'brail',tabKey:'mastertab'},
  speed4:{puzzle:'4x4',kind:'speed',name:'Advanced',rail:'frail',tabKey:'fourtab'},
};
let method=METHODS[store.get('method','cfop')]?store.get('method','cfop'):'cfop';
function methodInfo(m){return METHODS[m||method];}
function isBeg(){return methodInfo().kind==='beg';}
function puzzleN(){const p=methodInfo().puzzle;return p==='2x2'?2:p==='4x4'?4:3;}
// A solved cube of the current puzzle: a Cube for the 3×3 and the 2×2, a FourCube for the 4×4.
function puzzleCube(){return puzzleN()===4?new FourCube():new Cube();}
function applyMethodData(){const i=methodInfo();document.body.dataset.method=method;document.body.dataset.kind=i.kind;document.body.dataset.puzzle=i.puzzle;setDrawN(puzzleN());}
applyMethodData();
let curTab='solve';
const TAB_SCOPE={solve:'solve',cross:'cross',f2l:'f2l',ll:'ll',lab:'lab',ref:'ref',learn:'solve',bsolve:'solve',practice:'solve',progress:'solve',cheat:'solve',ssolve:'two',ortega:'two',cll:'two',sref:'two',fsolve:'four',parity:'four',fref:'four'};
const BEGINNER_TABS=['learn','bsolve','practice','progress','cheat'];
function railButtons(){return $$('#'+methodInfo().rail+' button');}
function tabKey(){return (mobileMQ.matches?'m':'')+methodInfo().tabKey;}
function homeTab(){return isBeg()?'learn':method==='speed2'?'ssolve':method==='speed4'?'fsolve':mobileMQ.matches?'ref':'solve';}
$$('nav.rail button').forEach(b=>b.onclick=()=>{curTab=b.dataset.tab;$$('nav.rail button').forEach(x=>x.classList.toggle('on',x===b));$$('.tab').forEach(t=>t.classList.toggle('on',t.id==='tab-'+curTab));
  document.body.dataset.tab=curTab;$('#mtitle').textContent=b.lastChild.textContent;store.set(tabKey(),curTab);setScope(TAB_SCOPE[curTab]);onEnterTab(curTab);document.dispatchEvent(new CustomEvent('cw:tab',{detail:curTab}));});
function goTab(name){const b=$(`nav.rail button[data-tab="${name}"]`);if(b)b.click();}
function onEnterTab(t){if(!seqState.drill)showForTab();else if(t==='f2l'&&f2lState.mode==='live')showF2LState();if(t==='cross')refreshCross();}
function nextForTab(){({solve:()=>newScramble(),cross:()=>$('#crossNew').click(),f2l:()=>(f2lState.mode==='live'?$('#f2lNew'):$('#f2lRandomCase')).click(),ll:()=>$('#llNext').click(),ssolve:()=>newScramble(),ortega:()=>{const b=$('#twNextOrtega');if(b)b.click();},cll:()=>{const b=$('#twNextCll');if(b)b.click();},fsolve:()=>newScramble(),parity:()=>{const b=$('#fwNext');if(b)b.click();}}[curTab]||(()=>{}))();}
function hintForTab(){({cross:()=>$('#crossReveal').click(),f2l:()=>(f2lState.mode==='live'?$('#f2lReveal'):$('#f2lCaseReveal')).click(),ll:()=>$('#llHint').click(),ortega:()=>{const b=$('#twRevealOrtega');if(b)b.click();},cll:()=>{const b=$('#twRevealCll');if(b)b.click();},parity:()=>{const b=$('#fwReveal');if(b)b.click();}}[curTab]||(()=>{}))();}
$('#autoNext').checked=store.get('autoNext',false);$('#autoNext').onchange=()=>store.set('autoNext',$('#autoNext').checked);
$('#inspChk').checked=store.get('insp',false);$('#inspChk').onchange=()=>store.set('insp',$('#inspChk').checked);
onTimerStop=()=>{if($('#autoNext').checked&&(curTab==='solve'||curTab==='cross'||curTab==='f2l'||curTab==='ll'||curTab==='ssolve'||curTab==='fsolve'))setTimeout(nextForTab,150);};

// ---------- cross color / orientation ----------
const CROSS_ROT={white:'z2',yellow:'',green:"x'",blue:'x',red:'z',orange:"z'"};
function crossRotation(){if(method==='beginner')return 'z2';if(puzzleN()!==3)return '';return CROSS_ROT[$('#crossColor').value]||'';}
// Frames. Scrambles are applied white up, green front. To solve with another color down we rotate the
// cube by r. A face move M after the rotation is the same as solving X = r' S r in the engine frame.
function rotCube(){return applyAlg(new Cube(),crossRotation());}
function toFrame(c){const r=crossRotation();return r?applyAlg(new Cube(),invertAlg(r)).mul(c).mul(MOVES[r]):c;}
function phys(x){return rotCube().mul(x);} // engine-frame state -> physical cube as held
function orientedScramble(){const r=crossRotation();return {cube:toFrame(scr.cube),rot:r,phys:applyAlg(scr.cube,r)};}
function holdText(c){const f=c.center;return `Hold ${COLOR_NAMES[f[3]]} down, ${COLOR_NAMES[f[2]]} in front.`;}

// ---------- step rendering helpers ----------
function stepHTML(name,sub,moves,key,extra){return `<div class="step"><div class="nm">${esc(name)}<small>${esc(sub||'')}</small></div><div class="alg" data-key="${key}">${moves.length?moves.map((m,i)=>`<span class="m" data-i="${i}">${fmtMove(m)}</span>`).join(' '):'<i>already done</i>'}</div><div class="muted" style="font-size:13px;white-space:nowrap">${extra||''}</div></div>`;}
function wireSteps(container,getPrefixCube){ // click a move: show cube after prefix + moves[0..i]
  container.querySelectorAll('.alg').forEach(algEl=>{const key=algEl.dataset.key;algEl.querySelectorAll('.m').forEach(mEl=>{mEl.style.cursor='pointer';mEl.onclick=()=>{const {cube,moves}=getPrefixCube(key);const i=+mEl.dataset.i;showCube(applyAlg(cube,moves.slice(0,i+1)));container.querySelectorAll('.m').forEach(x=>x.classList.remove('cur'));mEl.classList.add('cur');};});});
}
// ---------- SOLVE tab ----------
const planState={plan:null,crossChoice:0};
let tablesReady=false;function ensureTables(cb){if(tablesReady){cb();return;}if(!planState.plan)$('#planOut').innerHTML='<p class="muted">Building lookup tables (one time, about a second)…</p>';setTimeout(()=>{buildCrossTable();tablesReady=true;cb();},20);}
$('#planBtn').onclick=()=>{$('#planOut').innerHTML='<p class="muted">Planning…</p>';setTimeout(()=>ensureTables(()=>buildPlan()),20);};
function describePair(c,slot){const s=SLOTS.find(x=>x.name===slot);const cpos=c.cp.indexOf(s.corner),epos=c.ep.indexOf(s.edge);
  const cw=cpos<4?'corner in U layer':cpos===s.corner?'corner in its slot':'corner in a slot';const ew=epos<4?'edge in U layer':epos===s.edge?'edge in its slot':'edge in a slot';return cw+', '+ew;}
function buildPlan(){
  const {cube:c0,rot,phys:p0}=orientedScramble();
  const cross=solveCross(c0,0,24);if(planState.crossChoice>=cross.solutions.length)planState.crossChoice=0;
  const crossMoves=parseAlg(cross.solutions[planState.crossChoice]);
  const c1=applyAlg(c0,crossMoves);
  const order=$('#f2lOrder').value;const ref=$('#planRef').checked;const slots=order==='greedy'?null:order.split(',');
  const f2l=ref?solveF2LRef(c1,slots,F2L_CASES):solveF2L(c1,slots);
  if(!f2l){$('#planOut').innerHTML='<p>Could not find short pair inserts for this scramble. Try another cross solution.</p>';return;}
  const ll=solveLL(f2l.cube,ALG_DB,ref);
  planState.plan={rot,c0,p0,cross,crossMoves,f2l,ll,ref};renderPlan();
}
function renderPlan(){
  const p=planState.plan;const steps=[];let total=0;
  const seqFor=[];// key -> {cube,moves}
  let cur=p.c0;const P=x=>phys(x);
  steps.push(stepHTML('Cross',`optimal ${p.cross.optimal} moves`,p.crossMoves,'cross',`${p.cross.solutions.length} optimal plan${p.cross.solutions.length>1?'s':''}`));seqFor.push(['cross',cur,p.crossMoves]);cur=applyAlg(cur,p.crossMoves);total+=p.crossMoves.length;
  // With rotations in the plan, cur carries turned centers. derotate turns it home so slot names apply.
  p.f2l.steps.forEach((s,i)=>{const notes=[`${s.moves.length} moves`];if(s.rot)notes.push(`rotate ${esc(s.rot)} first`);if(s.ref)notes.push(`<a href="#" class="case-link" data-n="${s.ref}">F2L case ${s.ref}</a>`);
    steps.push(stepHTML(`Pair ${i+1}: ${s.slot}`,describePair(derotate(cur),s.slot),s.moves,'f2l'+i,notes.join(' · ')));seqFor.push(['f2l'+i,cur,s.moves]);cur=applyAlg(cur,s.moves);total+=s.moves.length;});
  if(p.ll){for(const s of p.ll.steps){const moves=[...(s.pre?[s.pre]:[]),...parseAlg(s.alg),...(s.post?[s.post]:[])];steps.push(stepHTML(s.stage,s.name,moves,'ll'+s.stage,s.pre?(s.pre[0]==='y'?`rotate ${esc(s.pre)} first`:`AUF ${s.pre} first`):''));seqFor.push(['ll'+s.stage,cur,moves]);cur=applyAlg(cur,moves);total+=moves.length;}}
  const alts=p.cross.solutions.map((s,i)=>`<span class="alt ${i===planState.crossChoice?'pick':''}" data-i="${i}">${esc(s)}</span>`).join('');
  $('#planOut').innerHTML=`<div class="row" style="justify-content:space-between;margin-bottom:6px"><div>${p.rot?`<span class="tag">rotate ${esc(p.rot)} first</span>`:''}${esc(holdText(p.p0))} <span class="muted">${p.ref?'The cube turns before some steps. ':''}Total ${total} moves. ${cur.isSolvedAny()?'It ends solved.':'This plan does not end solved. Try another cross.'}</span></div><button class="small" id="planSeq">Load the whole plan into the player</button></div>
    <div>${steps.join('')}</div>
    <h3 style="margin-top:12px">Cross alternatives</h3><p class="muted">Pick another optimal cross; the F2L plan recomputes. Compare which one leaves pairs easy.</p><div>${alts}</div>`;
  wireSteps($('#planOut'),key=>{const e=seqFor.find(x=>x[0]===key);return {cube:P(e[1]),moves:e[2]};});
  $$('#planOut .alt').forEach(el=>el.onclick=()=>{planState.crossChoice=+el.dataset.i;buildPlan();});
  $$('#planOut .case-link').forEach(el=>el.onclick=e=>{e.preventDefault();const f=F2L_CASES.find(c=>c.n===+el.dataset.n);if(f)openCaseModal(modalForF2L(f));});
  $('#planSeq').onclick=()=>{const all=seqFor.flatMap(x=>x[2]);setSequence(all,'solution · '+holdText(p.p0),p.p0);seqState.idx=0;applySequence();focusPlayer();};
}
// ---------- CROSS tab ----------
const crossState={revealed:false,sol:null};
function refreshCross(){if(!tablesReady){$('#crossOpt').textContent='…';ensureTables(()=>refreshCross());return;}
  const {cube}=orientedScramble();const sol=solveCross(cube,$('#crossPlus1').checked?1:0,60);crossState.sol=sol;$('#crossOpt').textContent=sol.optimal;$('#crossCount').textContent=`${sol.solutions.length} plan${sol.solutions.length>1?'s':''} found · ${holdText(phys(cube))}`;
  $('#crossSols').innerHTML=crossState.revealed?sol.solutions.map((s,i)=>`<span class="alt" data-i="${i}">${esc(s)}</span>`).join('')+'<p class="muted" style="margin-top:6px">Click a plan to step through it on the cube.</p>':'<p class="muted">Hidden. Plan it yourself first, then reveal.</p>';
  $$('#crossSols .alt').forEach(el=>el.onclick=()=>{const {phys:pc}=orientedScramble();setSequence(parseAlg(el.textContent),'cross plan · '+holdText(pc),pc);seqState.idx=0;applySequence();focusPlayer();});
  $('#crossTryOut').innerHTML='';}
$('#crossReveal').onclick=()=>{crossState.revealed=!crossState.revealed;refreshCross();};
$('#crossPlus1').onchange=refreshCross;$('#crossColor').onchange=()=>{store.set('crossColor',$('#crossColor').value);if(!seqState.drill)showForTab();refreshCross();planState.plan=null;renderLLGroups();renderF2LGrid();if(mobileMQ.matches)renderMobileRef();$('#planOut').innerHTML='<p class="muted">Cross color changed. Press Plan.</p>';};
$('#crossNew').onclick=()=>{ensureTables(()=>{const diff=$('#crossDiff').value;for(let k=0;k<200;k++){const seed=randomSeedName();const moves=randomMoveScramble(seed,+$('#scrLen').value);const c=toFrame(applyAlg(new Cube(),moves));const d=buildCrossTable()[crossIndex(c)];if(diff==='any'||(diff==='easy'&&d<=5)||(diff==='hard'&&d>=7)){newScramble(seed);return;}}newScramble();});};
$('#crossCheck').onclick=()=>{let ms;try{ms=parseAlg($('#crossTry').value);applyAlg(new Cube(),ms);}catch(e){$('#crossTryOut').innerHTML='<span style="color:var(--warn)">'+esc(badMoveText(e))+'</span>';return;}
  const {cube}=orientedScramble();const c=applyAlg(cube,ms);const ok=crossSolved(c);const opt=crossState.sol?crossState.sol.optimal:'?';const n=ms.filter(m=>!'xyz'.includes(m[0])).length;
  let msg=ok?`<b style="color:var(--good)">Cross solved</b> in ${n} moves. Optimal is ${opt}. ${n>opt?`Gap: ${n-opt}.`:'That is optimal.'}`:`<b style="color:var(--warn)">Cross not solved.</b> `;
  if(!ok){const d=buildCrossTable()[crossIndex(c)];msg+=`After your moves the cross is ${d} move${d===1?'':'s'} from solved. Solved edges: ${[4,5,6,7].filter(e=>c.ep[e]===e&&c.eo[e]===0).map(e=>EDGE_NAMES[e]).join(' ')||'none'}.`;}
  const pairsSolved=SLOTS.filter(s=>slotSolved(c,s)).map(s=>s.name);if(ok&&pairsSolved.length)msg+=` Bonus: pair${pairsSolved.length>1?'s':''} ${pairsSolved.join(', ')} already in. That is an x-cross.`;
  $('#crossTryOut').innerHTML=msg;const pc=phys(cube);setSequence(ms,'your cross plan · '+holdText(pc),pc);};
$('#crossTips').innerHTML=CROSS_TIPS.map(t=>`<div class="tip"><b>${esc(t.t)}</b>${esc(t.d)}</div>`).join('');

// ---------- F2L tab ----------
const f2lState={mode:'live',key:null,cube:null,extra:[],plan:null,caseSel:new Set(F2L_CASES.map(c=>c.n)),curCase:null,caseSetup:null,caseAUF:''};
$$('#f2lMode button').forEach(b=>b.onclick=()=>{f2lState.mode=b.dataset.m;$$('#f2lMode button').forEach(x=>x.classList.toggle('on',x===b));$('#f2lLive').classList.toggle('hidden',f2lState.mode!=='live');['#f2lCases','#f2lCaseOut','#f2lCaseList','#f2lStatsPanel'].forEach(s=>$(s).classList.toggle('hidden',f2lState.mode!=='cases'));if(f2lState.mode==='live')showF2LState();else{renderCaseStats();if(!seqState.drill)showScr();}});
// The F2L state of the current scramble: rotate, solve the cross, then solve pairs until the chosen number is left.
function f2lKey(){return [scr.moves.join(' '),crossRotation(),$('#f2lPairs').value].join('|');}
function ensureF2L(cb){if(f2lState.key===f2lKey()){cb();return;}ensureTables(()=>{let c=toFrame(scr.cube);const r=crossRotation();const extra=r?[r]:[];const csm=parseAlg(solveCross(c,0,1).solutions[0]);c=applyAlg(c,csm);extra.push(...csm);
  const want=+$('#f2lPairs').value;const plan=solveF2L(c);const pre=[];for(let i=0;i<4-want&&plan;i++){pre.push(...plan.steps[i].moves);}
  c=applyAlg(c,pre);extra.push(...pre);Object.assign(f2lState,{key:f2lKey(),cube:c,extra,plan:solveF2L(c),revealed:false});cb();});}
function showF2LState(){ensureF2L(()=>{
  if(!seqState.drill&&curTab==='f2l'&&f2lState.mode==='live'){const n=scr.moves.length,left=+$('#f2lPairs').value;
    setSequence([...scr.moves,...f2lState.extra],'scramble · seed '+scr.seed+' · dashed moves are solved for you: '+(crossRotation()?'rotation, ':'')+'cross'+(left<4?', '+(4-left)+' pair'+(left<3?'s':''):''));
    $$('#scramble .m').forEach((el,i)=>{if(i>=n){el.classList.add('rot');el.title='Solved for you, not a scramble move.';}});}
$('#f2lPlan').innerHTML=f2lState.revealed?renderF2LPlan():'<p class="muted">Pair plan hidden. Solve the pairs, then reveal.</p>';});}
function renderF2LPlan(){const p=f2lState.plan;if(!p)return '<p>No plan found.</p>';let cur=f2lState.cube;const seqFor=[];const html=p.steps.map((s,i)=>{const h=stepHTML(`Pair ${i+1}: ${s.slot}`,describePair(cur,s.slot),s.moves,'p'+i,`${s.moves.length} moves`);seqFor.push(['p'+i,cur,s.moves]);cur=applyAlg(cur,s.moves);return h;}).join('');
  setTimeout(()=>wireSteps($('#f2lPlan'),key=>{const e=seqFor.find(x=>x[0]===key);return {cube:phys(e[1]),moves:e[2]};}),0);const total=p.steps.reduce((a,b)=>a+b.moves.length,0);return `<div class="muted" style="font-size:14px">${total} moves for ${p.steps.length} pair${p.steps.length>1?'s':''}, shortest-first order.</div>`+html;}
$('#f2lNew').onclick=()=>newScramble();$('#f2lReveal').onclick=()=>ensureF2L(()=>{f2lState.revealed=!f2lState.revealed;showF2LState();});
// cases grid. The cards work like the OLL/PLL cards: a status button, click for details, shift-click to select.
const groups=[...new Set(F2L_CASES.map(c=>c.grp))];groups.forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;$('#f2lGroup').appendChild(o);});
const f2lId=n=>'f2l-'+n;
f2lState.caseSel=new Set(store.get('f2lSel',F2L_CASES.map(c=>c.n)));
function saveF2L(){store.set('f2lSel',[...f2lState.caseSel]);}
function caseSetupCube(f){return phys(derotate(applyAlg(new Cube(),invertAlg(f.alg))));}
function renderF2LGrid(){const g=$('#f2lGroup').value;$('#f2lCaseGrid').innerHTML=F2L_CASES.filter(c=>g==='all'||c.grp===g).map(c=>`<div class="case ${f2lState.caseSel.has(c.n)?'sel':''}" data-n="${c.n}" tabindex="0" title="Open details. Shift-click to add or remove from training.">${thumb3D(caseSetupCube(c))}<div>#${c.n}</div>${stBtn(f2lId(c.n))}</div>`).join('');
  $$('#f2lCaseGrid .case').forEach(el=>{const n=+el.dataset.n;
    el.onclick=e=>{if(e.target.closest('.stbtn'))return;if(e.shiftKey){if(f2lState.caseSel.has(n))f2lState.caseSel.delete(n);else f2lState.caseSel.add(n);saveF2L();renderF2LGrid();return;}openCaseModal(modalForF2L(F2L_CASES.find(c=>c.n===n)));};
    el.onkeydown=e=>{if(e.key==='Enter'&&e.target===el)el.click();};});}
$('#f2lGroup').onchange=renderF2LGrid;
$('#f2lSelAll').onclick=()=>{F2L_CASES.forEach(c=>f2lState.caseSel.add(c.n));saveF2L();renderF2LGrid();};$('#f2lSelNone').onclick=()=>{f2lState.caseSel.clear();saveF2L();renderF2LGrid();};
$('#f2lSelUnlearned').onclick=()=>{f2lState.caseSel=new Set(F2L_CASES.filter(c=>llState.status[f2lId(c.n)]!=='finished').map(c=>c.n));saveF2L();renderF2LGrid();};
function f2lSetupCube(){return applyAlg(new Cube(),[...(crossRotation()?[crossRotation()]:[]),...f2lState.caseSetup]);}
function setF2LCase(n){const f=F2L_CASES.find(c=>c.n===n);f2lState.curCase=n;const auf=AUFS[Math.floor(Math.random()*4)];// state = inv(alg) then U^-auf ; solve = auf then alg
  const setup=removeRotations([...parseAlg(invertAlg(f.alg)),...(auf?[invertAlg(auf)]:[])]);f2lState.caseSetup=setup;f2lState.caseAUF=auf;f2lState.caseRevealed=false;currentLabel=()=>'F2L case #'+n;timer.scope='f2l:'+n;renderTimes();
  view.mode='3d';view.yaw=-32;view.pitch=28;const r=crossRotation();setSequence([...(r?[r]:[]),...setup],'setup for case (from solved, white up: rotate, then turn)',undefined,'F2L case');renderF2LCaseOut();}
function f2lSolution(){const f=F2L_CASES.find(c=>c.n===f2lState.curCase);return removeRotations([...(f2lState.caseAUF?[f2lState.caseAUF]:[]),...parseAlg(f.alg)]);}
function renderF2LCaseOut(){const n=f2lState.curCase;if(!n)return;const f=F2L_CASES.find(c=>c.n===n);const arr=times['f2l:'+n]||[];const rev=f2lState.caseRevealed;
  $('#f2lCaseOut').innerHTML=`<div class="row" style="justify-content:space-between"><div><span class="tag">${esc(f.grp)}</span><b ${rev?'id="f2lNameBtn" style="cursor:pointer;text-decoration:underline dotted" title="Open case details"':''}>${rev?'F2L case #'+n:'?'}</b> <span class="muted" style="font-size:14px">${arr.length?`mean ${fmt(arr.reduce((x,y)=>x+y.ms,0)/arr.length)} over ${arr.length}`:'no times yet'}</span></div><div style="width:90px">${thumb3D(f2lSetupCube())}</div></div>
  <div style="margin-top:8px">${rev?`<div class="big">${esc(f2lSolution().join(' '))}</div><div class="muted">${f2lState.caseAUF?'Turn the top '+f2lState.caseAUF+' first, then the case algorithm '+esc(f.alg)+'. ':''}${esc(F2L_WHY[f.grp]||'')}</div><div class="row" style="margin-top:6px"><button class="small" id="f2lCaseLab">Why does it work? (Lab)</button><button class="small" id="f2lCasePlay">Step through on cube</button></div>`:'<span class="muted">Answer hidden. Press H or Reveal.</span>'}</div>`;
  const nb=$('#f2lNameBtn');if(nb)nb.onclick=()=>openCaseModal(modalForF2L(f));
  const b=$('#f2lCaseLab');if(b)b.onclick=()=>loadLab(f.alg,'F2L case #'+n);
  const p=$('#f2lCasePlay');if(p)p.onclick=()=>{setSequence(f2lSolution(),'solution for this case — press ▶ to step',f2lSetupCube(),'F2L case');seqState.idx=0;applySequence();focusPlayer();};}
$('#f2lRandomCase').onclick=()=>{const pool=F2L_CASES.filter(c=>f2lState.caseSel.has(c.n));if(!pool.length){$('#f2lCaseOut').innerHTML='<p>Select at least one case.</p>';return;}setF2LCase(pool[Math.floor(Math.random()*pool.length)].n);};
$('#f2lCaseReveal').onclick=()=>{if(!f2lState.curCase)return;f2lState.caseRevealed=!f2lState.caseRevealed;renderF2LCaseOut();};

// ---------- LL trainer ----------
const LL_ALL=[...ALG_DB.eo,...ALG_DB.co,...ALG_DB.cp,...ALG_DB.ep];
const llState={status:store.get('llStatus',{}),sel:new Set(store.get('llSel',LL_ALL.map(a=>a.id))),cur:null,hint:false};
function saveLL(){store.set('llStatus',llState.status);store.set('llSel',[...llState.sel]);}
function caseCube(a){return phys(applyAlg(new Cube(),invertAlg(a.alg)));}
function renderLLGroups(){const groupsLL=[['OLL edges',ALG_DB.eo],['OLL corners',ALG_DB.co],['PLL corners',ALG_DB.cp],['PLL edges',ALG_DB.ep]];
  $('#llGroups').innerHTML=groupsLL.map(([g,list])=>`<h3 style="margin:10px 0 6px;font-size:14px;color:var(--muted)">${g}</h3><div class="cases">${list.map(a=>`<div class="case ${llState.sel.has(a.id)?'sel':''}" data-id="${a.id}" tabindex="0" title="Open details. Shift-click to add or remove from training.">${thumbTop(caseCube(a),modeFor(a.group))}<div>${esc(a.name)}</div>${stBtn(a.id)}</div>`).join('')}</div>`).join('');
  $$('#llGroups .case').forEach(el=>{const id=el.dataset.id;
    el.onclick=e=>{if(e.target.closest('.stbtn'))return;if(e.shiftKey){if(llState.sel.has(id))llState.sel.delete(id);else llState.sel.add(id);saveLL();renderLLGroups();return;}openCaseModal(modalForLL(LL_ALL.find(a=>a.id===id)));};
    el.onkeydown=e=>{if(e.key==='Enter'&&e.target===el)el.click();};});}
renderLLGroups();renderF2LGrid();
// Case status: unlearned -> learning -> finished. A status button shows on each case card and in the case window.
// Ids: an OLL/PLL case id, or f2l-N for an F2L case.
const LL_ORDER=['','learning','finished'];
function stBtn(id){const s=llState.status[id]||'',nm=s||'unlearned';return `<button class="stbtn ${s}" data-st-id="${esc(id)}" title="Status: ${nm}. Click to change." aria-label="Status: ${nm}. Click to change."><i></i>${nm}</button>`;}
function cycleStatus(id){const cur=llState.status[id]||'';llState.status[id]=LL_ORDER[(LL_ORDER.indexOf(cur)+1)%3];
  if(id.startsWith('f2l-')){f2lState.caseSel.add(+id.slice(4));saveF2L();store.set('llStatus',llState.status);renderF2LGrid();}else if(/^(beg-|mini-|two:)/.test(id)){store.set('llStatus',llState.status);}else{llState.sel.add(id);saveLL();renderLLGroups();}
  renderCaseStats();$$('.modal .stbtn').forEach(b=>{if(b.dataset.stId===id)b.outerHTML=stBtn(id);});document.dispatchEvent(new CustomEvent('cw:status',{detail:id}));}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.stbtn');if(b){e.stopPropagation();cycleStatus(b.dataset.stId);}});
$('#llSelAll').onclick=()=>{LL_ALL.forEach(a=>llState.sel.add(a.id));saveLL();renderLLGroups();};$('#llSelNone').onclick=()=>{llState.sel.clear();saveLL();renderLLGroups();};
$('#llSelUnlearned').onclick=()=>{llState.sel=new Set(LL_ALL.filter(a=>llState.status[a.id]!=='finished').map(a=>a.id));saveLL();renderLLGroups();};
function pick(list,realistic){if(!list.length)return null;if(!realistic)return list[Math.floor(Math.random()*list.length)];const tot=list.reduce((a,b)=>a+(b.prob||1),0);let r=Math.random()*tot;for(const a of list){r-=(a.prob||1);if(r<=0)return a;}return list[list.length-1];}
const rnd=arr=>arr[Math.floor(Math.random()*arr.length)];
function llSetupFor(a){ // returns setup moves from solved
  const real=$('#llRealState').checked;const grp=a.group;const parts=[];
  const stage=['OLL edges','OLL corners','PLL corners','PLL edges'].indexOf(grp);
  const rand=(list)=>Math.random()<0.8?rnd(list):null;
  if(real){ // later stages scrambled: inverse of random later-stage algs, applied first
    if(stage<=2){const e=rand(ALG_DB.ep);if(e)parts.push(invertAlg(e.alg));}
    if(stage<=1){const c=rand(ALG_DB.cp);if(c)parts.push(invertAlg(c.alg));}
    if(stage<=0){const c=rand(ALG_DB.co);if(c)parts.push(invertAlg(c.alg));}
    parts.push(rnd(AUFS));
  }
  parts.push(invertAlg(a.alg));parts.push(rnd(AUFS));
  return simplify(parts.flatMap(p=>parseAlg(p)).filter(Boolean));
}
$('#llNext').onclick=()=>{const list=LL_ALL.filter(a=>llState.sel.has(a.id));const a=pick(list,$('#llProb').value==='realistic');if(!a){$('#llCurrent').innerHTML='<p>Select at least one case.</p>';return;}
  llState.cur=a;llState.hint=false;const setup=llSetupFor(a);llState.setup=setup;llState.cube=applyAlg(new Cube(),setup);currentLabel=()=>a.name;timer.scope='ll:'+a.id;renderTimes();
  view.mode='3d';view.yaw=-32;view.pitch=28;const r=crossRotation();setSequence([...(r?[r]:[]),...setup],'setup for case (from solved, white up: rotate, then turn)',undefined,'OLL · PLL case');renderLLCurrent();};
function llHintHTML(a){const tests={'OLL edges':eoSolved,'OLL corners':ollSolved,'PLL corners':cpSolvedLL,'PLL edges':c=>AUFS.some(u=>applyAlg(c,u).isSolved())};
  const list={'OLL edges':ALG_DB.eo,'OLL corners':ALG_DB.co,'PLL corners':ALG_DB.cp,'PLL edges':ALG_DB.ep}[a.group];const r=findLLStep(llState.cube,list,tests[a.group]);
  const s=r?`<div class="big">${esc((r.pre?r.pre+' · ':'')+r.alg)}</div><div class="muted">${r.pre?'AUF '+r.pre+' first. ':''}${esc(a.recog)}</div>`:`<div class="big">${esc(a.alg)}</div>`;return s;}
function renderLLCurrent(){const a=llState.cur;const arr=times['ll:'+a.id]||[];
  $('#llCurrent').innerHTML=`<div class="row" style="justify-content:space-between"><div><span class="tag">${esc(a.group)}</span><b ${llState.hint?'id="llNameBtn" style="cursor:pointer;text-decoration:underline dotted" title="Open case details"':''}>${llState.hint?esc(a.name):'?'}</b> <span class="muted" style="font-size:14px">${arr.length?`mean ${fmt(arr.reduce((x,y)=>x+y.ms,0)/arr.length)} over ${arr.length}`:'no times yet'}</span></div><div style="width:90px">${thumbTop(phys(llState.cube),modeFor(a.group))}</div></div>
  <div style="margin-top:8px">${llState.hint?llHintHTML(a)+`<div class="row" style="margin-top:6px"><button class="small" id="llLab">Why does it work? (Lab)</button><button class="small" id="llPlay">Step through on cube</button></div>`:'<span class="muted">Answer hidden. Press H or Reveal.</span>'}</div>`;
  const nb=$('#llNameBtn');if(nb)nb.onclick=()=>openCaseModal(modalForLL(a));
  const b=$('#llLab');if(b)b.onclick=()=>loadLab(a.alg,a.name);const p=$('#llPlay');if(p)p.onclick=()=>{const list={'OLL edges':ALG_DB.eo,'OLL corners':ALG_DB.co,'PLL corners':ALG_DB.cp,'PLL edges':ALG_DB.ep}[a.group];const tests={'OLL edges':eoSolved,'OLL corners':ollSolved,'PLL corners':cpSolvedLL,'PLL edges':c=>AUFS.some(u=>applyAlg(c,u).isSolved())};const r=findLLStep(llState.cube,list,tests[a.group]);const moves=[...(r&&r.pre?[r.pre]:[]),...parseAlg(r?r.alg:a.alg)];setSequence(moves,'solution for this case — press ▶ to step',phys(llState.cube),'OLL · PLL case');seqState.idx=0;applySequence();focusPlayer();};}
$('#llHint').onclick=()=>{if(!llState.cur)return;llState.hint=!llState.hint;renderLLCurrent();};
// Per-case times tables: one in the OLL/PLL tab, one in the F2L cases mode.
function statsRows(items){return items.map(({name,group,scope,id})=>{const arr=times[scope]||[];if(!arr.length)return '';const mean=arr.reduce((x,y)=>x+y.ms,0)/arr.length;const best=Math.min(...arr.map(x=>x.ms));return `<tr><td>${esc(name)}</td><td class="muted">${esc(group)}</td><td class="mono">${arr.length}</td><td class="mono">${fmt(mean)}</td><td class="mono">${fmt(best)}</td><td>${llState.status[id]||'unlearned'}</td></tr>`;}).join('');}
function renderCaseStats(){const fill=(sel,rows)=>{$(sel).innerHTML=rows?'<tr><th>Case</th><th>Group</th><th>n</th><th>mean</th><th>best</th><th>status</th></tr>'+rows:'<tr><td class="muted">No case times yet. Times recorded in a case drill are stored per case.</td></tr>';};
  if(curTab==='ll')fill('#llStats',statsRows(LL_ALL.map(a=>({name:a.name,group:a.group,scope:'ll:'+a.id,id:a.id}))));
  if(curTab==='f2l')fill('#f2lStats',statsRows(F2L_CASES.map(f=>({name:'F2L case #'+f.n,group:f.grp,scope:'f2l:'+f.n,id:f2lId(f.n)}))));}
const _rt=renderTimes;renderTimes=function(){_rt();renderCaseStats();};

// ---------- LAB ----------
const labState={moves:[],idx:0,base:new Cube(),movedCubies:null,playing:0};
LL_ALL.forEach(a=>{const o=document.createElement('option');o.value=a.alg;o.textContent=a.name;$('#labPick').appendChild(o);});
PLL_FULL.forEach(p=>{const o=document.createElement('option');o.value=p.alg;o.textContent='PLL '+p.name;$('#labPick').appendChild(o);});
[['Sexy move',"R U R' U'"],['Sledgehammer',"R' F R F'"],['Niklas (corner 3-cycle)',"R U' L' U R' U' L U"],['Twist two corners',"R' D' R D R' D' R D U D' R' D R D' R' D R U'"],['Edge flip (2)',"M' U M' U M' U2 M U M U M U2"],['Corner commutator [R U R\', D]',"R U R' D R U' R' D'"],['Edge 3-cycle [M\', U2]',"M' U2 M U2"]].forEach(([n,a])=>{const o=document.createElement('option');o.value=a;o.textContent=n;$('#labPick').appendChild(o);});
$('#labPick').onchange=e=>{if(e.target.value){$('#labAlg').value=e.target.value;runLab();}};
$('#labRun').onclick=()=>runLab();$('#labAlg').addEventListener('keydown',e=>{if(e.key==='Enter')runLab();});
function loadLab(alg,name){$('#labAlg').value=alg;if(method!=='cfop')setMethod('cfop');goTab('lab');runLab(name);}
const PIECE=(i,isEdge)=>isEdge?EDGE_NAMES[i]:CORNER_NAMES[i];
function invariants(c){const tw=c.co.reduce((a,b)=>a+b,0)%3,fl=c.eo.reduce((a,b)=>a+b,0)%2;const par=p=>{let s=0;const seen=[];for(let i=0;i<p.length;i++){if(seen[i])continue;let j=i,len=0;while(!seen[j]){seen[j]=true;j=p[j];len++;}s+=len-1;}return s%2;};return {tw,fl,cpar:par(c.cp),epar:par(c.ep)};}
function runLab(name){
  let moves;try{moves=parseAlg($('#labAlg').value);applyAlg(new Cube(),moves);}catch(e){$('#labOut').innerHTML='<span style="color:var(--warn)">'+esc(badMoveText(e,'Wide moves (r), slices (M E S) and rotations (x y z) also work.'))+'</span>';return;}
  const an=analyzeAlg(moves.join(' '));const trig=findTriggers(moves.join(' '));
  const base=$('#labFromSolved').checked?rotCube():displayedCube;labState.moves=moves;labState.base=base;labState.idx=0;
  const c=an.cube;const movedC=new Set(),movedE=new Set();for(let i=0;i<8;i++)if(c.cp[i]!==i||c.co[i])movedC.add(c.cp[i]);for(let i=0;i<12;i++)if(c.ep[i]!==i||c.eo[i])movedE.add(c.ep[i]);labState.movedCubies={c:movedC,e:movedE};
  // moves display with trigger borders
  $('#labMoves').innerHTML=moves.map((m,i)=>{const t=trig.findIndex(x=>i>=x.start&&i<x.end);return `<span class="m ${t>=0?'trig'+(t%4+1):''}" data-i="${i}" title="${t>=0?esc(trig[t].name):''}">${fmtMove(m)}</span>`;}).join('');
  $$('#labMoves .m').forEach(el=>el.onclick=()=>{labState.idx=+el.dataset.i+1;labShow();});
  const cyc=an.cornerCycles.map(x=>`<span class="cycle">${x.cyc.map(i=>CORNER_NAMES[i]).join('<span class="arrow"> → </span>')}<span class="arrow"> → </span>${CORNER_NAMES[x.cyc[0]]}${x.twist?` <span class="muted">+twist ${x.twist}</span>`:''}</span>`).join('')+an.edgeCycles.map(x=>`<span class="cycle">${x.cyc.map(i=>EDGE_NAMES[i]).join('<span class="arrow"> → </span>')}<span class="arrow"> → </span>${EDGE_NAMES[x.cyc[0]]}${x.flip?' <span class="muted">+flip</span>':''}</span>`).join('')+an.twisted.map(t=>`<span class="cycle">${CORNER_NAMES[t.piece]} twists ${t.twist===1?'clockwise':'counterclockwise'}</span>`).join('')+an.flipped.map(e=>`<span class="cycle">${EDGE_NAMES[e]} flips in place</span>`).join('');
  const inv=invariants(c);
  const kind=[];if(an.affectsOnlyU)kind.push('last-layer only');if(!an.cornerCycles.length&&!an.twisted.length)kind.push('corners untouched');if(!an.edgeCycles.length&&!an.flipped.length)kind.push('edges untouched');if(an.cornerCycles.length===1&&an.cornerCycles[0].cyc.length===3&&!an.edgeCycles.length&&!an.twisted.length&&!an.flipped.length)kind.push('pure corner 3-cycle');if(an.edgeCycles.length===1&&an.edgeCycles[0].cyc.length===3&&!an.cornerCycles.length&&!an.twisted.length&&!an.flipped.length)kind.push('pure edge 3-cycle');
  $('#labOut').innerHTML=`<h3>${esc(name||'Analysis')}</h3><div class="row" style="margin:6px 0">${kind.map(k=>`<span class="tag">${k}</span>`).join('')}<span class="tag">${an.moveCount} moves</span><span class="tag">repeat ${an.order}× to return</span></div>
   <div><b>Pieces that move</b> (${movedC.size} corners, ${movedE.size} edges)</div><div style="margin:6px 0">${cyc||'<span class="muted">Nothing moves: this is the identity.</span>'}</div>
   <div><b>Triggers found</b>: ${trig.length?trig.map(t=>`<span class="tag">${esc(t.name)} at move ${t.start+1}</span>`).join(''):'<span class="muted">none of the common ones</span>'}</div>
   <div style="margin-top:8px"><b>Rules no move can break</b> <span class="muted" style="font-size:14px">(This is why one twisted corner or one flipped edge cannot be solved.)</span><div class="pieces" style="margin-top:4px"><div>corner twists add up to whole turns: ${inv.tw?'no':'yes'}</div><div>edge flips come in pairs: ${inv.fl?'no':'yes'}</div><div>corner swaps: ${inv.cpar?'odd':'even'}, edge swaps: ${inv.epar?'odd':'even'} (always both the same)</div></div></div>
   <div class="muted" style="font-size:14px;margin-top:8px">A sequence that cycles exactly 3 pieces of one kind, or twists 2 corners, or flips 2 edges, is the building block of every algorithm. Look for which pieces both halves of an alg share.</div>`;
  const db=LL_ALL.find(a=>parseAlg(a.alg).join(' ')===moves.join(' '));
  $('#labWhy').innerHTML=db?`<h3>Why ${esc(db.name)} works</h3><p>${esc(db.why)}</p><p class="muted"><b>Recognise:</b> ${esc(db.recog)}</p>`:`<h3>How to read this</h3><p>Step through with the arrows. Watch the highlighted pieces: everything that is faded ends up exactly where it started, even if it moves in the middle. The faded stickers are the "working space" the algorithm borrows and returns.</p><p>Try the inverse (reverse the moves, flip every prime) and the mirror (swap R↔L, F↔B, and flip primes) in the box above and compare the cycles.</p><div class="row"><button class="small" id="labInv">Load inverse</button><button class="small" id="labMir">Load mirror</button></div>`;
  const bi=$('#labInv');if(bi)bi.onclick=()=>{$('#labAlg').value=invertAlg(moves);runLab(name?name+' inverse':null);};
  const bm=$('#labMir');if(bm)bm.onclick=()=>{$('#labAlg').value=moves.map(m=>{const map={R:'L',L:'R',F:'B',B:'F',U:'U',D:'D',r:'l',l:'r',f:'b',b:'f',u:'u',d:'d',M:'M',E:'E',S:'S',x:'x',y:'y',z:'z'};const b=map[m[0]];const s=m.slice(1);const ns=s==="'"?'':s==='2'?'2':"'";return b+ns;}).join(' ');runLab(name?name+' mirror':null);};
  labShow();
}
function labFadeSet(cube){if(!$('#labFade').checked||!labState.movedCubies)return null;const set=new Set();const {c,e}=labState.movedCubies;for(let i=0;i<8;i++)if(c.has(cube.cp[i]))cornerFacelet[i].forEach(x=>set.add(x));for(let i=0;i<12;i++)if(e.has(cube.ep[i]))edgeFacelet[i].forEach(x=>set.add(x));for(let f=0;f<6;f++)set.add(9*f+4);return set;}
function labShow(){const cube=applyAlg(labState.base,labState.moves.slice(0,labState.idx));showCube(cube,labFadeSet(cube));$$('#labMoves .m').forEach((el,i)=>el.classList.toggle('cur',i===labState.idx-1));}
$('#labPrev').onclick=()=>{labState.idx=Math.max(0,labState.idx-1);labShow();};$('#labNext').onclick=()=>{labState.idx=Math.min(labState.moves.length,labState.idx+1);labShow();};
$('#labPlay').onclick=()=>{if(labState.playing){clearInterval(labState.playing);labState.playing=0;$('#labPlay').textContent='▶ play';return;}labState.idx=0;labShow();$('#labPlay').textContent='⏸ stop';labState.playing=setInterval(()=>{if(labState.idx>=labState.moves.length){clearInterval(labState.playing);labState.playing=0;$('#labPlay').textContent='▶ play';return;}labState.idx++;labShow();},550);};
$('#labFade').onchange=labShow;
function buildAndShow(alg,title){const an=analyzeAlg(alg);const c=an.cube;let nC=0,nE=0;for(let i=0;i<8;i++)if(c.cp[i]!==i||c.co[i])nC++;for(let i=0;i<12;i++)if(c.ep[i]!==i||c.eo[i])nE++;
  $('#comOut').innerHTML=`<div><b>${esc(title)}</b> = <span class="mono">${esc(alg)}</span></div><div class="muted" style="font-size:14px;margin:4px 0">Moves ${nC} corner${nC===1?'':'s'} and ${nE} edge${nE===1?'':'s'}. ${nC+nE===0?'Identity: A and B share no pieces, so nothing happens.':nC+nE===3?'A clean 3-cycle: A and B overlap on exactly one piece.':nC+nE===2?'Two pieces: a twist or flip pair.':'Overlap on more than one piece, so the result is messier. Shrink A or B until they share one piece.'}</div><button class="small" id="comLoad">Load into Lab</button>`;
  $('#comLoad').onclick=()=>{$('#labAlg').value=alg;runLab(title);};}
$('#comBuild').onclick=()=>{const A=$('#comA').value,B=$('#comB').value;try{buildAndShow(`${A} ${B} ${invertAlg(A)} ${invertAlg(B)}`,'[A, B]');}catch(e){$('#comOut').textContent=badMoveText(e,'Wide moves, slices and rotations also work.');}};
$('#comSwap').onclick=()=>{const a=$('#comA').value;$('#comA').value=$('#comB').value;$('#comB').value=a;};
$('#conBuild').onclick=()=>{const S=$('#conS').value,X=$('#conX').value;try{buildAndShow(`${S} ${X} ${invertAlg(S)}`,'[S: X]');}catch(e){$('#comOut').textContent=badMoveText(e,'Wide moves, slices and rotations also work.');}};
$('#concepts').innerHTML=[
 ['Commutator [A, B] = A B A\' B\'','Do A, do B, undo A, undo B. Pieces that only A moves go back when you undo A. Pieces that only B moves go back when you undo B. Only the pieces that both A and B move end up changed. If A and B share exactly one piece, you get a 3-cycle, or two pieces that turn in place. The sexy move R U R\' U\' is the commutator [R, U]. R and U share the URF corner and the UR edge, so it is not pure. But it is short, and a conjugate can clean it up.'],
 ['Conjugate [S: X] = S X S\'','Do X in a different place. S moves pieces to where X acts. Then X acts, and S\' moves everything back. The two-look OLL edge algorithms work this way: F, then the sexy move, then F\'. Use f in place of F, and the same middle part flips a different pair of edges.'],
 ['Why two-look','Orientation comes first, then permutation. An OLL algorithm may move top-layer pieces to other places, as long as they end facing the right way. A PLL algorithm must keep them facing the right way and only move them. Two-look splits each step into edges and corners. That gives 3 + 7 OLL and 2 + 4 PLL algorithms, not all 57 OLL and 21 PLL algorithms. The cost is one more look and about 10 more moves.'],
 ['Sune as the building block','The Sune moves three corners around and twists them. The Anti-Sune is its inverse. H is two Sunes. Pi is an Anti-Sune, then a Sune. T and L use wide moves: a short sexy move and sledgehammer twist two corners. U (headlights) is a pure corner commutator. So the 7 corner cases come down to the Sune and a few ideas.'],
 ['Rules no move can break','Every face turn keeps three rules. Corner twists always add up to whole turns. Edge flips always come in pairs. The number of corner swaps and the number of edge swaps are both even or both odd. So one flipped edge, one twisted corner, or two swapped pieces alone cannot happen. That is why every PLL that swaps two corners also swaps two edges (T, J, R, F, N, V, Y). The pure PLLs are 3-cycles (A, U) or double swaps (E, H, Z).'],
 ['Finger tricks shape the algorithms','Cubers choose algorithms for speed, not for the fewest moves. R U R\' U\' is popular because the right hand turns R and U fast. That is why Ua and Ub are taught with R and U, not the shorter M-slice forms. It is also why some algorithms include a rotation.'],
].map(([t,d])=>`<div class="tip"><b>${t}</b>${d}</div>`).join('');


// ---------- case modal ----------
function trigSpans(alg){const ms=parseAlg(alg);const trig=findTriggers(ms.join(' '));return ms.map((m,i)=>{const t=trig.findIndex(x=>i>=x.start&&i<x.end);return `<span class="m ${t>=0?'trig'+(t%4+1):''}" title="${t>=0?esc(trig[t].name):''}">${fmtMove(m)}</span>`;}).join('')+(trig.length?`<div class="muted" style="font-size:13px;width:100%;font-family:var(--sans)">Boxed: ${[...new Set(trig.map(t=>t.name))].join(', ')}</div>`:'');}
function cycleText(alg){const an=analyzeAlg(alg);const parts=[];
  an.cornerCycles.forEach(x=>parts.push(`corners ${x.cyc.map(i=>CORNER_NAMES[i]).join(' → ')} → ${CORNER_NAMES[x.cyc[0]]}${x.twist?' (with twist)':''}`));
  an.edgeCycles.forEach(x=>parts.push(`edges ${x.cyc.map(i=>EDGE_NAMES[i]).join(' → ')} → ${EDGE_NAMES[x.cyc[0]]}${x.flip?' (with flip)':''}`));
  an.twisted.forEach(t=>parts.push(`${CORNER_NAMES[t.piece]} twists in place`));an.flipped.forEach(e=>parts.push(`${EDGE_NAMES[e]} flips in place`));
  return {an,text:parts.length?parts.join('; '):'nothing moves'};}
function openCaseModal(o){ // o: {title, group, alg, pic (svg html), recog, why, setupMoves (engine frame, from solved), kind:'ll'|'f2l'|'pll'}
  closeModal();const {an,text}=cycleText(o.alg);
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modalBg';
  bg.innerHTML=`<div class="modal" role="dialog" aria-label="${esc(o.title)}"><button class="close small ghost" id="modalClose" aria-label="Close">✕</button>
    <div class="pic">${o.pic}</div>
    <div>
      <div class="row"><span class="tag">${esc(o.group)}</span><span class="tag">${an.moveCount} moves</span><span class="tag">repeat ${an.order}× to return</span></div>
      <h2 style="margin-top:6px">${esc(o.title)}</h2>
      <div class="algbig">${trigSpans(o.alg)}</div>
      ${o.recog?`<div class="sec"><b>Recognise</b>${esc(o.recog)}</div>`:''}
      ${o.why?`<div class="sec"><b>Why it works</b>${esc(o.why)}</div>`:''}
      ${o.statusId?`<div class="sec"><b>Status</b>${stBtn(o.statusId)}</div>`:''}
      <div class="sec"><b>What it moves</b>${o.parts&&o.parts.length?`<div class="mvparts">${o.parts.map((p,i)=>`<button type="button" class="mvpart" data-mv="${i}" aria-pressed="false">${esc(p.text)}</button>`).join('')}</div><div class="muted mvhint">Choose a part to show it on the picture.</div>`:`<span class="mono" style="font-size:14px">${esc(text)}</span>`}</div>
      <div class="sec"><b>Set up from solved (white up)</b><span class="mono" style="font-size:14px">${esc([...(crossRotation()?[crossRotation()]:[]),...o.setupMoves].join(' '))}</span></div>
      <div class="row" style="margin-top:14px"><button class="primary" id="modalSetup">Show on cube</button><button id="modalStep">Step through solution</button>${o.noLab?'':'<button id="modalLab">Open in Lab</button>'}</div>
      <button class="closebar" id="modalCloseBar">Close</button>
    </div></div>`;
  document.body.appendChild(bg);
  const pic=bg.querySelector('.pic svg'),hint=bg.querySelector('.mvhint');
  bg.querySelectorAll('.mvpart').forEach(b=>b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';
    bg.querySelectorAll('.mvpart').forEach(x=>{x.classList.toggle('on',on&&x===b);x.setAttribute('aria-pressed',String(on&&x===b));});
    mvShow(pic,on?b.dataset.mv:null);hint.textContent=on?'Choose it again to clear the picture.':'Choose a part to show it on the picture.';});
  const close=()=>closeModal();bg.addEventListener('click',e=>{if(e.target===bg)close();});$('#modalClose').onclick=close;$('#modalCloseBar').onclick=close;
  if(mobileMQ.matches){bg.querySelector('.modal').addEventListener('click',e=>{if(e.target.closest('button, a, input, select, textarea'))return;close();});}
  try{window.history.pushState({modal:1},'');}catch(e){}window.addEventListener('popstate',popClose);
  const r=crossRotation();
  // On a phone the Reference section has no player, so these buttons first open the section that trains this case.
  const toPlayer=()=>{if(mobileMQ.matches&&curTab==='ref')goTab(o.tab||'ll');focusPlayer();};
  $('#modalSetup').onclick=()=>{setSequence([...(r?[r]:[]),...o.setupMoves],'setup for '+o.title+' (from solved, white up)',undefined,o.title);close();toPlayer();};
  $('#modalStep').onclick=()=>{const base=applyAlg(new Cube(),[...(r?[r]:[]),...o.setupMoves]);setSequence(removeRotations(parseAlg(o.alg)),'solution: '+o.title+' — press ▶ to step',base,o.title);seqState.idx=0;applySequence();close();toPlayer();};
  const lab=$('#modalLab');if(lab)lab.onclick=()=>{setSequence([...(r?[r]:[]),...o.setupMoves],'setup for '+o.title,undefined,o.title);$('#labFromSolved').checked=false;loadLab(o.alg,o.title);close();};
  document.addEventListener('keydown',escClose);
}
function escClose(e){if(e.key==='Escape')closeModal();}
const MOBILE_NEXT={'mg-ollE':'mg-ollC','mg-ollC':'mg-pllC','mg-pllC':'mg-pllE','mg-pllE':'mg-ollE'};
let modalNext=null;
try{window.history.scrollRestoration='manual';}catch(e){}
function goNext(){const id=modalNext;modalNext=null;if(!id||!mobileMQ.matches)return;setTimeout(()=>{const t=document.getElementById(id);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},60);}
function popClose(){const b=$('#modalBg');if(b){b.remove();document.removeEventListener('keydown',escClose);}window.removeEventListener('popstate',popClose);goNext();}
function closeModal(){const b=$('#modalBg');if(!b)return;b.remove();document.removeEventListener('keydown',escClose);window.removeEventListener('popstate',popClose);if(window.history.state&&window.history.state.modal){try{window.history.back();}catch(e){}}goNext();}
function caseWithParts(c,mode){const P=phys(c),parts=caseParts(c,P.toFacelets(),mode);return {parts,pic:mode==='f2l'?thumb3DMarks(P,parts):thumbTop(P,mode,parts)};}
function modalForLL(a){const c=applyAlg(new Cube(),invertAlg(a.alg));return {title:a.name,statusId:a.id,tab:'ll',group:a.group,alg:a.alg,recog:a.recog,why:a.why,...caseWithParts(c,modeFor(a.group)),setupMoves:removeRotations(parseAlg(invertAlg(a.alg)))};}
function modalForPLL(p){const c=derotate(applyAlg(new Cube(),invertAlg(p.alg)));const two=LL_ALL.find(x=>x.name.startsWith(p.name+' '));return {title:p.name+' perm',tab:'ll',group:'PLL · '+p.type,alg:p.alg,recog:two?two.recog:'',why:two?two.why:'',...caseWithParts(c,'pll'),setupMoves:removeRotations(parseAlg(invertAlg(p.alg)))};}
function modalForF2L(f){const c=derotate(applyAlg(new Cube(),invertAlg(f.alg)));const cpos=c.cp.indexOf(4),epos=c.ep.indexOf(8);
  const recog=`Pair for the front-right slot. Corner is at ${CORNER_NAMES[cpos]}${cpos<4?` with its ${COLOR_NAMES[phys(c).toFacelets()[cornerFacelet[cpos][0]]]} sticker on top`:''}; edge is at ${EDGE_NAMES[epos]}.`;
  return {title:'F2L case #'+f.n,statusId:f2lId(f.n),tab:'f2l',group:f.grp,alg:f.alg,recog,why:F2L_WHY[f.grp]||'',...caseWithParts(c,'f2l'),setupMoves:removeRotations(parseAlg(invertAlg(f.alg)))};}

// ---------- REFERENCE ----------
// Each reference algorithm shows its first move; a spoiler covers each move after it. A click on the line
// reveals the next move; the button reveals the rest; a click on a fully shown line covers it again.
// "Show all moves" uncovers every Reference tab (cw:refAll).
const isRot=m=>/^[xyz]/.test(m);
function spoilAlg(alg){const t=alg.trim().split(/\s+/);let k=0;while(k<t.length-1&&isRot(t[k]))k++; // a lead rotation is a hold: show the turn after it too
  const units=[];let rot=[];for(const m of t.slice(k+1)){rot.push(m);if(!isRot(m)){units.push(rot.join(' '));rot=[];}} // a rotation goes with the turn after it
  if(!units.length)return esc(alg);if(rot.length)units[units.length-1]+=' '+rot.join(' ');
  return `<span class="spoil" title="Click to reveal the next move">${esc(t.slice(0,k+1).join(' '))} <span class="sp-rest">${units.map(u=>`<span class="sp-m">${esc(u)}</span>`).join(' ')}</span> <button type="button" class="small sp-btn">${spoilLeft(units.length)}</button></span>`;}
function spoilLeft(n){return `Reveal ${n} more move${n>1?'s':''}`;}
function spoilSync(s){const left=s.querySelectorAll('.sp-m:not(.on)').length;s.classList.toggle('open',!left);
  if(left)s.querySelector('.sp-btn').textContent=spoilLeft(left);s.title=left?'Click to reveal the next move':'Click to cover the moves again';}
function spoilReset(s){s.querySelectorAll('.sp-m.on').forEach(m=>m.classList.remove('on'));spoilSync(s);}
function spoilStep(s,all){const hid=[...s.querySelectorAll('.sp-m:not(.on)')];if(!hid.length)return spoilReset(s);
  (all?hid:hid.slice(0,1)).forEach(m=>m.classList.add('on'));spoilSync(s);}
function refAllBox(){return `<label class="refall-box"><input type="checkbox" class="refAll"${store.get('refAll',false)?' checked':''}> Show all moves</label>`;}
function setRefAll(on){store.set('refAll',on);document.body.classList.toggle('refall',on);$$('.refAll').forEach(b=>b.checked=on);
  $$('.spoil').forEach(spoilReset);}
document.body.classList.toggle('refall',store.get('refAll',false));
document.addEventListener('change',e=>{if(e.target.classList&&e.target.classList.contains('refAll'))setRefAll(e.target.checked);});
// Capture phase: a click on a covered line must not also open the case details under it.
document.addEventListener('click',e=>{const s=e.target.closest&&e.target.closest('.spoil');if(!s||document.body.classList.contains('refall'))return;
  e.stopPropagation();e.preventDefault();spoilStep(s,!!e.target.closest('.sp-btn'));},true);
$('#refDesktop .panel').insertAdjacentHTML('beforeend',refAllBox());
function refRow(a,g){return `<div class="rcard ref-row" data-kind="ll" data-id="${a.id}" title="Open details">${thumbTop(caseCube(a),modeFor(a.group))}<div><div class="nm">${esc(a.name)}</div><div class="rec">${esc(a.recog)}</div><div class="alg">${spoilAlg(a.alg)}</div></div></div>`;}
$('#refOLLe').innerHTML=ALG_DB.eo.map(a=>refRow(a,'OLL')).join('');
$('#refOLLc').innerHTML=ALG_DB.co.map(a=>refRow(a,'OLL')).join('');
$('#refPLLc').innerHTML=ALG_DB.cp.map(a=>refRow(a,'PLL')).join('');
$('#refPLLe').innerHTML=ALG_DB.ep.map(a=>refRow(a,'PLL')).join('');
$('#refPLL').innerHTML='<tr><th></th><th>Perm</th><th>Type</th><th>Algorithm</th></tr>'+PLL_FULL.map(p=>`<tr class="ref-row" data-kind="pll" data-id="${p.name}" style="cursor:pointer"><td style="width:70px">${thumbTop(phys(derotate(applyAlg(new Cube(),invertAlg(p.alg)))),'pll')}</td><td><b>${p.name}</b></td><td class="muted">${p.type}</td><td class="ref-alg">${spoilAlg(p.alg)}</td></tr>`).join('');
$('#refF2L').innerHTML='<tr><th></th><th>#</th><th>Group</th><th>Algorithm</th></tr>'+F2L_CASES.map(f=>`<tr class="ref-row" data-kind="f2l" data-id="${f.n}" style="cursor:pointer"><td style="width:64px">${thumb3D(caseSetupCube(f))}</td><td>${f.n}</td><td class="muted">${esc(f.grp)}</td><td class="ref-alg">${spoilAlg(f.alg)}</td></tr>`).join('');
$$('.ref-row').forEach(el=>el.onclick=()=>{const k=el.dataset.kind,id=el.dataset.id;if(k==='ll')openCaseModal(modalForLL(LL_ALL.find(a=>a.id===id)));else if(k==='pll')openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name===id)));else openCaseModal(modalForF2L(F2L_CASES.find(f=>f.n===+id)));});


// ---------- mobile reference ----------
function renderMobileRef(){const tile=(pic,label,kind,id)=>`<div class="case" data-kind="${kind}" data-id="${id}">${pic}<div>${esc(label)}</div></div>`;
  const ids=['mg-ollE','mg-ollC','mg-pllC','mg-pllE','mg-pll','mg-f2l'];
  const groups=[['Two-look OLL · 1. Edges',ALG_DB.eo.map(a=>tile(thumbTop(caseCube(a),'eo'),a.name,'ll',a.id))],['Two-look OLL · 2. Corners',ALG_DB.co.map(a=>tile(thumbTop(caseCube(a),'oll'),a.name,'ll',a.id))],
    ['Two-look PLL · 1. Corners',ALG_DB.cp.map(a=>tile(thumbTop(caseCube(a),'pllc'),a.name,'ll',a.id))],['Two-look PLL · 2. Edges',ALG_DB.ep.map(a=>tile(thumbTop(caseCube(a),'plle'),a.name,'ll',a.id))],
    ['Full PLL',PLL_FULL.map(p=>tile(thumbTop(phys(derotate(applyAlg(new Cube(),invertAlg(p.alg)))),'pll'),p.name+' perm','pll',p.name))],
    ['F2L (front-right slot)',F2L_CASES.map(f=>tile(thumb3D(caseSetupCube(f)),'#'+f.n,'f2l',f.n))]];
  $('#refMobileCases').innerHTML=groups.map(([g,tiles],i)=>`<div class="mgroup" id="${ids[i]}"><h3>${g}</h3><div class="mcases">${tiles.join('')}</div></div>`).join('');
  $$('#refMobileCases .case').forEach(el=>el.onclick=()=>{const g=el.closest('.mgroup');modalNext=g?MOBILE_NEXT[g.id]||null:null;const k=el.dataset.kind,id=el.dataset.id;if(k==='ll')openCaseModal(modalForLL(LL_ALL.find(a=>a.id===id)));else if(k==='pll')openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name===id)));else openCaseModal(modalForF2L(F2L_CASES.find(f=>f.n===+id)));});}
$$('#mnav button').forEach(b=>b.onclick=()=>{const t=document.getElementById(b.dataset.go);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});});
function updateMnav(){if(curTab!=='ref'||!$('#mg-ollE'))return;const off=$('.top').getBoundingClientRect().height+20;let cur=null;for(const b of $$('#mnav button')){const t=document.getElementById(b.dataset.go);if(t&&t.getBoundingClientRect().top-off<=0)cur=b;}
  const end=document.getElementById('mg-pll');if(end&&end.getBoundingClientRect().top-off<=0)cur=null;$$('#mnav button').forEach(b=>b.classList.toggle('on',b===cur));}
window.addEventListener('scroll',updateMnav,{passive:true});
const mobileMQ=matchMedia('(max-width: 760px)');
function setTopH(){document.documentElement.style.setProperty('--toph',$('.top').getBoundingClientRect().height+'px');}
window.addEventListener('resize',setTopH);
// On a phone the Reference section is the home screen. The menu opens the other sections.
function applyMobile(){setTopH();if(mobileMQ.matches)renderMobileRef();goTab(store.get(tabKey(),homeTab()));}
if(mobileMQ.addEventListener)mobileMQ.addEventListener('change',applyMobile);else if(mobileMQ.addListener)mobileMQ.addListener(applyMobile);
function renderMenu(){$('#menu').innerHTML=railButtons().map(b=>`<button data-tab="${b.dataset.tab}" data-sec="${b.dataset.tab}" class="${b.dataset.tab===curTab?'on':''}"><i class="sec-sq"></i>${esc(b.lastChild.textContent)}</button>`).join('');
  $$('#menu button').forEach(m=>m.onclick=()=>{closeMenu();goTab(m.dataset.tab);window.scrollTo({top:0});});}
function openMenu(){renderMenu();$('#menuBg').classList.remove('hidden');$('#menuBtn').setAttribute('aria-expanded','true');}
function closeMenu(){$('#menuBg').classList.add('hidden');$('#menuBtn').setAttribute('aria-expanded','false');}
$('#menuBtn').onclick=()=>{if($('#menuBg').classList.contains('hidden'))openMenu();else closeMenu();};
$('#menuBg').onclick=e=>{if(e.target===e.currentTarget)closeMenu();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

// ---------- misc ----------
$('#themeBtn').onclick=()=>{const r=document.documentElement;const cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');r.dataset.theme=cur==='dark'?'light':'dark';store.set('theme',r.dataset.theme);};
(()=>{const t=store.get('theme',null);if(t)document.documentElement.dataset.theme=t;})();
// The keys card. Beginner mode has no timer, so Space plays there and the timer row is left out.
function helpHTML(){const k=t=>`<span class="kbd">${t}</span>`;const beg=timerHidden();
  const rows=[[k('←')+' '+k('→'),'one move back or forward'],[k('⇧')+' + arrows','five moves at a time'],[k('Home')+' '+k('End'),'the start, the end'],
    [k('space'),beg?'play, pause':'timer: hold, release to start · press to stop'],[k('P'),'play, pause'],[k('A'),'animation on or off'],...(beg?[]:[[k('D'),'delete the last time'],[k('C'),'clear all times']]),
    [k('1')+'–'+k(String(railButtons().length)),'switch tab'],...(beg?[]:[[k('N'),'next scramble / case'],[k('H'),'reveal the answer']]),[k('?'),'this card'],['drag cube','orbit the view']];
  return `<h3>Keys</h3><table>${rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table><p class="muted" style="margin-top:8px;font-size:13px">${beg?'Your progress and seed history are':'Times, case statuses and seed history are'} saved in this browser.</p>`;}
$('#helpBtn').onclick=()=>{const b=$('#helpBox');b.classList.toggle('hidden');b.innerHTML=helpHTML();};
document.addEventListener('cw:method',()=>{renderAnimBtn();const b=$('#helpBox');if(b&&!b.classList.contains('hidden'))b.innerHTML=helpHTML();});
$('#scrLen').onchange=()=>newScramble($('#seed').value||undefined);
$('#planRef').checked=store.get('planRef',false);$('#planRef').onchange=()=>{store.set('planRef',$('#planRef').checked);if(planState.plan)$('#planBtn').click();};
$('#f2lPairs').onchange=()=>{if(f2lState.mode==='live')showF2LState();};
// boot
$('#crossColor').value=store.get('crossColor','white');setScrLenOptions();
document.body.dataset.tab=curTab;$('#mtitle').textContent='Solve';
renderTimes();renderHistory();renderAnimBtn();newScramble();applyMobile();setTimeout(()=>{buildCrossTable();tablesReady=true;if(curTab==='cross')refreshCross();},300);

