"use client";

import React from "react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "secondary-button",
  danger: "danger-button"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, type = "button", variant = "primary", ...props }, ref) {
  return <button ref={ref} type={type} className={[variantClassNames[variant], className].filter(Boolean).join(" ")} {...props} />;
});
