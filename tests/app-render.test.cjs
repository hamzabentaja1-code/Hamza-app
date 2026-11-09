const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');

test('App renders a real root JSX tree after loading, not a discarded JSX expression',()=>{
  const source=ts.createSourceFile('App.tsx',fs.readFileSync('App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const app=source.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text==='App');
  assert.ok(app?.body,'App function must exist');
  const topLevelReturns=app.body.statements.filter(ts.isReturnStatement);
  const root=topLevelReturns.find(statement=>{
    const expression=statement.expression;
    return expression&&ts.isJsxElement(expression)&&expression.getText(source).includes('LanguageContext.Provider');
  });
  assert.ok(root,'App must RETURN LanguageContext.Provider from its main render branch');
  assert.ok(app.body.statements.some(statement=>ts.isIfStatement(statement)&&statement.getText(source).includes('!loaded')),'startup loading state must stay visible');
  assert.equal(source.parseDiagnostics.length,0,'App TSX must parse cleanly');
});
