const test=require('node:test');const assert=require('node:assert/strict');
const {buildPeriodReport}=require('../.test-build/period-report.js');
test('period report nets sales and purchases after returns and subtracts expenses',()=>{
 const r=buildPeriodReport({fromDate:'2026-11-01',toDate:'2026-11-07',
 sales:[{date:'2026-11-02',amount:1000},{date:'06/11/2026',amount:500}],
 salesReturns:[{date:'2026-11-03',amount:100}],
 purchases:[{date:'2026-11-04',amount:400}],
 supplierReturns:[{date:'2026-11-05',amount:50}],
 expenses:[{date:'2026-11-06',amount:100}]});
 assert.equal(r.current.netSales,1400);assert.equal(r.current.netPurchases,350);assert.equal(r.current.operatingIndicator,950);
 assert.equal(r.previous.salesGross,0);assert.equal(r.unparsedDates,0);
});
test('period report compares with the immediately preceding equal-length period',()=>{
 const r=buildPeriodReport({fromDate:'2026-11-08',toDate:'2026-11-14',sales:[{date:'2026-11-07',amount:200},{date:'2026-11-08',amount:100}],salesReturns:[],purchases:[],supplierReturns:[],expenses:[]});
 assert.equal(r.previousFromDate,'2026-11-01');assert.equal(r.previousToDate,'2026-11-07');assert.equal(r.previous.salesGross,200);assert.equal(r.current.salesGross,100);
});
test('invalid legacy dates are counted rather than silently misdated',()=>{
 const r=buildPeriodReport({fromDate:'2026-11-01',toDate:'2026-11-30',sales:[{date:'not-a-date',amount:50}],salesReturns:[],purchases:[],supplierReturns:[],expenses:[]});
 assert.equal(r.current.salesGross,0);assert.equal(r.unparsedDates,1);
});
test('period report rejects reversed and malformed date ranges',()=>{
 assert.throws(()=>buildPeriodReport({fromDate:'2026-11-30',toDate:'2026-11-01',sales:[],salesReturns:[],purchases:[],supplierReturns:[],expenses:[]}),/غير صالحة/);
});
