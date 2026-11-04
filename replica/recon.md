# YanCommerce → HamZa: initial clean-room reconnaissance

Date: 2026-11-04
Target platform: Android first; public web product documentation used as a feature reference
Rebuild target: independent app, brand HamZa, Android application ID `com.hamza.app`
Audience: user's own commercial activity
Scope: core commercial workflows; no original private source, private APIs, credentials, customer data, or signing keys are copied.

## Evidence and confidence

| Source | What it supports | Confidence / limit |
|---|---|---|
| Public Arabic product site: https://yancommerce.com/ar | Publicly advertised modules and workflows | Confirmed as marketing claims, not proof of every UI detail |
| Public product site: https://yancommerce.com/ | Public module list, document flow, stock and payment descriptions | Confirmed as marketing claims |
| Public pricing/features page: https://yancommerce.com/tarifs | Plan-dependent feature matrix | Confirmed as published plan information |
| User-supplied APK static-analysis handoff (existing project report) | Android wrapper / WebView architecture and native capabilities | Confirmed only to the extent recorded in that report; not a full app audit |
| Existing HamZa repository source and docs | Current independent implementation and known gaps | Confirmed by repository files; not parity with YanCommerce |

Important: the supplied APK was reported to be an Expo/React Native Android shell hosting the remote web app in a WebView. The business screens and server-side logic are not all contained in the APK. The APK alone cannot provide the original backend, account data, or complete web UI. This recon therefore records public product behavior and existing project evidence; authenticated account screens remain unobserved.

## Core loop

Create a quote for a customer, move the same document data into delivery and invoice stages without re-entering lines, record full or partial payments, and keep stock and the customer's outstanding balance consistent.

## Publicly evidenced feature areas

1. Commercial documents: quotes, orders, delivery notes, goods-received notes, invoices, proforma invoices, credit notes, and customizable document layouts.
2. Contacts and teams: customers, suppliers, sales representatives, users/teams, customer groups and customer-specific pricing.
3. Inventory: stock, multiple warehouses, stock counts/audit, barcode scanning, production movements and actual production cost.
4. Purchasing: supplier purchases and supplier-invoice capture.
5. Finance: payments, partial payments, unpaid balances, cheques/effects, expenses, cash register/POS, bank reconciliation.
6. Reporting and integrations: real-time reports, Excel export and API access.
7. Mobile workflows: document viewing, PDF sharing/printing, WhatsApp/email sharing, thermal printing, mobile notifications, contact picker, camera/file selection where supported.
8. Online sales: website/storefront, online orders, online quote and price requests, automated WhatsApp document delivery (plan-dependent).
9. AI features: supplier invoice scanning and YanAgent (plan-dependent).

## Screen inventory (initial, public evidence only)

| ID | Screen / area | User goal | Key states / open questions |
|---|---|---|---|
| S01 | Dashboard | Review sales, purchases, expenses, margin and cash | Date filters, empty state, refresh behavior not yet observed |
| S02 | Customers | Find a customer and review history / balance | Search, create/edit, customer statement details need account walkthrough |
| S03 | Suppliers | Manage suppliers and supplier history | Search, create/edit, balance details need walkthrough |
| S04 | Products / services | Maintain catalog and prices | Variants, references, images, barcode and bulk import need walkthrough |
| S05 | Quotes | Prepare and send a quote | Multi-line items, discounts, numbering, PDF and statuses need walkthrough |
| S06 | Orders | Track customer orders | Conversion rules and status lifecycle need walkthrough |
| S07 | Delivery notes | Deliver goods and update stock | Partial delivery, warehouse selection and conversion need walkthrough |
| S08 | Invoices | Issue invoices from quotes/deliveries | Numbering, document lifecycle, PDF and e-invoicing need walkthrough |
| S09 | Credit notes / proformas | Handle returns and advance/proforma documents | Stock and balance effects need walkthrough |
| S10 | Purchases | Record supplier purchases | Supplier invoice scan / OCR is advertised; manual review required |
| S11 | Stock / warehouses | Check and move stock | Multi-warehouse, counts, audit and barcode flows need walkthrough |
| S12 | Payments / receivables | Record full or partial payment and outstanding amount | Cash, transfer, cheque/effect, due dates and allocations need walkthrough |
| S13 | Cash register / POS | Sell at point of sale | Cart, barcode, receipt printing and cash reconciliation need walkthrough |
| S14 | Expenses / banking | Record costs and reconcile accounts | Categories, recurring expenses and bank import need walkthrough |
| S15 | Reports / exports | Review KPIs and export data | Report catalog, filters and Excel schemas need walkthrough |
| S16 | Settings / team | Configure business, users and permissions | Roles, numbering, company identifiers and document templates need walkthrough |
| S17 | Mobile settings / printing | Connect printers and manage device features | Bluetooth/network printer discovery and print tests need device test |
| S18 | Online store / orders | Receive online customer requests and orders | Plan-gated behavior; not in first MVP unless requested |

