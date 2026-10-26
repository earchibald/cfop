// The move trail (1.42.0): the last moves of a smart cube, on the Smart cube tab (cubeTabMovesDraw)
// and in the lab (labMovesDraw). Three zones, each over a segment of one line with its label under
// it: Now (the last move, a large tile in the color of the face it turned), Recent (the four moves
// before it, a bar of the face color under each) and Earlier (the moves before those, gray). Each
// move carries its number in the list over it. The moves that do not fit show as a range, "1–13",
// at the old end, on a dashed segment. An arrow on the old end of the line points to where the
// moves trail off; nothing comes after Now. Right to left by default (Now on the left); Settings
// can swap it (cw:trailDir, 'rtl' or 'ltr'). The document order is always oldest first, and the
// CSS turns it round (css/trail.css), so a reader and a test read the moves in the order made.
// trailZones and trailColor are pure; trailDraw and trailNote work on the page's elements and lists.
const TRAIL_RECENT=4;
// The direction: 'rtl' (Now on the left) unless the setting says 'ltr'.
function trailDir(){try{return JSON.parse(localStorage.getItem('cw:trailDir'))==='ltr'?'ltr':'rtl';}catch(e){return 'rtl';}}
// The color index (0 white .. 5 blue) of the face a move turns, the move named as held: the hold's
// centers say which of the cube's faces is at each place. -1 for a whole-cube turn.
function trailColor(m,hold){
  const p='URFDLB'.indexOf(m[0]);if(p<0)return -1;
  return hold&&hold.cube?hold.cube.center[p]:p;
}
// The zones of a list, oldest first: {zone, label, moves: [{k, m, kind, rot, color}], hid, arrow}.
// `colors[k-1]` is the color of move k, else colorOf(m).
function trailZones(moves,shown,colors,colorOf){
  const N=moves.length;if(!N)return [];
  const hid=Math.max(0,N-shown),mk=(k,kind)=>{
    const m=moves[k-1],rot=/^[xyz]/i.test(m),c=colors&&colors[k-1]!=null?colors[k-1]:colorOf?colorOf(m):-1;
    return {k,m,kind,rot,color:rot?-1:c};
  };
  const z=[],ear=[],rec=[];
  if(hid)z.push({zone:'hidden',label:'',moves:[],hid});
  for(let k=hid+1;k<N-TRAIL_RECENT;k++)ear.push(mk(k,'ear'));
  if(ear.length)z.push({zone:'earlier',label:'Earlier',moves:ear});
  for(let k=Math.max(hid+1,N-TRAIL_RECENT);k<N;k++)rec.push(mk(k,'rec'));
  if(rec.length)z.push({zone:'recent',label:'Recent',moves:rec});
  z.push({zone:'now',label:'Now',moves:[mk(N,'now')]});
  const a=z.find(x=>x.zone==='earlier'||x.zone==='recent');if(a)a.arrow=true;
  return z;
}
// The colors after one change of the list from `before` moves to `after`: a new move or a merge
// with the last takes `color`; a list that got shorter loses its end.
function trailNote(colors,before,after,color){
  const out=colors.slice(0,after);
  if(after>0&&after>=before)out[after-1]=color;
  return out;
}
// Draw the trail into `el`: the last `o.shown` moves of `moves`, colored by `o.colors` (one per move,
// as trailNote keeps them) or, for a move with none, `o.colorOf`. The last move pops when it is new.
function trailDraw(el,moves,o){
  const N=moves.length,last=N?N+':'+moves[N-1]:'',fresh=el.dataset.trail!==undefined&&!!last&&last!==el.dataset.trail&&N>=(+el.dataset.trailN||0);
  el.dataset.trail=last;el.dataset.trailN=String(N);
  el.classList.add('trail');el.classList.toggle('rtl',trailDir()==='rtl');
  el.textContent='';
  const add=(p,cls,text)=>{const s=document.createElement('span');s.className=cls;if(text!=null)s.textContent=text;return p.appendChild(s);};
  if(!N){add(el,'none','No moves yet');return;}
  for(const z of trailZones(moves,o.shown,o.colors,o.colorOf)){
    const zd=add(el,'zone z-'+z.zone+(z.arrow?' arrow':'')),row=add(zd,'zm');
    if(z.hid){
      const r=add(row,'it more');r.title=`${N} moves in all. Moves 1 to ${z.hid} do not show.`;r.setAttribute('aria-label',`${z.hid} more`);
      add(r,'num',' ');add(r,'tile',z.hid===1?'1':'1–'+z.hid);
    }
    for(const m of z.moves){
      const it=add(row,'it '+m.kind+(m.rot?' rot':'')+(m.color>=0?' c'+m.color:'')+(m.kind==='now'&&fresh?' pop':''));
      it.title=m.kind==='now'?`Your last move: move ${m.k}`:`Move ${m.k}`;
      add(it,'num',String(m.k));add(it,'mv'+(m.rot?' rot':''),m.m);
    }
    add(zd,'seg');add(zd,'zl',z.label);
  }
}
