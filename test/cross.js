// The Cross tab's Reveal: the plans come as a list, one per line, each under the Reference spoiler
// rule (the first move in clear, a bar on each move after it; a click reveals the next move, the
// button reveals the rest, a click on a fully shown line covers it again). A Step through button
// per line puts that plan on the cube. H toggles the list.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,what){for(let i=0;i<200;i++){if(f())return;await sleep(50);}throw new Error('timed out: '+what);}
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const key=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
const lineMoves=sp=>[sp.firstChild.textContent.trim(),...[...sp.querySelectorAll('.sp-m')].map(x=>x.textContent)].join(' ').split(/\s+/);

w.addEventListener('load',async()=>{try{
  await sleep(100);
  $('#rail button[data-tab="cross"]').click();
  await until(()=>$('#crossOpt').textContent!=='…'&&$('#crossOpt').textContent!=='—','the cross solver');
  const sols=w.eval('crossState').sol.solutions;assert.ok(sols.length>0,'plans found');
  assert.ok(/Hidden/.test($('#crossSols').textContent),'hidden before Reveal');assert.ok(!$('#crossSols .spoil'),'no moves on the page while hidden');
  // Reveal: a list, one plan per line, in the solver's order.
  click($('#crossReveal'));
  const lines=$$('#crossSols .sol-list .sol');assert.strictEqual(lines.length,sols.length,'one line per plan: '+lines.length+' of '+sols.length);
  lines.forEach((l,i)=>{const sp=l.querySelector('.spoil'),t=sols[i].split(' ');assert.ok(sp,'line '+i+' is a spoiler');
    assert.strictEqual(sp.firstChild.textContent.trim(),t[0],'line '+i+' shows its first move');
    assert.deepStrictEqual([...sp.querySelectorAll('.sp-m')].map(x=>x.textContent),t.slice(1),'and covers the rest: '+sols[i]);
    assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,0,'nothing revealed yet');
    assert.strictEqual(l.querySelector('.sol-play').textContent,'Step through on cube');});
  // One move per click; the button reveals the rest; the other lines stay as they were; a click on an open line covers it again.
  const sp0=lines[0].querySelector('.spoil'),on=s=>s.querySelectorAll('.sp-m.on').length,n=sols[0].split(' ').length-1;
  if(n>0){click(sp0.querySelector('.sp-rest'));assert.strictEqual(on(sp0),1,'a click reveals one move');assert.strictEqual(sp0.querySelector('.sp-m.on').textContent,sols[0].split(' ')[1],'the next move');
    if(lines.length>1)assert.strictEqual(on(lines[1].querySelector('.spoil')),0,'the other lines are as they were');
    click(sp0.querySelector('.sp-btn'));assert.strictEqual(on(sp0),n,'the button reveals the rest');assert.ok(sp0.classList.contains('open'),'the line is open');
    click(sp0);assert.strictEqual(on(sp0),0,'a click on an open line covers it again');}
  // Step through puts that plan on the cube as a drill.
  const i=lines.length-1;click(lines[i].querySelector('.sol-play'));
  assert.ok(/cross plan/.test($('#seqLabel').textContent),'the player holds a cross plan: '+$('#seqLabel').textContent);
  assert.strictEqual(JSON.stringify(w.eval('seqState').moves),JSON.stringify(w.eval('parseAlg')(sols[i])),'the moves of that plan');assert.strictEqual($$('#scramble .m').length,w.eval('parseAlg')(sols[i]).length,'one tile per move');
  // H covers the list again; H shows it again, and the spoilers start covered.
  key('h');assert.ok(/Hidden/.test($('#crossSols').textContent),'H hides the plans');
  key('H');assert.strictEqual($$('#crossSols .sol').length,sols.length,'H shows them again');assert.strictEqual($$('#crossSols .sp-m.on').length,0,'covered again after a new reveal');
  // Show all moves uncovers every line.
  w.eval('setRefAll')(true);assert.ok(d.body.classList.contains('refall'));w.eval('setRefAll')(false);
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('cross: Reveal lists the plans, one per line, under the spoiler rule; Step through puts a plan on the cube ok');process.exit(0);
}catch(e){console.error('cross: FAIL',e.message,errs);process.exit(1);}});
