// ================= The words of a cube command, shared by the voices =================
// What a sentence asks of a cube, as the Smart cube tab's voice (smart-listen.js) and the Quest page's
// Drill mode voice (quest/voice.js) take it: "reset", "clear moves", a hold ("top yellow, front
// green", "yellow up", "green toward me", "bottom white") and a turn of the whole cube ("x prime",
// "y two", "back z"). A command must be the whole of what was said, bar the small words around it:
// a color word inside talk is no command. The recognizer is a dictation model, so each color has
// the words it comes out as ("wait" for white, "blew" for blue).
// Pure (no DOM): smartWords, smartTurn, smartCommand. Loads before smart-listen.js and quest/voice.js.

const SMART_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
// The words a recognizer gives for each color.
const SMART_COLOR_WORDS={white:0,whites:0,wait:0,wide:0,wight:0,
  red:1,reds:1,read:1,bread:1,
  green:2,greens:2,grain:2,greene:2,
  yellow:3,yellows:3,jello:3,yella:3,
  orange:4,oranges:4,orangey:4,
  blue:5,blues:5,blew:5,blu:5,glue:5};
// The words for a place: the top, the bottom, the front.
const SMART_PLACE_WORDS={top:'up',up:'up',upper:'up',above:'up',
  bottom:'down',down:'down',under:'down',underneath:'down',below:'down',beneath:'down',
  front:'front',forward:'front',forwards:'front',facing:'front',toward:'front',towards:'front',ahead:'front'};
const SMART_PLACE_NAMES={up:'top',down:'bottom',front:'front'};
// The small words around a command.
const SMART_FILLER=new Set(['the','a','an','is','are','on','at','in','of','to','my','me','with','and','then','cube','side','face','color','colour','colors',
  'has','its','it','please','now','put','hold','holding','held','i','im','am','ok','okay','hey','so','um','uh','twistwright','orientation','position','set','goes','go']);
// "Clear" with the words that may go with it: "clear moves", "clear the list", "clear them please".
const SMART_CLEAR_WORDS=new Set(['clear','clean','empty']);
const SMART_CLEAR_AROUND=new Set(['the','my','moves','move','list','history','it','them','all','please','now','ok','okay','hey','out','up']);
// "Reset" with the words that may go with it: "reset the cube", "reset view", "reset it please".
const SMART_RESET_WORDS=new Set(['reset','reseat']);
const SMART_RESET_AROUND=new Set(['the','my','cube','view','it','please','now','position','orientation','q','cue','queue','you','everything','all','moves','move','list','ok','okay','hey']);
// Lower case, letters and digits only, "re set" as one word.
function smartWords(text){
  const ws=String(text).toLowerCase().replace(/\b([xyz])\s*['’′]/g,'$1 prime').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean),out=[];
  for(let i=0;i<ws.length;i++){if(ws[i]==='re'&&ws[i+1]==='set'){out.push('reset');i++;}else out.push(ws[i]);}
  return out;}
const smartCap=s=>s[0].toUpperCase()+s.slice(1);
// A turn of the whole cube: the words a recognizer gives for each letter, the words that make it a
// prime ("x prime", "x counterclockwise", "back x") or a double ("x two"), and the small words around.
const SMART_AXIS_WORDS={x:'x',ex:'x',ecks:'x',eks:'x',x2:'x2',y:'y',why:'y',wye:'y',y2:'y2',z:'z',zee:'z',zed:'z',z2:'z2'};
const SMART_PRIME_WORDS=new Set(['prime','primed','prim','counter','counterclockwise','anticlockwise','anti','back','backward','backwards','reverse','inverse','inverted','minus']);
const SMART_DOUBLE_WORDS=new Set(['two','2','double','twice','half']);
const SMART_TURN_AROUND=new Set(['turn','rotate','rotation','the','whole','cube','a','do','please','now','ok','okay','hey','so','then','it','clockwise','way','one','time']);
// {cmd:'turn', m, sure} for a sentence that is one turn of the whole cube, else null. `sure` is
// false for a letter alone: more words may yet come ("x" then "x prime").
function smartTurn(ws){
  let axis=null,prime=false,dbl=false,sure=false;
  for(const w of ws){
    const a=SMART_AXIS_WORDS[w];
    if(a){if(axis)return null;axis=a[0];if(a[1]){dbl=sure=true;}continue;}
    if(SMART_PRIME_WORDS.has(w)){prime=sure=true;continue;}
    if(SMART_DOUBLE_WORDS.has(w)){dbl=sure=true;continue;}
    if(w==='clockwise'){sure=true;continue;}
    if(!SMART_TURN_AROUND.has(w))return null;}
  if(!axis)return null;
  return {cmd:'turn',m:axis+(dbl?'2':prime?"'":''),sure};}
// What a sentence asks for: {cmd:'reset'}, {cmd:'clear'}, {cmd:'turn', m, sure} (smartTurn), {cmd:'hold', up,
// front} (a color index, or null for unsaid), {cmd:'error', msg} for a hold that cannot be, or null
// for no command. A sentence is a command only when every word of it is part of one: a place word
// with its color ("top yellow", "yellow on top", "green toward me"), "reset", "clear moves", a turn ("x prime"),
// and the small words around them.
function smartCommand(text){
  const ws=smartWords(text);if(!ws.length)return null;
  const rest=ws.filter(w=>!SMART_RESET_AROUND.has(w));
  if(rest.length&&rest.every(w=>SMART_RESET_WORDS.has(w)))return {cmd:'reset'};
  const clr=ws.filter(w=>!SMART_CLEAR_AROUND.has(w));
  if(clr.length===1&&SMART_CLEAR_WORDS.has(clr[0]))return {cmd:'clear'};
  const turn=smartTurn(ws);if(turn)return turn;
  const items=[];
  for(const w of ws){
    if(SMART_FILLER.has(w))continue;
    if(SMART_PLACE_WORDS[w])items.push({place:SMART_PLACE_WORDS[w]});
    else if(SMART_COLOR_WORDS[w]!=null)items.push({color:SMART_COLOR_WORDS[w]});
    else return null;} // a word that is no part of a command: talk
  // Each color takes the place word before it, else the one after it.
  const at={};let pairs=0;
  for(let i=0;i<items.length;i++){const it=items[i];if(it.color==null)continue;
    const j=i>0&&items[i-1].place&&!items[i-1].used?i-1:i+1<items.length&&items[i+1].place&&!items[i+1].used?i+1:-1;
    if(j<0)continue;
    items[j].used=true;it.used=true;const p=items[j].place;
    if(at[p]!=null&&at[p]!==it.color)return {cmd:'error',msg:`Two colors for the ${SMART_PLACE_NAMES[p]}. Say one.`};
    at[p]=it.color;pairs++;}
  if(!pairs||items.some(x=>!x.used))return null;
  const opp=c=>(c+3)%6,N=SMART_COLOR_NAMES;
  let up=at.up==null?null:at.up;const down=at.down==null?null:at.down,front=at.front==null?null:at.front;
  if(up!=null&&down!=null&&opp(up)!==down)return {cmd:'error',msg:`${smartCap(N[up])} and ${N[down]} are not opposite faces. Say the top color and the front color.`};
  if(up==null&&down!=null)up=opp(down);
  if(front!=null&&up!=null&&(front===up||front===opp(up)))return {cmd:'error',msg:`${smartCap(N[front])} cannot face you with ${N[up]} on top.`};
  return {cmd:'hold',up,front};}
