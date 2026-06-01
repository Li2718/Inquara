"use client";

import { FormEvent, useState } from "react";
import { Button } from "../../shared/components/ui";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";

export function MessageComposer({ nodeId }: { nodeId: string }) {
  const { commands, sendCommand, state } = useWorkspaceSession();
  const [content, setContent] = useState("");
  const isBlocked = state.leaseState !== "active";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isBlocked) return;
    void sendCommand(commands.sendUserMessage(nodeId, trimmed));
    setContent("");
  }

  return (
    <form className="message-composer nodrag" onSubmit={submit}>
      <input
        value={content}
        onChange={event => setContent(event.target.value)}
        placeholder="Ask in this node"
        disabled={isBlocked}
      />
      <Button type="submit" disabled={!content.trim() || isBlocked}>
        Send
      </Button>
    </form>
  );
}
