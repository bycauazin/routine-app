-- AlterTable
ALTER TABLE "routine_rules" ADD COLUMN     "inside_rule_ids" UUID[] DEFAULT ARRAY[]::UUID[];
