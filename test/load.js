const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new (require('jsdom').VirtualConsole)();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
w.addEventListener('load',()=>{setTimeout(()=>{
console.log('errors',errs);
console.log('moves',w.document.querySelectorAll('.scramble .m').length,'cases',w.document.querySelectorAll('.case').length,'Cube',typeof w.Cube,'solve',typeof w.solveTwoPhase,'scanBtn',typeof w.openEnter);
process.exit(0);},500);});
