// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Five-minute same-origin dashboard updates; never contacts InPvP directly.
(() => {
 const root=document.querySelector('[data-mega-dashboard]');
 if(!root)return;
 const season=root.dataset.season;
 const refresh=root.querySelector('[data-mega-refresh]');
 if(!season)return;
 const money=value=>value===null||value===undefined?'Not recorded':'$'+Number(value).toLocaleString('en-US');
 const short=value=>value===null||value===undefined?'—':'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(value);
 const date=value=>value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not available';
 const source=value=>value==='authorized_feed'?'Authorized feed':value==='manual_import'?'Submitted snapshot':value==='manual'?'Recorded manually':'Not recorded';
 const cell=(row,label,cls='')=>{
  const td=document.createElement('td');if(cls)td.className=cls;
  td.textContent=label;row.append(td);
 };
 function rebuildRows(data){
  const rows=root.querySelector('[data-mega-rows]'),rank=root.querySelector('[data-mega-leaderboard]'),history=root.querySelector('[data-mega-history]');
  if(rows){
   const fragment=document.createDocumentFragment();
   for(const m of data.members||[]){
    const tr=document.createElement('tr'),td=document.createElement('td');
    const title=document.createElement('b');title.textContent=m.gamertag;
    const sub=document.createElement('small');sub.textContent=(m.role||'Member')+' · '+source(m.source)+(m.status==='former'?' · Former':'');
    td.append(title,sub);
    if(m.linkedDiscord&&/^\d{15,22}$/.test(String(m.linkedDiscord.id||''))){
      const info=document.createElement('small'),linked=document.createElement('a');
      linked.className='mega-matched-discord';linked.href='/u/'+m.linkedDiscord.id;
      linked.textContent='@'+String(m.linkedDiscord.username||'Discord member');
      info.append(linked);td.append(info);
    }
    tr.append(td);
    cell(tr,money(m.deposits),'mega-number');cell(tr,money(m.withdrawals),'mega-number');cell(tr,money(m.net),'mega-number');
    fragment.append(tr);
   }
   if(!fragment.childNodes.length){const tr=document.createElement('tr');cell(tr,'No imported in-game roster yet.');fragment.append(tr);}
   rows.replaceChildren(fragment);
  }
  if(rank){
   const active=(data.members||[]).filter(m=>m.status==='active').sort((a,b)=>(b.deposits??-1)-(a.deposits??-1)||a.gamertag.localeCompare(b.gamertag));
   const fragment=document.createDocumentFragment();
   for(const [i,m] of active.entries()){
    const tr=document.createElement('tr');cell(tr,'#'+(i+1));cell(tr,m.gamertag);cell(tr,money(m.deposits),'mega-number');
    fragment.append(tr);
   }
   if(!fragment.childNodes.length){const empty=document.createElement('tr');cell(empty,'No ranked contributions yet.');fragment.append(empty);}
   rank.replaceChildren(fragment);
  }
  if(history){
   const fragment=document.createDocumentFragment();
   for(const t of data.transactions||[]){
    const tr=document.createElement('tr');
    cell(tr,date(t.occurred_at));cell(tr,t.gamertag);cell(tr,t.kind==='deposit'?'Deposit':'Withdrawal');
    cell(tr,money(t.amount),'mega-number');fragment.append(tr);
   }
   if(!fragment.childNodes.length){const empty=document.createElement('tr');cell(empty,'No individual transactions recorded yet.');fragment.append(empty);}
   history.replaceChildren(fragment);
  }
 }
 let busy=false;
 async function update(){
  if(busy)return;
  busy=true;if(refresh)refresh.disabled=true;
  const status=root.querySelector('[data-mega-timestamp]');
  if(status)status.textContent='Checking saved team data…';
  try{
   const response=await fetch('/team/mega/data?season='+encodeURIComponent(season),{
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{accept:'application/json'},redirect:'error'
   });
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('Refresh failed');
   const data=await response.json();
   if(data?.teamId!=='5638a504-3347-43fc-89d6-424dad53b7f6'||data.season?.season!==season)throw new Error('Unexpected team data');
   for(const [key,amount] of Object.entries({balance:data.bank?.balance??null,
      deposits:data.totals.deposited,withdrawals:data.totals.withdrawn,net:data.totals.net})){
    const element=root.querySelector('[data-mega-value="'+key+'"]');if(element)element.textContent=short(amount);
   }
   const count=root.querySelector('[data-mega-count]');
   if(count)count.textContent=String(data.totals.activeMembers);
   const coverage=root.querySelector('[data-mega-coverage]');
   if(coverage)coverage.textContent=data.totals.missing?
    'Partial totals · '+data.totals.withBoth+'/'+data.totals.recordedMembers+' recorded members have both totals':
    'Complete recorded roster coverage · '+data.totals.withBoth+'/'+data.totals.activeMembers;
   const latest=root.querySelector('[data-mega-updated]');
   const sourceAt=data.sync?.last_source_at||0;
   if(latest)latest.textContent='Latest known source: '+date(sourceAt||data.bank?.as_of);
   const indicator=root.querySelector('[data-mega-syncstatus]');
   if(indicator)indicator.textContent=!data.syncEnabled?'No authorized live feed configured':
    !data.sync?.last_success?'Awaiting first authorized sync':
    sourceAt&&Date.now()-sourceAt>15*60000?'Source outdated — showing last saved values':
    'Authorized feed last synced '+date(data.sync.last_success);
   rebuildRows(data);
   if(status)status.textContent='Updated from saved records '+new Date().toLocaleTimeString();
  }catch{
   if(status)status.textContent='Refresh unavailable — showing last saved values';
  }finally{busy=false;if(refresh)refresh.disabled=false;}
 }
 refresh?.addEventListener('click',()=>{void update();});
 const timer=setInterval(()=>{if(document.visibilityState==='visible')void update();},300000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
