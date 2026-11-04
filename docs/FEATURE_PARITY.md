# HamZa feature parity implementation plan

This project is an independent implementation of the workflows observed in YanCommerce. It must use HamZa branding and original code/assets; it must not copy proprietary source code or private account data.

## Current baseline verified in App.tsx
- Local AsyncStorage persistence for products, customers, suppliers, sales, purchases, expenses, quotes and payments.
- Basic create flows for those records.
- Sale reduces stock; purchase increases stock.
- Basic PDF generation/sharing for quotes, sales documents, expenses and payment receipts.
- Basic summary screen.
- The current UI explicitly contains placeholder sections. It is not feature complete.

## Required functional modules

### Dashboard and core setup
- [ ] Company profile, logo, address, Moroccan identifiers (ICE, RC, IF), banking details
- [ ] Users, roles, permissions, activity history
- [ ] Arabic/French complete localization, language persistence, theme
- [ ] Numbering series, document templates, custom fields
- [ ] Import/export and backup/restore

### Products and inventory
- [ ] Product/service catalog with references, barcodes, photos and multiple images
- [ ] Categories, brands, units, variants
- [ ] Purchase and sale prices; separate price rules for quotes/orders vs invoices
- [ ] HT/TTC display mode and configurable tax rules where required
- [ ] Stock tracking separately for delivery notes and invoices
- [ ] Multiple warehouses/sites, transfers, stock counts, stock movements and audit
- [ ] Bulk import/export, image/name search, saved product catalog

### Contacts
- [ ] Customer and supplier profiles with phone/WhatsApp, address, ICE/RC/IF
- [ ] Opening balances, credit ceilings, payment terms, account statements
- [ ] Attachments, contacts, custom fields, price groups

### Sales documents
- [ ] Quotes, customer orders, delivery notes, invoices, proforma invoices
- [ ] Customer credit notes and return documents
- [ ] Document lifecycle, conversion/linking, reminders and follow-up
- [ ] Discounts, fees, notes/sections, barcode entry, multi-line editing
- [ ] PDF layouts, print, share, document numbering and status tracking

### Purchases
- [ ] Price requests, supplier orders, goods receipts, supplier invoices
- [ ] Supplier credit notes, returns, payment records
- [ ] Supplier comparison, purchase tracking and purchase reports
- [ ] Link/convert purchase documents and update stock correctly

### Cash, payments and banking
- [ ] Expenses and recurring expenses/categories
- [ ] Cash registers, opening balance, cash in/out and transfers
- [ ] Customer and supplier payments, allocations and balances
- [ ] Cheques, drafts, unpaid items and due-date tracking
- [ ] Bank statement import and reconciliation

### POS
- [ ] Product search/barcode, category and stock filters
- [ ] Cart, customer selection, discounts, returns, pending sales
- [ ] Payment methods, receipt printing and stock posting

### Projects and field operations
- [ ] Installations/projects, installation requests and financial status
- [ ] Technicians, specialties, equipment and equipment categories
- [ ] Time entries, rates, costs, settlement and history

### Agenda and reports
- [ ] Tasks, assignments, priorities, due dates, durations and attachments
- [ ] Sales/purchase/stock/cash/receivables/payables/profit reports
- [ ] Filters, date ranges, export and print

## Acceptance tests required before calling a module complete
- Create, read, update and delete (with confirmation) persist after app restart.
- Search, filters, sorting and empty states work.
- Monetary totals, discounts, payments, balances and stock movements reconcile.
- Document conversion does not duplicate stock or payments.
- PDF/print/share outputs contain the correct customer, items, totals and numbering.
- Arabic and French labels are complete and layout remains readable.
- Invalid inputs are rejected and no partial records are saved.
- APK builds successfully and is installed/tested on Android.

## Status policy
A screen appearing is not proof that its controls work. A module is marked complete only after its workflows and acceptance tests pass. No live business data should be copied from the reference account.
