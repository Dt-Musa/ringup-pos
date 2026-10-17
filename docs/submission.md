# DVN Digital Skills Challenge 1 
## Project

RingUp POS is a point-of-sale and store-management system for small retailers. It supports checkout, product and inventory management, supplier purchasing, sales and refunds, staff access, and business reporting. The application uses Ugandan shillings (UGX).

## Submission links

- **Live system:** https://ringuppos.com
- **Source repository:** https://github.com/Dt-Musa/ringup-pos


## Judge access

- **Account user emails and password shall be shared on watsapp**


## Implemented features

- **Authentication and staff roles:** Administrator, Manager, and Cashier accounts with role-based access controls; password recovery by email when configured.
- **Product management:** Create and edit products, assign categories, set cost and selling prices, define stock thresholds, and manage product images, SKUs, and barcodes.
- **Inventory:** Record stock additions, reductions, and adjustments; view stock history, low-stock alerts, out-of-stock items, and inventory valuation.
- **Supplier purchasing:** Manage suppliers, create and track purchase orders, receive ordered stock, and record supplier invoice details.
- **Point of sale:** Search products by name, SKU, or barcode; scan supported barcodes; edit cart quantities; apply discounts; accept cash, mobile money, card, or bank-transfer payments; and produce printable receipts.
- **Sales and refunds:** Search and filter sales, review receipts, and process full or item-level refunds with stock-restocking choices.
- **Dashboard and reports:** View sales and inventory summaries, charts, profit information for permitted roles, and date-filtered reports. Export reports as CSV or PDF.

## Additional features and challenge bonus

- **Barcode scanning:** Find products by scanning a supported barcode in the POS.
- **Cart recovery:** The POS cart is saved in the browser and can be restored after a refresh or temporary connection loss. Completing a sale still requires a connection.
- **Supplier purchasing bonus:** Maintain suppliers, create and track purchase orders, record supplier invoice details, and receive ordered items into stock.

## Planned next phase — not yet implemented

These items are future plans and are not included in the implemented-feature claims above.

- **More complete cart workflow:** Support parked/held carts and improve offline recovery and safe synchronization when connectivity returns. Current cart recovery does not mean sales can be completed offline.
- **Mobile money provider integration:** Connect to a payment provider such as MTN MoMo or Airtel Money to initiate payments and confirm payment status. The current system records Mobile Money as a selected payment method; that is not the same as processing a provider transaction.
- **Cashier shift and cash reconciliation:** Record shift opening/closing balances and compare expected cash with counted cash, including variances.

## Technologies

- Next.js App Router and TypeScript
- PostgreSQL hosted on Neon, accessed through Prisma ORM
- Tailwind CSS
- Encrypted cookie sessions and bcrypt password hashing
- Zod request validation
- Recharts for charts and PDFKit for PDF exports
- Resend for password-reset email delivery
- Vercel for hosting

## Database structure

The database is defined in [`prisma/schema.prisma`](../prisma/schema.prisma), with versioned SQL changes in [`prisma/migrations/`](../prisma/migrations/). The schema covers users and roles, products and categories, sales and sale items, payments, refunds, stock movements, suppliers, purchase orders, and purchase-order items.

## Technical documentation and setup

The project README contains the local setup, environment configuration, database migration, common commands, deployment notes, and project structure: [`README.md`](../README.md).

For local development, configure `.env` with a development/test PostgreSQL database and a unique session secret, install dependencies with `npm install`, apply committed migrations with `npm run db:deploy`, then start the app with `npm run dev`. Never use a production database for local experiments. The README describes optional sample-data commands and their safety limits.

## Production deployment note

The `ProductImage` migration (`20261017120000_persist_product_images`) is committed but has not yet been applied to the production Neon database. Run `npm run db:deploy` (i.e. `prisma migrate deploy`) against the production `DATABASE_URL` before judging so product image uploads work on the live system. The health endpoint at `/api/health` reports `"db": "connected"` and `"schema": "ok"` once migrations are applied.

## Screenshots

The repository currently includes these landing-page assets:

- [Dashboard screenshot](../public/assets/LandingPage/dashboard.jpg)
- [Landing-page hero image](../public/assets/LandingPage/hero-image.jpg)

The following live-system screenshots are in [`public/assets/Submission/`](../public/assets/Submission/):

- Sign in: [Sign-in page](../public/assets/Submission/Signin-page.png), [password reset links](../public/assets/Submission/reset-link.png), [reset confirmation](../public/assets/Submission/Signin-sucessful-reset.png)
- POS checkout and receipt: [complete sale](../public/assets/Submission/pos-completesale.png), [printed receipt](../public/assets/Submission/pos-completesale-receipt.png), [cashier POS view](../public/assets/Submission/cashier-pos.png)
- Product management: [add product page](../public/assets/Submission/poduct-page-addproduct.png)
- Inventory and stock history: [purchase order](../public/assets/Submission/Inventory-purchase-order.png), [purchase order details](../public/assets/Submission/Inventory-purchase-order2.png), [purchase view 1](../public/assets/Submission/Inventory-purhase.png), [purchase view 2](../public/assets/Submission/Inventory-purhase2.png)
- Sales and refunds: [sales page](../public/assets/Submission/sales-refund.png), [refund receipt](../public/assets/Submission/sales-refund-receipt.png)
- Reports and exports: [report view](../public/assets/Submission/report.png), [Excel export](../public/assets/Submission/report-excel.png)
- Dashboard: [dashboard 1](../public/assets/Submission/dashboard.png), [dashboard 2](../public/assets/Submission/dashboard1.png), [dashboard 3](../public/assets/Submission/dashboard2.png), [users](../public/assets/Submission/users.png)

## Suggested live demonstration

1. Sign in with the dedicated judge account and point out its role-based navigation.
2. Scan a product barcode in the POS, add it to the cart, change quantity, and apply a discount.
3. Complete a sample sale, select a payment method, and open or print the receipt.
4. Show the resulting sale and stock change, then demonstrate stock history and a low-stock alert.
5. Demonstrate cart recovery after a refresh or temporary connection loss; clarify that checkout itself needs a connection.
6. Create or open a purchase order, record supplier invoice details, receive items, and show the resulting inventory update.
7. Open sales and reports, apply a date filter, and export a CSV or PDF report.


