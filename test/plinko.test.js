// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=mkdtempSync(join(tmpdir(),'sb-plinko-rules-'));
const guild='100000000000000001';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'plinko.sqlite'),DISCORD_GUILD_ID:guild});
const {db,run,one,all}=await import('../src/db.js');
await import('../src/level-points.js');
const arcade=await import('../src/arcade.js');
const {
 PLINKO_ROWS,PLINKO_RISKS,PLINKO_COUNTS,PLINKO_TABLES,plinkoTable,
 plinkoProbability,plinkoRtp,plinkoPath,plinkoPayout,dropPlinko,plinkoSuggestedPlay
}=await import('../src/plinko.js');
const alice='100000000000000151',bob='100000000000000152',poor='100000000000000153';
for(const user of [alice,bob,poor]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  user,user,'Plinko '+user,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,user,user===poor?25:10000);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user).balance;
const form=(wager=100,rows=12,risk='medium',count=1,request_id=randomUUID())=>({
 wager:String(wager),rows:String(rows),risk,count:String(count),request_id
});

test('Suggested Play is an optional, transparent Plinko preset with no bet made',async()=>{
 const noBalance=plinkoSuggestedPlay(0);
 assert.equal(noBalance.enabled,false);
 assert.equal(plinkoSuggestedPlay(9).enabled,false);
 assert.deepEqual(plinkoSuggestedPlay(100),{enabled:true,rows:12,risk:'medium',count:1,wager:10,totalWager:10});
 const highBalance=plinkoSuggestedPlay(1678461);
 assert.deepEqual(highBalance,{enabled:true,rows:12,risk:'medium',count:5,wager:100,totalWager:500});
 for(const points of [0,9,10,100,1000,9999,10000,20000,1500000]){
  const hint=plinkoSuggestedPlay(points);
  assert.ok(PLINKO_ROWS.includes(hint.rows));
  assert.ok(PLINKO_COUNTS.includes(hint.count));
  assert.ok(PLINKO_RISKS.includes(hint.risk));
  if(hint.enabled){
   assert.ok(hint.totalWager<=points,'never recommend more points than the wallet holds');
   assert.equal(hint.totalWager,hint.count*hint.wager);
   assert.ok(hint.wager>=10&&hint.wager<=10000);
  }
 }
 const {plinkoPage}=await import('../src/plinko-views.js');
 const ctx={user:{id:alice},pathname:'/arcade/plinko',arcadeFragment:true,csrf:'unit-test'};
 const html=plinkoPage(ctx,{balance:1678461},{round:null,rounds:[]});
 assert.match(html,/SUGGESTED PLAY/);
 assert.match(html,/data-plinko-suggest-apply/);
 assert.match(html,/data-suggest-wager="100"/);
 assert.match(html,/data-suggest-count="5"/);
 assert.match(html,/not a win prediction/);
 assert.equal(balance(alice),10000,'displaying a suggestion must not deduct points');
});

test('All nine risk/row payout tables are symmetric, positive and near 96% theoretical RTP',()=>{
 assert.deepEqual(PLINKO_ROWS,[8,12,16]);
 assert.deepEqual(PLINKO_COUNTS,[1,5,10,25,50,100]);
 for(const rows of PLINKO_ROWS){
  let sum=0;for(let slot=0;slot<=rows;slot++)sum+=plinkoProbability(rows,slot);
  assert.ok(Math.abs(sum-1)<1e-9);
  for(const risk of PLINKO_RISKS){
   const table=plinkoTable(rows,risk);
   assert.equal(table.length,rows+1);
   assert.deepEqual(table,[...table].reverse(),'left and right edges share the same multipliers');
   assert.ok(table.every(v=>Number.isSafeInteger(v)&&v>0));
   const rtp=plinkoRtp(rows,risk);
   assert.ok(rtp>=.955&&rtp<=.965,rows+' row '+risk+' RTP '+rtp);
   assert.ok(table[0]>table[rows/2], 'extreme slots pay more than middle');
   const mid=rows/2;
   assert.ok(plinkoProbability(rows,mid)>plinkoProbability(rows,0));
  }
  assert.ok(plinkoTable(rows,'high')[0]>plinkoTable(rows,'medium')[0]);
  assert.ok(plinkoTable(rows,'medium')[0]>plinkoTable(rows,'low')[0]);
 }
 assert.equal(PLINKO_TABLES[16].high[0],91021);
});
test('Only server-drawn left/right peg decisions determine the final winning slot',()=>{
 for(const rows of PLINKO_ROWS){
  const left=plinkoPath(rows,()=>0);
  const right=plinkoPath(rows,()=>1);
  const alternate=plinkoPath(rows,(max)=>max===2?Number(alternateDraw++%2===0):0);
  assert.equal(left.slot,0);
  assert.equal(right.slot,rows);
  assert.equal(alternate.slot,rows/2);
  assert.equal(left.decisions.length,rows);
  assert.equal(right.decisions.length,rows);
 }
});
let alternateDraw=0;
test('Whole points are rounded DOWN for each ball and never rounded up across a batch',()=>{
 assert.equal(plinkoPayout(10,47),4);
 assert.equal(plinkoPayout(101,417),421);
 assert.equal(plinkoPayout(100,100),100);
 assert.equal(plinkoPayout(10,91021),9102);
});
test('One 10-ball batch transfers points once and persists every exact path and payout',()=>{
 const request=form(100,8,'low',10);
 const start=balance(alice);
 const id=dropPlinko(alice,request,()=>0);
 const round=arcade.getRound(alice,id,'plinko');
 assert.equal(round.game,'plinko');
 assert.equal(round.wager,1000);
 assert.equal(round.payout,4170);
 assert.equal(round.status,'won');
 assert.equal(round.details.rows,8);
 assert.equal(round.details.count,10);
 assert.equal(round.details.perBall,100);
 assert.equal(round.details.balls.length,10);
 assert.ok(round.details.balls.every(b=>b.slot===0&&b.multiplierCents===417&&
  b.payout===417&&b.decisions.length===8&&b.decisions.every(x=>x===0)));
 assert.equal(balance(alice),start-1000+4170);
 assert.equal(all("SELECT * FROM arcade_transfers WHERE user_id=? AND reason IN ('plinko.wager','plinko.payout')",
  alice).length,2);
 assert.equal(arcade.recentRounds(alice,'plinko',1)[0].id,id);
 assert.ok(arcade.arcadeSummary(alice).biggest_win>=3170);
});
test('One 100-ball drop settles atomically and returns 100 saved peg paths',()=>{
 const user='100000000000000154';
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  user,'plinko100','Plinko 100',Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,user,10000);
 const fields=form(10,8,'low',100),before=balance(user);
 const id=dropPlinko(user,fields,()=>0),round=arcade.getRound(user,id,'plinko');
 assert.equal(round.details.count,100);
 assert.equal(round.details.balls.length,100);
 assert.equal(round.wager,1000);
 assert.equal(round.payout,4100);
 assert.ok(round.details.balls.every(b=>b.wager===10&&b.payout===41&&b.slot===0&&b.decisions.length===8));
 assert.equal(balance(user),before-1000+4100);
 assert.equal(all("SELECT * FROM arcade_transfers WHERE user_id=? AND reason IN ('plinko.wager','plinko.payout')",user).length,2);
 assert.equal(dropPlinko(user,fields,()=>{throw Error('Duplicate batch must never re-roll');}),id);
 assert.equal(balance(user),before-1000+4100);
});

