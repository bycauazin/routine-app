-- CreateEnum
CREATE TYPE "DayPeriod" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('OFFICE', 'HOME');

-- AlterTable
ALTER TABLE "day_items" ADD COLUMN     "done_minute" INTEGER,
ADD COLUMN     "period" "DayPeriod",
ADD COLUMN     "variant" TEXT,
ALTER COLUMN "date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "routine_rules" ADD COLUMN     "mode" "WorkMode",
ADD COLUMN     "period" "DayPeriod",
ADD COLUMN     "steps" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "variant" TEXT;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "office_weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "workout_types" TEXT[] DEFAULT ARRAY['Corrida', 'Muay thai', 'Academia']::TEXT[];

-- CreateTable
CREATE TABLE "day_item_steps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_item_id" UUID NOT NULL,
    "step_key" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "done_at" TIMESTAMPTZ(3),

    CONSTRAINT "day_item_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_modes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "mode" "WorkMode" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "day_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "day_item_steps_user_id_step_key_idx" ON "day_item_steps"("user_id", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "day_item_steps_id_user_id_key" ON "day_item_steps"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "day_item_steps_day_item_id_step_key_key" ON "day_item_steps"("day_item_id", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "day_modes_user_id_date_key" ON "day_modes"("user_id", "date");

-- AddForeignKey
ALTER TABLE "day_item_steps" ADD CONSTRAINT "day_item_steps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_item_steps" ADD CONSTRAINT "day_item_steps_day_item_id_user_id_fkey" FOREIGN KEY ("day_item_id", "user_id") REFERENCES "day_items"("id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "day_modes" ADD CONSTRAINT "day_modes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
