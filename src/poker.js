// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Persistent No-Limit Hold'em. Points are the bets, never exchanged for chips.
import {randomInt,randomUUID} from 'node:crypto';
import {db,one,all,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {pokerDeck,pokerRank,pokerPots,POKER_MAX_HAND_STAKE,POKER_TURN_MS,POKER_RESULTS_MS} from './poker-rules.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const idOf=x=>{if(typeof x!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(x))fail('Invalid Poker table.');return x;};
const userOf=x=>{const s=String(x||'');if(!/^[0-9]{15,22}$/.test(s))fail('Invalid Discord user.');return s;};
const intOf=(value,min,max,label)=>{if(!/^\d+$/.test(String(value??'')))fail('Invalid '+label+'.');const v=Number(value);if(!Number.isSafeInteger(v)||v<min||v>max)fail('Invalid '+label+'.');return v;};
const wallet=id=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,id)?.balance||0;
const nameFor=id=>one('SELECT COALESCE(display_name,username) AS name FROM users WHERE id=?',id)?.name||'Player';
const botName=i=>['SB Ace','Cam King','River Fox','Diamond Dee','Lucky Jack'][i%5];
const clock=()=>Date.now();
db.exec("CREATE TABLE IF NOT EXISTS poker_tables ("+
 "id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('solo','public','private')),"+
 "owner_id TEXT NOT NULL REFERENCES users(id),invite_code TEXT NOT NULL DEFAULT '',"+
 "seat_limit INTEGER NOT NULL,small_blind INTEGER NOT NULL,big_blind INTEGER NOT NULL,bots INTEGER NOT NULL DEFAULT 0,"+
 "state_json TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);"+
 "CREATE INDEX IF NOT EXISTS poker_tables_guild ON poker_tables(guild_id,mode,updated_at DESC);"+
 "CREATE TABLE IF NOT EXISTS poker_seats ("+
 "user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,table_id TEXT NOT NULL REFERENCES poker_tables(id),"+
 "seat_no INTEGER NOT NULL,sitting_out INTEGER NOT NULL DEFAULT 0,last_seen_at INTEGER NOT NULL,"+
 "joined_at INTEGER NOT NULL,UNIQUE(table_id,seat_no));"+
 "CREATE INDEX IF NOT EXISTS poker_seats_table ON poker_seats(table_id,seat_no);"+
 "CREATE TABLE IF NOT EXISTS poker_actions ("+
 "request_key TEXT PRIMARY KEY,user_id TEXT NOT NULL,table_id TEXT NOT NULL,signature TEXT NOT NULL,created_at INTEGER NOT NULL);"+
 "CREATE TABLE IF NOT EXISTS poker_chat ("+
 "id INTEGER PRIMARY KEY AUTOINCREMENT,table_id TEXT NOT NULL REFERENCES poker_tables(id),"+
 "user_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,created_at INTEGER NOT NULL);"+
 "CREATE INDEX IF NOT EXISTS poker_chat_table ON poker_chat(table_id,id DESC);"
);
const load=tableId=>{const t=one('SELECT * FROM poker_tables WHERE id=? AND guild_id=?',idOf(tableId),config.guildId);if(!t)fail('Poker table not found.',404);return {...t,state:JSON.parse(t.state_json)};};
const save=t=>run('UPDATE poker_tables SET state_json=?,updated_at=? WHERE id=? AND guild_id=?',JSON.stringify(t.state),clock(),t.id,config.guildId);
const seats=t=>all('SELECT s.user_id AS id,s.seat_no AS seat,s.sitting_out,s.last_seen_at,s.joined_at,COALESCE(u.display_name,u.username) AS name FROM poker_seats s JOIN users u ON u.id=s.user_id WHERE s.table_id=? ORDER BY s.seat_no',t.id);
const seated=(t,u)=>!!one('SELECT 1 FROM poker_seats WHERE table_id=? AND user_id=?',t.id,u);
function canView(t,u,code=''){
 if(t.mode==='solo'&&t.owner_id!==u)fail('Not your Solo Poker table.',403);
 if(t.mode==='private'&&!seated(t,u)&&t.owner_id!==u&&String(code||'').trim().toUpperCase()!==t.invite_code)fail('Private invitation required.',403);
}
function available(p){return Math.min(POKER_MAX_HAND_STAKE-p.contributed,p.bot?POKER_MAX_HAND_STAKE:wallet(p.id));}
function addBet(t,h,p,amount){
 if(!Number.isSafeInteger(amount)||amount<0||amount>available(p))fail('Not enough available points or hand limit reached.',409);
 if(!amount)return;
 if(!p.bot)walletChange(p.id,-amount,'poker.wager','poker:wager:'+h.id+':'+p.id+':'+h.seq);
 p.street+=amount;p.contributed+=amount;h.pot+=amount;
 if(available(p)<=0)p.allIn=true;
}
const canAct=p=>!p.folded&&!p.allIn;
function nextActor(h,start){
 for(let k=1;k<=h.players.length;k++){
  const index=(start+k)%h.players.length,p=h.players[index];
  if(canAct(p)&&(!p.acted||p.street<h.currentBet))return index;
 }
 return -1;
}
function availableSeats(t,stamp){
 const active=seats(t).filter(p=>!p.sitting_out&&p.last_seen_at>=stamp-20000&&wallet(p.id)>=t.big_blind);
 if(t.mode!=='solo')return active;
 if(!active.some(s=>s.id===t.owner_id))return [];
 const used=new Set(active.map(s=>s.seat));
 for(let i=0;i<t.bots;i++){
  const seat=[...Array(t.seat_limit).keys()].find(n=>!used.has(n));used.add(seat);
  active.push({id:'bot:'+i,seat,name:botName(i),bot:true});
 }
 return active.sort((a,b)=>a.seat-b.seat);
}
function startHand(t,stamp){
 const ready=availableSeats(t,stamp);
 if(ready.length<2)return false;
 const deck=pokerDeck();
 const players=ready.map(s=>({id:s.id,bot:!!s.bot,seat:s.seat,name:s.name,
  cards:[deck.pop(),deck.pop()],contributed:0,street:0,folded:false,allIn:false,acted:false,raiseRights:true}));
 const prevSeat=t.state.lastDealerSeat??-1;
 const dealer=players.findIndex(p=>p.seat>prevSeat);
 const button=dealer<0?0:dealer;
 t.state.lastDealerSeat=players[button].seat;
 const sb=players.length===2?button:(button+1)%players.length;
 const bb=(sb+1)%players.length;
 const h={id:randomUUID(),phase:'preflop',players,deck,board:[],dealer:button,
  pot:0,currentBet:0,minRaise:t.big_blind,turn:-1,turnEndsAt:0,seq:0,history:[],startedAt:stamp};
 t.state.hand=h;
 addBet(t,h,players[sb],t.small_blind);h.seq++;
 addBet(t,h,players[bb],t.big_blind);h.seq++;
 h.currentBet=players[bb].street;
 h.history.push({text:'Blinds '+t.small_blind+'/'+t.big_blind,at:stamp});
 h.turn=nextActor(h,bb);h.turnEndsAt=stamp+POKER_TURN_MS;
 if(h.turn<0)advanceStreet(t,stamp);
 return true;
}
function nextStreetPhase(phase){return {preflop:'flop',flop:'turn',turn:'river'}[phase];}
function advanceStreet(t,stamp){
 const h=t.state.hand;
 if(h.phase==='river'){settle(t,stamp);return;}
 const phase=nextStreetPhase(h.phase);
 if(!phase)return;
 h.deck.pop();
 for(let i=0;i<(phase==='flop'?3:1);i++)h.board.push(h.deck.pop());
 h.phase=phase;h.currentBet=0;h.minRaise=t.big_blind;
 for(const p of h.players){p.street=0;p.acted=false;p.raiseRights=true;}
 h.history.push({text:phase.toUpperCase()+' dealt',at:stamp});
 h.turn=nextActor(h,h.dealer);h.turnEndsAt=stamp+POKER_TURN_MS;
 if(h.turn<0)advanceStreet(t,stamp);
}
function settle(t,stamp){
 const h=t.state.hand;
 if(h.phase==='results')return;
 while(h.board.length<5){h.deck.pop();h.board.push(h.deck.pop());}
 const result=pokerPots(h.players,h.board);
 for(const p of h.players){
  if(p.bot)continue;
  const payout=result.payouts[p.id]||0;
  if(payout)walletChange(p.id,payout,'poker.payout','poker:payout:'+h.id+':'+p.id);
  const details={tableId:t.id,mode:t.mode,handId:h.id,board:h.board,cards:p.cards,
   awards:result.awards,profit:payout-p.contributed,players:h.players.map(x=>({
    id:x.id,name:x.name,contributed:x.contributed,folded:x.folded,
    cards:x.folded?[]:x.cards
   })),history:h.history};
  run('INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
   config.guildId,p.id,t.mode==='solo'?'poker_solo':t.mode==='private'?'poker_private':'poker_live',
   p.contributed,payout,payout>p.contributed?'won':payout===p.contributed?'push':'lost',
   JSON.stringify(details),'poker:round:'+h.id+':'+p.id,h.startedAt,stamp);
 }
 h.phase='results';h.deck=[];h.turn=-1;h.turnEndsAt=stamp+POKER_RESULTS_MS;
 h.winners=result.awards;h.payouts=result.payouts;h.seq++;
 h.history.push({text:'Hand settled · '+result.pot+' points',at:stamp});
 t.state.handsPlayed=(t.state.handsPlayed||0)+1;
}
function turnDone(t,stamp,from){
 const h=t.state.hand;
 if(h.players.filter(p=>!p.folded).length===1){settle(t,stamp);return;}
 const next=nextActor(h,from);
 if(next<0)advanceStreet(t,stamp);
 else {h.turn=next;h.turnEndsAt=stamp+POKER_TURN_MS;}
}
function takeAction(t,p,action,to=0,stamp=clock()){
 const h=t.state.hand,idx=h.turn,actor=h.players[idx];
 if(!actor||actor.id!==p.id||h.phase==='results')fail('Not your Poker turn.',409);
 const owed=Math.max(0,h.currentBet-p.street),max=available(p);
 let add=0,previous=h.currentBet;
 if(action==='fold')p.folded=true;
 else if(action==='check'){if(owed)fail('You cannot check while facing a bet.',409);}
 else if(action==='call'){add=Math.min(owed,max);addBet(t,h,p,add);}
 else if(action==='raise'){
  if(!p.raiseRights)fail('This short all-in does not reopen raising.',409);
  if(!Number.isSafeInteger(to)||to<=h.currentBet||to-h.currentBet<h.minRaise)fail('Raise is below the minimum.',409);
  add=to-p.street;
  if(add>max||add<=0)fail('Insufficient points for raise.',409);
  addBet(t,h,p,add);h.currentBet=to;h.minRaise=to-previous;
  for(const other of h.players)if(other!==p&&canAct(other)){other.acted=false;other.raiseRights=true;}
 }else if(action==='allin'){
  if(max<=0)fail('No points left to go all-in.',409);
  add=max;const newBet=p.street+add;
  addBet(t,h,p,add);p.allIn=true;
  if(newBet>h.currentBet){
   const raiseSize=newBet-h.currentBet;
   h.currentBet=newBet;
   if(raiseSize>=h.minRaise){
    h.minRaise=raiseSize;
    for(const other of h.players)if(other!==p&&canAct(other)){other.acted=false;other.raiseRights=true;}
   }else{
    // The full bet remains due, but acted players cannot re-raise.
    for(const other of h.players)if(other!==p&&other.acted)other.raiseRights=false;
   }
  }
 }else fail('Unknown Poker action.');
 p.acted=true;h.seq++;
 h.history.push({text:p.name+' '+action+(add?' '+add+' pts':''),at:stamp});
 if(h.history.length>75)h.history.shift();
 turnDone(t,stamp,idx);
}
function botTurn(t,p,stamp){
 const h=t.state.hand,owed=Math.max(0,h.currentBet-p.street),max=available(p);
 const ranks=p.cards.map(c=>'23456789TJQKA'.indexOf(c[0])+2);
 let strength=ranks[0]===ranks[1]?0.8:Math.max(...ranks)>=13?0.57:Math.max(...ranks)>=10?0.42:0.22;
 if(h.board.length>=3){
  const rank=pokerRank([...p.cards,...h.board]);
  strength=Math.max(strength,rank[0]>=4?0.96:rank[0]>=3?0.83:rank[0]===2?0.7:rank[0]===1?0.46:0.2);
 }
 const roll=randomInt(100)/100;
 if(owed>Math.max(500,t.big_blind*4)&&roll>strength+.27){takeAction(t,p,'fold',0,stamp);return;}
 if(owed===0){
  const to=h.currentBet+Math.max(t.big_blind,h.minRaise);
  if(strength>.70&&roll<.23&&p.street+max>=to){takeAction(t,p,'raise',to,stamp);return;}
  takeAction(t,p,'check',0,stamp);return;
 }
 if(strength>.78&&roll<.16&&p.raiseRights&&max>owed+h.minRaise){
  const to=h.currentBet+h.minRaise;
  if(to-p.street<=max){takeAction(t,p,'raise',to,stamp);return;}
 }
 takeAction(t,p,'call',0,stamp);
}
function advance(t,stamp=clock()){
 let changed=false;
 for(let cycles=0;cycles<120;cycles++){
  const h=t.state.hand;
  if(!h||h.phase==='results'){
   if(h&&stamp<h.turnEndsAt)break;
   if(!startHand(t,stamp))break;
   changed=true;continue;
  }
  const p=h.players[h.turn];
  if(!p){advanceStreet(t,stamp);changed=true;continue;}
  if(!canAct(p)){turnDone(t,stamp,h.turn);changed=true;continue;}
  if(p.bot){botTurn(t,p,stamp);changed=true;continue;}
  if(h.turnEndsAt<=stamp){
   takeAction(t,p,h.currentBet===p.street?'check':'fold',0,stamp);
   changed=true;continue;
  }
  break;
 }
 if(changed)save(t);
 return t;
}
const tableInfo=t=>({id:t.id,mode:t.mode,seats:t.seat_limit,seated:seats(t).length,
 smallBlind:t.small_blind,bigBlind:t.big_blind,bots:t.bots,handsPlayed:t.state.handsPlayed||0});