test('Idempotent request IDs never charge, pay or generate results again',()=>{
 const key=randomUUID(),input=form(100,16,'high',5,key);
 let called=0;
 const first=dropPlinko(bob,input,()=>{called++;return 1;});
 const afterFirst=balance(bob);
 assert.equal(called,16*5);
 const again=dropPlinko(bob,input,()=>{throw Error('Must not re-roll a saved result.');});
 assert.equal(first,again);
 assert.equal(balance(bob),afterFirst);
 assert.equal(all('SELECT id FROM arcade_rounds WHERE request_key=?',key).length,1);
 assert.equal(all('SELECT * FROM arcade_transfers WHERE user_id=?',bob).length,2);
 assert.throws(()=>dropPlinko(bob,{...input,wager:'200'},()=>0),e=>e.status===409);
 assert.throws(()=>dropPlinko(alice,input,()=>0),e=>e.status===409);
});
test('Invalid settings and insufficient points cannot debit a user',()=>{
 const before=balance(poor);
 for(const invalid of [
  form(9),form(10001),form(100,7),form(100,9),form(100,12,'extreme'),
  form(100,12,'low',2),form(100,12,'low',0),form(100,12,'low',101),form('1.5')
 ])assert.throws(()=>dropPlinko(poor,invalid),e=>e.status===400);
 assert.throws(()=>dropPlinko(poor,form(10,12,'medium',5)),e=>e.status===409);
 assert.equal(balance(poor),before);
 assert.equal(one("SELECT COUNT(*) AS c FROM arcade_rounds WHERE user_id=?",poor).c,0);
 assert.equal(one("SELECT COUNT(*) AS c FROM arcade_transfers WHERE user_id=?",poor).c,0);
});
test('An RNG failure rolls back the entire batch and both wallet transfer records',()=>{
 const key=randomUUID(),data=form(100,12,'medium',5,key);
 const initial=balance(alice);
 let n=0;
 assert.throws(()=>dropPlinko(alice,data,()=>{if(++n===19)throw Error('No entropy');return 1;}),/No entropy/);
 assert.equal(balance(alice),initial);
 assert.equal(one('SELECT COUNT(*) AS c FROM arcade_rounds WHERE request_key=?',key).c,0);
 assert.equal(one('SELECT COUNT(*) AS c FROM arcade_transfers WHERE event_key=?','plinko:wager:'+key).c,0);
 const again=dropPlinko(alice,data,()=>1);
 assert.ok(again>0);
});
test('Input validation catches nonbinary RNG output and invalid identifiers',()=>{
 assert.throws(()=>plinkoPath(8,()=>2),/random bit/);
 assert.throws(()=>plinkoTable(16,'unknown'),e=>e.status===400);
 assert.throws(()=>plinkoProbability(8,9),e=>e.status===400);
 assert.throws(()=>dropPlinko('not-discord',form()),e=>e.status===400);
 assert.throws(()=>dropPlinko(alice,form(100,8,'low',1,'reuse')),e=>e.status===400);
});
