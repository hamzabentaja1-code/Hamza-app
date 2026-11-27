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
