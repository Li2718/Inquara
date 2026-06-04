import type { HTMLAttributes, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
type SpanIconProps = HTMLAttributes<HTMLSpanElement>;

export function SidebarPanelIcon({ className = "canvas-sidebar-open-icon", ...props }: SpanIconProps) {
  return (
    <span className={className} aria-hidden="true" {...props}>
      <span />
      <span />
    </span>
  );
}

export function SidebarCollapseIcon({ className = "canvas-sidebar-collapse-icon", ...props }: SpanIconProps) {
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

export function SystemAppearanceIcon({ className = "ui-system-appearance-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <rect x="4" y="5" width="16" height="11" rx="2" />
      <path d="M9 20h6" />
      <path d="M12 16v4" />
    </svg>
  );
}

export function SunIcon({ className = "ui-sun-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon({ className = "ui-moon-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M19 14.2A7.4 7.4 0 0 1 9.8 5 7.4 7.4 0 1 0 19 14.2Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "ui-chevron-down-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="m6 9 6 6 6-6" />
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

export function OrganizeLayoutIcon({ className = "canvas-organize-layout-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M9.4 12H12" />
      <path d="M12 5.4v13.2" />
      <path d="M12 5.4h2.8" />
      <path d="M12 12h2.8" />
      <path d="M12 18.6h2.8" />
      <rect x="4.4" y="9.4" width="5" height="5" rx="1.1" />
      <rect x="14.8" y="3.2" width="4.4" height="4.4" rx="1" />
      <rect x="14.8" y="9.8" width="4.4" height="4.4" rx="1" />
      <rect x="14.8" y="16.4" width="4.4" height="4.4" rx="1" />
    </svg>
  );
}

export function CopyIcon({ className = "ui-copy-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 16V7a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function EditIcon({ className = "ui-edit-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 20h4.4L19 9.4 14.6 5 4 15.6V20Z" />
      <path d="m13.5 6.1 4.4 4.4" />
    </svg>
  );
}

export function TrashIcon({ className = "ui-trash-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function InquaraBrandIcon({ className = "inquara-brand-icon", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="178 165 900 900" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="url(#inquara-brand-bg)"
        d="M229.748 343.149C228.911 302.978 241.559 266.045 269.587 236.672C296.75 207.721 334.53 191.078 374.226 190.577C417.001 189.795 462.505 190.677 505.443 190.743L727.14 190.6L835.321 190.537C857.361 190.517 880.66 189.548 902.473 192.001C932.576 195.385 961.559 211.18 982.955 232.172C1011.69 260.36 1027.92 299.083 1027.3 339.307C1027.2 368.595 1027.23 397.96 1027.24 427.209L1027.05 666.363L1027.13 821.942C1027.07 844.607 1027.85 874.108 1026.83 896.087C1027.29 901.387 1026.01 910.307 1025.13 915.529C1020.01 946.115 1005.52 974.356 983.661 996.354C964.057 1015.78 937.543 1031.33 910.329 1036.1C889.263 1039.79 863.589 1038.58 841.792 1038.58L741.85 1038.58L376.078 1038.62C335.817 1038.39 301.001 1024.56 272.538 995.567C251.799 974.789 237.816 948.235 232.416 919.379C228.278 897.388 229.525 865.242 229.516 841.873L229.549 732.4L229.748 343.149Z"
      />
      <path
        fill="#FAFAFA"
        d="M351.657 386.748L352.03 385.934C353.152 383.435 354.047 380.313 354.976 377.715C366.615 345.153 398.699 321.869 433.133 319.963C441.89 319.479 451.239 319.652 460.226 319.652L505.703 319.674L642.351 319.688L763.663 319.666L802.122 319.659C809.354 319.657 818.804 319.408 825.905 319.974C836.568 320.779 847.009 323.446 856.751 327.855C877.78 337.221 894.971 356.441 902.916 377.919C908.141 392.045 907.505 396.226 909.369 409.857C908.395 437.213 909.279 470.342 909.274 498.212L909.254 673.401L909.266 734.845C909.268 748.593 909.812 764.755 908.042 778.074C904.696 801.127 892.943 821.472 874.662 835.76C850.227 854.859 825.877 853.416 796.758 853.413L744.917 853.383L557.801 853.39L516.344 853.322C478.498 853.187 479.907 853.661 449.73 876.627L410.626 906.439C403.852 911.597 394.978 919.188 387.246 922.004C368.417 928.863 349.365 915.997 349.064 895.804C348.877 883.264 348.895 871.332 348.913 859.076L348.931 795.409L348.888 591.159L348.813 469.248C348.784 445.641 347.248 408.375 351.657 386.748Z"
      />
      <path
        fill="url(#inquara-brand-symbol)"
        d="M664.662 504.908C666.452 505.447 667.91 504.311 670.016 503.391C675.728 504.231 679.223 504.156 683.89 507.626C684.922 509.717 684.827 508.676 684.323 510.842C682.792 512.619 681.91 512.947 679.894 514.081L680.283 514.955C670.793 521.074 647.249 532.721 636.387 538.496C609.243 553.113 582.021 567.584 554.721 581.907C556.39 590.222 556.761 597.146 554.758 605.392C607.173 633.381 659.596 663.208 711.866 691.655C722.443 677.331 737.248 670.044 755.138 672.512C766.503 674.192 776.738 680.312 783.597 689.529C790.865 699.229 793.944 711.438 792.143 723.425C790.25 735.551 783.565 746.408 773.59 753.557C763.76 760.516 752.139 762.857 740.331 760.71C728.68 758.551 718.392 751.784 711.795 741.94C704.306 730.974 702.632 719.337 704.993 706.496C690.551 697.598 670.536 687.404 655.25 678.988L548.292 620.213C519.84 660.541 459.96 636.013 464.508 590.317C465.845 577.961 471.966 566.62 481.561 558.723C491.112 550.802 503.496 547.147 515.817 548.614C529.531 550.121 539.236 557.303 547.619 567.726C560.771 559.965 577.702 551.419 591.322 544.116L664.662 504.908Z"
      />
      <path
        fill="url(#inquara-brand-symbol)"
        d="M706.641 482.392C705.293 475.156 704.923 470.88 706.249 463.559C711.874 432.522 748.101 415.684 774.686 434.174C784.398 440.997 790.978 451.421 792.958 463.123C794.986 475.268 792.067 487.72 784.853 497.699C777.888 507.402 767.304 513.888 755.496 515.69C744.094 517.425 732.472 514.528 723.218 507.645C719.308 504.796 715.929 501.283 713.233 497.267L680.283 514.955L679.894 514.081C681.91 512.947 682.792 512.619 684.323 510.842C684.827 508.676 684.922 509.717 683.89 507.626C679.223 504.156 675.728 504.231 670.016 503.391C667.91 504.311 666.452 505.447 664.662 504.908C678.099 497.721 693.188 489.013 706.641 482.392Z"
      />
      <defs>
        <linearGradient id="inquara-brand-bg" gradientUnits="userSpaceOnUse" x1="250" y1="1040" x2="1010" y2="220">
          <stop offset="0" stopColor="#32C3C2" />
          <stop offset="0.58" stopColor="#67D4EA" />
          <stop offset="1" stopColor="#8FCBFF" />
        </linearGradient>
        <linearGradient id="inquara-brand-symbol" gradientUnits="userSpaceOnUse" x1="470" y1="720" x2="800" y2="430">
          <stop offset="0" stopColor="#32C3C2" />
          <stop offset="0.58" stopColor="#67D4EA" />
          <stop offset="1" stopColor="#8FCBFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
