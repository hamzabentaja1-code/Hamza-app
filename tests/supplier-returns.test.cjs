const test = require('node:test');
const assert = require('node:assert/strict');
const {calculateSupplierReturn,remainingSupplierReturnQuantity} = require('../.test-build/supplier-returns.js');

const purchase = {id:7,supplierName:'Fournisseur A',productName:'Cable',qty:10,unitCost:12.5};
test('calculates partial supplier return and remaining quantity',()=>{
 const r=calculateSupplierReturn(purchase,[],{id:1,qty:3,date:'2026-11-07T10:00:00.000Z',reason:'Defective'});
 assert.equal(r.amountCentimes,3750);
 assert.equal(remainingSupplierReturnQuantity(purchase,[r]),7);
});
test('rejects supplier return above remaining purchased quantity',()=>{
 const first=calculateSupplierReturn(purchase,[],{id:1,qty:8,date:'2026-11-07T10:00:00.000Z'});
 assert.throws(()=>calculateSupplierReturn(purchase,[first],{id:2,qty:3,date:'2026-11-07T10:00:00.000Z'}),/المتبقية/);
});
test('rejects fractional, zero and invalid return dates',()=>{
 for(const input of [{id:1,qty:1.5,date:'2026-11-07'},{id:2,qty:0,date:'2026-11-07'},{id:3,qty:1,date:'invalid'}]){
  assert.throws(()=>calculateSupplierReturn(purchase,[],input));
 }
});
