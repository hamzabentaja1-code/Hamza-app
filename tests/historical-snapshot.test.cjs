const test=require('node:test');
const assert=require('node:assert/strict');
const {adaptHistoricalSnapshot}=require('../.test-build/domain/historical-snapshot.js');
const {warehouseStock}=require('../.test-build/inventory.js');
const {supplierAccountBalances}=require('../.test-build/supplier-account.js');
function old(){
  return {
    products:[
      {id:1,name:'Câble ضو',price:7.25,qty:5,photos:['data:image/png;base64,AAAA']},
      {id:2,name:'Pièce',price:2,qty:1,costPrice:0.8}
    ],
    inventoryMovements:[
      {id:'opening',kind:'opening',productId:1,quantityDelta:10,unitCost:3,date:'2026-02-02T00:00:00.000Z'},
      {id:'delivery',kind:'delivery',productId:1,quantityDelta:-2,date:'2026-02-03',sourceId:'BON-1'},
      {id:'count',kind:'stock_count',productId:1,quantityDelta:-3,date:'04/02/2026'},
      {id:'transfer-out',kind:'transfer_out',productId:1,quantityDelta:-1,date:'2026-02-05',transferId:'T1'},
      {id:'transfer-in',kind:'transfer_in',productId:1,quantityDelta:1,date:'2026-02-05',warehouseId:'annex',transferId:'T1'},
    ],
    warehouses:[{id:'warehouse-default',name:'Dépôt principal'},{id:'annex',name:'Annexe'}],activeWarehouseId:'warehouse-default',
    customers:[{id:7,name:'Customer',taxId:'12',paymentTermsDays:20}],
    sales:[{id:13,name:'old',costPrice:3,warehouseId:'warehouse-default'}],
    suppliers:[{id:4,name:'Atelier',openingBalanceCentimes:77}],
    purchases:[{id:16,supplierName:'Atelier',productId:1,total:11,paidCentimes:449}],
    supplierPayments:[{id:2,purchaseId:16,method:'شيك',supplierName:'Atelier',amountCentimes:125,date:'2026-02-06',note:'CH-1'}],
  };
}
test('historical inventory retains quantities, signed adjustments, delivery and warehouse transfer',()=>{
 const native=old(),next=adaptHistoricalSnapshot(native);
 assert.equal(next.warehouses[0].name,'Dépôt principal');
 assert.equal(next.activeWarehouseId,'main');
 assert.equal(warehouseStock(next.stockMovements,'1','main'),4);
 assert.equal(warehouseStock(next.stockMovements,'1','annex'),1);
 assert.equal(warehouseStock(next.stockMovements,'2','main'),1);
 assert.equal(next.stockMovements[1].reference,'BON-1');
 assert.equal(next.stockMovements[2].quantity,-3);
 assert.equal(next.stockMovements[3].transferId,'T1');
 assert.equal(next.products[0].photoGallery[0],native.products[0].photos[0]);
 assert.equal(next.customers[0].ifNumber,'12');
 assert.equal(next.customers[0].paymentDelayDays,20);
 assert.equal(next.sales[0].unitCost,3);
 assert.equal(next.purchases[0].productId,'1');
 assert.equal(next.inventoryMovements,native.inventoryMovements);
 assert.equal(adaptHistoricalSnapshot(next),next);
});
test('supplier cumulative amounts do not record the linked cheque twice',()=>{
 const n=adaptHistoricalSnapshot(old());
 assert.equal(n.purchases[0].paidAmount,3.24);
 assert.equal(n.supplierPayments[0].amount,1.25);
 const [balance]=supplierAccountBalances(n.purchases,n.supplierPayments,[{supplierName:'Atelier',amountCentimes:77}]);
 assert.equal(Math.round(balance.outstanding*100),728);
});
test('conflicting stock, invalid cash, unsupported credits or mixed formats fail closed without mutating input',()=>{
 for(const change of [
   d=>{d.products[0].qty=50;},
   d=>{d.stockMovements=[];},
   d=>{d.purchases[0].paidCentimes=100;},
   d=>{d.inventoryMovements[0].kind='__proto__';},
   d=>{d.supplierReturns=[{id:7,purchaseId:16,amountCentimes:10}];},
   d=>{d.supplierPayments[0].method='نقداً';},
   d=>{d.cashMovements=[{id:'cash',kind:'opening',amountCentimes:100}];},
   d=>{d.bankMovements=[{id:'b',kind:'opening',amountCentimes:120}];},
   d=>{d.cashMovements=[{id:'cash',date:'2026-02-08',description:'out',kind:'cash_out',amountCentimes:100}];}
 ]){
  const d=old();change(d);
  const before=JSON.stringify(d);
  assert.throws(()=>adaptHistoricalSnapshot(d));
  assert.equal(JSON.stringify(d),before);
 }
 const current={products:[{id:1}],stockMovements:[],purchases:[{id:3,paidAmount:5}]};
 assert.equal(adaptHistoricalSnapshot(current),current);
});


