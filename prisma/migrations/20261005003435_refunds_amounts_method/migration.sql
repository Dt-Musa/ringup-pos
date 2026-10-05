-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "method" TEXT;

-- AlterTable
ALTER TABLE "RefundItem" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

-- CreateIndex
CREATE INDEX "RefundItem_saleItemId_idx" ON "RefundItem"("saleItemId");
