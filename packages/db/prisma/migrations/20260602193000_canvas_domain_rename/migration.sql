DO $$
BEGIN
  IF to_regclass('public.workspaces') IS NOT NULL AND to_regclass('public.canvases') IS NULL THEN
    ALTER TABLE "workspaces" RENAME TO "canvases";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canvas_nodes'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE "canvas_nodes" RENAME COLUMN "workspace_id" TO "canvas_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canvas_edges'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE "canvas_edges" RENAME COLUMN "workspace_id" TO "canvas_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'node_messages'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE "node_messages" RENAME COLUMN "workspace_id" TO "canvas_id";
  END IF;

  IF to_regclass('public.workspaces_owner_id_updated_at_idx') IS NOT NULL THEN
    ALTER INDEX "workspaces_owner_id_updated_at_idx" RENAME TO "canvases_owner_id_updated_at_idx";
  END IF;

  IF to_regclass('public.canvas_nodes_workspace_id_idx') IS NOT NULL THEN
    ALTER INDEX "canvas_nodes_workspace_id_idx" RENAME TO "canvas_nodes_canvas_id_idx";
  END IF;

  IF to_regclass('public.canvas_edges_workspace_id_idx') IS NOT NULL THEN
    ALTER INDEX "canvas_edges_workspace_id_idx" RENAME TO "canvas_edges_canvas_id_idx";
  END IF;

  IF to_regclass('public.node_messages_workspace_id_created_at_idx') IS NOT NULL THEN
    ALTER INDEX "node_messages_workspace_id_created_at_idx" RENAME TO "node_messages_canvas_id_created_at_idx";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'canvases' AND constraint_name = 'workspaces_pkey') THEN
    ALTER TABLE "canvases" RENAME CONSTRAINT "workspaces_pkey" TO "canvases_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'canvases' AND constraint_name = 'workspaces_owner_id_fkey') THEN
    ALTER TABLE "canvases" RENAME CONSTRAINT "workspaces_owner_id_fkey" TO "canvases_owner_id_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'canvas_nodes' AND constraint_name = 'canvas_nodes_workspace_id_fkey') THEN
    ALTER TABLE "canvas_nodes" RENAME CONSTRAINT "canvas_nodes_workspace_id_fkey" TO "canvas_nodes_canvas_id_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'canvas_edges' AND constraint_name = 'canvas_edges_workspace_id_fkey') THEN
    ALTER TABLE "canvas_edges" RENAME CONSTRAINT "canvas_edges_workspace_id_fkey" TO "canvas_edges_canvas_id_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'node_messages' AND constraint_name = 'node_messages_workspace_id_fkey') THEN
    ALTER TABLE "node_messages" RENAME CONSTRAINT "node_messages_workspace_id_fkey" TO "node_messages_canvas_id_fkey";
  END IF;
END $$;
