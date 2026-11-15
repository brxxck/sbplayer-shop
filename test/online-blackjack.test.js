// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=mkdtempSync(join(tmpdir(),'sb-blackjack-'));
const guild='100000000000000001';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'blackjack.sqlite'),DISCORD_GUILD_ID:guild});
const {db,run,one,all}=await import('../src/db.js');
await import('../src/level-points.js');
const {joinOnlineLobby,onlineGamesSnapshot}=await import('../src/online-games.js');
const {blackjackSnapshot,blackjackTick,blackjackBet,blackjackAction}=await import('../src/online-blackjack.js');
const {makeBlackjackShoe,blackjackValue,blackjackPayout,blackjackDealerPlay}=await import('../src/blackjack-rules.js');
const alice='100000000000000101',bob='100000000000000102',carol='100000000000000103',
 david='100000000000000104',emma='100000000000000105';
const users=[alice,bob,carol,david,emma];
for(const user of users){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',user,user,'Player '+user,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,user,10000);
}
function reset(){
 db.exec('DELETE FROM online_blackjack_requests;DELETE FROM online_game_entries;DELETE FROM online_game_rounds;'+
  'DELETE FROM online_game_waiting;DELETE FROM arcade_rounds;DELETE FROM arcade_transfers;'+
  'UPDATE level_point_wallets SET balance=10000;');
}
function balance(user){return one('SELECT balance FROM level_point_wallets WHERE user_id=? AND guild_id=?',user,guild).balance;}
function start(players,time){
 reset();
 for(let i=0;i<players.length;i++)joinOnlineLobby(players[i],'blackjack',time+i);
 blackjackTick(time+players.length+1);
 return blackjackSnapshot(players[0],time+players.length+2);
}
function bet(user,round,wager,time,key=randomUUID()){
 return blackjackBet(user,{round_id:String(round),wager:String(wager),request_id:key},time);
}
function act(user,round,action,seq,time,key=randomUUID()){
 return blackjackAction(user,{round_id:String(round),action,seq:String(seq),request_id:key},time);
}
const card=(rank,suit='S')=>({rank,suit});
function stateRow(round){
 const row=one('SELECT result_json FROM online_game_rounds WHERE id=?',round);
 return JSON.parse(row.result_json);
}
function editState(round,mutator){
 const state=stateRow(round);mutator(state);
 run('UPDATE online_game_rounds SET result_json=? WHERE id=?',JSON.stringify(state),round);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

test('six decks use secure shuffle-compatible cards; soft 17 stands, aces score correctly',()=>{
 const shoe=makeBlackjackShoe(max=>0);
 assert.equal(shoe.length,312);
 assert.equal(shoe.filter(c=>c.rank==='A').length,24);
 assert.deepEqual(blackjackValue([card('A'),card('6')]),{total:17,soft:true});
 assert.deepEqual(blackjackValue([card('A'),card('A'),card('9')]),{total:21,soft:true});
 assert.deepEqual(blackjackValue([card('A'),card('A'),card('10')]),{total:12,soft:false});
 const dealer=[card('A'),card('6')],remaining=[card('8')];
 blackjackDealerPlay(dealer,remaining);
 assert.equal(dealer.length,2);
});
test('natural pays 3:2, normal win 1:1, push returns wager, dealer Blackjack beats 21',()=>{
 assert.deepEqual(blackjackPayout({wager:101,cards:[card('A'),card('K')],split:false},[card('10'),card('7')]),
  {payout:252,outcome:'blackjack'});
 assert.deepEqual(blackjackPayout({wager:100,cards:[card('10'),card('9')],split:false},[card('9'),card('8')]),
  {payout:200,outcome:'won'});
 assert.deepEqual(blackjackPayout({wager:100,cards:[card('10'),card('7')],split:false},[card('9'),card('8')]),
  {payout:100,outcome:'push'});
 assert.deepEqual(blackjackPayout({wager:100,cards:[card('10'),card('A')],split:true},[card('10'),card('7')]),
  {payout:200,outcome:'won'});
 assert.deepEqual(blackjackPayout({wager:100,cards:[card('10'),card('9')],split:false},[card('A'),card('K')]),
  {payout:0,outcome:'lost'});
});
test('4 seats are pinned per round while fifth player waits for next betting window',()=>{
 const t=1000000,state=start(users,t);
 assert.equal(state.phase,'betting');
 assert.equal(state.players.length,4);
 assert.equal(state.players.some(p=>p.userId===emma),false);
 assert.equal(onlineGamesSnapshot(emma,t+10).blackjack.waiting,1);
 assert.equal(onlineGamesSnapshot(emma,t+10).blackjack.atTable,false);
 assert.equal(blackjackSnapshot(emma,t+10).canBet,false);
 assert.throws(()=>bet(emma,state.roundId,100,t+10),e=>e.status===409);
});
test('bets are transactional, per-seat, idempotent and never double-debit',()=>{
 const t=2000000,state=start([alice,bob],t),key=randomUUID();
 const before=balance(alice);
 const confirmed=bet(alice,state.roundId,100,t+10,key);
 assert.equal(confirmed.placedBet,100);
 assert.equal(balance(alice),before-100);
 assert.equal(confirmed.roundWager,100);
 assert.equal(bet(alice,state.roundId,100,t+11,key).roundWager,100);
 assert.equal(balance(alice),before-100);
 assert.throws(()=>bet(alice,state.roundId,200,t+11),e=>e.status===409);
 assert.throws(()=>bet(bob,state.roundId,0,t+12),e=>e.status===400);
 assert.throws(()=>bet(bob,state.roundId,1001,t+12),e=>e.status===400);
 assert.throws(()=>blackjackBet(bob,{round_id:String(state.roundId),wager:'100',request_id:key},t+12),e=>e.status===409);
});
test('dealer hole and six-deck shoe remain invisible during play and after settlement',()=>{
 const t=3000000,state=start([alice],t);
 bet(alice,state.roundId,100,t+6);
 const current=blackjackSnapshot(alice,t+20000);
 assert.ok(['playing','settled'].includes(current.phase));
 assert.equal(Object.hasOwn(current,'shoe'),false);
 assert.equal(JSON.stringify(current).includes('"shoe"'),false);
 if(current.phase==='playing'){
  assert.equal(current.dealer.length,2);
  assert.deepEqual(current.dealer[1],{back:true});
  assert.equal(current.dealerValue,null);
  assert.equal(current.actions.length>0,true);
  assert.ok(stateRow(state.roundId).shoe.length>0);
 }
});
test('Hit busts, settles once, and completed round appears in Arcade history',()=>{
 const t=4000000,state=start([alice],t);
 bet(alice,state.roundId,125,t+12);
 const dealt=blackjackSnapshot(alice,t+20000);
 // Handle the extremely rare dealer natural by using an ordinary new round in a future case.
 if(dealt.phase!=='playing')return;
 editState(state.roundId,game=>{
  game.players[0].hands[0].cards=[card('K'),card('9')];
  game.players[0].hands[0].done=false;game.players[0].hands[0].split=false;
  game.dealer=[card('10'),card('7')];game.shoe=[card('5')];
  game.cursor=0;game.handIndex=0;game.turnUser=alice;game.deadline=t+40000;game.seq++;
 });
 const before=balance(alice),current=blackjackSnapshot(alice,t+20001),key=randomUUID();
 const result=act(alice,state.roundId,'hit',current.seq,t+20002,key);
 assert.equal(result.phase,'settled');
 assert.equal(result.myResult.profit,-125);
 assert.equal(balance(alice),before);
 assert.equal(result.players[0].hands[0].outcome,'bust');
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_rounds WHERE game='blackjack'").count,1);
 act(alice,state.roundId,'hit',current.seq,t+20003,key);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_rounds WHERE game='blackjack'").count,1);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_transfers WHERE reason='blackjack.online.wager'").count,1);
});
test('Split and Double Down reserve distinct amounts with no duplicated requests',()=>{
 const t=5000000,state=start([alice],t);
 bet(alice,state.roundId,100,t+15);
 const dealt=blackjackSnapshot(alice,t+20000);
 if(dealt.phase!=='playing')return;
 editState(state.roundId,game=>{
  game.players[0].hands[0].cards=[card('8'),card('8','H')];
  game.players[0].hands[0].done=false;
  game.dealer=[card('10'),card('6')];game.shoe=[card('5'),card('6'),card('3'),card('4')];
  game.cursor=0;game.handIndex=0;game.turnUser=alice;game.deadline=t+40000;game.seq++;
 });
 let current=blackjackSnapshot(alice,t+20001);
 assert.ok(current.actions.includes('split'));
 const key=randomUUID();
 const split=act(alice,state.roundId,'split',current.seq,t+20002,key);
 assert.equal(split.players[0].hands.length,2);
 assert.equal(balance(alice),9800);
 act(alice,state.roundId,'split',current.seq,t+20003,key);
 assert.equal(balance(alice),9800);
 assert.equal(one('SELECT COUNT(*) AS count FROM online_game_entries WHERE round_id=?',state.roundId).count,2);
 current=blackjackSnapshot(alice,t+20004);
 assert.ok(current.actions.includes('double'));
 const doubled=act(alice,state.roundId,'double',current.seq,t+20005);
 assert.equal(balance(alice),9700);
 assert.equal(doubled.players[0].hands[0].wager,200);
 assert.equal(one('SELECT wager FROM online_game_entries WHERE round_id=? AND user_id=? AND entry_no=0',state.roundId,alice).wager,200);
});
test('Timed-out turns auto-stand and games settle even if clients disconnect',()=>{
 const t=6000000,state=start([alice,bob],t);
 bet(alice,state.roundId,100,t+9);
 bet(bob,state.roundId,125,t+10);
 let game=blackjackSnapshot(alice,t+20000);
 if(game.phase==='playing')game=blackjackSnapshot(alice,t+200000);
 assert.equal(game.phase,'settled');
 assert.equal(one('SELECT COUNT(*) AS count FROM online_game_entries WHERE round_id=?',state.roundId).count,2);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_rounds WHERE game='blackjack'").count,2);
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_transfers WHERE reason='blackjack.online.wager'").count,2);
 const before=balance(alice);
 blackjackTick(t+200001);
 assert.equal(balance(alice),before);
});
test('betting deadline cancels empty rounds without charging points',()=>{
 const t=7000000,state=start([alice],t);
 const ended=blackjackSnapshot(alice,t+20000);
 assert.equal(ended.phase,'cancelled');
 assert.equal(balance(alice),10000);
 assert.equal(one('SELECT COUNT(*) AS count FROM online_game_entries WHERE round_id=?',state.roundId).count,0);
 const next=blackjackSnapshot(alice,t+27000);
 assert.notEqual(next.roundId,state.roundId);
 assert.equal(next.phase,'betting');
});
