// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomInt,randomUUID} from 'node:crypto';
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';

export const ARCADE_MIN_BET=10;
export const ARCADE_MAX_BET=10000;
export const ARCADE_GAMES=['coinflip','coinflip_pvp','slots','mines','crash','plinko','roulette_online','blackjack_solo'];
const MAX_BALANCE=Number.MAX_SAFE_INTEGER-1000000;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const requireId=value=>{const id=Number(value);if(!Number.isSafeInteger(id)||id<1)fail(400,'Invalid game ID.');return id;};
const whole=(raw,min,max,label)=>{
 if(!/^[0-9]+$/.test(String(raw??'')))fail(400,'Invalid '+label+'.');
 const n=Number(raw);if(!Number.isSafeInteger(n)||n<min||n>max)fail(400,label+' is out of range.');
 return n;
};
const wagerOf=fields=>whole(fields.wager,ARCADE_MIN_BET,ARCADE_MAX_BET,'Wager');
const keyOf=fields=>{
 const key=String(fields.request_id||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))fail(400,'Invalid game request. Refresh and retry.');
 return key;
};
const faceOf=fields=>{
 const face=String(fields.face||'');if(!['heads','tails'].includes(face))fail(400,'Choose Heads or Tails.');
 return face;
};
const otherFace=face=>face==='heads'?'tails':'heads';
const decoded=round=>round?{...round,details:JSON.parse(round.details_json||'{}')}:null;
const ownerRound=(userId,roundId,game)=>{
 const round=one('SELECT * FROM arcade_rounds WHERE guild_id=? AND id=? AND user_id=? AND game=?',config.guildId,requireId(roundId),userId,game);
 if(!round)fail(404,'Game not found.');return decoded(round);
};

db.exec("CREATE TABLE IF NOT EXISTS arcade_rounds ("
 +"id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"
 +"game TEXT NOT NULL,wager INTEGER NOT NULL CHECK(wager>=0),payout INTEGER NOT NULL DEFAULT 0 CHECK(payout>=0),"
 +"status TEXT NOT NULL,details_json TEXT NOT NULL,request_key TEXT NOT NULL UNIQUE,"
 +"created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);"
 +"CREATE INDEX IF NOT EXISTS idx_arcade_rounds_user ON arcade_rounds(guild_id,user_id,id DESC);"
 +"CREATE INDEX IF NOT EXISTS idx_arcade_rounds_active ON arcade_rounds(game,status);"
 +"CREATE TABLE IF NOT EXISTS arcade_challenges ("
 +"id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,creator_id TEXT NOT NULL REFERENCES users(id),"
 +"target_id TEXT REFERENCES users(id),joiner_id TEXT REFERENCES users(id),wager INTEGER NOT NULL,"
 +"face TEXT NOT NULL,result TEXT,winner_id TEXT REFERENCES users(id),"
 +"status TEXT NOT NULL,request_key TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,settled_at INTEGER);"
 +"CREATE INDEX IF NOT EXISTS idx_arcade_challenges_open ON arcade_challenges(guild_id,status,expires_at);"
 +"CREATE TABLE IF NOT EXISTS arcade_transfers ("
 +"id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"
 +"event_key TEXT NOT NULL UNIQUE,reason TEXT NOT NULL,delta INTEGER NOT NULL,balance_after INTEGER NOT NULL,"
 +"created_at INTEGER NOT NULL);"
 +"CREATE INDEX IF NOT EXISTS idx_arcade_transfers_user ON arcade_transfers(guild_id,user_id,id DESC);");

