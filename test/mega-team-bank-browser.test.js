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
const {megaCapturedBankHistory}=await import('../src/mega-team-bank-history.js');
const {megaDiscordMatches,megaDiscordMatchCandidates,linkMegaDiscordAccount,unlinkMegaDiscordAccount}=await import('../src/mega-team-discord-matches.js');
const {captureTeamBankPage,openBankTab,openEventLogSection,selectBankEventLog,revealTeamEventLog}=await import('../src/mega-team-page-collector.js');
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
 const partial=saveMegaCapture(sample,{expectedCount:142});
 assert.equal(partial.inserted,0,'re-checks must not double-count the same visible rows');
 assert.equal(partial.reportedCount,142);
 assert.equal(partial.partialHistory,true,'partial visible rows must be saved but not claimed as lifetime-complete');
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


test('Bank button pointer timeout falls back to normal keyboard activation',async()=>{
 const actions=[];
 const bank={
   isVisible:async()=>true,isEnabled:async()=>true,getAttribute:async()=>null,
   click:async()=>{actions.push('click');throw new Error('Timeout 7500ms exceeded');},
   press:async key=>{actions.push('press:'+key);}
 };
 const matching={count:async()=>1,first:()=>bank,nth:()=>bank};
 const absent={count:async()=>0,first:()=>({})};
 const page={
  getByRole:(kind)=>kind==='button'?matching:absent,
  getByText:()=>absent
 };
 assert.equal(await openBankTab(page),true);
 assert.deepEqual(actions,['click','press:Enter']);
});
test('selected Bank tab avoids clicking and blocked controls fail visibly',async()=>{
 let clicks=0;
 const selected={
  isVisible:async()=>true,isEnabled:async()=>true,
  getAttribute:async name=>name==='aria-selected'?'true':null,
  click:async()=>{clicks++;}
 };
 const absent={count:async()=>0,first:()=>({})};
 const page={
  getByRole:()=>({count:async()=>1,first:()=>selected}),
  getByText:()=>absent
 };
 assert.equal(await openBankTab(page),true);
 assert.equal(clicks,0);
 const blocked={
  isVisible:async()=>true,isEnabled:async()=>false,
  getAttribute:async()=>null,
  click:async()=>{throw Error('Should not click disabled controls');}
 };
 const disabledPage={
  getByRole:kind=>kind==='tab'?{count:async()=>1,first:()=>blocked}:absent,
  getByText:()=>absent
 };
 await assert.rejects(()=>openBankTab(disabledPage),/visible but not actionable/);
});

test('collector opens Event Log parent before its initially missing Bank tab',async()=>{
  let parentOpen=false;
  const actions=[];
  const node=click=>({
   isVisible:async()=>true,isEnabled:async()=>true,
   getAttribute:async()=>null,click
  });
  const present=target=>({count:async()=>1,first:()=>target,nth:()=>target});
  const absent={count:async()=>0,first:()=>({})};
  const parent=present(node(async()=>{actions.push('event-log');parentOpen=true;}));
  const bank=present(node(async()=>{actions.push('bank');}));
  const mock={
   getByRole:(role,{name})=>{
    const n=String(name);
    if(/Event Log/.test(n))return parent;
    if(/Bank/.test(n))return parentOpen?bank:absent;
    return absent;
   },
   getByText:()=>absent,
   evaluate:async(fn,arg)=>arg?.cap?sample:({roster:[],bankBalance:null}),
   goto:async()=>{},
   url:()=>MEGA_TEAM_URL,
   locator:()=>({innerText:async()=> 'Event Log (4)'})
  };
  const captured=await captureTeamBankPage(mock,{maxScrolls:3,maxPages:1});
  assert.deepEqual(actions,['event-log','bank']);
  assert.equal(captured.rows.length,4);
  assert.equal(captured.incomplete,false);
});
test('selected Event Log parent needs no extra click',async()=>{
  let clicks=0;
  const current={
   isVisible:async()=>true,isEnabled:async()=>true,
   getAttribute:async key=>key==='aria-selected'?'true':null,
   click:async()=>{clicks++;}
  };
  const absent={count:async()=>0,first:()=>({})};
  const page={
   getByRole:(role,{name})=>/Event Log/.test(String(name))?
    {count:async()=>1,first:()=>current}:absent,
   getByText:()=>absent
  };
  assert.equal(await openEventLogSection(page),true);
  assert.equal(clicks,0);
});
test('collector clearly identifies missing team detail view without fabricating events',async()=>{
  const absent={count:async()=>0,first:()=>({})};
  const page={
   getByRole:()=>absent,
   getByText:()=>absent,
   evaluate:async(fn,arg)=>arg?.cap?[]:{
     team:false,events:false,bank:false,signin:false,directory:true
   }
  };
  await assert.rejects(()=>selectBankEventLog(page,{viewportChecks:1}),/Team detail view unavailable/);
});

