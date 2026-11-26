const {test}=require('node:test');
const assert=require('node:assert/strict');
const {previewProductImport}=require('../.test-build/domain/product-import.js');
const {buildCsv}=require('../.test-build/domain/csv-export.js');

test('round-trips HamZa CSV columns with BOM, quotes, tabs, newlines and barcode zeros',()=>{
  const text=buildCsv(['Nom','Référence','Code-barres','Catégorie','Prix achat DH','Prix vente DH','Prix devis DH','Prix facture DH','Quantité','Marque','Unité','Modèle'],
    [['Caméra "HD"; 12 V','Cam-1','000716','Sécurité\tIP',43,60,55,58,7,'A\nPro','Pièce','Noir']]);
  const p=previewProductImport(text,[]);
  assert.deepEqual(p.rejected,[]);
  assert.deepEqual(p.accepted,[{line:2,product:{name:'Caméra "HD"; 12 V',reference:'Cam-1',barcode:'000716',category:'Sécurité\tIP',costPrice:43,price:60,quotePrice:55,invoicePrice:58,qty:7,brand:'A\nPro',unit:'Pièce',variant:'Noir'}}]);
});

test('reads headerless legacy and UTF-8 TSV, with Arabic digits and decimal comma',()=>{
  const result=previewProductImport('Routeur\tR011\t00112\tRéseau\t12,40\t٤٥٫٠٠\t٠٢\tAcme\tPièce\tT5\t39.99\t40',[]);
  assert.equal(result.accepted[0].product.price,45);
  assert.equal(result.accepted[0].product.qty,2);
  assert.equal(result.accepted[0].product.quotePrice,39.99);
  assert.equal(result.accepted[0].product.barcode,'00112');
});

test('handles comma CSV, human line numbers and detects duplicates without mutating catalog',()=>{
  const existing=[{reference:' OLD ',barcode:'0009'}];
  const text='\nNom,Code-barres,Référence,Prix vente\nÉcran,0000,Old,15\n"Capteur, 12 V",0004,S4,18\nCâble,0004,C1,2\nKit,0002,D2,"1,5"';
  const r=previewProductImport(text,existing);
  assert.deepEqual(r.rejected,[{line:3,code:'duplicate'},{line:5,code:'duplicate'}]);
  assert.deepEqual(r.accepted.map(x=>[x.line,x.product.name,x.product.price]),[[4,'Capteur, 12 V',18],[6,'Kit',1.5]]);
  assert.deepEqual(existing,[{reference:' OLD ',barcode:'0009'}]);
  const changed=previewProductImport(text,[...existing,{barcode:'0004'}]);
  assert.equal(changed.accepted.length,1);
});

test('rejects invalid money and stock without partially interpreting unreadable source',()=>{
  const r=previewProductImport('Nom;Prix vente;Quantité\nA;12.555;2\nB;4;1.5\nC;4;0',[]);
  assert.deepEqual(r.rejected,[{line:2,code:'invalid_number'},{line:3,code:'invalid_number'}]);
  assert.equal(r.accepted[0].product.qty,0);
  assert.throws(()=>previewProductImport('Nom;Prix vente\n"Unclosed;10',[]),/format/);
  assert.throws(()=>previewProductImport('Nom;Nom;Prix vente\nA;B;2',[]),/headers/);
  assert.throws(()=>previewProductImport('a\0;1',[]),/encoding/);
  assert.throws(()=>previewProductImport('Nom;Prix vente\n'+'a;1\n'.repeat(2001),[]),/too_many_rows/);
});
