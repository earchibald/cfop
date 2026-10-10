// ================= Camera scanner =================
// Reads a real cube from the webcam, one face at a time. See docs/scanner-handoff.md.
let scanStream=null;
function openScan(){
  if($('#scanBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='scanBg';
  bg.innerHTML=`<div class="modal scan" role="dialog" aria-label="Scan cube">
   <button class="close small ghost" id="scanClose" aria-label="Close">✕</button>
   <h2>Scan cube</h2>
   <p class="muted" style="margin-top:0">Hold one face of the cube to the camera. Turn the cube to show the next face.</p>
   <div class="scan-view mirror" id="scanView"><video id="scanVideo" autoplay playsinline muted></video><canvas id="scanOverlay"></canvas></div>
   <div class="scan-row"><label><input type="checkbox" id="scanMirror" checked> Mirror</label></div>
   <div id="scanStatus" class="notice">Asking for camera access.</div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeScan();});
  $('#scanClose').onclick=closeScan;
  $('#scanMirror').onchange=e=>$('#scanView').classList.toggle('mirror',e.target.checked);
  document.addEventListener('keydown',scanKeys,true);
  startCamera();
}
async function startCamera(){
  const st=$('#scanStatus');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){st.textContent='This browser cannot open the camera here. Use https or localhost.';return;}
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
    if(!$('#scanBg')){s.getTracks().forEach(t=>t.stop());return;} // closed while the prompt was open
    scanStream=s;const v=$('#scanVideo');v.srcObject=s;await v.play().catch(()=>{});
    const t=s.getVideoTracks()[0],cfg=t.getSettings?t.getSettings():{};
    st.textContent=`Camera on: ${t.label||'webcam'}${cfg.width?` at ${cfg.width}x${cfg.height}`:''}.`;
  }catch(e){
    st.textContent=e.name==='NotAllowedError'?'Camera access was refused. Allow the camera for this site in the browser settings, then open the scanner again.'
      :e.name==='NotFoundError'?'No camera was found.':'The camera did not start: '+(e.message||e.name);
  }
}
function stopCamera(){if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}}
function closeScan(){document.removeEventListener('keydown',scanKeys,true);stopCamera();const b=$('#scanBg');if(b)b.remove();}
function scanKeys(e){
  if(!$('#scanBg'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeScan();return;}
  e.stopPropagation(); // keep tab/timer keys out while the scanner is open
}
$('#camBtn').onclick=openScan;
