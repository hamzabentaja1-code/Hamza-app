const test = require('node:test');
const assert = require('node:assert/strict');
const { convertQuote, remainingDeliveryLines } = require('../.test-build/domain/document-conversion.js');

test('invoice conversion preserves stock', () => {
  const products = [{id:7,qty:10}];
  const result = convertQuote({id:1,productName:'Widget',customerName:'Client',qty:2,unitPrice:500,total:1000,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:500,total:1000}]},'invoice',[],products,99,'04/11/2026');
  assert.equal(result.document.number,'FAC-99');
  assert.deepEqual(result.updatedProducts,products);
});

test('a full delivery deducts stock and marks the quote quantities complete', () => {
  const quote = {id:2,productName:'Widget',customerName:'Client',qty:3,unitPrice:100,total:300,lines:[{productId:7,productName:'Widget',qty:3,unitPrice:100,total:300}]};
  const products = [{id:7,qty:8}];
  const result = convertQuote(quote,'delivery',[],products,100,'04/11/2026');
  assert.equal(result.document.number,'BL-100');
  assert.equal(result.updatedProducts[0].qty,5);
  assert.throws(() => convertQuote(quote,'delivery',[result.document],products,101,'04/11/2026'));
  assert.equal(remainingDeliveryLines(quote.lines,[result.document])[0].remainingQty,0);
});


test('partial delivery notes track remaining quantities and allocate the quote total exactly',()=>{
  const quote={id:20,productName:'Widget',customerName:'Client',qty:3,unitPrice:100,total:270,lines:[{productId:7,productName:'Widget',qty:3,unitPrice:100,total:300}]};
  const products=[{id:7,qty:5}];
  const first=convertQuote(quote,'delivery',[],products,210,'2026-11-08',[{productId:7,qty:1}]);
  assert.equal(first.document.lines[0].qty,1);
  assert.equal(first.document.total,90);
  assert.equal(first.updatedProducts[0].qty,4);
  assert.equal(remainingDeliveryLines(quote.lines,[first.document])[0].remainingQty,2);
  const second=convertQuote(quote,'delivery',[first.document],first.updatedProducts,211,'2026-11-09',[{productId:7,qty:1}]);
  const final=convertQuote(quote,'delivery',[first.document,second.document],second.updatedProducts,212,'2026-11-10');
  assert.equal(final.document.lines[0].qty,1);
  assert.equal([first,second,final].reduce((sum,result)=>sum+result.document.total,0),quote.total);
  assert.equal(final.updatedProducts[0].qty,2);
  assert.throws(()=>convertQuote(quote,'delivery',[first.document,second.document,final.document],final.updatedProducts,213,'2026-11-11'),/already been delivered/);
});


test('partial delivery keeps duplicate-product quote lines and their unit prices separate',()=>{
  const quote={id:22,productName:'Widget',customerName:'Client',qty:5,unitPrice:0,total:800,lines:[
    {productId:7,productName:'Widget A',qty:2,unitPrice:100,total:200},
    {productId:7,productName:'Widget B',qty:3,unitPrice:200,total:600},
  ]};
  const products=[{id:7,qty:10}];
  const part=convertQuote(quote,'delivery',[],products,225,'2026-11-08',[{productId:7,qty:1,lineIndex:1}]);
  assert.equal(part.document.lines[0].productName,'Widget B');
  assert.equal(part.document.lines[0].unitPrice,200);
  const remaining=remainingDeliveryLines(quote.lines,[part.document]);
  assert.deepEqual(remaining.map(line=>line.remainingQty),[2,2]);
});

test('partial delivery rejects zero, excess, unknown product, and unavailable stock',()=>{
  const quote={id:21,productName:'Widget',customerName:'Client',qty:2,unitPrice:100,total:200,lines:[{productId:7,productName:'Widget',qty:2,unitPrice:100,total:200}]};
  const products=[{id:7,qty:1}];
  assert.throws(()=>convertQuote(quote,'delivery',[],products,220,'2026-11-08',[{productId:7,qty:0}]),/greater than zero/);
  assert.throws(()=>convertQuote(quote,'delivery',[],products,221,'2026-11-08',[{productId:7,qty:2}]),/Insufficient stock/);
  assert.throws(()=>convertQuote(quote,'delivery',[],products,222,'2026-11-08',[{productId:9,qty:1}]),/remaining quote quantity/);
  const partial=convertQuote(quote,'delivery',[],products,223,'2026-11-08',[{productId:7,qty:1}]);
  assert.throws(()=>convertQuote(quote,'delivery',[partial.document],partial.updatedProducts,224,'2026-11-09',[{productId:7,qty:2}]),/remaining quote quantity/);
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
