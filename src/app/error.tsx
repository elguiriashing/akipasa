"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PasaRouteFallback } from "@/components/PasaRouteFallback";

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [pending, startRetry] = useTransition();
  return (
    <PasaRouteFallback
      kind="error"
      standalone
      pending={pending}
      reset={() =>
        startRetry(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
