// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sbstore-xbox-link-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(dir,'xbox-test.sqlite');

const {db,run,one}=await import('../src/db.js');
const {verifyAudit}=await import('../src/audit.js');
const {createXboxLinkAuth}=await import('../src/xbox-link-auth.js');
const {saveXboxLink,unlinkXboxLink,xboxLinkForUser,allVerifiedXboxGamertags}=
 await import('../src/xbox-gamertag-links.js');
const {allMegaPlayerProfileLinks,linkMegaPlayerProfile}=
 await import('../src/mega-player-profile-links.js');
const {profile,profileEdit}=await import('../src/views.js');
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

const userId='100000000000000002',other='100000000000000008';
const session='x'.repeat(43),xuid='2533274791381930';
run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
 userId,'sb','SB',Date.now());
run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
 other,'another','Other member',Date.now());

function fakeFetcher({
 profileName='SBisOnTop',profileXuid=xuid,returnProfile=true,
 xstsXuid=xuid,xstsName='SBisOnTop'
}={}){
 const requests=[];
 const fetcher=async(url,options)=>{
  requests.push({url,options});
  const respond=value=>({ok:true,json:async()=>value});
  if(url.endsWith('/token'))return respond({access_token:'ms-access-token-very-secret'});
  if(url.includes('user.auth.xboxlive.com'))
   return respond({Token:'xbox-user-token',DisplayClaims:{xui:[{uhs:'9876543210'}]}});
  if(url.includes('xsts.auth.xboxlive.com'))
   return respond({Token:'xsts-user-token',DisplayClaims:{xui:[{
    uhs:'9876543210',xid:xstsXuid,gtg:xstsName
   }]}});
  if(url.includes('profile.xboxlive.com')){
   if(!returnProfile)return {ok:false,status:403,json:async()=>({})};
   return respond({profileUsers:[{id:profileXuid,settings:[
    {id:'Gamertag',value:profileName}]}]});
  }
  throw Error('Unknown HTTP endpoint: '+url);
 };
 return {fetcher,requests};
}
const makeAuth=(fetcher,more={})=>createXboxLinkAuth({
 clientId:'11111111-1111-1111-1111-111111111111',
 clientSecret:'super-private-app-secret',
 identityKey:'THIS IS A 32 PLUS CHARACTER PER SITE HMAC SECRET',
 baseUrl:'https://sbstore.info',fetcher,...more
});
const finish=async(auth,user=userId,sessionKey=session)=>{
 const target=new URL(auth.begin(sessionKey,user));
 return auth.complete({state:target.searchParams.get('state'),
  code:'one-time-ms-code',sessionKey,userId:user});
};

test('disabled until all three private Railway variables are set',()=>{
 const disabled=createXboxLinkAuth({
  baseUrl:'https://sbstore.info',clientId:'abc',clientSecret:'abc',
  identityKey:'short'
 });
 assert.equal(disabled.configured,false);
 assert.throws(()=>disabled.begin(session,userId),/not configured/);
 assert.equal(disabled.redirectUri,'https://sbstore.info/profile/microsoft/callback');
});

test('Microsoft OAuth is for Xbox sign-in only, with PKCE and no offline token scope',async()=>{
 const {fetcher,requests}=fakeFetcher();
 const auth=makeAuth(fetcher);
 const target=new URL(auth.begin(session,userId));
 assert.equal(target.hostname,'login.microsoftonline.com');
 assert.equal(target.searchParams.get('scope'),'xboxlive.signin');
 assert.equal(target.searchParams.get('code_challenge_method'),'S256');
 assert.equal(target.searchParams.get('response_type'),'code');
 assert.ok(target.searchParams.get('state').length>=36);
 const result=await auth.complete({
  state:target.searchParams.get('state'),code:'one-time-ms-code',
  sessionKey:session,userId
 });
 assert.equal(result.gamertag,'SBisOnTop');
 assert.match(result.identityKey,/^[0-9a-f]{64}$/);
 assert.ok(!result.identityKey.includes(xuid));
 assert.ok(requests.find(r=>r.url.includes('xsts.auth.xboxlive.com')));
 assert.ok(requests.find(r=>r.url.includes('profile.xboxlive.com')));
 assert.ok(requests.every(r=>!r.url.includes('inpvp.net')));
 assert.ok(!requests.some(r=>r.options.body?.toString().includes('offline_access')));
 assert.equal(requests.find(r=>r.url.includes('/token')).options.body.get('code_verifier').length>35,true);
 await assert.rejects(()=>auth.complete({
  state:target.searchParams.get('state'),code:'one-time-ms-code',
  sessionKey:session,userId
 }),/expired/);
});

test('state cannot be redeemed by a second Discord account or reused',async()=>{
 const {fetcher}=fakeFetcher();
 const auth=makeAuth(fetcher);
 const state=new URL(auth.begin(session,userId)).searchParams.get('state');
 await assert.rejects(()=>auth.complete({
  state,code:'ms-code',sessionKey:session,userId:other
 }),/does not belong/);
 await assert.rejects(()=>auth.complete({
  state,code:'ms-code',sessionKey:session,userId
 }),/expired/);
});

