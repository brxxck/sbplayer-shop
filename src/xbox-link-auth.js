// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Account linking only: Microsoft OAuth -> Xbox U token -> Xbox XSTS identity.
// No InPvP requests, user session harvesting, Minecraft license claims,
// Microsoft passwords, refresh-token storage, or automatic browser sessions.
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {validGamertag} from './mega-team.js';

const AUTH_URL='https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const TOKEN_URL='https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBOX_USER_URL='https://user.auth.xboxlive.com/user/authenticate';
const XBOX_XSTS_URL='https://xsts.auth.xboxlive.com/xsts/authorize';
const XBOX_PROFILE_URL='https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag';
const SCOPES='xboxlive.signin';
const TTL_MS=10*60*1000;
const MAX_FLOWS=128;
const validXuid=value=>/^[0-9]{10,22}$/.test(String(value||''));
const random=()=>randomBytes(32).toString('base64url');
const sha256=value=>createHash('sha256').update(value).digest('base64url');
const configuredBase=value=>{
 const u=new URL(String(value||''));
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('Invalid website base URL.');
 if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))
  throw new Error('Xbox account linking needs HTTPS or localhost.');
 return u.origin;
};
function identityOf(xuid,key){
 if(!validXuid(xuid))throw new Error('Xbox identity could not be verified.');
 // Store a per-site keyed fingerprint, never the raw Xbox User ID (XUID).
 return createHmac('sha256',key).update('sbstore:xbox-link:v1:'+String(xuid)).digest('hex');
}
function xboxProfile(data,expectedXuid){
 if(!data||!Array.isArray(data.profileUsers)||data.profileUsers.length!==1)
  throw new Error('Xbox profile did not return exactly one account.');
 const found=data.profileUsers[0];
 const xuid=String(found.id||'');
 if(!validXuid(xuid)||(expectedXuid&&expectedXuid!==xuid))
  throw new Error('Xbox profile identity did not match the signed-in account.');
 const gamertag=(found.settings||[]).find(x=>x.id==='Gamertag')?.value;
 const name=validGamertag(gamertag);
 if(!name)throw new Error('Xbox did not supply a supported gamertag.');
 return {xuid,gamertag:name};
}
async function jsonRequest(fetcher,url,{method='POST',body,headers={}}={}){
 let response;
 try{
  response=await fetcher(url,{
   method,headers:{...(body?{'content-type':body instanceof URLSearchParams?
     'application/x-www-form-urlencoded':'application/json'}:{}),...headers},
   ...(body?{body:body instanceof URLSearchParams?body:JSON.stringify(body)}:{}),
   signal:AbortSignal.timeout(12000),redirect:'error'
  });
 }catch{throw new Error('Microsoft/Xbox authentication service is temporarily unavailable.');}
 if(!response?.ok)throw new Error('Microsoft/Xbox authentication was rejected or Xbox profile access is unavailable.');
 try{return await response.json();}
 catch{throw new Error('Microsoft/Xbox returned an invalid authentication response.');}
}
export function createXboxLinkAuth({
 clientId=process.env.XBOX_LINK_CLIENT_ID||'',
 clientSecret=process.env.XBOX_LINK_CLIENT_SECRET||'',
 identityKey=process.env.XBOX_LINK_ACCOUNT_KEY||'',
 baseUrl=process.env.BASE_URL||'http://localhost:3000',
 fetcher=globalThis.fetch,
 clock=()=>Date.now()
}={}){
 const root=configuredBase(baseUrl);
 const redirectUri=root+'/profile/microsoft/callback';
 const configured=!!(clientId&&clientSecret&&identityKey.length>=32);
 const flows=new Map();
 const status=()=>({configured,redirectUri});
 function prune(){
  for(const [state,item] of flows)if(item.expiresAt<=clock())flows.delete(state);
 }
 function keyFor(sessionKey,userId){
  if(!/^[a-zA-Z0-9_-]{20,}$/.test(String(sessionKey||''))||
     !/^[0-9]{15,22}$/.test(String(userId||'')))
   throw new Error('Verified Discord website login is required.');
  return sessionKey+'|'+userId;
 }
 function begin(sessionKey,userId){
  if(!configured)throw new Error('Xbox linking is not configured on the website.');
  const bound=keyFor(sessionKey,userId);
  prune();
  if(flows.size>=MAX_FLOWS)throw new Error('Too many Xbox linking attempts; please retry.');
  const state=random(),verifier=random();
  flows.set(state,{bound,verifier,expiresAt:clock()+TTL_MS});
  const p=new URLSearchParams({
   client_id:clientId,response_type:'code',redirect_uri:redirectUri,
   response_mode:'query',scope:SCOPES,state,
   code_challenge:sha256(verifier),code_challenge_method:'S256',
   prompt:'select_account'
  });
  return AUTH_URL+'?'+p.toString();
 }
 async function complete({state='',code='',error='',sessionKey,userId}={}){
  const bound=keyFor(sessionKey,userId);
  prune();
  const entry=flows.get(state);
  // Consume before token/network calls: state and code cannot be replayed.
  flows.delete(state);
  if(!entry||entry.bound!==bound||entry.expiresAt<=clock())
   throw new Error('Microsoft linking expired or does not belong to this session.');
  if(error)return {cancelled:true};
  if(typeof code!=='string'||!code||code.length>8192)
   throw new Error('Microsoft did not return a valid authorization code.');
  if(!configured)throw new Error('Xbox account linking is not configured.');
  const tokens=await jsonRequest(fetcher,TOKEN_URL,{body:new URLSearchParams({
   client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',
   code,redirect_uri:redirectUri,code_verifier:entry.verifier,scope:SCOPES
  })});
  const microsoftAccess=String(tokens?.access_token||'');
  if(microsoftAccess.length<16)throw new Error('Microsoft did not return a usable Xbox sign-in token.');
  const user=await jsonRequest(fetcher,XBOX_USER_URL,{
   headers:{'x-xbl-contract-version':'1'},body:{
    Properties:{AuthMethod:'RPS',SiteName:'user.auth.xboxlive.com',RpsTicket:'d='+microsoftAccess},
    RelyingParty:'http://auth.xboxlive.com',TokenType:'JWT'
   }
  });
  if(typeof user?.Token!=='string'||user.Token.length<8)
   throw new Error('Xbox user authentication failed.');
  const xsts=await jsonRequest(fetcher,XBOX_XSTS_URL,{
   headers:{'x-xbl-contract-version':'1'},body:{
    Properties:{SandboxId:'RETAIL',UserTokens:[user.Token]},
    RelyingParty:'http://xboxlive.com',TokenType:'JWT'
   }
  });
  const claim=xsts?.DisplayClaims?.xui;
  if(!Array.isArray(claim)||claim.length!==1||
     typeof xsts.Token!=='string'||xsts.Token.length<8||
     !/^[0-9]{1,24}$/.test(String(claim[0].uhs||'')))
   throw new Error('Xbox identity was not verified.');
  const uhs=String(claim[0].uhs);
  const firstUserClaim=user?.DisplayClaims?.xui?.[0]?.uhs;
  if(firstUserClaim&&String(firstUserClaim)!==uhs)
   throw new Error('Microsoft/Xbox account identity mismatch.');
  const claimXuid=validXuid(claim[0].xid)?String(claim[0].xid):null;
  let profileResponse=null;
  try{
   profileResponse=await jsonRequest(fetcher,XBOX_PROFILE_URL,{
    method:'GET',headers:{
     Authorization:'XBL3.0 x='+uhs+';'+xsts.Token,
     'x-xbl-contract-version':'2',Accept:'application/json'
    }
   });
  }catch{
   // Some Xbox apps are not provisioned for profile access. In that case
   // server-issued XSTS claims may still supply both stable ID and Gamertag.
  }
  // A successfully returned but *conflicting* Xbox profile must fail closed;
  // do not mask it with fallback XSTS claims.
  const verified=profileResponse?
   xboxProfile(profileResponse,claimXuid):
   (()=>{const name=validGamertag(claim[0].gtg);
     if(!claimXuid||!name)
      throw new Error('Xbox did not provide a verified gamertag. Check app Xbox service access.');
     return {xuid:claimXuid,gamertag:name};})();

  return {cancelled:false,gamertag:verified.gamertag,
   identityKey:identityOf(verified.xuid,identityKey),verifiedAt:clock()};
 }
 function forget(sessionKey,userId){
  const bound=keyFor(sessionKey,userId);
  for(const [s,item] of flows)if(item.bound===bound)flows.delete(s);
 }
 return {configured,redirectUri,begin,complete,status,forget};
}
