"use client";

import { useFormStatus } from "react-dom";

export function AccountCollectionRemoveButton({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const status = useFormStatus();
  return (
    <button
      className="account-collection-remove"
      type="submit"
      disabled={status.pending}
    >
      {status.pending ? pending : idle}
    </button>
  );
}
