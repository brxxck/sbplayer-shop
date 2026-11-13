// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Owner-entered Minecraft name -> Discord profile associations across MegaSMP.
// A link is not proof of Xbox ownership and NEVER grants roles/permissions.
import {db,all,one,run} from './db.js';
import {validGamertag,activeMegaSeason} from './mega-team.js';
import {megaDiscordMatches} from './mega-team-discord-matches.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS mega_player_profile_links (gamertag TEXT NOT NULL COLLATE NOCASE PRIMARY KEY,discord_user_id TEXT NOT NULL REFERENCES users(id),linked_by TEXT NOT NULL REFERENCES users(id),linked_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_mega_player_profiles_discord ON mega_player_profile_links(discord_user_id)"
].join(';')+';');

export function allMegaPlayerProfileLinks({season=activeMegaSeason()}={}){
 const legacy=megaDiscordMatches(season).map(m=>({
   gamertag:m.gamertag,discordId:m.discordId,username:m.username,
   displayName:m.displayName,linkedAt:m.linkedAt,source:'season'
 }));
 const global=all('SELECT l.gamertag,l.discord_user_id AS discordId,l.linked_at AS linkedAt,'+
   'u.username,u.display_name AS displayName FROM mega_player_profile_links l '+
   'LEFT JOIN users u ON u.id=l.discord_user_id ORDER BY l.gamertag COLLATE NOCASE')
   .map(m=>({...m,source:'owner'}));
 const result=new Map(legacy.map(m=>[m.gamertag.toLowerCase(),m]));
 for(const item of global)result.set(item.gamertag.toLowerCase(),item);
 return [...result.values()].sort((a,b)=>a.gamertag.localeCompare(b.gamertag));
}
export function megaPlayerProfileLink(name,{season=activeMegaSeason()}={}){
 const gamertag=validGamertag(name);if(!gamertag)return null;
 return allMegaPlayerProfileLinks({season}).find(m=>m.gamertag.toLowerCase()===gamertag.toLowerCase())||null;
}
export function linkMegaPlayerProfile({gamertag,discordId,actorId}){
 const name=validGamertag(gamertag);
 const id=String(discordId||'');
 if(!name)throw new Error('Invalid Minecraft Gamertag.');
 if(!/^\d{15,22}$/.test(id))throw new Error('Choose a verified Discord account.');
 if(!one('SELECT 1 FROM users WHERE id=?',id)||
    !one('SELECT 1 FROM users WHERE id=?',actorId))
   throw new Error('Discord account or owner was not found in the website directory.');
 const previous=one('SELECT discord_user_id FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',name);
 run('INSERT INTO mega_player_profile_links(gamertag,discord_user_id,linked_by,linked_at) VALUES(?,?,?,?) '+
  'ON CONFLICT(gamertag) DO UPDATE SET discord_user_id=excluded.discord_user_id,linked_by=excluded.linked_by,linked_at=excluded.linked_at',
  name,id,actorId,Date.now());
 return {gamertag:name,discordId:id,previousId:previous?.discord_user_id||null,
   changed:previous?.discord_user_id!==id};
}
export function unlinkMegaPlayerProfile(name){
 const gamertag=validGamertag(name);
 if(!gamertag)throw new Error('Invalid Minecraft Gamertag.');
 const previous=one('SELECT discord_user_id FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',gamertag);
 if(!previous)return {changed:false,previousId:null};
 run('DELETE FROM mega_player_profile_links WHERE gamertag=? COLLATE NOCASE',gamertag);
 return {changed:true,previousId:previous.discord_user_id,gamertag};
}
