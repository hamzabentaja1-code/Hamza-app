const test=require('node:test');const assert=require('node:assert/strict');
const {createPosReturn,validatePosReturn,returnedQuantity,remainingReturnCentimes}=require('../.test-build/pos-returns.js');
const sale={id:11,productId:7,warehouseId:'main',productName:'Camera',customerName:'Client',qty:3,unitPrice:100,total:299.99,date:'2026-11-08',paymentMethod:'cash'};
test('POS returns restore partial quantities and prorate the original amount without rounding loss',()=>{
 const first=createPosReturn(sale,[],{id:'r1',quantity:1,date:'2026-11-08',method:'cash'});
 assert.equal(first.totalCentimes,10000);assert.equal(returnedQuantity(sale,[first]),1);assert.equal(remainingReturnCentimes(sale,[first]),19999);
 const last=createPosReturn(sale,[first],{id:'r2',quantity:2,date:'2026-11-08',method:'cash'});
 assert.equal(last.totalCentimes,19999);assert.equal(first.totalCentimes+last.totalCentimes,29999);
 assert.ok(validatePosReturn({...first,id:'r3',quantity:3},[sale],[first]).some(error=>error.includes('المتبقية')));
});
test('POS returns reject missing sales, invalid amounts and cheques without references',()=>{
 const base=createPosReturn(sale,[],{id:'r1',quantity:1,date:'2026-11-08',method:'cash'});
 assert.ok(validatePosReturn({...base,saleId:99},[sale],[]).some(error=>error.includes('الأصلية')));
 assert.ok(validatePosReturn({...base,totalCentimes:1},[sale],[]).some(error=>error.includes('غير مطابق')));
 assert.ok(validatePosReturn({...base,method:'cheque',reference:''},[sale],[]).some(error=>error.includes('مرجع الشيك')));
});
