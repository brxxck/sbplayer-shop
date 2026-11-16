// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Pure, server-side presentation eligibility: never changes payouts or game outcomes.
export function isCinematicWin(round){
 if(!round||!['won','cashed_out'].includes(round.status))return false;
 const wager=Number(round.wager),payout=Number(round.payout);
 if(!Number.isSafeInteger(wager)||!Number.isSafeInteger(payout)||wager<=0)return false;
 if(round.game==='slots'&&round.details?.version===2){
  return (payout/wager)>=15;
 }
 const profit=payout-wager;
 return profit>=500||(profit>=250&&payout>=wager*10);
}
