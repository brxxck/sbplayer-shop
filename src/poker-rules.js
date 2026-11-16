// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Pure Texas Hold'em rules. Never exposes the secret deck or an opponent's cards.
import {randomInt} from 'node:crypto';
export const POKER_MAX_HAND_STAKE=10000;
export const POKER_TURN_MS=30000;
export const POKER_RESULTS_MS=5500;
export const POKER_SEAT_LIMIT=6;
export const RANKS='23456789TJQKA';
export const SUITS='shdc';
export const POKER_HAND_NAMES=['High Card','Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
export function pokerDeck(draw=randomInt){
 const cards=[];
 for(const s of SUITS)for(const r of RANKS)cards.push(r+s);
 for(let i=cards.length-1;i>0;i--){const j=draw(i+1);if(!Number.isInteger(j)||j<0||j>i)throw Error('Invalid deck entropy');[cards[i],cards[j]]=[cards[j],cards[i]];}
 return cards;
}
function straight(ranks){
 const vals=[...new Set(ranks)].sort((a,b)=>b-a);
 if(vals.includes(14))vals.push(1);
 for(let i=0;i<=vals.length-5;i++)if(vals[i]-vals[i+4]===4)return vals[i];
 return 0;
}
export function pokerRank(cards){
 if(!Array.isArray(cards)||cards.length<5||cards.length>7||new Set(cards).size!==cards.length||
  cards.some(x=>typeof x!=='string'||x.length!==2||!RANKS.includes(x[0])||!SUITS.includes(x[1])))
  invalid('Invalid poker hand.');
 const groups=new Map(),bySuit=new Map();
 for(const c of cards){
  const v=RANKS.indexOf(c[0])+2;
  groups.set(v,(groups.get(v)||0)+1);
  const a=bySuit.get(c[1])||[];a.push(v);bySuit.set(c[1],a);
 }
 const descending=[...groups.keys()].sort((a,b)=>b-a);
 for(const values of bySuit.values())if(values.length>=5){
  const sf=straight(values);if(sf)return [8,sf];
 }
 const byCount=(n)=>descending.filter(v=>groups.get(v)>=n);
 const quads=byCount(4);
 if(quads.length)return [7,quads[0],descending.find(v=>v!==quads[0])];
 const trips=byCount(3),pairs=byCount(2);
 if(trips.length){
  const second=pairs.find(x=>x!==trips[0]);
  if(second)return [6,trips[0],second];
 }
 for(const values of bySuit.values())if(values.length>=5)return [5,...values.sort((a,b)=>b-a).slice(0,5)];
 const s=straight(descending);if(s)return [4,s];
 if(trips.length)return [3,trips[0],...descending.filter(x=>x!==trips[0]).slice(0,2)];
 if(pairs.length>=2)return [2,pairs[0],pairs[1],descending.find(x=>x!==pairs[0]&&x!==pairs[1])];
 if(pairs.length)return [1,pairs[0],...descending.filter(x=>x!==pairs[0]).slice(0,3)];
 return [0,...descending.slice(0,5)];
}
export function compareRanks(a,b){
 for(let i=0;i<Math.max(a.length,b.length);i++){
  const diff=(a[i]||0)-(b[i]||0);if(diff)return Math.sign(diff);
 }
 return 0;
}
export function pokerPots(players,board){
 if(!Array.isArray(players)||players.length<2||players.some(p=>!Number.isSafeInteger(p.contributed)||p.contributed<0))invalid('Invalid poker contributions.');
 const alive=players.filter(p=>!p.folded);
 if(!alive.length)invalid('No remaining player.');
 if(alive.length>1&&(!Array.isArray(board)||board.length!==5))invalid('Showdown requires five community cards.');
 const payouts=Object.fromEntries(players.map(p=>[p.id,0]));
 const levels=[...new Set(players.map(p=>p.contributed).filter(Boolean))].sort((a,b)=>a-b);
 const awards=[];let previous=0;
 for(const level of levels){
  const involved=players.filter(p=>p.contributed>=level);
  const value=(level-previous)*involved.length;previous=level;
  const eligible=involved.filter(p=>!p.folded);
  if(!eligible.length)throw Error('Poker side pot has no eligible winner.');
  let best=null,winners=[];
  for(const p of eligible){
   const r=alive.length===1?[0]:pokerRank([...p.cards,...board]);
   if(!best||compareRanks(r,best)>0){best=r;winners=[p];}
   else if(compareRanks(r,best)===0)winners.push(p);
  }
  const each=Math.floor(value/winners.length);let remainder=value%winners.length;
  for(const p of winners){payouts[p.id]+=each+(remainder-->0?1:0);}
  awards.push({pot:value,winners:winners.map(p=>p.id),hand:alive.length===1?'Uncontested':POKER_HAND_NAMES[best[0]]});
 }
 const wagered=players.reduce((sum,p)=>sum+p.contributed,0);
 if(Object.values(payouts).reduce((a,b)=>a+b,0)!==wagered)throw Error('Poker pot must conserve points.');
 return {payouts,awards,pot:wagered};
}
export const pokerCardLabel=c=>!c?'':(c[0]==='T'?'10':c[0])+({s:'♠',h:'♥',d:'♦',c:'♣'}[c[1]]||'');
