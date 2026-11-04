# HamZa Replica test plan — quote to invoice / delivery slice

## Automated tests authored (not yet run)

- Q-H1: multi-line quote totals in integer MAD centimes.
- Q-H2: line and document discounts apply in the correct order.
- Q-H3: fractional quantity to three decimal places.
- Q-N1: empty quote is rejected.
- Q-N2: invalid quantity, negative price and excess decimal precision are rejected.
- Q-N3: line or document discount cannot exceed the relevant amount.
- D-H1: invoice conversion creates a numbered document and does not change stock.
- D-H2: delivery conversion deducts stock from linked products.
- D-N1: duplicate conversion of the same quote to the same document type is rejected.
- D-N2: delivery conversion is rejected when stock is insufficient.

Run with: npm run test:quote

## Manual Android tests — pending

- Select a customer, add three products, remove one line, set a discount and save.
- Close and reopen the app; quote and all lines remain saved.
- Export Arabic PDF and verify RTL, Arabic glyph shaping, line order and totals.
- Switch to French and verify LTR labels and layout.
- Convert quote to invoice; verify invoice appears in invoice list and stock is unchanged.
- Convert quote to delivery note; verify stock decreases exactly once.
- Try converting the same quote to the same document type again; verify it is blocked.
- Try delivery conversion with insufficient stock; verify no document is created and stock remains unchanged.
- Restore an older backup; verify existing records are preserved and new documents default to an empty list.

No test is marked passed until it has actually run and its result has been observed.
