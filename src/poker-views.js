// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// SB Poker lobby and shared No-Limit table: one UI for Solo, Live and Private.
import {shell,esc,token} from './views.js';
const n=v=>Number(v||0).toLocaleString('en-GB');
const urlFor=id=>'/arcade/poker/table/'+encodeURIComponent(id);
const select=(name,values,selected)=>'<select name="'+name+'">'+values.map(v=>'<option value="'+v+'"'+(v===selected?' selected':'')+'>'+v+'</option>').join('')+'</select>';
export function pokerLobbyPage(ctx,data){
 const active=data.activeTable?'<a class="btn btn-primary" href="'+urlFor(data.activeTable)+'">♠ Reconnect to your Poker table →</a>':'';
 const tables=data.publicTables.map(t=>'<article class="poker-room-card"><div><strong>Public Table #'+esc(t.id.slice(0,8).toUpperCase())+
  '</strong><span>'+t.seated+'/'+t.seats+' seated · '+n(t.smallBlind)+' / '+n(t.bigBlind)+' blinds</span></div>'+
  '<a class="btn btn-outline" href="'+urlFor(t.id)+'">Open Table →</a></article>').join('')||
  '<p class="muted">No public tables yet. Start the first one below.</p>';
 return shell(ctx,'Poker','<div class="poker-root poker-lobby" data-poker-root>'+
  '<div class="poker-hero"><span class="poker-eyebrow">SB ARCADE · POINTS ARE YOUR CHIPS</span><h1>♠ Poker</h1>'+
  '<p>No-Limit Texas Hold\'em. Solo against medium bots, Live against players or invite friends to a Private table. No buy-ins or separate chip wallets.</p>'+
  '<div class="poker-hero-meta"><span>50 / 100 default blinds</span><span>10–10,000 pts per hand</span><span>30 seconds per turn</span></div>'+
  '<strong>Your points: '+n(data.balance)+'</strong>'+active+'</div>'+
  '<div class="poker-mode-cards">'+
  '<section class="poker-setup"><div class="poker-mode-icon">♠</div><h2>Solo Poker</h2><p>Play instantly against 1–5 medium bots.</p>'+
  '<form method="post" action="/arcade/poker/create">'+token(ctx)+'<input type="hidden" name="mode" value="solo">'+
  '<label>Bots '+select('bots',[1,2,3,4,5],3)+'</label><button class="btn btn-primary">Play Solo →</button></form></section>'+
  '<section class="poker-setup"><div class="poker-mode-icon">♣</div><h2>Live Poker</h2><p>Open a six-player public table or join members below.</p>'+
  '<form method="post" action="/arcade/poker/create">'+token(ctx)+'<input type="hidden" name="mode" value="public">'+
  '<button class="btn btn-primary">Create Live Table →</button></form></section>'+
  '<section class="poker-setup"><div class="poker-mode-icon">♦</div><h2>Private Poker</h2><p>Invite friends with a private code. Host controls blinds and seats.</p>'+
  '<form method="post" action="/arcade/poker/create">'+token(ctx)+'<input type="hidden" name="mode" value="private">'+
  '<label>Seats '+select('seats',[2,3,4,5,6],6)+'</label>'+
  '<label>Small blind <input name="small_blind" type="number" min="10" max="1000" value="50" required></label>'+
  '<label>Big blind <input name="big_blind" type="number" min="20" max="2000" value="100" required></label>'+
  '<button class="btn btn-primary">Create Private Table →</button></form></section>'+
  '</div><section class="poker-public-rooms"><h2>Live tables</h2>'+tables+'</section>'+
  '<div class="poker-back"><a href="/arcade">← Solo Arcade</a><a href="/arcade/online">Online Games →</a></div></div>');
}
export function pokerTablePage(ctx,state,code=''){
 const id=esc(state.id),p=state.mode==='solo'?'Solo Poker':state.mode==='private'?'Private Poker':'Live Poker';
 const joined=!!state.joined;
 const privateLink=state.mode==='private'&&state.owner?
  '<div class="poker-invite"><strong>Private invite</strong><code>'+esc(state.inviteCode)+'</code>'+
  '<button type="button" class="btn btn-outline" data-poker-copy>Copy Invite Link</button></div>':'';
 const joining=(!joined&&state.mode!=='solo')?
  '<form class="poker-join" method="post" action="/arcade/poker/table/'+id+'/join">'+token(ctx)+
  (code&&state.mode!=='private'?'<input type="hidden" name="code" value="'+esc(code)+'">':'')+
  (state.mode==='private'?'<label>Invite code <input name="code" value="'+esc(code)+'" maxlength="8" required></label>':'')+
  '<button class="btn btn-primary" type="submit">Join this table →</button></form>':'';
 const sit=joined?'<form class="poker-sitout" action="/arcade/poker/table/'+id+'/sitout" method="post">'+token(ctx)+
  '<button class="btn btn-outline" type="submit" name="sitting_out" value="1">Sit Out Next Hand</button>'+
  '<button class="btn btn-outline" type="submit" name="sitting_out" value="0">Play Next Hand</button></form>':'';
 const leaving=joined?'<form action="/arcade/poker/table/'+id+'/leave" method="post">'+token(ctx)+
  '<button class="btn btn-outline" type="submit">Leave Table</button></form>':'';
 const stateString=esc(JSON.stringify(state));
 return shell(ctx,p,'<div class="poker-root poker-table-page" data-poker-root data-poker-table="'+id+
  '" data-poker-state="'+stateString+'" data-poker-code="'+esc(code)+'">'+
  '<div class="poker-topline"><div><a href="/arcade/poker">← Poker Lobby</a><h1>♠ '+p+
  '</h1><p>No-Limit Texas Hold\'em · '+n(state.smallBlind)+' / '+n(state.bigBlind)+
  ' blinds · '+state.seats+' seats</p></div><div class="poker-table-wallet"><small>YOUR POINTS</small><strong data-poker-wallet>'+n(state.balance)+'</strong></div></div>'+
  privateLink+'<div class="poker-layout"><section class="poker-main"><div class="poker-board">'+
  '<div class="poker-felt"><div class="poker-felt-brand">SB</div><div class="poker-player-seats" data-poker-seats></div>'+
  '<div class="poker-center"><span class="poker-pot-title">TOTAL POT</span><strong data-poker-pot>0 pts</strong>'+
  '<div class="poker-community" data-poker-board></div><small data-poker-phase>WAITING FOR PLAYERS</small></div>'+
  '</div></div><div class="poker-player-own" data-poker-my-cards></div>'+
  '<div class="poker-action-panel" data-poker-actions><div class="poker-action-status" data-poker-status>Loading table…</div>'+
  '<div class="poker-action-buttons" data-poker-buttons></div>'+
  '<div class="poker-raise-control" data-poker-raise></div></div>'+
  '<div class="poker-action-feedback" data-poker-feedback role="status" aria-live="polite"></div>'+
  '<div class="poker-table-options"><label>🔊 Sound <input type="checkbox" data-poker-sound checked></label>'+
  '<label>✨ Animations <input type="checkbox" data-poker-motion checked></label>'+sit+leaving+'</div>'+
  joining+'</section><aside class="poker-sidebar"><section class="poker-sidepanel"><h3>Table details</h3>'+
  '<div class="poker-side-stats"><span>Players</span><strong data-poker-seated>'+state.seated+'/'+state.seats+'</strong>'+
  '<span>Hand</span><strong data-poker-hand-count>'+n(state.handsPlayed)+'</strong>'+
  '<span>Session profit</span><strong data-poker-profit>0 pts</strong>'+
  '<span>Mode</span><strong>'+p+'</strong></div></section>'+
  '<section class="poker-sidepanel"><h3>Hand history</h3><div class="poker-hand-log" data-poker-log></div></section>'+
  '<section class="poker-sidepanel"><h3>Table chat</h3><div class="poker-chat-log" data-poker-chat></div>'+
  (joined?'<form data-poker-chat-form><input aria-label="Chat message" name="message" maxlength="250" placeholder="Message players…">'+
  '<button class="btn btn-outline">Send</button></form>':'<p class="muted">Join to send messages.</p>')+
  '</section></aside></div></div>');
}
