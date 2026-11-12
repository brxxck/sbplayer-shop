// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {db,one,all,run,transaction} from './db.js';
import {appendAudit} from './audit.js';

export const SUPPORT_CATEGORIES=Object.freeze({
  bug_report:'Bug Report',player_report:'Player Report',reward_claim:'Reward Claim',
  staff_report:'Staff Report',ban_appeal:'Ban Appeal'
});
export const CATEGORY_LABELS=SUPPORT_CATEGORIES;
export const categoryLabel=key=>SUPPORT_CATEGORIES[key]||'Support Ticket';
export const categoryExists=key=>Object.hasOwn(SUPPORT_CATEGORIES,key);
export const supportTicket=id=>one(`SELECT t.*,u.username,u.display_name,u.avatar FROM support_tickets t
 JOIN users u ON u.id=t.user_id WHERE t.id=?`,id);
export const supportMessages=id=>all(`SELECT m.*,u.username,u.display_name,u.avatar
 FROM support_ticket_messages m JOIN users u ON u.id=m.author_id
 WHERE m.ticket_id=? ORDER BY m.id ASC LIMIT 300`,id);
export const supportAttachments=id=>all('SELECT * FROM support_ticket_attachments WHERE ticket_id=? ORDER BY id ASC',id);
export const mySupportTickets=id=>all(`SELECT t.*,
 (SELECT COUNT(*) FROM support_ticket_messages m WHERE m.ticket_id=t.id AND m.author_id!=t.user_id AND m.created_at>t.applicant_seen_at) unread
 FROM support_tickets t WHERE t.user_id=? ORDER BY t.updated_at DESC LIMIT 150`,id);
export const openSupportTickets=()=>all(`SELECT t.*,u.username,u.display_name,u.avatar
 FROM support_tickets t JOIN users u ON u.id=t.user_id
 WHERE t.status!='resolved' ORDER BY t.updated_at DESC LIMIT 150`);
export const allSupportTickets=()=>all(`SELECT t.*,u.username,u.display_name,u.avatar
 FROM support_tickets t JOIN users u ON u.id=t.user_id
 ORDER BY t.updated_at DESC LIMIT 200`);
export const staffChatRecent=()=>all(`SELECT * FROM (
 SELECT m.*,u.display_name,u.username,u.avatar FROM staff_chat_messages m
 JOIN users u ON u.id=m.author_id ORDER BY m.id DESC LIMIT 80
) ORDER BY id ASC`);
export const staffChatAfter=id=>all(`SELECT m.*,u.display_name,u.username,u.avatar
 FROM staff_chat_messages m JOIN users u ON u.id=m.author_id
 WHERE m.id>? ORDER BY m.id ASC LIMIT 80`,id);
export const ticketFields=t=>{try{return JSON.parse(t.fields_json)||{};}catch{return {};}};

export function createSupportTicket({userId,category,fields,reportedId='',visibility='staff',attachments=[],ip,role='member'}) {
 if(!categoryExists(category))throw new Error('Unknown ticket category');
 return transaction(()=>{
   const stamp=Date.now();
   const info=run(`INSERT INTO support_tickets(user_id,category,fields_json,reported_user_id,visibility,status,created_at,updated_at,last_staff_ping_at)
    VALUES(?,?,?,?,?,'open',?,?,?)`,userId,category,JSON.stringify(fields),reportedId,visibility,stamp,stamp,stamp);
   const id=Number(info.lastInsertRowid);
   for(const file of attachments)run(`INSERT INTO support_ticket_attachments
    (ticket_id,original_name,stored_path,mime_type,file_size,created_at) VALUES(?,?,?,?,?,?)`,
    id,file.name,file.path,file.mime,file.size,stamp);
   appendAudit(db,{actor:userId,role,action:'support_ticket.create',target:'support_ticket:'+id,
     details:{category,visibility,attachments:attachments.length},ip});
   return id;
 });
}
export function writeSupportMessage({ticketId,userId,role,body,ip,isApplicant}) {
 return transaction(()=>{
   const t=one('SELECT * FROM support_tickets WHERE id=?',ticketId);
   if(!t)throw new Error('Ticket not found');
   const stamp=Date.now();
   const rec=run('INSERT INTO support_ticket_messages(ticket_id,author_id,author_role,body,created_at) VALUES(?,?,?,?,?)',
     ticketId,userId,role,body,stamp);
   run(`UPDATE support_tickets SET status=CASE WHEN ? AND status='resolved' THEN 'open' ELSE status END,
     resolved_at=CASE WHEN ? AND status='resolved' THEN NULL ELSE resolved_at END,
     updated_at=? WHERE id=?`,isApplicant?1:0,isApplicant?1:0,stamp,ticketId);
   appendAudit(db,{actor:userId,role,action:'support_ticket.reply',target:'support_ticket:'+ticketId,
     details:{messageId:Number(rec.lastInsertRowid),length:body.length},ip});
   return {id:Number(rec.lastInsertRowid)};
 });
}
export function updateSupportStatus({ticketId,userId,role,ip,status}){
 if(!['open','reviewing','resolved'].includes(status))throw new Error('Invalid ticket status');
 return transaction(()=>{
   const t=one('SELECT * FROM support_tickets WHERE id=?',ticketId);if(!t)throw new Error('Ticket not found');
   const stamp=Date.now();
   run('UPDATE support_tickets SET status=?,updated_at=?,resolved_at=?,resolved_by=? WHERE id=?',
     status,stamp,status==='resolved'?stamp:null,status==='resolved'?userId:null,ticketId);
   appendAudit(db,{actor:userId,role,action:'support_ticket.status',target:'support_ticket:'+ticketId,
     details:{before:t.status,after:status},ip});
 });
}
export function reserveSupportPing(ticketId,ms=300000){
 return transaction(()=>{
   const stamp=Date.now();
   const r=run('UPDATE support_tickets SET last_staff_ping_at=? WHERE id=? AND last_staff_ping_at<=?',stamp,ticketId,stamp-ms);
   return r.changes===1;
 });
}
export function sendStaffChat({userId,role,body,ip}){
 return transaction(()=>{
   const stamp=Date.now();
   const info=run('INSERT INTO staff_chat_messages(author_id,body,created_at) VALUES(?,?,?)',userId,body,stamp);
   appendAudit(db,{actor:userId,role,action:'staff_chat.message',target:'staff_chat:'+info.lastInsertRowid,
     details:{length:body.length},ip});
   return Number(info.lastInsertRowid);
 });
}
export function staffChatRow(id){
 return one(`SELECT m.*,u.display_name,u.username,u.avatar FROM staff_chat_messages m
 JOIN users u ON u.id=m.author_id WHERE m.id=?`,id);
}
