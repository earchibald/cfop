// Synthetic webcam frames of one cube face, for the scanner tests.
// render(truth) draws nine stickers with random tilt, perspective, scale, offset,
// light tint, shading, glare and noise. Pure arrays; no canvas needed.
// style 'stickerless' draws a glossy stickerless cube: dark grooves with a bright bevel, rounded
// tiles, soft reflection stripes, brighter plastics, and fingers over the corners.
let seed=+(process.env.SEED||777);
const reseed=s=>{seed=s;};const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;}; // mulberry32
const U=(a,b)=>a+(b-a)*rnd();
const gauss=()=>{let s=0;for(let i=0;i<6;i++)s+=rnd();return (s-3)*1.41;};
const toLin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const toSrgb=l=>{l=Math.max(0,Math.min(1,l));return 255*(l<=0.0031308?12.92*l:1.055*Math.pow(l,1/2.4)-0.055);};
// Sticker colours as a webcam might see them: close to, but not the same as, the references.
const PLASTIC=[[236,236,230],[233,60,52],[40,200,72],[236,230,40],[255,122,30],[22,110,230]];
const PAINT=[[238,238,232],[196,24,44],[14,158,84],[248,212,24],[252,104,22],[16,72,178]];

function render(truth,W=320,H=240,noCube=false,style='stickers'){
  const sl=style==='stickerless',X=JSON.parse(process.env.SYNTH_OFF||'{}');
  const s=U(20,52),th=U(0,2*Math.PI),sh=U(-0.08,0.08),asp=U(0.85,1.15);
  const a=s*Math.cos(th),b=-s*Math.sin(th)*asp+sh*s,c=s*Math.sin(th),d=s*Math.cos(th)*asp;
  const p=U(-0.05,0.05),q=U(-0.05,0.05);
  const ext=1.6*s*1.5,tx=U(ext,W-ext),ty=U(Math.min(ext,H/2),Math.max(H-ext,H/2));
  // Inverse of (fx,fy) -> ((a fx + b fy + tx)/w, (c fx + d fy + ty)/w), w = 1 + p fx + q fy.
  const Hm=[[a,b,tx],[c,d,ty],[p,q,1]];const Hi=inv3(Hm);
  const tv=sl?0.1:0.2,tint=[U(1-tv,1+tv),U(1-tv,1+tv),U(1-tv,1+tv)],bright=U(0.55,1.15),grad=[U(-0.25,0.25)/W,U(-0.25,0.25)/H];
  const noise=X.noise?U(1,3):U(2,8),bg=[U(60,200),U(60,200),U(60,200)],bg2=[U(60,200),U(60,200),U(60,200)];
  const shapes=[];for(let k=0;k<4;k++)shapes.push({x:U(0,W),y:U(0,H),r:U(10,45),col:[U(0,255),U(0,255),U(0,255)]});
  const paint=truth.map(t=>(sl?PLASTIC:PAINT)[t].map(v=>v+U(-10,10)));
  // Reflection stripes across some tiles, and fingers over one or two face corners.
  const stripes=sl&&!X.stripes?truth.map(()=>rnd()<0.4?{y:U(0.2,0.8),w:U(0.12,0.3)}:null):[];
  const fingers=[];if(sl&&!X.fingers)for(let k=0;k<1+Math.floor(U(0,2));k++){const cx=rnd()<0.5?-1:1,cy=rnd()<0.5?-1:1;fingers.push({x:cx*U(1.3,1.7),y:cy*U(1.1,1.7),rx:U(0.35,0.6),ry:U(0.4,0.7)});}
  const glare=rnd()<0.35?{cell:Math.floor(U(0,9)),x:U(0.3,0.7),y:U(0.3,0.7),r:U(0.12,0.22)}:null;
  const data=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const acc=[0,0,0];
    for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){
      const X=x+0.25+0.5*sx,Y=y+0.25+0.5*sy;
      const w=Hi[2][0]*X+Hi[2][1]*Y+Hi[2][2],fx=(Hi[0][0]*X+Hi[0][1]*Y+Hi[0][2])/w,fy=(Hi[1][0]*X+Hi[1][1]*Y+Hi[1][2])/w;
      let col;
      const edge=sl?1.515:1.58;
      if(!noCube&&Math.abs(fx)<=edge&&Math.abs(fy)<=edge){
        col=sl?[70,62,58]:[22,22,24]; // a stickerless groove reads as a shadow dip at 320 px
        const gx=fx+1.5,gy=fy+1.5,ci=Math.floor(gx),cj=Math.floor(gy);
        if(ci>=0&&ci<3&&cj>=0&&cj<3){
          const lx=gx-ci,ly=gy-cj,m=sl?0.035:0.08,r=sl?0.2:0.14;
          const dx=Math.max(m+r-lx,0,lx-(1-m-r)),dy=Math.max(m+r-ly,0,ly-(1-m-r));
          if(lx>m&&lx<1-m&&ly>m&&ly<1-m&&dx*dx+dy*dy<=r*r){
            const k=cj*3+ci;col=paint[k];
            if(glare&&glare.cell===k&&(lx-glare.x)**2+(ly-glare.y)**2<glare.r**2)col=[255,255,250];
            const st=stripes[k];if(st){const f=Math.max(0,1-Math.abs(ly-st.y)/st.w);col=col.map(v=>v+0.4*f*(255-v));}
            // A bright bevel just inside the groove, as on moulded tiles.
            if(sl&&Math.min(lx-m,1-m-lx,ly-m,1-m-ly)<0.03)col=col.map(v=>Math.min(255,v*1.12));
          }
        }
        for(const fg of fingers)if(((fx-fg.x)/fg.rx)**2+((fy-fg.y)/fg.ry)**2<1)col=[226,176,150];
      }else{
        const t=x/W;col=bg.map((v,i)=>v*(1-t)+bg2[i]*t);
        for(const sp of shapes)if((x-sp.x)**2+(y-sp.y)**2<sp.r**2)col=sp.col;
      }
      const shade=bright*(1+grad[0]*(x-W/2)+grad[1]*(y-H/2));
      for(let i=0;i<3;i++)acc[i]+=toLin(col[i])*tint[i]*shade;
    }
    const j=4*(y*W+x);for(let i=0;i<3;i++)data[j+i]=toSrgb(acc[i]/4)+noise*gauss();data[j+3]=255;
  }
  // True cell centres in frame pixels, reading order.
  const centres=[];for(let j=0;j<3;j++)for(let i=0;i<3;i++){const fx=i-1,fy=j-1,w=p*fx+q*fy+1;centres.push({x:(a*fx+b*fy+tx)/w,y:(c*fx+d*fy+ty)/w});}
  return {width:W,height:H,data,centres,cell:s};
}
function inv3(m){
  const [a,b,c]=m[0],[d,e,f]=m[1],[g,h,i]=m[2];const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;
  return [[A/det,-(b*i-c*h)/det,(b*f-c*e)/det],[B/det,(a*i-c*g)/det,-(a*f-c*d)/det],[C/det,-(a*h-b*g)/det,(a*e-b*d)/det]];
}

module.exports={render,rnd,U,reseed};
