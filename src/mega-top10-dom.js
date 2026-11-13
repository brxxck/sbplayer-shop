// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Parse only rendered InPvP leaderboard text and visible team rows.
// No undocumented API, network interception, or private session extraction.
const money=/^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i;
const name=/^[a-z0-9][a-z0-9 _#.'-]{0,63}$/i;
const rank=/^#?\s*(10|[1-9])$/;
const views=/^[\d,]+$/;
const level=/^\d{1,6}$/;
const norm=value=>String(value??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const number=value=>views.test(value)?Number(value.replaceAll(',','')):null;

function normalizedRow(raw){
 if(!raw||typeof raw!=='object')return null;
 const numberRank=Number(String(raw.rank||'').replace('#','').trim());
 if(!Number.isInteger(numberRank)||numberRank<1||numberRank>10)return null;
 const team=norm(raw.name);
 if(!name.test(team)||team.length>64)return null;
 return {
  rank:numberRank,name:team,external:String(raw.external||'').slice(0,500),
  dataId:String(raw.dataId||'').slice(0,100),
  index:Number.isInteger(raw.index)?raw.index:-1,
  selector:typeof raw.selector==='string'?raw.selector:'',
  views:number(norm(raw.views)),
  bankText:money.test(norm(raw.bankText))?norm(raw.bankText):null,
  level:level.test(norm(raw.level))?Number(norm(raw.level)):null,
  discovery:typeof raw.discovery==='string'?raw.discovery:(raw.selector?'table':'text')
 };
}
function fromCells(cells){
 if(!Array.isArray(cells)||cells.length<5)return null;
 const raw=cells.map(norm);
 if(!rank.test(raw[0]))return null;
 const n=raw[1],v=raw[2],b=raw[3],l=raw[4];
 if(!name.test(n)||!views.test(v)||!money.test(b)||!level.test(l))return null;
 return normalizedRow({
  rank:raw[0],name:n,views:v,bankText:b,level:l,
  discovery:'text'
 });
}
function fromTextLine(line){
 // Visual rows may flatten to a single line in Next/React CSS-grid layouts.
 const m=/^#?\s*(10|[1-9])\s+(.{1,64}?)\s+([\d,]+)\s+(\$[\d,]+(?:\.\d{1,3})?[KMBT]?)\s+(\d{1,6})$/i.exec(norm(line));
 if(!m)return null;
 return fromCells([m[1],m[2],m[3],m[4],m[5]]);
}
function candidateRowsFromText(text){
 const lines=String(text||'').replace(/\r/g,'').split('\n').map(norm).filter(Boolean).slice(0,1600);
 const out=[];
 for(let i=0;i<lines.length;i++){
  const line=fromTextLine(lines[i]);
  if(line){out.push(line);continue;}
  // Many data tables expose each rendered cell as a distinct text line.
  if(rank.test(lines[i])){
   const cells=lines.slice(i,i+5);
   const vertical=fromCells(cells);
   if(vertical){out.push(vertical);i+=4;continue;}
  }
  // Some component libraries put the rank and name in the same text node.
  const first=/^#?\s*(10|[1-9])\s+(.+)$/i.exec(lines[i]);
  if(first&&i+3<lines.length){
   const split=fromCells([first[1],first[2],...lines.slice(i+1,i+4)]);
   if(split){out.push(split);i+=3;}
  }
 }
 return out;
}

export function parseTop10Snapshot(snapshot){
 // Historical in-memory tests used a bare array of row objects.
 if(Array.isArray(snapshot)){
  const rows=snapshot.map(normalizedRow).filter(Boolean);
  return {rows:dedup(rows),diagnostics:{mode:'test-fixture',structured:rows.length}};
 }
 if(!snapshot||typeof snapshot!=='object')
  return {rows:[],diagnostics:{mode:'unavailable'}};
 const sources=[
  ...(Array.isArray(snapshot.tableRows)?snapshot.tableRows:[]).map(x=>({...x,discovery:'table'})),
  ...(Array.isArray(snapshot.roleRows)?snapshot.roleRows:[]).map(x=>({...x,discovery:'role'})),
  ...(Array.isArray(snapshot.styledRows)?snapshot.styledRows:[]).map(x=>({...x,discovery:'styled'}))
 ];
 const domRows=sources.map(normalizedRow).filter(Boolean);
 const textRows=candidateRowsFromText(snapshot.visibleText);
 const rows=dedup(domRows.concat(textRows));
 const hints=snapshot.hints||{};
 const diagnostics={
  mode:rows.length>=10?'found':hints.syncing?'upstream-sync':hints.verification?'verification':
    hints.login?'sign-in':hints.tableCount||hints.roleCount||hints.styledCount?'layout':'empty',
  rows:rows.length,fromDom:domRows.length,fromText:textRows.length,
  tableCount:bounded(hints.tableCount),roleCount:bounded(hints.roleCount),
  styledCount:bounded(hints.styledCount),
  syncing:!!hints.syncing,verification:!!hints.verification,
  login:!!hints.login,search:!!hints.search,columns:!!hints.columns
 };
 return {rows,diagnostics};
}
const bounded=n=>Number.isInteger(n)&&n>=0&&n<=100000?n:0;
function dedup(rows){
 const found=new Map();
 for(const entry of rows){
  if(!entry)continue;
  const old=found.get(entry.rank);
  if(!old||old.name.toLowerCase()===entry.name.toLowerCase()){
   if(!old||(!old.external&&entry.external))found.set(entry.rank,entry);
  }else {
   // Conflicting names at one rank: do not trust either result.
   found.set(entry.rank,{...entry,conflict:true});
  }
 }
 return [...found.values()].filter(x=>!x.conflict).sort((a,b)=>a.rank-b.rank).slice(0,10);
}
