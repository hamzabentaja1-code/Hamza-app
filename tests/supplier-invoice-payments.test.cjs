const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizeSupplierInvoicePayments,addSupplierInvoicePayment,reverseSupplierInvoicePayment}=require('../.test-build/supplier-invoice-payments.js');
const invoice={id:'inv-1',supplierId:'sup-1',totalCentimes:12550};
const payment=(id,amount,method='cash')=>({id,invoiceId:invoice.id,supplierId:invoice.supplierId,amountCentimes:amount,date:'2026-11-07T10:00:00.000Z',method});
test('summarizes unpaid, partial and fully paid supplier invoices in centimes',()=>{
 assert.deepEqual(summarizeSupplierInvoicePayments(invoice,[]),{invoiceId:'inv-1',totalCentimes:12550,paidCentimes:0,outstandingCentimes:12550,status:'unpaid'});
 const partial=addSupplierInvoicePayment(invoice,[],payment('p1',5000));
 assert.equal(partial.summary.status,'partial');assert.equal(partial.summary.outstandingCentimes,7550);
 const full=addSupplierInvoicePayment(invoice,partial.payments,payment('p2',7550,'bank'));
 assert.equal(full.summary.status,'paid');assert.equal(full.summary.outstandingCentimes,0);
});
test('rejects overpayment, duplicate IDs, wrong invoice/supplier and invalid amounts',()=>{
 assert.throws(()=>addSupplierInvoicePayment(invoice,[],payment('p1',12551)),/تجاوز/);
 const first=addSupplierInvoicePayment(invoice,[],payment('p1',1000));
 assert.throws(()=>addSupplierInvoicePayment(invoice,first.payments,payment('p1',1000)),/مكرر/);
 assert.throws(()=>summarizeSupplierInvoicePayments(invoice,[{...payment('p2',100),supplierId:'other'}]),/غير صالحة/);
 assert.throws(()=>summarizeSupplierInvoicePayments(invoice,[{...payment('p2',100),invoiceId:'other'}]),/غير صالحة/);
 assert.throws(()=>summarizeSupplierInvoicePayments(invoice,[payment('p2',0)]),/غير صالحة/);
});
test('requires cheque reference and rejects invalid dates',()=>{
 assert.throws(()=>summarizeSupplierInvoicePayments(invoice,[payment('p1',100,'cheque')]),/غير صالحة/);
 assert.throws(()=>summarizeSupplierInvoicePayments(invoice,[{...payment('p1',100),date:'bad'}]),/غير صالحة/);
});
test('reverses only the selected invoice payment and recomputes balance',()=>{
 const first=addSupplierInvoicePayment(invoice,[],payment('p1',3000));
 const second=addSupplierInvoicePayment(invoice,first.payments,payment('p2',2000));
 const reversed=reverseSupplierInvoicePayment(invoice,second.payments,'p1');
 assert.equal(reversed.payments.length,1);assert.equal(reversed.summary.paidCentimes,2000);
 assert.equal(reversed.summary.outstandingCentimes,10550);
 assert.throws(()=>reverseSupplierInvoicePayment(invoice,reversed.payments,'missing'),/غير موجود/);
});
