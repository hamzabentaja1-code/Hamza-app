const test=require('node:test');const assert=require('node:assert/strict');
const pricing=require('../.test-build/supplier-pricing.js');
const base={id:'rule-1',supplierId:1,productId:2,unitCostCentimes:12500,updatedAt:'2026-11-01T10:00:00.000Z'};
test('supplier price rules are normalized, deduplicated and newest rule wins',()=>{
 const rules=pricing.normalizeSupplierPriceRules([base,{...base,id:'new',unitCostCentimes:13000,updatedAt:'2026-11-05T10:00:00.000Z'},null,{...base,productId:0}]);
 assert.equal(rules.length,1);assert.equal(rules[0].unitCostCentimes,13000);
});
test('supplier price rules are scoped by supplier, product and optional variant',()=>{
 const rules=pricing.upsertSupplierPriceRule([base],{...base,id:'variant',variantId:'v-blue',unitCostCentimes:14000});
 assert.equal(pricing.findSupplierPriceRule(rules,1,2).unitCostCentimes,12500);
 assert.equal(pricing.findSupplierPriceRule(rules,1,2,'v-blue').unitCostCentimes,14000);
 assert.equal(pricing.findSupplierPriceRule(rules,2,2),undefined);
});
test('supplier price rule updates replace only matching supplier/product/variant keys',()=>{
 const rules=pricing.upsertSupplierPriceRule([base],{...base,id:'updated',unitCostCentimes:15000,updatedAt:'2026-11-07T10:00:00.000Z'});
 assert.equal(rules.length,1);assert.equal(rules[0].unitCostCentimes,15000);
 assert.throws(()=>pricing.upsertSupplierPriceRule([], {...base,unitCostCentimes:-1}),/غير صالحة/);
});
test('purchase workspace persists supplier price rules and uses them when supplier/product/variant changes',()=>{
 const fs=require('node:fs');const path=require('node:path');const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(app,/supplierPriceRules,setSupplierPriceRules/);
 assert.match(app,/normalizeSupplierPriceRules\(d\.supplierPriceRules\)/);
 assert.match(app,/findSupplierPriceRule\(supplierPriceRules/);
 assert.match(app,/upsertSupplierPriceRule\(supplierPriceRules/);
 assert.match(app,/supplierPriceRules,workOrders|supplierPriceRules/);
 assert.match(app,/حفظ ثمن المورد لهذا المنتج/);
 assert.match(app,/writeAppData\(\{[\s\S]*?supplierPriceRules/);
 assert.match(app,/createBackup\(\{[\s\S]*?supplierPriceRules/);
 assert.match(app,/applySupplierPriceRule\(purchaseSupplier,String\(p\.id\)\)/);
 assert.match(app,/applySupplierPriceRule\(String\(x\.id\),purchaseProduct,purchaseVariantId\)/);
 assert.match(app,/applySupplierPriceRule\(purchaseSupplier,purchaseProduct,v\.id\)/);
 assert.match(app,/onPress=\{saveSupplierPriceRule\}/);
});
