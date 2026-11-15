// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Regression for the real Online Blackjack "Not found" error: an
// <input name="action"> can shadow HTMLFormElement.action in browsers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';

const source=readFileSync(new URL('../public/online-blackjack.js',import.meta.url),'utf8');
const user='100000000000000181';
const key='7b83cb79-62cd-4d3f-8a33-ec298fe2d1df';

function page(phase='playing'){
 let current={
  roundId:42,phase,seq:3,serverTime:Date.now(),joined:true,reserved:true,
  seats:4,canBet:phase==='betting',placedBet:0,
  balance:3700,roundPlayers:1,roundWager:100,lastWager:50,
  startsAt:Date.now()+25000,turnDeadline:Date.now()+17000,endsAt:Date.now()+40000,
  turnUser:user,handIndex:0,
  actions:phase==='playing'?['hit','stand','double']:[],
  dealer:[],players:[],myResult:null
 };
 const requests=[],handlers={},controls={innerHTML:'',querySelector(){return null;},
  querySelectorAll(){return [{disabled:false}]}};
 const table={innerHTML:''},countdown={textContent:''},wallet={textContent:''};
 const connection={textContent:''};
 const root={
  querySelector(selector){
   return {
    '[data-bj-connection]':connection,'[data-bj-table]':table,
    '[data-bj-action-panel]':controls,'[data-bj-countdown]':countdown,
    '[data-bj-wallet]':wallet
   }[selector]||null;
  },
  contains(el){return el instanceof MockForm;}
 };
 class MockForm{
  constructor({route='/arcade/online/blackjack/action',move='hit',legacy=false}={}){
   this.route=route;this.move=move;this.legacy=legacy;
   // Deliberately simulate real DOM named-property clobbering:
   // form.action is the input element rather than the action URL.
   this.action={name:'action',value:move,toString(){return '[object HTMLInputElement]';}};
  }
  matches(selector){return selector==='[data-blackjack-form]'||
   (selector==='[data-bj-bet]'&&this.route.endsWith('/bet'));}
  getAttribute(name){return name==='action'?this.route:null;}
  querySelector(selector){
   if(selector==='input[name="request_id"]')return {value:key};
   if(selector==='input[name="round_id"]')return {value:'42'};
   if(selector==='input[name="seq"]')return {value:'3'};
   if(selector==='input[name="move"],input[name="action"]')return {value:this.move};
   if(selector==='input[name="wager"]')return {value:'100'};
   return null;
  }
  reportValidity(){return true;}
 }
 const document={
  body:{dataset:{siteUser:user,siteCsrf:'csrf-token'}},
  querySelector(selector){return selector==='[data-blackjack-root]'?root:null;},
  addEventListener(name,callback){handlers[name]=callback;},
  visibilityState:'visible'
 };
 const fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(url==='/arcade/online/blackjack/state')return {ok:true,status:200,json:async()=>current};
  if(url==='/arcade/online/blackjack/action'||
     url==='/arcade/online/blackjack/bet'){
   const params=new URLSearchParams(opts.body);
   if(url.endsWith('/action')&&params.get('move')!=='hit'&&params.get('move')!=='stand')
    return {ok:false,status:400,json:async()=>({error:'Invalid move'})};
   current={...current,seq:current.seq+1,actions:[],
    canBet:false,placedBet:url.endsWith('/bet')?100:0};
   return {ok:true,status:200,json:async()=>current};
  }
  return {ok:false,status:404,json:async()=>({error:'Not found.'})};
 };
 runInNewContext(source,{
  document,window:{addEventListener(){},SBArcadeExperience:null},
  localStorage:{getItem(){return null;},setItem(){}},
  fetch,URLSearchParams,HTMLFormElement:MockForm,
  crypto:{randomUUID},setInterval(){return 1;},clearInterval(){}
 },{timeout:2000,filename:'public/online-blackjack.js'});
 return {
  controls,connection,requests,
  submit(form){
   let prevented=false;
   handlers.submit({target:form,preventDefault(){prevented=true;}});
   return prevented;
  },
  makeForm:settings=>new MockForm(settings),
  flush:async()=>{
   // One turn initializes table state, another completes any action + poll.
   for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  }
 };
}
test('Online Hit/Stand/Double Down forms use move, never a shadowing action input',async()=>{
 const browser=page();
 await browser.flush();
 assert.match(browser.controls.innerHTML,/name="move" value="hit"/);
 assert.match(browser.controls.innerHTML,/name="move" value="stand"/);
 assert.match(browser.controls.innerHTML,/name="move" value="double"/);
 assert.doesNotMatch(browser.controls.innerHTML,/name="action" value="/);
 assert.match(browser.controls.innerHTML,/name="seq" value="3"/);
 assert.match(browser.controls.innerHTML,/name="request_id"/);
});
test('Hit sends the correct request despite form.action being an HTMLInputElement',async()=>{
 const browser=page();
 await browser.flush();
 const form=browser.makeForm({move:'hit'});
 assert.equal(browser.submit(form),true);
 await browser.flush();
 const posts=browser.requests.filter(call=>call.opts?.method==='POST');
 assert.equal(posts.length,1);
 assert.equal(posts[0].url,'/arcade/online/blackjack/action');
 const fields=new URLSearchParams(posts[0].opts.body);
 assert.equal(fields.get('move'),'hit');
 assert.equal(fields.get('action'),null);
 assert.equal(fields.get('round_id'),'42');
 assert.equal(fields.get('seq'),'3');
 assert.equal(fields.get('request_id'),key);
 assert.equal(fields.get('_csrf'),'csrf-token');
 assert.doesNotMatch(browser.connection.textContent,/Not found/i);
});
test('Already-open legacy forms still submit safely using the real form attribute',async()=>{
 const browser=page();
 await browser.flush();
 const oldForm=browser.makeForm({move:'stand',legacy:true});
 assert.equal(oldForm.action.name,'action');
 browser.submit(oldForm);
 await browser.flush();
 const posts=browser.requests.filter(call=>call.opts?.method==='POST');
 assert.equal(posts.length,1);
 assert.equal(posts[0].url,'/arcade/online/blackjack/action');
 assert.equal(new URLSearchParams(posts[0].opts.body).get('move'),'stand');
});
test('Wager forms also use a fixed, validated endpoint and retain the request ID',async()=>{
 const browser=page('betting');
 await browser.flush();
 assert.match(browser.controls.innerHTML,/name="request_id"/);
 assert.match(browser.controls.innerHTML,/name="_csrf"/);
 const form=browser.makeForm({route:'/arcade/online/blackjack/bet'});
 browser.submit(form);
 await browser.flush();
 const posts=browser.requests.filter(call=>call.opts?.method==='POST');
 assert.equal(posts.length,1);
 assert.equal(posts[0].url,'/arcade/online/blackjack/bet');
 const data=new URLSearchParams(posts[0].opts.body);
 assert.equal(data.get('wager'),'100');
 assert.equal(data.get('request_id'),key);
 assert.equal(data.get('round_id'),'42');
});
test('Unexpected destinations never send points or card actions',async()=>{
 const browser=page();
 await browser.flush();
 const form=browser.makeForm({route:'/unexpected-action'});
 browser.submit(form);
 await browser.flush();
 assert.equal(browser.requests.filter(call=>call.opts?.method==='POST').length,0);
 assert.match(browser.connection.textContent,/Invalid Blackjack form URL/);
});
