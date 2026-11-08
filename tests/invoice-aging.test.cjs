const test=require('node:test');
const assert=require('node:assert/strict');
const {getOverdueInvoices}=require('../.test-build/domain/invoice-aging.js');

test('overdue invoices subtract payments and credits and ignore due or settled invoices',()=>{
  const rows=getOverdueInvoices([
    {id:1,number:'F1',customerName:'A',dueDate:'2026-11-01',total:100,paidCentimes:3000,creditedCentimes:1000,status:'partially_paid'},
    {id:2,number:'F2',customerName:'B',dueDate:'2026-11-08',total:80,status:'issued'},
    {id:3,number:'F3',customerName:'C',dueDate:'2026-10-30',total:20,paidCentimes:2000,status:'paid'},
    {id:4,number:'F4',customerName:'D',total:50,status:'issued'},
    {id:5,number:'F5',customerName:'E',dueDate:'2026-10-31',total:10,status:'open'}
  ],'2026-11-08');
  assert.deepEqual(rows.map(item=>[item.id,item.remainingCentimes,item.overdueDays]),[[5,1000,8],[1,6000,7]]);
  assert.throws(()=>getOverdueInvoices([],'08/11/2026'),/تاريخ اليوم/);
});
