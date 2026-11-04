# HamZa architecture — clean-room YanCommerce-inspired Android rebuild

Date: 2026-11-04
Target: Android-first Expo / React Native application
Package: `com.hamza.app`
Principle: offline-first, local-first MVP. No dependency on YanCommerce private APIs, accounts, credentials or source.

## Stack

| layer | choice | why |
|---|---|---|
| mobile UI | Expo SDK 54 + React Native + TypeScript | Already present in the repository; preserves the Android-first app |
| persistence | SQLite via Expo SQLite (migration from current AsyncStorage records) | Durable relational transactions for documents, payments and stock |
| auth | Device-local profile / optional app PIN later | Single-user personal business app; no cloud account required for MVP |
| PDF | expo-print + expo-sharing | Existing dependencies; local document export and sharing |
| camera / barcode | Expo Camera / supported barcode scanning module (later milestone) | Native capability with explicit permission and device testing |
| printing | Expo/native printer adapter (later milestone) | Separate tested adapter for Bluetooth and network printers |
| backend | None in MVP | Core flows work offline; cloud sync requires a separately authorized backend |
| hosting / jobs | None in MVP | No server-side dependency; local scheduled work only if later required |

## Data and access model

Single-business, single-device database for the first milestone. All records are local to the app. No multi-tenant server or remote API is assumed. Money is stored as integer minor units (centimes) and currency is MAD. Dates are ISO-8601 UTC strings; UI formats local Morocco time. See `replica/schema.sql` for the initial SQLite schema.

## Schema

Tables: 12 core tables. Access: local device database; validate references and business rules in the repository/data layer. Use SQLite transactions for document conversion, payment allocation and stock posting.

Core tables: business_profile, customers, suppliers, products, warehouses, quotes, quote_lines, documents, document_lines, payments, payment_allocations, stock_movements. See SQL file for indexes and constraints.

## Local application API / service boundaries

| method / service | does | input | output | flow |
|---|---|---|---|---|
| customerRepository.list/create/update | Manage customers | customer fields, search | customer rows | F01, F04 |
| productRepository.list/create/update | Catalog and price lookup | product fields, search | product rows | F01, F02, F03 |
| quoteService.create | Create multi-line quote | customer, lines, discount | quote + lines | F01 |
| documentService.convertQuote | Convert accepted quote to delivery/invoice | quote ID, target type | new document; source linked | F01 |
| paymentService.record | Record full/partial payment | document/customer, amount, method | payment + allocations + balance | F01, F04 |
| stockService.postMovement | Apply stock movement once | product, warehouse, qty, reason, source | movement + current stock | F02, F03, F05 |
| pdfService.renderDocument | Render printable PDF | document ID, language, company profile | local PDF URI | F01, F06 |
| reportService.summary | Calculate dashboard totals | date range | totals and grouped series | S01, S15 |

No HTTP routes or webhooks in the MVP. Any future server integration must use an official public API and credentials owned by the user.

## Core invariants

- Quote creation does not change stock or cash.
- Converting a quote is idempotent: a quote cannot create duplicate delivery/invoice documents for the same conversion action.
- Stock changes only when a delivery, purchase, sale or explicit adjustment is posted; each source movement is posted once.
- Payment allocations cannot exceed the payment amount or the document's remaining balance.
- Customer balance is derived from posted invoices minus allocated payments and credit notes, not manually edited.
- All multi-row operations run in one SQLite transaction and roll back on failure.
- Product quantity is derived from the stock movement ledger, not independently edited in multiple places.
- Money arithmetic uses integer MAD centimes; no floating-point currency calculations.

## The parts that bite

- Time zones: persist ISO timestamps in UTC; render using device locale and Africa/Casablanca rules.
- Idempotency: unique source references on stock movements and document conversions.
- Races: serialize writes through SQLite transactions; guard duplicate button taps.
- Offline: all MVP flows local; export/backup before device migration.
- PDF: verify Arabic shaping, RTL layout, page breaks and French output on physical Android devices.
- Printing: Bluetooth/network printer support is a later native integration and must be tested on actual hardware.
- Data migration: preserve existing AsyncStorage data; never silently clear it when introducing SQLite.
- Privacy: local backup/export; no customer data sent to third-party OCR or cloud services without explicit opt-in.

## Build order

1. Vertical slice: S02 customers + S04 products + S05 multi-line quote + PDF preview/share. Tables: customers, products, quotes, quote_lines, business_profile. Services: repositories, quoteService, pdfService.
2. Must-haves: invoice and delivery documents; quote conversion; partial payments and customer balances; stock ledger; purchases; expenses; Arabic/French and Moroccan company profile.
3. Should-haves: POS/cart, multiple warehouses, stock count/audit, barcode, cheque tracking, cash reconciliation, roles, thermal printing.
4. Could-haves: bank reconciliation, OCR, push notifications, online storefront, AI assistant and cloud sync — only after providers and permissions are selected.

## Acceptance gate

Do not call the app complete until automated tests cover calculations, quote conversion, duplicate posting, partial payments, stock ledger and PDF content; Android build succeeds; and the APK is installed and smoke-tested on a real device.
