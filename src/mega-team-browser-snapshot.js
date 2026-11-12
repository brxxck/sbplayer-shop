// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Independent, observational InPvP data. Never overwrite manual ledger entries.
import {db,all,one,run,transaction} from './db.js';
import {MEGA_TEAM_ID,activeMegaSeason,validGamertag} from './mega-team.js';
import {parseMegaMoneyCents} from './mega-team-bank-event-parser.js';
import {saveMegaCapture} from './mega-team-bank-event-store.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_team_browser_roster (season TEXT NOT NULL REFERENCES mega_team_seasons(season),gamertag TEXT NOT NULL COLLATE NOCASE,role TEXT NOT NULL CHECK(role IN ('Leader','Officer','Member')),last_seen_at INTEGER NOT NULL,PRIMARY KEY(season,gamertag))",
 "CREATE TABLE IF NOT EXISTS mega_team_browser_bank (id INTEGER PRIMARY KEY AUTOINCREMENT,season TEXT NOT NULL REFERENCES mega_team_seasons(season),balance_cents INTEGER NOT NULL CHECK(balance_cents>=0),observed_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_mega_browser_bank ON mega_team_browser_bank(season,observed_at DESC,id DESC)",
 "CREATE TABLE IF NOT EXISTS mega_team_browser_bank_labels (bank_id INTEGER PRIMARY KEY REFERENCES mega_team_browser_bank(id),reported_text TEXT NOT NULL,approximate INTEGER NOT NULL DEFAULT 0 CHECK(approximate IN (0,1)))"
].join(';')+';');

// Source bank balances can be compact/rounded (e.g. $40.3M).
// Store the nominal numeric value in cents and preserve that it is approximate.
export function parseObservedBalance(raw){
 if(raw===null||raw===undefined||raw==='')return null;
 const value=String(raw).trim();
 const compact=/^\$?(\d+(?:\.\d{1,3})?)([KMBT])$/i.exec(value);
 if(compact){
  const units={K:1000n,M:1000000n,B:1000000000n,T:1000000000000n};
  const [whole,fraction='']=compact[1].split('.');
  const scale=10n**BigInt(fraction.length);
  const digits=BigInt(whole)*scale+BigInt(fraction||'0');
  const numerator=digits*units[compact[2].toUpperCase()]*100n;
  if(numerator%scale!==0n)throw new Error('Displayed bank balance has sub-cent precision.');
  const cents=numerator/scale;
  if(cents>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Displayed bank balance exceeds safe precision.');
  return Number(cents);
 }
 if(/^\$?0(?:\.0{1,2})?$/.test(value))return 0;
 return parseMegaMoneyCents(value);
}
export function saveMegaBrowserCapture(capture,{season=activeMegaSeason()}={}){
 if(!capture||capture.teamId!==MEGA_TEAM_ID||!Array.isArray(capture.rows))
  throw new Error('Browser capture does not belong to the configured team.');
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown capture season.');
 const input=Array.isArray(capture.roster)?capture.roster:[];
 if(input.length>300)throw new Error('Browser roster exceeds safety limit.');
 const names=new Set();
 const roster=input.map(item=>{
  const gamertag=validGamertag(item?.gamertag);
  if(!gamertag)throw new Error('Invalid observed roster Gamertag.');
  if(names.has(gamertag.toLowerCase()))throw new Error('Duplicate browser roster Gamertag.');
  names.add(gamertag.toLowerCase());
  const role=['Leader','Officer','Member'].includes(item.role)?item.role:'Member';
  return {gamertag,role};
 });
 const balanceCents=parseObservedBalance(capture.bankBalance);
 const reportedBalance=capture.bankBalance==null?'':String(capture.bankBalance).trim().slice(0,32);
 const approximateBalance=/[KMBT]$/i.test(reportedBalance);
 if(!capture.rows.length&&!roster.length&&balanceCents===null)
  throw new Error('No bank events, roster or verified team bank balance were available.');
 // All source fields are validated before changing any stored financial value.
 const result=saveMegaCapture(capture.rows,{
  season,expectedCount:capture.reportedCount??null,historyComplete:false
 });
 const observedAt=Date.now();
 transaction(()=>{
  for(const member of roster){
   run('INSERT INTO mega_team_browser_roster(season,gamertag,role,last_seen_at) VALUES(?,?,?,?) '+
    'ON CONFLICT(season,gamertag) DO UPDATE SET role=excluded.role,last_seen_at=excluded.last_seen_at',
    season,member.gamertag,member.role,observedAt);
  }
  // Missing rows are not proof that a player left the team.
  if(balanceCents!==null){
   const prior=one('SELECT balance_cents,observed_at FROM mega_team_browser_bank WHERE season=? ORDER BY observed_at DESC,id DESC LIMIT 1',season);
   if(!prior||prior.balance_cents!==balanceCents||observedAt-prior.observed_at>15*60000){
    const entry=run('INSERT INTO mega_team_browser_bank(season,balance_cents,observed_at) VALUES(?,?,?)',season,balanceCents,observedAt);
    run('INSERT INTO mega_team_browser_bank_labels(bank_id,reported_text,approximate) VALUES(?,?,?)',
      Number(entry.lastInsertRowid),reportedBalance,approximateBalance?1:0);
   }
  }
 });
 return {...result,rosterSeen:roster.length,bankSeen:balanceCents!==null};
}
export function megaBrowserSnapshot(season=activeMegaSeason(),{now=Date.now()}={}){
 const roster=all('SELECT gamertag,role,last_seen_at AS seenAt FROM mega_team_browser_roster WHERE season=? AND last_seen_at>? ORDER BY role,gamertag COLLATE NOCASE',season,now-30*60000);
 const bank=one('SELECT b.balance_cents AS balanceCents,b.observed_at AS observedAt,'+
  'l.reported_text AS reportedText,l.approximate AS approximate FROM mega_team_browser_bank b '+
  'LEFT JOIN mega_team_browser_bank_labels l ON l.bank_id=b.id '+
  'WHERE b.season=? ORDER BY b.observed_at DESC,b.id DESC LIMIT 1',season);
 return {roster,bank:bank||null};
}
