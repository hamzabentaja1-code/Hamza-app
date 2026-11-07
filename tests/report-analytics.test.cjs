const test=require('node:test');const assert=require('node:assert/strict');
const {buildSupplierPurchaseComparison,buildMonthlyTrend}=require('../.test-build/report-analytics.js');
test('supplier comparison ranks net purchases after supplier returns',()=>{
 const rows=buildSupplierPurchaseComparison([
  {date:'2026-11-02',supplierName:'A',amount:1000},
  {date:'2026-11-03',supplierName:'B',amount:800},
  {date:'2026-10-30',supplierName:'A',amount:500},
 ],[{date:'2026-11-04',supplierName:'A',amount:300}], '2026-11-01','2026-11-30');
 assert.equal(rows[0].supplierName,'B');
 assert.equal(rows.find(x=>x.supplierName==='A').netPurchases,700);
 assert.equal(rows.find(x=>x.supplierName==='A').purchaseCount,1);
});
test('monthly trend returns every month in the selected range and aggregates each ledger',()=>{
 const rows=buildMonthlyTrend({
  fromDate:'2026-10-15',toDate:'2026-12-05',
  sales:[{date:'2026-10-20',amount:100},{date:'2026-12-01',amount:200}],
  salesReturns:[{date:'2026-10-22',amount:10}],purchases:[{date:'2026-11-02',amount:40}],
  supplierReturns:[],expenses:[{date:'2026-12-02',amount:15}],
 });
 assert.deepEqual(rows.map(x=>x.month),['2026-10','2026-11','2026-12']);
 assert.equal(rows[0].sales,100);assert.equal(rows[0].salesReturns,10);
 assert.equal(rows[1].purchases,40);assert.equal(rows[2].expenses,15);
});
test('analytics rejects invalid ranges and negative amounts',()=>{
 assert.throws(()=>buildSupplierPurchaseComparison([],[],'2026-12-01','2026-11-01'));
 assert.throws(()=>buildMonthlyTrend({fromDate:'2026-11-01',toDate:'2026-11-30',sales:[{date:'2026-11-02',amount:-1}],salesReturns:[],purchases:[],supplierReturns:[],expenses:[]}));
});
