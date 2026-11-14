// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

// Simulate a V1.2.1 database created before ticket messages and owner approvals existed.
const dir=mkdtempSync(join(tmpdir(),'sbs-migrate-'));
const file=join(dir,'legacy.sqlite');
const previous=new DatabaseSync(file);
previous.exec(`
PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT NOT NULL,display_name TEXT NOT NULL,avatar TEXT,updated_at INTEGER NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE applications(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),position TEXT NOT NULL,
 age_bracket TEXT NOT NULL,timezone TEXT NOT NULL,availability TEXT NOT NULL,experience TEXT NOT NULL,
 motivation TEXT NOT NULL,scenario TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
 staff_note TEXT NOT NULL DEFAULT '',reviewer_id TEXT REFERENCES users(id),
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 CHECK(status IN ('pending','reviewing','interview','accepted','denied')));
CREATE TABLE admin_decisions(
 application_id INTEGER NOT NULL REFERENCES applications(id),admin_id TEXT NOT NULL REFERENCES users(id),
 choice TEXT NOT NULL CHECK(choice IN ('accept','deny')),note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,
 PRIMARY KEY(application_id,admin_id));
INSERT INTO users VALUES('100000000000000002','example','Example Member',NULL,1000);
INSERT INTO users VALUES('100000000000000003','staff','Staff Member',NULL,1000);
INSERT INTO applications(user_id,position,age_bracket,timezone,availability,experience,motivation,scenario,status,created_at,updated_at)
 VALUES('100000000000000002','Helper','18+','GMT','Evenings','Experience','Motivation','Scenario','reviewing',1000,1000);
INSERT INTO admin_decisions VALUES(1,'100000000000000003','accept','Existing vote',1010);
INSERT INTO sessions VALUES('session-hash','100000000000000002','csrf-value',9999999999999);
-- Simulate existing support tickets, messages and attachments before the CHECK upgrade.
CREATE TABLE support_tickets(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),
 category TEXT NOT NULL CHECK(category IN ('bug_report','player_report','reward_claim','staff_report','ban_appeal')),
 fields_json TEXT NOT NULL,reported_user_id TEXT NOT NULL DEFAULT '',
 visibility TEXT NOT NULL DEFAULT 'staff' CHECK(visibility IN ('staff','admin','owner')),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved')),
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 resolved_at INTEGER,resolved_by TEXT,last_staff_ping_at INTEGER NOT NULL DEFAULT 0,
 applicant_seen_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE support_ticket_messages(
 id INTEGER PRIMARY KEY AUTOINCREMENT,ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES users(id),author_role TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE support_ticket_attachments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 original_name TEXT NOT NULL,stored_path TEXT NOT NULL UNIQUE,mime_type TEXT NOT NULL,
 message_id INTEGER REFERENCES support_ticket_messages(id),file_size INTEGER NOT NULL,created_at INTEGER NOT NULL
);
INSERT INTO support_tickets(id,user_id,category,fields_json,created_at,updated_at)
 VALUES(5,'100000000000000002','reward_claim','{"prize":"Legacy prize"}',1000,1000);
INSERT INTO support_ticket_messages(ticket_id,author_id,author_role,body,created_at)
 VALUES(5,'100000000000000003','admin','Historical ticket reply',1010);
INSERT INTO support_ticket_attachments(ticket_id,original_name,stored_path,mime_type,file_size,created_at)
 VALUES(5,'proof.png','/uploads/old-proof.png','image/png',100,1010);
`);
previous.close();
process.env.NODE_ENV='test';
process.env.DB_PATH=file;
const {db,one,run}=await import('../src/db.js');
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

test('V1.18.4 support schema upgrade preserves existing ticket data and references',()=>{
 const ticket=one('SELECT * FROM support_tickets WHERE id=5');
 assert.equal(ticket.category,'reward_claim');
 assert.equal(JSON.parse(ticket.fields_json).prize,'Legacy prize');
 assert.equal(one('SELECT body FROM support_ticket_messages WHERE ticket_id=5').body,'Historical ticket reply');
 assert.equal(one('SELECT original_name FROM support_ticket_attachments WHERE ticket_id=5').original_name,'proof.png');
 assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.ok(one("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_support_queue'"));
 const result=run("INSERT INTO support_tickets(user_id,category,fields_json,visibility,created_at,updated_at) VALUES(?,?,?,?,?,?)",
 '100000000000000002','team_application','{"team_application_id":99}','admin',1100,1100);
 assert.ok(Number(result.lastInsertRowid)>5,'support ticket ID sequence is preserved');
 assert.equal(one('SELECT visibility FROM support_tickets WHERE id=?',Number(result.lastInsertRowid)).visibility,'admin');
});

test('additive V1.3.1 migration keeps legacy users, sessions, votes and application answers',()=>{
  assert.equal(one('SELECT username FROM users WHERE id=?','100000000000000002').username,'example');
  assert.equal(one('SELECT csrf FROM sessions WHERE token_hash=?','session-hash').csrf,'csrf-value');
  assert.equal(one('SELECT note FROM admin_decisions WHERE application_id=1').note,'Existing vote');
  const app=one('SELECT * FROM applications WHERE id=1');
  assert.equal(app.position,'Helper');
  assert.equal(app.status,'reviewing');
  assert.equal(app.applicant_seen_at,0);
  assert.equal(app.last_staff_ping_at,0);
  assert.ok(one("SELECT name FROM sqlite_master WHERE type='table' AND name='ticket_messages'"));
  assert.ok(one("SELECT name FROM sqlite_master WHERE type='table' AND name='owner_review_actions'"));
  for(const tbl of ['application_ticket_attachments','support_tickets','support_ticket_messages','support_ticket_attachments','staff_chat_messages']){
    assert.ok(one("SELECT name FROM sqlite_master WHERE type='table' AND name=?",tbl),tbl+' should be added without dropping legacy data');
  }
  run('INSERT INTO ticket_messages(application_id,author_id,author_role,body,created_at) VALUES(1,?,?,?,?)','100000000000000002','member','Test after migration',2000);
  assert.equal(one('SELECT body FROM ticket_messages WHERE application_id=1').body,'Test after migration');
});
