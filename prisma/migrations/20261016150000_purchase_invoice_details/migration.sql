ALTER TABLE "PurchaseOrder"
ADD COLUMN "invoiceNumber" TEXT,
ADD COLUMN "invoiceDate" TIMESTAMP(3),
ADD COLUMN "invoiceAmount" INTEGER;
