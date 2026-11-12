// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sanitizeInPvPStorageState} from '../src/mega-session-state.js';
import {createMegaSessionVault} from '../src/mega-session-vault.js';
import {createMegaSessionPairing} from '../src/mega-session-pairing.js';

const tmp=mkdtempSync(join(tmpdir(),'sbs-inpvp-vault-'));
const key=Buffer.alloc(32,32).toString('base64');
const secret='private-inpvp-session-example-token';
const state={cookies:[
  {name:'sid',value:'secret-session-cookie',domain:'.inpvp.net',path:'/',
   expires:1890000000,httpOnly:true,secure:true,sameSite:'Lax'},
  {name:'MSA',value:'MUST_NOT_TRANSFER',domain:'.login.live.com',path:'/'},
  {name:'azure',value:'DO_NOT_TRANSFER',domain:'.microsoft.com',path:'/'}
],origins:[
  {origin:'https://inpvp.net',localStorage:[{name:'session',value:secret},{name:'theme',value:'dark'}]},
  {origin:'https://login.live.com',localStorage:[{name:'token',value:'MUST_NOT_TRANSFER'}]},
  {origin:'https://evil.inpvp.net.attacker.example',localStorage:[{name:'token',value:'MUST_NOT_TRANSFER'}]}
]};
after(()=>rmSync(tmp,{recursive:true,force:true}));

test('only actual HTTPS InPvP storage is allowed to cross the pairing boundary',()=>{
  const safe=sanitizeInPvPStorageState(state);
  assert.equal(safe.cookies.length,1);
  assert.equal(safe.origins.length,1);
  assert.equal(safe.origins[0].origin,'https://inpvp.net');
  assert.ok(!JSON.stringify(safe).includes('MUST_NOT_TRANSFER'));
  assert.ok(!JSON.stringify(safe).includes('DO_NOT_TRANSFER'));
  assert.throws(()=>sanitizeInPvPStorageState({cookies:[],origins:[
    {origin:'https://inpvp.net.evil.com',localStorage:[{name:'token',value:'no'}]}
  ]}),/No InPvP/);
  assert.throws(()=>sanitizeInPvPStorageState({cookies:[],origins:[
    {origin:'http://inpvp.net',localStorage:[{name:'token',value:'no'}]}
  ]}),/No InPvP/);
  assert.throws(()=>sanitizeInPvPStorageState({cookies:[],origins:[
    {origin:'https://inpvp.net',localStorage:[{name:'session',value:'x'.repeat(270000)}]}
  ]}));
});

test('common InPvP storage names are accepted and control characters are rejected',()=>{
  const common=['user','auth0.state','accessToken','oauth2:client_id','account/123','sessionID','theme'];
  const example={cookies:[],origins:[{
    origin:'https://inpvp.net',
    localStorage:common.map(name=>({name,value:'example-data'}))
  }]};
  const parsed=sanitizeInPvPStorageState(example);
  assert.deepEqual(parsed.origins[0].localStorage.map(row=>row.name),common);
  for(const name of ['bad\nname','bad\u0000name','bad\u001fname','bad\u007fname']){
    assert.throws(
      ()=>sanitizeInPvPStorageState({cookies:[],origins:[{
        origin:'https://inpvp.net',localStorage:[{name,value:'example-data'}]
      }]}),
      /Invalid InPvP storage entry format/
    );
  }
  assert.throws(()=>sanitizeInPvPStorageState({cookies:[],origins:[{
    origin:'https://inpvp.net',localStorage:[{name:'cache',value:'x'.repeat(65537)}]
  }]}),/exceeds the 64 KB limit/);
});

test('session file is encrypted, authenticated, reusable and survives new server instances',()=>{
  const file=join(tmp,'auth-vault.enc.json');
  const vault=createMegaSessionVault({key,file});
  assert.equal(vault.status().saved,false);
  assert.equal(vault.save(state),true);
  assert.equal(vault.status().saved,true);
  const disk=readFileSync(file,'utf8');
  assert.ok(!disk.includes(secret));
  assert.ok(!disk.includes('secret-session-cookie'));
  assert.equal(statSync(file).mode&0o777,0o600);
  const newProcess=createMegaSessionVault({key,file});
  assert.equal(newProcess.load().origins[0].localStorage[0].value,secret);
  const stale=newProcess.fingerprint();
  assert.equal(newProcess.save({...state,origins:[{origin:'https://inpvp.net',localStorage:[{name:'session',value:'renewed'}]}]}),true);
  assert.equal(newProcess.save(state,{expectedFingerprint:stale}),false,
    'old worker state must not overwrite owner-updated session');
  assert.equal(newProcess.load().origins[0].localStorage[0].value,'renewed');
  const wrongKey=createMegaSessionVault({key:Buffer.alloc(32,19).toString('base64'),file});
  assert.throws(()=>wrongKey.load());
  vault.clear();
  assert.equal(existsSync(file),false);
  assert.equal(vault.load(),null);
});

test('a one-time pairing code is bound to TTL and cannot be used twice',()=>{
  let clock=10_000;
  const file=join(tmp,'pair.enc.json');
  const vault=createMegaSessionVault({key,file});
  const pair=createMegaSessionPairing({vault,clock:()=>clock});
  const owner='100000000000000002';
  const code=pair.issue(owner).code;
  assert.match(code,/^[A-Za-z0-9_-]{32}$/);
  assert.throws(()=>pair.redeem('not-a-code',state),/expired/);
  assert.deepEqual(pair.redeem(code,state),{saved:true,ownerId:owner});
  assert.throws(()=>pair.redeem(code,state),/expired/);
  assert.equal(vault.status().saved,true);
  vault.clear();
  const soon=pair.issue(owner);
  clock=soon.expiresAt+1;
  assert.throws(()=>pair.redeem(soon.code,state),/expired/);
  assert.equal(vault.status().saved,false);
});

test('invalid session data cannot write secrets and failed handoff burns code',()=>{
  const file=join(tmp,'failed.enc.json');
  const vault=createMegaSessionVault({key,file});
  const pair=createMegaSessionPairing({vault});
  const code=pair.issue('100000000000000002').code;
  assert.throws(()=>pair.redeem(code,{cookies:[],origins:[]}),/No InPvP/);
  assert.throws(()=>pair.redeem(code,state),/expired/);
  assert.equal(existsSync(file),false);
});

test('vault fails closed on a missing or malformed key',()=>{
  assert.equal(createMegaSessionVault({key:'',file:join(tmp,'not-set.enc.json')}).configured,false);
  assert.throws(()=>createMegaSessionVault({key:'not-a-key',file:join(tmp,'not-set.enc.json')}),/32-byte/);
});
