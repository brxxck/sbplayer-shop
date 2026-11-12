// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Prepared InPvP read-only page collector. Requires staff permission for automation.
// Never signs in by guessing, bypasses challenges, calls undocumented endpoints,
// requests team-bank changes, or sends account credentials to another service.
// The actual site DOM is not yet available for calibration: selector override supported.
import {MEGA_TEAM_ID,MEGA_TEAM_URL,MEGA_TEAM_NAME} from './mega-team.js';

const WAIT_MS=450;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bankPattern=/\b(?:Deposited|Deposit|Withdrew|Withdrawn|Withdrawal)\s+\$?[\d,]+(?:\.\d{1,2})?\s*$/i;
const MAX_ROWS=10000;
export const AUTOMATION_PERMISSION_NOTE='MegaSMP staff have confirmed read-only automated checking is allowed.';

export async function extractBankRows(page,{selector='',maxRows=MAX_ROWS}={}){
  if(typeof selector!=='string'||selector.length>250)throw new Error('Event row selector must be short.');
  return page.evaluate(({selector,cap})=>{
    const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const pattern=/\b(?:Deposited|Deposit|Withdrew|Withdrawn|Withdrawal)\s+\$?[\d,]+(?:\.\d{1,2})?\s*$/i;
    const timestamp=/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s+\d{4})?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i;
    const container=document.querySelector('[data-testid="team-event-log"]')||
      [...document.querySelectorAll('section,article')].find(el=>
        /Event Log/i.test((el.querySelector('h1,h2,h3,h4')?.textContent||'')));
    const root=container||document;
    const elements=selector?[...root.querySelectorAll(selector)]:[...root.querySelectorAll(
      'tr,li,[role="row"],[data-event-id],[data-testid*="event"],div')];
    const candidates=[];
    for(const el of elements){
      const text=clean(el.innerText||el.textContent);
      if(text.length<12||text.length>320||!pattern.test(text)||!timestamp.test(text))continue;
      // Prevent treating an entire bank feed or nested wrapper as one event.
      const verbs=(text.match(/\b(?:Deposited|Withdrew|Withdrawn|Withdrawal)\s+\$?[\d,]+/gi)||[]).length;
      if(verbs!==1)continue;
      candidates.push({el,text});
    }
    const leaf=candidates.filter(item=>!candidates.some(other=>item!==other&&item.el.contains(other.el)));
    return leaf.slice(0,cap).map(item=>{
      const el=item.el;
      const sourceId=el.getAttribute('data-event-id')||el.closest('[data-event-id]')?.getAttribute('data-event-id')||'';
      const time=el.querySelector('time');
      const iso=time?.getAttribute('datetime')||'';
      return {text:item.text,eventId:sourceId,timestamp:/^\d{4}-\d\d-\d\dT/.test(iso)?iso:null};
    });
  },{selector,cap:maxRows});
}
// Bank can appear as a tab, button or clickable label on different page layouts.
// A visible button is not necessarily actionable: Playwright may be waiting on
// hydration, animation or an ordinary overlay. Try bounded, accessible actions;
// never force-click, dispatch synthetic DOM events or bypass verification.
export async function openBankTab(page){
  const groups=[
    ['tab',page.getByRole('tab',{name:/^Bank$/i})],
    ['button',page.getByRole('button',{name:/^Bank$/i})],
    ['label',page.getByText('Bank',{exact:true})]
  ];
  const problems=[];
  let visible=0;
  for(const [kind,locator] of groups){
    const count=Math.min(await locator.count(),5);
    for(let i=0;i<count;i++){
      const target=typeof locator.nth==='function'?locator.nth(i):locator.first();
      if(!await target.isVisible().catch(()=>false))continue;
      visible++;
      const attr=async name=>{
        try{return typeof target.getAttribute==='function'?await target.getAttribute(name):null;}
        catch{return null;}
      };
      const selected=await attr('aria-selected');
      const state=await attr('data-state');
      const pressed=await attr('aria-pressed');
      if(selected==='true'||state==='active'||pressed==='true')return true;
      const enabled=typeof target.isEnabled==='function'?
        await target.isEnabled().catch(()=>false):true;
      if(!enabled){problems.push(kind+' disabled');continue;}
      try{
        await target.click({timeout:7500});
        await delay(WAIT_MS);
        return true;
      }catch(error){
        // A verification/anti-bot screen requires normal user intervention.
        if(await page.getByText(/verify you are human|captcha|security challenge/i).count())
          throw new Error('Bank page requires human verification; collector did not bypass it.');
        // Keyboard activation is a normal accessible alternative to a pointer
        // click blocked by site layout. Do not attempt it for non-controls.
        if(kind!=='label'&&typeof target.press==='function'){
          try{
            await target.press('Enter',{timeout:3500});
            await delay(WAIT_MS);
            return true;
          }catch{/* Try another matching control rather than ending this capture. */}
        }
        const message=String(error?.message||'');
        problems.push(kind+(/timeout/i.test(message)?' click timed out':' click failed'));
      }
    }
  }
  if(visible)throw new Error('Bank tab is visible but not actionable ('+
    [...new Set(problems)].slice(0,3).join('; ')+
    '). Check loading state, sign-in and blocking overlays.');
  return false;
}
// Open the parent Event Log view before looking for its Bank sub-tab.
// The website may render neither child control until this view is selected.
export async function openEventLogSection(page){
 const groups=[
  page.getByRole('tab',{name:/\bEvent Log\b/i}),
  page.getByRole('button',{name:/\bEvent Log\b/i}),
  page.getByRole('link',{name:/\bEvent Log\b/i}),
  page.getByText('Event Log',{exact:true})
 ];
 for(const group of groups){
  const count=Math.min(await group.count(),5);
  for(let i=0;i<count;i++){
   const target=typeof group.nth==='function'?group.nth(i):group.first();
   if(!await target.isVisible().catch(()=>false))continue;
   if(typeof target.getAttribute==='function'){
    const selected=await target.getAttribute('aria-selected').catch(()=>null);
    const state=await target.getAttribute('data-state').catch(()=>null);
    if(selected==='true'||state==='active')return true;
   }
   if(typeof target.isEnabled==='function'&&!await target.isEnabled().catch(()=>false))continue;
   try{
    await target.click({timeout:6000});
    await delay(WAIT_MS);
    return true;
   }catch{
    if(await page.getByText(/verify you are human|captcha|security challenge/i).count())
     throw new Error('Event Log requires human verification; collector did not bypass it.');
    if(typeof target.press==='function'){
     try{await target.press('Enter',{timeout:3000});await delay(WAIT_MS);return true;}
     catch{/* Try the next visible Event Log control. */}
    }
   }
  }
 }
 return false;
}

