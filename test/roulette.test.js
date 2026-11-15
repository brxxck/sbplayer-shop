// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-roulette-test-'));
const guild='100000000000000001';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'roulette.sqlite'),DISCORD_GUILD_ID:guild});
const {db,run,one,all}=await import('../src/db.js');
await import('../src/level-points.js');
const {
 ROULETTE_BETS,ROULETTE_WHEEL,ROULETTE_RED,ROULETTE_BET_MS,ROULETTE_SPIN_MS,ROULETTE_RESULTS_MS,
 rouletteSelection,rouletteColor,roulettePayout,rouletteCommitment,rouletteOutcome
}=await import('../src/roulette-rules.js');
const {
 rouletteTick,rouletteSnapshot,rouletteWatch,roulettePlace,rouletteLobbyCounts
}=await import('../src/online-roulette.js');
const alice='100000000000000181',bob='100000000000000182',charlie='100000000000000183';
const users=[alice,bob,charlie,...Array.from({length:45},(_,i)=>String(100000000000000300n+BigInt(i)))];
for(const user of users){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  user,user,'Roulette '+user,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,user,10000);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
function reset(){
 db.exec("DELETE FROM online_roulette_actions;DELETE FROM online_roulette_bets;"+
  "DELETE FROM online_roulette_rounds;DELETE FROM online_roulette_presence;"+
  "DELETE FROM arcade_rounds;DELETE FROM arcade_transfers;"+
  "UPDATE level_point_wallets SET balance=10000;");
}
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user).balance;
const bet=(key,stake)=>({key,stake});
const form=(id,bets,request_id=randomUUID())=>({
 round_id:String(id),bets_json:JSON.stringify(bets),request_id
});
function begin(t){
 reset();const a=rouletteSnapshot(alice,t);assert.equal(a.phase,'betting');return a;
}
function fixNumber(id,number){
 let seed;
 for(let i=0;i<5000;i++){
  seed=(i+1).toString(16).padStart(64,'0');
  if(rouletteOutcome(seed,id)===number)break;
 }
 assert.equal(rouletteOutcome(seed,id),number);
 run('UPDATE online_roulette_rounds SET seed=?,commitment=? WHERE id=?',
  seed,rouletteCommitment(seed),id);
 return seed;
}
test('European Roulette wheel has 37 unique pockets, exactly one green zero and eighteen red',()=>{
 assert.equal(ROULETTE_WHEEL.length,37);
 assert.equal(new Set(ROULETTE_WHEEL).size,37);
 assert.deepEqual([...ROULETTE_WHEEL].sort((a,b)=>a-b),Array.from({length:37},(_,i)=>i));
 assert.equal(ROULETTE_RED.length,18);
 assert.equal(rouletteColor(0),'green');
 assert.equal(rouletteColor(17),'black');
 assert.equal(rouletteColor(32),'red');
 assert.equal(rouletteSelection('number:0').odds,35);
 for(const bet of ROULETTE_BETS){
  assert.ok(bet.numbers.every(n=>n>=0&&n<=36));
  assert.ok(bet.numbers.length>0);
 }
});
test('Correct European roulette payouts, corner and split adjacency, zero rules',()=>{
 assert.equal(roulettePayout('number:17',10,17),360);
 assert.equal(roulettePayout('number:17',10,18),0);
 assert.equal(roulettePayout('split:1-2',25,2),450);
 assert.equal(roulettePayout('split:1-4',100,4),1800);
 assert.equal(rouletteSelection('split:1-3'),null,'non-adjacent split is not offered');
 assert.equal(roulettePayout('street:1',50,3),600);
 assert.equal(roulettePayout('corner:1-2-4-5',50,4),450);
 assert.equal(roulettePayout('six:1-6',50,5),300);
 assert.equal(roulettePayout('dozen:2',100,13),300);
 assert.equal(roulettePayout('column:1',100,34),300);
 assert.equal(roulettePayout('color:red',100,32),200);
 assert.equal(roulettePayout('color:black',100,1),0);
 assert.equal(roulettePayout('parity:even',100,18),200);
 assert.equal(roulettePayout('half:low',100,18),200);
 for(const key of ['color:red','color:black','parity:even','parity:odd','half:low','half:high'])
  assert.equal(roulettePayout(key,100,0),0,'zero must lose every even-money bet');
});
test('Seed commitment and rejection-sampled winning number are deterministic',()=>{
 const seed='c'.repeat(64),id=314;
 assert.equal(rouletteCommitment(seed).length,64);
 assert.equal(rouletteOutcome(seed,id),rouletteOutcome(seed,id));
 assert.ok(rouletteOutcome(seed,id)>=0&&rouletteOutcome(seed,id)<37);
 assert.notEqual(rouletteCommitment(seed),seed);
 assert.throws(()=>rouletteOutcome('bad',id));
 assert.throws(()=>rouletteOutcome(seed,0));
 const draws=new Set();
 for(let i=1;i<250;i++)draws.add(rouletteOutcome(seed,i));
 assert.equal(draws.size,37,'every number is reachable');
});
test('Round is exactly 30 seconds betting + 8 spinning + 4 results, even with zero players',()=>{
 const t=1000000,start=begin(t);
 assert.equal(start.betClosesAt-start.createdAt,ROULETTE_BET_MS);
 assert.equal(start.spinEndsAt-start.betClosesAt,ROULETTE_SPIN_MS);
 assert.equal(start.resultsEndsAt-start.spinEndsAt,ROULETTE_RESULTS_MS);
 assert.equal(start.phase,'betting');
 assert.equal(rouletteSnapshot(alice,t+29999).phase,'betting');
 const spin=rouletteSnapshot(alice,t+30000);
 assert.equal(spin.phase,'spinning');
 assert.equal(spin.seed,null);
 assert.equal(spin.winningNumber,null);
 assert.equal(rouletteSnapshot(alice,t+37999).phase,'spinning');
 const done=rouletteSnapshot(alice,t+38000);
 assert.equal(done.phase,'results');
 assert.ok(done.winningNumber>=0&&done.winningNumber<=36);
 assert.equal(rouletteOutcome(done.seed,done.roundId),done.winningNumber);
 assert.equal(rouletteCommitment(done.seed),done.commitment);
 assert.equal(rouletteSnapshot(alice,t+41999).roundId,start.roundId);
 const next=rouletteSnapshot(alice,t+42000);
 assert.equal(next.phase,'betting');
 assert.notEqual(next.roundId,start.roundId);
 assert.equal(next.betClosesAt-next.createdAt,30000);
});
test('Multiple chips are charged once and visible to all players; repeat requests do not re-charge',()=>{
 const t=2000000,s=begin(t),key=randomUUID();
 const input=form(s.roundId,[bet('number:17',25),bet('color:red',50),bet('color:red',75)],key);
 const accepted=roulettePlace(alice,input,t+50);
 assert.equal(accepted.myWager,150);
 assert.equal(accepted.roundWager,150);
 assert.equal(accepted.roundPlayers,1);
 assert.equal(balance(alice),9850);
 assert.equal(accepted.myBets.length,2,'duplicate selection keys aggregate');
 assert.equal(accepted.repeatBets.reduce((sum,b)=>sum+b.stake,0),150);
 assert.equal(roulettePlace(alice,input,t+70).myWager,150);
 assert.equal(balance(alice),9850);
 assert.throws(()=>roulettePlace(alice,{...input,bets_json:JSON.stringify([bet('number:17',100)])},t+90),
  err=>err.status===409);
 assert.throws(()=>roulettePlace(bob,{...input},t+90),err=>err.status===409);
 assert.equal(rouletteSnapshot(bob,t+100).roundPlayers,1);
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_transfers WHERE reason='roulette.online.wager'").n,1);
});
test('Actual winning number pays every winning selection; settlement is never repeated',()=>{
 const t=3000000,s=begin(t),seed=fixNumber(s.roundId,32);
 roulettePlace(alice,form(s.roundId,[bet('number:32',100),bet('color:red',200)]),t+30);
 roulettePlace(bob,form(s.roundId,[bet('color:black',100),bet('half:high',100)]),t+31);
 assert.equal(balance(alice),9700);
 assert.equal(balance(bob),9800);
 rouletteTick(t+30000);
 assert.equal(rouletteSnapshot(alice,t+30001).winningNumber,null);
 const ended=rouletteSnapshot(alice,t+38000);
 assert.equal(ended.phase,'results');
 assert.equal(ended.winningNumber,32);
 assert.equal(ended.seed,seed);
 assert.equal(ended.roundPlayers,2);
 assert.equal(ended.roundWager,500);
 assert.equal(ended.myPayout,4000);
 assert.equal(ended.myProfit,3700);
 assert.equal(balance(alice),13700);
 assert.equal(balance(bob),9800);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_rounds WHERE game='roulette_online'").count,2);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_transfers WHERE reason='roulette.online.payout'").count,1);
 const before=balance(alice);
 rouletteTick(t+38001);
 assert.equal(balance(alice),before);
 assert.equal(rouletteSnapshot(alice,t+38002).history[0].number,32);
 assert.equal(ended.cinematic,true);
});
test('No bet accepted at 30 seconds, over 10k per round, too many chips or insufficient wallet',()=>{
 const t=4000000,s=begin(t);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,[bet('number:9',9)]),t+1),e=>e.status===400);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,[bet('number:9',1001)]),t+1),e=>e.status===400);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,[bet('split:1-3',100)]),t+1),e=>e.status===400);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,[bet('color:red',100),bet('color:black',100)],
  'invalid'),t+1),e=>e.status===400);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,Array.from({length:31},()=>bet('number:8',10))),t+1),
  e=>e.status===400);
 assert.throws(()=>roulettePlace(alice,form(s.roundId,[bet('color:red',1000)]),t+30000),e=>e.status===409);
 assert.equal(balance(alice),10000);
 const next=rouletteSnapshot(alice,t+42000);
 const ten=Array.from({length:10},()=>bet('color:red',1000));
 roulettePlace(alice,form(next.roundId,ten),t+42001);
 assert.equal(balance(alice),0);
 assert.throws(()=>roulettePlace(alice,form(next.roundId,[bet('color:black',10)]),t+42002),e=>e.status===409);
 assert.equal(balance(alice),0);
});
test('A wager is atomic even when wallet is insufficient; multiple concurrent viewers are not capped',()=>{
 const t=5000000,s=begin(t);
 for(let i=0;i<users.length;i++)
  roulettePlace(users[i],form(s.roundId,[bet('color:red',10)]),t+100+i);
 const joined=rouletteWatch(alice,t+200);
 const counts=rouletteLobbyCounts(t+201);
 assert.equal(joined.roundPlayers,users.length);
 assert.equal(joined.roundWager,users.length*10);
 assert.equal(counts.roundPlayers,users.length);
 assert.equal(joined.watching,1);
 rouletteWatch(bob,t+201);
 assert.equal(rouletteSnapshot(alice,t+203).watching,2);
 assert.equal(rouletteSnapshot(alice,t+90000+204).watching,0);
});
test('Recovery after a missed timer settles old bets before starting a fresh 30-second window',()=>{
 const t=6000000,s=begin(t);
 const seed=fixNumber(s.roundId,0);
 roulettePlace(alice,form(s.roundId,[bet('color:red',100)]),t+25000);
 const next=rouletteSnapshot(alice,t+120000);
 assert.equal(next.phase,'betting');
 assert.notEqual(next.roundId,s.roundId);
 assert.equal(balance(alice),9900,'lost zero-spin wager is not refunded');
 const archived=one('SELECT * FROM arcade_rounds WHERE game=? AND user_id=?','roulette_online',alice);
 assert.equal(archived.payout,0);
 assert.equal(JSON.parse(archived.details_json).winningNumber,0);
 assert.equal(JSON.parse(archived.details_json).seed,seed);
 assert.equal(rouletteSnapshot(alice,t+120001).canBet,true);
});
