"use client";

import type { Canvas } from "@inquara/domain";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { apiJson } from "../../shared/api";
import { NodeComposerFrame, NodeComposerSubmit, NodeComposerTextarea } from "../../shared/components/domain";
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
  onCreated,
  isOverlayVisible,
  onSubmitted
}: {
  onCreated(input: { canvas: Canvas; content: string; submissionId: string }): Promise<void>;
  isOverlayVisible?: boolean;
  onSubmitted(input: { content: string; submissionId: string }): void;
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
    const submissionId = crypto.randomUUID();
    try {
      const morphDelay = new Promise(resolve => window.setTimeout(resolve, newCanvasMorphMinimumMs));
      const canvasRequest = apiJson<Canvas>("/canvases", {
        method: "POST",
        body: JSON.stringify({ title: messages.canvasSidebar.untitledCanvas })
      });
      await morphDelay;
      onSubmitted({ content: trimmed, submissionId });
      const canvas = await canvasRequest;
      savePendingStarterMessage(canvas.id, trimmed);
      clearNewCanvasDraft();
      await onCreated({ canvas, content: trimmed, submissionId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.canvasSidebar.couldNotCreate);
      setIsSubmitting(false);
    }
  }

  function handleStarterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitNewCanvasStarter(event.nativeEvent)) return;
    event.preventDefault();
    void submitStarter();
  }

  return (
    <div className="new-canvas-starter" data-state={isSubmitting ? "morphing" : "ready"} data-overlay-visible={isOverlayVisible}>
      <NodeComposerFrame className="new-canvas-starter-inner" mode="starter" onSubmit={submit}>
        <NodeComposerTextarea
          value={content}
          onChange={event => updateContent(event.target.value)}
          placeholder={messages.newCanvasEntry.placeholder}
          disabled={isSubmitting}
          rows={4}
          autoFocus
          onKeyDown={handleStarterKeyDown}
        />
        <NodeComposerSubmit disabled={!content.trim() || isSubmitting}>
          {messages.chat.send}
        </NodeComposerSubmit>
      </NodeComposerFrame>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
