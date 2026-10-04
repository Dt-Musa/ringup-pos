import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD || "Pos@12345";

const users: { email: string; name: string; role: Role }[] = [
  { email: "admin@pos.test", name: "Demo Admin", role: "ADMIN" },
  { email: "manager@pos.test", name: "Demo Manager", role: "MANAGER" },
  { email: "cashier@pos.test", name: "Demo Cashier", role: "CASHIER" },
];

const categories = ["Drinks", "Snacks", "Stationery", "Toiletries", "Groceries", "Household"];

// [sku, name, category, buyingCost, sellingPrice, stockQty, minStock]  (UGX)
const products: [string, string, string, number, number, number, number][] = [
  ["DRK-001", "Bottled Water 500ml", "Drinks", 600, 1000, 200, 40],
  ["DRK-002", "Soda 300ml", "Drinks", 900, 1500, 150, 30],
  ["DRK-003", "Fresh Juice 1L", "Drinks", 3000, 5000, 60, 15],
  ["DRK-004", "Energy Drink 330ml", "Drinks", 1800, 3000, 8, 10], // below min stock on purpose
  ["SNK-001", "Potato Crisps 50g", "Snacks", 700, 1200, 120, 25],
  ["SNK-002", "Chocolate Bar", "Snacks", 1500, 2500, 80, 20],
  ["SNK-003", "Biscuits Pack", "Snacks", 1000, 1800, 90, 20],
  ["STA-001", "Ballpoint Pen (Blue)", "Stationery", 300, 500, 300, 50],
  ["STA-002", "A4 Exercise Book 96pg", "Stationery", 1200, 2000, 100, 20],
  ["STA-003", "A4 Printing Paper (Ream)", "Stationery", 14000, 20000, 25, 5],
  ["STA-004", "Pencil HB", "Stationery", 200, 400, 250, 50],
  ["TOI-001", "Bar Soap 200g", "Toiletries", 1800, 3000, 70, 15],
  ["TOI-002", "Toothpaste 100ml", "Toiletries", 3500, 5500, 45, 10],
  ["TOI-003", "Shampoo 250ml", "Toiletries", 6000, 9000, 30, 8],
  ["TOI-004", "Toilet Paper (4 roll)", "Toiletries", 3200, 5000, 0, 10], // out of stock on purpose
  ["GRO-001", "Sugar 1kg", "Groceries", 4200, 5500, 60, 15],
  ["GRO-002", "Cooking Oil 1L", "Groceries", 7500, 10000, 40, 10],
  ["GRO-003", "Rice 1kg", "Groceries", 3800, 5000, 80, 20],
  ["HOU-001", "Laundry Detergent 500g", "Household", 4000, 6500, 35, 8],
  ["HOU-002", "Candle (Pack of 6)", "Household", 2500, 4000, 50, 10],
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, active: true },
      create: { ...u, passwordHash },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@pos.test" } });

  const catIds = new Map<string, string>();
  for (const [i, name] of categories.entries()) {
    const c = await prisma.category.upsert({ where: { name }, update: { sortOrder: i }, create: { name, sortOrder: i } });
    catIds.set(name, c.id);
  }

  for (const [sku, name, cat, buyingCost, sellingPrice, stockQty, minStock] of products) {
    const existing = await prisma.product.findUnique({ where: { sku } });
    const data = { name, categoryId: catIds.get(cat)!, buyingCost, sellingPrice, minStock };
    if (existing) {
      await prisma.product.update({ where: { sku }, data }); // keep live stockQty on re-seed
    } else {
      const p = await prisma.product.create({ data: { sku, ...data, stockQty } });
      if (stockQty > 0) {
        await prisma.stockMovement.create({
          data: { productId: p.id, type: StockMovementType.ADDITION, qty: stockQty, qtyBefore: 0, qtyAfter: stockQty, reason: "Opening stock (seed)", userId: admin.id },
        });
      }
    }
  }

  await prisma.supplier.upsert({
    where: { name: "Kampala Wholesale Traders" },
    update: {},
    create: { name: "Kampala Wholesale Traders", phone: "+256700000000", email: "orders@kwt.example", address: "Kampala, Uganda" },
  });

  console.log(`Seeded ${users.length} users, ${categories.length} categories, ${products.length} products.`);
  console.log(`Demo password for all users: ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
