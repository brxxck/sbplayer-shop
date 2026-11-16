// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomUUID} from 'node:crypto';
import {shell,esc,token,titlebar,avatar} from './views.js';
import {isCinematicWin} from './arcade-cinematic-rules.js';
import {SLOT_SYMBOLS,SLOT_PAYTABLE,SLOT_PAYLINES,slotTier} from './slots-rules.js';

const number=n=>Number(n||0).toLocaleString('en-GB');
const date=n=>new Date(n).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
const href=(path)=>'/arcade/'+path;
const states={won:'Win',lost:'Loss',push:'Returned',cashed_out:'Collected',active:'Playing'};
const gameNames={coinflip:'Coin Flip',coinflip_pvp:'Player Coin Flip',slots:'Slots',mines:'Mines',crash:'Crash',blackjack:'Online Blackjack',blackjack_solo:'Solo Blackjack',crash_online:'Global Crash',plinko:'Plinko',roulette_online:'Live Roulette'};
const symbolIcons={Cherry:'🍒',Lemon:'🍋',Grapes:'🍇',Bell:'🔔',Star:'⭐',Diamond:'💎',Seven:'7️⃣',Crown:'👑',Wild:'🃏'};
const coinName=face=>face==='heads'?'SB (Heads)':'CAM (Tails)';
const coinArt=(selected='heads')=>`<div class="arcade-coin-disc" data-coin-disc data-landed="${selected}">
  <span class="arcade-coin-face arcade-coin-sb">SB</span>
  <span class="arcade-coin-face arcade-coin-cam">CAM</span>
 </div>`;
const faceChoices=`<fieldset class="arcade-face-choice arcade-branded-choices"><legend>Your choice</legend>
 <label class="arcade-face-sb"><input type="radio" name="face" value="heads" checked><span class="arcade-choice-coin">SB</span><strong>SB</strong><small>Heads</small></label>
 <label class="arcade-face-cam"><input type="radio" name="face" value="tails"><span class="arcade-choice-coin">CAM</span><strong>CAM</strong><small>Tails</small></label></fieldset>`;
