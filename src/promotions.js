// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// V1.4: private, Discord-role-verified promotion tickets. Additive schema only.
import {db,one,all,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {manageableRoles,consensus} from './logic.js';
import {TEMP_MOD_ROLE_ID} from './team-categories.js';
import {config} from './config.js';

db.exec([
  "CREATE TABLE IF NOT EXISTS promotion_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), from_role_id TEXT NOT NULL, to_role_id TEXT NOT NULL, from_label TEXT NOT NULL, to_label TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','accepted','denied')), role_sync_status TEXT NOT NULL DEFAULT 'none' CHECK(role_sync_status IN ('none','pending','assigned','failed')), role_sync_error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, applicant_seen_at INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS idx_promotion_user ON promotion_tickets(user_id,updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_promotion_queue ON promotion_tickets(status,updated_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_one_active ON promotion_tickets(user_id) WHERE status IN ('open','reviewing') OR (status='accepted' AND role_sync_status!='assigned')",
  "CREATE TABLE IF NOT EXISTS promotion_decisions (ticket_id INTEGER NOT NULL REFERENCES promotion_tickets(id) ON DELETE CASCADE, admin_id TEXT NOT NULL REFERENCES users(id), choice TEXT NOT NULL CHECK(choice IN ('accept','deny')), note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, PRIMARY KEY(ticket_id,admin_id))",
  "CREATE TABLE IF NOT EXISTS promotion_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES promotion_tickets(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), author_role TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_promotion_messages ON promotion_messages(ticket_id,id)"
].join(';')+';');

const normalized = name => String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function exactRole(roles,id,aliases,fallback=''){
  if(id)return roles.find(r=>r.id===id)||null;
  if(fallback){const found=roles.find(r=>r.id===fallback);if(found)return found;}
  const matches=roles.filter(r=>aliases.includes(normalized(r.name)));
  return matches.length===1?matches[0]:null; // Never guess when names are ambiguous.
}
export function promotionRoles(roles,cfg=config){
  if(!Array.isArray(roles))return null;
  const temp=exactRole(roles,cfg.promotionTempRoleId,['modtemp','tempmod'],TEMP_MOD_ROLE_ID);
  const mod=exactRole(roles,cfg.promotionModRoleId,['mod','moderator']);
  const staff=exactRole(roles,cfg.promotionStaffRoleId,['staff']);
  if(!temp||!mod||!staff||new Set([temp.id,mod.id,staff.id]).size!==3)return null;
  return {temp,mod,staff};
}
export function promotionEligibility(member,roles,cfg=config){
  if(!member||member.pending||!Array.isArray(member.roles))return null;
  const ranks=promotionRoles(roles,cfg);
  if(!ranks)return null;
  const owned=new Set(member.roles);
  if(owned.has(ranks.staff.id))return null;
  if(owned.has(ranks.mod.id))return {from:ranks.mod,to:ranks.staff,fromLabel:'Mod',toLabel:'Staff'};
  if(owned.has(ranks.temp.id))return {from:ranks.temp,to:ranks.mod,fromLabel:'Mod - temp',toLabel:'Mod'};
  return null;
}
export const promotionTicket=id=>one("SELECT p.*,u.username,u.display_name,u.avatar FROM promotion_tickets p JOIN users u ON u.id=p.user_id WHERE p.id=?",id);
export const promotionDecisions=id=>all("SELECT d.*,u.display_name FROM promotion_decisions d JOIN users u ON u.id=d.admin_id WHERE d.ticket_id=? ORDER BY d.created_at",id);
export const promotionMessages=id=>all("SELECT m.*,u.username,u.display_name,u.avatar FROM promotion_messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=? ORDER BY m.id ASC LIMIT 250",id);
export const ownPromotions=id=>all("SELECT p.*, (SELECT COUNT(*) FROM promotion_messages m WHERE m.ticket_id=p.id AND m.author_id!=p.user_id AND m.created_at>p.applicant_seen_at) unread FROM promotion_tickets p WHERE p.user_id=? ORDER BY p.updated_at DESC LIMIT 80",id);
export const queuePromotions=(includeFinal=false)=>all("SELECT p.*,u.username,u.display_name,u.avatar FROM promotion_tickets p JOIN users u ON u.id=p.user_id "+(includeFinal?'':"WHERE p.status IN ('open','reviewing') OR (p.status='accepted' AND p.role_sync_status!='assigned') ")+"ORDER BY p.updated_at DESC LIMIT 100");

export function createPromotion({userId,stage,reason,role,ip}){
  if(!stage?.from?.id||!stage?.to?.id||stage.from.id===stage.to.id)throw new Error('Invalid promotion path');
  return transaction(()=>{
    const active=one("SELECT id FROM promotion_tickets WHERE user_id=? AND (status IN ('open','reviewing') OR (status='accepted' AND role_sync_status!='assigned')) LIMIT 1",userId);
    if(active)throw new Error('You already have a promotion ticket in progress');
    const stamp=Date.now();
    const rec=run("INSERT INTO promotion_tickets(user_id,from_role_id,to_role_id,from_label,to_label,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",userId,stage.from.id,stage.to.id,stage.fromLabel,stage.toLabel,reason,stamp,stamp);
    const id=Number(rec.lastInsertRowid);
    appendAudit(db,{actor:userId,role,action:'promotion.create',target:'promotion:'+id,details:{from:stage.from.id,to:stage.to.id},ip});
    return id;
  });
}
export function writePromotionMessage({ticketId,userId,role,body,ip}){
  return transaction(()=>{
    if(!one('SELECT id FROM promotion_tickets WHERE id=?',ticketId))throw new Error('Promotion ticket not found');
    const stamp=Date.now();
    const rec=run("INSERT INTO promotion_messages(ticket_id,author_id,author_role,body,created_at) VALUES(?,?,?,?,?)",ticketId,userId,role,body,stamp);
    run('UPDATE promotion_tickets SET updated_at=? WHERE id=?',stamp,ticketId);
    appendAudit(db,{actor:userId,role,action:'promotion.reply',target:'promotion:'+ticketId,details:{messageId:Number(rec.lastInsertRowid),length:body.length},ip});
  });
}
export function decidePromotion({ticketId,adminId,choice,note,role,ip}){
  return transaction(()=>{
    const t=promotionTicket(ticketId);
    if(!t||!['open','reviewing'].includes(t.status))throw new Error('Promotion ticket is already finalized or unavailable');
    if(t.user_id===adminId)throw new Error('You cannot vote on your own promotion');
    const past=all('SELECT admin_id,choice FROM promotion_decisions WHERE ticket_id=?',ticketId);
    const result=consensus(past,{admin_id:adminId,choice});
    const stamp=Date.now();
    run('INSERT INTO promotion_decisions(ticket_id,admin_id,choice,note,created_at) VALUES(?,?,?,?,?)',ticketId,adminId,choice,note,stamp);
    const status=result.final||'reviewing';
    run("UPDATE promotion_tickets SET status=?,role_sync_status=?,updated_at=? WHERE id=?",status,status==='accepted'?'pending':'none',stamp,ticketId);
    appendAudit(db,{actor:adminId,role,action:'promotion.admin.vote',target:'promotion:'+ticketId,details:{choice,note,accepts:result.accepts,denies:result.denies,final:result.final},ip});
    if(result.final)appendAudit(db,{actor:adminId,role,action:'promotion.decision',target:'promotion:'+ticketId,details:{outcome:result.final,from:t.from_role_id,to:t.to_role_id},ip});
    return {result,ticket:t};
  });
}

export async function deliverPromotion({ticketId,actorId,role,ip,discord}){
  const t=promotionTicket(ticketId);
  if(!t||t.status!=='accepted')throw new Error('Promotion has not been accepted');
  if(t.role_sync_status==='assigned')return {ok:true,already:true};
  try{
    const [roles,botIdentity,target]=await Promise.all([discord.getRoles(),discord.getBotIdentity(),discord.getGuildMember(t.user_id)]);
    if(!target||target.pending||!Array.isArray(target.roles))throw new Error('Applicant is no longer an eligible Discord member');
    const botMember=await discord.getGuildMember(botIdentity.id);
    if(!botMember)throw new Error('Discord bot is not present in the server');
    const ranks=promotionRoles(roles,config);
    if(!ranks)throw new Error('Promotion role IDs are not safely configured');
    const from=t.from_label==='Mod'?ranks.mod:ranks.temp;
    const to=t.to_label==='Staff'?ranks.staff:ranks.mod;
    if(from.id!==t.from_role_id||to.id!==t.to_role_id)throw new Error('Promotion role mapping changed; manual review required');
    const manageable=new Set(manageableRoles(roles,botMember,config).map(r=>r.id));
    if(!manageable.has(from.id)||!manageable.has(to.id))throw new Error('Bot cannot safely manage the promotion roles; check hierarchy and permissions');
    const owned=new Set(target.roles);
    if(!owned.has(from.id)&&!owned.has(to.id))throw new Error('Applicant no longer has the qualifying role');
    // Grant the next role before removing the old one. Partial failures are safe to retry.
    if(!owned.has(to.id))await discord.addRole(t.user_id,to.id,'SB Store approved promotion #'+ticketId);
    if(owned.has(from.id))await discord.removeRole(t.user_id,from.id,'SB Store approved promotion #'+ticketId);
    transaction(()=>{
      run("UPDATE promotion_tickets SET role_sync_status='assigned',role_sync_error='',updated_at=? WHERE id=?",Date.now(),ticketId);
      appendAudit(db,{actor:actorId,role,action:'promotion.role.assigned',target:t.user_id,details:{ticketId,fromRoleId:from.id,toRoleId:to.id},ip});
    });
    return {ok:true};
  }catch(error){
    transaction(()=>{
      run("UPDATE promotion_tickets SET role_sync_status='failed',role_sync_error=?,updated_at=? WHERE id=?",String(error.message).slice(0,350),Date.now(),ticketId);
      appendAudit(db,{actor:actorId,role,action:'promotion.role.failed',target:t.user_id,details:{ticketId,error:String(error.message).slice(0,350)},outcome:'error',ip});
    });
    return {ok:false,error:String(error.message)};
  }
}
