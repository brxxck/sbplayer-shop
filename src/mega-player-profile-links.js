// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Minecraft name -> Discord profile associations from explicit owner decisions
// or the linked Discord badge on a publicly displayed InPvP player profile.
// These are profile links only: NEVER grant any Discord roles or permissions.
import {db,all,one,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {validGamertag,activeMegaSeason} from './mega-team.js';
import {megaDiscordMatches} from './mega-team-discord-matches.js';
import {allVerifiedXboxGamertags} from './xbox-gamertag-links.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_player_profile_links (gamertag TEXT NOT NULL COLLATE NOCASE PRIMARY KEY,discord_user_id TEXT NOT NULL REFERENCES users(id),linked_by TEXT NOT NULL REFERENCES users(id),linked_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_mega_player_profiles_discord ON mega_player_profile_links(discord_user_id)",
 "CREATE TABLE IF NOT EXISTS mega_profile_auto_links (gamertag TEXT COLLATE NOCASE PRIMARY KEY,discord_user_id TEXT NOT NULL REFERENCES users(id),discord_handle TEXT NOT NULL,profile_url TEXT NOT NULL,linked_at INTEGER NOT NULL,last_verified_at INTEGER NOT NULL)",
 "CREATE TABLE IF NOT EXISTS mega_profile_auto_scans (gamertag TEXT COLLATE NOCASE PRIMARY KEY,last_checked_at INTEGER NOT NULL DEFAULT 0,next_due_at INTEGER NOT NULL DEFAULT 0,result TEXT NOT NULL DEFAULT 'pending')",
 "CREATE INDEX IF NOT EXISTS idx_mega_auto_due ON mega_profile_auto_scans(next_due_at,last_checked_at)",
 "CREATE TABLE IF NOT EXISTS mega_profile_auto_suppressed (gamertag TEXT COLLATE NOCASE PRIMARY KEY,disabled_at INTEGER NOT NULL)"
].join(';')+';');

export function allMegaPlayerProfileLinks({season=activeMegaSeason()}={}){
 const automatic=all('SELECT l.gamertag,l.discord_user_id AS discordId,'+
   'l.linked_at AS linkedAt,l.last_verified_at AS verifiedAt,'+
   'u.username,u.display_name AS displayName FROM mega_profile_auto_links l '+
   'LEFT JOIN users u ON u.id=l.discord_user_id ORDER BY l.gamertag COLLATE NOCASE')
   .map(m=>({...m,source:'inpvp'}));
 const legacy=megaDiscordMatches(season).map(m=>({
   gamertag:m.gamertag,discordId:m.discordId,username:m.username,
   displayName:m.displayName,linkedAt:m.linkedAt,source:'season'
 }));
 const global=all('SELECT l.gamertag,l.discord_user_id AS discordId,l.linked_at AS linkedAt,'+
   'u.username,u.display_name AS displayName FROM mega_player_profile_links l '+
   'LEFT JOIN users u ON u.id=l.discord_user_id ORDER BY l.gamertag COLLATE NOCASE')
   .map(m=>({...m,source:'owner'}));
 // Priority: explicit owner global > explicit season > automatic InPvP.
 const result=new Map(automatic.map(m=>[m.gamertag.toLowerCase(),m]));
 for(const item of legacy)result.set(item.gamertag.toLowerCase(),item);
 for(const item of global)result.set(item.gamertag.toLowerCase(),item);
 // A holder-verified Xbox identity supersedes historical guessed/manual associations.
 for(const item of allVerifiedXboxGamertags())result.set(item.gamertag.toLowerCase(),item);
 return [...result.values()].sort((a,b)=>a.gamertag.localeCompare(b.gamertag));
}
export function megaPlayerProfileLink(name,{season=activeMegaSeason()}={}){
 const gamertag=validGamertag(name);if(!gamertag)return null;
 return allMegaPlayerProfileLinks({season}).find(m=>m.gamertag.toLowerCase()===gamertag.toLowerCase())||null;
}
export function linkMegaPlayerProfile({gamertag,discordId,actorId}){
 const name=validGamertag(gamertag),id=String(discordId||'');
 if(!name)throw new Error('Invalid Minecraft Gamertag.');
 if(!/^\d{15,22}$/.test(id))throw new Error('Choose a verified Discord account.');
 if(!one('SELECT 1 FROM users WHERE id=?',id)||
    !one('SELECT 1 FROM users WHERE id=?',actorId))
   throw new Error('Discord account or owner was not found in the website directory.');
 const previous=one('SELECT discord_user_id FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',name);
 transaction(()=>{
  run('DELETE FROM mega_profile_auto_suppressed WHERE gamertag=? COLLATE NOCASE',name);
  run('INSERT INTO mega_player_profile_links(gamertag,discord_user_id,linked_by,linked_at) VALUES(?,?,?,?) '+
   'ON CONFLICT(gamertag) DO UPDATE SET discord_user_id=excluded.discord_user_id,linked_by=excluded.linked_by,linked_at=excluded.linked_at',
   name,id,actorId,Date.now());
 });
 return {gamertag:name,discordId:id,previousId:previous?.discord_user_id||null,
   changed:previous?.discord_user_id!==id};
}
export function unlinkMegaPlayerProfile(name){
 const gamertag=validGamertag(name);
 if(!gamertag)throw new Error('Invalid Minecraft Gamertag.');
 const previous=one('SELECT discord_user_id FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',gamertag)||
   one('SELECT discord_user_id FROM mega_profile_auto_links WHERE gamertag=? COLLATE NOCASE',gamertag);
 // Owner unlink prevents automatic relinking until explicitly re-enabled.
 transaction(()=>{
  run('DELETE FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',gamertag);
  run('DELETE FROM mega_profile_auto_links WHERE gamertag=? COLLATE NOCASE',gamertag);
  run('INSERT INTO mega_profile_auto_suppressed(gamertag,disabled_at) VALUES(?,?) '+
   'ON CONFLICT(gamertag) DO UPDATE SET disabled_at=excluded.disabled_at',gamertag,Date.now());
 });
 return {changed:!!previous,previousId:previous?.discord_user_id||null,gamertag};
}
export function allowMegaAutoProfile(name){
 const gamertag=validGamertag(name);
 if(!gamertag)throw new Error('Invalid Minecraft Gamertag.');
 const removed=run('DELETE FROM mega_profile_auto_suppressed WHERE gamertag=? COLLATE NOCASE',gamertag);
 run('UPDATE mega_profile_auto_scans SET next_due_at=0 WHERE gamertag=? COLLATE NOCASE',gamertag);
 return {changed:!!removed.changes,gamertag};
}
export function megaAutoSuppressedNames(){
 return all('SELECT gamertag FROM mega_profile_auto_suppressed ORDER BY gamertag COLLATE NOCASE').map(x=>x.gamertag);
}

