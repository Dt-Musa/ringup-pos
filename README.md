# RingUp POS

RingUp POS is a browser-based point-of-sale and store-management application for small retail businesses. It brings checkout, product and inventory management, sales records, refunds, reporting, and staff access into one system. It was developed for the DVN Digital Skills Challenge 1.

The application uses Ugandan shillings (UGX), stored as whole-number amounts.

## What it does

- **Point of sale:** find products by name, SKU, or barcode; scan supported barcodes; manage a cart; apply discounts; record cash, mobile money, card, or bank-transfer payments; and produce printable receipts. The cart is saved in the browser so it can be restored after a page refresh. Completing a sale requires a connection to the application and database.
- **Products and inventory:** manage products, categories, prices, costs, barcodes, and product images; record stock additions, reductions, and adjustments; review stock history; and see low-stock alerts.
- **Suppliers and purchasing:** maintain supplier records, create and track purchase orders, receive ordered items into stock, and record supplier invoice details.
- **Sales and refunds:** review sales and receipt details, process full or item-level refunds, and choose whether returned items go back into stock.
- **Dashboard and reports:** view sales and stock summaries, charts, profit information for permitted roles, and reports that can be exported as CSV or PDF.
- **Staff and access:** create and manage staff accounts, assign roles, deactivate or reactivate accounts, and reset passwords. Staff can request a password-reset link by email when Resend is configured.

## Roles

| Role | Access |
| --- | --- |
| **Admin** | All areas, including staff management and reports |
| **Manager** | POS, products, inventory, suppliers and purchases, sales, refunds, and reports |
| **Cashier** | POS, dashboard, and their own sales and receipts |

Configured account emails:

- **Admin:** `irankundamusa17@gmail.com`
- **Manager:** `oxbtytes17@gmail.com`
- **Cashier:** `oxcurious12@gmail.com`

Access is checked on the server as well as in the interface. Deactivating an account, changing its role, or resetting its password invalidates existing sessions.

## Technology

- Next.js App Router and TypeScript
- PostgreSQL with Prisma ORM
- Tailwind CSS
- Encrypted cookie sessions and bcrypt password hashing
- Zod request validation
- Recharts for dashboard charts and PDFKit for PDF report exports
- Resend for password-reset email delivery

## Run locally

### Requirements

- Node.js 20.9 or newer and npm
- PostgreSQL, either a local instance, Docker, or a Neon development/test branch

Use a **development or test database** for local work. A local app pointed at the production database can change live products, stock, sales, and staff data. Neon branches provide separate connection strings; keep Vercel pointed at the production branch and local development pointed at a test branch.

### Setup

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/Dt-Musa/ringup-pos.git
   cd ringup-pos
   npm install
   ```

2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in macOS/Linux).

3. Set `DATABASE_URL` to the connection string for your local PostgreSQL database or Neon development/test branch. Set a unique `SESSION_SECRET` of at least 32 characters. For local password-reset links, set `APP_URL` to `http://localhost:3000`.

   To generate a session secret with Node.js:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. Apply the checked-in migrations to the database selected by `DATABASE_URL`:

   ```sh
   npm run db:deploy
   ```

5. Start the development server:

   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

The development server and production build generate the Prisma client automatically. After switching database branches or applying migrations, restart the server. If the app reports that a database column is missing, confirm `DATABASE_URL` points to the intended development/test database and that its migrations have been applied.

### Optional development data

`npm run db:seed` adds sample users, categories, products, opening stock, and a supplier. It is intended for a disposable local or test database. The script skips existing demo users without changing their account fields, but it can update seeded categories and product details. It refuses to run when `NODE_ENV` is `production`; do not try to bypass that guard or run the seed against real store data. The seed command prints its demo password in the terminal, so treat its output as sensitive.

`npm run db:demo` can create sample sales for exercising reports and refund workflows. Use it only in a disposable development/test database. `npm run db:reset` is destructive and should never be used against a database containing data you need to keep.

## Environment configuration

Copy `.env.example` to `.env` and keep `.env` out of Git. Set secrets only in local environment files or your hosting provider’s secret settings; never add real credentials to this README or commit them.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the intended environment |
| `SESSION_SECRET` | Secret used to encrypt session cookies; at least 32 characters |
| `SEED_PASSWORD` | Optional password used for newly created sample accounts; development/test only |
| `UPLOAD_DIR` | Legacy local directory for older product images; new images are stored in PostgreSQL |
| `MAX_UPLOAD_BYTES` | Maximum product-image upload size; defaults to 2 MiB |
| `RESEND_API_KEY` | Server-side Resend credential for password recovery |
| `RESEND_FROM_EMAIL` | Verified sender address for recovery emails |
| `APP_URL` | Application origin used to create password-reset links; use the HTTPS production URL in production |
| `SESSION_COOKIE_SECURE` | Optional secure-cookie override; production defaults to secure cookies |

Password recovery needs valid Resend credentials and the correct `APP_URL`. Without them, login and other application features continue to work, but recovery email is unavailable. Product images are stored in PostgreSQL so they persist on Vercel and other hosts without a separate storage service.

## Database changes

Prisma models are in `prisma/schema.prisma`; committed SQL migrations are in `prisma/migrations/`.

- Use `npm run db:migrate` while developing a schema change against a development database. It creates and applies a migration.
- Use `npm run db:deploy` to apply committed migrations to the database in `DATABASE_URL`.
- Confirm the target database before running either command. Never point local experiments at production.
- Production migrations are not run by `npm run build`; plan and apply them deliberately before deploying code that requires the changed schema.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Generate the Prisma client and build the production application |
| `npm start` | Start the built application |
| `npm run db:deploy` | Apply committed Prisma migrations to `DATABASE_URL` |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:seed` | Add sample data to a development/test database |
| `npm run db:demo` | Generate sample sales in a development/test database |
| `npm run db:studio` | Open Prisma Studio for the configured database |

## Deployment notes

The app can be deployed to Vercel or another Node.js host. Configure the production environment variables in the hosting provider, with `DATABASE_URL` pointing to the production database and `APP_URL` set to the public HTTPS origin. Keep local and production credentials separate. Apply required committed migrations to the intended production database as a deliberate release step; builds do not apply them automatically.

Product-image persistence requires the committed `ProductImage` migration to be applied to the production database. Password-reset email also requires a verified Resend sender and production `APP_URL`.

## Project structure

```text
app/                    Pages, layouts, and API route handlers
components/             POS, inventory, sales, reporting, and shared UI
lib/                    Authentication, permissions, business logic, and validation
prisma/schema.prisma    Database models
prisma/migrations/      Versioned database migrations
prisma/seed.ts          Optional development/test sample data
```