## User flows

### F01 — Quote to payment
Customer → select products/services → create quote → send PDF → convert accepted quote to delivery note → convert to invoice → record one or more payments → show remaining balance.

### F02 — Purchase to stock
Select supplier → record supplier invoice / import image → review line items → match or create products → confirm purchase → increase stock at selected warehouse.

### F03 — Sale / POS
Search or scan product → add to cart → select customer (optional where allowed) → take payment → issue receipt → decrement stock → update cash and reports.

### F04 — Customer account review
Open customer → review documents and payment history → see total outstanding → record payment / cheque → reconcile remaining balance.

### F05 — Stock audit
Choose warehouse → inspect current quantities → count physical stock → record differences with reason → update stock ledger and audit trail.

### F06 — Mobile document handling
Open document → preview/download PDF → share through WhatsApp/email or print; thermal printing must be tested with supported Bluetooth/network printers.

## Native/mobile capabilities from existing APK report

The prior static-analysis report records a React Native/Expo wrapper with WebView integration, thermal receipt printing, Bluetooth/network printer selection, PDF download/share, push-registration diagnostics, contact picker, camera/microphone permission prompts, and safe-area handling. These are treated as native integration requirements to implement independently, not as recovered source code. Each requires implementation and device testing in HamZa.

## Existing HamZa baseline and gaps

The current repository is an independent Expo/React Native starter with local persistence for basic products, customers, suppliers, sales, purchases, expenses, quotes and payments, plus some PDF/backup flows. The repository's own feature-parity checklist explicitly marks many advanced workflows incomplete. The current app must not be described as a complete YanCommerce replacement.

High-priority gaps to close:
- Correct document model with multi-line items and document conversion without duplicate stock/payment effects.
- Invoice, delivery note, order, proforma and credit-note workflows.
- Customer/supplier balances, partial-payment allocation and cheque tracking.
- Product references, images, barcode and multi-warehouse stock ledger.
- POS/cart and receipt printing.
- Full Arabic/French localization and company profile / Moroccan identifiers.
- Reports with date filters and reconciled totals.
- Automated tests for persistence, calculations, conversions, PDF output and stock/payment invariants.
- Device tests for Bluetooth/network printing, camera/file handling, notifications and PDF sharing.

## Clean-room and access constraints

- Rebuild workflows and user-visible behavior from public documentation and the user's own authorized account only.
- Do not copy original proprietary source, private endpoints, tokens, credentials, customer records, private signing keys or protected assets.
- Do not assume a new package ID can use YanCommerce's backend, OAuth clients, Firebase project, notifications or deep links.
- Server-dependent features must use a new authorized backend or an official integration with the user's own credentials.
- No authenticated session or interactive account walkthrough was available during this pass. Do not mark unseen screens as confirmed.

## Next action

Run `replica-architect` using this recon map, then prioritize a working vertical slice:
customer → multi-line quote → PDF → delivery note → invoice → partial payment → updated stock and customer balance.
