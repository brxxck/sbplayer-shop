// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Website-wide, server-authoritative Crash. One round per Discord guild,
// open betting, synchronized flight, persistent wagers and atomic payouts.
// The committed server seed and hidden crash time are NEVER exposed before settlement.
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {ONLINE_LOBBY_STALE_MS} from './online-games.js';
import {isCinematicWin} from './arcade-cinematic-rules.js';

export const GLOBAL_CRASH_BET_MS=12000;
export const GLOBAL_CRASH_BREAK_MS=5000;
export const GLOBAL_CRASH_RATE=0.12;
export const GLOBAL_CRASH_MIN_WAGER=1;
export const GLOBAL_CRASH_MAX_WAGER=Math.floor(Number.MAX_SAFE_INTEGER/10000);
export const GLOBAL_CRASH_MAX_CENTS=10000;
export const GLOBAL_CRASH_MIN_AUTO=110;
export const GLOBAL_CRASH_MAX_AUTO=2000;
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const validUser=value=>{
 const id=String(value||'');
 if(!/^[0-9]{15,22}$/.test(id))fail('Invalid Discord user.',400);
 return id;
};
const validTime=value=>{
 if(!Number.isSafeInteger(value)||value<0)fail('Invalid round clock.',400);
 return value;
};
const positiveId=value=>{
 if(!/^[0-9]+$/.test(String(value??'')))fail('Invalid round ID.',400);
 const id=Number(value);
 if(!Number.isSafeInteger(id)||id<1)fail('Invalid round ID.',400);
 return id;
};
const uuid=value=>{
 const key=String(value||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))
  fail('Invalid request ID. Refresh and retry.',400);
 return key;
};
const wagerOf=raw=>{
 if(!/^[0-9]+$/.test(String(raw??'')))fail('Invalid wager.',400);
 const amount=Number(raw);
 if(!Number.isSafeInteger(amount)||amount<GLOBAL_CRASH_MIN_WAGER||amount>GLOBAL_CRASH_MAX_WAGER)
  fail('Enter a valid whole-point wager.',400);
 return amount;
};
const autoOf=raw=>{
 const value=String(raw??'').trim();
 if(!value)return 0;
 if(!/^\d{1,2}(?:\.\d{1,2})?$/.test(value))fail('Invalid auto-collect multiplier.',400);
 const scaled=Math.round(Number(value)*100);
 if(scaled<GLOBAL_CRASH_MIN_AUTO||scaled>GLOBAL_CRASH_MAX_AUTO)
  fail('Auto-collect must be between 1.10x and 20.00x.',400);
 return scaled;
};
export const globalCrashCentsAt=(elapsedMs)=>{
 const elapsed=Math.max(0,Number(elapsedMs)||0);
 return Math.max(100,Math.min(GLOBAL_CRASH_MAX_CENTS,
  Math.floor(100*Math.exp(GLOBAL_CRASH_RATE*elapsed/1000)+1e-9)));
};
export const globalCrashReachTime=cents=>Math.max(250,
 Math.ceil(Math.log(Math.max(100,cents)/100)/GLOBAL_CRASH_RATE*1000));
export const globalCrashPayout=(wager,cents)=>Math.floor(wager*cents/100);
// Predictable from the subsequently revealed seed, but impossible to predict
// from the pre-round SHA256 commitment alone. Maximum 100x.
export function globalCrashPoint(seed,roundId){
 if(!/^[0-9a-f]{64}$/.test(String(seed||'')))fail('Invalid round seed.',400);
 if(!Number.isSafeInteger(roundId)||roundId<1)fail('Invalid verification round.',400);
 const hash=createHmac('sha256',Buffer.from(seed,'hex')).update('sb-global-crash:'+roundId).digest();
 const roll=hash.readUIntBE(0,6);
 const uniform=(roll+1)/(281474976710656+1);
 return Math.max(100,Math.min(GLOBAL_CRASH_MAX_CENTS,Math.floor(96/uniform)));
}
export const globalCrashCommitment=seed=>createHash('sha256').update(Buffer.from(seed,'hex')).digest('hex');

