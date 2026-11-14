// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Shared, accessible enhancements. Server-rendered routes remain usable without JavaScript.
(() => {
 const user=document.body.dataset.siteUser||'',csrf=document.body.dataset.siteCsrf||'';
 const safeStorage={get:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}},remove:k=>{try{sessionStorage.removeItem(k);}catch{}}};
 // Keep drafts in this tab only, scoped to the signed-in account and exact form.
 for(const form of document.querySelectorAll('form[method="post"]')){
  if(!user||form.action.includes('/auth/'))continue;
  const fields=[...form.querySelectorAll('textarea[name],input[type="text"][name],input:not([type])[name]')].filter(f=>!f.readOnly&&!/token|password|secret|snapshot|json|note/i.test(f.name));
  if(!fields.length)continue;
  const key='sb-draft:'+user+':'+new URL(form.action).pathname;
  let saved;try{saved=JSON.parse(safeStorage.get(key)||'null');}catch{}
  if(saved&&Date.now()-saved.at<86400000)for(const f of fields)if(!f.value&&typeof saved.values?.[f.name]==='string')f.value=saved.values[f.name];
  const persist=()=>safeStorage.set(key,JSON.stringify({at:Date.now(),values:Object.fromEntries(fields.map(f=>[f.name,f.value]))}));
  form.addEventListener('input',persist);
  form.addEventListener('sb:submitted',()=>safeStorage.remove(key));
  // Remove after a verified successful redirect, not on a failed submission.
  const pending='sb-form-pending:'+user;
  form.addEventListener('submit',()=>safeStorage.set(pending,JSON.stringify({key,path:location.pathname})));
  try{const previous=JSON.parse(safeStorage.get(pending)||'null');if(previous&&location.pathname!==previous.path&&document.querySelector('.alert-success')){safeStorage.remove(previous.key);safeStorage.remove(pending);}}catch{}
 }
 // Styled uploads share one preview/removal control. Object URLs are always revoked.
 for(const input of document.querySelectorAll('input[type="file"]')){
  input.dataset.uploadEnhanced='1';
  const previews=document.createElement('div');previews.className='upload-previews';previews.setAttribute('aria-live','polite');
  const host=input.closest('label')||input;host.insertAdjacentElement('afterend',previews);
  let urls=[];
  const render=()=>{
   urls.forEach(URL.revokeObjectURL);urls=[];previews.replaceChildren();
   [...input.files||[]].forEach((file,index)=>{
    const box=document.createElement('div');box.className='upload-preview';
    if(file.type.startsWith('image/')||file.type.startsWith('video/')){
     const media=document.createElement(file.type.startsWith('video/')?'video':'img');
     const url=URL.createObjectURL(file);urls.push(url);media.src=url;
     if(media.tagName==='VIDEO'){media.controls=true;media.preload='metadata';}else media.alt=file.name;
     box.append(media);
    }
    const label=document.createElement('small');label.textContent=file.name+' · '+(file.size/1048576).toFixed(2)+' MB';
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-outline btn-xs';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+file.name);
    remove.addEventListener('click',()=>{const transfer=new DataTransfer();[...input.files].filter((_,i)=>i!==index).forEach(f=>transfer.items.add(f));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
    box.append(label,remove);previews.append(box);
   });
   const max=input.closest('[data-dm-send]')?3:input.name==='image'?1:5;
   const size=input.name==='image'?4:12;
   const bad=[...input.files||[]].some(f=>f.size>size*1048576)||(input.files?.length||0)>max;
   input.setCustomValidity(bad?'Choose up to '+max+' files, each no larger than '+size+' MB.':'');
   if(bad){const error=document.createElement('p');error.className='danger-text';error.textContent=input.validationMessage;previews.append(error);}
  };
  input.addEventListener('change',render);
  input.form?.addEventListener('reset',()=>setTimeout(render,0));
  window.addEventListener('pagehide',()=>urls.forEach(URL.revokeObjectURL));
 }
 for(const el of document.querySelectorAll('[data-wait-since]')){
  const minutes=Math.max(0,Math.floor((Date.now()-Number(el.dataset.waitSince))/60000));
  el.textContent=minutes<60?minutes+'m waiting':minutes<1440?Math.floor(minutes/60)+'h waiting':Math.floor(minutes/1440)+'d waiting';
 }
 const filters=document.querySelector('[data-case-filters]');
 if(filters){
  const rows=[...document.querySelectorAll('tr[data-case-type]')];
  const sort=filters.querySelector('[data-case-sort]');
  const query=filters.querySelector('[data-case-search]'),type=filters.querySelector('[data-case-type]'),status=filters.querySelector('[data-case-status]');
  const update=()=>{const rank=s=>s==='awaiting_owner'?0:s==='awaiting_staff'?1:s==='open'?2:3;const sorted=[...rows].sort((a,b)=>sort.value==='attention'?rank(a.dataset.caseStatus)-rank(b.dataset.caseStatus):sort.value==='waiting'?Number(a.dataset.updated)-Number(b.dataset.updated):Number(b.dataset.updated)-Number(a.dataset.updated));for(const row of sorted)row.parentElement.append(row);let count=0;for(const row of rows){row.hidden=!!((query.value&&!row.textContent.toLowerCase().includes(query.value.toLowerCase()))||(type.value&&row.dataset.caseType!==type.value)||(status.value&&row.dataset.caseStatus!==status.value));if(!row.hidden)count++;}document.querySelector('[data-case-result]').textContent=count+' of '+rows.length+' cases'+(!count?' · No results. Reset Filters to see all cases.':'');};
  filters.addEventListener('input',update);filters.addEventListener('change',update);filters.querySelector('[data-case-reset]').addEventListener('click',()=>{query.value=type.value=status.value='';update();});update();
 }
 // Accessible local filtering for authorized, already-rendered lists only.
 for(const [selector,label] of [['.member-grid','Search people'],['.role-grid','Search roles'],['.social-notifications-list','Filter notifications']]){
  const containers=[...document.querySelectorAll(selector)];if(!containers.length)continue;
  const input=document.createElement('input');input.type='search';input.placeholder=label;input.setAttribute('aria-label',label);input.className='list-search';
  containers[0].before(input);
  const rows=containers.flatMap(c=>[...c.children]);
  const count=document.createElement('p');count.className='muted tiny';count.setAttribute('role','status');input.after(count);
  input.addEventListener('input',()=>{let shown=0;const q=input.value.trim().toLowerCase();for(const row of rows){row.hidden=!!q&&!row.textContent.toLowerCase().includes(q);if(!row.hidden)shown++;}count.textContent=shown+' of '+rows.length+' shown';});
 }
 const preview=document.querySelector('[data-profile-preview]');
 if(preview){const form=preview.closest('form');const render=()=>{
  preview.querySelector('[data-preview-name]').textContent=form.elements.nickname.value||document.querySelector('.account-name b')?.textContent||'Your profile';
  preview.querySelector('[data-preview-bio]').textContent=form.elements.bio.value||'Your bio appears here.';
  preview.className='profile-preview panel padded theme-'+form.elements.theme.value+' accent-'+form.elements.accent.value+' font-'+form.elements.font.value+' layout-'+form.elements.layout.value;
 };form.addEventListener('input',render);form.addEventListener('change',render);render();}
 // A compact page finder contains only navigation already authorized for this session.
 const links=[...document.querySelectorAll('.sidebar nav a')];
 if(links.length){
  const dialog=document.createElement('dialog');dialog.className='page-finder';dialog.setAttribute('aria-label','Find a page');
  const search=document.createElement('input');search.type='search';search.placeholder='Find a page…';search.setAttribute('aria-label','Page search');
  const results=document.createElement('nav');const close=document.createElement('button');close.type='button';close.className='btn btn-outline btn-sm';close.textContent='Close';close.addEventListener('click',()=>dialog.close());dialog.append(search,results,close);document.body.append(dialog);
  const update=()=>{results.replaceChildren();for(const link of links.filter(l=>l.textContent.toLowerCase().includes(search.value.toLowerCase()))){const a=document.createElement('a');a.href=link.getAttribute('href');a.textContent=link.textContent;a.className='nav-link';results.append(a);}};
  const button=document.createElement('button');button.type='button';button.className='btn btn-quiet btn-sm page-find-button';button.textContent='Find page';button.setAttribute('aria-keyshortcuts','Control+k Meta+k');button.addEventListener('click',()=>{update();dialog.showModal();search.focus();});document.querySelector('.breadcrumbs')?.append(button);
  search.addEventListener('input',update);document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();button.click();}});
 }
 // Handle failed ordinary forms in place so text and file choices survive validation/network errors.
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.method.toLowerCase()!=='post'||event.defaultPrevented||form.matches('[data-dm-send],#staff-chat-form,[data-post-like],[data-post-repost],[data-post-bookmark]')||form.action.includes('/auth/'))return;
  if(event.submitter?.name==='action'&&/reveal/.test(form.action))return;
  // OAuth and one-time reveal actions keep their navigation semantics.
  if(/microsoft\/(?:start|reveal)|session\/(?:pair|download)/.test(form.action))return;
  event.preventDefault();
  if(form.dataset.sending)return;
  form.dataset.sending='1';
  const button=event.submitter;
  let message=form.querySelector('[data-form-result]');if(!message){message=document.createElement('p');message.dataset.formResult='';message.setAttribute('role','status');form.append(message);}
  message.textContent='Saving…';
  const body=new FormData(form);if(button?.name)body.append(button.name,button.value);if(button)button.disabled=true;
  try{
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:form.enctype==='multipart/form-data'?body:new URLSearchParams(body)});
   const type=response.headers.get('content-type')||'';
   if(!response.ok){let detail;try{detail=type.includes('json')?(await response.json()).error:null;}catch{}throw Error(detail||'Unable to save. Your changes are still here; try again.');}
   if(response.redirected){const target=new URL(response.url);if(target.searchParams.get('type')==='error')throw Error(target.searchParams.get('notice')||'Unable to save.');}
   form.dispatchEvent(new Event('sb:submitted'));
   if(response.redirected){location.assign(response.url);return;}
   message.textContent='Saved.';
  }catch(error){message.textContent=error.message;message.className='danger-text';}
  finally{delete form.dataset.sending;if(button)button.disabled=false;}
 });
})();
// Role filters combine availability and text without touching Discord authorization.
(() => {
 const availability=document.querySelector('[data-role-filter]');
 if(!availability)return;
 const search=document.querySelector('.role-grid')?.previousElementSibling?.previousElementSibling?.matches('.list-search')?document.querySelector('.role-grid').previousElementSibling.previousElementSibling:document.querySelector('.list-search');
 const update=()=>{for(const row of document.querySelectorAll('.role-row[data-role-kind]'))row.hidden=!!((availability.value&&row.dataset.roleKind!==availability.value)||(search?.value&&!row.textContent.toLowerCase().includes(search.value.toLowerCase())));};
 availability.addEventListener('change',update);search?.addEventListener('input',update);
})();
// Reading activity from its row clears the same account's badge on every live tab.
(() => {
 const rows=[...document.querySelectorAll('[data-notification-kind]')];
 const state=document.querySelector('[data-notification-state]'),type=document.querySelector('[data-notification-type]');
 const update=()=>{const q=document.querySelector('.list-search')?.value.toLowerCase()||'';for(const row of rows)row.hidden=!!((state.value&&row.dataset.notificationRead!==state.value)||(type.value&&row.dataset.notificationKind!==type.value)||(q&&!row.textContent.toLowerCase().includes(q)));};
 if(state&&type){state.addEventListener('change',update);type.addEventListener('change',update);document.querySelector('.list-search')?.addEventListener('input',update);}
 document.addEventListener('click',async event=>{
  const link=event.target.closest('[data-notification-open]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.button)return;
  event.preventDefault();
  try{await fetch('/notifications/'+link.dataset.notificationOpen+'/read',{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:new URLSearchParams({_csrf:document.body.dataset.siteCsrf||''})});}catch{}
  location.assign(link.href);
 });
})();
// Shared filters keep staff workflows separate and operate on the displayed, authorized records.
(() => {
 const page=document.body.dataset.page||'';
 if(!/^\/(?:staff(?:\/promotions)?|team-applications\/review|admin\/(?:moderation|dm-reports))$/.test(page))return;
 const table=document.querySelector('main table');
 if(!table)return;
 const rows=[...table.querySelectorAll('tbody>tr')];if(!rows.length)return;
 const panel=document.createElement('div');panel.className='panel padded filter-grid';
 const queryLabel=document.createElement('label');queryLabel.textContent='Search displayed cases';const query=document.createElement('input');query.type='search';query.placeholder='Applicant, ID or role';queryLabel.append(query);
 const statusLabel=document.createElement('label');statusLabel.textContent='Status';const status=document.createElement('select');const all=document.createElement('option');all.value='';all.textContent='All states';status.append(all);
 const statuses=[...new Set(rows.flatMap(r=>[...r.querySelectorAll('.pill')].map(p=>p.textContent.trim())))];
 for(const label of statuses){const option=document.createElement('option');option.value=label;option.textContent=label;status.append(option);}statusLabel.append(status);
 const reset=document.createElement('button');reset.type='button';reset.className='btn btn-outline';reset.textContent='Reset Filters';
 const count=document.createElement('p');count.className='muted tiny';count.setAttribute('role','status');
 const fromLabel=document.createElement('label');fromLabel.textContent='Submitted from';const from=document.createElement('input');from.type='date';fromLabel.append(from);
 const toLabel=document.createElement('label');toLabel.textContent='Submitted to';const to=document.createElement('input');to.type='date';toLabel.append(to);
 const dates=rows.some(r=>r.dataset.submitted);panel.append(queryLabel,statusLabel);if(dates)panel.append(fromLabel,toLabel);panel.append(reset);const wrap=table.closest('.panel')||table;wrap.before(panel,count);
 const update=()=>{let total=0;for(const row of rows){const at=Number(row.dataset.submitted)||0;row.hidden=!!((dates&&from.value&&at<Date.parse(from.value))||(dates&&to.value&&at>Date.parse(to.value)+86399999)||(query.value&&!row.textContent.toLowerCase().includes(query.value.toLowerCase()))||(status.value&&![...row.querySelectorAll('.pill')].some(p=>p.textContent.trim()===status.value)));if(!row.hidden)total++;}count.textContent=total+' of '+rows.length+' displayed records'+(!total?' · No matches. Reset Filters to view the queue.':'');};query.addEventListener('input',update);status.addEventListener('change',update);from.addEventListener('change',update);to.addEventListener('change',update);reset.addEventListener('click',()=>{query.value=status.value=from.value=to.value='';update();});update();
})();
// Directory ordering and presence filters share the same accessible member cards.
(() => {
 const grid=document.querySelector('body[data-page="/members"] .member-grid');if(!grid)return;
 const cards=[...grid.querySelectorAll('.member-card')];
 const controls=document.createElement('div');controls.className='filter-grid';
 const statusLabel=document.createElement('label');statusLabel.textContent='Website presence';const presence=document.createElement('select');
 for(const [v,l] of [['','All members'],['online','Online'],['away','Away'],['offline','Offline']]){const option=document.createElement('option');option.value=v;option.textContent=l;presence.append(option);}statusLabel.append(presence);
 const sortLabel=document.createElement('label');sortLabel.textContent='Order';const sort=document.createElement('select');for(const [v,l] of [['default','Recent website activity'],['name','Name A–Z'],['online','Online first']]){const option=document.createElement('option');option.value=v;option.textContent=l;sort.append(option);}sortLabel.append(sort);controls.append(statusLabel,sortLabel);grid.before(controls);
 const update=()=>{const q=document.querySelector('.list-search')?.value.toLowerCase()||'';const sorted=[...cards];if(sort.value==='name')sorted.sort((a,b)=>a.querySelector('b').textContent.localeCompare(b.querySelector('b').textContent));if(sort.value==='online')sorted.sort((a,b)=>(a.querySelector('[data-status]')?.dataset.status!=='online')-(b.querySelector('[data-status]')?.dataset.status!=='online'));for(const card of sorted){const state=card.querySelector('[data-status]')?.dataset.status;card.hidden=!!((presence.value&&state!==presence.value)||(q&&!card.textContent.toLowerCase().includes(q)));grid.append(card);}};presence.addEventListener('change',update);sort.addEventListener('change',update);document.querySelector('.list-search')?.addEventListener('input',update);
})();
