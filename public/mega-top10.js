// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read-only, same-origin leaderboard refresh. All values come from verified
// server-side snapshots; the browser never contacts InPvP or handles tokens.
(() => {
 const root=document.querySelector('[data-top10-board]');
 if(!root)return;
 const date=ms=>ms?new Date(ms).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not yet verified';
 const cell=(tr,content,cls)=>{
   const td=document.createElement('td');
   if(cls)td.className=cls;
   if(typeof content==='string')td.textContent=content;
   else if(content)td.append(content);
   tr.append(td);return td;
 };
 const teamLink=(team,label)=>{
   const a=document.createElement('a');
   a.className='mega-top-team-link';
   a.href='/mega-team/teams/'+encodeURIComponent(team.id);
   a.textContent=label||team.name;return a;
 };
 const details=(td,label)=>{
   const small=document.createElement('small');small.textContent=label;td.append(small);
 };
 const table=root.querySelector('[data-top10-rows]');
 function update(data){
   if(!Array.isArray(data.teams)||!data.status)return;
   const live=!!data.live;
   if(table){
     const fragment=document.createDocumentFragment();
     for(const team of data.teams.slice(0,10)){
       if(!/^(?:[0-9a-f]{8}-[0-9a-f-]{27}|[1-9]\d{0,19})$/i.test(team.id))continue;
       const tr=document.createElement('tr');
       cell(tr,teamLink(team,live&&team.rank?'#'+team.rank:'—'),'mega-rank');
       const title=cell(tr,teamLink(team));
       if(team.id==='5638a504-3347-43fc-89d6-424dad53b7f6')details(title,'Our team');
       const formatBank=()=>{
         if(typeof team.bankText==='string'&&
           /^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i.test(team.bankText))
           return team.bankText;
         if(Number.isSafeInteger(team.bankCents)&&team.bankCents>=0)
           return '$'+(team.bankCents/100).toLocaleString('en-US',
            {minimumFractionDigits:2,maximumFractionDigits:2});
         return 'Not available';
       };
       const balance=cell(tr,formatBank(),'mega-number');
       if(team.approximate&&formatBank()!=='Not available')
         details(balance,'Rounded by InPvP');
       const td=cell(tr,null);
       const official=document.createElement('a');
       // The server validates the source URL, but defend again on the client.
       try{
         const u=new URL(team.url);
         if(u.protocol==='https:'&&u.hostname==='inpvp.net'&&u.pathname==='/megasmp/teams'){
           official.href=u.href;official.textContent='InPvP ↗';
           official.rel='noopener noreferrer';official.target='_blank';
           official.className='quiet-link';td.append(official);
         }
       }catch{}
       fragment.append(tr);
     }
     if(!fragment.childNodes.length){
       const tr=document.createElement('tr');cell(tr,'No source ranking captured yet.');fragment.append(tr);
     }
     table.replaceChildren(fragment);
   }
   const sb=data.teams.find(t=>t.id==='5638a504-3347-43fc-89d6-424dad53b7f6');
   const rank=root.querySelector('[data-mega-sb-rank]');
   if(rank)rank.textContent=live&&sb?.rank?'#'+sb.rank+' ↗':'Unverified ↗';
   const titleRank=root.querySelector('[data-mega-title-rank]');
   if(titleRank)titleRank.textContent=live&&sb?.rank?'#'+sb.rank:'Unverified';
   const status=root.querySelector('.mega-top-status');
   if(status){
     const spans=status.querySelectorAll('span');
     if(spans[0])spans[0].textContent=!live?'Reference links · live ranking not verified':
       Date.now()-data.status.last_success>900000?'Saved listing (stale)':'Latest verified listing';
     if(spans[1])spans[1].textContent='Last source check: '+date(data.status.last_success);
     if(spans[2])spans[2].textContent=data.status.last_error?
       'Collector notice: '+String(data.status.last_error):'';
   }
 }
 let busy=false;
 async function refresh(){
   if(busy||document.visibilityState==='hidden')return;
   busy=true;
   try{
     const response=await fetch('/mega-team/top10.json',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       headers:{accept:'application/json'},redirect:'error'
     });
     if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))
       throw new Error('Ranking unavailable');
     update(await response.json());
   }catch{
     const status=root.querySelector('.mega-top-status');
     if(status)status.title='Leaderboard refresh unavailable; showing last saved data.';
   }finally{busy=false;}
 }
 const timer=setInterval(()=>{void refresh();},60000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
