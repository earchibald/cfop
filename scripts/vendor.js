#!/usr/bin/env node
// Fetch the libraries the page loads at run time into vendor/, which git ignores.
//
//   node scripts/vendor.js              fetch only when vendor/ does not hold the pinned versions
//   node scripts/vendor.js --force      fetch again (NOCACHE=1 does the same)
//   node scripts/vendor.js --out DIR    write to DIR, not vendor/
//   node scripts/vendor.js --pkg FILE   read the pins from FILE, not package.json
//
// The pins are the "vendor" field of package.json: a name, its version and the integrity that npm
// gives for the tarball. Each tarball is checked against its integrity before it is used.
// The files are as published, with one change: a bare import ("cubing/alg", "random-uint-below")
// becomes a relative path. A search worker does not see an import map, so the paths must work alone.
// A file that needs a package not fetched (three.js, for the cubing.js 3D player) is left out, and so
// is every file that imports it statically. A dynamic import of a file left out fails only if it runs.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');

const ROOT=path.join(__dirname,'..');
// Raise FORMAT when the files this script writes change, so every cache fills again.
const FORMAT=2;
// What to take from each package: the folder inside the tarball, the file a bare import names,
// the files to keep beside the code, and a license to fetch when the package has none.
const LAYOUT={
  'cubing':{dir:'package/dist/lib/cubing',entry:sub=>sub+'/index.js',
    license:v=>`https://raw.githubusercontent.com/cubing/cubing.js/v${v}/LICENSE-MPL.md`},
  'random-uint-below':{dir:'package/dist/esm',entry:()=>'index.js',keep:['package/LICENSE.md']},
};

function args(){
  const a=process.argv.slice(2);
  const o={force:!!process.env.NOCACHE&&process.env.NOCACHE!=='0',out:path.join(ROOT,'vendor'),pkg:path.join(ROOT,'package.json')};
  for(let i=0;i<a.length;i++){
    if(a[i]==='--force')o.force=true;
    else if(a[i]==='--out')o.out=path.resolve(a[++i]);
    else if(a[i]==='--pkg')o.pkg=path.resolve(a[++i]);
    else{console.error('unknown option '+a[i]);process.exit(2);}
  }
  return o;
}

