// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// One persistent website-wide European Roulette round per Discord guild.
// Bets close after exactly 30 seconds. The wheel spins for 8 seconds and
// the settled result is shown for 4 seconds. All balances are authoritative.
import {randomBytes,createHash} from 'node:crypto';
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {isCinematicWin} from './arcade-cinematic-rules.js';
import {
 ROULETTE_BET_MS,ROULETTE_SPIN_MS,ROULETTE_RESULTS_MS,
 ROULETTE_MIN_CHIP,ROULETTE_MAX_CHIP,ROULETTE_MAX_ROUND_STAKE,
 rouletteSelection,roulettePayout,rouletteOutcome,rouletteCommitment,rouletteColor
} from './roulette-rules.js';

export const ROULETTE_PRESENCE_TTL=90000;
const invalid=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const userOf=value=>{
 const user=String(value||'');
 if(!/^[0-9]{15,22}$/.test(user))invalid('Invalid Discord account.');
 return user;
};
const timeOf=value=>{
 if(!Number.isSafeInteger(value)||value<0)invalid('Invalid Roulette clock.');
 return value;
};
const roundOf=value=>{
 if(!/^\d+$/.test(String(value??'')))invalid('Invalid Roulette round.');
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<1)invalid('Invalid Roulette round.');
 return n;
};
const requestOf=value=>{
 const s=String(value||'');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s))
  invalid('Invalid request ID. Refresh and try again.');
 return s;
};
const stakesOf=raw=>{
 if(typeof raw!=='string'||raw.length>6000)invalid('Invalid Roulette bet slip.');
 let choices;
 try{choices=JSON.parse(raw);}catch{invalid('Invalid Roulette bet slip.');}
 if(!Array.isArray(choices)||choices.length<1||choices.length>30)invalid('Choose between 1 and 30 chips.');
 const aggregate=new Map();
 let total=0;
 for(const item of choices){
  if(!item||typeof item!=='object'||Array.isArray(item))invalid('Invalid chip selection.');
  const key=String(item.key||''),selection=rouletteSelection(key);
  if(!selection)invalid('Unsupported Roulette selection.');
  if(!Number.isSafeInteger(item.stake)||item.stake<ROULETTE_MIN_CHIP||item.stake>ROULETTE_MAX_CHIP)
   invalid('Each chip must wager between 10 and 1,000 points.');
  aggregate.set(key,(aggregate.get(key)||0)+item.stake);
  total+=item.stake;
  if(total>ROULETTE_MAX_ROUND_STAKE)invalid('Maximum combined Roulette wager is 10,000 points per round.');
 }
 return {bets:[...aggregate].sort(([a],[b])=>a.localeCompare(b)).map(([key,stake])=>({key,stake})),total};
};
const payloadHash=bets=>createHash('sha256').update(JSON.stringify(bets)).digest('hex');

