const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require.resolve('../.test-build/storage.js'),'utf8');
const key='hamza_app_data_v03';
const modern='hamza_app_snapshot_v2';
const nativePath='file:///documents/';
const check=value=>{
  let hash=2166136261;
  for(let index=0;index<value.length;index++)hash=Math.imul(hash^value.charCodeAt(index),16777619)>>>0;
  return hash.toString(16).padStart(8,'0');
};
function oldChunks(value){
  const body=JSON.stringify(value);
  const rows=[];
  for(let index=0;index<body.length;index+=180000)rows.push(body.slice(index,index+180000));
  const pointer={__hamzaStorage:'chunks-v1',slot:'b',count:rows.length,length:body.length,checksum:check(body)};
  return Object.fromEntries([[key,JSON.stringify(pointer)],...rows.map((row,i)=>[key+':chunks:b:'+i,row])]);
}
function fixture(initial={}){
  const storage=new Map(Object.entries(initial)),files=new Map();
  const flags={};
  const fsMock={
    documentDirectory:nativePath,EncodingType:{UTF8:'utf8'},
    getInfoAsync:async uri=>files.has(uri)?{exists:true,isDirectory:false,size:Buffer.byteLength(files.get(uri),'utf8')}:{exists:false},
    readAsStringAsync:async uri=>files.get(uri),
    writeAsStringAsync:async (uri,value)=>{
      if(flags.failFile)throw Error('no disk space');
      files.set(uri,flags.badWrite?'wrong':value);
    }
  };
  const asMock={
    getItem:async id=>{if(flags.failRead)throw Error('read failed');return storage.get(id)??null;},
    setItem:async (id,value)=>{if(flags.failCommit)throw Error('commit failed');storage.set(id,value);},
  };
  function restart(){
    const exports={};
    vm.runInNewContext(code,{exports,require:name=>name==='expo-file-system/legacy'?fsMock:name==='./domain/historical-snapshot'?require('../.test-build/domain/historical-snapshot.js'):{default:asMock}});
    return exports;
  }
  return {storage,files,flags,restart,api:restart()};
}
const json=(data)=>JSON.stringify({schemaVersion:1,app:'HamZa',exportedAt:'2026-11-10T00:00:00Z',data});
const read=(api)=>api.readAppData({products:[]});

for(const [label,value] of [['broken JSON','{'],['array','[]'],['null','null'],['pointer',{__hamzaStorage:'unknown'}],['newer schema',{schemaVersion:2,products:[]}],['not business data',{foo:123}]]){
  test('fails closed and preserves source: '+label,async()=>{
    const raw=typeof value==='string'?value:JSON.stringify(value);
    const {api,storage,files}=fixture({[key]:raw});
    await assert.rejects(read(api));
    await assert.rejects(api.writeAppData({products:[]}));
    await assert.rejects(api.createBackup({products:[]}));
    assert.equal(storage.get(key),raw);
    assert.equal(storage.has(modern),false);
    assert.equal(files.size,0);
  });
}
test('first launch can save; nonempty plain legacy store is never rewritten in place',async()=>{
  const fresh=fixture();
  assert.equal((await read(fresh.api)).products.length,0);
  await fresh.api.writeAppData({products:[{id:1}]});
  assert.equal((await read(fresh.restart())).products[0].id,1);
  const raw='{"products":[{"id":2}]}';
  const legacy=fixture({[key]:raw});
  const d=await read(legacy.api);
  assert.equal(d.products[0].id,2);
  assert.equal(d.schemaVersion,1);
  await legacy.api.writeAppData({products:[{id:2,name:'فرنسي Français 😊'}]});
  assert.equal(legacy.storage.get(key),raw);
  assert.equal((await read(legacy.restart())).products[0].name,'فرنسي Français 😊');
});

test('old Nov 10 chunk format and external JSON keep Arabic/French, photo galleries and unrecognized records',async()=>{
  const old={schemaVersion:1,products:[{id:1,name:'Électricité الضو',photoData:'data:image/png;base64,'+'A'.repeat(370000)}],
    suppliers:[{id:2,name:'وشركة'}],expenseCategories:[{id:7,title:'قديمة'}]};
  const orig=oldChunks(old);
  const f=fixture(orig);
  const loaded=await read(f.api);
  assert.equal(loaded.products[0].photoData,old.products[0].photoData);
  assert.equal(loaded.expenseCategories[0].id,7);
  await f.api.writeAppData({products:loaded.products,language:'FR'});
  assert.equal((await read(f.restart())).expenseCategories[0].title,old.expenseCategories[0].title);
  for(const [k,v] of Object.entries(orig))assert.equal(f.storage.get(k),v);
  const fresh=fixture();
  const restored=await fresh.api.restoreBackup(json(old));
  assert.equal(restored.products[0].name,old.products[0].name);
  assert.equal((await read(fresh.restart())).products[0].photoData,old.products[0].photoData);
  assert.equal(JSON.parse(await f.api.createBackup({products:loaded.products})).data.expenseCategories.length,1);
});

