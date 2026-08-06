import { msg } from "@/lib/messages";
import type { Locale } from "@/lib/config";

export function VerifiedBadge({
  locale,
  size = "sm",
}: {
  locale: Locale;
  size?: "sm" | "md";
}) {
  const m = msg(locale);
  return (
    <span
      className={`verified-badge verified-badge--${size}`}
      aria-label={m.verified}
    >
      <span className="verified-seal" aria-hidden>
        <span className="verified-seal-dot" aria-hidden>
          A
        </span>
        <svg
          className="verified-check"
          viewBox="0 0 16 16"
          aria-hidden
          focusable={false}
        >
          <path d="M3 8.2L6.4 11.5L13 4.8" />
        </svg>
      </span>
      <span>{m.verified}</span>
    </span>
  );
}
