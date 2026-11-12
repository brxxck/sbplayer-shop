// BUILT BY SB // RUNING ON WEED AND CAFFEINE
for(const form of document.querySelectorAll('form[data-confirm]')){
  form.addEventListener('submit',event=>{
    if(!window.confirm(form.getAttribute('data-confirm')||'Confirm this action?'))event.preventDefault();
  });
}
// Keep long text input status visible without leaking client content to third parties.
for(const field of document.querySelectorAll('textarea[maxlength]')){
  const count=document.createElement('small');count.className='char-count muted';
  field.insertAdjacentElement('afterend',count);
  const update=()=>{count.textContent=`${field.value.length} / ${field.maxLength} characters`;};
  field.addEventListener('input',update);update();
}


// V1.3.1 staff chat: render user text with textContent, not dynamic HTML.
const staffChatLog=document.querySelector('#staff-chat-messages');
const staffChatForm=document.querySelector('#staff-chat-form');
if(staffChatLog){
 let lastId=Number(staffChatLog.dataset.lastId||0),loading=false;
 const addMessage=m=>{
   if(!m || !Number.isSafeInteger(Number(m.id)) || Number(m.id)<=lastId)return;
   lastId=Number(m.id);staffChatLog.dataset.lastId=String(lastId);
   staffChatLog.querySelector('.staff-chat-empty')?.remove();
   const article=document.createElement('article');article.className='staff-chat-message';
   article.dataset.messageId=String(lastId);
   const bubble=document.createElement('span');bubble.className='staff-chat-initial';
   bubble.textContent=String(m.display_name||m.username||'?').charAt(0).toUpperCase();
   const entry=document.createElement('div');entry.className='staff-chat-entry';
   const top=document.createElement('div');top.className='staff-chat-meta';
   const who=document.createElement('b');who.textContent=String(m.display_name||m.username||'Staff');
   const when=document.createElement('small');when.textContent='@'+String(m.username||'staff')+' · '+new Date(m.created_at).toLocaleString();
   top.append(who,when);
   const content=document.createElement('div');content.className='staff-chat-text';
   content.textContent=String(m.body||'');
   entry.append(top,content);article.append(bubble,entry);staffChatLog.append(article);
   while(staffChatLog.querySelectorAll('.staff-chat-message').length>80)
     staffChatLog.querySelector('.staff-chat-message')?.remove();
   staffChatLog.scrollTop=staffChatLog.scrollHeight;
 };
 async function pollStaffChat(){
   if(loading||document.visibilityState==='hidden')return;
   loading=true;
   try {
     const resp=await fetch('/staff/chat/messages?after='+lastId,{credentials:'same-origin',cache:'no-store'});
     if(resp.ok){
       const data=await resp.json();
       for(const msg of data.messages||[])addMessage(msg);
     }
   }catch{/* Retry at the next poll. */}
   finally{loading=false;}
 }
 staffChatLog.scrollTop=staffChatLog.scrollHeight;
 setInterval(pollStaffChat,8000);
 if(staffChatForm){
   staffChatForm.addEventListener('submit',async event=>{
     event.preventDefault();
     const button=staffChatForm.querySelector('button[type="submit"]');
     const textarea=staffChatForm.querySelector('textarea[name="body"]');
     if(!textarea?.value.trim())return;
     button.disabled=true;
     try{
       const response=await fetch(staffChatForm.action,{
         method:'POST',body:new URLSearchParams(new FormData(staffChatForm)),
         credentials:'same-origin',redirect:'follow'
       });
       if(!response.ok)throw new Error('Message could not be sent.');
       textarea.value='';
       await pollStaffChat();
     }catch{window.alert('Your message was not sent. Please try again.');}
     finally{button.disabled=false;}
   });
 }
}
// Let members see selected evidence names before submitting a ticket or reply.
for(const field of document.querySelectorAll('input[type="file"][name="evidence"]')){
 field.addEventListener('change',()=>{
   const count=field.files?.length||0;
   const label=field.closest('.ticket-upload-control, .support-upload');
   if(!label)return;
   let line=label.querySelector('.evidence-chosen');
   if(!line){line=document.createElement('small');line.className='evidence-chosen';label.append(line);}
   line.textContent=count?(count+' file'+(count===1?'':'s')+' selected'):'';
 });
}


