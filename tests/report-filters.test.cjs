const test=require('node:test');
const assert=require('node:assert/strict');
const {filterByDateRange,validateDateRange}=require('../.test-build/report-filters.js');

test('filters ISO and Moroccan day/month dates inclusively',()=>{
  const rows=[{date:'2026-11-01',id:1},{date:'15/11/2026',id:2},{date:'30/11/2026',id:3},{date:'2026-12-01',id:4}];
  assert.deepEqual(filterByDateRange(rows,'2026-11-15','2026-11-30').map(item=>item.id),[2,3]);
});

test('rejects invalid dates and reversed report ranges',()=>{
  assert.ok(validateDateRange('2026-02-30','').length);
  assert.ok(validateDateRange('2026-12-01','2026-11-01').length);
  assert.throws(()=>filterByDateRange([{date:'2026-11-01'}],'bad',''),/تاريخ البداية/);
});


test('activity report applies filters to visible totals and PDF values',()=>{
  const app=require('node:fs').readFileSync('App.tsx','utf8');
  assert.match(app,/filterByDateRange\(sales,appliedReportRange\.from,appliedReportRange\.to\)/);
  assert.match(app,/reportProfitLoss=calculateProfitLoss\(reportSales,reportReturns,reportExpenses\)/);
  assert.match(app,/appliedReportRange\?tr\('الفترة المحددة'\)/);
});
