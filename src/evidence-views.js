// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Private attachment cards. Every URL points to a route with the ticket's original
// authorization checks; no ticket-file storage path is ever exposed to the browser.
import {icon} from './icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const IMAGE_TYPES=new Set(['image/png','image/jpeg','image/gif','image/webp']);
const VIDEO_TYPES=new Set(['video/mp4','video/webm','video/quicktime']);
export const evidenceKind=type=>IMAGE_TYPES.has(type)?'image':VIDEO_TYPES.has(type)?'video':'file';
const labelFor=file=>String(file.original_name||'Evidence').slice(0,100);
const bytesLabel=size=>size>=1048576?(size/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(size/1024))+' KB';

/** Non-JavaScript fallback is the existing authenticated file download. */
export function evidenceGallery(attachments=[],base='/tickets/attachments',compact=false){
  if(!attachments.length)return '';
  return '<div class="evidence-gallery'+(compact?' evidence-gallery-compact':'')+'" aria-label="Private ticket evidence">'+
    attachments.map(item=>{
      const id=Number(item.id),kind=evidenceKind(item.mime_type);
      if(!Number.isSafeInteger(id)||id<1)return '';
      const path=base+'/'+id,preview=path+'?preview=1';
      const filename=esc(labelFor(item)),size=bytesLabel(Number(item.file_size)||0);
      const thumbnail=kind==='image'
        ?'<img loading="lazy" decoding="async" src="'+preview+'" alt="Preview of '+filename+'">'
        :'<span class="evidence-type-icon">'+icon(kind==='video'?'video':'file-image',{size:32})+
           (kind==='video'?'<span class="evidence-play">'+icon('play',{size:16})+'</span>':'')+'</span>';
      const open=kind==='file'
        ?'<a class="evidence-thumb" href="'+path+'" aria-label="Download '+filename+'">'+thumbnail+'</a>'
        :'<button type="button" class="evidence-thumb" data-evidence-open data-evidence-url="'+preview+
           '" data-evidence-download="'+path+'" data-evidence-kind="'+kind+'" data-evidence-name="'+filename+
           '" aria-label="View '+filename+'">'+thumbnail+'</button>';
      return '<article class="evidence-card">'+open+
        '<div class="evidence-card-footer"><span class="evidence-card-name" title="'+filename+'">'+filename+
        '<small>'+size+'</small></span><a class="evidence-download" href="'+path+
        '" aria-label="Download '+filename+'" title="Download '+filename+'">'+icon('download',{size:18})+'</a></div></article>';
    }).join('')+'</div>';
}
