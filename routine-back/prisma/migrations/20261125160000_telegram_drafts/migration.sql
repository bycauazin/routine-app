-- AlterTable
ALTER TABLE "telegram_links" ADD COLUMN     "morning_sent_on" DATE;

-- CreateTable
CREATE TABLE "telegram_drafts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telegram_drafts_user_id_idx" ON "telegram_drafts"("user_id");

-- AddForeignKey
ALTER TABLE "telegram_drafts" ADD CONSTRAINT "telegram_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