test('missing or damaged earlier chunks do not fall through to empty or overwrite the pointer',async()=>{
  const data=oldChunks({products:[{id:1,photoData:'X'.repeat(180100)}]});
  for(const corrupt of [partial=>delete partial[key+':chunks:b:1'],partial=>{const k=key+':chunks:b:0';partial[k]='X'+partial[k].slice(1);}]) {
    const copy={...data};
    corrupt(copy);
    const f=fixture(copy);
    await assert.rejects(read(f.api));
    await assert.rejects(f.api.writeAppData({products:[]}));
    assert.equal(f.storage.get(key),data[key]);
    assert.equal(f.storage.has(modern),false);
  }
});

test('serialized writes and interrupted restore preserve the last committed readable file',async()=>{
  const f=fixture();
  await read(f.api);
  await Promise.all([f.api.writeAppData({products:[{id:1}]}),f.api.writeAppData({products:[{id:2}]} )]);
  const committed=f.storage.get(modern);
  for(const flag of ['failFile','badWrite','failCommit']){
    f.flags[flag]=true;
    await assert.rejects(f.api.restoreBackup(json({products:[{id:8}]})));
    assert.equal(f.storage.get(modern),committed);
    assert.equal((await read(f.restart())).products[0].id,2);
    f.flags[flag]=false;
  }
  await f.api.restoreBackup(json({products:[{id:8}]}));
  assert.equal((await read(f.restart())).products[0].id,8);
});

test('damaged active copy is not silently replaced or downgraded, explicit valid restore recovers',async()=>{
  const f=fixture({[key]:'{"products":[{"id":1}]}'});
  await read(f.api);
  await f.api.writeAppData({products:[{id:2}]});
  const p=JSON.parse(f.storage.get(modern));
  const uri=nativePath+'hamza-snapshot-v2-'+p.slot+'.json';
  f.files.delete(uri);
  const api=f.restart();
  await assert.rejects(read(api));
  await assert.rejects(api.writeAppData({products:[]}));
  await assert.rejects(api.restoreBackup(json({other:[]})));
  await api.restoreBackup(json({products:[{id:9}]}));
  assert.equal((await read(f.restart())).products[0].id,9);
  assert.equal(JSON.parse(f.storage.get(key)).products[0].id,1);
});

test('protects malformed imports and preserves attachment links via prepared transaction',async()=>{
  const f=fixture();
  await read(f.api);
  const parkedPosSales=[{id:'parked-1',title:'Sale',cart:{lines:[{productId:'1',quantity:2}]}}];
  await f.api.writeAppData({products:[],parkedPosSales});
  for(const d of [{products:[null]},{products:'oops'},{__hamzaStorage:'chunks-v1',products:[]}]){
    await assert.rejects(f.api.restoreBackup(json(d)));
  }
  assert.equal((await read(f.restart())).parkedPosSales[0].title,'Sale');
  const projects=[{id:1,tasks:[{id:2,title:'Photo',attachments:[{id:'p',name:'photo.jpg',uri:'file:///old.jpg'}]}]}];
  const d=f.api.decodeHamzaBackup(json({products:[],projects,taskAttachmentFiles:[{id:'p',base64:'AAECAw=='}]}));
  const {taskAttachmentFiles:_,...metadata}=d;
  projects[0].tasks[0].attachments[0].uri='file:///new.jpg';
  await f.api.restoreAppData({...metadata,projects});
  const actual=await read(f.restart());
  assert.equal(actual.projects[0].tasks[0].attachments[0].uri,'file:///new.jpg');
  assert.equal(actual.taskAttachmentFiles,undefined);
});


test('unreconciled historical finance fails closed but can be exported unchanged',async()=>{
  const initial=oldChunks({products:[],inventoryMovements:[],bankMovements:[{id:'opening',kind:'opening',amountCentimes:1000}]});
  const f=fixture(initial);
  await assert.rejects(read(f.api));
  await assert.rejects(f.api.writeAppData({products:[]}));
  assert.equal(JSON.parse(await f.api.exportOriginalBackup()).data.bankMovements[0].amountCentimes,1000);
  assert.equal(f.storage.get(key),initial[key]);
  assert.equal(f.storage.has(modern),false);
});


test('original chunked cash history and modern export reopen with the same centime balance',async()=>{
  const old={products:[],inventoryMovements:[],cashMovements:[{id:'opening',kind:'opening',amountCentimes:1000,description:'Ouverture',date:'2026-02-01'}]};
  const f=fixture(oldChunks(old));
  const d=await read(f.api);
  await f.api.writeAppData({products:[],cashAccount:d.cashAccount});
  const cash=await read(f.restart());
  assert.equal(cash.cashAccount.historicalJournal.entries[0].amountCentimes,1000);
  const exported=await f.api.createBackup({products:[],cashAccount:cash.cashAccount});
  const fresh=fixture();
  const restored=await fresh.api.restoreBackup(exported);
  assert.equal(restored.cashAccount.historicalJournal.entries[0].amountCentimes,1000);
});
