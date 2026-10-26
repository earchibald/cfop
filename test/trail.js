// The move trail (js/trail.js): the zones and their numbers, the hidden range, the arrow on the old
// end, the colors by the hold, the colors kept as the list changes, and the direction setting.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/trail.js');
const J=code=>JSON.parse(run(`JSON.stringify(${code})`));
const zones=(n,shown=10)=>J(`trailZones(${JSON.stringify(Array.from({length:n},(_,i)=>i%2?'U':'R'))},${shown})`);
const shape=z=>z.map(x=>x.zone+':'+(x.hid?'1-'+x.hid:x.moves.map(m=>m.k).join(','))+(x.arrow?'>':'')).join(' ');
assert.deepStrictEqual(zones(0),[],'no moves, no zones');
assert.strictEqual(shape(zones(1)),'now:1','one move is Now alone, with no arrow: nothing comes after Now');
assert.strictEqual(shape(zones(4)),'recent:1,2,3> now:4','up to five moves: Recent and Now, the arrow on Recent');
assert.strictEqual(shape(zones(7)),'earlier:1,2> recent:3,4,5,6 now:7','the arrow on the old end of Earlier');
assert.strictEqual(shape(zones(10)),'earlier:1,2,3,4,5> recent:6,7,8,9 now:10','ten moves fit');
assert.strictEqual(shape(zones(23)),'hidden:1-13 earlier:14,15,16,17,18> recent:19,20,21,22 now:23','the rest as a range');
// colors: the face's color as held; a whole-cube turn has none
assert.strictEqual(run(`trailColor('R',null)`),1,'white up, green front: R is red');
assert.strictEqual(run(`trailColor("U'",null)`),0);
assert.strictEqual(run(`trailColor('R',{cube:{center:[3,4,2,0,1,5]}})`),4,'yellow up, green front: R is orange');
assert.strictEqual(run(`trailColor('y2',null)`),-1);
assert.strictEqual(run(`trailZones(['R','y'],10)[1].moves[0].color`),-1,'a cube turn takes no color');
assert.strictEqual(run(`trailZones(['R','U'],10,[4])[0].moves[0].color`),4,'a kept color wins over the hold');
assert.strictEqual(run(`trailZones(['R','U'],10,[4],m=>9)[1].moves[0].color`),9,'a move with no kept color takes the hold');
// kept colors: a new move adds one, a merge replaces the last, a shorter list loses its end
assert.deepStrictEqual(J(`trailNote([1,0],2,3,2)`),[1,0,2]);
assert.deepStrictEqual(J(`trailNote([1,0],2,2,5)`),[1,5]);
assert.deepStrictEqual(J(`trailNote([1,0,2],3,2,1)`),[1,0]);
assert.deepStrictEqual(J(`trailNote([1,0,2],3,0,1)`),[]);
// the page: oldest first in the document, the direction from the setting
const {JSDOM}=require('jsdom');
const fs=require('fs'),path=require('path');
const dom=new JSDOM('<div id="t"></div>',{runScripts:'outside-only',url:'http://localhost/'});
dom.window.eval(fs.readFileSync(path.join(__dirname,'..','js','trail.js'),'utf8'));
const w=dom.window,el=w.document.getElementById('t');
const draw=ms=>w.trailDraw(el,ms,{shown:10,colorOf:m=>w.trailColor(m,null)});
draw([]);assert.strictEqual(el.querySelector('.none').textContent,'No moves yet');
delete el.dataset.trail; // a fresh element: its first draw does not pop
const ms=Array.from({length:23},(_,i)=>['R','U',"R'","U'"][i%4]);
draw(ms);
assert.ok(el.classList.contains('trail')&&el.classList.contains('rtl'),'right to left by default');
assert.strictEqual([...el.querySelectorAll('.mv')].map(s=>s.textContent).join(' '),ms.slice(-10).join(' '),'the document reads oldest first');
assert.deepStrictEqual([...el.querySelectorAll('.zl')].map(s=>s.textContent),['','Earlier','Recent','Now']);
assert.strictEqual(el.querySelector('.more .tile').textContent,'1–13');assert.strictEqual(el.querySelector('.more').getAttribute('aria-label'),'13 more');
assert.ok(el.querySelector('.z-earlier.arrow')&&!el.querySelector('.z-now.arrow'),'the arrow on Earlier, none on Now');
assert.ok(el.querySelector('.now.c1'),"Now in its face color: R' is red");
assert.ok(!el.querySelector('.pop'),'no pop on the first draw');
draw(ms.concat('F'));assert.ok(el.querySelector('.now.pop.c2'),'a new move pops, green for F');
draw(ms.concat('F'));assert.ok(!el.querySelector('.pop'),'a redraw does not pop');
draw(ms);assert.ok(!el.querySelector('.pop'),'a move taken off does not pop');
w.localStorage.setItem('cw:trailDir','"ltr"');draw(ms);
assert.ok(!el.classList.contains('rtl'),'the setting swaps it to left to right');
console.log('trail: ok');
