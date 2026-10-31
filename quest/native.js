// ================= Quest cube lab: the page inside the Quest app =================
// In the Quest app (quest/spatial/), the page is a panel in the room, and the app draws the cube
// itself, beside the panel, in passthrough. The page keeps all the logic: the cube's link
// (js/bridge.js over BleBridge.java), the moves, the drill, the stage, the voice. This file sends the
// app what to draw, through window.TwistwrightQuest (QuestPage.kt):
//
//   geometry(json)  once, at the start: the 54 stickers and the 18 face moves, in the page's own
//                   frame (x right, y up, z toward you). The app turns them into its own.
//   frame(json)     each time the picture changes: {f, m, t, q, hidden}. f: the 54 facelets of the
//                   cube before the move in turn ('' before a cube is there: gray, centers in color),
//                   m: that move or '', t: how far it has turned (eased, 0..1), q: the cube's turn
//                   (the tilt or the hold, questOrient), hidden: Hidden faces.
//
// Outside the app (no TwistwrightQuest) this file does nothing. With the app, the page's own 3D
// preview stops: the app's cube is the picture. Pure: questNativeGeometry, questNativeFrame.

function questNativeGeometry(){
  const moves={};
  for(const m of QUEST_FACE_MOVES){const g=moveGeom(m,3);moves[m]={n:g.n,deg:g.deg,layers:g.layers};}
  return {cubies:QUEST_CUBIES,stickers:QUEST_STICKERS.map(s=>({cubie:s.cubie,n:s.n,r:s.r,up:s.up})),moves,
    gap:QUEST_GAP,sticker:QUEST_STICKER,lift:QUEST_LIFT,body:QUEST_BODY,colors:QUEST_RGB,gray:QUEST_GRAY};
}
// What the app draws now, from the page's state (questState()).
function questNativeFrame(s){
  const a=s.anim,c=a?a.from:s.shown;
  return {f:c?c.toFacelets().join(''):'',m:a&&a.e>0&&a.e<1?a.move:'',t:a?Math.round(a.e*1000)/1000:0,
    q:questOrient().map(v=>Math.round(v*1e5)/1e5),hidden:!!s.hidden};
}

(function(){
  const Q=typeof window!=='undefined'&&window.TwistwrightQuest;
  if(!Q||typeof Q.frame!=='function')return;
  const s=questState();
  document.body.classList.add('native');
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
