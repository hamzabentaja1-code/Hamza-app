# HamZa Replica test plan — quote to invoice / delivery slice

## Automated tests

- P-H1: partial payment updates paid amount and remaining balance.
- P-H2: final payment marks invoice paid.
- P-N1: overpayment and non-invoice allocations are rejected.
- C-H1: customer balances aggregate invoices and exclude delivery notes.
- C-H2: fully paid invoices have zero outstanding balance.
- C-N1: invalid paid amounts are rejected and balances sort by largest debt.

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

## Observed CI result — 2026-11-08

- Automated validation: 93/93 domain tests passed; TypeScript validation passed in [GitHub Actions run 42485750649](https://github.com/hamzabentaja1-code/Hamza-app/actions/runs/42485750649).
- The latest APK workflow before it was switched to manual-only completed APK packaging and MobSF scanning, but the emulator smoke test failed before confirming the home screen. This does not count as an Android UI pass.
- Manual Android acceptance cases below remain pending. No APK was built by the validation-only workflow.


## Voice input — manual Android acceptance pending

- In Arabic mode, use the microphone beside product name, product list search, and POS search; verify recognized Arabic text fills only the selected field and filters/products update.
- Repeat in French mode and verify French text, including accents, fills the selected field.
- Deny microphone permission and verify the app explains the permission requirement and continues to work with typing.
- Disable/uninstall the phone speech service and verify the app explains that voice recognition is unavailable without crashing.


## Product image search — manual Android acceptance pending

- Add photos to several products, select one of those images in product image search, and verify the closest photo appears first with a lower fingerprint distance.
- Select a visually unrelated image and verify there are no results; clear image search and verify normal text search returns.
- Try the search when no products have photos; verify the app explains that saved product photos are needed.
- Switch Arabic/French and verify the button, result count, no-match message, and clear action are translated.


## PDF template — automated checks

- Arabic documents use `lang=ar`, RTL direction, Arabic document titles and totals, and escape customer and company text.
- French documents use `lang=fr`, LTR direction, French metadata and labels.
- Company name, contact details, tax identifiers, logo, bank and RIB appear only when populated; invalid totals are rejected.

## Physical Android acceptance remains pending

- Verify Arabic glyph shaping, page breaks, logo, bank details, PDF preview and sharing on Android.
- Verify microphone permission and Arabic/French recognition; test product photo search performance and matching against real product images.
- No Android SDK or emulator is present in the current environment; do not mark these cases passed until tested on a device. No APK has been generated for these changes.


## Partial delivery — automated checks

- Deliver a quote across three separate notes; stock decreases by only each note’s quantity and remaining quote quantities reach zero once.
- Confirm the totals of all delivery notes equal the discounted quote total exactly.
- Reject zero quantity, stock shortage, an unknown product, and quantities above the remaining amount.
- For duplicate product rows at different prices, deliver from one selected quote row and preserve that row’s name and unit price.
- Manual Android test remains pending: open delivery modal, edit line quantities, save successive partial notes, and verify stock/history on device.


## Latest acceptance checkpoint — 2026-11-08

- Existing APK source: application commit 1a3420f, build run 42498948756. No new APK was built for the following source changes.
- All five Android flows passed in run 42507556855: navigation/AR-FR restart persistence, product persistence, invoice payment settlement, POS sale/PDF sharing/stock deduction, and legacy purchase/supplier return.
- Purchase of 2 units at 100 MAD moves stock 5 → 7; returning 1 moves it to 6 and supplier debt 200 → 100 MAD. Excess return is rejected; stock and balance survive restart.
- Source validation: 113 business/storage tests plus 8 mocked camera component tests, TypeScript, Expo dependency check and Android JS export pass locally. Camera integration has not been rebuilt into the existing APK or validated with real decoding hardware.
- The next expanded CI run checks request/order receipt and supplier-invoice credit behavior and exports native-generated PDFs for AR/FR invoice layout inspection. These checks remain pending until the actual results are observed.
- Local Android SDK absence does not prevent remote UI tests: Android emulators run in GitHub Actions. WhatsApp and physical speech/barcode acceptance remain pending.
