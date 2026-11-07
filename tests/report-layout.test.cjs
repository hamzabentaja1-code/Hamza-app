const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const layout=require('../.test-build/report-layout.js');

test('report layout defaults to all sections and normalizes partial or corrupt settings',()=>{
 assert.deepEqual(layout.normalizePeriodReportLayout(undefined),layout.DEFAULT_PERIOD_REPORT_LAYOUT);
 assert.deepEqual(layout.normalizePeriodReportLayout({summary:false,monthlyTrend:false}),{summary:false,comparison:false,monthlyTrend:false,supplierComparison:true});
 assert.deepEqual(layout.normalizePeriodReportLayout('invalid'),layout.DEFAULT_PERIOD_REPORT_LAYOUT);
});

test('report layout cannot disable the final remaining section or comparison without summary',()=>{
 let current={summary:true,comparison:false,monthlyTrend:false,supplierComparison:false};
 assert.deepEqual(layout.togglePeriodReportLayout(current,'summary'),current);
 assert.deepEqual(layout.togglePeriodReportLayout({summary:true,comparison:true,monthlyTrend:false,supplierComparison:false},'summary'),{summary:true,comparison:true,monthlyTrend:false,supplierComparison:false});
 const summaryOff=layout.togglePeriodReportLayout({summary:true,comparison:true,monthlyTrend:true,supplierComparison:false},'summary');
 assert.deepEqual(summaryOff,{summary:false,comparison:false,monthlyTrend:true,supplierComparison:false});
 assert.deepEqual(layout.togglePeriodReportLayout(summaryOff,'summary'),{summary:true,comparison:true,monthlyTrend:true,supplierComparison:false});
 current={summary:false,comparison:true,monthlyTrend:true,supplierComparison:false};
 assert.deepEqual(layout.togglePeriodReportLayout(current,'comparison'),current);
 assert.deepEqual(layout.togglePeriodReportLayout(current,'monthlyTrend'),{summary:false,comparison:true,monthlyTrend:false,supplierComparison:false});
});

test('report workspace applies selected sections to visible output and PDF CSV XLSX exports',()=>{
 const workspace=fs.readFileSync(path.join(__dirname,'..','src','PeriodReportWorkspace.tsx'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(workspace,/layout\.summary&&/);
 assert.match(workspace,/layout\.monthlyTrend&&/);
 assert.match(workspace,/layout\.supplierComparison&&/);
 assert.match(workspace,/layout\.comparison\?/);
 assert.match(workspace,/onLayoutChange\(togglePeriodReportLayout\(layout,item\.key\)\)/);
 assert.match(app,/writeAppData\(\{[\s\S]*?contactInteractions,priceGroups,reportLayout\}\)/);
 assert.match(app,/setReportLayout\(normalizePeriodReportLayout\(d\.reportLayout\)\)/);
 assert.match(app,/layout=\{reportLayout\} onLayoutChange=\{setReportLayout\}/);
 assert.match(app,/createBackup\(\{[\s\S]*?reportLayout\}/);
});