// The last accepted wager comes from the player's saved game rounds. This
// restores bets across browsers/devices, with the browser optionally retaining
// a newer unsubmitted edit until the next round is placed.
const lastWager=(rounds,game)=>{
 const last=rounds.find(r=>r.game===game);
 return {game,value:last?.wager??50,at:last?.created_at||0};
};
export const wagerField=({game='',value=50,at=0}={})=>`<label class="arc-label">Wager in points<input inputmode="numeric" type="number" min="10" max="10000" step="1" name="wager" data-arcade-wager="${esc(game)}" data-last-round-at="${Number(at)||0}" value="${Math.max(10,Math.min(10000,Number(value)||50))}" required></label>`;
const request=()=>`<input type="hidden" name="request_id" value="${randomUUID()}">`;
const cinemaAttrs=round=>isCinematicWin(round)?` data-arcade-bigwin="1" data-arcade-round="${esc(round.game)}:${Number(round.id)}" data-arcade-profit="${Number(round.payout)-Number(round.wager)}" data-arcade-tier="${round.game==='slots'?esc(round.details?.tier||'none'):'big'}" data-arcade-multiplier="${round.game==='slots'?Number(round.details?.multiplier)||0:0}" data-arcade-settled="${Number(round.updated_at)||0}"`:'';
export const arcadeMobileMenu=(ctx,page)=>{
 // Mobile uses an accessible, compact game menu instead of clipped horizontal tabs.
 const mobileGames=[
  ['/arcade','All Games'],['/arcade/online','Online Games'],
  ['/arcade/online/roulette','Live Roulette'],['/arcade/online/blackjack','Online Blackjack'],
  ['/arcade/coinflip','Coin Flip'],['/arcade/slots','Slots'],['/arcade/mines','Mines'],
  ['/arcade/crash','Crash'],['/arcade/blackjack','Solo Blackjack'],['/arcade/plinko','Plinko'],
  ['/arcade/history','History'],['/arcade/leaderboard','Leaderboard'],['/points/daily','Daily Rewards']
 ];
 const mobileGameMenu=`<details class="arcade-game-menu"><summary><span>🎮 Switch game</span><strong>${esc(page)}</strong></summary>
  <nav aria-label="Choose an arcade game">${mobileGames.map(([url,label])=>
    `<a href="${url}"${ctx.pathname===url?' aria-current="page"':''}>${label}</a>`).join('')}</nav></details>`;
 return mobileGameMenu;
};
export const chrome=(ctx,page,summary,content)=>{
 const mobileGameMenu=arcadeMobileMenu(ctx,page);
 const solo=ctx.pathname==='/arcade/blackjack';
 const markup=`
<div class="arcade-root${solo?' arcade-solo':''}">
 <div class="arcade-header">
  <div><div class="arcade-eyebrow">SB'S & CAM'S STORE · LEVEL POINTS</div><h1>${esc(page)}</h1>
   <p>Play with points earned from Discord levels. No real money.</p></div>
  <a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong>${number(summary.balance)} <span>✦</span></strong><small>Claim more from levels →</small></a>
 </div>
 ${solo?'<details class="sbj-utilities" data-sbj-mobile-disclosure open><summary>⚙ Game options</summary><div class="sbj-utilities-panel">':''}
 ${mobileGameMenu}
 <div class="arcade-experience-options"><button type="button" data-arcade-sound aria-pressed="true" class="arcade-experience-sound">🔊 Sound on</button><label>Animations <select data-arcade-motion><option value="full">Full</option><option value="reduced">Reduced</option><option value="instant">Instant</option></select></label></div>
 ${solo?'<a class="sbj-online-link" href="/arcade/online/blackjack">♠ Multiplayer Blackjack</a></div></details>':''}
 <nav class="arcade-tabs" aria-label="Arcade games">
  <a href="/arcade">All Games</a><a href="/arcade/online">Online Games</a><a href="/arcade/coinflip">Coin Flip</a><a href="/arcade/slots">Slots</a><a href="/arcade/mines">Mines</a><a href="/arcade/crash">Crash</a><a href="/arcade/blackjack">Blackjack</a><a href="/arcade/plinko">Plinko</a><a href="/arcade/history">History</a><a href="/arcade/leaderboard">Leaderboard</a><a href="/points/daily">Daily Rewards</a>
 </nav>
 ${content}
</div>`;
 return ctx.arcadeFragment ? markup : shell(ctx,'Arcade',markup);
};
const gameTile=(url,icon,name,description,className)=>`<a class="arcade-game-card ${className}" href="${url}"><span class="arcade-game-art">${icon}</span><span class="arcade-game-info"><strong>${name}</strong><small>${description}</small></span><span class="arcade-game-arrow">Play →</span></a>`;
export const resultBox=round=>{
 if(!round)return '';
 const {status,wager,payout,game,details}=round;
 const label=states[status]||status;
 let extra='';
 if(game==='coinflip')extra=`You chose ${coinName(details.selected)} · Coin landed on ${coinName(details.landed)}.`;
 if(game==='coinflip_pvp')extra=`Coin landed on ${coinName(details.landed)}.`;
 if(game==='slots'){
  if(details.version===2){
   const hits=details.wins||[];
   extra=hits.length?hits.length+' winning line'+(hits.length===1?'':'s')+' · '+Number(details.multiplier||0).toFixed(2)+'× total':'No winning lines this spin.';
   if(details.capped)extra+=' · Maximum 1,000× payout applied';
  }else{
   extra=(details.reels||[]).map(s=>symbolIcons[s]||esc(s)).join(' ');
   if(details.match==='pair'&&details.multiplier===10)extra+=' · Rare Pair! 10× payout';
  }
 }
 if(game==='mines')extra=details.exploded!==undefined?'You uncovered a mine.':'You safely collected your points.';
 if(game==='roulette_online')extra='Global round #'+number(details.globalRound)+' · '+number(details.winningNumber)+' '+esc(details.color)+' · '+number(details.bets.length)+' bet selection(s).';
 if(game==='plinko')extra=details.count+' ball'+(details.count===1?'':'s')+' · '+details.rows+' rows · '+esc(details.risk)+' risk · all results saved.';
 return `<section class="arcade-result panel padded"${cinemaAttrs(round)} role="status"><div><small>LAST RESULT</small><h2>${esc(label)}</h2><p>${extra}</p></div>
 <div class="arcade-result-value ${payout>=wager?'positive':'negative'}"><strong>${payout>=wager?'+':''}${number(payout-wager)} pts</strong><small>${number(payout)} returned from ${number(wager)} wagered</small></div></section>`;
};
export const historyList=rounds=>`<section class="panel padded arcade-history-panel"><div class="arcade-section-title"><h2>Recent games</h2><a href="/arcade/history">View history →</a></div>
 <div class="table-wrap"><table><thead><tr><th>Game</th><th>Wager</th><th>Returned</th><th>Result</th><th>Played</th></tr></thead><tbody>${rounds.map(r=>`<tr><td>${esc(gameNames[r.game]||r.game)}</td><td>${number(r.wager)}</td><td>${number(r.payout)}</td><td>${esc(states[r.status]||r.status)}</td><td>${date(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="5">No games played yet.</td></tr>'}</tbody></table></div></section>`;

export function arcadeHome(ctx,summary,rounds){
 return chrome(ctx,'SB Arcade',summary,`
 <section class="arcade-metrics"><div class="arcade-points-stat"><small>AVAILABLE POINTS</small><strong>${number(summary.balance)}</strong><a class="arcade-get-more" href="/points" aria-label="Get more points from Discord levels">Get more from levels <span aria-hidden="true">→</span></a></div>
 <div><small>GAMES COMPLETED</small><strong>${number(summary.played)}</strong></div>
 <div><small>GAMES WON</small><strong>${number(summary.wins)}</strong></div>
 <div><small>BIGGEST PROFIT</small><strong>${number(summary.biggest_win)}</strong></div></section>
 <div class="arcade-section-title"><h2>Choose a game</h2><span>Six solo games · one wallet</span></div>
 <p><a class="btn btn-outline" href="/arcade/online">♠️ Online Games — four-player Blackjack and Live Roulette →</a></p>
 <section class="arcade-grid">
 ${gameTile('/arcade/coinflip','🪙','Coin Flip','Play the house or challenge another member','arcade-coins')}
 ${gameTile('/arcade/slots','🎰','Slots','Spin the reels to find matching symbols','arcade-slots')}
 ${gameTile('/arcade/mines','💎','Mines','Uncover gems and decide when to collect','arcade-mines')}
 ${gameTile('/arcade/crash','🚀','Crash','Watch the multiplier rise and collect in time','arcade-crash')}
 ${gameTile('/arcade/blackjack','♠️','Solo Blackjack','Hit, stand, double or split against the house dealer','arcade-blackjack-solo')}
 ${gameTile('/arcade/plinko','🔴','Plinko','Bounce through pegs and land on multiplier slots','arcade-plinko')}
 </section>
 <section class="panel padded arcade-info"><h2>How points work</h2><p>Earn points through Discord levels, claim them in <a href="/points">Level Points</a>, and use the same balance in any arcade game. Every game outcome and wallet transfer is saved.</p></section>
 ${historyList(rounds)}`);
}
export function coinflipPage(ctx,summary,{round,rounds,houseWager=null}){
 const newest=round||rounds.find(r=>r.game==='coinflip');
 const landed=newest?.game==='coinflip'?newest.details?.landed||'':'';
 return chrome(ctx,'Coin Flip',summary,`
 <section class="panel padded arcade-game-panel arcade-house-only">
  <div class="arcade-section-title"><h2>🪙 SB vs CAM — Play the House</h2><span>Instant flip</span></div>
  <div class="arcade-coin-stage" data-coin-stage data-coin-result="${esc(landed)}">${coinArt(landed||'heads')}</div>
  <p>Choose SB (Heads) or CAM (Tails). Winning flips return twice the wager. The house has an advantage.</p>
  <form action="/arcade/coinflip/house" method="post" class="arcade-form">${token(ctx)}${request()}
   ${wagerField(houseWager?{game:'coinflip',value:houseWager.wager,at:houseWager.created_at}:lastWager(rounds,'coinflip'))}${faceChoices}<button class="btn btn-primary" type="submit">Flip vs House</button>
  </form>
  <p class="muted tiny arcade-profile-invite">Want to challenge another member? Visit their <a href="/members">profile</a> and select <b>Challenge to Coin Flip</b>.</p>
 </section>
 ${resultBox(newest?.game==='coinflip'?newest:null)}
 ${historyList(rounds)}`);
}
// Every wager is one settled 5x3 spin. BONUS and free spins are intentionally absent.
const slotSymbolFace=s=>`<span class="arcade-slot-symbol arcade-slot-${esc(s.toLowerCase())}" aria-label="${esc(s)}">${symbolIcons[s]||'❔'}</span>`;
const slotPaytable=()=>`<details class="arcade-slot-paytable"><summary>View symbol payouts and paylines</summary>
 <div class="arcade-slot-paytable-scroll"><table><thead><tr><th>Symbol</th><th>3 match</th><th>4 match</th><th>5 match</th></tr></thead><tbody>
 ${SLOT_SYMBOLS.map(s=>`<tr><th>${slotSymbolFace(s)} <span>${s==='Crown'?'SB Crown':s==='Seven'?'Lucky Seven':s==='Star'?'Golden Star':s==='Bell'?'Golden Bell':s}</span></th>${SLOT_PAYTABLE[s].map(p=>`<td>${(p/100).toLocaleString('en-GB',{maximumFractionDigits:2})}×</td>`).join('')}</tr>`).join('')}
 </tbody></table></div><p>20 fixed lines, matching left to right. Wild substitutes for regular symbols. All payouts use the total wager. Combined prizes are capped at 1,000×.</p></details>`;
export function slotsPage(ctx,summary,{round,rounds}){
 const newest=round||rounds.find(r=>r.game==='slots')||null;
 const modern=newest?.details?.version===2;
 const reels=modern?newest.details.reels:Array.from({length:5},(_,i)=>['Cherry','Bell','Seven','Diamond','Crown'].map((x,j)=>SLOT_SYMBOLS[(i+j*2)%8]).slice(0,3));
 const wins=modern?(newest.details.wins||[]):[];
 const cells=new Set(wins.flatMap(win=>win.positions.map(p=>p.reel+':'+p.row)));
 const resultTier=modern?slotTier(Number(newest.details.multiplier)||0):'none';
 const reelMarkup=reels.map((column,i)=>`<div class="arcade-reel" data-reel-index="${i}" aria-label="Reel ${i+1}"><div class="arcade-reel-window">
 ${column.map((s,row)=>`<div class="arcade-reel-face ${cells.has(i+':'+row)?'arcade-reel-winning':''}" data-slot-row="${row}" data-symbol="${esc(s)}">${slotSymbolFace(s)}</div>`).join('')}
 </div></div>`).join('');
 const lines=wins.length?`<div class="arcade-slot-wins" aria-live="polite"><strong>${wins.length} winning line${wins.length===1?'':'s'}!</strong><div>${wins.slice(0,12).map(w=>`<span>Line ${w.line}: ${symbolIcons[w.symbol]} ${w.count}× · ${w.multiplier.toFixed(2)}×</span>`).join('')}${wins.length>12?`<span>+${wins.length-12} more lines</span>`:''}</div></div>`:'';
 return chrome(ctx,'Slots',summary,`<section class="panel padded arcade-feature-game arcade-custom-slots" data-slots-version="2" data-slots-tier="${resultTier}">
 <div class="arcade-section-title"><h2>🎰 SB's Custom Slots</h2><span>5 reels · 3 rows · 20 paylines</span></div>
 <div class="arcade-slot-machine">
  <div class="arcade-slot-brand"><span>✦ SB'S LUCKY SLOTS ✦</span><small>SPIN TO WIN</small></div>
  <div class="arcade-slot-reels" data-slot-reels>${reelMarkup}</div>
  <div class="arcade-slot-bottom"><span>20 LINES</span><strong>👑 SB CROWN · UP TO 200×</strong><span>MAX 1,000×</span></div>
 </div>
 ${modern?`<div class="arcade-slot-last"><span>LAST SPIN</span><strong>${number(newest.payout)} points returned</strong><span>${newest.details.multiplier.toFixed(2)}×</span></div>`:''}
 ${lines}
 <p>Match 3 or more symbols from left to right. Wild helps complete combinations. Each spin settles immediately — no free spins.</p>
 <form action="/arcade/slots/spin" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}${wagerField(lastWager(rounds,'slots'))}
 <button type="submit" class="btn btn-primary arcade-slot-spin">🎰 SPIN</button></form>
 ${slotPaytable()}
 </section>${modern?resultBox(newest):newest?.details?.version!==2?resultBox(newest):''}${historyList(rounds)}`);
}
export function minesPage(ctx,summary,{round,rounds,currentPayout=0}){
 const active=round?.status==='active'?round:null;
 const canCollect=Boolean(active?.details?.revealed?.length);
 const collectTotal=canCollect?Math.max(active.wager,currentPayout):0;
 const currentProfit=canCollect?Math.max(0,collectTotal-active.wager):0;
 const current=round||rounds[0];
 const shown=new Set(current?.details?.revealed||[]);
 const terminal=current&&current.status!=='active';
 const bombs=terminal?new Set(current.details.bombs):new Set();
 return chrome(ctx,'Mines',summary,`<section class="panel padded arcade-feature-game">
 <div class="arcade-section-title"><h2>💎 Mines</h2><span>Find gems · avoid mines</span></div>
 ${current?`<div class="arcade-mine-summary"><div>Wager <strong>${number(current.wager)}</strong></div><div>Bombs <strong>${number(current.details.bombCount)}</strong></div>
 <div>Safe picks <strong>${number(current.details.revealed.length)}</strong></div></div>
 ${active?`<div class="arcade-mines-earnings" aria-live="polite" role="status">
 <div><small>Current profit</small><strong class="arcade-mines-profit">${currentProfit>0?'+':''}${number(currentProfit)} pts</strong></div>
 <div><small>Collect now</small><strong>${canCollect?number(collectTotal)+' pts':'Reveal a safe tile'}</strong></div>
 </div>`:''}
 <div class="arcade-mine-grid" role="group" aria-label="Mine tiles">${Array.from({length:25},(_,i)=>{
  const opened=shown.has(i),bomb=bombs.has(i),symbol=opened?'💎':terminal?(bomb?'💣':'·'):'?';
  return active&&!opened?`<form action="/arcade/mines/${active.id}/reveal" method="post">${token(ctx)}<input type="hidden" name="tile" value="${i}"><button class="arcade-mine-tile" type="submit" aria-label="Reveal tile ${i+1}">${symbol}</button></form>`:
  `<div class="arcade-mine-tile ${opened?'revealed':''} ${bomb?'exploded':''}" aria-label="Tile ${i+1}">${symbol}</div>`;
 }).join('')}</div>
 ${active?`<form class="arcade-mine-collect" action="/arcade/mines/${active.id}/collect" method="post">${token(ctx)}<button type="submit" class="btn btn-primary" ${!active.details.revealed.length?'disabled':''}>${canCollect?'Collect '+number(collectTotal)+' Points':'Collect Points'}</button></form>`:''}
 ${terminal?'<a class="btn btn-outline" href="/arcade/mines">Start another game</a>':''}
 `:'<div class="arcade-empty-grid"><span>💎</span><p>Start a game to reveal the grid.</p></div>'}
 ${!active?`<form action="/arcade/mines/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField(lastWager(rounds,'mines'))}<label class="arc-label">Hidden mines<select name="bombs"><option value="1">1 mine</option><option value="2">2 mines</option><option value="3" selected>3 mines</option><option value="4">4 mines</option><option value="5">5 mines</option></select></label>
 <button type="submit" class="btn btn-primary">Start Mines</button></form>`:''}
 <p class="muted tiny">Only one Mines game can be active at a time. Your board is saved if you leave the page.</p></section>
 ${current&&terminal?resultBox(current):''}${historyList(rounds)}`);
}
// // BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Crash records an explicit auto-collect preference in each round: 0 means off.
const lastAutoCollect=rounds=>{
 const latest=rounds.find(r=>r.game==='crash');
 const cents=Number(latest?.details?.autoAt||0);
 const value=Number.isInteger(cents)&&cents>=110&&cents<=2000?(cents/100).toFixed(2):'';
 return {value,at:latest?.created_at||0};
};
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
 ${terminal&&!replay?`<div class="arcade-crash-result ${cashout?'arcade-crash-win':'arcade-crash-loss'}"${cinemaAttrs(round)} role="status">
 <div class="arcade-crash-result-heading"><span aria-hidden="true">${cashout?'✅':'💥'}</span><div><h2>${cashout?'Successfully Cashed Out!':'Rocket Crashed!'}</h2><p>${cashout?'You collected before the crash.':'You did not collect before the crash.'}</p></div></div>
 <div class="arcade-crash-result-mult">${finishedAt.toFixed(2)}×</div>
 <div class="arcade-crash-receipt"><div><span>Wager</span><strong>${number(round.wager)} pts</strong></div><div><span>Returned</span><strong>${number(round.payout)} pts</strong></div></div>
 <div class="arcade-crash-profit"><small>${cashout?'POINTS PROFIT':'POINTS LOST'}</small><strong>${profit>0?'+':''}${number(profit)} points</strong></div>
 <a class="btn btn-primary arcade-play-again" href="/arcade/crash?again=1">🚀 Play Again</a>
 </div>`:''}
 ${showForm?`<form action="/arcade/crash/start" method="post" class="arcade-form arcade-center-form">${token(ctx)}${request()}
 ${wagerField(lastWager(rounds,'crash'))}<label class="arc-label">Auto-collect multiplier (optional)<input type="number" name="auto_at" min="1.10" max="20" step="0.01" placeholder="e.g. 2.00" data-arcade-auto-collect data-last-round-at="${Number(lastAutoCollect(rounds).at)||0}" value="${lastAutoCollect(rounds).value}"></label>
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

const leaderboardName=person=>person.nickname||person.display_name||person.username||'Member';
const leaderboardMember=(person,selfId)=>`<div class="arcade-leaderboard-row ${person.position<=3?'arcade-leaderboard-top-'+person.position:''} ${person.user_id===selfId?'arcade-leaderboard-me':''}">
 <span class="arcade-leaderboard-rank" aria-label="Rank ${person.position}">${person.position===1?'🥇':person.position===2?'🥈':person.position===3?'🥉':'#'+number(person.position)}</span>
 <span class="arcade-leaderboard-avatar-wrap">${person.position===1?'<span class="arcade-leaderboard-crown" role="img" aria-label="First place crown">👑</span>':''}${avatar({...person,id:person.user_id},'sm',true)}</span>
 <div class="arcade-leaderboard-person">
  ${person.profile_public?`<a href="/u/${esc(person.user_id)}">${esc(leaderboardName(person))}</a>`:`<strong>${esc(leaderboardName(person))}</strong>`}
  <small>${person.user_id===selfId?'Your account':'Discord member'}</small>
 </div>
 <strong class="arcade-leaderboard-balance">${number(person.balance)} <span>pts</span></strong>
 </div>`;
export function arcadeLeaderboardPage(ctx,summary,{leaders=[],self=null,total=0}={}){
 return chrome(ctx,'Points Leaderboard',summary,`<section class="panel padded arcade-leaderboard">
 <div class="arcade-section-title"><h2>🏆 Points Leaderboard</h2><span>Top 50 members</span></div>
 <p class="muted">Ranked by <strong>current point balances</strong> from Discord level claims and Arcade games. Balances change whenever points are earned, wagered or collected.</p>
 <div class="arcade-leaderboard-summary">
  <div><small>YOUR RANK</small><strong>${self?'#'+number(self.position):'Unranked'}</strong></div>
  <div><small>YOUR POINTS</small><strong>${number(summary.balance)}</strong></div>
  <div><small>MEMBERS WITH POINTS</small><strong>${number(total)}</strong></div>
 </div>
 ${leaders.length?`<div class="arcade-leaderboard-list" aria-label="Current points rankings">
  ${leaders.map(person=>leaderboardMember(person,ctx.user.id)).join('')}
 </div>`:'<p class="arcade-leaderboard-empty">No members have points yet. Claim points from your Discord levels to appear here.</p>'}
 ${self&&!leaders.some(person=>person.user_id===self.user_id)?`<div class="arcade-leaderboard-own"><h3>Your position</h3>${leaderboardMember(self,ctx.user.id)}</div>`:''}
 <p class="muted tiny">Only point balances are shown. Your private profile details and game history are not included.</p>
 </section>`);
}