async function alreadyShowingBankRows(page,selector){
 try{
  const rows=await extractBankRows(page,{selector,maxRows:2});
  return Array.isArray(rows)&&rows.length>0;
 }catch{return false;}
}

// Only expose allowlisted booleans in errors; no page contents, cookies or user data.
async function teamPageSignals(page){
 try{
  return await page.evaluate(teamId=>{
   const main=document.querySelector('main')||document.body;
   const text=String(main?.innerText||'').slice(0,60000);
   return {
    team:text.includes(teamId),
    events:/\bEvent Log\b/i.test(text),
    bank:/\bBank\b/i.test(text),
    members:/\bMembers\s*\(\d+\)/i.test(text),
    balance:/\bBank Balance\b/i.test(text),
    signin:/sign in (?:with microsoft|to (?:view|see|access))|login required/i.test(text),
    directory:/browse the top teams/i.test(text)
   };
  },MEGA_TEAM_ID);
 }catch{return {team:false,events:false,bank:false,members:false,balance:false,signin:false,directory:false};}
}

// SPA hydration can delay both parent and child controls. Bound the retries and
// distinguish a missing team detail view from an interactive tab failure.
// The public SBsxScam Event Log sits below members/team details. Traverse
// the visible document like a reader to activate the page's lazy rendering.
export async function revealTeamEventLog(page,{checks=14,intervalMs=500}={}){
 const count=Math.min(Math.max(1,Math.trunc(checks)||1),24);
 for(let step=0;step<count;step++){
  const result=await page.evaluate(({step,total})=>{
   const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
   const headings=[...document.querySelectorAll('h1,h2,h3,h4,[role="heading"]')];
   const target=headings.find(el=>/^Event Log(?:\s*\([\d,]+\))?$/i.test(clean(el.textContent)));
   if(target){
    target.scrollIntoView({block:'center',behavior:'instant'});
    return {found:true};
   }
   const root=document.scrollingElement||document.documentElement;
   const height=Math.max(root.scrollHeight,document.body?.scrollHeight||0);
   const max=Math.max(0,height-window.innerHeight);
   const next=Math.min(max,Math.max(root.scrollTop+window.innerHeight*.85,max*(step+1)/total));
   window.scrollTo({top:next,behavior:'instant'});
   return {found:false};
  },{step,total:count}).catch(()=>({found:false}));
  if(result?.found){await delay(350);return true;}
  await delay(intervalMs);
 }
 return false;
}