test('public team Event Log appears after scrolling below the roster',async()=>{
 let revealed=false,clicks=0;
 const absent={count:async()=>0,first:()=>({})};
 const button={isVisible:async()=>true,isEnabled:async()=>true,getAttribute:async()=>null,
  click:async()=>{clicks++;}};
 const found={count:async()=>1,first:()=>button};
 const page={
  getByRole:(role,{name})=>String(name).includes('Bank')&&revealed?found:absent,
  getByText:()=>absent,
  evaluate:async(fn,arg)=>arg&&Object.hasOwn(arg,'total')?
   (revealed=true,{found:true}):arg?.cap?[]:{}
 };
 assert.equal(await selectBankEventLog(page,{viewportChecks:2}),true);
 assert.equal(revealed,true);
 assert.equal(clicks,1);
});
test('scroll helper is bounded and does not manufacture a missing Event Log',async()=>{
 let passes=0;
 const page={evaluate:async()=>{passes++;return {found:false};}};
 assert.equal(await revealTeamEventLog(page,{checks:2,intervalMs:1}),false);
 assert.equal(passes,2);
});
test('all captured bank events remain browsable across 50-row pages with type/player filters',()=>{
 const batch=Array.from({length:127},(_,i)=>({
  eventId:'capture-history-'+String(i).padStart(4,'0'),
  text:'Nov 9 11:17 PM Player'+String(i).padStart(4,'0')+' '+(i%2?'Withdrew':'Deposited')+' $'+(100+i)
 }));
 const saved=saveMegaCapture(batch,{expectedCount:127});
 assert.equal(saved.inserted,127);
 const first=megaCapturedBankHistory({season:'current'});
 assert.equal(first.page,1);
 assert.equal(first.rows.length,50);
 assert.equal(first.hasNext,true);
 assert.equal(first.total,132,'other previously captured events remain in the historical archive');
 assert.equal(first.pages,3);
 const middle=megaCapturedBankHistory({season:'current',page:2});
 assert.equal(middle.rows.length,50);
 assert.equal(middle.page,2);
 const last=megaCapturedBankHistory({season:'current',page:3});
 assert.equal(last.rows.length,32);
 assert.equal(last.hasNext,false);
 assert.equal(last.hasPrevious,true);
 const missingPage=megaCapturedBankHistory({season:'current',page:999});
 assert.equal(missingPage.page,3,'out-of-range pages are safely clamped');
 assert.equal(first.coverage,'captured_only','displaying every saved event must not claim full lifetime history');
 assert.equal(megaCapturedBankHistory({season:'current',gamertag:'Player0001'}).total,1);
 assert.ok(megaCapturedBankHistory({season:'current',kind:'withdrawal'}).rows.every(e=>e.kind==='withdrawal'));
 assert.ok(first.rows.every(e=>/^\d+\.\d{2}$/.test(e.amount)));
 assert.throws(()=>megaCapturedBankHistory({season:'current',kind:'HACK'}),/Unknown transaction type/);
 assert.throws(()=>megaCapturedBankHistory({season:'unknown'}),/Unknown team season/);
});
test('Minecraft and Discord account links are season-scoped and never change bank totals',()=>{
 const owner='100000000000000002',member='100000000000000007';
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  owner,'owner','Owner',Date.now());
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  member,'member7','Community Member',Date.now());
 const before=megaCapturedBankSummary().deposited;
 const candidates=megaDiscordMatchCandidates('current');
 assert.ok(candidates.includes('GermanBurgers'));
 assert.ok(candidates.includes('Player0001'));
 const linked=linkMegaDiscordAccount({season:'current',gamertag:'GermanBurgers',discordId:member,actorId:owner});
 assert.equal(linked.changed,true);
 assert.equal(linked.previousId,null);
 const again=linkMegaDiscordAccount({season:'current',gamertag:'germanburgers',discordId:member,actorId:owner});
 assert.equal(again.changed,false,'case-insensitive Gamertag has only one link');
 assert.equal(megaDiscordMatches('current').length,1);
 assert.equal(megaDiscordMatches('current')[0].discordId,member);
 linkMegaDiscordAccount({season:'current',gamertag:'Player0001',discordId:member,actorId:owner});
 assert.equal(megaDiscordMatches('current').length,2,'one Discord user can own multiple Minecraft accounts');
 assert.equal(megaCapturedBankSummary().deposited,before,'account matching must not alter bank totals');
 const history=megaCapturedBankHistory({season:'current',gamertag:'GermanBurgers'});
 assert.equal(history.rows[0].discordId,member,'history player rows include the owner-entered Discord match');
 assert.equal(history.rows[0].discordUsername,'member7');
 assert.throws(()=>linkMegaDiscordAccount({season:'current',gamertag:'UnknownPlayer',discordId:member,actorId:owner}),/absent/);
 assert.throws(()=>linkMegaDiscordAccount({season:'current',gamertag:'GermanBurgers',discordId:'123',actorId:owner}),/verified/);
 const unlinked=unlinkMegaDiscordAccount({season:'current',gamertag:'GermanBurgers'});
 assert.equal(unlinked.changed,true);
 assert.equal(unlinkMegaDiscordAccount({season:'current',gamertag:'GermanBurgers'}).changed,false);
 assert.equal(megaCapturedBankHistory({season:'current',gamertag:'GermanBurgers'}).rows[0].discordId,null);
});
