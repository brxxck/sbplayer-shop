// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Transactional shared Blackjack engine. Four pinned seats, one dealer,
// simultaneous betting followed by strictly ordered player decisions.
// The shoe and dealer hole card never appear in client-visible snapshots.
import {randomUUID} from 'node:crypto';
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {isCinematicWin} from './arcade-cinematic-rules.js';
import {ONLINE_LOBBY_STALE_MS,BLACKJACK_SEATS} from './online-games.js';
import {
 BLACKJACK_MIN_WAGER,BLACKJACK_MAX_WAGER,BLACKJACK_BET_MS,
 BLACKJACK_TURN_MS,BLACKJACK_BREAK_MS,makeBlackjackShoe,
 drawBlackjackCard,blackjackValue,blackjackNatural,blackjackCanSplit,
 blackjackAllowed,blackjackDealerPlay,blackjackPayout
} from './blackjack-rules.js';

const bad=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const validUser=id=>{
 const v=String(id||'');
 if(!/^[0-9]{15,22}$/.test(v))bad('Invalid Discord player.',400);
 return v;
};
const timeOf=now=>{
 if(!Number.isSafeInteger(now)||now<0)bad('Invalid game clock.',400);
 return now;
};
const uuid=value=>{
 const key=String(value||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))
  bad('Invalid request ID. Refresh and try again.',400);
 return key;
};
const whole=(value,min,max,label)=>{
 if(!/^[0-9]+$/.test(String(value??'')))bad('Invalid '+label+'.',400);
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max)bad('Invalid '+label+'.',400);
 return n;
};
const latest=()=>one("SELECT * FROM online_game_rounds WHERE guild_id=? AND game='blackjack' ORDER BY id DESC LIMIT 1",config.guildId);
const load=round=>round?JSON.parse(round.result_json||'{}'):null;
const put=(round,game,status=round.status,endsAt=round.ends_at)=>{
 run('UPDATE online_game_rounds SET status=?,result_json=?,ends_at=? WHERE id=? AND guild_id=?',
  status,JSON.stringify(game),endsAt,round.id,config.guildId);
};
const request=(key,roundId,userId,action)=>one(
 'SELECT round_id,user_id,action FROM online_blackjack_requests WHERE request_key=?',key
);
const checkRequest=(key,roundId,userId,action)=>{
 const original=request(key);
 if(!original)return false;
 if(original.round_id!==roundId||original.user_id!==userId||original.action!==action)
  bad('Request ID was already used for a different action.');
 return true;
};
const recordRequest=(key,roundId,userId,action,now)=>run(
 'INSERT INTO online_blackjack_requests(request_key,round_id,user_id,action,created_at) VALUES(?,?,?,?,?)',
 key,roundId,userId,action,now
);

db.exec("CREATE TABLE IF NOT EXISTS online_blackjack_requests ("+
 "request_key TEXT PRIMARY KEY,round_id INTEGER NOT NULL REFERENCES online_game_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,created_at INTEGER NOT NULL);"+
 "CREATE INDEX IF NOT EXISTS idx_online_blackjack_requests_round ON online_blackjack_requests(round_id,user_id);");

function nextRound(now){
 run('DELETE FROM online_game_waiting WHERE guild_id=? AND game=? AND last_seen_at<?',
  config.guildId,'blackjack',now-ONLINE_LOBBY_STALE_MS);
 const seats=all("SELECT user_id FROM online_game_waiting WHERE guild_id=? AND game='blackjack' "+
  "ORDER BY joined_at,user_id LIMIT ?",config.guildId,BLACKJACK_SEATS).map(x=>x.user_id);
 if(!seats.length)return null;
 const state={version:1,seq:0,seats,players:[],dealer:[],shoe:[],cursor:0,handIndex:0,
  turnUser:null,deadline:null,lastEvent:{type:'betting',at:now}};
 run("INSERT INTO online_game_rounds(guild_id,game,status,created_at,starts_at,result_json) "+
  "VALUES(?,'blackjack','betting',?,?,?)",config.guildId,now,now+BLACKJACK_BET_MS,JSON.stringify(state));
 return latest();
}

function chooseTurn(game,at){
 for(let i=game.cursor;i<game.players.length;i++){
  const person=game.players[i];
  const start=i===game.cursor?game.handIndex:0;
  for(let h=start;h<person.hands.length;h++){
   if(person.hands[h].done)continue;
   game.cursor=i;game.handIndex=h;game.turnUser=person.userId;
   game.deadline=at+BLACKJACK_TURN_MS;
   return true;
  }
 }
 game.turnUser=null;game.deadline=null;
 return false;
}