test('old cash settlements update supplier debt once and keep the authoritative cash journal',()=>{
 const {buildCashRegisterRows,calculateCashBalance,normalizeCashAccount,recordManualCashEntry,setCashOpeningBalance}=require('../.test-build/domain/cash-register.js');
 const d=old();
 d.supplierPayments[0].method='نقداً';
 d.cashMovements=[
   {id:'initial',kind:'opening',date:'2026-02-01T10:00:00Z',amountCentimes:10000,description:'Solde initial'},
   {id:'pos-cash-old',kind:'cash_in',date:'2026-02-03T10:00:00Z',amountCentimes:580,description:'Vente directe'},
   {id:'supplier-payment-cash-2',kind:'cash_out',date:'2026-02-06T10:00:00Z',amountCentimes:125,description:'Fournisseur'},
   {id:'old-manual',kind:'cash_out',date:'2026-02-07T10:00:00Z',amountCentimes:800,description:'Dépense'},
 ];
 d.payments=[{id:6,method:'نقداً',date:'2026-02-03',amount:5.8,customerName:'Customer'}];
 d.expenses=[{id:6,paymentMethod:'Espèces',date:'2026-02-07',amount:8,title:'Dépense'}];
 const converted=adaptHistoricalSnapshot(d);
 const account=normalizeCashAccount(JSON.parse(JSON.stringify(converted.cashAccount)));
 const sources={payments:d.payments,supplierPayments:converted.supplierPayments,purchases:converted.purchases,expenses:d.expenses,refunds:[]};
 assert.equal(calculateCashBalance(account,sources),9655);
 assert.deepEqual(buildCashRegisterRows(account,sources).map(row=>row.id),['legacy-cash-old-manual','legacy-cash-supplier-payment-cash-2','legacy-cash-pos-cash-old','legacy-cash-initial']);
 assert.deepEqual(account.historicalJournal.coveredRows,['payment-6','supplier-2','expense-6']);
 assert.equal(Math.round(supplierAccountBalances(converted.purchases,converted.supplierPayments)[0].outstanding*100),651);
 assert.throws(()=>setCashOpeningBalance(account,1,'2026-02-09'));
 sources.payments=[...sources.payments,{id:8,method:'نقداً',date:'2026-02-08',amount:3,customerName:'Customer'}];
 const next=recordManualCashEntry(account,{id:20,date:'2026-02-09',direction:'out',amount:2,description:'New cash'},9955);
 assert.equal(calculateCashBalance(next,sources),9755);
 assert.equal(buildCashRegisterRows(next,sources).length,6);
});

