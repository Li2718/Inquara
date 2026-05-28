"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type FloatingCircleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md";
};

export const FloatingCircleButton = forwardRef<HTMLButtonElement, FloatingCircleButtonProps>(function FloatingCircleButton(
  { className, size = "md", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={["canvas-floating-circle-button", className].filter(Boolean).join(" ")}
      data-size={size}
      {...props}
    />
  );
});
