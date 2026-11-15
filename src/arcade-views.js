// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomUUID} from 'node:crypto';
import {shell,esc,token,titlebar} from './views.js';

const number=n=>Number(n||0).toLocaleString('en-GB');
const date=n=>new Date(n).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
const href=(path)=>'/arcade/'+path;
const states={won:'Win',lost:'Loss',push:'Returned',cashed_out:'Collected',active:'Playing'};
const gameNames={coinflip:'Coin Flip',coinflip_pvp:'Player Coin Flip',slots:'Slots',mines:'Mines',crash:'Crash'};
const symbolIcons={Cherry:'🍒',Lemon:'🍋',Bell:'🔔',Diamond:'💎',Seven:'7️⃣'};
const wagerField=(value=50)=>`<label class="arc-label">Wager in points<input inputmode="numeric" type="number" min="10" max="1000" step="1" name="wager" value="${value}" required></label>`;
const request=()=>`<input type="hidden" name="request_id" value="${randomUUID()}">`;
const chrome=(ctx,page,summary,content)=>shell(ctx,'Arcade',`
<div class="arcade-root">
 <div class="arcade-header">
  <div><div class="arcade-eyebrow">SB'S & CAM'S STORE · LEVEL POINTS</div><h1>${esc(page)}</h1>
   <p>Play with points earned from Discord levels. No real money or redeemable prizes.</p></div>
  <a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong>${number(summary.balance)} <span>✦</span></strong><small>Claim more from levels →</small></a>
 </div>
 <nav class="arcade-tabs" aria-label="Arcade games">
  <a href="/arcade">All Games</a><a href="/arcade/coinflip">Coin Flip</a><a href="/arcade/slots">Slots</a><a href="/arcade/mines">Mines</a><a href="/arcade/crash">Crash</a><a href="/arcade/history">History</a>
 </nav>
 ${content}
 <p class="arcade-disclaimer">Virtual entertainment points only. House games favour the house. Points cannot be purchased, withdrawn, or exchanged for items or prizes of monetary value. Results and wallet changes are decided by the server.</p>
</div>`);
const gameTile=(url,icon,name,description,className)=>`<a class="arcade-game-card ${className}" href="${url}"><span class="arcade-game-art">${icon}</span><span class="arcade-game-info"><strong>${name}</strong><small>${description}</small></span><span class="arcade-game-arrow">Play →</span></a>`;
const resultBox=round=>{
 if(!round)return '';
 const {status,wager,payout,game,details}=round;
 const label=states[status]||status;
 let extra='';
 if(game==='coinflip')extra=`You chose ${esc(details.selected)} · Coin landed ${esc(details.landed)}.`;
 if(game==='coinflip_pvp')extra=`Coin landed ${esc(details.landed)}.`;
 if(game==='slots')extra=details.reels.map(s=>symbolIcons[s]||esc(s)).join(' ');
 if(game==='mines')extra=details.exploded!==undefined?'You uncovered a mine.':'You safely collected your points.';
 return `<section class="arcade-result panel padded" role="status"><div><small>LAST RESULT</small><h2>${esc(label)}</h2><p>${extra}</p></div>
 <div class="arcade-result-value ${payout>=wager?'positive':'negative'}"><strong>${payout>=wager?'+':''}${number(payout-wager)} pts</strong><small>${number(payout)} returned from ${number(wager)} wagered</small></div></section>`;
};
const historyList=rounds=>`<section class="panel padded arcade-history-panel"><div class="arcade-section-title"><h2>Recent games</h2><a href="/arcade/history">View history →</a></div>
 <div class="table-wrap"><table><thead><tr><th>Game</th><th>Wager</th><th>Returned</th><th>Result</th><th>Played</th></tr></thead><tbody>${rounds.map(r=>`<tr><td>${esc(gameNames[r.game]||r.game)}</td><td>${number(r.wager)}</td><td>${number(r.payout)}</td><td>${esc(states[r.status]||r.status)}</td><td>${date(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="5">No games played yet.</td></tr>'}</tbody></table></div></section>`;

export function arcadeHome(ctx,summary,rounds){
 return chrome(ctx,'SB Arcade',summary,`
 <section class="arcade-metrics"><div class="arcade-points-stat"><small>AVAILABLE POINTS</small><strong>${number(summary.balance)}</strong><a class="arcade-get-more" href="/points" aria-label="Get more points from Discord levels">Get more from levels <span aria-hidden="true">→</span></a></div>
 <div><small>GAMES COMPLETED</small><strong>${number(summary.played)}</strong></div>
 <div><small>GAMES WON</small><strong>${number(summary.wins)}</strong></div>
 <div><small>BIGGEST PROFIT</small><strong>${number(summary.biggest_win)}</strong></div></section>
 <div class="arcade-section-title"><h2>Choose a game</h2><span>Four games · one wallet</span></div>
 <section class="arcade-grid">
 ${gameTile('/arcade/coinflip','🪙','Coin Flip','Play the house or challenge another member','arcade-coins')}
 ${gameTile('/arcade/slots','🎰','Slots','Spin the reels to find matching symbols','arcade-slots')}
 ${gameTile('/arcade/mines','💎','Mines','Uncover gems and decide when to collect','arcade-mines')}
 ${gameTile('/arcade/crash','🚀','Crash','Watch the multiplier rise and collect in time','arcade-crash')}
 </section>
 <section class="panel padded arcade-info"><h2>How points work</h2><p>Earn points through Discord levels, claim them in <a href="/points">Level Points</a>, and use the same balance in any arcade game. Every game outcome and wallet transfer is saved.</p></section>
 ${historyList(rounds)}`);
}
export function coinflipPage(ctx,summary,{round,rounds,challenges}){
 const newest=round||rounds[0];
 return chrome(ctx,'Coin Flip',summary,`
 <div class="arcade-two-columns"><section class="panel padded arcade-game-panel">
  <div class="arcade-section-title"><h2>🪙 Play the house</h2><span>Instant flip</span></div>
  <div class="arcade-coin-stage" data-coin-stage data-coin-result="${esc(newest?.game==='coinflip'?newest.details?.landed||'':'')}"><div class="arcade-coin-disc"><span>SB</span></div></div>
  <p>Pick a side and flip. The winner receives double their wager. The house has an advantage.</p>
  <form action="/arcade/coinflip/house" method="post" class="arcade-form">${token(ctx)}${request()}
  ${wagerField()}<fieldset class="arcade-face-choice"><legend>Your choice</legend><label><input type="radio" name="face" value="heads" checked> Heads</label><label><input type="radio" name="face" value="tails"> Tails</label></fieldset>
  <button class="btn btn-primary" type="submit">Flip vs House</button></form>
 </section>
 <section class="panel padded arcade-game-panel"><div class="arcade-section-title"><h2>⚔️ Challenge a member</h2><span>Member vs member</span></div>
  <p>Choose Heads or Tails, set a wager, and create a challenge. Another member matches your wager. The winner takes both wagers with no fee.</p>
  <form class="arcade-form" action="/arcade/coinflip/challenges" method="post">${token(ctx)}${request()}${wagerField()}
  <fieldset class="arcade-face-choice"><legend>Your choice</legend><label><input type="radio" name="face" value="heads" checked> Heads</label><label><input type="radio" name="face" value="tails"> Tails</label></fieldset>
  <label class="arc-label">Private opponent Discord ID (optional)<input type="text" name="target_id" pattern="[0-9]{15,22}" placeholder="Leave blank for a public challenge"></label>
  <button type="submit" class="btn btn-primary">Create Challenge</button></form>
 </section></div>
 ${resultBox(newest&&['coinflip','coinflip_pvp'].includes(newest.game)?newest:null)}
 <section class="panel padded"><div class="arcade-section-title"><h2>Open coin flips</h2><span>Challenges expire after 24 hours</span></div>
 <div class="arcade-challenges">${challenges.map(c=>`<article class="arcade-challenge"><div><strong>${esc(c.creator_name)}</strong>
 <span class="muted tiny">${c.target_id?'Private challenge':'Public challenge'} · ${esc(c.face)}</span></div>
 <b>${number(c.wager)} pts each</b>
 ${c.creator_id===ctx.user.id?`<form method="post" action="/arcade/coinflip/challenges/${c.id}/cancel">${token(ctx)}<button class="btn btn-outline" type="submit">Cancel</button></form>`:
 `<form method="post" action="/arcade/coinflip/challenges/${c.id}/join">${token(ctx)}<button class="btn btn-primary" type="submit">Join</button></form>`}</article>`).join('')||'<p class="muted">No open challenges. Create one to start the lobby.</p>'}</div>
 <p class="muted tiny">Your points are reserved while a challenge is open, and returned if you cancel before it is accepted or it expires.</p></section>
 ${historyList(rounds)}`);
}
export function slotsPage(ctx,summary,{round,rounds}){
 const newest=round||rounds[0], reels=newest?.details?.reels||['Seven','Seven','Seven'];
 return chrome(ctx,'Slots',summary,`<section class="panel padded arcade-feature-game">
 <div class="arcade-section-title"><h2>🎰 SB Slots</h2><span>Three reels</span></div>
 <div class="arcade-slot-reels" data-slot-reels>${reels.map(s=>`<div class="arcade-reel" aria-label="${esc(s)}">${symbolIcons[s]||esc(s)}</div>`).join('')}</div>
 <p>Match symbols across three reels to earn points. Results are settled instantly by the website.</p>
 <form action="/arcade/slots/spin" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}${wagerField()}
 <button type="submit" class="btn btn-primary">Spin Reels</button></form></section>
 ${resultBox(newest)}${historyList(rounds)}`);
}
export function minesPage(ctx,summary,{round,rounds}){
 const active=round?.status==='active'?round:null;
 const current=round||rounds[0];
 const shown=new Set(current?.details?.revealed||[]);
 const terminal=current&&current.status!=='active';
 const bombs=terminal?new Set(current.details.bombs):new Set();
 return chrome(ctx,'Mines',summary,`<section class="panel padded arcade-feature-game">
 <div class="arcade-section-title"><h2>💎 Mines</h2><span>Find gems · avoid mines</span></div>
 ${current?`<div class="arcade-mine-summary"><div>Wager <strong>${number(current.wager)}</strong></div><div>Bombs <strong>${number(current.details.bombCount)}</strong></div>
 <div>Safe picks <strong>${number(current.details.revealed.length)}</strong></div></div>
 <div class="arcade-mine-grid" role="group" aria-label="Mine tiles">${Array.from({length:25},(_,i)=>{
  const opened=shown.has(i),bomb=bombs.has(i),symbol=opened?'💎':terminal?(bomb?'💣':'·'):'?';
  return active&&!opened?`<form action="/arcade/mines/${active.id}/reveal" method="post">${token(ctx)}<input type="hidden" name="tile" value="${i}"><button class="arcade-mine-tile" type="submit" aria-label="Reveal tile ${i+1}">${symbol}</button></form>`:
  `<div class="arcade-mine-tile ${opened?'revealed':''} ${bomb?'exploded':''}" aria-label="Tile ${i+1}">${symbol}</div>`;
 }).join('')}</div>
 ${active?`<form class="arcade-mine-collect" action="/arcade/mines/${active.id}/collect" method="post">${token(ctx)}<button type="submit" class="btn btn-primary" ${!active.details.revealed.length?'disabled':''}>Collect Points</button></form>`:''}
 ${terminal?'<a class="btn btn-outline" href="/arcade/mines">Start another game</a>':''}
 `:'<div class="arcade-empty-grid"><span>💎</span><p>Start a game to reveal the grid.</p></div>'}
 <form action="/arcade/mines/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField()}<label class="arc-label">Hidden mines<select name="bombs"><option value="1">1 mine</option><option value="2">2 mines</option><option value="3" selected>3 mines</option><option value="4">4 mines</option><option value="5">5 mines</option></select></label>
 <button type="submit" class="btn btn-primary" ${active?'disabled':''}>Start Mines</button></form>
 <p class="muted tiny">Only one Mines game can be active at a time. Your board is saved if you leave the page.</p></section>
 ${current&&terminal?resultBox(current):''}${historyList(rounds)}`);
}
export function crashPage(ctx,summary,status,rounds){
 const round=status.round;
 return chrome(ctx,'Crash',summary,`<section class="panel padded arcade-feature-game arcade-crash-page" data-crash-game data-crash-active="${round?.status==='active'?'1':'0'}">
 <div class="arcade-section-title"><h2>🚀 Crash</h2><span>Collect before the crash</span></div>
 <div class="arcade-crash-display"><div class="arcade-crash-line"></div><div class="arcade-crash-number" data-crash-multiplier>1.00×</div><small data-crash-message>${round?.status==='active'?'Round starting…':round?.status==='lost'?'Crashed!':round?.status==='cashed_out'?'Points collected!':'Start a new round'}</small></div>
 ${round?.status==='active'?`<div class="arcade-round-panel"><p>Your wager: <strong>${number(round.wager)} points</strong>${round.autoAt?' · Auto-collect: '+(round.autoAt/100).toFixed(2)+'×':''}</p>
 <form method="post" action="/arcade/crash/${round.id}/collect">${token(ctx)}<button type="submit" class="btn btn-primary" data-crash-collect>Collect Points</button></form></div>`:''}
 ${round?.status!=='active'?`<form action="/arcade/crash/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField()}<label class="arc-label">Auto-collect multiplier (optional)<input type="number" name="auto_at" min="1.10" max="20" step="0.01" placeholder="e.g. 2.00"></label>
 <button type="submit" class="btn btn-primary">Start Crash</button></form>`:''}
 <p class="muted tiny">The server chooses the crash point before each round. Auto-collect is processed by the server even if you close this page.</p>
 </section>
 ${round&&round.status!=='active'?`<section class="panel padded arcade-result" role="status"><div><small>LAST RESULT</small><h2>${round.status==='lost'?'Crashed':'Collected'}</h2><p>Round #${round.id}</p></div>
 <div class="arcade-result-value ${round.payout>=round.wager?'positive':'negative'}"><strong>${round.payout>=round.wager?'+':''}${number(round.payout-round.wager)} pts</strong><small>${number(round.payout)} returned</small></div></section>`:''}
 ${historyList(rounds)}`);
}
export function arcadeHistoryPage(ctx,summary,rounds,transfers){
 return chrome(ctx,'Your Arcade History',summary,`<section class="panel padded"><h2>Game history</h2>
 ${historyList(rounds)}</section><section class="panel padded"><h2>Points transactions</h2><div class="table-wrap"><table><thead><tr><th>Action</th><th>Change</th><th>Balance after</th><th>Date</th></tr></thead><tbody>
 ${transfers.map(t=>`<tr><td>${esc(t.reason.split('.').join(' '))}</td><td class="${t.delta>0?'arcade-positive':'arcade-negative'}">${t.delta>0?'+':''}${number(t.delta)}</td><td>${number(t.balance_after)}</td><td>${date(t.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No arcade point transactions yet.</td></tr>'}
 </tbody></table></div></section>`);
}
