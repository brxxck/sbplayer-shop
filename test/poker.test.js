// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pokerSuggestedPlay} from '../src/poker-advice.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-poker-'));
const guild='100000000000000001',alice='100000000000000401',bob='100000000000000402',outsider='100000000000000403',dave='100000000000000404',eve='100000000000000405',frank='100000000000000406',grace='100000000000000407',hugo='100000000000000408';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'poker.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,run}=await import('../src/db.js');
await import('../src/level-points.js');
const poker=await import('../src/poker.js');
const {pokerRank,pokerPots,pokerDeck,compareRanks}=await import('../src/poker-rules.js');
for(const id of [alice,bob,outsider,dave,eve,frank,grace,hugo]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,'user-'+id,id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,10000,0)',guild,id);
}
const balance=id=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,id)?.balance||0;
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});
test('Poker evaluates royal flush, wheel, full house and card comparisons correctly',()=>{
 assert.deepEqual(pokerRank(['As','Ks','Qs','Js','Ts']),[8,14]);
 assert.deepEqual(pokerRank(['As','2d','3h','4c','5s']),[4,5]);
 assert.deepEqual(pokerRank(['Ah','Ac','Ad','Ks','Kh','5c','2d']).slice(0,3),[6,14,13]);
 assert.deepEqual(pokerRank(['Ah','Ac','Ad','As','Kh','5c','2d']).slice(0,3),[7,14,13]);
 assert.equal(compareRanks(pokerRank(['As','Ks','Qs','Js','Ts']),pokerRank(['Ah','Kh','Qh','Jh','9h'])),1);
 const deck=pokerDeck();assert.equal(deck.length,52);assert.equal(new Set(deck).size,52);
});
test('Poker Suggested Play considers visible cards, public pot and legal moves only',()=>{
 const base={board:[],pot:250,toCall:0,minRaise:200,maxRaiseTo:10000,street:0,canRaise:true};
 const strong=pokerSuggestedPlay({...base,cards:['As','Ah']});
 assert.deepEqual([strong.action,strong.raiseTo,strong.label],['raise',200,'Raise to 200 pts']);
 const weak=pokerSuggestedPlay({...base,cards:['2c','7h'],toCall:500,pot:200});
 assert.equal(weak.action,'fold');
 assert.match(weak.reason,/Folding avoids risking/);
 const noCost=pokerSuggestedPlay({...base,cards:['2c','7h']});
 assert.equal(noCost.action,'check','never suggest fold when checking is free');
 const noRaise=pokerSuggestedPlay({...base,cards:['As','Ah'],canRaise:false});
 assert.equal(noRaise.action,'check','no unavailable raise suggestion');
 const call=pokerSuggestedPlay({...base,cards:['As','Ah'],toCall:100,pot:200,canRaise:false});
 assert.equal(call.action,'call');
 assert.equal(call.label,'Call 100 pts');
 const paired=pokerSuggestedPlay({...base,cards:['Ah','Qd'],board:['As','8c','4h'],
  toCall:50,pot:500});
 assert.equal(paired.action,'call');
 assert.equal(paired.hand,'Top pair');
 const sharedBoard=pokerSuggestedPlay({...base,cards:['2d','7c'],
  board:['As','Ks','Qs','Js','Ts'],toCall:500,pot:150});
 assert.equal(sharedBoard.action,'fold','a royal flush on the board is not private strength');
 assert.equal(sharedBoard.hand,'Hand shared by the board');
 assert.equal(pokerSuggestedPlay({...base,cards:['As','As']}),null,'duplicated cards are invalid');
 assert.ok(!JSON.stringify(strong).includes('secret'));
});
test('Only acting Poker player receives the suggested move; spectators never get one',()=>{
 const hintTable=poker.pokerCreate(frank,{mode:'public'});
 const second=grace;
 poker.pokerJoin(second,hintTable.tableId);
 const firstState=poker.pokerState(frank,hintTable.tableId);
 const acting=firstState.hand.players.find(p=>p.turn);
 assert.ok(acting);
 const current=poker.pokerState(acting.id,hintTable.tableId);
 assert.ok(current.hand.myTurn);
 assert.ok(current.hand.suggestedPlay);
 assert.ok(['check','call','raise','fold'].includes(current.hand.suggestedPlay.action));
 const nonActor=[frank,grace].find(x=>x!==acting.id);
 const waiting=poker.pokerState(nonActor,hintTable.tableId);
 assert.equal(waiting.hand.suggestedPlay,null);
 const spectator=poker.pokerState(outsider,hintTable.tableId);
 assert.equal(spectator.hand.suggestedPlay,null);
 assert.equal(spectator.hand.myCards.length,0);
 assert.ok(spectator.hand.players.every(p=>p.cards.length===0));
});
test('Poker table includes a display-only Suggested Play card',async()=>{
 const {pokerTablePage}=await import('../src/poker-views.js');
 const table=poker.pokerCreate(hugo,{mode:'solo',bots:'1'});
 const current=poker.pokerState(hugo,table.tableId);
 const markup=pokerTablePage({user:{id:hugo},pathname:'/arcade/poker/table/'+current.id,csrf:'test',
  arcadeFragment:true},current);
 assert.match(markup,/SUGGESTED PLAY/);
 assert.match(markup,/data-poker-suggestion-action/);
 assert.match(markup,/You decide what to play/);
 assert.doesNotMatch(markup,/data-poker-suggest-apply/);
});

