// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read only the voluntarily shown Discord badge on an InPvP player profile.
// Never inspect browser storage, cookies, auth headers, hidden app state or
// undocumented endpoints. No account action is performed on InPvP.
import {validGamertag} from './mega-team.js';

const DISCORD_USERNAME=/^[a-z0-9._]{2,32}$/;
const DISCORD_ID=/^[0-9]{15,22}$/;
const PROFILE_PATH='/mineville/profile/';
const pause=(page,ms)=>typeof page.waitForTimeout==='function'?
 page.waitForTimeout(ms):new Promise(resolve=>setTimeout(resolve,ms));

export function inpvpPlayerProfileUrl(gamertag){
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Invalid player name for InPvP profile.');
 return 'https://inpvp.net'+PROFILE_PATH+encodeURIComponent(name);
}
function validProfileUrl(value,name){
 try{
  const u=new URL(value);
  const parts=u.pathname.split('/');
  return u.protocol==='https:'&&u.hostname==='inpvp.net'&&!u.port&&
   parts.length===4&&parts[1]==='mineville'&&parts[2]==='profile'&&
   decodeURIComponent(parts[3]).toLowerCase()===name.toLowerCase();
 }catch{return false;}
}
export function parseInPvPDiscordBadge(snapshot,gamertag){
 const player=validGamertag(gamertag);
 if(!player)return {status:'invalid-name'};
 if(!snapshot||typeof snapshot!=='object')return {status:'unavailable'};
 if(snapshot.challenge)return {status:'verification'};
 if(!snapshot.profileConfirmed)return {status:snapshot.notFound?'not-found':'unavailable'};
 if(String(snapshot.profileName||'').trim().toLowerCase()!==player.toLowerCase())
  return {status:'profile-mismatch'};
 const handles=new Set(),ids=new Set();
 for(const item of Array.isArray(snapshot.badges)?snapshot.badges.slice(0,8):[]){
  if(!item||typeof item!=='object')continue;
  const handle=String(item.handle||'').trim().replace(/^@/,'').toLowerCase();
  const discordId=String(item.discordId||'').trim();
  if(handle&&DISCORD_USERNAME.test(handle))handles.add(handle);
  if(discordId&&DISCORD_ID.test(discordId))ids.add(discordId);
 }
 if(handles.size>1||ids.size>1)return {status:'ambiguous'};
 if(!handles.size&&!ids.size)return {status:'no-discord'};
 return {status:'found',handle:[...handles][0]||null,
  discordId:[...ids][0]||null,profileUrl:inpvpPlayerProfileUrl(player)};
}

async function visibleProfileSnapshot(page,gamertag){
 return page.evaluate(expected=>{
  const clean=x=>String(x||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const text=String(document.body?.innerText||'').slice(0,18000);
  const challenge=/\b(?:verify you are human|captcha|security challenge)\b/i.test(text);
  const notFound=/\b(?:player|profile|user) not found\b|\bno such player\b/i.test(text);
  const heading=[...document.querySelectorAll('h1,h2,[role="heading"]')]
   .find(el=>clean(el.textContent).toLowerCase()===expected.toLowerCase());
  if(!heading)return {profileConfirmed:false,challenge,notFound,badges:[]};
  const rect=heading.getBoundingClientRect();
  const badges=[],visited=new Set();
  // An explicitly linked Discord profile is the strongest page evidence.
  for(const a of [...document.querySelectorAll('a[href]')].slice(0,900)){
   const href=a.getAttribute('href')||'';
   let link;try{link=new URL(href,location.href);}catch{continue;}
   if(!['discord.com','www.discord.com','discordapp.com'].includes(link.hostname))continue;
   const match=/^\/users\/([0-9]{15,22})\/?$/.exec(link.pathname);
   if(!match)continue;
   const ar=a.getBoundingClientRect();
   if(ar.top<rect.top-60||ar.top>rect.top+380)continue;
   const label=clean(a.textContent||'');
   const handle=/^@([a-z0-9._]{2,32})$/i.exec(label)?.[1]||null;
   badges.push({handle,discordId:match[1]});
   visited.add(a);
  }
  // InPvP's profile header can show a Discord-logo badge with a handle
  // (for example @unk.sb) rather than a Discord user-ID link.
  for(const el of [...document.querySelectorAll(
   '[data-discord-username],a,button,[role="button"],span')].slice(0,1300)){
   if(visited.has(el))continue;
   const raw=clean(el.getAttribute('data-discord-username')||el.textContent||'');
   const match=/^@([a-z0-9._]{2,32})$/i.exec(raw);
   if(!match)continue;
   const r=el.getBoundingClientRect();
   if(!r.width||!r.height||r.top<rect.top-60||r.top>rect.top+380)continue;
   const wrapper=el.closest('a,button,[role="button"]')||el.parentElement;
   const properties=[wrapper?.getAttribute('aria-label'),wrapper?.getAttribute('title'),
     wrapper?.className,el.className].filter(x=>typeof x==='string').join(' ');
   const discordCue=/discord/i.test(properties);
   const hasBadgeIcon=!!wrapper?.querySelector?.('svg,img')||
    !!wrapper?.parentElement?.querySelector?.('svg[aria-label*="Discord"],img[alt*="Discord"]');
   // Do not extract @mentions from a biography or unrelated feed.
   if(!discordCue&&!hasBadgeIcon)continue;
   badges.push({handle:match[1],discordId:null});
   if(badges.length>=8)break;
  }
  return {profileConfirmed:true,profileName:clean(heading.textContent),
   challenge,notFound,badges};
 },gamertag);
}

export async function captureInPvPProfileDiscord(page,gamertag){
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Invalid InPvP profile lookup name.');
 const url=inpvpPlayerProfileUrl(name);
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 if(!validProfileUrl(page.url(),name))
  return {status:'redirected'};
 let result={status:'unavailable'};
 for(let attempt=0;attempt<6;attempt++){
  if(!validProfileUrl(page.url(),name))return {status:'redirected'};
  const snapshot=await visibleProfileSnapshot(page,name);
  result=parseInPvPDiscordBadge(snapshot,name);
  if(result.status==='found'||result.status==='ambiguous'||
     result.status==='verification'||result.status==='profile-mismatch'||
     result.status==='not-found')break;
  await pause(page,attempt<3?350:600);
 }
 return result;
}
