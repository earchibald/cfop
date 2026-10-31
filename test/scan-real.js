// Real footage through the scanner: every folder under test/fixtures/real holds the frames of
// each face of one recording (PNG, the working frame as the dialog grabs it) and a truth.json
// (see the README there). Each frame goes through readFace, with the reference set left to Auto
// and with each set pinned; the frames of each face go through the voter; the locked faces go
// through stage 5. Tune the references and the gain clamp against these frames, not against the
// synthetic renderer. With no recording here the test only says so.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js','js/scan.js');
const T=run(`({readFace,rotateFace,makeVoter,voteFrame,assembleScan,assembleFree,COLOR_NAMES_E})`);
const BAR=+(process.env.SCAN_REAL_BAR||0.5); // the share of a face's frames that must read right

// A PNG as {width, height, data: RGBA}: 8-bit gray, RGB, RGBA or gray+alpha, not interlaced.
function readPng(buf){
  assert.strictEqual(buf.toString('hex',0,8),'89504e470d0a1a0a','not a PNG');
  let p=8,w=0,h=0,ct=0,bd=0,il=0;const idat=[];
  while(p<buf.length){const len=buf.readUInt32BE(p),type=buf.toString('ascii',p+4,p+8),data=buf.subarray(p+8,p+8+len);p+=12+len;
    if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);bd=data[8];ct=data[9];il=data[12];}
    else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;}
  assert.ok(bd===8&&!il&&[0,2,4,6].includes(ct),`PNG not handled: ${bd} bits, color type ${ct}, interlace ${il}`);
  const ch={0:1,2:3,4:2,6:4}[ct],stride=w*ch,raw=zlib.inflateSync(Buffer.concat(idat)),out=new Uint8ClampedArray(w*h*4);
  let prev=new Uint8Array(stride),q=0;
  for(let y=0;y<h;y++){
    const f=raw[q++],row=new Uint8Array(raw.subarray(q,q+stride));q+=stride;
    for(let i=0;i<stride;i++){const a=i>=ch?row[i-ch]:0,b=prev[i],c=i>=ch?prev[i-ch]:0;
      if(f===1)row[i]+=a;else if(f===2)row[i]+=b;else if(f===3)row[i]+=(a+b)>>1;
      else if(f===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);row[i]+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}}
    for(let x=0;x<w;x++){const j=4*(y*w+x),s=x*ch;
      if(ch>=3){out[j]=row[s];out[j+1]=row[s+1];out[j+2]=row[s+2];out[j+3]=ch===4?row[s+3]:255;}
      else{out[j]=out[j+1]=out[j+2]=row[s];out[j+3]=ch===2?row[s+1]:255;}}
    prev=row;}
  return {width:w,height:h,data:out};
}
const same=(truth,cols)=>[0,1,2,3].some(k=>T.rotateFace(truth,k).join()===cols.join());

const root=path.join(__dirname,'fixtures','real');
const sets=fs.existsSync(root)?fs.readdirSync(root).filter(d=>fs.existsSync(path.join(root,d,'truth.json'))):[];
if(!sets.length){console.log('scan-real: no recording under test/fixtures/real (see the README there); nothing to check');process.exit(0);}
let bad=[];
for(const set of sets){
  const dir=path.join(root,set),truth=JSON.parse(fs.readFileSync(path.join(dir,'truth.json'),'utf8')),n=truth.n||3;
  const names=Object.keys(truth.faces);console.log(`scan-real: ${set}: ${n}x${n}, ${names.length} faces`);
  const locked=[];
  for(const name of names){
    const face=truth.faces[name],frames=face.frames.map(f=>readPng(fs.readFileSync(path.join(dir,f))));
    const tally={auto:0,stickers:0,stickerless:0,lattice:0},picks={};
    const v=T.makeVoter({n});let lock=null;
    for(const img of frames){
      for(const style of ['auto','stickers','stickerless']){
        const r=T.readFace(img,style==='auto'?{n}:{n,style});
        if(style==='auto'){if(r.ok){tally.lattice++;picks[r.style]=(picks[r.style]||0)+1;const e=T.voteFrame(v,r,n===3?undefined:0);if(e.event==='locked')lock=v.faces[e.center];}}
        if(r.ok&&same(face.stickers,r.colors))tally[style]++;
      }
    }
    const k=frames.length,rate=tally.auto/k;
    console.log(`  ${name}: ${k} frames; lattice ${tally.lattice}; right auto ${tally.auto}, stickers ${tally.stickers}, stickerless ${tally.stickerless}; auto picks ${JSON.stringify(picks)}; voter ${lock?(same(face.stickers,lock.stickers)?'locked right':'locked WRONG'):'no lock'}`);
    if(rate<BAR)bad.push(`${set}/${name}: ${tally.auto}/${k} frames read right`);
    if(lock)locked.push(lock);
  }
  if(locked.length===6){
    const r=n===3?T.assembleScan(locked):T.assembleFree(locked,n);
    console.log(`  stage 5: ${r.ok?'the faces fit together'+(r.changes.length?'; '+r.changes.join(' '):''):'no fit: '+r.errors.join(' ')}`);
    if(!r.ok)bad.push(`${set}: the six locked faces do not fit together`);
  }
}
assert.deepStrictEqual(bad,[],'real footage below the bar:\n'+bad.join('\n'));
console.log('scan-real: ok');
