const test=require('node:test');
const assert=require('node:assert/strict');
const {buildBusinessLedgerRows}=require('../.test-build/domain/business-ledger.js');

test('business export contains current stock and all financial records in one ledger',()=>{
  const rows=buildBusinessLedgerRows({
    products:[{id:1,name:'Cable',qty:4,costPrice:5,price:10,reference:'C-1'}],
    sales:[{id:2,date:'11/11/2026',productName:'Cable',customerName:'Ali',qty:2,unitCost:5,unitPrice:10,total:20,paymentMethod:'cash'}],
    returns:[{id:3,date:'11/11/2026',number:'AV-3',saleId:2,productName:'Cable',customerName:'Ali',qty:1,total:10,restocked:true}],
    purchases:[{id:4,date:'11/11/2026',productName:'Cable',supplierName:'Shop',qty:4,unitCost:5,total:20,paidAmount:2}],
    expenses:[{id:5,date:'11/11/2026',title:'Transport',amount:8}],
    payments:[{id:6,date:'11/11/2026',customerName:'Ali',amount:10,method:'cash',documentId:2}],
    supplierPayments:[{id:7,purchaseId:4,date:'11/11/2026',supplierName:'Shop',amount:5,method:'cash'}],
    receivables:[{customerName:'Ali',outstandingCentimes:1000,invoiceCount:1}],
  });
  assert.deepEqual(rows.map(row=>row[0]),['Stock','Sale','Credit note','Purchase','Supplier payment','Expense','Payment','Supplier payment','Receivable']);
  assert.equal(rows[2][8],-10);
  assert.equal(rows[4][8],-2);
  assert.equal(rows[5][8],-8);
  assert.equal(rows[7][8],-5);
  assert.equal(rows[8][8],10);
});
