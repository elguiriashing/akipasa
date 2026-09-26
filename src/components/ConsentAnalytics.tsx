"use client";
import { useEffect } from "react";
import { readPrivacyChoices } from "../lib/privacy-consent";
const measurementId = "G-PW8547QDGD";
type GoogleWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean;
};
export function ConsentAnalytics() {
  useEffect(() => {
    const w = window as unknown as GoogleWindow;
    let loaded = Boolean(document.getElementById("ak-consented-ga"));
    function update() {
      const enabled = readPrivacyChoices().analytics;
      w[`ga-disable-${measurementId}`] = !enabled;
      if (!enabled) {
        if (loaded)
          w.gtag?.("consent", "update", {
            analytics_storage: "denied",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
          });
        for (const item of document.cookie.split("; ")) {
          const name = item.split("=")[0];
          if (!/^_ga(?:_|$)/.test(name)) continue;
          const domains = ["", location.hostname, "akipasa.com"];
          for (const domain of domains)
            document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
        }
        return;
      }
      w.dataLayer = w.dataLayer || [];
      w.gtag =
        w.gtag ||
        function (...args: unknown[]) {
          // Google tag commands use the standard Arguments queue format.
          void args;
          // eslint-disable-next-line prefer-rest-params
          w.dataLayer!.push(arguments);
        };
      if (loaded) {
        w.gtag("consent", "update", { analytics_storage: "granted" });
        return;
      }
      loaded = true;
      w.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      w.gtag("js", new Date());
      w.gtag("config", measurementId, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      const script = document.createElement("script");
      script.id = "ak-consented-ga";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
    }
    update();
    window.addEventListener("akipasa:consent-changed", update);
    return () => window.removeEventListener("akipasa:consent-changed", update);
  }, []);
  return null;
}
