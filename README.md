# RingUp

RingUp is a web-based Point of Sale for a small shop (DVN Programming Challenge). **Phase 1 – foundation:** database schema, authentication, role-based access control, app shell with placeholder pages.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4) · PostgreSQL · Prisma 6 · iron-session (encrypted cookie sessions) · bcryptjs password hashing · Zod. Currency: **UGX** (stored as whole integers).

## Quick start

Requirements: Node 20+, PostgreSQL 15+ (Docker or a local install).

```bash
git clone <repo> && cd pos
npm install                 # also runs `prisma generate`
cp .env.example .env        # then set SESSION_SECRET (openssl rand -base64 32)

# 1. Start PostgreSQL – pick ONE:
docker compose up -d db     # option A: Docker (user/pass/db = pos/pos/pos)
#   option B: local Postgres, e.g. on Debian/Ubuntu:
#   sudo apt install postgresql
#   sudo -u postgres psql -c "CREATE USER pos WITH PASSWORD 'pos' CREATEDB;" -c "CREATE DATABASE pos OWNER pos;"

# 2. Create tables + demo data
npm run db:deploy           # applies migrations (use `npm run db:migrate` while changing the schema)
npm run db:seed

# 3. Run
npm run dev                 # http://localhost:3000 (runs `prisma generate` first)
```

> **After any change to `prisma/schema.prisma` or a `git pull` with new migrations:** run `npm run db:migrate` (dev) or `npm run db:deploy` (prod), then **restart the dev/prod server**. A running server keeps the old generated Prisma client in memory and fails with errors like `Unknown field … for select statement`. `npm run dev` and `npm run build` regenerate the client automatically (`predev` / `prebuild`, plus `postinstall`), and `GET /api/health` reports `schema: "mismatch"` when the client or DB is out of date.

Production build: `npm run build && npm start` (set `SESSION_COOKIE_SECURE=false` if you serve it over plain HTTP outside localhost).

### Demo accounts

All demo users share the password set by `SEED_PASSWORD` (default **`Pos@12345`**). Change it for any real deployment. Expected to change 

| Email | Role | Can open |
|-------|------|----------|
| admin@pos.test | ADMIN | everything incl. Users |
| manager@pos.test | MANAGER | Dashboard, POS, Products, Inventory, Sales, Reports |
| cashier@pos.test | CASHIER | Dashboard, POS, Sales (own sales only) |

### Environment variables (`.env.example`)

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | ≥32 chars, encrypts the session cookie |
| `SEED_PASSWORD` | password given to demo users by the seed |
| `UPLOAD_DIR` | where product images are stored (default `./uploads`; served via `/uploads/<file>`) |
| `MAX_UPLOAD_BYTES` | max image size, default 2 MB |
| `SESSION_COOKIE_SECURE` | optional; defaults to `true` in production, `false` in dev |

### Scripts

`dev`, `build`, `start`, `lint`, `db:migrate` (dev migration), `db:deploy` (apply migrations), `db:seed`, `db:reset` (drop + migrate + seed), `db:studio`.

## Access control

Defined once in `lib/permissions.ts` (page nav table + API rule table) and enforced in three layers:

