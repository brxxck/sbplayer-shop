// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Conservative aggregation: absent statistics are null, never fabricated zeros.
import {all,one,run,transaction} from './db.js';
import {
 activeMegaSeason,megaSeasons,resolveMegaSeason,MEGA_TEAM_ID,MEGA_TEAM_NAME,MEGA_TEAM_URL,
 validGamertag,moneyAmount,upsertMegaMember,recordMegaBank
} from './mega-team.js';

export function megaDashboard(requestedSeason=activeMegaSeason()){
 const season=resolveMegaSeason(requestedSeason);
 const rows=all("SELECT m.*, "+
  "COALESCE((SELECT SUM(l.amount) FROM mega_team_ledger l WHERE l.member_id=m.id AND l.kind='deposit'),0) manual_deposits, "+
  "COALESCE((SELECT SUM(l.amount) FROM mega_team_ledger l WHERE l.member_id=m.id AND l.kind='withdrawal'),0) manual_withdrawals, "+
  "(SELECT COUNT(*) FROM mega_team_ledger l WHERE l.member_id=m.id) ledger_count, "+
  "(SELECT MAX(l.occurred_at) FROM mega_team_ledger l WHERE l.member_id=m.id) ledger_at, "+
  "t.deposits imported_deposits,t.withdrawals imported_withdrawals,t.as_of imported_at,t.source imported_source "+
  "FROM mega_team_members m LEFT JOIN mega_team_imported_totals t ON t.member_id=m.id "+
  "WHERE m.season=? ORDER BY CASE WHEN m.status='active' THEN 0 ELSE 1 END,m.role,m.gamertag COLLATE NOCASE",
  season.season);
 const members=rows.map(m=>{
  const imported=m.imported_source!=null;
  const deposits=imported?m.imported_deposits:(m.ledger_count?m.manual_deposits:null);
  const withdrawals=imported?m.imported_withdrawals:(m.ledger_count?m.manual_withdrawals:null);
  return {id:m.id,gamertag:m.gamertag,role:m.role,discordId:m.discord_user_id,status:m.status,
   deposits,withdrawals,net:deposits!==null&&withdrawals!==null?deposits-withdrawals:null,
   source:imported?m.imported_source:m.ledger_count?'manual':'unavailable',
   updatedAt:imported?m.imported_at:m.ledger_at||m.updated_at,recordedCount:m.ledger_count};
 });
 // Season contributions include former team members; leaving a team cannot erase history.
 const active=members.filter(m=>m.status==='active'),complete=members.filter(m=>m.deposits!==null&&m.withdrawals!==null);
 const safeSubtotal=key=>{
  let total=0,observed=false;
  for(const m of members){
   const amount=m[key];if(amount===null)continue;
   if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(total+amount))return null;
   total+=amount;observed=true;
  }
  return observed?total:null;
 };
 const deposits=safeSubtotal('deposits'),withdrawals=safeSubtotal('withdrawals');
 const bank=one('SELECT balance,as_of,source FROM mega_team_bank_snapshots WHERE season=? ORDER BY as_of DESC,id DESC LIMIT 1',season.season);
 const transactions=all("SELECT l.id,l.kind,l.amount,l.occurred_at,l.notes,l.actor_id,m.gamertag "+
   "FROM mega_team_ledger l JOIN mega_team_members m ON m.id=l.member_id "+
   "WHERE l.season=? ORDER BY l.occurred_at DESC,l.id DESC LIMIT 50",season.season);
 return {teamName:MEGA_TEAM_NAME,teamId:MEGA_TEAM_ID,teamUrl:MEGA_TEAM_URL,
   season,activeSeason:activeMegaSeason(),seasons:megaSeasons(),members,
   totals:{activeMembers:active.length,recordedMembers:members.length,withBoth:complete.length,missing:members.length-complete.length,
     deposited:deposits,withdrawn:withdrawals,net:complete.length===members.length&&deposits!==null&&withdrawals!==null?deposits-withdrawals:null},
   bank:bank||null,transactions,sync:one('SELECT * FROM mega_team_sync_state WHERE id=1')};
}

