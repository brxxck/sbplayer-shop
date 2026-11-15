// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Global Crash is deliberately unavailable until rebuilt. No live game URL,
// cache asset, private API or legacy lobby join can be used.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-global-crash-paused-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000107',bob='100000000000000108';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'paused.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js');
const {walletChange}=await import('../src/arcade.js');
const {suspendGlobalCrash}=await import('../src/online-crash.js');
const {createServer}=await import('../src/server.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,id,'Crash Member '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,id,5000);
}
const start=Date.now();
const state={version:1,seq:2,seed:'a'.repeat(64),commitment:'b'.repeat(64),
 crashCents:250,flightStartedAt:start-4500,crashTime:start+15000};
const id=Number(run("INSERT INTO online_game_rounds(guild_id,game,status,created_at,starts_at,result_json) "+
 "VALUES(?,'crash','playing',?,?,?)",
 guild,start-10000,start-7000,JSON.stringify(state)).lastInsertRowid);
run('INSERT INTO online_game_entries(round_id,user_id,entry_no,wager,payout) VALUES(?,?,0,175,0)',
 id,alice);
run("INSERT INTO online_crash_positions(round_id,user_id,status,auto_at,placed_at) "+
 "VALUES(?,?,'active',0,?)",id,alice,start-9000);
walletChange(alice,-175,'crash.global.wager','test-crash:bet:alice');
run('INSERT INTO online_game_entries(round_id,user_id,entry_no,wager,payout) VALUES(?,?,0,200,300)',
 id,bob);
run("INSERT INTO online_crash_positions(round_id,user_id,status,auto_at,cash_at,placed_at) "+
 "VALUES(?,?,'cashed_out',0,150,?)",id,bob,start-9000);
walletChange(bob,-200,'crash.global.wager','test-crash:bet:bob');
walletChange(bob,300,'crash.global.payout','test-crash:payout:bob');
// A prior joined Crash player must not retain a lobby seat after shutdown.
run("INSERT INTO online_game_waiting(guild_id,game,user_id,joined_at,last_seen_at) "+
 "VALUES(?,'crash',?,?,?)",guild,alice,start-1000,start-1000);
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async userId=>({user:{id:userId,username:'crash_member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(dir,{recursive:true,force:true});});
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user).balance;
async function login(userId){
 const response=await fetch(base+'/__test/login/'+userId,{redirect:'manual'});
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(base+'/arcade/online',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf);
 return {cookie,csrf,page};
}
async function post(path,member,fields={}){
 return fetch(base+path,{method:'POST',redirect:'manual',
  headers:{cookie:member.cookie,Accept:'application/json',
   'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:member.csrf,...fields})});
}
test('Startup immediately cancels unfinished Global Crash and refunds only unsettled wagers',()=>{
 const row=one('SELECT status,ends_at,result_json FROM online_game_rounds WHERE id=?',id);
 assert.equal(row.status,'cancelled');
 assert.ok(row.ends_at>=start);
 assert.equal(JSON.parse(row.result_json).disabled,true);
 assert.equal(balance(alice),5000,'The active 175-point wager is fully restored');
 assert.equal(balance(bob),5100,'Previously collected winnings remain untouched');
 assert.equal(one("SELECT COUNT(*) AS c FROM online_game_waiting WHERE game='crash'").c,0);
 assert.equal(one("SELECT payout FROM online_game_entries WHERE round_id=? AND user_id=?",id,alice).payout,175);
 assert.equal(one("SELECT payout FROM online_game_entries WHERE round_id=? AND user_id=?",id,bob).payout,300);
 const a=one("SELECT status,payout,details_json FROM arcade_rounds WHERE user_id=? AND game='crash_online'",alice);
 assert.equal(a.status,'push');
 assert.equal(a.payout,175);
 assert.equal(JSON.parse(a.details_json).refunded,true);
 const b=one("SELECT status,payout FROM arcade_rounds WHERE user_id=? AND game='crash_online'",bob);
 assert.equal(b.status,'cashed_out');
 assert.equal(b.payout,300);
 assert.equal(one("SELECT COUNT(*) AS c FROM arcade_transfers WHERE reason='crash.global.paused.refund'").c,1);
 const again=suspendGlobalCrash();
 assert.deepEqual(again,{rounds:0,refundedPlayers:0,refundedPoints:0});
 assert.equal(balance(alice),5000);
 assert.equal(balance(bob),5100);
});
test('Global Crash page, state, wager, cashout and static files all return 404 to guests and members',async()=>{
 const member=await login(alice);
 for(const path of ['/arcade/online/crash','/arcade/online/crash/state',
  '/arcade/online/crash/anything','/static/online-crash.js',
  '/static/online-crash.css']){
  const guest=await fetch(base+path,{redirect:'manual'});
  assert.equal(guest.status,404,path+' guest access must be blocked');
  const loggedIn=await fetch(base+path,{headers:{cookie:member.cookie},redirect:'manual'});
  assert.equal(loggedIn.status,404,path+' member access must be blocked');
 }
 for(const path of ['/arcade/online/crash/bet','/arcade/online/crash/collect']){
  const blocked=await post(path,member,{round_id:String(id),wager:'100',
   request_id:'7b83cb79-62cd-4d3f-8a33-ec298fe2d1df'});
  assert.equal(blocked.status,404,'Old forms cannot charge or cash out on '+path);
 }
 assert.equal(balance(alice),5000);
 assert.equal(one("SELECT COUNT(*) AS c FROM online_game_rounds WHERE game='crash'").c,1);
});
test('Old queue join/leave forms are rejected and Global Crash is absent from online UI and state',async()=>{
 const member=await login(alice);
 assert.doesNotMatch(member.page,/Global Crash|\/arcade\/online\/crash|data-online-game="crash"/i);
 assert.match(member.page,/4-Player Blackjack/);
 assert.match(member.page,/Live Roulette/);
 let response=await fetch(base+'/arcade/online/state',{
  headers:{cookie:member.cookie,Accept:'application/json'}});
 assert.equal(response.status,200);
 const lobby=await response.json();
 assert.equal(Object.hasOwn(lobby,'crash'),false);
 assert.equal(lobby.blackjack.enabled,true);
 for(const action of ['join','leave']){
  response=await post('/arcade/online/'+action,member,{game:'crash',next:'crash'});
  assert.equal(response.status,400);
 }
 assert.equal(one("SELECT COUNT(*) AS c FROM online_game_waiting WHERE game='crash'").c,0);
 assert.equal(balance(alice),5000);
});
test('Solo Crash and other online games are unaffected by the Global Crash lockdown',async()=>{
 const member=await login(alice);
 for(const path of ['/arcade/crash','/arcade','/arcade/online/blackjack',
  '/arcade/online/roulette']){
  const response=await fetch(base+path,{headers:{cookie:member.cookie}});
  assert.equal(response.status,200,path);
 }
 const arcade=await (await fetch(base+'/arcade',{headers:{cookie:member.cookie}})).text();
 assert.match(arcade,/href="\/arcade\/crash"/);
 assert.doesNotMatch(arcade,/shared Crash lobbies/i);
});
