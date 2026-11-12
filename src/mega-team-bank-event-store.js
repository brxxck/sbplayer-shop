// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Unpublished transaction-event store: separate from manual balances and cumulative totals.
// NEVER add these events into the existing manual ledger or aggregate source without
// an explicit reconciliation step; that would count contributions twice.
import {db,all,one,run,transaction} from './db.js';
import {MEGA_TEAM_ID,activeMegaSeason} from './mega-team.js';
import {prepareMegaEvents,formatMegaCents} from './mega-team-bank-event-parser.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_team_captured_bank_events (id INTEGER PRIMARY KEY AUTOINCREMENT,team_id TEXT NOT NULL,season TEXT NOT NULL REFERENCES mega_team_seasons(season),source_event_id TEXT NOT NULL,identity TEXT NOT NULL CHECK(identity IN ('provider','visible_fingerprint')),gamertag TEXT NOT NULL COLLATE NOCASE,kind TEXT NOT NULL CHECK(kind IN ('deposit','withdrawal')),amount_cents INTEGER NOT NULL CHECK(amount_cents>0),display_time TEXT NOT NULL,occurred_at INTEGER,time_precision TEXT NOT NULL,first_seen_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL,UNIQUE(season,source_event_id))",
 "CREATE INDEX IF NOT EXISTS idx_mega_captured_events_season ON mega_team_captured_bank_events(season,occurred_at DESC,id DESC)",
 "CREATE INDEX IF NOT EXISTS idx_mega_captured_events_player ON mega_team_captured_bank_events(season,gamertag)",
 "CREATE TABLE IF NOT EXISTS mega_team_capture_status (season TEXT PRIMARY KEY REFERENCES mega_team_seasons(season),last_success INTEGER NOT NULL DEFAULT 0,last_attempt INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',last_source_count INTEGER NOT NULL DEFAULT 0,last_inserted INTEGER NOT NULL DEFAULT 0,last_parse_errors INTEGER NOT NULL DEFAULT 0,has_provider_ids INTEGER NOT NULL DEFAULT 0,history_complete INTEGER NOT NULL DEFAULT 0)"
].join(';')+';');

