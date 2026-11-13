// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read all *visible* pages of the official InPvP Members section, one team at
// a time. Do not infer membership from transaction history or the member count.
import {extractTeamMembers} from './mega-top10-roster.js';
import {validGamertag} from './mega-team.js';

const validTeamUrl=(url,id)=>{
 try{
  const parsed=new URL(url);
  return parsed.protocol==='https:'&&parsed.hostname==='inpvp.net'&&
    parsed.pathname==='/megasmp/teams'&&parsed.searchParams.get('id')===id;
 }catch{return false;}
};
const wait=(page,ms)=>typeof page.waitForTimeout==='function'?
 page.waitForTimeout(ms):new Promise(done=>setTimeout(done,ms));

function mergeRows(found,rows){
 for(const row of rows||[]){
  const name=validGamertag(row?.gamertag);
  if(!name)continue;
  const key=name.toLowerCase();
  const prior=found.get(key);
  if(!prior)found.set(key,{gamertag:name,
    role:['Leader','Officer','Member'].includes(row.role)?row.role:'Member'});
  else if(prior.role==='Member'&&['Leader','Officer'].includes(row.role))
   prior.role=row.role;
  if(found.size>=300)break;
 }
}
async function revealMembersTab(page){
 // Ordinary visible UI controls only, never website APIs, scripting the login
 // flow or attempting to bypass restricted member data.
 for(const kind of ['tab','button','link']){
  const group=page.getByRole?.(kind,{name:/^(?:(?:Team )?Members|Roster)(?:\s*\(\d+\))?$/i});
  if(!group||!(await group.count().catch(()=>0)))continue;
  const button=group.first();
  if(!(await button.isVisible().catch(()=>false)))continue;
  if(kind!=='link'&&!(await button.isEnabled().catch(()=>false)))continue;
  try{
   await button.click({timeout:3500});
   await wait(page,350);
   return true;
  }catch{}
 }
 return false;
}

/** Normal UI scrolling and paging, scoped to an explicitly labeled member section. */
export async function advanceTeamMemberList(page){
 return page.evaluate(()=>{
  const clean=v=>String(v||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const heading=/^(?:Team\s+)?Members(?:\s*\([\d,]+\))?$|^Roster$/i;
  const visible=element=>{
   if(!element||!element.getBoundingClientRect)return false;
   const box=element.getBoundingClientRect();
   const style=getComputedStyle(element);
   return box.width>0&&box.height>0&&style.display!=='none'&&
    style.visibility!=='hidden';
  };
  const headings=[...document.querySelectorAll(
   'h2,h3,h4,h5,[role="heading"],button,[role="tab"],strong,span')]
    .filter(el=>clean(el.textContent).length<80&&heading.test(clean(el.textContent))&&visible(el));
  let container=null;
  for(const h of headings){
   let parent=h.closest('section,article,[role="tabpanel"],[data-testid*="member"]');
   if(!parent){
    parent=h.parentElement;
    for(let i=0;i<6&&parent;i++,parent=parent.parentElement){
     if(parent.querySelectorAll('li,tr,[role="row"],[data-player-name],img').length>0)break;
    }
   }
   if(!parent)continue;
   const words=String(parent.innerText||'');
   if(words.length>22000)continue;
   container=parent;break;
  }
  if(!container)return {action:'none'};
  const controls=[...container.querySelectorAll('button,[role="button"],a[href]')];
  const pattern=/^(?:load|show|view)\s+(?:more|all)(?:\s+(?:members|players))?$|^next(?:\s+page)?(?:\s*[>→»])?$/i;
  for(const control of controls){
   const label=clean(control.getAttribute('aria-label')||control.innerText||control.textContent);
   if(!pattern.test(label)||!visible(control)||control.disabled||
      control.getAttribute('aria-disabled')==='true')continue;
   control.click();
   return {action:'next'};
  }
  // Many team rosters are virtualized and only expose the current scroll page.
  // Prefer an internal scrollable list; never scroll unrelated site panels.
  const panels=[container,...container.querySelectorAll('*')];
  for(const panel of panels){
   if(!visible(panel)||panel.scrollHeight<=panel.clientHeight+40)continue;
   const css=getComputedStyle(panel);
   if(!/(auto|scroll)/.test(css.overflowY))continue;
   if(panel.scrollTop+panel.clientHeight+8>=panel.scrollHeight)continue;
   panel.scrollTop=Math.min(panel.scrollHeight,panel.scrollTop+Math.max(180,panel.clientHeight*.85));
   return {action:'scroll'};
  }
  return {action:'none'};
 });
}

export async function collectFullTeamRoster(page,{
 teamId,reportedCount=null,maxActions=32
}={}){
 if(typeof teamId!=='string'||!validTeamUrl(page.url(),teamId))
  throw new Error('Member collection started outside the expected team.');
 const known=new Map();
 const confirmedTotal=Number.isSafeInteger(reportedCount)&&reportedCount>=0&&reportedCount<=300;
 let expected=confirmedTotal?reportedCount:null;
 const limit=Math.min(50,Math.max(1,Math.trunc(maxActions)||1));
 let tabOpened=false,noProgress=0,lastAction='none',readable=false;
 for(let i=0;i<limit;i++){
  if(!validTeamUrl(page.url(),teamId))
   throw new Error('Members navigation left the expected InPvP team.');
  const before=known.size;
  const sample=await extractTeamMembers(page);
  if(expected===null&&Number.isSafeInteger(sample.diagnostics?.reportedCount)&&
    sample.diagnostics.reportedCount>=0&&sample.diagnostics.reportedCount<=300)
   expected=sample.diagnostics.reportedCount;
  readable=readable||!!sample.hasMemberSection||sample.roster.length>0;
  mergeRows(known,sample.roster);
  if(expected!==null&&known.size===expected)break;
  if(known.size>=300)break;
  const advance=await advanceTeamMemberList(page).catch(()=>({action:'none'}));
  lastAction=advance?.action||'none';
  if(lastAction==='none'&&!tabOpened){
   tabOpened=true;
   if(await revealMembersTab(page))lastAction='tab';
  }
  if(lastAction==='none')break;
  if(known.size===before)noProgress++;else noProgress=0;
  if(noProgress>=5)break;
  await wait(page,lastAction==='next'?650:380);
 }
 if(!validTeamUrl(page.url(),teamId))
  throw new Error('Members navigation left the expected InPvP team.');
 const roster=[...known.values()];
 // A per-page count must not be mistaken for the total number on the team.
 const complete=confirmedTotal&&expected!==null&&roster.length===expected&&readable;
 return {roster,rosterComplete:complete,memberStatus:
  complete?'complete':roster.length?'partial':'unavailable',
  memberCount:expected,seen:roster.length,visibleSection:readable,
  lastAction};
}
