const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {filterStockProducts}=require('../.test-build/stock-filters.js');
const products=[
 {id:1,name:'Router AX',price:250,stock:8,reference:'R-01',barcode:'611001',category:'Network',brand:'A'},
 {id:2,name:'Cable Cat6',price:30,stock:3,reference:'C-06',barcode:'611002',category:'Network',brand:'B'},
 {id:3,name:'Camera IP',price:450,stock:0,reference:'CAM-1',barcode:'611003',category:'Security'},
 {id:4,name:'Installation',price:120,stock:0,kind:'service',category:'Service'},
];
test('stock filters cover low, out-of-stock, services, category and barcode/reference search',()=>{
 assert.deepEqual(filterStockProducts(products,{status:'in'}).map(x=>x.id),[1,2]);
 assert.deepEqual(filterStockProducts(products,{status:'low'}).map(x=>x.id),[2]);
 assert.deepEqual(filterStockProducts(products,{status:'out'}).map(x=>x.id),[3]);
 assert.deepEqual(filterStockProducts(products,{status:'services'}).map(x=>x.id),[4]);
 assert.deepEqual(filterStockProducts(products,{category:'Network'}).map(x=>x.id),[2,1]);
 assert.equal(filterStockProducts(products,{query:'611003'})[0].id,3);
 assert.equal(filterStockProducts(products,{query:'C-06'})[0].id,2);
});
test('stock filters sort by quantity, price and name without mutating the source list',()=>{
 const before=products.map(x=>x.id);
 assert.deepEqual(filterStockProducts(products,{sort:'quantity'}).map(x=>x.id),[3,4,2,1]);
 assert.deepEqual(filterStockProducts(products,{sort:'price'}).map(x=>x.id),[2,4,1,3]);
 assert.deepEqual(filterStockProducts(products,{sort:'name'}).map(x=>x.name),['Cable Cat6','Camera IP','Installation','Router AX']);
 assert.deepEqual(products.map(x=>x.id),before);
});
test('product inventory screen connects filter state and displays an empty filtered result',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.ok(app.includes('filterStockProducts'));
 assert.ok(app.includes('getFilteredProducts().length===0'));
 assert.ok(app.includes("setStockFilter(item.id)"));
 assert.ok(app.includes("setStockCategoryFilter(item.id)"));
 assert.ok(app.includes("setStockSort(item.id)"));
});