export function pokerLobby(userId){
 const user=userOf(userId);
 const publics=all("SELECT * FROM poker_tables WHERE guild_id=? AND mode='public' ORDER BY updated_at DESC LIMIT 16",config.guildId).map(tableInfo);
 const own=one('SELECT s.table_id FROM poker_seats s JOIN poker_tables t ON t.id=s.table_id WHERE s.user_id=? AND t.guild_id=?',user,config.guildId);
 return {publicTables:publics,activeTable:own?.table_id||null,balance:wallet(user)};
}
export function pokerCreate(userId,fields){
 const user=userOf(userId),mode=String(fields.mode||'');
 if(!['solo','private','public'].includes(mode))fail('Choose a Poker mode.');
 const bots=mode==='solo'?intOf(fields.bots??'3',1,5,'bot count'):0;
 const seatLimit=mode==='solo'?bots+1:intOf(fields.seats??'6',2,6,'seats');
 const small=mode==='private'?intOf(fields.small_blind??'50',10,1000,'small blind'):50;
 const big=mode==='private'?intOf(fields.big_blind??'100',20,2000,'big blind'):100;
 if(big<=small||big>small*4)fail('Big blind must exceed the small blind and be at most four times it.');
 if(mode!=='solo'&&seatLimit<2)fail('At least two seats required.');
 return transaction(()=>{
  const existing=one('SELECT table_id FROM poker_seats WHERE user_id=?',user);
  if(existing)fail('Leave your current table before starting another.',409);
  if(mode==='public'){
   const count=one("SELECT COUNT(*) AS c FROM poker_tables WHERE guild_id=? AND mode='public'",config.guildId).c;
   if(count>=12)fail('Public tables are full. Join an existing table.',409);
  }
  const id=randomUUID();
  const code=mode==='private'?Array.from({length:8},()=>('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)])).join(''):'';
  const stamp=clock();
  run('INSERT INTO poker_tables(id,guild_id,mode,owner_id,invite_code,seat_limit,small_blind,big_blind,bots,state_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
   id,config.guildId,mode,user,code,seatLimit,small,big,bots,JSON.stringify({hand:null,handsPlayed:0,lastDealerSeat:-1}),stamp,stamp);
  run('INSERT INTO poker_seats(user_id,table_id,seat_no,last_seen_at,joined_at) VALUES(?,?,?,?,?)',user,id,0,stamp,stamp);
  return {tableId:id,code};
 });
}
export function pokerJoin(userId,tableId,code=''){
 const user=userOf(userId);
 return transaction(()=>{
  const t=load(tableId);
  if(t.mode==='solo')fail('Solo tables cannot be joined.',403);
  canView(t,user,code);
  if(seated(t,user))return tableInfo(t);
  if(one('SELECT table_id FROM poker_seats WHERE user_id=?',user))fail('Leave your other Poker table first.',409);
  const used=new Set(seats(t).map(p=>p.seat));
  const free=[...Array(t.seat_limit).keys()].find(n=>!used.has(n));
  if(free===undefined)fail('Poker table is full.',409);
  const stamp=clock();
  run('INSERT INTO poker_seats(user_id,table_id,seat_no,last_seen_at,joined_at) VALUES(?,?,?,?,?)',user,t.id,free,stamp,stamp);
  return tableInfo(t);
 });
}
export function pokerLeave(userId,tableId){
 const user=userOf(userId);
 return transaction(()=>{
  const t=load(tableId);
  if(!seated(t,user))fail('Not seated at this table.',403);
  const h=t.state.hand;
  if(h&&h.phase!=='results'&&h.players.some(p=>p.id===user&&!p.folded)){
   run('UPDATE poker_seats SET sitting_out=1,last_seen_at=0 WHERE user_id=? AND table_id=?',user,t.id);
   // Leaving does not refund committed wagers. They settle normally at hand end.
   const participant=h.players.find(p=>p.id===user);
   if(participant&&h.players[h.turn]?.id===user)takeAction(t,participant,'fold');
   save(t);
  }else run('DELETE FROM poker_seats WHERE user_id=? AND table_id=?',user,t.id);
  return {left:true};
 });
}
export function pokerSitOut(userId,tableId,sit){
 const user=userOf(userId);
 return transaction(()=>{
  const t=load(tableId);
  if(!seated(t,user))fail('You are not seated.',403);
  run('UPDATE poker_seats SET sitting_out=? WHERE table_id=? AND user_id=?',sit?1:0,t.id,user);
  return {sittingOut:!!sit};
 });
}
export function pokerAction(userId,tableId,fields){
 const user=userOf(userId);
 const action=String(fields.action||'');
 const key=idOf(String(fields.request_id||''));
 const signature=JSON.stringify([fields.hand_id,fields.seq,action,fields.raise_to||'']);
 transaction(()=>{
  const existing=one('SELECT * FROM poker_actions WHERE request_key=?',key);
  const t=load(tableId);canView(t,user);
  if(existing){
   if(existing.user_id!==user||existing.table_id!==t.id||existing.signature!==signature)fail('Poker request already used.',409);
   return;
  }
  const h=t.state.hand;
  if(!h||h.phase==='results'||h.id!==fields.hand_id||String(h.seq)!==String(fields.seq))fail('The hand changed. Refresh the table.',409);
  const p=h.players[h.turn];
  if(!p||p.id!==user||!seated(t,user))fail('Not your turn.',409);
  const to=action==='raise'?intOf(fields.raise_to,1,POKER_MAX_HAND_STAKE,'raise'):0;
  takeAction(t,p,action,to);
  save(t);
  run('INSERT INTO poker_actions(request_key,user_id,table_id,signature,created_at) VALUES(?,?,?,?,?)',key,user,t.id,signature,clock());
  return;
 });
 return pokerState(user,tableId);
}
export function pokerChat(userId,tableId,message){
 const user=userOf(userId),body=String(message||'').trim();
 if(!body||body.length>250)fail('Chat message must be 1-250 characters.');
 return transaction(()=>{
  const t=load(tableId);
  if(!seated(t,user))fail('Only seated players can chat.',403);
  const last=one('SELECT created_at FROM poker_chat WHERE table_id=? AND user_id=? ORDER BY id DESC LIMIT 1',t.id,user);
  if(last&&clock()-last.created_at<1750)fail('Slow down your Poker messages.',429);
  run('INSERT INTO poker_chat(table_id,user_id,message,created_at) VALUES(?,?,?,?)',t.id,user,body,clock());
  return {sent:true};
 });
}
export function pokerState(userId,tableId,code=''){
 const user=userOf(userId);
 return transaction(()=>{
  const t=load(tableId);canView(t,user,code);
  if(seated(t,user))run('UPDATE poker_seats SET last_seen_at=? WHERE user_id=? AND table_id=?',clock(),user,t.id);
  advance(t);
  const h=t.state.hand;
  const members=seats(t);
  const inHand=h?.players.some(p=>p.id===user);
  const show=h?.phase==='results';
  const me=h?.players.find(p=>p.id===user);
  const players=(h?.players||[]).map(p=>({
   id:p.id,name:p.name,seat:p.seat,bot:p.bot,folded:p.folded,allIn:p.allIn,
   wager:p.contributed,street:p.street,acted:p.acted,
   points:p.bot?null:wallet(p.id),avatarUrl:p.bot?null:(()=>{const hash=one('SELECT avatar FROM users WHERE id=?',p.id)?.avatar||'';return /^[a-zA-Z0-9_]+$/.test(hash)?'https://cdn.discordapp.com/avatars/'+p.id+'/'+hash+'.png?size=64':null;})(),cards:p.id===user||show&&!p.folded?p.cards:[],
   cardCount:p.cards.length,turn:h.turn>=0&&h.players[h.turn].id===p.id
  }));
  const histories=all('SELECT id,user_id,message,created_at FROM poker_chat WHERE table_id=? ORDER BY id DESC LIMIT 18',t.id)
   .reverse().map(x=>({id:x.id,userId:x.user_id,name:nameFor(x.user_id),message:x.message,at:x.created_at}));
  const recent=all("SELECT id,wager,payout,created_at,details_json FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game IN ('poker_solo','poker_live','poker_private') ORDER BY id DESC LIMIT 10",config.guildId,user)
   .map(r=>({id:r.id,wager:r.wager,payout:r.payout,profit:r.payout-r.wager,at:r.created_at}));
  const minRaise=h?h.currentBet+Math.max(t.big_blind,h.minRaise):t.big_blind;
  const mine=me&&h?.turn>=0&&h.players[h.turn].id===user&&h.phase!=='results';
  const sessionSeat=members.find(p=>p.id===user);
  const sessionProfit=sessionSeat?one("SELECT COALESCE(SUM(payout-wager),0) AS profit FROM arcade_rounds WHERE guild_id=? AND user_id=? AND game IN ('poker_solo','poker_live','poker_private') AND created_at>=?",config.guildId,user,sessionSeat.joined_at)?.profit||0:0;
  return {...tableInfo(t),owner:t.owner_id===user,sessionProfit,
   inviteCode:t.owner_id===user?t.invite_code:undefined,joined:seated(t,user),
   mySeat:members.find(p=>p.id===user)?.seat??null,watching:members.length,
   members:members.map(p=>({...p,points:wallet(p.id)})),
   balance:wallet(user),hand:h?{id:h.id,phase:h.phase,board:h.board,pot:h.pot,players,
    turnEndsAt:h.turnEndsAt,seq:h.seq,currentBet:h.currentBet,minRaise,
    dealerSeat:h.players[h.dealer]?.seat,history:h.history.slice(-18),
    awards:show?h.winners:undefined,payouts:show?h.payouts:undefined,
    myCards:me?.cards||[],toCall:mine?Math.max(0,h.currentBet-me.street):0,
    maxRaiseTo:mine?me.street+available(me):0,canRaise:!!(mine&&me.raiseRights),
    myTurn:!!mine}:null,
   recent,histories,serverTime:clock(),self:user};
 });
}
export function pokerList(userId){return pokerLobby(userId);}
