import { prisma } from "../lib/db";
import { createProductSchema } from "../lib/validation/product";
import { productWhere } from "../lib/products";
import { createSale } from "../lib/sales";

function parseStoredCart(raw: string | null): { productId: string; qty: number }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const qtyMap = new Map<string, number>();
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.productId === "string" &&
        item.productId.trim().length > 0 &&
        typeof item.qty === "number" &&
        Number.isInteger(item.qty) &&
        item.qty > 0
      ) {
        qtyMap.set(item.productId, (qtyMap.get(item.productId) ?? 0) + item.qty);
      }
    }
    return Array.from(qtyMap.entries()).map(([productId, qty]) => ({ productId, qty }));
  } catch {
    return [];
  }
}

async function runTests() {
  console.log("=== STARTING BARCODE & OFFLINE CART TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  // ---------------------------------------------------------
  // TEST 1: Schema & Barcode Validation
  // ---------------------------------------------------------
  console.log("Test 1: Barcode validation schema");
  const validParse = createProductSchema.safeParse({
    name: "Test Barcode Prod",
    sku: "TEST-BC-01",
    barcode: "1234567890128",
    categoryId: "cat_1",
    buyingCost: 1000,
    sellingPrice: 1500,
    stockQty: 10,
    minStock: 2,
  });
  assert(validParse.success && validParse.data.barcode === "1234567890128", "Valid barcode parsed correctly");

  const emptyParse = createProductSchema.safeParse({
    name: "Test Barcode Prod",
    sku: "TEST-BC-02",
    barcode: "",
    categoryId: "cat_1",
    buyingCost: 1000,
    sellingPrice: 1500,
  });
  assert(emptyParse.success && emptyParse.data.barcode === null, "Empty barcode string converts to null");

  const invalidCharParse = createProductSchema.safeParse({
    name: "Test Barcode Prod",
    sku: "TEST-BC-03",
    barcode: "INVALID BARCODE WITH SPACES!@#",
    categoryId: "cat_1",
    buyingCost: 1000,
    sellingPrice: 1500,
  });
  assert(!invalidCharParse.success, "Invalid barcode characters rejected");

  // ---------------------------------------------------------
  // TEST 2: Database lookup by registered barcode
  // ---------------------------------------------------------
  console.log("\nTest 2: Database lookup by registered barcode");
  const water = await prisma.product.findUnique({
    where: { barcode: "6001001001" },
  });
  assert(Boolean(water && water.sku === "DRK-001"), "Registered barcode 6001001001 resolves to DRK-001");

  const crisps = await prisma.product.findUnique({
    where: { barcode: "6002001001" },
  });
  assert(Boolean(crisps && crisps.sku === "SNK-001"), "Registered barcode 6002001001 resolves to SNK-001");

  // ---------------------------------------------------------
  // TEST 3: Barcode scanning simulation (add & repeat scan)
  // ---------------------------------------------------------
  console.log("\nTest 3: POS barcode scan & quantity increase");
  const activeProducts = await prisma.product.findMany({ where: { active: true } });

  let simCart: { productId: string; qty: number }[] = [];
  function scan(barcodeOrSku: string): { success: boolean; error?: string } {
    const lower = barcodeOrSku.trim().toLowerCase();
    const target = activeProducts.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === lower) || p.sku.toLowerCase() === lower,
    );
    if (!target) return { success: false, error: "Unknown barcode" };
    if (target.stockQty <= 0) return { success: false, error: "Out of stock" };

    const inCart = simCart.find((x) => x.productId === target.id)?.qty ?? 0;
    if (inCart >= target.stockQty) return { success: false, error: "Stock limit reached" };

    if (inCart === 0) simCart.push({ productId: target.id, qty: 1 });
    else simCart = simCart.map((x) => (x.productId === target.id ? { ...x, qty: x.qty + 1 } : x));
    return { success: true };
  }

  // Scan water once
  const scan1 = scan("6001001001");
  assert(scan1.success && simCart.find((x) => x.productId === water!.id)?.qty === 1, "First scan adds product with qty 1");

  // Scan water second time
  const scan2 = scan("6001001001");
  assert(scan2.success && simCart.find((x) => x.productId === water!.id)?.qty === 2, "Second scan increments qty to 2");

  // Scan different product (crisps)
  const scan3 = scan("6002001001");
  assert(scan3.success && simCart.length === 2 && simCart.find((x) => x.productId === crisps!.id)?.qty === 1, "Scanning different barcode adds second item");

  // ---------------------------------------------------------
  // TEST 4: Unknown barcode error handling
  // ---------------------------------------------------------
  console.log("\nTest 4: Unknown barcode rejection");
  const scanUnknown = scan("9999999999999");
  assert(!scanUnknown.success && scanUnknown.error === "Unknown barcode", "Unknown barcode correctly rejected");
  assert(simCart.length === 2, "Cart unaffected by unknown barcode");

  // ---------------------------------------------------------
  // TEST 5: Inactive & out-of-stock products
  // ---------------------------------------------------------
  console.log("\nTest 5: Inactive & out-of-stock products");
  const outOfStockProd = await prisma.product.upsert({
    where: { sku: "TEST-OUT-01" },
    update: { stockQty: 0, barcode: "999900000001", active: true },
    create: {
      name: "Out of Stock Test Product",
      sku: "TEST-OUT-01",
      barcode: "999900000001",
      stockQty: 0,
      minStock: 5,
      sellingPrice: 1000,
      buyingCost: 500,
      categoryId: water!.categoryId,
      active: true,
    },
  });
  activeProducts.push(outOfStockProd);
  const scanOutOfStock = scan("999900000001");
  assert(!scanOutOfStock.success && scanOutOfStock.error === "Out of stock", "Out of stock product rejected when scanned");

  await prisma.product.upsert({
    where: { sku: "TEST-INACT-01" },
    update: { stockQty: 10, barcode: "999900000002", active: false },
    create: {
      name: "Inactive Test Product",
      sku: "TEST-INACT-01",
      barcode: "999900000002",
      stockQty: 10,
      minStock: 2,
      sellingPrice: 1000,
      buyingCost: 500,
      categoryId: water!.categoryId,
      active: false,
    },
  });
  const scanInactive = scan("999900000002");
  assert(!scanInactive.success && scanInactive.error === "Unknown barcode", "Inactive product barcode rejected from POS");

  // ---------------------------------------------------------
  // TEST 6: Barcode uniqueness constraint in DB
  // ---------------------------------------------------------
  console.log("\nTest 6: Barcode uniqueness enforcement");
  let duplicatePrevented = false;
  try {
    await prisma.product.create({
      data: {
        name: "Duplicate Barcode Attempt",
        sku: "DUP-SKU-999",
        barcode: "6001001001", // already used by water
        categoryId: water!.categoryId,
        sellingPrice: 2000,
        buyingCost: 1000,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") duplicatePrevented = true;
  }
  assert(duplicatePrevented, "Database rejects duplicate barcode assignment (unique constraint P2002)");

  // ---------------------------------------------------------
  // TEST 7: Search filter by barcode
  // ---------------------------------------------------------
  console.log("\nTest 7: Search catalogue by barcode");
  const whereFilter = productWhere({ q: "6001001001", status: "active", page: 1, pageSize: 25 });
  const foundProducts = await prisma.product.findMany({ where: whereFilter });
  assert(foundProducts.length === 1 && foundProducts[0].sku === "DRK-001", "productWhere filters successfully by barcode");

  // ---------------------------------------------------------
  // TEST 8: Offline Cart Persistence Logic
  // ---------------------------------------------------------
  console.log("\nTest 8: Offline cart storage parsing & corrupted data recovery");
  assert(parseStoredCart(null).length === 0, "Null storage returns empty cart");
  assert(parseStoredCart("{corrupted-json").length === 0, "Corrupted JSON returns empty cart without throwing");
  assert(parseStoredCart(JSON.stringify([{ productId: 123 }])).length === 0, "Invalid item shapes safely discarded");

  const validStored = JSON.stringify([{ productId: water!.id, qty: 3 }]);
  const parsed = parseStoredCart(validStored);
  assert(parsed.length === 1 && parsed[0].productId === water!.id && parsed[0].qty === 3, "Valid saved cart correctly deserialized");

  // ---------------------------------------------------------
  // TEST 9: Sale checkout with receipt and inventory update
  // ---------------------------------------------------------
  console.log("\nTest 9: Real checkout & stock deduction");
  const cashier = await prisma.user.findFirstOrThrow({ where: { role: "CASHIER" } });
  const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: water!.id } })).stockQty;

  const { sale, change } = await createSale(
    {
      items: [{ productId: water!.id, qty: 1 }],
      paymentMethod: "CASH",
      amountTendered: 5000,
    },
    cashier.id,
  );

  const stockAfter = (await prisma.product.findUniqueOrThrow({ where: { id: water!.id } })).stockQty;
  assert(stockAfter === stockBefore - 1, "Stock decremented by 1 in database");
  assert(sale.receiptNo.startsWith("RU-"), `Receipt number generated: ${sale.receiptNo}`);
  assert(sale.total === 1000, `Sale total matches product price: ${sale.total} UGX`);
  assert(change === 4000, `Change calculated correctly: ${change} UGX`);

  // Verify stock movement
  const movement = await prisma.stockMovement.findFirst({
    where: { saleId: sale.id },
  });
  assert(Boolean(movement && movement.type === "SALE" && movement.qty === -1), "StockMovement record of type SALE created");

  await prisma.product.deleteMany({
    where: { sku: { in: ["TEST-OUT-01", "TEST-INACT-01"] } },
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error("Test failed with exception:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
