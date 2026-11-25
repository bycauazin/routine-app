-- AlterTable
ALTER TABLE "day_item_steps" ADD COLUMN     "minute" INTEGER;

-- Every fixed item is a block now (treino, tarefa e compromisso fixos included).
UPDATE "routine_rules" SET "kind" = 'ROUTINE', "variant" = NULL WHERE "kind" <> 'ROUTINE';
UPDATE "day_items" SET "kind" = 'ROUTINE' WHERE "rule_id" IS NOT NULL AND "kind" <> 'ROUTINE';
