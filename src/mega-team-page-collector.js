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
async function openBankTab(page){
  const tabs=[
    page.getByRole('tab',{name:/^Bank$/i}),
    page.getByRole('button',{name:/^Bank$/i}),
    page.getByText('Bank',{exact:true})
  ];
  for(const tab of tabs){
    if(await tab.count()>0&&await tab.first().isVisible()){
      await tab.first().click({timeout:5000});
      await delay(WAIT_MS);
      return true;
    }
  }
  return false;
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
  const next=page.getByRole('button',{name:/^(Next|Next page)$/i});
  if(await next.count()&&await next.first().isVisible()&&await next.first().isEnabled()){
    await next.first().click({timeout:5000});
    return true;
  }
  return false;
}

export async function captureTeamBankPage(page,{
 url=MEGA_TEAM_URL,selector=process.env.MEGA_TEAM_BANK_ROW_SELECTOR||'',
 maxScrolls=40,maxPages=15
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
  const bankSelected=await openBankTab(page);
  if(!bankSelected)throw new Error('Bank tab was not found. Site layout needs calibration.');
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
      for(const [index,row] of rows.entries()){
        const key=(row.eventId?'id:'+row.eventId:'text:'+row.text+':'+index);
        found.set(key,row);
      }
      if(found.size>=MAX_ROWS)break;
      noGrowth=found.size===start?noGrowth+1:0;
      const move=await scrollEventLog(page);
      if(!move.scrolled&&noGrowth>=2)break;
      if(move.atEnd&&noGrowth>=2)break;
      await delay(400);
    }
    if(found.size>=MAX_ROWS||!await nextPage(page))break;
    await delay(600);
  }
  const rows=[...found.values()];
  if(!rows.length)throw new Error('No bank events were visible; cannot verify the page layout.');
  // The counter can be larger than visible events; never claim complete history then.
  const display=await page.locator('body').innerText({timeout:3000});
  const match=/Event Log\s*\(([\d,]+)\)/i.exec(display.slice(0,20000));
  if(match)reportedCount=Number(match[1].replaceAll(',',''));
  const incomplete=reportedCount===null||rows.length<reportedCount;
  return {teamId:MEGA_TEAM_ID,rows,reportedCount,
    scan:{pagesVisited,scrollOperations:loops,rowSelector:selector||'automatic'},
    historyComplete:false, // No provider IDs/full-history guarantee from visible HTML alone.
    incomplete,capturedAt:Date.now()};
}
