// ================= Scan recorder (?rec) =================
// Real footage for the scanner tests. With ?rec in the page address, the scanner keeps the last
// frames of each face as it locks (the working frame, 320 px wide, 480 for the 4x4), and Save
// frames writes them as a zip: one PNG per frame and a truth.json with the colors read for each
// face (as the net showed them when the face locked; fix a wrong sticker on the net first, the
// truth follows the pinned color). Unpack the zip under test/fixtures/real/<name>/ and
// test/scan-real.js reads it. Nothing here runs without ?rec. See docs/f2l-site.md.
const SCAN_REC_ON=typeof location!=='undefined'&&/[?&]rec(=|&|$)/.test(location.search),SCAN_REC_KEEP=12;
let scanRec=null;
function scanRecOpen(){
  if(!SCAN_REC_ON)return;
  scanRec={ring:[],faces:{}};
  const b=$('#scanSave');if(!b)return;b.classList.remove('hidden');b.onclick=scanRecSave;
}
function scanRecFrame(img,r){
  if(!scanRec)return;
  scanRec.ring.push({w:img.width,h:img.height,data:new Uint8ClampedArray(img.data),ok:!!r.ok});
  if(scanRec.ring.length>SCAN_REC_KEEP)scanRec.ring.shift();
}
function scanRecLock(id,stickers){
  if(!scanRec)return;
  scanRec.faces[id]={stickers:stickers.slice(),frames:scanRec.ring.filter(f=>f.ok)};scanRec.ring=[];
  const b=$('#scanSave');if(b)b.textContent=`Save frames (${Object.keys(scanRec.faces).length} face${Object.keys(scanRec.faces).length===1?'':'s'})`;
}
// The frame as a PNG, through a canvas.
function scanRecPng(f){
  const cv=document.createElement('canvas');cv.width=f.w;cv.height=f.h;
  cv.getContext('2d').putImageData(new ImageData(f.data,f.w,f.h),0,0);
  return new Promise(res=>cv.toBlob(b=>b.arrayBuffer().then(res),'image/png'));
}
async function scanRecSave(){
  if(!scanRec)return;
  const ids=Object.keys(scanRec.faces);if(!ids.length){scanStatus('No face is read yet. Show a face, then save the frames.');return;}
  const files=[],truth={n:scanN,style:scanStyle(),width:scanWidth(scanN),faces:{}};
  for(const id of ids){
    const f=scanRec.faces[id],name=scanN===3?COLOR_NAMES_E[+id]:'face'+id,frames=[];
    // The truth follows the net: a sticker painted after the lock counts as its painted color.
    const v=scanVoter.faces[+id],stickers=v?v.stickers.slice():f.stickers;
    for(let k=0;k<f.frames.length;k++){const fn=`${name}-${k}.png`;files.push({name:fn,data:new Uint8Array(await scanRecPng(f.frames[k]))});frames.push(fn);}
    truth.faces[name]={stickers,frames};
  }
  files.push({name:'truth.json',data:new TextEncoder().encode(JSON.stringify(truth,null,1))});
  const zip=scanRecZip(files),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));a.download=`scan-frames-${customName('rec').slice(4)}.zip`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  scanStatus(`Saved ${files.length-1} frames of ${ids.length} face${ids.length===1?'':'s'}. Unpack the zip under test/fixtures/real/ and run node test/scan-real.js.`);
}
// A zip with no compression: local headers, the central directory, the end record.
const SCAN_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function scanRecCrc(d){let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=SCAN_CRC[(c^d[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function scanRecZip(files){
  const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  for(const f of files){
    const name=enc.encode(f.name),crc=scanRecCrc(f.data),n=f.data.length;
    const head=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(n),...u32(n),...u16(name.length),...u16(0)]);
    parts.push(head,name,f.data);
    cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(n),...u32(n),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),name);
    off+=head.length+name.length+n;
  }
  const cdLen=cd.reduce((a,x)=>a+x.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdLen),...u32(off),...u16(0)]);
  const all=[...parts,...cd,end],out=new Uint8Array(all.reduce((a,x)=>a+x.length,0));let p=0;
  for(const x of all){out.set(x,p);p+=x.length;}
  return out;
}