export async function selectBankEventLog(page,{selector='',viewportChecks=14}={}){
 const waits=[0,600,1000,1500,1900];
 let parentOpened=false,scrolled=false;
 for(let step=0;step<waits.length;step++){
  if(waits[step])await delay(waits[step]);
  if(await openBankTab(page))return true;
  if(!parentOpened&&(step===0||step===2)){
   parentOpened=await openEventLogSection(page);
   if(parentOpened){
    await delay(650);
    if(await openBankTab(page))return true;
   }
  }
  if(await alreadyShowingBankRows(page,selector))return true;
  if(!scrolled&&step===0){
   scrolled=true;
   await revealTeamEventLog(page,{checks:viewportChecks});
   if(await openBankTab(page))return true;
  }
 }
 const flags=await teamPageSignals(page);
 if(flags.signin)throw new Error('Event Log requires sign-in or verification; collector did not bypass it.');
 if(flags.team&&!flags.events)throw new Error('Team profile loaded but Event Log absent after scrolling '+
  '(members:'+!!flags.members+',balance:'+!!flags.balance+'). Check lazy loading.');
 if(flags.directory&&!flags.events)throw new Error('Team detail view unavailable after scrolling: directory visible without Event Log.');
 throw new Error('Bank tab missing after scrolling to Event Log (team:'+!!flags.team+
  ',events:'+!!flags.events+',bank:'+!!flags.bank+'). Check public page layout.');
}

async function scrollEventLog(page){
  return page.evaluate(()=>{
    const candidates=[...document.querySelectorAll('*')].filter(el=>{
      if(el.clientHeight<80||el.scrollHeight<=el.clientHeight+5)return false;
      const style=getComputedStyle(el);
      return /(auto|scroll)/.test(style.overflowY);
    });
    // Prefer the actual event list over the page body.
    const eventLists=candidates.filter(el=>/Deposited|Withdrew|Withdrawn/i.test(el.innerText||''));
    const target=(eventLists.length?eventLists:candidates)
      .sort((a,b)=>(a.scrollHeight-a.clientHeight)-(b.scrollHeight-b.clientHeight))[0];
    if(!target)return {scrolled:false,atEnd:true};
    const before=target.scrollTop;
    target.scrollTop=Math.min(target.scrollHeight,Math.ceil(before+Math.max(100,target.clientHeight*.9)));
    target.dispatchEvent(new Event('scroll',{bubbles:true}));
    return {scrolled:target.scrollTop!==before,atEnd:target.scrollTop+target.clientHeight>=target.scrollHeight-4};
  });
}
async function nextPage(page){
  // Read-only pagination controls; no undocumented endpoints or bulk scraping.
  // Narrow names deliberately avoid unrelated "Show more" account controls.
  const selectors=[
    page.getByRole('button',{name:/^(Next|Next page|Load more events|Show older events|More events)$/i}),
    page.getByRole('link',{name:/^(Next|Next page)$/i})
  ];
  for(const next of selectors){
    if(await next.count()&&await next.first().isVisible()&&await next.first().isEnabled()){
      await next.first().click({timeout:5000});
      return true;
    }
  }
  return false;
}

// Read only labeled team information, never infer membership from bank activity.
export async function extractTeamOverview(page){
 return page.evaluate(()=>{
  const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
  const body=document.body?.innerText||'';
  let bankBalance=null;
  const match=body.match(/(?:Team Bank|Bank Balance|Team Balance)\s*[:\n]?\s*(\$[\d,]+(?:\.\d{1,2})?)/i);
  if(match)bankBalance=match[1];
  let roster=[];
  const section=[...document.querySelectorAll('section,article,[data-testid]')].find(el=>{
   const h=el.querySelector('h1,h2,h3,h4');
   return h&&/^(Team Members|Roster|Members)$/i.test(clean(h.textContent));
  });
  if(section){
   const items=[...section.querySelectorAll('tr,li,[role="row"],[data-player-name]')];
   roster=items.map(el=>{
    const tag=clean(el.getAttribute('data-player-name')||el.querySelector('[data-player-name]')?.getAttribute('data-player-name')||'');
    const role=/(?:^|\s)(Leader|Officer)(?:$|\s)/i.exec(clean(el.innerText||''));
    return tag?{gamertag:tag,role:role?role[1]:'Member'}:null;
   }).filter(Boolean);
  }
  return {roster:roster.slice(0,300),bankBalance};
 });
}

