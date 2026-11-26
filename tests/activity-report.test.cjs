const test=require('node:test');
const assert=require('node:assert/strict');
const {buildActivityReportRows}=require('../.test-build/domain/activity-report.js');

test('builds one report table for filtered sales, returns, purchases, expenses and settlements',()=>{
  const rows=buildActivityReportRows({
    sales:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:2,total:500}],
    returns:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:1,total:250}],
    purchases:[{date:'15/11/2026',supplierName:'Fournisseur B',productName:'Caméra',qty:5,total:800}],
    expenses:[{date:'15/11/2026',title:'Transport',category:'Déplacements',amount:40}],
    customerPayments:[{date:'15/11/2026',customerName:'Client A',amount:100,method:'نقداً',note:'Acompte'}],
    supplierPayments:[{date:'15/11/2026',supplierName:'Fournisseur B',amount:200,method:'تحويل',reference:'R-2'},{date:'15/11/2026',supplierName:'Fournisseur B',amount:50,method:'إشعار دائن',reference:'AV-3'}],
  });
  assert.equal(rows.length,7);
  assert.deepEqual(rows[1],['15/11/2026','Avoir','Client A','Caméra',1,-250]);
  assert.deepEqual(rows[3],['15/11/2026','Dépense','','Déplacements • Transport','',40]);
  assert.deepEqual(rows[4],['15/11/2026','Encaissement client','Client A','نقداً • Acompte','',100]);
  assert.deepEqual(rows[5],['15/11/2026','Règlement fournisseur','Fournisseur B','تحويل • R-2','',-200]);
  assert.deepEqual(rows[6],['15/11/2026','Avoir fournisseur','Fournisseur B','إشعار دائن • AV-3','',50]);
});

test('keeps empty report sections empty',()=>{
  assert.deepEqual(buildActivityReportRows({sales:[],returns:[],purchases:[],expenses:[],customerPayments:[],supplierPayments:[]}),[]);
});

test('reports include draftless and quote invoices, retain global discounts, and never count a POS invoice twice',()=>{
  const {includeInvoicedSales}=require('../.test-build/domain/activity-report.js');
  const invoices=[{id:1,type:'invoice',number:'FV-00001',customerName:'Client',date:'12/11/2026',total:11.01,lines:[
    {productName:'A',qty:1,unitPrice:15,total:15},{productName:'B',qty:1,unitPrice:15,total:15}
  ]}];
  const existing={id:3,documentId:2,date:'12/11/2026',productName:'POS',customerName:'Client',qty:1,unitPrice:30,total:30,unitCost:10};
  const rows=includeInvoicedSales([existing],[...invoices,{...invoices[0],id:2,type:'invoice'},{...invoices[0],id:4,type:'proforma'}]);
  assert.deepEqual(rows.map(item=>item.total),[30,5.51,5.5]);
  assert.equal(rows[0].unitCost,10);
  assert.equal(rows[1].unitCost,undefined);
  assert.equal(rows[1].reference,'FV-00001');
});
