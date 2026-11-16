// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Regression for the disabled Plinko Drop button: the shared Arcade header
// sits OUTSIDE the Plinko root, so the button must use its own server balance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/plinko.js',import.meta.url),'utf8');

function mountPlinko({balance=3772,wager=10,balls=10,rows=12,risk='high'}={}){
 const wagerInput={value:String(wager),dataset:{lastRoundAt:'0'}};
 const rowInput={value:String(rows)};
 const countRadio={value:String(balls)};
 const riskRadio={value:risk};
 const action={disabled:true,textContent:''};
 const summary={textContent:'',dataset:{}};
 const amount={dataset:{plinkoWallet:String(balance)},textContent:balance.toLocaleString('en-GB')+' pts'};
 const slots={innerHTML:'',style:{setProperty(){}}};
 const canvas={width:800,height:640,getContext(){return null;},setAttribute(){}};
 const session={textContent:'',className:''};
 const form={
  elements:{namedItem(name){return name==='rows'?rowInput:name==='wager'?wagerInput:null;}},
  querySelector(sel){
   if(sel==='[data-plinko-wager]')return wagerInput;
   if(sel==='input[name="risk"]:checked')return riskRadio;
   if(sel==='input[name="count"]:checked')return countRadio;
   return null;
  }
 };
 const selectors=new Map([
  ['[data-plinko-form]',form],
  ['[data-plinko-canvas]',canvas],
  ['[data-plinko-slots]',slots],
  ['[data-plinko-stake]',summary],
  ['[data-plinko-balance]',amount],
  ['[data-plinko-submit]',action],
  ['[data-plinko-session]',session]
 ]);
 const root={
  dataset:{plinkoTables:JSON.stringify({
   12:{high:[100,100,100,100,100,100,100,100,100,100,100,100,100],
    medium:[100,100,100,100,100,100,100,100,100,100,100,100,100]}
  }),plinkoLast:'null'},
  querySelector(selector){
   // This element is a sibling, not a child of [data-plinko-root].
   // The old code incorrectly read it as 0 and disabled the submit button.
   if(selector==='.arcade-wallet strong')
    throw new Error('Bug: tried to read the Arcade header inside the Plinko component');
   return selectors.get(selector)||null;
  }
 };
 const context={
  window:{devicePixelRatio:1,matchMedia(){return {matches:false};},addEventListener(){}},
  document:{
   body:{dataset:{page:'/arcade/plinko',siteUser:'100000000000000181'}},
   querySelector(selector){return selector==='[data-plinko-root]'?root:null;},
   addEventListener(){}
  },
  sessionStorage:{getItem(){return null;},setItem(){}},
  localStorage:{getItem(){return null;},setItem(){}}
 };
 runInNewContext(source,context,{timeout:2000,filename:'public/plinko.js'});
 return {action,summary,amount};
}
test('Plinko unlocks 10 balls at 10 points with 3,772 points available',()=>{
 const {action,summary,amount}=mountPlinko();
 assert.equal(amount.dataset.plinkoWallet,'3772');
 assert.equal(summary.textContent,'100 pts');
 assert.equal(action.disabled,false);
 assert.match(action.textContent,/Drop 10 balls/);
});
test('Plinko disables only when wager times balls exceeds the actual wallet',()=>{
 assert.equal(mountPlinko({balance:100,wager:10,balls:10}).action.disabled,false);
 assert.equal(mountPlinko({balance:99,wager:10,balls:10}).action.disabled,true);
 assert.equal(mountPlinko({balance:3772,wager:500,balls:10}).action.disabled,true);
 assert.equal(mountPlinko({balance:3772,wager:100,balls:10}).action.disabled,false);
});
test('Plinko rejects invalid per-ball wagers even when the player has sufficient points',()=>{
 assert.equal(mountPlinko({balance:5000,wager:9,balls:1}).action.disabled,true);
 assert.equal(mountPlinko({balance:20000,wager:1001,balls:1}).action.disabled,false);
 assert.equal(mountPlinko({balance:20000,wager:10001,balls:1}).action.disabled,true);
 assert.equal(mountPlinko({balance:20000,wager:10000,balls:1}).action.disabled,false);
});
