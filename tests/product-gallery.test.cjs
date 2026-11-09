const test = require('node:test');
const assert = require('node:assert/strict');
const {MAX_PRODUCT_PHOTOS, productPhotos, appendProductPhoto, removeProductPhoto, serializeProductPhotos} = require('../.test-build/product-gallery.js');

test('legacy one-photo products still open without migration or data loss', () => {
  assert.deepEqual(productPhotos({photoData: 'data:image/jpeg;base64,old'}), ['data:image/jpeg;base64,old']);
  assert.deepEqual(productPhotos({}), []);
});
test('product editor keeps four distinct photos in order and preserves the cover for older screens', () => {
  let photos = productPhotos({photoData: 'old'});
  for (const image of ['second', 'third', 'fourth']) photos = appendProductPhoto(photos, image);
  assert.equal(photos.length, MAX_PRODUCT_PHOTOS);
  assert.deepEqual(serializeProductPhotos(photos), {photoData:'old',photoGallery:['old','second','third','fourth']});
  assert.throws(() => appendProductPhoto(photos, 'fifth'), /four/);
  assert.deepEqual(appendProductPhoto(photos, 'second'), photos);
});
test('removing cover changes the legacy primary photo and keeps remaining pictures in order', () => {
  const original = ['a', 'b', 'c'];
  const next = removeProductPhoto(original, 0);
  assert.deepEqual(next, ['b', 'c']);
  assert.equal(serializeProductPhotos(next).photoData, 'b');
  assert.deepEqual(serializeProductPhotos(removeProductPhoto(['only'], 0)), {photoData:undefined,photoGallery:undefined});
});
test('product photo serialization rejects duplicates and filters malformed persisted entries', () => {
  assert.deepEqual(productPhotos({photoGallery: ['a', '', 'a', null, 'b'],photoData:'legacy'}), ['a','b']);
  assert.deepEqual(productPhotos({photoGallery: [], photoData: 'legacy'}), ['legacy']);
  assert.deepEqual(productPhotos({photoGallery: ['one','two','three','four','five']}), ['one','two','three','four']);
});
