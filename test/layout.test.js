// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sbs-layout-'));
Object.assign(process.env,{
  NODE_ENV:'test',DB_PATH:join(dir,'layout.sqlite'),
  DISCORD_CLIENT_ID:'100000000000000011',DISCORD_CLIENT_SECRET:'fake',
  DISCORD_BOT_TOKEN:'fake',DISCORD_GUILD_ID:'100000000000000001'
});
const {home,avatar}=await import('../src/views.js');
const {createServer}=await import('../src/server.js');
const {db}=await import('../src/db.js');
let server;
after(async()=>{
  if(server) await new Promise(resolve=>server.close(resolve));
  db.close();rmSync(dir,{recursive:true,force:true});
});
const blank={pathname:'/',user:null,role:'none',csrf:'',config:{}};
const signed={...blank,user:{id:'100000000000000002',username:'sbs-user',display_name:'SB'},role:'owner',csrf:'fake'};
test('new pages request a versioned stylesheet and logo instead of reusing the previous theme',()=>{
  const page=home(blank);
  assert.match(page,/\/static\/style\.css\?v=1\.2\.1-layout-fix/);
  assert.match(page,/\/static\/app\.js\?v=1\.2\.1-layout-fix/);
  assert.match(page,/class="brand-logo"[^>]+width="44" height="44"/);
  assert.match(page,/class="hero-logo"><img[^>]+width="148" height="148"/);
  assert.match(page,/<div class="sidebar-scroll">/);
  assert.doesNotMatch(page,/rel="stylesheet"[^>]* defer/);
});
test('signed-in avatars specify safe dimensions and mobile header remains CSS-controlled',()=>{
  const page=home(signed);
  assert.match(page,/class="top-account">[\s\S]*class="avatar sm"[^>]+width="32" height="32"/);
  assert.match(page,/class="side-profile"[^>]*>[\s\S]*class="avatar side"[^>]+width="40" height="40"/);
  assert.match(page,/class="mobile-brand"[^>]+>[\s\S]*width="36" height="36"/);
  assert.match(avatar(signed.user,'xxl'),/width="106" height="106"/);
  assert.match(avatar(signed.user,'unrecognized'),/width="43" height="43"/);
});
test('stylesheet has responsive image constraints and hides desktop mobile brand',()=>{
  const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
  assert.match(css,/\.topbar \.mobile-brand\s*\{display:none\}/);
  assert.match(css,/@media\(max-width:840px\)\s*\{\.topbar \.mobile-brand\s*\{display:flex/);
  assert.match(css,/\.hero-logo img\s*\{[^}]*width:148px;[^}]*height:148px/);
  assert.match(css,/\.sidebar-scroll\s*\{[^}]*overflow-y:auto/);
});
test('static CSS and JS are served no-store even with version query; logo is recognized',async()=>{
  server=createServer({discord:{}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/static/style.css?v=1.2.1-layout-fix','/static/app.js?v=1.2.1-layout-fix']){
    const resp=await fetch(base+path);
    assert.equal(resp.status,200);
    assert.match(resp.headers.get('cache-control'),/no-store/);
  }
  const logo=await fetch(base+'/static/sb-logo.png?v=1.2.1-layout-fix');
  assert.equal(logo.status,200);
  assert.equal(logo.headers.get('content-type'),'image/png');
});
