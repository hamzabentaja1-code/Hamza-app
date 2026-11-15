# HamZa feature parity implementation plan

This project is an independent implementation of the workflows observed in YanCommerce. It must use HamZa branding and original code/assets; it must not copy proprietary source code or private account data.

## Current baseline verified in App.tsx and src/
- Local AsyncStorage persistence with protected startup reads, validated backup restore, and data for products, contacts, sales, purchases, payments, inventory, cash, banks and projects.
- Product catalog includes references, barcodes, images, voice search, bulk import and barcode camera capture in product entry and POS.
- Sales and purchase flows connect documents, payments, debt balances and stock movements; business logic has automated regression coverage.
- PDF HTML generation supports Arabic RTL and French LTR; HTML output and text escaping have automated tests. Android PDF rendering still needs device review.
- The app is a single-user local prototype. Roles, scheduled reminders, some document and purchasing workflows, and device acceptance remain open.

## Required functional modules

### Dashboard and core setup
- [x] Company profile, logo, address, Moroccan identifiers (ICE, RC, IF), and banking details
- [ ] Users, roles, permissions, activity history
- [x] Arabic/French text localization and saved language choice; static translation coverage is tested. Visual RTL/LTR review remains open; theme uses black and gold.
- [ ] Numbering series, document templates, custom fields
- [x] Shareable JSON backup export, file picker restore and validated restore for local app data (encrypted backup not implemented)
- [ ] Automated scheduled backups and encrypted backup files

### Products and inventory
- [x] Product catalog with references, barcodes, and camera barcode capture in product entry and POS
- [x] Product photo gallery with up to four images per product, individual preview/removal and backward-compatible local persistence
- [x] Product gallery: add up to four photos, preview, remove individually, persist locally, and preserve the first photo for older records
- [x] Product name search and product edit flow
- [x] Categories, brands, units, variants
- [x] Basic product purchase cost, sale price, unit margin and estimated stock margin
- [x] Auditable stock ledger for opening balances, purchases, direct sales, POS sales, delivery notes and quantity corrections; physical stock counts post only the differences and prevent replay (single main warehouse UI)
- [ ] Separate price rules for quotes/orders vs invoices
- [x] MAD amounts use TTC-only pricing with no VAT calculation, as requested; configurable tax rules are not implemented
- [ ] Stock tracking separately for delivery notes and invoices
- [x] Multiple warehouse records, active warehouse selection, paired stock transfers, per-warehouse stock counts, warehouse-filtered movement ledger and persistent audit trail (normal purchase/sale/POS/delivery operations use the selected warehouse; warehouse deactivation and location/site hierarchies remain pending)
- [x] Bulk product import/export with name search, saved product catalog, and offline visual search that ranks each product by its closest saved photo

### Contacts
- [x] Customer and supplier profiles with phone, address, ICE/RC/IF, opening balances, credit limits, and payment terms; separate WhatsApp field remains open
- [x] Customer and supplier account statements as shareable PDFs, including invoices, payments, credit notes and current balances
- [x] Customer and supplier opening balances are included in account debt, statements and partial settlement flows; credit ceilings are validated and enforced before credit purchases and sales
- [x] Contact payment terms are copied to new invoices and purchases; dashboard shows overdue records and links to their settlement screens
- [ ] Automatic reminders and scheduled follow-up remain pending
- [ ] Attachments, contacts, custom fields, price groups

### Sales documents
- [x] Quotes, delivery notes, invoices, and pro forma flows; customer orders are not implemented
- [x] Customer returns create PDF credit notes, reduce open invoice balances, carry excess credit into a later POS credit sale or quote-converted invoice, and record confirmed partial cash refunds against available unapplied credit in the return history, statement PDF and financial CSV
- [x] Standalone multi-product invoice creation with stock validation and selected-warehouse deduction; available customer credit is applied automatically and invoice notes are included in PDF output
- [x] Choose whether to apply available customer credit while creating a standalone invoice; payment workspace can apply credit to a selected existing invoice. Refunds require confirmation and do not move physical cash automatically
- [x] Apply customer credit to a selected open invoice from the payments workspace after confirmation; cash refunds are recorded only after the user confirms the payout
- [x] Quote conversion to invoice, delivery note, and pro forma; payment statuses and overdue dashboard. Scheduled reminders and follow-up remain open.
- [x] Line/document discounts, notes, multi-line editing, and barcode entry; fees and section breaks remain open
- [ ] PDF visual layouts and print output need Android review; status tracking exists, while configurable numbering series and templates remain open