function settleRound(round,game,now){
 const dealerHasNatural=game.dealer.length===2&&blackjackValue(game.dealer).total===21;
 if(!dealerHasNatural&&game.players.some(person=>person.hands.some(hand=>blackjackValue(hand.cards).total<=21)))
  blackjackDealerPlay(game.dealer,game.shoe);
 for(const person of game.players){
  let totalWager=0,totalPayout=0;
  for(let h=0;h<person.hands.length;h++){
   const hand=person.hands[h];
   const result=blackjackPayout(hand,game.dealer);
   hand.done=true;hand.payout=result.payout;hand.outcome=result.outcome;
   totalWager+=hand.wager;totalPayout+=result.payout;
   run("UPDATE online_game_entries SET wager=?,payout=? WHERE round_id=? AND user_id=? AND entry_no=?",
    hand.wager,hand.payout,round.id,person.userId,h);
   if(hand.payout)walletChange(person.userId,hand.payout,'blackjack.online.payout',
    'blackjack:payout:'+round.id+':'+person.userId+':'+h);
  }
  // A summarized completed round keeps existing Arcade stats/history coherent.
  const details={tableRound:round.id,dealer:game.dealer,
   hands:person.hands.map(hand=>({cards:hand.cards,wager:hand.wager,payout:hand.payout,outcome:hand.outcome}))};
  run("INSERT OR IGNORE INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) "+
   "VALUES(?,?,'blackjack',?,?,?,?,?,?,?)",config.guildId,person.userId,totalWager,totalPayout,
   totalPayout>totalWager?'won':totalPayout===totalWager?'push':'lost',
   JSON.stringify(details),'blackjack:round:'+round.id+':'+person.userId,round.created_at,now);
 }
 game.seq++;
 game.lastEvent={type:'settled',at:now};
 game.turnUser=null;game.deadline=null;game.shoe=[]; // Never persist cards unnecessarily after settlement.
 put(round,game,'settled',now);
}

function beginDealing(round,now,shoeOverride=null){
 const game=load(round);
 const bets=all('SELECT user_id,wager FROM online_game_entries WHERE round_id=? AND entry_no=0 ORDER BY user_id',round.id);
 game.players=game.seats.filter(id=>bets.some(b=>b.user_id===id)).map(id=>{
  const wager=bets.find(b=>b.user_id===id).wager;
  return {userId:id,seat:game.seats.indexOf(id)+1,hands:[{cards:[],wager,done:false,split:false,payout:0,outcome:null}]};
 });
 if(!game.players.length){
  game.seq++;game.lastEvent={type:'no_bets',at:now};
  put(round,game,'cancelled',now);
  return;
 }
 game.shoe=shoeOverride||makeBlackjackShoe();
 game.dealer=[];
 // Deal alternates players and dealer so every seat shares one genuine shoe.
 for(let card=0;card<2;card++){
  for(const player of game.players)player.hands[0].cards.push(drawBlackjackCard(game.shoe));
  game.dealer.push(drawBlackjackCard(game.shoe));
 }
 for(const player of game.players){
  if(blackjackNatural(player.hands[0]))player.hands[0].done=true;
 }
 game.seq++;game.lastEvent={type:'deal',at:now};
 const houseNatural=game.dealer.length===2&&blackjackValue(game.dealer).total===21;
 if(houseNatural||!chooseTurn(game,now))settleRound(round,game,now);
 else put(round,game,'playing');
}

function tickInside(now){
 let round=latest();
 if(!round){
  return nextRound(now);
 }
 if(['settled','cancelled'].includes(round.status)){
  if(now<(round.ends_at||round.created_at)+BLACKJACK_BREAK_MS)return round;
  return nextRound(now)||round;
 }
 if(round.status==='betting'&&now>=round.starts_at){
  beginDealing(round,now);
  return latest();
 }
 if(round.status!=='playing')return round;
 const game=load(round);
 let processed=0;
 while(game.turnUser&&game.deadline!==null&&now>=game.deadline&&processed<8){
  const player=game.players[game.cursor],hand=player.hands[game.handIndex];
  const expiredAt=game.deadline;
  hand.done=true;
  hand.autoStood=true;
  game.seq++;game.lastEvent={type:'timeout',userId:player.userId,handIndex:game.handIndex,at:expiredAt};
  game.handIndex++;
  if(!chooseTurn(game,expiredAt)){settleRound(round,game,now);return latest();}
  processed++;
 }
 if(processed)put(round,game);
 return latest();
}

