// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Browser-level regression for a real Solo Blackjack action button:
// AJAX cards update normally; a failed fetch falls back to the SAME native
// POST with the SAME UUID so server-side deduplication prevents a double move.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/solo-blackjack.js',import.meta.url),'utf8');
const startState=()=>({
 phase:'playing',roundId:42,revision:3,balance:3722,
 lastWager:50,lastWagerAt:1,initialWager:50,activeIndex:0,
 dealer:[{rank:'4',suit:'C'},{back:true}],
 hands:[{cards:[{rank:'7',suit:'C'},{rank:'Q',suit:'S'}],
  value:{total:17,soft:false},wager:50,done:false}],
 actions:['hit','stand','double'],cinematic:false
});
function fakeBrowser(response){
 const events={},calls=[],native=[],formFields=[
  ['_csrf','sessioncsrf'],['round_id','42'],['revision','3'],
  ['request_id','7b83cb79-62cd-4d3f-8a33-ec298fe2d1df'],['action','stand']
 ];
 let value=startState();
 const table={innerHTML:'',querySelectorAll:()=>[]};
 const button={disabled:false,isConnected:true};
 const controls={
  innerHTML:'',
  querySelector(sel){return sel==='[data-sbj-wager]'?null:null;},
  querySelectorAll(sel){return sel==='button'?[button]:[]}
 };
 const connection={textContent:'',classList:{toggle(){},remove(){}}};
 class FakeForm{
  constructor(){this.isConnected=true;this.action='https://sbstore.info/arcade/blackjack/action';}
  reportValidity(){return true;}
  querySelector(sel){
   if(sel==='button[type="submit"]')return button;
   if(sel==='input[name="action"]')return {value:'stand'};
   return null;
  }
  matches(sel){return sel==='[data-sbj-form]';}
  setAttribute(name,value){this[name]=value;}
  submit(){native.push(formFields.map(x=>[...x]));}
 }
 class FakeFormData{
  constructor(form){assert.ok(form instanceof FakeForm);this.values=formFields;}
  [Symbol.iterator](){return this.values[Symbol.iterator]();}
 }
 const form=new FakeForm();
 const root={
  dataset:{sbjState:JSON.stringify(value)},
  querySelector(sel){
   return {
    '[data-sbj-table]':table,'[data-sbj-controls]':controls,
    '[data-sbj-connection]':connection
   }[sel]||null;
  },
  contains(node){return node===form;},
  closest(){return null;}
 };
 const document={
  body:{dataset:{siteUser:'100000000000000181',siteCsrf:'sessioncsrf'}},
  querySelector(sel){return sel==='[data-solo-blackjack-root]'?root:null;},
  addEventListener(name,handler){events[name]=handler;},
  visibilityState:'visible'
 };
 const window={addEventListener(){},matchMedia(){return {matches:false}}};
 const fetch=async(url,options)=>{
  calls.push({url,options});
  return typeof response==='function'?response(url,options):response;
 };
 runInNewContext(source,{
  document,window,fetch,HTMLFormElement:FakeForm,FormData:FakeFormData,
  URLSearchParams,localStorage:{getItem(){return null;},setItem(){}},
  setTimeout(){return 1;},clearTimeout(){},history:{replaceState(){}}
 },{timeout:2000,filename:'public/solo-blackjack.js'});
 const fire=()=>{
  let prevented=false;
  events.submit({target:form,preventDefault(){prevented=true;}});
  return prevented;
 };
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {fire,flush,calls,native,form,button,connection,controls,table};
}

test('Solo Blackjack Hit/Stand form sends its real round, revision, csrf and UUID',async()=>{
 const state={...startState(),revision:4,hands:[{...startState().hands[0],done:true}],phase:'settled'};
 const b=fakeBrowser(async()=>({
  ok:true,status:200,type:'basic',
  json:async()=>({ok:true,state,table:'<div>Dealer cards revealed</div>',
   controls:'<div>Round complete</div>'})
 }));
 assert.equal(b.fire(),true);
 await b.flush();
 assert.equal(b.calls.length,1);
 assert.match(b.calls[0].url,/\/arcade\/blackjack\/action$/);
 const fields=new URLSearchParams(b.calls[0].options.body);
 assert.equal(fields.get('round_id'),'42');
 assert.equal(fields.get('revision'),'3');
 assert.equal(fields.get('action'),'stand');
 assert.equal(fields.get('_csrf'),'sessioncsrf');
 assert.equal(fields.get('request_id'),'7b83cb79-62cd-4d3f-8a33-ec298fe2d1df');
 assert.equal(b.native.length,0);
 assert.equal(b.controls.innerHTML,'<div>Round complete</div>');
 assert.match(b.connection.textContent,/Round confirmed/);
});
test('Failed AJAX Blackjack request safely reuses the same UUID via browser-native POST',async()=>{
 const b=fakeBrowser(async()=>{throw new Error('Network unavailable');});
 assert.equal(b.fire(),true);
 await b.flush();
 assert.equal(b.calls.length,1);
 assert.equal(b.native.length,1);
 assert.equal(b.form['data-sbj-native-fallback'],'1');
 const fields=new URLSearchParams(b.calls[0].options.body);
 assert.equal(b.native[0].find(([key])=>key==='request_id')?.[1],
  fields.get('request_id'));
 assert.equal(b.native[0].find(([key])=>key==='action')?.[1],'stand');
 assert.equal(b.button.disabled,false);
});
test('Unexpected login redirect response uses the native form path, never a fresh request ID',async()=>{
 const b=fakeBrowser(async()=>({status:0,type:'opaqueredirect'}));
 b.fire();await b.flush();
 assert.equal(b.native.length,1);
 assert.equal(b.calls.length,1);
});
