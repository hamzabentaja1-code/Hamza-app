const test=require('node:test');
const assert=require('node:assert/strict');
const {filterPosCatalogProducts}=require('../.test-build/domain/pos-catalog.js');

const products=[
  {id:'1',name:'Routeur Archer',reference:'RT-01',barcode:'61100001',category:'Réseau',stock:3},
  {id:'2',name:'Switch PoE',reference:'SW-02',category:'Réseau',stock:0},
  {id:'3',name:'Disjoncteur',category:'Électricité',stock:5},
];

test('POS catalog filters by product category and available stock together',()=>{
  assert.deepEqual(filterPosCatalogProducts(products,'','Réseau',true).map(x=>x.id),['1']);
  assert.deepEqual(filterPosCatalogProducts(products,'','Réseau',false).map(x=>x.id),['1','2']);
});

test('POS catalog searches names, references and barcodes after applying filters',()=>{
  assert.deepEqual(filterPosCatalogProducts(products,'61100001','',false).map(x=>x.id),['1']);
  assert.deepEqual(filterPosCatalogProducts(products,'SW-02','Réseau',true),[]);
});

test('POS catalog limits results and treats whitespace query as empty',()=>{
  assert.deepEqual(filterPosCatalogProducts(products,'   ','',false,2).map(x=>x.id),['1','2']);
  assert.deepEqual(filterPosCatalogProducts(products,'','',false,0),[]);
});
