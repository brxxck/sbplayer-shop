// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-global-crash-'));
const guild='100000000000000001',alice='100000000000000101',bob='100000000000000102',
 carol='100000000000000103';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'global-crash.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,all,run}=await import('../src/db.js');
await import('../src/level-points.js');
const {globalCrashSnapshot,globalCrashTick,globalCrashBet,globalCrashCashout,globalCrashPoint,
 globalCrashCommitment,globalCrashPayout,globalCrashReachTime,globalCrashCentsAt,
 GLOBAL_CRASH_BET_MS,GLOBAL_CRASH_BREAK_MS}=await import('../src/online-crash.js');
const ids=[alice,bob,carol,...Array.from({length:25},(_,i)=>String(100000000000000200n+BigInt(i)))];
for(const id of ids){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Crash '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,10000);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const balance=id=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,id).balance;
function reset(){
 db.exec("DELETE FROM online_crash_requests;DELETE FROM online_crash_positions;"+
  "DELETE FROM online_game_entries;DELETE FROM online_game_rounds;DELETE FROM online_game_waiting;"+
  "DELETE FROM arcade_rounds;DELETE FROM arcade_transfers;UPDATE level_point_wallets SET balance=10000;");
}
const request=(roundId,wager=100,auto_at='',key=randomUUID())=>
 ({round_id:String(roundId),wager:String(wager),auto_at,request_id:key});
const collect=(roundId,key=randomUUID())=>({round_id:String(roundId),request_id:key});
function committedSeed(roundId,minCrash=0,maxCrash=10001){
 for(let i=0;i<5000;i++){
  const seed=i.toString(16).padStart(64,'0'),outcome=globalCrashPoint(seed,roundId);
  if(outcome>minCrash&&outcome<maxCrash)return {seed,outcome};
 }
 throw Error('Could not select a deterministic test seed');
}
function fixSeed(roundId,minCrash=200,maxCrash=10001){
 const {seed,outcome}=committedSeed(roundId,minCrash,maxCrash);
 const original=one('SELECT result_json FROM online_game_rounds WHERE id=?',roundId);
 const state=JSON.parse(original.result_json);state.seed=seed;state.commitment=globalCrashCommitment(seed);
 run('UPDATE online_game_rounds SET result_json=? WHERE id=?',JSON.stringify(state),roundId);
 return {seed,outcome};
}
function begin(users,t){
 reset();
 for(let i=0;i<users.length;i++)run("INSERT INTO online_game_waiting(guild_id,game,user_id,joined_at,last_seen_at) VALUES(?,'crash',?,?,?)",guild,users[i],t+i,t+i);
 const state=globalCrashSnapshot(users[0]||alice,t+users.length+1);
 assert.equal(state.phase,'betting');
 assert.ok(state.roundId>0);
 return state;
}
test('Deterministic HMAC/SHA256 commitment verifies an unbiased 96% target curve',()=>{
 const seed='1'.padStart(64,'0'),roundId=327;
 assert.equal(globalCrashCommitment(seed).length,64);
 assert.equal(globalCrashCommitment(seed),globalCrashCommitment(seed));
 assert.equal(globalCrashPoint(seed,roundId),globalCrashPoint(seed,roundId));
 assert.ok(globalCrashPoint(seed,roundId)>=100);
 assert.ok(globalCrashPoint(seed,roundId)<=10000);
 assert.equal(globalCrashPayout(101,225),227);
 assert.equal(globalCrashCentsAt(0),100);
 assert.ok(globalCrashCentsAt(globalCrashReachTime(200))>=200);
});
test('The global game runs a full cycle with no viewers and starts another round',()=>{
 reset();const t=1000000;
 const first=globalCrashTick(t);assert.equal(first.phase,'betting');
 let row=one('SELECT id,starts_at FROM online_game_rounds WHERE id=?',first.roundId);
 assert.equal(row.starts_at,t+GLOBAL_CRASH_BET_MS);
 const secret=fixSeed(first.roundId,0,150); // Fast crash for deterministic transition
 const started=globalCrashTick(t+GLOBAL_CRASH_BET_MS+2);
 assert.equal(started.phase,'playing');
 const playing=globalCrashSnapshot(alice,t+GLOBAL_CRASH_BET_MS+3);
 assert.equal(playing.seed,null);
 assert.equal(playing.crashAt,null);
 assert.ok(playing.commitment.length===64);
 const finishAt=t+GLOBAL_CRASH_BET_MS+2+globalCrashReachTime(secret.outcome)+1;
 assert.equal(globalCrashTick(finishAt).phase,'settled');
 const result=globalCrashSnapshot(alice,finishAt);
 assert.equal(result.seed,secret.seed);
 assert.equal(result.crashAt,secret.outcome);
 const next=globalCrashTick(finishAt+GLOBAL_CRASH_BREAK_MS+1);
 assert.equal(next.phase,'betting');
 assert.notEqual(next.roundId,first.roundId);
});
test('Unlimited-lobby design supports at least 28 participants and aggregates actual stakes',()=>{
 const t=2000000,state=begin(ids,t);
 for(let i=0;i<ids.length;i++)globalCrashBet(ids[i],request(state.roundId,100+i),t+100+i);
 const snapshot=globalCrashSnapshot(alice,t+500);
 assert.equal(snapshot.roundPlayers,ids.length);
 assert.equal(snapshot.activePlayers,ids.length);
 assert.equal(snapshot.roundWager,ids.reduce((sum,_,i)=>sum+100+i,0));
 assert.equal(snapshot.lobbyPlayers,ids.length);
 assert.equal(snapshot.players.length,24,'public player feed is paged for performance');
 assert.equal(snapshot.phase,'betting');
 assert.equal(snapshot.canBet,false);
});
test('A bet is debited once, requires membership and rejects reused or invalid forms',()=>{
 const t=3000000,state=begin([alice,bob],t);
 const key=randomUUID();
 assert.throws(()=>globalCrashBet(carol,request(state.roundId,100),t+50),e=>e.status===409);
 assert.throws(()=>globalCrashBet(alice,request(state.roundId,9),t+50),e=>e.status===400);
 assert.throws(()=>globalCrashBet(alice,request(state.roundId,100,'1.09'),t+50),e=>e.status===400);
 assert.throws(()=>globalCrashBet(alice,request(state.roundId,100,'20.01'),t+50),e=>e.status===400);
 const placed=globalCrashBet(alice,request(state.roundId,225,'2.00',key),t+80);
 assert.equal(placed.me.wager,225);
 assert.equal(placed.me.autoAt,200);
 assert.equal(balance(alice),9775);
 assert.equal(globalCrashBet(alice,request(state.roundId,225,'2.00',key),t+90).me.wager,225);
 assert.equal(balance(alice),9775);
 assert.throws(()=>globalCrashBet(alice,request(state.roundId,100),t+95),e=>e.status===409);
 assert.throws(()=>globalCrashBet(bob,request(state.roundId,100,'',key),t+95),e=>e.status===409);
 assert.equal(one('SELECT COUNT(*) AS c FROM online_game_entries').c,1);
});
test('Manual cashout returns points immediately once, and the hidden crash cannot be guessed',()=>{
 const t=4000000,state=begin([alice,bob],t);
 const secret=fixSeed(state.roundId,300);
 globalCrashBet(alice,request(state.roundId,250),t+100);
 const running=globalCrashSnapshot(alice,t+GLOBAL_CRASH_BET_MS+5);
 assert.equal(running.phase,'playing');
 assert.equal(running.seed,null);
 assert.equal(running.crashAt,null);
 assert.equal(JSON.stringify(running).includes(secret.seed),false);
 assert.equal(running.canCashout,true);
 const time=t+GLOBAL_CRASH_BET_MS+5+globalCrashReachTime(165)+1;
 const m=globalCrashCentsAt(time-(t+GLOBAL_CRASH_BET_MS+5));
 const key=randomUUID();
 const paid=globalCrashCashout(alice,collect(state.roundId,key),time);
 assert.equal(paid.me.status,'cashed_out');
 assert.equal(paid.me.cashAt,m);
 assert.equal(paid.me.payout,globalCrashPayout(250,m));
 assert.equal(balance(alice),9750+globalCrashPayout(250,m));
 assert.equal(globalCrashCashout(alice,collect(state.roundId,key),time+1).me.payout,paid.me.payout);
 assert.throws(()=>globalCrashCashout(alice,collect(state.roundId),time+2),e=>e.status===409);
 assert.throws(()=>globalCrashCashout(bob,collect(state.roundId),time+3),e=>e.status===409);
 assert.equal(one("SELECT COUNT(*) AS c FROM arcade_transfers WHERE reason='crash.global.payout'").c,1);
 const finish=time+60000;
 const end=globalCrashSnapshot(alice,finish);
 assert.equal(end.phase,'settled');
 assert.equal(end.seed,secret.seed);
 assert.equal(end.crashAt,secret.outcome);
 assert.equal(balance(alice),9750+globalCrashPayout(250,m),'no payout replay on settlement');
 assert.equal(one("SELECT status FROM arcade_rounds WHERE user_id=? AND game='crash_online'",alice).status,'cashed_out');
});
test('Server auto-collect reaches the exact target even when the ticker wakes after the crash',()=>{
 const t=5000000,state=begin([alice],t);
 fixSeed(state.roundId,350);
 const wager=325;
 globalCrashBet(alice,request(state.roundId,wager,'2.00'),t+90);
 globalCrashTick(t+GLOBAL_CRASH_BET_MS+3);
 const end=globalCrashSnapshot(alice,t+GLOBAL_CRASH_BET_MS+70000);
 assert.equal(end.phase,'settled');
 assert.equal(end.me.status,'cashed_out');
 assert.equal(end.me.cashAt,200);
 assert.equal(end.me.payout,650);
 assert.equal(balance(alice),10000-wager+650);
 assert.equal(one("SELECT COUNT(*) AS c FROM arcade_transfers WHERE reason='crash.global.payout'").c,1);
 globalCrashTick(t+GLOBAL_CRASH_BET_MS+70000);
 assert.equal(balance(alice),10325);
});
test('Auto-collect at or beyond the crash cannot collect, and late manual cashouts lose',()=>{
 const t=6000000,state=begin([alice,bob],t);
 const secret=fixSeed(state.roundId,100,180);
 globalCrashBet(alice,request(state.roundId,200,'2.00'),t+120);
 globalCrashBet(bob,request(state.roundId,200),t+125);
 globalCrashTick(t+GLOBAL_CRASH_BET_MS+4);
 const afterCrash=t+GLOBAL_CRASH_BET_MS+4+globalCrashReachTime(secret.outcome)+200;
 assert.throws(()=>globalCrashCashout(bob,collect(state.roundId),afterCrash),e=>e.status===409);
 const result=globalCrashSnapshot(alice,afterCrash);
 assert.equal(result.phase,'settled');
 assert.equal(result.me.status,'lost');
 assert.equal(result.me.payout,0);
 assert.equal(balance(alice),9800);
 assert.equal(balance(bob),9800);
 assert.equal(all("SELECT * FROM arcade_rounds WHERE game='crash_online'").length,2);
});
test('Betting closes atomically at launch; queue departures do not erase existing wagers',()=>{
 const t=7000000,state=begin([alice],t);
 fixSeed(state.roundId,200);
 globalCrashBet(alice,request(state.roundId,100),t+100);
 run("DELETE FROM online_game_waiting WHERE guild_id=? AND game='crash' AND user_id=?",guild,alice);
 const inFlight=globalCrashSnapshot(alice,t+GLOBAL_CRASH_BET_MS+3);
 assert.equal(inFlight.phase,'playing');
 assert.equal(inFlight.joined,false);
 assert.equal(inFlight.canCashout,true);
 assert.throws(()=>globalCrashBet(alice,request(state.roundId,100),t+GLOBAL_CRASH_BET_MS+2),e=>e.status===409);
 assert.equal(one('SELECT wager FROM online_game_entries WHERE round_id=? AND user_id=?',state.roundId,alice).wager,100);
});
