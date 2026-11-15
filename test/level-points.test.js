// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-level-points-'));
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'data.sqlite'),DISCORD_GUILD_ID:'100000000000000001'});
const {db,run,getSetting}=await import('../src/db.js');
const {rotateLevelKey,revokeLevelKey,authenticateLevelSync,syncLevelSnapshot,levelWallet,claimLevelPoints,DEFAULT_LEVEL_BOT,readLevelSyncJson}=await import('../src/level-points.js');
const {verifyAudit}=await import('../src/audit.js');
const owner='100000000000000002',user='100000000000000003',other='100000000000000004';
for(const id of [owner,user,other])run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,'tester','Tester',Date.now());
const snapshot=(level,extra={})=>({bot_id:DEFAULT_LEVEL_BOT,guild_id:process.env.DISCORD_GUILD_ID,user_id:user,level,xp:'49',...extra});
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});
test('key is stored hashed, rejects missing/wrong keys; rotate and revoke invalidate old keys',()=>{
 assert.throws(()=>authenticateLevelSync(),e=>e.status===401);
 const key=rotateLevelKey(owner);assert.equal(key.length,64);assert.notEqual(getSetting('level_points_key_hash'),key);
 authenticateLevelSync('Bearer '+key);
 assert.throws(()=>authenticateLevelSync('Bearer '+'a'.repeat(64)),e=>e.status===401);
 const next=rotateLevelKey(owner);assert.throws(()=>authenticateLevelSync('Bearer '+key));authenticateLevelSync('Bearer '+next);
 revokeLevelKey(owner);assert.throws(()=>authenticateLevelSync('Bearer '+next));
});
test('existing levels count once; repeat payloads, resets, and re-earned levels cannot mint points',()=>{
 syncLevelSnapshot(snapshot('10'));assert.equal(levelWallet(user).claimable,1000);
 assert.equal(claimLevelPoints(user),1000);assert.equal(levelWallet(user).balance,1000);
 assert.throws(()=>claimLevelPoints(user),e=>e.status===409);
 syncLevelSnapshot(snapshot('10'));assert.equal(levelWallet(user).claimable,0);
 syncLevelSnapshot(snapshot('2'));assert.equal(levelWallet(user).claimable,0);
 syncLevelSnapshot(snapshot('11'));assert.equal(claimLevelPoints(user),100);
 assert.equal(levelWallet(user).balance,1100);assert.equal(levelWallet(user).history.length,2);
 assert.equal(levelWallet(other).balance,0);assert.throws(()=>claimLevelPoints(other));
 assert.ok(verifyAudit(db).ok);
});
test('sync can precede first website sign-in; stale lower values preserve earned levels',()=>{
 const id='100000000000000005';syncLevelSnapshot(snapshot('20',{user_id:id}));
 syncLevelSnapshot(snapshot('4',{user_id:id}));assert.equal(levelWallet(id).claimable,2000);
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,'new','New',Date.now());
 assert.equal(claimLevelPoints(id),2000);
});
test('reject wrong guild/bot, malformed identities and invalid/bounded numeric values',()=>{
 for(const extra of [{guild_id:other},{bot_id:other},{user_id:'nope'}])assert.throws(()=>syncLevelSnapshot(snapshot('3',extra)),e=>e.status===400);
 for(const level of [-1,1.5,'','1e3',null,true,1000001,'{level}'])assert.throws(()=>syncLevelSnapshot(snapshot(level)),e=>e.status===400);
 assert.throws(()=>syncLevelSnapshot(snapshot(1,{xp:Number.MAX_SAFE_INTEGER+1})));
});
test('JSON parser rejects oversized and invalid requests',async()=>{
 const {Readable}=await import('node:stream');
 const request=(text,type='application/json')=>Object.assign(Readable.from([Buffer.from(text)]),{headers:{'content-type':type}});
 assert.deepEqual(await readLevelSyncJson(request('{"level":2}')),{level:2});
 await assert.rejects(readLevelSyncJson(request('bad')),e=>e.status===400);
 await assert.rejects(readLevelSyncJson(request('x'.repeat(4097))),e=>e.status===413);
 await assert.rejects(readLevelSyncJson(request('{}','text/plain')),e=>e.status===415);
});
test('HTTP routes require owner access and CSRF; only authenticated bot payloads can sync levels',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{getGuild:async()=>({id:process.env.DISCORD_GUILD_ID,owner_id:owner}),getGuildMember:async id=>({user:{id,username:'tester'},roles:[],pending:false}),getRoles:async()=>[]}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=async id=>{const r=await fetch(base+'/__test/login/'+id,{redirect:'manual'});return r.headers.get('set-cookie').split(';')[0];};
  const memberCookie=await login(user),ownerCookie=await login(owner);
  assert.equal((await fetch(base+'/owner/level-points',{headers:{cookie:memberCookie}})).status,403);
  const page=await fetch(base+'/owner/level-points',{headers:{cookie:ownerCookie}});assert.equal(page.status,200);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(await page.text())[1];
  assert.equal((await fetch(base+'/owner/level-points/key',{method:'POST',headers:{cookie:ownerCookie,'content-type':'application/x-www-form-urlencoded'},body:'_csrf=wrong'})).status,403);
  const created=await fetch(base+'/owner/level-points/key',{method:'POST',headers:{cookie:ownerCookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf})});
  assert.equal(created.status,200);const key=/value="([a-f0-9]{64})"/.exec(await created.text())[1];
  const unsyncedCookie=await login(other);
  const beforeSync=await fetch(base+'/points',{headers:{cookie:unsyncedCookie}});
  assert.equal(beforeSync.status,200);
  const beforeSyncHtml=await beforeSync.text();
  assert.match(beforeSyncHtml,/How to sync your Discord level/);
  assert.match(beforeSyncHtml,/Open Discord/);
  assert.match(beforeSyncHtml,/Sync your level/);
  assert.match(beforeSyncHtml,/Refresh &amp; claim/);
  assert.ok((beforeSyncHtml.match(/\/website-points/g)||[]).length>=2);
  assert.match(beforeSyncHtml,/No synced level received yet/);
  assert.ok(beforeSyncHtml.indexOf('How to sync your Discord level')<beforeSyncHtml.indexOf('Claim level rewards'));
  assert.match(beforeSyncHtml,/Syncing updates your Discord level on the website/);
  const payload=JSON.stringify(snapshot('30'));
  assert.equal((await fetch(base+'/api/integrations/botghost/levels',{method:'POST',headers:{'content-type':'application/json'},body:payload})).status,401);
  const sync=await fetch(base+'/api/integrations/botghost/levels',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:payload});
  assert.equal(sync.status,200);assert.deepEqual(await sync.json(),{ok:true,level:30});
  const memberPage=await fetch(base+'/points',{headers:{cookie:memberCookie}});assert.equal(memberPage.status,200);
  const memberHtml=await memberPage.text();
  assert.match(memberHtml,/How to sync your Discord level/);
  assert.match(memberHtml,/\/website-points/);
  assert.match(memberHtml,/Refresh level/);
  assert.match(memberHtml,/Claim 1,900 points/);
  assert.doesNotMatch(memberHtml,/No synced level received yet/);
  const memberCsrf=/name="_csrf" value="([^"]+)"/.exec(memberHtml)[1];
  const claim=()=>fetch(base+'/points/claim',{method:'POST',redirect:'manual',headers:{cookie:memberCookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:memberCsrf,user_id:other,level:'999999'})});
  assert.equal((await claim()).status,303);assert.equal(levelWallet(user).balance,3000);
  assert.equal(levelWallet(other).balance,0);assert.equal((await claim()).status,409);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
