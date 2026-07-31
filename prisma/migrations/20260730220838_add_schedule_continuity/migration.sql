-- AlterTable
ALTER TABLE "scheduled_top_ups" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "execution_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_executions" INTEGER;
