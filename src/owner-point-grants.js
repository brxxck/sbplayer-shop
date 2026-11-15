// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Owner-only point grants. Previews snapshot recipients; only explicit,
// one-time confirmation changes the shared level/Arcade wallet.
import {randomUUID} from 'node:crypto';
import {db,one,all,run,transaction,upsertUser} from './db.js';
import {config} from './config.js';
import {appendAudit} from './audit.js';

export const MAX_GRANT_PER_MEMBER=10000000;
export const MAX_GRANT_RECIPIENTS=5000;
export const MAX_GRANT_TOTAL=1000000000;
export const GRANT_PREVIEW_TTL_MS=10*60*1000;
const MAX_WALLET=Number.MAX_SAFE_INTEGER-1000000;
const snowflake=id=>typeof id==='string'&&/^\d{15,22}$/.test(id);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const grantId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const parsedAmount=amount=>{
 if(!/^[1-9]\d*$/.test(String(amount??'')))fail(400,'Enter a positive whole number of points.');
 const value=Number(amount);
 if(!Number.isSafeInteger(value)||value>MAX_GRANT_PER_MEMBER)
  fail(400,'Maximum grant is '+MAX_GRANT_PER_MEMBER.toLocaleString('en-GB')+' points per member.');
 return value;
};
const normalizedMember=member=>{
 const user=member?.user||member;
 if(!user||!snowflake(String(user.id||''))||user.bot||user.system||member.pending)return null;
 return {id:String(user.id),
  username:String(user.username||'discord-member').slice(0,90),
  display_name:String(member.nick||user.global_name||user.username||'Discord member').slice(0,120),
  avatar:typeof user.avatar==='string'&&/^[a-zA-Z0-9_]+$/.test(user.avatar)?user.avatar:null};
};

db.exec("CREATE TABLE IF NOT EXISTS owner_point_grants ("
 +"id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),"
 +"scope TEXT NOT NULL CHECK(scope IN ('single','everyone','online')),"
 +"amount INTEGER NOT NULL CHECK(amount>0),reason TEXT NOT NULL,recipients_json TEXT NOT NULL,"
 +"recipient_count INTEGER NOT NULL,total INTEGER NOT NULL,"
 +"status TEXT NOT NULL CHECK(status IN ('pending','applied')),"
 +"created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,confirmed_at INTEGER);"
 +"CREATE INDEX IF NOT EXISTS idx_owner_point_grants_actor ON owner_point_grants(guild_id,actor_id,created_at DESC);");

async function allDiscordMembers(discord){
 if(typeof discord.listMembers!=='function')
  fail(503,'Discord member listing is unavailable. Enable the Server Members Intent for the website bot.');
 const selected=new Map();
 let after='';
 for(let page=0;page<50;page++){
  let batch;
  try{batch=await discord.listMembers(after,1000);}
  catch{fail(503,'Could not list Discord members. Check the bot Server Members Intent and permissions.');}
  if(!Array.isArray(batch))fail(503,'Discord returned an invalid member list.');
  if(!batch.length)return [...selected.values()];
  for(const member of batch){
   const person=normalizedMember(member);
   if(person)selected.set(person.id,person);
   if(selected.size>MAX_GRANT_RECIPIENTS)
    fail(413,'Too many eligible members for one grant. Limit: '+MAX_GRANT_RECIPIENTS.toLocaleString('en-GB')+'.');
  }
  const last=String(batch.at(-1)?.user?.id||batch.at(-1)?.id||'');
  if(!snowflake(last)||last===after)fail(503,'Discord member pagination did not advance. Nothing was granted.');
  after=last;
  if(batch.length<1000)return [...selected.values()];
 }
 fail(503,'Discord member listing was incomplete. Nothing was granted.');
}

async function onlineWebsiteMembers(discord,onlineIds){
 if(typeof discord.getGuildMember!=='function')
  fail(503,'Discord membership verification is unavailable.');
 const ids=[...new Set(Array.isArray(onlineIds)?onlineIds:[])].filter(snowflake);
 if(ids.length>MAX_GRANT_RECIPIENTS)
  fail(413,'Too many online members for a single grant.');
 const users=[];
 for(let offset=0;offset<ids.length;offset+=10){
  let members;
  try{members=await Promise.all(ids.slice(offset,offset+10).map(id=>discord.getGuildMember(id)));}
  catch{fail(503,'Unable to verify online website members against Discord. Nothing was granted.');}
  for(const member of members){
   const person=normalizedMember(member);
   if(person)users.push(person);
  }
 }
 return users;
}

export function pointGrantMembers(query=''){
 const term=String(query||'').trim().slice(0,65);
 if(!term)return [];
 return all("SELECT id,username,display_name,avatar FROM users "
 +"WHERE id=? OR INSTR(LOWER(username),LOWER(?))>0 OR INSTR(LOWER(display_name),LOWER(?))>0 "
 +"ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END,updated_at DESC LIMIT 12",
 term,term,term,term);
}
export function pointGrantRecent(limit=12){
 return all("SELECT g.id,g.scope,g.amount,g.reason,g.recipient_count,g.total,g.status,"
 +"g.created_at,g.confirmed_at,u.display_name actor_name "
 +"FROM owner_point_grants g JOIN users u ON u.id=g.actor_id "
 +"WHERE g.guild_id=? AND g.status='applied' ORDER BY g.confirmed_at DESC LIMIT ?",
 config.guildId,Math.max(1,Math.min(30,limit)));
}
export function pointGrantPreview(actorId,id){
 if(!grantId(id))fail(404,'Grant preview not found.');
 const grant=one('SELECT * FROM owner_point_grants WHERE guild_id=? AND actor_id=? AND id=?',
  config.guildId,actorId,id);
 if(!grant)fail(404,'Grant preview not found.');
 return {...grant,recipients:JSON.parse(grant.recipients_json)};
}

