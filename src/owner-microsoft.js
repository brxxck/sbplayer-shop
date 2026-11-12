// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Owner-only Microsoft Graph OAuth, with single-use in-memory credentials.
// No passwords, cookies, or tokens are saved to disk or logged.
import {randomBytes,createHash} from 'node:crypto';

const AUTHORIZE='https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const TOKEN='https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const random=()=>randomBytes(32).toString('base64url');
const challenge=value=>createHash('sha256').update(value).digest('base64url');
const FLOW_MS=10*60*1000;
const MAX_FLOWS=100;
const MAX_TOKENS=100;

export function createOwnerMicrosoftAuth({
  clientId=process.env.MICROSOFT_CLIENT_ID||'',
  clientSecret=process.env.MICROSOFT_CLIENT_SECRET||'',
  baseUrl,
  fetcher=globalThis.fetch,
  clock=()=>Date.now()
}={}){
  if(typeof baseUrl!=='string'||!/^https:\/\//.test(baseUrl)&&!/^http:\/\/localhost(?::\d+)?$/.test(baseUrl))
    throw new Error('Microsoft OAuth requires a configured HTTPS public base URL or localhost.');
  const redirectUri=baseUrl.replace(/\/$/,'')+'/owner/microsoft/callback';
  const configured=!!(clientId&&clientSecret);
  const flows=new Map(),tokens=new Map();
  function prune(){
    for(const [key,item] of flows)if(item.expiresAt<=clock())flows.delete(key);
    for(const [key,item] of tokens)if(item.expiresAt<=clock())tokens.delete(key);
  }
  function boundKey(sessionKey,userId){
    if(typeof sessionKey!=='string'||!sessionKey||typeof userId!=='string'||!userId)
      throw new Error('Verified website session required.');
    return sessionKey+'|'+userId;
  }
  function begin(sessionKey,userId){
    if(!configured)throw new Error('Microsoft OAuth has not been configured.');
    const owner=boundKey(sessionKey,userId);prune();
    if(flows.size>=MAX_FLOWS)throw new Error('Too many Microsoft authentication attempts.');
    const state=random(),verifier=random();
    flows.set(state,{owner,verifier,expiresAt:clock()+FLOW_MS});
    const params=new URLSearchParams({
      client_id:clientId,response_type:'code',redirect_uri:redirectUri,
      response_mode:'query',scope:'User.Read',state,
      code_challenge:challenge(verifier),code_challenge_method:'S256',
      prompt:'select_account'
    });
    return AUTHORIZE+'?'+params;
  }
  async function complete({state,code,error,sessionKey,userId}){
    prune();
    const owner=boundKey(sessionKey,userId),entry=flows.get(state);
    // Consume state before network access: cannot replay the authorization code.
    flows.delete(state);
    if(typeof state!=='string'||!entry||entry.owner!==owner||entry.expiresAt<=clock())
      throw new Error('Microsoft sign-in expired or does not belong to this website session.');
    if(error)return {cancelled:true};
    if(typeof code!=='string'||!code||code.length>8192)
      throw new Error('Microsoft sign-in returned an invalid authorization code.');
    const body=new URLSearchParams({
      client_id:clientId,client_secret:clientSecret,
      grant_type:'authorization_code',code,
      redirect_uri:redirectUri,code_verifier:entry.verifier,
      scope:'User.Read'
    });
    let result;
    try{
      const response=await fetcher(TOKEN,{
        method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
        body,signal:AbortSignal.timeout(10000)
      });
      if(!response.ok)throw new Error('Token endpoint refused authorization.');
      result=await response.json();
    }catch{
      throw new Error('Microsoft token exchange failed. Check the app registration and redirect URI.');
    }
    if(typeof result?.access_token!=='string'||result.access_token.length<8)
      throw new Error('Microsoft did not return a Graph access token.');
    if(tokens.size>=MAX_TOKENS)prune();
    if(tokens.size>=MAX_TOKENS)throw new Error('Too many active Microsoft sessions.');
    const seconds=Math.max(30,Math.min(3600,Number(result.expires_in)||3600));
    tokens.set(owner,{token:result.access_token,expiresAt:clock()+seconds*1000});
    return {cancelled:false,expiresAt:clock()+seconds*1000};
  }
  function status(sessionKey,userId){
    prune();
    const item=tokens.get(boundKey(sessionKey,userId));
    return {configured,connected:!!item,expiresAt:item?.expiresAt||null};
  }
  function reveal(sessionKey,userId){
    prune();
    const key=boundKey(sessionKey,userId),item=tokens.get(key);
    tokens.delete(key);
    // One-time display only. No refresh token is requested or retained.
    return item?.token||null;
  }
  function forget(sessionKey,userId){
    const key=boundKey(sessionKey,userId);
    tokens.delete(key);
    for(const [state,entry] of flows)if(entry.owner===key)flows.delete(state);
  }
  return {configured,redirectUri,begin,complete,status,reveal,forget};
}
