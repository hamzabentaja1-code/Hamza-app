const test = require('node:test');
const assert = require('node:assert/strict');
const {createContactInteraction,filterContactInteractions} = require('../.test-build/domain/contact-history.js');

test('creates validated contact call, message, meeting and note history',()=>{
 const item=createContactInteraction({contactType:'customer',contactId:12,contactName:'Client A',kind:'call',summary:'Discussed pending quote'},91,'2026-11-07T10:00:00.000Z');
 assert.equal(item.id,91);
 assert.equal(item.contactName,'Client A');
 assert.throws(()=>createContactInteraction({contactType:'customer',contactId:12,contactName:'Client A',kind:'call',summary:' '},92),/غير صالحة/);
});

test('filters contact history and sorts newest first',()=>{
 const entries=[
  {id:1,contactType:'customer',contactId:12,contactName:'Client A',kind:'call',summary:'Older',createdAt:'2026-11-01T10:00:00.000Z'},
  {id:2,contactType:'supplier',contactId:20,contactName:'Supplier',kind:'note',summary:'Other',createdAt:'2026-11-06T10:00:00.000Z'},
  {id:3,contactType:'customer',contactId:12,contactName:'Client A',kind:'message',summary:'Newer',createdAt:'2026-11-07T10:00:00.000Z'},
 ];
 assert.deepEqual(filterContactInteractions(entries,'customer',12).map(x=>x.id),[3,1]);
 assert.equal(filterContactInteractions(entries).length,3);
});