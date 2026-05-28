"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={["icon-button", className].filter(Boolean).join(" ")} {...props} />;
});
