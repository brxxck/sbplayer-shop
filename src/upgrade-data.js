// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {existsSync} from 'node:fs';
import {config} from './config.js';
import {db,all,one,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {literalLikePattern,isoDayMillis} from './search-utils.js';
import {activeMegaSeason} from './mega-team.js';
import './mega-team-bank-event-store.js';
export const finalSuggestion=status=>['implemented','declined'].includes(status);
// One consistent SQLite snapshot before this release's additive migration. Existing backups are retained.
if(config.production&&config.dbPath!==':memory:'){
 const backupPath=config.dbPath+'.pre-v118.backup';
 if(!existsSync(backupPath))db.prepare('VACUUM INTO ?').run(backupPath);
}
db.exec(`CREATE TABLE IF NOT EXISTS suggestion_history(id INTEGER PRIMARY KEY AUTOINCREMENT,suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),actor_id TEXT NOT NULL REFERENCES users(id),before_status TEXT NOT NULL,after_status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_suggestion_history ON suggestion_history(suggestion_id,created_at DESC);
CREATE TABLE IF NOT EXISTS case_reads(user_id TEXT NOT NULL REFERENCES users(id),category TEXT NOT NULL,case_id INTEGER NOT NULL,seen_at INTEGER NOT NULL,PRIMARY KEY(user_id,category,case_id));`);
export function voteOnSuggestion(id,userId,choice){
 return transaction(()=>{
  const s=one('SELECT status FROM suggestions WHERE id=? AND deleted_at IS NULL',id);
  if(!s)throw Object.assign(Error('Suggestion not found.'),{status:404});
  if(finalSuggestion(s.status))throw Object.assign(Error('Voting is closed on this suggestion.'),{status:409});
  if(!['yes','no'].includes(choice))throw Object.assign(Error('Invalid vote.'),{status:400});
  const old=one('SELECT choice FROM suggestion_votes WHERE suggestion_id=? AND user_id=?',id,userId);
  if(old?.choice===choice)run('DELETE FROM suggestion_votes WHERE suggestion_id=? AND user_id=?',id,userId);
  else run('INSERT INTO suggestion_votes(suggestion_id,user_id,choice,created_at) VALUES(?,?,?,?) ON CONFLICT(suggestion_id,user_id) DO UPDATE SET choice=excluded.choice,created_at=excluded.created_at',id,userId,choice,Date.now());
  return old?.choice===choice?'removed':choice;
 });
}
export function setSuggestionStatus(ctx,id,status,note=''){
 if(!['admin','owner'].includes(ctx.role))throw Object.assign(Error('Administrator access required.'),{status:403});
 if(!['under_review','planned','accepted','declined','implemented'].includes(status))throw Object.assign(Error('Invalid suggestion status.'),{status:400});
 const reason=String(note).trim();
 if(reason.length>1500)throw Object.assign(Error('Explanation is too long.'),{status:400});
 return transaction(()=>{
  const old=one('SELECT status FROM suggestions WHERE id=? AND deleted_at IS NULL',id);
  if(!old)throw Object.assign(Error('Suggestion not found.'),{status:404});
  const at=Date.now();run('UPDATE suggestions SET status=?,updated_at=? WHERE id=?',status,at,id);
  run('INSERT INTO suggestion_history(suggestion_id,actor_id,before_status,after_status,note,created_at) VALUES(?,?,?,?,?,?)',id,ctx.user.id,old.status,status,reason,at);
  appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'suggestion.status',target:'suggestion:'+id,details:{before:old.status,after:status,note:reason},ip:ctx.ip});
 });
}
export const suggestionHistory=id=>all('SELECT h.after_status,h.note,h.created_at,u.display_name FROM suggestion_history h JOIN users u ON u.id=h.actor_id WHERE h.suggestion_id=? ORDER BY h.id DESC LIMIT 30',id);
export function filteredSuggestions({page=0,status='all',sort='recent',q=''}={}){
 const where=['s.deleted_at IS NULL'],args=[];
 if(['under_review','planned','accepted','declined','implemented'].includes(status)){where.push('s.status=?');args.push(status);}
 if(q){where.push("(s.title LIKE ? ESCAPE '\\' OR s.body LIKE ? ESCAPE '\\')");const term=literalLikePattern(q);args.push(term,term);}
 const order={recent:'s.created_at DESC',supported:'yes_count DESC,s.created_at DESC',discussed:'comment_count DESC,s.created_at DESC'}[sort]||'s.created_at DESC';
 return all(`SELECT s.*,u.username,u.display_name,u.avatar,
 (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='yes') yes_count,
 (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='no') no_count,
 (SELECT COUNT(*) FROM comments c WHERE c.kind='suggestion' AND c.target_id=CAST(s.id AS TEXT) AND c.deleted_at IS NULL) comment_count
 FROM suggestions s JOIN users u ON u.id=s.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 20 OFFSET ?`,...args,Math.min(1000,Math.max(0,Number(page)||0))*20);
}
// Support states are derived from the last participant reply; old SQLite status constraints are preserved.
export function caseState(t){
 if(['accepted','denied','resolved'].includes(t.status))return t.status==='resolved'?'resolved':t.status;
 if(t.awaiting_owner)return 'awaiting_owner';
 if(['application','promotion'].includes(t.category))return t.status;
 const last=one('SELECT author_id FROM support_ticket_messages WHERE ticket_id=? ORDER BY id DESC LIMIT 1',t.id);
 return last?(last.author_id===t.user_id?'awaiting_staff':'awaiting_member'):t.status;
}
export function markCaseRead(userId,category,id){run('INSERT INTO case_reads(user_id,category,case_id,seen_at) VALUES(?,?,?,?) ON CONFLICT(user_id,category,case_id) DO UPDATE SET seen_at=excluded.seen_at',userId,category,id,Date.now());}
export function decorateCases(items,userId){return items.map(t=>{
 const seen=one('SELECT seen_at FROM case_reads WHERE user_id=? AND category=? AND case_id=?',userId,t.category,t.id)?.seen_at||0;
 const table=t.category==='application'?'ticket_messages':t.category==='promotion'?'promotion_messages':'support_ticket_messages';
 const column=t.category==='application'?'application_id':'ticket_id';
 const unread=one('SELECT COUNT(*) n FROM '+table+' WHERE '+column+'=? AND author_id=? AND created_at>?',t.id,t.user_id,seen)?.n||0;
 return {...t,queue_status:caseState(t),waiting_since:t.updated_at,unread};
});}
const txUnion=`SELECT 'manual-'||l.id id,m.gamertag,l.kind,CAST(l.amount AS TEXT)||'00' amount_cents,l.occurred_at occurred_at,l.created_at captured_at,'manual' source,'exact' precision,'' display_time FROM mega_team_ledger l JOIN mega_team_members m ON m.id=l.member_id WHERE l.season=?
UNION ALL SELECT 'captured-'||e.id,e.gamertag,e.kind,CAST(e.amount_cents AS TEXT),e.occurred_at,e.first_seen_at,'captured',e.time_precision,e.display_time FROM mega_team_captured_bank_events e WHERE e.season=?`;
export function unifiedTransactions({season=activeMegaSeason(),page=1,kind='all',source='all',q='',from='',to='',sort='newest'}={}){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw Object.assign(Error('Unknown season.'),{status:404});
 const where=['1=1'],args=[season,season];
 if(['deposit','withdrawal'].includes(kind)){where.push('kind=?');args.push(kind);}
 if(['manual','captured'].includes(source)){where.push('source=?');args.push(source);}
 q=String(q).trim().slice(0,80);
 if(q){where.push("gamertag LIKE ? ESCAPE '\\'");args.push(literalLikePattern(q));}
 if(from&&to&&isoDayMillis(from)>isoDayMillis(to))throw Object.assign(Error('Date range must start before it ends.'),{status:400});
 for(const [value,op] of [[from,'>='],[to,'<=']]){
  if(!value)continue;
  where.push('occurred_at '+op+' ?');args.push(isoDayMillis(value)+(op==='<='?86399999:0));
 }
 const base=`FROM (${txUnion}) WHERE ${where.join(' AND ')}`;
 const total=one('SELECT COUNT(*) n '+base,...args).n,pages=Math.max(1,Math.ceil(total/50));
 page=Math.min(pages,Math.max(1,Math.trunc(Number(page)||1)));
 const order={newest:'COALESCE(occurred_at,captured_at) DESC,id DESC',oldest:'COALESCE(occurred_at,captured_at) ASC,id ASC',amount:'CAST(amount_cents AS INTEGER) DESC,id DESC'}[sort]||'COALESCE(occurred_at,captured_at) DESC,id DESC';
 return {rows:all('SELECT * '+base+' ORDER BY '+order+' LIMIT 50 OFFSET ?',...args,(page-1)*50),total,page,pages,season,kind,source,q,from,to,sort,
 seasons:all('SELECT * FROM mega_team_seasons ORDER BY created_at DESC')};
}
