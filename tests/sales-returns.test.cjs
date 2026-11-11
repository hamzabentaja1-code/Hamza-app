const test=require('node:test');
const assert=require('node:assert/strict');
const {createSalesReturn,normalizeSalesReturns,recordCustomerRefund}=require('../.test-build/domain/sales-returns.js');
const {allocateCreditNoteAcrossInvoices}=require('../.test-build/domain/payment-allocation.js');
const {calculateCustomerBalances}=require('../.test-build/domain/customer-balances.js');

const sale={id:11,productId:3,warehouseId:'main',documentId:21,productName:'Cable',customerName:'Client',qty:4,total:100};

test('creates proportional credit notes and preserves the original sale reference',()=>{
  const item=createSalesReturn({sale,quantity:1,existingReturns:[],id:50,date:'11/11/2026',reason:'Damaged',restock:true,productId:3});
  assert.equal(item.number,'AV-50');
  assert.equal(item.saleId,11);
  assert.equal(item.documentId,21);
  assert.equal(item.total,25);
  assert.equal(item.restocked,true);
  assert.equal(item.reason,'Damaged');
});

test('partial returns cannot exceed the quantity originally sold',()=>{
  const first=createSalesReturn({sale,quantity:2,existingReturns:[],id:51,date:'11/11/2026',restock:false});
  const second=createSalesReturn({sale,quantity:1.5,existingReturns:[first],id:52,date:'11/11/2026',restock:false});
  assert.equal(second.total,37.5);
  assert.throws(()=>createSalesReturn({sale,quantity:0.6,existingReturns:[first,second],id:53,date:'11/11/2026',restock:false}));
});

test('requires a linked product for restocking and validates quantity precision',()=>{
  assert.throws(()=>createSalesReturn({sale:{...sale,productId:undefined},quantity:1,existingReturns:[],id:54,date:'11/11/2026',restock:true}));
  assert.throws(()=>createSalesReturn({sale,quantity:0,existingReturns:[],id:55,date:'11/11/2026',restock:false}));
  assert.throws(()=>createSalesReturn({sale,quantity:0.0001,existingReturns:[],id:56,date:'11/11/2026',restock:false}));
  assert.equal(createSalesReturn({sale,quantity:1.005,existingReturns:[],id:57,date:'11/11/2026',restock:false}).qty,1.005);
});

test('normalizes valid stored credit notes and drops malformed records',()=>{
  const item=createSalesReturn({sale,quantity:1,existingReturns:[],id:58,date:'11/11/2026',restock:false});
  assert.equal(normalizeSalesReturns([item,{id:'bad'}]).length,1);
  assert.deepEqual(normalizeSalesReturns(undefined),[]);
});

test('preserves invoice credit allocations and customer credits across backup restore',()=>{
  const credit={id:80,number:'AV-80',saleId:11,productId:3,warehouseId:'main',documentId:20,invoiceAllocations:[{documentId:20,creditedCentimes:2500,allocatedCentimes:2500,status:'partially_paid'}],unappliedCentimes:300,productName:'Cable',customerName:'Client',qty:1,total:28,reason:'',restocked:false,date:'11/11/2026'};
  const normalized=normalizeSalesReturns([credit,{...credit,id:81,invoiceAllocations:[{documentId:20,creditedCentimes:-1,allocatedCentimes:-1,status:'invalid'}]},{...credit,id:83,invoiceAllocations:[null]}]);
  assert.deepEqual(normalized,[credit]);
});

test('return linked to a POS sale reduces that invoice receivable',()=>{
  const item=createSalesReturn({sale,quantity:1,existingReturns:[],id:82,date:'11/11/2026',restock:false});
  const credit=allocateCreditNoteAcrossInvoices([{id:item.documentId,total:100,paidCentimes:5000,status:'partial'}],Math.round(item.total*100),item.documentId);
  assert.equal(credit.allocations[0].invoiceId,21);
  assert.equal(credit.allocations[0].allocatedCentimes,2500);
  const balances=calculateCustomerBalances([{type:'invoice',customerName:'Client',total:100,paidCentimes:5000,creditedCentimes:credit.allocations[0].creditedCentimes}]);
  assert.equal(balances[0].outstandingCentimes,2500);
});

test('cash refund reduces only the unapplied customer credit and is persisted',()=>{
  const item={...createSalesReturn({sale,quantity:1,existingReturns:[],id:84,date:'11/11/2026',restock:false}),unappliedCentimes:2500};
  const refunded=recordCustomerRefund(item,12.5,85,'12/11/2026');
  assert.equal(refunded.unappliedCentimes,1250);
  assert.deepEqual(refunded.refunds,[{id:85,amountCentimes:1250,date:'12/11/2026',method:'cash'}]);
  assert.deepEqual(normalizeSalesReturns([refunded]),[refunded]);
});

test('cash refund rejects invalid amounts, duplicate ids, missing dates and credit overspend',()=>{
  const item={...createSalesReturn({sale,quantity:1,existingReturns:[],id:86,date:'11/11/2026',restock:false}),unappliedCentimes:2500};
  assert.throws(()=>recordCustomerRefund(item,0,87,'12/11/2026'));
  assert.throws(()=>recordCustomerRefund(item,25.01,87,'12/11/2026'));
  assert.throws(()=>recordCustomerRefund(item,1,87,''));
  assert.throws(()=>recordCustomerRefund({...item,refunds:[{id:87,amountCentimes:100,date:'12/11/2026',method:'cash'}]},1,87,'13/11/2026'));
});

test('normalization drops malformed refund records without dropping valid returns',()=>{
  const item={...createSalesReturn({sale,quantity:1,existingReturns:[],id:88,date:'11/11/2026',restock:false}),unappliedCentimes:2500,refunds:[{id:89,amountCentimes:100,date:'12/11/2026',method:'cash'}]};
  assert.deepEqual(normalizeSalesReturns([item,{...item,id:90,refunds:[null]}]),[item]);
});
