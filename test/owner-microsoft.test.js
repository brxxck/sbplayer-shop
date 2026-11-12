// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerMicrosoftAuth} from '../src/owner-microsoft.js';

const opts={
  clientId:'00000000-0000-4000-8000-000000000001',
  clientSecret:'test-secret',
  baseUrl:'https://sbstore.info'
};
test('owner Microsoft flow binds state to current website session and uses PKCE',async()=>{
  let captured;
  const auth=createOwnerMicrosoftAuth({...opts,fetcher:async(url,options)=>{
    captured={url,options};
    return {ok:true,json:async()=>({access_token:'test-graph-token-1234',expires_in:300})};
  }});
  const start=new URL(auth.begin('session-1','owner-1'));
  assert.equal(start.origin,'https://login.microsoftonline.com');
  assert.equal(start.searchParams.get('redirect_uri'),'https://sbstore.info/owner/microsoft/callback');
  assert.equal(start.searchParams.get('scope'),'User.Read');
  assert.equal(start.searchParams.get('code_challenge_method'),'S256');
  assert.ok(start.searchParams.get('code_challenge'));
  const state=start.searchParams.get('state');
  await assert.rejects(()=>auth.complete({state,code:'abc',sessionKey:'session-2',userId:'owner-1'}),/session/);
  await assert.rejects(()=>auth.complete({state,code:'abc',sessionKey:'session-1',userId:'owner-1'}),/session/);
  const state2=new URL(auth.begin('session-1','owner-1')).searchParams.get('state');
  await auth.complete({state:state2,code:'xyz',sessionKey:'session-1',userId:'owner-1'});
  assert.equal(captured.url,'https://login.microsoftonline.com/consumers/oauth2/v2.0/token');
  assert.equal(captured.options.body.get('grant_type'),'authorization_code');
  assert.equal(captured.options.body.get('code'),'xyz');
  assert.ok(captured.options.body.get('code_verifier'));
  assert.equal(auth.status('session-1','owner-1').connected,true);
  assert.equal(auth.status('session-2','owner-1').connected,false);
  assert.equal(auth.reveal('session-1','owner-1'),'test-graph-token-1234');
  assert.equal(auth.reveal('session-1','owner-1'),null);
  assert.equal(auth.status('session-1','owner-1').connected,false);
});
test('OAuth cannot start unconfigured and never exposes secret in authorization URL',()=>{
  const unavailable=createOwnerMicrosoftAuth({baseUrl:'https://sbstore.info',clientId:'',clientSecret:''});
  assert.equal(unavailable.configured,false);
  assert.throws(()=>unavailable.begin('s','u'),/configured/);
  const auth=createOwnerMicrosoftAuth(opts);
  assert.ok(!auth.begin('s','u').includes('test-secret'));
  auth.forget('s','u');
});
test('OAuth state expires and error callbacks cannot be replayed',async()=>{
  let t=1000;
  const auth=createOwnerMicrosoftAuth({...opts,clock:()=>t});
  const state=new URL(auth.begin('s','u')).searchParams.get('state');
  const cancelled=await auth.complete({state,error:'access_denied',sessionKey:'s',userId:'u'});
  assert.equal(cancelled.cancelled,true);
  await assert.rejects(()=>auth.complete({state,error:'access_denied',sessionKey:'s',userId:'u'}),/session/);
  const expired=new URL(auth.begin('s','u')).searchParams.get('state');
  t+=11*60*1000;
  await assert.rejects(()=>auth.complete({state:expired,error:'access_denied',sessionKey:'s',userId:'u'}),/session/);
});
