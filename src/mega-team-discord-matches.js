// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Owner-confirmed Minecraft-to-Discord links. Not proof of Minecraft
// ownership; account links NEVER grant website or Discord permissions.
import {db,all,one,run,transaction} from './db.js';
import {activeMegaSeason,validGamertag} from './mega-team.js';
import './mega-team-bank-event-store.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_team_discord_matches (season TEXT NOT NULL REFERENCES mega_team_seasons(season),gamertag TEXT NOT NULL COLLATE NOCASE,discord_user_id TEXT NOT NULL REFERENCES users(id),linked_by TEXT NOT NULL REFERENCES users(id),linked_at INTEGER NOT NULL,PRIMARY KEY(season,gamertag))",
 "CREATE INDEX IF NOT EXISTS idx_mega_discord_matches_account ON mega_team_discord_matches(season,discord_user_id)"
].join(';')+';');

const requireSeason=season=>{
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))throw new Error('Unknown team season.');
};
const requireGamertag=(gamertag,season)=>{
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Invalid Minecraft Gamertag.');
 if(!one('SELECT 1 FROM mega_team_members WHERE season=? AND gamertag=? COLLATE NOCASE '+
  'UNION ALL SELECT 1 FROM mega_team_captured_bank_events WHERE season=? AND gamertag=? COLLATE NOCASE LIMIT 1',
  season,name,season,name))
  throw new Error('Minecraft player is absent from this season roster and captured bank history.');
 return name;
};

export function megaDiscordMatchCandidates(season=activeMegaSeason()){
 requireSeason(season);
 // Bank participants may not hold a current team role and should still be matchable.
 return all('SELECT gamertag FROM mega_team_members WHERE season=? '+
   'UNION SELECT gamertag FROM mega_team_captured_bank_events WHERE season=? '+
   'UNION SELECT gamertag FROM mega_team_discord_matches WHERE season=? '+
   'ORDER BY gamertag COLLATE NOCASE LIMIT 5000',season,season,season).map(row=>row.gamertag);
}
export function megaDiscordMatches(season=activeMegaSeason()){
 requireSeason(season);
 return all('SELECT m.season,m.gamertag,m.discord_user_id AS discordId,m.linked_by AS linkedBy,'+
  'm.linked_at AS linkedAt,u.username,u.display_name AS displayName,u.avatar '+
  'FROM mega_team_discord_matches m LEFT JOIN users u ON u.id=m.discord_user_id '+
  'WHERE m.season=? ORDER BY m.gamertag COLLATE NOCASE',season);
}
export function linkedDiscordFor(season,gamertag){
 const name=validGamertag(gamertag);if(!name)return null;
 return one('SELECT m.discord_user_id AS discordId,u.username,u.display_name AS displayName,u.avatar '+
  'FROM mega_team_discord_matches m LEFT JOIN users u ON u.id=m.discord_user_id '+
  'WHERE m.season=? AND m.gamertag=? COLLATE NOCASE',season,name)||null;
}
export function linkMegaDiscordAccount({season=activeMegaSeason(),gamertag,discordId,actorId}){
 requireSeason(season);
 const name=requireGamertag(gamertag,season);
 const id=String(discordId||'');
 if(!/^\d{15,22}$/.test(id))throw new Error('Choose a verified Discord server member.');
 if(!one('SELECT 1 FROM users WHERE id=?',id)||!one('SELECT 1 FROM users WHERE id=?',actorId))
  throw new Error('Discord account or owner is not present in the verified user directory.');
 return transaction(()=>{
  const previous=one('SELECT discord_user_id FROM mega_team_discord_matches WHERE season=? AND gamertag=? COLLATE NOCASE',season,name);
  run('INSERT INTO mega_team_discord_matches(season,gamertag,discord_user_id,linked_by,linked_at) '+
   'VALUES(?,?,?,?,?) ON CONFLICT(season,gamertag) DO UPDATE SET '+
   'discord_user_id=excluded.discord_user_id,linked_by=excluded.linked_by,linked_at=excluded.linked_at',
    season,name,id,actorId,Date.now());
  return {gamertag:name,discordId:id,previousId:previous?.discord_user_id||null,changed:previous?.discord_user_id!==id};
 });
}
export function unlinkMegaDiscordAccount({season=activeMegaSeason(),gamertag}){
 requireSeason(season);
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Invalid Minecraft Gamertag.');
 const previous=one('SELECT discord_user_id FROM mega_team_discord_matches WHERE season=? AND gamertag=? COLLATE NOCASE',season,name);
 if(!previous)return {gamertag:name,previousId:null,changed:false};
 run('DELETE FROM mega_team_discord_matches WHERE season=? AND gamertag=? COLLATE NOCASE',season,name);
 return {gamertag:name,previousId:previous.discord_user_id,changed:true};
}
