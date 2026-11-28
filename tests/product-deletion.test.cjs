const assert=require('node:assert/strict');
const test=require('node:test');
const {productDeletionBlock}=require('../.test-build/domain/product-deletion.js');
const {warehouseStock,inventoryValue}=require('../.test-build/inventory.js');
const product={id:1,name:'Cable',qty:0};
const movement=(kind,quantity,warehouseId='main')=>({id:kind,productId:'1',warehouseId,kind,quantity,unitCost:10,createdAt:'2026-11-28'});

test('protects four units worth 40 DH even if the cached count is stale',()=>{
  const movements=[movement('opening',4)];
  assert.equal(productDeletionBlock(product,movements,[]),'stock');
  assert.equal(warehouseStock(movements,'1','main'),4);
  assert.equal(inventoryValue(movements,'1','main'),40);
  assert.equal(productDeletionBlock({...product,qty:4},[],[]),'stock');
});

test('different warehouse balances cannot cancel out when deciding to delete',()=>{
  assert.equal(productDeletionBlock(product,[movement('transfer_in',2,'remote'),movement('sale',2)],[]),'stock');
});

test('sold-out item still has identity for a physical return',()=>{
  const ledger=[movement('opening',1),movement('sale',1)];
  assert.equal(warehouseStock(ledger,'1','main'),0);
  assert.equal(productDeletionBlock(product,ledger,[[{productId:1,productName:'Previous name'}]]),'history');
  assert.equal(productDeletionBlock(product,ledger,[]),'history');
  const afterReturn=[...ledger,movement('return_in',1)];
  assert.equal(warehouseStock(afterReturn,'1','main'),1);
  assert.equal(productDeletionBlock({...product,qty:1},afterReturn,[]),'stock');
});

test('legacy name-only records are protected, but explicit mismatched IDs take precedence',()=>{
  assert.equal(productDeletionBlock(product,[],[[{productName:'Cable'}]]),'history');
  assert.equal(productDeletionBlock(product,[],[[{productId:0,productName:'Cable'}]]),'history');
  assert.equal(productDeletionBlock(product,[],[[{productId:'2',productName:'Cable'}]]),undefined);
  assert.equal(productDeletionBlock(product,[],[[{productId:'1',productName:'Previous name'}]]),'history');
});

test('an unused zero-stock product can still be deleted',()=>{
  assert.equal(productDeletionBlock(product,[],[]),undefined);
});
