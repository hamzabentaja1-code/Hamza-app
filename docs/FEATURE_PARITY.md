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
- [x] Local user profiles, owner/admin/sales/warehouse/accountant/viewer roles, custom module allow-lists, read-only screen gating, active-profile switching, per-action activity attribution and backup persistence
- [ ] PIN/password authentication and server-side authorization (current profiles are not a security boundary on a shared/unlocked device)
- [x] Arabic/French static label coverage and language preference persistence across primary workspaces
- [ ] Remaining non-alert dynamic-message localization audit and selectable light/dark theme (alert titles/messages now have automated French-coverage checks across 13 primary workspaces; other dynamic UI text and theme remain open)
- [ ] Document templates and custom fields
- [x] JSON backup export and validated restore for local app data (manual copy/paste; encrypted backup not implemented)
- [x] Serialized local-storage writes to prevent overlapping state saves from overwriting newer snapshots
- [ ] Automated scheduled backups and encrypted backup files

### Products and inventory
- [x] Product catalog references, barcodes and up to four saved product photos
- [x] Service-only catalog items with no stock balance or stock movements, supported in direct sales, POS, quotes and invoice conversion
- [x] Variant management workspace with normalized size/color attributes, SKU/barcode uniqueness, per-variant stock and centime-safe cost/sale prices
- [x] Variant stock movement validation for purchases, sales, returns and adjustments; variant records and movement history persist through local save and JSON backup/restore
- [x] Connect variant selection and stock deduction to POS, direct sales, multi-line quotes, first invoice/delivery conversion, manual purchases, customer returns, supplier returns and purchase-order receipts; variant movement history is assigned to the active/original warehouse
- [x] Camera barcode scanning from the product editor, POS, direct sales and purchases, with permission-gated scanning and exact barcode/reference lookup (tests/pos.test.cjs)
- [x] Single product photo: choose, replace, remove, preview, and persist in local product data
- [x] Product name search and product edit flow
- [x] Basic free-text category, brand, unit and variant metadata in product cards, search, bulk import and CSV export
- [x] Managed product category and brand dictionaries with quick selection and local backup/restore
- [x] Product photo gallery supports up to four images, preview, per-image removal and persisted local product records
- [x] Variant stock matrix embedded in the product editor and warehouse-scoped variant balances in the variant workspace, including legacy default-warehouse balances
- [x] Product-level stock selling value and potential gross profit aggregate active variant quantities and variant-specific prices using centime-safe calculations
- [x] Product CSV exports one row per variant with its own cost, sale price, quantity and active/archive status
- [x] Archived variants cannot silently fall back to stale parent-product stock in sales, purchases, POS, quotes, stock counts, warehouse transfers or stock reports; variants with remaining stock cannot be deactivated, and positive stock movements reactivate them
- [x] Variant stock domain: normalized attribute combinations, duplicate SKU protection, centime-safe prices, per-variant movement validation, no-negative-stock rule and aggregate balances (tests/variant-stock.test.cjs)
- [x] Physical stock counts for each variant record positive or negative variance in the active warehouse movement ledger with a note and date
- [x] Atomic variant transfers between warehouses create paired transfer-out/transfer-in movements, reject insufficient source stock and preserve aggregate variant stock
- [x] Product purchase cost, sale price and unit margin when cost is recorded
- [x] Weighted average cost updates on purchases when the previous stock cost is known
- [x] Sale-time cost snapshots and tested gross-profit calculation; legacy sales without a cost are excluded
- [x] Inventory ledger unit tests for movements, duplicate protection, negative stock prevention and stock-count variance
- [x] Separate product quote prices and invoice prices; invoice conversion recalculates line/document totals while preserving discounts
- [x] Advanced customer price groups can be created, activated/deactivated, assigned to customers, persisted through backups and applied to quote/invoice line defaults (tests/contact-extensions.test.cjs)
- [x] Separate supplier-specific price rules for purchase orders and automatic supplier/product price lookup
- [x] TTC-only PDF totals by default; optional HT/TVA/TTC breakdown with a configurable VAT rate in company settings
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
- [x] Contact communication history for customer/supplier calls, messages, meetings and notes, with per-contact filtering, deletion, activity attribution and backup restore
- [x] Extended customer/supplier email, RC and IF identifiers with validation and editing; contact cards expose WhatsApp, phone-call and email actions using validated international links (tests/contact-channels.test.cjs)
- [x] Customer and supplier opening balances, credit ceilings and payment-term metadata
- [x] Enforce customer credit ceiling when converting a quote to an invoice; calculate and show invoice due dates from payment terms
- [x] Basic customer/supplier statement PDF exports from invoices, purchases and recorded payments
- [x] One validated custom name/value field and one optional JPG/PNG/WebP image attachment can be saved on newly created customer/supplier contacts, shown in contact cards and preserved through JSON backup/restore
- [x] Customer price groups support named active/disabled groups, 0–90% discounts, customer assignment, automatic quote-line pricing, and preservation of the group discount when configured invoice prices override quote prices
- [x] Multiple custom fields can be entered at contact creation as name=value lines; saved customer/supplier image attachments render thumbnails and can be removed individually
- [x] Edit existing customer/supplier details, opening balance, credit limit, payment terms, customer price group and multiple custom fields; add/remove up to eight image attachments after creation and open thumbnails in full-screen preview
- [x] Attach validated PDF, DOC/DOCX, XLS/XLSX, TXT and CSV documents to existing customer/supplier records; enforce an 8-file per-contact cap and 4 MB per-document picker limit, persist base64 content in local contact data/JSON backups, allow removal and sharing, and keep document entries out of image previews (tests/contact-extensions.test.cjs)

