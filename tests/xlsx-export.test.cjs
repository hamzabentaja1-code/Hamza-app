const test=require('node:test');
const assert=require('node:assert/strict');
const {unzipSync,strFromU8}=require('fflate');
const {createXlsxBase64}=require('../.test-build/xlsx-export.js');

test('creates a valid multi-sheet XLSX package with Arabic text and escaped cells',()=>{
  const encoded=createXlsxBase64([{name:'Products',rows:[['الاسم','الثمن'],['Caméra & routeur',125.5]]},{name:'Report',rows:[['Client','Note'],['Hamza','<مراجعة>']]}]);
  const files=unzipSync(new Uint8Array(Buffer.from(encoded,'base64')));
  assert.ok(files['[Content_Types].xml']);
  assert.match(strFromU8(files['xl/workbook.xml']),/name="Products"/);
  assert.match(strFromU8(files['xl/worksheets/sheet1.xml']),/الاسم/);
  assert.match(strFromU8(files['xl/worksheets/sheet1.xml']),/125\.5/);
  assert.match(strFromU8(files['xl/worksheets/sheet2.xml']),/&lt;مراجعة&gt;/);
});

test('rejects an empty workbook and avoids duplicate worksheet names',()=>{
  assert.throws(()=>createXlsxBase64([]),/at least one sheet/);
  const files=unzipSync(new Uint8Array(Buffer.from(createXlsxBase64([{name:'Report',rows:[]},{name:'Report',rows:[]}]),'base64')));
  assert.match(strFromU8(files['xl/workbook.xml']),/name="Report_1"/);
});