// Expected authorized feed format (documented in README):
// {team_id,season,updated_at,complete_roster,bank_balance,members:[{gamertag,role,active,deposits,withdrawals}]}.
// The feed provides *cumulative* numbers, not individual transactions.
// Imported totals override the manually-recorded totals for that member to avoid double counting.
export function importMegaSnapshot(payload,{source='manual_import'}={}){
 if(!['manual_import','authorized_feed'].includes(source))throw new Error('Invalid sync source.');
 if(!payload||payload.team_id!==MEGA_TEAM_ID)throw new Error('Incorrect MegaSMP team identifier.');
 const season=String(payload.season||activeMegaSeason());
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown team season.');
 if(!Array.isArray(payload.members)||payload.members.length>300)throw new Error('Invalid team member list.');
 const asOf=typeof payload.updated_at==='string'?Date.parse(payload.updated_at):Number(payload.updated_at);
 if(!Number.isSafeInteger(asOf)||asOf<0||asOf>Date.now()+86400000)throw new Error('Invalid snapshot timestamp.');
 const seen=new Set();
 const rows=payload.members.map(row=>{
  if(!row||typeof row!=='object')throw new Error('Invalid member record.');
  const gamertag=validGamertag(row.gamertag);if(!gamertag)throw new Error('Invalid gamertag.');
  const key=gamertag.toLowerCase();if(seen.has(key))throw new Error('Duplicate gamertag.');seen.add(key);
  return {gamertag,role:['Leader','Officer','Member'].includes(row.role)?row.role:'Member',
    active:row.active!==false,
    deposits:moneyAmount(row.deposits,{allowZero:true,nullable:true}),
    withdrawals:moneyAmount(row.withdrawals,{allowZero:true,nullable:true})};
 });
 const balance=moneyAmount(payload.bank_balance,{allowZero:true,nullable:true});
 return transaction(()=>{
  for(const row of rows){
   // Old data must not overwrite a newer snapshot from a later source poll.
   const old=one("SELECT t.as_of FROM mega_team_members m JOIN mega_team_imported_totals t ON t.member_id=m.id "+
     "WHERE m.season=? AND m.gamertag=? COLLATE NOCASE",season,row.gamertag);
   if(old&&old.as_of>asOf)continue;
   const memberId=upsertMegaMember({season,gamertag:row.gamertag,role:row.role,source});
   if(!row.active)run("UPDATE mega_team_members SET status='former' WHERE id=?",memberId);
   run("INSERT INTO mega_team_imported_totals(member_id,deposits,withdrawals,as_of,source) VALUES(?,?,?,?,?) "+
     "ON CONFLICT(member_id) DO UPDATE SET deposits=excluded.deposits,withdrawals=excluded.withdrawals,as_of=excluded.as_of,source=excluded.source "+
     "WHERE mega_team_imported_totals.as_of<=excluded.as_of",
     memberId,row.deposits,row.withdrawals,asOf,source);
  }
  if(payload.complete_roster===true){
   const recorded=all("SELECT id,gamertag FROM mega_team_members WHERE season=? AND source=?",season,source);
   for(const member of recorded)if(!seen.has(member.gamertag.toLowerCase()))
    run("UPDATE mega_team_members SET status='former' WHERE id=?",member.id);
  }
  if(balance!==null){
   const latest=one('SELECT balance,as_of FROM mega_team_bank_snapshots WHERE season=? ORDER BY as_of DESC,id DESC LIMIT 1',season);
   if(!latest||asOf>latest.as_of)recordMegaBank({season,balance,source,asOf});
  }
  if(source==='authorized_feed')run('UPDATE mega_team_sync_state SET last_success=?,last_source_at=?,last_error=?,last_count=? WHERE id=1',Date.now(),asOf,'',rows.length);
  return {season,count:rows.length,asOf,source};
 });
}
