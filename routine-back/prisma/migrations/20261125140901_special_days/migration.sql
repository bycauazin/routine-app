-- CreateEnum
CREATE TYPE "SpecialKind" AS ENUM ('HOLIDAY', 'VACATION', 'SICK');

-- CreateTable
CREATE TABLE "special_days" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "SpecialKind" NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "special_days_user_id_from_date_idx" ON "special_days"("user_id", "from_date");

-- AddForeignKey
ALTER TABLE "special_days" ADD CONSTRAINT "special_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

