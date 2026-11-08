const test=require('node:test');
const assert=require('node:assert/strict');
const {createCreditNote}=require('../.test-build/domain/credit-note.js');

const invoice={id:10,number:'FAC-10',type:'invoice',sourceQuoteId:7,customerName:'Hamza',total:200,paidCentimes:0,lines:[{productId:1,productName:'Camera',qty:2,unitPrice:100,total:200}]};

test('credit note returns stock, records the invoice link, and totals the credit',()=>{
  const result=createCreditNote(invoice,[],[{id:1,qty:3}],{'1':1},21,'2026-11-08');
  assert.equal(result.note.number,'AVR-21');
  assert.equal(result.note.sourceInvoiceId,10);
  assert.equal(result.note.total,100);
  assert.equal(result.updatedProducts[0].qty,4);
  assert.equal(result.creditedCentimes,10000);
});

test('credit note rejects quantities already returned, invalid quantities, and credit above invoice value',()=>{
  const previous=[{sourceInvoiceId:10,lines:[{productId:1,qty:1,total:100}]}];
  assert.throws(()=>createCreditNote(invoice,previous,[{id:1,qty:3}],{'1':2},22,'2026-11-08'),/أكبر من الكمية/);
  assert.throws(()=>createCreditNote(invoice,[],[{id:1,qty:3}],{'1':-1},22,'2026-11-08'),/غير صالحة/);
  assert.throws(()=>createCreditNote({...invoice,creditedCentimes:15000},[],[{id:1,qty:3}],{'1':1},22,'2026-11-08'),/تجاوز قيمة الفاتورة/);
});
