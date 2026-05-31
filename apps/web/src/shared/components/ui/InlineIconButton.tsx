"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type InlineIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const InlineIconButton = forwardRef<HTMLButtonElement, InlineIconButtonProps>(function InlineIconButton({ className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={["inline-icon-button", className].filter(Boolean).join(" ")} {...props} />;
});