// V1.4.4: like/unlike directly in the feed. Never navigate away or reset scroll.
for(const form of document.querySelectorAll('form[data-post-like]')){
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const heart=form.querySelector('[data-like-heart]');
    const count=form.querySelector('[data-like-count]');
    if(!button||!heart||!count||button.disabled)return;
    button.disabled=true;
    form.querySelector('[data-like-error]')?.remove();
    try{
      const response=await fetch(form.action,{
        method:'POST',
        headers:{accept:'application/json'},
        body:new URLSearchParams(new FormData(form)),
        credentials:'same-origin',
        redirect:'follow'
      });
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))
        throw new Error('Like request failed');
      const result=await response.json();
      if(typeof result.liked!=='boolean'||!Number.isSafeInteger(result.like_count)||result.like_count<0)
        throw new Error('Invalid like response');
      button.classList.toggle('activated',result.liked);
      button.setAttribute('aria-pressed',String(result.liked));
      button.setAttribute('aria-label',result.liked?'Unlike post':'Like post');
      heart.classList.toggle('is-liked',result.liked); // Preserve Lucide SVG path on both toggles.
      count.textContent=String(result.like_count);
    }catch{
      const error=document.createElement('small');
      error.dataset.likeError='';
      error.setAttribute('role','alert');
      error.textContent='Could not update like. Try again.';
      error.className='muted tiny';
      form.append(error);
    }finally{button.disabled=false;}
  });
}


// V1.5: update repost and bookmark buttons in place, preserving scroll position.
for(const form of document.querySelectorAll('form[data-post-repost],form[data-post-bookmark]')){
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    if(!button||button.disabled)return;
    const repost=form.hasAttribute('data-post-repost');
    button.disabled=true;
    form.querySelector('[data-social-error]')?.remove();
    try{
      const response=await fetch(form.action,{
        method:'POST',
        headers:{accept:'application/json'},
        body:new URLSearchParams(new FormData(form)),
        credentials:'same-origin',redirect:'follow'
      });
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('Social action failed');
      const result=await response.json();
      const enabled=repost?result.reposted:result.saved;
      if(typeof enabled!=='boolean')throw new Error('Invalid social response');
      if(repost){
        if(!Number.isSafeInteger(result.repost_count)||result.repost_count<0)throw new Error('Invalid repost count');
        const count=form.querySelector('[data-repost-count]');
        if(count)count.textContent=String(result.repost_count);
      }else{
        const label=button.querySelector('[data-bookmark-label]');
        if(label)label.textContent=enabled?'Saved':'Save'; // Do not destroy the SVG icon.
      }
      button.classList.toggle('activated',enabled);
      button.setAttribute('aria-pressed',String(enabled));
      button.setAttribute('aria-label',repost?(enabled?'Undo repost':'Repost'):(enabled?'Remove saved post':'Save post'));
    }catch{
      const error=document.createElement('small');
      error.dataset.socialError='';
      error.className='muted tiny';
      error.setAttribute('role','alert');
      error.textContent='Could not update this action. Try again.';
      form.append(error);
    }finally{button.disabled=false;}
  });
}

// Share a verified local post/profile URL. Never construct links from user text.
for(const button of document.querySelectorAll('button[data-share-path]')){
  button.addEventListener('click',async()=>{
    const path=button.getAttribute('data-share-path')||'';
    if(!/^\/(?:post\/\d+|u\/\d{15,22})$/.test(path))return;
    const url=new URL(path,window.location.origin).href;
    const original=button.innerHTML; // Preserve the original icon after copied-link feedback.
    try{
      if(navigator.share){
        await navigator.share({title:"SB's & Cam's Store",url});
        return;
      }
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      button.textContent='Link copied';
      setTimeout(()=>{button.innerHTML=original;},2200);
    }catch(error){
      if(error?.name==='AbortError')return;
      window.prompt('Copy this link:',url);
    }
  });
}


// V1.5: the top-right account menu closes on Escape and on outside taps.
const topAccountMenu=document.querySelector('[data-account-dropdown]');
if(topAccountMenu){
  document.addEventListener('pointerdown',event=>{
    if(topAccountMenu.open&&!topAccountMenu.contains(event.target))topAccountMenu.open=false;
  });
  topAccountMenu.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&topAccountMenu.open){
      topAccountMenu.open=false;
      topAccountMenu.querySelector('summary')?.focus();
      event.preventDefault();
    }
  });
}
