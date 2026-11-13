// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const temp=mkdtempSync(join(tmpdir(),'sbs-mega-top10-v180-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(temp,'top10.sqlite');
const {db,run}=await import('../src/db.js');
const {
 KNOWN_TEAM_LINKS,TOP10_URL,canonicalTeamLink,verifyTeamLink,top10Leaderboard,
 saveTop10Leaderboard,top10NextDue,noteTopTeamAttempt,noteTop10Failure,
 saveTopTeamDetails,topTeamDetails,topTeamById
}=await import('../src/mega-top10-store.js');
const {captureTop10Leaderboard}=await import('../src/mega-top10-collector.js');
const {allMegaPlayerProfileLinks,linkMegaPlayerProfile,unlinkMegaPlayerProfile}=
 await import('../src/mega-player-profile-links.js');
const {MEGA_TEAM_ID}=await import('../src/mega-team.js');
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

const initial=()=>KNOWN_TEAM_LINKS.map(([name,id],i)=>({
 rank:i+1,url:canonicalTeamLink(name,id),
 bankText:i===1?'$40.3M':'$0.00',
 level:i===1?76:null,views:i===1?82:null
}));
test('ten supplied team links are stored as reference URLs, not fake live ranks',()=>{
 const listing=top10Leaderboard();
 assert.equal(listing.live,false);
 assert.equal(listing.teams.length,10);
 assert.ok(listing.teams.every(t=>t.rank===null));
 assert.equal(listing.teams.find(x=>x.name==='richmans').id,'377007');
 assert.equal(listing.teams[0].id,KNOWN_TEAM_LINKS[0][1]);
 assert.equal(verifyTeamLink(listing.teams[0].url).id,KNOWN_TEAM_LINKS[0][1]);
});
test('official URL validation rejects unrelated sites, escaped URLs and wrong gamemodes',()=>{
 assert.equal(verifyTeamLink(canonicalTeamLink('SBsxScam',MEGA_TEAM_ID)).id,MEGA_TEAM_ID);
 assert.throws(()=>verifyTeamLink('https://evil.com/megasmp/teams?team=SBsxScam&gamemode=megasmp&id='+MEGA_TEAM_ID));
 assert.throws(()=>verifyTeamLink('https://inpvp.net.evil.com/megasmp/teams?team=SBsxScam&gamemode=megasmp&id='+MEGA_TEAM_ID));
 assert.throws(()=>verifyTeamLink('https://inpvp.net/megasmp/teams?team=SBsxScam&gamemode=survival&id='+MEGA_TEAM_ID));
 assert.throws(()=>verifyTeamLink('https://inpvp.net/megasmp/teams?team=SBsxScam&gamemode=megasmp&id='+MEGA_TEAM_ID+'&url=https://evil.example'));
 assert.throws(()=>canonicalTeamLink('Invalid<script>',MEGA_TEAM_ID));
 assert.throws(()=>canonicalTeamLink('Abaddon','../../secret'));
});
test('known reference teams are eligible for staggered detail capture before ranking verification',()=>{
 const listing=top10Leaderboard();
 assert.equal(listing.live,false);
 const due=top10NextDue();
 assert.ok(due,'a reference team should be readable while the directory is syncing');
 assert.equal(due.id,KNOWN_TEAM_LINKS[0][1]);
 assert.equal(due.url,canonicalTeamLink('Abaddon',KNOWN_TEAM_LINKS[0][1]));
 assert.equal(listing.teams[0].rank,null,'detail collection never fabricates Top 10 rank');
});
test('verified listing sets current positions without inventing missing fields',()=>{
 const saved=saveTop10Leaderboard(initial());
 assert.equal(saved.changed,true);
 assert.equal(saved.count,10);
 const listing=top10Leaderboard();
 assert.equal(listing.live,true);
 assert.equal(listing.teams.find(t=>t.id===MEGA_TEAM_ID).rank,2);
 assert.equal(listing.teams.find(t=>t.id===MEGA_TEAM_ID).bankText,'$40.3M');
 assert.equal(listing.teams.find(t=>t.id===MEGA_TEAM_ID).level,76);
 assert.equal(listing.teams.find(t=>t.name==='Abaddon').memberCount,null);
 assert.equal(listing.teams.find(t=>t.name==='Abaddon').level,null);
 assert.equal(top10NextDue().id,KNOWN_TEAM_LINKS[0][1]);
 noteTopTeamAttempt(KNOWN_TEAM_LINKS[0][1]);
 assert.equal(top10NextDue().id,MEGA_TEAM_ID,'details stagger across teams');
});
test('new Top 10 entry auto replaces a displaced team but keeps its history and real URL',()=>{
 const updated=initial();
 const newcomer={rank:6,url:canonicalTeamLink('NewWinners','79a9de11-bc11-4b0b-a1e1-8c4547e1e948'),
   bankText:'$12.6M',level:61,views:50};
 updated[5]=newcomer;
 const result=saveTop10Leaderboard(updated);
 assert.equal(result.changed,true);
 assert.deepEqual(result.newTeams,['NewWinners']);
 const listing=top10Leaderboard();
 assert.equal(listing.teams.length,10);
 assert.equal(listing.teams[5].name,'NewWinners');
 assert.equal(listing.teams[5].rank,6);
 assert.equal(topTeamById(KNOWN_TEAM_LINKS[5][1]).rank,null,
   'displaced team history and source URL remain saved');
 const before=top10Leaderboard().teams.map(x=>x.id);
 assert.throws(()=>saveTop10Leaderboard(updated.slice(0,9)),/incomplete/);
 assert.throws(()=>saveTop10Leaderboard(updated.map(x=>({...x,rank:1}))),/duplicate/);
 assert.deepEqual(top10Leaderboard().teams.map(x=>x.id),before);
 noteTop10Failure('Source not fully rendered');
 assert.deepEqual(top10Leaderboard().teams.map(x=>x.id),before);
});
test('read-only DOM leaderboard discovery follows official links for newly ranked teams',async()=>{
 const updated=initial();
 updated[5]={rank:6,url:canonicalTeamLink('NewWinners','79a9de11-bc11-4b0b-a1e1-8c4547e1e948'),
   bankText:'$12.6M',level:61,views:50};
 const observed=updated.map((team,i)=>({
   rank:i+1,name:verifyTeamLink(team.url).name,external:team.url,
   dataId:'',bankText:team.bankText,level:team.level,views:team.views,
   index:i,selector:'table tbody tr'
 }));
 const urls=[];
 const page={
   goto:async url=>{urls.push(url);},
   evaluate:async()=>observed
 };
 const rows=await captureTop10Leaderboard(page,{knownTeams:[]});
 assert.equal(rows.length,10);
 assert.equal(verifyTeamLink(rows[5].url).name,'NewWinners');
 assert.equal(urls[0],TOP10_URL);
 assert.equal(urls.length,1,'source supplied links need no extra page visits');
});
test('new teams without anchor links can be discovered via normal visible row click',async()=>{
 const teamName='ClickedTeam',teamId='bf4f19ac-188c-4a6a-86be-289fc9ee75ad';
 const listing=initial().map((team,i)=>({
   rank:i+1,name:verifyTeamLink(team.url).name,external:team.url,
   dataId:'',bankText:team.bankText,level:team.level,views:team.views,
   index:i,selector:'table tbody tr'
 }));
 listing[9]={...listing[9],name:teamName,external:'',index:9};
 let current=TOP10_URL,clicks=0,refreshes=0;
 const page={
   goto:async url=>{current=url;refreshes++;},
   evaluate:async()=>listing,
   locator:()=>({nth:()=>({locator:()=>({nth:()=>({
     click:async()=>{clicks++;current=canonicalTeamLink(teamName,teamId);}
   })})})}),
   waitForURL:async fn=>{assert.ok(fn(new URL(current)),'click must navigate to an InPvP detail ID');},
   url:()=>current
 };
 const rows=await captureTop10Leaderboard(page,{knownTeams:KNOWN_TEAM_LINKS.map(([name,id])=>({name,url:canonicalTeamLink(name,id)}))});
 assert.equal(clicks,1);
 assert.equal(verifyTeamLink(rows[9].url).id,teamId);
 assert.ok(refreshes>=2);
});
test('bank events are deduplicated per team and never double-count between teams',()=>{
 const source=KNOWN_TEAM_LINKS[0][1];
 const old=saveTopTeamDetails(source,{
  id:source,bankText:'$1.0B',level:100,views:890,memberCount:24,
  roster:[{gamertag:'AlphaPlayer',role:'Leader'}],
  events:[
   {text:'Nov 9 11:17 PM AlphaPlayer Deposited $800,000'},
   {text:'Nov 9 11:18 PM AlphaPlayer Withdrew $20,000'}
  ]
 });
 assert.equal(old.eventsAdded,2);
 const again=saveTopTeamDetails(source,{
  id:source,bankText:null,roster:[],events:[
   {text:'Nov 9 11:17 PM AlphaPlayer Deposited $800,000'},
   {text:'Nov 9 11:18 PM AlphaPlayer Withdrew $20,000'}
  ]
 });
 assert.equal(again.eventsAdded,0);
 const detail=topTeamDetails(source);
 assert.equal(detail.bankText,'$1.0B');
 assert.equal(detail.level,100);
 assert.equal(detail.memberCount,24);
 assert.equal(detail.eventCount,2);
 assert.equal(detail.members.length,1);
 assert.equal(detail.members[0].depositsCents,80000000);
 assert.equal(detail.members[0].withdrawalsCents,2000000);
 assert.equal(detail.members[0].netCents,78000000);
 assert.equal(topTeamDetails(MEGA_TEAM_ID).eventCount,0,'team activity stays isolated');
});
test('owner-entered Minecraft profile associations are global, case-insensitive and removable',()=>{
 const owner='100000000000000002',member='100000000000000007';
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
   owner,'owner','Owner',Date.now());
 run('INSERT OR IGNORE INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
   member,'member','Member',Date.now());
 assert.throws(()=>linkMegaPlayerProfile({gamertag:'<script>',discordId:member,actorId:owner}));
 assert.throws(()=>linkMegaPlayerProfile({gamertag:'AlphaPlayer',discordId:'123',actorId:owner}));
 const first=linkMegaPlayerProfile({gamertag:'AlphaPlayer',discordId:member,actorId:owner});
 assert.equal(first.changed,true);
 assert.equal(linkMegaPlayerProfile({gamertag:'alphaplayer',discordId:member,actorId:owner}).changed,false);
 const links=allMegaPlayerProfileLinks();
 assert.equal(links.filter(x=>x.gamertag.toLowerCase()==='alphaplayer').length,1);
 assert.equal(links.find(x=>x.gamertag.toLowerCase()==='alphaplayer').discordId,member);
 assert.equal(unlinkMegaPlayerProfile('ALPHAPLAYER').changed,true);
 assert.equal(allMegaPlayerProfileLinks().some(x=>x.gamertag.toLowerCase()==='alphaplayer'),false);
});
