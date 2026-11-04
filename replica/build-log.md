# HamZa Replica build log

## 2026-11-04 — quote calculation foundation

- Status: implemented as a standalone TypeScript domain module; not yet connected to the quote screen.
- Added `src/domain/quote-calculator.ts` for multi-line quote totals using integer MAD centimes.
- Validation included: at least one line, positive quantity up to three decimals, non-negative unit price and discounts, line discount not exceeding line amount, document discount not exceeding subtotal, and safe-integer totals.
- Remaining: connect calculator to the quote editor, persist multiple lines without losing existing AsyncStorage data, render Arabic/French quote PDF, and add automated tests.

## Not yet complete

- Customer-to-quote-to-PDF vertical slice.
- Quote conversion to delivery note and invoice.
- Partial-payment allocation and stock ledger posting.
- Android device smoke test and APK validation.
