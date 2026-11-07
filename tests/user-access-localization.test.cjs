const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {translateUserAccessMessage} = require('../.test-build/user-access-i18n.js');

test('user access alert titles and validation errors are translated to French', () => {
  assert.equal(translateUserAccessMessage('تعذر إنشاء المستخدم', 'FR'), 'Impossible de créer l’utilisateur');
  assert.equal(translateUserAccessMessage('كاين مستخدم بنفس الاسم.', 'FR'), 'Un utilisateur portant ce nom existe déjà.');
});

test('delete confirmation translates its dynamic message but preserves the user name', () => {
  assert.equal(
    translateUserAccessMessage('غادي يتحذف الحساب المحلي ديال Hamza فقط.', 'FR'),
    'Le compte local de Hamza uniquement.',
  );
});

test('Arabic alerts and undefined values remain unchanged', () => {
  assert.equal(translateUserAccessMessage('حذف المستخدم؟', 'AR'), 'حذف المستخدم؟');
  assert.equal(translateUserAccessMessage(undefined, 'FR'), undefined);
});

test('user access workspace routes every native alert through the translation wrapper', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'UserAccessWorkspace.tsx'), 'utf8');
  assert.match(source, /const showAlert=\(title:string,message:string,buttons\?/);
  assert.match(source, /Alert\.alert\(t\(title\),t\(message\)/);
  assert.equal((source.match(/Alert\.alert\(/g) || []).length, 1);
  assert.match(source, /buttons\?\.map\(button=>\(\.\.\.button,text:button\.text\?t\(button\.text\):button\.text\)\)/);
});