function balance(userId){
 return one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,userId)?.balance||0;
}
export function walletChange(userId,delta,reason,eventKey){
 if(!Number.isSafeInteger(delta)||delta===0)fail(400,'Invalid point transfer.');
 // Existing level claims and arcade activity write to the exact same durable wallet.
 run('INSERT OR IGNORE INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,0,0)',config.guildId,userId);
 const n=delta<0
  ?run('UPDATE level_point_wallets SET balance=balance+? WHERE guild_id=? AND user_id=? AND balance>=?',delta,config.guildId,userId,-delta)
  :run('UPDATE level_point_wallets SET balance=balance+? WHERE guild_id=? AND user_id=? AND balance<=?',delta,config.guildId,userId,MAX_BALANCE-delta);
 if(n.changes!==1)fail(409,delta<0?'Not enough points in your wallet.':'Wallet balance limit reached.');
 run('INSERT INTO arcade_transfers(guild_id,user_id,event_key,reason,delta,balance_after,created_at) VALUES(?,?,?,?,?,?,?)',
 config.guildId,userId,eventKey,reason,delta,balance(userId),Date.now());
}
function createRound({userId,game,wager,payout=0,status,details,key}){
 const now=Date.now();
 return Number(run('INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
  config.guildId,userId,game,wager,payout,status,JSON.stringify(details),key,now,now).lastInsertRowid);
}
function updateRound(round,status,payout,details){
 run('UPDATE arcade_rounds SET status=?,payout=?,details_json=?,updated_at=? WHERE id=? AND status=?',
 status,payout,JSON.stringify(details),Date.now(),round.id,'active');
}
const priorRound=(userId,key,game)=>one('SELECT id FROM arcade_rounds WHERE guild_id=? AND user_id=? AND request_key=? AND game=?',config.guildId,userId,key,game);
function ensureNewKey(userId,key){
 if(one('SELECT 1 FROM arcade_rounds WHERE request_key=?',key)||one('SELECT 1 FROM arcade_challenges WHERE request_key=?',key))fail(409,'Game request already used. Refresh the page.');
}

export function houseCoin(userId,fields){
 const wager=wagerOf(fields),face=faceOf(fields),key=keyOf(fields);
 return transaction(()=>{
  const old=priorRound(userId,key,'coinflip');if(old)return old.id;
  ensureNewKey(userId,key);
  walletChange(userId,-wager,'coinflip.house.wager','house:wager:'+key);
  // House mode intentionally favours the house. Never market this as a fair 50/50 flip.
  const won=randomInt(100)<40;
  const landed=won?face:otherFace(face),payout=won?wager*2:0;
  if(payout)walletChange(userId,payout,'coinflip.house.payout','house:payout:'+key);
  return createRound({userId,game:'coinflip',wager,payout,status:won?'won':'lost',
   details:{selected:face,landed},key});
 });
}

const SLOT_SYMBOLS=['Cherry','Lemon','Bell','Diamond','Seven'];
const SLOT_TRIPLES=[5,7,10,16,28];
// Rare two-of-a-kind results replace the old common no-profit return.
// Triple-match prizes and their existing overall frequency remain unchanged.
const SLOT_TICKETS=10000;
const SLOT_PAIR_TICKETS=50;
const SLOT_TRIPLE_TICKETS=400;

// Server-only game selection. Production calls use crypto.randomInt; optional
// draw injection makes all outcome classes testable without statistical flakiness.
export function slotOutcome(draw=randomInt){
 const ticket=draw(SLOT_TICKETS);
 if(ticket<SLOT_PAIR_TICKETS){
  const match=draw(SLOT_SYMBOLS.length);
  const otherDraw=draw(SLOT_SYMBOLS.length-1);
  const other=otherDraw>=match?otherDraw+1:otherDraw;
  const otherPosition=draw(3);
  const reels=Array.from({length:3},(_,i)=>SLOT_SYMBOLS[i===otherPosition?other:match]);
  return {reels,multiplier:10,match:'pair'};
 }
 if(ticket<SLOT_PAIR_TICKETS+SLOT_TRIPLE_TICKETS){
  const symbol=draw(SLOT_SYMBOLS.length);
  return {reels:Array(3).fill(SLOT_SYMBOLS[symbol]),multiplier:SLOT_TRIPLES[symbol],match:'triple'};
 }
 const indices=Array.from({length:SLOT_SYMBOLS.length},(_,i)=>i);
 for(let i=0;i<3;i++){
  const j=i+draw(indices.length-i);
  [indices[i],indices[j]]=[indices[j],indices[i]];
 }
 return {reels:indices.slice(0,3).map(i=>SLOT_SYMBOLS[i]),multiplier:0,match:'none'};
}

export function spinSlots(userId,fields){
 const wager=wagerOf(fields),key=keyOf(fields);
 return transaction(()=>{
  const old=priorRound(userId,key,'slots');if(old)return old.id;
  ensureNewKey(userId,key);
  walletChange(userId,-wager,'slots.wager','slots:wager:'+key);
  const {reels,multiplier,match}=slotOutcome();
  const payout=wager*multiplier;
  if(payout)walletChange(userId,payout,'slots.payout','slots:payout:'+key);
  return createRound({userId,game:'slots',wager,payout,status:payout>wager?'won':payout===wager?'push':'lost',
   details:{reels,multiplier,match},key});
 });
}

