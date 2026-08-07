/*
  Warnings:

  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource_id` on the `audit_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "details",
DROP COLUMN "resource",
DROP COLUMN "resource_id",
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
