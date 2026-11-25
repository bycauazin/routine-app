ALTER TABLE "routine_rules" ADD COLUMN "series_id" UUID;
UPDATE "routine_rules" SET "series_id" = "id";
ALTER TABLE "routine_rules" ALTER COLUMN "series_id" SET NOT NULL;
CREATE INDEX "routine_rules_user_id_series_id_idx" ON "routine_rules"("user_id", "series_id");

ALTER TABLE "day_items"
  ADD COLUMN "series_id" UUID,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(3),
  ADD COLUMN "scheduled_date" DATE,
  ADD COLUMN "scheduled_minute" INTEGER;
UPDATE "day_items" AS item SET "series_id" = rule."series_id"
FROM "routine_rules" AS rule WHERE item."rule_id" = rule."id" AND item."user_id" = rule."user_id";
UPDATE "day_items" AS item SET "scheduled_date" = item."origin_date", "scheduled_minute" = rule."start_minute"
FROM "routine_rules" AS rule WHERE item."rule_id" = rule."id" AND item."user_id" = rule."user_id"
  AND item."origin_date" <> item."date";
CREATE INDEX "day_items_user_id_scheduled_date_idx" ON "day_items"("user_id", "scheduled_date");

CREATE TABLE "personal_goals" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "target_key" UUID,
  "target_name" TEXT,
  "unit" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "period" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "personal_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "personal_goals_amount_check" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "personal_goals_id_user_id_key" ON "personal_goals"("id", "user_id");
CREATE INDEX "personal_goals_user_id_idx" ON "personal_goals"("user_id");
