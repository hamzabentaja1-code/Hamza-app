const test = require('node:test');
const assert = require('node:assert/strict');
const {createProductVariant, applyVariantStockMovement, totalVariantStock, findVariantByAttributes} = require('../.test-build/variant-stock.js');

const variant = (overrides = {}) => ({
  id:'v-1', productId:10, sku:'TSHIRT-BLK-M', barcode:'123456',
  attributes:{Color:'Black',Size:'M'}, stockQty:5, costPriceCentimes:2500,
  salePriceCentimes:5000, active:true, ...overrides,
});

test('creates variants with normalized attributes and centime-safe prices', () => {
  const result = createProductVariant(variant());
  assert.deepEqual(result.attributes,{color:'black',size:'m'});
  assert.equal(result.stockQty,5);
});

test('rejects duplicate IDs, SKU and normalized attribute combinations', () => {
  const first = createProductVariant(variant());
  assert.throws(() => createProductVariant(variant(),[first]), /معرف النسخة/);
  assert.throws(() => createProductVariant(variant({id:'v-2'}),[first]), /مرجع النسخة/);
  assert.throws(() => createProductVariant(variant({id:'v-3',sku:'OTHER',attributes:{size:'m',color:'BLACK'}}),[first]), /نفس خصائص النسخة/);
});

test('rejects invalid stock, prices and empty attributes', () => {
  assert.throws(() => createProductVariant(variant({stockQty:-1})), /كمية النسخة/);
  assert.throws(() => createProductVariant(variant({salePriceCentimes:1.5})), /ثمن النسخة/);
  assert.throws(() => createProductVariant(variant({attributes:{}})), /خصائص النسخة/);
});

test('purchase, sale and return movements update only the selected variant', () => {
  const variants=[createProductVariant(variant()),createProductVariant(variant({id:'v-2',sku:'TSHIRT-BLK-L',attributes:{color:'black',size:'l'},stockQty:2}))];
  const purchased=applyVariantStockMovement(variants,{id:'m-1',variantId:'v-1',kind:'purchase',quantityDelta:3,date:'2026-11-01'});
  assert.equal(purchased.variants[0].stockQty,8);
  assert.equal(purchased.variants[1].stockQty,2);
  const sold=applyVariantStockMovement(purchased.variants,{id:'m-2',variantId:'v-1',kind:'sale',quantityDelta:-2,date:'2026-11-02'},[purchased.movement]);
  assert.equal(sold.variants[0].stockQty,6);
  const returned=applyVariantStockMovement(sold.variants,{id:'m-3',variantId:'v-1',kind:'return_in',quantityDelta:1,date:'2026-11-03'},[purchased.movement,sold.movement]);
  assert.equal(returned.variants[0].stockQty,7);
});

test('prevents negative stock, duplicate movements, wrong signs and inactive variants', () => {
  const variants=[createProductVariant(variant())];
  assert.throws(() => applyVariantStockMovement(variants,{id:'m-1',variantId:'v-1',kind:'sale',quantityDelta:-6,date:'2026-11-01'}), /مخزون النسخة غير كافٍ/);
  assert.throws(() => applyVariantStockMovement(variants,{id:'m-1',variantId:'v-1',kind:'sale',quantityDelta:1,date:'2026-11-01'}), /اتجاه كمية الحركة/);
  assert.throws(() => applyVariantStockMovement(variants,{id:'m-1',variantId:'v-1',kind:'sale',quantityDelta:-1,date:'2026-11-01'},[{id:'m-1',variantId:'v-1',kind:'sale',quantityDelta:-1,date:'2026-11-01'}]), /حركة المخزون/);
  assert.throws(() => applyVariantStockMovement([{...variants[0],active:false}],{id:'m-2',variantId:'v-1',kind:'sale',quantityDelta:-1,date:'2026-11-01'}), /غير موجودة أو غير نشطة/);
});

test('rejects impossible dates and exposes active product totals and attribute lookup', () => {
  const variants=[createProductVariant(variant()),createProductVariant(variant({id:'v-2',sku:'TSHIRT-BLK-L',attributes:{color:'black',size:'l'},stockQty:2,active:false}))];
  assert.throws(() => applyVariantStockMovement(variants,{id:'m-1',variantId:'v-1',kind:'purchase',quantityDelta:1,date:'2026-02-31'}), /تاريخ أو كمية/);
  assert.equal(totalVariantStock(variants,10),5);
  assert.equal(findVariantByAttributes(variants,10,{size:'M',color:'BLACK'}).id,'v-1');
});
