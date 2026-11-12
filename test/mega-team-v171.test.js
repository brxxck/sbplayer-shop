// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const tmp=mkdtempSync(join(tmpdir(),'mega-v171-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(tmp,'test.sqlite');
const {db,run}=await import('../src/db.js');
const {megaDashboard}=await import('../src/mega-team-data.js');
const {saveMegaBrowserCapture,megaBrowserSnapshot,parseObservedBalance}=await import('../src/mega-team-browser-snapshot.js');
const {MEGA_TEAM_ID}=await import('../src/mega-team.js');
const {createMegaBrowserRunner}=await import('../src/mega-team-browser-runner.js');
after(()=>{db.close();rmSync(tmp,{recursive:true,force:true});});

test('snapshot balance parsing preserves cents and rejects invalid values',()=>{
 assert.equal(parseObservedBalance('$0.67'),67);
 assert.equal(parseObservedBalance('$0.00'),0);
 assert.equal(parseObservedBalance('1,000.01'),100001);
 assert.equal(parseObservedBalance(null),null);
 assert.throws(()=>parseObservedBalance('-100'),/amount|value|Bank/);
});
test('captured bank history appears without turning observed players into confirmed members',()=>{
 const data=saveMegaBrowserCapture({
  teamId:MEGA_TEAM_ID,
  rows:[{eventId:'v171-1',text:'Nov 12 1:40 PM GamePlayer Deposited $120.25'}],
  roster:[{gamertag:'GamePlayer',role:'Officer'}],
  bankBalance:'$500.50',
  reportedCount:1
 });
 assert.equal(data.inserted,1);
 assert.equal(data.bankSeen,true);
 const dashboard=megaDashboard();
 assert.equal(dashboard.captured.totalEvents,1);
 assert.equal(dashboard.captured.deposited,'120.25');
 assert.equal(dashboard.bank.balance,500.5);
 assert.equal(dashboard.bank.source,'browser_capture');
 const observed=dashboard.members.find(m=>m.gamertag==='GamePlayer');
 assert.equal(observed.status,'observed');
 assert.equal(observed.deposits,null);
 assert.equal(observed.observedDeposits,'120.25');
 assert.equal(dashboard.totals.deposited,null,'captured totals are never added to the manual ledger');
 assert.equal(megaBrowserSnapshot().roster.length,1);
 const again=saveMegaBrowserCapture({
  teamId:MEGA_TEAM_ID,rows:[{eventId:'v171-1',text:'Nov 12 1:40 PM GamePlayer Deposited $120.25'}],
  roster:[],bankBalance:null
 });
 assert.equal(again.inserted,0);
 assert.equal(megaDashboard().captured.totalEvents,1);
});
test('manual values stay authoritative and never double-count captured events',()=>{
 run('INSERT INTO mega_team_members(season,gamertag,role,status,source,updated_at) VALUES(?,?,?,?,?,?)',
  'current','GamePlayer','Member','active','manual',Date.now());
 const d=megaDashboard();
 assert.equal(d.members.filter(x=>x.gamertag==='GamePlayer').length,1);
 assert.equal(d.members.find(x=>x.gamertag==='GamePlayer').observedDeposits,'120.25');
 assert.equal(d.members.find(x=>x.gamertag==='GamePlayer').deposits,null);
});
test('browser runner never launches without explicit permission',()=>{
 let attempts=0;
 const runner=createMegaBrowserRunner({enabled:false,launch:()=>{attempts++;throw Error('unexpected');}});
 assert.equal(runner.start(),false);
 assert.equal(attempts,0);
 runner.stop();
});
