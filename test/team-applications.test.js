// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sbs-team-apps-'));
const applicant='100000000000001111',leader='100000000000001112',another='100000000000001113';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'data.sqlite')});
const {db,run,one}=await import('../src/db.js');
const {validateTeamApplication,submitTeamApplication,activeTeamApplication,teamApplication,
 myTeamApplications,teamApplicationQueue,teamApplicationCounts,teamTicketForApplication,teamApplicationForTicket,reconcileTeamTicketArchives,updateTeamApplication,saveTeamApplicationNote}=await import('../src/team-applications.js');
const {verifyAudit}=await import('../src/audit.js');
const {saveXboxLink}=await import('../src/xbox-gamertag-links.js');
for(const id of [applicant,leader,another])
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,'user'+id.slice(-4),'Test Member',Date.now());
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});
const values={
 daily_earnings:'5000000',net_worth:'123000000',
 play_days:'6',play_hours:'4.5',timezone:'Europe/London',
 skill_pvp:'on',skill_farming:'on',
 income_method:'Crop farming and automatic spawner grinding',
 bank_contribution:'sometimes',motivation:'I want to help SBs grow each season.',
 contribution:'I can provide consistent daily deposits and PvP help.'
};
test('applicant MUST supply server-verified Xbox identity; form IGN is not trusted',()=>{
 assert.throws(()=>validateTeamApplication({...values,minecraft_ign:'FakeIGN'}),/verified Microsoft/);
 const data=validateTeamApplication({...values,minecraft_ign:'FakeIGN'}, {linkedGamertag:'RealXboxIGN'});
 assert.equal(data.minecraft_ign,'RealXboxIGN');
 assert.equal(data.xbox_verified,1);
 assert.equal(data.play_days,6);
 assert.equal(data.play_hours,4.5);
 assert.equal(data.daily_earnings,5000000);
 assert.deepEqual(JSON.parse(data.skills_json),['pvp','farming']);
});
test('money and activity validation reject invalid/unbounded values',()=>{
 for(const amount of ['-1','1e9','1.5','1,000','10000000000000000000',''])
  assert.throws(()=>validateTeamApplication({...values,daily_earnings:amount},{linkedGamertag:'RealXboxIGN'}));
 for(const days of ['0','8','1.5',''])
  assert.throws(()=>validateTeamApplication({...values,play_days:days},{linkedGamertag:'RealXboxIGN'}));
 for(const hours of ['0','24.5','2.3','Infinity'])
  assert.throws(()=>validateTeamApplication({...values,play_hours:hours},{linkedGamertag:'RealXboxIGN'}));
 assert.throws(()=>validateTeamApplication({...values,skill_pvp:'',skill_farming:''},{linkedGamertag:'RealXboxIGN'}),/strengths/);
});
test('submission has one-active uniqueness; private note and status audit',()=>{
 saveXboxLink({userId:applicant,identityKey:'a'.repeat(64),gamertag:'RealXboxIGN'});
 const data=validateTeamApplication(values,{linkedGamertag:'RealXboxIGN'});
 const id=submitTeamApplication({userId:applicant,data});
 const archived=teamTicketForApplication(id);
 assert.ok(archived,'team submission creates an ordinary support_tickets record');
 assert.equal(archived.category,'team_application');
 assert.equal(archived.visibility,'admin','team archive is not readable by ordinary reviewers');
 assert.equal(archived.status,'open');
 assert.equal(teamApplicationForTicket(archived.id),id);
 assert.equal(JSON.parse(archived.fields_json).minecraft_ign,'RealXboxIGN');
 assert.equal(JSON.parse(archived.fields_json).contribution,data.contribution);
 assert.ok(!('reviewer_note' in JSON.parse(archived.fields_json)),'private recruiter notes are not copied into the support archive');
 assert.equal(activeTeamApplication(applicant).id,id);
 assert.equal(myTeamApplications(applicant).length,1);
 assert.equal(teamApplicationQueue({status:'active'}).length,1);
 assert.equal(teamApplicationCounts().total,1);
 assert.equal(teamApplicationCounts().active,1);
 assert.ok(teamApplicationCounts().last_submitted_at>0);
 assert.throws(()=>submitTeamApplication({userId:applicant,data}),/already have/);
 assert.equal(one("SELECT COUNT(*) n FROM support_tickets WHERE user_id=? AND category='team_application'",applicant).n,1,
  'duplicate applications do not create extra support records');
 assert.throws(()=>saveTeamApplicationNote({id,actorId:applicant,note:'Fake own note'}),/own/);
 saveTeamApplicationNote({id,actorId:leader,note:'Good contributions'});
 assert.equal(teamApplication(id).reviewer_note,'Good contributions');
 assert.ok(!teamTicketForApplication(id).fields_json.includes('Good contributions'),'private notes never enter the support ticket payload');
 assert.throws(()=>updateTeamApplication({id,actorId:applicant,status:'accepted'}),/own/);
 assert.equal(updateTeamApplication({id,actorId:leader,status:'reviewing'}),'reviewing');
 assert.equal(teamApplication(id).status,'reviewing');
 assert.equal(teamTicketForApplication(id).status,'reviewing');
 assert.equal(updateTeamApplication({id,actorId:leader,status:'accepted',note:'Strong applicant'}),'accepted');
 assert.equal(activeTeamApplication(applicant),null);
 assert.equal(teamTicketForApplication(id).status,'resolved');
 assert.ok(teamTicketForApplication(id).resolved_at);
 assert.equal(teamTicketForApplication(id).resolved_by,leader);
 assert.throws(()=>updateTeamApplication({id,actorId:leader,status:'denied'}),/finalized/);
 const second=submitTeamApplication({userId:applicant,data});
 assert.ok(second>id);
 assert.equal(teamApplicationQueue({status:'all',sort:'earnings'}).length,2);
 assert.equal(teamApplicationCounts().total,2);
 assert.equal(teamApplicationCounts().accepted,1);
 assert.equal(teamApplicationCounts().active,1);
 assert.equal(teamApplicationQueue({q:'RealXbox'}).length,1);
 assert.equal(teamApplication(second).status,'pending');
 assert.equal(teamTicketForApplication(second).status,'open');
 assert.notEqual(teamTicketForApplication(id).id,teamTicketForApplication(second).id);
 assert.equal(one('SELECT COUNT(*) n FROM team_applications WHERE user_id=?',applicant).n,2);
 assert.ok(verifyAudit(db).ok,'owner audit chain must be intact');
});