1. `proxy.ts` (Next 16's replacement for middleware) – reads the encrypted cookie; redirects anonymous users to `/login`, redirects forbidden pages to `/dashboard?denied=1`, returns `401`/`403` JSON for APIs.
2. Server layouts/pages – `requireUser()` / `guardPage()` in `lib/auth.ts` re-load the user from the DB, so deactivating a user or changing a role takes effect immediately.
3. Route handlers – `apiAuth([roles])` per endpoint.

| Area | ADMIN | MANAGER | CASHIER |
|------|:--:|:--:|:--:|
| Dashboard, POS, Sales | yes | yes | yes (own sales) |
| Products, Inventory, Reports | yes | yes | no |
| Users | yes | no | no |
| `GET /api/products` | yes | yes | yes |
| `POST/PUT/PATCH/DELETE /api/products` | yes | yes | no |

### Phase 2 – product management (Admin/Manager)

`/products`: search by name/SKU, filter by category / active status / stock level, paginated; add, edit, deactivate/reactivate (soft delete – history is never lost); manage categories (add/rename). Creating a product with stock writes an `ADDITION` stock movement ("Initial stock"); changing the stock on edit writes an `ADJUSTMENT` for the difference. Images are validated by file signature (JPG/PNG/WebP/GIF, ≤ `MAX_UPLOAD_BYTES`) and stored in `UPLOAD_DIR`; on a host with an ephemeral disk, point `UPLOAD_DIR` at a persistent volume or replace `lib/uploads.ts` with object storage.

API (all bodies validated with Zod; errors are `{ error, fieldErrors? }`): `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id` (DELETE = deactivate), `GET/POST /api/categories`, `PATCH /api/categories/:id`, `POST /api/uploads` (multipart `file`). Cashiers can read active products/categories (for the POS) but every write returns 403.

### Phase 3 – POS and sales (all roles)

`/pos`: instant search (name/SKU; Enter adds an exact-SKU or single match, handy for barcode scanners), category chips, product grid (active products only; out-of-stock tiles disabled), cart with quantity (capped at stock), discount (fixed UGX or %, never above the subtotal), payment method (Cash with amount tendered and change; Mobile Money / Card / Bank Transfer with optional reference). Completing a sale shows a printable receipt; `/sales/:id/receipt` is the same receipt as a page (print stylesheet prints only the receipt). `/sales` lists sales — cashiers see only their own (other cashiers' receipts return 404), Admin/Manager see all.

`POST /api/sales` accepts only `{ items: [{ productId, qty }], discount?, paymentMethod, amountTendered?, paymentReference? }` – **prices and totals are never taken from the client**. In one DB transaction it atomically decrements stock (`UPDATE … WHERE stockQty >= qty RETURNING price, cost`, so concurrent sales can't oversell), snapshots unit price/cost into `SaleItem`, writes a `SALE` StockMovement per item and assigns a sequential receipt number (`RU-000001`, from the `receipt_no_seq` Postgres sequence; a rolled-back sale can leave a gap). Errors: 400 validation, 409 insufficient stock / inactive product (`code` field), 404 unknown product. `GET /api/sales`, `GET /api/sales/:id`.

### Phase 4a – inventory (Admin/Manager)

`/inventory` (cashiers are redirected; the APIs return 403): summary cards (active products, low, out, inventory value at cost, potential retail value), a low/out-of-stock alert banner (also on the dashboard), and a searchable stock table filterable by category and All/Low/Out. *Low* = stock > 0 and ≤ min stock; *Out* = stock ≤ 0. Only active products are counted. Per-product actions: **Add stock** (receiving; optional unit cost, optionally updating the product's buying cost), **Reduce stock** (damage/expiry/loss…, reason required, cannot go below 0) and **Adjust** (set to the counted quantity, reason required). `/inventory/history` lists every movement with before → after quantities, filterable by product, type, user and date range (dates are East Africa Time) and paginated.

Each action is one `UPDATE … RETURNING` on the product row inside a transaction that also writes the `StockMovement` (type, signed qty, `qtyBefore`, `qtyAfter`, reason, user). Row locking makes concurrent sales/adjustments safe: stock never goes negative and the movement chain always adds up. Editing a product's stock on the Products page uses the same code path.

API: `GET /api/inventory` (overview + summary), `GET/POST /api/inventory/movements` (history / `{ action: "ADD"|"REDUCE"|"ADJUST", productId, qty | countedQty, reason, unitCost?, updateBuyingCost? }`).

### Phase 4b – sales management and refunds

`/sales`: filter by receipt number, date range (East Africa Time), cashier (staff), payment method and status; paginated; the cards show count, gross, refunded and net for the **whole filtered set**. Cashiers only ever see their own sales. `/sales/:id`: items (with refunded quantities), totals, payment details, full refund history and a link to the receipt; the receipt also lists refunds and the net total.

**Refunds (Admin/Manager only; cashiers get 403 and see no button)** – `POST /api/refunds { saleId, fullRefund? | items: [{ saleItemId, qty, restock? }], reason (required), method? }`. One transaction: the sale row is locked (`SELECT … FOR UPDATE`) so concurrent refunds are serialised and quantities are re-read after the lock (no double refunds; a refund can never exceed what is still refundable); a `Refund` + `RefundItem`s are created; restocked items go back to stock with an atomic `UPDATE … RETURNING` and a `RETURN` stock movement (before/after); `Sale.refundedAmount` and `Sale.status` (`PARTIALLY_REFUNDED` → `REFUNDED`) are updated. The sale discount is spread proportionally over items, and a full refund always equals the sale total exactly. Untick *Restock* for damaged goods (the cost is then kept as a loss).

**Netting refunds out of reports** – use `lib/finance.ts` (`getFinancials`): `revenue = Σ Sale.total − Σ Sale.refundedAmount` (voided excluded), `COGS = Σ unitCost×qty − Σ unitCost×returned qty that was restocked`, `profit = revenue − COGS`. The dashboard and `GET /api/reports/summary` already use it.

Other endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `GET /api/users` (admin), `GET /api/products`, `GET /api/inventory` and `GET /api/reports/summary` (admin/manager), `GET /api/sales`.

## Schema (`prisma/schema.prisma`)

- **User** – email (unique), name, passwordHash (bcrypt), `role` (ADMIN | MANAGER | CASHIER), active.
- **Category** – name, sortOrder.
- **Product** – sku (unique), name, image, category, buyingCost, sellingPrice, stockQty, minStock, active.
- **StockMovement** – product, `type` (SALE | ADDITION | REDUCTION | ADJUSTMENT | RETURN), signed `qty`, reason, user, createdAt; optional link to Sale / PurchaseOrder. Full audit trail of stock changes.
- **Sale** – unique receiptNo, cashier, subtotal, discount, total, `paymentMethod` (CASH | MOBILE_MONEY | CARD | BANK_TRANSFER), `status` (COMPLETED | VOIDED | PARTIALLY_REFUNDED | REFUNDED), amountTendered, notes, createdAt.
- **SaleItem** – sale, product, qty, **unitPrice and unitCost snapshots** (later price changes don't rewrite history, and profit stays reportable), lineTotal.
- **Refund** / **RefundItem** – refund against a sale (amount, reason, user), per-item qty and whether to restock.
- *Bonus:* **Supplier**, **PurchaseOrder** (DRAFT | ORDERED | RECEIVED | CANCELLED), **PurchaseOrderItem**.

## Seed data

3 users, 6 categories (Drinks, Snacks, Stationery, Toiletries, Groceries, Household), 20 products with costs/prices/stock (one below min-stock and one out of stock to exercise low-stock UI), opening-stock movements, and one supplier. The seed is idempotent; re-running keeps live stock quantities.

## Project layout

```
app/login            login page          app/(app)/*   authenticated shell + pages
app/api/*            route handlers      proxy.ts      first-line auth/role checks
lib/permissions.ts   role/route tables   lib/auth.ts   server-side guards
lib/session.ts       iron-session cfg    prisma/       schema, migrations, seed
```

## Roadmap

- **Phase 1 (done):** schema, auth, roles, app shell.
- **Phase 2 (done):** product and category management.
- **Phase 3 (done):** POS checkout, receipts, sales list.
- **Phase 4a (done):** inventory overview, stock actions, stock history, low-stock alerts.
- **Phase 4b (done):** sales filters/totals, sale detail, refunds with restock.
- **Phase 5:** dashboard, reports, user management.
