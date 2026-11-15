// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Private, persistent solo Blackjack. The secret shoe and dealer's hole card
// never appear in public Arcade rounds or client state until settlement.
// Wallet debits, state transitions and payouts are one SQLite transaction.
import {db,one,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {isCinematicWin} from './arcade-cinematic-rules.js';
import {
 BLACKJACK_MIN_WAGER,BLACKJACK_MAX_WAGER,
 makeBlackjackShoe,drawBlackjackCard,blackjackValue,
 blackjackNatural,blackjackAllowed,blackjackDealerPlay,blackjackPayout
} from './blackjack-rules.js';

export const SOLO_BLACKJACK_GAME='blackjack_solo';
const bad=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const validUser=id=>{
 const value=String(id||'');
 if(!/^[0-9]{15,22}$/.test(value))bad('Invalid Discord player.',400);
 return value;
};
const uuid=value=>{
 const key=String(value||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))
  bad('Invalid game request ID. Refresh the page and retry.',400);
 return key;
};
const integer=(value,min,max,label)=>{
 if(!/^[0-9]+$/.test(String(value??'')))bad('Invalid '+label+'.',400);
 const parsed=Number(value);
 if(!Number.isSafeInteger(parsed)||parsed<min||parsed>max)
  bad('Invalid '+label+'.',400);
 return parsed;
};
const wagerOf=raw=>integer(raw,BLACKJACK_MIN_WAGER,BLACKJACK_MAX_WAGER,'wager');
const roundOf=raw=>integer(raw,1,Number.MAX_SAFE_INTEGER,'round');
const versionOf=raw=>integer(raw,0,Number.MAX_SAFE_INTEGER,'revision');
const actions=new Set(['hit','stand','double','split']);
const wallet=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',
 config.guildId,user)?.balance||0;
const rowFor=(user,id)=>one("SELECT * FROM arcade_rounds WHERE guild_id=? AND id=? AND user_id=? AND game='blackjack_solo'",
 config.guildId,id,user);
const activeFor=user=>one("SELECT * FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game='blackjack_solo' AND status='active' ORDER BY id DESC LIMIT 1",
 config.guildId,user);
const latestFor=user=>one("SELECT * FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game='blackjack_solo' ORDER BY id DESC LIMIT 1",
 config.guildId,user);
const privateState=(user,id)=>{
 const record=one('SELECT state_json,revision FROM solo_blackjack_state WHERE round_id=? AND user_id=?',id,user);
 if(!record)bad('Blackjack hand state was not found.',404);
 return {game:JSON.parse(record.state_json),revision:record.revision};
};

db.exec("CREATE TABLE IF NOT EXISTS solo_blackjack_state ("+
 "round_id INTEGER PRIMARY KEY REFERENCES arcade_rounds(id) ON DELETE CASCADE,"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "state_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0));"+
 "CREATE INDEX IF NOT EXISTS idx_solo_blackjack_user ON solo_blackjack_state(user_id,round_id DESC);"+
 "CREATE TABLE IF NOT EXISTS solo_blackjack_actions ("+
 "request_key TEXT PRIMARY KEY,round_id INTEGER NOT NULL REFERENCES arcade_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "action TEXT NOT NULL,expected_revision INTEGER NOT NULL,created_at INTEGER NOT NULL);"+
 "CREATE INDEX IF NOT EXISTS idx_solo_blackjack_action_round ON solo_blackjack_actions(round_id,user_id);");

