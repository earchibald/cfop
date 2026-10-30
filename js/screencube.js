// ===== The virtual cube =====
// A cube on the page for a user with no cube in the hands (Virtual cube in the cube menu; the id is
// still 'screen'). Six keys turn the six faces: A W D X · S E on the keyboard, or 4 8 6 2 · 5 9 on
// the numeric keypad, both at once. C (keypad 3) turns the middle layer, M. Comma, period and slash
// turn the whole cube: x, y, z. Shift turns the other way (prime). Option (Alt) with a face key
// turns two layers, the face and the middle (wide: r). A drag turns the view round the cube. A
// double click puts the view back. One virtual cube takes the keys at a time: the last one drawn
// that is still on the page (SCREEN.active). The lab keeps its own four layouts (LAB_KEYMAPS).
// codes: the keys of L U R D F B, then M. short: the name on the Keys window's buttons.
const SCREEN_KEYMAPS={
  awdx:{name:'A W D X · S E',short:'WASD+',where:'Keyboard',codes:['KeyA','KeyW','KeyD','KeyX','KeyS','KeyE','KeyC']},
  pad:{name:'4 8 6 2 · 5 9',short:'NumKeys',where:'Numeric keypad',codes:['Numpad4','Numpad8','Numpad6','Numpad2','Numpad5','Numpad9','Numpad3']}};
// The face each of the keys turns: left, up, right and down around the front, then back, then
// the middle layer.
const SCREEN_KEY_FACES=['L','U','R','D','F','B','M'];
// The whole-cube turns: the same keys in both layouts.
const SCREEN_TURN_KEYS={Comma:'x',Period:'y',Slash:'z'};
const SCREEN_VIEW={yaw:-32,pitch:28};
const SCREEN={active:null};
function screenKeyChar(code){return code.startsWith('Key')?code.slice(3):code.startsWith('Numpad')?code.slice(6):{Comma:',',Period:'.',Slash:'/'}[code]||code;}
// The key of each face in a layout: {L:'A', U:'W', ..., M:'C', x:',', y:'.', z:'/'}.
function screenKeys(id){const m=SCREEN_KEYMAPS[id]||SCREEN_KEYMAPS.awdx;const out={};SCREEN_KEY_FACES.forEach((f,i)=>out[f]=screenKeyChar(m.codes[i]));
  for(const [c,r] of Object.entries(SCREEN_TURN_KEYS))out[r]=screenKeyChar(c);return out;}
// The move of a face, M, or x, y, z with the two modifiers: prime (Shift) turns the other way, wide
// (Option) turns a face with the middle layer, as a small letter (r). Wide does nothing to M or to
// a whole-cube turn.
function screenMove(f,prime,wide){return (wide&&'URFDLB'.includes(f)?f.toLowerCase():f)+(prime?"'":'');}
// The move a key makes ("R", "R'", "r", "M", "x'"), or null, from either layout, or from layout
// `only` (an id of SCREEN_KEYMAPS). The key alone turns clockwise, Shift the other way; `wide`
// (Option) turns two layers.
function screenKeyMove(code,shift,only,wide){if(SCREEN_TURN_KEYS[code])return screenMove(SCREEN_TURN_KEYS[code],shift,false);
  for(const m of only&&SCREEN_KEYMAPS[only]?[SCREEN_KEYMAPS[only]]:Object.values(SCREEN_KEYMAPS)){const i=m.codes.indexOf(code);if(i>=0)return screenMove(SCREEN_KEY_FACES[i],shift,wide);}return null;}
// A 3×3 move as the puzzle of size n takes it, or null where it has none: the 4×4 writes a wide
// turn as both layers (Rr) and has no M; the 2×2 has no wide turn and no M.
function screenMoveFor(m,n){if(!n||n===3)return m;const b=m[0];
  if(b==='M')return null;if('urfdlb'.includes(b))return n===4?b.toUpperCase()+m:null;return m;}
