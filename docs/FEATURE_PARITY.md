# HamZa feature parity implementation plan

This project is an independent implementation of the workflows observed in YanCommerce. It must use HamZa branding and original code/assets; it must not copy proprietary source code or private account data.

## Current implemented baseline
- Local AsyncStorage persistence for products, customers, suppliers, sales, purchases, expenses, quotes, invoices, delivery notes, credit notes, payments, projects, warehouses and stock movements.
- Basic create/update flows for products, quotes and projects; sales, purchases, invoices, delivery notes and customer returns update stock or balances.
- Partial customer/supplier payments, receivable balances, supplier balances and credit-note balances.
- Arabic/French UI, RTL/LTR direction, company profile, PDF sharing, Excel-readable CSV exports and JSON backup/restore.
- Feature parity remains partial: the modules below track missing workflows separately from the screens being present.

## Required functional modules

### Dashboard and core setup
- [x] Company profile, logo, address and Moroccan identifiers (ICE, RC, IF); banking details remain pending
- [ ] Users, roles, permissions, activity history
- [x] Arabic/French labels for current screens, language persistence and RTL/LTR; final device visual review remains pending
- [ ] Numbering series, document templates, custom fields
- [x] JSON backup export and validated restore for local app data (manual copy/paste; encrypted backup not implemented)
- [ ] Automated scheduled backups and encrypted backup files

### Products and inventory
- [x] Product catalog with references and barcode fields/search; multiple images and camera barcode scan remain pending
- [x] Single product photo: choose, replace, remove, preview, and persist in local product data
- [x] Product name search and product edit flow
- [x] Categories, brands, units, variants
- [x] Basic product purchase cost, sale price, unit margin and estimated stock margin
- [x] Auditable stock ledger for opening balances, purchases, direct sales, POS sales, delivery notes and quantity corrections; physical stock counts post only the differences and prevent replay (single main warehouse UI)
- [ ] Separate price rules for quotes/orders vs invoices
- [x] Prices are handled as TTC in DH with no TVA, matching the requested setup (configurable HT/TTC and tax rules are not part of this version)
- [ ] Stock tracking separately for delivery notes and invoices
- [x] Multiple warehouse records, active warehouse selection, paired stock transfers, per-warehouse stock counts, warehouse-filtered movement ledger and persistent audit trail (normal purchase/sale/POS/delivery operations use the selected warehouse; warehouse deactivation and location/site hierarchies remain pending)
- [x] Bulk product import/export with name search and saved product catalog (image search remains pending)

### Contacts
- [x] Customer and supplier profiles with phone, address and ICE, editable without breaking linked customer records; RC/IF variants and price groups remain pending
- [x] Opening balances, credit ceilings enforced on invoice conversion, payment terms added to invoice due dates and PDF account statements (editing customer limits after creation and aging/reminder logic remain pending)
- [ ] Attachments, contacts, custom fields, price groups

### Sales documents
- [x] Quotes, invoices, delivery notes and linked customer credit notes/returns
- [x] Customer order and proforma records can be created from a quote, listed separately and exported to PDF; conversions preserve stock and prevent duplicate same-type records
- [x] Quote-linked order/proforma lifecycle, allowed status transitions, and delivery gate before marking an order delivered
- [ ] Due-date reminders, follow-up history and broader document lifecycle actions
- [ ] Discounts, fees, notes/sections, barcode entry, multi-line editing
- [x] Basic PDF generation/sharing, document numbering and status tracking; print-layout refinement remains pending

### Purchases
- [x] Draft purchase requests and orders, confirmed order-to-receipt conversion, warehouse stock posting, supplier invoices, PDF output and persistence
- [x] Supplier returns from confirmed supplier invoices and legacy purchase lines post stock outflow, supplier credit balances and a linked PDF credit note
- [x] Latest recorded purchase price comparison by product and supplier, with cheapest option and cost spread; advanced purchase tracking remains pending
- [x] Linked request → order → receipt → supplier invoice conversions prevent duplicate child documents and post stock once

### Cash, payments and banking
- [x] Expense records with categories and manually generated recurring weekly/monthly/yearly expenses (recurring due dates are deduplicated; scheduled background generation remains pending)
- [x] Local cash ledger with one opening balance, cash in/out, and automatic entries for cash POS sales, customer payments, cash expenses and supplier payments (bank transfers and reconciliation remain pending)
- [x] Customer invoice payments, supplier payments, allocations and balances
- [x] Invoice due dates, overdue-invoice list, and manual customer reminder sharing
- [ ] Cheque/draft settlement, returned items and reminder history/scheduling
- [x] Manual bank-entry recording, CSV statement import, payment matching and date-filtered reconciliation report
- [ ] Multiple bank accounts, account opening-balance controls and automated statement feeds

### POS
- [x] Product name search and stock-aware cart with quantity controls
- [x] Customer selection, general discount, cash/card/transfer methods and checkout validation
- [x] Checkout records sales, posts stock reduction and generates a PDF receipt
- [x] POS search by name/reference/barcode, category filtering and in-stock filter (camera barcode scanning remains pending)
- [x] Parked POS sales persist on the phone and can be resumed or deleted; [ ] POS returns and physical receipt-printer integration

### Projects and field operations
- [ ] Installations/projects, installation requests and financial status
- [ ] Technicians, specialties, equipment and equipment categories
- [ ] Time entries, rates, costs, settlement and history

### Agenda and reports
- [x] Tasks with assignee, priority, due date, duration, project/customer links, status and local persistence
- [ ] Task attachments, calendar view, recurring schedules and external assignments
- [x] Sales, quote-derived invoices, purchase, stock, receivables, payables, profit and project summary reports
- [x] PDF reports and XLSX workbook export with inclusive date range filters for activity, payments, expenses, returns, stock movements and projects

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
A screen appearing is not proof that its controls work. A module is marked complete only after its workflows and acceptance tests pass. Emulator smoke testing failed because the GitHub Linux runner's Android emulator remained offline and then returned broken pipe errors; no device-level pass is claimed. No live business data should be copied from the reference account.

## Field work

- [x] Agenda tasks linked to projects/customers and assigned staff.
- [x] Technician work logs with date, duration, hourly rate, notes, cost totals and activity export.
- [ ] Broader technician/equipment assignments, labor settlement history and field installation requests.
