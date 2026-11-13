// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const tmp=mkdtempSync(join(tmpdir(),'mega-team-members-v182-'));
process.env.NODE_ENV='test';process.env.DB_PATH=join(tmp,'players.sqlite');
const {db}=await import('../src/db.js');
const {parseTeamMemberSnapshot}=await import('../src/mega-top10-roster.js');
const {captureTopTeamDetails}=await import('../src/mega-top10-collector.js');
const {saveTopTeamDetails,topTeamDetails,top10Leaderboard,canonicalTeamLink,KNOWN_TEAM_LINKS}=
 await import('../src/mega-top10-store.js');
const {megaTeamDetailsPage,megaLeaderboardPage}=await import('../src/mega-top10-views.js');
after(()=>{db.close();rmSync(tmp,{recursive:true,force:true});});

const team={name:KNOWN_TEAM_LINKS[0][0],id:KNOWN_TEAM_LINKS[0][1],
 url:canonicalTeamLink(...KNOWN_TEAM_LINKS[0])};
const roster={
 hasMemberSection:true,reportedCount:2,
 rows:[{gamertag:'PlayerOne',role:'Leader'},
       {gamertag:'PlayerTwo',role:'Member'}],
 lines:['Members (2)','PlayerOne','Leader','PlayerTwo','Member']
};
const ctx={pathname:'/mega-team',user:{id:'100000000000000002',username:'owner'},
 role:'owner',csrf:'fixture',config:{}};

test('member cards produce verified names and roles but not inferred contributions',()=>{
 const parsed=parseTeamMemberSnapshot(roster);
 assert.deepEqual(parsed.roster.map(x=>x.gamertag),['PlayerOne','PlayerTwo']);
 assert.equal(parsed.roster[0].role,'Leader');
 assert.ok(!parsed.roster.some(x=>x.gamertag==='Members (2)'));
});
test('plain name grids require a visible, explicitly labeled Members section',()=>{
 const source={hasMemberSection:true,reportedCount:3,rows:[],
  lines:['Members (3)','MinerABC','Redstone2020','Bank_Staff']};
 assert.deepEqual(parseTeamMemberSnapshot(source).roster.map(x=>x.gamertag),
  ['MinerABC','Redstone2020','Bank_Staff']);
 assert.equal(parseTeamMemberSnapshot({...source,hasMemberSection:false}).roster.length,0);
 assert.equal(parseTeamMemberSnapshot({...source,reportedCount:4}).roster.length,0);
});
test('UI headings and unrelated player-like text cannot become roster members',()=>{
 const parsed=parseTeamMemberSnapshot({hasMemberSection:true,reportedCount:1,rows:[
   {gamertag:'Team Bank'},{gamertag:'Event Log'},
   {gamertag:'PlayerOne',role:'Member'}],lines:[]});
 assert.deepEqual(parsed.roster.map(x=>x.gamertag),['PlayerOne']);
});

function fakePage(rows=roster,memberCount=2){
 let current=team.url;
 const none={count:async()=>0};
 return {
  goto:async()=>{current=team.url;},
  url:()=>current,
  waitForTimeout:async()=>{},
  getByRole:()=>none,
  evaluate:async fn=>{
   const code=String(fn);
   if(code.includes('const rowMap=new Map'))return rows;
   if(code.includes("const body=document.body?.innerText||''"))
     return {memberCount};
   throw new Error('Unexpected browser operation; other teams must not scrape bank history.');
  }
 };
}
test('team-detail worker collects only visible member names, leaving bank collection to SBsxScam',async()=>{
 const page=fakePage();
 const captured=await captureTopTeamDetails(page,team);
 assert.equal(captured.memberCount,2);
 assert.deepEqual(captured.roster.map(x=>x.gamertag),['PlayerOne','PlayerTwo']);
 assert.deepEqual(captured.events,[]);
 assert.equal(captured.bankText,null);
 assert.equal(captured.memberStatus,'observed');
 const result=saveTopTeamDetails(team.id,captured);
 assert.equal(result.members,2);
 assert.equal(result.eventsAdded,0);
 const saved=topTeamDetails(team.id);
 assert.equal(saved.memberCount,2);
 assert.ok(saved.members.every(x=>x.rosterObserved));
});
test('team details do not invent membership when InPvP only exposes a count',async()=>{
 const noNames=await captureTopTeamDetails(fakePage({
  hasMemberSection:false,reportedCount:21,rows:[],lines:[]
 },21),team);
 assert.equal(noNames.memberCount,21);
 assert.equal(noNames.roster.length,0);
 assert.equal(noNames.memberStatus,'unavailable');
 const existing=topTeamDetails(team.id);
 assert.equal(existing.members.length,2,'previous verified player names are retained');
 assert.equal(existing.members.filter(x=>x.rosterObserved).length,2);
});
test('simplified team pages show roster names and linked Discord profiles without empty finance sections',()=>{
 const saved=topTeamDetails(team.id);
 const page=megaTeamDetailsPage(ctx,{
  team:saved,
  links:[{gamertag:'PlayerOne',discordId:'100000000000000008',username:'discord-user'}]
 });
 assert.match(page,/PlayerOne/);
 assert.match(page,/PlayerTwo/);
 assert.match(page,/href="\/u\/100000000000000008"/);
 assert.match(page,/<th>PLAYER<\/th><th>TEAM ROLE<\/th>/);
 assert.doesNotMatch(page,/OBSERVED DEPOSITS|OBSERVED WITHDRAWALS|OBSERVED NET|CAPTURED BANK EVENTS|<th>AMOUNT<\/th>/);
 const listing=megaLeaderboardPage(ctx,top10Leaderboard());
 assert.match(listing,/<th>PLACE<\/th><th>TEAM<\/th><th>OFFICIAL PAGE<\/th>/);
 assert.doesNotMatch(listing,/<th>BANK<\/th>|<th>LEVEL<\/th>|<th>VIEWS<\/th>|<th>MEMBERS<\/th>/);
});
test('empty team pages explain unavailable roster without blank bank/stat cards',()=>{
 const id=KNOWN_TEAM_LINKS[2][1];
 saveTopTeamDetails(id,{id,memberCount:21,roster:[],events:[]});
 const page=megaTeamDetailsPage(ctx,{team:topTeamDetails(id),links:[]});
 assert.match(page,/21 members reported by InPvP/);
 assert.match(page,/player names for this team are not currently available/);
 assert.doesNotMatch(page,/OBSERVED DEPOSITS|OBSERVED WITHDRAWALS|OBSERVED NET|Not recorded|<th>EVENTS<\/th>/);
});
