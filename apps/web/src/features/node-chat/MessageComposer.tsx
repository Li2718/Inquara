"use client";

import { FormEvent, useState } from "react";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";

export function MessageComposer({ nodeId }: { nodeId: string }) {
  const { commands, sendCommand, state } = useWorkspaceSession();
  const [content, setContent] = useState("");
  const isDisconnected = state.connectionStatus === "disconnected";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isDisconnected) return;
    sendCommand(commands.sendUserMessage(nodeId, trimmed));
    setContent("");
  }

  return (
    <form className="message-composer nodrag nowheel" onSubmit={submit}>
      <input
        value={content}
        onChange={event => setContent(event.target.value)}
        placeholder="Ask in this node"
        disabled={isDisconnected}
      />
      <button type="submit" disabled={!content.trim() || isDisconnected}>
        Send
      </button>
    </form>
  );
}