function safeDetails(game,terminal){
 const hands=game.hands.map(hand=>({
  cards:hand.cards,wager:hand.wager,split:hand.split,done:hand.done,
  doubled:!!hand.doubled,
  ...(terminal?{outcome:hand.outcome,payout:hand.payout}:{})
 }));
 return {
  initialWager:game.initialWager,hands,activeIndex:terminal?null:game.activeIndex,
  dealer:terminal?game.dealer:[game.dealer[0],{back:true}],
  ...(terminal?{dealerValue:blackjackValue(game.dealer)}:{})
 };
}
function persist(user,round,game,revision,terminal=false,totals=null){
 run('UPDATE solo_blackjack_state SET state_json=?,revision=? WHERE round_id=? AND user_id=?',
  JSON.stringify(game),revision,round.id,user);
 if(terminal){
  run("UPDATE arcade_rounds SET status=?,wager=?,payout=?,details_json=?,updated_at=? "+
   "WHERE id=? AND guild_id=? AND user_id=? AND game='blackjack_solo' AND status='active'",
   totals.status,totals.wager,totals.payout,JSON.stringify(safeDetails(game,true)),
   Date.now(),round.id,config.guildId,user);
 }else{
  run("UPDATE arcade_rounds SET wager=?,details_json=?,updated_at=? "+
   "WHERE id=? AND guild_id=? AND user_id=? AND game='blackjack_solo' AND status='active'",
   game.hands.reduce((sum,hand)=>sum+hand.wager,0),
   JSON.stringify(safeDetails(game,false)),Date.now(),round.id,config.guildId,user);
 }
}
function settle(user,round,game,revision){
 const naturalDealer=game.dealer.length===2&&blackjackValue(game.dealer).total===21;
 if(!naturalDealer&&game.hands.some(hand=>blackjackValue(hand.cards).total<=21))
  blackjackDealerPlay(game.dealer,game.shoe);
 let wager=0,payout=0;
 for(const hand of game.hands){
  const result=blackjackPayout(hand,game.dealer);
  hand.done=true;hand.outcome=result.outcome;hand.payout=result.payout;
  wager+=hand.wager;payout+=hand.payout;
 }
 if(payout)walletChange(user,payout,'blackjack.solo.payout','solo-blackjack:payout:'+round.id);
 game.shoe=[]; // Do not retain unused hidden cards after the game finishes.
 game.activeIndex=null;
 const status=payout>wager?'won':payout===wager?'push':'lost';
 persist(user,round,game,revision,true,{status,wager,payout});
}
function nextHand(game){
 const from=game.activeIndex;
 for(let i=from;i<game.hands.length;i++){
  if(!game.hands[i].done){game.activeIndex=i;return true;}
 }
 game.activeIndex=null;
 return false;
}
function project(user,round){
 const balance=wallet(user);
 const otherActive=activeFor(user);
 const previous=latestFor(user);
 let lastWager=50,lastWagerAt=0;
 if(previous){
  const d=JSON.parse(previous.details_json||'{}');
  if(Number.isSafeInteger(d.initialWager))lastWager=d.initialWager;
  lastWagerAt=previous.created_at;
 }
 if(!round)return {
  phase:'ready',roundId:null,revision:0,balance,lastWager,lastWagerAt,activeRoundId:null,
  initialWager:0,wager:0,payout:0,profit:null,status:null,
  dealer:[],dealerValue:null,hands:[],activeIndex:null,
  actions:[],canBet:balance>=BLACKJACK_MIN_WAGER,cinematic:false
 };
 const {game,revision}=privateState(user,round.id);
 const active=round.status==='active';
 const hand=active?game.hands[game.activeIndex]:null;
 return {
  phase:active?'playing':'settled',roundId:round.id,revision,
  balance,lastWager,lastWagerAt,activeRoundId:otherActive?.id||null,
  createdAt:round.created_at,settledAt:active?null:round.updated_at,
  initialWager:game.initialWager,wager:round.wager,payout:round.payout,
  profit:active?null:round.payout-round.wager,status:active?null:round.status,
  // Never include the remaining shoe or unrevealed dealer card in JSON.
  dealer:active?[game.dealer[0],{back:true}]:game.dealer,
  dealerValue:active?null:blackjackValue(game.dealer),
  hands:game.hands.map(h=>({
   cards:h.cards,value:blackjackValue(h.cards),wager:h.wager,
   split:h.split,done:h.done,doubled:!!h.doubled,
   outcome:active?null:h.outcome,payout:active?null:h.payout
  })),
  activeIndex:active?game.activeIndex:null,
  actions:hand?blackjackAllowed(hand,{hands:game.hands},balance):[],
  canBet:!active&&!otherActive&&balance>=BLACKJACK_MIN_WAGER,
  cinematic:!active&&isCinematicWin(round)
 };
}
export function soloBlackjackSnapshot(userId,selectedId=null){
 const user=validUser(userId);
 let round;
 if(selectedId!==null&&selectedId!=='') {
  const id=roundOf(selectedId);
  round=rowFor(user,id);
  if(!round)bad('Blackjack hand not found.',404);
 }else round=activeFor(user)||latestFor(user);
 return project(user,round||null);
}
export function soloBlackjackStart(userId,fields,shoeOverride=null){
 const user=validUser(userId);
 const wager=wagerOf(fields?.wager),key=uuid(fields?.request_id);
 return transaction(()=>{
  const old=one('SELECT * FROM arcade_rounds WHERE request_key=?',key);
  if(old){
   if(old.user_id!==user||old.guild_id!==config.guildId||old.game!==SOLO_BLACKJACK_GAME||
    JSON.parse(old.details_json||'{}').initialWager!==wager)
    bad('This request ID was already used.',409);
   return old.id;
  }
  if(one('SELECT 1 FROM arcade_challenges WHERE request_key=?',key)||
     one('SELECT 1 FROM solo_blackjack_actions WHERE request_key=?',key))
   bad('This request ID was already used.',409);
  if(activeFor(user))bad('Finish your current Blackjack hand before starting another.',409);
  walletChange(user,-wager,'blackjack.solo.wager','solo-blackjack:wager:'+key);
  // A new cryptographically shuffled six-deck shoe for each solo game.
  const shoe=shoeOverride?[...shoeOverride]:makeBlackjackShoe();
  const game={
   initialWager:wager,shoe,dealer:[],hands:[
    {cards:[],wager,done:false,split:false,doubled:false,payout:0,outcome:null}
   ],activeIndex:0
  };
  // Alternating deal: player, dealer, player, dealer.
  game.hands[0].cards.push(drawBlackjackCard(game.shoe));
  game.dealer.push(drawBlackjackCard(game.shoe));
  game.hands[0].cards.push(drawBlackjackCard(game.shoe));
  game.dealer.push(drawBlackjackCard(game.shoe));
  const first=game.hands[0];
  const natural=blackjackNatural(first);
  if(natural)first.done=true;
  const houseNatural=blackjackValue(game.dealer).total===21;
  const now=Date.now();
  const id=Number(run("INSERT INTO arcade_rounds "+
   "(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) "+
   "VALUES(?,?,?, ?,0,'active',?,?,?,?)",
   config.guildId,user,SOLO_BLACKJACK_GAME,wager,
   JSON.stringify(safeDetails(game,false)),key,now,now).lastInsertRowid);
  run('INSERT INTO solo_blackjack_state(round_id,user_id,state_json,revision) VALUES(?,?,?,0)',
   id,user,JSON.stringify(game));
  const round={id,status:'active',wager};
  if(natural||houseNatural)settle(user,round,game,1);
  return id;
 });
}
export function soloBlackjackAction(userId,fields){
 const user=validUser(userId);
 const id=roundOf(fields?.round_id),revision=versionOf(fields?.revision);
 // Avoid an <input name="action"> that clobbers HTMLFormElement.action
 // in browsers. Accept legacy POSTs from already-open tabs.
 const action=String(fields?.move??fields?.action??''),key=uuid(fields?.request_id);
 if(!actions.has(action))bad('Unsupported Blackjack action.',400);
 return transaction(()=>{
  const original=one('SELECT round_id,user_id,action,expected_revision FROM solo_blackjack_actions WHERE request_key=?',key);
  if(original){
   if(original.user_id!==user||original.round_id!==id||original.action!==action||
      original.expected_revision!==revision)
    bad('This request ID was already used.',409);
   return id; // Safe duplicate: never withdraw or draw twice.
  }
  const round=rowFor(user,id);
  if(!round)bad('Blackjack hand not found.',404);
  if(round.status!=='active')bad('This Blackjack hand has already finished.',409);
  const record=privateState(user,id);
  if(record.revision!==revision)bad('Your hand changed in another tab. Refresh to see the latest cards.',409);
  const game=record.game,hand=game.hands[game.activeIndex];
  if(!hand)bad('No playable hand is active.',409);
  if(!blackjackAllowed(hand,{hands:game.hands},wallet(user)).includes(action))
   bad('That action is not available for this hand.',409);
  if(action==='hit'){
   hand.cards.push(drawBlackjackCard(game.shoe));
   if(blackjackValue(hand.cards).total>=21)hand.done=true;
  }else if(action==='stand')hand.done=true;
  else if(action==='double'){
   walletChange(user,-hand.wager,'blackjack.solo.double','solo-blackjack:double:'+key);
   hand.wager*=2;hand.doubled=true;
   hand.cards.push(drawBlackjackCard(game.shoe));hand.done=true;
  }else if(action==='split'){
   walletChange(user,-hand.wager,'blackjack.solo.split','solo-blackjack:split:'+key);
   const [left,right]=hand.cards;
   const first={cards:[left,drawBlackjackCard(game.shoe)],
    wager:hand.wager,done:left.rank==='A',split:true,doubled:false,payout:0,outcome:null};
   const second={cards:[right,drawBlackjackCard(game.shoe)],
    wager:hand.wager,done:right.rank==='A',split:true,doubled:false,payout:0,outcome:null};
   // A split hand reaching 21 automatically stands, but does NOT count as
   // a natural blackjack for the 3:2 payout.
   first.done=first.done||blackjackValue(first.cards).total===21;
   second.done=second.done||blackjackValue(second.cards).total===21;
   game.hands=[first,second];game.activeIndex=0;
  }
  run("INSERT INTO solo_blackjack_actions(request_key,round_id,user_id,action,expected_revision,created_at) "+
   "VALUES(?,?,?,?,?,?)",key,id,user,action,revision,Date.now());
  const nextRevision=revision+1;
  if(!nextHand(game))settle(user,round,game,nextRevision);
  else persist(user,round,game,nextRevision);
  return id;
 });
}
