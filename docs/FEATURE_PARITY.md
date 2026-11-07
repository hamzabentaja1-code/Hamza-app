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
- [x] Company profile, logo, address, contact details and Moroccan identifiers (ICE, RC, IF) included in PDF branding
- [x] Company banking details (bank name, account, RIB, IBAN) persisted and printed in Arabic/French PDFs
- [x] Configurable yearly sequential series for quotes, invoices, delivery notes and purchase orders; existing legacy documents remain unchanged
- [x] Local activity history for product changes, sales, purchases, invoices, customer payments and expenses; persisted and included in backup/restore
- [ ] User accounts, roles and granular permissions
- [x] Arabic/French static label coverage and language preference persistence across primary workspaces
- [ ] Dynamic-message localization audit and selectable light/dark theme
- [ ] Document templates and custom fields
- [x] JSON backup export and validated restore for local app data (manual copy/paste; encrypted backup not implemented)
- [x] Serialized local-storage writes to prevent overlapping state saves from overwriting newer snapshots
- [ ] Automated scheduled backups and encrypted backup files

### Products and inventory
- [x] Product catalog references, barcodes and up to four saved product photos
- [x] Service-only catalog items with no stock balance or stock movements, supported in direct sales, POS, quotes and invoice conversion
- [ ] Camera-based barcode scanning
- [x] Single product photo: choose, replace, remove, preview, and persist in local product data
- [x] Product name search and product edit flow
- [x] Basic free-text category, brand, unit and variant metadata in product cards, search, bulk import and CSV export
- [x] Managed product category and brand dictionaries with quick selection and local backup/restore
- [x] Product photo gallery supports up to four images, preview, per-image removal and persisted local product records
- [ ] Variant stock matrices
- [x] Product purchase cost, sale price and unit margin when cost is recorded
- [x] Weighted average cost updates on purchases when the previous stock cost is known
- [x] Sale-time cost snapshots and tested gross-profit calculation; legacy sales without a cost are excluded
- [x] Inventory ledger unit tests for movements, duplicate protection, negative stock prevention and stock-count variance
- [x] Separate product quote prices and invoice prices; invoice conversion recalculates line/document totals while preserving discounts
- [ ] Separate price rules for purchase orders and advanced customer price groups
- [ ] HT/TTC display mode and configurable tax rules where required
- [x] Invoice and delivery-note conversions deduct stock only once per quote, regardless of conversion order; later document conversion does not double-deduct
- [x] Persistent stock movement ledger for opening stock, purchases, manual sales, POS sales, delivery notes, product quantity corrections and physical stock counts
- [x] Physical stock count variance is recorded as an auditable movement and updates the product quantity
- [x] Multiple warehouses with a persistent default warehouse; legacy movements without warehouse IDs are assigned to the default warehouse during balance calculation
- [x] Warehouse-scoped stock counts and warehouse-level stock balances
- [x] Stock movement history is filtered to the active warehouse; switching warehouses clears any pending stock-count form to prevent applying a stale count to another warehouse
- [x] French translations for stocktaking, movement kinds, stock-count validation and inventory history labels
- [x] Atomic inter-warehouse transfers recorded as paired transfer-out/transfer-in movements with duplicate and insufficient-source-stock protection; global stock remains unchanged
- [x] Manual sales, POS sales, purchases, purchase-order receipts, delivery notes, returns and stock counts use the active/original warehouse ID
- [x] Bulk paste import and CSV export, image/name/reference/barcode search, saved product catalog

### Contacts
- [x] Basic customer and supplier profiles with phone, address and ICE
- [x] Company ICE, RC and IF fields appear in branded PDF documents
- [ ] Contact communication history and extended identifiers on customer/supplier records
- [x] Customer and supplier opening balances, credit ceilings and payment-term metadata
- [x] Enforce customer credit ceiling when converting a quote to an invoice; calculate and show invoice due dates from payment terms
- [x] Basic customer/supplier statement PDF exports from invoices, purchases and recorded payments
- [ ] Contact attachments, custom fields and price groups

### Sales documents
- [x] Basic multi-product quotes with conversion to invoices and delivery notes; duplicate conversion is prevented
- [x] Invoice partial payments, paid/outstanding status and payment due dates
- [x] Partial customer returns with optional restocking and net sales/profit adjustment
- [ ] Customer orders, proforma invoices, formal credit-note documents and complete document lifecycle/reminders
- [x] Configurable document numbering for quotes, invoices, delivery notes and purchase orders
- [ ] Advanced fees, document sections and in-document barcode entry
- [x] Basic PDF generation and sharing for quotes, invoices, delivery notes, receipts and statements, with company profile branding

### Purchases
- [x] Supplier purchase orders with expected delivery dates, partial/full goods receipts, stock updates and order PDF
- [ ] Price requests, supplier invoices and supplier order comparison
- [x] Supplier partial payment history with centime-safe allocation, receipts, and reversible payment entries
- [x] Partial supplier returns with stock deduction, purchase linkage, supplier credit balances, account statement rows and reversal on delete
- [x] Supplier purchase comparison by gross purchases, returns and net purchases within a selected date range
- [ ] Link/convert purchase documents and update stock correctly

