// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const tmp=mkdtempSync(join(tmpdir(),'mega-browser-prep-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(tmp,'events.sqlite');
const {db,run}=await import('../src/db.js');
const {parseMegaMoneyCents,formatMegaCents,parseMegaEventRow,prepareMegaEvents}=await import('../src/mega-team-bank-event-parser.js');
const {saveMegaCapture,megaCapturedBankSummary,noteMegaCaptureFailure}=await import('../src/mega-team-bank-event-store.js');
const {captureTeamBankPage}=await import('../src/mega-team-page-collector.js');
const {MEGA_TEAM_ID,MEGA_TEAM_URL}=await import('../src/mega-team.js');
after(()=>{db.close();rmSync(tmp,{recursive:true,force:true});});

const sample=[
 {text:'Nov 9 11:17 PM GermanBurgers Deposited $800,000'},
 {text:'Nov 9 9:18 PM SBisOnTop Deposited $30,000,000'},
 {text:'Nov 9 5:01 PM Cam_I_Scam1555 Withdrew $2,500,000'},
 {text:'Nov 3 1:35 AM YTPAW Deposited $0.67'}
];

test('bank-money parsing preserves cents and rejects precision loss',()=>{
 assert.equal(parseMegaMoneyCents('$0.67'),67);
 assert.equal(parseMegaMoneyCents('$30,000,000'),3000000000);
 assert.equal(formatMegaCents(67),'0.67');
 assert.equal(formatMegaCents(3000000000),'30000000.00');
 for(const value of ['1e6','$1.234','-$5','0','$-40','1,00,000','$90071992547409.92'])
  assert.throws(()=>parseMegaMoneyCents(value));
});
test('visible InPvP bank rows normalize without guessing dates or fabricating event IDs',()=>{
 const event=parseMegaEventRow(sample[0]);
 assert.equal(event.gamertag,'GermanBurgers');
 assert.equal(event.kind,'deposit');
 assert.equal(event.amountCents,80000000);
 assert.equal(event.displayTime,'Nov 9 11:17 PM');
 assert.equal(event.occurredAt,null,'unknown source timezone must remain unverified');
 const batch=prepareMegaEvents(sample,{teamId:MEGA_TEAM_ID,season:'current'});
 assert.equal(batch.errors.length,0);
 assert.equal(batch.events.length,4);
 assert.ok(batch.identityCaveat,'row text alone is not a unique provider transaction ID');
 assert.ok(batch.events.every(x=>x.eventId.startsWith('visible:')));
 assert.throws(()=>parseMegaEventRow({text:'Reward Claim: $100'}));
 assert.throws(()=>parseMegaEventRow({text:'Nov 9 11:17 PM OtherGuy Deposited $800,000',eventId:'<script>'}));
});
test('identical minute-level transactions are preserved separately within the same capture',()=>{
 const repeated=[
  {text:'Nov 9 11:17 PM GermanBurgers Deposited $800,000'},
  {text:'Nov 9 11:17 PM GermanBurgers Deposited $800,000'}
 ];
 const capture=prepareMegaEvents(repeated);
 assert.equal(capture.events.length,2);
 assert.notEqual(capture.events[0].eventId,capture.events[1].eventId);
});
test('event store is duplicate-safe, preserves previous totals, and rejects conflicting provider IDs',()=>{
 const first=saveMegaCapture(sample,{expectedCount:4,historyComplete:true});
 assert.equal(first.inserted,4);
 assert.equal(first.partialHistory,true,'no stable event IDs means lifetime completion cannot be verified');
 assert.equal(saveMegaCapture(sample,{expectedCount:4}).inserted,0);
 let summary=megaCapturedBankSummary();
 assert.equal(summary.totalEvents,4);
 assert.equal(summary.deposited,'30800000.67');
 assert.equal(summary.withdrawn,'2500000.00');
 assert.equal(summary.coverage,'captured_events_only');
 assert.equal(summary.players.find(p=>p.gamertag==='YTPAW').deposited,'0.67');
 const before=summary.totalEvents;
 assert.throws(()=>saveMegaCapture([...sample,{text:'not a bank row'}]),/incomplete/);
 assert.equal(megaCapturedBankSummary().totalEvents,before,'unparsed rows do not erase previous capture');
 const provider=[{eventId:'tx-1',gamertag:'Member2',action:'deposit',amount:'$200',displayTime:'Nov 9 11:10 PM'}];
 assert.equal(saveMegaCapture(provider,{expectedCount:1}).inserted,1);
 const conflict=[{...provider[0],amount:'$201'}];
 assert.throws(()=>saveMegaCapture(conflict),/Conflicting provider event ID/);
 assert.equal(megaCapturedBankSummary().totalEvents,before+1);
 noteMegaCaptureFailure('current','Rate limited');
 assert.match(megaCapturedBankSummary().status.last_error,/Rate limited/);
});
test('read-only capture uses the exact team URL and bank tab only',async()=>{
 const calls=[],tab={
  count:async()=>1,first:()=>({
   isVisible:async()=>true,click:async()=>{calls.push('clicked bank');}
  })
 };
 const absent={count:async()=>0,first:()=>({})};
 const fakePage={
  goto:async(url)=>{calls.push('goto:'+url);},
  url:()=>MEGA_TEAM_URL,
  getByRole:(role,{name})=>String(name).includes('Bank')?tab:absent,
  getByText:()=>absent,
  evaluate:async(fn,arg)=>arg?.cap?sample.map(x=>({...x})):
   {scrolled:false,atEnd:true},
  locator:()=>({innerText:async()=> 'Event Log (142) Activity updated 1 min ago'})
 };
 const captured=await captureTeamBankPage(fakePage,{maxScrolls:3,maxPages:1});
 assert.equal(captured.rows.length,4);
 assert.equal(captured.reportedCount,142);
 assert.equal(captured.incomplete,true);
 assert.equal(captured.historyComplete,false);
 assert.ok(calls.includes('clicked bank'));
 assert.ok(calls.some(x=>x.startsWith('goto:https://inpvp.net/megasmp/teams?')));
 await assert.rejects(()=>captureTeamBankPage(fakePage,{
  url:'https://inpvp.net/megasmp/teams?team=Other&gamemode=megasmp&id='+MEGA_TEAM_ID
 }),/Only the configured/);
});
