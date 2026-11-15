// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomUUID} from 'node:crypto';
import {shell,esc,token,titlebar} from './views.js';

const number=n=>Number(n||0).toLocaleString('en-GB');
const date=n=>new Date(n).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
const href=(path)=>'/arcade/'+path;
const states={won:'Win',lost:'Loss',push:'Returned',cashed_out:'Collected',active:'Playing'};
const gameNames={coinflip:'Coin Flip',coinflip_pvp:'Player Coin Flip',slots:'Slots',mines:'Mines',crash:'Crash'};
const symbolIcons={Cherry:'🍒',Lemon:'🍋',Bell:'🔔',Diamond:'💎',Seven:'7️⃣'};
const coinName=face=>face==='heads'?'SB (Heads)':'CAM (Tails)';
const coinArt=(selected='heads')=>`<div class="arcade-coin-disc" data-coin-disc data-landed="${selected}">
  <span class="arcade-coin-face arcade-coin-sb">SB</span>
  <span class="arcade-coin-face arcade-coin-cam">CAM</span>
 </div>`;
const faceChoices=`<fieldset class="arcade-face-choice arcade-branded-choices"><legend>Your choice</legend>
 <label class="arcade-face-sb"><input type="radio" name="face" value="heads" checked><span class="arcade-choice-coin">SB</span><strong>SB</strong><small>Heads</small></label>
 <label class="arcade-face-cam"><input type="radio" name="face" value="tails"><span class="arcade-choice-coin">CAM</span><strong>CAM</strong><small>Tails</small></label></fieldset>`;
