ALTER TABLE "users"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN "password_hash" TEXT;

CREATE TABLE "user_identities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "remember_me" BOOLEAN NOT NULL DEFAULT false,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_identities_provider_provider_user_id_key" ON "user_identities"("provider", "provider_user_id");
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_user_id_revoked_at_expires_at_idx" ON "user_sessions"("user_id", "revoked_at", "expires_at");

ALTER TABLE "user_identities"
  ADD CONSTRAINT "user_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