async function get(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
function checkIntegrity(buf,integrity,name){
  const i=integrity.indexOf('-'),alg=integrity.slice(0,i),want=integrity.slice(i+1);
  if(crypto.createHash(alg).update(buf).digest('base64')!==want)throw new Error(`${name}: the tarball does not match its integrity ${integrity}`);
}
// The regular files of a .tgz as a map from path to contents (ustar, with the GNU and pax long names npm can write).
function untar(tgz){
  const b=zlib.gunzipSync(tgz),out=new Map();let p=0,longName=null;
  const str=(o,n)=>b.toString('utf8',o,o+n).replace(/\0.*$/s,'');
  while(p+512<=b.length&&b[p]){
    let name=str(p,100);const prefix=str(p+345,155),size=parseInt(str(p+124,12).trim()||'0',8),type=String.fromCharCode(b[p+156]||48);
    if(prefix)name=prefix+'/'+name;
    const body=b.subarray(p+512,p+512+size);p+=512+Math.ceil(size/512)*512;
    if(type==='L'){longName=body.toString('utf8').replace(/\0.*$/s,'');continue;}
    if(type==='x'){const m=/\d+ path=([^\n]*)\n/.exec(body.toString('utf8'));if(m)longName=m[1];continue;}
    if(longName){name=longName;longName=null;}
    if(type==='0'||type==='\0')out.set(name,Buffer.from(body));
  }
  return out;
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
// The relative path from one file to another, as an import wants it.
function rel(from,to){const r=path.relative(path.dirname(from),to).split(path.sep).join('/');return r.startsWith('.')?r:'./'+r;}
// Static imports: `from "x"` and `import "x"`. Dynamic ones: `import("x")`.
const STATIC=/(\bfrom\s*|\bimport\s+)(["'])([^"']+)\2/g,DYNAMIC=/(\bimport\s*\(\s*)(["'])([^"']+)\2/g;
const bare=s=>!s.startsWith('.')&&!s.startsWith('/');

async function main(){
  const o=args();
  const pins=JSON.parse(fs.readFileSync(o.pkg,'utf8')).vendor;
  if(!pins){console.log('vendor: no "vendor" field in '+o.pkg+', nothing to fetch');return;}
  const stampFile=path.join(o.out,'.stamp.json'),stamp=JSON.stringify({format:FORMAT,pins});
  const list=Object.entries(pins).map(([n,p])=>n+' '+p.version).join(', ');
  if(!o.force&&fs.existsSync(stampFile)&&fs.readFileSync(stampFile,'utf8').trim()===stamp){console.log('vendor: cached ('+list+')');return;}
  const next=o.out+'.next';
  fs.rmSync(next,{recursive:true,force:true});fs.mkdirSync(next,{recursive:true});
  try{
    for(const [name,pin] of Object.entries(pins)){
      const lay=LAYOUT[name];if(!lay)throw new Error(`vendor: no layout for ${name} in scripts/vendor.js`);
      const url=pin.tarball||`https://registry.npmjs.org/${name}/-/${name.split('/').pop()}-${pin.version}.tgz`;
      const buf=await get(url);checkIntegrity(buf,pin.integrity,name);
      const files=untar(buf),dst=path.join(next,name);
      for(const [f,body] of files){
        const keep=(lay.keep||[]).includes(f);
        if(!keep&&!(f.startsWith(lay.dir+'/')&&f.endsWith('.js')))continue;
        const t=path.join(dst,keep?path.basename(f):path.relative(lay.dir,f));
        fs.mkdirSync(path.dirname(t),{recursive:true});fs.writeFileSync(t,body);
      }
      if(lay.license)fs.writeFileSync(path.join(dst,'LICENSE-MPL.md'),await get(lay.license(pin.version)));
      console.log(`vendor: ${name} ${pin.version} fetched and checked`);
    }
    // Rewrite the bare imports to relative paths. A bare import with no file to point at marks the file.
    const target=spec=>{for(const name of Object.keys(pins)){
      const sub=spec===name?'':spec.startsWith(name+'/')?spec.slice(name.length+1):null;
      if(sub!==null){const t=path.join(next,name,LAYOUT[name].entry(sub));return fs.existsSync(t)?t:null;}}
      return null;};
    const js=walk(next).filter(f=>f.endsWith('.js')),bad=new Set(),deps=new Map();
    for(const f of js){
      const mine=[];
      const fix=re=>(all,pre,q,spec)=>{
        if(!bare(spec)){if(re===STATIC)mine.push(path.resolve(path.dirname(f),spec));return all;}
        const t=target(spec);
        if(!t){if(re===STATIC)bad.add(f);return all;}
        if(re===STATIC)mine.push(t);
        return pre+q+rel(f,t)+q;};
      const s=fs.readFileSync(f,'utf8').replace(STATIC,fix(STATIC)).replace(DYNAMIC,fix(DYNAMIC));
      fs.writeFileSync(f,s);deps.set(f,mine);
    }
    // A file that imports a marked file statically is marked too, until no more change.
    for(let more=true;more;){more=false;
      for(const f of js)if(!bad.has(f)&&deps.get(f).some(t=>bad.has(t))){bad.add(f);more=true;}}
    for(const f of bad)fs.rmSync(f);
    if(bad.size)console.log('vendor: left out '+bad.size+' files that need a package not fetched: '+[...bad].map(f=>path.relative(next,f)).join(', '));
    // The files are ES modules: say so, for Node (the tests). A browser does not read this file.
    fs.writeFileSync(path.join(next,'package.json'),'{"type":"module","private":true}\n');
    fs.writeFileSync(path.join(next,'.stamp.json'),stamp+'\n');
    fs.rmSync(o.out,{recursive:true,force:true});fs.renameSync(next,o.out);
    console.log('vendor: wrote '+o.out+' ('+list+')');
  }finally{fs.rmSync(next,{recursive:true,force:true});}
}
main().catch(e=>{console.error('vendor: '+(e.message||e));process.exit(1);});