const wagerField=(value=50)=>`<label class="arc-label">Wager in points<input inputmode="numeric" type="number" min="10" max="1000" step="1" name="wager" value="${value}" required></label>`;
const request=()=>`<input type="hidden" name="request_id" value="${randomUUID()}">`;
const chrome=(ctx,page,summary,content)=>{
 const markup=`
<div class="arcade-root">
 <div class="arcade-header">
  <div><div class="arcade-eyebrow">SB'S & CAM'S STORE · LEVEL POINTS</div><h1>${esc(page)}</h1>
   <p>Play with points earned from Discord levels. No real money.</p></div>
  <a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong>${number(summary.balance)} <span>✦</span></strong><small>Claim more from levels →</small></a>
 </div>
 <nav class="arcade-tabs" aria-label="Arcade games">
  <a href="/arcade">All Games</a><a href="/arcade/coinflip">Coin Flip</a><a href="/arcade/slots">Slots</a><a href="/arcade/mines">Mines</a><a href="/arcade/crash">Crash</a><a href="/arcade/history">History</a>
 </nav>
 ${content}
 <p class="arcade-disclaimer">Virtual entertainment points only. House games favour the house. Points cannot be purchased, withdrawn, or exchanged for items or prizes of monetary value. Results and wallet changes are decided by the server.</p>
</div>`;
 return ctx.arcadeFragment ? markup : shell(ctx,'Arcade',markup);
};
const gameTile=(url,icon,name,description,className)=>`<a class="arcade-game-card ${className}" href="${url}"><span class="arcade-game-art">${icon}</span><span class="arcade-game-info"><strong>${name}</strong><small>${description}</small></span><span class="arcade-game-arrow">Play →</span></a>`;
const resultBox=round=>{
 if(!round)return '';
 const {status,wager,payout,game,details}=round;
 const label=states[status]||status;
 let extra='';
 if(game==='coinflip')extra=`You chose ${coinName(details.selected)} · Coin landed on ${coinName(details.landed)}.`;
 if(game==='coinflip_pvp')extra=`Coin landed on ${coinName(details.landed)}.`;
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
export function coinflipPage(ctx,summary,{round,rounds}){
 const newest=round||rounds.find(r=>r.game==='coinflip');
 const landed=newest?.game==='coinflip'?newest.details?.landed||'':'';
 return chrome(ctx,'Coin Flip',summary,`
 <section class="panel padded arcade-game-panel arcade-house-only">
  <div class="arcade-section-title"><h2>🪙 SB vs CAM — Play the House</h2><span>Instant flip</span></div>
  <div class="arcade-coin-stage" data-coin-stage data-coin-result="${esc(landed)}">${coinArt(landed||'heads')}</div>
  <p>Choose SB (Heads) or CAM (Tails). Winning flips return twice the wager. The house has an advantage.</p>
  <form action="/arcade/coinflip/house" method="post" class="arcade-form">${token(ctx)}${request()}
   ${wagerField()}${faceChoices}<button class="btn btn-primary" type="submit">Flip vs House</button>
  </form>
  <p class="muted tiny arcade-profile-invite">Want to challenge another member? Visit their <a href="/members">profile</a> and select <b>Challenge to Coin Flip</b>.</p>
 </section>
 ${resultBox(newest?.game==='coinflip'?newest:null)}
 ${historyList(rounds)}`);
}
export function slotsPage(ctx,summary,{round,rounds}){
 const newest=round||rounds[0], reels=newest?.details?.reels||['Seven','Seven','Seven'];
 return chrome(ctx,'Slots',summary,`<section class="panel padded arcade-feature-game">
 <div class="arcade-section-title"><h2>🎰 SB Slots</h2><span>Three reels</span></div>
 <div class="arcade-slot-reels" data-slot-reels>${reels.map((s,i)=>`<div class="arcade-reel" data-reel-index="${i}" data-symbol="${esc(s)}" aria-label="${esc(s)}"><div class="arcade-reel-window"><div class="arcade-reel-face">${symbolIcons[s]||esc(s)}</div></div></div>`).join('')}</div>
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
 ${!active?`<form action="/arcade/mines/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField()}<label class="arc-label">Hidden mines<select name="bombs"><option value="1">1 mine</option><option value="2">2 mines</option><option value="3" selected>3 mines</option><option value="4">4 mines</option><option value="5">5 mines</option></select></label>
 <button type="submit" class="btn btn-primary">Start Mines</button></form>`:''}
 <p class="muted tiny">Only one Mines game can be active at a time. Your board is saved if you leave the page.</p></section>
 ${current&&terminal?resultBox(current):''}${historyList(rounds)}`);
}
export function crashPage(ctx,summary,status,rounds){
 const round=status.round;
 const active=round?.status==='active';
 const terminal=!!round&&!active;
 const replay=ctx.arcadePlayAgain===true;
 const displayFinished=terminal&&!replay;
 const showForm=!active&&(!terminal||replay);
 const cashAt=round?.cashAt||100,crashAt=round?.crashAt||100;
 const cashout=round?.status==='cashed_out';
 const finishedAt=(cashout?cashAt:crashAt)/100;
 const profit=(round?.payout||0)-(round?.wager||0);
 return chrome(ctx,'Crash',summary,`<section class="panel padded arcade-feature-game arcade-crash-page" data-crash-game data-crash-active="${active?'1':'0'}" data-crash-replay="${replay?'1':'0'}" data-crash-final="${displayFinished?finishedAt.toFixed(2):''}" data-crash-outcome="${displayFinished?round.status:''}">
 <div class="arcade-section-title"><h2>🚀 SB Crash</h2><span>Collect before the rocket crashes</span></div>
 <div class="arcade-crash-display ${displayFinished?(cashout?'collected':'crashed'):''}">
   <div class="arcade-crash-stars" aria-hidden="true"></div>
   <svg viewBox="0 0 700 260" class="arcade-crash-chart" aria-hidden="true" preserveAspectRatio="none">
    <defs><linearGradient id="arcadeRocketLine" x1="0" x2="1"><stop offset="0%" stop-color="#126d82"/><stop offset="100%" stop-color="#4bf4b2"/></linearGradient></defs>
    <path data-crash-chart-line d="M 28 232 L 28 232" fill="none" stroke="url(#arcadeRocketLine)" stroke-width="4" stroke-linecap="round"/>
   </svg>
   <div class="arcade-rocket" data-crash-rocket aria-hidden="true"><span class="arcade-rocket-body">🚀</span><span class="arcade-rocket-exhaust"></span></div>
   <div class="arcade-crash-hud"><div class="arcade-crash-number" data-crash-multiplier>${displayFinished?finishedAt.toFixed(2):'1.00'}×</div>
   <small data-crash-message>${active?'Launching…':displayFinished?(cashout?'Successfully collected!':'Rocket crashed!'):'Ready to launch'}</small></div>
   <div class="arcade-crash-flash" aria-hidden="true"></div>
 </div>
 ${active?`<div class="arcade-round-panel"><p>Your wager: <strong>${number(round.wager)} points</strong>${round.autoAt?' · Auto-collect: '+(round.autoAt/100).toFixed(2)+'×':''}</p>
  <form method="post" action="/arcade/crash/${round.id}/collect">${token(ctx)}<button type="submit" class="btn btn-primary" data-crash-collect>🚀 Collect Points</button></form></div>`:''}
 ${terminal&&!replay?`<div class="arcade-crash-result ${cashout?'arcade-crash-win':'arcade-crash-loss'}" role="status">
 <div class="arcade-crash-result-heading"><span aria-hidden="true">${cashout?'✅':'💥'}</span><div><h2>${cashout?'Successfully Cashed Out!':'Rocket Crashed!'}</h2><p>${cashout?'You collected before the crash.':'You did not collect before the crash.'}</p></div></div>
 <div class="arcade-crash-result-mult">${finishedAt.toFixed(2)}×</div>
 <div class="arcade-crash-receipt"><div><span>Wager</span><strong>${number(round.wager)} pts</strong></div><div><span>Returned</span><strong>${number(round.payout)} pts</strong></div></div>
 <div class="arcade-crash-profit"><small>${cashout?'POINTS PROFIT':'POINTS LOST'}</small><strong>${profit>0?'+':''}${number(profit)} points</strong></div>
 <a class="btn btn-primary arcade-play-again" href="/arcade/crash?again=1">🚀 Play Again</a>
 </div>`:''}
 ${showForm?`<form action="/arcade/crash/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField()}<label class="arc-label">Auto-collect multiplier (optional)<input type="number" name="auto_at" min="1.10" max="20" step="0.01" placeholder="e.g. 2.00"></label>
 <button type="submit" class="btn btn-primary">Start Crash</button></form>`:''}
 <p class="muted tiny">Rocket movement is visual only. The server determines the round result and handles collection, even if you leave the page.</p>
 </section>${historyList(rounds)}`);
}
export function arcadeHistoryPage(ctx,summary,rounds,transfers){
 return chrome(ctx,'Your Arcade History',summary,`<section class="panel padded"><h2>Game history</h2>
 ${historyList(rounds)}</section><section class="panel padded"><h2>Points transactions</h2><div class="table-wrap"><table><thead><tr><th>Action</th><th>Change</th><th>Balance after</th><th>Date</th></tr></thead><tbody>
 ${transfers.map(t=>`<tr><td>${esc(t.reason.split('.').join(' '))}</td><td class="${t.delta>0?'arcade-positive':'arcade-negative'}">${t.delta>0?'+':''}${number(t.delta)}</td><td>${number(t.balance_after)}</td><td>${date(t.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No arcade point transactions yet.</td></tr>'}
 </tbody></table></div></section>`);
}
