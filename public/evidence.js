// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// V1.5.3: private ticket evidence viewer + preview-before-submit.
// The server, not this script, is responsible for checking every media request.
(() => {
  const dialog=document.querySelector('[data-evidence-dialog]');
  const galleryButtons=()=>Array.from(document.querySelectorAll('button[data-evidence-open]'));
  const names=new Set(['image','video']);
  const validSource=(button,raw)=>{
    if(!raw)return false;
    if(raw.startsWith('blob:'))return !!button.closest('[data-evidence-preupload]');
    try{
      const url=new URL(raw,location.href);
      return url.origin===location.origin&&
        /^\/(?:tickets|applications)\/attachments\/\d+$/.test(url.pathname)&&
        url.searchParams.get('preview')==='1';
    }catch{return false;}
  };
  const sizeLabel=bytes=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(bytes/1024))+' KB';
  let selected=null,scale=1,dialogOpen=false;
  const media=dialog?.querySelector('[data-evidence-media]');
  const title=dialog?.querySelector('[data-evidence-title]');
  const index=dialog?.querySelector('[data-evidence-index]');
  const download=dialog?.querySelector('[data-evidence-download]');
  const zoomIn=dialog?.querySelector('[data-evidence-zoom-in]');
  const zoomOut=dialog?.querySelector('[data-evidence-zoom-out]');
  const reset=dialog?.querySelector('[data-evidence-reset]');
  const prev=dialog?.querySelector('[data-evidence-prev]');
  const next=dialog?.querySelector('[data-evidence-next]');
  const zoomLabel=dialog?.querySelector('[data-evidence-zoom-level]');
  let activeElement=null;

  const applyScale=()=>{
    if(activeElement?.tagName==='IMG'&&activeElement.naturalWidth&&media){
      // Scale the actual image dimensions, not a CSS transform: overflow remains
      // scrollable so corners of enlarged screenshots are reachable on mobile.
      const bounds=media.getBoundingClientRect();
      const fit=Math.min(bounds.width/activeElement.naturalWidth,bounds.height/activeElement.naturalHeight,1);
      if(Number.isFinite(fit)&&fit>0){
        const x=(media.scrollLeft+bounds.width/2)/Math.max(1,media.scrollWidth);
        const y=(media.scrollTop+bounds.height/2)/Math.max(1,media.scrollHeight);
        const w=Math.max(1,Math.round(activeElement.naturalWidth*fit*scale));
        const h=Math.max(1,Math.round(activeElement.naturalHeight*fit*scale));
        activeElement.style.width=w+'px';
        activeElement.style.height=h+'px';
        activeElement.style.maxWidth='none';
        activeElement.style.maxHeight='none';
        activeElement.style.marginTop=Math.max(0,Math.round((bounds.height-h)/2))+'px';
        media.scrollLeft=Math.max(0,x*media.scrollWidth-bounds.width/2);
        media.scrollTop=Math.max(0,y*media.scrollHeight-bounds.height/2);
      }
    }
    if(zoomLabel)zoomLabel.textContent=Math.round(scale*100)+'%';
    if(zoomIn)zoomIn.disabled=!activeElement||activeElement.tagName!=='IMG'||scale>=4;
    if(zoomOut)zoomOut.disabled=!activeElement||activeElement.tagName!=='IMG'||scale<=1;
    if(reset)reset.disabled=!activeElement||activeElement.tagName!=='IMG'||scale===1;
  };
  const showEvidence=button=>{
    const kind=button?.dataset.evidenceKind,url=button?.dataset.evidenceUrl||'';
    if(!names.has(kind)||!validSource(button,url))return false;
    const name=(button.dataset.evidenceName||'Evidence').slice(0,110);
    scale=1;
    const element=document.createElement(kind==='image'?'img':'video');
    element.className='evidence-lightbox-item';
    if(kind==='image'){
      element.alt=name;
      element.decoding='async';
      element.draggable=false;
    }else{
      element.controls=true;
      element.playsInline=true;
      element.preload='metadata';
      element.setAttribute('controlsList','nodownload noplaybackrate');
      element.setAttribute('aria-label',name);
    }
    // Setting the URL only after validating its origin/path avoids unsafe redirects.
    if(kind==='image')element.addEventListener('load',applyScale,{once:true});
    element.src=url;
    media.replaceChildren(element);
    media.classList.toggle('is-video',kind==='video');
    media.scrollLeft=0;media.scrollTop=0;
    activeElement=element;
    title.textContent=name;
    const group=galleryButtons(),current=group.indexOf(button);
    index.textContent=(current>=0?current+1:1)+' / '+group.length;
    prev.disabled=group.length<2;
    next.disabled=group.length<2;
    const href=button.dataset.evidenceDownload||'';
    const local=href.startsWith('blob:')&&button.closest('[data-evidence-preupload]');
    if(local){
      download.href=href;
      download.download=name;
      download.hidden=false;
    }else if(/^\/(?:tickets|applications)\/attachments\/\d+$/.test(href)){
      download.href=href;
      download.removeAttribute('download');
      download.hidden=false;
    }else{
      download.hidden=true;
    }
    if(!dialog.open)dialog.showModal();
    applyScale();
    selected=button;
    dialogOpen=true;
    return true;
  };
  const navigate=delta=>{
    const group=galleryButtons();if(!group.length||!selected)return;
    const current=group.indexOf(selected);
    if(current<0)return;
    showEvidence(group[(current+delta+group.length)%group.length]);
  };
  const magnify=delta=>{
    if(activeElement?.tagName!=='IMG')return;
    scale=Math.max(1,Math.min(4,Math.round((scale+delta)*100)/100));
    applyScale();
  };
  if(dialog){
    // Delegation includes previews created later from file-selection changes.
    document.addEventListener('click',event=>{
      const button=event.target.closest('button[data-evidence-open]');
      if(!button)return;
      if(!showEvidence(button))return;
    });
    dialog.querySelector('[data-evidence-close]')?.addEventListener('click',()=>dialog.close());
    prev?.addEventListener('click',()=>navigate(-1));
    next?.addEventListener('click',()=>navigate(1));
    zoomIn?.addEventListener('click',()=>magnify(.25));
    zoomOut?.addEventListener('click',()=>magnify(-.25));
    reset?.addEventListener('click',()=>{scale=1;applyScale();});
    dialog.addEventListener('click',event=>{
      if(event.target===dialog)dialog.close();
    });
    dialog.addEventListener('close',()=>{
      media.replaceChildren(); // Stops videos and removes previous media sources.
      activeElement=null;
      dialogOpen=false;
      const focus=selected;
      selected=null;
      if(focus?.isConnected)focus.focus({preventScroll:true});
    });
    document.addEventListener('keydown',event=>{
      if(!dialogOpen)return;
      if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1);}
      else if(event.key==='ArrowRight'){event.preventDefault();navigate(1);}
      else if(event.key==='+'||event.key==='='){event.preventDefault();magnify(.25);}
      else if(event.key==='-'){event.preventDefault();magnify(-.25);}
      else if(event.key==='0'){event.preventDefault();scale=1;applyScale();}
      // Escape uses the dialog's native cancel behavior.
    });
  }

  const createdUrls=new Set();
  const fieldUrls=new WeakMap();
  for(const field of document.querySelectorAll('input[type="file"][name="evidence"]')){
    const anchor=field.closest('.support-upload-label, .ticket-compose-actions')||field.parentElement;
    if(!anchor)continue;
    const preview=document.createElement('section');
    preview.className='evidence-upload-preview';
    preview.dataset.evidencePreupload='';
    preview.hidden=true;
    anchor.insertAdjacentElement('afterend',preview);
    field.addEventListener('change',()=>{
      for(const url of fieldUrls.get(field)||[]){URL.revokeObjectURL(url);createdUrls.delete(url);}
      const urls=[];fieldUrls.set(field,urls);
      preview.replaceChildren();
      const files=Array.from(field.files||[]);
      preview.hidden=!files.length;
      if(!files.length)return;
      const heading=document.createElement('h4');
      heading.textContent='Selected evidence — not uploaded yet';
      preview.append(heading);
      if(files.length>5){
        const warning=document.createElement('p');warning.className='evidence-warning';
        warning.setAttribute('role','alert');
        warning.textContent='Choose up to five files before submitting.';
        preview.append(warning);
      }
      const gallery=document.createElement('div');gallery.className='evidence-gallery evidence-gallery-compact';
      for(const file of files){
        const image=['image/jpeg','image/png','image/gif','image/webp'].includes(file.type);
        const video=['video/mp4','video/webm','video/quicktime'].includes(file.type);
        const validSize=file.size>0&&file.size<=12*1024*1024;
        const url=image||video?URL.createObjectURL(file):'';
        if(url){urls.push(url);createdUrls.add(url);}
        const card=document.createElement('article');card.className='evidence-card';
        const tile=document.createElement('button');tile.type='button';tile.className='evidence-thumb';
        tile.disabled=!url;
        if(url){tile.dataset.evidenceOpen='';tile.dataset.evidenceUrl=url;tile.dataset.evidenceDownload=url;
          tile.dataset.evidenceKind=image?'image':'video';tile.dataset.evidenceName=file.name;}
        if(image){
          const img=document.createElement('img');img.src=url;img.alt='Preview of '+file.name;
          img.loading='lazy';tile.append(img);
        }else{
          const glyph=document.createElement('span');glyph.className='evidence-type-icon';
          glyph.textContent=video?'▶ Video':'Unsupported';
          tile.append(glyph);
        }
        const footer=document.createElement('div');footer.className='evidence-card-footer';
        const name=document.createElement('span');name.className='evidence-card-name';
        name.textContent=file.name;
        const size=document.createElement('small');size.textContent=sizeLabel(file.size);
        name.append(size);footer.append(name);
        if(!validSize||!url){
          const warning=document.createElement('small');warning.className='evidence-warning';
          warning.textContent=!validSize?'File exceeds the 12 MB limit or is empty.':'Unsupported file type.';
          card.append(tile,footer,warning);
        }else card.append(tile,footer);
        gallery.append(card);
      }
      preview.append(gallery);
    });
  }
  window.addEventListener('pagehide',()=>{
    for(const url of createdUrls)URL.revokeObjectURL(url);
    createdUrls.clear();
  });
})();