function activeRound(userId,game){
 return decoded(one("SELECT * FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game=? AND status='active' ORDER BY id DESC LIMIT 1",config.guildId,userId,game));
}
function randomBombs(count){
 const cells=Array.from({length:25},(_,i)=>i);
 for(let i=0;i<count;i++){const j=randomInt(i,25);[cells[i],cells[j]]=[cells[j],cells[i]];}
 return cells.slice(0,count);
}
function minesMultiplier(bombs,safe){
 let m=1.01;
 for(let i=0;i<safe;i++)m*=(25-i)/(25-bombs-i);
 return Math.min(50,m);
}
function minesPayout(round,details){
 return Math.max(round.wager,Math.floor(round.wager*minesMultiplier(details.bombCount,details.revealed.length)));
}
export function createMines(userId,fields){
 const wager=wagerOf(fields),key=keyOf(fields),bombCount=whole(fields.bombs,1,5,'Bomb count');
 return transaction(()=>{
  const old=priorRound(userId,key,'mines');if(old)return old.id;
  ensureNewKey(userId,key);
  if(activeRound(userId,'mines'))fail(409,'Finish your active Mines game first.');
  walletChange(userId,-wager,'mines.wager','mines:wager:'+key);
  return createRound({userId,game:'mines',wager,status:'active',
   details:{bombs:randomBombs(bombCount),bombCount,revealed:[]},key});
 });
}
export function revealMines(userId,roundId,tile){
 const index=whole(tile,0,24,'Tile');
 return transaction(()=>{
  const round=ownerRound(userId,roundId,'mines');
  if(round.status!=='active')return round.id;
  const details=round.details;
  if(details.revealed.includes(index))return round.id;
  if(details.bombs.includes(index)){
   details.exploded=index;updateRound(round,'lost',0,details);return round.id;
  }
  details.revealed.push(index);
  const automatic=details.revealed.length>=25-details.bombCount||minesMultiplier(details.bombCount,details.revealed.length)>=50;
  if(automatic){
   const payout=minesPayout(round,details);
   walletChange(userId,payout,'mines.payout','mines:payout:'+round.id);
   updateRound(round,'won',payout,details);
  }else updateRound(round,'active',0,details);
  return round.id;
 });
}
export function cashMines(userId,roundId){
 return transaction(()=>{
  const round=ownerRound(userId,roundId,'mines');
  if(round.status!=='active')return round.id;
  if(round.details.revealed.length===0)fail(409,'Reveal a safe tile before collecting.');
  const payout=minesPayout(round,round.details);
  walletChange(userId,payout,'mines.payout','mines:payout:'+round.id);
  updateRound(round,'cashed_out',payout,round.details);
  return round.id;
 });
}

