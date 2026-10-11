"use client";

import Link, { useLinkStatus } from "next/link";
import React, { type ComponentProps } from "react";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      className="navigation-pending"
      data-nav-pending={pending}
      aria-hidden="true"
    />
  );
}

// Retain Next's partial prefetch, history, keyboard and modified-click behavior.
// Feedback follows the actual router transition, including errors/cancellation.
export function NavigationLink({
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.currentTarget.querySelector('[data-nav-pending="true"]')
        ) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
      <PendingIndicator />
    </Link>
  );
}
