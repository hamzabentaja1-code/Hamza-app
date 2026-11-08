const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateSalesProfit}=require('../.test-build/profit.js');

test('profit uses the sale-time cost snapshot and excludes legacy sales without cost',()=>{
  assert.deepEqual(calculateSalesProfit([
    {total:250,qty:2,costPrice:75},
    {total:100,qty:1},
  ]),{grossProfitCentimes:10000,trackedTransactions:1,untrackedTransactions:1});
});

test('profit calculation rounds each amount to centimes and rejects invalid records',()=>{
  assert.deepEqual(calculateSalesProfit([{total:10.005,qty:2,costPrice:3.333},{total:-5,qty:1,costPrice:1}]),{grossProfitCentimes:335,trackedTransactions:1,untrackedTransactions:1});
});