// The name of the wide modifier key: Option on a Mac, Alt elsewhere.
function screenWideKey(){return typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'')?'Option':'Alt';}
// Shift on the keypad: with Num Lock on, Windows sends Shift+4 as a Left arrow with no Shift, so a
// keypad key that gives no digit counts as Shift.
function screenKeyShift(e){return e.shiftKey||(/^Numpad\d$/.test(e.code)&&!/^\d$/.test(e.key)&&!!e.getModifierState&&e.getModifierState('NumLock'));}
// Draw a cube into `el` and let the keys and a drag act on it.
// opts: cube (a Cube), fade (a Set of lit sticker indices, the rest dim), label, keys (false: the
// keys do nothing here), onMove(move, cube) after each turn, view ({yaw, pitch}), onPick(index) on a
// click on a sticker with no drag (the 54 index).
function screenCube(el,opts={}){
  const sc={el,cube:opts.cube||new Cube(),fade:opts.fade||null,view:{...(opts.view||SCREEN_VIEW)},anim:null,lift:null,keys:opts.keys!==false,onMove:opts.onMove||null,onPick:opts.onPick||null,label:opts.label||'The virtual cube'};
  el.classList.add('screencube');el.setAttribute('role','img');el.setAttribute('aria-label',sc.label);
  if(!el.title)el.title='Drag to look around the cube. Double-click to put it back.';
  // sc.under and sc.over: functions of the view that give more SVG behind and in front of the cube
  // (the hold page's shadow hands).
  const draw=()=>{const a=sc.anim,f=(a?a.from:sc.cube).toFacelets();
    el.innerHTML=`<svg viewBox="0 0 400 370" aria-hidden="true">${sc.under?sc.under(sc.view):''}${renderCube3D(f,{yaw:sc.view.yaw,pitch:sc.view.pitch,scale:46,n:3,fade:sc.fade,move:a?a.move:null,t:a?a.t:0,lift:a?null:sc.lift,cls:sc.onPick?i=>'pk'+i:null})}${sc.over?sc.over(sc.view):''}</svg>`;};
  sc.draw=draw;
  sc.set=(cube,fade)=>{if(sc.anim){cancelAnimationFrame(sc.anim.raf);sc.anim=null;}sc.cube=cube;if(fade!==undefined)sc.fade=fade;draw();};
  // o.dur: the length of the turn in ms (a quarter turn is 260 by default).
  sc.turn=(move,o={})=>{const from=sc.anim?sc.anim.to:sc.cube;const to=applyAlg(from,move);
    if(sc.anim)cancelAnimationFrame(sc.anim.raf);sc.cube=to;
    const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(typeof requestAnimationFrame!=='function'||reduce){sc.anim=null;draw();}
    else{const dur=o.dur||(move.endsWith('2')?380:260),t0=performance.now();sc.anim={from,to,move,t:0,raf:0};
      const step=()=>{if(!sc.anim)return;const x=Math.min(1,(performance.now()-t0)/dur);sc.anim.t=0.5-0.5*Math.cos(Math.PI*x);
        if(x>=1){sc.anim=null;draw();return;}draw();sc.anim.raf=requestAnimationFrame(step);};
      sc.anim.raf=requestAnimationFrame(step);}
    if(sc.onMove)sc.onMove(move,to);return to;};
  sc.resetView=()=>{sc.view={...(opts.view||SCREEN_VIEW)};draw();}; // back to the view it opened with
  // Lift the pieces with a sticker in `set` out of the cube, with a glow: out, a hold, and back in.
  // o: up, hold, down (ms), stay (stay out), dir and d (see renderCube3D's lift), done(). A new bump or
  // null stops the one before.
  sc.bump=(set,o={})=>{const L0=sc.lift;if(L0){cancelAnimationFrame(L0.raf);clearTimeout(L0.timer);}
    if(!set){sc.lift=null;draw();return;}
    const up=o.up??420,hold=o.hold??1300,down=o.down??480,L={set,t:0,raf:0,timer:0,dir:o.dir||null,d:o.d};sc.lift=L;
    const end=()=>{if(sc.lift!==L)return;sc.lift=null;draw();if(o.done)o.done();};
    const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(typeof requestAnimationFrame!=='function'||reduce){L.t=1;draw();if(!o.stay)L.timer=setTimeout(end,up+hold);return;}
    const t0=performance.now();
    const step=()=>{if(sc.lift!==L)return;const e=performance.now()-t0;
      if(e>=up&&o.stay){L.t=1;draw();return;}
      if(e>=up+hold+down){end();return;}
      const x=e<up?e/up:e<up+hold?1:1-(e-up-hold)/down,t=0.5-0.5*Math.cos(Math.PI*x);
      if(t!==L.t){L.t=t;draw();}
      if(e>=up&&e<up+hold){L.timer=setTimeout(()=>{L.raf=requestAnimationFrame(step);},up+hold-e);return;}
      L.raf=requestAnimationFrame(step);};
    L.raf=requestAnimationFrame(step);};
  // The drag: across turns the view about the vertical, up and down tilts it.
  let drag=null;
  el.addEventListener('pointerdown',e=>{if(e.button)return;drag={x:e.clientX,y:e.clientY,yaw:sc.view.yaw,pitch:sc.view.pitch,target:e.target,moved:false};try{el.setPointerCapture(e.pointerId);}catch(_){}});
  el.addEventListener('pointermove',e=>{if(!drag)return;if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>5)drag.moved=true;sc.view.yaw=drag.yaw+(e.clientX-drag.x)*0.6;sc.view.pitch=Math.max(-80,Math.min(80,drag.pitch+(e.clientY-drag.y)*0.5));draw();});
  // A click with no drag picks the sticker under it. The target is the one under the press: the
  // capture sends the rest of the events to el.
  el.addEventListener('pointerup',e=>{const dr=drag;drag=null;if(!dr||dr.moved||!sc.onPick)return;
    const m=dr.target&&dr.target.getAttribute&&/(?:^|\s)pk(\d+)/.exec(dr.target.getAttribute('class')||'');if(m)sc.onPick(+m[1]);});
  const end=()=>{drag=null;};el.addEventListener('pointercancel',end);
  el.addEventListener('dblclick',()=>sc.resetView());
  if(sc.keys)SCREEN.active=sc;
  draw();return sc;
}
// The keys go to the active virtual cube while it is on the page and in view, and no field has the focus.
document.addEventListener('keydown',e=>{const sc=SCREEN.active;if(!sc||!sc.keys||!sc.el.isConnected)return;
  if(e.ctrlKey||e.metaKey)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable))return;
  if(sc.el.closest('.hidden,[hidden],.tab:not(.on)'))return;
  // sc.layout: one layout only (the player's Keys window). Option (Alt) is the wide modifier.
  const m=screenKeyMove(e.code,screenKeyShift(e),sc.layout,e.altKey);if(!m)return;
  e.preventDefault();e.stopImmediatePropagation();sc.turn(m);},true);
