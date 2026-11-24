// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Consent-based one-to-one Xbox gamertag association with a Discord profile.
// The keyed Xbox identity fingerprint is never a reusable login credential.
import {db,one,all,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {validGamertag} from './mega-team.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS xbox_gamertag_links (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,identity_key TEXT NOT NULL UNIQUE,gamertag TEXT NOT NULL COLLATE NOCASE UNIQUE,verified_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_xbox_gamertag_name ON xbox_gamertag_links(gamertag)",
 "CREATE TABLE IF NOT EXISTS manual_ign_connections (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,gamertag TEXT NOT NULL COLLATE NOCASE UNIQUE,linked_by TEXT NOT NULL REFERENCES users(id),linked_at INTEGER NOT NULL)"
].join(';')+';');

export function xboxLinkForUser(userId){
 if(!/^[0-9]{15,22}$/.test(String(userId||'')))return null;
 return one('SELECT user_id AS discordId,gamertag,verified_at AS verifiedAt,updated_at AS updatedAt '+
  'FROM xbox_gamertag_links WHERE user_id=?',String(userId))||null;
}
export function allVerifiedXboxGamertags(){
 return all('SELECT x.user_id AS discordId,x.gamertag,x.verified_at AS verifiedAt,'+
  'u.username,u.display_name AS displayName '+
  'FROM xbox_gamertag_links x JOIN users u ON u.id=x.user_id '+
  'ORDER BY x.gamertag COLLATE NOCASE')
  .map(x=>({...x,source:'xbox',linkedAt:x.verifiedAt}));
}
export function gameConnectionForUser(userId){
 return xboxLinkForUser(userId)||one("SELECT user_id AS discordId,gamertag,linked_at AS linkedAt,'manual_ign' AS source "+
  'FROM manual_ign_connections WHERE user_id=?',String(userId||''))||null;
}
export function manualIgnConnections(){
 return all("SELECT m.user_id AS discordId,m.gamertag,m.linked_at AS linkedAt,'manual_ign' AS source,"+
  'u.username,u.display_name AS displayName FROM manual_ign_connections m JOIN users u ON u.id=m.user_id '+
  'ORDER BY m.gamertag COLLATE NOCASE');
}
export function saveManualIgn({userId,gamertag,actorId,ip=''}){
 const name=validGamertag(gamertag);
 if(!name)throw Object.assign(new Error('Enter a valid Minecraft IGN.'),{status:400});
 return transaction(()=>{
  if(one('SELECT 1 FROM xbox_gamertag_links WHERE user_id=?',userId))
   throw Object.assign(new Error('That member already has a Microsoft-verified Xbox connection.'),{status:409});
  if(one('SELECT 1 FROM xbox_gamertag_links WHERE gamertag=?',name))
   throw Object.assign(new Error('That IGN is already connected through Xbox verification.'),{status:409});
  const old=one('SELECT gamertag FROM manual_ign_connections WHERE user_id=?',userId);
  if(old?.gamertag===name)return;
  if(one('SELECT 1 FROM manual_ign_connections WHERE gamertag=? AND user_id<>?',name,userId))
   throw Object.assign(new Error('That IGN is already connected to another Discord member.'),{status:409});
  run('INSERT INTO manual_ign_connections(user_id,gamertag,linked_by,linked_at) VALUES(?,?,?,?) '+
   'ON CONFLICT(user_id) DO UPDATE SET gamertag=excluded.gamertag,linked_by=excluded.linked_by,linked_at=excluded.linked_at',
   userId,name,actorId,Date.now());
  appendAudit(db,{actor:actorId,role:'owner',action:'profile.ign.link',target:'profile:'+userId,
   details:{gamertag:name,previousGamertag:old?.gamertag||null},ip});
 });
}
export function removeManualIgn({userId,gamertag,actorId,ip=''}){
 return transaction(()=>{
  const removed=one('DELETE FROM manual_ign_connections WHERE user_id=? AND gamertag=? RETURNING gamertag',userId,gamertag);
  if(!removed)return false;
  appendAudit(db,{actor:actorId,role:'owner',action:'profile.ign.unlink',target:'profile:'+userId,
   details:{gamertag:removed.gamertag},ip});
  return true;
 });
}
export function saveXboxLink({
 userId,identityKey,gamertag,verifiedAt=Date.now(),actorRole='member',ip=''
}={}){
 const name=validGamertag(gamertag),id=String(userId||''),fingerprint=String(identityKey||'');
 if(!/^[0-9]{15,22}$/.test(id)||!/^[0-9a-f]{64}$/.test(fingerprint)||!name)
  throw new Error('A verified Xbox account and gamertag are required.');
 if(!Number.isSafeInteger(verifiedAt)||verifiedAt<0)throw new Error('Invalid Xbox verification time.');
 return transaction(()=>{
  if(!one('SELECT 1 FROM users WHERE id=?',id))
   throw new Error('A verified Discord website account is required.');
  const current=one('SELECT identity_key AS key,gamertag FROM xbox_gamertag_links WHERE user_id=?',id);
  if(current&&current.key!==fingerprint)
   throw new Error('Unlink your existing Xbox account before connecting another.');
  const used=one('SELECT 1 FROM xbox_gamertag_links WHERE user_id<>? AND (identity_key=? OR gamertag=?)',id,fingerprint,name);
  if(used)
   throw new Error('This Xbox gamertag or account is already linked to another website member.');
  const time=Date.now();
  run('INSERT INTO xbox_gamertag_links(user_id,identity_key,gamertag,verified_at,updated_at) VALUES(?,?,?,?,?) '+
   'ON CONFLICT(user_id) DO UPDATE SET gamertag=excluded.gamertag,verified_at=excluded.verified_at,updated_at=excluded.updated_at',
   id,fingerprint,name,verifiedAt,time);
  const superseded=all('DELETE FROM manual_ign_connections WHERE user_id=? OR gamertag=? RETURNING user_id,gamertag',id,name);
  for(const entry of superseded){
   appendAudit(db,{actor:id,role:actorRole,action:'profile.ign.superseded',target:'profile:'+entry.user_id,
    details:{gamertag:entry.gamertag,replacementDiscordId:id},ip});
  }
  const changed=!current||current.gamertag!==name;
  if(changed)appendAudit(db,{
   actor:id,role:actorRole,action:'profile.xbox.link',
   target:'profile:'+id,details:{gamertag:name,source:'Xbox signed-in identity',previousGamertag:current?.gamertag||null},ip
  });
  return {gamertag:name,changed,discordId:id};
 });
}
export function unlinkXboxLink({userId,actorRole='member',ip=''}={}){
 const id=String(userId||'');
 if(!/^[0-9]{15,22}$/.test(id))throw new Error('Invalid Discord account.');
 return transaction(()=>{
  const old=one('SELECT gamertag FROM xbox_gamertag_links WHERE user_id=?',id);
  if(!old)return {changed:false};
  run('DELETE FROM xbox_gamertag_links WHERE user_id=?',id);
  appendAudit(db,{actor:id,role:actorRole,action:'profile.xbox.unlink',
   target:'profile:'+id,details:{gamertag:old.gamertag},ip});
  return {changed:true,gamertag:old.gamertag};
 });
}
