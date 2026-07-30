-- AlterTable
ALTER TABLE "users" ADD COLUMN     "transaction_pin" TEXT,
ADD COLUMN     "transaction_pin_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "transaction_pin_reset_token" TEXT;

-- CreateIndex
CREATE INDEX "users_transaction_pin_reset_token_idx" ON "users"("transaction_pin_reset_token");
