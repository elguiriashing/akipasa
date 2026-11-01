"use client";

import { useEffect } from "react";
import { crossesCheckinDocumentBoundary } from "../lib/checkin-document-navigation";

export function useCheckinDocumentNavigation(pathname: string) {
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        !crossesCheckinDocumentBoundary(window.location.href, anchor.href)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(anchor.href);
    };
    // Capture before Next Link handles the click. Modified clicks/new tabs retain
    // native behavior, which also fetches the destination's document policy.
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, []);

  useEffect(() => {
    // Cover programmatic router navigation (including a decoded official QR) and
    // history traversal. The navigation entry identifies the actual document;
    // pushState does not replace it or its Permissions-Policy.
    const documentNavigation = performance.getEntriesByType?.("navigation")[0];
    if (
      documentNavigation &&
      crossesCheckinDocumentBoundary(
        documentNavigation.name,
        window.location.href,
      )
    )
      window.location.replace(window.location.href);
  }, [pathname]);
}
