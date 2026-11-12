// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TEMP_MOD_ROLE_ID,STORE_TEAM_GROUP_ORDER,storeTeamGroup,externalStaffKind} from '../src/team-categories.js';

const config={
 ownerRoleIds:new Set(['owner-id']),
 adminIds:new Set(['admin-id','head-staff-id']),
 reviewerIds:new Set(['reviewer-id','temp-reviewer-id']),
 teamRoleIds:new Set(['team-id','external-id'])
};
const role=(id,name)=>({id,name,position:1});

test('the requested three sections have stable names and role precedence',()=>{
 assert.deepEqual(STORE_TEAM_GROUP_ORDER,['Ownership','Administration','Staff','Mod','Temp Mod']);
 assert.equal(TEMP_MOD_ROLE_ID,'1539085168281919648');
 assert.equal(storeTeamGroup(role('staff-id','Staff'),config),'Staff');
 assert.equal(storeTeamGroup(role('head-staff-id','Head Staff'),config),'Administration','existing configured admin role stays admin');
 assert.equal(storeTeamGroup(role('sr-staff-id','Senior Staff'),config),'Staff');
 assert.equal(storeTeamGroup(role('mod-id','Mod'),config),'Mod');
 assert.equal(storeTeamGroup(role('head-mod-id','Head Mod'),config),'Mod');
 assert.equal(storeTeamGroup(role('moderator-id','Moderator'),config),'Mod');
 assert.equal(storeTeamGroup(role(TEMP_MOD_ROLE_ID,'Temporary Staff (role renamed)'),config),'Temp Mod',
   'Temp Mod is recognized by role ID even when renamed');
 assert.equal(storeTeamGroup(role('temp-reviewer-id','Temp Mod'),config),'Staff',
   'a differently numbered Temp Mod is not assigned the requested Temp Mod category');
});

test('ownership and administration remain separate from the three staff sections',()=>{
 assert.equal(storeTeamGroup(role('owner-id','Random name'),config),'Ownership');
 assert.equal(storeTeamGroup(role('owner-regular','Owners'),config),'Ownership');
 assert.equal(storeTeamGroup(role('admin-id','Other name'),config),'Administration');
 assert.equal(storeTeamGroup(role('administrator','Administrator'),config),'Administration');
 assert.equal(storeTeamGroup(role('manager','Management'),config),'Administration');
 assert.equal(storeTeamGroup(role('reviewer-id','Reviewer'),config),'Staff');
 assert.equal(storeTeamGroup(role('team-id','Custom Team'),config),'Staff');
});

test('external staff and SBs team roles must never become store staff merely by name',()=>{
 for(const name of [
 'Mega Smp Staff','Mega SMP Staff Trusted','Mega Staff Trusted',
 'Prison Staff','Prison Staff Trusted'
 ]){
   assert.ok(externalStaffKind(name),name+' recognized as external');
   assert.equal(storeTeamGroup(role('external-id',name),config),null,name+' does not enter store staff');
 }
 for(const name of ['[SBs] SBs Team Member','SBs Team Leader']){
   assert.equal(storeTeamGroup(role('member-id',name),config),null);
 }
 for(const name of ['Random Staff Trusted','Advertising Staff Badge','Team Enthusiast']){
   assert.equal(storeTeamGroup(role('unlisted-id',name),config),null,name+' not treated as store staff');
 }
});
