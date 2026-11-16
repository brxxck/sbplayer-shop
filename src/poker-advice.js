// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Optional Hold'em strategy hints. Uses ONLY the requesting player's hole
// cards, PUBLIC board, and publicly visible betting amounts. Never sees the
// deck or opponents' cards and never places an action or moves points.
import {pokerRank,POKER_HAND_NAMES,RANKS,SUITS} from './poker-rules.js';

function handTier(cards,board){
 const ranks=cards.map(c=>RANKS.indexOf(c[0])+2).sort((a,b)=>b-a);
 const suited=cards[0][1]===cards[1][1];
 const pair=ranks[0]===ranks[1];
 if(!board.length){
  if(pair&&ranks[0]>=11)return {tier:3,hand:'Premium pocket pair',note:'A strong starting pair'};
  if(pair&&ranks[0]>=7)return {tier:2,hand:'Pocket pair',note:'A playable starting pair'};
  if(pair)return {tier:1,hand:'Small pocket pair',note:'A speculative starting pair'};
  if(ranks[0]===14&&ranks[1]>=11)return {tier:3,hand:'Strong high cards',note:'Strong starting cards'};
  if(suited&&ranks[0]>=12&&ranks[1]>=10)return {tier:2,hand:'Suited high cards',note:'Playable suited starting cards'};
  if(ranks[0]>=11&&ranks[1]>=10)return {tier:2,hand:'High cards',note:'Playable high-card starting hand'};
  if(suited&&ranks[0]-ranks[1]<=2&&ranks[0]>=8)return {tier:1,hand:'Suited connectors',note:'Potential to improve'};
  return {tier:0,hand:'Weak starting cards',note:'Limited starting-hand strength'};
 }
 const complete=[...cards,...board];
 const rank=pokerRank(complete);
 const category=rank[0];
 // Do not treat a made hand that is already fully on the board as the
 // player's personal advantage (any opponent may have the same hand).
 if(board.length===5&&category<=pokerRank(board)[0]&&
    JSON.stringify(rank)===JSON.stringify(pokerRank(board)))
  return {tier:1,hand:'Hand shared by the board',note:'The board alone makes this hand'};
 const boardRanks=board.map(c=>RANKS.indexOf(c[0])+2);
 const holeImproves=pair||ranks.some(r=>boardRanks.includes(r));
 const topPair=ranks.some(r=>r===Math.max(...boardRanks));
 if(category>=4)return {tier:3,hand:POKER_HAND_NAMES[category],note:'A strong made hand'};
 if(category>=3)return {tier:3,hand:POKER_HAND_NAMES[category],note:'A strong made hand'};
 if(category===2)return {tier:2,hand:'Two Pair',note:'A made two-pair hand'};
 if(category===1&&holeImproves)return {
  tier:topPair?2:1,hand:topPair?'Top pair':'One pair',note:topPair?'You paired the top board rank':'You have a pair'};
 // Draws are possible on the flop/turn. Not a promise that they'll hit.
 if(board.length<5){
  const suits=new Map();
  for(const card of complete)suits.set(card[1],(suits.get(card[1])||0)+1);
  const flushDraw=Math.max(0,...suits.values())>=4;
  const vals=[...new Set(complete.map(c=>RANKS.indexOf(c[0])+2))];
  if(vals.includes(14))vals.push(1);
  const straightDraw=Array.from({length:10},(_,i)=>i+1).some(start=>
   Array.from({length:5},(_,i)=>start+i).filter(v=>vals.includes(v)).length>=4);
  if(flushDraw||straightDraw)return {tier:1,hand:flushDraw?'Flush draw':'Straight draw',note:'A possible draw, not a completed hand'};
 }
 return {tier:0,hand:category===1?'Board pair':'High card',note:'No strong made hand or draw'};
}
export function pokerSuggestedPlay({cards,board=[],toCall=0,pot=0,minRaise=0,maxRaiseTo=0,street=0,canRaise=false}={}){
 if(!Array.isArray(cards)||cards.length!==2||!Array.isArray(board)||board.length>5||
    new Set([...cards,...board]).size!==cards.length+board.length||
    [...cards,...board].some(c=>typeof c!=='string'||c.length!==2||
      !RANKS.includes(c[0])||!SUITS.includes(c[1]))||
    ![toCall,pot,minRaise,maxRaiseTo,street].every(n=>Number.isSafeInteger(n)&&n>=0))return null;
 const assessment=handTier(cards,board);
 const callPrice=toCall/(pot+toCall||1);
 const maxSpend=Math.max(0,maxRaiseTo-street);
 const legalRaise=canRaise&&minRaise>street&&maxRaiseTo>=minRaise;
 let action='fold',reason='',raiseTo=null;
 if(toCall===0){
  if(assessment.tier>=3&&legalRaise){
   action='raise';raiseTo=minRaise;
   reason=assessment.note+'. A minimum legal raise is available.';
  }else{
   action='check';reason=assessment.note+'. You can see the next card without adding points.';
  }
 }else if(assessment.tier>=3){
  if(legalRaise&&toCall<=pot*.25&&maxSpend>=minRaise-street){
   action='raise';raiseTo=minRaise;
   reason=assessment.note+'. A minimum legal raise is available.';
  }else{
   action='call';reason=assessment.note+'. Continuing may be reasonable against this bet.';
  }
 }else if(assessment.tier===2&&callPrice<=.30){
  action='call';reason=assessment.note+'. The call is modest relative to the pot.';
 }else if(assessment.tier===1&&callPrice<=.14){
  action='call';reason=assessment.note+'. The call is small relative to the pot, but the hand may not improve.';
 }else{
  action='fold';reason=assessment.note+'. Folding avoids risking more points on this bet.';
 }
 const label=action==='raise'?'Raise to '+raiseTo+' pts':action==='call'?
  'Call '+Math.min(toCall,maxSpend)+' pts':action==='check'?'Check':'Fold';
 return {action,label,reason,hand:assessment.hand,...(raiseTo!==null?{raiseTo}:{})};
}
