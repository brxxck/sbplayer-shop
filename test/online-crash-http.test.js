// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-global-crash-http-'));
const guild='100000000000000001',owner='100000000000000002',
 alice='100000000000000107',bob='100000000000000108';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'global-http.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
const {globalCrashPoint,globalCrashCommitment,globalCrashReachTime,globalCrashTick}=await import('../src/online-crash.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Crash Member',Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,5000);
}
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'crash_member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(dir,{recursive:true,force:true});});
async function login(id){
 const response=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(base+'/arcade/online',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf);
 return {cookie,csrf};
}
async function post(path,user,fields={},overrideCsrf=user?.csrf){
 return fetch(base+path,{method:'POST',redirect:'manual',
  headers:{cookie:user.cookie,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:overrideCsrf,...fields})});
}
async function state(user){
 const response=await fetch(base+'/arcade/online/crash/state',{headers:{cookie:user.cookie,Accept:'application/json'}});
 assert.equal(response.status,200);
 return response.json();
}
test('Guest metadata is public but shared wager balances, players and hidden server seed are not',async()=>{
 const guest=await fetch(base+'/arcade/online/crash',{redirect:'manual'});
 assert.equal(guest.status,200);
 const text=await guest.text();
 assert.match(text,/Global Crash/);
 assert.doesNotMatch(text,/data-global-crash-root|data-gcr-wallet|Crash Member|crashCents|seed/);
 const privateStatus=await fetch(base+'/arcade/online/crash/state',{redirect:'manual'});
 assert.ok([302,303].includes(privateStatus.status));
 const assets=await fetch(base+'/static/online-crash.js');
 assert.equal(assets.status,200);
 assert.match(await assets.text(),/data-global-crash-root/);
 const css=await fetch(base+'/static/online-crash.css');
 assert.equal(css.status,200);
});
test('Users can watch the shared game, join by Discord session and see live counters',async()=>{
 const a=await login(alice),b=await login(bob);
 let page=await fetch(base+'/arcade/online/crash',{headers:{cookie:a.cookie}});
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/data-global-crash-root/);
 assert.match(html,/data-gcr-multiplier/);
 assert.match(html,/data-gcr-stat="players"/);
 assert.match(html,/\/static\/online-crash\.js/);
 const notJoined=await state(a);
 assert.equal(notJoined.joined,false);
 assert.equal(notJoined.canBet,false);
 assert.ok(notJoined.commitment.length===64);
 assert.equal(notJoined.seed,null);
 assert.equal(notJoined.crashAt,null);
 const invalid=await post('/arcade/online/join',a,{game:'crash',next:'crash'},'bad');
 assert.equal(invalid.status,403);
 const joined=await post('/arcade/online/join',a,{game:'crash',next:'crash'});
 assert.equal(joined.status,303);
 assert.match(joined.headers.get('location'),/\/arcade\/online\/crash/);
 const current=await state(a);
 assert.equal(current.joined,true);
 assert.ok(current.lobbyPlayers>=1);
 assert.equal((await state(b)).canBet,false);
});
test('Global bets require the correct player, CSRF and request ID; no duplicate charges',async()=>{
 const a=await login(alice),b=await login(bob);
 let current=await state(a);
 assert.equal(current.phase,'betting');
 const fields={wager:'200',auto_at:'2.00',round_id:String(current.roundId),request_id:randomUUID()};
 const denied=await post('/arcade/online/crash/bet',a,fields,'invalid');
 assert.equal(denied.status,403);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,5000);
 const spectator=await post('/arcade/online/crash/bet',b,fields);
 assert.equal(spectator.status,409);
 const bet=await post('/arcade/online/crash/bet',a,fields);
 assert.equal(bet.status,200);
 const accepted=await bet.json();
 assert.equal(accepted.me.wager,200);
 assert.equal(accepted.me.autoAt,200);
 assert.equal(accepted.roundPlayers,1);
 assert.equal(accepted.roundWager,200);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,4800);
 const replay=await post('/arcade/online/crash/bet',a,fields);
 assert.equal(replay.status,200);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,4800);
 const second=await post('/arcade/online/crash/bet',a,{...fields,request_id:randomUUID()});
 assert.equal(second.status,409);
 const unauthorized=await post('/arcade/online/crash/collect',b,{round_id:fields.round_id,request_id:randomUUID()});
 assert.equal(unauthorized.status,409);
});
test('The multiplayer cashout endpoint hides the future crash and credits one immutable payout',async()=>{
 const a=await login(alice);
 const current=await state(a),id=current.roundId;
 let seed='',point=0;
 for(let i=1;i<200;i++){
  seed=i.toString(16).padStart(64,'0');point=globalCrashPoint(seed,id);
  if(point>300)break;
 }
 assert.ok(point>300);
 const row=one('SELECT result_json FROM online_game_rounds WHERE id=?',id);
 const data=JSON.parse(row.result_json);
 data.seed=seed;data.commitment=globalCrashCommitment(seed);
 run('UPDATE online_game_rounds SET result_json=?,starts_at=? WHERE id=?',JSON.stringify(data),Date.now()-1,id);
 const start=await state(a);
 assert.equal(start.phase,'playing');
 assert.equal(start.seed,null);
 assert.equal(start.crashAt,null);
 const running=JSON.parse(one('SELECT result_json FROM online_game_rounds WHERE id=?',id).result_json);
 const startedAt=Date.now()-1800;
 running.flightStartedAt=startedAt;
 running.crashTime=startedAt+globalCrashReachTime(point);
 run('UPDATE online_game_rounds SET result_json=? WHERE id=?',JSON.stringify(running),id);
 const payoutBefore=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 const collected=await post('/arcade/online/crash/collect',a,{round_id:String(id),request_id:randomUUID()});
 assert.equal(collected.status,200);
 const success=await collected.json();
 assert.equal(success.me.status,'cashed_out');
 assert.ok(success.me.payout>=200);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,payoutBefore+success.me.payout);
 const extra=await post('/arcade/online/crash/collect',a,{round_id:String(id),request_id:randomUUID()});
 assert.equal(extra.status,409);
 globalCrashTick(running.crashTime+100);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_transfers WHERE reason='crash.global.payout'").count,1);
 assert.equal(one("SELECT status FROM arcade_rounds WHERE user_id=? AND game='crash_online'",alice).status,'cashed_out');
});
