// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Solo Blackjack mobile layout is game-first; all server-side actions stay unchanged.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const view=file('src/solo-blackjack-views.js');
const chrome=file('src/arcade-views.js');
const js=file('public/solo-blackjack.js');
const mobile=file('public/mobile.css');
const solo=file('public/solo-blackjack.css');
const shell=file('src/views.js');

test('blackjack HTML retains the actual table before betting and action controls',()=>{
 const table=view.indexOf("'<div data-sbj-table>'");
 const controls=view.indexOf("'<section class=\"sbj-controls\"");
 assert.ok(table>0&&controls>table,'the dealt cards precede all mobile wagering controls');
 assert.match(view,/data-sbj-controls/);
 assert.match(view,/data-sbj-form/);
 assert.match(view,/data-sbj-start/);
 assert.match(view,/data-sbj-action/);
 assert.match(view,/name="move" value="/);
 assert.match(view,/name="request_id"/);
 assert.match(view,/name="revision"/);
 assert.match(view,/data-sbj-phase/);
});

test('Solo Blackjack options and full history collapse on phones, not desktop',()=>{
 assert.match(chrome,/arcade-root\$\{solo\?' arcade-solo'/);
 assert.match(chrome,/class="sbj-utilities" data-sbj-mobile-disclosure open/);
 assert.match(view,/sbj-rules-disclosure" data-sbj-mobile-disclosure open/);
 assert.match(view,/sbj-history-disclosure" data-sbj-mobile-disclosure open/);
 assert.match(js,/document\.querySelectorAll\?\.\('\[data-sbj-mobile-disclosure\]'\)/);
 assert.match(js,/disclosure\.open=!smallScreen\.matches/);
 assert.match(solo,/@media \(min-width:841px\)/);
 assert.match(solo,/\.arcade-solo \.sbj-lower-details \{ display:contents; \}/);
 assert.match(mobile,/\.arcade-solo \.sbj-lower-details > summary/);
});

test('Solo Blackjack exposes only five quick-bet presets while manual wager remains available',()=>{
 assert.match(view,/\[50,100,250,500,1000\]\.map/);
 assert.doesNotMatch(view,/\[10,25,50,100,250,500,1000\]\.map/);
 assert.match(view,/min="10" max="1000"/);
});

test('mobile puts card table before wager for all round phases and preserves live controls',()=>{
 assert.match(mobile,/SOLO BLACKJACK MOBILE GAME-FIRST V2/);
 assert.match(mobile,/\.arcade-solo \.sbj-root > \[data-sbj-table\]/);
 assert.match(mobile,/\[data-sbj-table\] \{ order:0;/);
 assert.match(mobile,/\.arcade-solo \.sbj-root:has\(\.sbj-felt\[data-sbj-phase="playing"\]\) > \[data-sbj-controls\] \{ order:1;/);
 assert.match(mobile,/position:sticky; bottom:calc\(74px/);
 assert.match(mobile,/\.arcade-solo \.sbj-stats,/);
 assert.match(mobile,/\.arcade-solo \.sbj-result>p \{ display:none; \}/);
 assert.match(mobile,/\.arcade-solo \.sbj-chip-values \{ display:grid; grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(mobile,/\.arcade-solo \.sbj-chip-values button:last-child \{ grid-column:auto; \}/);
 assert.match(mobile,/\.arcade-solo \.sbj-chip-values button \{ min-width:0; width:100%; min-height:44px/);
 assert.match(mobile,/\.arcade-solo \.sbj-result/);
 assert.match(js,/function syncQuickWager/);
 assert.match(js,/setAttribute\('aria-pressed',String\(selected\)\)/);
});

test('mobile rebuild cache-busts CSS and JavaScript while keeping old routes intact',()=>{
 assert.match(shell,/mobile-first-r1-solo-game-first-v2-bets-row-v2/);
 assert.match(shell,/global-crash-disabled-v1-mobile-first-r1-solo-game-first-v2/);
 assert.match(view,/\/arcade\/online\/blackjack/);
 assert.match(js,/\/arcade\/blackjack\/start/);
 assert.match(js,/\/arcade\/blackjack\/action/);
 assert.doesNotMatch(view,/\/arcade\/online\/crash/);
});
