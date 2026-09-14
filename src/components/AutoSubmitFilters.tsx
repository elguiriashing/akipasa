"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AutoSubmitFilters({ formId }: { formId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    form.dataset.autoSubmitReady = "true";

    const update = () => {
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form)) {
        if (typeof value === "string" && value !== "")
          params.append(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    };

    const scheduleUpdate = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      delete form.dataset.autoSubmitReady;
      timer.current = window.setTimeout(update, 120);
    };

    form.addEventListener("change", scheduleUpdate);
    form.addEventListener("akipasa:filters-change", scheduleUpdate);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      form.removeEventListener("change", scheduleUpdate);
      form.removeEventListener("akipasa:filters-change", scheduleUpdate);
    };
  }, [formId, pathname, router]);

  return null;
}
