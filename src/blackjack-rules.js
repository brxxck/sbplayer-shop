// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Six-deck Blackjack rules: dealer stands on soft 17, natural Blackjack pays 3:2.
// All randomness and payouts are calculated on the server; clients see only public cards.
import {randomInt} from 'node:crypto';

export const BLACKJACK_MIN_WAGER=1;
export const BLACKJACK_MAX_WAGER=Math.floor(Number.MAX_SAFE_INTEGER/16);
export const BLACKJACK_BET_MS=18000;
export const BLACKJACK_TURN_MS=25000;
export const BLACKJACK_BREAK_MS=5500;
export const BLACKJACK_SUITS=['S','H','D','C'];
export const BLACKJACK_RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export function makeBlackjackShoe(draw=randomInt){
 const cards=[];
 for(let deck=0;deck<6;deck++)
  for(const suit of BLACKJACK_SUITS)
   for(const rank of BLACKJACK_RANKS)cards.push({rank,suit});
 for(let i=cards.length-1;i>0;i--){
  const j=draw(i+1);
  [cards[i],cards[j]]=[cards[j],cards[i]];
 }
 return cards;
}

export function drawBlackjackCard(shoe){
 const card=shoe.pop();
 if(!card)throw Error('The Blackjack shoe ran out of cards.');
 return card;
}

export function blackjackValue(cards){
 let total=0,aces=0;
 for(const card of cards){
  if(card.rank==='A'){total++;aces++;}
  else if(['J','Q','K'].includes(card.rank))total+=10;
  else total+=Number(card.rank);
 }
 let soft=false;
 if(aces&&total+10<=21){total+=10;soft=true;}
 return {total,soft};
}
export const blackjackNatural=hand=>!hand.split&&hand.cards.length===2&&blackjackValue(hand.cards).total===21;
export const blackjackCanSplit=cards=>cards.length===2&&cards[0].rank===cards[1].rank;
export function blackjackAllowed(hand,player,balance){
 if(!hand||hand.done||blackjackValue(hand.cards).total>=21)return [];
 const available=['hit','stand'];
 if(hand.cards.length===2&&balance>=hand.wager)available.push('double');
 if(player.hands.length===1&&blackjackCanSplit(hand.cards)&&balance>=hand.wager)available.push('split');
 return available;
}
export function blackjackDealerPlay(dealer,shoe){
 while(blackjackValue(dealer).total<17)dealer.push(drawBlackjackCard(shoe));
 return dealer;
}
// Returns all points to credit (including the returned original wager).
// Odd natural wagers round fractional payouts down to a whole point.
export function blackjackPayout(hand,dealer){
 const player=blackjackValue(hand.cards).total,house=blackjackValue(dealer).total;
 const houseNatural=dealer.length===2&&house===21;
 if(player>21)return {payout:0,outcome:'bust'};
 if(blackjackNatural(hand))return houseNatural?
   {payout:hand.wager,outcome:'push'}:
   {payout:Math.floor(hand.wager*5/2),outcome:'blackjack'};
 if(houseNatural)return {payout:0,outcome:'lost'};
 if(house>21||player>house)return {payout:2*hand.wager,outcome:'won'};
 if(player===house)return {payout:hand.wager,outcome:'push'};
 return {payout:0,outcome:'lost'};
}
