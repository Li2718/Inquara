-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvases" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "canvases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_nodes" (
    "id" TEXT NOT NULL,
    "canvas_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "parent_node_id" TEXT,
    "source_node_id" TEXT,
    "source_message_id" TEXT,
    "source_quote" TEXT,
    "source_range_start" INTEGER,
    "source_range_end" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_edges" (
    "id" TEXT NOT NULL,
    "canvas_id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "source_message_id" TEXT,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canvas_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_messages" (
    "id" TEXT NOT NULL,
    "canvas_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "model" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "canvases_owner_id_updated_at_idx" ON "canvases"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "canvas_nodes_canvas_id_idx" ON "canvas_nodes"("canvas_id");

-- CreateIndex
CREATE INDEX "canvas_edges_canvas_id_idx" ON "canvas_edges"("canvas_id");

-- CreateIndex
CREATE INDEX "node_messages_node_id_created_at_idx" ON "node_messages"("node_id", "created_at");

-- CreateIndex
CREATE INDEX "node_messages_canvas_id_created_at_idx" ON "node_messages"("canvas_id", "created_at");

-- AddForeignKey
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_nodes" ADD CONSTRAINT "canvas_nodes_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_nodes" ADD CONSTRAINT "canvas_nodes_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "canvas_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_nodes" ADD CONSTRAINT "canvas_nodes_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "canvas_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_nodes" ADD CONSTRAINT "canvas_nodes_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "node_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "canvas_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "canvas_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "node_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_messages" ADD CONSTRAINT "node_messages_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_messages" ADD CONSTRAINT "node_messages_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "canvas_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
