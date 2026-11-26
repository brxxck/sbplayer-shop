// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {idOK} from './logic.js';

const eventTypes=[20,22,23,24];
export const moderationLabels={kick:'Kick',ban:'Ban',unban:'Unban',timeout:'Timeout',timeout_removed:'Timeout removed'};
const eventNames={20:'kick',22:'ban',23:'unban'};

function moderationEvents(response){
 const users=new Map((response.users||[]).map(user=>[user.id,user]));
 const name=id=>users.get(id)?.username||id||'Unknown';
 return response.audit_log_entries.flatMap(entry=>{
  if(!idOK(entry.id)||!idOK(entry.target_id))return [];
  const timeout=entry.changes?.find(change=>change.key==='communication_disabled_until');
  const kind=eventNames[entry.action_type]||(entry.action_type===24&&timeout?
   (timeout.new_value?'timeout':'timeout_removed'):null);
  if(!kind)return [];
  return [{
   id:entry.id,kind,member:name(entry.target_id),memberId:entry.target_id,moderator:name(entry.user_id),
   moderatorId:entry.user_id,reason:String(entry.reason||'').slice(0,512),
   createdAt:Number(BigInt(entry.id)>>22n)+1420070400000,
   timeoutUntil:kind==='timeout'?Date.parse(timeout.new_value):null
  }];
 });
}

export function createDiscordModerationReader(discord){
 let expires=0,pending=null,cached;
 return async function read(){
  if(Date.now()<expires)return cached;
  if(!pending){
   pending=(async()=>{
    const replies=await Promise.allSettled(eventTypes.map(async kind=>discord.getModerationAuditLog(kind)));
    const responses=replies.filter(reply=>reply.status==='fulfilled'&&Array.isArray(reply.value?.audit_log_entries));
    const events=responses.flatMap(reply=>moderationEvents(reply.value)).sort((a,b)=>b.createdAt-a.createdAt);
    cached={events,available:responses.length>0,partial:responses.length>0&&responses.length<eventTypes.length};
    expires=Date.now()+30000;
    return cached;
   })().finally(()=>{pending=null;});
  }
  return pending;
 };
}
