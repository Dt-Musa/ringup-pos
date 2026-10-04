-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentReference" TEXT;

-- Sequential receipt numbers (RU-000001, ...). Gaps are possible if a sale transaction rolls back.
CREATE SEQUENCE "receipt_no_seq" START 1;