function oldBank(){
 const d=old();
 d.bankAccounts=[{id:'cih',name:'CIH',currency:'MAD',bankName:'CIH Bank',isDefault:true},{id:'other',name:'Other',currency:'MAD'}];
 const movement=(id,accountId,kind,amountCentimes,day,extra={})=>({
   id,accountId,kind,amountCentimes,date:'2026-02-'+day+'T12:00:00Z',description:id,...extra,
 });
 d.purchases.push({...d.purchases[0],id:17,paidCentimes:225});
 d.supplierPayments=[
   {...d.supplierPayments[0],method:'تحويل',bankAccountId:'cih'},
   {...d.supplierPayments[0],id:3,method:'تحويل',bankAccountId:'cih',amountCentimes:124,transactionId:'supplier-bulk-3'},
   {...d.supplierPayments[0],id:4,purchaseId:17,method:'تحويل',bankAccountId:'cih',amountCentimes:225,transactionId:'supplier-bulk-3'},
 ];
 d.payments=[{id:12,method:'تحويل',date:'03/02/2026',amount:2,customerName:'Customer'}];
 d.bankMovements=[
   movement('opening','cih','opening',20000,'01'),
   movement('customer-payment-bank-12','cih','customer_payment',200,'03'),
   movement('supplier-payment-bank-2','cih','supplier_payment',125,'06'),
   movement('supplier-bulk-bank-supplier-bulk-3','cih','supplier_payment',349,'06'),
   movement('cash-bank-12-bank','cih','cash_transfer_in',500,'06',{sourceId:'cash-bank-12',transferId:'cash-bank-12'}),
   movement('cross-out','cih','bank_transfer_out',1100,'06',{sourceId:'cross',transferId:'cross'}),
   movement('cross-in','other','bank_transfer_in',1100,'06',{sourceId:'cross',transferId:'cross'}),
   movement('reconcile-r1','cih','adjustment_in',74,'07',{sourceId:'r1'}),
 ];
 d.cashMovements=[
   {id:'start-cash',kind:'opening',amountCentimes:1500,date:'2026-02-01T12:00:00Z',description:'Opening cash'},
   {id:'cash-bank-12-cash',kind:'cash_out',amountCentimes:500,date:'2026-02-06T12:00:00Z',description:'Transfer',reference:'cash-bank-12'},
 ];
 d.bankReconciliations=[{id:'r1',accountId:'cih',date:'2026-02-07T12:00:00Z',bookBalanceCentimes:19126,statementBalanceCentimes:19200,differenceCentimes:74}];
 return d;
}
test('historical bank transfers, bulk supplier payments and reconciliations post exactly once',()=>{
 const {buildBankLedgerEntries,calculateBankBalance,deleteBankAccount,matchBankStatementLines,normalizeBankAccounts,reconcileBankStatement,recordBankTransfer}=require('../.test-build/domain/bank-accounts.js');
 const {calculateCashBalance}=require('../.test-build/domain/cash-register.js');
 const {filterByDateRange}=require('../.test-build/report-filters.js');
 const original=oldBank(),migrated=adaptHistoricalSnapshot(original);
 const [cih,other]=normalizeBankAccounts(JSON.parse(JSON.stringify(migrated.bankAccounts)));
 assert.equal(cih.bankName,'CIH Bank');
 assert.equal(cih.historicalJournal.reconciliations[0].differenceCentimes,74);
 assert.deepEqual(cih.historicalJournal.coveredSupplierIds,[2,3,4]);
 assert.equal(calculateBankBalance(cih,[],migrated.payments,migrated.supplierPayments),19200);
 assert.equal(calculateBankBalance(other,[],migrated.payments,migrated.supplierPayments),1100);
 assert.equal(calculateCashBalance(migrated.cashAccount,{payments:migrated.payments,supplierPayments:migrated.supplierPayments,purchases:migrated.purchases,expenses:[],refunds:[]}),1000);
 assert.deepEqual(migrated.bankMovements,original.bankMovements);
 assert.throws(()=>deleteBankAccount([cih,other],[],other.id),/محفوظة/);
 const rows=buildBankLedgerEntries([cih,other],[],migrated.payments,migrated.supplierPayments);
 assert.equal(rows.length,8);
 assert.equal(filterByDateRange(rows,'06/02/2026','06/02/2026').length,5);
 const lines=[{id:'s1',bankAccountId:'cih',date:'06/02/2026',amountCentimes:-349,description:'Supplier',reportedBalanceCentimes:19126}];
 const matches=matchBankStatementLines(lines,rows);
 assert.equal(matches[0].status,'matched');
 assert.equal(reconcileBankStatement(cih,lines,rows,matches).differenceCentimes,0);
 const historicalOutflows=[...migrated.supplierPayments,{id:55,method:'تحويل',bankAccountId:'cih',amount:5,date:'08/02/2026'}];
 const newDeposit=recordBankTransfer({id:'new',bankAccountId:'cih',date:'08/02/2026',direction:'cash_to_bank',amount:1,description:'New'},[cih,other],[],1000);
 assert.equal(calculateBankBalance(cih,[newDeposit],migrated.payments,historicalOutflows),18800);
 assert.throws(()=>recordBankTransfer({...newDeposit,id:'too-much',direction:'bank_to_cash',amount:188.01},[cih,other],[newDeposit],1000,migrated.payments,historicalOutflows),/المتوفر/);
});
test('bank migration refuses broken pairs, modified supplier totals or invalid archived state',()=>{
 for(const change of [
   d=>{d.bankMovements[0].accountId='missing';},
   d=>{d.bankMovements[0].amountCentimes=1;},
   d=>{d.bankMovements[3].amountCentimes++;},
   d=>{d.bankMovements[4].amountCentimes++;},
   d=>{d.bankMovements.splice(4,1);},
   d=>{d.bankMovements.splice(6,1);},
   d=>{d.bankReconciliations[0].differenceCentimes=73;},
   d=>{d.bankAccounts[0].currency='EUR';},
 ]){
  const d=oldBank();change(d);
  const original=JSON.stringify(d);
  assert.throws(()=>adaptHistoricalSnapshot(d));
  assert.equal(JSON.stringify(d),original);
 }
 const migrated=adaptHistoricalSnapshot(oldBank());
 assert.equal(adaptHistoricalSnapshot(migrated),migrated);
 migrated.bankAccounts[0].historicalJournal.entries[0].kind='unknown';
 assert.throws(()=>adaptHistoricalSnapshot(migrated));
});

