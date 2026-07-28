/*
  Warnings:

  - You are about to drop the `scheduled_job_runs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scheduled_topups` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "scheduled_job_runs" DROP CONSTRAINT "scheduled_job_runs_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "scheduled_topups" DROP CONSTRAINT "scheduled_topups_userId_fkey";

-- DropTable
DROP TABLE "scheduled_job_runs";

-- DropTable
DROP TABLE "scheduled_topups";

-- DropEnum
DROP TYPE "ScheduleRunStatus";

-- CreateTable
CREATE TABLE "scheduled_top_ups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "plan_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT NOT NULL,
    "day_of_week" TEXT,
    "day_of_month" INTEGER,
    "time_of_day" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_top_ups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scheduled_top_ups" ADD CONSTRAINT "scheduled_top_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
