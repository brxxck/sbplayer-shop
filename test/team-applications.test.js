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
 myTeamApplications,teamApplicationQueue,updateTeamApplication,saveTeamApplicationNote}=await import('../src/team-applications.js');
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
 assert.equal(activeTeamApplication(applicant).id,id);
 assert.equal(myTeamApplications(applicant).length,1);
 assert.equal(teamApplicationQueue({status:'active'}).length,1);
 assert.throws(()=>submitTeamApplication({userId:applicant,data}),/already have/);
 assert.throws(()=>saveTeamApplicationNote({id,actorId:applicant,note:'Fake own note'}),/own/);
 saveTeamApplicationNote({id,actorId:leader,note:'Good contributions'});
 assert.equal(teamApplication(id).reviewer_note,'Good contributions');
 assert.throws(()=>updateTeamApplication({id,actorId:applicant,status:'accepted'}),/own/);
 assert.equal(updateTeamApplication({id,actorId:leader,status:'reviewing'}),'reviewing');
 assert.equal(teamApplication(id).status,'reviewing');
 assert.equal(updateTeamApplication({id,actorId:leader,status:'accepted',note:'Strong applicant'}),'accepted');
 assert.equal(activeTeamApplication(applicant),null);
 assert.throws(()=>updateTeamApplication({id,actorId:leader,status:'denied'}),/finalized/);
 const second=submitTeamApplication({userId:applicant,data});
 assert.ok(second>id);
 assert.equal(teamApplicationQueue({status:'all',sort:'earnings'}).length,2);
 assert.equal(teamApplicationQueue({q:'RealXbox'}).length,1);
 assert.equal(teamApplication(second).status,'pending');
 assert.equal(one('SELECT COUNT(*) n FROM team_applications WHERE user_id=?',applicant).n,2);
 assert.ok(verifyAudit(db).ok,'owner audit chain must be intact');
});
