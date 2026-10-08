-- DropIndex
DROP INDEX "budgets_user_id_category_month_year_key";

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "category";

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_month_year_key" ON "budgets"("user_id", "month", "year");