### Cash, payments and banking
- [x] Expenses with optional category, project association, PDF receipt and delete confirmation
- [x] Recurring weekly/monthly/yearly expense rules, due-date generation, missed-period catch-up, duplicate prevention and pause/resume
- [x] Persistent custom expense category dictionary with quick selection and backup/restore support
- [ ] OS push notifications for recurring expenses and due items
- [x] Basic single-cashbox ledger with opening balance, cash income/expense entries, non-negative balance validation and PDF journal
- [x] Cash POS checkouts are posted into the cash register ledger
- [x] Multiple bank accounts with opening balances, deposits, withdrawals and account-level balances
- [x] Atomic internal bank transfers with paired entries, duplicate/overdraft protection and unchanged combined bank balance
- [x] Bank account reconciliation against a statement balance with an auditable adjustment and reconciliation history
- [x] POS card and bank-transfer sales are posted to the selected bank account; checkout validates the account before committing stock and payment ledgers
- [x] Cash-to-bank and bank-to-cash transfers update both ledgers atomically with overdraft protection
- [ ] Cheque/draft lifecycle UI integration, persistent event history and bank-ledger posting\n- [x] Cheque lifecycle domain rules: centime-safe amounts, duplicate protection, strict dates, audited state transitions, bounced/redeposit flow and cleared-only bank effect (tests/cheques.test.cjs)
- [x] Partial customer invoice payments and supplier purchase payments with centime-safe allocation and balance recalculation
- [x] Customer payments can be allocated automatically, oldest invoice first, across multiple outstanding invoices; one cash/bank ledger entry is recorded for the full receipt
- [x] Supplier payments can be distributed oldest-first across multiple open purchases; one cash/bank movement is recorded and grouped reversal restores all allocations
- [ ] Automated due-date reminders for unpaid invoices and supplier obligations
- [x] Manual statement-balance reconciliation with stored difference and adjustment entry
- [x] Pasted CSV bank statement import with exact matching against existing ledger rows and idempotent duplicate protection
- [ ] Native bank file selection and fuzzy/automatic transaction matching beyond exact matches

### POS
- [x] Product name search and stock-aware cart with quantity controls
- [x] Customer selection, general discount, cash/card/transfer methods and checkout validation
- [x] Checkout records sales, posts stock reduction and generates a PDF receipt
- [x] Product category dictionary and category selection
- [ ] Camera barcode scanning and advanced stock filters
- [ ] Returns, parked sales and physical receipt-printer integration

### Projects and field operations
- [x] Installation work orders with requested, scheduled, in-progress, completed and cancelled lifecycle states, customer/project linkage and equipment allocation
- [x] Basic project records with customer, budget, dates, notes, status and project-linked expense totals
- [x] Task create/read/update/delete with project link, assignee, priority, due date, estimated duration and status
- [x] Technician profiles with phone, specialty and hourly rate; equipment records with reference, serial number, availability and assignment state
- [ ] Equipment category dictionaries and technician permissions
- [x] Work-time entries with date, technician, hours, hourly rate and centime-safe cost totals per work order and technician
- [ ] Settlement, attachments, photo evidence and advanced work-order history

### Agenda and reports
- [x] Basic task list with assignments, priorities, due dates, estimated durations and status changes
- [x] Unified agenda with date-range filtering for task due dates, scheduled work orders, recurring expense due dates and unpaid invoice due dates; overdue items are highlighted
- [x] Monthly calendar grid with Monday-first weeks, previous/next month navigation, event counts, selected-day announcements and one-day filtering
- [ ] Recurring task rules, push notifications, attachments and advanced filters
- [x] Basic sales/purchase/stock/cash/receivables/payables/gross-profit summary reports with PDF exports
- [x] Date-range report filters with previous equal-length period comparisons; net sales and net purchases account for returns and invalid legacy dates are reported
- [x] Monthly sales/purchase trends with returns and expenses, plus supplier comparisons in period analysis
- [x] Detailed period-analysis PDF export includes period comparisons, monthly trends and supplier comparisons
- [ ] CSV/XLSX export and configurable report layouts

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

## Accessibility

- [x] Shared accessible button semantics, text-derived labels, keyboard focus, disabled state and expanded hit slop
- [x] Translated accessibility labels for text inputs
- [x] Selected-state announcements for product, customer, supplier, POS payment-method, bank movement-type and bank-transfer destination choices
- [x] Explicit labels for image previews and language switch
- [x] Automated static accessibility regression tests cover primary workspaces and shared control wrappers (tests/accessibility.test.cjs)
- [x] Static French-dictionary coverage audit reports no missing static Arabic labels in App, quote, POS, warehouse, bank, field-operations, recurring-expense, agenda, period-report and shared accessibility controls
- [x] Main app, quote, POS, warehouse, bank, field-operations and recurring-expense alerts translate titles, messages and confirmation-button labels using the selected language
- [ ] Manual TalkBack verification in Arabic and French at normal and enlarged font sizes
- [ ] Android emulator, APK inspection, MobSF and all-module smoke tests (intentionally deferred; APK build is manual-only until the feature scope is complete)
- [ ] Android Accessibility Scanner audit for contrast, touch target and clickable bounds
