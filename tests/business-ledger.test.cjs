const test=require('node:test');
const assert=require('node:assert/strict');
const {buildBusinessLedgerRows}=require('../.test-build/domain/business-ledger.js');

test('business export contains current stock and all financial records in one ledger',()=>{
  const rows=buildBusinessLedgerRows({
    products:[{id:1,name:'Cable',qty:4,costPrice:5,price:10,reference:'C-1'}],
    sales:[{id:2,date:'11/11/2026',productName:'Cable',customerName:'Ali',qty:2,unitCost:5,unitPrice:10,total:20,paymentMethod:'cash'}],
    returns:[{id:3,date:'11/11/2026',number:'AV-3',saleId:2,productName:'Cable',customerName:'Ali',qty:1,total:10,restocked:true,invoiceAllocations:[{documentId:2,allocatedCentimes:700}],unappliedCentimes:300,refunds:[{id:30,amountCentimes:100,date:'12/11/2026',method:'cash'}]}],
    purchases:[{id:4,date:'11/11/2026',productName:'Cable',supplierName:'Shop',qty:4,unitCost:5,total:20,paidAmount:2}],
    expenses:[{id:5,date:'11/11/2026',title:'Transport',amount:8}],
    payments:[{id:6,date:'11/11/2026',customerName:'Ali',amount:10,method:'تحويل',bankAccountId:'bank-1',documentId:2}],
    supplierPayments:[{id:7,purchaseId:4,date:'11/11/2026',supplierName:'Shop',amount:5,method:'تحويل',bankAccountId:'bank-2'}],
    bankTransfers:[{id:'transfer-1',bankAccountId:'bank-1',date:'12/11/2026',direction:'cash_to_bank',amountCentimes:500,description:'Deposit'},{id:'transfer-2',bankAccountId:'bank-1',date:'12/11/2026',direction:'bank_to_cash',amountCentimes:200,description:'Withdrawal'}],
    receivables:[{customerName:'Ali',outstandingCentimes:1000,invoiceCount:1,customerCreditCentimes:300}],
  });
  assert.deepEqual(rows.map(row=>row[0]),['Stock','Sale','Credit note','Customer refund','Purchase','Supplier payment','Expense','Payment','Supplier payment','Cash-bank transfer','Cash-bank transfer','Cash-bank transfer','Cash-bank transfer','Receivable','Customer credit']);
  assert.equal(rows[2][8],-10);
  assert.match(rows[2][9],/allocated 7.00 DH; customer credit 3.00 DH/);
  assert.equal(rows[3][8],-1);
  assert.equal(rows[4][8],20);
  assert.equal(rows[5][8],-2);
  assert.equal(rows[6][8],-8);
  assert.equal(rows[8][8],-5);
  assert.match(rows[7][9],/bank bank-1/);
  assert.match(rows[8][9],/bank bank-2/);
  assert.equal(rows[13][8],10);
  assert.equal(rows[14][8],-3);
  assert.deepEqual(rows.slice(9,13).map(row=>row[8]),[-5,5,2,-2]);
});
