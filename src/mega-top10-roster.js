// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Conservative parser for visible, explicitly labeled InPvP team-member cards.
// Names in a bank transaction are not proof of current team membership.
import {validGamertag} from './mega-team.js';

const financial=/^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i;
const disallowed=/^(?:members?|team members|roster|player|name|role|leader|officer|owner|co-owner|deposited|deposits?|withdrawn|withdrawals?|bank|team bank|event log|net|total|statistics|stats|balance|view profile|search|level|activity|last seen|online|offline|unknown|loading|show more|invite|manage|leave team)$/i;
const clean=value=>String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const finance=value=>{
 const text=clean(value);
 return financial.test(text)?text:null;
};
const memberName=value=>{
 const name=validGamertag(value);
 return name&&!disallowed.test(name)&&!/[#$]/.test(name)?name:null;
};
const role=value=>{
 const match=/\b(Leader|Co-Owner|Owner|Officer|Member)\b/i.exec(clean(value));
 if(!match)return 'Member';
 if(/^(?:Leader|Co-Owner|Owner)$/i.test(match[1]))return 'Leader';
 return match[1].toLowerCase()==='officer'?'Officer':'Member';
};
const rowFromLabels=row=>{
 const name=memberName(row.gamertag||row.name);
 if(!name)return null;
 const out={gamertag:name,role:role(row.role||'Member')};
 const dep=finance(row.depositedText||row.deposits||row.deposit);
 const withdr=finance(row.withdrawnText||row.withdrawals||row.withdrawn);
 const net=finance(row.netText||row.net);
 if(dep)out.reportedDepositsText=dep;
 if(withdr)out.reportedWithdrawalsText=withdr;
 if(net)out.reportedNetText=net;
 return out;
};

export function parseTeamMemberSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object')return {roster:[],evidenceCount:0,hasMemberSection:false};
 const rows=Array.isArray(snapshot.rows)?snapshot.rows.slice(0,500):[];
 const seen=new Map();
 for(const row of rows){
  if(!row||typeof row!=='object')continue;
  const value=rowFromLabels(row);
  if(!value)continue;
  const key=value.gamertag.toLowerCase();
  const previous=seen.get(key);
  if(!previous)seen.set(key,value);
  else{
   for(const field of ['reportedDepositsText','reportedWithdrawalsText','reportedNetText'])
    if(value[field]&&!previous[field])previous[field]=value[field];
   if(previous.role==='Member'&&value.role!=='Member')previous.role=value.role;
  }
 }
 // Text fallback only operates on the *isolated and visible* Members section.
 // A free-floating gamertag anywhere else on the page cannot enter this list.
 if(snapshot.hasMemberSection&&Array.isArray(snapshot.lines)&&seen.size===0){
  const lines=snapshot.lines.slice(0,700).map(clean).filter(Boolean);
  // A pure grid of member names may omit visible role labels. Only accept
  // this layout when the number of unambiguous names matches InPvP's own
  // member counter exactly, and only within the isolated Members region.
  const expected=Number(snapshot.reportedCount);
  if(Number.isSafeInteger(expected)&&expected>0&&expected<=300){
   const candidates=lines.map(memberName).filter(Boolean);
   const unique=new Map(candidates.map(n=>[n.toLowerCase(),n]));
   if(unique.size===expected&&candidates.length===expected){
    for(const name of unique.values())
     seen.set(name.toLowerCase(),{gamertag:name,role:'Member'});
   }
  }
  for(let i=0;i<lines.length&&seen.size<300;i++){
   const line=lines[i];
   const match=/^(?:\d{1,3}\.?\s+)?([a-z0-9_. #\-]{2,32})\s+[·|]\s*(Leader|Officer|Member|Owner|Co-Owner)$/i.exec(line);
   if(match){
    const name=memberName(match[1]);
    if(name)seen.set(name.toLowerCase(),{gamertag:name,role:role(match[2])});
    continue;
   }
   // Recognize a bare player name only when adjacent to an explicit role.
   const name=memberName(line);
   if(!name)continue;
   if(/^(Leader|Officer|Member|Owner|Co-Owner)$/i.test(lines[i+1]||'')){
    seen.set(name.toLowerCase(),{gamertag:name,role:role(lines[i+1])});
    i++;
   }
  }
 }
 const roster=[...seen.values()].slice(0,300);
 return {roster,hasMemberSection:!!snapshot.hasMemberSection,
   evidenceCount:rows.length,diagnostics:{
     section:!!snapshot.hasMemberSection,
     candidateRows:Math.min(rows.length,500),
     roster:roster.length,
     reportedCount:Number.isInteger(snapshot.reportedCount)?snapshot.reportedCount:null
   }};
}

export async function extractTeamMembers(page){
 const snapshot=await page.evaluate(()=>{
  const clean=x=>String(x??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const heading=/^(?:(?:Team\s+)?Members|Roster)(?:\s*\([\d,]+\))?$/i;
  const raw=(document.body?.innerText||'').slice(0,15000);
  const countMatch=/\b(?:Team\s+)?Members\s*\(([\d,]+)\)/i.exec(raw)||
   /\b(?:Team\s+)?Members\s*:\s*([\d,]+)\b/i.exec(raw)||
   /\b([\d,]+)\s+(?:Team\s+)?Members\b/i.exec(raw);
  const reportedCount=countMatch?Number(countMatch[1].replaceAll(',','')):null;
  const isVisible=el=>{
   const rect=el.getBoundingClientRect();
   const style=getComputedStyle(el);
   return rect.width>0&&rect.height>0&&style.display!=='none'&&
    style.visibility!=='hidden';
  };
  const possible=[...document.querySelectorAll(
   'h1,h2,h3,h4,h5,h6,[role="heading"],button,[role="tab"],strong,span,p,div')].slice(0,16000);
  const headings=possible.filter(el=>{
   const text=clean(el.textContent||'');
   return text.length<=65&&heading.test(text)&&isVisible(el);
  }).sort((a,b)=>(a.querySelectorAll('*').length)-(b.querySelectorAll('*').length));
  const texts=[];
  const rowMap=new Map();
  let hasMemberSection=false;
  const accept=(name,role,element)=>{
   name=clean(name);
   if(!/^[a-z0-9_. #\-]{2,32}$/i.test(name)||name.length>32)return;
   const block=element?.closest('tr,li,[role="row"],[data-player-name]')||
     element?.parentElement?.parentElement||element?.parentElement;
   const label=clean(block?.innerText||'').slice(0,260);
   const summary=field=>{
    const match=new RegExp('\\b'+field+'\\s*:?\\s*(\\$[\\d,]+(?:\\.\\d{1,3})?[KMBT]?)','i').exec(label);
    return match?.[1]||'';
   };
   const cells=block?.querySelectorAll('td,[role="cell"]')||[];
   // Only use explicit financial labels; table values may be in a different order.
   const obj={gamertag:name,role:role||label.slice(0,90),
     depositedText:summary('(?:Deposited|Deposits)'),
     withdrawnText:summary('(?:Withdrawn|Withdrawals)'),
     netText:summary('Net')};
   if(cells.length>=3){
    const table=block.closest('table,[role="table"]');
    const head=clean(table?.querySelector('thead,[role="rowgroup"]')?.innerText||'');
    // Do not assign amounts positionally unless the header names columns.
    if(/Deposited|Deposits/i.test(head)&&/Withdrawn|Withdrawals/i.test(head)){
     const labels=[...table.querySelectorAll('thead th,[role="columnheader"]')]
       .map(el=>clean(el.textContent));
     for(const [i,k] of labels.entries()){
      const m=clean(cells[i]?.textContent);
      if(/Deposited|Deposits/i.test(k))obj.depositedText=m;
      if(/Withdrawn|Withdrawals/i.test(k))obj.withdrawnText=m;
      if(/\bNet\b/i.test(k))obj.netText=m;
     }
    }
   }
   rowMap.set(name.toLowerCase(),obj);
  };
  for(const h of headings.slice(0,10)){
   let container=h.closest('section,article,[role="tabpanel"],[data-testid*="member"]');
   if(!container){
    let parent=h.parentElement;
    for(let step=0;parent&&step<5;step++,parent=parent.parentElement){
     const text=String(parent.innerText||'');
     if(text.length>19000||/Event Log\b/i.test(text)&&text.length>2500)break;
     if(text.length>45&&parent.querySelectorAll('a,[data-player-name],li,tr,img').length>0){
      container=parent;break;
     }
    }
   }
   if(!container)continue;
   const text=String(container.innerText||'');
   if(text.length>19000||text.length<15)continue;
   hasMemberSection=true;
   if(!texts.length)texts.push(...text.split('\n').slice(0,700));
   for(const el of [...container.querySelectorAll(
     '[data-player-name],a[href*="/player"],a[href*="/profile"],li,tr,[role="row"]')].slice(0,400)){
     const name=el.getAttribute('data-player-name')||
       el.querySelector('[data-player-name]')?.getAttribute('data-player-name')||
       (el.tagName==='A'?el.textContent:null)||
       el.querySelector('a[href*="/player"],a[href*="/profile"]')?.textContent||
       el.querySelector('td:first-child,[role="cell"]')?.textContent||'';
     accept(name,'',el);
   }
   // InPvP also uses image-backed player cards with no anchor or <li>.
   // Read the avatar's explicit player-name alt only inside Members.
   for(const image of [...container.querySelectorAll('img[alt]')].slice(0,400)){
     const alt=clean(image.getAttribute('alt')||'')
       .replace(/^(?:avatar|head|profile(?: picture)?)\s+(?:of|for)\s+/i,'')
       .replace(/\s+(?:avatar|head|profile(?: picture)?|skin)$/i,'');
     accept(alt,'',image);
   }
   for(const card of [...container.querySelectorAll(
     '[data-testid*="member"],[data-testid*="player"],[class*="member-card"],[class*="player-card"],[class*="MemberCard"],[class*="PlayerCard"]')].slice(0,400)){
     if(clean(card.innerText||'').length>210)continue;
     const candidate=card.querySelector('[data-player-name],a[href*="/profile"],a[href*="/player"],strong,b,h4,h3');
     const name=candidate?.getAttribute('data-player-name')||candidate?.textContent||'';
     accept(name,'',candidate||card);
   }
  }
  return {hasMemberSection,reportedCount,rows:[...rowMap.values()],lines:texts};
 });
 return parseTeamMemberSnapshot(snapshot);
}
