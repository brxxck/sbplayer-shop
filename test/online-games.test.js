// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=mkdtempSync(join(tmpdir(),'sb-online-games-'));
const guild='100000000000000001';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'online.sqlite'),DISCORD_GUILD_ID:guild});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js'); // Creates the durable wallet schema.
const {ONLINE_LOBBY_STALE_MS,joinOnlineLobby,leaveOnlineLobby,heartbeatOnlineLobby,onlineGamesSnapshot}=await import('../src/online-games.js');
const {isCinematicWin}=await import('../src/arcade-cinematic-rules.js');
const users=Array.from({length:12},(_,i)=>String(100000000000000100n+BigInt(i)));
for(const user of users)run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',user,user,user,Date.now());
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});

test('Blackjack reserves four seats and places extra players into a FIFO waitlist',()=>{
 const t=1000000;
 for(let i=0;i<5;i++)joinOnlineLobby(users[i],'blackjack',t+i);
 const first=onlineGamesSnapshot(users[0],t+10);
 const fifth=onlineGamesSnapshot(users[4],t+10);
 assert.equal(first.blackjack.seated,4);
 assert.equal(first.blackjack.waiting,1);
 assert.equal(first.blackjack.position,1);
 assert.equal(fifth.blackjack.position,5);
 assert.equal(fifth.blackjack.atTable,false);
 joinOnlineLobby(users[4],'blackjack',t+15);
 assert.equal(onlineGamesSnapshot(users[4],t+16).blackjack.position,5,'rejoining must not jump the queue');
 leaveOnlineLobby(users[0],'blackjack',t+20);
 assert.equal(onlineGamesSnapshot(users[4],t+21).blackjack.position,4);
 assert.equal(onlineGamesSnapshot(users[4],t+21).blackjack.atTable,true);
});

test('Global Crash lobby has no four-player cap and independent membership',()=>{
 const t=2000000;
 for(let i=0;i<users.length;i++)joinOnlineLobby(users[i],'crash',t+i);
 const s=onlineGamesSnapshot(users[11],t+15);
 assert.equal(s.crash.lobbyPlayers,users.length);
 assert.equal(s.crash.joined,true);
 assert.equal(s.crash.phase,'not_started');
 assert.equal(s.crash.roundPlayers,0);
 assert.equal(s.crash.roundWager,0);
 assert.equal(s.blackjack.lobbyPlayers,0);
});

test('Stale members disappear, heartbeat only refreshes existing seats, and leaving is safe to repeat',()=>{
 const t=3000000;
 joinOnlineLobby(users[1],'blackjack',t);
 joinOnlineLobby(users[2],'blackjack',t);
 heartbeatOnlineLobby(users[1],t+ONLINE_LOBBY_STALE_MS-10);
 const state=onlineGamesSnapshot(users[1],t+ONLINE_LOBBY_STALE_MS+5);
 assert.equal(state.blackjack.lobbyPlayers,1);
 assert.equal(state.blackjack.joined,true);
 assert.equal(onlineGamesSnapshot(users[2],t+ONLINE_LOBBY_STALE_MS+5).blackjack.joined,false);
 leaveOnlineLobby(users[1],'blackjack',t+ONLINE_LOBBY_STALE_MS+5);
 leaveOnlineLobby(users[1],'blackjack',t+ONLINE_LOBBY_STALE_MS+5);
 assert.equal(onlineGamesSnapshot(users[1],t+ONLINE_LOBBY_STALE_MS+5).blackjack.lobbyPlayers,0);
 heartbeatOnlineLobby(users[2],t+ONLINE_LOBBY_STALE_MS+5);
 assert.equal(onlineGamesSnapshot(users[2],t+ONLINE_LOBBY_STALE_MS+5).blackjack.joined,false);
});

test('Lobby registration never changes wallet balances or creates a wager',()=>{
 const t=4000000;
 const w=one("SELECT COUNT(*) AS count FROM level_point_wallets");
 const entries=one("SELECT COUNT(*) AS count FROM online_game_entries");
 joinOnlineLobby(users[0],'blackjack',t);
 joinOnlineLobby(users[1],'crash',t);
 assert.equal(one("SELECT COUNT(*) AS count FROM level_point_wallets").count,w.count);
 assert.equal(one("SELECT COUNT(*) AS count FROM online_game_entries").count,entries.count);
 assert.equal(onlineGamesSnapshot(users[0],t).blackjack.roundWager,0);
 assert.throws(()=>joinOnlineLobby(users[0],'slots',t),e=>e.status===400);
 assert.throws(()=>joinOnlineLobby('not-a-discord-id','crash',t),e=>e.status===400);
});

test('Only confirmed, sufficiently large net winnings trigger cinematic mode',()=>{
 assert.equal(isCinematicWin({status:'won',wager:1000,payout:2000}),true);
 assert.equal(isCinematicWin({status:'won',wager:50,payout:500}),true);
 assert.equal(isCinematicWin({status:'won',wager:100,payout:200}),false);
 assert.equal(isCinematicWin({status:'lost',wager:100,payout:2000}),false);
 assert.equal(isCinematicWin({status:'active',wager:100,payout:2000}),false);
 assert.equal(isCinematicWin({status:'push',wager:100,payout:100}),false);
});
