// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileRoleBadges,createProfileRoleLookup} from '../src/profile-roles.js';
import {discordRoleSection} from '../src/views.js';

const fixture=[
 {id:'100',name:'@everyone',position:0,color:0},
 {id:'200',name:'Store Staff',position:10,color:0x147fee},
 {id:'300',name:'Mega SMP Staff',position:7,color:0xf0b624},
 {id:'400',name:'Prison Staff',position:6,color:0},
 {id:'500',name:'Managed Role',position:5,color:0x99aabb,managed:true},
 {id:'600',name:'Bad Color',position:1,color:-99}
];

test('all assigned Discord roles sort highest-first and @everyone is excluded',()=>{
 const member={user:{id:'123'},roles:['400','300','200','500','100','600','not-defined']};
 const badges=profileRoleBadges(member,fixture,'100');
 assert.deepEqual(badges.map(r=>r.name),['Store Staff','Mega SMP Staff','Prison Staff','Managed Role','Bad Color']);
 assert.deepEqual(badges.map(r=>r.color),['#147fee','#f0b624','#8296b5','#99aabb','#8296b5']);
 assert.deepEqual(profileRoleBadges({roles:[]},fixture,'100'),[]);
 assert.deepEqual(profileRoleBadges(null,fixture,'100'),[]);
 assert.deepEqual(profileRoleBadges(member,undefined,'100'),[]);
});

test('role view escapes Discord role names and validates CSS colour values',()=>{
 const html=discordRoleSection({state:'loaded',roles:[
   {name:'<img src=x onerror="alert(1)">',color:'#123456'},
   {name:'Another',color:'red; position:fixed;'}
 ]});
 assert.match(html,/Discord Roles/);
 assert.match(html,/2 roles/);
 assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
 assert.doesNotMatch(html,/<img src=x/);
 assert.doesNotMatch(html,/position:fixed/);
 assert.ok(html.includes('--role-accent:#123456'));
 assert.ok(html.includes('--role-accent:#8296b5'));
 assert.match(discordRoleSection({state:'loaded',roles:[]}),/No Discord roles assigned/);
 assert.match(discordRoleSection({state:'unavailable',roles:[]}),/temporarily unavailable/);
 assert.match(discordRoleSection({state:'not_member',roles:[]}),/No current server roles/);
});

test('short-lived cache refreshes Discord role names, colours and member assignments',async()=>{
 let clock=100000,calls={roles:0,member:0};
 let currentRoles=fixture.slice();
 let assigned=['200','300'];
 const discord={
   getRoles:async()=>{calls.roles++;return currentRoles.map(x=>({...x}));},
   getGuildMember:async(id)=>{assert.equal(id,'123');calls.member++;return {user:{id},roles:assigned.slice()};}
 };
 const lookup=createProfileRoleLookup(discord,'100',{ttlMs:60000,clock:()=>clock});
 const first=await lookup('123');
 assert.equal(first.state,'loaded');
 assert.deepEqual(first.roles.map(r=>r.name),['Store Staff','Mega SMP Staff']);
 assert.deepEqual(calls,{roles:1,member:1});
 assigned=['400','500'];currentRoles=fixture.map(r=>r.id==='400'?{...r,name:'Renamed Prison Staff',color:0x8a14ef}:r);
 const cached=await lookup('123');
 assert.deepEqual(cached.roles.map(r=>r.name),['Store Staff','Mega SMP Staff'],'within TTL, previous snapshot is reused');
 assert.deepEqual(calls,{roles:1,member:1});
 clock+=60001;
 const refreshed=await lookup('123');
 assert.deepEqual(refreshed.roles.map(r=>r.name),['Renamed Prison Staff','Managed Role']);
 assert.equal(refreshed.roles[0].color,'#8a14ef');
 assert.deepEqual(calls,{roles:2,member:2});
});

test('self profile uses freshly verified Discord member data without an extra member lookup',async()=>{
 let memberCalls=0;
 const discord={
   getRoles:async()=>fixture,
   getGuildMember:async()=>{memberCalls++;throw new Error('should not refetch self');}
 };
 const lookup=createProfileRoleLookup(discord,'100');
 const result=await lookup('123',{user:{id:'123'},roles:['300','400']});
 assert.equal(result.state,'loaded');
 assert.deepEqual(result.roles.map(r=>r.name),['Mega SMP Staff','Prison Staff']);
 assert.equal(memberCalls,0);
});

test('Discord outages and missing members never fabricate a role',async()=>{
 const failed=createProfileRoleLookup({
   getRoles:async()=>{throw new Error('Discord temporarily unavailable')},
   getGuildMember:async()=>({user:{id:'123'},roles:['200']})
 },'100');
 const unavailable=await failed('123');
 assert.deepEqual(unavailable,{state:'unavailable',roles:[]});
 const missing=createProfileRoleLookup({
   getRoles:async()=>fixture,
   getGuildMember:async()=>null
 },'100');
 assert.deepEqual(await missing('123'),{state:'not_member',roles:[]});
});
