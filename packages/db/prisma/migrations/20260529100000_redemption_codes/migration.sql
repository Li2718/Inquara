CREATE TABLE "system_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "redemption_codes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "note" TEXT,
  "max_redemptions" INTEGER NOT NULL DEFAULT 1,
  "expires_at" TIMESTAMP(3),
  "disabled_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redemption_code_redemptions" (
  "id" TEXT NOT NULL,
  "redemption_code_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "redemption_code_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "redemption_codes_code_key" ON "redemption_codes"("code");
CREATE INDEX "redemption_codes_target_disabled_at_expires_at_idx" ON "redemption_codes"("target", "disabled_at", "expires_at");
CREATE INDEX "redemption_codes_created_by_id_idx" ON "redemption_codes"("created_by_id");
CREATE UNIQUE INDEX "redemption_code_redemptions_redemption_code_id_user_id_target_key" ON "redemption_code_redemptions"("redemption_code_id", "user_id", "target");
CREATE INDEX "redemption_code_redemptions_user_id_idx" ON "redemption_code_redemptions"("user_id");

ALTER TABLE "redemption_codes"
  ADD CONSTRAINT "redemption_codes_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "redemption_code_redemptions"
  ADD CONSTRAINT "redemption_code_redemptions_redemption_code_id_fkey"
  FOREIGN KEY ("redemption_code_id") REFERENCES "redemption_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "redemption_code_redemptions"
  ADD CONSTRAINT "redemption_code_redemptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