### Sales documents
- [x] Basic multi-product quotes with conversion to invoices and delivery notes; duplicate conversion is prevented
- [x] Invoice partial payments, paid/outstanding status and payment due dates
- [x] Partial customer returns with optional restocking and net sales/profit adjustment
- [x] Quote validity dates, accepted/rejected statuses, expired quote handling and confirmed deletion
- [x] Proforma invoices can be created from quotes with their own number series and do not deduct stock
- [ ] Customer order lifecycle
- [x] Automatic due-date reminders for unpaid invoices, supplier obligations and recurring expenses (local OS notifications, permission-gated)
- [x] Numbered credit-note PDF records are generated for partial customer returns and their value is automatically applied oldest-first to the customer's unpaid invoices; unused amounts remain as a visible customer credit balance and appear in customer statements
- [x] Configurable document numbering for quotes, invoices, delivery notes and purchase orders
- [x] Quote editor supports non-stock custom fee/service lines, named section headings, and product lookup by name, reference or barcode; sections carry through converted invoice/delivery PDFs without affecting totals or stock
- [ ] Camera barcode scanning directly inside the document editor
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
- [x] OS local notifications for recurring expenses and due items (permission-gated, scheduled at 09:00 on-device)
- [x] Basic single-cashbox ledger with opening balance, cash income/expense entries, non-negative balance validation and PDF journal
- [x] Cash POS checkouts are posted into the cash register ledger
- [x] Multiple bank accounts with opening balances, deposits, withdrawals and account-level balances
- [x] Atomic internal bank transfers with paired entries, duplicate/overdraft protection and unchanged combined bank balance
- [x] Bank account reconciliation against a statement balance with an auditable adjustment and reconciliation history
- [x] POS card and bank-transfer sales are posted to the selected bank account; checkout validates the account before committing stock and payment ledgers
- [x] Cash-to-bank and bank-to-cash transfers update both ledgers atomically with overdraft protection
- [x] Cheque lifecycle workspace with incoming/outgoing records, audited state transitions, deposit/bounce/cancel handling, persisted event history and bank-ledger posting only on clearing
- [x] Cheque lifecycle domain rules: centime-safe amounts, duplicate protection, strict dates, audited state transitions, bounced/redeposit flow and cleared-only bank effect (tests/cheques.test.cjs)
- [x] Partial customer invoice payments and supplier purchase payments with centime-safe allocation and balance recalculation
- [x] Customer payments can be allocated automatically, oldest invoice first, across multiple outstanding invoices; one cash/bank ledger entry is recorded for the full receipt
- [x] Supplier payments can be distributed oldest-first across multiple open purchases; one cash/bank movement is recorded and grouped reversal restores all allocations
- [x] Automated due-date reminders for unpaid invoices and supplier obligations
- [x] Manual statement-balance reconciliation with stored difference and adjustment entry
- [x] Pasted CSV bank statement import with exact matching against existing ledger rows and idempotent duplicate protection
- [x] Native Android file selection for CSV bank statements
- [x] Conservative fuzzy bank-statement matching by account, date, direction and amount; only unique high-confidence description matches are auto-linked, while ambiguous candidates remain unmatched

