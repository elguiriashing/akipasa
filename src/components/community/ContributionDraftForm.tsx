"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

type DraftValues = Record<string, string>;

export function ContributionDraftForm({
  action,
  children,
  className,
  draftKey,
  recover,
  locale,
}: {
  action: NonNullable<ComponentProps<"form">["action"]>;
  children: ReactNode;
  className?: string;
  draftKey: string;
  recover: boolean;
  locale: "es" | "en";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (!recover) {
      window.sessionStorage.removeItem(draftKey);
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (!raw) return;
      const values = JSON.parse(raw) as DraftValues;
      for (const [name, value] of Object.entries(values)) {
        const control = form.elements.namedItem(name);
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement
        ) {
          control.value = value;
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      form.dispatchEvent(
        new CustomEvent("akipasa:restore-contribution-draft", {
          detail: values,
        }),
      );
      setRestored(true);
    } catch {
      window.sessionStorage.removeItem(draftKey);
    }
  }, [draftKey, recover]);

  function rememberDraft(event: FormEvent<HTMLFormElement>) {
    const values: DraftValues = {};
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && name !== "locale") values[name] = value;
    }
    window.sessionStorage.setItem(draftKey, JSON.stringify(values));
  }

  return (
    <>
      {restored && (
        <p className="notice" role="status">
          {locale === "es"
            ? "Hemos restaurado los datos de tu último intento."
            : "We restored the details from your last attempt."}
        </p>
      )}
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={rememberDraft}
      >
        {children}
      </form>
    </>
  );
}
