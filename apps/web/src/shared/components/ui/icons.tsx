import type { HTMLAttributes, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
type SpanIconProps = HTMLAttributes<HTMLSpanElement>;

export function SidebarPanelIcon({ className = "workspace-sidebar-open-icon", ...props }: SpanIconProps) {
  return (
    <span className={className} aria-hidden="true" {...props}>
      <span />
      <span />
    </span>
  );
}

export function SidebarCollapseIcon({ className = "workspace-sidebar-collapse-icon", ...props }: SpanIconProps) {
  return <span className={className} aria-hidden="true" {...props} />;
}

export function PlusIcon({ className = "ui-plus-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MoreVerticalIcon({ className = "ui-more-vertical-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

export function CheckIcon({ className = "ui-check-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M5 12.6 9.4 17 19 7" />
    </svg>
  );
}

export function ResetViewIcon({ className = "canvas-reset-view-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 4v16M4 12h16" />
      <circle cx="12" cy="12" r="4.35" />
    </svg>
  );
}
