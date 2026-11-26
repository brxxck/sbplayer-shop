// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {db,all,one,run,transaction} from './db.js';
import {appendAudit} from './audit.js';

db.exec(`
 CREATE TABLE IF NOT EXISTS support_ticket_workflow (
  ticket_id INTEGER PRIMARY KEY REFERENCES support_tickets(id) ON DELETE CASCADE,
  assignee_id TEXT REFERENCES users(id),
  escalation TEXT CHECK(escalation IN ('admins','owners'))
 );
 CREATE TABLE IF NOT EXISTS support_ticket_notes (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at INTEGER NOT NULL
 );
 CREATE INDEX IF NOT EXISTS support_ticket_notes_ticket ON support_ticket_notes(ticket_id,id DESC);
 CREATE TABLE IF NOT EXISTS support_ticket_private_tags (
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id), label TEXT NOT NULL,
  PRIMARY KEY(ticket_id,user_id)
 );
 CREATE TABLE IF NOT EXISTS ticket_feedback (
  kind TEXT NOT NULL CHECK(kind IN ('support','application','promotion','team_application')),
  ticket_id INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  rating TEXT NOT NULL CHECK(rating IN ('satisfied','not_satisfied')), created_at INTEGER NOT NULL,
  PRIMARY KEY(kind,ticket_id)
 );
`);

export const feedbackCaseKind=category=>['application','promotion','team_application'].includes(category)?category:'support';
export const feedbackFor=(kind,id)=>one('SELECT rating FROM ticket_feedback WHERE kind=? AND ticket_id=?',kind,id)?.rating;
export const ticketIsFinal=status=>['accepted','denied','resolved'].includes(status);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const ticketTypes={support:'support_tickets',application:'applications',promotion:'promotion_tickets',team_application:'team_applications'};

export function saveTicketFeedback({kind,id,userId,rating,role,ip}){
 if(!Object.hasOwn(ticketTypes,kind)||!['satisfied','not_satisfied'].includes(rating))fail(400,'Choose a valid ticket and rating.');
 return transaction(()=>{
  const table=ticketTypes[kind];
  const row=one(`SELECT * FROM ${table} WHERE id=? AND user_id=?`,id,userId);
  if(!row||row.category==='team_application')fail(404,'Ticket not found.');
  if(kind==='support'&&role==='appeal-only'&&row.category!=='ban_appeal')fail(404,'Ticket not found.');
  if(kind!=='support'&&role==='appeal-only')fail(404,'Ticket not found.');
  if(!ticketIsFinal(row.status))fail(409,'This ticket is still active.');
  const recorded=run('INSERT OR IGNORE INTO ticket_feedback(kind,ticket_id,user_id,rating,created_at) VALUES(?,?,?,?,?)',
   kind,id,userId,rating,Date.now());
  if(recorded.changes)appendAudit(db,{actor:userId,role,ip,action:'ticket.feedback',target:kind+':'+id,details:{rating}});
  return !!recorded.changes;
 });
}

export function ticketStaffState(id,actorId){
 return one(`SELECT w.assignee_id,w.escalation,COALESCE(u.display_name,u.username) AS assignee,
  (SELECT label FROM support_ticket_private_tags WHERE ticket_id=? AND user_id=?) AS privateTag
  FROM support_tickets t LEFT JOIN support_ticket_workflow w ON w.ticket_id=t.id
  LEFT JOIN users u ON u.id=w.assignee_id WHERE t.id=?`,id,actorId,id);
}
export function ticketInternalNotes(id){
 return all(`SELECT n.body,n.created_at,u.display_name FROM support_ticket_notes n JOIN users u ON u.id=n.author_id
  WHERE n.ticket_id=? ORDER BY n.id DESC LIMIT 50`,id).reverse();
}
export function updateTicketWorkflow({id,actorId,role,ip,action,value}){
 return transaction(()=>{
  const state=ticketStaffState(id,actorId);
  const audit=(details={})=>appendAudit(db,{actor:actorId,role,ip,action:'support_ticket.'+action,target:'support_ticket:'+id,details});
  if(action==='note'){
   run('INSERT INTO support_ticket_notes(ticket_id,author_id,body,created_at) VALUES(?,?,?,?)',id,actorId,value,Date.now());
   audit();
   return;
  }
  if(action==='tag'){
   if(value){
    run('INSERT INTO support_ticket_private_tags(ticket_id,user_id,label) VALUES(?,?,?) ON CONFLICT(ticket_id,user_id) DO UPDATE SET label=excluded.label',id,actorId,value);
   }else run('DELETE FROM support_ticket_private_tags WHERE ticket_id=? AND user_id=?',id,actorId);
   return;
  }
  run('INSERT OR IGNORE INTO support_ticket_workflow(ticket_id) VALUES(?)',id);
  if(action==='claim'){
   if(state.assignee_id===actorId)return;
   if(state.assignee_id)fail(409,'This ticket is already assigned.');
   run('UPDATE support_ticket_workflow SET assignee_id=? WHERE ticket_id=?',actorId,id);
   audit();
  }else if(action==='unassign'){
   if(!state.assignee_id)return;
   if(state.assignee_id!==actorId&&!['admin','owner'].includes(role))fail(403,'Only the assigned staff member or an admin can unassign it.');
   run('UPDATE support_ticket_workflow SET assignee_id=NULL WHERE ticket_id=?',id);
   audit({previousAssignee:state.assignee_id});
  }else if(action==='escalate'){
   if(!['admins','owners'].includes(value))fail(400,'Choose an escalation queue.');
   if(state.escalation===value)return;
   if(state.escalation==='owners'&&role!=='owner')fail(403,'An owner is already needed on this ticket.');
   run('UPDATE support_ticket_workflow SET escalation=? WHERE ticket_id=?',value,id);
   audit({queue:value});
  }else if(action==='clear_escalation'){
   if(!state.escalation)return;
   if(role!=='owner'&&(role!=='admin'||state.escalation!=='admins'))fail(403,'Only the escalation team can clear this flag.');
   run('UPDATE support_ticket_workflow SET escalation=NULL WHERE ticket_id=?',id);
   audit({queue:state.escalation});
  }else fail(400,'Unknown ticket action.');
 });
}
