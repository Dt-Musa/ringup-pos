import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD || "Pos@12345";

const users: { email: string; name: string; role: Role }[] = [
  { email: "admin@pos.test", name: "Demo Admin", role: "ADMIN" },
  { email: "manager@pos.test", name: "Demo Manager", role: "MANAGER" },
  { email: "cashier@pos.test", name: "Demo Cashier", role: "CASHIER" },
];

const categories = ["Coffee", "Tea", "Juice & Drinks", "Pastries", "Breakfast", "Meals", "Snacks", "Desserts"];

// [sku, name, category, buyingCost, sellingPrice, stockQty, minStock]  (UGX)
const products: [string, string, string, number, number, number, number][] = [
  ["COF-001", "Espresso", "Coffee", 1500, 5000, 100, 20],
  ["COF-002", "Cappuccino", "Coffee", 2500, 8000, 100, 20],
  ["COF-003", "Café Latte", "Coffee", 2800, 9000, 80, 20],
  ["TEA-001", "Masala Tea", "Tea", 800, 4000, 120, 25],
  ["TEA-002", "Ginger Lemon Tea", "Tea", 900, 4500, 90, 20],
  ["JUI-001", "Fresh Passion Juice", "Juice & Drinks", 2000, 6000, 60, 15],
  ["JUI-002", "Mango Smoothie", "Juice & Drinks", 3000, 8000, 50, 15],
  ["JUI-003", "Bottled Water 500ml", "Juice & Drinks", 600, 2000, 200, 40],
  ["PAS-001", "Butter Croissant", "Pastries", 1800, 5000, 40, 10],
  ["PAS-002", "Cinnamon Roll", "Pastries", 2000, 6000, 8, 10], // below min stock on purpose
  ["BRK-001", "Spanish Omelette", "Breakfast", 4000, 12000, 30, 8],
  ["BRK-002", "Chapati & Beans", "Breakfast", 2500, 7000, 40, 10],
  ["MEA-001", "Chicken Burger & Fries", "Meals", 9000, 22000, 25, 8],
  ["MEA-002", "Beef Pilau", "Meals", 7000, 18000, 25, 8],
  ["MEA-003", "Grilled Tilapia Meal", "Meals", 14000, 30000, 15, 5],
  ["SNK-001", "Samosa (2 pcs)", "Snacks", 1000, 3000, 60, 15],
  ["DES-001", "Chocolate Cake Slice", "Desserts", 3500, 9000, 20, 6],
  ["DES-002", "Fruit Salad", "Desserts", 2500, 7000, 0, 5], // out of stock on purpose
];

const tables = [
  ["T1", 2], ["T2", 2], ["T3", 4], ["T4", 4], ["T5", 4], ["T6", 6], ["Patio 1", 4], ["Patio 2", 6],
] as const;

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
          data: { productId: p.id, type: StockMovementType.ADDITION, qty: stockQty, reason: "Opening stock (seed)", userId: admin.id },
        });
      }
    }
  }

  for (const [name, seats] of tables) {
    await prisma.diningTable.upsert({ where: { name }, update: { seats }, create: { name, seats } });
  }

  await prisma.supplier.upsert({
    where: { name: "Kampala Fresh Supplies" },
    update: {},
    create: { name: "Kampala Fresh Supplies", phone: "+256700000000", email: "orders@kfs.example", address: "Kampala, Uganda" },
  });

  console.log(`Seeded ${users.length} users, ${categories.length} categories, ${products.length} products, ${tables.length} tables.`);
  console.log(`Demo password for all users: ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
