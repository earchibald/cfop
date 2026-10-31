// ================= Quest cube lab: the renderer =================
// WebGL 2 with no library: one box mesh for the cubies (and the hands and controllers in VR), one
// quad for the stickers (and the hidden faces' mirrors), three textured quads: the floating panel,
// the rows of buttons and a drill's Solved card. The same code draws the flat
// preview on the page and each eye in a WebXR session: drawScene(proj, view) takes the matrices
// that XRView gives (or that the page builds for the preview).
//
// The cube is drawn as draw.js draws it: the facelets are the cube BEFORE a move, and the cubies of
// the moving layer turn about the move's axis by t of the whole turn. At t=1 the stickers sit where
// the facelets of the cube after the move put them (test/quest.js checks every move), so the swap to
// the next state shows no jump.

const QUEST_BODY=[0.07,0.07,0.08],QUEST_GAP=0.965,QUEST_STICKER=0.84,QUEST_LIFT=0.484;
function questRGB(hex){const n=parseInt(hex.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
const QUEST_RGB=QUEST_HEX.map(questRGB),QUEST_GRAY=[0.22,0.22,0.24];

function questRenderer(gl){
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const prog=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;};
  // Lit flat color: a light from above and in front, and an ambient floor so no face goes black.
  const lit=prog(`#version 300 es
    layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNor;
    uniform mat4 uProj,uView,uModel;out vec3 vNor;
    void main(){vNor=mat3(uModel)*aNor;gl_Position=uProj*uView*uModel*vec4(aPos,1.0);}`,
    `#version 300 es
    precision mediump float;in vec3 vNor;uniform vec3 uColor;uniform float uAlpha,uLit;out vec4 o;
    void main(){vec3 n=normalize(vNor);float l=0.5+0.42*max(dot(n,normalize(vec3(0.35,0.85,0.55))),0.0)+0.12*max(dot(n,normalize(vec3(-0.6,0.2,0.4))),0.0);
      o=vec4(uColor*mix(0.92,l,uLit),uAlpha);}`);
  const tex=prog(`#version 300 es
    layout(location=0) in vec3 aPos;uniform mat4 uProj,uView,uModel;out vec2 vUV;
    void main(){vUV=vec2(aPos.x+0.5,0.5-aPos.y);gl_Position=uProj*uView*uModel*vec4(aPos,1.0);}`,
    `#version 300 es
    precision mediump float;in vec2 vUV;uniform sampler2D uTex;out vec4 o;void main(){o=texture(uTex,vUV);}`);
  const U=(p,n)=>gl.getUniformLocation(p,n);
  const L={proj:U(lit,'uProj'),view:U(lit,'uView'),model:U(lit,'uModel'),color:U(lit,'uColor'),alpha:U(lit,'uAlpha'),lit:U(lit,'uLit')};
  const T={proj:U(tex,'uProj'),view:U(tex,'uView'),model:U(tex,'uModel'),tex:U(tex,'uTex')};
  const mesh=(pos,nor,idx)=>{const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const b=(data,loc)=>{const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);};
    b(pos,0);b(nor,1);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    gl.bindVertexArray(null);return {vao,n:idx.length};};
  // A unit box, -0.5..0.5, four corners per face so each face has its own normal.
  const box=(()=>{const P=[],N=[],I=[];
    for(const g of FACE_GEOM){const b=P.length/3;for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){for(let k=0;k<3;k++){P.push(0.5*(g.n[k]+g.r[k]*u-g.d[k]*v));N.push(g.n[k]);}}
      I.push(b,b+1,b+2,b,b+2,b+3);}
    return mesh(P,N,I);})();
  const quad=mesh([-0.5,-0.5,0,0.5,-0.5,0,0.5,0.5,0,-0.5,0.5,0],[0,0,1,0,0,1,0,0,1,0,0,1],[0,1,2,0,2,3]);
  const texture=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
  const panelTex=texture(),barTex=texture(),toastTex=texture();
  let panelReady=false,barReady=false,toastReady=false;

  // The model matrix of every cubie and sticker for one frame. s: {cube (a Cube or null), anim
  // ({move, t} or null), model (the cube's matrix: place, turn, scale), hidden (the faces whose
  // mirrors show, questHiddenFaces; none when left out)}. An unknown cube shows gray stickers with
  // the centers in color, as the lab does before a cube connects. A sticker on a mirror comes with
  // an alpha: it is drawn see-through, after the rest.
  function cubeParts(s){
    const f=s.cube?s.cube.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);
    let g=null,turn=null;
    if(s.anim&&s.anim.t>0&&s.anim.t<1){g=moveGeom(s.anim.move,3);turn=m4Trs([0,0,0],quatAxis(g.n,g.deg*s.anim.t),1);}
    const moves=p=>!!g&&questMoves(g,p),at=p=>moves(p)?m4Mul(s.model,turn):s.model;
    const mirrors=(s.hidden||[]).map(fi=>({n:FACE_GEOM[fi].n,m:m4Mul(s.model,questMirror(FACE_GEOM[fi].n))}));
    const parts=[],seen=[];
    for(const p of QUEST_CUBIES)parts.push({m:m4Mul(at(p),m4Trs(p,null,QUEST_GAP)),c:QUEST_BODY,box:true});
    for(const st of QUEST_STICKERS){const ci=f[st.idx],c=ci>=0?QUEST_RGB[ci]:QUEST_GRAY,moved=moves(st.cubie);
      const local=m4Basis(st.r,st.up,st.n,v3Add(st.cubie,v3Scale(st.n,QUEST_LIFT)),QUEST_STICKER);
      parts.push({m:m4Mul(at(st.cubie),local),c,box:false});
      // on a mirror while it looks out of that face, fading as it tips away (as draw.js does)
      const n=moved?m4Point(turn,st.n):st.n,onTurn=moved?m4Mul(turn,local):local;
      for(const mr of mirrors){const d=n[0]*mr.n[0]+n[1]*mr.n[1]+n[2]*mr.n[2];if(d<0.02)continue;
        seen.push({m:m4Mul(mr.m,onTurn),c,box:false,alpha:QUEST_MIRROR.alpha*(d>=0.999?1:0.35+0.65*Math.min(1,d))});}
    }
    return parts.concat(seen);
  }
  // The panel's picture: a 2D canvas, drawn again only when its lines change.
  const pc=typeof document!=='undefined'?document.createElement('canvas'):null;
  let panelKey='';
  function panel(lines){
    if(!pc)return;const key=JSON.stringify(lines);if(key===panelKey&&panelReady)return;panelKey=key;
    pc.width=1024;pc.height=400;const x=pc.getContext('2d');
    x.fillStyle='rgba(16,16,20,0.92)';x.beginPath();x.roundRect?x.roundRect(0,0,1024,400,40):x.rect(0,0,1024,400);x.fill();
    x.strokeStyle='rgba(255,255,255,0.15)';x.lineWidth=4;x.stroke();
    x.textBaseline='top';x.fillStyle='#f1f0ea';x.font='600 54px system-ui,sans-serif';x.fillText(lines.head,40,30);
    x.fillStyle=lines.tilt?'#3cb371':'#8f8f97';x.font='500 36px system-ui,sans-serif';x.textAlign='right';x.fillText(lines.tilt?'Tilt on':'Tilt off',984,40);x.textAlign='left';
    x.fillStyle='#ffd21e';x.font='600 46px system-ui,sans-serif';x.fillText(lines.stage||' ',40,104);
    x.font='600 50px ui-monospace,Menlo,monospace';let cx=40;
    const shown=lines.moves.length<lines.count;if(shown){x.fillStyle='#5a5a62';x.fillText('…',cx,176);cx+=50;}
    for(const m of lines.moves){x.fillStyle=m.color;x.fillText(m.m,cx,176);cx+=x.measureText(m.m+' ').width;}
    if(!lines.moves.length){x.fillStyle='#5a5a62';x.fillText('no moves yet',cx,176);}
    x.fillStyle='#8f8f97';x.font='400 34px system-ui,sans-serif';x.fillText(lines.status.slice(0,58),40,256);
    x.fillStyle='#5a5a62';x.font='400 30px system-ui,sans-serif';x.fillText(lines.hint.slice(0,64),40,320);
    gl.bindTexture(gl.TEXTURE_2D,panelTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,pc);panelReady=true;
  }
  // The rows of buttons: one cell per button where questBarLayout puts it, lit while a fingertip is
  // in front of it, bright as it presses. A hold tile is its own color, ringed while it is the hold.
  const bc=typeof document!=='undefined'?document.createElement('canvas'):null;
  let barKey='';
  function bar(buttons,rects){
    if(!bc)return;const key=JSON.stringify(buttons);if(key===barKey&&barReady)return;barKey=key;
    const box=questBarBox(rects),px=1024/(box.x1-box.x0);
    bc.width=1024;bc.height=Math.round((box.y1-box.y0)*px);const x=bc.getContext('2d');x.clearRect(0,0,bc.width,bc.height);
    x.textAlign='center';x.textBaseline='middle';
    const shape=(l,t,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(l,t,w,h,r):x.rect(l,t,w,h);};
    buttons.forEach((b,i)=>{const R=rects[i],l=(R.x-R.w/2-box.x0)*px,t=(box.y1-R.y-R.h/2)*px,w=R.w*px,h=R.h*px;
      if(b.tile){
        shape(l+7,t+7,w-14,h-14,16);x.fillStyle=b.color;x.fill();
        x.strokeStyle=b.lit?'#5b8cff':b.on?'#f1f0ea':b.hover?'rgba(241,240,234,0.7)':'rgba(0,0,0,0.5)';x.lineWidth=b.on||b.lit?10:5;x.stroke();
        x.fillStyle=b.color==='#d8283b'||b.color==='#2c6fdc'?'rgba(255,255,255,0.9)':'rgba(15,15,18,0.85)';x.font='600 22px system-ui,sans-serif';x.fillText(b.label,l+w/2,t+h/2);
        return;}
      x.fillStyle=b.lit?'#5b8cff':b.warn?'rgba(150,40,30,0.95)':b.hover?'rgba(60,64,80,0.95)':b.on?'rgba(28,70,46,0.95)':'rgba(16,16,20,0.92)';
      shape(l+3,t+3,w-6,h-6,22);x.fill();
      x.strokeStyle=b.hover||b.lit?'#f1f0ea':b.warn?'#ff6a1c':b.on?'#3cb371':'rgba(255,255,255,0.18)';x.lineWidth=5;x.stroke();
      x.fillStyle=b.off?'#5a5a62':'#f1f0ea';x.font='600 28px system-ui,sans-serif';
      const words=b.label.split(' ');
      if(words.length>1){x.fillText(words[0],l+w/2,t+h/2-17);x.fillText(words.slice(1).join(' '),l+w/2,t+h/2+19);}else x.fillText(b.label,l+w/2,t+h/2);});
    gl.bindTexture(gl.TEXTURE_2D,barTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bc);barReady=true;
  }
  // A drill's Solved card: the word large, a line under it. Drawn again only when its words change.
  const tc=typeof document!=='undefined'?document.createElement('canvas'):null;
  let toastKey='';
  function toast(lines){
    if(!tc)return;const key=JSON.stringify(lines);if(key===toastKey&&toastReady)return;toastKey=key;
    tc.width=1024;tc.height=384;const x=tc.getContext('2d');x.clearRect(0,0,1024,384);
    x.fillStyle='rgba(22,74,44,0.94)';x.beginPath();x.roundRect?x.roundRect(4,4,1016,376,56):x.rect(4,4,1016,376);x.fill();
    x.strokeStyle='#3cb371';x.lineWidth=8;x.stroke();
    x.textAlign='center';x.textBaseline='middle';x.fillStyle='#f1f0ea';x.font='700 150px system-ui,sans-serif';x.fillText(lines.text,512,160);
    x.fillStyle='rgba(241,240,234,0.8)';x.font='500 48px system-ui,sans-serif';x.fillText(lines.sub.slice(0,40),512,296);
    gl.bindTexture(gl.TEXTURE_2D,toastTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tc);toastReady=true;
  }
  // One eye, or the preview. scene: {cube, anim, model, hidden, panel: {model, lines} or null, bar:
  // {model, buttons, rects} or null, toast: {model, lines: {text, sub}} or null, extras: [{m, c}]}.
  function drawScene(proj,view,scene){
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
    gl.useProgram(lit);gl.uniformMatrix4fv(L.proj,false,proj);gl.uniformMatrix4fv(L.view,false,view);gl.uniform1f(L.alpha,1);gl.uniform1f(L.lit,1);
    const draw=(p)=>{const me=p.box?box:quad;gl.bindVertexArray(me.vao);gl.uniformMatrix4fv(L.model,false,p.m);gl.uniform3fv(L.color,p.c);gl.drawElements(gl.TRIANGLES,me.n,gl.UNSIGNED_SHORT,0);};
    const parts=cubeParts(scene),seen=parts.filter(p=>p.alpha!=null);
    for(const p of parts)if(p.alpha==null)draw(p);
    for(const p of scene.extras||[])draw(Object.assign({box:true},p));
    // the mirrors: seen from behind, see-through, unlit, and with no depth written, so none hides another
    if(seen.length){gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(L.lit,0);
      for(const p of seen){gl.uniform1f(L.alpha,p.alpha);draw(p);}
      gl.depthMask(true);gl.uniform1f(L.lit,1);gl.uniform1f(L.alpha,1);}
    const flat=(model,t)=>{gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); // premultiplied, as the passthrough compositor wants
      gl.useProgram(tex);gl.uniformMatrix4fv(T.proj,false,proj);gl.uniformMatrix4fv(T.view,false,view);gl.uniformMatrix4fv(T.model,false,model);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(T.tex,0);gl.bindVertexArray(quad.vao);gl.drawElements(gl.TRIANGLES,quad.n,gl.UNSIGNED_SHORT,0);};
    if(scene.panel&&pc){panel(scene.panel.lines);flat(scene.panel.model,panelTex);}
    if(scene.bar&&bc){bar(scene.bar.buttons,scene.bar.rects);flat(scene.bar.model,barTex);}
    if(scene.toast&&tc){toast(scene.toast.lines);flat(scene.toast.model,toastTex);}
    gl.bindVertexArray(null);
  }
  return {drawScene,cubeParts};
}
