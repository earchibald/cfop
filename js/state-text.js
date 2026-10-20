// ===== A cube state as text =====
// One letter per sticker: W R G Y O B for the colors, face by face in the order U R F D L B, each
// face read left to right, top to bottom, with a space between faces. 24 letters for the 2x2, 54
// for the 3x3, 96 for the 4x4. The lab's Copy state writes it; the site's Enter a scramble dialog
// and a paste on the page read it. The Kociemba letters U R F D L B are read too. Pure, no DOM.
const STATE_LETTERS='WRGYOB';
function stateText(cube){
  const f=cube.toFacelets(),per=f.length/6;
  return f.map((c,i)=>(i&&i%per===0?' ':'')+STATE_LETTERS[c]).join('');
}
// The color indices the text names, or null where the text is not a state. Any case; spaces, line
// breaks and punctuation between the letters are ignored.
function stateLetters(text){
  const s=String(text||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(s.length!==24&&s.length!==54&&s.length!==96)return null;
  const L=/^[WRGYOB]+$/.test(s)?STATE_LETTERS:/^[URFDLB]+$/.test(s)?'URFDLB':null;
  return L?[...s].map(ch=>L.indexOf(ch)):null;
}
// The sticker each position takes when the whole-cube turn r is made: perm[p] is the position it
// came from, as toFacelets lays the pieces out.
function stateFaceletPerm(r){
  const perm=new Array(54);
  for(let i=0;i<6;i++)perm[9*i+4]=9*r.center[i]+4;
  for(let i=0;i<8;i++){const j=r.cp[i],o=r.co[i];for(let n=0;n<3;n++)perm[cornerFacelet[i][(n+o)%3]]=cornerFacelet[j][n];}
  for(let i=0;i<12;i++){const j=r.ep[i],o=r.eo[i];for(let n=0;n<2;n++)perm[edgeFacelet[i][(n+o)%2]]=edgeFacelet[j][n];}
  return perm;
}
// text -> {ok, n, errors, cube}. n is the size of the puzzle the text names: 2, 3 or 4, or 0 where
// the text is no state at all. A 3x3 written with another face up is turned to white up, green
// toward you, as the site keeps every cube.
function stateFromText(text){
  let f=stateLetters(text);
  if(!f)return {ok:false,n:0,errors:['A state is 24, 54 or 96 letters, W R G Y O B for the colors, face by face: top, right, front, bottom, left, back.']};
  const n=f.length===24?2:f.length===54?3:4;
  if(n===3){
    const centers=[0,1,2,3,4,5].map(i=>f[9*i+4]).join(),rot=ROTATIONS.find(r=>r.center.join()===centers);
    if(rot&&rot.center.join()!=='0,1,2,3,4,5'){const perm=stateFaceletPerm(rot),g=new Array(54);for(let p=0;p<54;p++)g[perm[p]]=f[p];f=g;}
    const r=fromFacelets(f);return {ok:r.ok,n,errors:r.errors,cube:r.cube};
  }
  if(n===2){if(typeof twoFromFacelets!=='function')return {ok:false,n,errors:['This page does not read a 2x2.']};const r=twoFromFacelets(f);return {ok:r.ok,n,errors:r.errors,cube:r.cube};}
  if(typeof fourFromFacelets!=='function')return {ok:false,n,errors:['This page does not read a 4x4.']};
  const r=fourFromFacelets(f);return {ok:r.ok,n,errors:r.errors,cube:r.cube};
}