test('historical recruitment rows are archived once without losing their original contents',()=>{
 const data=validateTeamApplication(values,{linkedGamertag:'HistoricalIGN'});
 const columns=['minecraft_ign','xbox_verified','current_team','daily_earnings','net_worth','play_days',
   'play_hours','timezone','skills_json','strong_suits','income_method','bank_contribution',
   'previous_teams','motivation','contribution'];
 const stamp=Date.now()-60000;
 const sql='INSERT INTO team_applications(user_id,'+columns.join(',')+',created_at,updated_at) VALUES('+
   Array(columns.length+3).fill('?').join(',')+')';
 const id=Number(run(sql,another,...columns.map(k=>data[k]),stamp,stamp).lastInsertRowid);
 assert.equal(teamTicketForApplication(id),null,'legacy row has not yet been mirrored');
 assert.equal(reconcileTeamTicketArchives(),1,'missing legacy row is backfilled');
 const archived=teamTicketForApplication(id);
 assert.ok(archived);
 assert.equal(archived.created_at,stamp,'original submission time is preserved');
 assert.equal(archived.user_id,another);
 assert.equal(JSON.parse(archived.fields_json).motivation,data.motivation);
 assert.equal(reconcileTeamTicketArchives(),0,'repeated startup backfill is idempotent');
 assert.equal(teamTicketForApplication(id).id,archived.id);
 assert.equal(one("SELECT COUNT(*) n FROM support_tickets WHERE category='team_application' AND user_id=?",another).n,1);
});
