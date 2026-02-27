-- CreateTable
CREATE TABLE "scheduled_topups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "phone_number_id" TEXT,
    "type" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "plan_id" TEXT,
    "schedule_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "recurring_time" TEXT,
    "recurring_day_of_week" INTEGER,
    "recurring_day_of_month" INTEGER,
    "max_executions" INTEGER,
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "next_execution_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_topups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_topups_user_id_idx" ON "scheduled_topups"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_topups_status_idx" ON "scheduled_topups"("status");

-- AddForeignKey
ALTER TABLE "scheduled_topups" ADD CONSTRAINT "scheduled_topups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
