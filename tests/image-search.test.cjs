const test = require('node:test');
const assert = require('node:assert/strict');
const {differenceHash,fingerprintDistance,rankImageMatches,rankUniqueProductImageMatches}=require('../.test-build/domain/image-search.js');

const solid=(r,g,b)=>{
  const data=new Uint8Array(16*8*4);
  for(let i=0;i<data.length;i+=4){data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}
  return differenceHash(16,8,data);
};

test('difference hash is stable for flat images and validates pixel buffers',()=>{
  assert.equal(solid(20,20,20),'0000000000000000');
  assert.throws(()=>differenceHash(0,8,new Uint8Array()),/invalid/i);
  assert.throws(()=>differenceHash(2,1,new Uint8Array(4)),/invalid/i);
});

test('fingerprint distance counts changed bits across all 64 bits',()=>{
  assert.equal(fingerprintDistance('0000000000000000','0000000000000000'),0);
  assert.equal(fingerprintDistance('0000000000000000','8000000100000001'),3);
  assert.throws(()=>fingerprintDistance('bad','0000000000000000'),/invalid/i);
});

test('image candidates rank nearest visual fingerprints and honor threshold and limit',()=>{
  const query='0000000000000000';
  const ranked=rankImageMatches(query,[
    {item:'far',fingerprint:'ffffffffffffffff'},
    {item:'near',fingerprint:'0000000000000003'},
    {item:'exact',fingerprint:query},
  ],4,1);
  assert.deepEqual(ranked,[{item:'exact',distance:0}]);
  assert.deepEqual(rankImageMatches(query,[{item:'far',fingerprint:'ffffffffffffffff'}],8),[]);
  assert.throws(()=>rankImageMatches(query,[],65),/between 0 and 64/);
});

test('multi-photo product search returns each product once using its nearest photo',()=>{
  const query='0000000000000000';
  const first={id:1,name:'First'};
  const second={id:2,name:'Second'};
  const ranked=rankUniqueProductImageMatches(query,[
    {item:first,fingerprint:'000000000000001f'},
    {item:second,fingerprint:'0000000000000003'},
    {item:first,fingerprint:'0000000000000000'},
  ],10,20);
  assert.deepEqual(ranked,[{item:first,distance:0},{item:second,distance:2}]);
  assert.equal(rankUniqueProductImageMatches(query,[
    {item:first,fingerprint:query},
    {item:second,fingerprint:'0000000000000003'},
  ],10,1).length,1);
});
