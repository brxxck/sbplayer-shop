// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Snapshot-only Top 10 data; source links are verified before they enter the DB.
// Never mix these read-only observations with SBsxScam's manual financial ledger.
import {createHash} from 'node:crypto';
import {db,all,one,run,transaction} from './db.js';
import {validGamertag,MEGA_TEAM_ID} from './mega-team.js';
import {parseObservedBalance} from './mega-team-browser-snapshot.js';
import {parseMegaEventRow,formatMegaCents} from './mega-team-bank-event-parser.js';

export const TOP10_URL='https://inpvp.net/megasmp/teams';
export const TOP10_LIST_POLL_MS=60000;
export const TOP10_TEAM_SPACING_MS=30000;
export const TOP10_TEAM_REFRESH_MS=300000;
export const KNOWN_TEAM_LINKS=Object.freeze([
 ['Abaddon','d3b46a3c-f5a5-4888-a247-0074ccbfceec'],
 ['SBsxScam',MEGA_TEAM_ID],
 ['Abyzz','dfef51f7-4800-470d-8996-7721229b9e80'],
 ['Abraxas','241d6fbb-18ef-4b71-a710-0cac601a11ef'],
 ['Auryn','f4c9c9a1-3948-4365-82c3-d16d99fbd3c8'],
 ['MEOWxD','b23ad6ae-9bc7-448c-865b-f516ae206563'],
 ['richmans','377007'],
 ['Zr0','e548c55e-a668-4fe6-a9e5-57c389375dd1'],
 ['LandLords','6a27943c-a0aa-4d1e-856d-8c6a64de4133'],
 ['IFranceI','773746b4-89d9-4a36-9033-f9bcb5211afe']
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC=/^[1-9]\d{0,19}$/;
const TEAM_NAME=/^[a-z0-9][a-z0-9 _#.'-]{0,63}$/i;

export function canonicalTeamLink(name,id){
 if(typeof name!=='string'||!TEAM_NAME.test(name)||typeof id!=='string'||!(UUID.test(id)||NUMERIC.test(id)))
  throw new Error('Invalid InPvP team identifier.');
 return TOP10_URL+'?'+new URLSearchParams({team:name,gamemode:'megasmp',id}).toString();
}
export function verifyTeamLink(input){
 let url;
 try{url=new URL(input);}catch{throw new Error('Invalid InPvP team URL.');}
 const name=url.searchParams.get('team')||'',id=url.searchParams.get('id')||'';
 if(url.protocol!=='https:'||url.hostname!=='inpvp.net'||url.port||
   url.pathname!=='/megasmp/teams'||url.searchParams.get('gamemode')!=='megasmp'||
   url.username||url.password||url.hash||url.searchParams.size!==3)
   throw new Error('Unapproved InPvP team URL.');
 return {id,name,url:canonicalTeamLink(name,id)};
}
const nint=(value,max)=>{
 if(value===null||value===undefined||value==='')return null;
 const n=Number(value);
 return Number.isSafeInteger(n)&&n>=0&&n<=max?n:null;
};
const compactMoney=raw=>{
 if(raw===null||raw===undefined||String(raw).trim()==='')return {text:null,cents:null,approximate:false};
 const text=String(raw).trim();
 if(text.length>32)return {text:null,cents:null,approximate:false};
 try{return {text,cents:parseObservedBalance(text),approximate:/[KMBT]$/i.test(text)};}
 catch{return {text:null,cents:null,approximate:false};}
};

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_top_teams (team_id TEXT PRIMARY KEY,name TEXT NOT NULL,team_url TEXT NOT NULL,rank INTEGER CHECK(rank BETWEEN 1 AND 10),bank_text TEXT,bank_cents INTEGER,bank_approx INTEGER NOT NULL DEFAULT 0,level INTEGER,views INTEGER,member_count INTEGER,roster_json TEXT NOT NULL DEFAULT '[]',rank_observed_at INTEGER NOT NULL DEFAULT 0,detail_observed_at INTEGER NOT NULL DEFAULT 0,detail_attempt_at INTEGER NOT NULL DEFAULT 0,detail_error TEXT NOT NULL DEFAULT '',source TEXT NOT NULL DEFAULT 'reference' CHECK(source IN ('reference','leaderboard')))",
 "CREATE UNIQUE INDEX IF NOT EXISTS idx_mega_top_rank ON mega_top_teams(rank) WHERE rank IS NOT NULL",
 "CREATE TABLE IF NOT EXISTS mega_top_status (id INTEGER PRIMARY KEY CHECK(id=1),last_attempt INTEGER NOT NULL DEFAULT 0,last_success INTEGER NOT NULL DEFAULT 0,last_change INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',last_count INTEGER NOT NULL DEFAULT 0)",
 "CREATE TABLE IF NOT EXISTS mega_top_events (team_id TEXT NOT NULL REFERENCES mega_top_teams(team_id),event_key TEXT NOT NULL,gamertag TEXT NOT NULL COLLATE NOCASE,kind TEXT NOT NULL CHECK(kind IN ('deposit','withdrawal')),amount_cents INTEGER NOT NULL CHECK(amount_cents>0),display_time TEXT NOT NULL,first_seen_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL,PRIMARY KEY(team_id,event_key))",
 "CREATE INDEX IF NOT EXISTS idx_mega_top_events_player ON mega_top_events(team_id,gamertag)"
].join(';')+';');
// Non-destructive, idempotent columns for separately verified member and
// bank-log coverage; never overwrite existing snapshots or user-entered data.
const columns=new Set(all("PRAGMA table_info('mega_top_teams')").map(x=>x.name));
for(const [column,definition] of [
 ['member_status',"TEXT NOT NULL DEFAULT 'unavailable'"],
 ['event_status',"TEXT NOT NULL DEFAULT 'unavailable'"],
 ['event_pages','INTEGER NOT NULL DEFAULT 0']
]){
 if(!columns.has(column))db.exec('ALTER TABLE mega_top_teams ADD COLUMN '+column+' '+definition);
}
run('INSERT OR IGNORE INTO mega_top_status(id) VALUES(1)');
for(const [name,id] of KNOWN_TEAM_LINKS)
 run('INSERT OR IGNORE INTO mega_top_teams(team_id,name,team_url) VALUES(?,?,?)',id,name,canonicalTeamLink(name,id));

export function top10Status(){return one('SELECT * FROM mega_top_status WHERE id=1');}
export function allTop10KnownTeams(){return all('SELECT team_id AS id,name,team_url AS url FROM mega_top_teams ORDER BY name COLLATE NOCASE');}
export function top10Leaderboard(){
 const status=top10Status();
 const rows=all("SELECT team_id AS id,name,team_url AS url,rank,bank_text AS bankText,bank_cents AS bankCents,bank_approx AS approximate,level,views,member_count AS memberCount,rank_observed_at AS rankObservedAt,detail_observed_at AS detailObservedAt,source "+
   "FROM mega_top_teams WHERE rank IS NOT NULL ORDER BY rank");
 if(status.last_success)return {status,teams:rows,live:true};
 const reference=all("SELECT team_id AS id,name,team_url AS url,NULL AS rank,bank_text AS bankText,bank_cents AS bankCents,bank_approx AS approximate,level,views,member_count AS memberCount,rank_observed_at AS rankObservedAt,detail_observed_at AS detailObservedAt,source "+
   "FROM mega_top_teams WHERE source='reference' ORDER BY rowid LIMIT 10");
 return {status,teams:reference,live:false};
}
export function topTeamById(id){
 if(typeof id!=='string'||!(UUID.test(id)||NUMERIC.test(id)))return null;
 return one("SELECT team_id AS id,name,team_url AS url,rank,bank_text AS bankText,bank_cents AS bankCents,bank_approx AS approximate,level,views,member_count AS memberCount,roster_json AS rosterJson,rank_observed_at AS rankObservedAt,detail_observed_at AS detailObservedAt,detail_attempt_at AS detailAttemptAt,detail_error AS detailError,member_status AS memberStatus,event_status AS eventStatus,event_pages AS eventPages,source FROM mega_top_teams WHERE team_id=?",id)||null;
}

export function saveTop10Leaderboard(rows,{at=Date.now()}={}){
 if(!Array.isArray(rows)||rows.length!==10)throw new Error('Top 10 listing incomplete; previous verified rankings retained.');
 const usedIds=new Set(),usedNames=new Set(),usedRanks=new Set();
 const safe=rows.map(row=>{
   const verified=verifyTeamLink(row.url);
   const rank=Number(row.rank);
   if(!Number.isInteger(rank)||rank<1||rank>10||usedRanks.has(rank)||usedIds.has(verified.id)||
      usedNames.has(verified.name.toLowerCase()))
     throw new Error('InPvP leaderboard contains duplicate or invalid positions.');
   usedRanks.add(rank);usedIds.add(verified.id);usedNames.add(verified.name.toLowerCase());
   const money=compactMoney(row.bankText);
   return {...verified,rank,level:nint(row.level,100000),views:nint(row.views,1000000000),
     bankText:money.text,bankCents:money.cents,approximate:money.approximate?1:0};
 });
 if(!safe.every(x=>usedRanks.has(x.rank)))throw new Error('Top 10 source incomplete.');
 const previous=all('SELECT rank,team_id FROM mega_top_teams WHERE rank IS NOT NULL ORDER BY rank');
 const changed=previous.length!==10||safe.some(x=>previous[x.rank-1]?.team_id!==x.id);
 return transaction(()=>{
   // Drop previous ranks first; the unique rank index must not reject a swap.
   run('UPDATE mega_top_teams SET rank=NULL WHERE rank IS NOT NULL');
   for(const team of safe){
     run("INSERT INTO mega_top_teams(team_id,name,team_url,rank,bank_text,bank_cents,bank_approx,level,views,rank_observed_at,source) "+
       "VALUES(?,?,?,?,?,?,?,?,?,?,'leaderboard') ON CONFLICT(team_id) DO UPDATE SET "+
       "name=excluded.name,team_url=excluded.team_url,rank=excluded.rank,"+
       "bank_text=COALESCE(excluded.bank_text,mega_top_teams.bank_text),"+
       "bank_cents=COALESCE(excluded.bank_cents,mega_top_teams.bank_cents),"+
       "bank_approx=CASE WHEN excluded.bank_text IS NOT NULL THEN excluded.bank_approx ELSE mega_top_teams.bank_approx END,"+
       "level=COALESCE(excluded.level,mega_top_teams.level),"+
       "views=COALESCE(excluded.views,mega_top_teams.views),"+
       "rank_observed_at=excluded.rank_observed_at,source='leaderboard'",
       team.id,team.name,team.url,team.rank,team.bankText,team.bankCents,
       team.approximate,team.level,team.views,at);
   }
   run('UPDATE mega_top_status SET last_attempt=?,last_success=?,last_count=10,last_error=?,last_change=CASE WHEN ? THEN ? ELSE last_change END WHERE id=1',
     at,at,'',changed?1:0,at);
   return {changed,count:10,newTeams:safe.filter(x=>!previous.some(p=>p.team_id===x.id)).map(x=>x.name)};
 });
}
export function noteTop10Failure(message,{at=Date.now()}={}){
 const safe=String(message||'Leaderboard temporarily unavailable').slice(0,180);
 run('UPDATE mega_top_status SET last_attempt=?,last_error=? WHERE id=1',at,safe);
}
export function top10NextDue({at=Date.now()}={}){
 // Read the current Top 10 when verified. If the source leaderboard still
 // displays its loading placeholder, read only owner-provided known official
 // URLs instead. NEVER treat those reference teams as confirmed live ranks.
 // Each team is checked no more than once per five minutes; shared worker
 // runs only one detail read per 30-second slot.
 return one('SELECT team_id AS id,name,team_url AS url FROM mega_top_teams '+
   "WHERE (rank IS NOT NULL OR (source='reference' AND "+
   '(SELECT last_success FROM mega_top_status WHERE id=1)=0)) '+
   'AND detail_attempt_at<=? ORDER BY detail_attempt_at ASC,COALESCE(rank,999),rowid LIMIT 1',
   at-TOP10_TEAM_REFRESH_MS)||null;
}
export function noteTopTeamAttempt(id,{at=Date.now()}={}){
 run('UPDATE mega_top_teams SET detail_attempt_at=? WHERE team_id=?',at,id);
}
export function noteTopTeamFailure(id,message){
 run('UPDATE mega_top_teams SET detail_error=? WHERE team_id=?',
   String(message||'Team details unavailable').slice(0,180),id);
}

export function saveTopTeamDetails(teamId,capture,{at=Date.now()}={}){
 const team=topTeamById(teamId);
 if(!team||!capture||capture.id!==team.id)throw new Error('Unexpected InPvP team detail.');
 const money=compactMoney(capture.bankText);
 const people=Array.isArray(capture.roster)?capture.roster:[];
 if(people.length>300)throw new Error('Team roster is too large.');
 const unique=new Set();
 const roster=people.map(p=>{
   const gamertag=validGamertag(p?.gamertag);
   if(!gamertag||unique.has(gamertag.toLowerCase()))throw new Error('Invalid or duplicated team roster.');
   unique.add(gamertag.toLowerCase());
   const reported=/^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i;
   const net=/^-?\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i;
   const dep=String(p.reportedDepositsText||'').trim();
   const withdrew=String(p.reportedWithdrawalsText||'').trim();
   const netText=String(p.reportedNetText||'').trim();
   return {gamertag,role:['Leader','Officer','Member'].includes(p.role)?p.role:'Member',
     ...(reported.test(dep)?{reportedDepositsText:dep}:{}),
     ...(reported.test(withdrew)?{reportedWithdrawalsText:withdrew}:{}),
     ...(net.test(netText)?{reportedNetText:netText}:{})};
 });
 const rows=Array.isArray(capture.events)?capture.events:[];
 if(rows.length>500)throw new Error('Too many observed bank event rows.');
 const seen=new Map(),events=[];
 for(const row of rows){
   let parsed;try{parsed=parseMegaEventRow(row);}catch{continue;}
   const base=[teamId,parsed.gamertag.toLowerCase(),parsed.kind,parsed.amountCents,
     parsed.occurredAt||'',parsed.displayTime.toLowerCase()].join('|');
   const hash=createHash('sha256').update(base).digest('hex');
   const ordinal=(seen.get(hash)||0)+1;seen.set(hash,ordinal);
   const key=parsed.eventId?'provider:'+parsed.eventId:'visible:'+hash.slice(0,40)+':'+ordinal;
   events.push({...parsed,key});
 }
 const memberCount=nint(capture.memberCount,100000);
 return transaction(()=>{
   run('UPDATE mega_top_teams SET '+
     'bank_text=COALESCE(?,bank_text),bank_cents=COALESCE(?,bank_cents),'+
     'bank_approx=CASE WHEN ? IS NOT NULL THEN ? ELSE bank_approx END,'+
     'level=COALESCE(?,level),views=COALESCE(?,views),member_count=COALESCE(?,member_count),'+
     'roster_json=CASE WHEN ? THEN ? ELSE roster_json END,'+
     'detail_observed_at=?,detail_attempt_at=?,detail_error=?,'+
     'member_status=?,event_status=?,event_pages=? WHERE team_id=?',
     money.text,money.cents,money.text,money.approximate?1:0,
     nint(capture.level,100000),nint(capture.views,1000000000),memberCount,
     roster.length?1:0,JSON.stringify(roster),at,at,'',
     roster.length?'observed':'unavailable',
     ['observed','empty_visible_log'].includes(capture.eventStatus)?
       capture.eventStatus:'unavailable',
     nint(capture.eventPages,20)||0,teamId);
   let inserted=0;
   for(const event of events){
     const prev=one('SELECT gamertag,kind,amount_cents,display_time FROM mega_top_events WHERE team_id=? AND event_key=?',
       teamId,event.key);
     if(prev){
       if(prev.gamertag.toLowerCase()!==event.gamertag.toLowerCase()||
         prev.kind!==event.kind||prev.amount_cents!==event.amountCents||
         prev.display_time!==event.displayTime)
         throw new Error('Conflicting InPvP transaction identity.');
       run('UPDATE mega_top_events SET last_seen_at=? WHERE team_id=? AND event_key=?',at,teamId,event.key);
     }else{
       run('INSERT INTO mega_top_events(team_id,event_key,gamertag,kind,amount_cents,display_time,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?)',
         teamId,event.key,event.gamertag,event.kind,event.amountCents,event.displayTime,at,at);
       inserted++;
     }
   }
   return {members:roster.length,eventsObserved:events.length,eventsAdded:inserted};
 });
}
export function topTeamDetails(id){
 const team=topTeamById(id);if(!team)return null;
 let roster=[];
 try{roster=JSON.parse(team.rosterJson||'[]');}catch{}
 const aggregates=all('SELECT gamertag,COUNT(*) AS eventCount,'+
   "SUM(CASE WHEN kind='deposit' THEN amount_cents ELSE 0 END) AS deposits,"+
   "SUM(CASE WHEN kind='withdrawal' THEN amount_cents ELSE 0 END) AS withdrawals "+
   'FROM mega_top_events WHERE team_id=? GROUP BY gamertag COLLATE NOCASE ORDER BY deposits DESC,gamertag COLLATE NOCASE LIMIT 1000',id);
 const byName=new Map(aggregates.map(x=>[x.gamertag.toLowerCase(),x]));
 const members=roster.map(m=>{
   const totals=byName.get(m.gamertag.toLowerCase())||null;
   byName.delete(m.gamertag.toLowerCase());
   return {gamertag:m.gamertag,role:m.role,rosterObserved:true,
     reportedDepositsText:m.reportedDepositsText||null,reportedWithdrawalsText:m.reportedWithdrawalsText||null,
     reportedNetText:m.reportedNetText||null,
     depositsCents:totals?.deposits??null,withdrawalsCents:totals?.withdrawals??null,
     netCents:totals?totals.deposits-totals.withdrawals:null,eventCount:totals?.eventCount||0};
 });
 for(const t of byName.values())members.push({
   gamertag:t.gamertag,role:null,rosterObserved:false,
   depositsCents:t.deposits,withdrawalsCents:t.withdrawals,
   netCents:t.deposits-t.withdrawals,eventCount:t.eventCount
 });
 const eventCount=one('SELECT COUNT(*) AS n FROM mega_top_events WHERE team_id=?',id)?.n||0;
 const events=all('SELECT gamertag,kind,amount_cents AS amountCents,display_time AS displayTime FROM mega_top_events WHERE team_id=? ORDER BY first_seen_at DESC LIMIT 50',id);
 return {...team,members,events,eventCount};
}
