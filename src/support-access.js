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

export async function accessibleSupportTicket(ctx,t,discord,config){
 if(!t)return false;
 if(t.category!=='staff_report')return ctx.role==='member'||ctx.role==='appeal-only'?t.user_id===ctx.user?.id:
   ['reviewer','admin','owner'].includes(ctx.role);
 if(t.user_id===ctx.user?.id)return true; // Applicants can read their own report.
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
   if(await accessibleSupportTicket(ctx,ticket,discord,config))list.push(ticket);
 }
 return list;
}
