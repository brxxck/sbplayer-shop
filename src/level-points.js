// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {db,one,all,run,transaction,getSetting,setSetting} from './db.js';
import {config} from './config.js';
import {appendAudit} from './audit.js';
export const POINTS_PER_LEVEL=100;
export const DEFAULT_LEVEL_BOT='1522414493676732456';
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const snowflake=s=>typeof s==='string'&&/^\d{15,22}$/.test(s);
db.exec(`
CREATE TABLE IF NOT EXISTS level_point_snapshots (
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL,level INTEGER NOT NULL CHECK(level>=0),
 highest_level INTEGER NOT NULL CHECK(highest_level>=0),xp INTEGER NOT NULL CHECK(xp>=0),
 synced_at INTEGER NOT NULL,PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS level_point_wallets (
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),claimed_level INTEGER NOT NULL DEFAULT 0 CHECK(claimed_level>=0),
 PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS level_point_ledger (
 id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),
 from_level INTEGER NOT NULL,to_level INTEGER NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),
 created_at INTEGER NOT NULL,UNIQUE(guild_id,user_id,to_level));
`);
export function levelConnection(){return {
 configured:!!getSetting('level_points_key_hash'),botId:getSetting('level_points_bot_id',DEFAULT_LEVEL_BOT),
 lastSync:one('SELECT MAX(synced_at) at FROM level_point_snapshots WHERE guild_id=?',config.guildId)?.at||0,
 members:one('SELECT COUNT(*) n FROM level_point_snapshots WHERE guild_id=?',config.guildId)?.n||0
};}
export function rotateLevelKey(actorId){
 const key=randomBytes(32).toString('hex');
 transaction(()=>{
  setSetting('level_points_key_hash',digest(key));
  appendAudit(db,{actor:actorId,role:'owner',action:'level_points.connection.rotate',target:'botghost',details:{botId:levelConnection().botId}});
 });return key;
}
export function revokeLevelKey(actorId){transaction(()=>{
 setSetting('level_points_key_hash','');
 appendAudit(db,{actor:actorId,role:'owner',action:'level_points.connection.revoke',target:'botghost'});
});}
export function authenticateLevelSync(header){
 const expected=getSetting('level_points_key_hash');
 const token=/^Bearer ([a-f0-9]{64})$/.exec(String(header||''))?.[1];
 if(!expected||!token||!timingSafeEqual(Buffer.from(digest(token),'hex'),Buffer.from(expected,'hex')))
  fail(401,'Invalid level sync credentials.');
}
export function syncLevelSnapshot(payload){
 if(!payload||Array.isArray(payload)||typeof payload!=='object')fail(400,'Invalid level data.');
 const {guild_id,user_id,bot_id}=payload;
 if(!snowflake(guild_id)||guild_id!==config.guildId||!snowflake(user_id)||bot_id!==levelConnection().botId)
  fail(400,'Level data does not match the configured Discord server and bot.');
 const integer=(value,max)=>{
  if(!['string','number'].includes(typeof value)||!/^\d+$/.test(String(value)))fail(400,'Level and XP must be whole numbers.');
  const n=Number(value);if(!Number.isSafeInteger(n)||n>max)fail(400,'Level data is out of range.');return n;
 };
 const level=integer(payload.level,1000000),xp=integer(payload.xp??0,Number.MAX_SAFE_INTEGER);
 run(`INSERT INTO level_point_snapshots(guild_id,user_id,level,highest_level,xp,synced_at) VALUES(?,?,?,?,?,?)
 ON CONFLICT(guild_id,user_id) DO UPDATE SET level=excluded.level,
 highest_level=MAX(level_point_snapshots.highest_level,excluded.level),xp=excluded.xp,synced_at=excluded.synced_at`,guild_id,user_id,level,level,xp,Date.now());
 return {ok:true,level};
}
export function levelWallet(userId){
 const snapshot=one('SELECT * FROM level_point_snapshots WHERE guild_id=? AND user_id=?',config.guildId,userId);
 const wallet=one('SELECT * FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,userId);
 const claimed=wallet?.claimed_level||0;
 return {snapshot,balance:wallet?.balance||0,claimedLevel:claimed,
 claimable:Math.max(0,(snapshot?.highest_level||0)-claimed)*POINTS_PER_LEVEL,
 history:all('SELECT * FROM level_point_ledger WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT 30',config.guildId,userId)};
}
export function claimLevelPoints(userId){return transaction(()=>{
 const state=levelWallet(userId);
 if(!state.snapshot)fail(409,'Sync your Discord level before claiming.');
 if(!state.claimable)fail(409,'You have already claimed all available levels.');
 const to=state.snapshot.highest_level;
 run(`INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,?)
 ON CONFLICT(guild_id,user_id) DO UPDATE SET balance=balance+excluded.balance,claimed_level=excluded.claimed_level`,config.guildId,userId,state.claimable,to);
 run('INSERT INTO level_point_ledger(guild_id,user_id,from_level,to_level,amount,created_at) VALUES(?,?,?,?,?,?)',config.guildId,userId,state.claimedLevel+1,to,state.claimable,Date.now());
 appendAudit(db,{actor:userId,role:'member',action:'level_points.claim',target:userId,details:{fromLevel:state.claimedLevel+1,toLevel:to,points:state.claimable}});
 return state.claimable;
});}
export async function readLevelSyncJson(req){
 if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||'')))fail(415,'Use application/json.');
 const parts=[];let size=0;
 for await(const part of req){size+=part.length;if(size>4096)fail(413,'Level sync data is too large.');parts.push(part);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail(400,'Invalid JSON.');}
}
