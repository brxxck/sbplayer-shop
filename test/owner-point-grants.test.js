// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const temp=mkdtempSync(join(tmpdir(),'sb-owner-point-all-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000003',bob='100000000000000004';
const newcomer='100000000000000005',extra='100000000000000006';
const botId='100000000000000007',pendingId='100000000000000008';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'db.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,all,run}=await import('../src/db.js');
await import('../src/arcade.js');
const {levelWallet}=await import('../src/level-points.js');
const grants=await import('../src/owner-point-grants.js');
const {ping,onlineWebsiteUserIds}=await import('../src/community-live.js');
const {verifyAudit}=await import('../src/audit.js');
for(const id of [owner,alice,bob,extra]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,'member-'+id.slice(-2),'Member '+id.slice(-2),Date.now());
}
run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,?)',guild,alice,300,7);
const member=id=>({user:{id,username:'discord-'+id.slice(-3),global_name:'Discord '+id.slice(-3)},roles:[],pending:false});
const members=new Map([owner,alice,bob,newcomer,extra].map(id=>[id,member(id)]));
const discord={
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>members.get(id)||null,
 getRoles:async()=>[],
 listMembers:async(after='')=>after?[]:[member(alice),{user:{id:botId,bot:true,username:'test-bot'}},
  member(bob),{user:{id:pendingId,username:'unverified'},pending:true},member(newcomer)]
};
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

test('owner preview does not issue points, confirmation adds to the existing wallet exactly once',async()=>{
 const before=levelWallet(alice).balance;
 const preview=await grants.preparePointGrant({
  actorId:owner,scope:'single',amount:'275',recipientId:alice,reason:'Community event bonus',discord
 });
 assert.equal(preview.recipient_count,1);
 assert.equal(preview.total,275);
 assert.equal(preview.status,'pending');
 assert.equal(levelWallet(alice).balance,before,'preview must not mutate balances');
 assert.throws(()=>grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'no'}),e=>e.status===400);
 assert.throws(()=>grants.pointGrantPreview(bob,preview.id),e=>e.status===404,'private owner preview');
 assert.equal(levelWallet(alice).balance,before);
 const completed=grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'GRANT',ip:'127.0.0.1'});
 assert.equal(completed.alreadyApplied,false);
 assert.equal(completed.count,1);
 assert.equal(levelWallet(alice).balance,before+275);
 assert.equal(levelWallet(alice).claimedLevel,7,'grant must not advance Discord claim progress');
 const receipt=one('SELECT delta,reason,balance_after,event_key FROM arcade_transfers WHERE event_key=?',
  'owner:grant:'+preview.id+':'+alice);
 assert.equal(receipt.delta,275);
 assert.equal(receipt.reason,'owner.grant');
 assert.equal(receipt.balance_after,before+275);
 const again=grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'GRANT'});
 assert.equal(again.alreadyApplied,true);
 assert.equal(levelWallet(alice).balance,before+275,'retry must not grant twice');
 assert.equal(one('SELECT COUNT(*) n FROM arcade_transfers WHERE event_key=?',receipt.event_key).n,1);
 assert.equal(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='level_points.owner.grant'").n,1);
 assert.ok(verifyAudit(db).ok);
});

test('everyone uses the verified Discord member list, excluding bots and pending members',async()=>{
 const preview=await grants.preparePointGrant({
  actorId:owner,scope:'everyone',amount:50,reason:'Server-wide celebration',discord
 });
 assert.equal(preview.recipient_count,3);
 assert.equal(preview.total,150);
 assert.equal(preview.recipients.some(r=>r.id===botId),false);
 assert.equal(preview.recipients.some(r=>r.id===pendingId),false);
 assert.equal(one('SELECT 1 FROM users WHERE id=?',newcomer),undefined,'preview never creates recipients');
 const done=grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'GRANT'});
 assert.equal(done.count,3);
 assert.equal(levelWallet(newcomer).balance,50,'member without a website login also receives a wallet');
 assert.equal(levelWallet(bob).balance,50);
 assert.equal(one('SELECT claimed_level FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,newcomer).claimed_level,0);
 assert.equal(grants.pointGrantRecent()[0].total,150);
 assert.equal(grants.pointGrantMembers('discord-005').some(r=>r.id===newcomer),true);
 assert.ok(verifyAudit(db).ok);
});

test('online means actively visible on the website, with fresh Discord membership verification',async()=>{
 ping(bob,true);
 assert.ok(onlineWebsiteUserIds().includes(bob));
 const preview=await grants.preparePointGrant({
  actorId:owner,scope:'online',amount:90,reason:'Website live reward',
  discord,onlineIds:[bob,extra,bob,botId,pendingId]
 });
 assert.equal(preview.recipient_count,2);
 assert.deepEqual(preview.recipients.map(r=>r.id).sort(),[bob,extra].sort());
 const before=levelWallet(bob).balance;
 grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'GRANT'});
 assert.equal(levelWallet(bob).balance,before+90);
 assert.throws(()=>grants.pointGrantPreview(alice,preview.id),e=>e.status===404);
 const empty=await assert.rejects(grants.preparePointGrant({
  actorId:owner,scope:'online',amount:40,reason:'No one present',discord,onlineIds:[]
 }),e=>e.status===409);
});

