// ================= Random-state scrambles =================
// A random state: any position of the cube, each one as likely, as in a WCA competition. The moves
// come from cubing.js (MPL-2.0), which TNoodle, the WCA scrambler, shares its 3x3 and 4x4 solvers
// with: Chen Shuang's min2phase and threephase. scripts/vendor.js puts the library in vendor/,
// which git ignores; the Pages workflow and mac/build.sh run it.
// The search runs in a worker, and a 4x4 takes a second or more, so a few scrambles wait in a pool
// for each puzzle. With no library (a checkout not vendored, jsdom, an old browser) or an empty
// pool, a new scramble falls back to random moves. A seed name always gives random moves, so the
// same seed gives the same scramble.
// The library's address is taken from this script's own, so the page works from any folder.
// var: tests read it from the window.
var RS={src:(document.currentScript&&document.currentScript.src)||location.href,
  state:'idle',lib:null,error:null,pool:{2:[],3:[],4:[]},busy:{},want:2,bootSeed:null,t0:Date.now()};
const RS_EVENT={2:'222',3:'333',4:'444'};
// The moves of a cubing.js scramble in the app's own notation, or null when they do not fit.
// A 2x2 scramble from cubing.js turns every face; the app's 2x2 scrambles are R, U and F, so the
// state is kept and written again as R U F moves (as TNoodle does). A state 3 moves or fewer from
// solved is not used, as TNoodle does not use one.
function rsMoves(n,text){
  if(n===4)return parseFour(text);
  const moves=parseAlg(text);
  if(n===3)return moves;
  const c=twoAlign(applyAlg(new Cube(),moves)).cube,sol=twoOptimal(c).moves;
  if(sol.length<4)return null;
  return parseAlg(invertAlg(sol));
}
function rsLoad(){
  if(RS.state!=='idle')return RS.ready;
  RS.state='loading';
  // No timing lines in the console, and no prefetch of its own: the pool is the prefetch.
  const at=p=>new URL('../vendor/cubing/'+p,RS.src).href;
  RS.ready=(async()=>{try{const [lib,search]=await Promise.all([import(at('scramble/index.js')),import(at('search/index.js'))]);
      search.setSearchDebug({logPerf:false,scramblePrefetchLevel:'none'});RS.lib=lib;RS.state='ready';}
    catch(e){RS.state='failed';RS.error=e;console.info('Twistwright: random-state scrambles are off, scrambles use random moves.',e&&e.message||e);}})();
  return RS.ready;
}
// Keep the pool of puzzle n full: one search at a time, one after the other.
function rsFill(n){
  if(RS.state!=='ready'||RS.busy[n]||RS.pool[n].length>=RS.want)return;
  RS.busy[n]=true;
  RS.lib.randomScrambleForEvent(RS_EVENT[n]).then(alg=>{const m=rsMoves(n,alg.toString());if(m)RS.pool[n].push(m);rsArrived(n);},
    e=>{console.info('Twistwright: a random-state scramble failed.',e&&e.message||e);RS.want=0;})
    .finally(()=>{RS.busy[n]=false;rsFill(n);});
}
// A random-state scramble of puzzle n from the pool, or null. The pool fills again behind it.
function rsTake(n){const m=RS.pool[n].shift()||null;rsFill(n);return m;}
// The scramble at page load came before the library. Replace it with a random-state one if
// nobody has used it yet: the same scramble, no timer, a few seconds after load, a speed method.
function rsArrived(n){
  if(RS.bootSeed===null||puzzleN()!==n)return;
  const fresh=scr.seed===RS.bootSeed&&timer.state==='idle'&&Date.now()-RS.t0<5000&&document.body.dataset.kind!=='beg';
  if(fresh&&$('#scrLen').value==='rs')newScramble();
  RS.bootSeed=null;
}
// The pools of the puzzle in use and of the 3x3 fill at load. The others fill once their puzzle is
// chosen: a 4x4 search takes a second or more, and the first 2x2 one builds a table on this thread.
function rsStart(){rsLoad().then(()=>{rsFill(puzzleN());rsFill(3);});}
document.addEventListener('cw:method',()=>rsFill(puzzleN()));
// What the Settings window says about scrambles.
function rsStatus(){
  if(RS.state==='ready')return 'Random state, from cubing.js';
  if(RS.state==='failed')return 'Random moves. The random-state library did not load.';
  return 'Random moves, until the random-state library loads.';
}
