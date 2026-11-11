// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomBytes} from 'node:crypto';
import {writeFileSync,statSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from './config.js';
const uploads=resolve(root,'public/uploads');
const MAX_BODY=5*1024*1024;
export async function parseRequestBody(req) {
  const parts=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('Upload too large (maximum 4 MB per image).'),{status:413});parts.push(chunk);}
  const buffer=Buffer.concat(parts);
  const type=String(req.headers['content-type']||'');
  if(type.startsWith('application/x-www-form-urlencoded')){
    if(buffer.length>200*1024)throw Object.assign(new Error('Form too long.'),{status:413});
    return {fields:Object.fromEntries(new URLSearchParams(buffer.toString('utf8'))),files:{}};
  }
  if(type.startsWith('multipart/form-data')){
    const m=/boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type);if(!m)throw Object.assign(new Error('Malformed upload.'),{status:400});
    const boundary='--'+(m[1]||m[2]);if(boundary.length>130)throw Object.assign(new Error('Invalid upload boundary.'),{status:400});
    const delimiter=Buffer.from(boundary);const fields={};const files={};let pos=buffer.indexOf(delimiter);let count=0;
    while(pos>=0 && count++<35){
      pos+=delimiter.length;if(buffer.subarray(pos,pos+2).toString()==='--')break;
      if(buffer.subarray(pos,pos+2).toString()!=='\r\n')break;
      pos+=2;const headEnd=buffer.indexOf('\r\n\r\n',pos);if(headEnd<0||headEnd-pos>2000)break;
      const header=buffer.subarray(pos,headEnd).toString('utf8');
      const disp=/content-disposition:\s*form-data;\s*name="([\w-]{1,60})"(?:;\s*filename="([^"]{0,150})")?/i.exec(header);
      if(!disp)break;
      const end=buffer.indexOf(Buffer.from('\r\n'+boundary),headEnd+4);
      if(end<0)break;
      const value=buffer.subarray(headEnd+4,end);const field=disp[1];
      if(disp[2]!==undefined){if(disp[2])files[field]={name:disp[2],buffer:value};}
      else if(value.length<10000)fields[field]=value.toString('utf8');
      pos=end+2;const next=buffer.indexOf(delimiter,pos);if(next!==pos)break;
    }
    return {fields,files};
  }
  if(buffer.length===0)return {fields:{},files:{}};
  throw Object.assign(new Error('Unsupported form encoding.'),{status:415});
}
export function imageExtension(b){
  if(b.length>4*1024*1024||b.length<12)return null;
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpg';
  if(b.subarray(0,6).toString('ascii')==='GIF87a'||b.subarray(0,6).toString('ascii')==='GIF89a')return 'gif';
  if(b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP')return 'webp';
  return null;
}
export function saveImage(file) {
  if(!file)return '';
  const ext=imageExtension(file.buffer);
  if(!ext)throw Object.assign(new Error('Use a valid PNG, JPEG, GIF or WebP image, max 4 MB.'),{status:400});
  const name=randomBytes(16).toString('hex')+'.'+ext;
  // Fresh installations may not yet have an uploads directory.
  mkdirSync(uploads,{recursive:true});
  writeFileSync(resolve(uploads,name),file.buffer,{flag:'wx',mode:0o644});
  return '/uploads/'+name;
}
export function safeImageFile(path) {
  if(!/^\/uploads\/[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(path))return null;
  const file=resolve(uploads,path.split('/').at(-1));return existsSync(file)&&statSync(file).isFile()?file:null;
}