db.exec(
 "CREATE TABLE IF NOT EXISTS online_roulette_rounds ("+
 "id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,"+
 "status TEXT NOT NULL CHECK(status IN ('betting','spinning','results')),"+
 "created_at INTEGER NOT NULL,bet_closes_at INTEGER NOT NULL,"+
 "spin_ends_at INTEGER NOT NULL,results_ends_at INTEGER NOT NULL,"+
 "seed TEXT NOT NULL,commitment TEXT NOT NULL,"+
 "winning_number INTEGER CHECK(winning_number BETWEEN 0 AND 36),"+
 "settled_at INTEGER,version INTEGER NOT NULL DEFAULT 0);"+
 "CREATE INDEX IF NOT EXISTS idx_online_roulette_rounds_guild ON online_roulette_rounds(guild_id,id DESC);"+
 "CREATE TABLE IF NOT EXISTS online_roulette_bets ("+
 "round_id INTEGER NOT NULL REFERENCES online_roulette_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "selection_key TEXT NOT NULL,stake INTEGER NOT NULL CHECK(stake>0),"+
 "payout INTEGER NOT NULL DEFAULT 0 CHECK(payout>=0),"+
 "PRIMARY KEY(round_id,user_id,selection_key));"+
 "CREATE INDEX IF NOT EXISTS idx_online_roulette_bets_round ON online_roulette_bets(round_id,user_id);"+
 "CREATE TABLE IF NOT EXISTS online_roulette_actions ("+
 "request_key TEXT PRIMARY KEY,round_id INTEGER NOT NULL REFERENCES online_roulette_rounds(id),"+
 "guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"+
 "payload_hash TEXT NOT NULL,payload_json TEXT NOT NULL,total_stake INTEGER NOT NULL,"+
 "created_at INTEGER NOT NULL);"+
 "CREATE INDEX IF NOT EXISTS idx_online_roulette_actions_user ON online_roulette_actions(guild_id,user_id,created_at DESC);"+
 "CREATE TABLE IF NOT EXISTS online_roulette_presence ("+
 "guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,"+
 "last_seen_at INTEGER NOT NULL,PRIMARY KEY(guild_id,user_id));"+
 "CREATE INDEX IF NOT EXISTS idx_online_roulette_presence_expiry ON online_roulette_presence(guild_id,last_seen_at);"
);
const latest=()=>one("SELECT * FROM online_roulette_rounds WHERE guild_id=? ORDER BY id DESC LIMIT 1",config.guildId);
function createRound(now){
 const seed=randomBytes(32).toString('hex');
 run("INSERT INTO online_roulette_rounds "+
  "(guild_id,status,created_at,bet_closes_at,spin_ends_at,results_ends_at,seed,commitment) "+
  "VALUES(?,'betting',?,?,?,?,?,?)",
  config.guildId,now,now+ROULETTE_BET_MS,
  now+ROULETTE_BET_MS+ROULETTE_SPIN_MS,
  now+ROULETTE_BET_MS+ROULETTE_SPIN_MS+ROULETTE_RESULTS_MS,
  seed,rouletteCommitment(seed));
 return latest();
}
function settle(round){
 const winning=rouletteOutcome(round.seed,round.id);
 const entries=all('SELECT user_id,selection_key,stake FROM online_roulette_bets WHERE round_id=? ORDER BY user_id,selection_key',round.id);
 const grouped=new Map();
 for(const entry of entries){
  const result=roulettePayout(entry.selection_key,entry.stake,winning);
  run('UPDATE online_roulette_bets SET payout=? WHERE round_id=? AND user_id=? AND selection_key=?',
   result,round.id,entry.user_id,entry.selection_key);
  let person=grouped.get(entry.user_id);
  if(!person){person={stake:0,payout:0,bets:[]};grouped.set(entry.user_id,person);}
  person.stake+=entry.stake;person.payout+=result;
  const selection=rouletteSelection(entry.selection_key);
  person.bets.push({key:entry.selection_key,label:selection.label,odds:selection.odds,
   stake:entry.stake,payout:result});
 }
 for(const [user,person]of grouped){
  if(person.payout)walletChange(user,person.payout,'roulette.online.payout',
   'roulette:payout:'+round.id+':'+user);
  const details={
   globalRound:round.id,winningNumber:winning,color:rouletteColor(winning),
   commitment:round.commitment,seed:round.seed,bets:person.bets,shared:true
  };
  run("INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) "+
   "VALUES(?,?,'roulette_online',?,?,?,?,?,?,?)",
   config.guildId,user,person.stake,person.payout,
   person.payout>person.stake?'won':person.payout===person.stake?'push':'lost',
   JSON.stringify(details),'roulette:round:'+round.id+':'+user,round.created_at,round.spin_ends_at);
 }
 run("UPDATE online_roulette_rounds SET status='results',winning_number=?,settled_at=?,version=version+1 "+
  "WHERE id=? AND guild_id=? AND status IN ('betting','spinning')",
  winning,round.spin_ends_at,round.id,config.guildId);
}
function advance(now){
 let round=latest();
 if(!round)return createRound(now);
 if(round.status==='results'){
  return now>=round.results_ends_at?createRound(now):round;
 }
 if(now>=round.spin_ends_at){
  settle(round);
  round=latest();
  return now>=round.results_ends_at?createRound(now):round;
 }
 if(round.status==='betting'&&now>=round.bet_closes_at){
  run("UPDATE online_roulette_rounds SET status='spinning',version=version+1 WHERE id=? AND status='betting'",round.id);
  return latest();
 }
 return round;
}
function publicState(round,user,now){
 const bets=all('SELECT selection_key,stake,payout FROM online_roulette_bets WHERE round_id=? AND user_id=? ORDER BY selection_key',
  round.id,user).map(b=>({...b,key:b.selection_key,label:rouletteSelection(b.selection_key)?.label||b.selection_key}));
 const stats=one("SELECT COUNT(DISTINCT user_id) AS players,COALESCE(SUM(stake),0) AS wager,"+
  "COALESCE(SUM(payout),0) AS payout FROM online_roulette_bets WHERE round_id=?",round.id);
 const viewers=one('SELECT COUNT(*) AS count FROM online_roulette_presence WHERE guild_id=? AND last_seen_at>=?',
  config.guildId,now-ROULETTE_PRESENCE_TTL)?.count||0;
 const balance=one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,user)?.balance||0;
 const myWager=bets.reduce((s,b)=>s+b.stake,0);
 const myPayout=bets.reduce((s,b)=>s+b.payout,0);
 const participants=all(
  'SELECT b.user_id,COALESCE(u.display_name,u.username) AS name,SUM(b.stake) AS stake,SUM(b.payout) AS payout '+
  'FROM online_roulette_bets b JOIN users u ON u.id=b.user_id WHERE b.round_id=? '+
  'GROUP BY b.user_id ORDER BY stake DESC,b.user_id LIMIT 30',round.id);
 const history=all(
  "SELECT id,winning_number,settled_at FROM online_roulette_rounds WHERE guild_id=? AND status='results' "+
  "ORDER BY id DESC LIMIT 12",config.guildId).map(r=>({
   roundId:r.id,number:r.winning_number,color:rouletteColor(r.winning_number),at:r.settled_at
  }));
 const previous=one('SELECT payload_json,created_at FROM online_roulette_actions WHERE guild_id=? AND user_id=? '+
  'ORDER BY created_at DESC,request_key DESC LIMIT 1',config.guildId,user);
 let repeatBets=[];
 try{repeatBets=previous?JSON.parse(previous.payload_json):[];}catch{}
 const isResults=round.status==='results';
 const outcome=isResults?round.winning_number:null;
 return {
  serverTime:now,roundId:round.id,phase:round.status,version:round.version,
  createdAt:round.created_at,betClosesAt:round.bet_closes_at,
  spinEndsAt:round.spin_ends_at,resultsEndsAt:round.results_ends_at,
  commitment:round.commitment,seed:isResults?round.seed:null,
  winningNumber:outcome,color:isResults?rouletteColor(outcome):null,
  balance,watching:viewers,roundPlayers:stats.players,roundWager:stats.wager,
  roundPayout:isResults?stats.payout:null,
  myBets:bets,myWager,myPayout:isResults?myPayout:null,
  myProfit:isResults?myPayout-myWager:null,
  canBet:round.status==='betting'&&now<round.bet_closes_at&&myWager<ROULETTE_MAX_ROUND_STAKE,
  remainingBudget:Math.max(0,ROULETTE_MAX_ROUND_STAKE-myWager),
  cinematic:isResults&&isCinematicWin({
   status:myPayout>myWager?'won':'lost',wager:myWager,payout:myPayout
  }),
  participants,history,repeatBets,
  repeatAt:previous?.created_at||0
 };
}
export function rouletteSnapshot(userId,now=Date.now()){
 const user=userOf(userId),at=timeOf(now);
 return transaction(()=>publicState(advance(at),user,at));
}
export function rouletteWatch(userId,now=Date.now()){
 const user=userOf(userId),at=timeOf(now);
 return transaction(()=>{
  run('DELETE FROM online_roulette_presence WHERE guild_id=? AND last_seen_at<?',
   config.guildId,at-ROULETTE_PRESENCE_TTL);
  run('INSERT INTO online_roulette_presence(guild_id,user_id,last_seen_at) VALUES(?,?,?) '+
   'ON CONFLICT(guild_id,user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',
   config.guildId,user,at);
  return publicState(advance(at),user,at);
 });
}
export function rouletteTick(now=Date.now()){
 const at=timeOf(now);
 return transaction(()=>{
  const round=advance(at);
  return {roundId:round.id,phase:round.status,version:round.version};
 });
}
export function rouletteLobbyCounts(now=Date.now()){
 const at=timeOf(now);
 const round=one('SELECT id,status FROM online_roulette_rounds WHERE guild_id=? ORDER BY id DESC LIMIT 1',config.guildId);
 if(!round)return {phase:'not_started',roundId:null,watching:0,roundPlayers:0,roundWager:0};
 const stats=one('SELECT COUNT(DISTINCT user_id) AS players,COALESCE(SUM(stake),0) AS wager '+
  'FROM online_roulette_bets WHERE round_id=?',round.id);
 const watch=one('SELECT COUNT(*) AS n FROM online_roulette_presence WHERE guild_id=? AND last_seen_at>=?',
  config.guildId,at-ROULETTE_PRESENCE_TTL)?.n||0;
 return {phase:round.status,roundId:round.id,watching:watch,roundPlayers:stats.players,roundWager:stats.wager,enabled:true};
}
export function roulettePlace(userId,fields,now=Date.now()){
 const user=userOf(userId),at=timeOf(now);
 const roundId=roundOf(fields?.round_id),key=requestOf(fields?.request_id);
 const {bets,total}=stakesOf(fields?.bets_json);
 const hash=payloadHash(bets);
 return transaction(()=>{
  const active=advance(at);
  const replay=one('SELECT round_id,user_id,payload_hash FROM online_roulette_actions WHERE request_key=?',key);
  if(replay){
   if(replay.round_id!==roundId||replay.user_id!==user||replay.payload_hash!==hash)
    invalid('That request ID was already used for a different bet.',409);
   return publicState(active,user,at);
  }
  if(active.id!==roundId||active.status!=='betting'||at>=active.bet_closes_at)
   invalid('Betting is closed. Wait for the next Roulette round.',409);
  const existing=one('SELECT COALESCE(SUM(stake),0) AS total FROM online_roulette_bets WHERE round_id=? AND user_id=?',
   roundId,user)?.total||0;
  if(existing+total>ROULETTE_MAX_ROUND_STAKE)
   invalid('You have reached the 10,000-point limit for this round.',409);
  walletChange(user,-total,'roulette.online.wager','roulette:wager:'+key);
  for(const bet of bets){
   run('INSERT INTO online_roulette_bets(round_id,user_id,selection_key,stake,payout) VALUES(?,?,?,?,0) '+
    'ON CONFLICT(round_id,user_id,selection_key) DO UPDATE SET stake=stake+excluded.stake',
    roundId,user,bet.key,bet.stake);
  }
  run('INSERT INTO online_roulette_actions(request_key,round_id,guild_id,user_id,payload_hash,payload_json,total_stake,created_at) '+
   'VALUES(?,?,?,?,?,?,?,?)',key,roundId,config.guildId,user,hash,JSON.stringify(bets),total,at);
  run('UPDATE online_roulette_rounds SET version=version+1 WHERE id=?',roundId);
  return publicState(latest(),user,at);
 });
}
