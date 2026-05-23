import { WorkspaceCommandSchema } from "@inquara/domain";
import { describe, expect, it, vi } from "vitest";
import { createCommands } from "./createCommands";

describe("createCommands", () => {
  it("creates schema-valid workspace commands with mutation ids", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("mutation-1");

    const commands = createCommands("workspace-1");
    const command = commands.updateNodePosition("node-1", { x: 120, y: 220 });

    expect(WorkspaceCommandSchema.parse(command)).toEqual({
      type: "node.updatePosition",
      clientMutationId: "mutation-1",
      workspaceId: "workspace-1",
      nodeId: "node-1",
      x: 120,
      y: 220
    });
  });
});
