// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {all,one,run} from './db.js';

// Report subjects are resolved to Discord identities, not merely compared as text.
// Unknown/ambiguous targets must never be exposed to regular admins.
export async function resolveStaffReport(discord,search,config,guildOwnerId,coowners=new Set()) {
 const raw=String(search||'').trim(), term=raw.startsWith('@')?raw.slice(1):raw;
 let target=null;
 try {
   if(/^\d{15,22}$/.test(term))target=await discord.getGuildMember(term);
   else{
     const candidates=await discord.searchMembers(term,40);
     const exactly=(candidates||[]).filter(m=>{
       const u=m.user;
       return u && [u.username,u.global_name,m.nick].filter(Boolean).some(x=>x.toLowerCase()===term.toLowerCase());
     });
     if(exactly.length!==1)return {visibility:'owner',reportedId:'',reason:'unverified'};
     target=exactly[0];
   }
 }catch{return {visibility:'owner',reportedId:'',reason:'lookup unavailable'};}
 if(!target?.user)return {visibility:'owner',reportedId:'',reason:'unverified'};
 const id=target.user.id, roles=new Set(target.roles||[]);
 const owner=id===guildOwnerId||config.ownerIds.has(id)||coowners.has(id);
 const admin=[...config.adminIds].some(role=>roles.has(role));
 const reviewer=[...config.reviewerIds].some(role=>roles.has(role));
 if(owner||admin)return {visibility:'owner',reportedId:id,reason:'admin or owner'};
 if(reviewer)return {visibility:'admin',reportedId:id,reason:'reviewer'};
 // Unknown rank: assume management-only to avoid inadvertently exposing a private complaint.
 return {visibility:'owner',reportedId:id,reason:'unrecognized staff role'};
}

export const canWorkSupport=role=>['trial-mod','reviewer','admin','owner'].includes(role);

export async function accessibleSupportTicket(ctx,t,discord,config,{staffView=false}={}){
 if(!t)return false;
 if(ctx.role==='trial-mod')return staffView?t.visibility==='staff'&&t.category!=='staff_report'&&t.category!=='team_application':
   t.user_id===ctx.user?.id;
 // Recruitment answers contain private financial and identity details.
 // Team leaders retain their separate, Discord-role-checked review route.
 if(t.category==='team_application')return staffView?['admin','owner'].includes(ctx.role):
   t.user_id===ctx.user?.id||['admin','owner'].includes(ctx.role);
 if(t.category!=='staff_report')return staffView?['reviewer','admin','owner'].includes(ctx.role):
   t.user_id===ctx.user?.id||['reviewer','admin','owner'].includes(ctx.role);
 if(!staffView && t.user_id===ctx.user?.id)return true; // Applicants use their own ticket area, never staff queues.
 if(t.visibility==='owner')return ctx.role==='owner';
 if(!['admin','owner'].includes(ctx.role))return false;
 if(ctx.role==='owner')return true;
 // Check on every admin access and queue listing so a subsequent promotion is protected.
 if(!t.reported_user_id)return false;
 try{
   const m=await discord.getGuildMember(t.reported_user_id);
   if(!m?.user){run("UPDATE support_tickets SET visibility='owner' WHERE id=?",t.id);return false;}
   const rs=new Set(m.roles||[]);
   const elevated=t.reported_user_id===ctx.guild?.owner_id||config.ownerIds.has(t.reported_user_id)||
      [...config.adminIds].some(id=>rs.has(id))||
      !!one('SELECT 1 FROM owner_allowlist WHERE user_id=?',t.reported_user_id);
   if(elevated){run("UPDATE support_tickets SET visibility='owner' WHERE id=?",t.id);return false;}
   return true;
 }catch{return false;} // Discord failure must not reveal confidential reports.
}

export async function supportQueueVisible(ctx,tickets,discord,config){
 const list=[];
 for(const ticket of tickets){
   if(await accessibleSupportTicket(ctx,ticket,discord,config,{staffView:true}))list.push(ticket);
 }
 return list;
}

export async function supportActivityStats(ctx,discord,config){
 const activity=all(`WITH recorded AS (
  SELECT target,actor_id,
   CASE
    WHEN action='support_ticket.claim' THEN 'claimed'
    WHEN json_valid(details) THEN CASE
     WHEN json_extract(details,'$.after')='resolved' AND json_extract(details,'$.before')<>'resolved' THEN 'resolved'
    END
   END AS kind
  FROM owner_audit_log
  WHERE action IN ('support_ticket.claim','support_ticket.status') AND outcome='ok'
    AND actor_role IN ('trial-mod','reviewer','admin','owner')
 )
 SELECT DISTINCT t.id,t.category,t.visibility,t.reported_user_id,a.actor_id,a.kind,
  u.display_name,u.username
 FROM recorded a
 JOIN support_tickets t ON t.id=CAST(substr(a.target,1+length('support_ticket:')) AS INTEGER)
  AND a.target='support_ticket:'||t.id
 LEFT JOIN users u ON u.id=a.actor_id
 WHERE a.kind IS NOT NULL AND t.category!='team_application'`);
 const tickets=new Map(activity.map(row=>[row.id,row]));
 const visible=new Set((await supportQueueVisible(ctx,[...tickets.values()],discord,config)).map(t=>t.id));
 const stats=new Map();
 for(const row of activity){
  if(!visible.has(row.id))continue;
  if(!stats.has(row.actor_id))stats.set(row.actor_id,{
   id:row.actor_id,name:row.display_name||row.username||row.actor_id,username:row.username,claimed:0,resolved:0
  });
  stats.get(row.actor_id)[row.kind]++;
 }
 return [...stats.values()].sort((a,b)=>b.resolved-a.resolved||b.claimed-a.claimed||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
