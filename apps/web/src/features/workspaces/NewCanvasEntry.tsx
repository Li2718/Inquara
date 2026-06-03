"use client";

import type { Workspace } from "@inquara/domain";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { apiJson } from "../../shared/api";
import { Button } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
import {
  clearNewCanvasDraft,
  getNewCanvasDraft,
  saveNewCanvasDraft,
  savePendingStarterMessage
} from "./newCanvasDraft";
import { shouldSubmitNewCanvasStarter } from "./newCanvasKeyboard";

const newCanvasMorphMinimumMs = 320;

export function NewCanvasEntry({
  onCreated
}: {
  onCreated(input: { content: string; workspace: Workspace }): Promise<void>;
}) {
  const { messages } = useLocale();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(getNewCanvasDraft());
  }, []);

  function updateContent(value: string) {
    setContent(value);
    saveNewCanvasDraft(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitStarter();
  }

  async function submitStarter() {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      const morphDelay = new Promise(resolve => window.setTimeout(resolve, newCanvasMorphMinimumMs));
      const workspace = await apiJson<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ title: messages.workspaceSidebar.untitledCanvas })
      });
      savePendingStarterMessage(workspace.id, trimmed);
      clearNewCanvasDraft();
      await morphDelay;
      await onCreated({ content: trimmed, workspace });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.workspaceSidebar.couldNotCreate);
      setIsSubmitting(false);
    }
  }

  function handleStarterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitNewCanvasStarter(event.nativeEvent)) return;
    event.preventDefault();
    void submitStarter();
  }

  return (
    <form className="new-canvas-starter" data-state={isSubmitting ? "morphing" : "ready"} onSubmit={submit}>
      <div className="new-canvas-starter-inner">
        <textarea
          className="new-canvas-starter-input"
          value={content}
          onChange={event => updateContent(event.target.value)}
          placeholder={messages.newCanvasEntry.placeholder}
          disabled={isSubmitting}
          rows={4}
          autoFocus
          onKeyDown={handleStarterKeyDown}
        />
        <Button type="submit" disabled={!content.trim() || isSubmitting}>
          {messages.chat.send}
        </Button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