### Purchases
- [x] Direct supplier purchase entry updates stock and records initial or partial payment; price requests, supplier orders, and separate supplier invoice documents remain open
- [x] Supplier payment records and partial settlements; supplier credit notes and returns remain open
- [x] Purchase history and supplier debt reporting; supplier comparison and broader purchase reports remain open
- [ ] Link/convert purchase documents and update stock correctly

### Cash, payments and banking
- [x] Manual expenses with cash/card/bank payment; recurring expenses and categories remain open
- [x] Cash opening balance, manual cash in/out, and live balance tied to recorded cash customer/supplier payments, cash paid purchases, cash expenses and confirmed refunds; PDF/CSV cash history
- [x] Bank account opening balances and confirmed transfers to/from the cash register; both balances and the cash ledger update together
- [x] Import bank statement CSV files with French debit/credit headers, optional reported balance, duplicate rejection, local persistence, exact account/date/signed-amount matching with matched, unmatched, and ambiguous results, user confirmation for exact matches, and a closing-balance difference summary. Customer/supplier payments, direct and POS sales, initial purchase payments, and expenses by card or bank transfer select an account, update its balance, block bank overdrafts, and protect linked accounts from deletion.
- [x] Customer payment allocation to open invoices, supplier debt and partial payment tracking
- [x] Supplier cheque reference and due-date tracking for invoices/purchases; returned cheque, draft, and unpaid-item workflows remain open
- [x] Persist and show bank reconciliation history with timestamp, statement period, closing-balance difference, and confirmed-match count.

### POS
- [x] Product name/reference/barcode search and stock-aware cart with quantity controls; keyboard barcode scanners can submit the scanned code
- [x] Customer selection, general discount, cash/card/transfer/credit methods and checkout validation
- [x] Checkout records sales, posts stock reduction and generates a PDF receipt
- [x] Credit checkout creates an invoice receivable and records partial payments
- [x] Camera barcode scanning in product entry and POS; POS category and stock filters remain open
- [ ] Returns, parked sales and physical receipt-printer integration

### Projects and field operations
- [x] Local projects with budgets, expenses, tasks, priorities, due dates, and status; installation request workflow remains open
- [ ] Technicians, specialties, equipment and equipment categories
- [ ] Time entries, rates, costs, settlement and history

### Agenda and reports
- [ ] Tasks, assignments, durations and attachments
- [x] Project task priorities (normal, important, urgent) and validated optional due dates, persisted with project data
- [ ] Sales/purchase/stock/cash/receivables/payables reports with full filtering and export
- [x] Activity summary with validated date range, filtered sales/purchases/expenses and profit summary, plus PDF output
- [ ] Filters and date ranges across all report types; export and print

## Acceptance tests required before calling a module complete
- Create, read, update and delete (with confirmation) persist after app restart.
- Search, filters, sorting and empty states work.
- Monetary totals, discounts, payments, balances and stock movements reconcile.
- Document conversion does not duplicate stock or payments.
- PDF/print/share outputs contain the correct customer, items, totals and numbering.
- Arabic and French generated PDF HTML declares the correct direction and escapes all inserted text; visual layout still needs Android review.
- Invalid inputs are rejected and no partial records are saved.
- APK builds successfully and is installed/tested on Android.

## Status policy
A screen appearing is not proof that its controls work. A module is marked complete only after its workflows and acceptance tests pass. No live business data should be copied from the reference account.
