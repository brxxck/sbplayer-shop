// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Consent-based one-to-one Xbox gamertag association with a Discord profile.
// The keyed Xbox identity fingerprint is never a reusable login credential.
import {db,one,all,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {validGamertag} from './mega-team.js';

db.exec([
 "CREATE TABLE IF NOT EXISTS xbox_gamertag_links (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,identity_key TEXT NOT NULL UNIQUE,gamertag TEXT NOT NULL COLLATE NOCASE UNIQUE,verified_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS idx_xbox_gamertag_name ON xbox_gamertag_links(gamertag)"
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
  const used=one('SELECT user_id AS owner FROM xbox_gamertag_links WHERE identity_key=? OR gamertag=? COLLATE NOCASE LIMIT 1',fingerprint,name);
  if(used&&used.owner!==id)
   throw new Error('This Xbox gamertag or account is already linked to another website member.');
  const time=Date.now();
  run('INSERT INTO xbox_gamertag_links(user_id,identity_key,gamertag,verified_at,updated_at) VALUES(?,?,?,?,?) '+
   'ON CONFLICT(user_id) DO UPDATE SET gamertag=excluded.gamertag,verified_at=excluded.verified_at,updated_at=excluded.updated_at',
   id,fingerprint,name,verifiedAt,time);
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
