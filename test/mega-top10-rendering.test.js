// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const temp=mkdtempSync(join(tmpdir(),'sbs-top10-rendering-'));
process.env.NODE_ENV='test';
process.env.DB_PATH=join(temp,'render.sqlite');
const {db}=await import('../src/db.js');
const {parseTop10Snapshot}=await import('../src/mega-top10-dom.js');
const {captureTop10Leaderboard}=await import('../src/mega-top10-collector.js');
const {canonicalTeamLink,KNOWN_TEAM_LINKS}=await import('../src/mega-top10-store.js');
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

const example=[
 ['Abaddon','890','$1.0B','100'],
 ['SBsxScam','82','$40.3M','76'],
 ['Abyzz','56','$8.2M','75'],
 ['Abraxas','31','$44.9M','55'],
 ['Auryn','393','$177.1M','52'],
 ['MEOWxD','7','$0.00','40'],
 ['richmans','13','$591.2K','39'],
 ['Zr0','1,091','$25.6M','37'],
 ['LandLords','142','$143.4K','26'],
 ['IFranceI','6','$799.7K','25']
];
const rawText=()=>{
 const rows=example.map(([name,view,bank,level],i)=>
  [String(i+1),name,view,bank,level].join('\n')).join('\n');
 return 'Teams\nBrowse the top teams and explore their members, banks.\n'+
  'Sort by\nBank\nLevel\nTeam data updated 25 min ago\n'+
  '#\nTEAM\nVIEWS\nBANK\nLEVEL\n'+rows+'\n';
};
test('V1.8.1 recognizes a real-world vertical text layout without table elements',()=>{
 const parsed=parseTop10Snapshot({
  hints:{syncing:false,search:true,columns:true,tableCount:0,roleCount:0,styledCount:0},
  tableRows:[],roleRows:[],styledRows:[],visibleText:rawText()
 });
 assert.equal(parsed.rows.length,10);
 assert.equal(parsed.diagnostics.mode,'found');
 assert.equal(parsed.diagnostics.fromDom,0);
 assert.equal(parsed.diagnostics.fromText,10);
 assert.deepEqual(parsed.rows.map(r=>r.name),example.map(x=>x[0]));
 assert.equal(parsed.rows[0].bankText,'$1.0B');
 assert.equal(parsed.rows[7].views,1091);
 assert.equal(parsed.rows[9].level,25);
});
test('V1.8.1 recognizes flat CSS grid text and normal native row snapshots',()=>{
 const flat=example.map(([name,view,bank,level],i)=>
  [i+1,name,view,bank,level].join(' ')).join('\n');
 const parsed=parseTop10Snapshot({visibleText:flat,hints:{styledCount:20}});
 assert.equal(parsed.rows.length,10);
 assert.equal(parsed.rows[1].bankText,'$40.3M');
 assert.equal(parsed.diagnostics.mode,'found');
 const array=example.map(([name,view,bank,level],i)=>({
  rank:i+1,name,views:view,bankText:bank,level,external:'',
  dataId:'',selector:'table tbody tr',index:i
 }));
 assert.equal(parseTop10Snapshot(array).rows.length,10);
 assert.equal(parseTop10Snapshot({tableRows:array,hints:{tableCount:10}}).rows.length,10);
});
test('sync placeholders and partial ranking never masquerade as verified Top 10',()=>{
 const placeholder=parseTop10Snapshot({
  hints:{syncing:true,search:true,tableCount:0,roleCount:0},
  visibleText:'Teams\nTeam data sync in progress'
 });
 assert.equal(placeholder.rows.length,0);
 assert.equal(placeholder.diagnostics.mode,'upstream-sync');
 assert.equal(placeholder.diagnostics.syncing,true);
 const partial=parseTop10Snapshot({
  hints:{syncing:false,tableCount:3},
  visibleText:'1\nAbaddon\n890\n$1.0B\n100\n2\nSBsxScam\n82\n$40.3M\n76\n'
 });
 assert.equal(partial.rows.length,2);
 assert.equal(partial.diagnostics.mode,'layout');
});
test('known team links allow discovery without clicking when table markup is absent',async()=>{
 let visits=0;
 const page={
  goto:async()=>{visits++;},
  evaluate:async()=>({hints:{syncing:false,columns:true},
   visibleText:rawText(),tableRows:[],styledRows:[],roleRows:[]})
 };
 const known=KNOWN_TEAM_LINKS.map(([name,id])=>({name,url:canonicalTeamLink(name,id)}));
 const observed=await captureTop10Leaderboard(page,{knownTeams:known});
 assert.equal(observed.length,10);
 assert.equal(observed[0].rank,1);
 assert.equal(observed[0].url,canonicalTeamLink('Abaddon',KNOWN_TEAM_LINKS[0][1]));
 assert.equal(observed[6].url,canonicalTeamLink('richmans','377007'));
 assert.equal(visits,1);
});
test('leaderboard failure exposes numeric readiness signals without user text',async()=>{
 let tries=0;
 const page={
  goto:async()=>{},
  evaluate:async()=>{tries++;return {hints:{
    syncing:true,tableCount:0,roleCount:0,styledCount:0,
    columns:false,login:false,verification:false
  },visibleText:'Team data sync in progress. Secret account token 12345'};},
  waitForTimeout:async()=>{}
 };
 await assert.rejects(
  ()=>captureTop10Leaderboard(page),
  error=>{
   assert.equal(error.safeDiagnostic.mode,'upstream-sync');
   assert.equal(error.safeDiagnostic.rows,0);
   assert.ok(!JSON.stringify(error.safeDiagnostic).includes('12345'));
   return true;
  }
 );
 assert.equal(tries,22,'page hydration retry is bounded');
});