function oldReturns(){
 const d=old();
 d.customers[0].openingBalanceCentimes=5000;
 d.sales=[
   {id:20,productId:1,productName:'Câble ضو',customerName:'Customer',qty:1,total:70,costPrice:9,warehouseId:'warehouse-default'},
   {id:21,productId:2,productName:'Pièce',customerName:'Customer',qty:1,total:80,costPrice:11,warehouseId:'warehouse-default'},
 ];
 d.salesReturns=[
   {id:31,number:'AV-00008',saleId:21,productId:2,productName:'Pièce',customerName:'Customer',qty:1,total:80,costPrice:11,unitPrice:80,date:'28/02/2026',reason:'No restock',restocked:false,warehouseId:'warehouse-default'},
   {id:30,number:'AV-00007',saleId:20,productId:1,productName:'Câble ضو',customerName:'Customer',qty:1,total:70,costPrice:9,unitPrice:70,date:'27/02/2026',reason:'Restock',restocked:true,warehouseId:'warehouse-default'},
 ];
 d.inventoryMovements.push({id:'return-in-30',kind:'return_in',productId:1,quantityDelta:1,date:'2026-02-27T13:00:00Z',sourceId:'20'});
 d.products[0].qty=6;
 d.documents=[
   {id:11,type:'invoice',date:'20/01/2026',customerName:'Customer',total:120,paidCentimes:2000,status:'partially_paid'},
   {id:12,type:'invoice',date:'02/02/2026',customerName:'Customer',total:80,paidCentimes:6000,status:'partially_paid'},
 ];
 return d;
}
test('legacy return migration keeps the old invoice order, debt, unapplied credit and stock',()=>{
 const {calculateCustomerBalances}=require('../.test-build/domain/customer-balances.js');
 const {normalizeSalesReturns,quantityAvailableForReturn}=require('../.test-build/domain/sales-returns.js');
 const original=oldReturns(),before=JSON.stringify(original);
 const migrated=adaptHistoricalSnapshot(original);
 const returns=normalizeSalesReturns(JSON.parse(JSON.stringify(migrated.salesReturns)));
 assert.equal(returns.length,2);
 assert.deepEqual(returns.find(item=>item.id===30).invoiceAllocations.map(item=>[item.documentId,item.allocatedCentimes]),[[12,2000],[11,5000]]);
 assert.equal(returns.find(item=>item.id===31).number,'AV-00008');
 assert.equal(returns.find(item=>item.id===31).unappliedCentimes,3000);
 assert.ok(returns.every(item=>!item.refunds?.length&&item.historicalAllocation));
 assert.equal(migrated.documents[0].creditedCentimes,10000);
 assert.equal(migrated.documents[0].paidCentimes,2000);
 assert.equal(migrated.documents[1].status,'paid');
 const [balance]=calculateCustomerBalances(migrated.documents,returns,[{customerName:'Customer',amountCentimes:5000}]);
 assert.equal(balance.outstandingCentimes,5000);
 assert.equal(balance.customerCreditCentimes,3000);
 assert.equal(quantityAvailableForReturn(migrated.sales[0],returns),0);
 assert.equal(warehouseStock(migrated.stockMovements,'1','main'),5);
 assert.equal(migrated.stockMovements.filter(item=>item.kind==='return_in').length,1);
 assert.equal(JSON.stringify(original),before);
 assert.equal(adaptHistoricalSnapshot(migrated),migrated);
});

