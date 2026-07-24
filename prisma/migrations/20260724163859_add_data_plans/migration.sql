-- CreateTable
CREATE TABLE "data_plans" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "validity" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'clubkonnect',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_plans_network_idx" ON "data_plans"("network");
