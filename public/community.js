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
  let stream,lastBrowserAlert=0;
  const alertButton=document.querySelector('[data-browser-notifications]');
  const alertStatus=document.querySelector('[data-browser-notification-status]');
  if(alertButton&&'Notification' in window){
    alertButton.hidden=false;
    const describe=()=>{if(alertStatus)alertStatus.textContent=Notification.permission==='granted'?'Browser alerts enabled. Manage permission in your browser site settings.':Notification.permission==='denied'?'Alerts are blocked in browser site settings.':'Optional alerts while this website is open in the background.';};
    alertButton.addEventListener('click',async()=>{await Notification.requestPermission();describe();});describe();
  }
  const inbox=document.querySelector('[data-dm-inbox]');
  const inboxList=inbox?.querySelector('[data-dm-list]');
  const inboxFilter=inbox?.querySelector('[data-dm-filter]');
  let inboxLoading=false;
  function applyInboxFilter(){
    const q=(inboxFilter?.value||'').trim().toLocaleLowerCase();
    for(const item of inboxList?.querySelectorAll('.dm-thread')||[])
      item.hidden=!!q&&!item.textContent.toLocaleLowerCase().includes(q);
  }
  inboxFilter?.addEventListener('input',applyInboxFilter);
  async function refreshInbox(){
    if(!inboxList||inboxLoading||document.visibilityState==='hidden')return;
    inboxLoading=true;
    try{
      const result=await get('/messages/inbox-updates');
      if(inboxList.innerHTML!==result.html){
        inboxList.innerHTML=result.html;
        applyInboxFilter();
        refreshCounts();
      }
    }catch{/* Preserve current conversations; retry on next update. */}
    finally{inboxLoading=false;}
  }
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
        if(window.scrollY<250&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))showNewPosts();
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
    for(const [id,html] of [...pending].sort((a,b)=>a[0]-b[0])){
      const item=decorateCard(html);
      if(item&&!list.querySelector('#post-'+id)){list.querySelector('.empty')?.remove();banner.insertAdjacentElement('afterend',item);}
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
    if(!threadId||historyLoading||document.visibilityState==='hidden')return;
    historyLoading=true;
    try{
      const data=await get('/messages/'+threadId+'/updates?after='+lastMessage);
      const atBottom=history.scrollHeight-history.scrollTop-history.clientHeight<130;
      for(const m of data.changes||[]){
        const existing=history.querySelector('[data-message-id="'+m.id+'"]');
        const updated=decorateCard(m.html);
        if(existing&&updated&&existing.dataset.messageVersion!==updated.dataset.messageVersion)
          existing.replaceWith(updated);
      }
      for(const m of data.messages||[]){
        history.querySelector('[data-thread-empty]')?.remove();
        if(m.id<=lastMessage)continue;
        const item=decorateCard(m.html);
        if(item)history.append(item);
        lastMessage=Math.max(lastMessage,m.id);
      }
      if(atBottom)history.scrollTop=history.scrollHeight;
      if(data.messages?.length&&document.hasFocus()&&document.visibilityState==='visible'){
        await post('/messages/'+threadId+'/read');
        await refreshCounts();
      }
      if(!data.readAllowed){for(const bubble of history.querySelectorAll('.dm-mine[data-seen]')){delete bubble.dataset.seen;const meta=bubble.querySelector('small');if(meta)meta.textContent=meta.textContent.replace(/ · Seen/g,'');}}
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
      if(!result.ok){let data;try{data=await result.json();}catch{}throw Error(data?.error||'Message could not be sent. Your draft and attachments are still here.');}
      sendForm.dispatchEvent(new Event('sb:submitted'));
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
      const original=edit.closest('.dm-bubble').querySelector('[data-message-text]')?.textContent||'';
      const body=window.prompt('Edit your message (15-minute edit window):',original);
      if(body===null)return;
      const r=await fetch('/messages/'+threadId+'/edit/'+id,{
        method:'POST',credentials:'same-origin',body:formBody({body})});
      if(r.ok)await updateMessages();
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
  history?.addEventListener('submit',async event=>{
    const form=event.target.closest('form[action*="/delete/"]');
    if(!form)return;
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{
      const response=await fetch(form.action,{
        method:'POST',credentials:'same-origin',body:new FormData(form)
      });
      if(!response.ok)throw Error('Unable to delete the message.');
      await updateMessages();
    }catch(error){window.alert(error.message);}
    finally{if(button)button.disabled=false;}
  });
  const older=thread?.querySelector('[data-dm-older]');
  older?.addEventListener('click',async()=>{
    older.disabled=true;
    try{
      const first=history.querySelector('[data-message-id]')?.dataset.messageId||0;
      const data=await get('/messages/'+threadId+'/older?before='+first);
      const height=history.scrollHeight;
      for(const m of [...data.messages].reverse())if(!history.querySelector('[data-message-id="'+m.id+'"]')){const node=decorateCard(m.html);if(node)history.prepend(node);}
      history.scrollTop+=history.scrollHeight-height;older.hidden=!data.hasOlder;
    }catch{older.textContent='Could not load messages · Retry';}
    finally{older.disabled=false;}
  });
  const messageSearch=thread?.querySelector('[data-message-search]');
  const results=thread?.querySelector('[data-message-results]');
  messageSearch?.addEventListener('submit',async e=>{
    e.preventDefault();const q=messageSearch.elements.q.value.trim();if(!q)return;
    results.hidden=false;results.textContent='Searching…';
    try{const data=await get('/messages/'+threadId+'/search?q='+encodeURIComponent(q));results.replaceChildren();for(const m of data.messages){const node=decorateCard(m.html);if(node)results.append(node);}if(!data.messages.length)results.textContent='No matching messages.';}
    catch{results.textContent='Search unavailable. Try again.';}
  });
  thread?.querySelector('[data-search-clear]')?.addEventListener('click',()=>{messageSearch.reset();results.replaceChildren();results.hidden=true;});
  if(history)history.scrollTop=history.scrollHeight;
  const presenceEls=()=>[...document.querySelectorAll('[data-presence-id]')];
  function updatePresence(userId,status){
    for(const el of presenceEls())if(el.dataset.presenceId===String(userId)){
      el.dataset.status=status;
      const label=el.querySelector('.presence-label');
      if(label)label.textContent=status==='online'?'Online':status==='away'?'Away':'Offline';
    }
  }
  async function refreshCounts(){
    try{
      const ids=[...new Set(presenceEls().map(el=>el.dataset.presenceId))].slice(0,50).join(',');
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
    if(badge){
      badge.textContent=state;
      badge.dataset.connection=state.toLowerCase();
    }
  }
  function connect(){
    if(!window.EventSource)return;
    stream=new EventSource('/live/events');
    stream.addEventListener('ready',()=>{showConnection('Live');refreshCounts();refreshFeed();updateMessages();refreshInbox();});
    stream.addEventListener('feed-update',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      if(data.kind==='delete'){document.getElementById('post-'+data.id)?.remove();refreshVisibleCards();}
      else if(data.kind==='create')refreshFeed();
      else if(data.kind==='repost'){refreshFeed();refreshVisibleCards();}
      else refreshVisibleCards();
    });
    stream.addEventListener('dm-update',e=>{
      let data;try{data=JSON.parse(e.data)}catch{return;}
      refreshCounts();
      if(document.visibilityState==='hidden'&&'Notification' in window&&Notification.permission==='granted'&&Date.now()-lastBrowserAlert>10000){lastBrowserAlert=Date.now();const alert=new Notification('SB Store · Message activity',{body:'Open Messages to read your private conversations.',tag:'sb-private-message'});alert.onclick=()=>{window.focus();location.assign('/messages');};}
      if(Number(data.threadId)===threadId)updateMessages();
      else refreshInbox();
    });
    stream.addEventListener('dm-read',()=>{updateMessages();refreshCounts();});
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
  window.addEventListener('pagehide',()=>stream?.close(),{once:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)connect();});
  let lastActive=Date.now();
  ['pointerdown','keydown','scroll'].forEach(name=>document.addEventListener(name,()=>{lastActive=Date.now();},{passive:true}));
  async function beat(){
    if(document.visibilityState==='hidden')return;
    try{await post('/live/ping',{active:Date.now()-lastActive<300000?'1':'0'});}catch{/* retry */}
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){beat();refreshCounts();refreshFeed();updateMessages();refreshInbox();}});
  setInterval(beat,30000);
  setInterval(()=>{if(document.visibilityState==='visible'){refreshCounts();refreshFeed();updateMessages();refreshInbox();}},30000);
  beat();refreshCounts();refreshFeed();refreshInbox();
})();