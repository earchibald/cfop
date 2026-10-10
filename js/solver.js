// ---------- Kociemba two-phase solver ----------
const TP={ready:false};
function _rankPerm(p,n){ // Lehmer rank of p[0..n-1] (values 0..n-1)
  let r=0;for(let i=0;i<n;i++){let k=0;for(let j=i+1;j<n;j++)if(p[j]<p[i])k++;r=r*(n-i)+k;}return r;}
function _unrankPerm(r,n){const code=new Array(n);for(let i=n-1;i>=0;i--){code[i]=r%(n-i);r=Math.floor(r/(n-i));}
  const pool=[];for(let i=0;i<n;i++)pool.push(i);const p=new Array(n);for(let i=0;i<n;i++)p[i]=pool.splice(code[i],1)[0];return p;}
const _combIdx=new Int16Array(4096).fill(-1),_combMask=[];
(()=>{for(let m=0;m<4096;m++){let b=0,x=m;while(x){b+=x&1;x>>=1;}if(b===4){_combIdx[m]=_combMask.length;_combMask.push(m);}}})();
const tpTwist=c=>{let t=0;for(let i=0;i<7;i++)t=t*3+c.co[i];return t;};
const tpFlip=c=>{let t=0;for(let i=0;i<11;i++)t=t*2+c.eo[i];return t;};
const tpSlice=c=>{let m=0;for(let i=0;i<12;i++)if(c.ep[i]>=8)m|=1<<i;return _combIdx[m];};
const tpCP=c=>_rankPerm(c.cp,8);
const tpEP=c=>_rankPerm(c.ep,8);
const tpSP=c=>_rankPerm(c.ep.slice(8).map(x=>x-8),4);
function _cubeTwist(t){const c=new Cube();let s=0;for(let i=6;i>=0;i--){c.co[i]=t%3;s+=c.co[i];t=Math.floor(t/3);}c.co[7]=(3-s%3)%3;return c;}
function _cubeFlip(t){const c=new Cube();let s=0;for(let i=10;i>=0;i--){c.eo[i]=t%2;s+=c.eo[i];t=t>>1;}c.eo[11]=s%2;return c;}
function _cubeSlice(k){const c=new Cube();const m=_combMask[k];let a=8,b=0;for(let i=0;i<12;i++)c.ep[i]=(m>>i)&1?a++:b++;return c;}
function _cubeCP(r){const c=new Cube();c.cp=_unrankPerm(r,8);return c;}
function _cubeEP(r){const c=new Cube();const p=_unrankPerm(r,8);c.ep=[...p,8,9,10,11];return c;}
function _cubeSP(r){const c=new Cube();const p=_unrankPerm(r,4);c.ep=[0,1,2,3,4,5,6,7,...p.map(x=>x+8)];return c;}
const TP_P2=['U','U2',"U'",'D','D2',"D'",'R2','L2','F2','B2'];
function _moveTable(n,make,read,moves){const t=new Uint16Array(n*moves.length);const ms=moves.map(m=>MOVES[m]);
  for(let i=0;i<n;i++){const c=make(i);for(let j=0;j<ms.length;j++)t[i*ms.length+j]=read(c.mul(ms[j]));}return t;}
function _prune(nA,nB,mtA,mtB,nm,start=0){const N=nA*nB,t=new Int8Array(N).fill(-1);t[start]=0;let done=1,d=0;
  while(done<N){let found=0;for(let i=0;i<N;i++){if(t[i]!==d)continue;const a=(i/nB)|0,b=i-a*nB;
      for(let m=0;m<nm;m++){const j=mtA[a*nm+m]*nB+mtB[b*nm+m];if(t[j]<0){t[j]=d+1;done++;found++;}}}
    d++;if(!found)break;}return t;}