export function enqueueMegaProfileCandidates(roster){
 let added=0;
 for(const player of Array.isArray(roster)?roster.slice(0,300):[]){
  const name=validGamertag(typeof player==='string'?player:player?.gamertag);
  if(!name)continue;
  if(one('SELECT 1 FROM mega_profile_auto_suppressed WHERE gamertag=? COLLATE NOCASE',name))continue;
  const result=run('INSERT OR IGNORE INTO mega_profile_auto_scans(gamertag) VALUES(?)',name);
  added+=Number(result.changes||0);
 }
 return added;
}
export function nextMegaProfileScan({at=Date.now()}={}){
 return one('SELECT q.gamertag,q.last_checked_at AS lastCheckedAt '+
  'FROM mega_profile_auto_scans q WHERE q.next_due_at<=? '+
  'AND NOT EXISTS (SELECT 1 FROM mega_profile_auto_suppressed s WHERE s.gamertag=q.gamertag COLLATE NOCASE) '+
  'AND NOT EXISTS (SELECT 1 FROM mega_player_profile_links m WHERE m.gamertag=q.gamertag COLLATE NOCASE) '+
  'ORDER BY q.next_due_at ASC,q.last_checked_at ASC,q.gamertag COLLATE NOCASE LIMIT 1',at)||null;
}
export function markMegaProfileScan(gamertag,status,{at=Date.now()}={}){
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Invalid InPvP profile scan.');
 const delays={
  linked:24*3600000,already_linked:24*3600000,conflict:24*3600000,
  not_registered:6*3600000,discord_not_found:8*3600000,
  no_discord:12*3600000,unavailable:2*3600000,
  not_found:24*3600000,ambiguous:24*3600000,
  verification:12*3600000,redirected:12*3600000,
  api_unavailable:30*60000
 };
 if(!Object.hasOwn(delays,status))status='unavailable';
 run('UPDATE mega_profile_auto_scans SET last_checked_at=?,next_due_at=?,result=? '+
  'WHERE gamertag=? COLLATE NOCASE',at,at+delays[status],status,name);
 return status;
}
export function autoLinkMegaProfile({gamertag,discordId,discordHandle,profileUrl,at=Date.now()}){
 const name=validGamertag(gamertag),id=String(discordId||'');
 const handle=String(discordHandle||'').trim().toLowerCase().replace(/^@/,'');
 if(!name||!/^[0-9]{15,22}$/.test(id)||
    !/^[a-z0-9._]{2,32}$/.test(handle))
  throw new Error('Automatic profile match was not verified.');
 const expected='https://inpvp.net/mineville/profile/'+encodeURIComponent(name);
 if(profileUrl!==expected)throw new Error('Unexpected InPvP profile URL.');
 return transaction(()=>{
  if(one('SELECT 1 FROM mega_profile_auto_suppressed WHERE gamertag=? COLLATE NOCASE',name))
   return {changed:false,status:'suppressed'};
  const manual=one('SELECT discord_user_id AS id FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',name);
  if(manual)return {changed:false,status:'already_linked'};
  const seasonal=one('SELECT discord_user_id AS id FROM mega_team_discord_matches WHERE gamertag=? COLLATE NOCASE LIMIT 1',name);
  if(seasonal)return {changed:false,status:seasonal.id===id?'already_linked':'conflict'};
  if(!one('SELECT 1 FROM users WHERE id=?',id))return {changed:false,status:'not_registered'};
  const old=one('SELECT discord_user_id AS id FROM mega_profile_auto_links WHERE gamertag=? COLLATE NOCASE',name);
  if(old&&old.id!==id)return {changed:false,status:'conflict'};
  if(old){
   run('UPDATE mega_profile_auto_links SET discord_handle=?,last_verified_at=? WHERE gamertag=? COLLATE NOCASE',
     handle,at,name);
   return {changed:false,status:'linked'};
  }
  run('INSERT INTO mega_profile_auto_links(gamertag,discord_user_id,discord_handle,profile_url,linked_at,last_verified_at) VALUES(?,?,?,?,?,?)',
    name,id,handle,profileUrl,at,at);
  appendAudit(db,{
   actor:'system:inpvp',role:'system',action:'mega.profile.auto.link',
   target:'mega:'+name,
   details:{discordId:id,discordHandle:handle,profileUrl,source:'InPvP linked Discord badge'}
  });
  return {changed:true,status:'linked',discordId:id};
 });
}
