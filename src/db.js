// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {config} from './config.js';
if (config.dbPath!==':memory:') mkdirSync(dirname(config.dbPath),{recursive:true});
export const db=new DatabaseSync(config.dbPath,{timeout:7000});
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=7000;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, display_name TEXT NOT NULL, avatar TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS applications (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), position TEXT NOT NULL,
 age_bracket TEXT NOT NULL, timezone TEXT NOT NULL, availability TEXT NOT NULL, experience TEXT NOT NULL,
 motivation TEXT NOT NULL, scenario TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 staff_note TEXT NOT NULL DEFAULT '', reviewer_id TEXT REFERENCES users(id),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CHECK(status IN ('pending','reviewing','interview','accepted','denied'))
);
CREATE INDEX IF NOT EXISTS idx_app_user ON applications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status,created_at DESC);
CREATE TABLE IF NOT EXISTS audit_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, application_id INTEGER NOT NULL REFERENCES applications(id),
 actor_id TEXT NOT NULL REFERENCES users(id), previous_status TEXT NOT NULL,
 next_status TEXT NOT NULL,note TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reviewer_votes (
 application_id INTEGER NOT NULL REFERENCES applications(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
 choice TEXT NOT NULL CHECK(choice IN ('accept','deny')), note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,reviewer_id)
);
CREATE TABLE IF NOT EXISTS admin_decisions (
 application_id INTEGER NOT NULL REFERENCES applications(id), admin_id TEXT NOT NULL REFERENCES users(id),
 choice TEXT NOT NULL CHECK(choice IN ('accept','deny')), note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,admin_id)
);
CREATE TABLE IF NOT EXISTS profiles (
 user_id TEXT PRIMARY KEY REFERENCES users(id), nickname TEXT NOT NULL DEFAULT '',bio TEXT NOT NULL DEFAULT '',
 pronouns TEXT NOT NULL DEFAULT '',status_text TEXT NOT NULL DEFAULT '', accent TEXT NOT NULL DEFAULT 'blue',
 theme TEXT NOT NULL DEFAULT 'midnight',font TEXT NOT NULL DEFAULT 'system',layout TEXT NOT NULL DEFAULT 'classic',
 animations INTEGER NOT NULL DEFAULT 1, public INTEGER NOT NULL DEFAULT 1, allow_comments INTEGER NOT NULL DEFAULT 1,
 show_follows INTEGER NOT NULL DEFAULT 1,social_1 TEXT NOT NULL DEFAULT '',social_2 TEXT NOT NULL DEFAULT '',social_3 TEXT NOT NULL DEFAULT '',
 avatar_path TEXT NOT NULL DEFAULT '',banner_path TEXT NOT NULL DEFAULT '', background_path TEXT NOT NULL DEFAULT '',
 pinned_post_id INTEGER,updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_sections (
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL,content TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,visible INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS follows (follower_id TEXT NOT NULL REFERENCES users(id),followed_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,PRIMARY KEY(follower_id,followed_id),CHECK(follower_id!=followed_id));
CREATE TABLE IF NOT EXISTS posts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL DEFAULT '',
 image_path TEXT NOT NULL DEFAULT '',repost_of INTEGER REFERENCES posts(id),created_at INTEGER NOT NULL,deleted_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_repost ON posts(user_id,repost_of) WHERE repost_of IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_recent ON posts(created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes(post_id INTEGER NOT NULL REFERENCES posts(id),user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,PRIMARY KEY(post_id,user_id));
CREATE TABLE IF NOT EXISTS suggestions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'under_review' CHECK(status IN ('under_review','planned','accepted','declined','implemented')),
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_suggestions_recent ON suggestions(created_at DESC);
CREATE TABLE IF NOT EXISTS suggestion_votes (
 suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),user_id TEXT NOT NULL REFERENCES users(id),
 choice TEXT NOT NULL CHECK(choice IN ('yes','no')),created_at INTEGER NOT NULL,
 PRIMARY KEY(suggestion_id,user_id)
);
CREATE TABLE IF NOT EXISTS comments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL CHECK(kind IN ('post','suggestion','profile')),
 target_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at INTEGER NOT NULL,deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(kind,target_id,created_at DESC);
CREATE TABLE IF NOT EXISTS reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,reporter_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('post','suggestion','comment','profile')),
 target_id TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL,reviewed_by TEXT REFERENCES users(id),reviewed_at INTEGER
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,changed_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS owner_allowlist(user_id TEXT PRIMARY KEY, added_by TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS owner_audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL, actor_id TEXT NOT NULL,actor_role TEXT NOT NULL,
 action TEXT NOT NULL,target TEXT NOT NULL,outcome TEXT NOT NULL,details TEXT NOT NULL,ip TEXT NOT NULL,
 previous_hash TEXT NOT NULL,entry_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_owner_audit_actor ON owner_audit_log(actor_id,id DESC);
CREATE INDEX IF NOT EXISTS idx_owner_audit_action ON owner_audit_log(action,id DESC);
`);
// Safe additive migration for databases copied from the original V1.0/V1.1 project.
const appColumns=new Set(db.prepare('PRAGMA table_info(applications)').all().map(x=>x.name));
for(const [name,def] of Object.entries({
  role_sync_status:"TEXT NOT NULL DEFAULT 'none'",
  role_sync_error:"TEXT NOT NULL DEFAULT ''",
  role_sync_role:"TEXT NOT NULL DEFAULT ''",
  finalized_at:'INTEGER',finalized_by:'TEXT'
})) if(!appColumns.has(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${def}`);
const setting=db.prepare('INSERT OR IGNORE INTO settings (key,value,changed_at) VALUES (?,?,?)');
setting.run('applications_open',String(config.applicationsOpen),Date.now());
for(const [position,roleId] of Object.entries(config.applicationRoleIds))setting.run('map:'+position,roleId,Date.now());

// Import earlier V1.0/V1.1 decisions as clearly labeled historical records.
// They did not have an owner-only ledger originally, so these are marked 'legacy_import' rather than claiming complete historical coverage.
if(oneLegacyCount()===0){
  const historic=db.prepare('SELECT * FROM audit_events ORDER BY id').all();
  if(historic.length){
    let prev='GENESIS';
    const {createHash}=await import('node:crypto');
    const hash=data=>createHash('sha256').update(data).digest('hex');
    for(const h of historic){
      const at=h.created_at,actor=h.actor_id,role='legacy',action='legacy.application.status',target='application:'+h.application_id,outcome='imported',details={previous:h.previous_status,next:h.next_status,note:h.note,legacyEventId:h.id},ip='';
      const data=JSON.stringify({at,actor,role,action,target,outcome,details,ip,previous:prev});
      const digest=hash(data);
      db.prepare('INSERT INTO owner_audit_log(at,actor_id,actor_role,action,target,outcome,details,ip,previous_hash,entry_hash) VALUES(?,?,?,?,?,?,?,?,?,?)').run(at,actor,role,action,target,outcome,JSON.stringify(details),ip,prev,digest);
      prev=digest;
    }
  }
}
function oneLegacyCount(){return db.prepare('SELECT COUNT(*) count FROM owner_audit_log').get().count;}

export function transaction(fn) {db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export const one=(sql,...args)=>db.prepare(sql).get(...args);
export const all=(sql,...args)=>db.prepare(sql).all(...args);
export const run=(sql,...args)=>db.prepare(sql).run(...args);
export const getSetting=(key,fallback='')=>one('SELECT value FROM settings WHERE key=?',key)?.value??fallback;
export function setSetting(key,value){run('INSERT INTO settings(key,value,changed_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,changed_at=excluded.changed_at',key,String(value),Date.now());}
export function upsertUser(user) {
  const id=user.id||user.user?.id;if(!id)return;
  const info=user.user||user;
  const username=String(info.username||'unknown');
  const displayName=String(user.nick||info.global_name||info.username||'Discord Member');
  run(`INSERT INTO users(id,username,display_name,avatar,updated_at) VALUES(?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET username=excluded.username,display_name=excluded.display_name,avatar=excluded.avatar,updated_at=excluded.updated_at`,
  id,username,displayName,info.avatar||null,Date.now());
}
export function ensureProfile(id) {run('INSERT OR IGNORE INTO profiles(user_id,updated_at) VALUES(?,?)',id,Date.now());}
