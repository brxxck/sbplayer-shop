// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Shared multiplayer lobby foundation. Blackjack now uses real rounds; Global Crash remains preview-only.
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';

export const ONLINE_GAMES=['blackjack','crash'];
export const BLACKJACK_SEATS=4;
export const ONLINE_LOBBY_STALE_MS=90000;
const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const gameOf=game=>{
 const value=String(game||'');
 if(!ONLINE_GAMES.includes(value))bad('Unknown online game.');
 return value;
};
const userOf=userId=>{
 const value=String(userId||'');
 if(!/^[0-9]{15,22}$/.test(value))bad('Invalid Discord user.');
 return value;
};
const atOf=stamp=>{
 if(!Number.isSafeInteger(stamp)||stamp<0)bad('Invalid lobby time.');
 return stamp;
};

// The durable tables are ready for future server-authoritative rounds.
// The lobby itself never charges or credits a wallet.
db.exec(
 "CREATE TABLE IF NOT EXISTS online_game_waiting ("+
 "guild_id TEXT NOT NULL,game TEXT NOT NULL CHECK(game IN ('blackjack','crash')),"+
 "user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,"+
 "joined_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL,"+
 "PRIMARY KEY(guild_id,game,user_id));"+
 "CREATE INDEX IF NOT EXISTS idx_online_game_waiting_age ON online_game_waiting(guild_id,game,last_seen_at);"+
 "CREATE INDEX IF NOT EXISTS idx_online_game_waiting_order ON online_game_waiting(guild_id,game,joined_at,user_id);"+
 "CREATE TABLE IF NOT EXISTS online_game_rounds ("+
 "id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,"+
 "game TEXT NOT NULL CHECK(game IN ('blackjack','crash')),"+
 "status TEXT NOT NULL CHECK(status IN ('betting','playing','settled','cancelled')),"+
 "created_at INTEGER NOT NULL,starts_at INTEGER,ends_at INTEGER,result_json TEXT NOT NULL DEFAULT '{}');"+
 "CREATE INDEX IF NOT EXISTS idx_online_game_rounds_active ON online_game_rounds(guild_id,game,status,id DESC);"+
 "CREATE TABLE IF NOT EXISTS online_game_entries ("+
 "round_id INTEGER NOT NULL REFERENCES online_game_rounds(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),entry_no INTEGER NOT NULL DEFAULT 0 CHECK(entry_no>=0),"+
 "wager INTEGER NOT NULL CHECK(wager>=0),payout INTEGER NOT NULL DEFAULT 0 CHECK(payout>=0),"+
 "PRIMARY KEY(round_id,user_id,entry_no));"
);

function prune(now){
 run('DELETE FROM online_game_waiting WHERE guild_id=? AND last_seen_at<?',config.guildId,now-ONLINE_LOBBY_STALE_MS);
}

export function joinOnlineLobby(userId,game,now=Date.now()){
 const user=userOf(userId),which=gameOf(game),stamp=atOf(now);
 return transaction(()=>{
  prune(stamp);
  run('INSERT OR IGNORE INTO online_game_waiting(guild_id,game,user_id,joined_at,last_seen_at) VALUES(?,?,?,?,?)',
    config.guildId,which,user,stamp,stamp);
  run('UPDATE online_game_waiting SET last_seen_at=? WHERE guild_id=? AND game=? AND user_id=?',
    stamp,config.guildId,which,user);
  return onlineGamesSnapshot(user,stamp);
 });
}

export function leaveOnlineLobby(userId,game,now=Date.now()){
 const user=userOf(userId),which=gameOf(game),stamp=atOf(now);
 return transaction(()=>{
  prune(stamp);
  run('DELETE FROM online_game_waiting WHERE guild_id=? AND game=? AND user_id=?',
    config.guildId,which,user);
  return onlineGamesSnapshot(user,stamp);
 });
}

// A heartbeat only keeps an already-joined player active; it cannot join a lobby.
export function heartbeatOnlineLobby(userId,now=Date.now()){
 const user=userOf(userId),stamp=atOf(now);
 return transaction(()=>{
  prune(stamp);
  run('UPDATE online_game_waiting SET last_seen_at=? WHERE guild_id=? AND user_id=?',
    stamp,config.guildId,user);
  return onlineGamesSnapshot(user,stamp);
 });
}

function roundMetrics(game){
 const round=one("SELECT id,status,starts_at,ends_at FROM online_game_rounds "+
  "WHERE guild_id=? AND game=? AND status IN ('betting','playing') ORDER BY id DESC LIMIT 1",
  config.guildId,game);
 if(!round)return {roundId:null,phase:'not_started',roundPlayers:0,roundWager:0};
 const metrics=one('SELECT COUNT(DISTINCT user_id) AS players,COALESCE(SUM(wager),0) AS wager FROM online_game_entries WHERE round_id=?',round.id);
 return {roundId:round.id,phase:round.status,roundPlayers:metrics.players,roundWager:metrics.wager,
  startsAt:round.starts_at,endsAt:round.ends_at};
}

export function onlineGamesSnapshot(userId,now=Date.now()){
 const user=userOf(userId),stamp=atOf(now);
 prune(stamp);
 const bj=one("SELECT COUNT(*) AS count FROM online_game_waiting WHERE guild_id=? AND game='blackjack'",config.guildId).count;
 const crash=one("SELECT COUNT(*) AS count FROM online_game_waiting WHERE guild_id=? AND game='crash'",config.guildId).count;
 const row=one("SELECT joined_at FROM online_game_waiting WHERE guild_id=? AND game='blackjack' AND user_id=?",
   config.guildId,user);
 const position=row?one("SELECT COUNT(*) AS position FROM online_game_waiting WHERE guild_id=? AND game='blackjack' "+
  "AND (joined_at<? OR (joined_at=? AND user_id<=?))",config.guildId,row.joined_at,row.joined_at,user).position:null;
 const inCrash=!!one("SELECT 1 FROM online_game_waiting WHERE guild_id=? AND game='crash' AND user_id=?",config.guildId,user);
 // Seats are reserved for the current round, even when the queue changes mid-hand.
 const activeBlackjack=one("SELECT result_json FROM online_game_rounds WHERE guild_id=? AND game='blackjack' "+
  "AND status IN ('betting','playing') ORDER BY id DESC LIMIT 1",config.guildId);
 let pinned=null;
 try{
  if(activeBlackjack){
   const parsed=JSON.parse(activeBlackjack.result_json||'{}');
   pinned=Array.isArray(parsed.seats)?parsed.seats:[];
  }
 }catch{pinned=[];}
 const reserved=pinned?new Set(pinned):null;
 const seatsFilled=pinned?pinned.length:Math.min(bj,BLACKJACK_SEATS);
 const queued=pinned?Math.max(0,all("SELECT user_id FROM online_game_waiting WHERE guild_id=? AND game='blackjack'",config.guildId)
  .filter(x=>!reserved.has(x.user_id)).length):Math.max(0,bj-BLACKJACK_SEATS);
 return {
  serverTime:stamp,
  blackjack:{...roundMetrics('blackjack'),lobbyPlayers:bj,seated:seatsFilled,
    waiting:queued,seats:BLACKJACK_SEATS,joined:position!==null,
    position,atTable:reserved?reserved.has(user):position!==null&&position<=BLACKJACK_SEATS,enabled:true},
  crash:{...roundMetrics('crash'),lobbyPlayers:crash,joined:inCrash,enabled:false}
 };
}
