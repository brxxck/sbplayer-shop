// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-upgrade-'));
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'upgrade.sqlite')});
const {db,run,one,upsertUser,ensureProfile}=await import('../src/db.js');
const {voteOnSuggestion,setSuggestionStatus,suggestionHistory,filteredSuggestions,unifiedTransactions,decorateCases,markCaseRead,caseState}=await import('../src/upgrade-data.js');
const {startDm,dmSend,dmHistory}=await import('../src/community-data.js');
const {navigationGroups}=await import('../src/navigation.js');
const {literalLikePattern,isoDayMillis}=await import('../src/search-utils.js');
const {shell,suggestionDetail}=await import('../src/views.js');
const {createSupportTicket,writeSupportMessage}=await import('../src/support.js');
const {applicationHub,transactionsPage}=await import('../src/upgrade-views.js');
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const owner='100000000000000002',alice='100000000000000003',bob='100000000000000004';
for(const [id,username] of [[owner,'owner'],[alice,'Alice'],[bob,'Bob']]){upsertUser({user:{id,username,global_name:username}});ensureProfile(id);}
const ctx={user:{id:owner,username:'owner',display_name:'Owner'},role:'owner',csrf:'fixture',config:{},pathname:'/'};
const createSuggestion=(title='Useful community calendar')=>Number(run('INSERT INTO suggestions(user_id,title,body,created_at,updated_at) VALUES(?,?,?,?,?)',alice,title,'This is a useful improvement to our website.',Date.now(),Date.now()).lastInsertRowid);

