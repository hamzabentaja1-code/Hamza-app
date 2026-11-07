const test=require('node:test');const assert=require('node:assert/strict');
const {allocatePaymentAcrossInvoices}=require('../.test-build/multi-invoice-payment.js');
const invoices=()=>[
 {id:10,type:'invoice',customerName:'Client A',total:100,paidCentimes:0,status:'صادرة'},
 {id:11,type:'invoice',customerName:'Client A',total:80,paidCentimes:3000,status:'partially_paid'},
 {id:12,type:'invoice',customerName:'Client B',total:50,paidCentimes:0,status:'صادرة'},
 {id:13,type:'delivery',customerName:'Client A',total:20,paidCentimes:0,status:'صادرة'},
];
test('allocates one receipt oldest-first across multiple invoices for one customer',()=>{
 const result=allocatePaymentAcrossInvoices(invoices(),'Client A',12000);
 assert.deepEqual(result.allocations,[{documentId:10,amountCentimes:10000},{documentId:11,amountCentimes:2000}]);
 assert.equal(result.documents.find(x=>x.id===10).status,'paid');
 assert.equal(result.documents.find(x=>x.id===11).paidCentimes,5000);
 assert.equal(result.documents.find(x=>x.id===12).paidCentimes,0);
 assert.equal(result.allocatedCentimes,12000);
});
test('rejects overpayment, missing customer invoices and invalid amounts',()=>{
 assert.throws(()=>allocatePaymentAcrossInvoices(invoices(),'Client A',18001));
 assert.throws(()=>allocatePaymentAcrossInvoices(invoices(),'Client B',5001));
 assert.throws(()=>allocatePaymentAcrossInvoices(invoices(),'Client A',0));
});
test('does not mutate the original invoice records',()=>{
 const source=invoices();
 allocatePaymentAcrossInvoices(source,'Client A',1000);
 assert.equal(source[0].paidCentimes,0);
});