const CRASH_SPEED_MS=5000;
function crashTime(round){
 return round.details.startedAt+Math.log(round.details.crashAt/100)*CRASH_SPEED_MS;
}
function autoTime(round){
 return round.details.startedAt+Math.log(round.details.autoAt/100)*CRASH_SPEED_MS;
}
function multiplierAt(round,at){
 return Math.max(100,Math.min(3000,Math.floor(100*Math.exp(Math.max(0,at-round.details.startedAt)/CRASH_SPEED_MS))));
}
function settleCrashInternal(round,at){
 if(round.status!=='active')return round;
 const data=round.details;
 if(data.autoAt && data.autoAt<data.crashAt && at>=autoTime(round)){
  const payout=Math.floor(round.wager*data.autoAt/100);
  walletChange(round.user_id,payout,'crash.auto.payout','crash:payout:'+round.id);
  updateRound(round,'cashed_out',payout,{...data,cashAt:data.autoAt});
  return {...round,status:'cashed_out',payout,details:{...data,cashAt:data.autoAt}};
 }
 if(at>=crashTime(round)){
  updateRound(round,'lost',0,data);return {...round,status:'lost',payout:0};
 }
 return round;
}
function latestCrash(userId){
 const active=activeRound(userId,'crash');
 if(!active)return null;
 return transaction(()=>settleCrashInternal(ownerRound(userId,active.id,'crash'),Date.now()));
}
export function startCrash(userId,fields){
 const wager=wagerOf(fields),key=keyOf(fields);
 const input=String(fields.auto_at||'').trim();
 if(input && !/^[0-9]{1,2}(?:\.[0-9]{1,2})?$/.test(input))fail(400,'Invalid auto-collect multiplier.');
 const autoAt=input?Math.round(Number(input)*100):0;
 if(autoAt && (autoAt<110||autoAt>2000))fail(400,'Auto-collect must be from 1.10x to 20x.');
 return transaction(()=>{
  const old=priorRound(userId,key,'crash');if(old)return old.id;
  ensureNewKey(userId,key);
  // Finalize any prior round in the same wallet transaction before creating another.
  const pending=activeRound(userId,'crash');
  if(pending){
   const result=settleCrashInternal(pending,Date.now());
   if(result.status==='active')fail(409,'Finish your current Crash round first.');
  }
  walletChange(userId,-wager,'crash.wager','crash:wager:'+key);
  const u=randomInt(1000000)/1000000;
  const crashAt=Math.max(100,Math.min(3000,Math.floor(101/(1-u))));
  return createRound({userId,game:'crash',wager,status:'active',
   details:{crashAt,autoAt,startedAt:Date.now()+3000},key});
 });
}
export function cashCrash(userId,roundId){
 return transaction(()=>{
  const round=ownerRound(userId,roundId,'crash');
  if(round.status!=='active')return round.id;
  const at=Date.now(),settled=settleCrashInternal(round,at);
  if(settled.status!=='active')return round.id;
  if(at<round.details.startedAt)fail(409,'The round has not started.');
  const cents=multiplierAt(round,at);
  if(cents>=round.details.crashAt){
   updateRound(round,'lost',0,round.details);return round.id;
  }
  const payout=Math.floor(round.wager*cents/100);
  walletChange(userId,payout,'crash.manual.payout','crash:payout:'+round.id);
  updateRound(round,'cashed_out',payout,{...round.details,cashAt:cents});
  return round.id;
 });
}
export function crashStatus(userId){
 const active=latestCrash(userId);
 const round=active||decoded(one("SELECT * FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game='crash' ORDER BY id DESC LIMIT 1",config.guildId,userId));
 if(!round)return {round:null,balance:balance(userId),serverNow:Date.now()};
 const terminal=round.status!=='active';
 return {round:{
  id:round.id,status:round.status,wager:round.wager,payout:round.payout,
  startedAt:round.details.startedAt,autoAt:round.details.autoAt||0,
  cashAt:terminal?(round.details.cashAt||0):0,
  crashAt:terminal?round.details.crashAt:null
 },balance:balance(userId),serverNow:Date.now()};
}