test('historical return keeps the old per-return centime rounding and allows reversed stock history',()=>{
 const d=oldReturns();
 d.sales[0].qty=3;d.sales[0].total=10;d.salesReturns[1].total=3.33;
 d.salesReturns.push({...d.salesReturns[1],id:32,number:'AV-00009',restocked:false});
 d.inventoryMovements.push(
   {id:'return-in-25',kind:'return_in',productId:1,quantityDelta:1,date:'2026-02-20',sourceId:'20'},
   {id:'return-out-25',kind:'return_out',productId:1,quantityDelta:-1,date:'2026-02-21',sourceId:'20'});
 const n=adaptHistoricalSnapshot(d);
 assert.equal(n.salesReturns.filter(item=>item.saleId===20).reduce((sum,item)=>sum+Math.round(item.total*100),0),666);
 assert.equal(n.salesReturns.some(item=>item.id===25),false);
 assert.equal(warehouseStock(n.stockMovements,'1','main'),5);
});

test('invalid physical or financial return evidence and invisible supplier invoice balances fail closed',()=>{
 for(const change of [
   d=>{d.inventoryMovements.at(-1).sourceId='other-sale';},
   d=>{d.salesReturns[1].restocked=false;},
   d=>{d.salesReturns[1].total=70.01;},
   d=>{d.documents[0].creditedCentimes=1;},
   d=>{d.supplierInvoices=[{id:9,totalCentimes:999}];},
   d=>{d.supplierInvoicePayments=[{id:9,amountCentimes:999}];},
 ]){
  const d=oldReturns();change(d);const source=JSON.stringify(d);
  assert.throws(()=>adaptHistoricalSnapshot(d));
  assert.equal(JSON.stringify(d),source);
 }
 const previous=adaptHistoricalSnapshot(old());
 assert.throws(()=>adaptHistoricalSnapshot({...previous,supplierInvoices:[{id:7}]}));
});
