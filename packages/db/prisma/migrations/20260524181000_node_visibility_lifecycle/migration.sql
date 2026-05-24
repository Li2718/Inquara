ALTER TABLE "canvas_nodes"
  ADD COLUMN "hidden_at" TIMESTAMP(3),
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "scroll_top" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "hidden_state_snapshot" JSONB;
