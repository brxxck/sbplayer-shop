// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Match only an InPvP-linked Discord handle/ID to the exact verified username
// of a current Discord guild member. Never use nicknames, display names or bio
// mentions for automatic account linking.
import {getGuildMember,searchMembers} from './discord.js';
import {one} from './db.js';

const validId=id=>/^[0-9]{15,22}$/.test(String(id||''));
const validHandle=x=>/^[a-z0-9._]{2,32}$/.test(String(x||''));
export function exactDiscordMember(matches,{handle,discordId=null}={}){
 const expected=String(handle||'').replace(/^@/,'').toLowerCase();
 if(expected&&!validHandle(expected))return {status:'ambiguous'};
 const match=(Array.isArray(matches)?matches:[]).filter(m=>{
  const user=m?.user||m;
  const id=String(user?.id||'');
  const username=String(user?.username||'').toLowerCase();
  return validId(id)&&!user?.bot&&!m?.pending&&
   (!discordId||id===String(discordId))&&
   (!expected||username===expected);
 });
 const byId=new Map(match.map(m=>[String((m.user||m).id),m]));
 if(byId.size!==1)return {status:byId.size?'ambiguous':'discord_not_found'};
 const member=[...byId.values()][0],user=member.user||member;
 return {status:'matched',discordId:String(user.id),
  discordHandle:String(user.username).toLowerCase(),member};
}

export async function matchInPvPDiscordToGuild(badge,{
 findGuildMember=getGuildMember,findGuildMembers=searchMembers
}={}){
 if(!badge||badge.status!=='found')return {status:'unavailable'};
 const id=badge.discordId?String(badge.discordId):null;
 const handle=badge.handle?String(badge.handle).toLowerCase():null;
 if(id&&!validId(id)||handle&&!validHandle(handle))return {status:'ambiguous'};
 try{
  if(id){
   const member=await findGuildMember(id);
   return exactDiscordMember(member?[member]:[],{handle,discordId:id});
  }
  if(!handle)return {status:'discord_not_found'};
  const candidates=await findGuildMembers(handle,100);
  const match=exactDiscordMember(candidates,{handle});
  if(match.status!=='matched')return match;
  // Search can match guild nicknames too. Verify current Discord identity
  // separately by ID, and that the member has not left since the search.
  const confirmed=await findGuildMember(match.discordId);
  return exactDiscordMember(confirmed?[confirmed]:[],{handle,discordId:match.discordId});
 }catch{
  return {status:'api_unavailable'};
 }
}

export function registeredWebsiteMember(discordId){
 return validId(discordId)&&!!one('SELECT 1 FROM users WHERE id=?',String(discordId));
}
