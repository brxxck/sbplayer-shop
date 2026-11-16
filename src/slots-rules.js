// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// SB's Custom Slots: one paid spin, 5 reels x 3 rows, 20 fixed paylines.
// No BONUS symbols, free spins, retriggers, or unfinished sessions.
import {randomInt} from 'node:crypto';

export const SLOT_SYMBOLS=Object.freeze(['Cherry','Lemon','Grapes','Bell','Star','Diamond','Seven','Crown','Wild']);
// Integers are relative reel weights, not advertised win probabilities.
// Theoretical uncapped line EV is about 95.24% of total wager; caps and rounding reduce it.
export const SLOT_WEIGHTS=Object.freeze([20,17,15,12,10,8,6,3,3]);
export const SLOT_MAX_MULTIPLIER=1000;
export const SLOT_PAYTABLE=Object.freeze({
 Cherry:Object.freeze([20,80,250]),
 Lemon:Object.freeze([30,120,400]),
 Grapes:Object.freeze([40,180,600]),
 Bell:Object.freeze([75,300,1000]),
 Star:Object.freeze([150,600,2000]),
 Diamond:Object.freeze([300,1200,4500]),
 Seven:Object.freeze([600,2500,9000]),
 Crown:Object.freeze([1200,5000,20000]),
 Wild:Object.freeze([200,1000,7500])
});
// One entry per reel, row 0 = top, 1 = middle, 2 = bottom.
export const SLOT_PAYLINES=Object.freeze([
 [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],
 [0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],
 [2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],
 [0,1,1,1,0],[2,1,1,1,2],[1,0,1,0,1],
 [1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
 [0,2,0,2,0],[2,0,2,0,2],[1,0,1,2,1],
 [1,2,1,0,1],[2,1,0,0,0]
].map(rows=>Object.freeze(rows)));

const totalWeight=SLOT_WEIGHTS.reduce((a,b)=>a+b,0);
function symbolAt(ticket){
 let offset=0;
 for(let i=0;i<SLOT_SYMBOLS.length;i++){
  offset+=SLOT_WEIGHTS[i];
  if(ticket<offset)return SLOT_SYMBOLS[i];
 }
 throw new RangeError('Slot ticket out of range');
}
export function evaluateSlotLine(line){
 if(!Array.isArray(line)||line.length!==5||line.some(s=>!SLOT_SYMBOLS.includes(s)))
  throw new TypeError('Invalid slot line');
 let best=null;
 for(const symbol of SLOT_SYMBOLS){
  let count=0;
  for(const face of line){
   if(face===symbol||(symbol!=='Wild'&&face==='Wild'))count++;
   else break;
  }
  if(count<3)continue;
  // All-Wild combinations pay as Wild. Substitution requires the actual pay symbol.
  if(symbol!=='Wild'&&!line.slice(0,count).includes(symbol))continue;
  const hundredths=SLOT_PAYTABLE[symbol][count-3];
  if(!best||hundredths>best.hundredths)
   best={symbol,count,hundredths,multiplier:hundredths/100};
 }
 return best;
}
export function evaluateSlotGrid(reels){
 if(!Array.isArray(reels)||reels.length!==5||
  reels.some(reel=>!Array.isArray(reel)||reel.length!==3||reel.some(s=>!SLOT_SYMBOLS.includes(s))))
  throw new TypeError('Invalid slot reel grid');
 const wins=[];
 let totalHundredths=0;
 for(let index=0;index<SLOT_PAYLINES.length;index++){
  const rows=SLOT_PAYLINES[index];
  const match=evaluateSlotLine(rows.map((row,reel)=>reels[reel][row]));
  if(!match)continue;
  totalHundredths+=match.hundredths;
  wins.push({line:index+1,...match,positions:rows.slice(0,match.count).map((row,reel)=>({reel,row}))});
 }
 const cappedHundredths=Math.min(SLOT_MAX_MULTIPLIER*100,totalHundredths);
 return {wins,multiplier:cappedHundredths/100,rawMultiplier:totalHundredths/100,
  capped:cappedHundredths!==totalHundredths,
  match:wins.length?'lines':'none'};
}
export function slotOutcome(draw=randomInt){
 const reels=Array.from({length:5},()=>Array.from({length:3},()=>{
  const ticket=draw(totalWeight);
  if(!Number.isInteger(ticket)||ticket<0||ticket>=totalWeight)
   throw new RangeError('Invalid slot draw');
  return symbolAt(ticket);
 }));
 return {reels,...evaluateSlotGrid(reels)};
}
export function slotTier(multiplier){
 if(multiplier>=300)return 'jackpot';
 if(multiplier>=150)return 'epic';
 if(multiplier>=50)return 'mega';
 if(multiplier>=15)return 'big';
 if(multiplier>=5)return 'nice';
 return multiplier>0?'small':'none';
}
