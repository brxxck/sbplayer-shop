// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// V1.11: additive private conversations, preferences and scoped abuse reports.
import {db,one,all,run,transaction} from './db.js';

db.exec([
"CREATE TABLE IF NOT EXISTS dm_threads (id INTEGER PRIMARY KEY AUTOINCREMENT, user_a TEXT NOT NULL REFERENCES users(id), user_b TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(user_a,user_b), CHECK(user_a<user_b))",
"CREATE INDEX IF NOT EXISTS idx_dm_threads_a ON dm_threads(user_a,updated_at DESC)",
"CREATE INDEX IF NOT EXISTS idx_dm_threads_b ON dm_threads(user_b,updated_at DESC)",
"CREATE TABLE IF NOT EXISTS dm_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id INTEGER NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE, sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, edited_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER NOT NULL DEFAULT 0)",
"CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(thread_id,id DESC)",
"CREATE TABLE IF NOT EXISTS dm_attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER NOT NULL REFERENCES dm_messages(id) ON DELETE CASCADE, stored_path TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime_type TEXT NOT NULL, file_size INTEGER NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_dm_files_message ON dm_attachments(message_id)",
"CREATE TABLE IF NOT EXISTS dm_reads (thread_id INTEGER NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), last_read_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(thread_id,user_id))",
"CREATE TABLE IF NOT EXISTS dm_preferences (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, allow_messages TEXT NOT NULL DEFAULT 'members' CHECK(allow_messages IN ('members','following','nobody')), presence TEXT NOT NULL DEFAULT 'online' CHECK(presence IN ('online','invisible')), read_receipts INTEGER NOT NULL DEFAULT 1)",
"CREATE TABLE IF NOT EXISTS dm_blocks (blocker_id TEXT NOT NULL REFERENCES users(id), blocked_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id!=blocked_id))",
"CREATE TABLE IF NOT EXISTS dm_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id TEXT NOT NULL REFERENCES users(id), sender_id TEXT NOT NULL REFERENCES users(id), message_id INTEGER NOT NULL REFERENCES dm_messages(id), message_snapshot TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')), reviewed_by TEXT REFERENCES users(id), reviewed_at INTEGER)",
"CREATE INDEX IF NOT EXISTS idx_dm_reports_status ON dm_reports(status,created_at DESC)"
].join(';\n')+';');

