// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Server-authoritative Plinko: one fair 50/50 decision at every peg.
// The stored animation path IS the winning path. No client-supplied slot
// or multiplier can influence payment. Points are entertainment-only.
import {randomInt} from 'node:crypto';
import {db,one,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange,ARCADE_MIN_BET,ARCADE_MAX_BET} from './arcade.js';

export const PLINKO_ROWS=Object.freeze([8,12,16]);
export const PLINKO_RISKS=Object.freeze(['low','medium','high']);
export const PLINKO_COUNTS=Object.freeze([1,5,10,25,50,100]);
// Multiplier * 100, from edge slot to edge slot. 50/50 peg decisions
// make landing probability C(rows,slot)/2^rows. Independently weighted,
// symmetric tables return approximately 96% BEFORE whole-point rounding.
export const PLINKO_TABLES=Object.freeze({
 8:Object.freeze({
  low:Object.freeze([417,182,110,83,76,83,110,182,417]),
  medium:Object.freeze([1076,262,112,70,60,70,112,262,1076]),
  high:Object.freeze([1562,296,109,62,52,62,109,296,1562])
 }),
 12:Object.freeze({
  low:Object.freeze([1160,429,217,134,97,80,76,80,97,134,217,429,1160]),
  medium:Object.freeze([5986,1105,347,153,88,64,58,64,88,153,347,1105,5986]),
  high:Object.freeze([11488,1574,402,154,80,55,49,55,80,154,402,1574,11488])
 }),
 16:Object.freeze({
  low:Object.freeze([3311,1092,488,263,164,116,91,79,75,79,91,116,164,263,488,1092,3311]),
  medium:Object.freeze([35241,5349,1359,477,214,118,78,61,57,61,78,118,214,477,1359,5349,35241]),
  high:Object.freeze([91021,9905,1976,576,224,111,69,52,47,52,69,111,224,576,1976,9905,91021])
 })
});

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const userOf=value=>{
 const user=String(value||'');
 if(!/^[0-9]{15,22}$/.test(user))fail(400,'Invalid Discord user.');
 return user;
};
const integerField=(raw,label,accepted)=>{
 if(!/^[0-9]+$/.test(String(raw??'')))fail(400,'Invalid '+label+'.');
 const value=Number(raw);
 if(!accepted.includes(value))fail(400,'Unsupported '+label+'.');
 return value;
};
const wagerField=raw=>{
 if(!/^[0-9]+$/.test(String(raw??'')))fail(400,'Invalid wager.');
 const amount=Number(raw);
 if(!Number.isSafeInteger(amount)||amount<ARCADE_MIN_BET||amount>ARCADE_MAX_BET)
  fail(400,'Wager must be between 10 and 10,000 points per ball.');
 return amount;
};
const requestKey=raw=>{
 const id=String(raw||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  fail(400,'Invalid game request. Refresh and retry.');
 return id;
};
export function plinkoTable(rows,risk){
 const count=integerField(rows,'row count',PLINKO_ROWS);
 if(!PLINKO_RISKS.includes(String(risk||'')))fail(400,'Unsupported risk level.');
 return PLINKO_TABLES[count][String(risk)];
}
export const plinkoMultiplier=(rows,risk,slot)=>plinkoTable(rows,risk)[slot];
export function plinkoProbability(rows,slot){
 const count=integerField(rows,'row count',PLINKO_ROWS);
 if(!Number.isInteger(slot)||slot<0||slot>count)fail(400,'Invalid slot.');
 let combinations=1;
 for(let i=1;i<=slot;i++)combinations=combinations*(count-i+1)/i;
 return combinations/2**count;
}
export const plinkoRtp=(rows,risk)=>plinkoTable(rows,risk).reduce(
 (returnTotal,cents,slot)=>returnTotal+plinkoProbability(rows,slot)*cents/100,0
);
export function plinkoPath(rows,draw=randomInt){
 const count=integerField(rows,'row count',PLINKO_ROWS);
 const decisions=[];
 for(let peg=0;peg<count;peg++){
  const direction=draw(2);
  if(direction!==0&&direction!==1)throw Error('Plinko random bit must be 0 or 1.');
  decisions.push(direction);
 }
 return Object.freeze({decisions:Object.freeze(decisions),slot:decisions.reduce((a,b)=>a+b,0)});
}
export const plinkoPayout=(wager,cents)=>Math.floor(wager*cents/100);
// One atomic batch. A duplicate request reuses precisely the same saved
// result; a mutated request with the old UUID is rejected.
export function dropPlinko(userId,fields,draw=randomInt){
 const user=userOf(userId);
 const rows=integerField(fields?.rows,'row count',PLINKO_ROWS);
 const risk=String(fields?.risk||'').toLowerCase();
 const table=plinkoTable(rows,risk);
 const count=integerField(fields?.count,'ball count',PLINKO_COUNTS);
 const perBall=wagerField(fields?.wager);
 const key=requestKey(fields?.request_id);
 const totalWager=count*perBall;
 return transaction(()=>{
  const previous=one('SELECT id,user_id,game,details_json FROM arcade_rounds WHERE request_key=?',key);
  if(previous){
   if(previous.user_id!==user||previous.game!=='plinko')
    fail(409,'This game request ID has already been used.');
   const d=JSON.parse(previous.details_json||'{}');
   if(d.rows!==rows||d.risk!==risk||d.count!==count||d.perBall!==perBall)
    fail(409,'This request ID was already used with different game settings.');
   return previous.id;
  }
  if(one('SELECT 1 FROM arcade_challenges WHERE request_key=?',key))
   fail(409,'This game request ID has already been used.');
  walletChange(user,-totalWager,'plinko.wager','plinko:wager:'+key);
  const balls=[];
  let totalPayout=0;
  for(let index=0;index<count;index++){
   const path=plinkoPath(rows,draw);
   const multiplierCents=table[path.slot];
   const payout=plinkoPayout(perBall,multiplierCents);
   totalPayout+=payout;
   balls.push({index,slot:path.slot,decisions:path.decisions,
    multiplierCents,wager:perBall,payout});
  }
  if(totalPayout)walletChange(user,totalPayout,'plinko.payout','plinko:payout:'+key);
  const details={rows,risk,count,perBall,balls,
   theoreticalRtp:plinkoRtp(rows,risk),pointRounding:'floor'};
  const now=Date.now();
  return Number(run('INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) '+
   'VALUES(?,?,?, ?,?,?,?,?,?,?)',
   config.guildId,user,'plinko',totalWager,totalPayout,
   totalPayout>totalWager?'won':totalPayout===totalWager?'push':'lost',
   JSON.stringify(details),key,now,now).lastInsertRowid);
 });
}
