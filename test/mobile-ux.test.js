// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {renderMobile,navigationGroups}=await import('../src/navigation.js');
const css=readFileSync(new URL('../public/mobile.css',import.meta.url),'utf8');
const script=readFileSync(new URL('../public/mobile.js',import.meta.url),'utf8');
const views=readFileSync(new URL('../src/views.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const user={id:'100000000000000001',username:'tester',display_name:'Tester'};
const ctx=(role,pathname='/')=>({user,role,pathname});
const route=(html,p)=>html.includes('href="'+p+'"');
const count=(text,part)=>(text.match(new RegExp(part,'g'))||[]).length;

test('one mobile navigation groups all games within a single Arcade destination',()=>{
 const html=renderMobile(ctx('owner','/arcade/coinflip'));
 assert.match(html,/class="mobile-nav-tab"/);
 assert.match(html,/href="\/arcade"/);
 assert.match(html,/Arcade/);
 assert.match(html,/data-mobile-more/);
 assert.match(html,/data-mobile-page-search/);
 assert.match(html,/Browse the website/);
 assert.equal(count(html,'href="/arcade"'),1);
 assert.doesNotMatch(html,/href="\/arcade\/(coinflip|slots|mines|crash)"/);
 assert.match(html,/mobile-nav-icon/);
});

test('the mobile More menu preserves existing group labels and role permissions',()=>{
 const member=renderMobile(ctx('member','/feed'));
 const owner=renderMobile(ctx('owner','/owner/audit'));
 const appeal=renderMobile(ctx('appeal-only','/tickets/mine'));
 assert.ok(route(member,'/points'));
 assert.ok(route(member,'/tickets/mine'));
 assert.ok(route(member,'/mega-team/leaderboard'));
 assert.ok(!route(member,'/owner/audit'));
 assert.ok(!route(member,'/admin/roles'));
 assert.ok(route(owner,'/owner/audit'));
 assert.ok(route(owner,'/admin/roles'));
 assert.ok(!route(appeal,'/arcade'));
 assert.ok(route(appeal,'/tickets/mine'));
 assert.ok(route(appeal,'/team'));
 assert.ok(!route(appeal,'/messages'));
 assert.deepEqual(navigationGroups(ctx('owner')).find(group=>group.label==='Owner').items.some(([p])=>p==='/owner/audit'),true);
});

test('mobile tab stays active within game subpages and nav labels remain accessible',()=>{
 const html=renderMobile(ctx('member','/arcade/mines'));
 assert.match(html,/<a class="mobile-nav-tab" href="\/arcade" aria-current="page"/);
 assert.match(html,/aria-label="More pages"/);
 assert.match(html,/aria-label="Close page menu"/);
 assert.match(html,/aria-label="All website pages"/);
 assert.match(html,/aria-hidden="true"/);
 assert.match(html,/class="mobile-menu-section"/);
 assert.match(html,/href="\/points"/);
});

test('mobile stylesheet is isolated to mobile breakpoints and covers common site pages',()=>{
 const first=css.indexOf('@media');
 const before=css.slice(0,first);
 assert.ok(before.includes('BUILT BY SB'));
 assert.doesNotMatch(before,/\{[^}]+:[^}]+\}/,'no desktop CSS declarations outside media queries');
 assert.match(css,/@media \(max-width:840px\)/);
 assert.match(css,/@media \(max-width:480px\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/position:fixed/);
 for(const selector of ['.mobile-nav','.mobile-more','.mobile-menu-section','.table-wrap','.dm-history','.profile-page','.ticket-compose-actions','.arcade-tabs','.member-grid','.mega-top-kpis','.evidence-viewer-header']){
   assert.ok(css.includes(selector),'missing mobile handling: '+selector);
 }
 assert.doesNotMatch(css,/display\s*:\s*none\s*!important\s*;[^}]*\.content/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('mobile script supports closing menu and page search without changing desktop routes',()=>{
 assert.match(script,/matchMedia\('\(max-width:840px\)'\)/);
 assert.match(script,/event\.key!=='Escape'/);
 assert.match(script,/setOpen\(false\)/);
 assert.match(script,/page-find-button/);
 assert.match(script,/aria-expanded/);
 assert.match(script,/\.content table/);
 assert.match(script,/if\(media\.matches\)/);
 assert.doesNotMatch(script,/fetch\(|localStorage|sessionStorage/);
});

test('mobile assets are loaded after desktop CSS and served through approved static routes',()=>{
 assert.match(views,/\/static\/mobile\.css\?v=\$\{assetVersion\}-mobile-first-r1/);
 assert.match(views,/\/static\/mobile\.js\?v=\$\{assetVersion\}/);
 assert.ok(views.indexOf('/static/upgrade.css')<views.indexOf('/static/mobile.css'));
 assert.ok(server.includes("'/static/mobile.css'"));
 assert.ok(server.includes("'/static/mobile.js'"));
 assert.ok(!server.includes("window.location.assign('/arcade')"));
});


test('arcade includes a real mobile game picker, with Live Roulette and Blackjack supported',()=>{
 const arcade=readFileSync(new URL('../src/arcade-views.js',import.meta.url),'utf8');
 const roulette=readFileSync(new URL('../src/online-roulette-views.js',import.meta.url),'utf8');
 const blackjack=readFileSync(new URL('../src/online-blackjack-views.js',import.meta.url),'utf8');
 assert.match(arcade,/export const arcadeMobileMenu=/);
 assert.match(arcade,/class="arcade-game-menu"/);
 assert.match(arcade,/aria-label="Choose an arcade game"/);
 assert.match(arcade,/mobileGameMenu=arcadeMobileMenu\(ctx,page\)/);
 assert.match(roulette,/arcadeMobileMenu\(ctx,'Live Roulette'\)/);
 assert.match(blackjack,/arcadeMobileMenu\(ctx,'Online Blackjack'\)/);
 assert.doesNotMatch(arcade,/mobileGames=[\s\S]*?Global Crash/);
});

test('mobile game views are compact without removing accessible wager and action controls',()=>{
 const solo=readFileSync(new URL('../src/solo-blackjack-views.js',import.meta.url),'utf8');
 assert.match(css,/SB MOBILE-FIRST OVERHAUL/);
 assert.match(css,/\.sbj-intro \{ display:none;/);
 assert.match(css,/\.sbj-root:has\(\.sbj-felt\[data-sbj-phase="playing"\]\)/);
 assert.match(css,/\.sbj-wager-form \{ display:grid/);
 assert.match(css,/\.sbj-action-buttons button/);
 assert.match(css,/\.bj-actions button/);
 assert.match(css,/\.roulette-number-grid \{ min-width:0/);
 assert.match(css,/\.roulette-number-row \{ display:grid; grid-template-columns:repeat\(3/);
 assert.match(css,/\.arcade-tabs \{ display:none!important;/);
 assert.match(css,/\.arcade-game-menu > nav a/);
 assert.match(solo,/data-sbj-controls/);
 assert.match(solo,/data-sbj-table/);
});

test('mobile patch stays entirely in responsive media queries',()=>{
 const start=css.indexOf('/* SB MOBILE-FIRST OVERHAUL');
 assert.ok(start>0);
 const section=css.slice(start);
 const pos=section.indexOf('@media (max-width:840px)');
 assert.ok(pos>0,'no global desktop rules before the mobile breakpoint');
 const before=section.slice(0,pos).replace(/\*\/[\s\S]*?\/\*/g,'');
 assert.doesNotMatch(before,/(^|\})\s*\.[\w-]+\s*\{/);
});


test('desktop arcade does not show duplicate mobile game menu',()=>{
 const arcadeCss=readFileSync(new URL('../public/arcade.css',import.meta.url),'utf8');
 assert.match(arcadeCss,/\.arcade-game-menu\{display:none\}/);
 assert.match(css,/\.arcade-game-menu \{ display:block;/);
 assert.match(views,/global-crash-disabled-v1-mobile-first-r1/);
});
