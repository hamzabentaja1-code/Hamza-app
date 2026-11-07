const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('period report exposes an XLSX export action and shares a generated workbook',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 const report=fs.readFileSync(path.join(__dirname,'..','src','PeriodReportWorkspace.tsx'),'utf8');
 const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
 assert.ok(pkg.dependencies.xlsx);
 assert.ok(app.includes("import * as XLSX from 'xlsx'"));
 assert.ok(app.includes('XLSX.utils.book_new()'));
 assert.ok(app.includes("XLSX.write(workbook,{bookType:'xlsx',type:'base64'})"));
 assert.ok(app.includes('FileSystem.writeAsStringAsync(uri,base64'));
 assert.ok(app.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
 assert.ok(app.includes('onExportXlsx={exportReportXlsx}'));
 assert.ok(report.includes('onExportXlsx:(title:string,rows:string[][])=>void'));
 assert.ok(report.includes('onExportXlsx('));
 assert.ok(report.includes('تصدير التقرير Excel (XLSX)'));
});
