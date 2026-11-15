const test=require('node:test');
const assert=require('node:assert/strict');
const {buildActivityReportRows}=require('../.test-build/domain/activity-report.js');

test('builds one report table for filtered sales, returns, purchases, expenses and settlements',()=>{
  const rows=buildActivityReportRows({
    sales:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:2,total:500}],
    returns:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:1,total:250}],
    purchases:[{date:'15/11/2026',supplierName:'Fournisseur B',productName:'Caméra',qty:5,total:800}],
    expenses:[{date:'15/11/2026',title:'Transport',amount:40}],
    customerPayments:[{date:'15/11/2026',customerName:'Client A',amount:100,method:'نقداً',note:'Acompte'}],
    supplierPayments:[{date:'15/11/2026',supplierName:'Fournisseur B',amount:200,method:'تحويل',reference:'R-2'},{date:'15/11/2026',supplierName:'Fournisseur B',amount:50,method:'إشعار دائن',reference:'AV-3'}],
  });
  assert.equal(rows.length,7);
  assert.deepEqual(rows[1],['15/11/2026','Avoir','Client A','Caméra',1,-250]);
  assert.deepEqual(rows[4],['15/11/2026','Encaissement client','Client A','نقداً • Acompte','',100]);
  assert.deepEqual(rows[5],['15/11/2026','Règlement fournisseur','Fournisseur B','تحويل • R-2','',-200]);
  assert.deepEqual(rows[6],['15/11/2026','Avoir fournisseur','Fournisseur B','إشعار دائن • AV-3','',50]);
});

test('keeps empty report sections empty',()=>{
  assert.deepEqual(buildActivityReportRows({sales:[],returns:[],purchases:[],expenses:[],customerPayments:[],supplierPayments:[]}),[]);
});
