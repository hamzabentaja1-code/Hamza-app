const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {create, act} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const source = ts.transpileModule(fs.readFileSync('src/BarcodeScanButton.tsx', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2020},
}).outputText;
async function setup({granted = true, canAskAgain = true, available = true, language = 'AR', availability} = {}) {
  let permission = {granted, canAskAgain};
  let asks = 0, checks = 0, settings = 0;
  const alerts = [], scans = [], listeners = new Set();
  const requestPermission = async () => {asks++; return permission;};
  const getPermission = async () => permission;
  const CameraView = props => React.createElement('CameraView', props);
  CameraView.isAvailableAsync = async () => {checks++; return availability ? availability() : available;};
  const rn = {
    ...Object.fromEntries(['ActivityIndicator','Modal','Pressable','SafeAreaView','Text','View'].map(x => [x,x])),
    StyleSheet: {create: x => x, absoluteFill: {}},
    Alert: {alert: (...args) => alerts.push(args)},
    Linking: {openSettings: async () => {settings++;}},
    AppState: {currentState: 'active', addEventListener: (_, fn) => {listeners.add(fn); return {remove: () => listeners.delete(fn)};}},
  };
  const exports = {};
  vm.runInNewContext(source, {exports, require: name => {
    if (name === 'react') return React;
    if (name === 'react-native') return rn;
    if (name === 'expo-camera') return {CameraView, useCameraPermissions: () => [permission, requestPermission, getPermission]};
    throw new Error('Unexpected import: ' + name);
  }});
  let renderer;
  await act(async () => {renderer = create(React.createElement(exports.default, {language, onCode: value => scans.push(value)}));});
  const button = () => renderer.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel);
  const press = async text => {await act(async () => {
    const node = renderer.root.findAllByType('Text').find(n => n.children.join('') === text);
    assert.ok(node, text); await node.parent.props.onPress();
  });};
  return {
    renderer, scans, alerts, listeners, button, press,
    grant: () => {permission = {granted: true, canAskAgain: true};},
    open: async () => {await act(async () => {await button().props.onPress();});},
    camera: () => renderer.root.findAllByType('CameraView'),
    counts: () => ({asks, checks, settings}),
    state: async value => {await act(async () => {for (const fn of [...listeners]) fn(value);});},
    destroy: async () => {await act(async () => renderer.unmount());},
  };
}
test('scanner never mounts a camera or requests permission before the user opens it', async () => {
  const s = await setup();
  assert.equal(s.camera().length, 0);
  assert.equal(s.counts().asks, 0);
  await s.destroy();
  assert.equal(s.listeners.size, 0);
});
test('one scan preserves leading zeroes, ignores duplicate events and releases the camera', async () => {
  const s = await setup(); await s.open();
  await s.press('تشغيل الضوء');
  assert.equal(s.camera()[0].props.enableTorch, true);
  const callback = s.camera()[0].props.onBarcodeScanned;
  await act(async () => {callback({data: '   '}); callback({data: ' 0611001234567 '}); callback({data: 'SECOND'});});
  assert.deepEqual(s.scans, ['0611001234567']);
  assert.equal(s.camera().length, 0);
  await s.destroy();
});
test('denied camera permission offers French settings without mounting the camera', async () => {
  const s = await setup({granted: false, canAskAgain: false, language: 'FR'}); await s.open();
  assert.equal(s.camera().length, 0);
  await s.press('Ouvrir les paramètres');
  assert.equal(s.counts().settings, 1);
  await s.press('Fermer');
  await s.destroy();
});
test('backgrounding releases the camera and ignores a stale scan callback', async () => {
  const s = await setup(); await s.open();
  const callback = s.camera()[0].props.onBarcodeScanned;
  await s.state('background');
  assert.equal(s.camera().length, 0);
  await act(async () => callback({data: 'BACKGROUND'}));
  assert.equal(s.scans.length, 0);
  await s.state('active');
  assert.equal(s.camera().length, 1);
  await act(async () => callback({data: 'OLD SESSION'}));
  assert.equal(s.scans.length, 0);
  await s.destroy();
});
test('camera mount errors release the preview and reject late scan events', async () => {
  const s = await setup(); await s.open();
  const camera = s.camera()[0].props;
  await act(async () => camera.onMountError({message: 'Unavailable'}));
  assert.equal(s.camera().length, 0);
  await act(async () => camera.onBarcodeScanned({data: 'LATE'}));
  assert.equal(s.scans.length, 0);
  await s.press('إغلاق');
  await s.destroy();
});
test('unavailable camera leaves manual entry accessible and explains the failure', async () => {
  const s = await setup({available: false}); await s.open();
  assert.equal(s.camera().length, 0);
  assert.equal(s.alerts.length, 1);
  assert.equal(s.counts().asks, 0);
  await s.destroy();
});
test('rapid repeated presses open only one permission/availability request', async () => {
  let release;
  const pending = new Promise(resolve => {release = resolve;});
  const s = await setup({granted: false, availability: () => pending});
  await act(async () => {
    const a = s.button().props.onPress();
    const b = s.button().props.onPress();
    release(true); await Promise.all([a,b]);
  });
  assert.equal(s.counts().checks, 1);
  assert.equal(s.counts().asks, 1);
  await s.destroy();
});


test('granting permission after a denied background session re-arms scanning', async () => {
  const s = await setup({granted: false}); await s.open();
  await s.state('background'); await s.state('active');
  s.grant(); await s.press('السماح بالكاميرا');
  assert.equal(s.camera().length, 1);
  await act(async () => s.camera()[0].props.onBarcodeScanned({data: 'RECOVERED'}));
  assert.deepEqual(s.scans, ['RECOVERED']);
  await s.destroy();
});
