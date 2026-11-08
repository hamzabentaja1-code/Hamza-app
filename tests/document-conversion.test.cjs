const test = require('node:test');
const assert = require('node:assert/strict');
const { convertQuote } = require('../.test-build/domain/document-conversion.js');

test('invoice conversion preserves stock', () => {
  const products = [{id:7,qty:10}];
  const result = convertQuote({id:1,productName:'Widget',customerName:'Client',qty:2,unitPrice:500,total:1000,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:500,total:1000}]},'invoice',[],products,99,'04/11/2026');
  assert.equal(result.document.number,'FAC-99');
  assert.deepEqual(result.updatedProducts,products);
});

test('delivery conversion deducts stock and blocks duplicate conversion', () => {
  const quote = {id:2,productName:'Widget',customerName:'Client',qty:3,unitPrice:100,total:300,lines:[{productId:7,productName:'Widget',qty:3,unitPrice:100,total:300}]};
  const products = [{id:7,qty:8}];
  const result = convertQuote(quote,'delivery',[],products,100,'04/11/2026');
  assert.equal(result.document.number,'BL-100');
  assert.equal(result.updatedProducts[0].qty,5);
  assert.throws(() => convertQuote(quote,'delivery',[result.document],products,101,'04/11/2026'));
});

test('delivery conversion rejects insufficient stock', () => {
  const quote = {id:3,productName:'Widget',customerName:'Client',qty:4,unitPrice:100,total:400,lines:[{productId:7,productName:'Widget',qty:4,unitPrice:100,total:400}]};
  assert.throws(() => convertQuote(quote,'delivery',[],[{id:7,qty:2}],102,'04/11/2026'));
});


test('proforma and customer-order conversions preserve stock and remain distinct',()=>{
  const quote={id:5,productName:'Widget',customerName:'Client',qty:2,unitPrice:50,total:100,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:50,total:100}]};
  const products=[{id:7,qty:10}];
  const proforma=convertQuote(quote,'proforma',[],products,200,'2026-11-08');
  assert.equal(proforma.document.number,'PRO-200');
  assert.equal(proforma.document.status,'أولية');
  assert.deepEqual(proforma.updatedProducts,products);
  const order=convertQuote(quote,'customer_order',[proforma.document],products,201,'2026-11-08');
  assert.equal(order.document.number,'CMD-201');
  assert.equal(order.document.status,'مؤكد');
  assert.deepEqual(order.updatedProducts,products);
  assert.throws(()=>convertQuote(quote,'proforma',[proforma.document],products,202,'2026-11-08'));
});
