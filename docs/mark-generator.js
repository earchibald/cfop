// A cube, green front, white up, red right. The top layer is turned half a U (45 degrees).
// Orthographic camera: yaw about y, then pitch (elevation) tilting the top toward the viewer.
function mark(opts){
  const {pitch=18,yaw=0,turn=-45,gap=0.14,body='var(--sticker-line)',colours={}}=opts;
  const rad=d=>d*Math.PI/180;
  const rotY=(p,t)=>[p[0]*Math.cos(t)+p[2]*Math.sin(t),p[1],-p[0]*Math.sin(t)+p[2]*Math.cos(t)];
  const rotX=(p,t)=>[p[0],p[1]*Math.cos(t)-p[2]*Math.sin(t),p[1]*Math.sin(t)+p[2]*Math.cos(t)];
  const view=p=>rotX(rotY(p,rad(yaw)),rad(pitch));
  const faces=[ // normal, two tangents, sticker colour
    {n:[0,0,1],u:[1,0,0],v:[0,1,0],c:'G'},{n:[1,0,0],u:[0,0,-1],v:[0,1,0],c:'R'},{n:[0,1,0],u:[1,0,0],v:[0,0,-1],c:'W'},
    {n:[-1,0,0],u:[0,0,1],v:[0,1,0],c:'O'},{n:[0,0,-1],u:[-1,0,0],v:[0,1,0],c:'B'},{n:[0,-1,0],u:[1,0,0],v:[0,0,1],c:'Y'}];
  const polys=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    const t=y===1?rad(turn):0; // the top layer is turned
    for(const f of faces){
      const outer=(f.n[0]&&f.n[0]===x)||(f.n[1]&&f.n[1]===y)||(f.n[2]&&f.n[2]===z);
      const quad=(h)=>[[-h,-h],[h,-h],[h,h],[-h,h]].map(([a,b])=>{
        const p=[x+f.n[0]*0.5+f.u[0]*a+f.v[0]*b, y+f.n[1]*0.5+f.u[1]*a+f.v[1]*b, z+f.n[2]*0.5+f.u[2]*a+f.v[2]*b];
        return view(rotY(p,t));});
      const n=view(rotY(f.n,t));if(n[2]<=0.001)continue; // back face
      const bq=quad(0.5);const depth=bq.reduce((s,p)=>s+p[2],0)/4;
      polys.push({pts:bq,depth,fill:body});
      if(outer){const sq=quad(0.5-gap);polys.push({pts:sq,depth:depth+0.01,fill:colours[f.c]||`var(--sticker-${f.c})`,sticker:true});}
    }
  }
  polys.sort((a,b)=>a.depth-b.depth);
  const xs=polys.flatMap(p=>p.pts.map(q=>q[0])),ys=polys.flatMap(p=>p.pts.map(q=>-q[1]));
  const minx=Math.min(...xs)-0.05,maxx=Math.max(...xs)+0.05,miny=Math.min(...ys)-0.05,maxy=Math.max(...ys)+0.05;
  const S=10;const f=v=>(v*S).toFixed(2);
  let out=`<svg class="mark" viewBox="${f(minx)} ${f(miny)} ${f(maxx-minx)} ${f(maxy-miny)}" aria-hidden="true">`;
  for(const p of polys){const pts=p.pts.map(q=>`${f(q[0])},${f(-q[1])}`).join(' ');
    out+=`<polygon points="${pts}" fill="${p.fill}"${p.sticker?` stroke="${p.fill}" stroke-width="0.6" stroke-linejoin="round"`:''}/>`;}
  return out+'</svg>';
}
module.exports=mark;
