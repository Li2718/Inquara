"use client";

type LoadingVariant = "page" | "panel" | "inline" | "canvas";
type SkeletonVariant = "list" | "panel";

type LoadingStateProps = {
  "aria-label"?: string;
  className?: string;
  description?: string;
  title?: string;
  variant?: LoadingVariant;
};

type SkeletonBlockProps = {
  className?: string;
  rows?: number;
  variant?: SkeletonVariant;
};

export function LoadingState({ "aria-label": ariaLabel, className, description, title, variant = "panel" }: LoadingStateProps) {
  const statusLabel = ariaLabel ?? title ?? description ?? "Loading";
  const hasCopy = Boolean(title || description);

  return (
    <div
      className={["ui-loading-state", `ui-loading-state-${variant}`, className].filter(Boolean).join(" ")}
      data-has-copy={hasCopy}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
    >
      <span className="ui-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {hasCopy ? (
        <span className="ui-loading-copy">
          {title ? <strong>{title}</strong> : null}
          {description ? <span>{description}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({ className, rows = 3, variant = "panel" }: SkeletonBlockProps) {
  return (
    <div className={["ui-skeleton-block", `ui-skeleton-block-${variant}`, className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="ui-skeleton-row" />
      ))}
    </div>
  );
}
