// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read the rendered InPvP website, never a private/undocumented API.
// Supports native HTML tables, accessible rows, CSS grid and displayed text.
import {TOP10_URL,verifyTeamLink,canonicalTeamLink} from './mega-top10-store.js';
import {parseTop10Snapshot} from './mega-top10-dom.js';
import {collectFullTeamRoster} from './mega-top10-member-pages.js';

const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const pause=(page,ms)=>typeof page.waitForTimeout==='function'?page.waitForTimeout(ms):sleep(ms);

export async function extractTop10Rows(page){
 const snapshot=await page.evaluate(()=>{
   const clean=value=>String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
   const root=document.querySelector('main')||document.body;
   const fullText=String(root?.innerText||'').slice(0,18000);
   const allText=String(document.body?.innerText||'').slice(0,20000);
   // Read only bounding structural information and table rows. No tokens,
   // browser-storage data, request headers, URLs or account text are logged.
   const hints={
     tableCount:document.querySelectorAll('table tbody tr').length,
     roleCount:document.querySelectorAll('[role="row"]').length,
     styledCount:document.querySelectorAll('[data-team-id], [class*="grid"], [class*="cursor-pointer"], [class*="team-row"]').length,
     syncing:/\bTeam data sync in progress\b|\bLoading (?:teams|team data|leaderboard)\b/i.test(fullText),
     verification:/\bverify you are human\b|\bcaptcha\b|\bsecurity challenge\b/i.test(allText),
     login:/\blogin required\b|\bsign in to (?:view|access)\b/i.test(fullText),
     search:/Search by team name, player, or ID/i.test(fullText),
     columns:/\bTEAM\b[\s\S]{0,50}\bVIEWS\b[\s\S]{0,50}\bBANK\b[\s\S]{0,50}\bLEVEL\b/i.test(fullText)
   };
   const collect=(selector,limit=300)=>{
     const result=[];
     for(const [index,node] of [...document.querySelectorAll(selector)].slice(0,limit).entries()){
       const children=[...node.querySelectorAll(':scope > td, :scope > [role="cell"]')];
       const cells=children.length>=5?children:[...node.children];
       if(cells.length<5||cells.length>25)continue;
       const parts=cells.slice(0,5).map(el=>clean(el.innerText||el.textContent));
       if(parts.some(x=>x.length>140))continue;
       const rank=parts[0],name=parts[1],views=parts[2],bank=parts[3],level=parts[4];
       if(!/^#?\s*(?:10|[1-9])$/.test(rank)||
          !/^[a-z0-9][a-z0-9 _#.'-]{0,63}$/i.test(name)||
          !/^[\d,]+$/.test(views)||!/\$[\d,.]+[KMBT]?/i.test(bank)||!/^\d{1,6}$/.test(level))
         continue;
       const link=cells[1].querySelector?.('a[href*="/megasmp/teams?"]')||
         node.querySelector('a[href*="/megasmp/teams?"]');
       const external=link?.href||node.getAttribute('data-href')||
         node.getAttribute('data-url')||'';
       const dataId=node.getAttribute('data-team-id')||
         cells[1].getAttribute('data-team-id')||'';
       result.push({index,selector,rank,name,views,bankText:bank,level,external,dataId});
     }
     return result;
   };
   // Return a bounded, in-memory snapshot; no raw source text is persisted
   // or written into Railway logs.
   return {
     tableRows:collect('table tbody tr',120),
     roleRows:collect('[role="row"]',180),
     styledRows:collect('[data-team-id], [class*="team-row"], [class*="cursor-pointer"], [class*="grid"]',600),
     visibleText:fullText,
     hints
   };
 });
 return parseTop10Snapshot(snapshot);
}

async function readReadyTop10(page){
 let last={mode:'empty',rows:0};
 // Allow a slower InPvP hydration cycle than v1.8's ~8 seconds, but keep
 // this bounded to avoid holding the shared bank collector indefinitely.
 for(let attempt=0;attempt<22;attempt++){
   const snapshot=await extractTop10Rows(page);
   last=snapshot.diagnostics;
   const rows=snapshot.rows;
   if(rows.length===10&&rows.every((row,i)=>row.rank===i+1))return rows;
   if((last.mode==='verification'||last.mode==='sign-in')&&attempt>=2)break;
   await pause(page,attempt<5?550:900);
 }
 const error=new Error('InPvP Top 10 listing was not fully rendered. Previous ranking preserved.');
 error.safeDiagnostic=last; // Contains only counts/flags, never source data.
 throw error;
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
       if(row.selector&&row.index>=0&&row.discovery!=='text'){
         const candidate=page.locator(row.selector).nth(row.index);
         const nameCell=candidate.locator('td,[role="cell"]').nth(1);
         await nameCell.click({timeout:4500});
       }else{
         // CSS grids have no <tr>/<td>; click the exact visible team name.
         // This is ordinary browser navigation, not an API or authentication bypass.
         await page.getByText(row.name,{exact:true}).first().click({timeout:4500});
       }
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
 const detail=await page.evaluate(()=>{
  const body=String(document.body?.innerText||'');
  const count=/\b(?:Team\s+)?Members\s*\(([\d,]+)\)/i.exec(body)||
    /\b(?:Team\s+)?Members\s*:\s*([\d,]+)\b/i.exec(body)||
    /\b([\d,]+)\s+(?:Team\s+)?Members\b/i.exec(body);
  const bank=/(?:Team Bank|Bank Balance|Team Balance)\s*[:\s]*(\$[\d,]+(?:\.\d{1,3})?[KMBT]?)(?![\w.])/i.exec(body);
  return {memberCount:count?Number(count[1].replaceAll(',','')):null,
   bankText:bank?.[1]||null};
 });
 // The official leaderboard already provides a bank balance. The team page
 // gives us another read when it exposes a labeled balance directly.
 // Do not interpret a player's wallet or a transaction amount as team bank.
 const members=await collectFullTeamRoster(page,{
  teamId:team.id,reportedCount:detail.memberCount,maxActions:36
 });
 return {
  id:team.id,
  roster:members.roster,
  rosterComplete:members.rosterComplete,
  memberStatus:members.memberStatus,
  memberCount:members.memberCount??detail.memberCount,
  bankText:detail.bankText,
  level:null,views:null,events:[],
  pagesScanned:Math.min(36,Number(members.lastAction!=='none')+1)
 };
}