db.exec(
 "CREATE TABLE IF NOT EXISTS online_crash_positions ("+
 "round_id INTEGER NOT NULL REFERENCES online_game_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "auto_at INTEGER NOT NULL DEFAULT 0 CHECK(auto_at=0 OR auto_at BETWEEN 110 AND 2000),"+
 "status TEXT NOT NULL CHECK(status IN ('active','cashed_out','lost')),"+
 "cash_at INTEGER,cashed_at INTEGER,placed_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(round_id,user_id));"+
 "CREATE INDEX IF NOT EXISTS idx_online_crash_positions_round ON online_crash_positions(round_id,status);"+
 "CREATE INDEX IF NOT EXISTS idx_online_crash_positions_user ON online_crash_positions(user_id,round_id DESC);"+
 "CREATE INDEX IF NOT EXISTS idx_online_crash_positions_auto ON online_crash_positions(round_id,status,auto_at);"+
 "CREATE TABLE IF NOT EXISTS online_crash_requests ("+
 "request_key TEXT PRIMARY KEY,round_id INTEGER NOT NULL REFERENCES online_game_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "action TEXT NOT NULL CHECK(action IN ('bet','cashout')),"+
 "created_at INTEGER NOT NULL);"
);
const latest=()=>one("SELECT * FROM online_game_rounds WHERE guild_id=? AND game='crash' ORDER BY id DESC LIMIT 1",config.guildId);
const decode=round=>round?JSON.parse(round.result_json||'{}'):null;
function save(round,state,status=round.status,endsAt=round.ends_at){
 run('UPDATE online_game_rounds SET status=?,result_json=?,ends_at=? WHERE id=? AND guild_id=?',
  status,JSON.stringify(state),endsAt,round.id,config.guildId);
}
function createRound(now){
 const seed=randomBytes(32).toString('hex'),commitment=globalCrashCommitment(seed);
 const state={version:1,seq:0,seed,commitment,crashCents:null,flightStartedAt:null,crashTime:null,
  lastEvent:{type:'betting',at:now}};
 run("INSERT INTO online_game_rounds(guild_id,game,status,created_at,starts_at,result_json) "+
  "VALUES(?,'crash','betting',?,?,?)",config.guildId,now,now+GLOBAL_CRASH_BET_MS,JSON.stringify(state));
 return latest();
}
function requestOf(key){return one('SELECT * FROM online_crash_requests WHERE request_key=?',key);}
function checkRequest(key,roundId,userId,action){
 const previous=requestOf(key);
 if(!previous)return false;
 if(previous.round_id!==roundId||previous.user_id!==userId||previous.action!==action)
  fail('This request ID was already used.');
 return true;
}
function rememberRequest(key,roundId,userId,action,now){
 run('INSERT INTO online_crash_requests(request_key,round_id,user_id,action,created_at) VALUES(?,?,?,?,?)',
  key,roundId,userId,action,now);
}
function cashPosition(round,row,cents,now,method){
 const change=run("UPDATE online_crash_positions SET status='cashed_out',cash_at=?,cashed_at=? "+
  "WHERE round_id=? AND user_id=? AND status='active'",cents,now,round.id,row.user_id);
 if(change.changes!==1)return false;
 const payout=globalCrashPayout(row.wager,cents);
 run('UPDATE online_game_entries SET payout=? WHERE round_id=? AND user_id=? AND entry_no=0',
  payout,round.id,row.user_id);
 if(payout)walletChange(row.user_id,payout,'crash.global.payout',
   'global-crash:payout:'+round.id+':'+row.user_id);
 return {payout,method};
}
function settle(round,state,at){
 // Auto-cashouts that would have reached their target before the crash still win
 // even if the ticker was delayed by a sleeping process or other server work.
 const auto=all("SELECT e.user_id,e.wager,p.auto_at FROM online_game_entries e "+
  "JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
  "WHERE e.round_id=? AND p.status='active' AND p.auto_at>0 ORDER BY e.user_id",round.id);
 for(const row of auto){
  const due=state.flightStartedAt+globalCrashReachTime(row.auto_at);
  if(row.auto_at<state.crashCents&&due<state.crashTime)
   cashPosition(round,row,row.auto_at,due,'auto');
 }
 run("UPDATE online_crash_positions SET status='lost' WHERE round_id=? AND status='active'",round.id);
 const bets=all("SELECT e.user_id,e.wager,e.payout,p.auto_at,p.cash_at,p.status FROM online_game_entries e "+
  "JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
  "WHERE e.round_id=?",round.id);
 for(const bet of bets){
  const status=bet.status==='cashed_out'?'cashed_out':'lost';
  const details={globalRound:round.id,crashAt:state.crashCents,
   cashAt:bet.cash_at||0,autoAt:bet.auto_at||0,shared:true};
  run("INSERT OR IGNORE INTO arcade_rounds "+
   "(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) "+
   "VALUES(?,?,'crash_online',?,?,?,?,?,?,?)",
   config.guildId,bet.user_id,bet.wager,bet.payout,status,JSON.stringify(details),
   'global-crash:round:'+round.id+':'+bet.user_id,round.created_at,at);
 }
 state.seq++;
 state.lastEvent={type:'crash',at:state.crashTime,multiplier:state.crashCents};
 save(round,state,'settled',state.crashTime);
}
function tickInside(now){
 let round=latest();
 if(!round)return createRound(now);
 if(round.status==='settled'||round.status==='cancelled'){
  if(now<(round.ends_at||round.created_at)+GLOBAL_CRASH_BREAK_MS)return round;
  return createRound(now);
 }
 const state=decode(round);
 if(round.status==='betting'){
  if(now<round.starts_at)return round;
  state.crashCents=globalCrashPoint(state.seed,round.id);
  state.flightStartedAt=now;
  state.crashTime=now+globalCrashReachTime(state.crashCents);
  state.seq++;
  state.lastEvent={type:'launch',at:now};
  save(round,state,'playing');
  return latest();
 }
 if(round.status!=='playing')return round;
 const dueCents=Math.min(globalCrashCentsAt(now-state.flightStartedAt),state.crashCents-1);
 const auto=all("SELECT e.user_id,e.wager,p.auto_at FROM online_game_entries e "+
  "JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
  "WHERE e.round_id=? AND p.status='active' AND p.auto_at>0 AND p.auto_at<=? ORDER BY e.user_id",round.id,dueCents);
 let paid=0;
 for(const row of auto){
  const due=state.flightStartedAt+globalCrashReachTime(row.auto_at);
  if(due>now||due>=state.crashTime||row.auto_at>=state.crashCents)continue;
  if(cashPosition(round,row,row.auto_at,due,'auto'))paid++;
 }
 if(now>=state.crashTime){settle(round,state,now);return latest();}
 if(paid){
  state.seq++;state.lastEvent={type:'auto_cashout',at:now,count:paid};
  save(round,state);
  return latest();
 }
 return round;
}
function aggregate(roundId){
 return one("SELECT COUNT(*) AS players,COALESCE(SUM(wager),0) AS wager,"+
  "COALESCE(SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END),0) AS active,"+
  "COALESCE(SUM(CASE WHEN p.status='cashed_out' THEN 1 ELSE 0 END),0) AS collected "+
  "FROM online_game_entries e JOIN online_crash_positions p "+
  "ON p.round_id=e.round_id AND p.user_id=e.user_id WHERE e.round_id=?",roundId);
}
function project(round,userId,now){
 const member=one("SELECT 1 FROM online_game_waiting WHERE guild_id=? AND game='crash' AND user_id=? AND last_seen_at>=?",
  config.guildId,userId,now-ONLINE_LOBBY_STALE_MS);
 const lobbyPlayers=one("SELECT COUNT(*) AS total FROM online_game_waiting WHERE guild_id=? AND game='crash' AND last_seen_at>=?",
  config.guildId,now-ONLINE_LOBBY_STALE_MS)?.total||0;
 const balance=one("SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?",config.guildId,userId)?.balance||0;
 const recent=all("SELECT id,ends_at,result_json FROM online_game_rounds "+
  "WHERE guild_id=? AND game='crash' AND status='settled' ORDER BY id DESC LIMIT 8",
  config.guildId).map(row=>({roundId:row.id,crashAt:decode(row)?.crashCents,
   endedAt:row.ends_at})).filter(row=>Number.isInteger(row.crashAt));
 const previous=one("SELECT e.wager,p.auto_at,p.placed_at FROM online_crash_positions p "+
  "JOIN online_game_entries e ON e.round_id=p.round_id AND e.user_id=p.user_id "+
  "JOIN online_game_rounds r ON r.id=p.round_id WHERE p.user_id=? AND r.guild_id=? "+
  "AND r.game='crash' ORDER BY p.round_id DESC LIMIT 1",userId,config.guildId);
 if(!round)return {serverTime:now,phase:'waiting',roundId:null,joined:!!member,lobbyPlayers,balance,
  roundPlayers:0,roundWager:0,activePlayers:0,collectedPlayers:0,canBet:false,canCashout:false,
  recent,lastWager:previous?.wager||50,lastAutoAt:previous?.auto_at||0,lastBetAt:previous?.placed_at||0,
  me:null,players:[]};
 const state=decode(round),stats=aggregate(round.id);
 const bet=one("SELECT e.wager,e.payout,p.auto_at,p.status,p.cash_at,p.cashed_at "+
  "FROM online_game_entries e JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
  "WHERE e.round_id=? AND e.user_id=? AND e.entry_no=0",round.id,userId);
 const participants=all("SELECT e.user_id,e.wager,e.payout,p.status,p.cash_at,u.username,u.display_name "+
  "FROM online_game_entries e JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
  "JOIN users u ON u.id=e.user_id WHERE e.round_id=? ORDER BY e.wager DESC,e.user_id LIMIT 24",round.id);
 const finished=round.status==='settled'||round.status==='cancelled';
 const cents=round.status==='playing'?globalCrashCentsAt(now-state.flightStartedAt):
  finished?state.crashCents:100;
 const canCashout=round.status==='playing'&&bet?.status==='active'&&now<state.crashTime;
 const me=bet?{wager:bet.wager,payout:bet.payout,status:bet.status,autoAt:bet.auto_at,
  cashAt:bet.cash_at,cashedAt:bet.cashed_at,
  currentProfit:canCashout?globalCrashPayout(bet.wager,cents)-bet.wager:null,
  profit:bet.status==='cashed_out'?bet.payout-bet.wager:bet.status==='lost'?-bet.wager:null,
  cinematic:bet.status==='cashed_out'&&isCinematicWin({
   status:'cashed_out',wager:bet.wager,payout:bet.payout
  })}:null;
 return {
  serverTime:now,phase:round.status,seq:state.seq,roundId:round.id,
  startsAt:round.starts_at,flightStartedAt:state.flightStartedAt,
  endsAt:finished?round.ends_at:null,
  commitment:state.commitment,
  // NEVER expose the private seed, planned crash multiplier or crash time
  // until the round has settled.
  seed:finished?state.seed:null,crashAt:finished?state.crashCents:null,
  multiplierCents:cents,
  joined:!!member,lobbyPlayers,balance,roundPlayers:stats.players,roundWager:stats.wager,
  activePlayers:stats.active,collectedPlayers:stats.collected,
  canBet:round.status==='betting'&&!!member&&!bet,
  canCashout,me,players:participants.map(row=>({
   userId:row.user_id,name:row.display_name||row.username||'Player',wager:row.wager,
   payout:row.payout,status:row.status,cashAt:row.cash_at
  })),recent,
  lastWager:previous?.wager||50,lastAutoAt:previous?.auto_at||0,lastBetAt:previous?.placed_at||0,
  lastEvent:state.lastEvent
 };
}
// // BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Temporarily retire Global Crash without deleting its rounds, user history,
// or the game engine. This is run once at startup BEFORE accepting traffic.
// All unresolved bets are refunded at 1.00x. Already-cashed-out wins retain
// their original payouts; no new rounds can be created after the routes and
// ticker are disabled. Repeated starts are fully idempotent.
export function suspendGlobalCrash(now=Date.now()){
 const stamp=validTime(now);
 return transaction(()=>{
  const rounds=all("SELECT * FROM online_game_rounds WHERE guild_id=? AND game='crash' "+
   "AND status IN ('betting','playing') ORDER BY id",config.guildId);
  let refundedPlayers=0,refundedPoints=0;
  for(const round of rounds){
   const state=decode(round);
   const positions=all("SELECT e.user_id,e.wager,e.payout,p.status,p.auto_at,p.cash_at "+
    "FROM online_game_entries e JOIN online_crash_positions p "+
    "ON e.round_id=p.round_id AND e.user_id=p.user_id "+
    "WHERE e.round_id=? AND e.entry_no=0 ORDER BY e.user_id",round.id);
   for(const row of positions){
    const refund=row.status==='active';
    const payout=refund?row.wager:row.payout;
    if(refund){
     walletChange(row.user_id,row.wager,'crash.global.paused.refund',
      'global-crash:paused:refund:'+round.id+':'+row.user_id);
     run("UPDATE online_crash_positions SET status='cashed_out',cash_at=100,cashed_at=? "+
      "WHERE round_id=? AND user_id=? AND status='active'",stamp,round.id,row.user_id);
     run("UPDATE online_game_entries SET payout=? WHERE round_id=? AND user_id=? AND entry_no=0",
      row.wager,round.id,row.user_id);
     refundedPlayers++;refundedPoints+=row.wager;
    }
    const details={
     globalRound:round.id,shared:true,paused:true,refunded:refund,
     cashAt:refund?100:row.cash_at||0,autoAt:row.auto_at||0,
     crashAt:state.crashCents||null
    };
    run("INSERT OR IGNORE INTO arcade_rounds "+
     "(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) "+
     "VALUES(?,?,'crash_online',?,?,?,?,?,?,?)",
     config.guildId,row.user_id,row.wager,payout,
     refund?'push':row.status==='cashed_out'?'cashed_out':'lost',
     JSON.stringify(details),'global-crash:round:'+round.id+':'+row.user_id,
     round.created_at,stamp);
   }
   state.seq=(Number(state.seq)||0)+1;
   state.disabled=true;
   state.lastEvent={type:'suspended',at:stamp};
   save(round,state,'cancelled',stamp);
  }
  // Crash lobby membership is not an account balance or transaction history;
  // deleting only these volatile seats prevents stale "online" counts.
  run("DELETE FROM online_game_waiting WHERE guild_id=? AND game='crash'",config.guildId);
  return {rounds:rounds.length,refundedPlayers,refundedPoints};
 });
}