test('invalid scopes, amounts, members and Discord listing errors fail without crediting wallets',async()=>{
 const opts={actorId:owner,scope:'single',amount:40,recipientId:alice,reason:'Test bonus',discord};
 for(const v of ['0','-1','1.5',String(grants.MAX_GRANT_PER_MEMBER+1)]){
  await assert.rejects(grants.preparePointGrant({...opts,amount:v}),e=>e.status===400);
 }
 await assert.rejects(grants.preparePointGrant({...opts,scope:'bad'}),e=>e.status===400);
 await assert.rejects(grants.preparePointGrant({...opts,recipientId:'not an id'}),e=>e.status===400);
 await assert.rejects(grants.preparePointGrant({...opts,recipientId:pendingId}),e=>e.status===404);
 await assert.rejects(grants.preparePointGrant({...opts,scope:'everyone',discord:{
  ...discord,listMembers:async()=>{throw Error('Missing intent');}
 }}),e=>e.status===503);
 const manyDiscord={...discord,listMembers:async()=>Array.from({length:101},(_,i)=>
  member(String(100000000000000200n+BigInt(i))))};
 await assert.rejects(grants.preparePointGrant({...opts,scope:'everyone',
  amount:grants.MAX_GRANT_PER_MEMBER,discord:manyDiscord}),
  e=>e.status===400,'total points protection');
});

test('an overflowing recipient balance aborts every wallet change and every audit entry',async()=>{
 const rich='100000000000000009';
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',rich,'rich','Rich',Date.now());
 const cap=Number.MAX_SAFE_INTEGER-1000000;
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,rich,cap-10);
 const richDiscord={...discord,listMembers:async()=>[member(alice),member(rich)]};
 const preview=await grants.preparePointGrant({
  actorId:owner,scope:'everyone',amount:100,reason:'Should roll back',discord:richDiscord
 });
 const oldBalance=levelWallet(alice).balance;
 const previousAudit=one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='level_points.owner.grant'").n;
 await assert.rejects(async()=>grants.confirmPointGrant({actorId:owner,id:preview.id,confirmation:'GRANT'}),
  e=>e.status===409);
 assert.equal(levelWallet(alice).balance,oldBalance,'transaction rolled back the earlier successful recipient');
 assert.equal(grants.pointGrantPreview(owner,preview.id).status,'pending');
 assert.equal(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='level_points.owner.grant'").n,previousAudit);
 assert.equal(one('SELECT COUNT(*) n FROM arcade_transfers WHERE event_key LIKE ?', 'owner:grant:'+preview.id+':%').n,0);
});

test('owner-only HTTP page, CSRF, review and confirm flow do not permit normal members',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=async id=>{
   const response=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
   return response.headers.get('set-cookie').split(';')[0];
  };
  const ownerCookie=await login(owner),memberCookie=await login(alice);
  const denied=await fetch(base+'/owner/point-all',{headers:{cookie:memberCookie}});
  assert.equal(denied.status,403);
  const page=await fetch(base+'/owner/point-all?find=Member',{headers:{cookie:ownerCookie}});
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/Point All/);
  assert.match(html,/Specific player/);
  assert.match(html,/Everyone online/);
  assert.match(html,/currently online on the website|Online on the website/i);
  assert.match(html,/Member 02|Member 06/,'owner search lists accounts matching the current query');
  assert.match(html,/action="\/owner\/point-all\/preview"/);
  assert.match(html,/href="\/owner\/point-all"/);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(html)[1];
  const send=(cookie,csrfValue)=>fetch(base+'/owner/point-all/preview',{
   method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:csrfValue,scope:'single',amount:'123',user_id:bob,reason:'Event reward'})
  });
  assert.equal((await send(memberCookie,csrf)).status,403);
  assert.equal((await send(ownerCookie,'invalid')).status,403);
  const created=await send(ownerCookie,csrf);
  assert.equal(created.status,303);
  const dest=created.headers.get('location');
  assert.match(dest,/^\/owner\/point-all\?grant=[a-f0-9-]+$/);
  const p=await fetch(base+dest,{headers:{cookie:ownerCookie}});
  assert.equal(p.status,200);
  const preview=await p.text();
  assert.match(preview,/Type GRANT to confirm/);
  assert.match(preview,/123/);
  const id=/name="grant_id" value="([^"]+)"/.exec(preview)[1];
  const confirm=(cookie,csrfValue,phrase='GRANT')=>fetch(base+'/owner/point-all/confirm',{
   method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:csrfValue,grant_id:id,confirmation:phrase})
  });
  const before=levelWallet(bob).balance;
  assert.equal((await confirm(memberCookie,csrf)).status,403);
  assert.equal((await confirm(ownerCookie,'invalid')).status,403);
  assert.equal((await confirm(ownerCookie,csrf,'WRONG')).status,400);
  const completed=await confirm(ownerCookie,csrf);
  assert.equal(completed.status,303);
  assert.equal(levelWallet(bob).balance,before+123);
  assert.equal((await confirm(ownerCookie,csrf)).status,303);
  assert.equal(levelWallet(bob).balance,before+123);
  assert.equal((await fetch(base+'/static/point-all.css')).status,200);
  assert.equal(one('SELECT COUNT(*) n FROM owner_point_grants WHERE id=? AND status=?',id,'applied').n,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