export async function captureTeamBankPage(page,{
 url=MEGA_TEAM_URL,selector=process.env.MEGA_TEAM_BANK_ROW_SELECTOR||'',
 maxScrolls=60,maxPages=60
}={}){
  const dest=new URL(url);
  if(dest.protocol!=='https:'||dest.hostname!=='inpvp.net'||dest.searchParams.get('id')!==MEGA_TEAM_ID||
     dest.searchParams.get('team')!==MEGA_TEAM_NAME||dest.searchParams.get('gamemode')!=='megasmp')
    throw new Error('Only the configured SBsxScam team URL may be captured.');
  await page.goto(dest.toString(),{waitUntil:'domcontentloaded',timeout:30000});
  const current=new URL(page.url());
  if(current.hostname!=='inpvp.net'||current.searchParams.get('id')!==MEGA_TEAM_ID)
    throw new Error('Team page redirected to an unexpected destination or a login page.');
  if(await page.getByText(/challenge|verify you are human|captcha/i).count())
    throw new Error('Browser challenge requires normal user action; collector will not bypass it.');
  // Preserve roster and balance seen in either view; SPA hydration and
  // switching to Bank can hide information from the overview screen.
  const before=await extractTeamOverview(page);
  await selectBankEventLog(page,{selector});
  const after=await extractTeamOverview(page);
  const overview={
    roster:before?.roster?.length?before.roster:(after?.roster||[]),
    bankBalance:after?.bankBalance??before?.bankBalance??null
  };
  const afterBank=new URL(page.url());
  if(afterBank.hostname!=='inpvp.net'||afterBank.searchParams.get('id')!==MEGA_TEAM_ID)
    throw new Error('Bank tab navigation left the approved team page; capture rejected.');

  const found=new Map();
  let pagesVisited=0,loops=0,noGrowth=0,reportedCount=null;
  for(let pageIndex=0;pageIndex<maxPages;pageIndex++){
    pagesVisited++;
    for(let i=0;i<maxScrolls;i++){
      loops++;
      const rows=await extractBankRows(page,{selector});
      const start=found.size;
      // Do not accidentally collapse separate identical no-ID transactions.
      // Per snapshot occurrence numbers are assigned in the parser, after collection.
      // Text+explicit event ID is only used to dedupe DOM virtualization repeats.
      const occurrences=new Map();
      for(const row of rows){
        const keyText=row.text.replace(/\s+/g,' ').trim();
        const ordinal=(occurrences.get(keyText)||0)+1;
        occurrences.set(keyText,ordinal);
        // Stable across viewport shifts. Identical events in different viewports
        // remain an explicit ambiguity unless provider IDs are available.
        const key=row.eventId?'id:'+row.eventId:'text:'+keyText+':'+ordinal;
        if(!found.has(key))found.set(key,row);
      }
      if(found.size>=MAX_ROWS)break;
      noGrowth=found.size===start?noGrowth+1:0;
      const move=await scrollEventLog(page);
      if(!move.scrolled&&noGrowth>=2)break;
      if(move.atEnd&&noGrowth>=2)break;
      await delay(400);
    }
    if(found.size>=MAX_ROWS||!await nextPage(page))break;
    // Ensure page navigation stays on the explicitly selected team.
    const afterPage=new URL(page.url());
    if(afterPage.hostname!=='inpvp.net'||afterPage.searchParams.get('id')!==MEGA_TEAM_ID)
      throw new Error('Event pagination navigated away from the approved team page.');
    await delay(600);
  }
  const rows=[...found.values()];
  if(!rows.length)throw new Error('No bank events were visible; cannot verify the page layout.');
  // The counter can be larger than visible events; never claim complete history then.
  const display=await page.locator('body').innerText({timeout:3000});
  const match=/Event Log\s*\(([\d,]+)\)/i.exec(display.slice(0,20000));
  if(match)reportedCount=Number(match[1].replaceAll(',',''));
  const incomplete=reportedCount===null||rows.length<reportedCount;
  return {teamId:MEGA_TEAM_ID,rows,roster:overview.roster,bankBalance:overview.bankBalance,reportedCount,
    scan:{pagesVisited,scrollOperations:loops,rowSelector:selector||'automatic'},
    historyComplete:false, // No provider IDs/full-history guarantee from visible HTML alone.
    incomplete,capturedAt:Date.now()};
}
