const test=require('node:test');
const assert=require('node:assert/strict');
const {parseOptionalProductPrice,resolveDocumentProductPrice}=require('../.test-build/domain/product-pricing.js');

test('uses separate quote and invoice prices while preserving the catalog price for POS and legacy products',()=>{
  const product={price:100,quotePrice:95,invoicePrice:90};
  assert.equal(resolveDocumentProductPrice(product,'quote'),95);
  assert.equal(resolveDocumentProductPrice(product,'invoice'),90);
  assert.equal(resolveDocumentProductPrice({price:100},'quote'),100);
});

test('accepts zero as an explicit price and treats an empty field as unset',()=>{
  assert.equal(parseOptionalProductPrice('0'),0);
  assert.equal(parseOptionalProductPrice(''),undefined);
  assert.equal(parseOptionalProductPrice('12,50'),12.5);
});

test('rejects negative and malformed document-specific prices',()=>{
  assert.throws(()=>parseOptionalProductPrice('-5'));
  assert.throws(()=>parseOptionalProductPrice('abc'));
});
