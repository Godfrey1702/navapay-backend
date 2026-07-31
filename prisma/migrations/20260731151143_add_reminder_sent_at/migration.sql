-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'BUDGET_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_FAILED';

-- AlterTable
ALTER TABLE "scheduled_top_ups" ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);
