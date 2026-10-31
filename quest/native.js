// ================= Quest cube lab: the page inside the Quest app =================
// In the Quest app (quest/spatial/), the page is a panel in the room, and the app draws the cube
// itself, with the session's rows of buttons under it (questBarButtons, as the app has them: no
// Exit, Bring here); each can be carried by itself. The page keeps all the logic: the cube's link
// (js/bridge.js over BleBridge.java), the moves, the drill, the stage, the voice. This file sends the
// app what to draw, through window.TwistwrightQuest (QuestPage.kt):
//
//   geometry(json)  once, at the start: the 54 stickers and the 18 face moves, in the page's own
//                   frame (x right, y up, z toward you), and the mirrors of the hidden faces
//                   (questMirror: dist, flat, alpha, reach). The app turns them into its own.
//   frame(json)     each time the picture or a button changes: {f, m, t, q, hidden, edge, panel,
//                   bar}. f: the 54 facelets of the cube before the move in turn ('' before a cube
//                   is there: gray, centers in color), m: that move or '', t: how far it has turned
//                   (eased, 0..1), q: the cube's turn (the tilt or the hold, questOrient), hidden:
//                   Hidden faces (the app finds the faces turned away from the head), edge: the
//                   cube's edge in meters (Smaller, Larger), panel: this panel shows, bar: the
//                   buttons ({id, label, on, off, tile, color, row, group}).
//   here()          Bring here: the cube and the panel in front of the user.
//
// A press on the app's buttons comes back as questNativeDo(id), as a poke in the session
// (questBarDo).
//
// Outside the app (no TwistwrightQuest) this file does nothing. With the app, the page's own 3D
// preview stops: the app's cube is the picture. Pure: questNativeGeometry, questNativeFrame.
// qs.native: {edge, panel}, as qs.xr has them in a session.

function questNativeGeometry(){
  const moves={};
  for(const m of QUEST_FACE_MOVES){const g=moveGeom(m,3);moves[m]={n:g.n,deg:g.deg,layers:g.layers};}
  return {cubies:QUEST_CUBIES,stickers:QUEST_STICKERS.map(s=>({cubie:s.cubie,n:s.n,r:s.r,up:s.up})),moves,
    gap:QUEST_GAP,sticker:QUEST_STICKER,lift:QUEST_LIFT,body:QUEST_BODY,colors:QUEST_RGB,gray:QUEST_GRAY,
    mirror:{dist:QUEST_MIRROR.dist,flat:QUEST_MIRROR.flat,alpha:QUEST_MIRROR.alpha,reach:questMirrorReach()}};
}
// What the app draws now, from the page's state (questState()).
function questNativeFrame(s){
  const a=s.anim,c=a?a.from:s.shown,n=s.native||{edge:0.12,panel:true};
  return {f:c?c.toFacelets().join(''):'',m:a&&a.e>0&&a.e<1?a.move:'',t:a?Math.round(a.e*1000)/1000:0,
    q:questOrient().map(v=>Math.round(v*1e5)/1e5),hidden:!!s.hidden,edge:Math.round(n.edge*1e4)/1e4,panel:n.panel!==false,
    bar:questBarState().map(b=>({id:b.id,label:b.label,on:!!b.on,off:!!b.off,tile:!!b.tile,color:b.color||'',row:b.row||0,group:!!b.group}))};
}
// A press on one of the app's buttons.
function questNativeDo(id){
  const Q=typeof window!=='undefined'&&window.TwistwrightQuest;
  if(id==='here'){if(Q&&typeof Q.here==='function')try{Q.here();}catch(e){}return;}
  questBarDo(String(id));
}

(function(){
  const Q=typeof window!=='undefined'&&window.TwistwrightQuest;
  if(!Q||typeof Q.frame!=='function')return;
  const s=questState();
  document.body.classList.add('native');
  s.native={edge:questGet('cw:questEdge',0.12),panel:true};
  const here=document.getElementById('here');if(here)here.onclick=()=>questNativeDo('here');
  // the app draws the cube: the page's preview stops, and this loop runs the clock
  if(s.flatRaf)cancelAnimationFrame(s.flatRaf);s.flatRaf=0;s.r=null;
  try{Q.geometry(JSON.stringify(questNativeGeometry()));}catch(e){}
  let last='';
  const loop=now=>{
    questTick(now);
    const key=JSON.stringify(questNativeFrame(s));
    if(key!==last){last=key;try{Q.frame(key);}catch(e){}}
    requestAnimationFrame(loop);};
  requestAnimationFrame(loop);
})();
