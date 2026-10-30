#!/usr/bin/env node
// Fetch the speech recognizer for the Quest page's drill into quest/voice/, which git ignores.
//
//   node scripts/quest-voice.js           fetch only when quest/voice/ does not hold the pinned files
//   node scripts/quest-voice.js --force   fetch again (NOCACHE=1 does the same)
//
// The Quest Browser has no speech recognition of its own, so the drill hears case names with Vosk in
// WebAssembly (quest/voice.js): vosk-browser from npm (dist/vosk.js, the recognizer and its worker in
// one file) and Alpha Cephei's small US English model as the gzipped tar that vosk-browser reads.
// Both are Apache-2.0 (THIRD-PARTY.md). The pins are the "questVoice" field of package.json: the npm
// tarball by its integrity, the model by its SHA-256. About 47 MB in all, so only quest/run.sh and
// quest/android/build.sh fetch them: not the Pages deploy, not the Mac app.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');

const ROOT=path.join(__dirname,'..');
const OUT=path.join(ROOT,'quest','voice');

async function get(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
function check(buf,alg,want,name){
  const got=crypto.createHash(alg).update(buf).digest(alg==='sha256'?'hex':'base64');
  if(got!==want)throw new Error(`${name}: the download does not match its pin (${alg} ${want})`);
}
// One regular file of a .tgz (ustar, as npm writes it), or null.
function untarOne(tgz,want){
  const b=zlib.gunzipSync(tgz);let p=0;
  const str=(o,n)=>b.toString('utf8',o,o+n).replace(/\0.*$/s,'');
  while(p+512<=b.length&&b[p]){
    let name=str(p,100);const prefix=str(p+345,155),size=parseInt(str(p+124,12).trim()||'0',8);
    if(prefix)name=prefix+'/'+name;
    if(name===want)return b.subarray(p+512,p+512+size);
    p+=512+Math.ceil(size/512)*512;}
  return null;
}

async function main(){
  const force=process.argv.includes('--force')||(!!process.env.NOCACHE&&process.env.NOCACHE!=='0');
  const pins=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).questVoice;
  const stampFile=path.join(OUT,'.stamp.json'),stamp=JSON.stringify(pins);
  if(!force&&fs.existsSync(stampFile)&&fs.readFileSync(stampFile,'utf8').trim()===stamp){console.log('quest voice: cached (vosk-browser '+pins['vosk-browser'].version+', '+pins.model.name+')');return;}
  fs.mkdirSync(OUT,{recursive:true});
  const v=pins['vosk-browser'];
  console.log('quest voice: vosk-browser '+v.version);
  const tgz=await get(`https://registry.npmjs.org/vosk-browser/-/vosk-browser-${v.version}.tgz`);
  check(tgz,v.integrity.split('-')[0],v.integrity.slice(v.integrity.indexOf('-')+1),'vosk-browser');
  const js=untarOne(tgz,'package/dist/vosk.js');if(!js)throw new Error('vosk-browser: no dist/vosk.js in the tarball');
  fs.writeFileSync(path.join(OUT,'vosk.js'),js);
  console.log('quest voice: '+pins.model.name+' (about 41 MB)');
  const model=await get(pins.model.url);
  check(model,'sha256',pins.model.sha256,pins.model.name);
  fs.writeFileSync(path.join(OUT,'model.tar.gz'),model);
  fs.writeFileSync(stampFile,stamp+'\n');
  console.log('quest voice: ok, in quest/voice/');
}
main().catch(e=>{console.error('quest voice: '+e.message);process.exit(1);});
