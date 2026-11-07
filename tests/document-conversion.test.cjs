const test = require('node:test');
const assert = require('node:assert/strict');
const { convertQuote } = require('../.test-build/document-conversion.js');

test('invoice conversion deducts stock when no delivery note exists', () => {
  const products = [{id:7,qty:10}];
  const result = convertQuote({id:1,productName:'Widget',customerName:'Client',qty:2,unitPrice:500,total:1000,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:500,total:1000}]},'invoice',[],products,99,'04/11/2026');
  assert.equal(result.document.number,'FAC-99');
  assert.equal(result.updatedProducts[0].qty,8);
  assert.equal(result.stockDeducted,true);
});
test('invoice and delivery conversions never deduct stock twice for the same quote', () => {
  const quote={id:4,productName:'Widget',customerName:'Client',qty:2,unitPrice:500,total:1000,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:500,total:1000}]};
  const products=[{id:7,qty:10}];
  const delivery=convertQuote(quote,'delivery',[],products,401,'04/11/2026');
  const invoice=convertQuote(quote,'invoice',[delivery.document],delivery.updatedProducts,402,'04/11/2026');
  assert.equal(delivery.updatedProducts[0].qty,8);
  assert.equal(invoice.updatedProducts[0].qty,8);
  assert.equal(invoice.stockDeducted,false);
  const invoiceFirst=convertQuote(quote,'invoice',[],products,403,'04/11/2026');
  const deliverySecond=convertQuote(quote,'delivery',[invoiceFirst.document],invoiceFirst.updatedProducts,404,'04/11/2026');
  assert.equal(deliverySecond.updatedProducts[0].qty,8);
  assert.equal(deliverySecond.stockDeducted,false);
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
