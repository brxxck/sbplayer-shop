// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const tmp=mkdtempSync(join(tmpdir(),'mega-inpvp-discord-autolink-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(tmp,'auto.sqlite');
const {db,one,run}=await import('../src/db.js');
const {verifyAudit}=await import('../src/audit.js');
const {parseInPvPDiscordBadge,captureInPvPProfileDiscord,inpvpPlayerProfileUrl}=
 await import('../src/mega-inpvp-discord-collector.js');
const {matchInPvPDiscordToGuild,exactDiscordMember,ensureLinkedWebsiteProfile}=
 await import('../src/mega-inpvp-discord-match.js');
const {
 enqueueMegaProfileCandidates,nextMegaProfileScan,markMegaProfileScan,
 autoLinkMegaProfile,allMegaPlayerProfileLinks,linkMegaPlayerProfile,
 unlinkMegaPlayerProfile,allowMegaAutoProfile,megaAutoSuppressedNames
}=await import('../src/mega-player-profile-links.js');
after(()=>{db.close();rmSync(tmp,{recursive:true,force:true});});

const owner='100000000000000002',memberId='100000000000000009',
 member2='100000000000000010';
function member(id,username,{nick='',bot=false,pending=false}={}){
 return {user:{id,username,global_name:username,bot},nick,pending,roles:[]};
}
const source=(name,handle='unk.sb')=>({
 profileConfirmed:true,profileName:name,challenge:false,notFound:false,
 badges:handle?[{handle:'@'+handle,discordId:null}]:[]
});
test('reads only an InPvP-linked Discord badge for the exact Minecraft profile',()=>{
 assert.equal(inpvpPlayerProfileUrl('SBisOnTop'),
   'https://inpvp.net/mineville/profile/SBisOnTop');
 assert.throws(()=>inpvpPlayerProfileUrl('../evil'));
 const badge=parseInPvPDiscordBadge(source('SBisOnTop'),'SBisOnTop');
 assert.deepEqual(badge,{status:'found',handle:'unk.sb',discordId:null,
  profileUrl:inpvpPlayerProfileUrl('SBisOnTop')});
 assert.equal(parseInPvPDiscordBadge(source('AnotherUser'),'SBisOnTop').status,'profile-mismatch');
 assert.equal(parseInPvPDiscordBadge(source('SBisOnTop',null),'SBisOnTop').status,'no-discord');
 assert.equal(parseInPvPDiscordBadge({
  ...source('SBisOnTop'),badges:[{handle:'@unk.sb'},{handle:'@different.name'}]
 },'SBisOnTop').status,'ambiguous');
 assert.equal(parseInPvPDiscordBadge({
  profileConfirmed:false,profileName:'SBisOnTop',badges:[{handle:'@unk.sb'}]
 },'SBisOnTop').status,'unavailable');
});
test('accepts verified Discord user-ID links but never arbitrary usernames from a biography',()=>{
 assert.equal(parseInPvPDiscordBadge({
  profileConfirmed:true,profileName:'SBisOnTop',badges:[{discordId:memberId}]
 },'SBisOnTop').discordId,memberId);
 assert.equal(parseInPvPDiscordBadge({
  profileConfirmed:true,profileName:'SBisOnTop',bio:'Contact @unk.sb',badges:[]
 },'SBisOnTop').status,'no-discord');
});
test('profile browser only accepts the official exact InPvP player URL',async()=>{
 const page={
  goto:async url=>{page.current=url;},
  url:()=>page.current,
  evaluate:async()=>source('SBisOnTop')
 };
 assert.equal((await captureInPvPProfileDiscord(page,'SBisOnTop')).handle,'unk.sb');
 const hostile={...page,goto:async()=>{hostile.current='https://example.org/evil';},
  url:()=>hostile.current};
 assert.equal((await captureInPvPProfileDiscord(hostile,'SBisOnTop')).status,'redirected');
});
test('Discord guild matching requires exact username, never nickname, bot or wrong ID',async()=>{
 const nickOnly=member(member2,'other.account',{nick:'unk.sb'});
 const real=member(memberId,'unk.sb');
 assert.equal(exactDiscordMember([nickOnly],{handle:'unk.sb'}).status,'discord_not_found');
 assert.equal(exactDiscordMember([real],{handle:'unk.sb'}).discordId,memberId);
 assert.equal(exactDiscordMember([member(memberId,'unk.sb',{bot:true})],{handle:'unk.sb'}).status,'discord_not_found');
 assert.equal(exactDiscordMember([real],{handle:'unk.sb',discordId:member2}).status,'discord_not_found');
 const badge={status:'found',handle:'unk.sb',discordId:null};
 const match=await matchInPvPDiscordToGuild(badge,{
  findGuildMembers:async()=>[nickOnly,real],
  findGuildMember:async id=>id===memberId?real:null
 });
 assert.equal(match.status,'matched');
 assert.equal(match.discordId,memberId);
 assert.equal((await matchInPvPDiscordToGuild(badge,{
  findGuildMembers:async()=>[nickOnly],findGuildMember:async()=>nickOnly
 })).status,'discord_not_found');
 assert.equal((await matchInPvPDiscordToGuild(badge,{
  findGuildMembers:async()=>{throw new Error('Discord unavailable');}
 })).status,'api_unavailable');
});

