// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-poker-http-'));
const guild='100000000000000001',owner='100000000000000002',
 alice='100000000000000481',bob='100000000000000482';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'poker-http.sqlite'),DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Poker '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,10000);
}
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'poker_member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(temp,{recursive:true,force:true});});
async function login(id){
 const response=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 const html=await(await fetch(base+'/arcade/poker',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(html)?.[1];
 assert.ok(cookie&&csrf,'valid test session');
 return {cookie,csrf};
}
const post=(path,person,fields={},csrf=person.csrf)=>fetch(base+path,{method:'POST',redirect:'manual',
 headers:{cookie:person.cookie,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
 body:new URLSearchParams({_csrf:csrf,...fields})});
test('Poker lobby and assets serve to Discord members, showing all three modes',async()=>{
 const member=await login(alice);
 const page=await fetch(base+'/arcade/poker',{headers:{cookie:member.cookie}});
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/Solo Poker/);assert.match(html,/Live Poker/);assert.match(html,/Private Poker/);
 assert.match(html,/\/static\/poker\.css/);assert.match(html,/\/static\/poker\.js/);
 assert.equal((await fetch(base+'/static/poker.js')).status,200);
 assert.equal((await fetch(base+'/static/poker.css')).status,200);
 const online=await(await fetch(base+'/arcade/online',{headers:{cookie:member.cookie}})).text();
 assert.match(online,/Join or Create Poker Table/);
});
test('Poker creation requires CSRF and does not spend points until a hand starts',async()=>{
 const member=await login(alice),before=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 let response=await post('/arcade/poker/create',member,{mode:'solo',bots:'3'},'bad');
 assert.equal(response.status,403);
 response=await post('/arcade/poker/create',member,{mode:'solo',bots:'3'});
 assert.equal(response.status,303);
 const url=response.headers.get('location')||'';
 assert.match(url,/^\/arcade\/poker\/table\/[a-f0-9-]{36}/);
 const page=await fetch(base+url,{headers:{cookie:member.cookie}});
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/data-poker-table=/);
 assert.match(html,/data-poker-state=/);
 assert.match(html,/data-poker-my-cards/);
 const state=await fetch(base+url+'/state',{headers:{cookie:member.cookie,Accept:'application/json'}});
 assert.equal(state.status,200);
 const body=await state.json();
 assert.equal(body.mode,'solo');
 assert.equal(body.hand.players.filter(p=>p.bot).length,3);
 assert.equal(body.hand.myCards.length,2);
 assert.equal(Object.hasOwn(body.hand,'deck'),false);
 const afterStart=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 assert.ok(afterStart<=before&&afterStart>=before-100);
});
test('Poker live table enforces private cards and validates action requests',async()=>{
 const user=await login(bob);
 const create=await post('/arcade/poker/create',user,{mode:'public'});
 assert.equal(create.status,303);
 const path=create.headers.get('location');
 const guest=await fetch(base+path+'/state',{redirect:'manual',headers:{Accept:'application/json'}});
 assert.ok(guest.status===302||guest.status===303);
 const creator=await fetch(base+path+'/state',{headers:{cookie:user.cookie,Accept:'application/json'}});
 assert.equal(creator.status,200);
 const initial=await creator.json();
 assert.equal(initial.mode,'public');assert.equal(initial.joined,true);
 assert.equal(initial.hand,null,'no hand before two human players join');
 let response=await post(path+'/action',user,{action:'check',hand_id:randomUUID(),seq:'0',request_id:randomUUID()});
 assert.equal(response.status,409);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',bob).balance,10000);
});