export function saveMegaCapture(rows,{
 season=activeMegaSeason(),teamId=MEGA_TEAM_ID,
 expectedCount=null,historyComplete=false
}={}){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown team season.');
 const prepared=prepareMegaEvents(rows,{season,teamId});
 if(expectedCount!==null&&(!Number.isSafeInteger(expectedCount)||expectedCount<0))
  throw new Error('Invalid event-count metadata.');
 // A failed parse never causes the team financial ledger to be wiped.
 if(prepared.errors.length)throw new Error('Event capture was incomplete: '+prepared.errors.length+' unrecognized rows.');
 // A public log can show fewer bank rows than the all-category event counter.
 // Still import newly observed bank events, but never call this lifetime-complete.
 const incompleteCount=expectedCount!==null&&expectedCount>rows.length;
 if(rows.length>0&&!prepared.events.length)throw new Error('No bank events parsed.');
 const stamp=Date.now();
 return transaction(()=>{
  let inserted=0,duplicates=0;
  for(const event of prepared.events){
   const old=one('SELECT * FROM mega_team_captured_bank_events WHERE season=? AND source_event_id=?',season,event.eventId);
   if(old){
    const identical=old.team_id===teamId&&old.gamertag.toLowerCase()===event.gamertag.toLowerCase()&&
      old.kind===event.kind&&old.amount_cents===event.amountCents&&
      old.display_time===event.displayTime&&old.occurred_at===(event.occurredAt??null);
    if(!identical)throw new Error('Conflicting provider event ID; capture rejected atomically.');
    duplicates++;
    run('UPDATE mega_team_captured_bank_events SET last_seen_at=? WHERE id=?',stamp,old.id);
   }else{
    run('INSERT INTO mega_team_captured_bank_events(team_id,season,source_event_id,identity,gamertag,kind,amount_cents,display_time,occurred_at,time_precision,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      teamId,season,event.eventId,event.identity,event.gamertag,event.kind,event.amountCents,
      event.displayTime,event.occurredAt,event.timePrecision,stamp,stamp);
    inserted++;
   }
  }
  // "Full history" requires the upstream to expose every event, not merely
  // a page of the most recent results. Unverified heuristics never claim it.
  const confirmed=historyComplete===true&&!prepared.identityCaveat&&expectedCount===rows.length;
  run('INSERT INTO mega_team_capture_status(season,last_attempt,last_success,last_error,last_source_count,last_inserted,last_parse_errors,has_provider_ids,history_complete) VALUES(?,?,?,?,?,?,?,?,?) '+
      'ON CONFLICT(season) DO UPDATE SET last_attempt=excluded.last_attempt,last_success=excluded.last_success,last_error=excluded.last_error,last_source_count=excluded.last_source_count,last_inserted=excluded.last_inserted,last_parse_errors=excluded.last_parse_errors,has_provider_ids=excluded.has_provider_ids,history_complete=MAX(mega_team_capture_status.history_complete,excluded.history_complete)',
      season,stamp,stamp,'',rows.length,inserted,0,prepared.identityCaveat?0:1,confirmed?1:0);
  return {ok:true,season,seen:rows.length,inserted,duplicates,totalEvents:one('SELECT COUNT(*) n FROM mega_team_captured_bank_events WHERE season=?',season).n,
    partialHistory:!confirmed||incompleteCount,reportedCount:expectedCount,
    provisionalIds:prepared.identityCaveat};
 });
}
export function noteMegaCaptureFailure(season=activeMegaSeason(),message='Capture temporarily unavailable'){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))return;
 const msg=String(message).slice(0,160),stamp=Date.now();
 run('INSERT INTO mega_team_capture_status(season,last_attempt,last_error) VALUES(?,?,?) '+
   'ON CONFLICT(season) DO UPDATE SET last_attempt=excluded.last_attempt,last_error=excluded.last_error',
  season,stamp,msg);
}
export function megaCapturedBankSummary(season=activeMegaSeason()){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown team season.');
 const byPlayer=all("SELECT gamertag, "+
  "COALESCE(SUM(CASE WHEN kind='deposit' THEN amount_cents ELSE 0 END),0) deposit_cents, "+
  "COALESCE(SUM(CASE WHEN kind='withdrawal' THEN amount_cents ELSE 0 END),0) withdrawal_cents, "+
  "COUNT(*) event_count,MIN(first_seen_at) first_seen,MAX(last_seen_at) last_seen "+
  "FROM mega_team_captured_bank_events WHERE season=? GROUP BY gamertag COLLATE NOCASE ORDER BY deposit_cents DESC,gamertag",season);
 const exact=byPlayer.every(row=>Number.isSafeInteger(row.deposit_cents)&&Number.isSafeInteger(row.withdrawal_cents));
 let deposits=0,withdrawals=0;
 for(const p of byPlayer){deposits+=p.deposit_cents;withdrawals+=p.withdrawal_cents;}
 const amount=number=>Number.isSafeInteger(number)?formatMegaCents(number):null;
 const events=all('SELECT * FROM mega_team_captured_bank_events WHERE season=? ORDER BY COALESCE(occurred_at,first_seen_at) DESC,id DESC LIMIT 100',season);
 return {season,teamId:MEGA_TEAM_ID,status:one('SELECT * FROM mega_team_capture_status WHERE season=?',season),
   totalEvents:one('SELECT COUNT(*) n FROM mega_team_captured_bank_events WHERE season=?',season).n,
   deposited:exact?amount(deposits):null,withdrawn:exact?amount(withdrawals):null,
   players:byPlayer.map(p=>({gamertag:p.gamertag,deposited:amount(p.deposit_cents),
     withdrawn:amount(p.withdrawal_cents),net:Number.isSafeInteger(p.deposit_cents-p.withdrawal_cents)?((p.deposit_cents-p.withdrawal_cents)<0?'-':'')+formatMegaCents(Math.abs(p.deposit_cents-p.withdrawal_cents)):null,
     recordedEvents:p.event_count})),
   events:events.map(e=>({eventId:e.source_event_id,gamertag:e.gamertag,
      kind:e.kind,amount:amount(e.amount_cents),time:e.display_time,
      timePrecision:e.time_precision,firstSeen:e.first_seen_at})),
   coverage:'captured_events_only'};
}