test('site account can be created only for exact verified Discord guild member without login grants',()=>{
 assert.equal(ensureLinkedWebsiteProfile(member(memberId,'unk.sb')),true);
 assert.equal(one('SELECT username FROM users WHERE id=?',memberId).username,'unk.sb');
 assert.ok(one('SELECT user_id FROM profiles WHERE user_id=?',memberId));
 assert.equal(one('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?',memberId).n,0);
 assert.equal(ensureLinkedWebsiteProfile(member(member2,'another',{bot:true})),false);
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  owner,'owner','Owner',Date.now());
});

test('queue is idempotent, spaced, and an automatic link has a verifiable audit record',()=>{
 const added=enqueueMegaProfileCandidates([{gamertag:'SBisOnTop'},{gamertag:'sbisontop'},
  {gamertag:'PlayerNew'}]);
 assert.equal(added,2);
 assert.equal(nextMegaProfileScan().gamertag,'PlayerNew');
 const scan=markMegaProfileScan('PlayerNew','no_discord');
 assert.equal(scan,'no_discord');
 const saved=autoLinkMegaProfile({
  gamertag:'SBisOnTop',discordId:memberId,discordHandle:'unk.sb',
  profileUrl:inpvpPlayerProfileUrl('SBisOnTop')
 });
 assert.equal(saved.changed,true);
 assert.equal(saved.status,'linked');
 assert.equal(allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop').discordId,memberId);
 assert.equal(allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop').source,'inpvp');
 assert.equal(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='mega.profile.auto.link'").n,1);
 assert.equal(verifyAudit(db).ok,true);
});
test('manual owner link takes precedence and auto-linking never overwrites it',()=>{
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
   member2,'another','Another',Date.now());
 linkMegaPlayerProfile({gamertag:'SBisOnTop',discordId:member2,actorId:owner});
 const current=allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop');
 assert.equal(current.discordId,member2);
 assert.equal(current.source,'owner');
 const attempted=autoLinkMegaProfile({gamertag:'SBisOnTop',discordId:memberId,
  discordHandle:'unk.sb',profileUrl:inpvpPlayerProfileUrl('SBisOnTop')});
 assert.equal(attempted.changed,false);
 assert.equal(attempted.status,'already_linked');
 assert.equal(allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop').discordId,member2);
});
test('owner unlink prevents immediate re-linking; owner can explicitly re-enable discovery',()=>{
 const result=unlinkMegaPlayerProfile('SBisOnTop');
 assert.equal(result.changed,true);
 assert.ok(megaAutoSuppressedNames().includes('SBisOnTop'));
 assert.equal(allMegaPlayerProfileLinks().some(x=>x.gamertag==='SBisOnTop'),false);
 assert.equal(autoLinkMegaProfile({gamertag:'SBisOnTop',discordId:memberId,
  discordHandle:'unk.sb',profileUrl:inpvpPlayerProfileUrl('SBisOnTop')}).status,'suppressed');
 assert.equal(allowMegaAutoProfile('SBisOnTop').changed,true);
 assert.equal(megaAutoSuppressedNames().includes('SBisOnTop'),false);
 const result2=autoLinkMegaProfile({gamertag:'SBisOnTop',discordId:memberId,
  discordHandle:'unk.sb',profileUrl:inpvpPlayerProfileUrl('SBisOnTop')});
 assert.equal(result2.status,'linked');
 assert.equal(verifyAudit(db).ok,true);
});
test('automatic links reject incorrect host and cannot replace a conflicting user ID',()=>{
 assert.throws(()=>autoLinkMegaProfile({gamertag:'SBisOnTop',discordId:memberId,
  discordHandle:'unk.sb',profileUrl:'https://evil.example/SBisOnTop'}));
 assert.equal(autoLinkMegaProfile({gamertag:'SBisOnTop',discordId:member2,
  discordHandle:'another',profileUrl:inpvpPlayerProfileUrl('SBisOnTop')}).status,'conflict');
});
