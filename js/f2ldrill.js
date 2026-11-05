// ===== The F2L drill button =====
// On the cube on the F2L tab of CFOP, as Cross Trainer is on the Cross tab: one button that names
// the drill in use and opens a menu of the three, each with its own choice under it:
//   Guide                       one pair at a time (js/f2l-ui.js)
//   Real cross-solved states    Pairs left: 4 3 2 1 (#f2lPairs)
//   The 41 cases                All groups, or one group (#f2lGroup); Next case draws from it
// A pick sets the mode (setF2LMode in app.js, kept in cw:f2lDrill) and the choice, then closes the
// menu. The selects in the sheets stay; the menu reads them each time it draws.
const F2L_DRILLS=[
  {m:'guide',name:'Guide',short:'Guide',note:'One pair at a time, with a hint as a drill'},
  {m:'live',name:'Real cross-solved states',short:'Cross solved',note:'Scrambles with the cross solved, pairs left to do'},
  {m:'cases',name:'The 41 cases',short:'41 cases',note:'The standard cases, one at a time'}];
function f2lDrillEl(tag,attrs,...kids){const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,v);for(const k of kids)if(k!=null)e.append(k);return e;}
function f2lDrillOpen(){const m=$('#f2lDrillMenu');return !!m&&!m.hidden;}
// The drill and its choice in words, for the tip. The button shows the drill's short name alone, so
// the bar on the stage keeps to one row.
function f2lDrillLabel(){const d=F2L_DRILLS.find(x=>x.m===f2lState.mode)||F2L_DRILLS[0];
  if(d.m==='live'){const n=+$('#f2lPairs').value;return d.name+', '+n+(n===1?' pair':' pairs')+' left';}
  if(d.m==='cases'){const g=$('#f2lGroup').value;return d.name+', '+(g==='all'?'all groups':g);}
  return d.name;}
function f2lDrillDraw(){const b=$('#f2lDrillBtn');if(!b)return;const n=$('#f2lDrillName');
  const t=(F2L_DRILLS.find(x=>x.m===f2lState.mode)||F2L_DRILLS[0]).short;if(n.textContent!==t)n.textContent=t;
  const tip='The F2L drill: '+f2lDrillLabel()+'. Click to pick another drill';if(b.title!==tip)b.title=tip;
  if(f2lDrillOpen())f2lDrillMenuDraw();}
// One radio item of the menu.
function f2lDrillItem(on,attrs,...kids){
  return f2lDrillEl('button',Object.assign({type:'button',role:'menuitemradio','aria-checked':String(on)},attrs),...kids);}
function f2lDrillMenuDraw(){const menu=$('#f2lDrillMenu');if(!menu)return;menu.replaceChildren();
  const mode=f2lState.mode,pairs=$('#f2lPairs').value,grp=$('#f2lGroup').value;
  menu.append(f2lDrillEl('div',{class:'fdm-head'},'F2L drill'));
  for(const d of F2L_DRILLS){
    menu.append(f2lDrillItem(mode===d.m,{class:'fdm-mode','data-m':d.m,title:d.note},
      f2lDrillEl('i',{class:'fdm-dot','aria-hidden':'true'}),f2lDrillEl('b',{},d.name),f2lDrillEl('span',{class:'fdm-note'},d.note)));
    if(d.m==='live'){const sub=f2lDrillEl('div',{class:'fdm-sub',role:'group','aria-label':'Pairs left'},f2lDrillEl('span',{class:'fdm-lbl'},'Pairs left'));
      for(const o of $$('#f2lPairs option'))sub.append(f2lDrillItem(mode==='live'&&pairs===o.value,{class:'fdm-chip','data-pairs':o.value,
        title:'Scrambles with the cross solved and '+o.value+(o.value==='1'?' pair':' pairs')+' left to solve'},o.value));
      menu.append(sub);}
    if(d.m==='cases'){const sub=f2lDrillEl('div',{class:'fdm-sub fdm-list',role:'group','aria-label':'Group'});
      for(const o of $$('#f2lGroup option'))sub.append(f2lDrillItem(mode==='cases'&&grp===o.value,{class:'fdm-chip','data-grp':o.value,
        title:o.value==='all'?'Train the selected cases of every group':'Train the selected cases of this group: '+o.textContent},o.textContent));
      menu.append(sub);}}}
function f2lDrillShow(){const menu=$('#f2lDrillMenu'),b=$('#f2lDrillBtn');if(!menu)return;f2lDrillMenuDraw();menu.hidden=false;b.setAttribute('aria-expanded','true');
  const on=menu.querySelector('[aria-checked="true"]');(on||menu.querySelector('button')).focus();}
function f2lDrillHide(focus){const menu=$('#f2lDrillMenu'),b=$('#f2lDrillBtn');if(!menu||menu.hidden)return;menu.hidden=true;b.setAttribute('aria-expanded','false');if(focus)b.focus();}
// A pick: the mode, then the choice under it.
function f2lDrillPick(el){
  if(el.dataset.pairs){const s=$('#f2lPairs');s.value=el.dataset.pairs;if(f2lState.mode==='live')s.dispatchEvent(new Event('change'));else setF2LMode('live');}
  else if(el.dataset.grp){const s=$('#f2lGroup');if(s.value!==el.dataset.grp){s.value=el.dataset.grp;s.dispatchEvent(new Event('change'));}if(f2lState.mode!=='cases')setF2LMode('cases');}
  else if(el.dataset.m&&el.dataset.m!==f2lState.mode)setF2LMode(el.dataset.m);
  f2lDrillHide(true);f2lDrillDraw();}
(function f2lDrillInit(){const b=$('#f2lDrillBtn'),menu=$('#f2lDrillMenu');if(!b||!menu)return;
  // The drill kept from the last visit.
  const m=store.get('f2lDrill','guide');
  if(F2L_MODES.includes(m)&&m!==f2lState.mode){if(curTab==='f2l')setF2LMode(m);else{f2lState.mode=m;f2lPanels(m);}}
  b.onclick=e=>{e.stopPropagation();if(f2lDrillOpen())f2lDrillHide();else f2lDrillShow();};
  menu.addEventListener('click',e=>{e.stopPropagation();const it=e.target.closest('button');if(it)f2lDrillPick(it);});
  menu.addEventListener('keydown',e=>{const items=[...menu.querySelectorAll('button')],i=items.indexOf(document.activeElement);
    const go=j=>{e.preventDefault();e.stopPropagation();items[(j+items.length)%items.length].focus();};
    if(e.key==='ArrowDown'||e.key==='ArrowRight')go(i+1);else if(e.key==='ArrowUp'||e.key==='ArrowLeft')go(i-1);
    else if(e.key==='Home')go(0);else if(e.key==='End')go(items.length-1);
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();f2lDrillHide(true);}
    else if(e.key==='Tab')f2lDrillHide();});
  document.addEventListener('click',e=>{if(f2lDrillOpen()&&!e.target.closest('#f2lDrill'))f2lDrillHide();});
  document.addEventListener('cw:tab',()=>f2lDrillHide());
  document.addEventListener('cw:f2lmode',f2lDrillDraw);
  for(const id of ['#f2lPairs','#f2lGroup'])$(id).addEventListener('change',f2lDrillDraw);
  f2lDrillDraw();})();
