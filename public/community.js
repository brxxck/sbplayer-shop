// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Progressive enhancement. Form submissions still work without SSE or JavaScript.
(() => {
  const root=document.body;
  if(root.dataset.siteMember!=='1')return;
  const csrf=root.dataset.siteCsrf||'';
  const formBody=values=>new URLSearchParams({_csrf:csrf,...values});
  const post=async(url,values={})=>{
    const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:formBody(values)});
    if(!r.ok)throw new Error('Request failed ('+r.status+')');
    return r;
  };
  const get=async url=>{
    const r=await fetch(url,{credentials:'same-origin',headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Request failed');
    return r.json();
  };
  let stream;
  const feed=document.querySelector('[data-live-feed]');
  const list=feed?.querySelector('[data-feed-list]');
  const banner=feed?.querySelector('[data-feed-banner]');
  let pending=new Map(),lastHead=Number(list?.querySelector('[id^="post-"]')?.id.replace('post-','')||0);
  let feedPending=false;
  const feedTab=feed?.dataset.feedTab||'all';
  function enhanceDynamicPost(item){
    if(!item)return item;
    for(const form of item.querySelectorAll('form[data-post-like],form[data-post-repost],form[data-post-bookmark]')){
      form.addEventListener('submit',async e=>{
        e.preventDefault();
        const button=form.querySelector('button[type="submit"]');
        if(!button||button.disabled)return;
        button.disabled=true;
        try{
          const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:new URLSearchParams(new FormData(form))});
          if(!response.ok)throw Error('Unable to update post.');
          const data=await response.json();
          const isLike=form.hasAttribute('data-post-like'),isRepost=form.hasAttribute('data-post-repost');
          const enabled=isLike?data.liked:isRepost?data.reposted:data.saved;
          button.classList.toggle('activated',!!enabled);
          button.setAttribute('aria-pressed',String(!!enabled));
          const count=form.querySelector(isLike?'[data-like-count]':'[data-repost-count]');
          if(count)count.textContent=String(isLike?data.like_count:data.repost_count);
          const label=form.querySelector('[data-bookmark-label]');
          if(label)label.textContent=enabled?'Saved':'Save';
          if(isLike)form.querySelector('[data-like-heart]')?.classList.toggle('is-liked',enabled);
        }catch{window.alert('Could not update post. Try again.');}
        finally{button.disabled=false;}
      });
    }
    return item;
  }
  function decorateCard(html){
    const template=document.createElement('template');
    template.innerHTML=html;
    return enhanceDynamicPost(template.content.firstElementChild);
  }
  async function refreshFeed(){
    if(!feed||feedPending||document.visibilityState==='hidden')return;
    feedPending=true;
    try{
      const data=await get('/live/feed/updates?after='+lastHead+'&tab='+encodeURIComponent(feedTab));
      for(const item of data.posts||[]){
        if(item.id>lastHead&&!list.querySelector('#post-'+item.id))pending.set(item.id,item.html);
      }
      if(Number.isSafeInteger(data.head))lastHead=Math.max(lastHead,data.head);
      if(pending.size){
        if(window.scrollY<250&&document.activeElement?.tagName!=='TEXTAREA')showNewPosts();
        else{
          banner.hidden=false;
          banner.textContent='Show '+pending.size+' new post'+(pending.size===1?'':'s')+' ↑';
        }
      }
    }catch{/* existing feed remains usable */}
    finally{feedPending=false;}
  }
  function showNewPosts(){
    if(!list)return;
    for(const [id,html] of [...pending].sort((a,b)=>b[0]-a[0])){
      const item=decorateCard(html);
      if(item&&!list.querySelector('#post-'+id))banner.insertAdjacentElement('afterend',item);
    }
    pending.clear();banner.hidden=true;
  }
  banner?.addEventListener('click',()=>{showNewPosts();window.scrollTo({top:0,behavior:'smooth'});});
  async function refreshVisibleCards(){
    if(!feed||document.visibilityState==='hidden')return;
    try{
      const data=await get('/live/feed/updates?after=0&tab='+encodeURIComponent(feedTab));
      for(const p of data.posts||[]){
        const existing=list.querySelector('#post-'+p.id);
        if(!existing)continue;
        const newEl=decorateCard(p.html);
        if(newEl&&document.activeElement&&!existing.contains(document.activeElement))existing.replaceWith(newEl);
      }
      await refreshFeed();
    }catch{/* do not disturb the feed on connection failure */}
  }
  const thread=document.querySelector('[data-dm-thread]');
  const threadId=Number(thread?.dataset.dmThread||0);
  const history=thread?.querySelector('#dm-history');
  const sendForm=thread?.querySelector('[data-dm-send]');
  const typing=thread?.querySelector('[data-dm-typing]');
  let lastMessage=Number(history?.lastElementChild?.dataset.messageId||0);
  let historyLoading=false,typingTimer=0;
  async function updateMessages(){
    if(!threadId||historyLoading)return;
    historyLoading=true;
    try{
      const data=await get('/messages/'+threadId+'/updates?after='+lastMessage);
      const atBottom=history.scrollHeight-history.scrollTop-history.clientHeight<130;
      for(const m of data.messages||[]){
        if(m.id<=lastMessage)continue;
        const item=decorateCard(m.html);
        if(item)history.append(item);
        lastMessage=Math.max(lastMessage,m.id);
      }
      if(atBottom)history.scrollTop=history.scrollHeight;
      if(data.messages?.length){
        await post('/messages/'+threadId+'/read');
        await refreshCounts();
      }
      if(data.readAllowed){
        for(const bubble of history.querySelectorAll('.dm-mine')){
          const id=Number(bubble.dataset.messageId);
          if(id<=data.lastRead&&!bubble.dataset.seen){
            bubble.dataset.seen='1';
            const meta=bubble.querySelector('small');
            if(meta)meta.textContent+=' · Seen';
          }
        }
      }
    }catch{/* keep messages and retry later */}
    finally{historyLoading=false;}
  }
  sendForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const button=sendForm.querySelector('button[type="submit"]');
    if(button.disabled)return;
    button.disabled=true;
    const error=sendForm.querySelector('[data-dm-error]');
    try{
      const result=await fetch(sendForm.action,{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:new FormData(sendForm)});
      if(!result.ok)throw Error('Message could not be sent. Check its length and attachment size.');
      sendForm.reset();
      if(error)error.textContent='';
      await updateMessages();
    }catch(err){if(error)error.textContent=err.message;}
    finally{button.disabled=false;}
  });
  let lastTyping=0;
  sendForm?.querySelector('textarea[name="body"]')?.addEventListener('input',()=>{
    if(Date.now()-lastTyping<3500)return;
    lastTyping=Date.now();
    post('/messages/'+threadId+'/typing').catch(()=>{});
  });
  history?.addEventListener('click',async e=>{
    const edit=e.target.closest('[data-dm-edit]'),report=e.target.closest('[data-dm-report]');
    if(edit){
      const id=edit.dataset.dmEdit;
      const original=edit.closest('.dm-bubble').querySelector('.dm-bubble-body')?.textContent||'';
      const body=window.prompt('Edit your message (15-minute edit window):',original);
      if(body===null)return;
      const r=await fetch('/messages/'+threadId+'/edit/'+id,{
        method:'POST',credentials:'same-origin',body:formBody({body})});
      if(r.ok)window.location.reload();
      else window.alert('Could not edit the message.');
    }
    if(report){
      const reason=window.prompt('Describe why this message should be reviewed:');
      if(reason===null)return;
      const r=await fetch('/messages/'+threadId+'/report/'+report.dataset.dmReport,{
        method:'POST',credentials:'same-origin',body:formBody({reason})});
      window.alert(r.ok?'Report submitted for staff review.':'Unable to submit report. Use 10 to 500 characters.');
    }
  });
  if(history)history.scrollTop=history.scrollHeight;
  const presenceEls=[...document.querySelectorAll('[data-presence-id]')];
  function updatePresence(userId,status){
    for(const el of presenceEls)if(el.dataset.presenceId===String(userId)){
      el.dataset.status=status;
      const label=el.querySelector('.presence-label');
      if(label)label.textContent=status==='online'?'Online':status==='away'?'Away':'Offline';
    }
  }
  async function refreshCounts(){
    try{
      const ids=[...new Set(presenceEls.map(el=>el.dataset.presenceId))].slice(0,50).join(',');
      const data=await get('/live/state?ids='+encodeURIComponent(ids));
      for(const [id,status] of Object.entries(data.statuses||{}))updatePresence(id,status);
      const num=Number(data.unreadMessages)||0;
      for(const el of document.querySelectorAll('[data-dm-unread]')){
        el.textContent=num>99?'99+':String(num);
        el.hidden=!num;
      }
      const bell=Number(data.unreadNotifications)||0;
      for(const el of document.querySelectorAll('[data-notification-unread]')){
        el.textContent=bell>99?'99+':String(bell);
        el.hidden=!bell;
      }
    }catch{/* fallback page navigation stays available */}
  }
  function showConnection(state){
    const badge=document.querySelector('[data-live-connection]');
    if(badge)badge.textContent=state;
  }
  function connect(){
    if(!window.EventSource)return;
    stream=new EventSource('/live/events');
    stream.addEventListener('ready',()=>{showConnection('Live');refreshCounts();refreshFeed();updateMessages();});
    stream.addEventListener('feed-update',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      if(data.kind==='create'||data.kind==='repost')refreshFeed();
      else refreshVisibleCards();
    });
    stream.addEventListener('dm-update',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      refreshCounts();
      if(Number(data.threadId)===threadId)updateMessages();
      else if(document.querySelector('[data-dm-inbox]'))window.location.reload();
    });
    stream.addEventListener('dm-read',()=>updateMessages());
    stream.addEventListener('dm-typing',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      if(Number(data.threadId)!==threadId||!typing)return;
      typing.textContent='Typing…';
      clearTimeout(typingTimer);
      typingTimer=setTimeout(()=>{typing.textContent='';},3000);
    });
    stream.addEventListener('presence',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      updatePresence(data.userId,data.status);
    });
    stream.addEventListener('notifications-update',refreshCounts);
    stream.addEventListener('staff-chat-update',()=>{if(document.querySelector('#staff-chat-messages'))window.dispatchEvent(new Event('sb:staff-chat-update'));});
    stream.onerror=()=>showConnection('Reconnecting');
  }
  if(window.EventSource)connect();
  let lastActive=Date.now();
  ['pointerdown','keydown','scroll'].forEach(name=>document.addEventListener(name,()=>{lastActive=Date.now();},{passive:true}));
  async function beat(){
    if(document.visibilityState==='hidden')return;
    try{await post('/live/ping',{active:Date.now()-lastActive<300000?'1':'0'});}catch{/* retry */}
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){beat();refreshCounts();refreshFeed();updateMessages();}});
  setInterval(beat,30000);
  setInterval(()=>{refreshCounts();refreshFeed();updateMessages();},20000);
  beat();refreshCounts();refreshFeed();
})();