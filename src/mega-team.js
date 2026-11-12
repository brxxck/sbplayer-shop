// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Season-scoped MegaSMP roster and ledger. Never infer financial activity from bank balance.
import {randomUUID} from 'node:crypto';
import {db,all,one,run,transaction,getSetting,setSetting} from './db.js';

export const MEGA_TEAM_NAME='SBsxScam';
export const MEGA_TEAM_ID='5638a504-3347-43fc-89d6-424dad53b7f6';
export const MEGA_TEAM_URL='https://inpvp.net/megasmp/teams?team=SBsxScam&gamemode=megasmp&id='+MEGA_TEAM_ID;
export const TEAM_REFRESH_MS=300000;
const MAX_MONEY=1000000000000000;
const stamp=()=>Date.now();

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_team_seasons (season TEXT PRIMARY KEY,label TEXT NOT NULL,created_at INTEGER NOT NULL)",
 "CREATE TABLE IF NOT EXISTS mega_team_members (id INTEGER PRIMARY KEY AUTOINCREMENT,season TEXT NOT NULL REFERENCES mega_team_seasons(season),gamertag TEXT NOT NULL COLLATE NOCASE,role TEXT NOT NULL DEFAULT 'Member',discord_user_id TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','former')),source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','manual_import','authorized_feed')),updated_at INTEGER NOT NULL,UNIQUE(season,gamertag))",
 "CREATE INDEX IF NOT EXISTS idx_mega_team_season ON mega_team_members(season,status)",
 "CREATE TABLE IF NOT EXISTS mega_team_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT,season TEXT NOT NULL REFERENCES mega_team_seasons(season),member_id INTEGER NOT NULL REFERENCES mega_team_members(id),kind TEXT NOT NULL CHECK(kind IN ('deposit','withdrawal')),amount INTEGER NOT NULL CHECK(amount>0),notes TEXT NOT NULL DEFAULT '',actor_id TEXT NOT NULL REFERENCES users(id),occurred_at INTEGER NOT NULL,created_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_mega_team_ledger ON mega_team_ledger(season,occurred_at DESC)",
 "CREATE TABLE IF NOT EXISTS mega_team_imported_totals (member_id INTEGER PRIMARY KEY REFERENCES mega_team_members(id) ON DELETE CASCADE,deposits INTEGER,withdrawals INTEGER,as_of INTEGER NOT NULL,source TEXT NOT NULL CHECK(source IN ('manual_import','authorized_feed')))",
 "CREATE TABLE IF NOT EXISTS mega_team_bank_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT,season TEXT NOT NULL REFERENCES mega_team_seasons(season),balance INTEGER NOT NULL CHECK(balance>=0),as_of INTEGER NOT NULL,source TEXT NOT NULL CHECK(source IN ('manual','manual_import','authorized_feed')),created_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_mega_team_bank_season ON mega_team_bank_snapshots(season,as_of DESC,id DESC)",
 "CREATE TABLE IF NOT EXISTS mega_team_sync_state (id INTEGER PRIMARY KEY CHECK(id=1),last_attempt INTEGER NOT NULL DEFAULT 0,last_success INTEGER NOT NULL DEFAULT 0,last_source_at INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',last_count INTEGER NOT NULL DEFAULT 0)"
].join(';')+';');
run('INSERT OR IGNORE INTO mega_team_seasons(season,label,created_at) VALUES(?,?,?)','current','Current season (unconfirmed)',stamp());
run('INSERT OR IGNORE INTO mega_team_sync_state(id) VALUES(1)');

