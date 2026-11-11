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
`);
previous.close();
process.env.NODE_ENV='test';
process.env.DB_PATH=file;
const {db,one,run}=await import('../src/db.js');
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

test('additive V1.3.0 migration keeps legacy users, sessions, votes and application answers',()=>{
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
  run('INSERT INTO ticket_messages(application_id,author_id,author_role,body,created_at) VALUES(1,?,?,?,?)','100000000000000002','member','Test after migration',2000);
  assert.equal(one('SELECT body FROM ticket_messages WHERE application_id=1').body,'Test after migration');
});
