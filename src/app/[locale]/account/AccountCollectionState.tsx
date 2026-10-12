import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../../components/Icons";
import { AccountCollectionRefresh } from "./AccountCollectionRefresh";

export function AccountCollectionState({
  locale,
  icon,
  title,
  description,
  failed = false,
  actionHref,
  actionLabel,
}: {
  locale: "es" | "en";
  icon: IconName;
  title: string;
  description: string;
  failed?: boolean;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div
      className="account-collection-state"
      role={failed ? "alert" : undefined}
    >
      <span className="account-collection-icon" aria-hidden="true">
        <Icon name={icon} size={25} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {failed ? (
        <AccountCollectionRefresh locale={locale} />
      ) : (
        <Link className="button secondary" href={actionHref || `/${locale}`}>
          {actionLabel || (locale === "es" ? "Explorar" : "Explore")}
          <Icon name="arrow-right" size={16} />
        </Link>
      )}
    </div>
  );
}
