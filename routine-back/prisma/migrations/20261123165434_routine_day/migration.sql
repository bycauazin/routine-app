-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('ROUTINE', 'APPOINTMENT', 'WORKOUT', 'TASK', 'HABIT', 'CLASS');

-- CreateEnum
CREATE TYPE "DayItemStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color_key" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_rules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "kind" "ItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "skip_on_holidays" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "routine_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rule_id" UUID,
    "category_id" UUID,
    "kind" "ItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "origin_date" DATE,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "status" "DayItemStatus" NOT NULL DEFAULT 'PENDING',
    "done_at" TIMESTAMPTZ(3),
    "skip_reason" TEXT,
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "day_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_user_id_key" ON "categories"("id", "user_id");

-- CreateIndex
CREATE INDEX "routine_rules_user_id_start_date_idx" ON "routine_rules"("user_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "routine_rules_id_user_id_key" ON "routine_rules"("id", "user_id");

-- CreateIndex
CREATE INDEX "day_items_user_id_date_idx" ON "day_items"("user_id", "date");

-- CreateIndex
CREATE INDEX "day_items_user_id_status_date_idx" ON "day_items"("user_id", "status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "day_items_id_user_id_key" ON "day_items"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "day_items_rule_id_origin_date_key" ON "day_items"("rule_id", "origin_date");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_rules" ADD CONSTRAINT "routine_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_rules" ADD CONSTRAINT "routine_rules_category_id_user_id_fkey" FOREIGN KEY ("category_id", "user_id") REFERENCES "categories"("id", "user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "day_items" ADD CONSTRAINT "day_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_items" ADD CONSTRAINT "day_items_rule_id_user_id_fkey" FOREIGN KEY ("rule_id", "user_id") REFERENCES "routine_rules"("id", "user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "day_items" ADD CONSTRAINT "day_items_category_id_user_id_fkey" FOREIGN KEY ("category_id", "user_id") REFERENCES "categories"("id", "user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Times of day: minutes since 00:00 (1440 = midnight at the end of the day), both or none, start before end.
ALTER TABLE "routine_rules" ADD CONSTRAINT "routine_rules_minutes_check" CHECK (
    ("start_minute" IS NULL AND "end_minute" IS NULL) OR
    ("start_minute" BETWEEN 0 AND 1439 AND ("end_minute" IS NULL OR ("end_minute" > "start_minute" AND "end_minute" <= 1440)))
);
ALTER TABLE "day_items" ADD CONSTRAINT "day_items_minutes_check" CHECK (
    ("start_minute" IS NULL AND "end_minute" IS NULL) OR
    ("start_minute" BETWEEN 0 AND 1439 AND ("end_minute" IS NULL OR ("end_minute" > "start_minute" AND "end_minute" <= 1440)))
);
-- At least one weekday, each 0 (Sunday) … 6 (Saturday).
ALTER TABLE "routine_rules" ADD CONSTRAINT "routine_rules_weekdays_check" CHECK (
    cardinality("weekdays") BETWEEN 1 AND 7 AND "weekdays" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
);
ALTER TABLE "routine_rules" ADD CONSTRAINT "routine_rules_dates_check" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
-- A rule's item always knows the rule's day; a one-off item has neither.
ALTER TABLE "day_items" ADD CONSTRAINT "day_items_origin_check" CHECK (("rule_id" IS NULL) = ("origin_date" IS NULL));
