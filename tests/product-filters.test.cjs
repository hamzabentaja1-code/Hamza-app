const test=require('node:test');
const assert=require('node:assert/strict');
const filters=require('../.test-build/product-filters.js');

const products=[
 {id:1,name:'Camera Alpha',reference:'CAM-1',barcode:'111',category:'Photo',brand:'A',kind:'product',qty:8},
 {id:2,name:'Cable',category:'Accessories',kind:'product',qty:0},
 {id:3,name:'Lens',kind:'product',qty:1},
 {id:4,name:'Installation',kind:'service',qty:0},
 {id:5,name:'Variant item',kind:'product',qty:99},
];
const variants=[
 {productId:5,stockQty:0,active:false},
 {productId:5,stockQty:3,active:true},
];

test('stock filters separate available, low, empty stock and services using variant totals',()=>{
 assert.deepEqual(filters.filterProducts(products,variants,'','all').map(x=>x.id),[1,2,3,4,5]);
 assert.deepEqual(filters.filterProducts(products,variants,'','in_stock').map(x=>x.id),[1,3,5]);
 assert.deepEqual(filters.filterProducts(products,variants,'','low_stock').map(x=>x.id),[3,5]);
 assert.deepEqual(filters.filterProducts(products,variants,'','out_of_stock').map(x=>x.id),[2]);
 assert.deepEqual(filters.filterProducts(products,variants,'','services').map(x=>x.id),[4]);
});

test('product filters search name, reference, barcode, category, brand, unit and variant',()=>{
 assert.equal(filters.filterProducts(products,variants,'cam-1').length,1);
 assert.equal(filters.filterProducts(products,variants,'111')[0].id,1);
 assert.equal(filters.filterProducts(products,variants,'photo')[0].id,1);
 assert.equal(filters.filterProducts(products,variants,'  CABLE  ')[0].id,2);
});

test('archived variants do not fall back to stale parent quantity',()=>{
 const product={id:6,name:'Archived variant',kind:'product',qty:500};
 assert.equal(filters.productStockQuantity(product,[{productId:6,stockQty:0,active:false}]),0);
});
