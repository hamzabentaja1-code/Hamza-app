# HamZa Replica build log

## 2026-11-04 — first quote vertical slice (partial)

- Added src/domain/quote-calculator.ts: multi-line totals using integer MAD centimes, fractional quantities up to three decimals, and discount validation.
- Added src/QuoteWorkspace.tsx: customer selection, product selection, multi-line quote editor, quantity, global discount, notes, saved quote history and PDF action.
- Connected the workspace to App.tsx; old single-line quote records remain readable through a fallback display path.
- Updated PDF export to use Arabic RTL labels/layout when AR is selected and French LTR labels/layout when FR is selected.
- Added tests/quote-calculator.test.cjs and npm run test:quote using the existing TypeScript compiler and Node's built-in test runner.
- Added .gitignore entries for generated test output and environment files.
- Status: code written and committed to branch; tests have NOT yet been executed in a project build environment. Arabic PDF font shaping and physical Android behavior remain unverified.

## Remaining for this vertical slice

- Run npm run test:quote and npx tsc --noEmit in CI.
- Verify Android bundling and PDF generation on a device.
- Add business profile data (company identity, address and Moroccan ICE/RC/IF) to the PDF template.
- Quote-to-delivery and quote-to-invoice conversion, with duplicate-conversion protection.
- Partial payment allocation and customer outstanding balance.
- Stock ledger with one-time posting.