function buildTwoPhase(){
  if(TP.ready)return;const t0=Date.now();
  TP.moves=FACE_MOVES;TP.p2=TP_P2;
  TP.twist=_moveTable(2187,_cubeTwist,tpTwist,FACE_MOVES);
  TP.flip=_moveTable(2048,_cubeFlip,tpFlip,FACE_MOVES);
  TP.slice=_moveTable(495,_cubeSlice,tpSlice,FACE_MOVES);
  TP.cp=_moveTable(40320,_cubeCP,tpCP,TP_P2);
  TP.ep=_moveTable(40320,_cubeEP,tpEP,TP_P2);
  TP.sp=_moveTable(24,_cubeSP,tpSP,TP_P2);
  TP.pTS=_prune(2187,495,TP.twist,TP.slice,18,tpSlice(new Cube()));
  TP.pFS=_prune(2048,495,TP.flip,TP.slice,18,tpSlice(new Cube()));
  TP.pCS=_prune(40320,24,TP.cp,TP.sp,10);
  TP.pES=_prune(40320,24,TP.ep,TP.sp,10);
  // face of each move, for pruning repeated faces / commuting opposite faces
  TP.face1=FACE_MOVES.map(m=>'URFDLB'.indexOf(m[0]));TP.face2=TP_P2.map(m=>'URFDLB'.indexOf(m[0]));
  TP.ready=true;TP.buildMs=Date.now()-t0;
}
function _okNext(prev,f){if(prev<0)return true;if(prev===f)return false;if(prev===f+3)return false;return true;} // opposite faces in fixed order only
// solveTwoPhase(cube, {maxLen, timeMs}) -> array of face moves that solves cube (faces only, centres must be standard)
function solveTwoPhase(cube,opt={}){
  buildTwoPhase();
  const maxLenStart=opt.maxLen||22,deadline=Date.now()+(opt.timeMs||1500);
  if(cube.isSolved())return [];
  let best=null,limit=maxLenStart;const path1=[];
  const T=TP;
  function phase2(c,maxD){
    const cp0=tpCP(c),ep0=tpEP(c),sp0=tpSP(c);const path=[];
    const h=(a,b,s)=>Math.max(T.pCS[a*24+s],T.pES[b*24+s]);
    function dfs(a,b,s,d,prev){const hv=h(a,b,s);if(hv===0)return true;if(hv>d)return false;
      for(let m=0;m<10;m++){const f=T.face2[m];if(!_okNext(prev,f))continue;
        path.push(m);if(dfs(T.cp[a*10+m],T.ep[b*10+m],T.sp[s*10+m],d-1,f))return true;path.pop();}
      return false;}
    for(let d=h(cp0,ep0,sp0);d<=maxD;d++){path.length=0;if(dfs(cp0,ep0,sp0,d,-1))return path.map(m=>T.p2[m]);}
    return null;
  }
  let stop=false;
  function dfs1(tw,fl,sl,d,prev){
    if(stop)return;
    const hv=Math.max(T.pTS[tw*495+sl],T.pFS[fl*495+sl]);
    if(hv===0&&d===0){ // reached H; last move must not be a phase-2 move (else phase 2 covers it)
      if(path1.length){const lm=FACE_MOVES[path1[path1.length-1]];if('UD'.includes(lm[0])||lm.endsWith('2'))return;}
      const c=applyAlg(cube,path1.map(m=>FACE_MOVES[m]));const rest=limit-path1.length;
      const p2=phase2(c,rest);
      if(p2){const sol=simplify([...path1.map(m=>FACE_MOVES[m]),...p2]);if(!best||sol.length<best.length){best=sol;limit=sol.length-1;}if(best.length<=(opt.target||20))stop=true;}
      if(Date.now()>deadline&&best)stop=true;
      return;
    }
    if(hv>d||d===0)return;
    for(let m=0;m<18;m++){const f=T.face1[m];if(!_okNext(prev,f))continue;
      path1.push(m);dfs1(T.twist[tw*18+m],T.flip[fl*18+m],T.slice[sl*18+m],d-1,f);path1.pop();if(stop)return;}
  }
  const tw=tpTwist(cube),fl=tpFlip(cube),sl=tpSlice(cube);
  for(let d1=Math.max(T.pTS[tw*495+sl],T.pFS[fl*495+sl]);d1<=limit&&!stop;d1++){
    if(d1===0){const p2=phase2(cube,limit);if(p2){best=p2;if(best.length<=(opt.target||20))break;limit=best.length-1;}continue;}
    dfs1(tw,fl,sl,d1,-1);
    if(Date.now()>deadline&&best)break;
  }
  return best;
}