### POS
- [x] Product name search and stock-aware cart with quantity controls
- [x] Customer selection, general discount, cash/card/transfer methods and checkout validation
- [x] Checkout records sales, posts stock reduction and generates a PDF receipt
- [x] Product category dictionary and category selection
- [x] Camera barcode scanning from POS with exact barcode lookup and cart insertion (tests/pos.test.cjs)
- [x] Advanced stock filters for in-stock, low-stock, out-of-stock and service-only products, with category filters, barcode/reference/name search and sorting by name, quantity or price; uses warehouse/variant-aware stock totals (tests/stock-filters.test.cjs)
- [x] Parked POS sales persist across screens and app restarts and can be resumed or deleted
- [x] POS-linked returns: recent sales show remaining return quantity and open the existing validated partial-return workflow; permission-gated, with optional restocking, stock-ledger adjustment, profit correction and credit-note PDF (tests/pos.test.cjs, tests/sales-returns.test.cjs)
- [ ] Physical receipt-printer integration

### Projects and field operations
- [x] Installation work orders with requested, scheduled, in-progress, completed and cancelled lifecycle states, customer/project linkage and equipment allocation
- [x] Basic project records with customer, budget, dates, notes, status and project-linked expense totals
- [x] Task create/read/update/delete with project link, assignee, priority, due date, estimated duration and status
- [x] Technician profiles with phone, specialty and hourly rate; equipment records with reference, serial number, availability and assignment state
- [x] Equipment category dictionaries support create/select/delete, reject deleting categories in use, and persist through local save and backup/restore (tests/equipment-categories.test.cjs)
- [x] Technician work-type permissions (installation, maintenance, repair and inspection) are configurable per technician and enforced when assigning work orders and recording work time; legacy technicians without a permission list retain unrestricted compatibility (tests/field-operations.test.cjs)
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
- [x] CSV export for period summary, monthly trends and supplier comparison
- [x] XLSX export for period analysis, including current/previous-period metrics, monthly trends and supplier comparisons; workbook generation, base64 file persistence and native sharing are covered by tests/xlsx-export.test.cjs
- [x] Configurable period-report sections (summary, comparison, monthly trend and supplier comparison) persist locally and in backups, and apply consistently to PDF, CSV and XLSX exports (tests/report-layout.test.cjs)

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
- [x] Static French-dictionary coverage audit reports no missing static Arabic labels in App, quote, POS, variants, user access, warehouse, bank, field-operations, recurring-expense, agenda, period-report and shared accessibility controls
- [x] Main app, quote, POS, warehouse, bank, field-operations and recurring-expense alerts translate titles, messages and confirmation-button labels using the selected language
- [ ] Manual TalkBack verification in Arabic and French at normal and enlarged font sizes
- [ ] Android emulator, APK inspection, MobSF and all-module smoke tests (intentionally deferred; APK build is manual-only until the feature scope is complete)
- [ ] Android Accessibility Scanner audit for contrast, touch target and clickable bounds