export function globalCrashSnapshot(userId,now=Date.now()){
 const user=validUser(userId),at=validTime(now);
 return transaction(()=>project(tickInside(at),user,at));
}
export function globalCrashTick(now=Date.now()){
 const at=validTime(now);
 return transaction(()=>{const round=tickInside(at);return {roundId:round?.id||null,phase:round?.status||'waiting',seq:round?decode(round).seq:0};});
}
export function globalCrashBet(userId,fields,now=Date.now()){
 const user=validUser(userId),at=validTime(now),
  wager=wagerOf(fields?.wager),autoAt=autoOf(fields?.auto_at),
  roundId=positiveId(fields?.round_id),key=uuid(fields?.request_id);
 return transaction(()=>{
  const round=tickInside(at);
  if(checkRequest(key,roundId,user,'bet'))return project(latest(),user,at);
  if(!round||round.id!==roundId||round.status!=='betting')
   fail('Betting is closed for that round. Join the next one.');
  if(!one("SELECT 1 FROM online_game_waiting WHERE guild_id=? AND game='crash' AND user_id=? AND last_seen_at>=?",
    config.guildId,user,at-ONLINE_LOBBY_STALE_MS))fail('Join the Global Crash lobby before placing a wager.');
  if(one('SELECT 1 FROM online_game_entries WHERE round_id=? AND user_id=?',round.id,user))
   fail('You already placed a wager in this round.');
  walletChange(user,-wager,'crash.global.wager','global-crash:wager:'+round.id+':'+user);
  run("INSERT INTO online_game_entries(round_id,user_id,entry_no,wager,payout) VALUES(?,?,0,?,0)",round.id,user,wager);
  run("INSERT INTO online_crash_positions(round_id,user_id,auto_at,status,placed_at) VALUES(?,?,?,'active',?)",
   round.id,user,autoAt,at);
  rememberRequest(key,round.id,user,'bet',at);
  const state=decode(round);
  state.seq++;state.lastEvent={type:'bet',at,userId:user};
  save(round,state);
  return project(latest(),user,at);
 });
}
export function globalCrashCashout(userId,fields,now=Date.now()){
 const user=validUser(userId),at=validTime(now),
  roundId=positiveId(fields?.round_id),key=uuid(fields?.request_id);
 return transaction(()=>{
  const round=tickInside(at);
  if(checkRequest(key,roundId,user,'cashout'))return project(latest(),user,at);
  if(!round||round.id!==roundId||round.status!=='playing')fail('This Crash round has ended.');
  const state=decode(round);
  if(at>=state.crashTime)fail('The rocket has already crashed.');
  const position=one("SELECT e.user_id,e.wager,p.status FROM online_game_entries e "+
   "JOIN online_crash_positions p ON p.round_id=e.round_id AND p.user_id=e.user_id "+
   "WHERE e.round_id=? AND e.user_id=?",round.id,user);
  if(!position||position.status!=='active')fail('You have no active wager to cash out.');
  const cents=globalCrashCentsAt(at-state.flightStartedAt);
  cashPosition(round,position,cents,at,'manual');
  rememberRequest(key,round.id,user,'cashout',at);
  state.seq++;state.lastEvent={type:'cashout',at,userId:user};
  save(round,state);
  return project(latest(),user,at);
 });
}
