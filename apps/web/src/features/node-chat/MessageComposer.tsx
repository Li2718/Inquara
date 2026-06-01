"use client";

import { FormEvent, useState } from "react";
import { Button } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";

export function MessageComposer({ nodeId }: { nodeId: string }) {
  const { messages } = useLocale();
  const copy = messages.chat;
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
        placeholder={copy.askPlaceholder}
        disabled={isBlocked}
      />
      <Button type="submit" disabled={!content.trim() || isBlocked}>
        {copy.send}
      </Button>
    </form>
  );
}