function project(round,userId,now){
 const seatRows=all("SELECT user_id,joined_at FROM online_game_waiting WHERE guild_id=? AND game='blackjack' ORDER BY joined_at,user_id",
  config.guildId);
 const place=seatRows.findIndex(row=>row.user_id===userId);
 const balance=one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,userId)?.balance||0;
 const lastWager=one('SELECT wager FROM online_game_entries WHERE user_id=? AND entry_no=0 ORDER BY round_id DESC LIMIT 1',userId)?.wager||50;
 if(!round)return {serverTime:now,phase:'waiting',roundId:null,players:[],dealer:[],balance,seat:place+1||null,
  joined:place>=0,canBet:false,actions:[],roundWager:0,roundPlayers:0,lastWager};
 const game=load(round);
 const betting=round.status==='betting',playing=round.status==='playing',finished=['settled','cancelled'].includes(round.status);
 const dealer=playing?[game.dealer[0],{back:true}]:finished?game.dealer:[];
 const participants=Object.fromEntries(game.players.map(person=>[person.userId,person]));
 const bets=all('SELECT user_id,entry_no,wager,payout FROM online_game_entries WHERE round_id=?',round.id);
 const profileIds=game.seats;
 const names=new Map();
 for(const id of profileIds){
  const row=one('SELECT username,display_name FROM users WHERE id=?',id);
  names.set(id,row?.display_name||row?.username||'Member');
 }
 const players=game.seats.map((id,index)=>{
  const p=participants[id],first=bets.find(b=>b.user_id===id&&b.entry_no===0);
  return {userId:id,name:names.get(id),seat:index+1,bet:first?.wager||0,
   hands:p?p.hands.map(hand=>({...hand,value:blackjackValue(hand.cards)})):[],
   active:game.turnUser===id,seatCurrent:place>=0&&id===userId};
 });
 const me=participants[userId]||null;
 const myBet=bets.find(b=>b.user_id===userId&&b.entry_no===0);
 const hand=me&&playing&&game.turnUser===userId?me.hands[game.handIndex]:null;
 const actions=hand?blackjackAllowed(hand,me,balance):[];
 const myTotalWager=me?me.hands.reduce((s,h)=>s+h.wager,0):0;
 const myPayout=finished&&me?me.hands.reduce((s,h)=>s+(h.payout||0),0):0;
 const totalWager=bets.reduce((s,x)=>s+x.wager,0);
 return {
  serverTime:now,roundId:round.id,phase:round.status,seq:game.seq,
  startsAt:round.starts_at,endsAt:round.ends_at,turnDeadline:game.deadline,
  turnUser:game.turnUser,handIndex:game.handIndex,dealAt:round.starts_at,
  seats:BLACKJACK_SEATS,joined:place>=0,seat:place>=0?place+1:null,
  reserved:game.seats.includes(userId),canBet:betting&&place>=0&&game.seats.includes(userId)&&!myBet,
  placedBet:betting?myBet?.wager||0:0,
  players,dealer,dealerValue:finished?blackjackValue(game.dealer):null,
  roundPlayers:game.players.length||(betting?bets.filter(x=>x.entry_no===0).length:0),
  roundWager:totalWager,balance,lastWager,actions,
  myResult:finished&&me?{
   wager:myTotalWager,payout:myPayout,profit:myPayout-myTotalWager,
   winning:myPayout>myTotalWager,settledAt:round.ends_at,
   cinematic:isCinematicWin({status:myPayout>myTotalWager?'won':'lost',wager:myTotalWager,payout:myPayout}),
   roundId:round.id
  }:null,
  lastEvent:game.lastEvent,waiting:Math.max(0,place-BLACKJACK_SEATS+1)
 };
}

export function blackjackSnapshot(userId,now=Date.now()){
 const user=validUser(userId),at=timeOf(now);
 return transaction(()=>project(tickInside(at),user,at));
}
export function blackjackTick(now=Date.now()){
 const at=timeOf(now);
 return transaction(()=>{const round=tickInside(at);return round?{id:round.id,status:round.status}:null;});
}

