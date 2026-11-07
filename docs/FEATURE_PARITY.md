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
- [ ] Banking details in company profile and configurable document numbering
- [ ] Users, roles, permissions, activity history
- [ ] Arabic/French complete localization, language persistence, theme
- [ ] Numbering series, document templates, custom fields
- [x] JSON backup export and validated restore for local app data (manual copy/paste; encrypted backup not implemented)
- [x] Serialized local-storage writes to prevent overlapping state saves from overwriting newer snapshots
- [ ] Automated scheduled backups and encrypted backup files

### Products and inventory
- [ ] Product/service catalog with references, barcodes and multiple images
- [x] Single product photo: choose, replace, remove, preview, and persist in local product data
- [x] Product name search and product edit flow
- [x] Basic free-text category, brand, unit and variant metadata in product cards, search, bulk import and CSV export
- [ ] Managed category/brand dictionaries, variant stock matrices and multiple images per product
- [x] Product purchase cost, sale price and unit margin when cost is recorded
- [x] Weighted average cost updates on purchases when the previous stock cost is known
- [x] Sale-time cost snapshots and tested gross-profit calculation; legacy sales without a cost are excluded
- [x] Inventory ledger unit tests for movements, duplicate protection, negative stock prevention and stock-count variance
- [ ] Separate price rules for quotes/orders vs invoices
- [ ] HT/TTC display mode and configurable tax rules where required
- [ ] Stock tracking separately for delivery notes and invoices
- [x] Persistent stock movement ledger for opening stock, purchases, manual sales, POS sales, delivery notes, product quantity corrections and physical stock counts
- [x] Physical stock count variance is recorded as an auditable movement and updates the product quantity
- [x] Multiple warehouses with a persistent default warehouse; legacy movements without warehouse IDs are assigned to the default warehouse during balance calculation
- [x] Warehouse-scoped stock counts and warehouse-level stock balances
- [x] Atomic inter-warehouse transfers recorded as paired transfer-out/transfer-in movements with duplicate and insufficient-source-stock protection; global stock remains unchanged
- [x] Manual sales, POS sales, purchases, purchase-order receipts, delivery notes, returns and stock counts use the active/original warehouse ID
- [x] Bulk paste import and CSV export, image/name/reference/barcode search, saved product catalog

### Contacts
- [x] Basic customer and supplier profiles with phone, address and ICE
- [ ] Extended company identifiers (RC/IF) and contact communication history
- [x] Customer and supplier opening balances, credit ceilings and payment-term metadata
- [x] Enforce customer credit ceiling when converting a quote to an invoice; calculate and show invoice due dates from payment terms
- [x] Basic customer/supplier statement PDF exports from invoices, purchases and recorded payments
- [ ] Attachments, contacts, custom fields, price groups

### Sales documents
- [x] Basic multi-product quotes with conversion to invoices and delivery notes; duplicate conversion is prevented
- [x] Invoice partial payments, paid/outstanding status and payment due dates
- [x] Partial customer returns with optional restocking and net sales/profit adjustment
- [ ] Customer orders, proforma invoices, formal credit-note documents and complete document lifecycle/reminders
- [ ] Advanced fees, notes/sections, barcode entry and document numbering
- [x] Basic PDF generation and sharing for quotes, invoices, delivery notes, receipts and statements, with company profile branding

### Purchases
- [x] Supplier purchase orders with expected delivery dates, partial/full goods receipts, stock updates and order PDF
- [ ] Price requests, supplier invoices and supplier order comparison
- [x] Supplier partial payment history with centime-safe allocation, receipts, and reversible payment entries
- [x] Partial supplier returns with stock deduction, purchase linkage, supplier credit balances, account statement rows and reversal on delete
- [ ] Supplier comparison, purchase tracking and purchase reports
- [ ] Link/convert purchase documents and update stock correctly

### Cash, payments and banking
- [x] Expenses with optional category, project association, PDF receipt and delete confirmation
- [ ] Recurring expense schedules and category dictionaries
- [x] Basic single-cashbox ledger with opening balance, cash income/expense entries, non-negative balance validation and PDF journal
- [x] Cash POS checkouts are posted into the cash register ledger
- [x] Multiple bank accounts with opening balances, deposits, withdrawals and account-level balances
- [x] Atomic internal bank transfers with paired entries, duplicate/overdraft protection and unchanged combined bank balance
- [x] Bank account reconciliation against a statement balance with an auditable adjustment and reconciliation history
- [x] POS card and bank-transfer sales are posted to the selected bank account; checkout validates the account before committing stock and payment ledgers
- [x] Cash-to-bank and bank-to-cash transfers update both ledgers atomically with overdraft protection
- [ ] Cheque/draft lifecycle and bank statement file import
- [x] Partial customer invoice payments and supplier purchase payments with centime-safe allocation and balance recalculation
- [ ] Payment across multiple invoices/purchases, cheques, drafts, unpaid items and automated due-date reminders
- [x] Manual statement-balance reconciliation with stored difference and adjustment entry
- [ ] Bank statement file import and automatic transaction matching

### POS
- [x] Product name search and stock-aware cart with quantity controls
- [x] Customer selection, general discount, cash/card/transfer methods and checkout validation
- [x] Checkout records sales, posts stock reduction and generates a PDF receipt
- [ ] Barcode scanning, categories and stock filters
- [ ] Returns, parked sales and physical receipt-printer integration

### Projects and field operations
- [ ] Full installation requests and work-order lifecycle
- [x] Basic project records with customer, budget, dates, notes, status and project-linked expense totals
- [x] Task create/read/update/delete with project link, assignee, priority, due date, estimated duration and status
- [ ] Technicians, specialties, equipment and equipment categories
- [ ] Time entries, rates, costs, settlement, attachments and history

### Agenda and reports
- [x] Basic task list with assignments, priorities, due dates, estimated durations and status changes
- [ ] Calendar view, recurring tasks, attachments, reminders and advanced task filters
- [x] Basic sales/purchase/stock/cash/receivables/payables/gross-profit summary reports with PDF exports
- [ ] Date-range filters, comparative periods, charts and advanced report exports

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
- [ ] Manual TalkBack verification in Arabic and French at normal and enlarged font sizes
- [ ] Android Accessibility Scanner audit for contrast, touch target and clickable bounds
