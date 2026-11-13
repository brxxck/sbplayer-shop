// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// InPvP UI-only collection. No undocumented API calls or authentication bypass.
import {TOP10_URL,verifyTeamLink,canonicalTeamLink} from './mega-top10-store.js';
import {extractTeamOverview,extractBankRows,openBankTab,openEventLogSection,
  revealTeamEventLog} from './mega-team-page-collector.js';
import {validGamertag} from './mega-team.js';

const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const pause=(page,ms)=>typeof page.waitForTimeout==='function'?page.waitForTimeout(ms):sleep(ms);

export async function extractTop10Rows(page){
 return page.evaluate(()=>{
   const clean=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
   // The official listing is a table: rank, name, views, bank and level.
   // Also recognize an accessible role=row fallback after SPA hydration.
   let selector='table tbody tr';
   let candidates=[...document.querySelectorAll(selector)];
   if(candidates.length<10){
     selector='[role="row"]';
     candidates=[...document.querySelectorAll(selector)];
   }
   const rows=[];
   for(const [index,row] of candidates.entries()){
     const cells=[...row.querySelectorAll(':scope > td,:scope > [role="cell"]')];
     if(cells.length<4)continue;
     const rankText=clean(cells[0].innerText||cells[0].textContent);
     if(!/^(?:#\s*)?\d{1,2}$/.test(rankText))continue;
     const rank=Number(rankText.replace('#','').trim());
     if(rank<1||rank>10)continue;
     const name=clean(cells[1].innerText||cells[1].textContent);
     if(!/^[a-z0-9][a-z0-9 _#.'-]{0,63}$/i.test(name))continue;
     const link=cells[1].querySelector('a[href]')||row.querySelector('a[href*="gamemode=megasmp"]');
     const external=link?.href||row.getAttribute('data-href')||row.getAttribute('data-url')||'';
     const dataId=row.getAttribute('data-team-id')||cells[1].getAttribute('data-team-id')||'';
     const views=clean(cells[2]?.innerText||cells[2]?.textContent);
     const bank=clean(cells[3]?.innerText||cells[3]?.textContent);
     const level=clean(cells[4]?.innerText||cells[4]?.textContent);
     rows.push({index,selector,rank,name,external,dataId,
       views:/^\d[\d,]*$/.test(views)?Number(views.replaceAll(',','')):null,
       bankText:/^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i.test(bank)?bank:null,
       level:/^\d{1,6}$/.test(level)?Number(level):null});
   }
   // Reject partially rendered or duplicate leaderboard DOM, never fabricate ranks.
   const unique=new Map(rows.map(x=>[x.rank,x]));
   return [...unique.values()].sort((a,b)=>a.rank-b.rank).slice(0,10);
 });
}
async function readReadyTop10(page){
 for(let attempt=0;attempt<12;attempt++){
   const rows=await extractTop10Rows(page);
   if(rows.length===10&&rows.every((row,i)=>row.rank===i+1))return rows;
   await pause(page,attempt<5?500:900);
 }
 throw new Error('InPvP Top 10 listing was not fully rendered. Previous ranking preserved.');
}
const knownByName=known=>new Map(known.map(t=>[String(t.name).toLowerCase(),t.url]));

export async function captureTop10Leaderboard(page,{knownTeams=[]}={}){
 await page.goto(TOP10_URL,{waitUntil:'domcontentloaded',timeout:30000});
 const rows=await readReadyTop10(page);
 const known=knownByName(knownTeams),resolved=[];
 for(const row of rows){
   let url=row.external;
   if(url){
     try{
       const value=verifyTeamLink(url);
       if(value.name.toLowerCase()!==row.name.toLowerCase())throw new Error('Team name differs from URL.');
       url=value.url;
     }catch{url='';}
   }
   if(!url&&row.dataId){
     try{url=canonicalTeamLink(row.name,row.dataId);}catch{}
   }
   if(!url){
     // A source-provided link discovered on a prior poll is safe to reuse;
     // current rank and figures still come from the newly rendered table.
     const previous=known.get(row.name.toLowerCase());
     if(previous){
       try{url=verifyTeamLink(previous).url;}catch{}
     }
   }
   if(!url){
     // New team without an <a href>: follow the visible team name exactly as
     // a normal user would. Only trust the resulting official InPvP URL.
     try{
       const candidate=page.locator(row.selector).nth(row.index);
       const nameCell=candidate.locator('td,[role="cell"]').nth(1);
       await nameCell.click({timeout:4500});
       await page.waitForURL(u=>u.hostname==='inpvp.net'&&u.searchParams.has('id'),
         {timeout:6000});
       const detail=verifyTeamLink(page.url());
       if(detail.name.toLowerCase()===row.name.toLowerCase())url=detail.url;
     }catch{}
     finally{
       // A route change may re-render or reorder the directory; reload before
       // following the next unknown team.
       await page.goto(TOP10_URL,{waitUntil:'domcontentloaded',timeout:30000});
       await readReadyTop10(page);
     }
   }
   if(!url)throw new Error('New Top 10 team has no discoverable official URL: ranking not overwritten.');
   resolved.push({rank:row.rank,url,bankText:row.bankText,level:row.level,views:row.views});
 }
 return resolved;
}

export async function captureTopTeamDetails(page,team){
 const target=verifyTeamLink(team.url);
 if(target.id!==team.id)throw new Error('Unrecognized team detail target.');
 await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:30000});
 const opened=new URL(page.url());
 if(opened.protocol!=='https:'||opened.hostname!=='inpvp.net'||
    opened.searchParams.get('id')!==target.id)
   throw new Error('Team page redirected away from the approved InPvP team.');
 await pause(page,650);
 const overview=await extractTeamOverview(page);
 const detail=await page.evaluate(()=>{
   const clean=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
   const body=document.body?.innerText||'';
   const count=/\b(?:Members|Team Members)\s*\(([\d,]+)\)/i.exec(body);
   const labeled=label=>{
     const re=new RegExp('(?:^|\\n)\\s*'+label+'\\s*:?\\s*([\\d,]+)\\b','im');
     const found=re.exec(body);return found?Number(found[1].replaceAll(',','')):null;
   };
   const members=[];
   // Only extract players within an explicitly labeled Members / Roster area.
   const sections=[...document.querySelectorAll('section,article,[data-testid]')];
   const parent=sections.find(el=>{
     const head=el.querySelector('h1,h2,h3,h4,[role="heading"]');
     return head&&/^(?:Team Members|Roster|Members)(?:\s*\(\d+\))?$/i.test(clean(head.textContent));
   });
   if(parent){
     const unique=new Set();
     const rows=[...parent.querySelectorAll('tr,li,[role="row"],[data-player-name]')];
     for(const row of rows){
       if(members.length>=300)break;
       const explicit=row.getAttribute('data-player-name')||
         row.querySelector('[data-player-name]')?.getAttribute('data-player-name');
       const profile=row.querySelector('a[href*="/profile"],a[href*="/player"]');
       const first=clean(explicit||profile?.textContent||row.querySelector('td:first-child')?.textContent||'');
       if(!/^[a-z0-9_. #\-]{2,32}$/i.test(first)||unique.has(first.toLowerCase()))continue;
       unique.add(first.toLowerCase());
       const role=/\b(Leader|Officer)\b/i.exec(clean(row.innerText||''));
       members.push({gamertag:first,role:role?role[1]:'Member'});
     }
   }
   return {memberCount:count?Number(count[1].replaceAll(',','')):null,
     level:labeled('Level'),views:labeled('Views'),roster:members};
 });
 let events=[];
 // Bounded, visible Bank Event Log reading. Missing events are not proof of zero.
 try{
   await revealTeamEventLog(page,{checks:6,intervalMs:350});
   await openEventLogSection(page);
   await openBankTab(page);
   await pause(page,350);
   events=await extractBankRows(page,{maxRows:500});
 }catch{
   events=[];
 }
 // The saved page may show roster, bank or level even when Bank events are not
 // available. Do not replace good records with missing/null values.
 const roster=(detail.roster?.length?detail.roster:overview.roster)||[];
 const bankText=overview.bankBalance||null;
 if(!roster.length&&!events.length&&bankText===null&&
   detail.memberCount===null&&detail.level===null&&detail.views===null)
   throw new Error('InPvP detail not available; existing saved observations retained.');
 return {id:team.id,roster:roster.filter(x=>validGamertag(x.gamertag)),
   memberCount:detail.memberCount,bankText,
   level:detail.level,views:detail.views,events};
}