export const activeMegaSeason=()=>getSetting('mega_team_active_season','current');
export const megaSeasons=()=>all('SELECT * FROM mega_team_seasons ORDER BY created_at DESC,season DESC');
export function resolveMegaSeason(requested){
 const season=String(requested||activeMegaSeason());
 return one('SELECT * FROM mega_team_seasons WHERE season=?',season)||one('SELECT * FROM mega_team_seasons WHERE season=?',activeMegaSeason());
}
export function validGamertag(value){
 const name=String(value||'').trim().replace(/\s+/g,' ');
 return /^[a-z0-9_. #\-]{2,32}$/i.test(name)?name:null;
}
const roleValue=v=>['Leader','Officer','Member'].includes(String(v))?String(v):'Member';
export function moneyAmount(value,{allowZero=false,nullable=false}={}){
 if(nullable&&(value===null||value===undefined||value===''))return null;
 const raw=String(value??'').trim();
 if(!/^\d{1,16}$/.test(raw))throw new Error('Money must be a non-negative whole number.');
 const amount=Number(raw);
 if(!Number.isSafeInteger(amount)||amount>MAX_MONEY||(!allowZero&&amount===0))
  throw new Error('Money amount is outside the supported range.');
 return amount;
}
function requireSeason(season){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown team season.');
}
export function createMegaSeason(label){
 const clean=String(label||'').trim().replace(/\s+/g,' ');
 if(clean.length<2||clean.length>45||!/^[a-z0-9][a-z0-9 _#\-().]*$/i.test(clean))
  throw new Error('Use a season label between 2 and 45 characters.');
 const key='season-'+randomUUID().slice(0,12);
 transaction(()=>{
  run('INSERT INTO mega_team_seasons(season,label,created_at) VALUES(?,?,?)',key,clean,stamp());
  setSetting('mega_team_active_season',key);
 });
 return key;
}
export function upsertMegaMember({season=activeMegaSeason(),gamertag,role='Member',discordId='',source='manual'}){
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Enter a valid Minecraft Gamertag (2–32 characters).');
 if(discordId&&!/^\d{15,22}$/.test(discordId))throw new Error('Invalid Discord user ID.');
 if(!['manual','manual_import','authorized_feed'].includes(source))throw new Error('Unsupported source.');
 requireSeason(season);
 run("INSERT INTO mega_team_members(season,gamertag,role,discord_user_id,status,source,updated_at) VALUES(?,?,?,?,'active',?,?) "+
     "ON CONFLICT(season,gamertag) DO UPDATE SET role=excluded.role, "+
     "discord_user_id=CASE WHEN excluded.discord_user_id!='' THEN excluded.discord_user_id ELSE mega_team_members.discord_user_id END, "+
     "status='active',source=excluded.source,updated_at=excluded.updated_at",
     season,name,roleValue(role),discordId,source,stamp());
 return one('SELECT id FROM mega_team_members WHERE season=? AND gamertag=? COLLATE NOCASE',season,name).id;
}
export function setMegaMemberStatus({season=activeMegaSeason(),memberId,status}){
 if(!['active','former'].includes(status))throw new Error('Invalid member status.');
 const result=run('UPDATE mega_team_members SET status=?,updated_at=? WHERE id=? AND season=?',status,stamp(),memberId,season);
 if(!result.changes)throw new Error('Team member not found.');
}
export function addMegaTransaction({season=activeMegaSeason(),memberId,kind,amount,notes='',actorId}){
 if(!['deposit','withdrawal'].includes(kind))throw new Error('Choose a deposit or withdrawal.');
 const cash=moneyAmount(amount),clean=String(notes||'').trim().slice(0,240);
 const member=one('SELECT id FROM mega_team_members WHERE season=? AND id=? AND status=?',season,memberId,'active');
 if(!member)throw new Error('Select an active player in this season.');
 if(!one('SELECT 1 FROM users WHERE id=?',actorId))throw new Error('Unknown editor.');
 return Number(run('INSERT INTO mega_team_ledger(season,member_id,kind,amount,notes,actor_id,occurred_at,created_at) VALUES(?,?,?,?,?,?,?,?)',
  season,member.id,kind,cash,clean,actorId,stamp(),stamp()).lastInsertRowid);
}
export function recordMegaBank({season=activeMegaSeason(),balance,source='manual',asOf=stamp()}){
 const amount=moneyAmount(balance,{allowZero:true});
 if(!['manual','manual_import','authorized_feed'].includes(source))throw new Error('Invalid bank source.');
 requireSeason(season);
 return Number(run('INSERT INTO mega_team_bank_snapshots(season,balance,as_of,source,created_at) VALUES(?,?,?,?,?)',
  season,amount,asOf,source,stamp()).lastInsertRowid);
}
export function setMegaSyncState({attempt=null,error=null}={}){
 if(attempt!==null)run('UPDATE mega_team_sync_state SET last_attempt=? WHERE id=1',attempt);
 if(error!==null)run('UPDATE mega_team_sync_state SET last_error=? WHERE id=1',String(error).slice(0,200));
}