export async function preparePointGrant({actorId,scope,amount,recipientId='',reason='',discord,onlineIds=[]}){
 if(!snowflake(actorId))fail(400,'Invalid owner account.');
 if(!['single','everyone','online'].includes(scope))fail(400,'Choose who should receive points.');
 const countPoints=parsedAmount(amount);
 const note=String(reason||'').trim().replace(/\s+/g,' ');
 if(note.length<3||note.length>180)fail(400,'Enter a reason between 3 and 180 characters.');
 let recipients=[];
 if(scope==='single'){
  if(!snowflake(recipientId))fail(400,'Enter a valid Discord user ID for a member.');
  let member;
  try{member=await discord.getGuildMember(recipientId);}
  catch{fail(503,'Could not verify the selected member with Discord. Nothing was granted.');}
  const user=normalizedMember(member);
  if(!user||user.id!==recipientId)fail(404,'That Discord user is not an eligible server member.');
  recipients=[user];
 }else if(scope==='everyone')recipients=await allDiscordMembers(discord);
 else recipients=await onlineWebsiteMembers(discord,onlineIds);
 if(!recipients.length)
  fail(409,scope==='online'?'No verified members are currently online on the website.':'No eligible Discord members were found.');
 if(recipients.length>MAX_GRANT_RECIPIENTS)fail(413,'Too many recipients for a single grant.');
 const total=countPoints*recipients.length;
 if(!Number.isSafeInteger(total)||total>MAX_GRANT_TOTAL)
  fail(400,'Grant exceeds '+MAX_GRANT_TOTAL.toLocaleString('en-GB')+' total points. Choose a smaller amount.');
 const id=randomUUID(),at=Date.now();
 run("INSERT INTO owner_point_grants "
  +"(id,guild_id,actor_id,scope,amount,reason,recipients_json,recipient_count,total,status,created_at,expires_at)"
  +" VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  id,config.guildId,actorId,scope,countPoints,note,JSON.stringify(recipients),
  recipients.length,total,'pending',at,at+GRANT_PREVIEW_TTL_MS);
 return pointGrantPreview(actorId,id);
}

export function confirmPointGrant({actorId,id,confirmation,ip=''}) {
 if(!snowflake(actorId)||!grantId(id))fail(404,'Grant preview not found.');
 if(confirmation!=='GRANT')fail(400,'Type GRANT to confirm the point distribution.');
 return transaction(()=>{
  const grant=pointGrantPreview(actorId,id);
  if(grant.status==='applied')
   return {alreadyApplied:true,id,scope:grant.scope,count:grant.recipient_count,amount:grant.amount,total:grant.total};
  if(grant.status!=='pending'||grant.expires_at<=Date.now())
   fail(409,'Grant preview expired. Prepare a new one to continue.');
  const recipients=grant.recipients;
  if(!Array.isArray(recipients)||recipients.length!==grant.recipient_count
     ||new Set(recipients.map(p=>p.id)).size!==recipients.length)
   fail(409,'The grant preview could not be verified.');
  if(grant.amount*recipients.length!==grant.total
     ||grant.amount<1||grant.amount>MAX_GRANT_PER_MEMBER||grant.total>MAX_GRANT_TOTAL)
   fail(409,'The grant amount could not be verified.');
  const stamp=Date.now();
  const marked=run("UPDATE owner_point_grants SET status='applied',confirmed_at=? "
   +"WHERE id=? AND guild_id=? AND actor_id=? AND status='pending'",
   stamp,id,config.guildId,actorId);
  if(marked.changes!==1)fail(409,'Grant has already been processed.');
  for(const person of recipients){
   if(!snowflake(person.id))fail(409,'Invalid recipient in preview.');
   upsertUser({id:person.id,username:person.username,global_name:person.display_name,avatar:person.avatar});
   run('INSERT OR IGNORE INTO level_point_wallets (guild_id,user_id,balance,claimed_level) VALUES(?,?,0,0)',
    config.guildId,person.id);
   const updated=run('UPDATE level_point_wallets SET balance=balance+? '
    +'WHERE guild_id=? AND user_id=? AND balance<=?',
    grant.amount,config.guildId,person.id,MAX_WALLET-grant.amount);
   if(updated.changes!==1)
    fail(409,'A wallet would exceed its maximum balance. Nothing was granted.');
   const wallet=one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',
     config.guildId,person.id);
   run('INSERT INTO arcade_transfers '
     +'(guild_id,user_id,event_key,reason,delta,balance_after,created_at) VALUES(?,?,?,?,?,?,?)',
     config.guildId,person.id,'owner:grant:'+grant.id+':'+person.id,
     'owner.grant',grant.amount,wallet.balance,stamp);
  }
  appendAudit(db,{actor:actorId,role:'owner',action:'level_points.owner.grant',
   target:grant.scope==='single'?recipients[0].id:'guild:'+config.guildId,
   details:{grantId:id,scope:grant.scope,recipients:recipients.length,amountEach:grant.amount,
    totalPoints:grant.total,reason:grant.reason,sampleIds:recipients.slice(0,10).map(p=>p.id)},ip});
  return {alreadyApplied:false,id,scope:grant.scope,count:recipients.length,amount:grant.amount,total:grant.total};
 });
}