export const dmError=(status,message)=>Object.assign(new Error(message),{status});
const validId=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?Number(id):0;
const otherId=(t,userId)=>t.user_a===userId?t.user_b:t.user_a;
export const dmSettings=userId=>one('SELECT * FROM dm_preferences WHERE user_id=?',userId)||{user_id:userId,allow_messages:'members',presence:'online',read_receipts:1};
export function updateDmSettings(userId,fields){
  const allow=String(fields.allow_messages||''),presence=String(fields.presence||''),receipts=fields.read_receipts==='1'?1:0;
  if(!['members','following','nobody'].includes(allow)||!['online','invisible'].includes(presence))throw dmError(400,'Invalid messaging preferences.');
  run('INSERT INTO dm_preferences(user_id,allow_messages,presence,read_receipts) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET allow_messages=excluded.allow_messages,presence=excluded.presence,read_receipts=excluded.read_receipts',userId,allow,presence,receipts);
  return dmSettings(userId);
}
export function isBlocked(a,b){
  return !!one('SELECT 1 FROM dm_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)',a,b,b,a);
}
export function setBlock(userId,targetId,block){
  if(userId===targetId||!one('SELECT 1 FROM users WHERE id=?',targetId))throw dmError(404,'Member not found.');
  if(block)run('INSERT OR IGNORE INTO dm_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)',userId,targetId,Date.now());
  else run('DELETE FROM dm_blocks WHERE blocker_id=? AND blocked_id=?',userId,targetId);
}
export function isBlocking(userId,targetId){
  return !!one('SELECT 1 FROM dm_blocks WHERE blocker_id=? AND blocked_id=?',userId,targetId);
}
export function canStartDm(senderId,recipientId){
  if(!recipientId||senderId===recipientId)throw dmError(400,'Choose another member.');
  if(!one('SELECT 1 FROM users WHERE id=?',recipientId))throw dmError(404,'Member not found.');
  if(isBlocked(senderId,recipientId))throw dmError(403,'This conversation is unavailable.');
  const preference=dmSettings(recipientId).allow_messages;
  if(preference==='nobody')throw dmError(403,'This member is not accepting messages.');
  if(preference==='following'&&!one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?',recipientId,senderId))
    throw dmError(403,'This member only accepts messages from people they follow.');
}
export function startDm(senderId,recipientId){
  canStartDm(senderId,recipientId);
  const [a,b]=[senderId,recipientId].sort(),stamp=Date.now();
  return transaction(()=>{
    run('INSERT OR IGNORE INTO dm_threads(user_a,user_b,created_at,updated_at) VALUES(?,?,?,?)',a,b,stamp,stamp);
    const t=one('SELECT id FROM dm_threads WHERE user_a=? AND user_b=?',a,b);
    run('INSERT OR IGNORE INTO dm_reads(thread_id,user_id) VALUES(?,?)',t.id,a);
    run('INSERT OR IGNORE INTO dm_reads(thread_id,user_id) VALUES(?,?)',t.id,b);
    return t.id;
  });
}
export function requireDm(threadId,userId){
  const id=validId(threadId);
  const t=id?one('SELECT * FROM dm_threads WHERE id=?',id):null;
  if(!t||![t.user_a,t.user_b].includes(userId))throw dmError(404,'Conversation not found.');
  return {...t,other_id:otherId(t,userId)};
}
export function dmInbox(userId){
  const threads=all('SELECT * FROM dm_threads WHERE user_a=? OR user_b=? ORDER BY updated_at DESC LIMIT 70',userId,userId);
  return threads.map(t=>{
    const recipientId=otherId(t,userId);
    const peer=one('SELECT u.id,u.username,u.display_name,u.avatar,p.nickname,p.avatar_path FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?',recipientId);
    const message=one('SELECT id,sender_id,body,created_at,deleted_at FROM dm_messages WHERE thread_id=? ORDER BY id DESC LIMIT 1',t.id);
    const read=one('SELECT last_read_id FROM dm_reads WHERE thread_id=? AND user_id=?',t.id,userId)?.last_read_id||0;
    const unread=one('SELECT COUNT(*) n FROM dm_messages WHERE thread_id=? AND id>? AND sender_id!=? AND deleted_at=0',t.id,read,userId)?.n||0;
    return {...t,peer,latest:message,unread,blocked:isBlocked(userId,recipientId)};
  });
}
export function dmUnreadCount(userId){
  return one('SELECT COUNT(*) AS n FROM dm_messages m JOIN dm_threads t ON t.id=m.thread_id LEFT JOIN dm_reads r ON r.thread_id=t.id AND r.user_id=? WHERE (t.user_a=? OR t.user_b=?) AND m.sender_id!=? AND m.deleted_at=0 AND m.id>COALESCE(r.last_read_id,0)',userId,userId,userId,userId)?.n||0;
}
export function dmHistory(threadId,userId,limit=100){
  const thread=requireDm(threadId,userId);
  const messages=all('SELECT m.id,m.thread_id,m.sender_id,m.body,m.created_at,m.edited_at,m.deleted_at,u.display_name,u.username FROM dm_messages m JOIN users u ON u.id=m.sender_id WHERE m.thread_id=? ORDER BY m.id DESC LIMIT ?',thread.id,Math.min(Math.max(Number(limit)||100,1),100)).reverse();
  const byId=new Map(messages.map(m=>[m.id,m]));
  if(messages.length){
    const attachments=all('SELECT * FROM dm_attachments WHERE message_id IN ('+messages.map(()=>'?').join(',')+') ORDER BY id',...messages.map(m=>m.id));
    for(const m of messages)m.attachments=[];
    for(const a of attachments)if(byId.has(a.message_id)&&!byId.get(a.message_id).deleted_at)byId.get(a.message_id).attachments.push({id:a.id,name:a.original_name,mime:a.mime_type,size:a.file_size});
  }
  const peer=one('SELECT u.id,u.username,u.display_name,u.avatar,p.nickname,p.avatar_path FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?',thread.other_id);
  const otherRead=one('SELECT last_read_id FROM dm_reads WHERE thread_id=? AND user_id=?',thread.id,thread.other_id)?.last_read_id||0;
  const readAllowed=dmSettings(thread.other_id).read_receipts===1;
  return {thread,peer,messages,otherRead:readAllowed?otherRead:0,readAllowed,blocked:isBlocked(userId,thread.other_id)};
}
export function dmSend(threadId,userId,body,attachments=[]){
  const thread=requireDm(threadId,userId);
  if(isBlocked(userId,thread.other_id))throw dmError(403,'This conversation is unavailable.');
  if(!Array.isArray(attachments)||attachments.length>3)throw dmError(400,'Attach at most three files.');
  const message=String(body||'').trim();
  if(message.length>2000||(!message&&!attachments.length))throw dmError(400,'Write a message or attach a file (maximum 2000 characters).');
  return transaction(()=>{
    const stamp=Date.now();
    const rec=run('INSERT INTO dm_messages(thread_id,sender_id,body,created_at) VALUES(?,?,?,?)',thread.id,userId,message,stamp);
    for(const file of attachments)run('INSERT INTO dm_attachments(message_id,stored_path,original_name,mime_type,file_size) VALUES(?,?,?,?,?)',Number(rec.lastInsertRowid),file.path,file.name,file.mime,file.size);
    run('UPDATE dm_threads SET updated_at=? WHERE id=?',stamp,thread.id);
    return {id:Number(rec.lastInsertRowid),recipientId:thread.other_id};
  });
}
export function dmMarkRead(threadId,userId){
  const thread=requireDm(threadId,userId);
  const id=one('SELECT COALESCE(MAX(id),0) AS id FROM dm_messages WHERE thread_id=?',thread.id)?.id||0;
  run('INSERT INTO dm_reads(thread_id,user_id,last_read_id) VALUES(?,?,?) ON CONFLICT(thread_id,user_id) DO UPDATE SET last_read_id=MAX(dm_reads.last_read_id,excluded.last_read_id)',thread.id,userId,id);
  return {lastReadId:id,otherId:thread.other_id};
}
export function dmEdit(threadId,messageId,userId,body){
  const thread=requireDm(threadId,userId),id=validId(messageId),value=String(body||'').trim();
  if(value.length<1||value.length>2000)throw dmError(400,'Message must contain 1 to 2000 characters.');
  const old=one('SELECT * FROM dm_messages WHERE id=? AND thread_id=?',id,thread.id);
  if(!old)throw dmError(404,'Message not found.');
  if(old.sender_id!==userId)throw dmError(403,'You may only edit your own messages.');
  if(old.deleted_at)throw dmError(400,'This message was deleted.');
  if(Date.now()-old.created_at>15*60*1000)throw dmError(400,'Messages can only be edited for 15 minutes.');
  run('UPDATE dm_messages SET body=?,edited_at=? WHERE id=?',value,Date.now(),id);
  return thread.other_id;
}
export function dmDelete(threadId,messageId,userId){
  const thread=requireDm(threadId,userId),id=validId(messageId);
  const old=one('SELECT * FROM dm_messages WHERE id=? AND thread_id=?',id,thread.id);
  if(!old)throw dmError(404,'Message not found.');
  if(old.sender_id!==userId)throw dmError(403,'You may only delete your own messages.');
  run('UPDATE dm_messages SET body=?,deleted_at=? WHERE id=? AND deleted_at=0','',Date.now(),id);
  return thread.other_id;
}
export function dmAttachment(fileId,userId){
  const a=one('SELECT a.*,m.thread_id,m.deleted_at FROM dm_attachments a JOIN dm_messages m ON m.id=a.message_id WHERE a.id=?',validId(fileId));
  if(!a||a.deleted_at)throw dmError(404,'File not found.');
  requireDm(a.thread_id,userId);
  return a;
}
export function dmReport(threadId,messageId,userId,reason){
  const thread=requireDm(threadId,userId),id=validId(messageId);
  const old=one('SELECT * FROM dm_messages WHERE id=? AND thread_id=?',id,thread.id);
  if(!old||old.sender_id===userId)throw dmError(400,'Choose a message sent by the other member.');
  const summary=String(reason||'').trim();
  if(summary.length<10||summary.length>500)throw dmError(400,'Describe the issue in 10 to 500 characters.');
  const duplicate=one('SELECT 1 FROM dm_reports WHERE reporter_id=? AND message_id=? AND status=?',userId,id,'open');
  if(duplicate)throw dmError(409,'You already reported this message.');
  const stamp=Date.now();
  const record=run('INSERT INTO dm_reports(reporter_id,sender_id,message_id,message_snapshot,reason,created_at) VALUES(?,?,?,?,?,?)',userId,old.sender_id,old.deleted_at?'[Deleted message]':old.body,summary,stamp);
  return Number(record.lastInsertRowid);
}
export const dmReports=()=>all('SELECT r.*,ur.username AS reporter_name,us.username AS sender_name FROM dm_reports r JOIN users ur ON ur.id=r.reporter_id JOIN users us ON us.id=r.sender_id ORDER BY r.created_at DESC LIMIT 100');
export function dmResolveReport(reportId,actorId,status){
  if(!['resolved','dismissed'].includes(status))throw dmError(400,'Invalid report action.');
  const result=run('UPDATE dm_reports SET status=?,reviewed_by=?,reviewed_at=? WHERE id=? AND status=?',status,actorId,Date.now(),validId(reportId),'open');
  if(!result.changes)throw dmError(404,'Open report not found.');
}