function expireInternal(now){
 const expired=all("SELECT * FROM arcade_challenges WHERE guild_id=? AND status='open' AND expires_at<=?",config.guildId,now);
 for(const challenge of expired){
  walletChange(challenge.creator_id,challenge.wager,'coinflip.pvp.expired','pvp:refund:'+challenge.id);
  run("UPDATE arcade_challenges SET status='expired',settled_at=? WHERE id=? AND status='open'",now,challenge.id);
 }
 return expired.length;
}
export function sweepArcade(){
 return transaction(()=>{
  const at=Date.now();
  const active=all("SELECT * FROM arcade_rounds WHERE guild_id=? AND game='crash' AND status='active' LIMIT 500",config.guildId);
  for(const row of active)settleCrashInternal(decoded(row),at);
  return expireInternal(at);
 });
}
export function openChallenges(userId){
 return all("SELECT c.*,u.display_name creator_name,t.display_name target_name FROM arcade_challenges c JOIN users u ON u.id=c.creator_id LEFT JOIN users t ON t.id=c.target_id WHERE c.guild_id=? AND c.status='open' AND c.expires_at>? AND (c.target_id IS NULL OR c.target_id=? OR c.creator_id=?) ORDER BY c.id DESC LIMIT 50",config.guildId,Date.now(),userId,userId);
}
export function createChallenge(userId,fields){
 const wager=wagerOf(fields),face=faceOf(fields),key=keyOf(fields),target=String(fields.target_id||'').trim();
 if(target && (!/^\d{15,22}$/.test(target)||target===userId))fail(400,'Invalid opponent Discord ID.');
 return transaction(()=>{
  const existing=one('SELECT id,creator_id FROM arcade_challenges WHERE request_key=?',key);
  if(existing){if(existing.creator_id!==userId)fail(409,'Request already used.');return existing.id;}
  ensureNewKey(userId,key);
  if(target&&!one('SELECT 1 FROM users WHERE id=?',target))fail(404,'That member must sign in to the website before being challenged.');
  walletChange(userId,-wager,'coinflip.pvp.reserve','pvp:reserve:'+key);
  const at=Date.now();
  return Number(run("INSERT INTO arcade_challenges(guild_id,creator_id,target_id,wager,face,status,request_key,created_at,expires_at) VALUES(?,?,?,?,?,'open',?,?,?)",
  config.guildId,userId,target||null,wager,face,key,at,at+86400000).lastInsertRowid);
 });
}
export function joinChallenge(userId,id){
 const challengeId=requireId(id);
 return transaction(()=>{
  const c=one('SELECT * FROM arcade_challenges WHERE guild_id=? AND id=?',config.guildId,challengeId);
  if(!c)fail(404,'Challenge not found.');
  if(c.status==='complete'&&c.joiner_id===userId)return c.id;
  if(c.status!=='open'||c.expires_at<=Date.now())fail(409,'Challenge is no longer open.');
  if(c.creator_id===userId)fail(409,'You cannot join your own challenge.');
  if(c.target_id&&c.target_id!==userId)fail(403,'This is a private challenge.');
  walletChange(userId,-c.wager,'coinflip.pvp.join','pvp:join:'+c.id);
  const landed=randomInt(2)===0?'heads':'tails';
  const winner=landed===c.face?c.creator_id:userId;
  const joinerFace=otherFace(c.face);
  walletChange(winner,c.wager*2,'coinflip.pvp.payout','pvp:payout:'+c.id);
  const at=Date.now();
  run("UPDATE arcade_challenges SET joiner_id=?,status='complete',result=?,winner_id=?,settled_at=? WHERE id=? AND status='open'",
  userId,landed,winner,at,c.id);
  const members=[[c.creator_id,c.face,userId],[userId,joinerFace,c.creator_id]];
  for(const [player,selected,opponent] of members){
   const paid=player===winner?c.wager*2:0;
   createRound({userId:player,game:'coinflip_pvp',wager:c.wager,payout:paid,status:paid?'won':'lost',
   details:{challengeId:c.id,selected,landed,opponent},key:randomUUID()});
  }
  return c.id;
 });
}
export function cancelChallenge(userId,id){
 const challengeId=requireId(id);
 return transaction(()=>{
  const c=one('SELECT * FROM arcade_challenges WHERE guild_id=? AND id=? AND creator_id=?',config.guildId,challengeId,userId);
  if(!c)fail(404,'Challenge not found.');
  if(c.status!=='open')fail(409,'This challenge can no longer be cancelled.');
  walletChange(userId,c.wager,'coinflip.pvp.cancel','pvp:refund:'+c.id);
  run("UPDATE arcade_challenges SET status='cancelled',settled_at=? WHERE id=? AND status='open'",Date.now(),c.id);
  return c.id;
 });
}
// V1.21: targeted, consent-based player challenges live on member profiles.
// // BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Profile-based PvP Coin Flip has a separate wager history from house games.
export function lastPvpWager(userId){
 const row=one('SELECT wager,created_at FROM arcade_challenges WHERE guild_id=? AND creator_id=? ORDER BY id DESC LIMIT 1',
  config.guildId,userId);
 return {value:row?.wager??50,at:row?.created_at||0};
}
export function incomingChallenges(userId){
 return all(`SELECT c.id,c.creator_id,c.target_id,c.wager,c.face,c.status,c.created_at,c.expires_at,
 u.display_name creator_name,u.username creator_username
 FROM arcade_challenges c JOIN users u ON u.id=c.creator_id
 WHERE c.guild_id=? AND c.target_id=? AND c.status='open' AND c.expires_at>?
 ORDER BY c.id DESC LIMIT 15`,config.guildId,userId,Date.now());
}
export function challengeForUser(userId,challengeId){
 const c=one(`SELECT c.id,c.creator_id,c.target_id,c.joiner_id,c.wager,c.face,c.result,c.winner_id,c.status,
 c.created_at,c.expires_at,c.settled_at,u.display_name creator_name,u.username creator_username,
 t.display_name target_name,j.display_name joiner_name
 FROM arcade_challenges c
 JOIN users u ON u.id=c.creator_id
 LEFT JOIN users t ON t.id=c.target_id
 LEFT JOIN users j ON j.id=c.joiner_id
 WHERE c.guild_id=? AND c.id=?
 AND (c.creator_id=? OR c.target_id=? OR c.joiner_id=?)`,
 config.guildId,requireId(challengeId),userId,userId,userId);
 if(!c)fail(404,'Challenge not found.');
 // Only completed matches expose the landing face and winner.
 if(c.status!=='complete'){c.result=null;c.winner_id=null;}
 return c;
}
export function declineChallenge(userId,challengeId){
 const id=requireId(challengeId);
 return transaction(()=>{
  const c=one('SELECT * FROM arcade_challenges WHERE guild_id=? AND id=? AND target_id=?',
  config.guildId,id,userId);
  if(!c)fail(404,'Challenge not found.');
  if(c.status==='declined')return c.id;
  if(c.status!=='open'||c.expires_at<=Date.now())fail(409,'This challenge can no longer be declined.');
  walletChange(c.creator_id,c.wager,'coinflip.pvp.declined','pvp:refund:'+c.id);
  run("UPDATE arcade_challenges SET status='declined',settled_at=? WHERE id=? AND status='open'",Date.now(),c.id);
  return c.id;
 });
}
export function challengeHistory(userId,limit=12){
 return all(`SELECT c.id,c.creator_id,c.target_id,c.joiner_id,c.wager,c.face,c.result,c.winner_id,c.settled_at,
 a.display_name creator_name,b.display_name opponent_name
 FROM arcade_challenges c
 JOIN users a ON a.id=c.creator_id
 LEFT JOIN users b ON b.id=COALESCE(c.joiner_id,c.target_id)
 WHERE c.guild_id=? AND c.status='complete' AND
 (c.creator_id=? OR c.target_id=? OR c.joiner_id=?)
 ORDER BY c.id DESC LIMIT ?`,config.guildId,userId,userId,userId,limit);
}
export function recentRounds(userId,game=null,limit=20){
 return all('SELECT * FROM arcade_rounds WHERE guild_id=? AND user_id=?'+(game?' AND game=?':'')+' ORDER BY id DESC LIMIT ?',
 ...(game?[config.guildId,userId,game,limit]:[config.guildId,userId,limit])).map(decoded);
}
export function getRound(userId,id,game){
 const round=ownerRound(userId,id,game);
 if(game==='crash'&&round.status==='active'){
  return transaction(()=>settleCrashInternal(ownerRound(userId,id,game),Date.now()));
 }
 return round;
}
export function currentRound(userId,game){
 if(game==='crash')return latestCrash(userId);
 return activeRound(userId,game);
}
export function arcadeSummary(userId){
 const totals=one("SELECT COUNT(*) played,COALESCE(SUM(CASE WHEN status='won' OR (status='cashed_out' AND payout>wager) THEN 1 ELSE 0 END),0) wins,COALESCE(MAX(payout-wager),0) biggest_win FROM arcade_rounds WHERE guild_id=? AND user_id=? AND status!='active'",config.guildId,userId);
 return {balance:balance(userId),...totals};
}
// // BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Current wallet balances (not historical winnings), ranked inside this Discord guild.
// A user beyond the first 50 is returned separately so they can still see their rank.
export function arcadePointsLeaderboard(userId,limit=50){
 const take=Math.max(1,Math.min(50,Number.isInteger(limit)?limit:50));
 const rows=all(`WITH ranked AS (
  SELECT user_id,balance,
   ROW_NUMBER() OVER (ORDER BY balance DESC,user_id ASC) AS position
  FROM level_point_wallets
  WHERE guild_id=? AND balance>0
 )
 SELECT r.user_id,r.balance,r.position,
  u.username,u.display_name,u.avatar,
  COALESCE(p.public,1) AS profile_public,
  CASE WHEN p.public=1 THEN p.nickname ELSE '' END AS nickname,
  CASE WHEN p.public=1 THEN p.avatar_path ELSE '' END AS avatar_path
 FROM ranked r
 JOIN users u ON u.id=r.user_id
 LEFT JOIN profiles p ON p.user_id=r.user_id
 WHERE r.position<=? OR r.user_id=?
 ORDER BY r.position ASC`,config.guildId,take,userId);
 const total=one('SELECT COUNT(*) AS count FROM level_point_wallets WHERE guild_id=? AND balance>0',config.guildId)?.count||0;
 return {leaders:rows.filter(r=>r.position<=take),
   self:rows.find(r=>r.user_id===userId)||null,total};
}
export function transfersFor(userId){
 return all('SELECT reason,delta,balance_after,created_at FROM arcade_transfers WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT 25',config.guildId,userId);
}
export function previewMinesPayout(round){
 if(!round||round.game!=='mines'||round.status!=='active'||!round.details.revealed.length)return 0;
 return minesPayout(round,round.details);
}
