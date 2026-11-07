const test=require('node:test');const assert=require('node:assert/strict');
const {applyInvoicePriceRules}=require('../.test-build/document-pricing.js');
test('applies invoice price rules and keeps line and document discounts',()=>{
 const quote={total:175,documentDiscount:10,lines:[
  {productId:1,productName:'Camera',qty:2,unitPrice:100,total:190,trackStock:true},
  {productId:2,productName:'Install',qty:1,unitPrice:20,total:20,trackStock:false}
 ]};
 const result=applyInvoicePriceRules(quote,[{id:1,invoicePrice:80},{id:2}]);
 assert.equal(result.lines[0].unitPrice,80);
 assert.equal(result.lines[0].total,150);
 assert.equal(result.lines[1].unitPrice,20);
 assert.equal(result.total,160);
 assert.equal(result.documentDiscount,10);
 assert.equal(result.lines[1].trackStock,false);
});
test('does not mutate quote and keeps old price where invoice rule is absent',()=>{
 const quote={total:50,lines:[{productId:1,productName:'Cable',qty:2,unitPrice:25,total:50}]};
 const result=applyInvoicePriceRules(quote,[{id:1}]);
 assert.equal(result.lines[0].unitPrice,25);
 assert.equal(quote.lines[0].unitPrice,25);
});
test('caps preserved discounts at the new invoice subtotal',()=>{
 const quote={total:10,documentDiscount:100,lines:[{productId:1,productName:'Item',qty:1,unitPrice:100,total:100}]};
 const result=applyInvoicePriceRules(quote,[{id:1,invoicePrice:10}]);
 assert.equal(result.total,0);
 assert.equal(result.documentDiscount,10);
});


test('variant-specific quote prices are preserved instead of applying base product invoice price',()=>{
 const quote={total:125,lines:[{productId:1,productName:'T-shirt',variantId:'blue-xl',variantLabel:'Blue / XL',qty:1,unitPrice:125,total:125}]};
 const result=applyInvoicePriceRules(quote,[{id:1,invoicePrice:99}]);
 assert.equal(result.lines[0].unitPrice,125);
 assert.equal(result.lines[0].variantId,'blue-xl');
 assert.equal(result.lines[0].variantLabel,'Blue / XL');
});

test('customer group discount is reapplied to configured invoice prices without double-discounting quote prices',()=>{
 const quote={total:175,priceGroupDiscountPercent:12.5,lines:[
  {productId:1,productName:'Camera',qty:1,unitPrice:87.5,total:87.5},
  {productId:2,productName:'Cable',qty:1,unitPrice:87.5,total:87.5}
 ]};
 const result=applyInvoicePriceRules(quote,[{id:1,invoicePrice:100},{id:2}]);
 assert.equal(result.lines[0].unitPrice,87.5);
 assert.equal(result.lines[1].unitPrice,87.5);
 assert.equal(result.total,175);
});

test('rejects invalid persisted customer price-group percentages',()=>{
 const quote={total:10,priceGroupDiscountPercent:95,lines:[{productId:1,productName:'Item',qty:1,unitPrice:10,total:10}]};
 assert.throws(()=>applyInvoicePriceRules(quote,[{id:1,invoicePrice:10}]),/نسبة خصم مجموعة الأسعار غير صالحة/);
});
