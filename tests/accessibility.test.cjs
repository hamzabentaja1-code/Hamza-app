const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all primary workspaces use the shared accessible button wrapper', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx']) {
    const source = read(file);
    assert.match(source, /import AccessiblePressable from ['"].*AccessiblePressable['"]/,
      file + ' must import AccessiblePressable');
    assert.match(source, /const Pressable = AccessiblePressable/,
      file + ' must route Pressable controls through AccessiblePressable');
  }
  for (const file of ['src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx']) {
    assert.match(read(file), /<AccessiblePressable\b/,
      file + ' must use accessible controls for interactive choices');
  }
});

test('primary workspace text inputs use translated accessible labels', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx']) {
    const source = read(file);
    assert.match(source, /TTextInput as TextInput/,
      file + ' must use the shared translated TextInput');
    assert.match(source, /<TextInput\b/,
      file + ' must contain accessible translated text inputs');
    assert.doesNotMatch(source, /<NativeTextInput\b/,
      file + ' must not render raw NativeTextInput controls');
  }
});

test('shared wrappers expose labels, focus, touch targets and state to assistive technology', () => {
  const input = read('src/i18n.tsx');
  assert.match(input, /accessibilityLabel=\{props\.accessibilityLabel\s*\|\|\s*translateText\(props\.placeholder,\s*language\)/);
  assert.match(input, /writingDirection: language === 'AR' \? 'rtl' : 'ltr'/);
  const button = read('src/AccessiblePressable.tsx');
  assert.match(button, /accessible=\{props\.accessible \?\? true\}/);
  assert.match(button, /focusable=\{props\.focusable \?\? true\}/);
  assert.match(button, /hitSlop=\{props\.hitSlop \?\? 8\}/);
  assert.match(button, /accessibilityState=\{/);
  assert.match(button, /accessibilityRole=\{props\.accessibilityRole \?\? 'button'\}/);
});

test('selected POS and banking choices expose selected state', () => {
  const pos = read('src/PosWorkspace.tsx');
  assert.match(pos, /accessibilityState=\{\{selected:method===m\.id\}\}/);
  assert.match(pos, /accessibilityState=\{\{selected:customerId===''\}\}/);
  const bank = read('src/BankWorkspace.tsx');
  assert.match(bank, /accessibilityState=\{\{selected:kind===v\}\}/);
  assert.match(bank, /accessibilityState=\{\{selected:destination===a\.id\}\}/);
});
