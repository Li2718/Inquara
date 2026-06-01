"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { isInternalPageTransitionHref, shouldHandlePageTransitionLinkClick } from "./pageTransitionNavigation";
import { usePageTransitionNavigation } from "./usePageTransitionNavigation";

type LinkProps = ComponentProps<typeof Link>;

type PageTransitionLinkProps = Omit<LinkProps, "href"> & {
  href: string;
};

export function PageTransitionLink({
  href,
  onClick,
  replace,
  scroll,
  target,
  ...props
}: PageTransitionLinkProps) {
  const navigation = usePageTransitionNavigation();
  const linkProps = {
    ...props,
    href,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (!shouldHandlePageTransitionLinkClick(event)) {
        return;
      }

      if (target && target !== "_self") {
        return;
      }

      if ((event.currentTarget.getAttribute("download") ?? "").length > 0) {
        return;
      }

      if (!isInternalPageTransitionHref(href)) {
        return;
      }

      event.preventDefault();
      const navigationOptions = {
        ...(replace === undefined ? {} : { replace }),
        ...(scroll === undefined ? {} : { scroll })
      };
      void navigation.navigate(href, navigationOptions);
    }
  };

  if (replace !== undefined) {
    Object.assign(linkProps, { replace });
  }

  if (scroll !== undefined) {
    Object.assign(linkProps, { scroll });
  }

  if (target !== undefined) {
    Object.assign(linkProps, { target });
  }

  return (
    <Link {...linkProps} />
  );
}
