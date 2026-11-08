const test = require('node:test');
const assert = require('node:assert/strict');
const jpeg = require('jpeg-js');
const {fingerprintJpegDataUri}=require('../.test-build/image-fingerprint.js');
const {fingerprintDistance}=require('../.test-build/domain/image-search.js');

test('fingerprints JPEG data locally without relying on a native decoder',()=>{
  const data=new Uint8Array(16*16*4);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const offset=(y*16+x)*4;
    const value=x<8?20:230;
    data[offset]=value;data[offset+1]=value;data[offset+2]=value;data[offset+3]=255;
  }
  const encoded=jpeg.encode({data,width:16,height:16},60).data;
  const uri='data:image/jpeg;base64,'+Buffer.from(encoded).toString('base64');
  const fingerprint=fingerprintJpegDataUri(uri);
  assert.match(fingerprint,/^[0-9a-f]{16}$/);
  const recompressed=jpeg.encode({data,width:16,height:16},35).data;
  const sameScene='data:image/jpeg;base64,'+Buffer.from(recompressed).toString('base64');
  assert.ok(fingerprintDistance(fingerprint,fingerprintJpegDataUri(sameScene))<=5);
  assert.throws(()=>fingerprintJpegDataUri('data:image/jpeg;base64,not-valid'),/.*/);
});
