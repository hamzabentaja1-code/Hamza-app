const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateProfitLoss}=require('../.test-build/domain/profit-loss.js');

test('profit uses cost snapshots on sales instead of subtracting purchases',()=>{
  const result=calculateProfitLoss([{id:1,qty:3,total:300,unitCost:60}],[],[{amount:20}]);
  assert.deepEqual(result,{revenue:300,costOfGoodsSold:180,grossProfitOnCostedSales:120,expenses:20,netProfitOnCostedSales:100,uncostedRevenue:0});
});

test('restocked returns reverse cost while non-restocked returns do not',()=>{
  const sales=[{id:1,qty:2,total:200,unitCost:50}];
  const restocked=calculateProfitLoss(sales,[{saleId:1,qty:1,total:100,restocked:true}],[]);
  const notRestocked=calculateProfitLoss(sales,[{saleId:1,qty:1,total:100,restocked:false}],[]);
  assert.equal(restocked.costOfGoodsSold,50);
  assert.equal(restocked.grossProfitOnCostedSales,50);
  assert.equal(notRestocked.costOfGoodsSold,100);
  assert.equal(notRestocked.grossProfitOnCostedSales,0);
});

test('legacy sales without cost are excluded from the calculated margin and reported',()=>{
  const result=calculateProfitLoss([{id:1,qty:1,total:40},{id:2,qty:1,total:100,unitCost:60}],[],[]);
  assert.equal(result.revenue,140);
  assert.equal(result.grossProfitOnCostedSales,40);
  assert.equal(result.uncostedRevenue,40);
});
