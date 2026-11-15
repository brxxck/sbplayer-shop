// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// A real Canvas transformation regression for roulette. The previous code
// drew ALL 37 labels and the gold result ring 90 degrees off their pockets.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {ROULETTE_WHEEL} from '../src/roulette-rules.js';

const source=readFileSync(new URL('../public/online-roulette.js',import.meta.url),'utf8');
const slice=Math.PI*2/37;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const expected=(index,radius=224)=>({
 x:320+radius*Math.cos(-Math.PI/2+index*slice+.45),
 y:320+radius*Math.sin(-Math.PI/2+index*slice+.45)
});
function drawWithFakeCanvas(winningNumber=null){
 const labels=[],rings=[],queue=[];
 let matrix=[1,0,0,1,0,0],stack=[];
 const transform=(x,y)=>({
  x:matrix[0]*x+matrix[2]*y+matrix[4],
  y:matrix[1]*x+matrix[3]*y+matrix[5]
 });
 const pen={
  save(){stack.push([...matrix]);},
  restore(){matrix=stack.pop();assert.ok(matrix);},
  translate(x,y){
   matrix[4]+=matrix[0]*x+matrix[2]*y;
   matrix[5]+=matrix[1]*x+matrix[3]*y;
  },
  rotate(rad){
   const [a,b,c,d]=matrix,cos=Math.cos(rad),sin=Math.sin(rad);
   matrix[0]=a*cos+c*sin;matrix[1]=b*cos+d*sin;
   matrix[2]=c*cos-a*sin;matrix[3]=d*cos-b*sin;
  },
  setTransform(a,b,c,d,e,f){matrix=[a,b,c,d,e,f];},
  clearRect(){},beginPath(){},closePath(){},fill(){},stroke(){},
  moveTo(){},lineTo(){},
  arc(x,y,r){
   if(r===15||r===13)rings.push({point:transform(x,y),radius:r});
  },
  createRadialGradient(){return {addColorStop(){}};},
  strokeText(){},
  fillText(value,x,y){
   labels.push({text:String(value),point:transform(x,y),
    angle:Math.atan2(matrix[1],matrix[0]),font:this.font});
  }
 };
 const canvas={width:640,height:640,getContext(){return pen;}};
 const primitive=()=>({
  dataset:{},classList:{toggle(){},add(){},remove(){}},
  setAttribute(){},getAttribute(){return '';},querySelector(){return primitive();},
  innerHTML:'',textContent:'',value:'',disabled:false,hidden:false
 });
 const shared=primitive();
 const form={querySelector(){return primitive();},action:'/arcade/online/roulette/bet'};
 const now=Date.now(),results=winningNumber!==null;
 const round={
  roundId:123,version:1,phase:results?'results':'betting',
  serverTime:now,createdAt:now-5000,
  betClosesAt:results?now-9000:now+25000,
  spinEndsAt:results?now-1000:now+33000,
  resultsEndsAt:results?now+3000:now+37000,
  roundPlayers:0,roundWager:0,watching:0,
  commitment:'hidden',seed:null,winningNumber,
  myProfit:0,myWager:0,myBets:[],repeatBets:[],
  remainingBudget:10000,balance:5000,
  participants:[],history:[],cinematic:false,canBet:!results
 };
 const root={
  dataset:{rouletteState:JSON.stringify(round),
   rouletteWheel:JSON.stringify(ROULETTE_WHEEL),rouletteCatalog:'[]'},
  querySelector(selector){
   if(selector==='[data-roulette-canvas]')return canvas;
   if(selector==='[data-roulette-form]')return form;
   return shared;
  },
  querySelectorAll(){return [];},contains(){return true;},append(){}
 };
 const document={
  body:{dataset:{siteCsrf:'test',siteUser:'100000000000000181'}},
  querySelector(sel){return sel==='[data-roulette-root]'?root:null;},
  addEventListener(){},visibilityState:'visible'
 };
 const window={devicePixelRatio:1,SBArcadeExperience:{
  getPreferences(){return {motion:'full'};},play(){}},
  matchMedia(){return {matches:false};},addEventListener(){}};
 runInNewContext(source,{
  window,document,crypto:{randomUUID},setInterval(){return 1;},
  clearInterval(){},cancelAnimationFrame(){},
  requestAnimationFrame(callback){queue.push(callback);return queue.length;},
  fetch(){return new Promise(()=>{});},
  localStorage:{getItem(){return null;},setItem(){}}
 },{timeout:2000,filename:'public/online-roulette.js'});
 assert.ok(queue.length>0,'Wheel rendering frame was scheduled');
 queue[0](33);
 return {labels,rings};
}
test('All 37 European Roulette labels sit at pocket midpoints and remain upright',()=>{
 const {labels}=drawWithFakeCanvas();
 assert.equal(labels.length,37);
 for(let i=0;i<37;i++){
  const label=labels[i];
  assert.equal(label.text,String(ROULETTE_WHEEL[i]));
  assert.ok(distance(label.point,expected(i))<0.01,
   'Number '+label.text+' must be centered in its true colour pocket');
  assert.ok(Math.abs(label.angle)<0.0001,'Text must remain upright for pocket '+i);
  assert.ok(parseInt(label.font.match(/\d+px/)?.[0]||'0',10)>=20,
   'Double-digit labels must be large enough to read on mobile');
 }
});
test('Winning Roulette number and highlighted circle use the SAME rendered pocket coordinates',()=>{
 for(const winningNumber of [0,17,32,36]){
  const {labels,rings}=drawWithFakeCanvas(winningNumber);
  assert.equal(rings.length,1);
  assert.equal(rings[0].radius,15);
  const index=ROULETTE_WHEEL.indexOf(winningNumber);
  const expectedRing=expected(index,225);
  assert.ok(distance(rings[0].point,expectedRing)<0.01,
   'Result circle must highlight the pocket containing the winning number');
  assert.ok(distance(labels[index].point,rings[0].point)<1.1,
   'Winning number label and highlight must overlap correctly');
 }
});
