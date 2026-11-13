// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const tmp=mkdtempSync(join(tmpdir(),'mega-team-detail-v182-'));
process.env.NODE_ENV='test';process.env.DB_PATH=join(tmp,'detail.sqlite');
const {db}=await import('../src/db.js');
const {parseTeamMemberSnapshot,extractTeamMembers}=await import('../src/mega-top10-roster.js');
const {captureVisibleBankEventRows}=await import('../src/mega-team-page-collector.js');
const {captureTopTeamDetails}=await import('../src/mega-top10-collector.js');
const {saveTopTeamDetails,topTeamDetails,canonicalTeamLink,KNOWN_TEAM_LINKS}=
 await import('../src/mega-top10-store.js');
after(()=>{db.close();rmSync(tmp,{recursive:true,force:true});});

const team={name:KNOWN_TEAM_LINKS[0][0],id:KNOWN_TEAM_LINKS[0][1],
 url:canonicalTeamLink(...KNOWN_TEAM_LINKS[0])};
const event1={text:'Nov 9 11:17 PM PlayerOne Deposited $800,000'};
const event2={text:'Nov 9 11:18 PM PlayerOne Withdrew $20,000'};
const roster={
 hasMemberSection:true,reportedCount:2,
 rows:[{gamertag:'PlayerOne',role:'Leader',depositedText:'$30.1M',
   withdrawnText:'$5.3M'},
   {gamertag:'PlayerTwo',role:'Member',depositedText:'$0.00',
    withdrawnText:'$0.00'}],
 lines:['Members (2)','PlayerOne','Leader','PlayerTwo','Member']
};

test('parses exact observed member cards and reported figures without mixing bank-only players',()=>{
 const parsed=parseTeamMemberSnapshot(roster);
 assert.equal(parsed.roster.length,2);
 assert.equal(parsed.roster[0].gamertag,'PlayerOne');
 assert.equal(parsed.roster[0].role,'Leader');
 assert.equal(parsed.roster[0].reportedDepositsText,'$30.1M');
 assert.equal(parsed.roster[0].reportedWithdrawalsText,'$5.3M');
 assert.equal(parsed.roster[1].reportedDepositsText,'$0.00');
 assert.ok(!parsed.roster.some(x=>x.gamertag==='Members (2)'));
});

test('only an isolated member section can supply plain player-name grid',()=>{
 const valid={hasMemberSection:true,reportedCount:3,
  rows:[],lines:['Members (3)','MinerABC','Redstone2020','Bank_Staff']};
 assert.deepEqual(parseTeamMemberSnapshot(valid).roster.map(x=>x.gamertag),
  ['MinerABC','Redstone2020','Bank_Staff']);
 const unrelated={...valid,hasMemberSection:false};
 assert.equal(parseTeamMemberSnapshot(unrelated).roster.length,0);
 const mismatched={...valid,reportedCount:4};
 assert.equal(parseTeamMemberSnapshot(mismatched).roster.length,0);
});

test('never accepts bank transaction labels, impossible names or invalid money as a member statistic',()=>{
 const parsed=parseTeamMemberSnapshot({
  hasMemberSection:true,reportedCount:1,rows:[
   {gamertag:'Team Bank',depositedText:'$1B'},
   {gamertag:'Event Log'},
   {gamertag:'PlayerOne',depositedText:'<script>',
    withdrawnText:'$1,245',netText:'-$12.3M'}
  ],lines:[]
 });
 assert.equal(parsed.roster.length,1);
 assert.equal(parsed.roster[0].reportedDepositsText,undefined);
 assert.equal(parsed.roster[0].reportedWithdrawalsText,'$1,245');
 assert.equal(parsed.roster[0].reportedNetText,undefined);
});

function fakePage(){
 const target={
  isVisible:async()=>true,
  getAttribute:async name=>name==='aria-selected'?'true':null
 };
 const locator={count:async()=>1,nth:()=>target,first:()=>target};
 const no={count:async()=>0,nth:()=>target,first:()=>target};
 let current=team.url;
 return {
   goto:async()=>{current=team.url;},
   url:()=>current,
   waitForTimeout:async()=>{},
   getByRole:(kind,{name}={})=>kind==='tab'&&String(name).includes('Bank')?locator:no,
   getByText:()=>no,
   evaluate:async fn=>{
    const code=String(fn);
    if(code.includes('const rowMap=new Map'))return roster;
    if(code.includes('let bankBalance=null;'))return {roster:[],bankBalance:'$1.0B'};
    if(code.includes('const count=/'))return {memberCount:2,level:100,views:892,roster:[]};
    if(code.includes('const timestamp=/'))return [event1,event2];
    if(code.includes("const candidates=[...document.querySelectorAll('*')]"))
     return {scrolled:false,atEnd:true};
    throw new Error('Unexpected browser function invoked by detail parser.');
   }
 };
}

test('team-detail capture combines visible roster, team stats and bank events',async()=>{
 const page=fakePage();
 const record=await captureTopTeamDetails(page,team);
 assert.equal(record.roster.length,2);
 assert.equal(record.memberCount,2);
 assert.equal(record.level,100);
 assert.equal(record.events.length,2);
 assert.equal(record.memberStatus,'observed');
 assert.equal(record.eventStatus,'observed');
 assert.equal(record.eventPages,1);
 const result=saveTopTeamDetails(team.id,record);
 assert.equal(result.members,2);
 assert.equal(result.eventsAdded,2);
 const detail=topTeamDetails(team.id);
 assert.equal(detail.memberStatus,'observed');
 assert.equal(detail.eventStatus,'observed');
 assert.equal(detail.eventCount,2);
 assert.equal(detail.members[0].reportedDepositsText,'$30.1M');
 assert.equal(detail.members[0].reportedWithdrawalsText,'$5.3M');
 assert.equal(detail.members[0].depositsCents,80000000);
 assert.equal(detail.members[0].withdrawalsCents,2000000);
 assert.equal(detail.members[1].eventCount,0);
});

test('bank scanning never follows another team id or an unrelated website',async()=>{
 const page=fakePage();
 page.url=()=>canonicalTeamLink('Other','dc26d3b8-a7a3-45ad-9ec3-26b729c5b977');
 await assert.rejects(
  ()=>captureVisibleBankEventRows(page,{teamId:team.id}),
  /approved team page/
 );
});

test('unknown event status never masquerades as verified zero',()=>{
 const id=KNOWN_TEAM_LINKS[1][1];
 saveTopTeamDetails(id,{id,memberCount:21,level:76,
  roster:[],events:[],eventStatus:'unavailable'});
 const detail=topTeamDetails(id);
 assert.equal(detail.memberCount,21);
 assert.equal(detail.eventStatus,'unavailable');
 assert.equal(detail.eventCount,0);
 assert.equal(detail.memberStatus,'unavailable');
 assert.equal(detail.members.length,0);
});
