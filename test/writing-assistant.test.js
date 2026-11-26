import {test} from 'node:test';
import assert from 'node:assert/strict';
import {improveReply} from '../public/writing-assistant.js';
test('writing assistant corrects common typos and grammar without external services',()=>{
 assert.equal(improveReply('we was unable to recieve your mesage','grammar'),'We were unable to receive your message.');
 assert.equal(improveReply('teh screnshot on discord','spelling'),'the screenshot on Discord');
 assert.equal(improveReply('hello ,thanks','punctuation'),'Hello, thanks.');
 assert.equal(improveReply('we cannot help you right now','friendly'),"We can't help you right now.");
 assert.equal(improveReply('hey we cant help u with this rn','professional'),'Hello we cannot assist with this right now.');
 assert.equal(improveReply('we need evidence in order to investigate','concise'),'We need evidence to investigate.');
 assert.equal(improveReply('Hello  there  \n\n\nThanks','format'),'Hello there\n\nThanks');
});
test('writing assistant preserves protected tokens and does not invent decisions',()=>{
 const value='please check https://example.com/teh and <@123456789012345678> /spawn IGN_123 v1.21.2 @recieve';
 const updated=improveReply(value,'grammar');
 for(const token of ['https://example.com/teh','<@123456789012345678>','/spawn','IGN_123','v1.21.2','@recieve'])assert.ok(updated.includes(token));
 assert.equal(improveReply('\x60we was teh\x60','professional'),'\x60we was teh\x60');
 assert.equal(improveReply('I feel ill.','grammar'),'I feel ill.');
 assert.equal(improveReply('Your appeal is denied.','professional'),'Your appeal is denied.');
 assert.equal(improveReply('','grammar'),'');
 assert.equal(improveReply('plain text','unknown'),'plain text');
});
