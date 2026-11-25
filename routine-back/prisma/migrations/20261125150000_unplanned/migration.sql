-- AlterTable
ALTER TABLE "day_items" ADD COLUMN     "displaced_by_id" UUID,
ADD COLUMN     "is_unplanned" BOOLEAN NOT NULL DEFAULT false;

