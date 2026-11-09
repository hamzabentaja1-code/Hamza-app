const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('App.tsx','utf8');

test('backup export creates a shareable JSON file on the phone rather than only a long message',()=>{
 assert.match(source,/FileSystem\.writeAsStringAsync\(uri,json,\{encoding:FileSystem\.EncodingType\.UTF8\}\)/);
 assert.match(source,/fileName='HamZa-backup-'/);
 assert.match(source,/Sharing\.shareAsync\(uri,\{mimeType:'application\/json'/);
 assert.match(source,/createBackup\(\{products,customers,sales/);
});
test('file picker loads JSON locally and passes selected text through validated confirmation flow',()=>{
 assert.match(source,/DocumentPicker\.getDocumentAsync\(\{type:'\*\/\*',copyToCacheDirectory:true,multiple:false\}\)/);
 assert.match(source,/asset\.name\.toLowerCase\(\)\.endsWith\('\.json'\)/);
 assert.match(source,/asset\.size>8_000_000/);
 assert.match(source,/FileSystem\.readAsStringAsync\(asset\.uri/);
 assert.match(source,/importBackup\(json\)/);
 assert.match(source,/const d=await restoreBackup\(jsonSource\)/);
 assert.match(source,/showAlert\('استرجاع البيانات'/);
});
test('both backup settings and protected startup offer a usable file restore action',()=>{
 const matches=source.match(/onPress=\{pickBackupFile\}/g)||[];
 assert.equal(matches.length,2);
 assert.match(source,/if\(startupError\)return <LanguageContext\.Provider/);
 assert.match(source,/disabled=\{backupBusy\}/);
 assert.match(source,/onPress=\{\(\)=>importBackup\(\)\}/);
});
