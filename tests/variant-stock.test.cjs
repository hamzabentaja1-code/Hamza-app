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
  assert.throws(() => createProductVariant(variant({id:'v-3',sku:'OTHER',barcode:'654321',attributes:{size:'m',color:'BLACK'}}),[first]), /نفس خصائص النسخة/);
  assert.throws(() => createProductVariant(variant({id:'v-4',sku:'OTHER',barcode:'123456'}),[first]), /باركود النسخة/);
  assert.throws(() => createProductVariant(variant({id:'v-5',sku:'OTHER',attributes:{Color:'black',color:'blue'}})), /أسماء مكررة/);
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
  const adjusted=applyVariantStockMovement(returned.variants,{id:'m-4',variantId:'v-1',kind:'adjustment',quantityDelta:-2,date:'2026-11-04'},[purchased.movement,sold.movement,returned.movement]);
  assert.equal(adjusted.variants[0].stockQty,5);
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


test('variant returns restore stock and supplier returns deduct it', () => {
  const initial = [{id:'v-return', productId:8, attributes:{color:'blue'}, stockQty:3, active:true}];
  const returned = applyVariantStockMovement(initial, {id:'return-in-1',variantId:'v-return',kind:'return_in',quantityDelta:2,date:'2026-11-07'});
  assert.equal(returned.variants[0].stockQty, 5);
  const sentBack = applyVariantStockMovement(returned.variants, {id:'return-out-1',variantId:'v-return',kind:'return_out',quantityDelta:-4,date:'2026-11-07'}, [returned.movement]);
  assert.equal(sentBack.variants[0].stockQty, 1);
  assert.throws(() => applyVariantStockMovement(sentBack.variants, {id:'return-out-2',variantId:'v-return',kind:'return_out',quantityDelta:-2,date:'2026-11-07'}, [returned.movement,sentBack.movement]), /مخزون النسخة غير كافٍ/);
});


test('physical variant stock counts apply positive and negative variance', () => {
  const initial = [{id:'v-count',productId:5,attributes:{size:'M'},stockQty:7,active:true}];
  const reduced = applyVariantStockMovement(initial,{id:'count-down',variantId:'v-count',kind:'stock_count',quantityDelta:-2,date:'2026-11-07'});
  assert.equal(reduced.variants[0].stockQty,5);
  const increased = applyVariantStockMovement(reduced.variants,{id:'count-up',variantId:'v-count',kind:'stock_count',quantityDelta:4,date:'2026-11-07'},[reduced.movement]);
  assert.equal(increased.variants[0].stockQty,9);
  assert.throws(()=>applyVariantStockMovement(increased.variants,{id:'count-negative',variantId:'v-count',kind:'stock_count',quantityDelta:-10,date:'2026-11-07'},[reduced.movement,increased.movement]),/مخزون النسخة غير كافٍ/);
});


test('delivery-note movement deducts stock from the selected variant', () => {
  const initial = [{id:'v-delivery',productId:9,attributes:{size:'L'},stockQty:6,active:true}];
  const result = applyVariantStockMovement(initial,{id:'delivery-1',variantId:'v-delivery',kind:'delivery',quantityDelta:-2,date:'2026-11-07'});
  assert.equal(result.variants[0].stockQty,4);
  assert.throws(()=>applyVariantStockMovement(result.variants,{id:'delivery-2',variantId:'v-delivery',kind:'delivery',quantityDelta:1,date:'2026-11-07'},[result.movement]),/اتجاه كمية الحركة/);
});


test('variant stock selling value and potential profit use per-variant prices in centimes', () => {
  const variants = [
    {id:'v1',productId:3,attributes:{color:'blue'},stockQty:4,costPriceCentimes:5000,salePriceCentimes:8000,active:true},
    {id:'v2',productId:3,attributes:{color:'red'},stockQty:2,costPriceCentimes:6000,active:true},
    {id:'v3',productId:3,attributes:{color:'green'},stockQty:9,costPriceCentimes:1000,salePriceCentimes:2000,active:false},
  ];
  assert.equal(variantStockValueCentimes(variants,3,7000),46000);
  assert.equal(variantStockProfitCentimes(variants,3,7000,4000),14000);
});
