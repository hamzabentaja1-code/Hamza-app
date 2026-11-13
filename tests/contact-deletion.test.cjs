const test=require('node:test');
const assert=require('node:assert/strict');
const {canDeleteCustomer,canDeleteSupplier}=require('../.test-build/domain/contact-deletion.js');

test('contacts with opening balances or linked transactions cannot be deleted',()=>{
  assert.equal(canDeleteCustomer('Client A',0,[[{customerName:'Client A'}]]),false);
  assert.equal(canDeleteCustomer('Client A',1,[]),false);
  assert.equal(canDeleteCustomer('Client A',0,[[{customerName:'Another client'}]]),true);
  assert.equal(canDeleteSupplier('Supplier A',500,[]),false);
  assert.equal(canDeleteSupplier('Supplier A',0,[[{supplierName:'Supplier A'}]]),false);
  assert.equal(canDeleteSupplier('Supplier A',0,[[{supplierName:'Supplier B'}]]),true);
});
