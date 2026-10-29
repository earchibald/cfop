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
  // Each move carries the color of the face it turns, as held: the player's tiles agree.
  const spc=$("#crossSols .spoil");const pc=w.eval('phys(orientedScramble().cube)');const ms=lineMoves(spc);
  const fc=w.eval('seqFaceColors')(pc,ms);const got=[spc.querySelector(".sp-0"),...spc.querySelectorAll('.sp-m')].map(x=>+(/\bc(\d)\b/.exec(x.className)||[0,-1])[1]);
  assert.deepStrictEqual(got,fc,'face colors on the moves');
  // Light the white edges: both stickers of each white edge lit, lifted, then the cube as it was.
  w.eval("setMethod('cfop');store.set('crossLesson',0);crossLessonShow(0)");const lt=$('#crossLessonLight');assert.ok(lt,'the light button');
  w.eval('CROSS_LIGHT_T.bump=60;CROSS_LIGHT_T.stay=80');click(lt);
  const lit=[...w.eval('fadeSet')];const f=w.eval('displayedCube.toFacelets()');
  assert.strictEqual(lit.length,8,'eight stickers: four edges, two each');assert.strictEqual(lit.filter(i=>f[i]===0).length,4,'four white');
  assert.ok(lt.classList.contains('bumping'),'the button bumps');
  await sleep(90);assert.ok(!lt.classList.contains('bumping'),'the bump ends');assert.ok(w.eval('fadeSet'),'still lit');
  await sleep(120);assert.strictEqual(w.eval('fadeSet'),null,'then the cube as it was');
  w.eval("store.set('crossLesson',null);crossLessonShow(null)");
  // What to look for: every demo plan makes the cross from its setup; a plan with no parts is
  // optimal; the parts join to the Together plan; the pair plan puts the FR pair in.
  const tips=w.eval('CROSS_TIPS');assert.strictEqual($$('#crossTips .look-row').length,tips.length,'one row per tip');
  for(const t of tips)for(const p of t.demo.plans){
    const ms=w.eval('lookMoves')(p),c0=w.eval(`applyAlg(new Cube(),parseAlg(${JSON.stringify(t.demo.setup)}))`);
    assert.ok(w.eval('crossSolved')(w.eval('applyAlg')(c0,ms)),`${t.t} · ${p.name}: the cross is made`);
    if(!p.parts)assert.strictEqual(ms.length,w.eval('solveCross')(c0,0,5).optimal,`${t.t} · ${p.name}: optimal`);
    else{const J=w.eval('lookJoin')(w.eval('parseAlg')(p.parts[0].moves),w.eval('parseAlg')(p.parts[1].moves));
      assert.strictEqual(J.joined.join(' '),t.demo.plans.find(q=>!q.parts).moves,'the parts join to the plan beside them');assert.ok(J.notes.length,'with a note for the cancel');}
    if(p.slot){const sl=w.eval('SLOTS').find(s=>s.name===p.slot);assert.ok(w.eval('slotSolved')(w.eval('applyAlg')(c0,ms),sl),'the pair goes in');assert.ok(!w.eval('slotSolved')(c0,sl),'and was not in before');}
  }
  // A card opens; Step turns one move; the cross edges are lit, both stickers.
  click($$('#crossTips .look-row')[1]);assert.ok($('#lookCard'),'the card opens');assert.strictEqual($$('#crossTips .look-row')[1].getAttribute('aria-expanded'),'true');
  assert.strictEqual($$('#lookPlan .m.cx').length,2,'R2 and R2 struck through');assert.ok(/cancel/.test($('#lookPlan .look-join').textContent),'the cancel in words');
  assert.ok(/0 of 4|1 of 4|2 of 4/.test($('#lookSay').textContent),'the count at the start');
  assert.strictEqual(w.eval('LOOK.sc.fade').size,8,'four cross edges, two stickers each');
  click($('#lookStep'));assert.ok(/move 1 of 5/.test($('#lookSay').textContent),'one move: '+$('#lookSay').textContent);assert.ok($('#lookPlan .m.cur'),'the tile in view');
  click($$('#lookCard [data-plan]')[1]);assert.ok(/3 moves to go/.test($('#lookSay').textContent),'the other plan');
  click($$('#crossTips .look-row')[1]);assert.ok(!$('#lookCard'),'a second click closes it');
  // Show all moves uncovers every line.
  w.eval('setRefAll')(true);assert.ok(d.body.classList.contains('refall'));w.eval('setRefAll')(false);
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('cross: Reveal lists the plans, one per line, under the spoiler rule; Step through puts a plan on the cube ok');process.exit(0);
}catch(e){console.error('cross: FAIL',e.message,errs);process.exit(1);}});
