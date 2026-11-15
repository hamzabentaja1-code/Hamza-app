const test=require('node:test');
const assert=require('node:assert/strict');
const {nextDocumentNumber}=require('../.test-build/domain/document-numbering.js');

test('generates a padded sequence and advances from the highest stored number',()=>{
  assert.equal(nextDocumentNumber('DEV',[]),'DEV-00001');
  assert.equal(nextDocumentNumber('FV',[{number:'FV-00003'},{number:'FV-00012'},{number:'FV-173'}]),'FV-00174');
});

test('ignores unrelated legacy IDs and matches prefixes case-insensitively',()=>{
  assert.equal(nextDocumentNumber('AV',[{number:'AV-00009'},{number:'FAC-99231'},{number:'av-00011'}]),'AV-00012');
});

test('sanitizes prefixes and rejects an empty result',()=>{
  assert.equal(nextDocumentNumber(' F/V ',[]),'FV-00001');
  assert.throws(()=>nextDocumentNumber(' / ',[]));
});
