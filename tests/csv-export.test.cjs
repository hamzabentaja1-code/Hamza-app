const test = require('node:test');
const assert = require('node:assert/strict');
const {buildCsv} = require('../.test-build/domain/csv-export.js');

test('CSV uses UTF-8 BOM, semicolons, CRLF, and quotes values safely', () => {
  assert.equal(buildCsv(['Nom', 'Prix'], [['Routeur; Wi-Fi', 12.5], ['L\'été', 'a"b']]),
    '\uFEFF"Nom";"Prix"\r\n"Routeur; Wi-Fi";"12.5"\r\n"L\'été";"a""b"\r\n');
});

test('CSV protects text cells that spreadsheet programs could treat as formulas', () => {
  assert.equal(buildCsv(['Valeur'], [['=1+1'], ['  @SUM(A1:A2)'], [-2], ['-not a number']]),
    '\uFEFF"Valeur"\r\n"\'=1+1"\r\n"\'  @SUM(A1:A2)"\r\n"-2"\r\n"\'-not a number"\r\n');
});
