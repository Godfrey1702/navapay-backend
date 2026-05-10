/*
  Warnings:

  - You are about to drop the `auto_topup_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auto_topup_rules" DROP CONSTRAINT "auto_topup_rules_userId_fkey";

-- DropTable
DROP TABLE "auto_topup_rules";
