#!/usr/bin/env node
// Write the macOS app icon, mac/AppIcon.icon, an Icon Composer document.
//
//   node scripts/mac-icon.js
//
// The icon is the mark of the top bar: the player cube, solved, half way through R, drawn by
// cubePolys in js/draw.js (see docs/design-language.md). Dark mode shows white up and red right on
// the black desk. Light mode shows yellow up and orange right on the GAN desk. The colors are the
// tokens of css/app.css, read from the file, so the icon follows the page.
//
// Two layer groups: the cube with the R layer out, and the R layer, half turned. Each group gets
// its own Liquid Glass edge and shadow, so the turned layer stands off the cube. mac/build.sh
// compiles the document with actool: Assets.car for macOS 26 and later (light, dark, tinted and
// clear), and AppIcon.icns for older systems. Open the document in Icon Composer to see it.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const run=require('../test/vm-load')('js/engine.js','js/draw.js');
const OUT=path.join(ROOT,'mac','AppIcon.icon');

// The tokens of each theme, from css/app.css: the :root block is light, [data-theme="dark"] is dark.
const css=fs.readFileSync(path.join(ROOT,'css','app.css'),'utf8');
const block=sel=>{const i=css.indexOf(sel);if(i<0)throw new Error('no '+sel+' in css/app.css');return css.slice(i,css.indexOf('}',i));};
const tokens=text=>{const t={};for(const m of text.matchAll(/--([\w-]+):([^;]+);/g))t[m[1]]=m[2].trim();
  const val=k=>{const v=t[k];if(v==null)throw new Error('no token --'+k);const r=v.match(/^var\(--([\w-]+)\)$/);return r?val(r[1]):v;};return val;};
const THEMES={light:tokens(block(':root{')),dark:tokens(block(':root[data-theme="dark"]{'))};

// The icon canvas is 1024 points. The cube fills about 64% of its height, as the glyph of a
// macOS 26 icon does, and sits a little above the middle, where the eye puts the center.
const CANVAS=1024,HEIGHT=650,LIFT=10;
const COLOR_VARS=['W','R','G','Y','O','B'];
// Draw the mark with one theme's colors. The vm runs draw.js; the colors come in as a function.
const runWith=(theme)=>{const tk=THEMES[theme];
  const color=ci=>tk(ci===0?'mk-top':ci===1?'mk-side':ci===3?'mk-bottom':'sticker-'+(COLOR_VARS[ci]||'X'));
  const polys=run(`(o=>cubePolys(new Cube().toFacelets(),{move:'R',t:0.5,scale:10,cx:0,cy:0,body:o.body,color:ci=>o.color(ci),n:3}))`)({body:tk('mk-body'),color});
  return JSON.parse(JSON.stringify(polys));};

// The R layer: its stickers are those on the right column of U, F, D and B, and all of R.
// A box face of plastic belongs with the stickers that follow it. A face with no stickers is a
// cut face inside the cube; at this camera only the cube's own cut face (toward R) shows.
const R_LAYER=new Set();
for(const f of [0,2,3])for(const r of [0,1,2])R_LAYER.add(9*f+3*r+2);
for(let p=0;p<9;p++)R_LAYER.add(9+p);
for(const r of [0,1,2])R_LAYER.add(45+3*r);
function split(polys){const part=new Array(polys.length);
  for(let i=0;i<polys.length;i++)if(polys[i].stroke)part[i]=R_LAYER.has(polys[i].idx)?'layer':'cube';
  for(let i=0;i<polys.length;i++)if(!polys[i].stroke)part[i]=polys[i+1]&&polys[i+1].stroke?part[i+1]:'cube';
  const order=[];for(const p of part)if(order[order.length-1]!==p)order.push(p);
  if(order.length!==2)throw new Error('the cube and the R layer do not draw as two runs: '+order.join(' '));
  return {back:order[0],polys:{cube:polys.filter((_,i)=>part[i]==='cube'),layer:polys.filter((_,i)=>part[i]==='layer')}};}

// One transform for every layer and both themes, so the parts line up.
const all=runWith('light');const xs=all.flatMap(p=>p.pts.map(q=>q[0])),ys=all.flatMap(p=>p.pts.map(q=>q[1]));
const k=HEIGHT/(Math.max(...ys)-Math.min(...ys));
const ox=CANVAS/2-k*(Math.min(...xs)+Math.max(...xs))/2,oy=CANVAS/2-LIFT-k*(Math.min(...ys)+Math.max(...ys))/2;
const f2=v=>v.toFixed(2);
function svg(polys){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">\n`+
    polys.map(p=>`<polygon points="${p.pts.map(q=>f2(ox+k*q[0])+','+f2(oy+k*q[1])).join(' ')}" fill="${p.fill}"`+
      (p.stroke?` stroke="${p.stroke}" stroke-width="${f2(0.6*k)}" stroke-linejoin="round"`:` stroke="${p.fill}" stroke-width="${f2(0.3*k)}" stroke-linejoin="round"`)+'/>').join('\n')+'\n</svg>\n';}

// Icon Composer colors: "srgb:r,g,b,a" with each part 0 to 1.
const srgb=hex=>{const h=hex.replace('#','');const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);return 'srgb:'+[...c,1].map(v=>v.toFixed(5)).join(',');};
// The desk behind the cube: light gray for the GAN theme, near black for the black cube.
const DESK={light:[THEMES.light('panel'),THEMES.light('cube-bg')],dark:[THEMES.dark('panel3'),THEMES.dark('bg')]};
const gradient=([top,bottom])=>({'linear-gradient':[srgb(top),srgb(bottom)],orientation:{start:{x:0.5,y:0},stop:{x:0.5,y:0.7}}});

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(path.join(OUT,'Assets'),{recursive:true});
let back=null;
for(const theme of ['light','dark']){const s=split(runWith(theme));back=back||s.back;
  if(s.back!==back)throw new Error('the two themes draw the parts in another order');
  for(const part of ['cube','layer'])fs.writeFileSync(path.join(OUT,'Assets',`${part}-${theme}.svg`),svg(s.polys[part]));}
const layer=part=>({name:part==='cube'?'Cube':'R layer',
  'image-name-specializations':[{value:`${part}-light.svg`},{appearance:'dark',value:`${part}-dark.svg`}]});
const group=part=>({name:part==='cube'?'Cube':'R layer',layers:[layer(part)],
  shadow:{kind:'neutral',opacity:0.5},translucency:{enabled:false,value:0.5},specular:true});
// Icon Composer lists groups front first.
const front=back==='cube'?'layer':'cube';
const doc={
  fill:gradient(DESK.light),
  'fill-specializations':[{value:gradient(DESK.light)},{appearance:'dark',value:gradient(DESK.dark)}],
  groups:[group(front),group(back)],
  'supported-platforms':{squares:['macOS']}};
fs.writeFileSync(path.join(OUT,'icon.json'),JSON.stringify(doc,null,2)+'\n');
console.log(`Wrote ${path.relative(ROOT,OUT)}: the R layer draws ${front==='layer'?'in front of':'behind'} the cube`);
