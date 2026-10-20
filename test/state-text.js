// A cube state as text (js/state-text.js): the letters round-trip for the 2x2, the 3x3 and the 4x4,
// the Kociemba letters read too, a 3x3 written with another face up comes back white up, and bad
// text is refused with a plain error.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/four.js','js/state-text.js');
const text=alg=>run(`stateText(applyAlg(new Cube(),${JSON.stringify(alg)}))`);
const back=(t,alg)=>run(`stateFromText(${JSON.stringify(t)}).cube.equals(applyAlg(new Cube(),${JSON.stringify(alg)}))`);
assert.strictEqual(text(''),'WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB','a solved 3x3, face by face with spaces');
assert.strictEqual(text('R U'),'WWWWWWGGG WBBRRRRRR RRRGGYGGY YYBYYBYYB GGYOOOOOO OOOWBBWBB');
for(const alg of ['R U',"F' D2 L B U' R2","R U R' U' R' F R2 U' R' U' R U R' F'"]){
  assert.ok(back(text(alg),alg),'the 3x3 round trips: '+alg);
  assert.ok(back(text(alg).toLowerCase().replace(/ /g,'\n'),alg),'any case, any breaks: '+alg);
  for(const rot of ['x','y',"z'",'x2 y','z x2 y'])assert.ok(back(text(alg+' '+rot),alg),`written ${rot}: the stickers turn back to white up, green toward you (${alg})`);
}
assert.ok(run(`stateFromText('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB').cube.isSolved()`),'the Kociemba letters read');
assert.strictEqual(run(`stateFromText(${JSON.stringify(text('R U'))}).n`),3);
// the 2x2: 24 letters, the corners of the 3x3 model
const two=alg=>run(`stateText({toFacelets:()=>twoFacelets(applyAlg(new Cube(),${JSON.stringify(alg)}))})`);
assert.strictEqual(two(''),'WWWW RRRR GGGG YYYY OOOO BBBB');
for(const alg of ['R U',"F R' U2 F' R"]){const r=run(`stateFromText(${JSON.stringify(two(alg))})`);
  assert.strictEqual(r.n,2);assert.ok(r.ok,'the 2x2 reads: '+r.errors);
  assert.deepStrictEqual(run(`twoFacelets(stateFromText(${JSON.stringify(two(alg))}).cube)`),run(`twoFacelets(applyAlg(new Cube(),${JSON.stringify(alg)}))`),'the 2x2 round trips: '+alg);}
// the 4x4: 96 letters
const four=alg=>run(`stateText(new FourCube().apply(${JSON.stringify(alg)}))`);
assert.strictEqual(four(''),'WWWWWWWWWWWWWWWW RRRRRRRRRRRRRRRR GGGGGGGGGGGGGGGG YYYYYYYYYYYYYYYY OOOOOOOOOOOOOOOO BBBBBBBBBBBBBBBB');
for(const alg of ['Rr U',"r U' F2 Ll D"]){const r=run(`stateFromText(${JSON.stringify(four(alg))})`);
  assert.strictEqual(r.n,4);assert.ok(r.ok,'the 4x4 reads: '+r.errors);
  assert.ok(run(`stateFromText(${JSON.stringify(four(alg))}).cube.equals(new FourCube().apply(${JSON.stringify(alg)}))`),'the 4x4 round trips: '+alg);}
// refusals
let r=run(`stateFromText('hello there')`);assert.ok(!r.ok&&r.n===0,'words are no state');assert.match(r.errors[0],/24, 54 or 96 letters/);
r=run(`stateFromText('R U R\\' U\\'')`);assert.ok(!r.ok&&r.n===0,'a scramble is no state');
assert.strictEqual(run(`stateLetters('R U R\\' U\\'')`),null);
r=run(`stateFromText('WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBW')`);assert.ok(!r.ok&&r.n===3);assert.match(r.errors[0],/white 10, blue 8/);
r=run(`stateFromText('WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB'.replace('WWWWWWWWW','WWWWWWWWR').replace('RRRRRRRRR','RRRRRRRRW'))`);assert.ok(!r.ok,'two swapped stickers make an illegal cube');
r=run(`stateFromText('WWWWYWWWW RRRRRRRRR GGGGGGGGG YYYYWYYYY OOOOOOOOO BBBBBBBBB')`);assert.ok(!r.ok,'white and yellow centers swapped is no turn of the cube');assert.match(r.errors[0],/center of the top face must be white/);
console.log('state-text ok');
