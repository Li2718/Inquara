"use client";

import { FormEvent, useState } from "react";
import { NodeComposerFrame, NodeComposerInput, NodeComposerSubmit } from "../../shared/components/domain";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { useCanvasSession } from "../canvas-session/CanvasSessionProvider";

export function MessageComposer({ nodeId }: { nodeId: string }) {
  const { messages } = useLocale();
  const copy = messages.chat;
  const { commands, sendCommand, state } = useCanvasSession();
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
    <NodeComposerFrame className="message-composer nodrag" onSubmit={submit}>
      <NodeComposerInput
        value={content}
        onChange={event => setContent(event.target.value)}
        placeholder={copy.askPlaceholder}
        disabled={isBlocked}
      />
      <NodeComposerSubmit disabled={!content.trim() || isBlocked}>
        {copy.send}
      </NodeComposerSubmit>
    </NodeComposerFrame>
  );
}
