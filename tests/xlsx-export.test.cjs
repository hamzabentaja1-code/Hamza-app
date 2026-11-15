const test=require('node:test');
const assert=require('node:assert/strict');
const JSZip=require('jszip');
const {buildXlsx}=require('../.test-build/domain/xlsx-export.js');

test('builds a valid multi-sheet XLSX with typed numbers, Unicode and safe text cells',async()=>{
  const base64=await buildXlsx([
    {name:'Produits',headers:['اسم المنتج','الثمن','متوفر'],rows:[['=HYPERLINK("x")',12.5,true]]},
    {name:'Ventes',headers:['Date','Total'],rows:[['14/11/2026',0]]},
  ]);
  const zip=await JSZip.loadAsync(base64,{base64:true});
  assert.ok(zip.file('[Content_Types].xml'));
  const workbook=await zip.file('xl/workbook.xml').async('string');
  assert.match(workbook,/name="Produits"/);
  assert.match(workbook,/name="Ventes"/);
  const products=await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(products,/<c r="B2"><v>12\.5<\/v><\/c>/);
  assert.match(products,/<c r="C2" t="b"><v>1<\/v><\/c>/);
  assert.match(products,/<t xml:space="preserve">=HYPERLINK\(&quot;x&quot;\)<\/t>/);
  assert.doesNotMatch(products,/<f>/);
});

test('rejects an empty workbook and sanitizes duplicate sheet names',async()=>{
  await assert.rejects(buildXlsx([]),/ورقة واحدة/);
  const base64=await buildXlsx([{name:"'Sales/Report'",headers:['A'],rows:[['bad\u0000text\u0007']]},{name:'Sales Report',headers:['B'],rows:[]}]);
  const zip=await JSZip.loadAsync(base64,{base64:true});
  const workbook=await zip.file('xl/workbook.xml').async('string');
  assert.match(workbook,/name="Sales Report"/);
  assert.match(workbook,/name="Sales Report 2"/);
  assert.doesNotMatch(workbook,/name="'[^\"]*"/);
  const sheet=await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet,/<t xml:space="preserve">badtext<\/t>/);
  assert.doesNotMatch(sheet,/\u0000|\u0007/);
});
