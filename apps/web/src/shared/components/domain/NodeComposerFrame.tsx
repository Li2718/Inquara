"use client";

import React from "react";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Button } from "../ui";

type NodeComposerFrameMode = "node" | "starter";

type NodeComposerFrameProps = {
  children: ReactNode;
  className?: string;
  mode?: NodeComposerFrameMode;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

export function NodeComposerFrame({ children, className, mode = "node", onSubmit }: NodeComposerFrameProps) {
  return (
    <form className={["node-composer-frame", className].filter(Boolean).join(" ")} data-mode={mode} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export const NodeComposerInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function NodeComposerInput({ className, ...props }, ref) {
  return <input ref={ref} className={["node-composer-frame-input", className].filter(Boolean).join(" ")} {...props} />;
});

export const NodeComposerTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function NodeComposerTextarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={["node-composer-frame-input", className].filter(Boolean).join(" ")} {...props} />;
});

export function NodeComposerDisplay({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["node-composer-frame-input", "node-composer-frame-display", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function NodeComposerSubmit({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button className={["node-composer-frame-submit", className].filter(Boolean).join(" ")} type="submit" {...props} />;
}
