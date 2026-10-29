"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Icons";
import styles from "./PlansFirstHero.module.css";

function searchReady() {
  return Boolean(
    document.querySelector(
      '#site-search-panel form[data-search-handlers-ready="true"]',
    ),
  );
}

function subscribeToSearch(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-search-handlers-ready"],
  });
  return () => observer.disconnect();
}

/** Native search opens only after the shared filter form attaches its handlers. */
export function DiscoverySearchTrigger({ locale }: { locale: "en" | "es" }) {
  const ready = useSyncExternalStore(
    subscribeToSearch,
    searchReady,
    () => false,
  );
  return (
    <button
      type="button"
      className={styles.search}
      popoverTarget="site-search-panel"
      disabled={!ready}
    >
      <Icon name="search" size={21} />
      <span>
        {locale === "es"
          ? "¿Qué te apetece hacer?"
          : "What are you in the mood for?"}
      </span>
    </button>
  );
}
