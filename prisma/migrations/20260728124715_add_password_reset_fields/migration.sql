-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT;

-- CreateIndex
CREATE INDEX "users_password_reset_token_idx" ON "users"("password_reset_token");
