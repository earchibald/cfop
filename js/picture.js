// ===================== PICTURE OUT =====================
// A cube picture on the page as an image file. pictureSVG(svg) gives a standalone SVG: every
// var(--…) color resolved to the theme's value, the parts CSS hides dropped (a What it moves mark
// not chosen, the Color Blind Assist letters while that is off), the colors that CSS gives by
// class written on the element, and the cube background behind it all. pictureSave(svg, name) draws
// that SVG on a canvas at twice its size and saves it as a PNG file. Loads after draw.js.
const PICTURE_PROPS=['fill','stroke','stroke-width','opacity','font-family','font-size','font-weight'];
function pictureVar(v,root){
  // var(--a) and var(--a, fallback), nested as the theme writes them
  for(let k=0;k<6&&/var\(/.test(v);k++)v=v.replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*))?\)/g,(m,name,fb)=>{const r=root.getPropertyValue(name).trim();return r||(fb||'').trim()||'#888';});
  return v;}
function pictureSVG(svg,opts={}){
  const root=getComputedStyle(document.documentElement),clone=svg.cloneNode(true);
  const vb=(svg.getAttribute('viewBox')||'0 0 400 360').split(/[\s,]+/).map(Number);
  // Walk the picture and its copy side by side: the copy drops what CSS hides and takes the colors CSS gives.
  const walk=(a,b)=>{const ka=[...a.children],kb=[...b.children];
    ka.forEach((x,i)=>{const y=kb[i];let cs=null;try{cs=getComputedStyle(x);}catch(e){}
      if(cs&&cs.display==='none'){y.remove();return;}
      for(const at of [...y.attributes])if(/var\(/.test(at.value))y.setAttribute(at.name,pictureVar(at.value,root));
      if(cs&&(x.getAttribute('class')||'').trim()){const st=[];for(const p of PICTURE_PROPS){const v=cs.getPropertyValue(p);if(v&&!/var\(/.test(v)&&v!=='none'||p==='fill'&&v==='none')st.push(`${p}:${v}`);}
        if(st.length)y.setAttribute('style',st.join(';')+';'+(y.getAttribute('style')||''));}
      walk(x,y);});};
  walk(svg,clone);
  clone.removeAttribute('class');clone.removeAttribute('id');clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox',vb.join(' '));clone.setAttribute('width',String(vb[2]));clone.setAttribute('height',String(vb[3]));
  const bg=opts.bg||pictureVar('var(--cube-bg, var(--panel, #ffffff))',root);
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
  [['x',vb[0]],['y',vb[1]],['width',vb[2]],['height',vb[3]],['fill',bg]].forEach(([k,v])=>rect.setAttribute(k,String(v)));
  clone.insertBefore(rect,clone.firstChild);
  return new XMLSerializer().serializeToString(clone);}
// A file name from a title: "twistwright-t-perm.png".
function pictureName(title){return 'twistwright-'+(String(title||'cube').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cube')+'.png';}
// Save the picture as a PNG file, twice the size of its viewBox. done(ok) reports the end.
function pictureSave(svg,title,done){
  const text=pictureSVG(svg),vb=(svg.getAttribute('viewBox')||'0 0 400 360').split(/[\s,]+/).map(Number),k=2;
  const img=new Image();const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
  img.onload=()=>{const cv=document.createElement('canvas');cv.width=Math.round(vb[2]*k);cv.height=Math.round(vb[3]*k);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
    cv.toBlob(b=>{if(!b){if(done)done(false);return;}const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=pictureName(title);
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);if(done)done(true);},'image/png');};
  img.onerror=()=>{URL.revokeObjectURL(url);if(done)done(false);};
  img.src=url;}
// A Save image button: saves the picture it is given, and says "Saved" for a moment.
function pictureButton(btn,getSvg,getTitle){btn.onclick=()=>{const svg=getSvg();if(!svg)return;const was=btn.lastChild.textContent;
  pictureSave(svg,getTitle(),ok=>{btn.lastChild.textContent=ok?'Saved':'Not saved';setTimeout(()=>{btn.lastChild.textContent=was;},1500);});};}
