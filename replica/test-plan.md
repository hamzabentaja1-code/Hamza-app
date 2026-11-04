# HamZa Replica test plan — quote vertical slice

## Automated quote-calculation cases

- Q-H1: two lines, 2 × 1250 and 3 × 2000 centimes → subtotal 8500 centimes.
- Q-H2: line discount and document discount apply in the correct order.
- Q-H3: fractional quantity 0.25 × 10000 centimes → 2500 centimes.
- Q-N1: empty line list is rejected.
- Q-N2: zero quantity, negative unit price and more than three decimal places are rejected.
- Q-N3: line discount greater than line gross is rejected.
- Q-N4: document discount greater than subtotal is rejected.

Test command: npm run test:quote. These tests are authored but have not yet been executed in CI.

## Manual mobile cases — pending

- Q-M1: select a customer, add at least three different products and save.
- Q-M2: remove a line and verify totals recalculate.
- Q-M3: enter a decimal quantity and verify the total.
- Q-M4: enter invalid/negative discount and verify save is blocked.
- Q-M5: close and reopen app; quote and all lines remain saved.
- Q-M6: export Arabic PDF; verify RTL text, line order, amount and page layout.
- Q-M7: switch to French and export; verify LTR labels and layout.
- Q-M8: old single-line quotes from the previous version still display and export.

## Not yet covered

- Customer-to-quote-to-delivery/invoice conversion.
- Payment allocation and outstanding balances.
- Stock posting and duplicate-action protection.
- Android physical-device smoke test, accessibility and performance.

No case is marked passed until it has actually run and its result has been observed.
