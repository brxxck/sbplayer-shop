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