test('Xbox profile mismatch fails closed even with valid-looking XSTS fallback',async()=>{
 const {fetcher}=fakeFetcher({profileXuid:'2533274791381931'});
 const auth=makeAuth(fetcher);
 await assert.rejects(()=>finish(auth),/identity did not match/);
});

test('XSTS can supply an authenticated gamertag if Xbox profile API is unavailable',async()=>{
 const {fetcher}=fakeFetcher({returnProfile:false});
 const auth=makeAuth(fetcher);
 const result=await finish(auth);
 assert.equal(result.gamertag,'SBisOnTop');
 assert.match(result.identityKey,/^[0-9a-f]{64}$/);
});

test('missing Xbox identity and unverified gamertags never create a verified link',async()=>{
 const noIdentity=fakeFetcher({returnProfile:false,xstsXuid:null});
 await assert.rejects(()=>finish(makeAuth(noIdentity.fetcher)),/verified gamertag/);
 const noName=fakeFetcher({profileName:'',xstsName:''});
 await assert.rejects(()=>finish(makeAuth(noName.fetcher)),/gamertag/);
});

test('connect, rename by same Xbox account, unlink and enforce XUID/name uniqueness',async()=>{
 const {fetcher}=fakeFetcher();
 const auth=makeAuth(fetcher);
 const verified=await finish(auth);
 const saved=saveXboxLink({userId,identityKey:verified.identityKey,
  gamertag:verified.gamertag,verifiedAt:verified.verifiedAt});
 assert.equal(saved.gamertag,'SBisOnTop');
 assert.equal(xboxLinkForUser(userId).gamertag,'SBisOnTop');
 assert.equal(one('SELECT COUNT(*) n FROM sessions').n,0);
 assert.equal(one("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name LIKE '%xbox%'").n>=1,true);
 assert.ok(!JSON.stringify(xboxLinkForUser(userId)).includes(xuid));
 const renamed=saveXboxLink({userId,identityKey:verified.identityKey,gamertag:'SBsNameNew'});
 assert.equal(renamed.gamertag,'SBsNameNew');
 assert.equal(xboxLinkForUser(userId).gamertag,'SBsNameNew');
 assert.throws(()=>saveXboxLink({userId:other,
  identityKey:verified.identityKey,gamertag:'SBsNameNew'}),/already linked/);
 assert.throws(()=>saveXboxLink({userId:other,
  identityKey:'b'.repeat(64),gamertag:'SBsNameNew'}),/already linked/);
 assert.throws(()=>saveXboxLink({userId,identityKey:'c'.repeat(64),
  gamertag:'AnotherXbox'}),/Unlink/);
 assert.equal(allVerifiedXboxGamertags().length,1);
 const removed=unlinkXboxLink({userId});
 assert.equal(removed.changed,true);
 assert.equal(xboxLinkForUser(userId),null);
 assert.equal(unlinkXboxLink({userId}).changed,false);
 assert.equal(verifyAudit(db).ok,true);
});

test('verified Xbox name outranks older owner-entered Minecraft profile match',()=>{
 linkMegaPlayerProfile({gamertag:'SBisOnTop',discordId:other,actorId:userId});
 const before=allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop');
 assert.equal(before.discordId,other);
 saveXboxLink({userId,identityKey:'a'.repeat(64),gamertag:'SBisOnTop'});
 const after=allMegaPlayerProfileLinks().find(x=>x.gamertag==='SBisOnTop');
 assert.equal(after.discordId,userId);
 assert.equal(after.source,'xbox');
 unlinkXboxLink({userId});
 assert.equal(verifyAudit(db).ok,true);
});

test('profiles show verified Xbox names only to permitted viewers, and self-manage unlink',()=>{
 const ctx={pathname:'/u/'+userId,user:{id:userId,username:'sb'},
  role:'member',csrf:'fixture',config:{}};
 const person={id:userId,username:'sb',display_name:'SB'};
 const link={gamertag:'SBisOnTop',verifiedAt:Date.now()};
 const self=profile(ctx,{person,profile:{public:1,animations:1},self:true,
  discordRoles:{state:'unavailable',roles:[]},
  xboxLink:link,xboxConfigured:true});
 assert.match(self,/Xbox: SBisOnTop/);
 assert.match(self,/Connected Accounts/);
 assert.match(self,/profile\/microsoft\/start/);
 assert.match(self,/profile\/microsoft\/unlink/);
 const otherViewer=profile(ctx,{person,profile:{public:0},self:false,privateProfile:true,
  xboxLink:link,xboxConfigured:true});
 assert.doesNotMatch(otherViewer,/Xbox: SBisOnTop/);
 assert.doesNotMatch(otherViewer,/profile\/microsoft\/start/);
 const edit=profileEdit(ctx,{profile:{},sections:[],posts:[],
  xboxLink:link,xboxConfigured:true});
 assert.match(edit,/Verified Xbox gamertag: <strong>SBisOnTop/);
 assert.match(edit,/name="_csrf"/);
 const disabled=profileEdit(ctx,{profile:{},xboxLink:null,xboxConfigured:false});
 assert.match(disabled,/not configured yet/);
 assert.doesNotMatch(disabled,/action="\/profile\/microsoft\/start"/);
});
