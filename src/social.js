// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// V1.5 social graph, private activity inbox and saved posts. Additive SQLite structures only.
import {db,one,all,run} from './db.js';

db.exec([
  "CREATE TABLE IF NOT EXISTS post_bookmarks (post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY(post_id,user_id))",
  "CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON post_bookmarks(user_id,created_at DESC)",
  "CREATE TABLE IF NOT EXISTS social_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT,recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL CHECK(kind IN ('follow','like','comment','repost','profile_comment')),target_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,read_at INTEGER NOT NULL DEFAULT 0,UNIQUE(recipient_id,actor_id,kind,target_id))",
  "CREATE INDEX IF NOT EXISTS idx_social_notifications_user ON social_notifications(recipient_id,created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_social_notifications_unread ON social_notifications(recipient_id,read_at)"
].join(';')+';');

const validKinds=new Set(['follow','like','comment','repost','profile_comment']);
export function notifySocial(recipientId,actorId,kind,targetId=''){
  if(!recipientId||!actorId||recipientId===actorId||!validKinds.has(kind))return false;
  // Repeated follow/like toggles cannot spam notifications more than once per hour.
  const stamp=Date.now(),target=String(targetId).slice(0,30);
  run('INSERT INTO social_notifications(recipient_id,actor_id,kind,target_id,created_at,read_at) '+
    'VALUES(?,?,?,?,?,0) ON CONFLICT(recipient_id,actor_id,kind,target_id) DO UPDATE SET '+
    'created_at=excluded.created_at,read_at=0 WHERE social_notifications.created_at < excluded.created_at-3600000',
    recipientId,actorId,kind,target,stamp);
  return true;
}
export const notificationCount=id=>one('SELECT COUNT(*) AS n FROM social_notifications WHERE recipient_id=? AND read_at=0',id)?.n||0;
export function notificationsFor(id,limit=60){
  return all('SELECT n.*,u.username,u.display_name,u.avatar,p.nickname,p.avatar_path '+
    'FROM social_notifications n JOIN users u ON u.id=n.actor_id '+
    'LEFT JOIN profiles p ON p.user_id=n.actor_id '+
    'WHERE n.recipient_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT ?',id,limit);
}
export function markNotificationsRead(userId,id=null){
  if(id===null)return run('UPDATE social_notifications SET read_at=? WHERE recipient_id=? AND read_at=0',Date.now(),userId).changes;
  return run('UPDATE social_notifications SET read_at=? WHERE id=? AND recipient_id=? AND read_at=0',Date.now(),id,userId).changes;
}
export function connectionsFor(id,which,viewerId){
  if(!['followers','following'].includes(which))throw new Error('Unknown social connection type');
  const targetColumn=which==='followers'?'f.followed_id':'f.follower_id';
  const shownColumn=which==='followers'?'f.follower_id':'f.followed_id';
  return all('SELECT u.id,u.username,u.display_name,u.avatar,p.nickname,p.avatar_path,p.bio,p.public, '+
    'EXISTS(SELECT 1 FROM follows mine WHERE mine.follower_id=? AND mine.followed_id=u.id) AS following '+
    'FROM follows f JOIN users u ON u.id='+shownColumn+' LEFT JOIN profiles p ON p.user_id=u.id '+
    'WHERE '+targetColumn+'=? AND (COALESCE(p.public,1)=1 OR u.id=?) '+
    'ORDER BY f.created_at DESC LIMIT 120',viewerId,id,viewerId);
}
export function repliesFor(id,limit=30){
  return all('SELECT c.id,c.body,c.created_at,c.target_id,p.user_id AS post_author_id,p.body AS original_body, '+
    'u.username AS original_author FROM comments c JOIN posts p ON p.id=CAST(c.target_id AS INTEGER) AND p.deleted_at IS NULL '+
    'JOIN users u ON u.id=p.user_id WHERE c.user_id=? AND c.kind=? AND c.deleted_at IS NULL '+
    'ORDER BY c.created_at DESC LIMIT ?',id,'post',limit);
}
export const allowedProfileTabs=new Set(['posts','replies','media','likes']);
