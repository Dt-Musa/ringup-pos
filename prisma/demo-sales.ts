/**
 * Optional demo data: realistic sales over the last ~30 days, generated through the REAL sale / refund /
 * stock logic (lib/sales createSale, lib/refunds createRefund, lib/inventory runStockAction), so stock levels,
 * stock movements (with before/after), receipt numbers and refunds stay consistent. Events are executed in
 * chronological order and then back-dated to their simulated time.
 *
 *   npm run db:demo                      # 30 days, refuses if sales already exist
 *   npm run db:demo -- --days 14 --seed 7
 *   npm run db:demo -- --force           # add more on top of existing sales
 *
 * Undo with `npm run db:reset` (drops everything and re-seeds).
 * Runs with `--conditions=react-server` so the `server-only` guard in lib/* resolves to a no-op.
 */
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "../lib/db";
import { computeDiscount, createSale } from "../lib/sales";
import { createRefund } from "../lib/refunds";
import { runStockAction } from "../lib/inventory";
import { getFinancials } from "../lib/finance";
import { createSaleSchema, type CreateSaleInput } from "../lib/validation/sale";
import { createRefundSchema } from "../lib/validation/refund";
import { addDays, todayEAT } from "../lib/dates";

// ---------------------------------------------------------------- args / rng ----
const args = process.argv.slice(2);
const arg = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};
const DAYS = Math.min(365, Math.max(1, arg("days", 30)));
const FORCE = args.includes("--force");
let seed = arg("seed", 20261006) >>> 0;
function rand() {
  // mulberry32 – deterministic so demo runs are reproducible
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function pick<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = rand() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

// Local time (Africa/Kampala, UTC+3) -> Date
const at = (day: string, minutes: number) => new Date(Date.parse(`${day}T00:00:00+03:00`) + minutes * 60_000);

const CATEGORY_WEIGHT: Record<string, number> = { Drinks: 5, Snacks: 4, Groceries: 3, Stationery: 2.5, Toiletries: 2, Household: 1.5 };
const PAYMENT_WEIGHT: [PaymentMethod, number][] = [["CASH", 45], ["MOBILE_MONEY", 35], ["CARD", 12], ["BANK_TRANSFER", 8]];
const REFUND_REASONS = ["Customer changed their mind", "Wrong item picked", "Damaged packaging", "Product past expiry date", "Charged twice by mistake"];
const REFUND_METHOD: Record<PaymentMethod, string> = { CASH: "Cash", MOBILE_MONEY: "Mobile money reversal", CARD: "Card reversal", BANK_TRANSFER: "Bank transfer" };

type SaleEvent = { kind: "sale"; at: Date; id: number };
type RefundEvent = { kind: "refund"; at: Date; saleEvent: number };
type RestockEvent = { kind: "restock"; at: Date };
type Event = SaleEvent | RefundEvent | RestockEvent;

async function main() {
  const existing = await prisma.sale.count();
  if (existing > 0 && !FORCE) {
    console.error(`There are already ${existing} sales. Re-run with --force to add demo sales anyway, or run \`npm run db:reset\` first.`);
    process.exitCode = 1;
    return;
  }

  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } });
  const cashiers = users.map((u) => ({ ...u, w: u.role === "CASHIER" ? 6 : u.role === "MANAGER" ? 3 : 1 }));
  const staff = users.filter((u) => u.role !== "CASHIER");
  if (!cashiers.length || !staff.length) throw new Error("Seed the database first (npm run db:seed).");

  const products = (
    await prisma.product.findMany({ where: { active: true }, include: { category: { select: { name: true } } } })
  ).map((p) => ({
    ...p,
    // products that start out of stock / below minimum are left alone (never restocked) so the demo keeps
    // some low-stock alerts; out-of-stock ones are never sold
    restockable: p.stockQty > p.minStock,
    weight: (CATEGORY_WEIGHT[p.category.name] ?? 1) * (0.5 + rand()),
  }));
  const stock = new Map(products.map((p) => [p.id, p.stockQty]));

  // ---- 1. plan events ----
  const now = new Date();
  const today = todayEAT(now);
  const events: Event[] = [];
  let saleNo = 0;
  for (let d = DAYS - 1; d >= 0; d--) {
    const day = addDays(today, -d);
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    const base = dow === 6 ? 16 : dow === 0 ? 8 : dow === 5 ? 13 : 11;
    const trend = 1 + (DAYS - d) / (DAYS * 4); // business slowly growing
    const count = Math.round(base * trend * (0.75 + rand() * 0.5));
    events.push({ kind: "restock", at: at(day, 7 * 60 + 30) });
    for (let i = 0; i < count; i++) {
      const t = at(day, between(8 * 60, 21 * 60 - 1) + rand());
      if (t > now) continue;
      const id = saleNo++;
      events.push({ kind: "sale", at: t, id });
      if (rand() < 0.045) {
        const rt = new Date(t.getTime() + between(15, 30 * 60) * 60_000);
        if (rt < now) events.push({ kind: "refund", at: rt, saleEvent: id });
      }
    }
  }
  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  // The seed's opening-stock movements are stamped with the time the seed ran. Move them to just before the
  // demo period so the stock history reads in order (opening stock → sales → restocks).
  if (events.length) {
    const opening = new Date(events[0].at.getTime() - 24 * 3_600_000);
    await prisma.stockMovement.updateMany({
      where: { reason: "Opening stock (seed)", type: "ADDITION", createdAt: { gt: opening } },
      data: { createdAt: opening },
    });
  }

  // ---- 2. execute in time order through the real business logic ----
  const saleIds = new Map<number, { id: string; paymentMethod: PaymentMethod }>();
  let lastAt = new Date(0);
  let restocks = 0;
  let refunds = 0;
  let skipped = 0;

  const restock = async (p: (typeof products)[number], when: Date, why: string) => {
    const target = p.minStock * 4 + between(10, 40);
    const have = stock.get(p.id)!;
    if (have >= target) return;
    const mv = await runStockAction({ action: "ADD", productId: p.id, qty: target - have, reason: why, unitCost: p.buyingCost }, staff[0].id);
    await prisma.stockMovement.update({ where: { id: mv!.id }, data: { createdAt: when } });
    stock.set(p.id, mv!.product.stockQty);
    restocks++;
  };

  for (const ev of events) {
    const when = new Date(Math.max(ev.at.getTime(), lastAt.getTime() + 1000));
    lastAt = when;

    if (ev.kind === "restock") {
      for (const p of products) {
        if (p.restockable && stock.get(p.id)! <= p.minStock && rand() < 0.6) await restock(p, when, "Supplier delivery (demo data)");
      }
      continue;
    }

    if (ev.kind === "refund") {
      const sale = saleIds.get(ev.saleEvent);
      if (!sale) continue;
      const items = await prisma.saleItem.findMany({ where: { saleId: sale.id }, orderBy: { id: "asc" } });
      const r = rand();
      const reason = REFUND_REASONS[between(0, REFUND_REASONS.length - 1)];
      const input =
        r < 0.3
          ? { saleId: sale.id, fullRefund: true, reason, method: REFUND_METHOD[sale.paymentMethod] }
          : { saleId: sale.id, items: [{ saleItemId: items[between(0, items.length - 1)].id, qty: 1, restock: r < 0.9 }], reason: r < 0.9 ? reason : "Damaged packaging", method: REFUND_METHOD[sale.paymentMethod] };
      const opStart = new Date();
      const res = await createRefund(createRefundSchema.parse(input), staff[between(0, staff.length - 1)].id);
      await prisma.refund.update({ where: { id: res.refund.id }, data: { createdAt: when } });
      const returned = await prisma.stockMovement.findMany({ where: { saleId: sale.id, type: "RETURN", createdAt: { gte: opStart } } });
      await prisma.stockMovement.updateMany({ where: { id: { in: returned.map((m) => m.id) } }, data: { createdAt: when } });
      for (const m of returned) stock.set(m.productId, m.qtyAfter ?? stock.get(m.productId)! + m.qty);
      refunds++;
      continue;
    }

    // ---- sale ----
    const lineCount = pick([1, 2, 3, 4], (n) => [45, 30, 17, 8][n - 1]);
    const lines = new Map<string, number>();
    for (let i = 0; i < lineCount; i++) {
      const p = pick(products, (x) => x.weight);
      const bulky = p.sellingPrice <= 500; // pens, pencils
      const qty = bulky ? between(1, 6) : pick([1, 2, 3, 4], (n) => [62, 25, 9, 4][n - 1]);
      lines.set(p.id, (lines.get(p.id) ?? 0) + qty);
    }
    const items: { productId: string; qty: number }[] = [];
    for (const [productId, qty] of lines) {
      const p = products.find((x) => x.id === productId)!;
      if (stock.get(productId)! < qty && p.restockable) await restock(p, new Date(when.getTime() - 500), "Urgent restock (demo data)");
      if (stock.get(productId)! >= qty) items.push({ productId, qty });
    }
    if (!items.length) {
      skipped++;
      continue;
    }

    const subtotal = items.reduce((s, it) => s + products.find((p) => p.id === it.productId)!.sellingPrice * it.qty, 0);
    let discount: CreateSaleInput["discount"];
    const dr = rand();
    if (dr < 0.05) discount = { type: "PERCENT", value: dr < 0.025 ? 5 : 10 };
    else if (dr < 0.08 && subtotal >= 5000) discount = { type: "FIXED", value: subtotal >= 20000 ? 1000 : 500 };
    const total = subtotal - computeDiscount(subtotal, discount);

    const method = pick(PAYMENT_WEIGHT, ([, w]) => w)[0];
    const digits = (n: number) => Array.from({ length: n }, () => between(0, 9)).join("");
    const input: CreateSaleInput = createSaleSchema.parse({
      items,
      ...(discount ? { discount } : {}),
      paymentMethod: method,
      ...(method === "CASH"
        ? { amountTendered: rand() < 0.3 ? total : Math.ceil(total / (rand() < 0.5 ? 1000 : 5000)) * (rand() < 0.5 ? 1000 : 5000) }
        : { paymentReference: method === "MOBILE_MONEY" ? `MP${digits(10)}` : method === "CARD" ? `AUTH${digits(6)}` : `TRF${digits(8)}` }),
    });
    if (input.amountTendered !== undefined && input.amountTendered < total) input.amountTendered = total;

    const cashier = pick(cashiers, (c) => c.w);
    const { sale } = await createSale(input, cashier.id);
    await prisma.sale.update({ where: { id: sale.id }, data: { createdAt: when } });
    await prisma.stockMovement.updateMany({ where: { saleId: sale.id, type: "SALE" }, data: { createdAt: when } });
    for (const it of sale.items) stock.set(it.productId, stock.get(it.productId)! - it.qty);
    saleIds.set(ev.id, { id: sale.id, paymentMethod: sale.paymentMethod });
  }

  const f = await getFinancials();
  console.log(
    `Demo data: ${saleIds.size} sales over ${DAYS} days (${addDays(today, -(DAYS - 1))} – ${today}), ${refunds} refunds, ${restocks} restocks` +
      (skipped ? `, ${skipped} skipped (no stock)` : "") +
      `.\nNet sales UGX ${f.revenue.toLocaleString("en-US")} · COGS UGX ${f.cogs.toLocaleString("en-US")} · gross profit UGX ${f.profit.toLocaleString("en-US")}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