test('finalized suggestions reject every vote mutation while preserving recorded votes',()=>{
 const id=createSuggestion();voteOnSuggestion(id,alice,'yes');
 setSuggestionStatus(ctx,id,'implemented','Shipped with the community upgrade.');
 assert.throws(()=>voteOnSuggestion(id,bob,'no'),{status:409});
 assert.throws(()=>voteOnSuggestion(id,alice,'yes'),{status:409});
 assert.throws(()=>voteOnSuggestion(id,alice,'no'),{status:409});
 assert.equal(one('SELECT COUNT(*) n FROM suggestion_votes WHERE suggestion_id=?',id).n,1);
 assert.equal(one('SELECT choice FROM suggestion_votes WHERE suggestion_id=?',id).choice,'yes');
 setSuggestionStatus(ctx,id,'planned','Reopened for a new revision.');voteOnSuggestion(id,alice,'no');
 assert.equal(one('SELECT choice FROM suggestion_votes WHERE suggestion_id=?',id).choice,'no');
 assert.equal(suggestionHistory(id).length,2);
 assert.equal(suggestionHistory(id)[1].note,'Shipped with the community upgrade.');
 assert.throws(()=>setSuggestionStatus({...ctx,role:'member'},id,'declined'),{status:403});
});
test('suggestion filtering applies before pagination and sort options cannot inject SQL',()=>{
 const id=createSuggestion('Rare searchable test phrase');setSuggestionStatus(ctx,id,'declined','Out of scope.');
 const found=filteredSuggestions({q:'Rare searchable',status:'declined',sort:'supported'});
 assert.deepEqual(found.map(s=>s.id),[id]);
 assert.equal(filteredSuggestions({q:'Rare searchable',status:'implemented'}).length,0);
 assert.doesNotThrow(()=>filteredSuggestions({sort:'DROP TABLE users;'}));
 assert.equal(one('SELECT COUNT(*) n FROM users').n,3);
});
test('search treats percent, underscore and escape characters literally',()=>{
 const id=createSuggestion('50% weekend competition');
 assert.deepEqual(filteredSuggestions({q:'50%'}).map(row=>row.id),[id]);
 assert.deepEqual(filteredSuggestions({q:'%'}).map(row=>row.id),[id],
   'a percent query must not return every suggestion');
 assert.equal(filteredSuggestions({q:'_'}).length,0,
   'an underscore query must not match one arbitrary character');
 assert.equal(literalLikePattern('50%_\\'),'%50\\%\\_\\\\%');
});
test('finalized suggestion controls are disabled without exposing voter identities',()=>{
 const html=suggestionDetail({...ctx,role:'member'},{s:{id:1,status:'declined',user_id:alice,title:'Test',body:'Test body',created_at:Date.now()},comments:[],history:[{after_status:'declined',note:'Reason <script>',created_at:Date.now(),display_name:'Staff'}]});
 assert.match(html,/disabled aria-disabled="true" name="choice"/);
 assert.match(html,/Voting closed/);assert.match(html,/Reason &lt;script&gt;/);
 assert.doesNotMatch(html,/Who voted/);
});
test('unified transactions preserve overlapping source records, cents and unknown dates',()=>{
 run('INSERT INTO mega_team_members(season,gamertag,updated_at) VALUES(?,?,?)','current','ExactPlayer',Date.now());
 const memberId=one("SELECT id FROM mega_team_members WHERE gamertag='ExactPlayer'").id;
 const at=Date.parse('2026-11-14T12:00:00Z');
 run('INSERT INTO mega_team_ledger(season,member_id,kind,amount,actor_id,occurred_at,created_at) VALUES(?,?,?,?,?,?,?)','current',memberId,'deposit',12345,owner,at,at);
 run('INSERT INTO mega_team_captured_bank_events(team_id,season,source_event_id,identity,gamertag,kind,amount_cents,display_time,occurred_at,time_precision,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)','team','current','captured-1','provider','ExactPlayer','deposit',1234501,'14 Nov 12:00',null,'display_only',at,at);
 const d=unifiedTransactions({q:'ExactPlayer'});
 assert.equal(d.rows.length,2);assert.equal(d.total,2);
 assert.deepEqual(new Set(d.rows.map(r=>r.source)),new Set(['manual','captured']));
 assert.equal(d.rows.find(r=>r.source==='captured').amount_cents,'1234501');
 assert.equal(unifiedTransactions({source:'captured',from:'2026-11-14'}).rows.length,0,'unknown source dates never become capture dates');
 assert.equal(unifiedTransactions({source:'manual',from:'2026-11-14',to:'2026-11-14'}).rows.length,1);
 const html=transactionsPage(ctx,d);assert.match(html,/\$12,345\.01/);assert.match(html,/InPvP captured/);assert.match(html,/Manual ledger/);
 assert.throws(()=>unifiedTransactions({from:'bad date'}),{status:400});
 assert.throws(()=>unifiedTransactions({season:'missing'}),{status:404});
});
test('financial filters reject impossible calendar dates and inverted ranges',()=>{
 assert.equal(isoDayMillis('2028-02-29'),Date.UTC(2028,1,29));
 for(const bad of ['2026-02-29','2026-02-30','2026-13-01','2026-11-31','2026-01-00']){
   assert.throws(()=>unifiedTransactions({from:bad}),{status:400},bad);
 }
 assert.throws(()=>unifiedTransactions({from:'2026-11-15',to:'2026-11-14'}),{status:400});
 assert.equal(unifiedTransactions({q:'%'}).total,0,'wildcard cannot match every gamertag');
 assert.equal(unifiedTransactions({q:'_'}).total,0);
});
test('transaction pagination clamps oversized pages and carries source filters',()=>{
 const d=unifiedTransactions({page:999999,source:'manual'});assert.equal(d.page,1);assert.equal(d.rows.length,1);
 assert.equal(one('SELECT COUNT(*) n FROM mega_team_captured_bank_events').n,1,'browsing cannot rewrite captured events');
});
test('case states follow last reply and unread activity is personal to each staff account',()=>{
 const id=createSupportTicket({userId:alice,category:'bug_report',fields:{description:'A reproducible issue'},ip:'test'});
 const ticket=()=>({...one('SELECT * FROM support_tickets WHERE id=?',id),category:'bug_report'});
 assert.equal(caseState(ticket()),'open');
 writeSupportMessage({ticketId:id,userId:alice,role:'member',body:'Member update',isApplicant:true,ip:'test'});
 assert.equal(caseState(ticket()),'awaiting_staff');
 assert.equal(decorateCases([ticket()],owner)[0].unread,1);
 markCaseRead(owner,'bug_report',id);
 assert.equal(decorateCases([ticket()],owner)[0].unread,0);
 assert.equal(decorateCases([ticket()],bob)[0].unread,1,'one staff read cannot clear another staff queue');
 writeSupportMessage({ticketId:id,userId:owner,role:'owner',body:'Staff reply',isApplicant:false,ip:'test'});
 assert.equal(caseState(ticket()),'awaiting_member');
 run("UPDATE support_tickets SET status='resolved' WHERE id=?",id);
 assert.equal(caseState(ticket()),'resolved');
});
test('message search and older pages retain participant authorization and chronological order',()=>{
 const id=startDm(alice,bob);for(let i=0;i<105;i++)dmSend(id,alice,'History message '+i);
 const latest=dmHistory(id,alice);assert.equal(latest.messages.length,100);assert.equal(latest.hasOlder,true);
 const older=dmHistory(id,bob,50,{before:latest.messages[0].id});assert.equal(older.messages.length,5);assert.equal(older.hasOlder,false);
 assert.ok(older.messages.at(-1).id<latest.messages[0].id);
 const found=dmHistory(id,bob,50,{q:'message 103'});assert.equal(found.messages.length,1);
 assert.throws(()=>dmHistory(id,owner,50,{q:'History'}),{status:404});
});
test('private message search interprets wildcard-looking text literally',()=>{
 const thread=startDm(alice,bob);
 dmSend(thread,alice,'The task is 50% complete');
 dmSend(thread,alice,'A useful regular message');
 const percent=dmHistory(thread,bob,50,{q:'%'});
 assert.equal(percent.messages.length,1);
 assert.equal(percent.messages[0].body,'The task is 50% complete');
 assert.equal(dmHistory(thread,bob,50,{q:'_'}).messages.length,0);
 assert.throws(()=>dmHistory(thread,owner,50,{q:'%'}),{status:404},
   'literal search does not weaken participant authorization');
});
test('grouped navigation preserves owner, admin and recruitment boundaries',()=>{
 const groups=navigationGroups(ctx);assert.ok(groups.some(g=>g.label==='Owner'));
 const member=navigationGroups({...ctx,role:'member',teamRecruiter:false});
 assert.ok(!member.some(g=>['Owner','Administration','Staff'].includes(g.label)));
 const appeal=navigationGroups({...ctx,role:'appeal-only'}).flatMap(g=>g.items.map(([p])=>p));
 assert.ok(!appeal.some(p=>p.startsWith('/messages')||p==='/applications'));
 const html=shell({...ctx,role:'member'},'Fixture','<p>Hello</p>');assert.match(html,/Skip to content/);
 const menu=html.split('class="top-account-menu"')[1].split('</details>')[0];
 for(const label of ['My Posts','My Replies','My Photos','Liked Posts','Followers','Following Feed'])assert.ok(!menu.includes(label));
 const hub=applicationHub({...ctx,role:'member',promotionEligible:false,teamApplicationEligible:false});
 assert.doesNotMatch(hub,/href="\/promotions"|href="\/staff\/promotions"/);
});
