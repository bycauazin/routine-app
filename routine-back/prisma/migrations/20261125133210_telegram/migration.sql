-- AlterEnum
ALTER TYPE "AuthTokenPurpose" ADD VALUE 'TELEGRAM_LINK';

-- CreateTable
CREATE TABLE "telegram_links" (
    "user_id" UUID NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "username" TEXT,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_chat_id_key" ON "telegram_links"("chat_id");

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