test('Poker divides side pots by eligible contributions without inventing points',()=>{
 const result=pokerPots([
  {id:'a',contributed:100,folded:false,cards:['Ah','Ac']},
  {id:'b',contributed:300,folded:false,cards:['Kh','Kc']},
  {id:'c',contributed:300,folded:false,cards:['Qh','Qc']}
 ],['As','Kd','3c','9h','2s']);
 assert.deepEqual(result.payouts,{a:300,b:400,c:0});
 assert.equal(result.pot,700);
});
test('Solo Poker creates medium bots and debits website points only for committed blinds',()=>{
 const created=poker.pokerCreate(alice,{mode:'solo',bots:'3'});
 assert.ok(created.tableId);
 const first=poker.pokerState(alice,created.tableId);
 assert.equal(first.mode,'solo');assert.equal(first.bots,3);
 assert.equal(first.hand.players.length,4);
 assert.equal(first.hand.myCards.length,2);
 assert.equal(first.hand.players.filter(p=>p.bot).length,3);
 assert.equal(first.hand.players.find(p=>p.id===alice).cards.length,2);
 assert.equal(Object.hasOwn(first.hand,'deck'),false);
 assert.equal(balance(alice),first.balance);
 assert.ok(balance(alice)<=10000&&balance(alice)>=9900);
 assert.equal(first.hand.phase,'preflop');
 assert.ok(first.hand.seq>0);
});
test('Live Poker has separate secret hole cards, real seats and no conversion wallet',()=>{
 const table=poker.pokerCreate(bob,{mode:'public'});
 assert.equal(poker.pokerJoin(outsider,table.tableId).seated,2);
 const owner=poker.pokerState(bob,table.tableId);
 const other=poker.pokerState(outsider,table.tableId);
 assert.equal(owner.joined,true);assert.equal(other.joined,true);
 assert.equal(other.hand.players.length,2);
 assert.equal(owner.hand.myCards.length,2);
 assert.equal(owner.hand.players.find(p=>p.id===outsider).cards.length,0,'opponent hole cards must stay hidden');
 assert.equal(other.hand.players.find(p=>p.id===bob).cards.length,0);
 assert.equal(owner.hand.players.find(p=>p.id===bob).cards.length,2);
 assert.ok(owner.hand.turnEndsAt>=owner.serverTime);
 assert.equal(Object.hasOwn(owner,'inviteCode'),false);
 const spectators=poker.pokerState(alice,table.tableId);
 assert.ok(spectators.hand.players.every(p=>p.cards.length===0),'spectators cannot see unrevealed cards');
 assert.equal(spectators.joined,false);
});
test('Private rooms require code, bound seats, configurable blinds and do not expose cards',()=>{
 const host=alice;
 poker.pokerSitOut(host,poker.pokerLobby(host).activeTable,true);
 poker.pokerLeave(host,poker.pokerLobby(host).activeTable);
 // The current solo hand remains protected; use another member as private host instead.
 const creator=bob;
 assert.throws(()=>poker.pokerCreate(creator,{mode:'private',seats:'4'}),e=>e.status===409);
 const room=poker.pokerCreate(eve,{mode:'private',seats:'4',small_blind:'25',big_blind:'50'});
 assert.ok(room.code.length===8);
 assert.throws(()=>poker.pokerState(bob,room.tableId),e=>e.status===403);
 assert.throws(()=>poker.pokerJoin(bob,room.tableId,'BADCODE'),e=>e.status===403);
 assert.equal(poker.pokerState(eve,room.tableId).inviteCode,room.code);
 assert.equal(poker.pokerState(dave,room.tableId,room.code).joined,false);
 assert.equal(poker.pokerJoin(dave,room.tableId,room.code).mode,'private');
 const state=poker.pokerState(dave,room.tableId);
 assert.equal(state.smallBlind,25);assert.equal(state.bigBlind,50);assert.equal(state.seats,4);
});
test('Poker turn actions are transactional, sequence-checked and idempotent',()=>{
 const table=poker.pokerLobby(bob).activeTable;
 const state=poker.pokerState(bob,table);
 // This table has two real players; one of them must have the first action.
 const actor=state.hand.players.find(p=>p.turn);
 assert.ok(actor&&!actor.bot);
 const user=actor.id,hand=state.hand;
 const action=hand.toCall===0?'check':'call';
 const input={action,hand_id:hand.id,seq:String(hand.seq),request_id:randomUUID()};
 const before=balance(user);
 const first=poker.pokerAction(user,table,input);
 assert.ok(first.hand);
 const afterFirst=balance(user);
 assert.ok(afterFirst<=before);
 const duplicate=poker.pokerAction(user,table,input);
 assert.equal(balance(user),afterFirst,'duplicate action never spends points twice');
 assert.equal(duplicate.id,table);
 assert.throws(()=>poker.pokerAction(user,table,{...input,request_id:randomUUID()}),e=>e.status===409);
});
