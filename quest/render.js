// ================= Quest cube lab: the renderer =================
// WebGL 2 with no library: one box mesh for the cubies (and the hands and controllers in VR), one
// quad for the stickers, one textured quad for the floating panel. The same code draws the flat
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
    precision mediump float;in vec3 vNor;uniform vec3 uColor;uniform float uAlpha;out vec4 o;
    void main(){vec3 n=normalize(vNor);float l=0.5+0.42*max(dot(n,normalize(vec3(0.35,0.85,0.55))),0.0)+0.12*max(dot(n,normalize(vec3(-0.6,0.2,0.4))),0.0);
      o=vec4(uColor*l,uAlpha);}`);
  const tex=prog(`#version 300 es
    layout(location=0) in vec3 aPos;uniform mat4 uProj,uView,uModel;out vec2 vUV;
    void main(){vUV=vec2(aPos.x+0.5,0.5-aPos.y);gl_Position=uProj*uView*uModel*vec4(aPos,1.0);}`,
    `#version 300 es
    precision mediump float;in vec2 vUV;uniform sampler2D uTex;out vec4 o;void main(){o=texture(uTex,vUV);}`);
  const U=(p,n)=>gl.getUniformLocation(p,n);
  const L={proj:U(lit,'uProj'),view:U(lit,'uView'),model:U(lit,'uModel'),color:U(lit,'uColor'),alpha:U(lit,'uAlpha')};
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
  const panelTex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,panelTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let panelReady=false;

  // The model matrix of every cubie and sticker for one frame. s: {cube (a Cube or null), anim
  // ({move, t} or null), model (the cube's matrix: place, turn, scale)}. An unknown cube shows
  // gray stickers with the centers in color, as the lab does before a cube connects.
  function cubeParts(s){
    const f=s.cube?s.cube.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);
    let g=null,turn=null;
    if(s.anim&&s.anim.t>0&&s.anim.t<1){g=moveGeom(s.anim.move,3);turn=m4Trs([0,0,0],quatAxis(g.n,g.deg*s.anim.t),1);}
    const at=p=>g&&questMoves(g,p)?m4Mul(s.model,turn):s.model;
    const parts=[];
    for(const p of QUEST_CUBIES)parts.push({m:m4Mul(at(p),m4Trs(p,null,QUEST_GAP)),c:QUEST_BODY,box:true});
    for(const st of QUEST_STICKERS){const ci=f[st.idx];
      parts.push({m:m4Mul(at(st.cubie),m4Basis(st.r,st.up,st.n,v3Add(st.cubie,v3Scale(st.n,QUEST_LIFT)),QUEST_STICKER)),c:ci>=0?QUEST_RGB[ci]:QUEST_GRAY,box:false});}
    return parts;
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
  // One eye, or the preview. scene: {cube, anim, model, panel: {model, lines} or null, extras: [{m, c}]}.
  function drawScene(proj,view,scene){
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.disable(gl.BLEND);
    gl.useProgram(lit);gl.uniformMatrix4fv(L.proj,false,proj);gl.uniformMatrix4fv(L.view,false,view);gl.uniform1f(L.alpha,1);
    const draw=(p)=>{const me=p.box?box:quad;gl.bindVertexArray(me.vao);gl.uniformMatrix4fv(L.model,false,p.m);gl.uniform3fv(L.color,p.c);gl.drawElements(gl.TRIANGLES,me.n,gl.UNSIGNED_SHORT,0);};
    for(const p of cubeParts(scene))draw(p);
    for(const p of scene.extras||[])draw(Object.assign({box:true},p));
    if(scene.panel&&pc){panel(scene.panel.lines);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); // premultiplied, as the passthrough compositor wants
      gl.useProgram(tex);gl.uniformMatrix4fv(T.proj,false,proj);gl.uniformMatrix4fv(T.view,false,view);gl.uniformMatrix4fv(T.model,false,scene.panel.model);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,panelTex);gl.uniform1i(T.tex,0);gl.bindVertexArray(quad.vao);gl.drawElements(gl.TRIANGLES,quad.n,gl.UNSIGNED_SHORT,0);}
    gl.bindVertexArray(null);
  }
  return {drawScene,cubeParts};
}
