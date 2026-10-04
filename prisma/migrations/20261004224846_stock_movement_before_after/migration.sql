-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "qtyAfter" INTEGER,
ADD COLUMN     "qtyBefore" INTEGER;

-- Backfill before/after for existing movements from the running total per product.
UPDATE "StockMovement" m
   SET "qtyAfter"  = r.running,
       "qtyBefore" = r.running - m.qty
  FROM (
    SELECT id, SUM(qty) OVER (PARTITION BY "productId" ORDER BY "createdAt", id) AS running
      FROM "StockMovement"
  ) r
 WHERE m.id = r.id;

CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