export function blackjackBet(userId,fields,now=Date.now()){
 const user=validUser(userId),at=timeOf(now);
 const wager=whole(fields?.wager,BLACKJACK_MIN_WAGER,BLACKJACK_MAX_WAGER,'wager');
 const roundId=whole(fields?.round_id,1,Number.MAX_SAFE_INTEGER,'round');
 const key=uuid(fields?.request_id);
 return transaction(()=>{
  const round=tickInside(at);
  if(checkRequest(key,roundId,user,'bet'))return project(latest(),user,at);
  if(!round||round.id!==roundId||round.status!=='betting')bad('Betting has closed. Join the next round.');
  const game=load(round);
  const membership=one("SELECT 1 FROM online_game_waiting WHERE guild_id=? AND game='blackjack' AND user_id=? AND last_seen_at>=?",
    config.guildId,user,at-ONLINE_LOBBY_STALE_MS);
  if(!membership||!game.seats.includes(user))bad('You are not seated for this round.');
  if(one('SELECT 1 FROM online_game_entries WHERE round_id=? AND user_id=?',round.id,user))bad('You already placed a wager on this round.');
  walletChange(user,-wager,'blackjack.online.wager','blackjack:wager:'+round.id+':'+user);
  run('INSERT INTO online_game_entries(round_id,user_id,entry_no,wager,payout) VALUES(?,?,0,?,0)',round.id,user,wager);
  recordRequest(key,round.id,user,'bet',at);
  game.seq++;game.lastEvent={type:'bet',userId:user,at};
  put(round,game);
  return project(latest(),user,at);
 });
}

export function blackjackAction(userId,fields,now=Date.now()){
 const user=validUser(userId),at=timeOf(now);
 const action=String(fields?.action||'');
 if(!['hit','stand','double','split'].includes(action))bad('Unknown Blackjack action.',400);
 const roundId=whole(fields?.round_id,1,Number.MAX_SAFE_INTEGER,'round'),key=uuid(fields?.request_id);
 const expected=whole(fields?.seq,0,1000000,'table version');
 return transaction(()=>{
  const round=tickInside(at);
  if(checkRequest(key,roundId,user,action))return project(latest(),user,at);
  if(!round||round.id!==roundId||round.status!=='playing')bad('This Blackjack round is no longer accepting actions.');
  const game=load(round);
  if(game.seq!==expected)bad('The table has changed. Your cards have been refreshed.');
  if(game.turnUser!==user)bad('It is not your turn.');
  const person=game.players[game.cursor],hand=person.hands[game.handIndex];
  const balance=one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,user)?.balance||0;
  if(!blackjackAllowed(hand,person,balance).includes(action))bad('That action is not available for this hand.');
  const oldHandIndex=game.handIndex;
  if(action==='hit'){
   hand.cards.push(drawBlackjackCard(game.shoe));
   if(blackjackValue(hand.cards).total>=21)hand.done=true;
  }else if(action==='stand')hand.done=true;
  else if(action==='double'){
   walletChange(user,-hand.wager,'blackjack.online.double','blackjack:double:'+round.id+':'+user+':'+game.handIndex);
   hand.wager*=2;
   run('UPDATE online_game_entries SET wager=? WHERE round_id=? AND user_id=? AND entry_no=?',
    hand.wager,round.id,user,game.handIndex);
   hand.cards.push(drawBlackjackCard(game.shoe));
   hand.doubled=true;hand.done=true;
  }else{
   const [first,second]=hand.cards;
   const cost=hand.wager;
   walletChange(user,-cost,'blackjack.online.split','blackjack:split:'+round.id+':'+user);
   const a={cards:[first,drawBlackjackCard(game.shoe)],wager:cost,done:first.rank==='A',split:true,payout:0,outcome:null};
   const b={cards:[second,drawBlackjackCard(game.shoe)],wager:cost,done:second.rank==='A',split:true,payout:0,outcome:null};
   // A 21 made after a split automatically stands; split aces draw one card each.
   a.done=a.done||blackjackValue(a.cards).total===21;
   b.done=b.done||blackjackValue(b.cards).total===21;
   person.hands=[a,b];
   run('INSERT INTO online_game_entries(round_id,user_id,entry_no,wager,payout) VALUES(?,?,1,?,0)',round.id,user,cost);
  }
  recordRequest(key,round.id,user,action,at);
  game.seq++;game.lastEvent={type:action,userId:user,handIndex:oldHandIndex,at};
  const current=person.hands[game.handIndex];
  if(current.done){
   game.handIndex++;
   if(!chooseTurn(game,at)){settleRound(round,game,at);return project(latest(),user,at);}
  }else game.deadline=at+BLACKJACK_TURN_MS;
  put(round,game);
  return project(latest(),user,at);
 });
}
