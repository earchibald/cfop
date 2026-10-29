// ===== The cube in the section =====
// The player (the cube, the move tiles, the timer) is not at the top of the page. It sits in the
// cube slot (#cubeSlot) beside the sections in main.main, and CSS places the slot for the section
// in view (css/start.css): a scramble section (CFOP's Scramble tab, was Solve) has it across the
// top with the scramble controls (the seed bar); another section has it in a column beside its
// text, with a pill for the scramble; a section with none (Reference, the Smart cube tab, the
// Cheat sheet) shows no player. body[data-cube] is wide, side or none.
// Nothing moves after the start: some modules write their whole section again (guide.js), so the
// player never lives inside one.
const PLACE_NONE=new Set(['ref','smart','sref','fref','cheat']);
const PLACE_WIDE=new Set(['solve','ssolve','fsolve','bsolve']);
function placeKind(tab){return PLACE_NONE.has(tab)?'none':PLACE_WIDE.has(tab)?'wide':'side';}
function placeInit(){
  const main=$('main.main');if(!main||$('#cubeSlot'))return;
  const slot=document.createElement('aside');slot.id='cubeSlot';slot.className='cubeslot';slot.setAttribute('aria-label','The cube');
  // The scramble pill: the seed and New, where the player is in the side column.
  const pill=document.createElement('div');pill.id='scrPill';pill.className='scrpill';
  pill.innerHTML='<span class="muted">Scramble</span> <b id="scrPillSeed"></b><button class="small" id="scrPillNew" title="A new scramble">New<span class="hk" aria-hidden="true">N</span></button>';
  slot.append(pill,$('#seedBar'),$('#begBar'),$('#player'));
  main.prepend(slot);
  $('#scrPillNew').onclick=()=>{if(typeof nextForTab==='function')nextForTab();else newScramble();};
  placePlayer();
}
function placeSeed(){const el=$('#scrPillSeed');if(el&&typeof scr!=='undefined')el.textContent=scr.seed||'';}
function placePlayer(){const tab=typeof curTab!=='undefined'?curTab:'solve';document.body.dataset.cube=placeKind(tab);placeSeed();}
// The crumb over the section, as the getting-started pages have one: the method and the section
// ("3×3 Beginner · Practice"). CSS draws it from the section's data-crumb, so a module that writes its
// section again keeps it.
function placeCrumb(){const tab=typeof curTab!=='undefined'?curTab:'solve',sec=$('#tab-'+tab);if(!sec)return;
  const b=document.querySelector(`nav.rail button[data-tab="${tab}"]`),name=b?b.textContent.replace(/^\d+/,'').trim():'';
  const m=($('#puzzleName')?$('#puzzleName').textContent.replace(/·/,'').trim()+' ':'')+($('#methodName')?$('#methodName').textContent.trim():'');
  sec.dataset.crumb=name?`${m} · ${name}`:m;}
document.addEventListener('cw:tab',()=>{placePlayer();placeCrumb();});
document.addEventListener('cw:method',()=>{placePlayer();placeCrumb();});
document.addEventListener('cw:scramble',placeSeed);
placeInit();placeCrumb();
